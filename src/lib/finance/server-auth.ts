/* ── Server-side passcode validation ──
 * Compares the launchpad-finance cookie value against the env passcode.
 * Use this on every /api/finance/* route. Returns null if valid,
 * NextResponse 401 otherwise (ready to return).
 */

import "server-only";
import { NextRequest, NextResponse } from "next/server";

const PASSCODE = process.env.NEXT_PUBLIC_FINANCE_PASSCODE || "finance2026";

export function requireFinanceAuth(req: NextRequest): NextResponse | null {
  const cookieValue = req.cookies.get("launchpad-finance")?.value;
  if (!cookieValue || cookieValue !== PASSCODE) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  return null;
}
