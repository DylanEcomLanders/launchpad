// Simplified 8-phase model used by /kanban (Mission Control) only. Independent from
// the granular task-board phases — this view is about project-level flow,
// not deliverable-level QA state.

export type PreviewPhase =
  | "tickets"
  | "documents"
  | "not-started"       // Delivery board label: "Setup"
  | "strategy"
  | "design"
  | "internal-revisions"
  | "external-revisions"
  | "development"
  | "qa"                // Delivery board label: "Internal QA"
  | "client-approval"   // NEW — second client-hold before go-live (paused clock)
  | "launch"            // NEW — go-live; records the control benchmark + fires the seam
  | "done"              // NEW — delivered/live; the delivery job ends here
  // ── leave the delivery board for the Results Engine (kept for transition) ──
  | "test-backlog"
  | "launch-testing";

export interface PreviewPhaseMeta {
  value: PreviewPhase;
  label: string;
  color: string;
}

export const PREVIEW_PHASES: PreviewPhaseMeta[] = [
  { value: "tickets",             label: "Tickets",            color: "#EF4444" }, // triage column for client bugs + tweaks
  { value: "documents",           label: "Documents",          color: "#0D9488" }, // retainer reports, test plans, results writeups
  { value: "not-started",         label: "Setup",              color: "#71717A" }, // pod assigned, scope confirmed, fields filled
  { value: "strategy",            label: "Strategy",           color: "#0891B2" },
  { value: "design",              label: "Design",             color: "#7C3AED" },
  { value: "internal-revisions",  label: "Internal Revisions", color: "#EA580C" }, // head designer signs off; the design QA
  { value: "external-revisions",  label: "External Revisions", color: "#DB2777" }, // client owns the wait; clock paused
  { value: "development",         label: "Development",        color: "#059669" },
  { value: "qa",                  label: "Internal QA",        color: "#0EA5E9" }, // head developer signs off; the dev QA
  { value: "client-approval",     label: "Client Approval",    color: "#E11D48" }, // second client-hold; clock paused
  { value: "launch",             label: "Launch",              color: "#16A34A" }, // go-live; control benchmark + seam
  { value: "done",               label: "Done",                color: "#6B7280" }, // delivered/live; optimisation moves off-board
  // ── off the delivery board; live on the Results Engine (transition-only) ──
  { value: "test-backlog",        label: "Test queue",         color: "#A78BFA" },
  { value: "launch-testing",      label: "Live tests",         color: "#A78BFA" },
];

const META = new Map(PREVIEW_PHASES.map((p) => [p.value, p]));
export function previewPhaseMeta(p: PreviewPhase | string | undefined): PreviewPhaseMeta | null {
  if (!p) return null;
  return META.get(p as PreviewPhase) ?? null;
}

/* Delivered/live signal — reaching any of these (a phaseHistory entry) means the
 * page shipped. `done`/`launch` are the new delivery-board terminals; the legacy
 * `launch-testing` is kept so pre-restructure data still reads as delivered.
 * Single source: KPI, company scoring, and the people page all use this. */
export const DELIVERED_PHASES: PreviewPhase[] = ["done", "launch", "launch-testing"];
const DELIVERED_SET = new Set<string>(DELIVERED_PHASES);
export function isDeliveredPhase(p: PreviewPhase | string | undefined): boolean {
  return !!p && DELIVERED_SET.has(p);
}

// ── Thresholds ──────────────────────────────────────────────────────────────

export interface PreviewThreshold {
  /** Soft expected — internal team deadline, in WORKING hours. Above this = "approaching". */
  expectedHours: number;
  /** Hard cap — what we've told the client, in WORKING hours. Above this = "stuck". */
  stuckHours: number;
}

// All time math is in UK working hours: Mon-Fri, 9-5 Europe/London, excluding
// English bank holidays. 1 working day = WORKING_HOURS_PER_DAY hours. hoursInPhase
// on a deliverable is the same unit — accumulated working hours since the phase
// was entered, NOT wall-clock hours. (When this wires to real data, the worker
// computing hoursInPhase needs to skip weekends + holidays in Europe/London.)
//
// Pattern: stuck = expected + 2 working days. That 2-day buffer is the gap
// between what we tell the team internally and what the client expects.
// "Approaching" means we're past the internal deadline but the client doesn't
// know yet — that's the window to unblock before it goes public.
export const WORKING_HOURS_PER_DAY = 8;

export const PREVIEW_THRESHOLDS: Record<PreviewPhase, PreviewThreshold> = {
  tickets:              { expectedHours: 8,   stuckHours: 24 },    // 1d internal → 3d client
  documents:            { expectedHours: 16,  stuckHours: 40 },    // 2d internal → 5d client; scheduled work
  "not-started":        { expectedHours: 8,   stuckHours: 24 },    // Setup: 1d internal → 3d
  strategy:             { expectedHours: 16,  stuckHours: 32 },    // 2d internal → 4d client
  design:               { expectedHours: 32,  stuckHours: 48 },    // 4d internal → 6d client
  "internal-revisions": { expectedHours: 8,   stuckHours: 24 },    // 1d internal → 3d client
  "external-revisions": { expectedHours: 16,  stuckHours: 32 },    // 2d internal → 4d client
  development:          { expectedHours: 32,  stuckHours: 48 },    // 4d internal → 6d client
  qa:                   { expectedHours: 8,   stuckHours: 24 },    // Internal QA: 1d → 3d
  "client-approval":    { expectedHours: 16,  stuckHours: 32 },    // client-hold; clock paused in-app
  launch:               { expectedHours: 8,   stuckHours: 24 },    // go-live day
  done:                 { expectedHours: 0,   stuckHours: 0 },     // terminal; not timed
  "test-backlog":       { expectedHours: 40,  stuckHours: 80 },    // off-board (Results Engine)
  "launch-testing":     { expectedHours: 8,   stuckHours: 24 },    // off-board (Results Engine)
};

export type StuckStatus = "on-track" | "approaching" | "stuck";

/* Client-hold columns: the client owns the wait, so the delivery clock pauses —
 * a card sitting here never reads as "stuck" on us. (§2/§8: pausing here lets the
 * internal deadline shift cleanly when the client is slow.) */
export const CLIENT_HOLD_PHASES = new Set<PreviewPhase>(["external-revisions", "client-approval"]);

export function statusForHoursInPhase(phase: PreviewPhase | undefined, hoursInPhase: number): StuckStatus {
  if (!phase || phase === "not-started") return "on-track";
  if (CLIENT_HOLD_PHASES.has(phase)) return "on-track"; // clock paused — client's wait
  const t = PREVIEW_THRESHOLDS[phase];
  if (!t || t.expectedHours === 0) return "on-track";
  if (hoursInPhase >= t.stuckHours) return "stuck";
  if (hoursInPhase >= t.expectedHours) return "approaching";
  return "on-track";
}

export function formatExpected(phase: PreviewPhase): string {
  const t = PREVIEW_THRESHOLDS[phase];
  if (!t || t.expectedHours === 0) return "";
  const d = t.expectedHours / WORKING_HOURS_PER_DAY;
  if (d >= 1) return `${d % 1 === 0 ? d : d.toFixed(1)}d expected`;
  return `${t.expectedHours}h expected`;
}

// ── Revision rounds + limbo ─────────────────────────────────────────────────
// A deliverable is "in limbo" when it's been bounced through internal/external
// revisions repeatedly — the time-in-phase clock keeps resetting so it looks
// innocent, but it's actually been stuck in a back-and-forth loop. We surface
// this with a separate badge derived from the deliverable's phase history.

// Dated history entry — each phase transition is timestamped (ISO yyyy-mm-dd in
// Europe/London). Real implementation stamps this in the worker that runs
// moveDeliverable; for the prototype we backfill with realistic dates.
export interface PhaseHistoryEntry {
  phase: PreviewPhase;
  enteredAt: string; // ISO yyyy-mm-dd
}

// Today's date in Europe/London. Used by every date-comparison in the
// kanban (stuck/approaching/on-track, conclude-prompt, interim-due,
// days-in-phase) AND by stampers for new touches/timestamps.
//
// Was hardcoded to "2026-06-17" during the prototype phase so demo
// dates always looked fresh - swapped to real clock 2026-06-25 once
// real client data was flowing through.
//
// Evaluated once at module load. For dev server hot reload + Vercel
// serverless cold starts that's frequent enough. If a user keeps the
// dashboard tab open across midnight the date won't advance until
// they refresh; acceptable trade vs threading an injected clock
// through every helper.
function ukTodayISO(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // en-CA gives yyyy-mm-dd directly - cleanest locale for ISO output
  return fmt.format(new Date());
}
export const MOCK_TODAY = ukTodayISO();

// How long can a live test run before the card starts nudging the strategist
// to wrap it up. Default 14 days = the typical statistical-significance window
// for a small-to-medium-traffic Shopify store.
export const CONCLUDE_PROMPT_DAYS = 14;

// How long can a live test run without an interim number before the card nudges
// the strategist to log one. Keeps the kanban honest about what's happening.
export const INTERIM_NUDGE_DAYS = 3;

// Calendar days a deliverable has spent in its current phase (last history entry).
// Returns 0 if there's no history or the history entry has no date.
export function calendarDaysInCurrentPhase(history: PhaseHistoryEntry[] | undefined, today: string = MOCK_TODAY): number {
  if (!history || history.length === 0) return 0;
  const entered = history[history.length - 1].enteredAt;
  if (!entered) return 0;
  return daysBetween(entered, today);
}

// Calendar days between two ISO dates (yyyy-mm-dd). Always returns >= 0.
export function daysBetween(fromISO: string, toISO: string = MOCK_TODAY): number {
  const fromMs = new Date(fromISO + "T00:00:00Z").getTime();
  const toMs = new Date(toISO + "T00:00:00Z").getTime();
  return Math.max(0, Math.floor((toMs - fromMs) / (1000 * 60 * 60 * 24)));
}

// ── Test results ────────────────────────────────────────────────────────────
// When a deliverable in launch-testing is marked "finished", we capture its
// outcome here. Once testResult is set, the deliverable leaves the kanban and
// shows up in the Results bank view — keeps launch-testing from getting clogged
// AND builds a permanent reference for case studies.

export type TestOutcome = "winner" | "loser" | "inconclusive" | "shipped";

export interface TestResult {
  /** Date the test was marked finished (ISO yyyy-mm-dd, Europe/London). */
  concludedAt: string;
  /** Big-picture outcome. "shipped" = non-test launch, just went live without an experiment. */
  outcome: TestOutcome;
  /** Primary metric measured — free text so we don't pre-commit to a vocab
   *  (e.g. "CVR", "AOV", "Revenue per session", "Add-to-cart rate"). */
  metric?: string;
  /** Uplift vs control as a percentage. Can be negative (loser) or undefined (shipped). */
  upliftPct?: number;
  /** Statistical confidence the test reached, if applicable. */
  confidencePct?: number;
  /** How many calendar days the test ran. */
  durationDays?: number;
  /** Qualitative notes — what surprised us, what the client thought, hypothesis follow-ups. */
  notes?: string;
  /** Screenshot captured during the live test — carries through to the Results bank
   *  card thumbnail + the completed-test modal preview. Data URL in the prototype
   *  (FileReader.readAsDataURL); production would store a remote object-store key. */
  screenshot?: string;
}

export const OUTCOME_META: Record<TestOutcome, { label: string; color: string; bg: string }> = {
  winner:       { label: "Winner",       color: "#10B981", bg: "rgba(16,185,129,0.15)" },
  loser:        { label: "Loser",        color: "#F87171", bg: "rgba(248,113,113,0.15)" },
  inconclusive: { label: "Inconclusive", color: "#A78BFA", bg: "rgba(167,139,250,0.15)" },
  shipped:      { label: "Shipped",      color: "#0EA5E9", bg: "rgba(14,165,233,0.15)" },
};

export function revisionRoundCount(phaseHistory: PhaseHistoryEntry[] | undefined): number {
  if (!phaseHistory || phaseHistory.length === 0) return 0;
  return phaseHistory.filter(
    (e) => e.phase === "internal-revisions" || e.phase === "external-revisions",
  ).length;
}

export type LimboStatus = "none" | "heating" | "limbo";

export function limboStatusFor(rounds: number): LimboStatus {
  if (rounds >= 4) return "limbo";
  if (rounds >= 3) return "heating";
  return "none";
}

// ── Role-aware active assignee ──────────────────────────────────────────────
// Primaries own net-new work (Strategy → Design → Dev → QA → Launch).
// Secondaries pick up revisions (Internal/External) and post-launch tickets.
// Falls back to primary if no secondary is configured for a deliverable.

export interface RolePool {
  designer?: string;            // primary designer (owner)
  secondaryDesigner?: string;   // revisions + design-side tickets
  developer?: string;           // primary developer (owner)
  secondaryDeveloper?: string;  // dev tickets + bugs
}

/* Documents are always owned by Alister regardless of which pod owns
 * the project. Aanchal (strategist) doesn't go in the secondary slot
 * because she isn't a designer - if she needs visibility on docs
 * cards too, that's a separate "docs-team can-see" concept, not the
 * primary/secondary designer slot. */
export const DOCUMENTS_TEAM_PRIMARY = "Alister";
export const DOCUMENTS_TEAM_SECONDARY: string | undefined = undefined;
const DOCUMENTS_TEAM = {
  name: DOCUMENTS_TEAM_PRIMARY,
  isSecondary: false,
};

export function activeAssigneeFor(phase: PreviewPhase | undefined, roles: RolePool): {
  name: string;
  isSecondary: boolean;
} {
  const primary = (n?: string) => ({ name: n || "Unassigned", isSecondary: false });
  const secondary = (s?: string, p?: string) =>
    s ? { name: s, isSecondary: true } : { name: p || "Unassigned", isSecondary: false };

  switch (phase) {
    case "tickets":
      // Default to secondary dev (bugs are mostly dev); fall through to
      // secondary designer if there's no dev assigned at all.
      return secondary(
        roles.secondaryDeveloper || roles.secondaryDesigner,
        roles.developer || roles.designer,
      );
    case "documents":
      // Documents are always handled by the docs team (Alister + Aanchal),
      // not the pod's designer. Hardcoded override - reports, test plans
      // and retainer writeups all funnel to them regardless of which pod
      // owns the project.
      return DOCUMENTS_TEAM;
    case "internal-revisions":
      // Internal Rev = founder/reviewer telling the PRIMARY designer to
      // make changes. Primary owns the fix.
      return primary(roles.designer);
    case "external-revisions":
    case "client-approval":
      // Client-hold columns. Secondary designer babysits + chases the client to
      // keep pressure off the primary's pipeline (PM-as-chaser lands with the
      // central-role model).
      return secondary(roles.secondaryDesigner, roles.designer);
    case "strategy":
    case "design":
      return primary(roles.designer);
    case "development":
    case "launch":
    case "launch-testing":
      return primary(roles.developer);
    case "qa":
      // Secondary developer owns QA - primary built it, secondary tests it
      // (fresh eyes catch what the builder missed).
      return secondary(roles.secondaryDeveloper, roles.developer);
    case "test-backlog":
      // Queued test ideas: the strategist's pipeline. Assignee-wise the card
      // shows whoever will pick the build up first.
      return primary(roles.designer || roles.developer);
    default:
      // not-started or unset — show the primary owner who'll pick it up first
      return primary(roles.designer || roles.developer);
  }
}

