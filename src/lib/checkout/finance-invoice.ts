/* ── Agreement Checkout -> Finance invoice bridge (server only) ──
 * On a successful Whop payment we create a real record in the Finance module
 * (finance_invoices_issued) so the payment lands in Finance > Invoices and the
 * client can download the same branded PDF (finance-invoice-pdf) your Finance
 * screens use. Service-role only: called from the whop-payment webhook and the
 * public invoice-data route.
 *
 * VAT: prices are gross (what Whop charged). UK + VAT-registered -> inclusive_20
 * (20% extracted); UK + not registered -> pre_vat_registration; non-UK ->
 * outside_scope ("Outside the scope of UK VAT", matching the sample invoice).
 */

import "server-only";
import { financeServerClient } from "@/lib/finance/server-supabase";
import { calculateVatBreakdown } from "@/lib/finance/vat";
import { businessProfile } from "@/lib/business-profile";
import type { InvoiceIssued, InvoiceLineItem, VatTreatment, CompanyProfile } from "@/lib/finance/types";
import type { Checkout } from "./types";

type SB = ReturnType<typeof financeServerClient>;

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** UK tax year (starts 6 April) for the given date, defaulting to now. */
function currentTaxYear(): number {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth(); // 0 = Jan, 3 = Apr
  return m > 3 || (m === 3 && d.getUTCDate() >= 6) ? y : y - 1;
}

/** Next EL-YYYY-NNN for the current tax year, one above the highest existing. */
async function nextElNumber(sb: SB): Promise<string> {
  const taxYear = currentTaxYear();
  const re = new RegExp(`^EL-${taxYear}-(\\d+)$`);
  let max = 0;
  const { data } = await sb.from("finance_invoices_issued").select("data");
  for (const row of data ?? []) {
    const num = (row.data as { invoice_number?: string } | null)?.invoice_number;
    const m = typeof num === "string" ? num.match(re) : null;
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `EL-${taxYear}-${String(max + 1).padStart(3, "0")}`;
}

/** Read the single Finance company profile, falling back to businessProfile. */
export async function serverCompanyProfile(sb: SB): Promise<CompanyProfile> {
  const { data } = await sb.from("finance_company_profile").select("data").eq("id", "default").maybeSingle();
  if (data?.data) return data.data as CompanyProfile;
  const now = new Date().toISOString();
  return {
    id: "default",
    legal_name: businessProfile.legalName,
    address_lines: [...businessProfile.addressLines],
    company_number: businessProfile.companyNumber,
    vat_number: businessProfile.vatNumber,
    vat_registered: !!businessProfile.vatNumber,
    email: businessProfile.email || undefined,
    website: businessProfile.website || undefined,
    created_at: now,
    updated_at: now,
  };
}

function treatmentFor(c: Checkout, profile: CompanyProfile): VatTreatment {
  const country = (c.billingCountry || "GB").toUpperCase();
  const isUK = country === "GB" || country === "UK";
  if (!isUK) return "outside_scope";
  return profile.vat_registered ? "inclusive_20" : "pre_vat_registration";
}

function lineItemName(c: Checkout): string {
  if (c.engagementType === "retainer") return c.scope || "Conversion Engine Retainer (monthly)";
  return c.scope || "Conversion Engine Project";
}

const CURRENCIES = new Set(["GBP", "USD", "EUR", "AUD", "CAD", "MYR", "SEK"]);

/**
 * Create + persist a Finance invoice for a paid checkout. Returns the reserved
 * number + id (to store on the checkout). Idempotent guard is the caller's job
 * (only call when checkout has no financeInvoiceId yet).
 */
export async function createFinanceInvoiceForCheckout(
  c: Checkout,
  whopPaymentId: string | undefined,
): Promise<{ invoiceNumber: string; invoiceId: string }> {
  const sb = financeServerClient();
  const profile = await serverCompanyProfile(sb);

  // Next EL-YYYY-NNN for the current UK tax year, based on the highest existing
  // number. The finance sequence RPC is NOT synced with the CSV-imported
  // invoices, so it would collide (hand out EL-2026-001 when EL-2026-053 exists).
  // Not strictly atomic, which is fine at checkout volume.
  const invoiceNumber = await nextElNumber(sb);

  const treatment = treatmentFor(c, profile);
  const items: InvoiceLineItem[] = [
    { id: uid(), type: "custom", name: lineItemName(c), quantity: 1, unitPrice: c.amountGross },
  ];
  const b = calculateVatBreakdown(items, treatment);

  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const currency = CURRENCIES.has((c.currency || "GBP").toUpperCase())
    ? ((c.currency || "GBP").toUpperCase() as InvoiceIssued["currency"])
    : "GBP";

  const invoice: InvoiceIssued = {
    id: uid(),
    invoice_number: invoiceNumber,
    client_name: c.company || c.clientName,
    contact_name: c.company ? c.clientName : undefined,
    client_email: c.email,
    client_address: c.clientAddress,
    client_country: (c.billingCountry || "GB").toUpperCase(),
    invoice_date: today,
    due_date: today,
    paid_date: today,
    items,
    currency,
    gross_amount: b.total,
    vat_amount: b.vatAmount,
    net_amount: b.subtotal,
    gbp_equivalent: currency === "GBP" ? b.total : b.total, // same currency for now; convert if multi-ccy later
    vat_treatment: treatment,
    payment_method: "online",
    source_system: "whop",
    source_transaction_id: whopPaymentId || c.whopPaymentId,
    bank_account_received_into: "whop_balance",
    status: "paid",
    created_at: now,
    updated_at: now,
  };

  const { id, ...rest } = invoice;
  const { error } = await sb.from("finance_invoices_issued").insert({ id, data: rest, created_at: now });
  if (error) throw new Error(`invoice insert failed: ${error.message}`);

  return { invoiceNumber, invoiceId: invoice.id };
}

/** For the public invoice-data route: load { invoice, profile } for a checkout. */
export async function loadCheckoutInvoice(
  financeInvoiceId: string,
): Promise<{ invoice: InvoiceIssued; profile: CompanyProfile } | null> {
  const sb = financeServerClient();
  const { data } = await sb.from("finance_invoices_issued").select("*").eq("id", financeInvoiceId).maybeSingle();
  if (!data) return null;
  const invoice = { ...(data.data as object), id: data.id as string } as InvoiceIssued;
  const profile = await serverCompanyProfile(sb);
  return { invoice, profile };
}
