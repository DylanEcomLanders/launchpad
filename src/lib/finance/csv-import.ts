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
 *
 * Note on multi-currency: gross is in native currency. For non-GBP
 * invoices the net/vat values supplied in the CSV are typically in
 * GBP (HMRC convention) so they will only match the calc's native
 * total for GBP invoices. The native-currency synthetic still
 * displays correctly on the PDF.
 */
function syntheticLineItem(
  net: number,
  gross: number,
  treatment: VatTreatment,
  description?: string,
): InvoiceLineItem {
  const unitPrice =
    treatment === "standard_20" || treatment === "manual" ? net : gross;
  return {
    id: `imported-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    type: "custom",
    name: description?.trim() || "Services rendered",
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
  "tide_direct",
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

/* Auto-derive the bank account from source + currency when the CSV
 * doesn't specify it. Mirrors the four real-world flows:
 *   stripe       → "other"        (sits in Stripe balance until payout)
 *   wise + GBP   → "wise_gbp"
 *   wise + USD   → "wise_usd"
 *   wise + EUR   → "wise_eur"
 *   wise + other → "other"        (less common currencies pool)
 *   whop         → "whop_balance"
 *   tide_direct  → "tide"
 *   direct       → "tide"         (founder-issued, lands in Tide)
 */
function deriveBankAccount(
  source: InvoiceSourceSystem | undefined,
  currency: InvoiceCurrency,
): BankAccountReceivedInto | undefined {
  if (!source) return undefined;
  switch (source) {
    case "stripe":
      return "other";
    case "wise":
      if (currency === "GBP") return "wise_gbp";
      if (currency === "USD") return "wise_usd";
      if (currency === "EUR") return "wise_eur";
      return "other";
    case "whop":
      return "whop_balance";
    case "tide_direct":
    case "direct":
      return "tide";
    default:
      return undefined;
  }
}

/* UK tax year starts 6 April. Returns the start-year string used in the
 * invoice number prefix: "EL-2024-..." for dates in 2024/25, etc. */
function ukTaxYearStart(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  const beforeApril6 = m < 4 || (m === 4 && d < 6);
  return beforeApril6 ? y - 1 : y;
}

/* Fills blank invoice_numbers in a ParsedRow[] using tax-year-aware
 * sequential numbering: sort by date ASC, walk through, assign
 * EL-YYYY-NNN where YYYY is the tax-year-start year and NNN resets at
 * each tax-year boundary. Rows with non-blank invoice_number are left
 * alone. Mutates the input array in place. */
export function assignTaxYearInvoiceNumbers(
  rows: ParsedRow[],
  prefix = "EL",
): void {
  // Sort by date ASC (oldest first), preserving stable order on ties.
  const indexed = rows.map((r, i) => ({ r, i }));
  indexed.sort((a, b) => {
    const cmp = a.r.invoice.invoice_date.localeCompare(b.r.invoice.invoice_date);
    return cmp !== 0 ? cmp : a.i - b.i;
  });
  const counters: Record<number, number> = {};
  for (const { r } of indexed) {
    if (r.invoice.invoice_number && r.invoice.invoice_number.trim() !== "") continue;
    const yearStart = ukTaxYearStart(r.invoice.invoice_date);
    counters[yearStart] = (counters[yearStart] ?? 0) + 1;
    r.invoice.invoice_number = `${prefix}-${yearStart}-${String(counters[yearStart]).padStart(3, "0")}`;
  }
}

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
    // invoice_number is optional in the CSV — if blank, assignTaxYearInvoiceNumbers
    // fills it in after parsing using the UK tax-year cohort.
    const invoiceNumber = pick(obj, "invoice_number") || "";
    const clientName = pick(obj, "client_name", "customer");
    // Accept "date" alias for the founder's import format (their CSV
    // uses `date` rather than `issue_date`).
    const issueDate = pick(obj, "issue_date", "invoice_date", "date");
    // due_date defaults to issue_date when not provided (common for paid-
    // on-issue Stripe/Whop checkouts where there's no formal due date).
    const dueDateExplicit = pick(obj, "due_date");
    // Accept either gross_amount (single-currency) or gross_native +
    // gross_gbp (the founder's CSV uses the latter for multi-currency
    // tracking). vat/net likewise have _gbp aliases since the founder
    // always stores those in GBP.
    const grossStr = pick(obj, "gross_amount", "gross_native", "amount");
    const grossGbpStr = pick(obj, "gbp_equivalent", "gross_gbp");
    const vatStr = pick(obj, "vat_amount", "vat_amount_gbp");
    const netStr = pick(obj, "net_amount", "net_amount_gbp", "net_gbp");
    // vat_treatment defaults to pre_vat_registration for blank rows
    // (matches the bulk historical import use-case).
    const treatmentRaw = pick(obj, "vat_treatment");
    const treatment = (treatmentRaw || "pre_vat_registration") as VatTreatment;
    const source = pick(obj, "source_system") as InvoiceSourceSystem | undefined;
    const status = (pick(obj, "status") || "paid") as InvoiceStatus;

    if (!clientName) {
      result.errors.push({
        row: rowNumber,
        field: "client_name",
        message: "Required (looked for client_name, customer)",
      });
      continue;
    }
    if (!issueDate) {
      result.errors.push({
        row: rowNumber,
        field: "issue_date",
        message: "Required (looked for issue_date, invoice_date, date)",
      });
      continue;
    }
    const dueDate = dueDateExplicit || issueDate;

    const gross = parseNumber(grossStr);
    const vat = parseNumber(vatStr) ?? 0;
    // net defaults to gross when not provided and vat is 0 (typical for
    // pre_vat_registration imports where net == gross).
    const netParsed = parseNumber(netStr);
    if (gross === null) {
      result.errors.push({
        row: rowNumber,
        field: "gross_amount",
        message: "Invalid number (looked for gross_amount, gross_native, amount)",
      });
      continue;
    }
    const net = netParsed !== null ? netParsed : gross - vat;
    if (!ALLOWED_VAT_TREATMENTS.has(treatment)) {
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
    const gbpEquivalent =
      parseNumber(grossGbpStr) ?? (currency === "GBP" ? gross : gross);
    const paymentDate = pick(obj, "payment_date", "paid_date");
    const sourceTxnId = pick(obj, "source_transaction_id", "source_reference");
    const bankRaw = pick(
      obj,
      "bank_account_received_into",
      "bank_received_into",
      "paid_into",
    ) as BankAccountReceivedInto | undefined;
    // Derive from source+currency when the CSV doesn't specify (the
    // historical import has blank paid_into for all 213 rows).
    const bankAccount =
      bankRaw && ALLOWED_BANK_ACCOUNTS.has(bankRaw)
        ? bankRaw
        : deriveBankAccount(source, currency);
    const tideTxnId = pick(obj, "tide_transaction_id");
    const notes = pick(obj, "notes");
    const description = pick(obj, "description");
    const feeGbp = parseNumber(pick(obj, "fee_gbp"));
    const clientTypeRaw = pick(obj, "client_type")?.toUpperCase();
    const clientType: "B2B" | "B2C" | undefined =
      clientTypeRaw === "B2B" ? "B2B" : clientTypeRaw === "B2C" ? "B2C" : undefined;

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
        items: [syntheticLineItem(net, gross, treatment, description)],
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
        fee_gbp: feeGbp ?? undefined,
        client_type: clientType,
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
