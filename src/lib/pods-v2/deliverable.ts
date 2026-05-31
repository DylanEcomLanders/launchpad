// ─── Operator-first Deliverable model (launchpad-build-brief) ─────
// The unified Deliverable IS the pods-v2 Task (person-owned, phased,
// pointed, due-dated, parented to a Project→Client). This module is the
// thin "lens" layer: the brief's 5-state status DERIVED from existing
// Task fields, resource-as-gates, and the risk level that powers My Work
// + Risk/Triage. No new store — pure functions over Task + Client.
//
// Approved approach: extend Task in place (AskUserQuestion, this session).

import type { Task, Client, TaskDiscipline, TaskPhase } from "./types";

// ── The brief's 5 operator statuses ───────────────────────────────
export type DeliverableStatus =
  | "not_started"
  | "in_progress"
  | "in_review"
  | "shipped"
  | "blocked_client"
  | "blocked_resource";

export const DELIVERABLE_STATUS_LABEL: Record<DeliverableStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  in_review: "In review",
  shipped: "Shipped",
  blocked_client: "Blocked · waiting on client",
  blocked_resource: "Blocked · missing resource",
};

/** A blocked deliverable is "off your plate" — it never counts as a red
 * strike against the owner (the slip isn't on them). */
export function isBlocked(s: DeliverableStatus): boolean {
  return s === "blocked_client" || s === "blocked_resource";
}

// ── Resources-as-gates ────────────────────────────────────────────
// Asset categories (from engagement-template ASSET_CATEGORIES) that a
// deliverable needs to EXIST before it can start its phase. Per-discipline
// defaults; an explicit Task.resource_deps overrides. A deliverable whose
// deps aren't present on the client reads "Blocked — missing resource".

export const DEFAULT_RESOURCE_DEPS: Record<TaskDiscipline, string[]> = {
  // Can't design without the audit findings + a Figma space to build in.
  design: ["figma", "audit"],
  // Strategy/CRO needs the audit + analytics baseline to brief from.
  strategy: ["audit", "analytics"],
  // Dev builds off the approved Figma into a staging/preview environment.
  development: ["figma", "preview"],
};

/** Required asset-category ids for a deliverable. Explicit deps win; else
 * fall back to the per-discipline default. */
export function resourceDepsFor(task: Task): string[] {
  if (task.resource_deps && task.resource_deps.length > 0) return task.resource_deps;
  return DEFAULT_RESOURCE_DEPS[task.discipline] ?? [];
}

/** Which required resources are missing for this deliverable, given the
 * client's resource-availability map. Empty array = all gates satisfied.
 *
 * Gate semantics: the gate only fires once an engagement is actually
 * TRACKING resources (client.resources is defined). "Untracked" is not the
 * same as "confirmed missing" — blocking every deliverable on a client
 * nobody has set resources for yet would bury the due-date prioritisation
 * that is My Work's whole point. The onboarding / resource-setup step seeds
 * an explicit resources map (categories present=false) so new engagements
 * gate from day one; existing untracked clients fall through to due-date
 * risk until someone starts tracking. */
export function missingResources(task: Task, client: Client | null): string[] {
  if (!client?.resources) return []; // resources not tracked yet → no gate
  const deps = resourceDepsFor(task);
  if (deps.length === 0) return [];
  return deps.filter((dep) => !client.resources![dep]);
}

// ── Derived status ────────────────────────────────────────────────
// Order matters: blocks first (off-plate), then review, shipped, active.
// "in_review" is read from the phase the deliverable sits in; the brief's
// "blocked-waiting-on-client" maps to Task.waiting_on; "blocked-missing-
// resource" is the new gate. Everything else maps from Task.status.

const REVIEW_PHASES: TaskPhase[] = ["external-design-review", "external-dev-review"];

export function deliverableStatus(task: Task, client: Client | null): DeliverableStatus {
  if (task.status === "done") return "shipped";
  if (task.waiting_on === "client") return "blocked_client";
  // Resource gate only applies to work not yet shipped and not already in
  // a client-side wait — a missing audit shouldn't re-block a shipped page.
  if (missingResources(task, client).length > 0) return "blocked_resource";
  if (task.phase && REVIEW_PHASES.includes(task.phase)) return "in_review";
  if (task.status === "in_progress") return "in_progress";
  return "not_started";
}

// ── Risk level (powers My Work ordering + Risk/Triage) ────────────
// Brief's rules:
//   Red   = due ≤2 days and not in final phase, OR can't make the date
//           (overdue) — the slip is real and imminent.
//   Amber = due ≤4 days and behind phase.
//   Green = on track.
// Blocked + shipped are their own buckets (off the red/amber/green track).

export type RiskLevel = "red" | "amber" | "green" | "blocked" | "shipped";

export const RISK_RANK: Record<RiskLevel, number> = {
  red: 0,
  amber: 1,
  green: 2,
  blocked: 3,
  shipped: 4,
};

/** Whole days from today (YYYY-MM-DD) to a due date (YYYY-MM-DD). */
export function daysUntil(dueYMD: string, todayYMD: string): number {
  const a = Date.parse(`${todayYMD}T00:00:00Z`);
  const b = Date.parse(`${dueYMD}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

// ── 1-day deadline padding (internal sits a working day before client) ──
// Decision (this session): the stored Task.due_date is the CLIENT-facing
// ship date. The team's INTERNAL target is one working day earlier — which
// lands on the Wednesday before a Thursday ship, matching the Wed 3pm review
// gate. All risk/at-risk math runs against the internal date, so there's
// always a day of buffer before the client ever sees a slip.

/** The working day immediately before `ymd` (skips Sat/Sun). */
export function previousWorkingDay(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return d.toISOString().slice(0, 10);
}

/** Client-facing ship date for a deliverable (the stored due_date). */
export function clientDue(task: Task): string {
  return task.due_date;
}

/** Internal target = client date − 1 working day. What the team works to and
 * what at-risk is measured against. */
export function internalDue(task: Task): string {
  return previousWorkingDay(task.due_date);
}

/** "Final phase" = the deliverable is in launch or a review gate; being a
 * couple of days out there is fine, whereas being a couple of days out in
 * early design is red. */
const FINAL_PHASES: TaskPhase[] = ["launch", "external-dev-review"];

export function riskLevel(
  task: Task,
  client: Client | null,
  todayYMD: string,
): RiskLevel {
  const status = deliverableStatus(task, client);
  if (status === "shipped") return "shipped";
  if (isBlocked(status)) return "blocked";

  // Measured against the INTERNAL target (client date − 1 working day) so
  // the buffer is real: we read "at risk" a day before the client would.
  const d = daysUntil(internalDue(task), todayYMD);
  const inFinalPhase = task.phase ? FINAL_PHASES.includes(task.phase) : false;

  if (d < 0) return "red"; // past internal target — eating into client buffer
  if (d <= 2 && !inFinalPhase) return "red";
  if (d <= 4) return "amber";
  return "green";
}

/** One-line "why" for a deliverable's risk — drives the My Work / Risk
 * subtitles so the operator knows the reason without opening anything. */
export function riskReason(
  task: Task,
  client: Client | null,
  todayYMD: string,
): string {
  const status = deliverableStatus(task, client);
  if (status === "blocked_resource") {
    const miss = missingResources(task, client);
    return `Waiting on ${miss.join(" + ")}`;
  }
  if (status === "blocked_client") return "Waiting on client";
  if (status === "shipped") return "Shipped";
  // Against the internal target — so "overdue" means we're into the client
  // buffer, not that the client deadline has passed.
  const d = daysUntil(internalDue(task), todayYMD);
  if (d < 0) return `${Math.abs(d)}d behind internal`;
  if (d === 0) return "Internal due today";
  if (d === 1) return "Internal due tomorrow";
  return `Internal in ${d}d`;
}
