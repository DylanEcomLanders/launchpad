// ─── Pods v2 — operating-system data model ─────────────────────────
// Per spec: three pods, each four-person (primary + secondary designer/dev).
// Strict weekly cadence, points → bucket → duration auto-calculation.

export type PodMemberRole =
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
}

export interface PodBlocker {
  id: string;
  title: string;
  description?: string;
  /** Member id of who's owning the resolution. Optional — blockers can
   * be raised without an owner. */
  owner_id?: string;
  raised_at: string; // ISO
  raised_by?: string; // free-text identifier (name/email)
  resolved_at?: string; // ISO when resolved
  resolved_by?: string;
}

export type RetainerTier = "none" | "8k" | "12k";

export interface Client {
  id: string;
  name: string;
  pod_id: string;
  brand_warm: boolean;
  retainer_tier: RetainerTier;
  /** Optional link to the launchpad client portal slug. */
  portal_slug?: string;
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
export type TaskDiscipline = "design" | "development";

/**
 * Phase a core_deliverable task is sitting in. Mirrors the task-board phase
 * set so the operating system reads consistently across surfaces.
 * Tickets (revisions, bugs, etc.) leave this undefined.
 */
export type TaskPhase =
  | "onboarding"
  | "research"
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
  /** When the task was created — drives "open Xd" age display on tickets. */
  created_at: string; // ISO timestamp
  /** Optional phase for core deliverables; tickets leave this undefined. */
  phase?: TaskPhase;
  /** Priority — mainly used for tickets where reaction time matters. */
  priority?: TaskPriority;
  /** Pause state for tickets: who we're waiting on. While set, the age
   * clock is paused — paused duration is excluded from age escalation
   * so a ticket sat on a client signoff doesn't go red unfairly. */
  waiting_on?: "client" | "internal";
  /** ISO timestamp when the current pause began. Cleared on resume. */
  paused_at?: string;
  /** Cumulative paused-millis across all pause cycles, so age = elapsed
   * - paused_total_ms - (paused_at ? now - paused_at : 0). */
  paused_total_ms?: number;
  /** Deliverable type for core_deliverable tasks (PDP, Homepage, etc.). */
  deliverable_type?: PageType;
  /** Points for the whole deliverable — covers design + dev together,
   * not counted twice. Both halves of a paired deliverable carry the
   * same `points` value for display, but capacity-wise it's one number. */
  points?: number;
  /** Other half of a design+dev deliverable pair — design task points to
   * its dev counterpart, and vice versa. */
  paired_task_id?: string;
}

export const TASK_PHASE_LABEL: Record<TaskPhase, string> = {
  onboarding: "Onboarding",
  research: "Research",
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

// Default weight for each page type — used to autofill in the intake form.
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
