/* ── Content Calendar data layer ── */

import { createStore } from "@/lib/supabase-store";

// ── Types ──

export type Platform = "linkedin" | "instagram" | "x" | "tiktok";
export type ContentType = "educational" | "social_proof" | "personal" | "promotional";
export type PostStatus = "idea" | "scripted" | "media_ready" | "approved" | "exported";
export type PostFormat = "text" | "image" | "article" | "video";

export interface ContentPost {
  id: string;
  group_id?: string; // links repurposed variants together
  platform: Platform;
  content_type: ContentType;
  post_format: PostFormat;
  angle?: string; // the idea/hook — one punchy line
  caption: string; // the full written caption (generated from angle)
  status: PostStatus;
  scheduled_date: string; // ISO date
  scheduled_time: string; // HH:mm
  media_url?: string;
  media_data?: string; // base64 image data for preview
  analytics_score: number; // 0-100
  created_at: string;
  updated_at: string;
}

export interface ContentIdea {
  type: ContentType;
  platform: Platform;
  brief: string;
}

// ── Platform colours ──

export const platformColors: Record<Platform, string> = {
  linkedin: "#0A66C2",
  instagram: "#E1306C",
  x: "#777",
  tiktok: "#000000",
};

export const platformLabels: Record<Platform, string> = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  x: "X",
  tiktok: "TikTok",
};

// ── Content type colours ──

export const contentTypeColors: Record<ContentType, string> = {
  educational: "#2563EB",
  social_proof: "#8B5CF6",
  personal: "#F59E0B",
  promotional: "#EF4444",
};

export const contentTypeLabels: Record<ContentType, string> = {
  educational: "Educational",
  social_proof: "Social Proof",
  personal: "Personal",
  promotional: "Promotional",
};

// ── Post format labels ──

export const postFormatLabels: Record<PostFormat, string> = {
  text: "Text",
  image: "Image",
  article: "Article",
  video: "Video",
};

// ── Status colours & labels ──

export const statusColors: Record<PostStatus, string> = {
  idea: "#94A3B8",
  scripted: "#3B82F6",
  media_ready: "#8B5CF6",
  approved: "#10B981",
  exported: "#1B1B1B",
};

export const statusLabels: Record<PostStatus, string> = {
  idea: "Idea",
  scripted: "Scripted",
  media_ready: "Media Ready",
  approved: "Approved",
  exported: "Exported",
};

// ── Optimal posting times (mock analytics) ──

export interface SlotAnalytics {
  platform: Platform;
  day: number; // 0=Sun..6=Sat
  hour: number;
  score: number; // 0-100
}

export const optimalSlots: SlotAnalytics[] = [
  // LinkedIn: Tue/Thu 8am and 12pm peak
  { platform: "linkedin", day: 2, hour: 8, score: 95 },
  { platform: "linkedin", day: 2, hour: 12, score: 88 },
  { platform: "linkedin", day: 4, hour: 8, score: 92 },
  { platform: "linkedin", day: 4, hour: 12, score: 85 },
  { platform: "linkedin", day: 1, hour: 8, score: 70 },
  { platform: "linkedin", day: 3, hour: 8, score: 72 },
  { platform: "linkedin", day: 5, hour: 9, score: 65 },
  // Instagram: Mon/Wed 12pm and 7pm peak
  { platform: "instagram", day: 1, hour: 12, score: 93 },
  { platform: "instagram", day: 1, hour: 19, score: 90 },
  { platform: "instagram", day: 3, hour: 12, score: 91 },
  { platform: "instagram", day: 3, hour: 19, score: 87 },
  { platform: "instagram", day: 5, hour: 12, score: 68 },
  { platform: "instagram", day: 2, hour: 19, score: 65 },
  // X: any weekday 9am peak
  { platform: "x", day: 1, hour: 9, score: 88 },
  { platform: "x", day: 2, hour: 9, score: 90 },
  { platform: "x", day: 3, hour: 9, score: 87 },
  { platform: "x", day: 4, hour: 9, score: 89 },
  { platform: "x", day: 5, hour: 9, score: 85 },
  { platform: "x", day: 1, hour: 12, score: 60 },
  { platform: "x", day: 3, hour: 15, score: 55 },
];

// ── Helper: get slot score for a platform/day/hour ──

export function getSlotScore(platform: Platform, day: number, hour: number): number {
  const match = optimalSlots.find(s => s.platform === platform && s.day === day && s.hour === hour);
  return match?.score ?? 0;
}

export function isOptimalSlot(day: number, hour: number): boolean {
  return optimalSlots.some(s => s.day === day && s.hour === hour && s.score >= 80);
}

// ── Helper: get best times for platform on a specific day ──

export function getBestTimes(platform: Platform, day: number): { hour: number; score: number }[] {
  return optimalSlots
    .filter(s => s.platform === platform && s.day === day)
    .sort((a, b) => b.score - a.score);
}

// ── Helper: get overall best slots for platform (top 3) ──

export function getTopSlots(platform: Platform): { day: number; hour: number; score: number }[] {
  return optimalSlots
    .filter(s => s.platform === platform)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

// ── Helper: get best day for platform ──

export function getBestDay(platform: Platform): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const scores: Record<number, number> = {};
  optimalSlots.filter(s => s.platform === platform).forEach(s => {
    scores[s.day] = (scores[s.day] || 0) + s.score;
  });
  const best = Object.entries(scores).sort(([, a], [, b]) => b - a)[0];
  return best ? days[Number(best[0])] : "N/A";
}

// ── Data store ──

const store = createStore<ContentPost>({
  table: "content_calendar",
  lsKey: "se-content-calendar",
});

export async function getPosts(): Promise<ContentPost[]> {
  return store.getAll();
}

export async function savePosts(posts: ContentPost[]): Promise<void> {
  await store.saveAll(posts);
}

// ── Seed data (realistic mock posts) ──

function getMonday(): Date {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d.setDate(diff));
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function dateStr(base: Date, addDays: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + addDays);
  return d.toISOString().split("T")[0];
}

export function seedPosts(): ContentPost[] {
  const mon = getMonday();
  return [
    {
      id: "seed-1",
      platform: "linkedin",
      content_type: "educational",
      post_format: "text",
      caption: "Most brands test button colours. The ones scaling past 8 figures test their entire purchase flow. Here's the framework we use to prioritise what actually moves revenue.",
      status: "approved",
      scheduled_date: dateStr(mon, 1), // Tuesday
      scheduled_time: "08:00",
      analytics_score: 95,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "seed-2",
      platform: "instagram",
      content_type: "social_proof",
      post_format: "image",
      caption: "Before and after. Same product. Same traffic. Different landing page. 34% conversion lift in 21 days. The gallery did most of the heavy lifting.",
      status: "scripted",
      scheduled_date: dateStr(mon, 0), // Monday
      scheduled_time: "12:00",
      analytics_score: 93,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "seed-3",
      platform: "x",
      content_type: "personal",
      post_format: "text",
      caption: "Turned down a 6-figure retainer last week. Wrong fit. Best decision we made this quarter.",
      status: "idea",
      scheduled_date: dateStr(mon, 2), // Wednesday
      scheduled_time: "09:00",
      analytics_score: 87,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "seed-4",
      platform: "linkedin",
      content_type: "promotional",
      post_format: "article",
      caption: "We just opened 2 spots for Q2 landing page builds. DTC brands doing £500k+/mo only. If your PDP converts under 4%, we should talk.",
      status: "media_ready",
      scheduled_date: dateStr(mon, 3), // Thursday
      scheduled_time: "12:00",
      analytics_score: 85,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "seed-5",
      platform: "instagram",
      content_type: "educational",
      post_format: "image",
      caption: "Your hero image is not a billboard. It is the first frame of a sales conversation. Treat it like one.",
      status: "approved",
      scheduled_date: dateStr(mon, 2), // Wednesday
      scheduled_time: "19:00",
      analytics_score: 91,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
}
