"use client";

import { useState } from "react";
import { PlusIcon, ArrowPathIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { inputClass, labelClass } from "@/lib/form-styles";

type Platform = "instagram" | "tiktok";

interface ProfileData {
  platform: Platform;
  username: string;
  fullName: string;
  bio: string;
  followers: number;
  following: number;
  posts: number;
  engagementRate: number;
  profilePic: string;
  verified: boolean;
  url: string;
}

interface PostData {
  id: string;
  caption: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  timestamp: string;
  type: string;
  url: string;
  thumbnail: string;
  engagementRate: number;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function parseIgProfile(raw: any): ProfileData {
  return {
    platform: "instagram",
    username: raw.username || "",
    fullName: raw.fullName || raw.full_name || "",
    bio: raw.biography || raw.bio || "",
    followers: raw.followersCount || raw.followers || 0,
    following: raw.followsCount || raw.following || 0,
    posts: raw.postsCount || raw.mediaCount || 0,
    engagementRate: raw.engagementRate || 0,
    profilePic: raw.profilePicUrl || raw.profilePicUrlHD || "",
    verified: raw.verified || false,
    url: `https://instagram.com/${raw.username}`,
  };
}

function parseTtProfile(raw: any): ProfileData {
  const stats = raw.authorMeta || raw.stats || raw;
  return {
    platform: "tiktok",
    username: raw.uniqueId || raw.username || stats.name || "",
    fullName: raw.nickname || stats.nickName || "",
    bio: raw.signature || raw.bio || "",
    followers: stats.fans || stats.followerCount || raw.followers || 0,
    following: stats.following || stats.followingCount || 0,
    posts: stats.video || stats.videoCount || 0,
    engagementRate: 0,
    profilePic: raw.avatarMedium || raw.avatarLarger || "",
    verified: raw.verified || false,
    url: `https://tiktok.com/@${raw.uniqueId || raw.username || ""}`,
  };
}

function parseIgPost(raw: any): PostData {
  const likes = raw.likesCount || raw.likes || 0;
  const comments = raw.commentsCount || raw.comments || 0;
  const owner = raw.ownerUsername || "";
  return {
    id: raw.id || raw.shortCode || "",
    caption: (raw.caption || "").slice(0, 200),
    likes,
    comments,
    shares: 0,
    views: raw.videoViewCount || raw.videoPlayCount || 0,
    timestamp: raw.timestamp || raw.takenAt || "",
    type: raw.type || (raw.isVideo ? "video" : "image"),
    url: raw.url || `https://instagram.com/p/${raw.shortCode}`,
    thumbnail: raw.displayUrl || raw.thumbnailUrl || "",
    engagementRate: raw.ownerFollowers ? ((likes + comments) / raw.ownerFollowers * 100) : 0,
  };
}

function parseTtPost(raw: any): PostData {
  const likes = raw.diggCount || raw.likes || 0;
  const comments = raw.commentCount || raw.comments || 0;
  const shares = raw.shareCount || raw.shares || 0;
  const views = raw.playCount || raw.plays || 0;
  return {
    id: raw.id || "",
    caption: (raw.text || raw.desc || "").slice(0, 200),
    likes,
    comments,
    shares,
    views,
    timestamp: raw.createTimeISO || raw.createTime || "",
    type: "video",
    url: raw.webVideoUrl || raw.url || "",
    thumbnail: raw.videoMeta?.coverUrl || "",
    engagementRate: views > 0 ? ((likes + comments + shares) / views * 100) : 0,
  };
}

export default function SocialIntelPage() {
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [username, setUsername] = useState("");
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [posts, setPosts] = useState<Record<string, PostData[]>>({});
  const [loading, setLoading] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState<string | null>(null);
  const [error, setError] = useState("");

  const scrapeProfile = async () => {
    if (!username.trim()) return;
    setLoading(true);
    setError("");
    try {
      const action = platform === "instagram" ? "instagram-profile" : "tiktok-profile";
      const params = platform === "instagram"
        ? { usernames: [username.trim().replace("@", "")] }
        : { profiles: [username.trim().replace("@", "")] };

      const res = await fetch("/api/apify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, params }),
      });

      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();

      if (data.results?.length > 0) {
        const parsed = platform === "instagram"
          ? data.results.map(parseIgProfile)
          : data.results.map(parseTtProfile);
        setProfiles((prev) => [...parsed, ...prev.filter((p) => !parsed.some((np: ProfileData) => np.username === p.username))]);
      } else {
        setError("No profile found");
      }
    } catch (err: any) {
      setError(err.message || "Scrape failed");
    }
    setLoading(false);
    setUsername("");
  };

  const scrapePosts = async (profile: ProfileData) => {
    setLoadingPosts(profile.username);
    try {
      const action = profile.platform === "instagram" ? "instagram-posts" : "tiktok-posts";
      const params = profile.platform === "instagram"
        ? { username: profile.username, limit: 30 }
        : { profiles: [profile.username], limit: 30 };

      const res = await fetch("/api/apify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, params }),
      });

      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();

      const parsed = profile.platform === "instagram"
        ? (data.results || []).map(parseIgPost)
        : (data.results || []).map(parseTtPost);

      setPosts((prev) => ({ ...prev, [profile.username]: parsed }));
    } catch {
      // silent
    }
    setLoadingPosts(null);
  };

  const removeProfile = (username: string) => {
    setProfiles((prev) => prev.filter((p) => p.username !== username));
    setPosts((prev) => { const n = { ...prev }; delete n[username]; return n; });
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Social Intelligence</h1>
        <p className="text-sm text-[#7A7A7A] mt-1">Scrape and analyse social profiles and content performance</p>
      </div>

      {/* Search */}
      <div className="border border-[#E5E5EA] rounded-xl bg-white p-5 mb-6">
        <div className="flex items-end gap-3">
          <div>
            <label className={labelClass}>Platform</label>
            <div className="flex gap-1">
              {(["instagram", "tiktok"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                    platform === p ? "bg-[#1B1B1B] text-white border-[#1B1B1B]" : "bg-white text-[#777] border-[#E5E5EA]"
                  }`}
                >
                  {p === "instagram" ? "Instagram" : "TikTok"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1">
            <label className={labelClass}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") scrapeProfile(); }}
              className={inputClass}
              placeholder="@username"
            />
          </div>
          <button
            onClick={scrapeProfile}
            disabled={!username.trim() || loading}
            className="flex items-center gap-1.5 px-5 py-2 bg-[#1B1B1B] text-white text-xs font-medium rounded-lg hover:bg-[#2D2D2D] disabled:opacity-30"
          >
            {loading ? <ArrowPathIcon className="size-3.5 animate-spin" /> : <PlusIcon className="size-3.5" />}
            {loading ? "Scraping..." : "Analyse"}
          </button>
        </div>
        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      </div>

      {/* Profiles */}
      {profiles.length > 0 && (
        <div className="space-y-6">
          {profiles.map((profile) => {
            const profilePosts = posts[profile.username] || [];
            const avgLikes = profilePosts.length > 0
              ? Math.round(profilePosts.reduce((s, p) => s + p.likes, 0) / profilePosts.length)
              : 0;
            const avgComments = profilePosts.length > 0
              ? Math.round(profilePosts.reduce((s, p) => s + p.comments, 0) / profilePosts.length)
              : 0;
            const avgEngagement = profilePosts.length > 0
              ? (profilePosts.reduce((s, p) => s + p.engagementRate, 0) / profilePosts.length).toFixed(2)
              : "—";
            const topPost = profilePosts.length > 0
              ? profilePosts.reduce((best, p) => p.likes > best.likes ? p : best, profilePosts[0])
              : null;

            return (
              <div key={profile.username} className="border border-[#E5E5EA] rounded-xl bg-white overflow-hidden">
                {/* Profile header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#F0F0F0]">
                  <div className="flex items-center gap-4">
                    {profile.profilePic && (
                      <img src={profile.profilePic} alt="" className="size-12 rounded-full object-cover bg-[#F0F0F0]" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-[#1A1A1A]">
                          {profile.fullName || profile.username}
                        </p>
                        {profile.verified && <span className="text-blue-500 text-xs">✓</span>}
                        <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                          profile.platform === "instagram" ? "bg-pink-50 text-pink-500" : "bg-cyan-50 text-cyan-600"
                        }`}>
                          {profile.platform}
                        </span>
                      </div>
                      <p className="text-xs text-[#999]">@{profile.username}</p>
                      {profile.bio && <p className="text-xs text-[#777] mt-1 max-w-md line-clamp-2">{profile.bio}</p>}
                    </div>
                  </div>
                  <button onClick={() => removeProfile(profile.username)} className="text-[#CCC] hover:text-red-400">
                    <XMarkIcon className="size-4" />
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-[#F0F0F0] border-b border-[#F0F0F0]">
                  {[
                    { label: "Followers", value: formatNum(profile.followers) },
                    { label: "Following", value: formatNum(profile.following) },
                    { label: "Posts", value: formatNum(profile.posts) },
                    { label: "Avg Likes", value: profilePosts.length ? formatNum(avgLikes) : "—" },
                    { label: "Avg Engagement", value: profilePosts.length ? `${avgEngagement}%` : "—" },
                  ].map((stat) => (
                    <div key={stat.label} className="px-4 py-3 text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA]">{stat.label}</p>
                      <p className="text-lg font-bold text-[#1A1A1A] mt-0.5">{stat.value}</p>
                    </div>
                  ))}
                </div>

                {/* Post analysis */}
                <div className="px-5 py-4">
                  {profilePosts.length === 0 ? (
                    <button
                      onClick={() => scrapePosts(profile)}
                      disabled={loadingPosts === profile.username}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-[#777] border border-[#E5E5EA] rounded-lg hover:bg-[#F5F5F5] disabled:opacity-30"
                    >
                      {loadingPosts === profile.username ? (
                        <><ArrowPathIcon className="size-3.5 animate-spin" /> Scraping posts...</>
                      ) : (
                        <><ArrowPathIcon className="size-3.5" /> Analyse Posts</>
                      )}
                    </button>
                  ) : (
                    <div>
                      {/* Summary stats */}
                      <div className="flex items-center gap-6 mb-4">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA]">
                          {profilePosts.length} posts analysed
                        </p>
                        {topPost && (
                          <p className="text-[10px] text-[#999]">
                            Top post: {formatNum(topPost.likes)} likes
                          </p>
                        )}
                      </div>

                      {/* Post list */}
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {profilePosts
                          .sort((a, b) => b.likes - a.likes)
                          .map((post, i) => (
                          <div key={post.id || i} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-[#FAFAFA] transition-colors">
                            <span className="text-[10px] font-mono text-[#CCC] w-5 shrink-0 mt-1">#{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-[#555] line-clamp-2">{post.caption || "No caption"}</p>
                              <div className="flex items-center gap-4 mt-1.5">
                                <span className="text-[10px] text-[#999]">{formatNum(post.likes)} likes</span>
                                <span className="text-[10px] text-[#999]">{formatNum(post.comments)} comments</span>
                                {post.views > 0 && <span className="text-[10px] text-[#999]">{formatNum(post.views)} views</span>}
                                {post.shares > 0 && <span className="text-[10px] text-[#999]">{formatNum(post.shares)} shares</span>}
                                {post.engagementRate > 0 && (
                                  <span className={`text-[10px] font-semibold ${post.engagementRate > 3 ? "text-emerald-600" : post.engagementRate > 1 ? "text-amber-600" : "text-[#AAA]"}`}>
                                    {post.engagementRate.toFixed(1)}% ER
                                  </span>
                                )}
                              </div>
                            </div>
                            {post.url && (
                              <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#CCC] hover:text-[#1A1A1A] shrink-0">
                                Open
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {profiles.length === 0 && (
        <div className="border-2 border-dashed border-[#E5E5EA] rounded-xl p-12 text-center">
          <p className="text-sm text-[#AAA]">Enter a username to start analysing</p>
          <p className="text-xs text-[#CCC] mt-1">Scrape Instagram and TikTok profiles for follower counts, engagement rates, and post performance</p>
        </div>
      )}
    </div>
  );
}
