/* ── Signed session cookie (server-only) ──
 *
 * Remediation for audit finding C1: the legacy `launchpad-role` cookie is
 * unsigned, so anyone can set `launchpad-role=admin` and pass every API
 * route that trusts it. This module mints and verifies a TAMPER-PROOF
 * replacement.
 *
 * The cookie value is `<payloadB64url>.<hmacB64url>` where the payload is
 * `<role>.<expiryEpochSeconds>` and the HMAC is SHA-256 over the payload
 * keyed with AUTH_SESSION_SECRET (server-only env, never NEXT_PUBLIC).
 * Verification is constant-time and rejects expired or tampered cookies.
 *
 * This is intentionally a small self-contained primitive (no external
 * dep). For users who sign in via Supabase Auth (magic link / password)
 * the real Supabase JWT is the stronger source of truth; this signed
 * cookie covers the shared-password gate roles (admin / cro / team).
 */

import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "lp_session";
export type SessionRole = "admin" | "cro" | "team";

/** Cookie lifetime: 8h, matching the legacy cookie's work-day window. */
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

function secret(): string | null {
  return process.env.AUTH_SESSION_SECRET || null;
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function sign(payload: string, key: string): string {
  return b64url(createHmac("sha256", key).update(payload).digest());
}

/**
 * Build a signed cookie value for `role`. Returns null if the signing
 * secret is not configured (caller should fail closed).
 */
export function mintSessionValue(role: SessionRole, nowSeconds: number): string | null {
  const key = secret();
  if (!key) return null;
  const exp = nowSeconds + SESSION_MAX_AGE_SECONDS;
  const payload = `${role}.${exp}`;
  return `${b64url(Buffer.from(payload))}.${sign(payload, key)}`;
}

/**
 * Verify a signed cookie value. Returns the role if the signature is
 * valid and the cookie has not expired, otherwise null.
 */
export function verifySessionValue(value: string | undefined, nowSeconds: number): SessionRole | null {
  const key = secret();
  if (!key || !value) return null;

  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const payloadB64 = value.slice(0, dot);
  const providedSig = value.slice(dot + 1);

  let payload: string;
  try {
    payload = Buffer.from(payloadB64.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  } catch {
    return null;
  }

  const expectedSig = sign(payload, key);
  const a = Buffer.from(providedSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const [role, expStr] = payload.split(".");
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < nowSeconds) return null;
  if (role !== "admin" && role !== "cro" && role !== "team") return null;
  return role;
}
