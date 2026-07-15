/* ── Contractor scoring engine ──
 *
 * Implements the auto-derivation half of the contractor scheme doc.
 * Reads kanban_tasks (the new Supabase data layer) + already-known
 * Person info, produces a list of ScoringEntry rows that the PM can
 * accept as-is, edit, or extend with manual entries.
 *
 * What it CAN derive from data:
 *   - Late vs deadline: due_date vs phase_history entry into launch-testing
 *   - Zero revisions: count of internal-revisions + external-revisions in phase_history
 *   - Test wins: test_result.outcome === 'winner'
 *   - Live bugs: tasks in 'tickets' phase with category 'Bug' or 'Fire'
 *
 * What needs manual entry (no data signal exists):
 *   - Client renewals (retention dashboard could feed this later)
 *   - No-show / poor comms
 *   - Client complaints
 *
 * Caps applied at lock time, not during draft, so the PM can see why
 * the cap kicked in.
 */

import type { MockClient, MockDeliverable } from "@/lib/projects/mock-data";
import type { Person, ScoringEntry, ScoringPeriod } from "./types";
import { personByKanbanName } from "@/lib/people/resolver";
import { isDeliveredPhase } from "@/lib/projects/preview-phases";

/* Cap configuration from the contractor scheme doc. */
export const PER_PAGE_CAP_BONUS_PCT = 25;
export const PER_PAGE_CAP_DEDUCTION_PCT = 30;
export const RETAINER_CAP_BONUS_PCT = 33;
export const RETAINER_CAP_DEDUCTION_PCT = 30;
export const RETAINER_TEST_WIN_MONTHLY_CAP_PCT = 15;

/* Working-days calc kept minimal: weekends excluded, no UK bank
 * holidays (acceptable inaccuracy for a scoring suggestion the PM
 * will sanity-check anyway). Returns negative if due before delivered,
 * positive if delivered after due. */
function workingDaysBetween(from: string, to: string): number {
  const f = new Date(from + "T00:00:00Z");
  const t = new Date(to + "T00:00:00Z");
  if (t.getTime() < f.getTime()) return -workingDaysBetween(to, from);
  let count = 0;
  const d = new Date(f);
  while (d.getTime() < t.getTime()) {
    d.setUTCDate(d.getUTCDate() + 1);
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
}

function nowISO(): string {
  return new Date().toISOString();
}

/* PER-PAGE SCORING ────────────────────────────────────────────────
 * Score one kanban deliverable as if it were a per-page build. The
 * scheme has bonuses that STACK (early + zero revs + test win = +25%)
 * so we return all that apply. */
export function scoreDeliverableAsPerPage(
  deliverable: MockDeliverable,
  uid: () => string,
): ScoringEntry[] {
  const entries: ScoringEntry[] = [];
  /* Reaching launch-testing = delivered, ish. The phase_history entry
   * for launch-testing is when the build went live. */
  const launchEntry = (deliverable.phaseHistory || []).find(
    (e) => isDeliveredPhase(e.phase),
  );
  if (!launchEntry || !deliverable.dueDate) return entries;

  const lateness = workingDaysBetween(deliverable.dueDate, launchEntry.enteredAt);
  const revRounds = (deliverable.phaseHistory || []).filter(
    (e) => e.phase === "internal-revisions" || e.phase === "external-revisions",
  ).length;
  const hasQualityIssue = revRounds >= 3;

  /* Bonus: delivered early + clean (no rev rounds at all). */
  if (lateness < 0 && revRounds === 0) {
    entries.push({
      id: uid(),
      lever: "speed",
      label: `Delivered early - ${deliverable.title}`,
      delta_pct: 10,
      source: "auto_kanban",
      evidence_ref: deliverable.id,
      added_at: nowISO(),
    });
  }

  /* Bonus: zero revision rounds. */
  if (revRounds === 0) {
    entries.push({
      id: uid(),
      lever: "quality",
      label: `Approved first time - ${deliverable.title}`,
      delta_pct: 10,
      source: "auto_kanban",
      evidence_ref: deliverable.id,
      added_at: nowISO(),
    });
  }

  /* Bonus: test win. */
  if (deliverable.testResult?.outcome === "winner") {
    entries.push({
      id: uid(),
      lever: "quality",
      label: `Test won (+${deliverable.testResult.upliftPct ?? "?"}% ${deliverable.testResult.metric ?? "uplift"}) - ${deliverable.title}`,
      delta_pct: 5,
      source: "auto_kanban",
      evidence_ref: deliverable.id,
      added_at: nowISO(),
    });
  }

  /* Deductions. Late 1-2d = -5%, late 3+d = -15%. */
  if (lateness >= 3) {
    entries.push({
      id: uid(),
      lever: "speed",
      label: `Late by ${lateness} working days - ${deliverable.title}`,
      delta_pct: -15,
      source: "auto_kanban",
      evidence_ref: deliverable.id,
      added_at: nowISO(),
    });
  } else if (lateness >= 1) {
    entries.push({
      id: uid(),
      lever: "speed",
      label: `Late by ${lateness} working day${lateness === 1 ? "" : "s"} - ${deliverable.title}`,
      delta_pct: -5,
      source: "auto_kanban",
      evidence_ref: deliverable.id,
      added_at: nowISO(),
    });
  }

  /* 3+ revision rounds. Only counted as quality issue not also late. */
  if (hasQualityIssue) {
    entries.push({
      id: uid(),
      lever: "quality",
      label: `${revRounds} revision rounds - ${deliverable.title}`,
      delta_pct: -10,
      source: "auto_kanban",
      evidence_ref: deliverable.id,
      added_at: nowISO(),
    });
  }

  return entries;
}

/* RETAINER SCORING ────────────────────────────────────────────────
 * Score one month for a retainer contractor. The PM picks the month;
 * we walk every kanban task they touched in that window and roll up
 * speed + quality + (eventually) retention signals. */
export function scoreMonthAsRetainer(
  person: Person,
  clients: MockClient[],
  monthKey: string, // YYYY-MM
  uid: () => string,
): ScoringEntry[] {
  const entries: ScoringEntry[] = [];

  const tasksThisMonth: MockDeliverable[] = [];
  const people = [person];
  for (const c of clients) {
    for (const p of c.projects) {
      for (const d of p.deliverables) {
        /* Belongs to this person if their canonical Person record
         * resolves from the kanban assignee name. Check all four
         * assignment fields. */
        const candidates = [
          d.designer,
          d.secondaryDesigner,
          d.developer,
          d.secondaryDeveloper,
        ];
        const matchesPerson = candidates.some(
          (n) => personByKanbanName(n, people)?.id === person.id,
        );
        if (!matchesPerson) continue;
        const launch = (d.phaseHistory || []).find(
          (e) => isDeliveredPhase(e.phase),
        );
        if (!launch) continue;
        const launchMonth = launch.enteredAt.slice(0, 7);
        if (launchMonth !== monthKey) continue;
        tasksThisMonth.push(d);
      }
    }
  }

  if (tasksThisMonth.length === 0) {
    /* No deliveries this month. No auto bonus; PM can still add
     * manual entries for renewal / comms / etc. */
    return entries;
  }

  /* Bonus: all monthly deliveries on time (no late entries detected). */
  const anyLate = tasksThisMonth.some((d) => {
    if (!d.dueDate) return false;
    const launch = (d.phaseHistory || []).find(
      (e) => isDeliveredPhase(e.phase),
    );
    return launch ? workingDaysBetween(d.dueDate, launch.enteredAt) >= 1 : false;
  });
  if (!anyLate) {
    entries.push({
      id: uid(),
      lever: "speed",
      label: `All ${tasksThisMonth.length} deliveries on time`,
      delta_pct: 8,
      source: "auto_kanban",
      added_at: nowISO(),
    });
  } else {
    entries.push({
      id: uid(),
      lever: "speed",
      label: "Cadence slipped (one or more late deliveries)",
      delta_pct: -10,
      source: "auto_kanban",
      added_at: nowISO(),
    });
  }

  /* Bonus: each test win, capped at +15%. */
  const wins = tasksThisMonth.filter(
    (d) => d.testResult?.outcome === "winner",
  );
  const winBonus = Math.min(wins.length * 5, RETAINER_TEST_WIN_MONTHLY_CAP_PCT);
  if (winBonus > 0) {
    entries.push({
      id: uid(),
      lever: "quality",
      label: `${wins.length} test win${wins.length === 1 ? "" : "s"} (capped at +15%)`,
      delta_pct: winBonus,
      source: "auto_kanban",
      added_at: nowISO(),
    });
  }

  /* Deduction: repeated rework (>2 tasks with 3+ rev rounds). */
  const reworkCount = tasksThisMonth.filter((d) => {
    const r = (d.phaseHistory || []).filter(
      (e) =>
        e.phase === "internal-revisions" || e.phase === "external-revisions",
    ).length;
    return r >= 3;
  }).length;
  if (reworkCount >= 2) {
    entries.push({
      id: uid(),
      lever: "quality",
      label: `${reworkCount} tasks needed 3+ revision rounds`,
      delta_pct: -10,
      source: "auto_kanban",
      added_at: nowISO(),
    });
  }

  return entries;
}

/* APPLY CAPS AT LOCK TIME ────────────────────────────────────────
 * Sum entries, then cap bonus + deduction independently so the doc's
 * "max +25/-30 per build, +33/-30 per month" reads correctly. */
export function applyCaps(
  entries: ScoringEntry[],
  scheme: "per_page" | "retainer",
): number {
  const total = entries.reduce((s, e) => s + e.delta_pct, 0);
  const capBonus =
    scheme === "per_page" ? PER_PAGE_CAP_BONUS_PCT : RETAINER_CAP_BONUS_PCT;
  const capDeduction =
    scheme === "per_page"
      ? PER_PAGE_CAP_DEDUCTION_PCT
      : RETAINER_CAP_DEDUCTION_PCT;
  if (total > capBonus) return capBonus;
  if (total < -capDeduction) return -capDeduction;
  return total;
}

/* For the display: split entries into bonus + deduction subtotals so
 * the breakdown reads cleanly. */
export function subtotals(entries: ScoringEntry[]): {
  bonus: number;
  deduction: number;
  net: number;
} {
  let bonus = 0,
    deduction = 0;
  for (const e of entries) {
    if (e.delta_pct > 0) bonus += e.delta_pct;
    else deduction += e.delta_pct;
  }
  return { bonus, deduction, net: bonus + deduction };
}

/* Build a draft ScoringPeriod from auto signals. Caller passes uid +
 * the current date; we return a draft the PM can edit. */
export function draftPeriodForDeliverable(
  deliverable: MockDeliverable,
  uid: () => string,
): ScoringPeriod {
  const entries = scoreDeliverableAsPerPage(deliverable, uid);
  return {
    id: uid(),
    period_key: deliverable.id,
    scheme: "per_page",
    entries,
    status: "draft",
    created_at: nowISO(),
    updated_at: nowISO(),
  };
}

export function draftPeriodForMonth(
  person: Person,
  clients: MockClient[],
  monthKey: string,
  uid: () => string,
): ScoringPeriod {
  const entries = scoreMonthAsRetainer(person, clients, monthKey, uid);
  return {
    id: uid(),
    period_key: monthKey,
    scheme: "retainer",
    entries,
    status: "draft",
    created_at: nowISO(),
    updated_at: nowISO(),
  };
}
