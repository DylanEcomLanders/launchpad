/* ── /api/me/submit-invoice ──
 *
 * Server-side write into company_invoices using the service role so
 * team-role users can submit invoices even if RLS blocks anon INSERT.
 *
 * ALSO writes a mirror row into finance_expenses so the submission
 * shows up in /finance alongside everything else. Without the mirror,
 * /me/invoices and /team/invoice wrote to different tables and admin
 * would only see the team-invoice submissions in finance.
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

interface PersonData {
  full_name?: string;
  email?: string;
}

/* UK tax year — starts 6 April. Mirrors the helper in
 * /api/team-invoice/submit so /me submissions get bucketed the same
 * way as /team submissions. */
function ukTaxYearLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return "";
  const beforeApril6 = m < 4 || (m === 4 && d < 6);
  const startYear = beforeApril6 ? y - 1 : y;
  const nextTwo = (startYear + 1) % 100;
  return `${startYear}/${String(nextTwo).padStart(2, "0")}`;
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
   * writing invoices against a fake person_id. Also pull the
   * full_name so the finance_expenses mirror has a real supplier. */
  const { data: personRow, error: personErr } = await supa
    .from("company_people")
    .select("id,data")
    .eq("id", inv.linked_person_id)
    .maybeSingle();
  if (personErr) {
    return NextResponse.json({ error: personErr.message }, { status: 500 });
  }
  if (!personRow) {
    return NextResponse.json({ error: "Linked person not found" }, { status: 404 });
  }
  const personData = (personRow as { data?: PersonData }).data ?? {};
  const supplierName = (personData.full_name?.trim() || inv.supplier_name || "Unknown").toString();

  const now = new Date().toISOString();
  const { id, ...rest } = inv;

  /* 1. Write to company_invoices (per-person history surface) */
  const { error: invErr } = await supa.from("company_invoices").insert({
    id,
    data: rest,
    created_at: now,
  });
  if (invErr) {
    return NextResponse.json({ error: invErr.message }, { status: 500 });
  }

  /* 2. Mirror into finance_expenses so it shows in /finance. Schema
   * is { id, data jsonb, created_at } - same shape as company_invoices
   * but with the Expense blob inside the data column. Mirrors what
   * /api/team-invoice/submit writes so the row reads identically in
   * the finance dashboard. */
  const issueDate = inv.issue_date || now.slice(0, 10);
  const amountGbp = inv.currency === "GBP" ? inv.amount : inv.amount; // currency conversion lives downstream
  const expense = {
    id,
    supplier_id: undefined,
    supplier_name: supplierName,
    description: inv.notes?.trim() || `Team invoice — ${supplierName}`,
    category: "contractor" as const,

    // Legacy single-amount mirrors
    amount: inv.amount,
    vat_included: false,
    date_due: inv.due_date || issueDate,

    // Explicit split
    issue_date: issueDate,
    currency: inv.currency || "GBP",
    amount_native: inv.amount,
    amount_gbp: amountGbp,
    vat_amount_gbp: 0,
    net_amount_gbp: amountGbp,
    vat_treatment: "outside_scope" as const,
    tax_year: ukTaxYearLabel(issueDate),

    status: "due" as const,

    file_url: inv.file_url,
    file_name: inv.file_name,

    /* Cross-reference back to the company_invoices row so future
     * tooling can hop between the two surfaces without guessing. */
    linked_company_invoice_id: id,
    linked_person_id: inv.linked_person_id,

    notes: inv.notes?.trim() || undefined,
    created_at: now,
    updated_at: now,
  };

  /* Use the same service-role client - finance_expenses RLS is
   * service-role-only and the admin client has the right key. */
  const { error: expErr } = await supa.from("finance_expenses").insert({
    id,
    data: expense,
    created_at: now,
  });
  if (expErr) {
    /* Don't roll back the company_invoices write - the user already
     * sees their submission, so failing the whole thing would lie
     * to them. Log + continue. */
    console.warn("[me/submit-invoice] finance_expenses mirror failed:", expErr.message);
  }

  return NextResponse.json({ invoice: inv });
}
