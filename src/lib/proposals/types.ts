/* ── Proposal types ──
 *
 * Sent after the verbal yes per the playbook closing kit. Tier +
 * terms + guarantee + prepay option, branded shareable output.
 */

export type ProposalStatus =
  | "draft"
  | "sent"
  | "signed"
  | "paid"
  | "kicked_off"
  | "declined";

export type ProposalTier = "Entry" | "Core" | "VIP" | "Custom";

export interface ProposalLineItem {
  id: string;
  label: string;
  detail?: string;
}

export interface Proposal {
  id: string;

  /* Lead bind. Free-text fallback if not from a lead. */
  lead_id?: string;
  brand_name: string;
  brand_url: string;
  contact_name: string;
  contact_email: string;

  /* Tier + pricing */
  tier: ProposalTier;
  monthly_fee: number;
  fee_currency: string;
  scope_items: ProposalLineItem[];        // what's included this month
  custom_scope_notes: string;             // markdown

  /* Terms */
  term_months: number;                    // 3 by default (90-day min)
  prepay: boolean;                        // 10% discount when prepaid
  prepay_discount_pct: number;            // default 10
  guarantee_text: string;                 // markdown
  kickoff_date?: string;                  // YYYY-MM-DD
  payment_method: string;                 // "Whop", "Stripe", etc.

  /* Status + timeline stamps */
  status: ProposalStatus;
  sent_at?: string;
  signed_at?: string;
  paid_at?: string;
  kicked_off_at?: string;
  declined_at?: string;
  declined_reason?: string;

  /* Renewal mode - flips the proposal's framing from a fresh pitch
   * to a continuation. Used at the 90-day mark and onward. */
  is_renewal?: boolean;
  /* If renewal, the previous proposal we're continuing from. */
  renews_from_id?: string;

  /* Output sharing */
  output_slug: string;

  /* Author / owner */
  prepared_by: string;

  created_at: string;
  updated_at: string;
}

export const STATUS_LABEL: Record<ProposalStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  signed: "Signed",
  paid: "Paid",
  kicked_off: "Kicked off",
  declined: "Declined",
};

export const STATUS_TINT: Record<ProposalStatus, string> = {
  draft: "bg-[#222222] text-[#9CA3AF]",
  sent: "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30",
  signed: "bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-500/30",
  paid: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30",
  kicked_off: "bg-emerald-500/25 text-emerald-100 ring-1 ring-emerald-500/40",
  declined: "bg-rose-500/15 text-rose-200 ring-1 ring-rose-500/30",
};

export const STATUS_NEXT: Record<ProposalStatus, ProposalStatus | null> = {
  draft: "sent",
  sent: "signed",
  signed: "paid",
  paid: "kicked_off",
  kicked_off: null,
  declined: null,
};
