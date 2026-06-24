/* ── Pipeline (Lead) types ──
 *
 * The 3 paths in match the playbook (Acquisition / Sales motion):
 *
 *   - upsell: existing client → retainer (warmest)
 *   - warm: inbound or referred lead with prior trust
 *   - cold_audit_first: cold lead, warmed via free teardown +
 *     paid Discovery Audit
 *   - cold_direct: cold lead going straight to call (rare)
 *
 * Stages are deliberate: every lead carries a stage + next action
 * + date. Anything without those three is a leak.
 */

export type LeadPath =
  | "upsell"
  | "warm"
  | "cold_audit_first"
  | "cold_direct";

export type LeadStage =
  | "new"               // just landed, no contact yet
  | "qualified"         // hit on the qualifying questions, fits ICP
  | "discovery_audit"   // bought / scheduled the audit
  | "proposed"          // proposal sent, awaiting decision
  | "closed_won"        // signed
  | "closed_lost"       // dead, with reason
  | "nurture";          // long-term, out of active pipeline

/* One touch in the per-lead history. Append-only - editing past
 * touches would muddy the actual contact record. */
export type LeadTouchKind =
  | "outreach_sent"
  | "reply_received"
  | "call_booked"
  | "call_done"
  | "audit_sent"
  | "audit_delivered"
  | "proposal_sent"
  | "follow_up"
  | "internal_note";

export interface LeadTouch {
  id: string;
  kind: LeadTouchKind;
  at: string;                  // ISO
  by: string;                  // closer / strategist name
  summary: string;             // free-text - what happened
  /* Provider-side message id (e.g. WhatsApp message_id from Unipile).
   * Set when the touch came from a real channel send/receive or from
   * history backfill. Dedup key for backfill - prevents re-importing
   * the same historical message twice. Undefined for legacy touches
   * and manual log entries. */
  external_id?: string;
  /* Channel the touch came in on - "whatsapp", "linkedin", "email",
   * etc. Used by the inbox to render the correct chip. Undefined for
   * legacy touches (rendered as "manual"). */
  channel?: string;
}

/* ── Sales call (structured by the playbook's 4-phase script) ──
 *
 * The closer captures a call against the spine: Frame → Discovery
 * → Demo → Close. Discovery's qualifying questions are first-class
 * fields, not free text, so the form mirrors the script and the
 * answers stay structured for later analysis.
 */

export interface SalesCallDiscovery {
  monthly_revenue: string;            // their answer to the rev-band question
  biggest_funnel_loss: string;
  prior_cro_tried: string;
  decision_maker: string;             // who owns site + can approve changes
  prize_value: string;                // what's it worth if we lift the metric
  why_now: string;
}

export type SalesCallOutcome =
  | "next_step_booked"
  | "audit_sold"
  | "retainer_signed"
  | "no_decision"
  | "passed";

export interface SalesCall {
  id: string;
  ran_by: string;                     // closer
  called_at: string;                  // ISO
  duration_minutes?: number;

  /* Phase notes. Discovery has its own structured fields above;
   * these markdown blobs are for the rest of the script. */
  frame_notes: string;
  discovery: SalesCallDiscovery;
  discovery_notes: string;
  demo_notes: string;
  close_notes: string;

  /* Outcome + the next step the call has to end on. */
  outcome?: SalesCallOutcome;
  next_action_booked: string;         // free-text - next call date / audit sent / etc.

  created_at: string;
  updated_at: string;
}

export const OUTCOME_LABEL: Record<SalesCallOutcome, string> = {
  next_step_booked: "Next step booked",
  audit_sold: "Audit sold",
  retainer_signed: "Retainer signed",
  no_decision: "No decision (re-touch)",
  passed: "Passed",
};

export const OUTCOME_TINT: Record<SalesCallOutcome, string> = {
  next_step_booked: "bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-500/30",
  audit_sold: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30",
  retainer_signed: "bg-emerald-500/25 text-emerald-100 ring-1 ring-emerald-500/40",
  no_decision: "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30",
  passed: "bg-rose-500/15 text-rose-200 ring-1 ring-rose-500/30",
};

export interface Lead {
  id: string;

  /* ── Identity ── */
  full_name: string;
  brand_name: string;
  brand_url: string;
  email: string;
  phone?: string;

  /* ── Pipeline state ── */
  path: LeadPath;
  stage: LeadStage;
  /* Source - where the lead came from. Free-text so the team can
   * type "Outbound agency / X DM / Apollo / Referral - Jamie" etc.
   * Aggregated reporting later. */
  source: string;
  owner: string;               // closer / strategist responsible

  /* Monthly revenue band - free-form, drives tier-fit (£200k-£400k
   * → Entry, £400k-£800k → Core, £800k+ → VIP). */
  revenue_band: string;

  /* ── Cadence ── pipeline hygiene fields ── */
  first_touch_at?: string;     // ISO - when we first contacted
  last_touched_at?: string;    // ISO - most recent touch
  next_action: string;         // free-text - what's next
  next_action_date?: string;   // YYYY-MM-DD

  /* ── Decision close ── */
  closed_at?: string;          // ISO - when closed_won or closed_lost
  closed_reason?: string;      // free-text - why lost / which tier

  /* ── Artefacts ── one-way refs into other modules; no FK enforced ── */
  discovery_audit_id?: string;  // → discovery_audits.id
  proposal_id?: string;         // → proposals.id (Phase 2D)

  /* ── Body ── markdown notes + append-only touch log ── */
  notes: string;
  touches: LeadTouch[];

  /* Sales calls captured against this lead. Each call follows the
   * playbook's 4-phase spine (Frame / Discovery / Demo / Close).
   * Newest first in the UI. */
  sales_calls: SalesCall[];

  created_at: string;
  updated_at: string;
}

/* Labels for the path picker, in funnel-order. */
export const PATH_LABEL: Record<LeadPath, string> = {
  upsell: "Existing client (upsell)",
  warm: "Warm lead",
  cold_audit_first: "Cold → audit-first",
  cold_direct: "Cold → direct call",
};

export const PATH_ORDER: LeadPath[] = [
  "upsell",
  "warm",
  "cold_audit_first",
  "cold_direct",
];

/* Labels + canonical order for the kanban columns. nurture sits
 * outside the main board (closed-out) but is reachable via filter. */
export const STAGE_LABEL: Record<LeadStage, string> = {
  new: "New",
  qualified: "Qualified",
  discovery_audit: "Discovery Audit",
  proposed: "Proposed",
  closed_won: "Closed (won)",
  closed_lost: "Closed (lost)",
  nurture: "Long-term nurture",
};

export const STAGE_ORDER: LeadStage[] = [
  "new",
  "qualified",
  "discovery_audit",
  "proposed",
  "closed_won",
  "closed_lost",
];

/* Column tints follow temperature: cold blues for early stages, warm
 * to emerald as the deal progresses, rose for lost. Mirrors the
 * existing Mission Control kanban legibility pattern. */
export const STAGE_ACCENT: Record<LeadStage, string> = {
  new: "from-slate-500/15 to-slate-500/5 ring-slate-500/30",
  qualified: "from-sky-500/15 to-sky-500/5 ring-sky-500/30",
  discovery_audit: "from-cyan-500/15 to-cyan-500/5 ring-cyan-500/30",
  proposed: "from-amber-500/15 to-amber-500/5 ring-amber-500/30",
  closed_won: "from-emerald-500/20 to-emerald-500/5 ring-emerald-500/40",
  closed_lost: "from-rose-500/15 to-rose-500/5 ring-rose-500/30",
  nurture: "from-zinc-500/15 to-zinc-500/5 ring-zinc-500/30",
};

export const TOUCH_LABEL: Record<LeadTouchKind, string> = {
  outreach_sent: "Outreach sent",
  reply_received: "Reply received",
  call_booked: "Call booked",
  call_done: "Call done",
  audit_sent: "Audit sent",
  audit_delivered: "Audit delivered",
  proposal_sent: "Proposal sent",
  follow_up: "Follow-up",
  internal_note: "Internal note",
};
