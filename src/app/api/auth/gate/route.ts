/* ── POST /api/auth/gate ──
 *
 * Remediation for findings C1 + C3: server-side validation of the shared
 * gate passwords. The browser POSTs { password } here; the server checks
 * it against SERVER-ONLY env vars (never NEXT_PUBLIC, no hardcoded
 * fallbacks) and, on success, sets a signed httpOnly session cookie that
 * API routes can trust (see src/lib/auth/session-cookie.ts).
 *
 * Required env (set in Vercel, server-only):
 *   AUTH_SESSION_SECRET   long random string used to sign the cookie
 *   ADMIN_PASSWORD        admin gate password
 *   CRO_PASSWORD          cro gate password
 *   TEAM_PASSWORD         team gate password
 * Any role whose password env is unset simply cannot authenticate via
 * this route (fail closed). Rotate these after cutover, since the old
 * NEXT_PUBLIC_* values are public in every shipped build.
 *
 * DELETE clears the session cookie (logout).
 */

import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  mintSessionValue,
  type SessionRole,
} from "@/lib/auth/session-cookie";

/** Constant-time string compare that tolerates length differences. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** Map a submitted password to a role using server-only env vars. */
function roleForPassword(password: string): SessionRole | null {
  const admin = process.env.ADMIN_PASSWORD;
  const cro = process.env.CRO_PASSWORD;
  const team = process.env.TEAM_PASSWORD;
  if (admin && safeEqual(password, admin)) return "admin";
  if (cro && safeEqual(password, cro)) return "cro";
  if (team && safeEqual(password, team)) return "team";
  return null;
}

export async function POST(req: NextRequest) {
  if (!process.env.AUTH_SESSION_SECRET) {
    // Fail closed: cannot mint a signed cookie without the secret.
    return NextResponse.json({ error: "Auth not configured" }, { status: 503 });
  }

  let body: { password?: string };
  try {
    body = (await req.json()) as { password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const password = body.password?.trim();
  if (!password) {
    return NextResponse.json({ error: "Password required" }, { status: 400 });
  }

  const role = roleForPassword(password);
  if (!role) {
    return NextResponse.json({ error: "Invalid access code" }, { status: 401 });
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const value = mintSessionValue(role, nowSeconds);
  if (!value) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 503 });
  }

  const res = NextResponse.json({ ok: true, role });
  res.cookies.set(SESSION_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return res;
}
