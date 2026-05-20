/* ── One-shot legacy data migration ──
 *
 * Runs server-side because:
 *  1. company_invoices RLS will reject anon reads if the user tightens
 *     those policies later (and it's good hygiene now).
 *  2. The destination finance_* tables are service-role-only post-016.
 *
 * Idempotent: writes legacy_source/legacy_id breadcrumbs and skips
 * already-imported rows on subsequent runs.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireFinanceAuth } from "@/lib/finance/server-auth";
import { financeServerClient, FinanceConfigError } from "@/lib/finance/server-supabase";
import type { Expense, ExpenseCategory } from "@/lib/finance/types";

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function nowISO(): string {
  return new Date().toISOString();
}

function mapCompanyCategory(legacy?: string): ExpenseCategory {
  switch (legacy) {
    case "software":
      return "software";
    case "contractor":
      return "contractor";
    case "service":
      return "professional_services";
    default:
      return "other";
  }
}

function mapLooseCategory(raw?: string): ExpenseCategory {
  if (!raw) return "other";
  const l = raw.toLowerCase();
  if (l.includes("salar") || l.includes("payroll")) return "team_salary";
  if (l.includes("contract") || l.includes("freelanc")) return "contractor";
  if (
    l.includes("software") ||
    l.includes("saas") ||
    l.includes("hosting") ||
    l.includes("subscription")
  )
    return "software";
  if (l.includes("office") || l.includes("rent") || l.includes("equipment")) return "office";
  if (l.includes("market") || l.includes("ads") || l.includes("advertising")) return "marketing";
  if (l.includes("legal") || l.includes("account") || l.includes("professional"))
    return "professional_services";
  if (l.includes("travel") || l.includes("flight") || l.includes("hotel")) return "travel";
  if (l.includes("tax") || l.includes("vat") || l.includes("hmrc")) return "tax";
  return "other";
}

export async function POST(req: NextRequest) {
  const unauth = requireFinanceAuth(req);
  if (unauth) return unauth;

  let sb;
  try {
    sb = financeServerClient();
  } catch (err) {
    if (err instanceof FinanceConfigError) {
      return NextResponse.json(
        { error: err.message, code: "FINANCE_NOT_CONFIGURED" },
        { status: 503 },
      );
    }
    throw err;
  }
  const result = {
    companyInvoicesImported: 0,
    expensesImported: 0,
    skipped: 0,
    errors: [] as string[],
  };

  // Build skip set from existing finance_expenses rows.
  const { data: existing, error: existingErr } = await sb
    .from("finance_expenses")
    .select("data");
  if (existingErr) {
    return NextResponse.json(
      { error: `Could not read existing finance_expenses: ${existingErr.message}` },
      { status: 500 },
    );
  }
  const seenLegacy = new Set<string>();
  for (const row of existing || []) {
    const d = (row as Record<string, unknown>).data as Record<string, unknown> | undefined;
    if (d?.legacy_source && d?.legacy_id) {
      seenLegacy.add(`${d.legacy_source}:${d.legacy_id}`);
    }
  }

  /* ── company_invoices (jsonb blob) ── */
  try {
    const { data: rows, error } = await sb
      .from("company_invoices")
      .select("id, data, created_at");
    if (error) throw error;
    for (const row of rows || []) {
      const r = row as { id: string; data: Record<string, unknown>; created_at: string };
      const key = `company_invoices:${r.id}`;
      if (seenLegacy.has(key)) {
        result.skipped++;
        continue;
      }
      const d = r.data || {};
      const amount = Number(d.amount) || 0;
      const status = d.status === "paid" ? "paid" : "due";
      const exp: Expense = {
        id: uid(),
        supplier_name: String(d.supplier_name || "Unknown supplier"),
        description:
          typeof d.invoice_number === "string" ? `Invoice ${d.invoice_number}` : undefined,
        category: mapCompanyCategory(d.category as string | undefined),
        amount,
        vat_included: false,
        date_due: (d.due_date as string) || (d.issue_date as string) || r.created_at.slice(0, 10),
        date_paid: (d.paid_date as string) || undefined,
        status,
        file_url: (d.file_url as string) || undefined,
        file_name: (d.file_name as string) || undefined,
        notes: (d.notes as string) || undefined,
        legacy_source: "company_invoices",
        legacy_id: String(r.id),
        created_at: r.created_at || nowISO(),
        updated_at: nowISO(),
      };
      const { id, ...rest } = exp;
      await sb
        .from("finance_expenses")
        .insert({ id, data: rest, created_at: nowISO() });
      result.companyInvoicesImported++;
    }
  } catch (err) {
    result.errors.push(
      `company_invoices: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  /* ── tools/expenses (flat schema) ──
   * Legacy schema only has needed/review/cut as status. None of these
   * map cleanly to "paid" or "due", but for accounting purposes most
   * "needed" rows ARE current paid recurring expenses (Figma etc.).
   * Default to status=paid, date_paid=created_at so they show up in
   * historical periods. User can re-flag individual rows after import. */
  try {
    const { data: rows, error } = await sb
      .from("expenses")
      .select("id, name, category, amount, frequency, status, notes, created_at");
    if (error) throw error;
    for (const row of (rows || []) as Array<{
      id: string;
      name: string;
      category: string;
      amount: number | string;
      frequency: string;
      status: string;
      notes: string | null;
      created_at: string;
    }>) {
      const key = `tools_expenses:${row.id}`;
      if (seenLegacy.has(key)) {
        result.skipped++;
        continue;
      }
      const amount = typeof row.amount === "string" ? parseFloat(row.amount) : row.amount;
      const recurring =
        row.frequency === "monthly"
          ? ("monthly" as const)
          : row.frequency === "yearly"
            ? ("annual" as const)
            : undefined;
      const dateISO = row.created_at.slice(0, 10);
      // Legacy "cut" = no longer paying. Treat as paid historically
      // but mark with a note so it's visible.
      const isCut = row.status === "cut";
      const exp: Expense = {
        id: uid(),
        supplier_name: row.name,
        description: row.category || undefined,
        category: mapLooseCategory(row.category),
        amount: amount || 0,
        vat_included: false,
        date_due: dateISO,
        date_paid: isCut ? dateISO : dateISO,
        status: "paid",
        recurring: isCut ? undefined : recurring,
        notes: isCut
          ? `[Imported from legacy /tools/expenses with status "cut" — recurring stopped] ${row.notes ?? ""}`.trim()
          : row.notes || undefined,
        legacy_source: "tools_expenses",
        legacy_id: String(row.id),
        created_at: row.created_at,
        updated_at: nowISO(),
      };
      const { id, ...rest } = exp;
      await sb
        .from("finance_expenses")
        .insert({ id, data: rest, created_at: nowISO() });
      result.expensesImported++;
    }
  } catch (err) {
    result.errors.push(
      `tools_expenses: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  return NextResponse.json(result);
}
