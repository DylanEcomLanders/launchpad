/* ── Weekly Loop Helpers ── */

import type { WeeklyDeliverable } from "./types";

/** Get the Monday of the current week as YYYY-MM-DD */
export function getCurrentWeekStart(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? -6 : 1 - day; // Adjust to Monday
  const monday = new Date(now);
  monday.setDate(monday.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split("T")[0];
}

/** Format a week start date as "W14 — 31 Mar" */
export function getWeekLabel(weekStart: string): string {
  const d = new Date(weekStart + "T00:00:00");
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const daysDiff = Math.floor((d.getTime() - startOfYear.getTime()) / 86400000);
  const weekNum = Math.ceil((daysDiff + startOfYear.getDay() + 1) / 7);
  const dateStr = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `W${weekNum} — ${dateStr}`;
}

/** Ensure the current week has an entry. Returns new array if added. */
export function ensureCurrentWeek(deliverables: WeeklyDeliverable[]): WeeklyDeliverable[] {
  const currentWeek = getCurrentWeekStart();
  if (deliverables.some((d) => d.weekStart === currentWeek)) {
    return deliverables;
  }
  return [{ weekStart: currentWeek }, ...deliverables];
}

/** Is mission statement due? (Monday + not yet uploaded) */
export function isMissionStatementDue(deliverable: WeeklyDeliverable): boolean {
  const today = new Date().getDay(); // 0=Sun, 1=Mon...
  return today === 1 && !deliverable.missionStatement;
}

/** Is weekly report due? (Friday + not yet uploaded) */
export function isWeeklyReportDue(deliverable: WeeklyDeliverable): boolean {
  const today = new Date().getDay();
  return today === 5 && !deliverable.weeklyReport;
}
