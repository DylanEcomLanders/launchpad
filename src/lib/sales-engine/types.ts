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
export type LeadStatus = "new" | "audit_sent" | "engaged" | "call_booked" | "proposal_sent" | "won" | "lost";

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
  audit_id?: string; // linked CRO audit
  audit_token?: string; // for quick link to audit
  created_at: string;
  updated_at: string;
}

export const LEAD_STATUSES: { key: LeadStatus; label: string; color: string }[] = [
  { key: "new", label: "New Lead", color: "#94A3B8" },
  { key: "audit_sent", label: "Audit Sent", color: "#3B82F6" },
  { key: "engaged", label: "Engaged", color: "#8B5CF6" },
  { key: "call_booked", label: "Call Booked", color: "#F59E0B" },
  { key: "proposal_sent", label: "Proposal Sent", color: "#F97316" },
  { key: "won", label: "Won", color: "#10B981" },
  { key: "lost", label: "Lost", color: "#EF4444" },
];
