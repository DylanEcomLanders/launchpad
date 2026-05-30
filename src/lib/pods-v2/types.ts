// ─── Pods v2, operating-system data model ─────────────────────────
// Per spec: three pods, each four-person (primary + secondary designer/dev).
// Strict weekly cadence, points → bucket → duration auto-calculation.

export type PodMemberRole =
  | "cro_lead"
  | "primary_designer"
  | "secondary_designer"
  | "primary_dev"
  | "secondary_dev";

export interface PodMember {
  id: string;
  name: string;
  role: PodMemberRole;
  pod_id: string;
  is_placeholder: boolean;
  /** Optional uploaded photo. If set, replaces the generated PodAvatar
   * SVG/initial fallback. */
  avatar_url?: string;
  /** Out-of-office window. When today's date is inside [start, end]
   * (inclusive), the member is treated as away: avatar dims, swim
   * lane shows an "OOO until" pill, and autopair on Conversion Engine
   * seeding falls through to the secondary if the primary is away.
   * Both dates are YYYY-MM-DD; either can be missing if the absence
   * is open-ended. */
  ooo_start?: string;
  ooo_end?: string;
}

export interface Pod {
  id: string;
  name: string; // "Pod 1"
  tagline: string; // "Barnaby's pod"
  members: PodMember[];
  capacity_points_per_month: number; // 40 by rule
  /** Active blockers raised on this pod. Active = no resolved_at. Visible
   * to everyone in the pod and surfaced as a count on the overview. */
  blockers?: PodBlocker[];
  /** Slack channel ID (e.g. "C0123456") for pod-internal notifications.
   * When set, raising a blocker pings this channel so the team can
   * react without opening Launchpad. Optional, empty string disables. */
  slack_channel_id?: string;
}

export interface PodBlocker {
  id: string;
  title: string;
  description?: string;
  /** Member id of who's owning the resolution. Optional, blockers can
   * be raised without an owner. */
  owner_id?: string;
  raised_at: string; // ISO
  raised_by?: string; // free-text identifier (name/email)
  resolved_at?: string; // ISO when resolved
  resolved_by?: string;
}

export type RetainerTier = "none" | "8k" | "12k";

// ─── Clients v2: engagement lifecycle (spec §1.2, §1.9, §2.7) ─────
// All fields below are added to Client as optional so existing rows stay
// valid. Stored in the pods_v2_clients JSONB (no migration needed).

/** Sprint = one-off, points→bucket→fixed duration (§1.2a). Retainer = 90-day
 * Conversion Engine partnership (§1.2b). Defaults to retainer when the client
 * carries a retainer_tier, sprint otherwise. */
export type EngagementKind = "retainer" | "sprint";

/** 90-day retainer renewal lifecycle (§1.9). `refresh_due` = inside the Day
 * 60-90 window where the Day-75 conversation drives the manual renewal call. */
export type RenewalStatus =
  | "active"
  | "refresh_due"
  | "renewed"
  | "winding_down"
  | "churned";

/** CSM relationship-health inputs, scored from real delivery signals rather
 * than vibes (§2.7). Lower is better on every axis. Weights live in calc.ts
 * (healthScore) and are provisional/tunable — see DECISIONS.md #6. */
export interface HealthSignals {
  /** Cumulative working days a deliverable sat client-side awaiting assets/approval. */
  client_delay_days: number;
  /** Average working days the client takes to approve a deliverable. */
  approval_lag_days: number;
  /** Days since the last meaningful client touch (call, approval, message). */
  engagement_gap_days: number;
  /** Open blockers attributable to the client relationship. */
  open_blockers: number;
}

export interface Client {
  id: string;
  name: string;
  pod_id: string;
  brand_warm: boolean;
  retainer_tier: RetainerTier;
  /** Optional link to the launchpad client portal slug. */
  portal_slug?: string;
  /** Conversion-rate snapshot at engagement start. % as decimal, 2.4
   * means 2.4%. Manually entered by the PM at intake. Drives the
   * baseline → current delta on the client roster card and feeds
   * retainer-renewal share-cards. */
  cvr_baseline?: number;
  /** Latest CVR reading for this client. Manually updated by Dan / the
   * pod after each test or each month. */
  cvr_current?: number;
  /** Average order value snapshot at engagement start, in GBP. */
  aov_baseline?: number;
  /** Latest AOV reading. */
  aov_current?: number;
  /** ISO timestamp of when CVR/AOV were last updated. */
  metrics_updated_at?: string;
  /** Editable client brief snapshot. Populated initially from the
   * OnboardingSubmission when an engagement is spawned and decoupled
   * thereafter, PMs edit per-client without mutating the original
   * intake record. Surfaces in the /engagements Brief panel. */
  brief?: ClientBrief;
  /** Wins log, what shipped and what it moved. Auto-derived entries
   * (test winners) are added by the Tasks bridge; manual entries for
   * non-test ships can also be appended here. */
  wins?: ClientWin[];
  /** YYYY-MM-DD kickoff Monday. Authoritative when there are no Projects
   * yet (single source for the engagement startDate). */
  kickoff_date?: string;
  /** Link back to the OnboardingSubmission this engagement was spawned
   * from. Powers the Intake panel on /engagements, pods working a
   * client can see the full intake form (brand assets, Shopify creds,
   * tracking pixels, etc.) without needing the inbox link. */
  onboarding_submission_id?: string;
  /** Engagement-level QA gates. Four gates mirroring the portal QA
   * pipeline so the team uses identical vocabulary + checklists across
   * both surfaces. Keys align with portal's qa_gates keys (cro_brief
   * = Design Brief, design_handoff = Dev Handover, dev_handoff = Dev
   * QA, launch_prep = Handoff / Testing). Surfaces as the "Must dos"
   * row at the top of /engagements/[id]; each pill opens a modal with
   * the gate's items, optional artefact links, and a notes textarea. */
  must_dos?: {
    cro_brief?: MustDoGate;
    design_handoff?: MustDoGate;
    dev_handoff?: MustDoGate;
    launch_prep?: MustDoGate;
  };
  /** Timestamped notes log on the engagement. Free-text entries the PM
   *  / pod can drop at any point ("client asked for X on Slack", "rev
   *  round 2 landed", "blocker resolved", etc.). Newest-first when
   *  rendered. Optional author field for when a multi-user setup wants
   *  to attribute notes; otherwise blank reads as "team". */
  notes?: ClientNote[];

  // ─── Clients v2 engagement lifecycle (§1.2, §1.9, §2.7) ─────────
  /** Sprint vs Retainer. When unset, derive from retainer_tier (see
   * engagementKindOf in calc.ts) so existing rows behave sensibly. */
  engagement_kind?: EngagementKind;
  /** YYYY-MM-DD anchor for Day 1 of the engagement (§1.6 brief-lock start).
   * Falls back to kickoff_date when unset — see DECISIONS.md #5. Drives the
   * Day-45 check-in and Day-75 refresh countdowns for retainers (§1.9). */
  engagement_start?: string;
  /** 90-day renewal state (§1.9). Defaults to "active" for retainers. */
  renewal_status?: RenewalStatus;
  /** CSM's next scheduled client touch, YYYY-MM-DD (§3.3 weekly / Day-45). */
  next_check_in?: string;
  /** Free-text relationship risks surfaced on the CSM client profile (§2.7). */
  risk_flags?: string[];
  /** Notes seeded from onboarding — the handoff fix so context isn't lost
   * between sale and delivery (§3.2). */
  onboarding_notes?: string[];
  /** Strategist's one-line applied thesis for the client (§2.1, §3.2). */
  strategy_thesis?: string;
  /** CSM health inputs (§2.7). Scored via healthScore() in calc.ts. */
  health_signals?: HealthSignals;
}

export interface ClientNote {
  id: string;
  content: string;
  created_at: string;
  author?: string;
}

export interface MustDoGate {
  /** Map of item label to checked state. Items that haven't been touched
   * yet are absent (treated as unchecked). */
  items?: Record<string, boolean>;
  /** Free-text notes captured during the gate. */
  notes?: string;
  /** Optional artefact URL (Figma link for Design Brief / Dev Handover). */
  link?: string;
  /** Preview / staging URLs submitted with the Dev QA gate, multiple,
   * mirroring the portal flow where the dev submits every page they want
   * QA'd. Only used by dev_handoff today; left optional on the type so
   * other gates can opt-in later. */
  preview_urls?: { url: string; label?: string }[];
  /** Set when the gate is marked complete (every item checked + saved).
   * Cleared if any item is unchecked again after completion. */
  completed_at?: string;
}

/** 14-field client brief snapshot, intentionally the same keys as the
 * /engagements Brief panel so the bridge is a 1:1 read. */
export interface ClientBrief {
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

export interface ClientWin {
  id: string;
  shippedAtDay: number;
  title: string;
  metric?: string;
  notes?: string;
}

/** Headline scope of each retainer tier. Shown on client cards. */
export const RETAINER_SCOPE: Record<RetainerTier, string> = {
  none: "Project-only",
  "8k": "Full funnel build · ongoing tests",
  "12k": "Full funnel build · faster turnarounds · dedicated calls",
};

export type Bucket = "A" | "B" | "C" | "Bespoke";

export type ProjectStatus =
  | "queued"
  | "in_progress"
  | "in_review"
  | "shipped"
  | "slipped";

export type SlipReason =
  | "scope"
  | "capacity"
  | "skill"
  | "dependency"
  | "external";

export type PageType =
  | "pdp"
  | "homepage"
  | "quiz"
  | "advertorial"
  | "listicle"
  | "collection"
  | "cart"
  | "about"
  | "faq"
  | "policies"
  | "navigation"
  | "account"
  | "contact";

export type PageWeight = "heavy" | "medium" | "light";

export interface ProjectPage {
  type: PageType;
  weight: PageWeight;
  /** Optional variant label that the PM captured during intake (e.g.
   * "Whitening Strips" for one of three PDPs). Threads through to the
   * seeded task titles so the pod can tell paired deliverables apart
   * at a glance instead of seeing four identical "Design - PDP" rows. */
  label?: string;
}

export type TaskType =
  | "core_deliverable"
  | "revision"
  | "bug"
  | "desktop_fix"
  | "asset_prep"
  | "library";

export type TaskStatus = "todo" | "in_progress" | "done";

/** Whether the task belongs to the design or development side of the pod. */
export type TaskDiscipline = "strategy" | "design" | "development";

/**
 * Phase a core_deliverable task is sitting in. Mirrors the task-board phase
 * set so the operating system reads consistently across surfaces.
 * Tickets (revisions, bugs, etc.) leave this undefined.
 */
export type TaskPhase =
  | "onboarding"
  | "research"
  | "wireframe"
  | "design"
  | "internal-design-qa"
  | "external-design-review"
  | "design-revision"
  | "development"
  | "development-qa"
  | "external-dev-review"
  | "dev-revision"
  | "launch";

export type TaskPriority = "low" | "normal" | "high" | "urgent";

export interface Task {
  id: string;
  project_id: string;
  title: string;
  type: TaskType;
  discipline: TaskDiscipline;
  assigned_to: string; // PodMember id
  status: TaskStatus;
  /** Per-task deadline. Design tasks end of week 1; dev tasks on delivery Thursday. */
  due_date: string; // YYYY-MM-DD
  /** When the task was created, drives "open Xd" age display on tickets. */
  created_at: string; // ISO timestamp
  /** Optional phase for core deliverables; tickets leave this undefined. */
  phase?: TaskPhase;
  /** Per-visit phase history. Every entry into a phase appends a new
   * row, revisits are kept as separate spans (not aggregated) so the
   * revision-loop count is visible in the timeline. Drives the shared
   * Phase Timeline component in both pod and engagement surfaces. */
  phase_history?: import("@/lib/task-board/phases").PhaseEntry[];
  /** Priority, mainly used for tickets where reaction time matters. */
  priority?: TaskPriority;
  /** Pause state for tickets: who we're waiting on. While set, the age
   * clock is paused, paused duration is excluded from age escalation
   * so a ticket sat on a client signoff doesn't go red unfairly. */
  waiting_on?: "client" | "internal";
  /** ISO timestamp when the current pause began. Cleared on resume. */
  paused_at?: string;
  /** Cumulative paused-millis across all pause cycles, so age = elapsed
   * - paused_total_ms - (paused_at ? now - paused_at : 0). */
  paused_total_ms?: number;
  /** Deliverable type for core_deliverable tasks (PDP, Homepage, etc.). */
  deliverable_type?: PageType;
  /** Points for the whole deliverable, covers design + dev together,
   * not counted twice. Both halves of a paired deliverable carry the
   * same `points` value for display, but capacity-wise it's one number. */
  points?: number;
  /** Other half of a design+dev deliverable pair, design task points to
   * its dev counterpart, and vice versa. */
  paired_task_id?: string;
  /** Conversion Engine cycle position. Engagements run as 3 monthly
   * cycles of W1 strategy → W2 design → W3 build → W4 test/prep. Tasks
   * created outside that flow leave this undefined. */
  cycle?: { month: 1 | 2 | 3; week: 1 | 2 | 3 | 4 };
  /** Set when a stale-ticket Slack ping has been fired for this task.
   * Stops the same ticket from re-pinging on every page load, a
   * ticket that's been open for a week shouldn't generate seven
   * notifications. Cleared if the ticket is resolved (status=done) or
   * paused. */
  stale_pinged_at?: string;
  /** Conversion test outcome for Build tasks shipped as variant tests
   * (typically M2/M3 of a Conversion Engine cycle). Captures whether
   * the test moved the metric and by how much, so retainer renewals
   * have hard data instead of vibes. Only set after the test has run
   *, pending = "shipped, waiting for results"; winner/loser =
   * statistically meaningful in either direction; inconclusive = no
   * meaningful difference. */
  test_result?: {
    status: "pending" | "winner" | "loser" | "inconclusive";
    /** Lift in % vs control. Negative = control won. May be undefined
     * for `pending` and `inconclusive`. */
    lift_pct?: number;
    /** Significance / confidence level (e.g. 95). Not required, but
     * sets the bar for the share-card visual. */
    significance_pct?: number;
    /** Free-text designer/Dan note, what changed, what the hypothesis
     * was, what we'd try next. Surfaces under the result chip on the
     * task row. */
    notes?: string;
    /** ISO timestamp of when the result was last set, used for
     * sort-order on retro pages and share-card "as of" line. */
    recorded_at?: string;
  };
}

/** Phase label derived from the cycle week, used for the
 * `M{n} · W{n} · {phase}` chip on Conversion Engine tasks. */
export const CYCLE_WEEK_LABEL: Record<1 | 2 | 3 | 4, string> = {
  1: "Strategy",
  2: "Design",
  3: "Build",
  4: "Test",
};

export const TASK_PHASE_LABEL: Record<TaskPhase, string> = {
  onboarding: "Onboarding",
  research: "Research",
  wireframe: "Wireframe",
  design: "Design",
  "internal-design-qa": "Internal design QA",
  "external-design-review": "External design review",
  "design-revision": "Design revision",
  development: "Development",
  "development-qa": "Development QA",
  "external-dev-review": "External dev review",
  "dev-revision": "Dev revision",
  launch: "Launch",
};

/** Order tasks should progress through. */
export const TASK_PHASE_ORDER: TaskPhase[] = [
  "onboarding",
  "research",
  "wireframe",
  "design",
  "internal-design-qa",
  "external-design-review",
  "design-revision",
  "development",
  "development-qa",
  "external-dev-review",
  "dev-revision",
  "launch",
];

export const TASK_DISCIPLINE_LABEL: Record<TaskDiscipline, string> = {
  strategy: "Strategy",
  design: "Design",
  development: "Dev",
};

export interface Project {
  id: string;
  name: string;
  client_id: string;
  pod_id: string;
  bucket: Bucket;
  points: number;
  pages: ProjectPage[];
  kickoff_date: string; // YYYY-MM-DD, must be Monday
  delivery_date: string; // YYYY-MM-DD, must be Thursday
  is_rush: boolean;
  status: ProjectStatus;
  slip_reason?: SlipReason;
  /** Link back to the source onboarding submission so the design/dev team
   * can pull brief context (USPs, tone, brand assets, etc.) without
   * leaving the pod board. */
  onboarding_id?: string;
}

// ─── Constants from the operating system ─────────────────────────

export const PAGE_WEIGHT_POINTS: Record<PageWeight, number> = {
  heavy: 3,
  medium: 2,
  light: 1,
};

// Default weight for each page type, used to autofill in the intake form.
// Heavy = strategic conversion surface. Medium = standard. Light = utility.
export const PAGE_DEFAULT_WEIGHT: Record<PageType, PageWeight> = {
  pdp: "heavy",
  homepage: "heavy",
  quiz: "heavy",
  advertorial: "heavy",
  listicle: "medium",
  collection: "medium",
  cart: "medium",
  about: "light",
  faq: "light",
  policies: "light",
  navigation: "light",
  account: "light",
  contact: "light",
};

export const PAGE_LABEL: Record<PageType, string> = {
  pdp: "PDP",
  homepage: "Homepage",
  quiz: "Quiz",
  advertorial: "Advertorial",
  listicle: "Listicle",
  collection: "Collection",
  cart: "Cart",
  about: "About",
  faq: "FAQ",
  policies: "Policies",
  navigation: "Navigation",
  account: "Account",
  contact: "Contact",
};

export const RETAINER_VALUE_GBP: Record<RetainerTier, number> = {
  none: 0,
  "8k": 8000,
  "12k": 12000,
};

// Bucket boundaries are inclusive on the upper end.
export const BUCKET_DURATIONS: Record<Bucket, number | null> = {
  A: 10, // calendar days, kickoff Mon → delivery Thu
  B: 15,
  C: 20,
  Bespoke: null,
};

export const ROLE_LABEL: Record<PodMemberRole, string> = {
  cro_lead: "CRO lead",
  primary_designer: "Primary designer",
  secondary_designer: "Secondary designer",
  primary_dev: "Primary dev",
  secondary_dev: "Secondary dev",
};

// Tasks owned by primary pod members.
export const PRIMARY_TASK_TYPES: TaskType[] = ["core_deliverable"];
// Tasks owned by secondary pod members.
export const SECONDARY_TASK_TYPES: TaskType[] = [
  "revision",
  "bug",
  "desktop_fix",
  "asset_prep",
  "library",
];

// Per-page base GBP value (for revenue rollup). Rough internal rate cards.
export const PAGE_VALUE_GBP: Record<PageWeight, number> = {
  heavy: 4000,
  medium: 2500,
  light: 1200,
};

// ─── Strategist: tests + hypotheses (spec §1.8, §4.1) ─────────────
// Powers the Strategist Dashboard's Tests-in-Flight panel and the
// Hypothesis Library. NOT a standalone Test Management Module (see
// DECISIONS.md #1): this is the data the strategist reads and calls,
// per the §1.8 calling rules, with no system cap on live tests
// (locked decision #5).

/** Full test state machine (§1.8). No system-imposed cap on how many
 * sit in `live` at once — strategist judgement (locked #5). */
export type TestStatus =
  | "setup"
  | "live"
  | "analysing"
  | "won"
  | "lost"
  | "inconclusive"
  | "archived";

/** A success-metric guardrail (e.g. RPV, bounce) and its current read
 * (§1.8 step 4). A breach drives the "stop & revert" calling rule. */
export interface TestGuardrail {
  name: string;
  status: "ok" | "breach";
}

/** Variant configuration shape (§1.8 step 2). */
export type TestVariant = "A/B" | "Split URL" | "Multivariate";

/** Testing is standardised on Intelligems + Visually, strategist picks
 * per engagement (§1.8 tooling / locked #8). */
export type TestTool = "Intelligems" | "Visually";

export interface PodTest {
  id: string;
  name: string;
  client_id: string;
  pod_id: string;
  /** Optional link to the hypothesis this test validates. */
  hypothesis_id?: string;
  /** Short-form hypothesis statement (§1.8 step 1). */
  hypothesis: string;
  status: TestStatus;
  /** Statistical confidence 0-100; null while in setup. */
  confidence: number | null;
  /** Days the test has been live. */
  days_running: number;
  /** Minimum runtime target before a call can be made (§1.8 step 5). */
  min_runtime_days: number;
  /** Primary success metric, e.g. "ATC rate" (§1.8 step 4). */
  primary_metric: string;
  guardrails: TestGuardrail[];
  variant: TestVariant;
  /** Traffic allocation, e.g. "50/50", "90/10" (§1.8 step 3). */
  traffic: string;
  tool: TestTool;
  /** Progress to sample-size target, 0-100 (§1.8 step 5). */
  sample_target_pct: number;
  /** Lift vs control in %, set once called. Negative = control won. */
  lift_pct?: number;
  created_at: string;
  updated_at: string;
}

/** Outcome of a hypothesis once tested (§4.1 Hypothesis Library). */
export type HypothesisOutcome =
  | "untested"
  | "testing"
  | "won"
  | "lost"
  | "inconclusive";

export interface PodHypothesis {
  id: string;
  statement: string;
  /** Searchable tags, e.g. ["pdp", "scarcity"] (§4.1 search by tag). */
  tags: string[];
  client_id?: string;
  outcome: HypothesisOutcome;
  /** Link to the test that validated/refuted it. */
  linked_test_id?: string;
  /** Short result summary, e.g. "+11.4% CVR, 96% conf". */
  result_note?: string;
  created_at: string;
  updated_at: string;
}

export const TEST_STATUS_LABEL: Record<TestStatus, string> = {
  setup: "Setup",
  live: "Live",
  analysing: "Analysing",
  won: "Won",
  lost: "Lost",
  inconclusive: "Inconclusive",
  archived: "Archived",
};

export const HYPOTHESIS_OUTCOME_LABEL: Record<HypothesisOutcome, string> = {
  untested: "Untested",
  testing: "Testing",
  won: "Won",
  lost: "Lost",
  inconclusive: "Inconclusive",
};
