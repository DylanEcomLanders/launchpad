/* ── HMAC webhook signature verification ──
 *
 * Shared between every /api/sales/inbound/{channel} route. Channel
 * adapters compute hmac_sha256(rawBody, SALES_INBOUND_SECRET) and
 * include the hex digest in the `X-Webhook-Signature` header (the
 * `sha256=` prefix is standard convention; we accept with or without).
 *
 * Behaviour by env config:
 *   - SALES_INBOUND_SECRET unset → verification skipped (dev /
 *     pre-integration state, no real providers wired). Logs a
 *     warning once per process so it's visible in Vercel logs.
 *   - SALES_INBOUND_SECRET set → header required + signature must
 *     match a constant-time compare. Rejects with 401 otherwise.
 *
 * Per-channel secrets can be added later (one secret per provider
 * for blast-radius containment); for v1 a single shared secret is
 * enough since Dylan controls every adapter himself.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

const HEADER = "x-webhook-signature";

let warnedAboutMissingSecret = false;

export interface VerifyResult {
  ok: boolean;
  reason?: string;
}

export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): VerifyResult {
  const secret = process.env.SALES_INBOUND_SECRET;

  if (!secret) {
    /* No secret configured. In production this is a misconfiguration:
     * fail CLOSED so an unauthenticated caller can't inject fake leads.
     * Outside production we accept all requests so local curl-testing
     * keeps working, warning once so it's visible in logs. */
    if (process.env.NODE_ENV === "production") {
      return { ok: false, reason: "secret_not_configured" };
    }
    if (!warnedAboutMissingSecret) {
      console.warn(
        "[sales/inbound] SALES_INBOUND_SECRET not set - webhook auth DISABLED (non-production only). Set the env var in Vercel before wiring real providers.",
      );
      warnedAboutMissingSecret = true;
    }
    return { ok: true };
  }

  if (!signatureHeader) {
    return { ok: false, reason: "missing_signature_header" };
  }

  /* Strip "sha256=" prefix if present - matches GitHub / Stripe /
   * Postmark conventions. */
  const provided = signatureHeader.replace(/^sha256=/i, "").trim();
  if (!/^[0-9a-f]+$/i.test(provided) || provided.length !== 64) {
    return { ok: false, reason: "invalid_signature_format" };
  }

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");

  /* Constant-time compare so a timing attack can't recover the
   * expected hash byte-by-byte. */
  const expectedBuf = Buffer.from(expected, "hex");
  const providedBuf = Buffer.from(provided, "hex");
  if (expectedBuf.length !== providedBuf.length) {
    return { ok: false, reason: "signature_length_mismatch" };
  }
  const matches = timingSafeEqual(expectedBuf, providedBuf);
  return matches ? { ok: true } : { ok: false, reason: "signature_mismatch" };
}

export function signatureHeaderName(): string {
  return HEADER;
}
