/* ── Results Engine types ──
 * The single canonical test record + the surfaces tests run against. This is
 * the "one place a test lives" the delivery/optimisation rework mandates: the
 * board's testResult/tests[] and the legacy ab_tests store both consolidate
 * here. Stored via createStore (blob pattern) in `results_surfaces` / `tests`.
 */

export type SurfaceStatus = "active" | "paused" | "closed";

/** A live page under optimisation. The delivery→Results-Engine seam creates one
 *  when a build hits Launch, carrying the control benchmark + portal link. Tests
 *  run against a surface; surfaces group by client via the project. */
export interface ResultsSurface {
  id: string;
  /** kanban_projects.id — the client resolves by join (one source, no denorm). */
  projectId: string;
  /** kanban_tasks.id of the deliverable that launched (traceability; soft link). */
  sourceTaskId?: string;
  title: string;
  liveUrl?: string;
  /** Control metrics captured at go-live: { "CVR": 3.1, "AOV": 142 }. */
  controlBenchmark?: Record<string, string | number>;
  /** Soft link to the client portal for the §7 projection. */
  portalId?: string;
  status: SurfaceStatus;
  created_at: string;
  updated_at: string;
}

/** The Results Engine columns. `status` IS the column — never a separate field. */
export type TestStatus = "backlog" | "live" | "reading" | "won" | "lost";

/** Outcome enum keeps `shipped` (from the kanban) alongside the ab_tests three. */
export type TestOutcome = "winner" | "loser" | "inconclusive" | "shipped";

export interface Test {
  id: string;
  surfaceId: string;
  status: TestStatus;

  // ── internal face — full experiment detail, never auto-published ──
  hypothesis?: string;
  controlDesc?: string;
  variantDesc?: string;
  primaryMetric?: string;
  /** The lift we predicted at ideation. Shown against the actual upliftPct so we
   *  can see how well we called it. Captured when the test is created. */
  expectedLiftPct?: number;
  trafficSplit?: string;
  tool?: string;
  baselineValue?: number;
  variantValue?: number;
  upliftPct?: number;
  significanceTargetPct?: number;
  significanceReachedPct?: number;
  liveUrl?: string;
  startedAt?: string;
  concludedAt?: string;
  notes?: string;
  /** The reusable learning: WHY it moved (or didn't). The point of the archive —
   *  what we'd carry into the next test. Free-text, written by the strategist. */
  whyItWorked?: string;

  // ── the win declaration (§6 hard gate) ──
  // A human call by the strategist. `declaredAt` present IS the recorded
  // declaration; the data layer refuses status="won" without it.
  outcome?: TestOutcome;
  declaredBy?: string;
  declaredAt?: string;
  winEvidence?: { what?: string; magnitude?: string; link?: string };

  // ── client face (§7 two-faced card) — curated, gated by clientPublished ──
  clientPublished: boolean;
  clientSummary?: string;
  clientResult?: string;

  created_at: string;
  updated_at: string;
}

export const TEST_STATUS_ORDER: TestStatus[] = ["backlog", "live", "reading", "won", "lost"];

export const TEST_STATUS_META: Record<TestStatus, { label: string; color: string }> = {
  backlog: { label: "Ideating", color: "#71717A" },
  live: { label: "Live", color: "#0EA5E9" },
  reading: { label: "Reading", color: "#EAB308" },
  won: { label: "Won", color: "#10B981" },
  lost: { label: "Lost", color: "#F87171" },
};

export const TEST_OUTCOME_META: Record<TestOutcome, { label: string; color: string }> = {
  winner: { label: "Winner", color: "#10B981" },
  loser: { label: "Loser", color: "#F87171" },
  inconclusive: { label: "Inconclusive", color: "#A78BFA" },
  shipped: { label: "Shipped", color: "#0EA5E9" },
};
