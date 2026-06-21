/* ── Test wins data layer ── */

import { createStore } from "@/lib/supabase-store";
import type { AbTest } from "@/lib/tests/types";
import type { TestWin } from "./types";

export const testWinsStore = createStore<TestWin>({
  table: "test_wins",
  lsKey: "launchpad-test-wins",
});

export function uid(): string {
  return Math.random().toString(36).slice(2, 12);
}
export function nowISO(): string {
  return new Date().toISOString();
}

/* Build a test_win from a winning AbTest. */
export function fromTest(t: AbTest): TestWin {
  return {
    id: uid(),
    source_test_id: t.id,
    client_name: t.client_name,
    surface: t.surface,
    hero_metric: t.primary_metric || "Conversion rate",
    uplift_pct: t.uplift_pct,
    baseline_value: t.baseline_value,
    variant_value: t.variant_value,
    hypothesis: t.hypothesis_line,
    story_body: t.write_up || "",
    status: "captured",
    captured_at: nowISO(),
    created_at: nowISO(),
    updated_at: nowISO(),
  };
}
