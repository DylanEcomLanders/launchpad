/* ── Report types ── */

export type ReportPeriod = "weekly" | "monthly" | "quarterly";
/* Reports default to standard delivery cadence; flip is_qbr on for
 * VIP quarterly reviews - same plumbing, different title + framing. */
export type ReportStatus = "draft" | "ready" | "sent";

export interface ReportTestSummary {
  test_id: string;
  hypothesis: string;
  status: string;             // live / concluded / killed
  outcome?: string;           // winner / loser / inconclusive
  uplift_pct?: number;
  surface?: string;
}

export interface ReportPageSummary {
  title: string;
  type: string;               // page / test / other
  horizon: number;
  ice_score: number;
}

export interface Report {
  id: string;
  client_name: string;
  period: ReportPeriod;
  /* Display label: "Week of 17 June 2026" / "June 2026". */
  period_label: string;
  /* ISO bounds for the generator. */
  period_start: string;
  period_end: string;

  status: ReportStatus;
  prepared_by: string;

  /* Headline + narrative editable by strategist. */
  headline: string;           // markdown - one line
  narrative: string;          // markdown - what we learned, what's next

  /* Auto-populated summaries (strategist can edit). */
  tests: ReportTestSummary[];
  pages: ReportPageSummary[];

  /* Computed snapshot at generation time. */
  tests_run: number;
  tests_won: number;
  tests_lost: number;
  tests_inconclusive: number;
  pages_shipped: number;

  /* Optional - movement vs baseline (free text, with caveat). */
  cr_movement: string;

  /* QBR mode - flips the public output to a brand-strategy review
   * framing. Used for VIP quarterly reviews per the playbook. */
  is_qbr?: boolean;

  /* Output sharing */
  output_slug: string;

  created_at: string;
  updated_at: string;
  sent_at?: string;
}

export const PERIOD_LABEL: Record<ReportPeriod, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
};

export const STATUS_LABEL: Record<ReportStatus, string> = {
  draft: "Draft",
  ready: "Ready",
  sent: "Sent",
};

export const STATUS_TINT: Record<ReportStatus, string> = {
  draft: "bg-[#222222] text-[#9CA3AF]",
  ready: "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30",
  sent: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30",
};
