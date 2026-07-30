/* POST /api/checkout/session
 * Body: { token }. Loads the checkout, creates a Whop embedded-checkout session
 * for it, stores the config id, and returns { sessionId } for the client to
 * mount Whop's embedded checkout. */

import { NextRequest, NextResponse } from "next/server";
import { createCheckoutSession } from "@/lib/checkout/whop";
import { getCheckoutByToken, saveCheckout } from "@/lib/checkout/data";

export async function POST(req: NextRequest) {
  const { token } = (await req.json().catch(() => ({}))) as { token?: string };
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 400 });

  const c = await getCheckoutByToken(token);
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!c.signedAt) return NextResponse.json({ error: "not signed" }, { status: 409 });

  try {
    const sessionId = await createCheckoutSession(c);
    await saveCheckout({ ...c, whopCheckoutId: sessionId, status: "signed", updated_at: new Date().toISOString() });
    return NextResponse.json({ sessionId });
  } catch (err) {
    console.error("[checkout/session] Whop error:", err);
    return NextResponse.json({ error: "checkout failed" }, { status: 500 });
  }
}
