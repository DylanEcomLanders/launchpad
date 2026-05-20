/* ── Bulk import expenses from a CSV ──
 *
 * Accepts: multipart/form-data with `file` (the CSV) plus optional
 *           `dry_run` and `strict_match` form fields. JSON body is also
 *           supported: { csv: string, dry_run?: boolean, strict_match?: boolean }.
 *
 * Behaviour:
 *  - Parses the CSV.
 *  - Fills in blank expense_numbers using tax-year-aware sequential
 *    numbering (EXP-YYYY-NNN, counter resets at each UK tax year).
 *  - Matches suppliers by case-insensitive name; in strict_match mode
 *    a missing supplier is a row error instead of an auto-create.
 *  - Idempotent: skips expense rows whose expense_number already exists.
 *  - dry_run=true: parses + numbers + matches suppliers, returns what
 *    WOULD be written along with a preview array. No DB writes happen.
 *
 * Returns: { imported, skipped, suppliersCreated, errors[], preview? }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireFinanceAuth } from "@/lib/finance/server-auth";
import { financeServerClient, FinanceConfigError } from "@/lib/finance/server-supabase";
import {
  parseExpenseCsv,
  assignTaxYearExpenseNumbers,
  maxExpenseNumbersByTaxYear,
} from "@/lib/finance/expenses-import";
import type { Expense, Supplier } from "@/lib/finance/types";

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
  let strictMatch = false;
  const contentType = req.headers.get("content-type") || "";
  try {
    if (contentType.includes("application/json")) {
      const body = await req.json();
      csvText = String(body?.csv || "");
      dryRun = Boolean(body?.dry_run);
      strictMatch = Boolean(body?.strict_match);
    } else {
      const form = await req.formData();
      const file = form.get("file") as File | null;
      if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
      csvText = await file.text();
      dryRun = String(form.get("dry_run") || "") === "true";
      strictMatch = String(form.get("strict_match") || "") === "true";
    }
  } catch {
    return NextResponse.json({ error: "Could not read CSV" }, { status: 400 });
  }

  if (!csvText.trim()) {
    return NextResponse.json({ error: "Empty CSV" }, { status: 400 });
  }

  const parsed = parseExpenseCsv(csvText);

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

  // Load existing suppliers + expense numbers up front so we can match
  // and dedupe in memory rather than round-tripping per row.
  const { data: supplierRows, error: suppliersErr } = await sb
    .from("finance_suppliers")
    .select("id, data");
  if (suppliersErr) {
    return NextResponse.json({ error: suppliersErr.message }, { status: 500 });
  }
  const existingSuppliers: Supplier[] = (supplierRows || []).map(
    (r: Record<string, unknown>) => ({
      ...(r.data as object),
      id: r.id as string,
    }) as Supplier,
  );
  const suppliersByLowerName = new Map(
    existingSuppliers.map((s) => [s.name.trim().toLowerCase(), s]),
  );

  const { data: expenseRows, error: expensesErr } = await sb
    .from("finance_expenses")
    .select("data");
  if (expensesErr) {
    return NextResponse.json({ error: expensesErr.message }, { status: 500 });
  }
  const existingExpenseNumbers = new Set(
    (expenseRows || [])
      .map((r: Record<string, unknown>) => {
        const d = r.data as Record<string, unknown>;
        return (d?.expense_number as string) || null;
      })
      .filter(Boolean) as string[],
  );

  // Compute next-number baseline per tax year so this batch continues
  // from EXP-YYYY-(maxN + 1) instead of restarting at 001.
  const startCounters = maxExpenseNumbersByTaxYear(existingExpenseNumbers, "EXP");
  assignTaxYearExpenseNumbers(parsed.rows, "EXP", startCounters);

  let imported = 0;
  let skipped = 0;
  let suppliersCreated = 0;
  const errors: string[] = [
    ...parsed.errors.map(
      (e) => `Row ${e.row}${e.field ? ` (${e.field})` : ""}: ${e.message}`,
    ),
  ];

  const preview: Array<{
    row: number;
    expense_number: string;
    issue_date?: string;
    supplier_name: string;
    category: string;
    amount_gbp?: number;
    vat_amount_gbp?: number;
    vat_treatment?: string;
    source_system?: string;
    paid_from?: string;
    will_create_supplier: boolean;
    will_skip: boolean;
  }> = [];

  for (const row of parsed.rows) {
    const expenseNumber = row.expense.expense_number || "";
    const willSkip = expenseNumber !== "" && existingExpenseNumbers.has(expenseNumber);
    const matchedSupplier =
      suppliersByLowerName.get(row.supplierName.trim().toLowerCase()) || null;

    if (preview.length < 10) {
      preview.push({
        row: row.row,
        expense_number: expenseNumber,
        issue_date: row.expense.issue_date,
        supplier_name: row.supplierName,
        category: row.expense.category,
        amount_gbp: row.expense.amount_gbp,
        vat_amount_gbp: row.expense.vat_amount_gbp,
        vat_treatment: row.expense.vat_treatment,
        source_system: row.expense.source_system,
        paid_from: row.expense.paid_from,
        will_create_supplier: !matchedSupplier,
        will_skip: willSkip,
      });
    }

    if (dryRun) continue;
    if (willSkip) {
      skipped++;
      continue;
    }

    // Upsert supplier by name. When strict_match is on, fail the row
    // instead of auto-creating.
    let supplier: Supplier | undefined = matchedSupplier ?? undefined;
    if (!supplier) {
      if (strictMatch) {
        errors.push(
          `Row ${row.row}: no supplier match for "${row.supplierName}" (strict mode, would have auto-created)`,
        );
        continue;
      }
      const now = nowISO();
      const newSupplier: Supplier = {
        id: uid(),
        name: row.supplierName.trim(),
        default_category: row.expense.category,
        default_vat_treatment: row.expense.vat_treatment,
        created_at: now,
        updated_at: now,
      };
      const { id, ...rest } = newSupplier;
      const { error: insertSupplierErr } = await sb
        .from("finance_suppliers")
        .insert({ id, data: rest, created_at: now });
      if (insertSupplierErr) {
        errors.push(
          `Row ${row.row}: failed to create supplier "${row.supplierName}": ${insertSupplierErr.message}`,
        );
        continue;
      }
      supplier = newSupplier;
      existingSuppliers.push(newSupplier);
      suppliersByLowerName.set(newSupplier.name.trim().toLowerCase(), newSupplier);
      suppliersCreated++;
    }

    const now = nowISO();
    const expense: Expense = {
      ...row.expense,
      id: uid(),
      supplier_id: supplier.id,
      created_at: now,
      updated_at: now,
    };
    const { id, ...rest } = expense;
    const { error: insertErr } = await sb
      .from("finance_expenses")
      .insert({ id, data: rest, created_at: now });
    if (insertErr) {
      errors.push(
        `Row ${row.row}: failed to insert expense ${expense.expense_number}: ${insertErr.message}`,
      );
      continue;
    }
    if (expense.expense_number) {
      existingExpenseNumbers.add(expense.expense_number);
    }
    imported++;
  }

  if (dryRun) {
    const wouldCreateSuppliers = new Set<string>();
    const taxYearTallies: Record<string, { count: number; gross: number }> = {};
    const categoryTallies: Record<string, { count: number; gross: number }> = {};
    let totalGross = 0;
    let totalVatReclaimable = 0;
    for (const row of parsed.rows) {
      const matched = suppliersByLowerName.get(row.supplierName.trim().toLowerCase());
      if (!matched) wouldCreateSuppliers.add(row.supplierName.trim().toLowerCase());
      const num = row.expense.expense_number || "";
      const prefix = num.split("-").slice(0, 2).join("-"); // "EXP-2024"
      taxYearTallies[prefix] = taxYearTallies[prefix] ?? { count: 0, gross: 0 };
      taxYearTallies[prefix].count++;
      taxYearTallies[prefix].gross += row.expense.amount_gbp || 0;
      const cat = row.expense.category;
      categoryTallies[cat] = categoryTallies[cat] ?? { count: 0, gross: 0 };
      categoryTallies[cat].count++;
      categoryTallies[cat].gross += row.expense.amount_gbp || 0;
      totalGross += row.expense.amount_gbp || 0;
      totalVatReclaimable += row.expense.vat_amount_gbp || 0;
    }
    return NextResponse.json({
      dry_run: true,
      total_rows: parsed.rows.length,
      parse_errors: errors.length,
      would_create_suppliers: wouldCreateSuppliers.size,
      would_skip_existing: parsed.rows.filter((r) => {
        const n = r.expense.expense_number || "";
        return n !== "" && existingExpenseNumbers.has(n);
      }).length,
      total_gross_gbp: Math.round(totalGross * 100) / 100,
      total_vat_reclaimable_gbp: Math.round(totalVatReclaimable * 100) / 100,
      tax_year_tallies: Object.fromEntries(
        Object.entries(taxYearTallies).map(([k, v]) => [
          k,
          { count: v.count, gross_gbp: Math.round(v.gross * 100) / 100 },
        ]),
      ),
      category_tallies: Object.fromEntries(
        Object.entries(categoryTallies).map(([k, v]) => [
          k,
          { count: v.count, gross_gbp: Math.round(v.gross * 100) / 100 },
        ]),
      ),
      preview,
      errors,
    });
  }

  return NextResponse.json({
    imported,
    skipped,
    suppliersCreated,
    errors,
    preview,
  });
}
