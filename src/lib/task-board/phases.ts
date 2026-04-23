export type Phase =
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

export interface PhaseEntry {
  phase: Phase;
  enteredAt: string;
}

export const PHASE_OPTIONS: { value: Phase; label: string; color: string; bg: string }[] = [
  { value: "onboarding",              label: "Onboarding",             color: "#6B7280", bg: "#F3F4F6" },
  { value: "research",                label: "Research",               color: "#0891B2", bg: "#ECFEFF" },
  { value: "design",                  label: "Design",                 color: "#7C3AED", bg: "#F5F3FF" },
  { value: "internal-design-qa",      label: "Internal Design QA",     color: "#9333EA", bg: "#FAF5FF" },
  { value: "external-design-review",  label: "External Design Review", color: "#DB2777", bg: "#FDF2F8" },
  { value: "design-revision",         label: "Design Revision",        color: "#EA580C", bg: "#FFF7ED" },
  { value: "development",             label: "Development",            color: "#059669", bg: "#ECFDF5" },
  { value: "development-qa",          label: "Development QA",         color: "#047857", bg: "#F0FDF4" },
  { value: "external-dev-review",     label: "External Dev Review",    color: "#DC2626", bg: "#FEF2F2" },
  { value: "dev-revision",            label: "Dev Revision",           color: "#D97706", bg: "#FFFBEB" },
  { value: "launch",                  label: "Launch",                 color: "#1A1A1A", bg: "#F5F5F7" },
];

const PHASE_META = new Map(PHASE_OPTIONS.map((p) => [p.value, p]));

export function phaseMeta(phase: string | undefined) {
  if (!phase) return null;
  return PHASE_META.get(phase as Phase) ?? null;
}

export function formatTimeInPhase(enteredAt: string, now: Date = new Date()): string {
  const entered = new Date(enteredAt);
  const ms = now.getTime() - entered.getTime();
  if (ms < 0) return "just now";

  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) {
    const remMins = mins % 60;
    return remMins ? `${hrs}h ${remMins}m` : `${hrs}h`;
  }

  const days = Math.floor(hrs / 24);
  const remHrs = hrs % 24;
  return remHrs ? `${days}d ${remHrs}h` : `${days}d`;
}

export function currentPhaseEnteredAt(history: PhaseEntry[] | undefined): string | null {
  if (!history || history.length === 0) return null;
  return history[history.length - 1].enteredAt;
}

export interface PhaseGroup<T> {
  key: string; // "not-started" or a Phase value
  label: string;
  color: string;
  bg: string;
  tasks: T[];
}

// Groups tasks by phase in canonical order. Tasks with no phase get a
// "Not started" bucket pinned to the top. Empty phase buckets are omitted.
export function groupTasksByPhase<T extends { phase?: string }>(tasks: T[]): PhaseGroup<T>[] {
  const buckets = new Map<string, T[]>();
  for (const t of tasks) {
    const key = t.phase && PHASE_META.has(t.phase as Phase) ? t.phase : "not-started";
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(t);
  }

  const groups: PhaseGroup<T>[] = [];
  const notStarted = buckets.get("not-started");
  if (notStarted && notStarted.length) {
    groups.push({
      key: "not-started",
      label: "Not started",
      color: "#777",
      bg: "#F3F3F5",
      tasks: notStarted,
    });
  }
  for (const p of PHASE_OPTIONS) {
    const b = buckets.get(p.value);
    if (b && b.length) {
      groups.push({ key: p.value, label: p.label, color: p.color, bg: p.bg, tasks: b });
    }
  }
  return groups;
}

// Maps each phase to the deadline field that applies to it. "not-started" and
// design-side phases check designDueDate; dev-side phases check devDueDate;
// launch checks launchDueDate.
export type DeadlineField = "designDueDate" | "devDueDate" | "launchDueDate";

const PHASE_TO_DEADLINE: Record<Phase, DeadlineField> = {
  "onboarding": "designDueDate",
  "research": "designDueDate",
  "design": "designDueDate",
  "internal-design-qa": "designDueDate",
  "external-design-review": "designDueDate",
  "design-revision": "designDueDate",
  "development": "devDueDate",
  "development-qa": "devDueDate",
  "external-dev-review": "devDueDate",
  "dev-revision": "devDueDate",
  "launch": "launchDueDate",
};

export function deadlineFieldForPhase(phase: string | undefined): DeadlineField {
  if (!phase || !PHASE_TO_DEADLINE[phase as Phase]) return "designDueDate";
  return PHASE_TO_DEADLINE[phase as Phase];
}

export interface TaskWithDeadlines {
  phase?: string;
  designDueDate?: string;
  devDueDate?: string;
  launchDueDate?: string;
}

// Returns the deadline that applies to the task's current phase.
export function relevantDeadline(task: TaskWithDeadlines): { field: DeadlineField; value: string | undefined } {
  const field = deadlineFieldForPhase(task.phase);
  return { field, value: task[field] };
}

export type Urgency = "overdue" | "due-soon" | "ok";

export function computeUrgency(deadline: string | undefined, now: Date = new Date()): Urgency | null {
  if (!deadline) return null;
  const d = new Date(deadline + "T23:59:59");
  const diffMs = d.getTime() - now.getTime();
  const diffDays = diffMs / 86_400_000;
  if (diffDays < 0) return "overdue";
  if (diffDays < 3) return "due-soon";
  return "ok";
}

export function formatDeadline(deadline: string | undefined, now: Date = new Date()): string {
  if (!deadline) return "—";
  const d = new Date(deadline + "T23:59:59");
  const diffDays = Math.ceil((d.getTime() - now.getTime()) / 86_400_000);
  const date = new Date(deadline + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  if (diffDays < 0) return `${date} · ${Math.abs(diffDays)}d overdue`;
  if (diffDays === 0) return `${date} · today`;
  if (diffDays === 1) return `${date} · tomorrow`;
  return `${date} · ${diffDays}d`;
}

export interface PhaseSpan extends PhaseEntry {
  exitedAt: string | null;
  durationMs: number;
  isCurrent: boolean;
}

// Turns a phaseHistory array into chronological spans with computed durations.
// The final entry is the current phase (exitedAt=null, duration from entered → now).
export function computePhaseSpans(history: PhaseEntry[] | undefined, now: Date = new Date()): PhaseSpan[] {
  if (!history || history.length === 0) return [];
  return history.map((entry, i) => {
    const exitedAt = i < history.length - 1 ? history[i + 1].enteredAt : null;
    const end = exitedAt ? new Date(exitedAt).getTime() : now.getTime();
    const durationMs = Math.max(0, end - new Date(entry.enteredAt).getTime());
    return { ...entry, exitedAt, durationMs, isCurrent: exitedAt === null };
  });
}

export function formatDurationMs(ms: number): string {
  if (ms < 60_000) return "just now";
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) {
    const rem = mins % 60;
    return rem ? `${hrs}h ${rem}m` : `${hrs}h`;
  }
  const days = Math.floor(hrs / 24);
  const remHrs = hrs % 24;
  return remHrs ? `${days}d ${remHrs}h` : `${days}d`;
}

// ── Assignee auto-computation ────────────────────────────────────────────────
// Assignee is derived from the current phase, not stored on the task. When the
// phase changes, the person on the hook updates automatically.

export const RESEARCH_ASSIGNEE = "Dan";

export type PhaseCategory = "research" | "design" | "dev";

// Canonical mapping of phase → who owns it (category-level).
const PHASE_TO_CATEGORY: Record<Phase, PhaseCategory> = {
  "onboarding": "design",
  "research": "research",
  "design": "design",
  "internal-design-qa": "design",
  "external-design-review": "design",
  "design-revision": "design",
  "development": "dev",
  "development-qa": "dev",
  "external-dev-review": "dev",
  "dev-revision": "dev",
  "launch": "dev",
};

// Returns the category for a phase, or null if unknown/unset.
export function categoryForPhase(phase: string | undefined): PhaseCategory | null {
  if (!phase) return null;
  return PHASE_TO_CATEGORY[phase as Phase] ?? null;
}

export interface TaskWithAssignees {
  phase?: string;
  designer?: string;
  developer?: string;
}

// Returns the name currently on the hook for this task based on its phase.
// Research always goes to Dan regardless of task assignments.
export function computeAssignee(task: TaskWithAssignees): string {
  const cat = categoryForPhase(task.phase);
  if (cat === "research") return RESEARCH_ASSIGNEE;
  if (cat === "dev") return task.developer ?? "";
  // "design" or null (no phase yet) — default to designer
  return task.designer ?? "";
}

// Tests whether a task matches a top-level filter tab. Tasks without a phase
// fall back to their lane so a fresh design-lane task appears under Design.
export function matchesCategoryFilter(
  task: TaskWithAssignees,
  filter: "all" | PhaseCategory,
  lane: "design" | "dev",
): boolean {
  if (filter === "all") return true;
  const cat = categoryForPhase(task.phase);
  if (cat) return cat === filter;
  // No phase yet — use lane as fallback (designTasks → "design", devTasks → "dev")
  if (filter === "research") return false; // Research requires explicit phase
  return (lane === "design" && filter === "design") || (lane === "dev" && filter === "dev");
}

// ── Client/project grouping ──────────────────────────────────────────────────

export interface ClientGroup<T> {
  key: string; // client name, or "__unassigned__"
  label: string;
  tasks: T[];
}

// Groups deliverables by their parent client so the project context is always
// visible. Tasks with no client bucket into "No client" at the top; remaining
// clients come back in alphabetical order.
export function groupTasksByClient<T extends { client?: string }>(tasks: T[]): ClientGroup<T>[] {
  const buckets = new Map<string, T[]>();
  for (const t of tasks) {
    const key = t.client?.trim() || "__unassigned__";
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(t);
  }
  const groups: ClientGroup<T>[] = [];
  const unassigned = buckets.get("__unassigned__");
  if (unassigned?.length) {
    groups.push({ key: "__unassigned__", label: "No client", tasks: unassigned });
  }
  const sortedNames = [...buckets.keys()]
    .filter((k) => k !== "__unassigned__")
    .sort((a, b) => a.localeCompare(b));
  for (const name of sortedNames) {
    groups.push({ key: name, label: name, tasks: buckets.get(name)! });
  }
  return groups;
}

export function appendPhaseTransition<T extends { phase?: string; phaseHistory?: PhaseEntry[] }>(
  task: T,
  nextPhase: string,
): T {
  if (!nextPhase) {
    return { ...task, phase: "" as unknown as T["phase"] };
  }
  const history = task.phaseHistory ?? [];
  const last = history[history.length - 1];
  if (last && last.phase === nextPhase) {
    return { ...task, phase: nextPhase as T["phase"] };
  }
  return {
    ...task,
    phase: nextPhase as T["phase"],
    phaseHistory: [...history, { phase: nextPhase as Phase, enteredAt: new Date().toISOString() }],
  };
}
