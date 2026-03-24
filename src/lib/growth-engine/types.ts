/* ── Growth Engine Types ── */

export type GrowthChannel = "twitter" | "linkedin" | "tiktok" | "instagram" | "email" | "paid-media" | "outbound";
export type GrowthStage = "content" | "capture" | "nurture" | "convert";
export type GrowthItemStatus = "gap" | "planned" | "in-progress" | "live";
export type TrafficWarmth = "cold" | "warm" | "hot";

export type GrowthItemType =
  | "content-piece"
  | "lead-magnet"
  | "landing-page"
  | "email-sequence"
  | "dm-trigger"
  | "ad-campaign"
  | "outbound-campaign"
  | "sales-call"
  | "retargeting"
  | "whatsapp"
  | "other";

export interface GrowthItemMetrics {
  impressions?: number;
  clicks?: number;
  leads?: number;
  conversions?: number;
  revenue?: number;
}

export interface GrowthItem {
  id: string;
  channel: GrowthChannel;
  stage: GrowthStage;
  label: string;
  description: string;
  itemType: GrowthItemType;
  status: GrowthItemStatus;
  warmth: TrafficWarmth;
  url?: string;
  metrics?: GrowthItemMetrics;
  notes?: string;
}

export interface GrowthEngineData {
  id: string;
  name: string;
  channels: GrowthChannel[];
  items: GrowthItem[];
  channelFlows: Record<string, { nodes: unknown[]; edges: unknown[] }>;
  created_at: string;
  updated_at: string;
}
