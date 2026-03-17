"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { DecorativeBlocks } from "@/components/decorative-blocks";
import { selectClass } from "@/lib/form-styles";
import { socialAccounts } from "@/lib/content-database/accounts";
import { contentCategories } from "@/lib/content-database/types";
import type {
  SyncedPost,
  ContentPlatform,
  ContentCategory,
  ContentAnalysis,
  SyncError,
} from "@/lib/content-database/types";
import {
  getCachedPosts,
  setCachedPosts,
  getCachedAnalysis,
  setCachedAnalysis,
  getCacheAge,
} from "@/lib/content-database/cache";
import type { ExtractedPost } from "@/app/api/content-sync/route";
import {
  ArrowPathIcon,
  SparklesIcon,
  LinkIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  ChartBarIcon,
  HeartIcon,
  ChatBubbleLeftIcon,
  ArrowPathRoundedSquareIcon,
  TrophyIcon,
} from "@heroicons/react/24/solid";

/* ── Helpers ─────────────────────────────────────────────────────── */

function formatDate(d: string) {
  if (!d) return "";
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

const platformLabel: Record<ContentPlatform, string> = {
  twitter: "Twitter / X",
  linkedin: "LinkedIn",
};

const patternCategoryLabels: Record<string, string> = {
  format: "Format",
  topic: "Topic",
  timing: "Timing",
  engagement: "Engagement",
};

/* ══════════════════════════════════════════════════════════════════ */

export default function ContentAnalyticsPage() {
  // ── Core state ──────────────────────────────────────────────
  const [activeAccount, setActiveAccount] = useState(socialAccounts[0].id);
  const [posts, setPosts] = useState<SyncedPost[]>([]);
  const [analysis, setAnalysis] = useState<ContentAnalysis | null>(null);
  const [syncErrors, setSyncErrors] = useState<SyncError[]>([]);
  const [cacheAge, setCacheAgeStr] = useState<string | null>(null);

  // ── Loading ─────────────────────────────────────────────────
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  // ── Filters ─────────────────────────────────────────────────
  const [platformFilter, setPlatformFilter] = useState<ContentPlatform | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<ContentCategory | "all">("all");
  const [sortMode, setSortMode] = useState<"newest" | "engagement">("engagement");

  // ── Load cached data on account switch ──────────────────────
  const loadCachedData = useCallback((accountId: string) => {
    const cached = getCachedPosts(accountId);
    if (cached) {
      setPosts(cached.posts);
      setSyncErrors(cached.syncErrors);
    } else {
      setPosts([]);
      setSyncErrors([]);
    }
    const cachedAnalysis = getCachedAnalysis(accountId);
    setAnalysis(cachedAnalysis);
    setCacheAgeStr(getCacheAge(accountId));
  }, []);

  useEffect(() => {
    loadCachedData(activeAccount);
  }, [activeAccount, loadCachedData]);

  // Refresh cache age every minute
  useEffect(() => {
    const id = setInterval(() => setCacheAgeStr(getCacheAge(activeAccount)), 60_000);
    return () => clearInterval(id);
  }, [activeAccount]);

  // ── Sync posts ──────────────────────────────────────────────
  const handleSync = useCallback(async () => {
    setSyncing(true);
    setSyncProgress("Fetching posts...");
    setSyncErrors([]);

    const platforms: ContentPlatform[] = ["twitter"];
    const allPosts: SyncedPost[] = [];
    const errors: SyncError[] = [];

    const results = await Promise.allSettled(
      platforms.map(async (platform) => {
        setSyncProgress(`Scraping ${platformLabel[platform]}...`);
        const res = await fetch("/api/content-sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId: activeAccount, platform }),
        });
        const data = await res.json();
        return { platform, data };
      })
    );

    for (const result of results) {
      if (result.status === "rejected") {
        errors.push({ platform: "twitter", message: "Network error" });
        continue;
      }
      const { platform, data } = result.value;
      if (data.error) {
        errors.push({ platform, message: data.error });
      }
      if (data.posts && Array.isArray(data.posts)) {
        const mapped: SyncedPost[] = (data.posts as ExtractedPost[]).map(
          (p, i) => ({
            id: `${activeAccount}-${platform}-${i}`,
            accountId: activeAccount,
            platform,
            content: p.content,
            post_url: p.post_url,
            post_date: p.post_date,
            likes: p.likes,
            retweets: p.retweets,
            replies: p.replies,
            category: p.category,
            totalEngagement: p.likes + p.retweets + p.replies,
          })
        );
        allPosts.push(...mapped);
      }
    }

    // Save to cache
    const cacheData = {
      accountId: activeAccount,
      syncedAt: new Date().toISOString(),
      posts: allPosts,
      syncErrors: errors,
    };
    setCachedPosts(cacheData);

    setPosts(allPosts);
    setSyncErrors(errors);
    setAnalysis(null); // Clear stale analysis
    setCacheAgeStr(getCacheAge(activeAccount));
    setSyncing(false);
    setSyncProgress("");
  }, [activeAccount]);

  // ── Analyse posts ───────────────────────────────────────────
  const handleAnalyse = useCallback(async () => {
    if (posts.length === 0) return;
    setAnalyzing(true);

    try {
      const res = await fetch("/api/content-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: activeAccount, posts }),
      });
      const data = await res.json();

      if (data.error) {
        console.error("Analysis error:", data.error);
        setAnalyzing(false);
        return;
      }

      const result = data as ContentAnalysis;
      setCachedAnalysis(result);
      setAnalysis(result);
    } catch (err) {
      console.error("Analysis failed:", err);
    }

    setAnalyzing(false);
  }, [activeAccount, posts]);

  // ── Filtered + sorted posts ─────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...posts];
    if (platformFilter !== "all") {
      list = list.filter((p) => p.platform === platformFilter);
    }
    if (categoryFilter !== "all") {
      list = list.filter((p) => p.category === categoryFilter);
    }
    if (sortMode === "newest") {
      list.sort((a, b) => (b.post_date || "").localeCompare(a.post_date || ""));
    } else {
      list.sort((a, b) => b.totalEngagement - a.totalEngagement);
    }
    return list;
  }, [posts, platformFilter, categoryFilter, sortMode]);

  // ── Stats ───────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalEng = posts.reduce((s, p) => s + p.totalEngagement, 0);
    const avgEng = posts.length > 0 ? Math.round(totalEng / posts.length) : 0;
    const topPost = [...posts].sort((a, b) => b.totalEngagement - a.totalEngagement)[0];
    const topEng = topPost ? topPost.totalEngagement : 0;
    // Top category
    const catCounts: Record<string, number> = {};
    posts.forEach((p) => {
      catCounts[p.category] = (catCounts[p.category] || 0) + 1;
    });
    const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];
    const topCatLabel = topCat
      ? contentCategories.find((c) => c.id === topCat[0])?.label ?? topCat[0]
      : "—";

    return { total: posts.length, avgEng, topEng, topCatLabel };
  }, [posts]);

  const accountName =
    socialAccounts.find((a) => a.id === activeAccount)?.name ?? activeAccount;

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-12 py-16 md:py-24">
        {/* ── Header ──────────────────────────────────────── */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            Content Analytics
          </h1>
          <p className="text-[#999] text-sm">
            Analyse social posts, find patterns, spot what works.
          </p>
        </div>

        {/* ── Account Tabs ────────────────────────────────── */}
        <div className="mb-6">
          <div className="inline-flex rounded-lg border border-[#E5E5EA] bg-white p-0.5">
            {socialAccounts.map((acct) => (
              <button
                key={acct.id}
                onClick={() => {
                  setActiveAccount(acct.id);
                  setPlatformFilter("all");
                  setCategoryFilter("all");
                }}
                className={`px-5 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeAccount === acct.id
                    ? "bg-[#1B1B1B] text-white"
                    : "text-[#7A7A7A] hover:text-[#1B1B1B]"
                }`}
              >
                {acct.name}
              </button>
            ))}
          </div>
        </div>

        {/* ── Sync Controls ───────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {cacheAge && (
            <span className="text-xs text-[#A0A0A0]">
              Last synced: {cacheAge}
            </span>
          )}
          <div className="flex-1" />
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-[#1B1B1B] text-white hover:bg-[#1A1A1A] disabled:opacity-50 transition-colors"
          >
            <ArrowPathIcon
              className={`size-4 ${syncing ? "animate-spin" : ""}`}
            />
            {syncing ? syncProgress || "Syncing..." : "Sync Posts"}
          </button>
          <button
            onClick={handleAnalyse}
            disabled={analyzing || posts.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-[#E5E5EA] bg-white text-[#1B1B1B] hover:bg-[#F3F3F5] disabled:opacity-40 transition-colors"
          >
            <SparklesIcon
              className={`size-4 ${analyzing ? "animate-pulse" : ""}`}
            />
            {analyzing ? "Analysing..." : "Analyse"}
          </button>
        </div>

        {/* ── Sync errors / warnings ──────────────────────── */}
        {syncErrors.length > 0 && (
          <div className="mb-6 space-y-2">
            {syncErrors.map((e, i) => (
              <div
                key={i}
                className="flex items-start gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800"
              >
                <ExclamationTriangleIcon className="size-4 shrink-0 mt-0.5" />
                <span>
                  <strong>{platformLabel[e.platform]}:</strong> {e.message}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── Empty State ─────────────────────────────────── */}
        {posts.length === 0 && !syncing && (
          <div className="text-center py-20 border border-dashed border-[#E5E5EA] rounded-lg bg-white/50">
            <ChartBarIcon className="size-10 text-[#C5C5C5] mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
            <p className="text-sm text-[#999] mb-6">
              Click &quot;Sync Posts&quot; to fetch {accountName}&apos;s Twitter
              content.
            </p>
          </div>
        )}

        {/* ── Stats Bar ───────────────────────────────────── */}
        {posts.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <StatBox label="Total Posts" value={String(stats.total)} />
            <StatBox label="Avg Engagement" value={formatNum(stats.avgEng)} />
            <StatBox label="Best Post" value={formatNum(stats.topEng)} />
            <StatBox label="Top Category" value={stats.topCatLabel} />
          </div>
        )}

        {/* ── Analysis Panel ──────────────────────────────── */}
        {analysis && (
          <div className="mb-8 space-y-6">
            {/* Summary */}
            <div className="bg-gradient-to-r from-[#F8F8FF] to-[#F3F3F5] border border-[#E5E5EA] rounded-lg p-5">
              <p className="text-sm text-[#333] leading-relaxed">
                {analysis.summary}
              </p>
            </div>

            {/* Top Performers */}
            {analysis.topPerformers.length > 0 && (
              <div className="bg-white border border-[#E5E5EA] rounded-lg p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrophyIcon className="size-4 text-amber-500" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-[#7A7A7A]">
                    Top Performers
                  </h3>
                </div>
                <div className="space-y-3">
                  {analysis.topPerformers.map((post, i) => (
                    <div
                      key={post.id || i}
                      className="flex items-start gap-3 p-3 bg-[#F7F8FA] rounded-lg"
                    >
                      <span className="text-xs font-bold text-amber-500 mt-0.5 shrink-0">
                        #{i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#333] line-clamp-2 mb-1">
                          {post.content}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-[#A0A0A0]">
                          <PlatformBadge platform={post.platform} />
                          <span>{formatDate(post.post_date)}</span>
                          <span className="flex items-center gap-1">
                            <HeartIcon className="size-3" />
                            {formatNum(post.likes)}
                          </span>
                          <span className="flex items-center gap-1">
                            <ArrowPathRoundedSquareIcon className="size-3" />
                            {formatNum(post.retweets)}
                          </span>
                          <span className="flex items-center gap-1">
                            <ChatBubbleLeftIcon className="size-3" />
                            {formatNum(post.replies)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Patterns + Ideas grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Patterns */}
              {analysis.patterns.length > 0 && (
                <div className="bg-white border border-[#E5E5EA] rounded-lg p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <ChartBarIcon className="size-4 text-blue-500" />
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-[#7A7A7A]">
                      Patterns
                    </h3>
                  </div>
                  <div className="space-y-4">
                    {analysis.patterns.map((pat, i) => (
                      <div key={i}>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-semibold text-[#333]">
                            {pat.title}
                          </h4>
                          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-50 text-blue-600">
                            {patternCategoryLabels[pat.category] ?? pat.category}
                          </span>
                        </div>
                        <p className="text-xs text-[#666] mb-1">
                          {pat.description}
                        </p>
                        <p className="text-[11px] text-[#A0A0A0] italic">
                          {pat.evidence}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Content Ideas */}
              {analysis.contentIdeas.length > 0 && (
                <div className="bg-white border border-[#E5E5EA] rounded-lg p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <LightBulbIcon className="size-4 text-yellow-500" />
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-[#7A7A7A]">
                      Content Ideas
                    </h3>
                  </div>
                  <div className="space-y-4">
                    {analysis.contentIdeas.map((idea, i) => (
                      <div key={i}>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-semibold text-[#333]">
                            {idea.title}
                          </h4>
                          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-green-50 text-green-600">
                            {idea.platform === "both"
                              ? "Both"
                              : platformLabel[idea.platform]}
                          </span>
                        </div>
                        <p className="text-xs text-[#666] mb-1">
                          {idea.description}
                        </p>
                        <p className="text-[11px] text-[#A0A0A0] italic">
                          Based on: {idea.basedOn}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Post Feed ───────────────────────────────────── */}
        {posts.length > 0 && (
          <>
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {/* Category dropdown */}
              <select
                value={categoryFilter}
                onChange={(e) =>
                  setCategoryFilter(e.target.value as ContentCategory | "all")
                }
                className={`${selectClass} !w-auto !py-1.5 !text-xs`}
              >
                <option value="all">All Categories</option>
                {contentCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>

              <div className="flex-1" />

              {/* Sort */}
              <div className="inline-flex rounded-md border border-[#E5E5EA] overflow-hidden">
                {(
                  [
                    { id: "engagement" as const, label: "Top" },
                    { id: "newest" as const, label: "Newest" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setSortMode(opt.id)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      sortMode === opt.id
                        ? "bg-[#1B1B1B] text-white"
                        : "bg-white text-[#7A7A7A] hover:bg-[#F3F3F5]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Post count */}
            <p className="text-xs text-[#A0A0A0] mb-3">
              {filtered.length} post{filtered.length !== 1 ? "s" : ""}
              {platformFilter !== "all" || categoryFilter !== "all"
                ? " (filtered)"
                : ""}
            </p>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((post) => (
                <PostCard key={post.id} post={post} maxEngagement={stats.topEng} />
              ))}
              {filtered.length === 0 && (
                <p className="col-span-full text-center text-sm text-[#A0A0A0] py-8">
                  No posts match current filters.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────── */

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#F3F3F5] border border-[#E5E5EA] rounded-lg px-4 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1">
        {label}
      </div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function PlatformBadge({ platform }: { platform: ContentPlatform }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded ${
        platform === "twitter"
          ? "bg-[#1B1B1B] text-white"
          : "bg-blue-600 text-white"
      }`}
    >
      {platform === "twitter" ? "𝕏" : "in"}
    </span>
  );
}

function PostCard({ post, maxEngagement }: { post: SyncedPost; maxEngagement: number }) {
  const catLabel =
    contentCategories.find((c) => c.id === post.category)?.label ?? post.category;

  // Performance heatmap: ratio of engagement vs best post
  const ratio = maxEngagement > 0 ? post.totalEngagement / maxEngagement : 0;
  const isTopPerformer = ratio > 0.7;
  const isMidPerformer = ratio > 0.3;

  return (
    <div className={`bg-white border rounded-lg p-4 hover:border-[#C5C5C5] transition-colors flex flex-col ${
      isTopPerformer ? "border-emerald-300 ring-1 ring-emerald-100" : isMidPerformer ? "border-[#E5E5EA]" : "border-[#EDEDEF]"
    }`}>
      {/* Top row */}
      <div className="flex items-center gap-1.5 mb-2">
        <PlatformBadge platform={post.platform} />
        <span className="text-[10px] text-[#A0A0A0] flex-1">
          {formatDate(post.post_date)}
        </span>
        {post.post_url && (
          <a
            href={post.post_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#C5C5C5] hover:text-[#1B1B1B] transition-colors"
            title="View original post"
          >
            <LinkIcon className="size-3" />
          </a>
        )}
      </div>

      {/* Content */}
      <p className="text-[13px] text-[#333] line-clamp-4 mb-3 leading-relaxed flex-1">
        {post.content}
      </p>

      {/* Category */}
      <div className="mb-2">
        <span className="px-2 py-0.5 bg-[#F3F3F5] text-[#7A7A7A] text-[10px] font-medium rounded-full">
          {catLabel}
        </span>
      </div>

      {/* Metrics bar */}
      <div className="flex items-center gap-3 text-[11px] text-[#A0A0A0] pt-2 border-t border-[#F3F3F5]">
        <span className="flex items-center gap-1">
          <HeartIcon className="size-3" />
          {formatNum(post.likes)}
        </span>
        <span className="flex items-center gap-1">
          <ArrowPathRoundedSquareIcon className="size-3" />
          {formatNum(post.retweets)}
        </span>
        <span className="flex items-center gap-1">
          <ChatBubbleLeftIcon className="size-3" />
          {formatNum(post.replies)}
        </span>
        {isTopPerformer && (
          <TrophyIcon className="size-3 text-amber-400 ml-auto" title="Top performer" />
        )}
      </div>
    </div>
  );
}
