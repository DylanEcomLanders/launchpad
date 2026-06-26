/* ── /api/me/my-invoices ──
 *
 * Server-side read of company_invoices filtered by linked_person_id.
 * Bypasses RLS the same way /api/me/resolve-person does, so team-role
 * users can see their past submissions on /me/invoices.
 *
 * Returns { invoices: Invoice[] }.
 */

import { NextResponse, type NextRequest } from "next/server";
import { adminAuthClient, AdminAuthConfigError } from "@/lib/auth/admin-supabase";
import type { Invoice } from "@/lib/company/types";

interface Body {
  person_id?: string;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const personId = body.person_id?.trim();
  if (!personId) {
    return NextResponse.json({ invoices: [] });
  }

  let supa;
  try {
    supa = adminAuthClient();
  } catch (err) {
    if (err instanceof AdminAuthConfigError) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    throw err;
  }

  const { data, error } = await supa
    .from("company_invoices")
    .select("id,data,created_at")
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type Row = { id: string; data: Omit<Invoice, "id">; created_at: string };
  const rows = (data ?? []) as Row[];
  const invoices: Invoice[] = rows
    .map((r) => ({ ...r.data, id: r.id }))
    .filter((i) => i.linked_person_id === personId);

  return NextResponse.json({ invoices });
}
