/* ── Reserve next invoice number ──
 * Calls finance_next_invoice_number(year) and returns the formatted
 * INV-YYYY-NNN string. Server-side so the service role can RPC.
 *
 * Called by the New Invoice form ONLY on save (not on mount) so that
 * abandoned drafts don't leave holes in the sequence.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireFinanceAuth } from "@/lib/finance/server-auth";
import { financeServerClient, FinanceConfigError } from "@/lib/finance/server-supabase";

export async function POST(req: NextRequest) {
  const unauth = requireFinanceAuth(req);
  if (unauth) return unauth;
  const year = new Date().getUTCFullYear();
  try {
    const sb = financeServerClient();
    const { data, error } = await sb.rpc("finance_next_invoice_number", { p_year: year });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const n = Number(data);
    if (!Number.isFinite(n) || n <= 0) {
      return NextResponse.json({ error: "Invalid sequence value" }, { status: 500 });
    }
    return NextResponse.json({ invoice_number: `INV-${year}-${String(n).padStart(3, "0")}` });
  } catch (err) {
    if (err instanceof FinanceConfigError) {
      return NextResponse.json(
        { error: err.message, code: "FINANCE_NOT_CONFIGURED" },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
