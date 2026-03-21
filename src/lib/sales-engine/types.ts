/* ── Sales Engine Types ── */

export type DealStage = "lead" | "qualified" | "proposal" | "negotiation" | "won" | "lost";
export type DealOwner = "dylan" | "ajay";

export interface Deal {
  id: string;
  name: string;
  brand_name: string;
  contact_name: string;
  contact_email: string;
  stage: DealStage;
  value: number;
  currency: "GBP" | "USD" | "EUR";
  source: string;
  prospect_id?: string;
  notes: string;
  next_follow_up?: string; // ISO date
  owner: DealOwner;
  created_at: string;
  updated_at: string;
}

export type ContentPlatform = "twitter" | "linkedin" | "tiktok" | "instagram" | "youtube";
export type ContentStatus = "idea" | "drafted" | "scheduled" | "published";
export type FunnelStage = "tofu" | "mofu" | "bofu";

export interface ContentItem {
  id: string;
  title: string;
  body: string;
  platform: ContentPlatform;
  account_id: DealOwner;
  status: ContentStatus;
  scheduled_date?: string;
  published_url?: string;
  funnel_stage: FunnelStage;
  category: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export const DEAL_STAGES: { key: DealStage; label: string; color: string }[] = [
  { key: "lead", label: "Lead", color: "#AAA" },
  { key: "qualified", label: "Qualified", color: "#3B82F6" },
  { key: "proposal", label: "Proposal", color: "#8B5CF6" },
  { key: "negotiation", label: "Negotiation", color: "#F59E0B" },
  { key: "won", label: "Won", color: "#10B981" },
  { key: "lost", label: "Lost", color: "#EF4444" },
];
