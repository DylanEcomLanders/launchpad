"use client";

import { useState, useEffect } from "react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from "recharts";

type Tweet = {
  id: string; text: string; created_at: string; impressions: number; likes: number;
  retweets: number; replies: number; engagement: number; engagementRate: number; hook: string;
};
type Profile = { name: string; username: string; bio: string; avatar: string; followers: number; following: number; tweetCount: number };
type ChartPoint = { week: string; impressions: number; engagement: number; tweets: number; likes: number };
type HookData = { hook: string; engagementRate: number; impressions: number; likes: number };
type DayPattern = { day: string; posts: number; avgEngagement: number };
type Stats = {
  totalTweets: number; totalImpressions: number; totalEngagement: number; avgEngagementRate: number;
  avgImpressions: number; avgLikes: number; topTweet: Tweet | null;
  chartData: ChartPoint[]; topHooks: HookData[]; postingPattern: DayPattern[];
  bestHour: { hour: number; avgEng: number; posts: number } | null;
};
type SortKey = "impressions" | "likes" | "engagementRate" | "created_at";
type ChartMetric = "impressions" | "engagement" | "likes" | "tweets";

const fmt = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString();
const fmtWeek = (w: string) => { const d = new Date(w + "T00:00:00"); return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }); };

export default function SocialAnalyticsPage() {
  const [owner, setOwner] = useState<"dylan" | "ajay">("dylan");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("impressions");
  const [chartMetric, setChartMetric] = useState<ChartMetric>("impressions");
  const [lastFetched, setLastFetched] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [analysing, setAnalysing] = useState(false);

  const runAnalysis = async () => {
    if (!tweets.length || !profile || !stats) return;
    setAnalysing(true);
    try {
      const res = await fetch("/api/social/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tweets, profile, stats }),
      });
      if (res.ok) {
        const data = await res.json();
        setAnalysis(data.analysis);
      }
    } catch { /* silent */ }
    setAnalysing(false);
  };

  const fetchData = async (o: string, refresh = false) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/social/twitter?owner=${o}${refresh ? "&refresh=true" : ""}`);
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      setProfile(data.profile);
      setTweets(data.tweets);
      setStats(data.stats);
      setLastFetched(data.scrapedAt);
      setFromCache(!!data.fromCache);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(owner); }, [owner]);

  const sortedTweets = [...tweets].sort((a, b) => {
    if (sortBy === "created_at") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    return (b as any)[sortBy] - (a as any)[sortBy];
  });

  const chartMetricLabels: Record<ChartMetric, string> = { impressions: "Views", engagement: "Engagement", likes: "Likes", tweets: "Posts" };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Social Analytics</h1>
          <p className="text-xs text-[#AAA] mt-0.5">
            {lastFetched ? `${fromCache ? "Cached · " : ""}Last scraped ${new Date(lastFetched).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : "Loading..."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-[#F3F3F5] rounded-lg p-0.5">
            {(["dylan", "ajay"] as const).map((o) => (
              <button key={o} onClick={() => setOwner(o)} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors capitalize ${owner === o ? "bg-white text-[#1A1A1A] shadow-sm" : "text-[#777]"}`}>{o}</button>
            ))}
          </div>
          <button onClick={() => fetchData(owner, true)} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-[#777] border border-[#E5E5EA] rounded-lg hover:bg-[#F5F5F5] disabled:opacity-30 whitespace-nowrap">
            <ArrowPathIcon className={`size-3.5 shrink-0 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-xs text-red-600">{error}</p></div>}
      {loading && !profile && <div className="flex items-center justify-center py-20"><div className="animate-spin size-6 border-2 border-[#E5E5EA] border-t-[#1A1A1A] rounded-full" /></div>}

      {profile && stats && (
        <>
          {/* Profile bar + stats */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex items-center gap-3 flex-1">
              {profile.avatar && <img src={profile.avatar.replace("_normal", "_200x200")} alt="" className="size-11 rounded-full" />}
              <div>
                <p className="text-sm font-bold">{profile.name}</p>
                <p className="text-[10px] text-[#AAA]">@{profile.username} · {fmt(profile.followers)} followers</p>
              </div>
            </div>
            <div className="flex gap-3">
              {[
                { label: "Avg Views", value: fmt(stats.avgImpressions) },
                { label: "Avg Likes", value: String(stats.avgLikes) },
                { label: "Eng Rate", value: `${stats.avgEngagementRate}%` },
                { label: "Tweets (90d)", value: String(stats.totalTweets) },
              ].map((s) => (
                <div key={s.label} className="border border-[#E8E8E8] rounded-lg px-3 py-2 min-w-[80px]">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-[#AAA]">{s.label}</p>
                  <p className="text-lg font-bold tabular-nums">{s.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Chart */}
          {stats.chartData.length > 1 && (
            <div className="border border-[#E8E8E8] rounded-xl p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold text-[#1A1A1A]">Weekly Performance</p>
                <div className="flex gap-1">
                  {(["impressions", "engagement", "likes", "tweets"] as ChartMetric[]).map((m) => (
                    <button key={m} onClick={() => setChartMetric(m)} className={`px-2 py-1 text-[9px] font-semibold uppercase rounded transition-colors ${chartMetric === m ? "bg-[#1A1A1A] text-white" : "text-[#AAA] hover:text-[#1A1A1A]"}`}>
                      {chartMetricLabels[m]}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={stats.chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                  <XAxis dataKey="week" tickFormatter={fmtWeek} tick={{ fontSize: 10, fill: "#AAA" }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmt} tick={{ fontSize: 10, fill: "#AAA" }} axisLine={false} tickLine={false} width={45} />
                  <Tooltip
                    contentStyle={{ fontSize: 11, border: "1px solid #E8E8E8", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
                    labelFormatter={(label: any) => fmtWeek(String(label))}
                    formatter={(v: any) => [fmt(Number(v)), chartMetricLabels[chartMetric]]}
                  />
                  <Line type="monotone" dataKey={chartMetric} stroke="#1A1A1A" strokeWidth={2} dot={{ r: 3, fill: "#1A1A1A" }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Insights row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Top Hooks */}
            <div className="md:col-span-2 border border-[#E8E8E8] rounded-xl p-4">
              <p className="text-xs font-semibold text-[#1A1A1A] mb-3">Top Hooks</p>
              <div className="space-y-2">
                {stats.topHooks.slice(0, 7).map((h, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-[10px] text-[#CCC] font-bold tabular-nums w-4 shrink-0">{i + 1}</span>
                    <p className="text-xs text-[#333] flex-1 truncate">{h.hook}</p>
                    <span className={`text-[10px] font-semibold tabular-nums shrink-0 ${h.engagementRate >= 5 ? "text-emerald-600" : h.engagementRate >= 2 ? "text-amber-600" : "text-[#AAA]"}`}>
                      {h.engagementRate.toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-[#CCC] tabular-nums shrink-0">{fmt(h.impressions)} views</span>
                  </div>
                ))}
                {stats.topHooks.length === 0 && <p className="text-xs text-[#CCC]">Not enough data yet</p>}
              </div>
            </div>

            {/* Posting Pattern */}
            <div className="border border-[#E8E8E8] rounded-xl p-4">
              <p className="text-xs font-semibold text-[#1A1A1A] mb-3">Best Days</p>
              <div className="space-y-1.5">
                {stats.postingPattern.sort((a, b) => b.avgEngagement - a.avgEngagement).map((d) => (
                  <div key={d.day} className="flex items-center justify-between">
                    <span className="text-xs text-[#555] w-8">{d.day}</span>
                    <div className="flex-1 mx-2 h-2 bg-[#F5F5F5] rounded-full overflow-hidden">
                      <div className="h-full bg-[#1A1A1A] rounded-full" style={{ width: `${Math.min(100, (d.avgEngagement / Math.max(...stats.postingPattern.map(p => p.avgEngagement), 1)) * 100)}%` }} />
                    </div>
                    <span className="text-[10px] text-[#AAA] tabular-nums w-10 text-right">{d.avgEngagement}%</span>
                  </div>
                ))}
              </div>
              {stats.bestHour && (
                <div className="mt-3 pt-3 border-t border-[#F0F0F0]">
                  <p className="text-[10px] text-[#AAA]">Best time to post</p>
                  <p className="text-sm font-bold">{stats.bestHour.hour}:00 — {stats.bestHour.hour + 1}:00</p>
                  <p className="text-[10px] text-[#CCC]">{stats.bestHour.avgEng.toFixed(1)}% avg eng · {stats.bestHour.posts} posts</p>
                </div>
              )}
            </div>
          </div>

          {/* AI Content Analysis */}
          <div className="border border-[#E8E8E8] rounded-xl mb-6 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#F0F0F0]">
              <p className="text-xs font-semibold text-[#1A1A1A]">Content Intelligence</p>
              <button
                onClick={runAnalysis}
                disabled={analysing || !tweets.length}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium bg-[#1A1A1A] text-white rounded-lg hover:bg-[#2D2D2D] disabled:opacity-30"
              >
                {analysing ? (
                  <><ArrowPathIcon className="size-3 animate-spin" /> Analysing...</>
                ) : analysis ? "Re-analyse" : "Analyse Content"}
              </button>
            </div>

            {analysing && (
              <div className="px-4 py-8 text-center">
                <div className="animate-spin size-5 border-2 border-[#E5E5EA] border-t-[#1A1A1A] rounded-full mx-auto mb-2" />
                <p className="text-xs text-[#AAA]">Analysing {tweets.length} tweets...</p>
              </div>
            )}

            {analysis && !analysing && (
              <div className="p-4 space-y-5">
                {/* Key Insight */}
                {analysis.keyInsight && (
                  <div className="bg-[#FAFAFA] rounded-lg px-4 py-3">
                    <p className="text-xs font-semibold text-[#1A1A1A] mb-1">Key Insight</p>
                    <p className="text-sm text-[#555] leading-relaxed">{analysis.keyInsight}</p>
                  </div>
                )}

                {/* Content Themes */}
                {analysis.themes?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-2">Content Themes</p>
                    <div className="space-y-2">
                      {analysis.themes.map((t: any, i: number) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b border-[#F5F5F5] last:border-0">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-medium text-[#1A1A1A]">{t.theme}</span>
                            <span className="text-[9px] text-[#CCC]">{t.count} posts</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-[10px] font-semibold ${t.avgEngagement >= 4 ? "text-emerald-600" : t.avgEngagement >= 2 ? "text-amber-600" : "text-[#AAA]"}`}>
                              {typeof t.avgEngagement === "number" ? `${t.avgEngagement.toFixed(1)}%` : t.avgEngagement}
                            </span>
                            <span className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-full ${
                              t.verdict === "keep posting" ? "bg-emerald-50 text-emerald-600" :
                              t.verdict === "reduce" ? "bg-red-50 text-red-500" :
                              "bg-amber-50 text-amber-600"
                            }`}>{t.verdict}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hook Patterns */}
                {analysis.hookPatterns?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-2">Hook Patterns That Work</p>
                    <div className="space-y-2">
                      {analysis.hookPatterns.map((h: any, i: number) => (
                        <div key={i} className="bg-[#FAFAFA] rounded-lg px-3 py-2.5">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-semibold text-[#1A1A1A]">{h.pattern}</p>
                            <span className="text-[10px] text-emerald-600 font-semibold">{typeof h.avgEngagement === "number" ? `${h.avgEngagement.toFixed(1)}%` : h.avgEngagement}</span>
                          </div>
                          <p className="text-[10px] text-[#777] italic mb-1">&ldquo;{h.example}&rdquo;</p>
                          <p className="text-[10px] text-[#AAA]">{h.tip}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Content Gaps */}
                  {analysis.contentGaps?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-2">Content Gaps</p>
                      <div className="space-y-1.5">
                        {analysis.contentGaps.map((g: string, i: number) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="text-amber-500 text-xs mt-0.5">○</span>
                            <p className="text-xs text-[#555]">{g}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Next Posts */}
                  {analysis.nextPosts?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-2">Post Ideas</p>
                      <div className="space-y-1.5">
                        {analysis.nextPosts.map((p: string, i: number) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="text-emerald-500 text-xs mt-0.5">→</span>
                            <p className="text-xs text-[#555]">{p}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!analysis && !analysing && (
              <div className="px-4 py-6 text-center">
                <p className="text-xs text-[#CCC]">Hit &ldquo;Analyse Content&rdquo; to get AI-powered content strategy insights</p>
              </div>
            )}
          </div>

          {/* Tweet Table */}
          <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#AAA]">All Tweets ({tweets.length})</h2>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} className="text-[10px] text-[#777] border border-[#E5E5EA] rounded px-2 py-1">
                <option value="impressions">Sort by Views</option>
                <option value="likes">Sort by Likes</option>
                <option value="engagementRate">Sort by Engagement</option>
                <option value="created_at">Sort by Date</option>
              </select>
            </div>
            <div className="border border-[#E5E5EA] rounded-xl overflow-x-auto">
              <div className="grid grid-cols-[1fr_70px_50px_50px_60px] gap-2 px-4 py-2 bg-[#FAFAFA] border-b border-[#E5E5EA] text-[10px] font-semibold uppercase tracking-wider text-[#AAA] min-w-[500px]">
                <span>Tweet</span>
                <span className="text-right">Views</span>
                <span className="text-right">Likes</span>
                <span className="text-right">RTs</span>
                <span className="text-right">Eng %</span>
              </div>
              <div className="max-h-[500px] overflow-y-auto">
                {sortedTweets.map((t) => {
                  const date = new Date(t.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
                  return (
                    <div key={t.id} className="grid grid-cols-[1fr_70px_50px_50px_60px] gap-2 px-4 py-2.5 border-b border-[#EDEDEF] last:border-0 items-center hover:bg-[#FAFAFA] min-w-[500px]">
                      <div className="min-w-0">
                        <p className="text-xs text-[#1A1A1A] line-clamp-1">{t.text}</p>
                        <p className="text-[9px] text-[#CCC]">{date}</p>
                      </div>
                      <p className="text-xs tabular-nums text-right font-medium">{fmt(t.impressions)}</p>
                      <p className="text-xs tabular-nums text-right text-[#555]">{t.likes}</p>
                      <p className="text-xs tabular-nums text-right text-[#555]">{t.retweets}</p>
                      <p className={`text-xs tabular-nums text-right font-medium ${t.engagementRate >= 5 ? "text-emerald-600" : t.engagementRate >= 2 ? "text-amber-600" : "text-[#555]"}`}>
                        {t.engagementRate.toFixed(1)}%
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
