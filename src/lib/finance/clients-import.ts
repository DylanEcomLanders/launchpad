/* ── CSV parsing for the clients_master.csv import ──
 * Pure functions. Server-safe. Used by /api/finance/import-clients.
 *
 * Expected CSV columns (case-insensitive, all optional except customer):
 *
 *   customer            Required. Name. If it contains "@" we treat it as
 *                       both name AND email so it shows up correctly in
 *                       the UI.
 *   inferred_country    Optional. ISO2 (or blank).
 *   country             Optional alias for inferred_country.
 *   first_payment       Optional. YYYY-MM-DD.
 *   last_payment        Optional. YYYY-MM-DD.
 *   payment_count       Optional. Integer.
 *   total_gbp           Optional. Lifetime value in GBP.
 *   sources_used        Optional. Comma-separated list (e.g. "stripe,whop").
 *   vat_treatment       Ignored at this stage (founder will bulk-tag after
 *                       accountant review).
 *   notes               Optional.
 */

import type { Client } from "./types";
import { parseCsv } from "./csv-import";

export interface ClientParseError {
  row: number;
  field?: string;
  message: string;
}

export interface ParsedClient {
  row: number;
  client: Omit<Client, "id" | "created_at" | "updated_at">;
}

export interface ClientParseResult {
  rows: ParsedClient[];
  errors: ClientParseError[];
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

function looksLikeEmail(s: string): boolean {
  return /@/.test(s);
}

export function parseClientCsv(text: string): ClientParseResult {
  const result: ClientParseResult = { rows: [], errors: [] };
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

    const customer = pick(obj, "customer", "name", "client_name");
    if (!customer) {
      result.errors.push({
        row: rowNumber,
        field: "customer",
        message: "Required",
      });
      continue;
    }

    const country = pick(obj, "inferred_country", "country");
    const firstPayment = pick(obj, "first_payment", "first_payment_date");
    const lastPayment = pick(obj, "last_payment", "last_payment_date");
    const paymentCount = parseNumber(pick(obj, "payment_count"));
    const lifetimeValue = parseNumber(pick(obj, "total_gbp", "lifetime_value"));
    const sourcesUsed = pick(obj, "sources_used", "sources");
    const sources = sourcesUsed
      ? sourcesUsed
          .split(/[,;]/)
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
      : undefined;
    const notes = pick(obj, "notes");
    const contactName = pick(obj, "contact_name", "client_contact_name");
    const address = pick(obj, "address", "client_address");

    const isEmail = looksLikeEmail(customer);

    result.rows.push({
      row: rowNumber,
      client: {
        name: customer,
        contact_name: contactName,
        email: pick(obj, "email", "client_email") || (isEmail ? customer : undefined),
        address,
        country: country ? country.toUpperCase() : undefined,
        notes,
        first_payment_date: firstPayment,
        last_payment_date: lastPayment,
        payment_count: paymentCount ?? undefined,
        lifetime_value: lifetimeValue ?? undefined,
        sources,
      },
    });
  }

  return result;
}
