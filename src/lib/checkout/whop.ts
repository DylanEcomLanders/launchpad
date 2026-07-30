/* ── Agreement Checkout: Whop integration (server only) ──
 *
 * Uses the SAME Whop account + env vars as the existing payment-link tool:
 *   WHOP_API_KEY, WHOP_COMPANY_ID, WHOP_WEBHOOK_SECRET
 * (already set in Vercel). No new product or webhook needed - the plan config
 * mirrors src/app/api/payment-link/route.ts, and payment.succeeded is handled
 * by the existing webhook at /api/webhooks/whop-payment (keyed on our
 * metadata.agreement_id).
 *
 * createCheckoutSession builds a per-deal INLINE plan (custom amount, one-off
 * or monthly, VAT-inclusive) and returns the plan id + session id the client
 * mounts Whop's embedded checkout with. The authoritative "paid" flip is the
 * webhook, never the client.
 */

import Whop from "@whop/sdk";
import type { Checkout } from "./types";

// Lazy singleton: the Whop client throws at construction if WHOP_API_KEY is
// missing, so we build it on first use rather than at module load. That keeps
// the API routes importable before keys are present.
let _whop: Whop | null = null;
export function getWhop(): Whop {
  if (!_whop) {
    if (!process.env.WHOP_API_KEY) throw new Error("WHOP_API_KEY is not set");
    _whop = new Whop({ apiKey: process.env.WHOP_API_KEY, webhookKey: process.env.WHOP_WEBHOOK_SECRET });
  }
  return _whop;
}

export interface CheckoutSession {
  sessionId: string; // ch_... - the checkout configuration id (carries our metadata)
  planId: string; //   plan_... - the inline plan the embed charges
}

/** Create an embedded-checkout session for one deal. */
export async function createCheckoutSession(c: Checkout): Promise<CheckoutSession> {
  const company_id = process.env.WHOP_COMPANY_ID;
  if (!process.env.WHOP_API_KEY) throw new Error("WHOP_API_KEY is not set");
  if (!company_id) throw new Error("WHOP_COMPANY_ID is not set");

  const isRecurring = c.planType === "renewal";

  // Whop needs product details on the inline plan (required for renewal plans,
  // harmless for one-time). Use a pre-made product if WHOP_PRODUCT_ID is set,
  // else find-or-create a single shared "Ecom Landers" product by external id.
  const productLink = process.env.WHOP_PRODUCT_ID
    ? { product_id: process.env.WHOP_PRODUCT_ID }
    : { product: { external_identifier: "ecomlanders-engagements", title: "Ecom Landers" } };

  // Inline plan: hidden, buy-now, tax inclusive (our prices already include VAT).
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const plan: any = {
    company_id,
    currency: "gbp",
    initial_price: c.amountGross,
    title: `${isRecurring ? "Retainer" : "Project"} - ${c.company || c.clientName}`.slice(0, 30),
    description: c.scope || `${isRecurring ? "Monthly retainer" : "Project"} for ${c.clientName}`,
    visibility: "hidden",
    release_method: "buy_now",
    override_tax_type: "inclusive",
    ...productLink,
  };
  if (isRecurring) {
    plan.plan_type = "renewal";
    plan.renewal_price = c.amountGross;
    plan.billing_period = 30; // days
  } else {
    plan.plan_type = "one_time";
    plan.renewal_price = 0;
  }

  const config = await getWhop().checkoutConfigurations.create({
    mode: "payment",
    plan,
    // Top-level currency locks the buyer-facing display currency to GBP (else
    // Whop auto-localises to the buyer's region). Prices are VAT-inclusive GBP.
    currency: "gbp",
    metadata: {
      agreement_id: c.id,
      client_name: c.clientName,
      client_email: c.email || "",
      source: "agreement-checkout",
    },
  });

  const planId = config.plan?.id;
  if (!planId) throw new Error("Whop did not return a plan id for the checkout");
  return { sessionId: config.id, planId };
}
