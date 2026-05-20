/* ── Finance module data layer ──
 *
 * All four stores route through /api/finance/store/* (which uses the
 * service-role key server-side). Direct Supabase from the browser is
 * deliberately not used here so finance_* RLS can deny anon entirely.
 */

import { createFinanceStore } from "./client-store";
import type {
  InvoiceIssued,
  Expense,
  FinanceDocument,
  CompanyProfile,
  Client,
} from "./types";

export const invoicesIssuedStore = createFinanceStore<InvoiceIssued>(
  "finance_invoices_issued",
);

export const expensesStore = createFinanceStore<Expense>("finance_expenses");

export const documentsStore = createFinanceStore<FinanceDocument>("finance_documents");

export const companyProfileStore = createFinanceStore<CompanyProfile>(
  "finance_company_profile",
);

export const clientsStore = createFinanceStore<Client>("finance_clients");

/* ── Helpers ── */

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function addDays(dateISO: string, days: number): string {
  const d = new Date(`${dateISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function fmtMoney(amount: number, currency = "GBP"): string {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function fmtMoneyShort(amount: number, currency = "GBP"): string {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount)}`;
  }
}

export function fmtDateUK(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/* ── Reserve next invoice number ──
 *
 * Called on SAVE (not on form mount) so that abandoned drafts don't
 * leave holes in the sequence. Server-side RPC is atomic.
 */
export async function reserveInvoiceNumber(): Promise<string> {
  const res = await fetch("/api/finance/invoice-number", { method: "POST" });
  if (!res.ok) {
    throw new Error("Could not reserve invoice number");
  }
  const json = (await res.json()) as { invoice_number: string };
  return json.invoice_number;
}

/* ── Derived status ── */

export function deriveInvoiceStatus(inv: InvoiceIssued): InvoiceIssued["status"] {
  // disputed / paid / draft are sticky — never auto-flipped to overdue.
  if (inv.status === "paid" || inv.status === "draft" || inv.status === "disputed") {
    return inv.status;
  }
  if (inv.due_date && inv.due_date < todayISO()) return "overdue";
  return inv.status;
}

export function deriveExpenseStatus(exp: Expense): Expense["status"] {
  // Sticky states (never auto-flipped to overdue).
  if (exp.status === "paid" || exp.status === "disputed") return exp.status;
  if (exp.date_due && exp.date_due < todayISO()) return "overdue";
  return "due";
}
