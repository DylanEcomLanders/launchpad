// ── Roadmap / Assembly Line types ──────────────────────────────────────────────
//
// Conversion Engine portals use a team-led roadmap. Each RoadmapItem flows
// through stages in a clean list view: Backlog → Next Up → In Progress → Shipped.

export type RoadmapStage = "backlog" | "next-up" | "in-progress" | "shipped";

export type RoadmapPriority = "high" | "medium" | "low";

export type AssetType = "test" | "page" | "upsell" | "other";

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  test: "Test",
  page: "Page",
  upsell: "Upsell",
  other: "Other",
};

export interface RoadmapItem {
  id: string;
  portal_id: string;

  title: string;
  description: string;
  impact_hypothesis: string; // "We believe X will lift CVR by Y%" — optional, for retainer value

  stage: RoadmapStage;
  priority: RoadmapPriority;
  asset_type?: AssetType;

  // Target month (YYYY-MM) — lets the visual roadmap place items across 60-90 days.
  target_month: string;

  // Display order within a stage — lower = higher up the list. 0 for unset.
  sort_index: number;

  // Work artefacts, surfaced as they exist.
  figma_url: string;
  staging_url: string;
  live_url: string;

  // Outcome (after shipped) — short string like "+3.2% CVR".
  outcome: string;

  started_at: string | null;
  shipped_at: string | null;

  created_at: string;
  updated_at: string;
}

export type RoadmapItemInsert = Omit<RoadmapItem, "id" | "created_at" | "updated_at">;
export type RoadmapItemPatch = Partial<Omit<RoadmapItem, "id" | "portal_id" | "created_at" | "updated_at">>;
