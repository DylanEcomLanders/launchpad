/* ── Unipile adapter ──
 *
 * Single integration point for outbound + inbound messaging across
 * every channel Unipile bridges (Gmail, WhatsApp, LinkedIn, Instagram,
 * Telegram, X). The launchpad never talks to those networks directly
 * - it talks to Unipile's REST API, which talks to Ajay's linked
 * accounts.
 *
 * Architecture:
 *   Launchpad → Unipile API → Ajay's actual accounts → recipients
 *   recipients → Ajay's accounts → Unipile webhook → Launchpad
 *
 * Config (all optional - missing env vars trigger stub-mode):
 *   UNIPILE_API_KEY              required for any live dispatch
 *   UNIPILE_DSN                  Unipile-assigned API base URL
 *                                (e.g. https://api1.unipile.com:13111)
 *   UNIPILE_WEBHOOK_SECRET       HMAC secret for inbound webhook auth
 *   UNIPILE_EMAIL_ACCOUNT_ID     per-channel account IDs - shown in
 *   UNIPILE_WHATSAPP_ACCOUNT_ID  Unipile's dashboard after you connect
 *   UNIPILE_LINKEDIN_ACCOUNT_ID  each account (Gmail OAuth, WA QR,
 *                                LinkedIn login)
 *
 * Stub-mode (no UNIPILE_API_KEY):
 *   - sendMessage() returns ok:true with stubbed:true
 *   - caller still records the outbound touch so the inbox feels real
 *   - good for dev + while the account is being onboarded
 *
 * Live-mode (UNIPILE_API_KEY set):
 *   - sendMessage() hits the Unipile API
 *   - errors bubble back to the caller with a structured reason
 *   - caller still records the touch so the dashboard is the source
 *     of truth (Unipile is just the transport)
 *
 * Unipile endpoint paths below are placeholders matching their
 * documented v1 shape at the time of writing. Verify against their
 * latest docs (https://developer.unipile.com/) once the account is
 * provisioned - they version their API so the structure is stable
 * but specific paths can shift.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export type UnipileChannel =
  | "email"
  | "whatsapp"
  | "twitter"
  | "linkedin"
  | "instagram"
  | "telegram";

/* The 4 channels the sales dashboard actively wires today. Adding
 * more (instagram, telegram) is just an env var + a new account
 * connection in Unipile - the adapter handles them transparently. */
export const ACTIVE_CHANNELS: UnipileChannel[] = [
  "email",
  "whatsapp",
  "twitter",
  "linkedin",
];

/* ── Config ────────────────────────────────────────────────────── */

function envAccountId(channel: UnipileChannel): string | undefined {
  switch (channel) {
    case "email":
      return process.env.UNIPILE_EMAIL_ACCOUNT_ID;
    case "whatsapp":
      return process.env.UNIPILE_WHATSAPP_ACCOUNT_ID;
    case "linkedin":
      return process.env.UNIPILE_LINKEDIN_ACCOUNT_ID;
    case "twitter":
      return process.env.UNIPILE_TWITTER_ACCOUNT_ID;
    case "instagram":
      return process.env.UNIPILE_INSTAGRAM_ACCOUNT_ID;
    case "telegram":
      return process.env.UNIPILE_TELEGRAM_ACCOUNT_ID;
  }
}

/* "Live" = we have everything needed to send on this channel: the
 * shared API key, the DSN, AND the per-channel account ID. Missing
 * any of those = stub-mode. */
export function isChannelLive(channel: UnipileChannel): boolean {
  return (
    !!process.env.UNIPILE_API_KEY &&
    !!process.env.UNIPILE_DSN &&
    !!envAccountId(channel)
  );
}

/* Summary the UI uses to render the per-channel status chip. Returns
 * a flat object keyed by channel so React components don't have to
 * hit process.env (they can't anyway - this runs server-side). */
export function channelStatuses(): Record<
  UnipileChannel,
  { live: boolean; missing: string[] }
> {
  const result = {} as Record<UnipileChannel, { live: boolean; missing: string[] }>;
  for (const channel of ACTIVE_CHANNELS) {
    const missing: string[] = [];
    if (!process.env.UNIPILE_API_KEY) missing.push("UNIPILE_API_KEY");
    if (!process.env.UNIPILE_DSN) missing.push("UNIPILE_DSN");
    if (!envAccountId(channel)) {
      missing.push(`UNIPILE_${channel.toUpperCase()}_ACCOUNT_ID`);
    }
    result[channel] = { live: missing.length === 0, missing };
  }
  return result;
}

/* ── Outbound send ─────────────────────────────────────────────── */

export interface SendInput {
  channel: UnipileChannel;
  /* recipient handle - shape varies by channel:
   *   email: 'foo@bar.com'
   *   whatsapp: '+447123456789' (E.164)
   *   linkedin: provider URN or profile URL
   *   twitter: @handle or user_id */
  recipient: string;
  body: string;
  subject?: string; // email only
}

export interface SendResult {
  ok: boolean;
  stubbed: boolean;
  providerMessageId?: string;
  error?: string;
}

export async function sendMessage(input: SendInput): Promise<SendResult> {
  if (!isChannelLive(input.channel)) {
    /* Stub-mode: log + return ok so callers continue recording the
     * outbound touch. Real dispatch happens when env vars are set. */
    console.info(
      `[unipile/stub] ${input.channel} → ${input.recipient}: ${input.body.slice(0, 80)}`,
    );
    return { ok: true, stubbed: true };
  }

  const apiKey = process.env.UNIPILE_API_KEY!;
  const dsn = process.env.UNIPILE_DSN!.replace(/\/+$/, "");
  const accountId = envAccountId(input.channel)!;

  /* Unipile's send endpoint - per their v1 docs, send shape is
   * channel-agnostic at the protocol level; the api routes the
   * payload to the right network based on account_id. Worth
   * double-checking against their latest docs once the account is
   * provisioned. */
  const url = `${dsn}/api/v1/messages`;
  const payload: Record<string, unknown> = {
    account_id: accountId,
    recipient: input.recipient,
    body: input.body,
  };
  if (input.subject) payload.subject = input.subject;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(
        `[unipile] send ${input.channel} failed: ${res.status} ${text.slice(0, 200)}`,
      );
      return {
        ok: false,
        stubbed: false,
        error: `Unipile responded ${res.status}: ${text.slice(0, 200)}`,
      };
    }
    const json = (await res.json().catch(() => ({}))) as {
      id?: string;
      message_id?: string;
    };
    return {
      ok: true,
      stubbed: false,
      providerMessageId: json.id ?? json.message_id,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[unipile] send ${input.channel} threw:`, message);
    return { ok: false, stubbed: false, error: message };
  }
}

/* ── Inbound webhook ───────────────────────────────────────────── */

/* Unipile signs each webhook with HMAC SHA256 using the secret you
 * configured in their dashboard. Header name is "X-Unipile-Signature"
 * per their docs. We strip the optional "sha256=" prefix (matches
 * GitHub / Stripe / Postmark convention). */
export function verifyUnipileSignature(
  rawBody: string,
  signatureHeader: string | null,
): { ok: boolean; reason?: string } {
  const secret = process.env.UNIPILE_WEBHOOK_SECRET;
  if (!secret) {
    /* No webhook secret configured. Fail CLOSED in production - an
     * unauthenticated POST would let randos inject fake leads. In
     * dev we still accept so curl-testing keeps working. */
    if (process.env.NODE_ENV === "production") {
      return { ok: false, reason: "unipile_secret_not_configured" };
    }
    return { ok: true };
  }
  if (!signatureHeader) return { ok: false, reason: "missing_signature_header" };
  const provided = signatureHeader.replace(/^sha256=/i, "").trim();
  if (!/^[0-9a-f]+$/i.test(provided) || provided.length !== 64) {
    return { ok: false, reason: "invalid_signature_format" };
  }
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const providedBuf = Buffer.from(provided, "hex");
  if (expectedBuf.length !== providedBuf.length) {
    return { ok: false, reason: "signature_length_mismatch" };
  }
  return timingSafeEqual(expectedBuf, providedBuf)
    ? { ok: true }
    : { ok: false, reason: "signature_mismatch" };
}

/* Canonical normalised inbound shape - matches what processInboundMessage
 * in lib/sales-dashboard/inbound.ts expects. */
export interface NormalisedInbound {
  channel: UnipileChannel;
  from: string;
  body: string;
  external_id?: string;
  subject?: string;
}

/* Unipile's webhook payload nests differently per channel - email
 * carries headers + subject, WhatsApp carries phone + media, etc.
 * Normalise into our canonical shape here so the inbound route
 * handler stays channel-agnostic. Verify against the actual Unipile
 * payload schema once the first webhook lands. */
export function normalizeInboundPayload(
  channel: UnipileChannel,
  payload: unknown,
): NormalisedInbound | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;

  /* Common fields across Unipile's payloads. Their docs show a
   * "data" envelope around the actual message - peel one layer if
   * present, fall back to the root otherwise. */
  const data = (p.data && typeof p.data === "object" ? p.data : p) as Record<
    string,
    unknown
  >;

  const from = pickString(data, ["from", "sender", "from_handle", "from_email"]);
  const body = pickString(data, ["body", "text", "message", "content"]);
  const subject = pickString(data, ["subject"]);
  const external_id = pickString(data, ["id", "message_id", "external_id"]);

  if (!from || !body) return null;
  return { channel, from, body, external_id, subject };
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return undefined;
}
