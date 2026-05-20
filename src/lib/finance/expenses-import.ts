/* ── CSV parsing + expense import logic ──
 * Pure functions. Server-safe. Used by /api/finance/import-expenses.
 *
 * Mirrors the patterns in csv-import.ts (invoices) for consistency:
 *  - Quoted-field CSV parser (reused from csv-import.ts).
 *  - Tax-year-aware sequential numbering (EXP-YYYY-NNN), continuation
 *    via maxExpenseNumbersByTaxYear() so subsequent imports don't clash.
 *  - status defaults to "paid" for blank rows (historical import use-case).
 *
 * Expected CSV columns (case-insensitive header match):
 *
 *   expense_number          Optional. Filled by assignTaxYearExpenseNumbers when blank.
 *   issue_date              Required. YYYY-MM-DD.
 *   payment_date            Optional. YYYY-MM-DD.
 *   supplier                Required. Display name.
 *   description             Optional.
 *   category                Required. ExpenseCategory value.
 *   currency                Optional. Default GBP.
 *   amount_gbp              Required. Gross in GBP.
 *   vat_amount_gbp          Optional. Reclaimable input VAT in GBP. Default 0.
 *   net_amount_gbp          Optional. Defaults to amount_gbp - vat_amount_gbp.
 *   vat_treatment           Required. ExpenseVatTreatment value.
 *   source_system           Optional. ExpenseSourceSystem value.
 *   paid_from               Optional. ExpensePaidFrom value.
 *   status                  Optional. Defaults to "paid".
 *   tax_year                Optional. e.g. "2025/26" (auto-derived from issue_date if absent).
 *   notes                   Optional.
 *   temp_id                 Ignored (source-side row id).
 */

import type {
  Expense,
  ExpenseCategory,
  ExpenseStatus,
  ExpenseVatTreatment,
  ExpenseSourceSystem,
  ExpensePaidFrom,
  InvoiceCurrency,
} from "./types";
import { parseCsv } from "./csv-import";

export interface ExpenseParseError {
  row: number;
  field?: string;
  message: string;
}

export interface ParsedExpense {
  row: number;
  expense: Omit<Expense, "id" | "created_at" | "updated_at" | "supplier_id">;
  supplierName: string;
}

export interface ExpenseParseResult {
  rows: ParsedExpense[];
  errors: ExpenseParseError[];
}

const ALLOWED_CATEGORIES: Set<ExpenseCategory> = new Set([
  "team_salary",
  "contractor",
  "software",
  "office",
  "marketing",
  "advertising",
  "platform_fee",
  "bank_fee",
  "professional_services",
  "travel",
  "fuel",
  "food_drink",
  "entertainment",
  "tax",
  "other",
]);

const ALLOWED_VAT_TREATMENTS: Set<ExpenseVatTreatment> = new Set([
  "uk_20_reclaimable",
  "reverse_charge",
  "outside_scope",
  "zero_rated",
  "exempt",
  "pre_vat_registration",
  "review_needed",
  "manual",
]);

const ALLOWED_SOURCES: Set<ExpenseSourceSystem> = new Set([
  "tide_bank",
  "stripe_fees",
  "whop_fees",
  "shopify_fees",
  "wise",
  "card",
  "manual",
]);

const ALLOWED_PAID_FROM: Set<ExpensePaidFrom> = new Set([
  "tide",
  "wise_gbp",
  "wise_usd",
  "wise_eur",
  "stripe_deduction",
  "whop_deduction",
  "shopify_deduction",
  "card",
  "other",
]);

const ALLOWED_CURRENCIES: Set<InvoiceCurrency> = new Set([
  "GBP",
  "USD",
  "EUR",
  "AUD",
  "CAD",
  "MYR",
  "SEK",
]);

const ALLOWED_STATUSES: Set<ExpenseStatus> = new Set([
  "due",
  "paid",
  "overdue",
  "disputed",
]);

/* UK tax year starts 6 April. Returns the start-year used in the
 * expense number prefix: "EXP-2024-..." for dates in 2024/25. */
function ukTaxYearStart(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  const beforeApril6 = m < 4 || (m === 4 && d < 6);
  return beforeApril6 ? y - 1 : y;
}

/* Format "2025/26" from a 2025 start year. */
function taxYearLabel(startYear: number): string {
  const next = (startYear + 1) % 100;
  return `${startYear}/${String(next).padStart(2, "0")}`;
}

/* Fills blank expense_numbers in a ParsedExpense[] using tax-year-aware
 * sequential numbering: sort by date ASC, walk through, assign
 * EXP-YYYY-NNN where YYYY is the tax-year-start year and NNN resets at
 * each tax-year boundary. Rows with non-blank expense_number are left
 * alone. Mutates the input array in place.
 *
 * `startCounters` lets the caller continue numbering from an existing
 * baseline (e.g. {2025: 282, 2026: 88} after a prior batch landed), so a
 * subsequent import gets EXP-2025-283 / EXP-2026-089 onwards instead of
 * duplicating numbers. */
export function assignTaxYearExpenseNumbers(
  rows: ParsedExpense[],
  prefix = "EXP",
  startCounters: Record<number, number> = {},
): void {
  const indexed = rows.map((r, i) => ({ r, i }));
  indexed.sort((a, b) => {
    const aDate = a.r.expense.issue_date || a.r.expense.date_due;
    const bDate = b.r.expense.issue_date || b.r.expense.date_due;
    const cmp = aDate.localeCompare(bDate);
    return cmp !== 0 ? cmp : a.i - b.i;
  });
  const counters: Record<number, number> = { ...startCounters };
  for (const { r } of indexed) {
    if (r.expense.expense_number && r.expense.expense_number.trim() !== "") continue;
    const date = r.expense.issue_date || r.expense.date_due;
    const yearStart = ukTaxYearStart(date);
    counters[yearStart] = (counters[yearStart] ?? 0) + 1;
    r.expense.expense_number = `${prefix}-${yearStart}-${String(counters[yearStart]).padStart(3, "0")}`;
  }
}

/* Parse an existing pool of expense_numbers and return {year: maxNNN}
 * so the next import can continue numbering. */
export function maxExpenseNumbersByTaxYear(
  expenseNumbers: Iterable<string>,
  prefix = "EXP",
): Record<number, number> {
  const result: Record<number, number> = {};
  const re = new RegExp(`^${prefix}-(\\d{4})-(\\d+)$`);
  for (const num of expenseNumbers) {
    const m = num.match(re);
    if (!m) continue;
    const y = Number(m[1]);
    const n = Number(m[2]);
    if (!Number.isFinite(y) || !Number.isFinite(n)) continue;
    if (!result[y] || n > result[y]) result[y] = n;
  }
  return result;
}

function pick(row: Record<string, string>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== "") return v;
  }
  return undefined;
}

function parseNumber(value: string | undefined): number | null {
  if (value === undefined || value === "") return null;
  const cleaned = value.replace(/[£$€,\s]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function parseExpenseCsv(text: string): ExpenseParseResult {
  const result: ExpenseParseResult = { rows: [], errors: [] };
  const raw = parseCsv(text);
  if (raw.length === 0) {
    result.errors.push({ row: 0, message: "Empty file" });
    return result;
  }
  const headers = raw[0].map((h) => h.trim().toLowerCase());

  for (let i = 1; i < raw.length; i++) {
    const values = raw[i];
    const rowNumber = i;
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (values[idx] || "").trim();
    });

    const expenseNumber = pick(obj, "expense_number") || "";
    const supplier = pick(obj, "supplier", "supplier_name", "vendor");
    const issueDate = pick(obj, "issue_date", "date");
    const paymentDate = pick(obj, "payment_date", "paid_date", "date_paid");
    const categoryRaw = pick(obj, "category");
    const grossStr = pick(obj, "amount_gbp", "amount", "gross_amount");
    const vatStr = pick(obj, "vat_amount_gbp", "vat_amount");
    const netStr = pick(obj, "net_amount_gbp", "net_amount");
    const treatmentRaw = pick(obj, "vat_treatment");
    const sourceRaw = pick(obj, "source_system");
    const paidFromRaw = pick(obj, "paid_from", "paid_into");
    const statusRaw = pick(obj, "status") || "paid";
    const taxYear = pick(obj, "tax_year");
    const notes = pick(obj, "notes");
    const description = pick(obj, "description");
    const currencyRaw = (pick(obj, "currency") || "GBP").toUpperCase() as InvoiceCurrency;
    const currency = ALLOWED_CURRENCIES.has(currencyRaw) ? currencyRaw : "GBP";

    if (!supplier) {
      result.errors.push({
        row: rowNumber,
        field: "supplier",
        message: "Required (looked for supplier, supplier_name, vendor)",
      });
      continue;
    }
    if (!issueDate) {
      result.errors.push({
        row: rowNumber,
        field: "issue_date",
        message: "Required (looked for issue_date, date)",
      });
      continue;
    }
    if (!categoryRaw || !ALLOWED_CATEGORIES.has(categoryRaw as ExpenseCategory)) {
      result.errors.push({
        row: rowNumber,
        field: "category",
        message: `Must be one of: ${[...ALLOWED_CATEGORIES].join(", ")}`,
      });
      continue;
    }
    const category = categoryRaw as ExpenseCategory;

    const gross = parseNumber(grossStr);
    if (gross === null) {
      result.errors.push({
        row: rowNumber,
        field: "amount_gbp",
        message: "Invalid number (looked for amount_gbp, amount, gross_amount)",
      });
      continue;
    }
    const vat = parseNumber(vatStr) ?? 0;
    const netParsed = parseNumber(netStr);
    // Mirror the invoice-side rule: when VAT is zero, net == gross. Otherwise
    // use the supplied net, falling back to gross - vat.
    const net = vat === 0 ? gross : netParsed !== null ? netParsed : gross - vat;

    if (!treatmentRaw || !ALLOWED_VAT_TREATMENTS.has(treatmentRaw as ExpenseVatTreatment)) {
      result.errors.push({
        row: rowNumber,
        field: "vat_treatment",
        message: `Must be one of: ${[...ALLOWED_VAT_TREATMENTS].join(", ")}`,
      });
      continue;
    }
    const treatment = treatmentRaw as ExpenseVatTreatment;

    const source: ExpenseSourceSystem | undefined =
      sourceRaw && ALLOWED_SOURCES.has(sourceRaw as ExpenseSourceSystem)
        ? (sourceRaw as ExpenseSourceSystem)
        : undefined;
    const paidFrom: ExpensePaidFrom | undefined =
      paidFromRaw && ALLOWED_PAID_FROM.has(paidFromRaw as ExpensePaidFrom)
        ? (paidFromRaw as ExpensePaidFrom)
        : undefined;

    if (sourceRaw && !source) {
      result.errors.push({
        row: rowNumber,
        field: "source_system",
        message: `Unknown source_system "${sourceRaw}" (accepted as undefined)`,
      });
    }
    if (paidFromRaw && !paidFrom) {
      result.errors.push({
        row: rowNumber,
        field: "paid_from",
        message: `Unknown paid_from "${paidFromRaw}" (accepted as undefined)`,
      });
    }

    const status = ALLOWED_STATUSES.has(statusRaw as ExpenseStatus)
      ? (statusRaw as ExpenseStatus)
      : "paid";

    const resolvedTaxYear = taxYear || taxYearLabel(ukTaxYearStart(issueDate));

    const expense: ParsedExpense["expense"] = {
      expense_number: expenseNumber,
      supplier_name: supplier,
      description,
      category,

      // New explicit shape
      issue_date: issueDate,
      payment_date: paymentDate,
      currency,
      amount_native: gross,
      amount_gbp: gross,
      vat_amount_gbp: vat,
      net_amount_gbp: net,
      vat_treatment: treatment,
      source_system: source,
      paid_from: paidFrom,
      tax_year: resolvedTaxYear,

      // Legacy mirrors so existing UI keeps rendering
      amount: gross,
      vat_included: vat > 0,
      vat_amount: vat > 0 ? vat : undefined,
      date_due: issueDate,
      date_paid: paymentDate,

      status,
      notes,
    };

    result.rows.push({
      row: rowNumber,
      expense,
      supplierName: supplier,
    });
  }

  return result;
}
