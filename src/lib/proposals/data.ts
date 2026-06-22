/* ── Proposals data layer ── */

import { createStore } from "@/lib/supabase-store";
import type { Proposal, ProposalTier } from "./types";

export const proposalsStore = createStore<Proposal>({
  table: "proposals",
  lsKey: "launchpad-proposals",
});

export function uid(): string {
  return Math.random().toString(36).slice(2, 12);
}
export function nowISO(): string {
  return new Date().toISOString();
}

export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || `proposal-${uid().slice(0, 6)}`;
}

/* Default monthly fee by tier per the playbook. Custom defaults to 0. */
export function defaultMonthlyFee(tier: ProposalTier): number {
  switch (tier) {
    case "Entry": return 5000;
    case "Core": return 10000;
    case "VIP": return 15000;
    default: return 0;
  }
}

/* Default scope bullets per tier - the playbook's per-tier matrix
 * boiled down to what the proposal shows the client. */
export function defaultScopeItems(tier: ProposalTier): { label: string; detail?: string }[] {
  switch (tier) {
    case "Entry":
      return [
        { label: "2 page builds / month" },
        { label: "2 tests / month" },
        { label: "Biweekly strategy calls" },
        { label: "Biweekly results report" },
        { label: "Same-day response SLA" },
        { label: "Dedicated client channel" },
      ];
    case "Core":
      return [
        { label: "4 page builds / month" },
        { label: "4 tests / month" },
        { label: "Weekly strategy call (optional)" },
        { label: "Weekly results report" },
        { label: "Same-day response SLA" },
        { label: "Dedicated client channel" },
      ];
    case "VIP":
      return [
        { label: "6 page builds / month" },
        { label: "12 tests / month (variant + iteration)" },
        { label: "Weekly strategy call" },
        { label: "Weekly results report" },
        { label: "Priority turnaround" },
        { label: "Quarterly brand-strategy call (QBR)" },
        { label: "Same-day response SLA" },
        { label: "Dedicated client channel" },
      ];
    default:
      return [];
  }
}

export const DEFAULT_GUARANTEE = `We guarantee a measurable increase in your conversion rate within the 90-day term, or we keep working at no further cost until you get one. You ship the changes we recommend; we hit the number.`;

/* Build a renewal proposal from a prior signed/paid/kicked-off
 * proposal. Carries forward client + tier + scope by default; admin
 * tweaks before sending. */
export function renewalFrom(prior: Proposal): Proposal {
  const id = uid();
  return {
    ...prior,
    id,
    is_renewal: true,
    renews_from_id: prior.id,
    status: "draft",
    sent_at: undefined,
    signed_at: undefined,
    paid_at: undefined,
    kicked_off_at: undefined,
    declined_at: undefined,
    declined_reason: undefined,
    output_slug: id,
    created_at: nowISO(),
    updated_at: nowISO(),
  };
}

export function emptyProposal(): Proposal {
  const id = uid();
  const tier: ProposalTier = "Core";
  return {
    id,
    brand_name: "",
    brand_url: "",
    contact_name: "",
    contact_email: "",
    tier,
    monthly_fee: defaultMonthlyFee(tier),
    fee_currency: "GBP",
    scope_items: defaultScopeItems(tier).map((s) => ({
      id: uid(),
      label: s.label,
      detail: s.detail,
    })),
    custom_scope_notes: "",
    term_months: 3,
    prepay: false,
    prepay_discount_pct: 10,
    guarantee_text: DEFAULT_GUARANTEE,
    payment_method: "Whop",
    status: "draft",
    output_slug: id,
    prepared_by: "",
    created_at: nowISO(),
    updated_at: nowISO(),
  };
}

/* Total quoted in the term: monthly * term, less prepay discount. */
export function quotedTotal(p: Proposal): number {
  const gross = p.monthly_fee * p.term_months;
  if (!p.prepay) return gross;
  return Math.round(gross * (1 - p.prepay_discount_pct / 100));
}

export function formatMoney(amount: number, currency: string): string {
  const symbol =
    currency === "GBP" ? "£" :
    currency === "USD" ? "$" :
    currency === "EUR" ? "€" : `${currency} `;
  return `${symbol}${amount.toLocaleString()}`;
}
