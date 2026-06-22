/* ── Test wins types ── */

export type WinStatus = "captured" | "promoted" | "anonymised" | "archived";

export interface TestWin {
  id: string;
  source_test_id?: string;        // → ab_tests.id
  client_name: string;
  client_anonymised?: string;      // for proof deck where client name can't be used
  surface: string;
  hero_metric: string;             // "Conversion rate", "AOV", etc.
  uplift_pct?: number;
  baseline_value?: string;
  variant_value?: string;
  durability_days?: number;        // how long the win has held

  hypothesis: string;              // copy from test
  story_body: string;              // markdown - the narrative
  status: WinStatus;
  case_study_id?: string;          // → case_studies.id once promoted

  captured_at: string;             // ISO

  created_at: string;
  updated_at: string;
}

export const STATUS_LABEL: Record<WinStatus, string> = {
  captured: "Captured",
  promoted: "Promoted to case study",
  anonymised: "Anonymised",
  archived: "Archived",
};

export const STATUS_TINT: Record<WinStatus, string> = {
  captured: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30",
  promoted: "bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-500/30",
  anonymised: "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30",
  archived: "bg-[#222222] text-[#9CA3AF]",
};
