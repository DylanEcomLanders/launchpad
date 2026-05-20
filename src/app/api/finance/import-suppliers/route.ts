/* ── Bulk import suppliers from a CSV ──
 *
 * Accepts: multipart/form-data with `file` + optional `dry_run`, OR
 *          JSON body { csv: string, dry_run?: boolean }.
 *
 * Behaviour:
 *  - Parses suppliers_master.csv
 *  - Idempotent on case-insensitive name match: skips suppliers that already
 *    exist in finance_suppliers (no overwrite of aggregates).
 *  - dry_run=true: returns preview without writing.
 *
 * Returns: { imported, skipped, errors[], preview? }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireFinanceAuth } from "@/lib/finance/server-auth";
import { financeServerClient, FinanceConfigError } from "@/lib/finance/server-supabase";
import { parseSupplierCsv } from "@/lib/finance/suppliers-import";
import type { Supplier } from "@/lib/finance/types";

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function nowISO(): string {
  return new Date().toISOString();
}

export async function POST(req: NextRequest) {
  const unauth = requireFinanceAuth(req);
  if (unauth) return unauth;

  let csvText = "";
  let dryRun = false;
  const contentType = req.headers.get("content-type") || "";
  try {
    if (contentType.includes("application/json")) {
      const body = await req.json();
      csvText = String(body?.csv || "");
      dryRun = Boolean(body?.dry_run);
    } else {
      const form = await req.formData();
      const file = form.get("file") as File | null;
      if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
      csvText = await file.text();
      dryRun = String(form.get("dry_run") || "") === "true";
    }
  } catch {
    return NextResponse.json({ error: "Could not read CSV" }, { status: 400 });
  }

  if (!csvText.trim()) {
    return NextResponse.json({ error: "Empty CSV" }, { status: 400 });
  }

  const parsed = parseSupplierCsv(csvText);

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

  const { data: existingRows, error: readErr } = await sb
    .from("finance_suppliers")
    .select("id, data");
  if (readErr) {
    return NextResponse.json({ error: readErr.message }, { status: 500 });
  }
  const existingNames = new Set(
    (existingRows || []).map((r: Record<string, unknown>) => {
      const d = r.data as Record<string, unknown>;
      return ((d?.name as string) || "").trim().toLowerCase();
    }),
  );

  let imported = 0;
  let skipped = 0;
  const errors: string[] = parsed.errors.map(
    (e) => `Row ${e.row}${e.field ? ` (${e.field})` : ""}: ${e.message}`,
  );

  const preview: Array<{
    row: number;
    name: string;
    country?: string;
    default_category?: string;
    default_vat_treatment?: string;
    transaction_count?: number;
    total_spent?: number;
    will_skip: boolean;
  }> = [];

  for (const row of parsed.rows) {
    const willSkip = existingNames.has(row.supplier.name.trim().toLowerCase());
    if (preview.length < 10) {
      preview.push({
        row: row.row,
        name: row.supplier.name,
        country: row.supplier.country,
        default_category: row.supplier.default_category,
        default_vat_treatment: row.supplier.default_vat_treatment,
        transaction_count: row.supplier.transaction_count,
        total_spent: row.supplier.total_spent,
        will_skip: willSkip,
      });
    }
    if (dryRun) continue;
    if (willSkip) {
      skipped++;
      continue;
    }
    const now = nowISO();
    const supplier: Supplier = {
      id: uid(),
      ...row.supplier,
      created_at: now,
      updated_at: now,
    };
    const { id, ...rest } = supplier;
    const { error: insertErr } = await sb
      .from("finance_suppliers")
      .insert({ id, data: rest, created_at: now });
    if (insertErr) {
      errors.push(
        `Row ${row.row}: failed to insert supplier "${row.supplier.name}": ${insertErr.message}`,
      );
      continue;
    }
    existingNames.add(supplier.name.trim().toLowerCase());
    imported++;
  }

  if (dryRun) {
    const wouldSkip = parsed.rows.filter((r) =>
      existingNames.has(r.supplier.name.trim().toLowerCase()),
    ).length;
    const totalSpend = parsed.rows.reduce(
      (s, r) => s + (r.supplier.total_spent || 0),
      0,
    );
    const categoryDist = parsed.rows.reduce<Record<string, number>>((a, r) => {
      const c = r.supplier.default_category || "(none)";
      a[c] = (a[c] ?? 0) + 1;
      return a;
    }, {});
    return NextResponse.json({
      dry_run: true,
      total_rows: parsed.rows.length,
      would_import: parsed.rows.length - wouldSkip,
      would_skip_existing: wouldSkip,
      total_spend_gbp: Math.round(totalSpend * 100) / 100,
      category_distribution: categoryDist,
      preview,
      errors,
    });
  }

  return NextResponse.json({
    imported,
    skipped,
    errors,
    preview,
  });
}
