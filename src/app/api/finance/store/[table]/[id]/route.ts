/* ── Single-row finance CRUD ──
 * GET    → fetch by id
 * PATCH  → merge updates into data
 * DELETE → delete row
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
  params: Promise<{ table: string; id: string }>;
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
  const { table, id } = await ctx.params;
  if (!ALLOWED_TABLES.has(table)) {
    return NextResponse.json({ error: "Unknown table" }, { status: 400 });
  }
  try {
    const sb = financeServerClient();
    const { data, error } = await sb.from(table).select("*").eq("id", id).maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ item: null });
    const row = data as Record<string, unknown>;
    return NextResponse.json({ item: { ...(row.data as object), id: row.id as string } });
  } catch (err) {
    return configError(err);
  }
}

export async function PATCH(req: NextRequest, ctx: RouteParams) {
  const unauth = requireFinanceAuth(req);
  if (unauth) return unauth;
  const { table, id } = await ctx.params;
  if (!ALLOWED_TABLES.has(table)) {
    return NextResponse.json({ error: "Unknown table" }, { status: 400 });
  }
  const updates = await req.json().catch(() => null);
  if (!updates || typeof updates !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  try {
    const sb = financeServerClient();
    const { data: existing, error: getErr } = await sb
      .from(table)
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (getErr) return NextResponse.json({ error: getErr.message }, { status: 500 });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const current = (existing as Record<string, unknown>).data as Record<string, unknown>;
    const { id: _ignore, ...patch } = updates as Record<string, unknown>;
    void _ignore;
    // Convention: a key with value `null` in the patch means "delete this
    // field from the stored data". Lets clients clear optional fields,
    // since JSON.stringify strips undefined and would otherwise leave
    // stale values in place.
    const merged: Record<string, unknown> = { ...current };
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) {
        delete merged[k];
      } else {
        merged[k] = v;
      }
    }
    const { error: updErr } = await sb.from(table).update({ data: merged }).eq("id", id);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
    return NextResponse.json({ item: { ...merged, id } });
  } catch (err) {
    return configError(err);
  }
}

export async function DELETE(req: NextRequest, ctx: RouteParams) {
  const unauth = requireFinanceAuth(req);
  if (unauth) return unauth;
  const { table, id } = await ctx.params;
  if (!ALLOWED_TABLES.has(table)) {
    return NextResponse.json({ error: "Unknown table" }, { status: 400 });
  }
  try {
    const sb = financeServerClient();
    const { error } = await sb.from(table).delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return configError(err);
  }
}
