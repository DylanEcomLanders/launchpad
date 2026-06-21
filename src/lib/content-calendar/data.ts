/* ── Content Calendar — data layer ──
 * Two stores backed by createStore() (Supabase + localStorage fallback):
 *   - pillarsStore        → content_pillars
 *   - postsStore          → content_posts
 *
 * Helpers wrap createStore for the bits the UI needs (sorted reads,
 * defaults for new records, media upload, etc).
 */

import { createStore } from "@/lib/supabase-store";
import type {
  ContentPillar,
  ContentPost,
  PostMedia,
  PostStatus,
  Platform,
} from "./types";

const pillarsStore = createStore<ContentPillar>({
  table: "content_pillars",
  lsKey: "launchpad.content-calendar.pillars",
});

const postsStore = createStore<ContentPost>({
  table: "content_posts",
  lsKey: "launchpad.content-calendar.posts",
});

/* Fallback pillars used when neither Supabase nor localStorage has
 * any rows yet (fresh client, migration not applied). Mirrors the
 * INSERT in 014_create_content_calendar_v2.sql so first-load shows
 * something sensible rather than an empty pillar dropdown. */
const FALLBACK_PILLARS: ContentPillar[] = [
  {
    id: "pillar_cro_frameworks",
    name: "CRO Frameworks",
    slug: "cro_frameworks",
    color_hex: "#2563EB",
    description: "Conversion frameworks, audit teardowns, principles",
    target_weekly_posts: 3,
    sort_order: 0,
  },
  {
    id: "pillar_agency_ops",
    name: "Agency Ops",
    slug: "agency_ops",
    color_hex: "#8B5CF6",
    description: "Running the agency, pricing, hiring, systems",
    target_weekly_posts: 2,
    sort_order: 1,
  },
  {
    id: "pillar_building_in_public",
    name: "Building in Public",
    slug: "building_in_public",
    color_hex: "#F59E0B",
    description: "Launchpad shipping notes, behind the scenes",
    target_weekly_posts: 1,
    sort_order: 2,
  },
  {
    id: "pillar_industry_opinions",
    name: "Industry Opinions",
    slug: "industry_opinions",
    color_hex: "#EF4444",
    description: "Hot takes, contrarian views, commentary",
    target_weekly_posts: 1,
    sort_order: 3,
  },
];

/* ── Pillars ─────────────────────────────────────────────────────── */

export const pillars = {
  async list(): Promise<ContentPillar[]> {
    const rows = await pillarsStore.getAll();
    if (rows.length === 0) return FALLBACK_PILLARS;
    return rows.slice().sort((a, b) => a.sort_order - b.sort_order);
  },
  getById: pillarsStore.getById,
  create: pillarsStore.create,
  update: pillarsStore.update,
  remove: pillarsStore.remove,
};

/* New-pillar template used by the settings UI's "+ Add" button. */
export function blankPillar(sortOrder: number): ContentPillar {
  return {
    id: `pillar_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: "New pillar",
    slug: `pillar_${Date.now()}`,
    color_hex: "#6B7280",
    description: "",
    target_weekly_posts: 1,
    sort_order: sortOrder,
  };
}

/* ── Posts ───────────────────────────────────────────────────────── */

export const posts = {
  async list(): Promise<ContentPost[]> {
    const rows = await postsStore.getAll();
    /* Newest first by created_at (createStore returns this already,
     * but be explicit so caller doesn't have to trust the source). */
    return rows.slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  getById: postsStore.getById,
  create: postsStore.create,
  update: postsStore.update,
  remove: postsStore.remove,
};

/* New-post template. Idea status by default — that's what Cmd+K
 * quick-capture (phase 9) will produce, and it's the lightest entry
 * point. The drawer can promote to drafting/drafted from there. */
export function blankPost(overrides: Partial<ContentPost> = {}): ContentPost {
  const now = new Date().toISOString();
  return {
    id: `post_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    pillar_id: null,
    status: "idea",
    platforms: ["twitter", "linkedin"],
    twitter_copy: "",
    linkedin_copy: "",
    scheduled_for: null,
    posted_at: null,
    twitter_url: null,
    linkedin_url: null,
    impressions: null,
    engagement: null,
    notes: "",
    is_evergreen: false,
    media: [],
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

/* ── Media upload ────────────────────────────────────────────────── */

export interface UploadedMedia {
  url: string;
  filename: string;
  size: number;
  type: string;
}

/* POSTs the file to /api/content-calendar/upload and returns the
 * public URL + metadata. Caller is responsible for appending the
 * resulting PostMedia object to the post's media array and saving. */
export async function uploadPostMedia(file: File): Promise<UploadedMedia> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/content-calendar/upload", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Upload failed (${res.status})`);
  }
  return res.json();
}

/* Build a PostMedia entry for an UploadedMedia + sort position.
 * Inferred file_type from MIME so caller doesn't need to repeat. */
export function toPostMedia(
  upload: UploadedMedia,
  sortOrder: number,
  altText?: string,
): PostMedia {
  const fileType: PostMedia["file_type"] = upload.type.startsWith("video/")
    ? "video"
    : "image";
  return {
    id: `media_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    file_url: upload.url,
    file_type: fileType,
    file_size: upload.size,
    alt_text: altText,
    sort_order: sortOrder,
  };
}

/* ── Read-side helpers for views ─────────────────────────────────── */

/* Group posts by status into a kanban-friendly map. Order inside
 * each column is by scheduled_for asc (or created_at desc for
 * statuses without a scheduled date). */
export function groupByStatus(
  all: ContentPost[],
): Record<PostStatus, ContentPost[]> {
  const grouped: Record<PostStatus, ContentPost[]> = {
    idea: [],
    drafting: [],
    drafted: [],
    scheduled: [],
    posted: [],
    archived: [],
  };
  for (const p of all) grouped[p.status].push(p);
  for (const status of Object.keys(grouped) as PostStatus[]) {
    grouped[status].sort((a, b) => {
      if (a.scheduled_for && b.scheduled_for) {
        return a.scheduled_for.localeCompare(b.scheduled_for);
      }
      if (a.scheduled_for) return -1;
      if (b.scheduled_for) return 1;
      return b.created_at.localeCompare(a.created_at);
    });
  }
  return grouped;
}

/* Returns true if the post targets the given platform. Convenience
 * for badge rendering on cards. */
export function targetsPlatform(post: ContentPost, platform: Platform): boolean {
  return post.platforms.includes(platform);
}
