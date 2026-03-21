/* ── Sales Engine Types ── */

export type AccountOwner = "dylan" | "ajay";
export type SocialPlatform = "tiktok" | "instagram";

/* ── Accounts ── */
export interface SocialAccount {
  owner: AccountOwner;
  platform: SocialPlatform;
  handle: string;
  label: string;
}

export const ACCOUNTS: SocialAccount[] = [
  { owner: "dylan", platform: "tiktok", handle: "dylandoesecom", label: "Dylan (TikTok)" },
  { owner: "dylan", platform: "instagram", handle: "ecomlanders", label: "Dylan (Instagram)" },
  // Add more as needed
];

/* ── Snapshots (profile metrics over time) ── */
export interface SocialSnapshot {
  id: string;
  account_id: AccountOwner;
  platform: SocialPlatform;
  username: string;
  followers: number;
  following: number;
  posts_count: number;
  engagement_rate: number;
  profile_pic: string;
  bio: string;
  scraped_at: string;
}

/* ── Posts ── */
export interface SocialPost {
  id: string;
  account_id: AccountOwner;
  platform: SocialPlatform;
  caption: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  engagement_rate: number;
  posted_at: string;
  url: string;
  post_type: string;
  hashtags: string[];
  hook: string; // first line of caption
  scraped_at: string;
}

/* ── Leads ── */
export type LeadStatus = "new" | "contacted" | "interested" | "not_interested";

export interface Lead {
  id: string;
  brand_name: string;
  contact_name: string;
  contact_email: string;
  status: LeadStatus;
  source: string;
  notes: string;
  follow_up_date?: string;
  store_url?: string;
  created_at: string;
  updated_at: string;
}

export const LEAD_STATUSES: { key: LeadStatus; label: string; color: string }[] = [
  { key: "new", label: "New", color: "#3B82F6" },
  { key: "contacted", label: "Contacted", color: "#F59E0B" },
  { key: "interested", label: "Interested", color: "#10B981" },
  { key: "not_interested", label: "Not Interested", color: "#AAA" },
];
