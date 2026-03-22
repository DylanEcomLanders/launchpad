"use client";

import { useState, useEffect } from "react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

type Tweet = {
  id: string;
  text: string;
  created_at: string;
  impressions: number;
  likes: number;
  retweets: number;
  replies: number;
  quotes: number;
  bookmarks: number;
  engagement: number;
  engagementRate: number;
};

type Profile = {
  name: string;
  username: string;
  bio: string;
  avatar: string;
  followers: number;
  following: number;
  tweetCount: number;
};

type Stats = {
  totalTweets: number;
  totalImpressions: number;
  totalEngagement: number;
  avgEngagementRate: number;
  avgImpressions: number;
  avgLikes: number;
  topTweet: Tweet | null;
};

type SortKey = "impressions" | "likes" | "engagementRate" | "created_at";

export default function SocialIntelPage() {
  const [owner, setOwner] = useState<"dylan" | "ajay">("dylan");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("impressions");
  const [lastFetched, setLastFetched] = useState<string | null>(null);

  const fetchData = async (o: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/social/twitter?owner=${o}`);
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      setProfile(data.profile);
      setTweets(data.tweets);
      setStats(data.stats);
      setLastFetched(data.scrapedAt);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData(owner);
  }, [owner]);

  const sortedTweets = [...tweets].sort((a, b) => {
    if (sortBy === "created_at") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    return (b as any)[sortBy] - (a as any)[sortBy];
  });

  const fmt = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString();

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">X / Twitter Analytics</h1>
          <p className="text-sm text-[#7A7A7A] mt-0.5">
            {lastFetched ? `Last updated ${new Date(lastFetched).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : "Loading..."}
          </p>
        </div>
        <div className="flex items-center gap-3">
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
            onClick={() => fetchData(owner)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-[#777] border border-[#E5E5EA] rounded-lg hover:bg-[#F5F5F5] disabled:opacity-30 whitespace-nowrap"
          >
            <ArrowPathIcon className={`size-3.5 shrink-0 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {loading && !profile && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin size-6 border-2 border-[#E5E5EA] border-t-[#1A1A1A] rounded-full" />
        </div>
      )}

      {profile && stats && (
        <>
          {/* Profile + Stats */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 border border-[#E5E5EA] rounded-xl bg-white p-5">
              <div className="flex items-center gap-3 mb-3">
                {profile.avatar && (
                  <img src={profile.avatar.replace("_normal", "_200x200")} alt={profile.name} className="size-12 rounded-full" />
                )}
                <div>
                  <p className="text-sm font-bold text-[#1A1A1A]">{profile.name}</p>
                  <p className="text-xs text-[#AAA]">@{profile.username}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div>
                  <p className="text-xl font-bold tabular-nums">{fmt(profile.followers)}</p>
                  <p className="text-[10px] uppercase tracking-wider text-[#AAA]">Followers</p>
                </div>
                <div>
                  <p className="text-xl font-bold tabular-nums">{fmt(profile.following)}</p>
                  <p className="text-[10px] uppercase tracking-wider text-[#AAA]">Following</p>
                </div>
                <div>
                  <p className="text-xl font-bold tabular-nums">{fmt(profile.tweetCount)}</p>
                  <p className="text-[10px] uppercase tracking-wider text-[#AAA]">Tweets</p>
                </div>
              </div>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-3">
              <div className="border border-[#E5E5EA] rounded-xl px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-1">Avg Views</p>
                <p className="text-xl font-bold tabular-nums">{fmt(stats.avgImpressions)}</p>
              </div>
              <div className="border border-[#E5E5EA] rounded-xl px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-1">Avg Likes</p>
                <p className="text-xl font-bold tabular-nums">{stats.avgLikes}</p>
              </div>
              <div className="border border-[#E5E5EA] rounded-xl px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-1">Eng Rate</p>
                <p className="text-xl font-bold tabular-nums">{stats.avgEngagementRate}%</p>
              </div>
              <div className="border border-[#E5E5EA] rounded-xl px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-1">Total Views</p>
                <p className="text-xl font-bold tabular-nums">{fmt(stats.totalImpressions)}</p>
              </div>
            </div>
          </div>

          {/* Top Tweet */}
          {stats.topTweet && (
            <div className="border border-[#E5E5EA] rounded-xl bg-[#FAFAFA] p-4 mb-6">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-2">Top Performing Tweet</p>
              <p className="text-sm text-[#1A1A1A] leading-relaxed mb-2">{stats.topTweet.text}</p>
              <div className="flex items-center gap-4 text-xs text-[#777]">
                <span>{fmt(stats.topTweet.impressions)} views</span>
                <span>{stats.topTweet.likes} likes</span>
                <span>{stats.topTweet.retweets} RTs</span>
                <span>{stats.topTweet.replies} replies</span>
                <span className="text-emerald-600 font-semibold">{stats.topTweet.engagementRate.toFixed(1)}%</span>
              </div>
            </div>
          )}

          {/* Tweet Table */}
          <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#AAA]">Recent Tweets ({tweets.length})</h2>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                className="text-[10px] text-[#777] border border-[#E5E5EA] rounded px-2 py-1"
              >
                <option value="impressions">Sort by Views</option>
                <option value="likes">Sort by Likes</option>
                <option value="engagementRate">Sort by Engagement</option>
                <option value="created_at">Sort by Date</option>
              </select>
            </div>

            <div className="border border-[#E5E5EA] rounded-xl overflow-x-auto">
              <div className="grid grid-cols-[1fr_80px_60px_60px_60px_70px] gap-2 px-4 py-2 bg-[#FAFAFA] border-b border-[#E5E5EA] text-[10px] font-semibold uppercase tracking-wider text-[#AAA] min-w-[600px]">
                <span>Tweet</span>
                <span className="text-right">Views</span>
                <span className="text-right">Likes</span>
                <span className="text-right">RTs</span>
                <span className="text-right">Replies</span>
                <span className="text-right">Eng %</span>
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                {sortedTweets.map((tweet) => {
                  const date = new Date(tweet.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
                  return (
                    <div key={tweet.id} className="grid grid-cols-[1fr_80px_60px_60px_60px_70px] gap-2 px-4 py-3 border-b border-[#EDEDEF] last:border-0 items-center hover:bg-[#FAFAFA] min-w-[600px]">
                      <div className="min-w-0">
                        <p className="text-xs text-[#1A1A1A] line-clamp-2 leading-relaxed">{tweet.text}</p>
                        <p className="text-[10px] text-[#CCC] mt-0.5">{date}</p>
                      </div>
                      <p className="text-xs tabular-nums text-right text-[#1A1A1A] font-medium">{fmt(tweet.impressions)}</p>
                      <p className="text-xs tabular-nums text-right text-[#555]">{tweet.likes}</p>
                      <p className="text-xs tabular-nums text-right text-[#555]">{tweet.retweets}</p>
                      <p className="text-xs tabular-nums text-right text-[#555]">{tweet.replies}</p>
                      <p className={`text-xs tabular-nums text-right font-medium ${tweet.engagementRate >= 5 ? "text-emerald-600" : tweet.engagementRate >= 2 ? "text-amber-600" : "text-[#555]"}`}>
                        {tweet.engagementRate.toFixed(1)}%
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
