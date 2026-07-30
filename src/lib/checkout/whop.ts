/* ── Agreement Checkout: Whop integration (server only) ──
 *
 * The only external piece of the flow. Reads credentials from env vars (set these
 * in Vercel / .env.local when wiring):
 *   WHOP_API_KEY          - your Whop app API key
 *   WHOP_WEBHOOK_SECRET   - the webhook signing secret from the Whop dashboard
 *   WHOP_ACCESS_PASS_ID   - (if your Whop setup needs a plan attached to an access pass)
 *
 * createCheckoutSession builds a per-deal embedded-checkout config with an INLINE
 * plan (custom amount + one-off/recurring), so no pre-made products are needed.
 * The client renders the returned id as Whop's embedded checkout; the authoritative
 * "paid" flip happens in the webhook (api/whop/webhook), never from the client.
 */

import Whop from "@whop/sdk";
import type { Checkout } from "./types";

export const whop = new Whop({
  apiKey: process.env.WHOP_API_KEY,
  webhookKey: process.env.WHOP_WEBHOOK_SECRET,
});

/** Create an embedded checkout session for one deal. Returns the config id to
 *  mount Whop's embedded checkout with on the client. */
export async function createCheckoutSession(c: Checkout): Promise<string> {
  const company_id = process.env.WHOP_COMPANY_ID ?? "";
  const currency = "gbp" as const; // Whop uses lowercase ISO codes; GBP for now

  const plan =
    c.planType === "renewal"
      ? // retainer -> monthly subscription (billing_period is in days)
        { company_id, currency, plan_type: "renewal" as const, initial_price: c.amountGross, renewal_price: c.amountGross, billing_period: 30 }
      : // project -> single charge
        { company_id, currency, plan_type: "one_time" as const, initial_price: c.amountGross };

  const config = await whop.checkoutConfigurations.create({
    mode: "payment",
    plan,
    metadata: { agreement_id: c.id },
    // If your Whop plan must attach to an access pass, add it on the plan above
    // per your account (access_pass_id: process.env.WHOP_ACCESS_PASS_ID). Confirm
    // the exact plan fields against your Whop dashboard when wiring.
  });

  return config.id;
}
