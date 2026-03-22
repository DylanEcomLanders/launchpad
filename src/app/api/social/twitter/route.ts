import { NextRequest, NextResponse } from "next/server";

const BEARER = process.env.X_BEARER_TOKEN || "";
const BASE = "https://api.x.com/2";

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

export async function GET(req: NextRequest) {
  const owner = req.nextUrl.searchParams.get("owner") || "dylan";

  try {
    const account = ACCOUNTS.find((a) => a.owner === owner) || ACCOUNTS[0];

    // Fetch profile
    const profileData = await xFetch(
      `${BASE}/users/by/username/${account.username}?user.fields=public_metrics,description,profile_image_url,created_at`
    );
    const user = profileData.data;
    const metrics = user?.public_metrics || {};

    // Fetch recent tweets (exclude retweets and replies)
    const tweetsData = await xFetch(
      `${BASE}/users/${account.id}/tweets?max_results=100&tweet.fields=public_metrics,created_at&exclude=retweets,replies`
    );
    const tweets = (tweetsData.data || []).map((t: any) => {
      const m = t.public_metrics || {};
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
        engagement: (m.like_count || 0) + (m.retweet_count || 0) + (m.reply_count || 0) + (m.quote_count || 0),
        engagementRate: m.impression_count > 0
          ? (((m.like_count || 0) + (m.retweet_count || 0) + (m.reply_count || 0) + (m.quote_count || 0)) / m.impression_count * 100)
          : 0,
      };
    });

    // Calculate aggregate stats
    const totalImpressions = tweets.reduce((s: number, t: any) => s + t.impressions, 0);
    const totalEngagement = tweets.reduce((s: number, t: any) => s + t.engagement, 0);
    const avgEngRate = totalImpressions > 0 ? (totalEngagement / totalImpressions * 100) : 0;
    const topTweet = [...tweets].sort((a: any, b: any) => b.impressions - a.impressions)[0] || null;

    return NextResponse.json({
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
      stats: {
        totalTweets: tweets.length,
        totalImpressions,
        totalEngagement,
        avgEngagementRate: Math.round(avgEngRate * 100) / 100,
        avgImpressions: tweets.length > 0 ? Math.round(totalImpressions / tweets.length) : 0,
        avgLikes: tweets.length > 0 ? Math.round(tweets.reduce((s: number, t: any) => s + t.likes, 0) / tweets.length) : 0,
        topTweet,
      },
      owner,
      scrapedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to fetch X data" }, { status: 500 });
  }
}
