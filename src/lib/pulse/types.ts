// ── Active Projects ─────────────────────────────────────────────

export type ProjectHealth = "green" | "amber" | "red";

export interface ActiveProject {
  id: string;
  project_name: string;
  client_name: string;
  health: ProjectHealth;
  team_lead: string;
  next_milestone: string;
  deadline: string; // ISO date "YYYY-MM-DD"
  created_at: string;
  updated_at: string;
}

export type ActiveProjectInsert = Omit<ActiveProject, "id" | "created_at" | "updated_at">;

// ── Pulse Feed ──────────────────────────────────────────────────

export type FeedItemType = "client" | "internal" | "status" | "chase" | "blocker" | "request";

export interface PulseFeedItem {
  id: string;
  timestamp: string;
  channel_name: string;
  channel_type: FeedItemType;
  author: string;
  message: string;
  permalink: string;
}

export interface PulseFeedResponse {
  items: PulseFeedItem[];
  total: number;
  has_more: boolean;
  fetched_at: string;
}
