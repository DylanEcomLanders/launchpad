/* ── Test tracker types ── */

export type TestStatus = "drafting" | "live" | "paused" | "concluded" | "killed";
export type TestOutcome = "winner" | "loser" | "inconclusive";
export type TestTool = "intelligems" | "visually" | "other" | "";

export interface AbTest {
  id: string;
  client_name: string;
  /* Page / area the test runs on. */
  surface: string;
  /* Source brief - hypothesis brief id, optional. */
  hypothesis_brief_id?: string;

  /* Hypothesis */
  hypothesis_line: string;             // "because we observed X, we believe Y will Z"
  primary_metric: string;              // default "Conversion rate"

  /* Variants */
  control_desc: string;                // markdown
  variant_desc: string;                // markdown
  tool: TestTool;
  traffic_split: string;               // "50/50"

  /* Runtime */
  started_at?: string;                 // ISO when set live
  ended_at?: string;                   // ISO when concluded / killed
  runtime_days_target?: number;        // strategist's planned runtime
  significance_target_pct: number;     // default 95

  /* Results (filled when concluded) */
  status: TestStatus;
  outcome?: TestOutcome;
  baseline_value: string;              // "1.82%" - text so units stay free
  variant_value: string;
  uplift_pct?: number;                 // -100 to +n; computed by strategist
  significance_reached_pct?: number;   // observed sig at call time

  /* Write-up */
  write_up: string;                    // markdown
  learnings: string;                   // markdown - what it feeds next

  /* Brain library tags - funnel area, brand type, test pattern. */
  tags?: string[];

  created_at: string;
  updated_at: string;
}

export const STATUS_LABEL: Record<TestStatus, string> = {
  drafting: "Drafting",
  live: "Live",
  paused: "Paused",
  concluded: "Concluded",
  killed: "Killed",
};
export const STATUS_TINT: Record<TestStatus, string> = {
  drafting: "bg-surface-raised text-muted",
  live: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30",
  paused: "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30",
  concluded: "bg-sky-500/15 text-sky-200 ring-1 ring-sky-500/30",
  killed: "bg-rose-500/15 text-rose-200 ring-1 ring-rose-500/30",
};

export const OUTCOME_LABEL: Record<TestOutcome, string> = {
  winner: "Winner",
  loser: "Loser",
  inconclusive: "Inconclusive",
};
export const OUTCOME_TINT: Record<TestOutcome, string> = {
  winner: "bg-emerald-500/25 text-emerald-100 ring-1 ring-emerald-500/40",
  loser: "bg-rose-500/15 text-rose-200 ring-1 ring-rose-500/30",
  inconclusive: "bg-zinc-500/15 text-zinc-200 ring-1 ring-zinc-500/30",
};
