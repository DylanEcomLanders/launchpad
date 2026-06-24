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
import {
  verifyUnipileSignature,
  verifyUnipileUrlKey,
  normalizeInboundPayload,
  type UnipileChannel,
} from "@/lib/sales-dashboard/unipile-adapter";

const SUPPORTED_CHANNELS: InboundChannel[] = ["whatsapp", "twitter", "linkedin", "email"];

/* Auth schemes accepted (try in order, first that passes wins):
 *   1. Unipile URL-secret: ?key=... matches UNIPILE_WEBHOOK_KEY env
 *      (canonical for Unipile webhooks - they don't sign payloads,
 *      so the URL is the bearer token)
 *   2. Unipile HMAC: X-Unipile-Signature against UNIPILE_WEBHOOK_SECRET
 *      (future-proof for when/if Unipile adds signing)
 *   3. Generic HMAC: X-Webhook-Signature against SALES_INBOUND_SECRET
 *      (custom adapters / Zapier shims) */

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

  /* Read the raw body once - we need it for HMAC verification AND
   * JSON.parse. req.json() consumes the body so we read text + parse
   * manually below. */
  const rawBody = await req.text();

  /* Try Unipile URL-secret first (canonical). The ?key= query param
   * is on the URL Unipile was given when the webhook was created. */
  const url = new URL(req.url);
  const providedKey = url.searchParams.get("key");
  const urlKeyVerify = verifyUnipileUrlKey(providedKey);

  /* Fall back to HMAC schemes if URL-secret didn't pass. */
  const unipileSig = req.headers.get("x-unipile-signature");
  const genericSig = req.headers.get(signatureHeaderName());

  const unipileHmacVerify =
    !urlKeyVerify.ok && unipileSig
      ? verifyUnipileSignature(rawBody, unipileSig)
      : null;
  const genericVerify =
    !urlKeyVerify.ok && !unipileHmacVerify
      ? verifyWebhookSignature(rawBody, genericSig)
      : null;

  const verify = urlKeyVerify.ok
    ? urlKeyVerify
    : (unipileHmacVerify ?? genericVerify);
  if (!verify || !verify.ok) {
    return NextResponse.json(
      {
        error: "Webhook auth failed",
        reason: verify?.reason ?? "no_auth_provided",
        hint: "Append ?key=<UNIPILE_WEBHOOK_KEY> to the Unipile callback URL, or sign with X-Webhook-Signature.",
      },
      { status: 401 },
    );
  }

  let rawPayload: unknown;
  try {
    rawPayload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  /* If the request came in via Unipile (URL-key OR HMAC), payload
   * shape is provider-specific - normalise into our canonical
   * { from, body, ... } here so processInboundMessage stays agnostic.
   * Generic adapters send the canonical shape directly. */
  const isUnipile = urlKeyVerify.ok || !!unipileSig;
  let canonical: {
    from?: string;
    body?: string;
    external_id?: string;
    subject?: string;
  };
  if (isUnipile) {
    const normalised = normalizeInboundPayload(
      channel as UnipileChannel,
      rawPayload,
    );
    if (!normalised) {
      return NextResponse.json(
        { error: "Unable to normalise Unipile payload - missing from/body" },
        { status: 400 },
      );
    }
    canonical = normalised;
  } else {
    canonical = rawPayload as typeof canonical;
  }

  if (!canonical.from || !canonical.body) {
    return NextResponse.json(
      { error: "Required: { from: string, body: string }" },
      { status: 400 },
    );
  }
  const result = await processInboundMessage({
    channel: channel as InboundChannel,
    from: canonical.from,
    body: canonical.body,
    external_id: canonical.external_id,
    subject: canonical.subject,
  });
  return NextResponse.json(result, { status: 200 });
}
