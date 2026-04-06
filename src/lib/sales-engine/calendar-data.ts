/* ── Content Calendar data layer ── */

import { createStore } from "@/lib/supabase-store";

// ── Types ──

export type Creator = "ajay" | "dylan";
export type Platform = "linkedin" | "instagram" | "x" | "tiktok";
export type ContentType = "educational" | "social_proof" | "personal" | "promotional";
export type PostStatus = "draft" | "created" | "scheduled";
export type PostFormat = "text" | "image" | "article" | "video";

export interface ContentPost {
  id: string;
  creator: Creator;
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
  draft: "#94A3B8",
  created: "#3B82F6",
  scheduled: "#10B981",
};

export const statusLabels: Record<PostStatus, string> = {
  draft: "Draft",
  created: "Created",
  scheduled: "Scheduled",
};

// ── Optimal posting times (mock analytics) ──

export interface SlotAnalytics {
  platform: Platform;
  day: number; // 0=Sun..6=Sat
  hour: number;
  score: number; // 0-100
}

export interface SlotTime {
  hour: number;
  minute: number;
}

export const optimalSlots: (SlotAnalytics & { minute?: number })[] = [
  // LinkedIn: Tue/Thu mornings + lunch — professionals check feeds at commute + lunch
  { platform: "linkedin", day: 2, hour: 7, minute: 45, score: 93 },
  { platform: "linkedin", day: 2, hour: 11, minute: 30, score: 88 },
  { platform: "linkedin", day: 4, hour: 8, minute: 15, score: 95 },
  { platform: "linkedin", day: 4, hour: 12, minute: 10, score: 85 },
  { platform: "linkedin", day: 1, hour: 8, minute: 30, score: 70 },
  { platform: "linkedin", day: 3, hour: 7, minute: 50, score: 72 },
  { platform: "linkedin", day: 5, hour: 9, minute: 15, score: 65 },
  // Instagram: Mon/Wed lunchtime + evening scroll
  { platform: "instagram", day: 1, hour: 12, minute: 15, score: 93 },
  { platform: "instagram", day: 1, hour: 18, minute: 45, score: 90 },
  { platform: "instagram", day: 3, hour: 11, minute: 50, score: 91 },
  { platform: "instagram", day: 3, hour: 19, minute: 15, score: 87 },
  { platform: "instagram", day: 5, hour: 12, minute: 30, score: 68 },
  { platform: "instagram", day: 2, hour: 18, minute: 30, score: 65 },
  { platform: "instagram", day: 6, hour: 10, minute: 15, score: 72 },
  { platform: "instagram", day: 0, hour: 11, minute: 0, score: 70 },
  // X (Twitter): mornings + afternoon lull breaks
  { platform: "x", day: 1, hour: 8, minute: 45, score: 88 },
  { platform: "x", day: 2, hour: 9, minute: 10, score: 90 },
  { platform: "x", day: 3, hour: 8, minute: 30, score: 87 },
  { platform: "x", day: 4, hour: 9, minute: 0, score: 89 },
  { platform: "x", day: 5, hour: 8, minute: 15, score: 85 },
  { platform: "x", day: 1, hour: 12, minute: 20, score: 60 },
  { platform: "x", day: 3, hour: 15, minute: 30, score: 55 },
  { platform: "x", day: 4, hour: 17, minute: 15, score: 62 },
  // TikTok: evenings + lunch — scroll-heavy times
  { platform: "tiktok", day: 1, hour: 12, minute: 0, score: 80 },
  { platform: "tiktok", day: 2, hour: 19, minute: 0, score: 88 },
  { platform: "tiktok", day: 3, hour: 18, minute: 30, score: 85 },
  { platform: "tiktok", day: 4, hour: 12, minute: 15, score: 78 },
  { platform: "tiktok", day: 5, hour: 17, minute: 0, score: 82 },
  { platform: "tiktok", day: 6, hour: 10, minute: 30, score: 90 },
  { platform: "tiktok", day: 0, hour: 11, minute: 15, score: 87 },
];

// ── Helper: get slot score for a platform/day/hour ──

export function getSlotScore(platform: Platform, day: number, hour: number): number {
  // Match within ±1 hour to be forgiving of slight time differences
  const match = optimalSlots.find(s => s.platform === platform && s.day === day && Math.abs(s.hour - hour) <= 1);
  return match?.score ?? 0;
}

export function isOptimalSlot(day: number, hour: number): boolean {
  return optimalSlots.some(s => s.day === day && Math.abs(s.hour - hour) <= 1 && s.score >= 80);
}

/** Format a slot time as HH:mm string */
export function formatSlotTime(slot: { hour: number; minute?: number }): string {
  return `${slot.hour.toString().padStart(2, "0")}:${(slot.minute ?? 0).toString().padStart(2, "0")}`;
}

// ── Helper: get best times for platform on a specific day ──

export function getBestTimes(platform: Platform, day: number): { hour: number; minute: number; score: number; time: string }[] {
  return optimalSlots
    .filter(s => s.platform === platform && s.day === day)
    .sort((a, b) => b.score - a.score)
    .map(s => ({ hour: s.hour, minute: s.minute ?? 0, score: s.score, time: formatSlotTime(s) }));
}

// ── Helper: get overall best slots for platform (top 3) ──

export function getTopSlots(platform: Platform): { day: number; hour: number; minute: number; score: number; time: string }[] {
  return optimalSlots
    .filter(s => s.platform === platform)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(s => ({ day: s.day, hour: s.hour, minute: s.minute ?? 0, score: s.score, time: formatSlotTime(s) }));
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
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function seedPosts(): ContentPost[] {
  const mon = getMonday();
  return [
    {
      id: "seed-1",
      creator: "ajay",
      platform: "linkedin",
      content_type: "educational",
      post_format: "text",
      caption: "Most brands test button colours. The ones scaling past 8 figures test their entire purchase flow. Here's the framework we use to prioritise what actually moves revenue.",
      status: "scheduled",
      scheduled_date: dateStr(mon, 1), // Tuesday
      scheduled_time: "07:45",
      analytics_score: 95,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "seed-2",
      creator: "dylan",
      platform: "instagram",
      content_type: "social_proof",
      post_format: "image",
      caption: "Before and after. Same product. Same traffic. Different landing page. 34% conversion lift in 21 days. The gallery did most of the heavy lifting.",
      status: "created",
      scheduled_date: dateStr(mon, 0), // Monday
      scheduled_time: "12:15",
      analytics_score: 93,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "seed-3",
      creator: "ajay",
      platform: "x",
      content_type: "personal",
      post_format: "text",
      caption: "Turned down a 6-figure retainer last week. Wrong fit. Best decision we made this quarter.",
      status: "draft",
      scheduled_date: dateStr(mon, 2), // Wednesday
      scheduled_time: "08:30",
      analytics_score: 87,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "seed-4",
      creator: "ajay",
      platform: "linkedin",
      content_type: "promotional",
      post_format: "article",
      caption: "We just opened 2 spots for Q2 landing page builds. DTC brands doing £500k+/mo only. If your PDP converts under 4%, we should talk.",
      status: "created",
      scheduled_date: dateStr(mon, 3), // Thursday
      scheduled_time: "12:10",
      analytics_score: 85,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "seed-5",
      creator: "dylan",
      platform: "instagram",
      content_type: "educational",
      post_format: "image",
      caption: "Your hero image is not a billboard. It is the first frame of a sales conversation. Treat it like one.",
      status: "scheduled",
      scheduled_date: dateStr(mon, 2), // Wednesday
      scheduled_time: "19:15",
      analytics_score: 91,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
}
