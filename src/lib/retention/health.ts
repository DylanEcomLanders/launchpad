// Retention health scoring — transparent, rule-based, no ML.
//
// Health is a ROLLUP of five delivery/relationship pillars, each traceable:
//   On-time · Results · Rework · Cadence · Engagement
// Every threshold lives HERE as a named constant. All values are DEFAULTS
// AWAITING SIGN-OFF (flagged in the build summary). `health_override` always
// wins over the computed band.

import type { DealPlan } from "@/lib/sales-dashboard/types";
import type { HealthBand } from "./types";

// ── Config constants (AWAITING SIGN-OFF) ───────────────────────────────────

/** Committed CRO-test cadence per week, by plan. `custom` is absent — those
 *  clients SKIP the cadence pillar (no fixed commitment). */
export const COMMITTED_TESTS_PER_WEEK: Partial<Record<DealPlan, number>> = { core: 1, pro: 2 };
export const WEEKS_PER_MONTH = 4.33;

/** Engagement thresholds (days). */
export const REVIEW_STALE_WARN_DAYS = 21;
export const REVIEW_STALE_BAD_DAYS = 30;
export const CONTACT_STALE_WARN_DAYS = 14;

/** Renewal context (days) + the proof-of-value it expects. */
export const RENEWAL_NEAR_AMBER_DAYS = 30;
export const RENEWAL_NEAR_RED_DAYS = 14;
export const RESULTS_LOOKBACK_DAYS = 60;
export const RESULTS_MIN_FOR_RENEWAL = 2;

// ── Pillars ─────────────────────────────────────────────────────────────────

export type PillarKey = "ontime" | "results" | "rework" | "cadence" | "engagement";
export type PillarStatus = "good" | "warn" | "bad" | "na";

export interface Pillar {
  key: PillarKey;
  label: string;
  status: PillarStatus;
  detail: string;
}

/** Everything the pillars are scored from. Built by the data layer. */
export interface HealthInput {
  // delivery (kanban)
  active: number;
  late: number;
  reworkHeavy: number;
  reworkWarming: number;
  concludedTests: number;
  winningTests: number;
  losingTests: number;
  // cadence
  testsShipped: number | null; // null = skipped (custom)
  testsCommitted: number | null;
  // engagement
  daysSinceLastReview: number | null;
  daysSinceLastContact: number | null;
  // context
  daysToRenewal: number;
  resultsInLookback: number;
}

export interface HealthVerdict {
  band: HealthBand;
  reasons: string[];
  pillars: Pillar[];
  overridden: boolean;
}

export function committedTestsToDate(plan: DealPlan, dayOfMonth: number): number | null {
  const perWeek = COMMITTED_TESTS_PER_WEEK[plan];
  if (perWeek == null) return null;
  return perWeek * Math.max(1, Math.ceil(dayOfMonth / 7));
}

function ontimePillar(i: HealthInput): Pillar {
  if (i.active === 0) return { key: "ontime", label: "On-time", status: "na", detail: "No live deliverables" };
  if (i.late >= 2) return { key: "ontime", label: "On-time", status: "bad", detail: `${i.late} deliverables late` };
  if (i.late === 1) return { key: "ontime", label: "On-time", status: "warn", detail: "1 deliverable late" };
  return { key: "ontime", label: "On-time", status: "good", detail: "On schedule" };
}

function resultsPillar(i: HealthInput): Pillar {
  if (i.concludedTests === 0) return { key: "results", label: "Results", status: "na", detail: "No tests concluded yet" };
  if (i.winningTests === 0) return { key: "results", label: "Results", status: "bad", detail: `0 wins from ${i.concludedTests} tests` };
  if (i.winningTests >= i.losingTests) return { key: "results", label: "Results", status: "good", detail: `${i.winningTests} win(s) on record` };
  return { key: "results", label: "Results", status: "warn", detail: `${i.winningTests} win / ${i.losingTests} loss` };
}

function reworkPillar(i: HealthInput): Pillar {
  if (i.active === 0) return { key: "rework", label: "Rework", status: "na", detail: "No live deliverables" };
  if (i.reworkHeavy >= 1) return { key: "rework", label: "Rework", status: "bad", detail: `${i.reworkHeavy} stuck in revisions` };
  if (i.reworkWarming >= 1) return { key: "rework", label: "Rework", status: "warn", detail: `${i.reworkWarming} heating up on revisions` };
  return { key: "rework", label: "Rework", status: "good", detail: "Clean revision loops" };
}

function cadencePillar(i: HealthInput): Pillar {
  if (i.testsShipped == null || i.testsCommitted == null) {
    return { key: "cadence", label: "Cadence", status: "na", detail: "No fixed commitment" };
  }
  const lbl = `${i.testsShipped}/${i.testsCommitted} this month`;
  if (i.testsShipped >= i.testsCommitted) return { key: "cadence", label: "Cadence", status: "good", detail: lbl };
  if (i.testsShipped === 0) return { key: "cadence", label: "Cadence", status: "bad", detail: lbl };
  return { key: "cadence", label: "Cadence", status: "warn", detail: lbl };
}

function engagementPillar(i: HealthInput): Pillar {
  const r = i.daysSinceLastReview;
  const c = i.daysSinceLastContact;
  const reviewBad = r == null || r >= REVIEW_STALE_BAD_DAYS;
  const contactStale = c != null && c >= CONTACT_STALE_WARN_DAYS;
  if (reviewBad && contactStale) {
    return { key: "engagement", label: "Engagement", status: "bad", detail: `${c}d no contact, ${r == null ? "no" : r + "d no"} review` };
  }
  const reviewWarn = r == null || r >= REVIEW_STALE_WARN_DAYS;
  if (reviewWarn || contactStale) {
    return { key: "engagement", label: "Engagement", status: "warn", detail: r == null ? "No review on record" : `${r}d since review` };
  }
  return { key: "engagement", label: "Engagement", status: "good", detail: "In regular contact" };
}

export function computePillars(i: HealthInput): Pillar[] {
  return [ontimePillar(i), resultsPillar(i), reworkPillar(i), cadencePillar(i), engagementPillar(i)];
}

/** Roll the pillars + renewal context up into a single band, with reasons. */
export function rollup(pillars: Pillar[], i: HealthInput): { band: HealthBand; reasons: string[] } {
  const bad = pillars.filter((p) => p.status === "bad");
  const warn = pillars.filter((p) => p.status === "warn");
  const engagement = pillars.find((p) => p.key === "engagement");

  const reasons: string[] = [];
  const renewalNear = i.daysToRenewal >= 0 && i.daysToRenewal <= RENEWAL_NEAR_AMBER_DAYS;
  const renewalImminent = i.daysToRenewal >= 0 && i.daysToRenewal <= RENEWAL_NEAR_RED_DAYS;
  const thinProof = renewalNear && i.resultsInLookback < RESULTS_MIN_FOR_RENEWAL;

  // RED
  const redReasons: string[] = [];
  if (engagement?.status === "bad") redReasons.push(engagement.detail);
  if (bad.length >= 2) redReasons.push(`${bad.length} pillars critical`);
  if (bad.length >= 1 && renewalImminent) redReasons.push(`Renewal in ${i.daysToRenewal}d while at risk`);
  if (redReasons.length) return { band: "red", reasons: dedupe([...redReasons, ...bad.map((p) => `${p.label}: ${p.detail}`)]) };

  // AMBER
  const amberReasons: string[] = [];
  if (bad.length >= 1) amberReasons.push(...bad.map((p) => `${p.label}: ${p.detail}`));
  if (warn.length >= 2) amberReasons.push(...warn.map((p) => `${p.label}: ${p.detail}`));
  if (thinProof) amberReasons.push(`Renewal in ${i.daysToRenewal}d, only ${i.resultsInLookback} result(s) logged`);
  if (amberReasons.length) return { band: "amber", reasons: dedupe(amberReasons) };

  // GREEN
  reasons.push(warn.length === 1 ? `Watch: ${warn[0].label.toLowerCase()}` : "All pillars healthy");
  return { band: "green", reasons };
}

function dedupe(arr: string[]): string[] {
  return Array.from(new Set(arr));
}

export function resolveHealth(
  override: HealthBand | null | undefined,
  input: HealthInput,
): HealthVerdict {
  const pillars = computePillars(input);
  if (override) {
    return { band: override, reasons: ["Manually set"], pillars, overridden: true };
  }
  const { band, reasons } = rollup(pillars, input);
  return { band, reasons, pillars, overridden: false };
}
