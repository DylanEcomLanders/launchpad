/* ── CSV parsing for the suppliers_master.csv import ──
 * Pure functions. Server-safe. Used by /api/finance/import-suppliers.
 *
 * Expected CSV columns (case-insensitive, only `supplier` is required):
 *
 *   supplier               Required. Display name.
 *   first_transaction      Optional. YYYY-MM-DD.
 *   last_transaction       Optional. YYYY-MM-DD.
 *   transaction_count      Optional. Integer.
 *   total_spent            Optional. GBP.
 *   avg_per_transaction    Optional. GBP.
 *   default_category       Optional. ExpenseCategory value.
 *   default_vat_treatment  Optional. ExpenseVatTreatment value.
 *   country                Optional. Free-form ("GB", "IE/US", etc).
 *   is_vat_registered      Optional. Free-form ("Yes", "Check", etc).
 *   is_recurring           Optional. Free-form ("Monthly subscription", etc).
 *   notes                  Optional.
 */

import type { Supplier, ExpenseCategory, ExpenseVatTreatment } from "./types";
import { parseCsv } from "./csv-import";

export interface SupplierParseError {
  row: number;
  field?: string;
  message: string;
}

export interface ParsedSupplier {
  row: number;
  supplier: Omit<Supplier, "id" | "created_at" | "updated_at">;
}

export interface SupplierParseResult {
  rows: ParsedSupplier[];
  errors: SupplierParseError[];
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

export function parseSupplierCsv(text: string): SupplierParseResult {
  const result: SupplierParseResult = { rows: [], errors: [] };
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

    const name = pick(obj, "supplier", "name", "supplier_name");
    if (!name) {
      result.errors.push({
        row: rowNumber,
        field: "supplier",
        message: "Required (looked for supplier, name, supplier_name)",
      });
      continue;
    }

    const country = pick(obj, "country");
    const firstTxn = pick(obj, "first_transaction", "first_payment");
    const lastTxn = pick(obj, "last_transaction", "last_payment");
    const txnCount = parseNumber(pick(obj, "transaction_count"));
    const totalSpent = parseNumber(pick(obj, "total_spent", "total_gbp"));
    const avgPerTxn = parseNumber(pick(obj, "avg_per_transaction"));

    const catRaw = pick(obj, "default_category", "category");
    const defaultCategory: ExpenseCategory | undefined =
      catRaw && ALLOWED_CATEGORIES.has(catRaw as ExpenseCategory)
        ? (catRaw as ExpenseCategory)
        : undefined;
    if (catRaw && !defaultCategory) {
      result.errors.push({
        row: rowNumber,
        field: "default_category",
        message: `Unknown category "${catRaw}" (accepted into supplier as undefined)`,
      });
    }

    const vatRaw = pick(obj, "default_vat_treatment", "vat_treatment");
    const defaultVatTreatment: ExpenseVatTreatment | undefined =
      vatRaw && ALLOWED_VAT_TREATMENTS.has(vatRaw as ExpenseVatTreatment)
        ? (vatRaw as ExpenseVatTreatment)
        : undefined;
    if (vatRaw && !defaultVatTreatment) {
      result.errors.push({
        row: rowNumber,
        field: "default_vat_treatment",
        message: `Unknown VAT treatment "${vatRaw}" (accepted into supplier as undefined)`,
      });
    }

    const isVatRegistered = pick(obj, "is_vat_registered");
    const isRecurring = pick(obj, "is_recurring");
    const notes = pick(obj, "notes");

    result.rows.push({
      row: rowNumber,
      supplier: {
        name,
        country,
        default_category: defaultCategory,
        default_vat_treatment: defaultVatTreatment,
        is_vat_registered: isVatRegistered,
        is_recurring: isRecurring,
        notes,
        first_transaction: firstTxn,
        last_transaction: lastTxn,
        transaction_count: txnCount ?? undefined,
        total_spent: totalSpent ?? undefined,
        avg_per_transaction: avgPerTxn ?? undefined,
      },
    });
  }

  return result;
}
