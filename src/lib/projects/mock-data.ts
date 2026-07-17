// Mock client/project/deliverable data for the /kanban (Mission Control) page.
// Not wired to Supabase yet — pure fixture so we can iterate on the UI before
// the pods_v2_* read adapter lands.

import type { PhaseHistoryEntry, PreviewPhase, TestResult } from "./preview-phases";

// ── Pods ──────────────────────────────────────────────────────────────────
// A pod is a pre-defined team: who plays which role on every deliverable in
// the project. Selecting a pod on a project bulk-writes those four names onto
// every deliverable in that project — no per-card assignment needed.
export interface MockPod {
  id: string;
  name: string;
  designer?: string;
  secondaryDesigner?: string;
  developer?: string;
  secondaryDeveloper?: string;
}

export const MOCK_PODS: MockPod[] = [
  { id: "pod-1", name: "Pod 1", designer: "Viktoriia Parchuk", secondaryDesigner: "Brandon Baldwin",  developer: "Ashish Dadwal",   secondaryDeveloper: "Ian Rex Espinosa" },
  { id: "pod-2", name: "Pod 2", designer: "Brandon Baldwin",   secondaryDesigner: "Viktoriia Parchuk", developer: "Ian Rex Espinosa", secondaryDeveloper: "Kaye Ann Layug" },
  { id: "pod-3", name: "Pod 3", designer: "Jack",              secondaryDesigner: "Anastasia",        developer: "Hitesh Kaushal",  secondaryDeveloper: "Aleksandar" },
];

// Build a dated phase history ending on `latestEnteredISO`. Earlier phases are
// staggered ~3 calendar days back per step — close enough to realistic for the
// prototype without hand-writing every date. Pass phases oldest → newest.
function buildHistory(latestEnteredISO: string, ...phasesOldestToNewest: PreviewPhase[]): PhaseHistoryEntry[] {
  const last = new Date(latestEnteredISO + "T09:00:00Z");
  const n = phasesOldestToNewest.length;
  return phasesOldestToNewest.map((p, i) => {
    const d = new Date(last);
    d.setUTCDate(d.getUTCDate() - (n - 1 - i) * 3);
    return { phase: p, enteredAt: d.toISOString().slice(0, 10) };
  });
}

/** One metric tracked by a launch + testing deliverable. All three fields are
 *  free-form so the strategist can hold "2.4%" / "$42 AOV" / "+8%" without
 *  the prototype committing to a parse format. Most tests have CVR + AOV +
 *  RPV; some have a single custom one. */
export interface TrackedMetric {
  name: string;
  baseline?: string;
  interim?: string;
}

/* The design-to-dev handover form. Everything dev needs to start without
 * chasing: the Figma file, a Loom walkthrough, font files, and any extra
 * assets. Links (Drive/Dropbox/etc) rather than uploads in v1, so the record
 * stays a small jsonb blob. submittedAt is the gate: present = dev may pull
 * the card into Phase 2. */
export interface DesignHandoff {
  figmaUrl: string;
  loomUrl: string;
  fontFilesUrl: string;
  assetsUrl?: string;
  notes?: string;
  submittedAt?: string; // ISO yyyy-mm-dd; set on submit, cleared on reopen
  submittedBy?: string;
}

/* Lightweight gates that bookend the design handoff. Same submit-stamp shape,
 * but each is just a free-text note plus the stamp - the strategist / dev drop
 * in whatever context the next lane needs and submit. submittedAt is the gate:
 *   strategyHandoff → unlocks Strategy leaving for Design
 *   devHandoff      → unlocks Development leaving for Launch & Testing
 * (designHandoff, the richer middle gate, still guards Design → Development.) */
export interface StrategyHandoff {
  notes?: string;
  submittedAt?: string;
  submittedBy?: string;
}

export interface DevHandoff {
  notes?: string;
  submittedAt?: string;
  submittedBy?: string;
}

/* One test run against a page. A card in Optimisation can hold several in
 * sequence: run test 1, conclude it, add test 2 on the same page, and so on.
 * Each run bundles the fields a single test needs (live URL, start, metrics,
 * interim notes, screenshot) plus its concluded `result`. The card's legacy
 * singular test fields (liveTestUrl / liveStartedAt / metrics / interimNotes /
 * screenshot / testResult) are kept as a MIRROR of the ACTIVE (last) run so
 * every existing reader - card face, Results bank, My Tasks - keeps working
 * unchanged. result === undefined means this run is still live. */
export interface TestRun {
  id: string;
  label?: string; // "Test 1" etc; defaults to index when unset
  liveTestUrl?: string;
  liveStartedAt?: string;
  metrics?: TrackedMetric[];
  interimNotes?: string;
  screenshot?: string;
  result?: TestResult;
}

/* ── Subtasks ──
 * Granular execution steps WITHIN a card (desktop variations, asset exports,
 * copy final, dev checklist items). NOT phases: a step is only a subtask when
 * it is the same owner doing granular work, never a handoff or an external
 * wait (those stay columns). Each carries a default owner ROLE that resolves
 * to a real person via the pod roster, and an unlock rule so items appear only
 * when they are ready to be worked:
 *   sequential       - available once every earlier subtask is done
 *   client_approval  - held until the client has signed off (card reached the
 *                      build), so secondaries don't build variations pre-approval
 * Status is DERIVED (locked | available | done), never stored, via
 * subtaskStatuses(). Advisory - ticking boxes never forces a phase move; the
 * gates do that. */
export type SubtaskRole =
  | "strategist"
  | "primary_designer"
  | "secondary_designer"
  | "primary_dev"
  | "secondary_dev";

export type SubtaskUnlock = "sequential" | "client_approval";

/* Marks a subtask that opens a detail panel instead of being a plain checkbox.
 * The handover rows expand into the Figma/Loom/fonts (or notes) form and tick
 * themselves on submit. Undefined = plain checkbox. */
export type SubtaskKind = "design_handoff" | "dev_handoff";

/* Which phase group a subtask belongs to. The card modal shows the group
 * matching the current phase expanded, earlier groups collapsed (done), later
 * groups reachable under "Next phase tasks". Maps to the phase bands. */
export type SubtaskGroup =
  | "strategy"
  | "design"
  | "development"
  | "optimisation";

export interface Subtask {
  id: string;
  title: string;
  /** Which phase group this belongs to. Seeded from the template on phase
   *  entry; drives the collapse/expand grouping in the modal. */
  group: SubtaskGroup;
  /** Default owner. Resolves to a name via the pod roster (auto-heals on
   *  roster change), same as the card's own assignees. */
  role?: SubtaskRole;
  unlock: SubtaskUnlock;
  done: boolean;
  doneAt?: string;
  /** Opens a detail panel (handover form) instead of a plain checkbox. */
  kind?: SubtaskKind;
  /** Optional per-item due date (the template leaves these unset; a PM can
   *  add one on a specific card). */
  dueDate?: string;
}

export interface MockDeliverable {
  id: string;
  title: string;
  /** Card path (§2). `build` = the full run to live (default). `audit` = a
   *  Setup → Strategy → Done diagnostic that NEVER enters the build columns. */
  cardType?: "audit" | "build";
  /** Deliverable type — shown as the card header (PDP / Component / Cart / etc) */
  category?: string;
  /** Primary designer — owner of net-new design work (Strategy + Design phases) */
  designer?: string;
  /** Secondary designer — picks up client revisions + design-side tickets */
  secondaryDesigner?: string;
  /** Primary developer — owner of the main build (Dev + QA + Launch) */
  developer?: string;
  /** Secondary developer — picks up tickets, bugs, post-launch tweaks */
  secondaryDeveloper?: string;
  /** The build schedule: a date per column, typed by the PM. THE source for
   *  when anything on this card is due. A card in Design compares itself to
   *  phaseDeadlines.design and goes red once it passes; a column with no date
   *  reads neutral and never goes red. Read it via cardSchedule() and
   *  cardDueDate(), never raw, so the arithmetic stays in one place. */
  phaseDeadlines?: Partial<Record<PreviewPhase, string>>;
  /** Overall completion date — ISO yyyy-mm-dd. For a build this is DERIVED from
   *  phaseDeadlines.launch (read it via cardDueDate); the raw field is what a
   *  ticket or a document carries, since they never run the columns. When
   *  neither exists the card is "undated": it reads neutral and never overdue,
   *  so retrofitted work doesn't flood the board red. */
  dueDate?: string;
  /** Actual start date — ISO yyyy-mm-dd. Optional context for retrofitted work
   *  (when it really began), editable in the detail modal. Doesn't drive colour. */
  startDate?: string;
  /** Per-card deadlines (§8), ISO yyyy-mm-dd. The board consumes these directly —
   *  `internalDeadline` (our target) drives the in-stage ETA colour, `clientDeadline`
   *  (what we told the client) is the outer bound. HOW they're set is decoupled:
   *  manual now, the future auto-deadline layer populates the same fields. */
  internalDeadline?: string;
  clientDeadline?: string;
  /** Paused / waiting on the client. Freezes the deadline clock: the card reads
   *  neutral (not overdue) and drops out of the at-risk count while we wait. */
  onHold?: boolean;
  /** The design-to-dev handover record. NULL/undefined = not submitted, and the
   *  gate blocks the card from entering any Phase 2 build phase (development /
   *  qa / launch-testing). Submitting from the detail modal stamps submittedAt
   *  and unlocks the move. */
  designHandoff?: DesignHandoff;
  /** Lightweight strategy → design gate. submittedAt present = strategy signed
   *  off and the card may leave Strategy. */
  strategyHandoff?: StrategyHandoff;
  /** Lightweight development → launch gate. submittedAt present = build signed
   *  off and the card may leave Development for Launch & Testing. */
  devHandoff?: DevHandoff;
  phase: PreviewPhase;
  /** UK working hours spent in the CURRENT phase (Mon-Fri 9-5 Europe/London,
   *  excl bank holidays). 8h = 1 working day. Drives the stuck flag via
   *  statusForHoursInPhase(). */
  hoursInPhase: number;
  /** Ordered list of phase transitions, current phase last. Each entry has the
   *  date the deliverable ENTERED that phase. Drives the limbo / revision-round
   *  badge AND the dated timeline in the detail modal. Empty for new. */
  phaseHistory?: PhaseHistoryEntry[];
  /** Strategist's brief — most often a URL (Notion, Google Doc, Word doc).
   *  Shown + edited in the detail modal. */
  brief?: string;
  /** Figma URL for the design file. Separate from brief because Figma is
   *  reached for every phase post-Strategy (design, dev for hand-off, QA for
   *  spec check). Rendered as a dedicated chip in the detail modal. */
  figmaUrl?: string;
  /** Set when this deliverable was kicked back from a downstream phase
   *  (e.g. Internal Revisions sent it back to Design). Drives the
   *  "Revisions needed" tag on the card + the dedicated section in My Tasks.
   *  Cleared automatically when the card moves forward past the phase that
   *  originally bounced it. */
  revisionRequested?: boolean;
  /** Stamp when the deliverable was signed off out of Internal Revisions and
   *  pushed to the client. Drives the green "Approved" border while the card
   *  sits in External Revisions waiting for client review. Cleared once the
   *  card moves into Development (client has accepted, normal styling). */
  approvedAt?: string;
  /** Tickets don't progress through the build flow - they get completed in
   *  place. Setting this field hides the card from the active board (similar
   *  to testResult hiding finished tests). */
  completedAt?: string;
  /** Stamp when the design was sent to the client (card transitioned into
   *  External Revisions). Drives the 48h external-review clock + the amber/
   *  red signal on cards languishing with the client. */
  sentToClientAt?: string;
  /** URL where the live test / launched page is running. Set when a deliverable
   *  enters launch-testing — drives the LIVE pulse + click-through on the card. */
  liveTestUrl?: string;
  /** When the strategist flipped the deliverable from "ready for testing" to LIVE.
   *  Presence of this field = test is running. Absence = card is in launch-testing
   *  but the strategist hasn't started the test yet. Drives the days-running counter
   *  and the conclude-after-X-days nudge. ISO yyyy-mm-dd, Europe/London. */
  liveStartedAt?: string;
  /** Metrics the test is moving. Most CRO tests watch CVR + AOV + RPV in
   *  parallel, plus the occasional custom one. Each entry is free-form so it
   *  can hold "2.4%" / "$42" / "+8%". First entry is treated as the primary
   *  metric by the conclude form. */
  metrics?: TrackedMetric[];
  /** Strategist's interim observations while the test runs. */
  interimNotes?: string;
  /** Free-form notes on the deliverable. Used for context the strategist
   *  wants on hand: client side comments, edge cases, blockers, whatever
   *  doesn't fit the structured fields. Rendered as a textarea in the
   *  detail modal. */
  notes?: string;
  /** Screenshot of the live test in motion. Dropped via the modal's drag-zone;
   *  data URL in the prototype, copied into testResult.screenshot on Mark finished. */
  screenshot?: string;
  /** Captured outcome once the test is marked finished. Presence of this field
   *  removes the deliverable from the kanban and surfaces it in the Results bank.
   *  MIRRORS the active (last) run's result when `tests` is used. */
  testResult?: TestResult;
  /** Sequential test runs against the page (Optimisation tab). When present,
   *  this is the source of truth for the test workflow and the singular test
   *  fields above mirror the active (last) run. Empty/undefined on cards that
   *  predate multi-test - a run is synthesised from the legacy fields on read
   *  so old data stays visible. */
  tests?: TestRun[];
  /** Granular execution steps within the card (see Subtask). Ordered; unlock
   *  + done drive the derived status. Optional - most cards start with none. */
  subtasks?: Subtask[];
  /** Commercial sizing (see CardSize + tokenCostForSize). Drives the token
   *  cost this card consumes from a retainer's monthly pool. The COST is always
   *  derived from `size` via tokenCostForSize - never stored, never hand-typed.
   *  Undefined on build cards + any card that predates the token meter. */
  size?: CardSize;
  /** The retainer cycle (pool period) this card is billed against. Stamped at
   *  creation time to the project's current open cycle. Undefined on build
   *  cards. Deleting the card drops it from the cycle sum automatically - the
   *  meter is derived, so there is no refund logic. */
  cycleId?: string;
}

/* ── Commercial layer: tiers, token meter, cycles ──────────────────────────
 *
 * A thin, PASSIVE measurement layer over the delivery board. It counts token
 * cost against a retainer's monthly pool and shows a readout. It never gates:
 * an empty or negative pool shows overage, it never blocks card creation or a
 * phase move. Delivery (phases, subtasks, gates, tests) is unchanged.
 *
 * tierConfig is the single source of truth. Everything tier-dependent resolves
 * through it - never branch on a tier name anywhere else in the codebase.
 * This slice only reads `pool` and `one_off`; the rest is written now so it
 * isn't re-touched next slice. */
export const tierConfig = {
  audit:        { one_off: true,  pool: null, package: ['audit_report'] },
  single_build: { one_off: true,  pool: null, package: ['strategy_brief'] },
  lite:         { pool: 12, research: 'quant',      lead: 'guided',  cadence: 'monthly',
                  package: ['todo_list','monthly_report'] },
  core:         { pool: 30, research: 'quant',      lead: 'guided',  cadence: 'monthly',
                  package: ['growth_plan','todo_list','monthly_report'] },
  growth:       { pool: 50, research: 'quant+qual', lead: 'senior',  cadence: 'biweekly',
                  package: ['growth_plan','todo_list','customer_research','competitor_audit','offer_work','monthly_report','qbr'] },
  scale:        { pool: 70, research: 'full',       lead: 'founder', cadence: 'weekly',
                  package: ['growth_plan','todo_list','customer_research','competitor_audit','offer_work','monthly_report','qbr'] },
} as const;

export type TierName = keyof typeof tierConfig;

/** Commercial status of an engagement. Only `active` retainers meter tokens. */
export type EngagementStatus =
  | "pending"
  | "active"
  | "paused"
  | "completed"
  | "churned";

/** Card sizing. A test is always its own card (`test`, 2 tokens), never bundled
 *  onto a build card. */
export type CardSize = "core" | "secondary" | "tertiary" | "test";

/** Token cost per card size. DERIVED from `size` everywhere it is shown - the
 *  cost is never stored as its own field and never hand-editable. */
export function tokenCostForSize(size: CardSize | undefined): number {
  switch (size) {
    case "core":
      return 10;
    case "secondary":
      return 5;
    case "tertiary":
      return 3;
    case "test":
      return 2;
    default:
      return 0;
  }
}

/** A retainer only. Audit + single_build are one-off builds with no pool. */
export function tierIsOneOff(tier: TierName): boolean {
  const cfg = tierConfig[tier] as { one_off?: boolean };
  return cfg.one_off === true;
}

/** The monthly token pool for a tier, or null for one-off tiers. */
export function poolForTier(tier: TierName): number | null {
  return (tierConfig[tier] as { pool: number | null }).pool;
}

/** Build vs retainer derives from the tier - one_off => build. Never store a
 *  separate type that can drift from the tier. */
export function projectTypeForTier(tier: TierName): "build" | "retainer" {
  return tierIsOneOff(tier) ? "build" : "retainer";
}

/** A pool period for a retainer project. NOT a phase - the kanban owns phases.
 *  One cycle per calendar month per project. `pool_total` snapshots the tier
 *  pool at open; `pool_rolled_in` carries unused tokens from the prior month
 *  (rollover automation is a later slice - stays 0 for now). Consumption is
 *  NOT stored here; it is derived from the cards stamped with this cycle's id. */
export interface Cycle {
  id: string;
  projectId: string;
  monthIndex: number;
  isFirstCycle: boolean;
  poolTotal: number;
  poolRolledIn: number;
  poolRolledOut: number;
  createdAt?: string;
  updatedAt?: string;
}

/** Absolute calendar-month index (year*12 + month). Stable + comparable, and
 *  unique per project so find-or-create keys on it. Defaults to the wall clock;
 *  called client-side from an effect, so `new Date()` is fine. */
export function currentCycleMonthIndex(now: Date = new Date()): number {
  return now.getFullYear() * 12 + now.getMonth();
}

/** Find the project's open cycle for a given month, if it exists. */
export function findOpenCycle(
  projectId: string,
  monthIndex: number,
  cycles: Cycle[],
): Cycle | undefined {
  return cycles.find(
    (c) => c.projectId === projectId && c.monthIndex === monthIndex,
  );
}

/** Mint a new cycle for a project's tier. `pool_total` = the tier pool;
 *  `pool_rolled_in` starts at 0 (rollover is a later slice). */
export function makeCycle(
  projectId: string,
  tier: TierName,
  monthIndex: number,
  isFirstCycle: boolean,
): Cycle {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `cycle-${projectId}-${monthIndex}`;
  return {
    id,
    projectId,
    monthIndex,
    isFirstCycle,
    poolTotal: poolForTier(tier) ?? 0,
    poolRolledIn: 0,
    poolRolledOut: 0,
  };
}

export interface CycleReadout {
  poolTotal: number;
  rolledIn: number;
  consumed: number;
  remaining: number;
  overage: number;
}

/** The meter, derived with no hand-maths. `consumed` sums tokenCostForSize over
 *  the cards stamped with this cycle. An exhausted pool shows overage; the meter
 *  never blocks anything - callers must not gate on `remaining`. */
export function cycleReadout(
  cycle: Cycle,
  cards: Array<Pick<MockDeliverable, "size" | "cycleId">>,
): CycleReadout {
  const consumed = cards
    .filter((c) => c.cycleId === cycle.id)
    .reduce((sum, c) => sum + tokenCostForSize(c.size), 0);
  const remaining = cycle.poolTotal + cycle.poolRolledIn - consumed;
  return {
    poolTotal: cycle.poolTotal,
    rolledIn: cycle.poolRolledIn,
    consumed,
    remaining,
    overage: Math.max(0, -remaining),
  };
}

/* ── Subtask helpers ── */

export type SubtaskStatus = "locked" | "available" | "done";

/* Has the card cleared client review (client signed off the design)? True once
 * it has reached a build phase, now or in its history. Drives the
 * client_approval unlock so variation work can't start before sign-off. */
const CLIENT_APPROVED_PHASES = new Set<PreviewPhase>([
  "development",
  "qa",
  "launch",
  "done",
  "test-backlog",
  "launch-testing",
]);
export function isClientApproved(d: MockDeliverable): boolean {
  if (CLIENT_APPROVED_PHASES.has(d.phase)) return true;
  return (d.phaseHistory ?? []).some((h) => CLIENT_APPROVED_PHASES.has(h.phase));
}

/* Derive each subtask's status from group + order + unlock rule + client
 * approval. Never stored - always computed so it can't drift.
 *   - A subtask in a group the card HASN'T reached yet is locked.
 *   - Within the current/past groups: "sequential" = available once every
 *     earlier subtask IN THE SAME GROUP is done; "client_approval" additionally
 *     waits for the card to clear client review. */
export function subtaskStatuses(d: MockDeliverable): SubtaskStatus[] {
  const subs = d.subtasks ?? [];
  const approved = isClientApproved(d);
  const currentIdx = SUBTASK_GROUP_ORDER.indexOf(subtaskGroupForPhase(d.phase));
  return subs.map((s, i) => {
    if (s.done) return "done";
    // Future group: not reachable until the card gets there.
    if (SUBTASK_GROUP_ORDER.indexOf(s.group) > currentIdx) return "locked";
    // Order gate: every earlier subtask in the SAME group must be done.
    const priorSameGroupDone = subs
      .slice(0, i)
      .filter((p) => p.group === s.group)
      .every((p) => p.done);
    if (s.unlock === "client_approval") {
      return approved && priorSameGroupDone ? "available" : "locked";
    }
    return priorSameGroupDone ? "available" : "locked";
  });
}

/* Resolve a subtask's owner name off the (roster-resolved) card assignees. */
export function subtaskAssigneeName(
  d: Pick<
    MockDeliverable,
    "designer" | "secondaryDesigner" | "developer" | "secondaryDeveloper"
  >,
  role?: SubtaskRole,
): string | undefined {
  switch (role) {
    case "primary_designer":
      return d.designer;
    case "secondary_designer":
      return d.secondaryDesigner;
    case "primary_dev":
      return d.developer;
    case "secondary_dev":
      return d.secondaryDeveloper;
    // "strategist" isn't on the deliverable (it's the pod's cro_lead) - the
    // caller resolves it against the strategy owner and passes it in.
    default:
      return undefined;
  }
}

export const SUBTASK_ROLE_LABEL: Record<SubtaskRole, string> = {
  strategist: "Strategist",
  primary_designer: "Designer",
  secondary_designer: "2nd designer",
  primary_dev: "Developer",
  secondary_dev: "2nd developer",
};

/* Phase → subtask group. Same mapping the modal uses to pick the active lane. */
export function subtaskGroupForPhase(p: PreviewPhase): SubtaskGroup {
  if (p === "design" || p === "internal-revisions" || p === "external-revisions")
    return "design";
  if (p === "development" || p === "qa" || p === "client-approval" || p === "launch" || p === "done")
    return "development";
  if (p === "test-backlog" || p === "launch-testing") return "optimisation";
  return "strategy"; // strategy / tickets / not-started / documents
}

export const SUBTASK_GROUP_ORDER: SubtaskGroup[] = [
  "strategy",
  "design",
  "development",
  "optimisation",
];

export const SUBTASK_GROUP_LABEL: Record<SubtaskGroup, string> = {
  strategy: "Strategy",
  design: "Design",
  development: "Development",
  optimisation: "Optimisation",
};

/* The playbook: default subtasks seeded per phase group when a card enters it.
 * One shared template; PMs chop and change per card afterwards (add / remove /
 * switch phase). "Development Handover Complete" carries the design_handoff kind
 * so it renders the Start-handover form. Optimisation is a plain checklist too -
 * add more test rows as tests run. */
export interface SubtaskTemplateItem {
  group: SubtaskGroup;
  title: string;
  role: SubtaskRole;
  unlock: SubtaskUnlock;
  kind?: SubtaskKind;
}
export const SUBTASK_TEMPLATE: SubtaskTemplateItem[] = [
  { group: "strategy", title: "Brief provided", role: "strategist", unlock: "sequential" },
  { group: "design", title: "Desktop Viewports Created", role: "secondary_designer", unlock: "sequential" },
  { group: "design", title: "Development Handover Complete", role: "primary_designer", unlock: "sequential", kind: "design_handoff" },
  { group: "development", title: "Launch Ready and Test Setup", role: "primary_dev", unlock: "sequential" },
];

/* Steps the template used to seed that the BOARD now answers. "Initial Design",
 * "Development", "Internal QA" and friends only ever restated the column the
 * card was sitting in, so ticking them was double-entry: two places to say the
 * same thing, and two places to disagree. The optimisation three went with the
 * phases that left for the Results Engine. What survives is the work the board
 * CAN'T see: artifacts (desktop viewports) and gates (the design handover).
 *
 * Cards seeded before the cut still carry these, so they're pruned on seed.
 * These steps also carried the day budgets that dated the checklist - that
 * whole cascade is gone; the schedule the PM types on the card is the only
 * source now (see cardSchedule). */
const RETIRED_SUBTASK_TITLES = new Set([
  "Initial Design",
  "Internal Revisions",
  "Client Revisions",
  "Development",
  "Internal QA",
  "Client Approval",
  "Benchmarks Recorded",
  "First Test Live",
  "Results Recorded",
]);

/* Bring a card's checklist in line with the template: seed anything missing,
 * drop the retired steps, keep every custom task the PM added.
 *
 * The whole template seeds at once (it's four steps), so a card carries its
 * roadmap from creation and the later steps read as locked rather than absent.
 * Template steps come first in template order - subtaskStatuses() gates on the
 * subtasks BEFORE this one in the same group, so order is behaviour, not
 * presentation. Custom tasks follow.
 *
 * Returns the ORIGINAL array when nothing changes: callers pass the result
 * straight to onUpdate() from an effect, so a fresh array every call would
 * write on every mount. */
export function seedSubtasks(
  existing?: Subtask[],
  template: SubtaskTemplateItem[] = SUBTASK_TEMPLATE,
): Subtask[] {
  const subs = existing ?? [];
  const rand = () =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `sub-${Math.random().toString(36).slice(2, 9)}`;
  const kept = subs.filter((s) => !RETIRED_SUBTASK_TITLES.has(s.title));
  const byTitle = new Map(kept.map((s) => [s.title, s]));
  const templateTitles = new Set(template.map((t) => t.title));
  const next: Subtask[] = [
    // Template steps, in template order, preserving any existing done state.
    ...template.map(
      (t) =>
        byTitle.get(t.title) ?? {
          id: rand(),
          title: t.title,
          group: t.group,
          role: t.role,
          unlock: t.unlock,
          kind: t.kind,
          done: false,
        },
    ),
    // Anything the PM added by hand, in the order they added it.
    ...kept.filter((s) => !templateTitles.has(s.title)),
  ];
  const unchanged =
    next.length === subs.length && next.every((s, i) => s.id === subs[i].id);
  return unchanged ? subs : next;
}

/* Which template steps a card actually runs. Not every card takes the build
 * path: a bug ticket doesn't need a brief or a design handover, and an audit is
 * a Setup → Strategy → Done diagnostic that never enters the build columns.
 * They still keep anything a PM added by hand. */
export function templateForCard(
  d: Pick<MockDeliverable, "phase" | "cardType">,
): SubtaskTemplateItem[] {
  if (d.phase === "tickets" || d.phase === "documents") return [];
  if (d.cardType === "audit")
    return SUBTASK_TEMPLATE.filter((t) => t.group === "strategy");
  return SUBTASK_TEMPLATE;
}

/** A card's checklist, normalised. THE way to read subtasks: the card face and
 *  the modal both go through here, so neither can show a list the other
 *  doesn't. Pure - persistence happens whenever the card is next saved. */
export function checklistFor(
  d: Pick<MockDeliverable, "phase" | "cardType" | "subtasks">,
): Subtask[] {
  return seedSubtasks(d.subtasks, templateForCard(d));
}

/* ── The build schedule ──
 * ONE source: the dates a PM types onto the card, per column. There is no
 * cascade and no day-budget table - the two that used to compute this from
 * startDate + turnaroundDays disagreed with each other (Design was day 3 in one
 * and day 4 in the other), because a schedule guessed from a budget was never
 * as good as the one the PM already knows. A column with no date is simply
 * undated: it reads neutral and never goes red.
 *
 * The map: a card sitting in Design reads its OWN "design" date. That's the
 * whole mapping - no lookup, no anchoring, no derivation. */

function daysBetweenISO(fromISO: string, toISO: string): number {
  const a = new Date(`${fromISO}T00:00:00Z`).getTime();
  const b = new Date(`${toISO}T00:00:00Z`).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

/** Columns that carry a date, in board order. Setup has no work to date; the
 *  SLA columns (tickets / documents) run their own clocks; Done is terminal;
 *  the Results Engine phases live off this board. */
export const SCHEDULE_PHASES: PreviewPhase[] = [
  "strategy",
  "design",
  "internal-revisions",
  "external-revisions",
  "development",
  "qa",
  "client-approval",
  "launch",
];

/** Days added to the planned span to get the figure you quote the client. The
 *  plan is the internal target; the quote carries the buffer. */
export const CLIENT_BUFFER_DAYS = 3;

export interface ScheduleRow {
  phase: PreviewPhase;
  date?: string;
}

export interface CardSchedule {
  rows: ScheduleRow[];
  /** Span in days from the first dated column to the last. undefined until at
   *  least two columns are dated - one date is a point, not a duration. */
  plannedDays?: number;
  /** What to tell the client: the plan plus the buffer. */
  clientDays?: number;
  /** What the build was sold as, for comparison. Never computed FROM. */
  contractedDays?: number;
}

/** A card's typed schedule, plus the arithmetic on top of it. */
export function cardSchedule(
  d: Pick<MockDeliverable, "phaseDeadlines"> & { turnaroundDays?: number },
): CardSchedule {
  const rows: ScheduleRow[] = SCHEDULE_PHASES.map((phase) => ({
    phase,
    date: d.phaseDeadlines?.[phase],
  }));
  const dated = rows.map((r) => r.date).filter((x): x is string => !!x);
  if (dated.length < 2) {
    return { rows, contractedDays: d.turnaroundDays };
  }
  // Sorted, not first/last by column order: a half-filled schedule shouldn't
  // report a negative span just because the PM dated Launch before Design.
  const sorted = [...dated].sort();
  const planned = daysBetweenISO(sorted[0], sorted[sorted.length - 1]);
  return {
    rows,
    plannedDays: planned,
    clientDays: planned + CLIENT_BUFFER_DAYS,
    contractedDays: d.turnaroundDays,
  };
}

/** When a card is due overall: its Launch date. Falls back to the hand-set
 *  card date, which is all a ticket or a document has (they never run columns).
 *  One answer, so the board sort, the health colour and My Tasks agree. */
export function cardDueDate(
  d: Pick<MockDeliverable, "phaseDeadlines" | "dueDate">,
): string | undefined {
  return d.phaseDeadlines?.launch ?? d.dueDate;
}

/* ── Multi-test helpers ──
 * The Optimisation tab treats `tests` as the source of truth. Everything else
 * (card face, Results bank, My Tasks) reads the singular legacy fields, which
 * mirror the ACTIVE (last) run. These three helpers keep the two in sync. */

/* The active run = the last one in the array (the one currently live or the
 * most recently concluded). undefined when there are no runs. */
export function activeTestRun(d: MockDeliverable): TestRun | undefined {
  return d.tests && d.tests.length ? d.tests[d.tests.length - 1] : undefined;
}

/* Read-side normaliser: cards created before multi-test have their test data
 * on the legacy singular fields. Synthesise a single run from them so the
 * Optimisation tab always has an array to render. No-op once `tests` exists. */
export function testRunsFor(d: MockDeliverable): TestRun[] {
  if (d.tests && d.tests.length) return d.tests;
  const hasLegacy =
    !!d.liveTestUrl ||
    !!d.liveStartedAt ||
    !!(d.metrics && d.metrics.length) ||
    !!d.interimNotes ||
    !!d.screenshot ||
    !!d.testResult;
  if (!hasLegacy) return [];
  return [
    {
      id: `run-legacy-${d.id}`,
      label: "Test 1",
      liveTestUrl: d.liveTestUrl,
      liveStartedAt: d.liveStartedAt,
      metrics: d.metrics,
      interimNotes: d.interimNotes,
      screenshot: d.screenshot,
      result: d.testResult,
    },
  ];
}

/* Write-side mirror: given a new `tests` array, return the patch that also
 * refreshes the legacy singular fields from the active run, so downstream
 * readers stay correct. Apply via updateDeliverable(id, mirrorTestRuns(tests)). */
export function mirrorTestRuns(tests: TestRun[]): Partial<MockDeliverable> {
  const active = tests.length ? tests[tests.length - 1] : undefined;
  return {
    tests,
    liveTestUrl: active?.liveTestUrl,
    liveStartedAt: active?.liveStartedAt,
    metrics: active?.metrics,
    interimNotes: active?.interimNotes,
    screenshot: active?.screenshot,
    testResult: active?.result,
  };
}

export interface MockProject {
  id: string;
  name: string;
  /** Project type. "build" is a one-off engagement scoped in turnaround days
   *  (15/20/25). "retainer" is an ongoing engagement scoped in engagement
   *  days (30/60/90) that auto-seeds a recurring Documents schedule. */
  type?: "build" | "retainer";
  /** Currently-assigned pod. Picking a pod from the dropdown bulk-writes the
   *  pod's four role names onto every deliverable in this project. */
  podId?: string;
  /** Total turnaround days a BUILD is scoped for. Drives the per-phase
   *  internal due dates (Phase 1 locked at startDate, Phase 2 locked on
   *  clientApprovedAt). 3-day buffer between internal target + external. */
  turnaroundDays?: 15 | 20 | 25;
  /** Total engagement length a RETAINER runs for. Drives how many weekly
   *  reports + monthly test plans are preloaded into the Documents column. */
  engagementDays?: 30 | 60 | 90;
  /** When the project work began. ISO yyyy-mm-dd. For builds this is the
   *  anchor for Phase 1 phase deadlines (Strategy / Design / Internal Rev)
   *  and the external client deadline. Set on project creation. */
  startDate?: string;
  /** When the client signed off on the design (first time a card moved out
   *  of External Revisions into Development). Anchors Phase 2 phase
   *  deadlines (Dev / QA / Launch). Until set, Phase 2 deadlines read "TBC". */
  clientApprovedAt?: string;
  /** Manual client-facing deadline for Phase 1 (Strategy / Design / Internal
   *  Rev / External Rev). When set, overrides the computed per-phase due
   *  dates for stuck/approaching/on-track on every Phase 1 card. ISO
   *  yyyy-mm-dd. Useful when the project has an externally-imposed deadline
   *  (campaign launch, event, client cut-off) instead of just computing
   *  from startDate + turnaroundDays. */
  phase1Deadline?: string;
  /** Manual client-facing deadline for Phase 2 (Dev / QA / Launch). Same
   *  override semantics as phase1Deadline but scoped to Phase 2 cards. */
  phase2Deadline?: string;
  /** Project-level strategy brief - URL or freeform text. Shown on
   *  every card belonging to this project so designers + devs always
   *  see context. Edited from any card popup; writes propagate to
   *  every card on the project. */
  brief?: string;
  /** Project-level Figma URL - one design file shared across every
   *  card on the project. */
  figmaUrl?: string;
  /** Commercial tier (see tierConfig). The single source of truth for the
   *  engagement's shape: pool size, research depth, cadence, package. When set,
   *  the project's build/retainer `type` derives from it (one_off => build).
   *  Everything tier-dependent resolves through tierConfig - never branch on
   *  the tier name directly. */
  tier?: TierName;
  /** Monthly recurring revenue for this engagement, in the account currency.
   *  Commercial context only - the token meter does not read it. */
  mrr?: number;
  /** Lifecycle of the commercial engagement. Only an `active` retainer resolves
   *  a monthly cycle + shows the token meter. */
  engagementStatus?: EngagementStatus;
  deliverables: MockDeliverable[];
}

/** Structured onboarding brief sourced from the OnboardingSubmission the
 *  client fills in. Subset of the full submission curated for what the
 *  strategist + design team reach for during build: who the brand is, who
 *  it sells to, what success looks like, voice, and the obvious risks.
 *  Rendered in the OnboardingPreviewModal as grouped Q&A. */
export interface OnboardingBrief {
  websiteUrl?: string;
  shopifyUrl?: string;
  primaryContact?: string;
  timezone?: string;
  primaryGoal?: string;
  successMetric?: string;
  timelineExpectation?: string;
  toneOfVoice?: string;
  wordsToAvoid?: string;
  usps?: string;
  valueProps?: string;
  targetCustomer?: string;
  competitors?: string;
  challenges?: string;
  notes?: string;
}

export interface MockClient {
  id: string;
  name: string;
  projects: MockProject[];
  /** Structured answers from the client's onboarding form, rendered as
   *  grouped Q&A in the brief popup. Replaces the old URL-only field. */
  onboardingBrief?: OnboardingBrief;
}

export const MOCK_CLIENTS: MockClient[] = [
  {
    id: "harvestory",
    name: "Harvestory",
    onboardingBrief: {
      websiteUrl: "https://harvestory.com",
      shopifyUrl: "harvestory.myshopify.com",
      primaryContact: "Maya Chen (Head of Growth)",
      timezone: "EST (UTC-5)",
      primaryGoal:
        "Push the PDP CVR from 1.8% to 2.6% on the hero range without slowing mobile LCP. Secondary: lift AOV via bundle adoption.",
      successMetric:
        "Add-to-cart rate on the hero PDPs (Hibiscus, Elderberry, Ingredients line). Currently 6.4% mobile / 9.1% desktop.",
      timelineExpectation:
        "First test live in 3 weeks. Expecting 2 to 3 tests/month after that. Q4 sprint runs through end of Sep.",
      toneOfVoice:
        "Confident, plain-spoken, no jargon. Bias toward 'how it works' over 'why we made it'. Customers are 35 to 55 women researching ingredients carefully.",
      wordsToAvoid:
        "Detox, miracle, cure, anti-aging, doctor-approved, clinically proven (legal flagged the last two).",
      usps:
        "Cold-pressed extraction, single-origin sourcing (every batch traceable to a farm), no fillers, third-party tested on every lot.",
      valueProps:
        "1. Clean, traceable ingredients\n2. Visible results in 4 to 6 weeks\n3. Subscription savings + flexibility\n4. 60-day no-questions money-back",
      targetCustomer:
        "Women 35 to 55, household income $80k+, already taking 1 or 2 supplements. Skeptical of marketing claims, reads ingredient lists, checks reviews on Reddit before buying.",
      competitors:
        "Ritual, Care/of, HUM Nutrition (premium-clean tier). Differentiator vs all three: cold-pressed sourcing + per-batch traceability.",
      challenges:
        "PDP bounce is high on mobile (62%). Reviews carousel below the fold gets very little engagement. Subscription opt-in stuck around 18%.",
      notes:
        "Founders are involved on copy approvals - usually a 24h turnaround. Avoid scheduling major test launches in the first week of October (FDA audit window).",
    },
    projects: [
      {
        id: "pdp-build",
        name: "PDP Build",
        podId: "pod-1",
        deliverables: [
          // ── Tickets (front-of-line for triage) ───────────────────────────
          { id: "h-t1", category: "Bug", title: "Variant selector shows wrong price on 6-month", developer: "Ashish Dadwal", secondaryDeveloper: "Kaye Ann Layug", designer: "Brandon Baldwin", secondaryDesigner: "Viktoriia Parchuk", dueDate: "2026-06-06", phase: "tickets", hoursInPhase: 6, phaseHistory: buildHistory("2026-06-17", "tickets") },
          // ── Deliverables ─────────────────────────────────────────────────
          { id: "h1", category: "Primary", title: "Hero + Above-the-fold", designer: "Viktoriia Parchuk", secondaryDesigner: "Brandon Baldwin", developer: "Ashish Dadwal", secondaryDeveloper: "Ian Rex Espinosa", dueDate: "2026-06-08", phase: "external-revisions", hoursInPhase: 14, phaseHistory: buildHistory("2026-06-13", "strategy", "design", "internal-revisions", "design", "external-revisions") },
          // h2: 4 revision rounds — flips to LIMBO badge, plus time-stuck
          { id: "h2", category: "Primary", title: "Ingredients section", designer: "Viktoriia Parchuk", secondaryDesigner: "Brandon Baldwin", developer: "Ashish Dadwal", secondaryDeveloper: "Ian Rex Espinosa", dueDate: "2026-06-06", phase: "external-revisions", hoursInPhase: 50, phaseHistory: buildHistory("2026-06-09", "strategy", "design", "internal-revisions", "design", "internal-revisions", "design", "external-revisions", "design", "external-revisions"), brief: "https://figma.com/file/H7xPDPIngredients/Harvestory-Ingredients" },
          { id: "h3", category: "Primary", title: "Reviews + UGC carousel", designer: "Brandon Baldwin", secondaryDesigner: "Viktoriia Parchuk", developer: "Ashish Dadwal", secondaryDeveloper: "Ian Rex Espinosa", dueDate: "2026-06-12", phase: "design", hoursInPhase: 36, phaseHistory: buildHistory("2026-06-11", "strategy", "design") },
          { id: "h4", category: "Secondary", title: "Variant selector", designer: "Brandon Baldwin", secondaryDesigner: "Viktoriia Parchuk", developer: "Ashish Dadwal", secondaryDeveloper: "Ian Rex Espinosa", dueDate: "2026-06-07", phase: "internal-revisions", hoursInPhase: 5, phaseHistory: buildHistory("2026-06-17", "strategy", "design", "internal-revisions") },
          { id: "h5", category: "Secondary", title: "FAQ block", designer: "Barnaby Clark", secondaryDesigner: "Viktoriia Parchuk", dueDate: "2026-06-15", phase: "strategy", hoursInPhase: 20, phaseHistory: buildHistory("2026-06-14", "strategy") },
          { id: "h6", category: "Primary", title: "Sticky ATC", designer: "Viktoriia Parchuk", secondaryDesigner: "Brandon Baldwin", developer: "Ashish Dadwal", secondaryDeveloper: "Ian Rex Espinosa", dueDate: "2026-06-20", phase: "development", hoursInPhase: 38, phaseHistory: buildHistory("2026-06-10", "strategy", "design", "external-revisions", "design", "development") },
          // ── Ready for testing — demo of the "ready" state (no test running yet) ─
          { id: "h-ready1", category: "Secondary", title: "Promo banner A/B", designer: "Viktoriia Parchuk", secondaryDesigner: "Brandon Baldwin", developer: "Ashish Dadwal", secondaryDeveloper: "Ian Rex Espinosa", dueDate: "2026-06-20", phase: "launch-testing", hoursInPhase: 2, phaseHistory: buildHistory("2026-06-16", "strategy", "design", "development", "qa", "launch-testing") },
          // ── Live test that's overdue — demo for the "ready to conclude" nudge ─
          { id: "h-live1", category: "Primary", title: "Hero CTA copy test", designer: "Viktoriia Parchuk", secondaryDesigner: "Brandon Baldwin", developer: "Ashish Dadwal", secondaryDeveloper: "Ian Rex Espinosa", dueDate: "2026-06-04", phase: "launch-testing", hoursInPhase: 6, phaseHistory: buildHistory("2026-05-31", "strategy", "design", "development", "qa", "launch-testing"), liveTestUrl: "https://harvestory.com/?cta=v2", liveStartedAt: "2026-05-31", metrics: [{ name: "Add-to-cart rate", interim: "+8%" }, { name: "CVR", interim: "+5%" }, { name: "AOV", interim: "0%" }], interimNotes: "Variant beating control by +8% consistently for 10+ days. Plateau looks real, time to call it." },
          // ── Completed tests (in Results bank, not the kanban) ────────────
          { id: "h-done1", category: "Primary", title: "Bundle PDP layout", designer: "Viktoriia Parchuk", secondaryDesigner: "Brandon Baldwin", developer: "Ashish Dadwal", secondaryDeveloper: "Ian Rex Espinosa", phase: "launch-testing", hoursInPhase: 0, phaseHistory: buildHistory("2026-05-15", "strategy", "design", "internal-revisions", "design", "external-revisions", "design", "development", "qa", "launch-testing"), liveTestUrl: "https://harvestory.com/products/bundle-pdp-v2", testResult: { concludedAt: "2026-06-09", outcome: "winner", metric: "CVR", upliftPct: 18, confidencePct: 96, durationDays: 25, notes: "Switched the bundle picker from dropdown to inline cards. Stronger lift on mobile (+24%). Client wants to roll the pattern to the rest of the catalogue." } },
        ],
      },
      {
        id: "cart-drawer",
        name: "Cart Drawer Redesign",
        podId: "pod-2",
        // Configured as an active Growth retainer so the token meter renders
        // against real data out of the box (50-token monthly pool). Existing
        // cards below carry no `size`, so consumed starts at 0.
        tier: "growth",
        engagementStatus: "active",
        mrr: 8000,
        deliverables: [
          { id: "h7", category: "Primary", title: "Cart drawer UI", designer: "Brandon Baldwin", secondaryDesigner: "Viktoriia Parchuk", developer: "Ian Rex Espinosa", secondaryDeveloper: "Kaye Ann Layug", dueDate: "2026-06-09", phase: "external-revisions", hoursInPhase: 22, phaseHistory: buildHistory("2026-06-13", "strategy", "design", "internal-revisions", "design", "external-revisions") },
          { id: "h8", category: "Primary", title: "Upsell slot logic", designer: "Brandon Baldwin", secondaryDesigner: "Viktoriia Parchuk", developer: "Ian Rex Espinosa", secondaryDeveloper: "Kaye Ann Layug", dueDate: "2026-06-14", phase: "design", hoursInPhase: 18, phaseHistory: buildHistory("2026-06-14", "strategy", "design") },
          { id: "h9", category: "Primary", title: "Threshold reward bar", designer: "Brandon Baldwin", secondaryDesigner: "Viktoriia Parchuk", developer: "Ian Rex Espinosa", secondaryDeveloper: "Kaye Ann Layug", dueDate: "2026-06-18", phase: "strategy", hoursInPhase: 8, phaseHistory: buildHistory("2026-06-16", "strategy") },
        ],
      },
    ],
  },
  {
    id: "iron-paws",
    name: "Iron Paws",
    projects: [
      {
        id: "full-site",
        name: "Full Site Build",
        podId: "pod-3",
        deliverables: [
          // Ticket — small client tweak request
          { id: "i-t1", category: "Tertiary", title: "Hero CTA copy: \"Get yours\" → \"Try the box\"", designer: "Jack", secondaryDesigner: "Anastasia", developer: "Hitesh Kaushal", secondaryDeveloper: "Aleksandar", dueDate: "2026-06-06", phase: "tickets", hoursInPhase: 14, phaseHistory: buildHistory("2026-06-15", "tickets") },
          { id: "i1", category: "Primary", title: "Homepage", designer: "Jack", secondaryDesigner: "Anastasia", developer: "Hitesh Kaushal", secondaryDeveloper: "Aleksandar", dueDate: "2026-06-05", phase: "launch-testing", hoursInPhase: 4, phaseHistory: buildHistory("2026-06-12", "strategy", "design", "internal-revisions", "design", "external-revisions", "design", "development", "qa", "launch-testing"), liveTestUrl: "https://ironpaws.com/?variant=v2", liveStartedAt: "2026-06-12", metrics: [{ name: "CVR", interim: "+12%" }, { name: "AOV", interim: "+3%" }, { name: "RPV", interim: "+15%" }], interimNotes: "Strong early signal — variant pulling +12% across the board, mobile even higher (+18%). Want another week before calling it." },
          { id: "i2", category: "Secondary", title: "Collection — Beef Cuts", designer: "Jack", secondaryDesigner: "Anastasia", developer: "Hitesh Kaushal", secondaryDeveloper: "Aleksandar", dueDate: "2026-06-22", phase: "development", hoursInPhase: 38, phaseHistory: buildHistory("2026-06-10", "strategy", "design", "external-revisions", "design", "development") },
          { id: "i3", category: "Primary", title: "PDP — Subscription box", designer: "Jack", secondaryDesigner: "Anastasia", developer: "Hitesh Kaushal", secondaryDeveloper: "Aleksandar", dueDate: "2026-06-07", phase: "qa", hoursInPhase: 28, phaseHistory: buildHistory("2026-06-12", "strategy", "design", "internal-revisions", "design", "external-revisions", "design", "development", "qa") },
          { id: "i4", category: "Primary", title: "Quiz funnel — breed match", designer: "Anastasia", secondaryDesigner: "Jack", developer: "Hitesh Kaushal", secondaryDeveloper: "Aleksandar", dueDate: "2026-06-10", phase: "internal-revisions", hoursInPhase: 12, phaseHistory: buildHistory("2026-06-15", "strategy", "design", "internal-revisions", "design", "internal-revisions") },
          // i5: 3 internal-revision rounds — flips to R3 heating-up badge
          { id: "i5", category: "Tertiary", title: "Account dashboard", designer: "Anastasia", secondaryDesigner: "Jack", developer: "Hitesh Kaushal", secondaryDeveloper: "Aleksandar", dueDate: "2026-06-11", phase: "internal-revisions", hoursInPhase: 18, phaseHistory: buildHistory("2026-06-14", "strategy", "design", "internal-revisions", "design", "internal-revisions", "design", "internal-revisions") },
          { id: "i6", category: "Primary", title: "Cart + checkout", designer: "Jack", secondaryDesigner: "Anastasia", developer: "Hitesh Kaushal", secondaryDeveloper: "Aleksandar", dueDate: "2026-06-25", phase: "strategy", hoursInPhase: 10, phaseHistory: buildHistory("2026-06-15", "strategy") },
          // ── Completed tests ──────────────────────────────────────────────
          { id: "i-done1", category: "Primary", title: "Quiz funnel — CTA copy", designer: "Anastasia", secondaryDesigner: "Jack", developer: "Hitesh Kaushal", secondaryDeveloper: "Aleksandar", phase: "launch-testing", hoursInPhase: 0, phaseHistory: buildHistory("2026-05-20", "strategy", "design", "development", "qa", "launch-testing"), liveTestUrl: "https://ironpaws.com/quiz?variant=v2", testResult: { concludedAt: "2026-06-04", outcome: "winner", metric: "Completion rate", upliftPct: 24, confidencePct: 99, durationDays: 14, notes: "\"Find your dog's match\" beat \"Take the quiz\" by a mile. Repurpose for the ad set." } },
          { id: "i-done2", category: "Primary", title: "Subscription pricing display", designer: "Jack", secondaryDesigner: "Anastasia", developer: "Hitesh Kaushal", secondaryDeveloper: "Aleksandar", phase: "launch-testing", hoursInPhase: 0, phaseHistory: buildHistory("2026-04-28", "strategy", "design", "development", "qa", "launch-testing"), liveTestUrl: "https://ironpaws.com/products/sub-box?variant=v3", testResult: { concludedAt: "2026-05-12", outcome: "loser", metric: "CVR", upliftPct: -7, confidencePct: 92, durationDays: 14, notes: "Showing per-month break-down hurt conversion. Customers seemed to anchor on the smaller number and bounce. Reverted to total price." } },
        ],
      },
    ],
  },
  {
    id: "acme-skincare",
    name: "Acme Skincare",
    projects: [
      {
        id: "hero-refresh",
        name: "Hero Refresh",
        podId: "pod-1",
        deliverables: [
          // Ticket — overflow on press strip
          { id: "a-t1", category: "Bug", title: "Press logo strip overflowing on mobile", designer: "Viktoriia Parchuk", secondaryDesigner: "Brandon Baldwin", developer: "Ashish Dadwal", secondaryDeveloper: "Ian Rex Espinosa", dueDate: "2026-06-07", phase: "tickets", hoursInPhase: 28, phaseHistory: buildHistory("2026-06-13", "tickets") },
          { id: "a1", category: "Primary", title: "Above-the-fold redesign", designer: "Viktoriia Parchuk", secondaryDesigner: "Brandon Baldwin", dueDate: "2026-06-08", phase: "external-revisions", hoursInPhase: 22, phaseHistory: buildHistory("2026-06-13", "strategy", "design", "external-revisions", "design", "external-revisions") },
          { id: "a2", category: "Secondary", title: "Press-quote strip", designer: "Viktoriia Parchuk", secondaryDesigner: "Brandon Baldwin", dueDate: "2026-06-13", phase: "design", hoursInPhase: 26, phaseHistory: buildHistory("2026-06-13", "strategy", "design") },
          { id: "a3", category: "Secondary", title: "Trust badges row", designer: "Viktoriia Parchuk", secondaryDesigner: "Brandon Baldwin", dueDate: "2026-06-13", phase: "design", hoursInPhase: 12, phaseHistory: buildHistory("2026-06-15", "strategy", "design") },
          // ── Completed tests ──────────────────────────────────────────────
          { id: "a-done1", category: "Primary", title: "Hero video vs static", designer: "Viktoriia Parchuk", secondaryDesigner: "Brandon Baldwin", developer: "Ashish Dadwal", secondaryDeveloper: "Ian Rex Espinosa", phase: "launch-testing", hoursInPhase: 0, phaseHistory: buildHistory("2026-05-08", "strategy", "design", "development", "qa", "launch-testing"), liveTestUrl: "https://acmeskincare.com/?variant=video", testResult: { concludedAt: "2026-05-29", outcome: "inconclusive", metric: "Revenue per visitor", upliftPct: 2, confidencePct: 71, durationDays: 21, notes: "Hero video edged static by ~2% but never crossed 90% confidence. Bounce rate slightly worse on mobile (slower LCP). Holding pattern: keep static, retest with a lighter video file." } },
        ],
      },
      {
        id: "advertorial-set",
        name: "Advertorial Set ×3",
        deliverables: [
          { id: "a4", category: "Secondary", title: "Advertorial A — clinical study", designer: "Barnaby Clark", secondaryDesigner: "Anastasia", dueDate: "2026-06-04", phase: "strategy", hoursInPhase: 36, phaseHistory: buildHistory("2026-06-12", "strategy") },
          { id: "a5", category: "Secondary", title: "Advertorial B — founder story", designer: "Barnaby Clark", secondaryDesigner: "Anastasia", dueDate: "2026-06-16", phase: "strategy", hoursInPhase: 18, phaseHistory: buildHistory("2026-06-14", "strategy") },
          { id: "a6", category: "Secondary", title: "Advertorial C — ingredient deep-dive", designer: "Barnaby Clark", secondaryDesigner: "Anastasia", phase: "not-started", hoursInPhase: 0, phaseHistory: [] },
        ],
      },
    ],
  },
];
