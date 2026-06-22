/* ── Discovery Audit types ──
 *
 * The £1,000 paid pre-signup audit the strategist runs in 72 hours
 * for warm leads. Structured to match the deck spine from the Hero
 * Offer playbook (Execution / Discovery Audit). One audit row in
 * Supabase via createStore() = JSONB blob per record.
 */

export type AuditStatus =
  | "draft"            // strategist still filling in
  | "ready"            // ready to send to client
  | "sent"             // client has the link
  | "credited"         // client signed retainer; £1k credited
  | "passed";          // client didn't move forward

export type AuditFunnelStage =
  | "landing"
  | "pdp"
  | "cart"
  | "checkout"
  | "post_purchase"
  | "other";

export type RecommendedTier = "" | "Entry" | "Core" | "VIP";

/* One finding on the audit. Maps to a single slide / card in the
 * output deck. ICE scoring (Impact / Confidence / Ease, 1-10 each)
 * drives the prioritised opportunity list. */
export interface AuditFinding {
  id: string;
  stage: AuditFunnelStage;
  /* Headline observation - what the strategist sees. */
  title: string;
  /* The full observation in markdown - what they see, why it matters. */
  observation: string;
  /* Revenue cost estimate, free-form so the strategist can write
   * "≈ £8k/mo at current traffic" or a confident range. */
  revenue_cost: string;
  /* What we'd do about it, markdown. */
  recommended_fix: string;
  /* Screenshot URL - external image link in v1; bucket upload later. */
  screenshot_url?: string;
  /* ICE: Impact / Confidence / Ease, 1-10 each. ICE score = I*C*E
   * (range 1-1000), computed at render time. */
  impact: number;
  confidence: number;
  ease: number;
  order: number;
}

/* One 30-/60-/90-day horizon. */
export interface AuditPlanHorizon {
  /* What gets shipped in this horizon. Markdown bullets. */
  body: string;
}

export interface DiscoveryAudit {
  id: string;

  /* ── Identity ── */
  brand_name: string;
  brand_url: string;
  /* Monthly revenue band as free-form text - "£300k/mo", "≈£500k",
   * etc. The tier picker reads this loosely. */
  revenue_band: string;
  contact_name: string;
  contact_email: string;

  /* ── Status + audit-credit ── */
  status: AuditStatus;
  /* Strategist name, free-text. */
  ran_by: string;
  /* Sale price - £1,000 by default but admin can adjust per deal. */
  fee: number;
  fee_currency: string;
  /* When the audit was actually sent to the client (status -> "sent"). */
  sent_at?: string;
  /* When the client signed the retainer - audit fee credits at this
   * point. Free-text retainer reference for now (could become an FK
   * to a Lead in Phase 2B). */
  credited_at?: string;
  credited_to_retainer_ref?: string;

  /* ── Funnel snapshot (week-one deep dive lite) ── */
  funnel_overview: string;        // markdown
  current_conversion_rate: string;
  current_aov: string;
  primary_traffic_source: string; // "Paid social", "Organic", "Email", mixed
  primary_device: "desktop" | "mobile" | "mixed" | "";

  /* ── Findings, ordered by strategist (and ICE-sortable in output) ── */
  findings: AuditFinding[];

  /* ── Plan + recommendation ── */
  /* Executive summary - 3-5 lines, top opportunities. Markdown. */
  executive_summary: string;
  plan_30: AuditPlanHorizon;
  plan_60: AuditPlanHorizon;
  plan_90: AuditPlanHorizon;
  recommended_tier: RecommendedTier;
  recommendation_notes: string;

  /* ── Output sharing ── */
  /* URL-safe slug used in /audit-output/[slug]. Defaults to id but
   * admin can rename to a brand-friendly slug ("brand-name-2026"). */
  output_slug: string;

  created_at: string;
  updated_at: string;
}
