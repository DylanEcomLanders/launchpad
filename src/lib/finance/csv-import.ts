/* ── CSV parsing + invoice import logic ──
 * Pure functions. Server-safe. Used by /api/finance/import-invoices.
 *
 * Supported CSV columns (case-insensitive header match):
 *
 *   invoice_number                Required. Your assigned number.
 *   client_name                   Required. We upsert into finance_clients.
 *   client_email                  Optional.
 *   client_contact_name           Optional.
 *   client_address                Optional. Multi-line with \n.
 *   client_country                Optional, ISO2. Defaults "GB".
 *   issue_date                    Required. YYYY-MM-DD.
 *   due_date                      Required. YYYY-MM-DD.
 *   payment_date                  Optional. YYYY-MM-DD.
 *   currency                      Optional. GBP / USD / EUR / AUD / CAD. Default GBP.
 *   gross_amount                  Required. Number.
 *   vat_amount                    Required. Number (use 0 for no VAT).
 *   net_amount                    Required. Number.
 *   gbp_equivalent                Optional. Defaults to gross_amount if currency=GBP.
 *   vat_treatment                 Required. One of:
 *                                   standard_20 / inclusive_20 / outside_scope /
 *                                   reverse_charge / zero_rated / exempt /
 *                                   pre_vat_registration / manual
 *   source_system                 Required. stripe / wise / whop / direct / manual
 *   source_transaction_id         Optional.
 *   bank_account_received_into    Optional. tide / wise_gbp / wise_usd / wise_eur /
 *                                   whop_balance / other
 *   tide_transaction_id           Optional.
 *   status                        Required. draft / sent / paid / void
 *   notes                         Optional.
 */

import type {
  InvoiceIssued,
  InvoiceLineItem,
  InvoiceStatus,
  InvoiceCurrency,
  InvoiceSourceSystem,
  BankAccountReceivedInto,
  VatTreatment,
  Client,
} from "./types";

export interface ParseError {
  row: number;          // 1-indexed, excluding header
  field?: string;
  message: string;
}

export interface ParsedRow {
  row: number;
  invoice: Omit<InvoiceIssued, "id" | "created_at" | "updated_at" | "client_id">;
  clientName: string;
  clientEmail?: string;
  clientContactName?: string;
  clientAddress?: string;
  clientCountry: string;
}

/* Synthetic line item for imported invoices. The unit price is chosen
 * so calculateVatBreakdown returns the same totals as the CSV snapshot:
 *
 *   standard_20 / manual → unit_price = NET (calc adds 20%)
 *   inclusive_20         → unit_price = GROSS (calc extracts 20%)
 *   everything else      → unit_price = GROSS (no VAT)
 */
function syntheticLineItem(
  net: number,
  gross: number,
  treatment: VatTreatment,
): InvoiceLineItem {
  const unitPrice =
    treatment === "standard_20" || treatment === "manual" ? net : gross;
  return {
    id: `imported-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    type: "custom",
    name: "Services rendered",
    quantity: 1,
    unitPrice,
  };
}

export interface ParseResult {
  rows: ParsedRow[];
  errors: ParseError[];
}

const ALLOWED_VAT_TREATMENTS: Set<VatTreatment> = new Set([
  "standard_20",
  "inclusive_20",
  "outside_scope",
  "reverse_charge",
  "zero_rated",
  "exempt",
  "pre_vat_registration",
  "manual",
]);

const ALLOWED_STATUSES: Set<InvoiceStatus> = new Set([
  "draft",
  "sent",
  "paid",
  "overdue",
  "disputed",
  "void",
]);

const ALLOWED_CURRENCIES: Set<InvoiceCurrency> = new Set([
  "GBP",
  "USD",
  "EUR",
  "AUD",
  "CAD",
]);

const ALLOWED_SOURCES: Set<InvoiceSourceSystem> = new Set([
  "stripe",
  "wise",
  "whop",
  "direct",
  "manual",
]);

const ALLOWED_BANK_ACCOUNTS: Set<BankAccountReceivedInto> = new Set([
  "tide",
  "wise_gbp",
  "wise_usd",
  "wise_eur",
  "whop_balance",
  "other",
]);

/* ── CSV parsing ──
 * Handles quoted fields with commas and escaped quotes. Not a full RFC
 * 4180 parser but good enough for the kind of CSVs Stripe/Wise/Whop emit. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let i = 0;
  let inQuotes = false;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i += 2;
        continue;
      }
      if (ch === '"') {
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      row.push(field);
      field = "";
      // Skip CRLF
      if (ch === "\r" && text[i + 1] === "\n") i++;
      i++;
      if (row.some((c) => c.length > 0)) rows.push(row);
      row = [];
      continue;
    }
    field += ch;
    i++;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((c) => c.length > 0)) rows.push(row);
  }
  return rows;
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

export function parseInvoiceCsv(text: string): ParseResult {
  const result: ParseResult = { rows: [], errors: [] };
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

    /* Required fields ----------------------------------------------------- */
    const invoiceNumber = pick(obj, "invoice_number");
    const clientName = pick(obj, "client_name");
    const issueDate = pick(obj, "issue_date", "invoice_date");
    const dueDate = pick(obj, "due_date");
    const grossStr = pick(obj, "gross_amount", "amount");
    const vatStr = pick(obj, "vat_amount");
    const netStr = pick(obj, "net_amount");
    const treatment = pick(obj, "vat_treatment") as VatTreatment | undefined;
    const source = pick(obj, "source_system") as InvoiceSourceSystem | undefined;
    const status = (pick(obj, "status") || "paid") as InvoiceStatus;

    if (!invoiceNumber) {
      result.errors.push({ row: rowNumber, field: "invoice_number", message: "Required" });
      continue;
    }
    if (!clientName) {
      result.errors.push({ row: rowNumber, field: "client_name", message: "Required" });
      continue;
    }
    if (!issueDate) {
      result.errors.push({ row: rowNumber, field: "issue_date", message: "Required" });
      continue;
    }
    if (!dueDate) {
      result.errors.push({ row: rowNumber, field: "due_date", message: "Required" });
      continue;
    }

    const gross = parseNumber(grossStr);
    const vat = parseNumber(vatStr) ?? 0;
    const net = parseNumber(netStr);
    if (gross === null) {
      result.errors.push({ row: rowNumber, field: "gross_amount", message: "Invalid number" });
      continue;
    }
    if (net === null) {
      result.errors.push({ row: rowNumber, field: "net_amount", message: "Invalid number" });
      continue;
    }
    if (!treatment || !ALLOWED_VAT_TREATMENTS.has(treatment)) {
      result.errors.push({
        row: rowNumber,
        field: "vat_treatment",
        message: `Must be one of: ${[...ALLOWED_VAT_TREATMENTS].join(", ")}`,
      });
      continue;
    }
    if (!source || !ALLOWED_SOURCES.has(source)) {
      result.errors.push({
        row: rowNumber,
        field: "source_system",
        message: `Must be one of: ${[...ALLOWED_SOURCES].join(", ")}`,
      });
      continue;
    }
    if (!ALLOWED_STATUSES.has(status)) {
      result.errors.push({
        row: rowNumber,
        field: "status",
        message: `Must be one of: ${[...ALLOWED_STATUSES].join(", ")}`,
      });
      continue;
    }

    /* Optional fields ----------------------------------------------------- */
    const currencyRaw = (pick(obj, "currency") || "GBP").toUpperCase() as InvoiceCurrency;
    const currency = ALLOWED_CURRENCIES.has(currencyRaw) ? currencyRaw : "GBP";
    const gbpEquivalentParsed = parseNumber(pick(obj, "gbp_equivalent"));
    const gbpEquivalent =
      gbpEquivalentParsed !== null ? gbpEquivalentParsed : currency === "GBP" ? gross : gross;
    const paymentDate = pick(obj, "payment_date", "paid_date");
    const sourceTxnId = pick(obj, "source_transaction_id");
    const bankRaw = pick(obj, "bank_account_received_into") as
      | BankAccountReceivedInto
      | undefined;
    const bankAccount =
      bankRaw && ALLOWED_BANK_ACCOUNTS.has(bankRaw) ? bankRaw : undefined;
    const tideTxnId = pick(obj, "tide_transaction_id");
    const notes = pick(obj, "notes");

    const clientEmail = pick(obj, "client_email");
    const clientContactName = pick(obj, "client_contact_name", "contact_name");
    const clientAddress = pick(obj, "client_address");
    const clientCountry = (pick(obj, "client_country") || "GB").toUpperCase();

    const parsed: ParsedRow = {
      row: rowNumber,
      invoice: {
        invoice_number: invoiceNumber,
        client_name: clientName,
        contact_name: clientContactName,
        client_email: clientEmail,
        client_address: clientAddress,
        client_country: clientCountry,
        invoice_date: issueDate,
        due_date: dueDate,
        paid_date: paymentDate,
        items: [syntheticLineItem(net, gross, treatment)],
        currency,
        gross_amount: gross,
        vat_amount: vat,
        net_amount: net,
        gbp_equivalent: gbpEquivalent,
        vat_treatment: treatment,
        source_system: source,
        source_transaction_id: sourceTxnId,
        bank_account_received_into: bankAccount,
        tide_transaction_id: tideTxnId,
        notes,
        status,
      },
      clientName,
      clientEmail,
      clientContactName,
      clientAddress,
      clientCountry,
    };
    result.rows.push(parsed);
  }

  return result;
}

/* ── Client matching ──
 * Match by name first (case-insensitive). If multiple matches, prefer
 * the one with the same email. If no match, returns null and caller
 * creates a new client. */
export function findClient(
  candidate: { name: string; email?: string },
  existing: Client[],
): Client | null {
  const lower = candidate.name.trim().toLowerCase();
  const matches = existing.filter((c) => c.name.trim().toLowerCase() === lower);
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];
  if (candidate.email) {
    const byEmail = matches.find(
      (c) => (c.email || "").toLowerCase() === candidate.email!.toLowerCase(),
    );
    if (byEmail) return byEmail;
  }
  return matches[0];
}
