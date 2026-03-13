import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import * as cheerio from "cheerio";
import { getAccountById, getProfileUrl } from "@/lib/content-database/accounts";
import type { ContentPlatform, ContentCategory } from "@/lib/content-database/types";

// ── Config ──────────────────────────────────────────────────────

export const maxDuration = 60;

const MODEL = "claude-sonnet-4-5-20250929";
const MAX_TOKENS = 8000;
const FETCH_TIMEOUT = 20000;

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

// ── Helpers ─────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, options: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        ...options.headers,
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

function parseJsonFromText(text: string): ExtractedPost[] {
  let cleaned = text.trim();
  // Strip markdown code fences
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  // Find JSON array
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]);
    } catch {
      /* fall through */
    }
  }
  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function extractPageText(html: string): string {
  const $ = cheerio.load(html);
  // Remove scripts, styles, nav, footer
  $("script, style, nav, footer, header, noscript, svg, link, meta").remove();
  // Get text content, collapse whitespace
  const text = $("body").text().replace(/\s+/g, " ").trim();
  return text;
}

// ── POST handler ────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 }
      );
    }

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

    // ── Step 1: Fetch the profile page ──────────────────────────

    let pageText = "";
    let rawHtml = "";

    try {
      const res = await fetchWithTimeout(profileUrl);
      if (!res.ok) {
        return NextResponse.json(
          {
            error: `Failed to fetch profile (${res.status}). The profile may be private or restricted.`,
            posts: [],
            account: account.name,
            platform,
            profileUrl,
          } satisfies SyncResponse,
          { status: 200 }
        );
      }
      rawHtml = await res.text();
      pageText = extractPageText(rawHtml);
    } catch (err) {
      return NextResponse.json(
        {
          error: `Could not reach ${platform === "twitter" ? "Twitter/X" : "LinkedIn"}: ${err instanceof Error ? err.message : "timeout"}`,
          posts: [],
          account: account.name,
          platform,
          profileUrl,
        } satisfies SyncResponse,
        { status: 200 }
      );
    }

    if (pageText.length < 50) {
      return NextResponse.json(
        {
          error:
            "Page returned very little content. The profile may be private, empty, or require login.",
          posts: [],
          account: account.name,
          platform,
          profileUrl,
        } satisfies SyncResponse,
        { status: 200 }
      );
    }

    // ── Step 2: Send to Claude for extraction + analysis ────────

    const handle =
      platform === "twitter" ? account.twitter : account.linkedin;
    const today = new Date().toISOString().slice(0, 10);

    const prompt = `You are analysing a scraped ${platform === "twitter" ? "Twitter/X" : "LinkedIn"} profile page to extract social media posts and understand what content is performing.

Profile: ${account.name} (${platform === "twitter" ? "@" + handle : handle})
URL: ${profileUrl}
Today's date: ${today}

Below is the text content extracted from the page. Extract ALL individual posts you can find authored by this person.

For each post, return a JSON object with:
- "content": Full text of the post (not truncated)
- "post_url": Direct URL to the post. For Twitter: https://x.com/${handle}/status/{tweet_id}. For LinkedIn: the post URL if visible, otherwise empty string.
- "post_date": Date in YYYY-MM-DD format. Convert relative dates ("2h" = ${today}, "3d" = 3 days before ${today}, "Mar 5" = most recent occurrence not in the future).
- "likes": Number of likes/reactions (0 if not visible)
- "retweets": Number of retweets/reposts/shares (0 if not visible)
- "replies": Number of replies/comments (0 if not visible)
- "category": Best-fit from: "case-study", "insight", "behind-the-scenes", "hot-take", "educational", "promotional", "thread", "other"

Rules:
- Only posts authored BY this person — skip pure retweets/reposts without added text
- Skip ads, promoted content, navigation elements, and bio text
- Convert "K" numbers to actual values (1.2K → 1200)
- Return ONLY a valid JSON array. No markdown fences, no commentary.

Page content:
${pageText.slice(0, 80000)}`;

    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: "user", content: prompt }],
    });

    const responseText =
      message.content[0]?.type === "text" ? message.content[0].text : "";

    const posts = parseJsonFromText(responseText);

    // Sanitise
    const sanitised: ExtractedPost[] = posts
      .filter((p) => p.content && p.content.trim().length > 0)
      .map((p) => ({
        content: String(p.content || "").trim(),
        post_url: String(p.post_url || ""),
        post_date: String(p.post_date || today),
        likes: Math.max(0, Number(p.likes) || 0),
        retweets: Math.max(0, Number(p.retweets) || 0),
        replies: Math.max(0, Number(p.replies) || 0),
        category: validateCategory(p.category),
      }));

    const response: SyncResponse = {
      posts: sanitised,
      account: account.name,
      platform,
      profileUrl,
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
