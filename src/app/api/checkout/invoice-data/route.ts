/* GET /api/checkout/invoice-data?token=...
 * Public (unauthenticated): returns the Finance invoice + company profile for a
 * PAID checkout, so the public /checkout/[token] page can render the invoice PDF
 * client-side. Scoped to a single invoice by the checkout's unguessable token.
 * Returns { pending: true } if the payment webhook has not created the invoice yet.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCheckoutByToken, saveCheckout } from "@/lib/checkout/data";
import { loadCheckoutInvoice, createFinanceInvoiceForCheckout } from "@/lib/checkout/finance-invoice";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 400 });

  const c = await getCheckoutByToken(token);
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!c.paid) return NextResponse.json({ error: "not paid" }, { status: 402 });

  // Create the Finance invoice on demand if the webhook hasn't (or failed). The
  // client only reaches this step after a real Whop payment succeeded, so this
  // is safe; the financeInvoiceId guard keeps it idempotent.
  let financeInvoiceId = c.financeInvoiceId;
  if (!financeInvoiceId) {
    try {
      const res = await createFinanceInvoiceForCheckout(c, c.whopPaymentId);
      financeInvoiceId = res.invoiceId;
      await saveCheckout({ ...c, invoiceNumber: res.invoiceNumber, financeInvoiceId, updated_at: new Date().toISOString() });
    } catch (err) {
      console.error("[invoice-data] on-demand invoice creation failed:", err);
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ pending: true, error: message }, { status: 202 });
    }
  }

  const data = await loadCheckoutInvoice(financeInvoiceId);
  if (!data) return NextResponse.json({ pending: true }, { status: 202 });
  return NextResponse.json(data);
}
