/* ── /api/me/delete-invoice ──
 *
 * Team-side delete for an invoice the user submitted via /me/invoices.
 * Validates they own it (linked_person_id matches the posted person_id)
 * then deletes from both company_invoices AND finance_expenses so the
 * admin's /finance list updates too.
 *
 * Returns { ok: true }.
 */

import { NextResponse, type NextRequest } from "next/server";
import { adminAuthClient, AdminAuthConfigError } from "@/lib/auth/admin-supabase";

interface Body {
  invoice_id?: string;
  person_id?: string;
}

interface InvoiceData {
  linked_person_id?: string;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const invoiceId = body.invoice_id?.trim();
  const personId = body.person_id?.trim();
  if (!invoiceId || !personId) {
    return NextResponse.json(
      { error: "invoice_id and person_id required" },
      { status: 400 },
    );
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

  /* Verify ownership: pull the company_invoices row + check
   * linked_person_id. Stops a logged-in user from deleting someone
   * else's invoice by guessing the id. */
  const { data: row, error: getErr } = await supa
    .from("company_invoices")
    .select("id,data")
    .eq("id", invoiceId)
    .maybeSingle();
  if (getErr) {
    return NextResponse.json({ error: getErr.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }
  const data = (row as { data?: InvoiceData }).data ?? {};
  if (data.linked_person_id !== personId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  /* Delete both sides. Mirror failure is non-fatal - the user-facing
   * row is gone, finance can clean up later if needed. */
  const { error: delErr } = await supa
    .from("company_invoices")
    .delete()
    .eq("id", invoiceId);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  const { error: mirrorErr } = await supa
    .from("finance_expenses")
    .delete()
    .eq("id", invoiceId);
  if (mirrorErr) {
    console.warn(
      "[me/delete-invoice] finance_expenses mirror cleanup failed:",
      mirrorErr.message,
    );
  }

  return NextResponse.json({ ok: true });
}
