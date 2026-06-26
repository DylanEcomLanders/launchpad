/* ── /api/me/my-invoices ──
 *
 * Server-side read of company_invoices filtered by linked_person_id,
 * with the live status overlaid from finance_expenses.
 *
 * Why the overlay: /me/invoices submissions write to both
 * company_invoices (per-person history) and finance_expenses (the
 * finance team's source of truth for status/payment). When admin
 * marks an expense paid in /finance, finance_expenses.status flips
 * but company_invoices.status stays at "pending" forever. Reading
 * with the overlay means the team sees the live status (paid /
 * overdue / disputed) the same moment /finance does.
 *
 * Status mapping is 1:1 except "due" (Expense) → "pending" (Invoice).
 *
 * Returns { invoices: Invoice[] }.
 */

import { NextResponse, type NextRequest } from "next/server";
import { adminAuthClient, AdminAuthConfigError } from "@/lib/auth/admin-supabase";
import type { Invoice, InvoiceStatus } from "@/lib/company/types";

interface Body {
  person_id?: string;
}

interface ExpenseData {
  status?: "due" | "paid" | "overdue" | "disputed";
  date_paid?: string;
  linked_company_invoice_id?: string;
}

function mapExpenseStatus(s: ExpenseData["status"]): InvoiceStatus {
  if (s === "due") return "pending";
  if (s === "paid") return "paid";
  if (s === "overdue") return "overdue";
  if (s === "disputed") return "disputed";
  return "pending";
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

  /* Fetch the user's submissions (company_invoices) and every
   * finance_expenses row in parallel. The expense set is filtered
   * by either matching id OR matching linked_company_invoice_id /
   * linked_person_id so we don't miss the cross-reference no matter
   * which lane wrote the row. */
  const [invRes, expRes] = await Promise.all([
    supa.from("company_invoices").select("id,data,created_at").order("created_at", { ascending: false }),
    supa.from("finance_expenses").select("id,data"),
  ]);

  if (invRes.error) {
    return NextResponse.json({ error: invRes.error.message }, { status: 500 });
  }

  type InvRow = { id: string; data: Omit<Invoice, "id">; created_at: string };
  const invRows = (invRes.data ?? []) as InvRow[];
  const myInvoices = invRows
    .map((r) => ({ ...r.data, id: r.id }))
    .filter((i) => i.linked_person_id === personId);

  /* Build a status lookup keyed by both the expense's own id AND
   * its linked_company_invoice_id. Submissions made via
   * /api/me/submit-invoice share the id; older or imported rows
   * may use the linked field instead. */
  type ExpRow = { id: string; data: ExpenseData };
  const expRows = (expRes.data ?? []) as ExpRow[];
  const statusById = new Map<string, { status: InvoiceStatus; date_paid?: string }>();
  for (const r of expRows) {
    const mapped = mapExpenseStatus(r.data?.status);
    const entry = { status: mapped, date_paid: r.data?.date_paid };
    statusById.set(r.id, entry);
    const linked = r.data?.linked_company_invoice_id;
    if (linked && !statusById.has(linked)) {
      statusById.set(linked, entry);
    }
  }

  const invoices = myInvoices.map((i) => {
    const live = statusById.get(i.id);
    if (!live) return i;
    return {
      ...i,
      status: live.status,
      ...(live.date_paid ? { date_paid: live.date_paid } : {}),
    };
  });

  return NextResponse.json({ invoices });
}
