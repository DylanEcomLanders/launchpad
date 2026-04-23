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
