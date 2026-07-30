/* GET /api/checkout/invoice-data?token=...
 * Public (unauthenticated): returns the Finance invoice + company profile for a
 * PAID checkout, so the public /checkout/[token] page can render the invoice PDF
 * client-side. Scoped to a single invoice by the checkout's unguessable token.
 * Returns { pending: true } if the payment webhook has not created the invoice yet.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCheckoutByToken } from "@/lib/checkout/data";
import { loadCheckoutInvoice } from "@/lib/checkout/finance-invoice";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 400 });

  const c = await getCheckoutByToken(token);
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!c.paid) return NextResponse.json({ error: "not paid" }, { status: 402 });
  // Webhook may not have created the invoice yet (fires a beat after payment).
  if (!c.financeInvoiceId) return NextResponse.json({ pending: true }, { status: 202 });

  const data = await loadCheckoutInvoice(c.financeInvoiceId);
  if (!data) return NextResponse.json({ pending: true }, { status: 202 });
  return NextResponse.json(data);
}
