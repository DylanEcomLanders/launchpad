/* ── KPI / Delivery Dashboard config ──
 *
 * Every threshold the dashboard depends on lives here. Source data is the
 * Project Delivery model (src/lib/projects) — no ClickUp, no Supabase.
 */

import { MOCK_TODAY } from "@/lib/projects/preview-phases";

/** "Now" for every metric. While Project Delivery is the fixed-date prototype,
 *  this is MOCK_TODAY so the numbers always look fresh. Swap to a real
 *  `new Date()` when Project Delivery is wired to live data. */
export const KPI_NOW: string = MOCK_TODAY;

/** Phase that marks a deliverable as delivered/live. Reaching it (an entry in
 *  phaseHistory) = delivered; the entry date is the delivery date. */
export const DELIVERED_PHASE = "launch-testing";

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
