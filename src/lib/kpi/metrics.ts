/* ── KPI / Delivery Dashboard metric computation ──
 *
 * Pure functions over DeliveryItem[] (built from Project Delivery in source.ts).
 *
 * Definitions:
 *   - Delivered: reached Launch & Testing. deliveredAt = the date it got there.
 *   - On time:  deliveredAt <= dueDate.   Late: deliveredAt > dueDate.
 *   - Overdue:  open AND past due AS OF the window's reference date.
 *               (current period → "now"; past periods → that period's close.)
 *   - On-time rate = on-time / (on-time + late) delivered in the window.
 *                    Items with no due date are excluded from the rate but
 *                    still counted in throughput (delivered).
 *   - Avg turnaround = avg(deliveredAt − startedAt) for items delivered in
 *                      the window.
 *
 * Every metric takes a `period` (week/month/quarter) and an `offset`
 * (0 = current, 1 = previous, 2 = two ago, …) so the dashboard can step back
 * through history. "now" is KPI_NOW (MOCK_TODAY while Project Delivery is the
 * fixed prototype).
 */

import {
  KPI_NOW,
  POD_ORDER,
  UNASSIGNED_POD_LABEL,
} from "./config";
import type {
  DeliveryItem,
  KpiPeriod,
  KpiSummary,
  OverdueRow,
  BreakdownRow,
  TrendPoint,
} from "./types";

const MS_PER_DAY = 86_400_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function dayMs(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso + "T00:00:00Z").getTime();
  return Number.isNaN(t) ? null : t;
}

function nowMs(): number {
  return dayMs(KPI_NOW)!;
}

/* ── Period window ───────────────────────────────────────────────────────── */

export interface PeriodWindow {
  /** Inclusive start of the period (epoch ms, UTC midnight). */
  startMs: number;
  /** Exclusive end — start of the next period. */
  nextStartMs: number;
  /** Reference date for "open/overdue" + delivery cutoff: the period's close,
   *  capped at now for the current period. */
  asOfMs: number;
  /** Human label, e.g. "May 2026", "Q2 2026", "Wk of 9 Jun". */
  label: string;
  /** True for offset 0 (the in-progress current period). */
  isCurrent: boolean;
}

function startOfPeriod(period: KpiPeriod, offset: number): Date {
  const d = new Date(KPI_NOW + "T00:00:00Z");
  if (period === "week") {
    const day = d.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setUTCDate(d.getUTCDate() + diff - offset * 7);
  } else if (period === "month") {
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() - offset);
  } else {
    const q = Math.floor(d.getUTCMonth() / 3) * 3;
    d.setUTCMonth(q, 1);
    d.setUTCMonth(d.getUTCMonth() - offset * 3);
  }
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function labelFor(period: KpiPeriod, start: Date): string {
  if (period === "week") {
    return `Wk of ${start.getUTCDate()} ${MONTHS[start.getUTCMonth()]}`;
  }
  if (period === "month") {
    return `${MONTHS[start.getUTCMonth()]} ${start.getUTCFullYear()}`;
  }
  const q = Math.floor(start.getUTCMonth() / 3) + 1;
  return `Q${q} ${start.getUTCFullYear()}`;
}

export function periodWindow(period: KpiPeriod, offset: number): PeriodWindow {
  const start = startOfPeriod(period, offset);
  const next = startOfPeriod(period, offset - 1); // one period later
  const startMs = start.getTime();
  const nextStartMs = next.getTime();
  const asOfMs = Math.min(nextStartMs - MS_PER_DAY, nowMs());
  return {
    startMs,
    nextStartMs,
    asOfMs,
    label: labelFor(period, start),
    isCurrent: offset === 0,
  };
}

function deliveredInWindow(d: DeliveryItem, w: PeriodWindow): boolean {
  if (!d.isDelivered) return false;
  const t = dayMs(d.deliveredAt);
  return t !== null && t >= w.startMs && t <= w.asOfMs;
}

/** Open (not delivered by the window's close) and past due as of that close. */
function isOverdueAsOf(d: DeliveryItem, w: PeriodWindow): boolean {
  const del = dayMs(d.deliveredAt);
  const deliveredByThen = d.isDelivered && del !== null && del <= w.asOfMs;
  if (deliveredByThen) return false;
  const due = dayMs(d.dueDate);
  return due !== null && due < w.asOfMs;
}

/* ── Summary ─────────────────────────────────────────────────────────────── */

export function computeSummary(
  items: DeliveryItem[],
  period: KpiPeriod,
  offset = 0,
): KpiSummary {
  const w = periodWindow(period, offset);

  let onTimeCount = 0;
  let lateCount = 0;
  let delivered = 0;
  let currentlyOverdue = 0;
  let turnaroundSum = 0;
  let turnaroundN = 0;

  for (const d of items) {
    if (isOverdueAsOf(d, w)) currentlyOverdue++;

    if (deliveredInWindow(d, w)) {
      delivered++;
      const del = dayMs(d.deliveredAt)!;
      const due = dayMs(d.dueDate);
      if (due !== null) {
        if (del <= due) onTimeCount++;
        else lateCount++;
      }
      const started = dayMs(d.startedAt);
      if (started !== null && del >= started) {
        turnaroundSum += (del - started) / MS_PER_DAY;
        turnaroundN++;
      }
    }
  }

  const rated = onTimeCount + lateCount;
  return {
    onTimeRate: rated > 0 ? Math.round((onTimeCount / rated) * 100) : null,
    onTimeCount,
    lateCount,
    delivered,
    currentlyOverdue,
    avgTurnaroundDays:
      turnaroundN > 0 ? Math.round((turnaroundSum / turnaroundN) * 10) / 10 : null,
  };
}

/* ── Overdue list (centrepiece) ──────────────────────────────────────────── */

export function computeOverdue(
  items: DeliveryItem[],
  period: KpiPeriod,
  offset = 0,
): OverdueRow[] {
  const w = periodWindow(period, offset);
  const rows: OverdueRow[] = [];
  for (const d of items) {
    if (!isOverdueAsOf(d, w)) continue;
    const due = dayMs(d.dueDate)!;
    rows.push({
      id: d.id,
      title: d.title,
      pod: d.pod,
      owner: d.owner,
      clientName: d.clientName,
      phase: d.phase,
      dueDate: d.dueDate!,
      daysLate: Math.floor((w.asOfMs - due) / MS_PER_DAY),
      url: d.url,
    });
  }
  return rows.sort((a, b) => b.daysLate - a.daysLate);
}

/* ── Breakdowns ──────────────────────────────────────────────────────────── */

function breakdownFor(
  items: DeliveryItem[],
  period: KpiPeriod,
  offset: number,
  keyOf: (d: DeliveryItem) => string | null,
): BreakdownRow[] {
  const map = new Map<string, DeliveryItem[]>();
  for (const d of items) {
    const k = keyOf(d);
    if (!k) continue;
    const arr = map.get(k) ?? [];
    arr.push(d);
    map.set(k, arr);
  }
  const rows: BreakdownRow[] = [];
  for (const [key, group] of map) {
    const s = computeSummary(group, period, offset);
    rows.push({
      key,
      delivered: s.delivered,
      onTimeRate: s.onTimeRate,
      onTimeCount: s.onTimeCount,
      lateCount: s.lateCount,
      currentlyOverdue: s.currentlyOverdue,
      avgTurnaroundDays: s.avgTurnaroundDays,
    });
  }
  return rows;
}

export function computePodBreakdown(
  items: DeliveryItem[],
  period: KpiPeriod,
  offset = 0,
): BreakdownRow[] {
  const rows = breakdownFor(items, period, offset, (d) => d.pod ?? UNASSIGNED_POD_LABEL);
  const order = (k: string) => {
    const i = (POD_ORDER as readonly string[]).indexOf(k);
    return i === -1 ? POD_ORDER.length : i;
  };
  return rows.sort(
    (a, b) => order(a.key) - order(b.key) || a.key.localeCompare(b.key),
  );
}

export function computeMemberBreakdown(
  items: DeliveryItem[],
  period: KpiPeriod,
  offset = 0,
): BreakdownRow[] {
  return breakdownFor(items, period, offset, (d) => d.owner).sort(
    (a, b) => b.delivered - a.delivered || a.key.localeCompare(b.key),
  );
}

/* ── On-time trend (last N ISO weeks, always ending now) ──────────────────── */

function mondayMs(end: number): number {
  const d = new Date(end);
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day));
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

export function computeTrend(items: DeliveryItem[], weeks: number): TrendPoint[] {
  const thisMonday = mondayMs(nowMs());
  const points: TrendPoint[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = thisMonday - i * 7 * MS_PER_DAY;
    const end = start + 7 * MS_PER_DAY;

    let onTime = 0;
    let late = 0;
    let delivered = 0;
    let turnSum = 0;
    let turnN = 0;
    for (const d of items) {
      if (!d.isDelivered) continue;
      const t = dayMs(d.deliveredAt);
      if (t === null || t < start || t >= end) continue;
      delivered++;
      const started = dayMs(d.startedAt);
      if (started !== null && t >= started) {
        turnSum += (t - started) / MS_PER_DAY;
        turnN++;
      }
      const due = dayMs(d.dueDate);
      if (due === null) continue;
      if (t <= due) onTime++;
      else late++;
    }
    const rated = onTime + late;
    const sd = new Date(start);
    points.push({
      weekStart: sd.toISOString().slice(0, 10),
      label: `${sd.getUTCDate()} ${MONTHS[sd.getUTCMonth()]}`,
      onTimeRate: rated > 0 ? Math.round((onTime / rated) * 100) : null,
      delivered,
      avgTurnaround: turnN > 0 ? Math.round((turnSum / turnN) * 10) / 10 : null,
    });
  }
  return points;
}
