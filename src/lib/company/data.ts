/* ── Company module data layer ──
 * Wraps createStore() for each company_* table. Identical pattern to
 * onboarding.ts, changelog/data.ts etc.
 */

import { createStore } from "@/lib/supabase-store";
import type { Person, Invoice, OpenRole, Candidate } from "./types";

export const peopleStore = createStore<Person>({
  table: "company_people",
  lsKey: "launchpad-company-people",
});

export const invoicesStore = createStore<Invoice>({
  table: "company_invoices",
  lsKey: "launchpad-company-invoices",
});

export const openRolesStore = createStore<OpenRole>({
  table: "company_open_roles",
  lsKey: "launchpad-company-open-roles",
});

export const candidatesStore = createStore<Candidate>({
  table: "company_candidates",
  lsKey: "launchpad-company-candidates",
});

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function nowISO(): string {
  return new Date().toISOString();
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

export function fmtMoney(amount: number, currency = "GBP"): string {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

export function deriveInvoiceStatus(inv: Invoice): Invoice["status"] {
  if (inv.status === "paid" || inv.status === "disputed") return inv.status;
  if (inv.due_date) {
    const due = new Date(`${inv.due_date}T23:59:59Z`);
    if (!Number.isNaN(due.getTime()) && due.getTime() < Date.now()) {
      return "overdue";
    }
  }
  return inv.status;
}
