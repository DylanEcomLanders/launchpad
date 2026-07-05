/* ── KPI / Delivery Dashboard types ──
 *
 * The dashboard reports off the Project Delivery data (the /kanban deliverable
 * model in src/lib/projects). It does NOT use ClickUp. A DeliveryItem is a
 * flattened, KPI-ready view of one deliverable; see src/lib/kpi/source.ts.
 */

/** Period the dashboard reports over. */
export type KpiPeriod = "week" | "month" | "quarter";

/** Flattened deliverable, KPI-ready. Built from MockClient → MockProject →
 *  MockDeliverable in source.ts. All dates are ISO yyyy-mm-dd (Europe/London),
 *  matching the Project Delivery model. */
export interface DeliveryItem {
  id: string;
  title: string;
  category?: string;

  clientId: string;
  clientName: string;
  projectId: string;
  projectName: string;

  /** Pod name (resolved from the project's podId), or null if unassigned. */
  pod: string | null;
  /** Primary owner who carries the deliverable to launch (developer, else
   *  designer). Used for the per-member table. */
  owner: string | null;

  /** Current phase in the Project Delivery flow. */
  phase: string;
  /** Target delivery date. */
  dueDate: string | null;

  /** True once the deliverable has reached Launch & Testing (delivered/live). */
  isDelivered: boolean;
  /** Date it entered Launch & Testing (the delivery date). Null if not yet. */
  deliveredAt: string | null;
  /** Date it first entered any phase (turnaround anchor). */
  startedAt: string | null;

  /** Live test url / clickthrough, when present. */
  url: string | null;
}

export interface KpiSummary {
  /** delivered-on-time / (on-time + late) for deliverables delivered in the
   *  period, 0-100. null when none delivered in period had a due date. */
  onTimeRate: number | null;
  onTimeCount: number;
  lateCount: number;
  /** Deliverables delivered (reached Launch & Testing) in the period. */
  delivered: number;
  /** Open deliverables past their due date right now (point-in-time). */
  currentlyOverdue: number;
  /** Avg (deliveredAt − startedAt) in days for deliverables delivered in
   *  period. null when none. */
  avgTurnaroundDays: number | null;
}

export interface OverdueRow {
  id: string;
  title: string;
  pod: string | null;
  owner: string | null;
  clientName: string;
  phase: string;
  dueDate: string;
  daysLate: number;
  url: string | null;
}

export interface BreakdownRow {
  key: string; // pod name or owner name
  delivered: number;
  onTimeRate: number | null;
  onTimeCount: number;
  lateCount: number;
  currentlyOverdue: number;
  avgTurnaroundDays: number | null;
}

export interface TrendPoint {
  weekStart: string; // ISO yyyy-mm-dd (Monday)
  label: string;
  onTimeRate: number | null;
  delivered: number;
  /** Avg (deliveredAt − startedAt) in days for items delivered that week. */
  avgTurnaround: number | null;
}
