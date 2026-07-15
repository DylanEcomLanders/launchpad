/* ── KPI / Delivery Dashboard config ──
 *
 * Every threshold the dashboard depends on lives here. Source data is the live
 * Project Delivery board (the same data /kanban renders, via useKanbanData).
 */

/** Today as ISO yyyy-mm-dd (UTC) — the "now" for every metric. The board is
 *  live, so this tracks the real date. Computed once at module load (stable
 *  within a session; same value SSR + client, so no hydration mismatch). */
export const KPI_NOW: string = new Date().toISOString().slice(0, 10);

/** Delivered/live phases — single source in the phase model. */
export { DELIVERED_PHASES } from "@/lib/projects/preview-phases";

/** On-time-rate colour bands (percent). */
export const RATE_GOOD = 85;
export const RATE_WARN = 60;

/** Days-late colour bands for the overdue list. */
export const LATE_WARN_DAYS = 3;
export const LATE_BAD_DAYS = 7;

/** Weeks shown in the on-time trend. */
export const TREND_WEEKS = 10;

/** Canonical pod order for the comparison table; extras appended A-Z. */
export const POD_ORDER = ["Pod 1", "Pod 2", "Pod 3"] as const;

export const UNASSIGNED_POD_LABEL = "Unassigned pod";
