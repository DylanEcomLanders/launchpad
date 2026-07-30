/* POST /api/whop/webhook
 * The authoritative "paid" signal. Whop calls this on payment events. We verify
 * the signature, and ONLY on payment.succeeded flip the matching checkout to paid,
 * compute the VAT breakdown, and assign the invoice number.
 *
 * Configure this URL + the signing secret (WHOP_WEBHOOK_SECRET) in your Whop
 * dashboard when wiring: https://<your-domain>/api/whop/webhook
 */

import { NextRequest, NextResponse } from "next/server";
import { whop } from "@/lib/checkout/whop";
import { getCheckoutByToken, saveCheckout } from "@/lib/checkout/data";
import { computeVat } from "@/lib/checkout/vat";

export async function POST(req: NextRequest) {
  const body = await req.text();

  // Loosely typed: the unwrapped event is a big union; we read the fields we need.
  // Confirm the exact `action` string against a real Whop webhook when wiring.
  let event: { action?: string; data?: { id?: string; metadata?: Record<string, unknown> } };
  try {
    event = whop.webhooks.unwrap(body, {
      headers: Object.fromEntries(req.headers),
      key: process.env.WHOP_WEBHOOK_SECRET,
    }) as typeof event;
  } catch (err) {
    console.error("[whop/webhook] signature verification failed:", err);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  // Fulfil only on payment.succeeded, never payment.created / pending.
  if (event.action === "payment.succeeded") {
    const payment = event.data as { id?: string; metadata?: Record<string, unknown> };
    const agreementId = payment?.metadata?.agreement_id as string | undefined;
    if (agreementId) {
      const c = await getCheckoutByToken(agreementId); // token === id
      if (c && !c.paid) {
        const vat = computeVat(c.amountGross, c.billingCountry);
        const now = new Date().toISOString();
        await saveCheckout({
          ...c,
          paid: true,
          paidAt: now,
          whopPaymentId: payment.id,
          status: "paid",
          vatStatus: vat.status,
          amountNet: vat.net,
          amountVat: vat.vat,
          invoiceNumber: c.invoiceNumber ?? `EL-${Date.now().toString(36).toUpperCase()}`,
          updated_at: now,
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
