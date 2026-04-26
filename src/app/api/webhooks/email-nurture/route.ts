import { NextRequest, NextResponse } from "next/server";

// Stub webhook for the email nurture sequence. Wire to Klaviyo / Customer.io
// / Loops here once we pick a provider. For now we just log the payload so
// we can verify the call is happening end-to-end.
//
// Tier C should NOT be added to the same hard-pitch flow as A/B — the spec
// asks us to be soft with under-£30k brands. Branching point belongs here.
export async function POST(req: NextRequest) {
  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  console.log("[email-nurture] payload:", JSON.stringify(payload));
  return NextResponse.json({ ok: true, received: true });
}
