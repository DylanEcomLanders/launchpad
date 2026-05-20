/* ── Re-sign a finance-documents storage path ──
 * Signed URLs expire (15min by default). Caller asks for a fresh URL
 * on demand. Lazy: only signs when the user clicks, never on mount,
 * so an idle tab can't accumulate live URLs.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireFinanceAuth } from "@/lib/finance/server-auth";
import { financeServerClient, FinanceConfigError } from "@/lib/finance/server-supabase";

const BUCKET = "finance-documents";
const DEFAULT_TTL_SECONDS = 15 * 60;

export async function POST(req: NextRequest) {
  const unauth = requireFinanceAuth(req);
  if (unauth) return unauth;
  const body = await req.json().catch(() => ({}));
  const path = typeof body?.path === "string" ? body.path : "";
  const ttl = Number(body?.ttl) > 0 ? Math.min(Number(body.ttl), 3600) : DEFAULT_TTL_SECONDS;
  if (!path) return NextResponse.json({ error: "Missing path" }, { status: 400 });

  try {
    const sb = financeServerClient();
    const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(path, ttl);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ url: data.signedUrl, expires_in: ttl });
  } catch (err) {
    if (err instanceof FinanceConfigError) {
      return NextResponse.json(
        { error: err.message, code: "FINANCE_NOT_CONFIGURED" },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sign failed" },
      { status: 500 },
    );
  }
}
