/* ── Roadmap types ──
 *
 * One roadmap per client. Items live in the items array; sorted by
 * ICE (Impact × Confidence × Ease) within each horizon.
 */

export type RoadmapHorizon = 30 | 60 | 90;
export type RoadmapItemType = "page" | "test" | "other";
export type RoadmapItemStatus = "planned" | "in_progress" | "done" | "skipped";

export interface RoadmapItem {
  id: string;
  title: string;
  type: RoadmapItemType;
  horizon: RoadmapHorizon;

  /* ICE 1-10 each, score = I × C × E (range 1-1000). */
  impact: number;
  confidence: number;
  ease: number;

  status: RoadmapItemStatus;
  hypothesis?: string;     // markdown
  notes?: string;          // markdown
  owner_role?: string;     // strategist / designer / dev
  order: number;
}

export interface Roadmap {
  id: string;
  client_id?: string;      // links to kanban_clients later
  client_name: string;
  strategist: string;
  /* Quarter the roadmap is for - free-form ("Q3 2026", "Aug-Oct"). */
  quarter_label: string;
  items: RoadmapItem[];
  created_at: string;
  updated_at: string;
}

export const HORIZON_LABEL: Record<RoadmapHorizon, string> = {
  30: "First 30 days",
  60: "Day 30 - 60",
  90: "Day 60 - 90",
};

export const HORIZONS: RoadmapHorizon[] = [30, 60, 90];

export const ITEM_TYPE_LABEL: Record<RoadmapItemType, string> = {
  page: "Page build",
  test: "Test",
  other: "Other",
};

export const ITEM_TYPE_TINT: Record<RoadmapItemType, string> = {
  page: "bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-500/30",
  test: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30",
  other: "bg-zinc-500/15 text-zinc-200 ring-1 ring-zinc-500/30",
};

export const STATUS_LABEL: Record<RoadmapItemStatus, string> = {
  planned: "Planned",
  in_progress: "In progress",
  done: "Done",
  skipped: "Skipped",
};

export const STATUS_TINT: Record<RoadmapItemStatus, string> = {
  planned: "bg-[#222222] text-[#9CA3AF]",
  in_progress: "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30",
  done: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30",
  skipped: "bg-rose-500/15 text-rose-200 ring-1 ring-rose-500/30",
};
