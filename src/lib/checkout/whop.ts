/* ── Agreement Checkout: Whop integration (server only) ──
 *
 * The only external piece of the flow. Reads credentials from env vars:
 *   WHOP_API_KEY         - a company API key with checkout_configuration:create,
 *                          plan:create, access_pass:create/update permissions
 *   WHOP_WEBHOOK_SECRET  - the webhook signing secret from the Whop dashboard
 *   WHOP_COMPANY_ID      - your Whop company id (biz_...)
 *   WHOP_PRODUCT_ID      - (optional) an existing product/access-pass id (prod_...)
 *                          to hang the plans off. If unset we find-or-create one.
 *
 * createCheckoutSession builds a per-deal checkout with an INLINE plan (custom
 * amount, one-off or monthly), so no pre-made pricing is needed. It returns the
 * plan id + session id the client mounts Whop's embedded checkout with. The
 * authoritative "paid" flip happens in the webhook (api/whop/webhook), never
 * from the client.
 */

import Whop from "@whop/sdk";
import type { Checkout } from "./types";

// Lazy singleton: the Whop client throws at construction if WHOP_API_KEY is
// missing, so we build it on first use (inside a try/catch) rather than at
// module load. That keeps the API routes importable before keys are wired.
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

  // Base currency is GBP (prices are VAT-inclusive, UK-first). Whop can still
  // present the buyer's local currency if adaptivePricing is turned on client-side.
  const currency = "gbp" as const;

  // Hang the plan off a product: a pre-made one if given, else find-or-create a
  // single shared "Ecom Landers" product (keyed by external_identifier).
  const productLink = process.env.WHOP_PRODUCT_ID
    ? { product_id: process.env.WHOP_PRODUCT_ID }
    : { product: { external_identifier: "ecomlanders-engagements", title: "Ecom Landers" } };

  const base = {
    company_id,
    currency,
    description: c.scope || undefined,
    ...productLink,
  };

  const plan =
    c.planType === "renewal"
      ? // retainer -> monthly subscription (billing_period is in days)
        { ...base, plan_type: "renewal" as const, initial_price: c.amountGross, renewal_price: c.amountGross, billing_period: 30 }
      : // project -> single charge
        { ...base, plan_type: "one_time" as const, initial_price: c.amountGross };

  const config = await getWhop().checkoutConfigurations.create({
    mode: "payment",
    plan,
    metadata: { agreement_id: c.id },
  });

  const planId = config.plan?.id;
  if (!planId) throw new Error("Whop did not return a plan id for the checkout");
  return { sessionId: config.id, planId };
}
