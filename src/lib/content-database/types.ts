/* ── Content Database Types ── */

export type ContentPlatform = "twitter" | "linkedin";

export type ContentCategory =
  | "case-study"
  | "insight"
  | "behind-the-scenes"
  | "hot-take"
  | "educational"
  | "promotional"
  | "thread"
  | "other";

export const contentPlatforms: { id: ContentPlatform; label: string }[] = [
  { id: "twitter", label: "Twitter / X" },
  { id: "linkedin", label: "LinkedIn" },
];

export const contentCategories: { id: ContentCategory; label: string }[] = [
  { id: "case-study", label: "Case Study" },
  { id: "insight", label: "Insight" },
  { id: "behind-the-scenes", label: "Behind the Scenes" },
  { id: "hot-take", label: "Hot Take" },
  { id: "educational", label: "Educational" },
  { id: "promotional", label: "Promotional" },
  { id: "thread", label: "Thread" },
  { id: "other", label: "Other" },
];

export interface ContentEntry {
  id: string;
  platform: ContentPlatform;
  category: ContentCategory;
  content: string;
  post_url: string;
  post_date: string;
  impressions: number;
  engagements: number;
  clicks: number;
  engagement_rate: number;
  is_winner: boolean;
  tags: string[];
  notes: string;
  created_at: string;
  updated_at: string;
}

export type ContentEntryInsert = Omit<
  ContentEntry,
  "id" | "engagement_rate" | "created_at" | "updated_at"
>;

/* ── Content Analytics Types ── */

export interface SyncedPost {
  id: string;
  accountId: string;
  platform: ContentPlatform;
  content: string;
  post_url: string;
  post_date: string;
  likes: number;
  retweets: number;
  replies: number;
  category: ContentCategory;
  totalEngagement: number;
}

export interface SyncError {
  platform: ContentPlatform;
  message: string;
}

export interface CachedAccountData {
  accountId: string;
  syncedAt: string;
  posts: SyncedPost[];
  syncErrors: SyncError[];
}

export interface AnalysisPattern {
  title: string;
  description: string;
  evidence: string;
  category: "format" | "topic" | "timing" | "engagement";
}

export interface ContentIdea {
  title: string;
  description: string;
  basedOn: string;
  platform: ContentPlatform | "both";
}

export interface ContentAnalysis {
  accountId: string;
  analyzedAt: string;
  totalPosts: number;
  platformBreakdown: { twitter: number; linkedin: number };
  topPerformers: SyncedPost[];
  patterns: AnalysisPattern[];
  contentIdeas: ContentIdea[];
  summary: string;
}
