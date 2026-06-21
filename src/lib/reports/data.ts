/* ── Reports data layer + generator ── */

import { createStore } from "@/lib/supabase-store";
import type { AbTest } from "@/lib/tests/types";
import type { Roadmap } from "@/lib/roadmaps/types";
import { iceScore } from "@/lib/roadmaps/data";
import type {
  Report,
  ReportPageSummary,
  ReportPeriod,
  ReportTestSummary,
} from "./types";

export const reportsStore = createStore<Report>({
  table: "reports",
  lsKey: "launchpad-reports",
});

export function uid(): string {
  return Math.random().toString(36).slice(2, 12);
}
export function nowISO(): string {
  return new Date().toISOString();
}
export function slugify(input: string): string {
  const base = input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  return base || `report-${uid().slice(0, 6)}`;
}

/* Compute period bounds for the period containing `ref`. */
export function periodBounds(period: ReportPeriod, ref = new Date()): { start: Date; end: Date; label: string } {
  if (period === "weekly") {
    /* Week starts Monday. End at Sunday end-of-day. */
    const d = new Date(ref);
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    const start = new Date(d);
    start.setDate(d.getDate() + diff);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    const label = `Week of ${start.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`;
    return { start, end, label };
  }
  /* Monthly. */
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
  const label = ref.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  return { start, end, label };
}

/* Build a fresh report for a client + period. Auto-fills the
 * computed parts; strategist edits headline + narrative + can
 * tweak the summaries. */
export function generateReport(
  clientName: string,
  period: ReportPeriod,
  tests: AbTest[],
  roadmaps: Roadmap[],
): Report {
  const bounds = periodBounds(period);
  const inPeriod = (iso?: string) => {
    if (!iso) return false;
    const t = new Date(iso).getTime();
    return t >= bounds.start.getTime() && t <= bounds.end.getTime();
  };

  const periodTests = tests.filter((t) => {
    if (t.client_name !== clientName) return false;
    /* Include: live tests (any), or anything concluded in period. */
    if (t.status === "live") return true;
    return inPeriod(t.ended_at);
  });

  const testSummaries: ReportTestSummary[] = periodTests.map((t) => ({
    test_id: t.id,
    hypothesis: t.hypothesis_line,
    status: t.status,
    outcome: t.outcome,
    uplift_pct: t.uplift_pct,
    surface: t.surface,
  }));

  const concluded = periodTests.filter((t) => t.outcome);
  const tests_won = concluded.filter((t) => t.outcome === "winner").length;
  const tests_lost = concluded.filter((t) => t.outcome === "loser").length;
  const tests_inconclusive = concluded.filter((t) => t.outcome === "inconclusive").length;

  const pageItems: ReportPageSummary[] = [];
  for (const r of roadmaps) {
    if (r.client_name !== clientName) continue;
    /* No per-item done timestamp yet; using roadmap.updated_at
     * as a proxy. Strategist can trim before sending. */
    if (!inPeriod(r.updated_at)) continue;
    for (const item of r.items) {
      if (item.type === "page" && item.status === "done") {
        pageItems.push({
          title: item.title,
          type: item.type,
          horizon: item.horizon,
          ice_score: iceScore(item),
        });
      }
    }
  }

  const id = uid();
  return {
    id,
    client_name: clientName,
    period,
    period_label: bounds.label,
    period_start: bounds.start.toISOString(),
    period_end: bounds.end.toISOString(),
    status: "draft",
    prepared_by: "",
    headline: "",
    narrative: "",
    tests: testSummaries,
    pages: pageItems,
    tests_run: periodTests.length,
    tests_won,
    tests_lost,
    tests_inconclusive,
    pages_shipped: pageItems.length,
    cr_movement: "",
    output_slug: id,
    created_at: nowISO(),
    updated_at: nowISO(),
  };
}
