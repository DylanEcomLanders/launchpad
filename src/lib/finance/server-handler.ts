/* ── Server-side route handler wrapper ──
 * Catches FinanceConfigError (env not set) and unexpected throws,
 * returning a consistent JSON error shape so the client can display
 * something useful instead of a blank 500.
 */

import "server-only";
import { NextResponse } from "next/server";
import { FinanceConfigError } from "./server-supabase";

export async function withFinance<T>(
  fn: () => Promise<T>,
): Promise<NextResponse> {
  try {
    const result = await fn();
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof FinanceConfigError) {
      return NextResponse.json(
        { error: err.message, code: "FINANCE_NOT_CONFIGURED" },
        { status: 503 },
      );
    }
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Unknown error",
        code: "UNEXPECTED",
      },
      { status: 500 },
    );
  }
}
