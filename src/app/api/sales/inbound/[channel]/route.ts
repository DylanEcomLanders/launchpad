/* ── Inbound channel webhook handler ──
 *
 * One catch-all route handler for every channel:
 *   POST /api/sales/inbound/whatsapp
 *   POST /api/sales/inbound/twitter
 *   POST /api/sales/inbound/linkedin
 *   POST /api/sales/inbound/email
 *
 * Body shape (canonical - your channel adapter normalises into this):
 *   { from: string, body: string, external_id?: string, subject?: string }
 *
 * The route resolves a matching Lead, appends an inbound touch, and
 * returns { matched, leadId, reason? }. Provider should retry on 5xx.
 *
 * To plug in a real channel: write an adapter (e.g. a Postmark
 * webhook handler that calls fetch(this URL) with the normalised
 * shape). See docs/integrations.md for the per-channel howto.
 *
 * NOTE: this endpoint is intentionally unauthenticated for
 * simplicity in the v1 stub. Before wiring real providers, add a
 * channel-specific verification step (HMAC, bearer token, etc.) so
 * randos can't inject fake leads. */

import { NextResponse } from "next/server";
import { processInboundMessage } from "@/lib/sales-dashboard/inbound";
import type { InboundChannel } from "@/lib/sales-dashboard/inbound";
import {
  verifyWebhookSignature,
  signatureHeaderName,
} from "@/lib/sales-dashboard/verify-signature";

const SUPPORTED_CHANNELS: InboundChannel[] = ["whatsapp", "twitter", "linkedin", "email"];

export async function POST(
  req: Request,
  { params }: { params: Promise<{ channel: string }> },
) {
  const { channel } = await params;
  if (!SUPPORTED_CHANNELS.includes(channel as InboundChannel)) {
    return NextResponse.json(
      { error: `Unknown channel: ${channel}. Supported: ${SUPPORTED_CHANNELS.join(", ")}` },
      { status: 400 },
    );
  }

  /* Read the raw body once - we need it for the HMAC compare AND
   * for JSON.parse. req.json() consumes the body so we can't call
   * both; read text + parse manually. */
  const rawBody = await req.text();
  const signature = req.headers.get(signatureHeaderName());
  const verify = verifyWebhookSignature(rawBody, signature);
  if (!verify.ok) {
    return NextResponse.json(
      { error: "Signature verification failed", reason: verify.reason },
      { status: 401 },
    );
  }

  let payload: { from?: string; body?: string; external_id?: string; subject?: string };
  try {
    payload = JSON.parse(rawBody) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!payload.from || !payload.body) {
    return NextResponse.json(
      { error: "Required: { from: string, body: string }" },
      { status: 400 },
    );
  }
  const result = await processInboundMessage({
    channel: channel as InboundChannel,
    from: payload.from,
    body: payload.body,
    external_id: payload.external_id,
    subject: payload.subject,
  });
  return NextResponse.json(result, { status: 200 });
}
