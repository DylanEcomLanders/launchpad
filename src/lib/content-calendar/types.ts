/* ── Content Calendar — types ──
 * Personal social pipeline (Twitter + LinkedIn) with editable
 * pillars, kanban pipeline, calendar grid, and pillar balance.
 *
 * Schema mirrors supabase/migrations/014_create_content_calendar_v2.sql.
 */

export type Platform = "twitter" | "linkedin";

export type PostStatus =
  | "idea"
  | "drafting"
  | "drafted"
  | "scheduled"
  | "posted"
  | "archived";

export type MediaType = "image" | "video" | "screenshot";

export interface PostMedia {
  id: string;
  file_url: string;
  file_type: MediaType;
  thumbnail_url?: string;
  file_size?: number;
  alt_text?: string;
  /* Display ordering inside the post. Lower first. */
  sort_order: number;
}

export interface ContentPillar {
  id: string;
  name: string;
  /* Stable identifier for code references (e.g. dashboard widgets). */
  slug: string;
  color_hex: string;
  description?: string;
  target_weekly_posts: number;
  sort_order: number;
}

export interface ContentPost {
  id: string;
  pillar_id: string | null;
  status: PostStatus;
  platforms: Platform[];
  twitter_copy: string;
  linkedin_copy: string;
  /* ISO datetime string. Null until scheduled. */
  scheduled_for: string | null;
  posted_at: string | null;
  twitter_url: string | null;
  linkedin_url: string | null;
  /* Manual entry for now — Twitter/LinkedIn API pull is out of scope. */
  impressions: number | null;
  engagement: number | null;
  notes: string;
  is_evergreen: boolean;
  media: PostMedia[];
  created_at: string;
  updated_at: string;
}

/* Per-platform character ceilings the drawer enforces. */
export const PLATFORM_LIMITS: Record<Platform, number> = {
  twitter: 280,
  linkedin: 3000,
};

export const PLATFORM_LABELS: Record<Platform, string> = {
  twitter: "Twitter",
  linkedin: "LinkedIn",
};

/* Status → label + colour. Kanban columns and badges read these. */
export const STATUS_META: Record<
  PostStatus,
  { label: string; color: string; bg: string }
> = {
  idea: { label: "Idea", color: "#6B7280", bg: "#F3F4F6" },
  drafting: { label: "Drafting", color: "#D97706", bg: "#FEF3C7" },
  drafted: { label: "Drafted", color: "#2563EB", bg: "#DBEAFE" },
  scheduled: { label: "Scheduled", color: "#7C3AED", bg: "#EDE9FE" },
  posted: { label: "Posted", color: "#059669", bg: "#D1FAE5" },
  archived: { label: "Archived", color: "#9CA3AF", bg: "#F3F4F6" },
};

/* Order shown in the kanban left → right. Archived is hidden by
 * default in the pipeline view (filter chip exposes it). */
export const PIPELINE_COLUMNS: PostStatus[] = [
  "idea",
  "drafting",
  "drafted",
  "scheduled",
  "posted",
];

export const ALL_PLATFORMS: Platform[] = ["twitter", "linkedin"];
