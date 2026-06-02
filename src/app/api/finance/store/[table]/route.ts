/* ── Generic finance table CRUD (collection) ──
 * GET    /api/finance/store/[table]            → list all
 * POST   /api/finance/store/[table]            → create  (body = item with id)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireFinanceAuth } from "@/lib/finance/server-auth";
import { financeServerClient, FinanceConfigError } from "@/lib/finance/server-supabase";

const ALLOWED_TABLES = new Set([
  "finance_invoices_issued",
  "finance_expenses",
  "finance_documents",
  "finance_company_profile",
  "finance_clients",
  "finance_monthly_costs",
]);

interface RouteParams {
  params: Promise<{ table: string }>;
}

function configError(err: unknown): NextResponse {
  if (err instanceof FinanceConfigError) {
    return NextResponse.json(
      { error: err.message, code: "FINANCE_NOT_CONFIGURED" },
      { status: 503 },
    );
  }
  return NextResponse.json(
    { error: err instanceof Error ? err.message : "Unknown error" },
    { status: 500 },
  );
}

export async function GET(req: NextRequest, ctx: RouteParams) {
  const unauth = requireFinanceAuth(req);
  if (unauth) return unauth;
  const { table } = await ctx.params;
  if (!ALLOWED_TABLES.has(table)) {
    return NextResponse.json({ error: "Unknown table" }, { status: 400 });
  }
  try {
    const sb = financeServerClient();
    const { data, error } = await sb
      .from(table)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const items = (data || []).map((row: Record<string, unknown>) => ({
      ...(row.data as object),
      id: row.id as string,
    }));
    return NextResponse.json({ items });
  } catch (err) {
    return configError(err);
  }
}

export async function POST(req: NextRequest, ctx: RouteParams) {
  const unauth = requireFinanceAuth(req);
  if (unauth) return unauth;
  const { table } = await ctx.params;
  if (!ALLOWED_TABLES.has(table)) {
    return NextResponse.json({ error: "Unknown table" }, { status: 400 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || !("id" in body)) {
    return NextResponse.json({ error: "Body must include id" }, { status: 400 });
  }
  const { id, ...rest } = body as { id: string; [k: string]: unknown };
  try {
    const sb = financeServerClient();
    const { error } = await sb.from(table).insert({
      id,
      data: rest,
      created_at: new Date().toISOString(),
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, item: body });
  } catch (err) {
    return configError(err);
  }
}
