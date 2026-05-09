import type { NextRequest } from "next/server";

export type AuthedRole = "admin" | "cro" | "team";

/**
 * Read the launchpad-role cookie set by AuthGate. Returns the role
 * string when valid, otherwise null. Used by API routes that should
 * be locked down to internal users — stops accidental URL-sharing
 * (and casual curl spam) without standing up a full auth layer.
 *
 * Pass `allow` to restrict further (e.g. ["admin"] for admin-only).
 * Default allows admin + cro; team callers are rejected.
 */
export function authedRole(
  req: NextRequest,
  allow: AuthedRole[] = ["admin", "cro"],
): AuthedRole | null {
  const role = req.cookies.get("launchpad-role")?.value as AuthedRole | undefined;
  if (!role) return null;
  return allow.includes(role) ? role : null;
}
