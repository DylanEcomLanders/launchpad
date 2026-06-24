import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionValue } from "@/lib/auth/session-cookie";

export type AuthedRole = "admin" | "cro" | "team";

/**
 * Resolve the caller's role for API authorization.
 *
 * Prefers the SIGNED, tamper-proof session cookie minted by
 * /api/auth/gate (see session-cookie.ts). This is the C1 remediation:
 * the role can no longer be forged by setting a plain cookie value.
 *
 * During the transition it falls back to the legacy UNSIGNED
 * `launchpad-role` cookie so existing routes keep working while the
 * client is migrated onto the gate route. That fallback is forgeable,
 * so once the client fully uses /api/auth/gate, set AUTH_LEGACY_COOKIE=off
 * in the environment to disable it and fully close C1.
 *
 * Pass `allow` to restrict further (e.g. ["admin"] for admin-only).
 * Default allows admin + cro; team callers are rejected.
 */
export function authedRole(
  req: NextRequest,
  allow: AuthedRole[] = ["admin", "cro"],
): AuthedRole | null {
  // 1. Signed session cookie (trusted).
  const signed = verifySessionValue(
    req.cookies.get(SESSION_COOKIE)?.value,
    Math.floor(Date.now() / 1000),
  );
  if (signed) return allow.includes(signed) ? signed : null;

  // 2. Legacy unsigned cookie (transition only; disable with AUTH_LEGACY_COOKIE=off).
  if (process.env.AUTH_LEGACY_COOKIE !== "off") {
    const legacy = req.cookies.get("launchpad-role")?.value as AuthedRole | undefined;
    if (legacy && allow.includes(legacy)) return legacy;
  }
  return null;
}
