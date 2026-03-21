/* ── Social Data Layer ──
 * Persistent storage for social snapshots and posts.
 * Each scrape adds to history — data builds over time.
 */

import { createStore } from "@/lib/supabase-store";
import type { SocialSnapshot, SocialPost, AccountOwner, SocialPlatform, ACCOUNTS } from "./types";

const snapshotStore = createStore<SocialSnapshot>({
  table: "social_snapshots",
  lsKey: "se-social-snapshots",
});

const postStore = createStore<SocialPost>({
  table: "social_posts",
  lsKey: "se-social-posts",
});

/* ── Snapshots ── */

export async function getSnapshots(owner?: AccountOwner): Promise<SocialSnapshot[]> {
  const all = await snapshotStore.getAll();
  return owner ? all.filter((s) => s.account_id === owner) : all;
}

export async function getLatestSnapshot(owner: AccountOwner, platform: SocialPlatform): Promise<SocialSnapshot | null> {
  const all = await getSnapshots(owner);
  const filtered = all.filter((s) => s.platform === platform);
  if (filtered.length === 0) return null;
  return filtered.sort((a, b) => b.scraped_at.localeCompare(a.scraped_at))[0];
}

export async function addSnapshot(snapshot: SocialSnapshot): Promise<void> {
  const all = await snapshotStore.getAll();
  all.push(snapshot);
  await snapshotStore.saveAll(all);
}

export async function getLastScrapedAt(owner: AccountOwner): Promise<string | null> {
  const snapshots = await getSnapshots(owner);
  if (snapshots.length === 0) return null;
  return snapshots.sort((a, b) => b.scraped_at.localeCompare(a.scraped_at))[0].scraped_at;
}

/* ── Posts ── */

export async function getPosts(owner?: AccountOwner, platform?: SocialPlatform): Promise<SocialPost[]> {
  const all = await postStore.getAll();
  let filtered = all;
  if (owner) filtered = filtered.filter((p) => p.account_id === owner);
  if (platform) filtered = filtered.filter((p) => p.platform === platform);
  return filtered;
}

export async function upsertPosts(newPosts: SocialPost[]): Promise<void> {
  const all = await postStore.getAll();
  for (const post of newPosts) {
    const idx = all.findIndex((p) => p.id === post.id && p.platform === post.platform);
    if (idx >= 0) {
      // Update metrics but keep original scraped_at for first-seen tracking
      all[idx] = { ...all[idx], likes: post.likes, comments: post.comments, shares: post.shares, views: post.views, engagement_rate: post.engagement_rate, scraped_at: post.scraped_at };
    } else {
      all.push(post);
    }
  }
  await postStore.saveAll(all);
}

/* ── Helpers ── */

export function extractHashtags(caption: string): string[] {
  const matches = caption.match(/#[\w]+/g);
  return matches ? matches.map((t) => t.toLowerCase()) : [];
}

export function extractHook(caption: string): string {
  const firstLine = caption.split("\n")[0]?.trim() || "";
  return firstLine.slice(0, 100);
}

/** Parse raw TikTok post from Apify into SocialPost */
export function parseTikTokPost(raw: any, owner: AccountOwner): SocialPost {
  const caption = raw.text || raw.desc || "";
  const likes = raw.diggCount || raw.likes || 0;
  const comments = raw.commentCount || raw.comments || 0;
  const shares = raw.shareCount || raw.shares || 0;
  const views = raw.playCount || raw.plays || 0;

  return {
    id: raw.id || crypto.randomUUID(),
    account_id: owner,
    platform: "tiktok",
    caption,
    likes,
    comments,
    shares,
    views,
    engagement_rate: views > 0 ? ((likes + comments + shares) / views) * 100 : 0,
    posted_at: raw.createTimeISO || raw.createTime || "",
    url: raw.webVideoUrl || raw.url || "",
    post_type: "video",
    hashtags: extractHashtags(caption),
    hook: extractHook(caption),
    scraped_at: new Date().toISOString(),
  };
}

/** Parse raw Instagram post from Apify into SocialPost */
export function parseInstagramPost(raw: any, owner: AccountOwner): SocialPost {
  const caption = raw.caption || "";
  const likes = raw.likesCount || raw.likes || 0;
  const comments = raw.commentsCount || raw.comments || 0;
  const views = raw.videoViewCount || raw.videoPlayCount || 0;

  return {
    id: raw.id || raw.shortCode || crypto.randomUUID(),
    account_id: owner,
    platform: "instagram",
    caption,
    likes,
    comments,
    shares: 0,
    views,
    engagement_rate: raw.ownerFollowers ? ((likes + comments) / raw.ownerFollowers) * 100 : 0,
    posted_at: raw.timestamp || raw.takenAt || "",
    url: raw.url || `https://instagram.com/p/${raw.shortCode}`,
    post_type: raw.type || (raw.isVideo ? "video" : "image"),
    hashtags: extractHashtags(caption),
    hook: extractHook(caption),
    scraped_at: new Date().toISOString(),
  };
}

/** Parse raw profile into SocialSnapshot */
export function parseTikTokProfile(raw: any, owner: AccountOwner): SocialSnapshot {
  const stats = raw.authorMeta || raw.stats || raw;
  return {
    id: crypto.randomUUID(),
    account_id: owner,
    platform: "tiktok",
    username: raw.uniqueId || raw.username || stats.name || "",
    followers: stats.fans || stats.followerCount || raw.followers || 0,
    following: stats.following || stats.followingCount || 0,
    posts_count: stats.video || stats.videoCount || 0,
    engagement_rate: 0,
    profile_pic: raw.avatarMedium || raw.avatarLarger || "",
    bio: raw.signature || raw.bio || "",
    scraped_at: new Date().toISOString(),
  };
}

export function parseInstagramProfile(raw: any, owner: AccountOwner): SocialSnapshot {
  return {
    id: crypto.randomUUID(),
    account_id: owner,
    platform: "instagram",
    username: raw.username || "",
    followers: raw.followersCount || raw.followers || 0,
    following: raw.followsCount || raw.following || 0,
    posts_count: raw.postsCount || raw.mediaCount || 0,
    engagement_rate: raw.engagementRate || 0,
    profile_pic: raw.profilePicUrl || raw.profilePicUrlHD || "",
    bio: raw.biography || raw.bio || "",
    scraped_at: new Date().toISOString(),
  };
}
