/* ── Team invoice submit ──
 * Accepts a small JSON payload from /team/invoice and creates an
 * Expense row in finance_expenses. Team role doesn't have direct
 * access to finance_* (RLS denies anon) so this route is the bridge:
 * validates the launchpad-role cookie, builds an Expense with sensible
 * defaults, writes via the service-role client. No Slack ping —
 * submissions are reviewed in /finance/expenses where they land as
 * standard 'due' rows alongside everything else.
 *
 * Defaults applied:
 *   category         = "contractor"   (per payment-structure model)
 *   status           = "due"          (lands ready to pay; Dylan
 *                                      double-checks before the 28th)
 *   vat_treatment    = "outside_scope" (most pod contractors aren't
 *                                      VAT-registered; flip on review
 *                                      if needed)
 *   currency         = "GBP"
 *   tax_year         = derived from issue_date (UK Apr-6 boundary)
 *
 * supplier_id is left blank because we don't auto-create a finance_
 * suppliers row on submit — supplier_name is the snapshot, and Dylan
 * can link to an existing supplier on the expense detail page if he
 * wants the historic association.
 */

import { NextRequest, NextResponse } from "next/server";
import { financeServerClient, FinanceConfigError } from "@/lib/finance/server-supabase";

interface SubmitPayload {
  name: string;
  amount: number;
  invoice_date: string;            // YYYY-MM-DD
  notes?: string;
  file_url?: string;               // signed URL (24h) from /upload
  file_path?: string;              // storage path so finance can re-sign later
  file_name?: string;
}

function requireTeamOrAdmin(req: NextRequest): NextResponse | null {
  const role = req.cookies.get("launchpad-role")?.value;
  if (role !== "team" && role !== "admin" && role !== "cro") {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  return null;
}

/* UK tax year — starts 6 April. Mirrors the helper used by the bulk
 * importer so anything submitted via /team/invoice gets bucketed the
 * same way historical rows do. */
function ukTaxYearLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return "";
  const beforeApril6 = m < 4 || (m === 4 && d < 6);
  const startYear = beforeApril6 ? y - 1 : y;
  const nextTwo = (startYear + 1) % 100;
  return `${startYear}/${String(nextTwo).padStart(2, "0")}`;
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function isValidISODate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
}

export async function POST(req: NextRequest) {
  const unauth = requireTeamOrAdmin(req);
  if (unauth) return unauth;

  let body: SubmitPayload;
  try {
    body = (await req.json()) as SubmitPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // ── Validate ──────────────────────────────────────────────────
  const name = (body.name || "").trim();
  const amount = Number(body.amount);
  const date = (body.invoice_date || "").trim();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
  }
  if (!isValidISODate(date)) {
    return NextResponse.json({ error: "Invoice date must be YYYY-MM-DD" }, { status: 400 });
  }

  // ── Build the Expense row ─────────────────────────────────────
  const now = new Date().toISOString();
  const id = uid();
  const description = body.notes?.trim() || `Team invoice — ${name}`;
  const taxYear = ukTaxYearLabel(date);
  /* The legacy single-amount fields (amount, vat_included, date_due,
   * date_paid) are kept populated alongside the new amount_gbp split.
   * Matches how the rest of the finance UI reads Expense rows — see
   * the comment block on the Expense interface in finance/types.ts. */
  const expense = {
    id,
    supplier_id: undefined,
    supplier_name: name,
    description,
    category: "contractor" as const,

    // Legacy single-amount mirrors
    amount,
    vat_included: false,
    date_due: date,

    // Explicit split (no VAT on contractor invoices unless they tick a box later)
    issue_date: date,
    currency: "GBP" as const,
    amount_native: amount,
    amount_gbp: amount,
    vat_amount_gbp: 0,
    net_amount_gbp: amount,
    vat_treatment: "outside_scope" as const,
    tax_year: taxYear,

    status: "due" as const,

    file_url: body.file_url,
    file_path: body.file_path,
    file_name: body.file_name,

    notes: body.notes?.trim() || undefined,
    created_at: now,
    updated_at: now,
  };

  // ── Insert via service-role client ────────────────────────────
  try {
    const sb = financeServerClient();
    const { error } = await sb.from("finance_expenses").insert({
      id,
      data: expense,
      created_at: now,
      updated_at: now,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } catch (err) {
    if (err instanceof FinanceConfigError) {
      return NextResponse.json(
        { error: err.message, code: "FINANCE_NOT_CONFIGURED" },
        { status: 503 },
      );
    }
    const msg = err instanceof Error ? err.message : "Submit failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ success: true, id });
}
