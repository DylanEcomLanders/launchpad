/* ── Tests data layer ── */

import { createStore } from "@/lib/supabase-store";
import type { AbTest } from "./types";

export const testsStore = createStore<AbTest>({
  table: "ab_tests",
  lsKey: "launchpad-ab-tests",
});

export function uid(): string {
  return Math.random().toString(36).slice(2, 12);
}
export function nowISO(): string {
  return new Date().toISOString();
}

export function emptyTest(): AbTest {
  return {
    id: uid(),
    client_name: "",
    surface: "",
    hypothesis_line: "",
    primary_metric: "Conversion rate",
    control_desc: "",
    variant_desc: "",
    tool: "intelligems",
    traffic_split: "50/50",
    significance_target_pct: 95,
    status: "drafting",
    baseline_value: "",
    variant_value: "",
    write_up: "",
    learnings: "",
    created_at: nowISO(),
    updated_at: nowISO(),
  };
}

/* Days running since started_at (null if not live). */
export function daysRunning(t: AbTest): number | null {
  if (!t.started_at) return null;
  const end = t.ended_at ? new Date(t.ended_at).getTime() : Date.now();
  return Math.floor((end - new Date(t.started_at).getTime()) / 86_400_000);
}

/* Significance progress vs target as a 0-100 ratio for the progress bar. */
export function sigProgress(t: AbTest): number {
  if (!t.significance_reached_pct || !t.significance_target_pct) return 0;
  return Math.min(100, (t.significance_reached_pct / t.significance_target_pct) * 100);
}
