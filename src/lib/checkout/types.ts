/* ── Agreement Checkout: types ──
 *
 * One record per client deal, carried through sign -> pay -> invoice on a public
 * token link (/checkout/[token]). Signature + invoice are in-house; the pay step
 * uses Whop. Everything logs here (Supabase `checkouts` table).
 *
 * NOTE: this is the CLIENT money-in flow. It is deliberately separate from
 * src/lib/agreements (which is the team NDA/contract flow) to avoid coupling.
 */

export type CheckoutStatus = "draft" | "sent" | "signed" | "paid" | "complete";
export type EngagementType = "retainer" | "project";
/** Whop plan type: retainer -> renewal (subscription), project -> one_time. */
export type PlanType = "renewal" | "one_time";
export type VatStatus = "uk" | "outside" | "none";

export interface Checkout {
  id: string;
  /** The unguessable link token (the URL secret). */
  token: string;

  /* Who + what */
  clientName: string;
  company?: string;
  email: string;
  /** ISO-2 country code from the billing address; "GB" = UK for VAT. */
  billingCountry?: string;
  engagementType: EngagementType;
  planType: PlanType;
  /** Headline (VAT-inclusive) amount in major units, e.g. 10000 = £10,000. */
  amountGross: number;
  currency: string; // "GBP"
  scope?: string;
  termsNote?: string;

  /* Signature (step 1) */
  signedName?: string;
  signedAt?: string;
  /** PNG data URL from SignaturePad, or a storage path once uploaded. */
  signatureImage?: string;
  agreementPdfPath?: string;

  /* Payment (step 2, Whop) */
  whopCheckoutId?: string;
  whopPaymentId?: string;
  whopMembershipId?: string; // set for retainers (the subscription)
  paid?: boolean;
  paidAt?: string;

  /* Invoice (step 3) + VAT breakdown at time of payment */
  invoiceNumber?: string;
  invoicePdfPath?: string;
  vatStatus?: VatStatus;
  amountNet?: number;
  amountVat?: number;

  status: CheckoutStatus;
  created_at: string;
  updated_at: string;
}

export const STATUS_LABEL: Record<CheckoutStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  signed: "Signed",
  paid: "Paid",
  complete: "Complete",
};

/** Retainer bills monthly (Whop subscription); a project is a single charge. */
export function planTypeFor(engagement: EngagementType): PlanType {
  return engagement === "retainer" ? "renewal" : "one_time";
}
