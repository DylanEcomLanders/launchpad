import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAccountById, getProfileUrl } from "@/lib/content-database/accounts";
import type { ContentPlatform, ContentCategory } from "@/lib/content-database/types";

// ── Config ──────────────────────────────────────────────────────

export const maxDuration = 120;

const MODEL = "claude-sonnet-4-5-20250929";

// ── Types ───────────────────────────────────────────────────────

export interface ExtractedPost {
  content: string;
  post_url: string;
  post_date: string;
  likes: number;
  retweets: number;
  replies: number;
  category: ContentCategory;
}

interface SyncResponse {
  posts: ExtractedPost[];
  account: string;
  platform: ContentPlatform;
  profileUrl: string;
  error?: string;
}

// ── TwitterAPI.io types ─────────────────────────────────────────

interface TwitterApiTweet {
  type: string;
  id: string;
  url: string;
  text: string;
  retweetCount: number;
  replyCount: number;
  likeCount: number;
  quoteCount: number;
  viewCount: number;
  bookmarkCount: number;
  createdAt: string;
  lang: string;
  isReply: boolean;
  retweeted_tweet?: unknown;
  author: {
    userName: string;
    id: string;
    name: string;
  };
}

interface TwitterApiResponse {
  status: string;
  code: number;
  msg: string;
  data: {
    pin_tweet: TwitterApiTweet | null;
    tweets: TwitterApiTweet[];
  };
  has_next_page: boolean;
  next_cursor: string;
}

// ── Twitter scraper via TwitterAPI.io ────────────────────────────

async function scrapeTwitter(
  handle: string
): Promise<{ posts: ExtractedPost[]; error?: string }> {
  const apiKey = process.env.TWITTER_API_IO_KEY;
  if (!apiKey) {
    return { posts: [], error: "TWITTER_API_IO_KEY not configured" };
  }

  try {
    const allTweets: TwitterApiTweet[] = [];
    let cursor = "";
    const maxPages = 30; // Safety cap — 20 tweets/page × 30 = 600 max
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    let reachedCutoff = false;

    for (let page = 0; page < maxPages; page++) {
      // Free tier: 1 request per 5 seconds
      if (page > 0) await new Promise((r) => setTimeout(r, 5500));

      const params = new URLSearchParams({
        userName: handle,
        includeReplies: "false",
      });
      if (cursor) params.set("cursor", cursor);

      const url = `https://api.twitterapi.io/twitter/user/last_tweets?${params}`;

      console.log(`[twitter] Fetching page ${page + 1} for @${handle}`);

      const res = await fetch(url, {
        headers: { "X-API-Key": apiKey },
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.error(`[twitter] API error (${res.status}):`, errText.slice(0, 300));
        if (allTweets.length === 0) {
          return {
            posts: [],
            error: `Twitter API error (${res.status}): ${errText.slice(0, 200)}`,
          };
        }
        break; // Use whatever we got so far
      }

      const data: TwitterApiResponse = await res.json();
      const tweets = data.data?.tweets ?? [];

      if (tweets.length === 0) break;

      // Filter out retweets and replies, keep only tweets within 90 days
      for (const t of tweets) {
        if (t.retweeted_tweet || t.isReply) continue;

        const tweetDate = new Date(t.createdAt);
        if (tweetDate < cutoffDate) {
          reachedCutoff = true;
          break;
        }
        allTweets.push(t);
      }

      if (reachedCutoff) break;
      if (!data.has_next_page || !data.next_cursor) break;
      cursor = data.next_cursor;
    }

    console.log(`[twitter] Got ${allTweets.length} original tweets for @${handle}`);

    if (allTweets.length === 0) {
      return {
        posts: [],
        error: "No tweets found. The account may be private or empty.",
      };
    }

    // Map to our format + categorise via Claude
    const tweetsForClaude = allTweets.map((t) => ({
      text: t.text.replace(/https?:\/\/t\.co\/\w+/g, "").trim(),
      id: t.id,
      url: t.url,
      date: parseTwitterDate(t.createdAt),
      likes: t.likeCount,
      retweets: t.retweetCount,
      replies: t.replyCount,
    }));

    return { posts: await categorizeTweets(tweetsForClaude, handle) };
  } catch (err) {
    return {
      posts: [],
      error: `Twitter fetch failed: ${err instanceof Error ? err.message : "unknown error"}`,
    };
  }
}

// ── Helpers ─────────────────────────────────────────────────────

function parseTwitterDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
    return d.toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

async function categorizeTweets(
  tweets: {
    text: string;
    id: string;
    url: string;
    date: string;
    likes: number;
    retweets: number;
    replies: number;
  }[],
  handle: string
): Promise<ExtractedPost[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Fallback: return without categories
    return tweets.map((t) => ({
      content: t.text,
      post_url: t.url || `https://x.com/${handle}/status/${t.id}`,
      post_date: t.date,
      likes: t.likes,
      retweets: t.retweets,
      replies: t.replies,
      category: "other" as ContentCategory,
    }));
  }

  const anthropic = new Anthropic({ apiKey });
  const tweetsJson = JSON.stringify(
    tweets.map((t) => ({ id: t.id, text: t.text })),
    null,
    2
  );

  const prompt = `Categorise each tweet into exactly one category.
Categories: "case-study", "insight", "behind-the-scenes", "hot-take", "educational", "promotional", "thread", "other"

Tweets:
${tweetsJson}

Return a JSON object mapping tweet ID to category, e.g.:
{"12345": "insight", "67890": "case-study"}

Return ONLY valid JSON. No markdown, no commentary.`;

  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      message.content[0]?.type === "text" ? message.content[0].text : "";
    let categories: Record<string, string> = {};

    const cleaned = text
      .trim()
      .replace(/^```(?:json)?\n?/, "")
      .replace(/\n?```$/, "");
    const objMatch = cleaned.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try {
        categories = JSON.parse(objMatch[0]);
      } catch {
        /* use defaults */
      }
    }

    return tweets.map((t) => ({
      content: t.text,
      post_url: t.url || `https://x.com/${handle}/status/${t.id}`,
      post_date: t.date,
      likes: t.likes,
      retweets: t.retweets,
      replies: t.replies,
      category: validateCategory(categories[t.id]),
    }));
  } catch {
    return tweets.map((t) => ({
      content: t.text,
      post_url: t.url || `https://x.com/${handle}/status/${t.id}`,
      post_date: t.date,
      likes: t.likes,
      retweets: t.retweets,
      replies: t.replies,
      category: "other" as ContentCategory,
    }));
  }
}

// ── POST handler ────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { accountId, platform } = body as {
      accountId: string;
      platform: ContentPlatform;
    };

    if (!accountId || !platform) {
      return NextResponse.json(
        { error: "Missing accountId or platform" },
        { status: 400 }
      );
    }

    const account = getAccountById(accountId);
    if (!account) {
      return NextResponse.json(
        { error: `Unknown account: ${accountId}` },
        { status: 400 }
      );
    }

    const profileUrl = getProfileUrl(account, platform);
    if (!profileUrl) {
      return NextResponse.json(
        { error: `No ${platform} handle configured for ${account.name}` },
        { status: 400 }
      );
    }

    let result: { posts: ExtractedPost[]; error?: string };

    if (platform === "twitter") {
      result = await scrapeTwitter(account.twitter!);
    } else {
      result = { posts: [], error: "Only Twitter is supported currently." };
    }

    const response: SyncResponse = {
      posts: result.posts,
      account: account.name,
      platform,
      profileUrl,
      error: result.error,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("Content sync error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// ── Category validation ─────────────────────────────────────────

const validCategories: ContentCategory[] = [
  "case-study",
  "insight",
  "behind-the-scenes",
  "hot-take",
  "educational",
  "promotional",
  "thread",
  "other",
];

function validateCategory(cat: unknown): ContentCategory {
  if (
    typeof cat === "string" &&
    validCategories.includes(cat as ContentCategory)
  ) {
    return cat as ContentCategory;
  }
  return "other";
}
