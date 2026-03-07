import type { Playbook, PlaybookProgress } from "./types";

// ── Helpers ──────────────────────────────────────────────────────

export function getPlaybooksByCategory(pbs: Playbook[]) {
  const cats: Record<string, Playbook[]> = {};
  for (const pb of pbs) {
    if (!cats[pb.category]) cats[pb.category] = [];
    cats[pb.category].push(pb);
  }
  return cats;
}

export function getCompletionPercent(pb: Playbook, progress?: PlaybookProgress): number {
  if (!progress) return 0;
  return Math.round((progress.completedSteps.length / pb.steps.length) * 100);
}
