import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const BEARER = process.env.X_BEARER_TOKEN || "";
const BASE = "https://api.x.com/2";
const CACHE_KEY_PREFIX = "x-analytics-";

const ACCOUNTS = [
  { username: "dylanevxns", id: "1654424976382935040", owner: "dylan" },
  { username: "1ajaay", id: "1298346990464577538", owner: "ajay" },
];

async function xFetch(url: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${BEARER}` },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.detail || err?.title || `X API ${res.status}`);
  }
  return res.json();
}

/** Fetch all tweets with pagination (up to 500 tweets / 90 days) */
async function fetchAllTweets(userId: string) {
  const allTweets: any[] = [];
  let nextToken: string | undefined;
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  let pages = 0;

  do {
    const url = `${BASE}/users/${userId}/tweets?max_results=100&tweet.fields=public_metrics,created_at&exclude=retweets,replies&start_time=${ninetyDaysAgo}${nextToken ? `&pagination_token=${nextToken}` : ""}`;
    const data = await xFetch(url);
    if (data.data) allTweets.push(...data.data);
    nextToken = data.meta?.next_token;
    pages++;
  } while (nextToken && pages < 5); // Max 5 pages = 500 tweets

  return allTweets;
}

/** Get cached data from Supabase */
async function getCached(owner: string) {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data } = await supabase
      .from("social_snapshots")
      .select("data, created_at")
      .eq("id", CACHE_KEY_PREFIX + owner)
      .limit(1);
    if (data?.[0]) return data[0];
  } catch { /* ignore */ }
  return null;
}

/** Save to Supabase cache */
async function setCache(owner: string, payload: any) {
  if (!isSupabaseConfigured()) return;
  try {
    await supabase.from("social_snapshots").upsert({
      id: CACHE_KEY_PREFIX + owner,
      data: payload,
      created_at: new Date().toISOString(),
    });
  } catch { /* ignore */ }
}

function mapTweet(t: any) {
  const m = t.public_metrics || {};
  const engagement = (m.like_count || 0) + (m.retweet_count || 0) + (m.reply_count || 0) + (m.quote_count || 0);
  return {
    id: t.id,
    text: t.text,
    created_at: t.created_at,
    impressions: m.impression_count || 0,
    likes: m.like_count || 0,
    retweets: m.retweet_count || 0,
    replies: m.reply_count || 0,
    quotes: m.quote_count || 0,
    bookmarks: m.bookmark_count || 0,
    engagement,
    engagementRate: m.impression_count > 0 ? (engagement / m.impression_count * 100) : 0,
    // Extract hook (first line/sentence)
    hook: (t.text || "").split(/[.\n!?]/)[0].trim().slice(0, 100),
  };
}

function computeStats(tweets: any[]) {
  const totalImpressions = tweets.reduce((s, t) => s + t.impressions, 0);
  const totalEngagement = tweets.reduce((s, t) => s + t.engagement, 0);
  const avgEngRate = totalImpressions > 0 ? (totalEngagement / totalImpressions * 100) : 0;
  const topTweet = [...tweets].sort((a, b) => b.impressions - a.impressions)[0] || null;

  // Weekly engagement data for chart
  const weeklyData: Record<string, { week: string; impressions: number; engagement: number; tweets: number; likes: number }> = {};
  tweets.forEach((t) => {
    const d = new Date(t.created_at);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().split("T")[0];
    if (!weeklyData[key]) weeklyData[key] = { week: key, impressions: 0, engagement: 0, tweets: 0, likes: 0 };
    weeklyData[key].impressions += t.impressions;
    weeklyData[key].engagement += t.engagement;
    weeklyData[key].likes += t.likes;
    weeklyData[key].tweets += 1;
  });
  const chartData = Object.values(weeklyData).sort((a, b) => a.week.localeCompare(b.week));

  // Top hooks (by engagement rate, min 100 impressions)
  const topHooks = [...tweets]
    .filter((t) => t.impressions >= 100 && t.hook.length > 10)
    .sort((a, b) => b.engagementRate - a.engagementRate)
    .slice(0, 10)
    .map((t) => ({ hook: t.hook, engagementRate: t.engagementRate, impressions: t.impressions, likes: t.likes }));

  // Posting frequency by day of week
  const dayFreq = [0, 0, 0, 0, 0, 0, 0];
  const dayEngagement = [0, 0, 0, 0, 0, 0, 0];
  const dayCount = [0, 0, 0, 0, 0, 0, 0];
  tweets.forEach((t) => {
    const day = new Date(t.created_at).getDay();
    dayFreq[day]++;
    dayEngagement[day] += t.engagementRate;
    dayCount[day]++;
  });
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const postingPattern = dayNames.map((name, i) => ({
    day: name,
    posts: dayFreq[i],
    avgEngagement: dayCount[i] > 0 ? Math.round(dayEngagement[i] / dayCount[i] * 100) / 100 : 0,
  }));

  // Best posting hour
  const hourFreq: Record<number, { count: number; totalEng: number }> = {};
  tweets.forEach((t) => {
    const hour = new Date(t.created_at).getHours();
    if (!hourFreq[hour]) hourFreq[hour] = { count: 0, totalEng: 0 };
    hourFreq[hour].count++;
    hourFreq[hour].totalEng += t.engagementRate;
  });
  const bestHour = Object.entries(hourFreq)
    .map(([h, v]) => ({ hour: parseInt(h), avgEng: v.count > 0 ? v.totalEng / v.count : 0, posts: v.count }))
    .sort((a, b) => b.avgEng - a.avgEng)[0] || null;

  return {
    totalTweets: tweets.length,
    totalImpressions,
    totalEngagement,
    avgEngagementRate: Math.round(avgEngRate * 100) / 100,
    avgImpressions: tweets.length > 0 ? Math.round(totalImpressions / tweets.length) : 0,
    avgLikes: tweets.length > 0 ? Math.round(tweets.reduce((s, t) => s + t.likes, 0) / tweets.length) : 0,
    topTweet,
    chartData,
    topHooks,
    postingPattern,
    bestHour,
  };
}

export async function GET(req: NextRequest) {
  const owner = req.nextUrl.searchParams.get("owner") || "dylan";
  const refresh = req.nextUrl.searchParams.get("refresh") === "true";

  try {
    // Check cache first (unless forced refresh)
    if (!refresh) {
      const cached = await getCached(owner);
      if (cached?.data) {
        const cacheAge = Date.now() - new Date(cached.created_at).getTime();
        // Cache valid for 6 hours
        if (cacheAge < 6 * 60 * 60 * 1000) {
          return NextResponse.json({ ...cached.data, fromCache: true });
        }
      }
    }

    const account = ACCOUNTS.find((a) => a.owner === owner) || ACCOUNTS[0];

    // Fetch profile
    const profileData = await xFetch(
      `${BASE}/users/by/username/${account.username}?user.fields=public_metrics,description,profile_image_url,created_at`
    );
    const user = profileData.data;
    const metrics = user?.public_metrics || {};

    // Fetch all tweets (paginated, 90 days)
    const rawTweets = await fetchAllTweets(account.id);
    const tweets = rawTweets.map(mapTweet);
    const stats = computeStats(tweets);

    const payload = {
      profile: {
        name: user?.name || "",
        username: user?.username || "",
        bio: user?.description || "",
        avatar: user?.profile_image_url || "",
        followers: metrics.followers_count || 0,
        following: metrics.following_count || 0,
        tweetCount: metrics.tweet_count || 0,
        createdAt: user?.created_at || "",
      },
      tweets,
      stats,
      owner,
      scrapedAt: new Date().toISOString(),
    };

    // Cache to Supabase
    await setCache(owner, payload);

    return NextResponse.json(payload);
  } catch (err: any) {
    // On error, try serving from cache
    const cached = await getCached(owner);
    if (cached?.data) {
      return NextResponse.json({ ...cached.data, fromCache: true, cacheNote: "Live fetch failed, serving cached data" });
    }
    return NextResponse.json({ error: err?.message || "Failed to fetch X data" }, { status: 500 });
  }
}
