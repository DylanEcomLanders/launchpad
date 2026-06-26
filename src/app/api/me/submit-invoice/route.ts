/* ── /api/me/submit-invoice ──
 *
 * Server-side write into company_invoices using the service role so
 * team-role users can submit invoices even if RLS blocks anon INSERT.
 *
 * Verifies the posted person_id resolves to a real Person row before
 * inserting, so a bad client can't write garbage rows.
 *
 * Returns { invoice: Invoice }.
 */

import { NextResponse, type NextRequest } from "next/server";
import { adminAuthClient, AdminAuthConfigError } from "@/lib/auth/admin-supabase";
import type { Invoice } from "@/lib/company/types";

interface Body {
  invoice?: Invoice;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const inv = body.invoice;
  if (!inv || !inv.id || !inv.linked_person_id) {
    return NextResponse.json({ error: "Invoice missing id or linked_person_id" }, { status: 400 });
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

  /* Sanity: confirm the linked Person exists. Stops a bad client
   * writing invoices against a fake person_id. */
  const { data: personRow, error: personErr } = await supa
    .from("company_people")
    .select("id")
    .eq("id", inv.linked_person_id)
    .maybeSingle();
  if (personErr) {
    return NextResponse.json({ error: personErr.message }, { status: 500 });
  }
  if (!personRow) {
    return NextResponse.json({ error: "Linked person not found" }, { status: 404 });
  }

  const { id, ...rest } = inv;
  const { error } = await supa.from("company_invoices").insert({
    id,
    data: rest,
    created_at: new Date().toISOString(),
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ invoice: inv });
}
