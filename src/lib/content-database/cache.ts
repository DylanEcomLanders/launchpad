/* ── Content Analytics Cache (localStorage) ── */

import type { CachedAccountData, ContentAnalysis } from "./types";

const POSTS_KEY = (id: string) => `content-analytics-posts-${id}`;
const ANALYSIS_KEY = (id: string) => `content-analytics-analysis-${id}`;

// ── Posts cache ────────────────────────────────────────────

export function getCachedPosts(accountId: string): CachedAccountData | null {
  try {
    const raw = localStorage.getItem(POSTS_KEY(accountId));
    if (!raw) return null;
    return JSON.parse(raw) as CachedAccountData;
  } catch {
    return null;
  }
}

export function setCachedPosts(data: CachedAccountData): void {
  try {
    localStorage.setItem(POSTS_KEY(data.accountId), JSON.stringify(data));
  } catch {
    /* storage full — silently fail */
  }
}

// ── Analysis cache ────────────────────────────────────────

export function getCachedAnalysis(accountId: string): ContentAnalysis | null {
  try {
    const raw = localStorage.getItem(ANALYSIS_KEY(accountId));
    if (!raw) return null;
    return JSON.parse(raw) as ContentAnalysis;
  } catch {
    return null;
  }
}

export function setCachedAnalysis(analysis: ContentAnalysis): void {
  try {
    localStorage.setItem(ANALYSIS_KEY(analysis.accountId), JSON.stringify(analysis));
  } catch {
    /* storage full — silently fail */
  }
}

// ── Clear ─────────────────────────────────────────────────

export function clearCache(accountId: string): void {
  localStorage.removeItem(POSTS_KEY(accountId));
  localStorage.removeItem(ANALYSIS_KEY(accountId));
}

// ── Cache age (human-readable) ────────────────────────────

export function getCacheAge(accountId: string): string | null {
  const cached = getCachedPosts(accountId);
  if (!cached?.syncedAt) return null;

  const diff = Date.now() - new Date(cached.syncedAt).getTime();
  const mins = Math.floor(diff / 60_000);

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
