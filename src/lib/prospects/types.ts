/* ── Saved Prospect Types ── */

export type OutreachStatus = "not_contacted" | "contacted" | "replied";

export interface SavedProspect {
  id: string;
  brand_name: string;
  url: string;
  emails: string[];
  social_links: { platform: string; url: string }[];
  revenue_score: number;
  apps: string[];
  niche: string;
  outreach_status: OutreachStatus;
  notes: string;
  product_count: number;
  price_range: { min: number; max: number } | null;
  has_reviews: boolean;
  has_subscriptions: boolean;
  has_bnpl: boolean;
  created_at: string;
}

export interface SavedProspectInsert {
  brand_name: string;
  url: string;
  emails: string[];
  social_links: { platform: string; url: string }[];
  revenue_score: number;
  apps: string[];
  niche: string;
  outreach_status?: OutreachStatus;
  notes?: string;
  product_count: number;
  price_range: { min: number; max: number } | null;
  has_reviews: boolean;
  has_subscriptions: boolean;
  has_bnpl: boolean;
}
