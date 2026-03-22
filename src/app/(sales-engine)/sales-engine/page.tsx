"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowPathIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon } from "@heroicons/react/24/outline";
import { ACCOUNTS, type AccountOwner, type SocialPlatform, type SocialSnapshot, type SocialPost } from "@/lib/sales-engine/types";
import {
  getSnapshots, getPosts, getLatestSnapshot, getLastScrapedAt,
  addSnapshot, upsertPosts,
  parseTikTokProfile, parseInstagramProfile, parseTikTokPost, parseInstagramPost,
} from "@/lib/sales-engine/social-data";

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function SalesEngineDashboard() {
  const [owner, setOwner] = useState<AccountOwner>("dylan");
  const [snapshots, setSnapshots] = useState<SocialSnapshot[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [lastScraped, setLastScraped] = useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = useState<SocialPlatform | "all">("all");
  const [sortBy, setSortBy] = useState<"engagement" | "likes" | "views" | "recent">("engagement");

  const ownerAccounts = ACCOUNTS.filter((a) => a.owner === owner);

  const load = useCallback(async () => {
    setLoading(true);
    const [snaps, allPosts, lastScrape] = await Promise.all([
      getSnapshots(owner),
      getPosts(owner),
      getLastScrapedAt(owner),
    ]);
    setSnapshots(snaps);
    setPosts(allPosts);
    setLastScraped(lastScrape);
    setLoading(false);

    // Auto-scrape if older than 24h or never scraped
    if (!lastScrape || Date.now() - new Date(lastScrape).getTime() > 24 * 60 * 60 * 1000) {
      scrapeAll();
    }
  }, [owner]);

  useEffect(() => { load(); }, [load]);

  const scrapeAll = async () => {
    if (scraping) return;
    setScraping(true);

    for (const account of ownerAccounts) {
      try {
        // Scrape profile
        const profileAction = account.platform === "tiktok" ? "tiktok-profile" : "instagram-profile";
        const profileParams = account.platform === "tiktok"
          ? { profiles: [account.handle] }
          : { usernames: [account.handle] };

        const profileRes = await fetch("/api/apify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: profileAction, params: profileParams }),
        });

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          if (profileData.results?.length > 0) {
            const snapshot = account.platform === "tiktok"
              ? parseTikTokProfile(profileData.results[0], owner)
              : parseInstagramProfile(profileData.results[0], owner);
            await addSnapshot(snapshot);
          }
        }

        // Scrape posts
        const postsAction = account.platform === "tiktok" ? "tiktok-posts" : "instagram-posts";
        const postsParams = account.platform === "tiktok"
          ? { profiles: [account.handle], limit: 50 }
          : { username: account.handle, limit: 50 };

        const postsRes = await fetch("/api/apify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: postsAction, params: postsParams }),
        });

        if (postsRes.ok) {
          const postsData = await postsRes.json();
          if (postsData.results?.length > 0) {
            const parsed = postsData.results.map((raw: any) =>
              account.platform === "tiktok"
                ? parseTikTokPost(raw, owner)
                : parseInstagramPost(raw, owner)
            );
            await upsertPosts(parsed);
          }
        }
      } catch {
        // Continue with next account
      }
    }

    // Reload data
    const [snaps, allPosts] = await Promise.all([getSnapshots(owner), getPosts(owner)]);
    setSnapshots(snaps);
    setPosts(allPosts);
    setLastScraped(new Date().toISOString());
    setScraping(false);
  };

  // ── Derived data ──

  // Latest snapshot per platform
  const latestByPlatform: Record<string, SocialSnapshot> = {};
  for (const snap of [...snapshots].sort((a, b) => b.scraped_at.localeCompare(a.scraped_at))) {
    const key = `${snap.platform}`;
    if (!latestByPlatform[key]) latestByPlatform[key] = snap;
  }

  // Previous snapshot per platform (for trend)
  const previousByPlatform: Record<string, SocialSnapshot> = {};
  for (const snap of [...snapshots].sort((a, b) => b.scraped_at.localeCompare(a.scraped_at))) {
    const key = `${snap.platform}`;
    if (latestByPlatform[key] && snap.id !== latestByPlatform[key].id && !previousByPlatform[key]) {
      previousByPlatform[key] = snap;
    }
  }

  // Filter + sort posts
  const filteredPosts = platformFilter === "all" ? posts : posts.filter((p) => p.platform === platformFilter);
  const sortedPosts = [...filteredPosts].sort((a, b) => {
    switch (sortBy) {
      case "likes": return b.likes - a.likes;
      case "views": return b.views - a.views;
      case "recent": return b.posted_at.localeCompare(a.posted_at);
      default: return b.engagement_rate - a.engagement_rate;
    }
  });

  // Top hooks
  const hookMap: Record<string, { hook: string; count: number; avgEngagement: number; totalLikes: number }> = {};
  for (const post of posts) {
    if (!post.hook) continue;
    if (!hookMap[post.hook]) hookMap[post.hook] = { hook: post.hook, count: 0, avgEngagement: 0, totalLikes: 0 };
    hookMap[post.hook].count++;
    hookMap[post.hook].avgEngagement += post.engagement_rate;
    hookMap[post.hook].totalLikes += post.likes;
  }
  const topHooks = Object.values(hookMap)
    .map((h) => ({ ...h, avgEngagement: h.avgEngagement / h.count }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement)
    .slice(0, 10);

  // Top hashtags
  const tagMap: Record<string, { tag: string; count: number; avgEngagement: number }> = {};
  for (const post of posts) {
    for (const tag of post.hashtags) {
      if (!tagMap[tag]) tagMap[tag] = { tag, count: 0, avgEngagement: 0 };
      tagMap[tag].count++;
      tagMap[tag].avgEngagement += post.engagement_rate;
    }
  }
  const topHashtags = Object.values(tagMap)
    .filter((t) => t.count >= 2)
    .map((t) => ({ ...t, avgEngagement: t.avgEngagement / t.count }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement)
    .slice(0, 15);

  // Totals
  const totalFollowers = Object.values(latestByPlatform).reduce((s, snap) => s + snap.followers, 0);
  const avgEngagement = posts.length > 0
    ? (posts.reduce((s, p) => s + p.engagement_rate, 0) / posts.length).toFixed(2)
    : "0";

  return (
    <div className="max-w-5xl mx-auto py-10 px-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-[#7A7A7A] mt-0.5">
            {lastScraped ? `Last updated ${timeAgo(lastScraped)}` : "No data yet — scraping will start automatically"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Owner toggle */}
          <div className="flex gap-1 bg-[#F3F3F5] rounded-lg p-0.5">
            {(["dylan", "ajay"] as const).map((o) => (
              <button
                key={o}
                onClick={() => setOwner(o)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors capitalize ${
                  owner === o ? "bg-white text-[#1A1A1A] shadow-sm" : "text-[#777]"
                }`}
              >
                {o}
              </button>
            ))}
          </div>
          <button
            onClick={scrapeAll}
            disabled={scraping}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-[#777] border border-[#E5E5EA] rounded-lg hover:bg-[#F5F5F5] disabled:opacity-30 whitespace-nowrap"
          >
            <ArrowPathIcon className={`size-3.5 shrink-0 ${scraping ? "animate-spin" : ""}`} />
            {scraping ? "Scraping..." : "Refresh"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin size-6 border-2 border-[#E5E5EA] border-t-[#1A1A1A] rounded-full" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* ── Profile Overview ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(latestByPlatform).map(([key, snap]) => {
              const prev = previousByPlatform[key];
              const followerDelta = prev ? snap.followers - prev.followers : 0;
              return (
                <div key={key} className="border border-[#E5E5EA] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`size-2 rounded-full ${snap.platform === "tiktok" ? "bg-cyan-500" : "bg-pink-500"}`} />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA]">
                      {snap.platform}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-[#1A1A1A]">{formatNum(snap.followers)}</p>
                  <p className="text-[10px] text-[#999] mt-0.5">followers</p>
                  {followerDelta !== 0 && (
                    <div className={`flex items-center gap-1 mt-1 ${followerDelta > 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {followerDelta > 0 ? <ArrowTrendingUpIcon className="size-3" /> : <ArrowTrendingDownIcon className="size-3" />}
                      <span className="text-[10px] font-semibold">{followerDelta > 0 ? "+" : ""}{formatNum(followerDelta)}</span>
                    </div>
                  )}
                </div>
              );
            })}
            <div className="border border-[#E5E5EA] rounded-xl p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-2">Total Followers</p>
              <p className="text-2xl font-bold text-[#1A1A1A]">{formatNum(totalFollowers)}</p>
              <p className="text-[10px] text-[#999] mt-0.5">across {Object.keys(latestByPlatform).length} platforms</p>
            </div>
            <div className="border border-[#E5E5EA] rounded-xl p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-2">Avg Engagement</p>
              <p className="text-2xl font-bold text-[#1A1A1A]">{avgEngagement}%</p>
              <p className="text-[10px] text-[#999] mt-0.5">across {posts.length} posts</p>
            </div>
          </div>

          {/* ── Content Performance ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#AAA]">Content Performance</h2>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {(["all", "tiktok", "instagram"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPlatformFilter(p)}
                      className={`px-2 py-1 text-[10px] font-semibold uppercase rounded transition-colors ${
                        platformFilter === p ? "bg-[#1B1B1B] text-white" : "text-[#AAA] hover:text-[#1A1A1A]"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="text-[10px] text-[#777] border border-[#E5E5EA] rounded px-1.5 py-1"
                >
                  <option value="engagement">Engagement</option>
                  <option value="likes">Likes</option>
                  <option value="views">Views</option>
                  <option value="recent">Recent</option>
                </select>
              </div>
            </div>

            {sortedPosts.length > 0 ? (
              <div className="border border-[#E5E5EA] rounded-xl overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-[1fr_70px_70px_70px_70px_60px] gap-2 px-4 py-2 bg-[#FAFAFA] border-b border-[#E5E5EA] text-[10px] font-semibold uppercase tracking-wider text-[#AAA]">
                  <span>Post</span>
                  <span className="text-right">Likes</span>
                  <span className="text-right">Comments</span>
                  <span className="text-right">Views</span>
                  <span className="text-right">ER</span>
                  <span />
                </div>

                {/* Posts */}
                <div className="max-h-[500px] overflow-y-auto">
                  {sortedPosts.slice(0, 50).map((post, i) => (
                    <div key={post.id || i} className="grid grid-cols-[1fr_70px_70px_70px_70px_60px] gap-2 px-4 py-2.5 border-b border-[#EDEDEF] last:border-0 items-center hover:bg-[#FAFAFA]">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`size-1.5 rounded-full shrink-0 ${post.platform === "tiktok" ? "bg-cyan-500" : "bg-pink-500"}`} />
                          <p className="text-xs text-[#1A1A1A] truncate">{post.hook || post.caption.slice(0, 60) || "No caption"}</p>
                        </div>
                        {post.posted_at && (
                          <p className="text-[9px] text-[#CCC] ml-3.5 mt-0.5">
                            {new Date(post.posted_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </p>
                        )}
                      </div>
                      <p className="text-xs text-right text-[#555]">{formatNum(post.likes)}</p>
                      <p className="text-xs text-right text-[#555]">{formatNum(post.comments)}</p>
                      <p className="text-xs text-right text-[#555]">{post.views > 0 ? formatNum(post.views) : "—"}</p>
                      <p className={`text-xs text-right font-semibold ${
                        post.engagement_rate > 5 ? "text-emerald-600" : post.engagement_rate > 2 ? "text-amber-600" : "text-[#AAA]"
                      }`}>
                        {post.engagement_rate.toFixed(1)}%
                      </p>
                      <div className="text-right">
                        {post.url && (
                          <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-[9px] text-[#CCC] hover:text-[#1A1A1A]">
                            Open
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-[#E5E5EA] rounded-xl p-8 text-center">
                <p className="text-sm text-[#AAA]">{scraping ? "Scraping posts..." : "No posts scraped yet"}</p>
                {!scraping && <p className="text-xs text-[#CCC] mt-1">Click Refresh to pull content data</p>}
              </div>
            )}
          </div>

          {/* ── Insights row ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Hooks */}
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#AAA] mb-3">Top Hooks</h2>
              {topHooks.length > 0 ? (
                <div className="border border-[#E5E5EA] rounded-xl overflow-hidden">
                  {topHooks.map((h, i) => (
                    <div key={i} className="flex items-start gap-3 px-4 py-2.5 border-b border-[#EDEDEF] last:border-0">
                      <span className="text-[10px] font-mono text-[#CCC] w-4 shrink-0 mt-0.5">#{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[#1A1A1A] line-clamp-2">{h.hook}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[9px] text-[#999]">{formatNum(h.totalLikes)} likes</span>
                          <span className={`text-[9px] font-semibold ${h.avgEngagement > 5 ? "text-emerald-600" : "text-[#AAA]"}`}>
                            {h.avgEngagement.toFixed(1)}% ER
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-dashed border-[#E5E5EA] rounded-xl p-6 text-center">
                  <p className="text-[10px] text-[#CCC]">Hooks appear after posts are scraped</p>
                </div>
              )}
            </div>

            {/* Top Hashtags */}
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#AAA] mb-3">Top Hashtags</h2>
              {topHashtags.length > 0 ? (
                <div className="border border-[#E5E5EA] rounded-xl p-4">
                  <div className="flex flex-wrap gap-2">
                    {topHashtags.map((t) => (
                      <span
                        key={t.tag}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium rounded-full border ${
                          t.avgEngagement > 5 ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : t.avgEngagement > 2 ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-[#F5F5F5] text-[#777] border-[#E5E5EA]"
                        }`}
                      >
                        {t.tag}
                        <span className="opacity-60">{t.avgEngagement.toFixed(1)}%</span>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-[#E5E5EA] rounded-xl p-6 text-center">
                  <p className="text-[10px] text-[#CCC]">Hashtag analysis appears after posts are scraped</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Follower History ── */}
          {snapshots.length > 1 && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#AAA] mb-3">Follower History</h2>
              <div className="border border-[#E5E5EA] rounded-xl overflow-hidden">
                {[...snapshots]
                  .sort((a, b) => b.scraped_at.localeCompare(a.scraped_at))
                  .slice(0, 20)
                  .map((snap, i) => (
                  <div key={snap.id || i} className="flex items-center justify-between px-4 py-2 border-b border-[#EDEDEF] last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={`size-1.5 rounded-full ${snap.platform === "tiktok" ? "bg-cyan-500" : "bg-pink-500"}`} />
                      <span className="text-xs text-[#777]">@{snap.username}</span>
                    </div>
                    <span className="text-xs font-semibold text-[#1A1A1A]">{formatNum(snap.followers)}</span>
                    <span className="text-[9px] text-[#CCC]">{new Date(snap.scraped_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
