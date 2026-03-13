import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAccountById, getProfileUrl } from "@/lib/content-database/accounts";
import type { ContentPlatform, ContentCategory } from "@/lib/content-database/types";

// ── Config ──────────────────────────────────────────────────────

export const maxDuration = 60;

const MODEL = "claude-sonnet-4-5-20250929";
const MAX_TOKENS = 8000;
const FIRECRAWL_BASE = "https://api.firecrawl.dev/v1";

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

function parseJsonFromText(text: string): ExtractedPost[] {
  // Strip markdown code fences if present
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  // Try to find JSON array in the text
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]);
    } catch {
      // fall through
    }
  }

  // Try parsing the whole thing
  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ── POST handler ────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const firecrawlKey = process.env.FIRECRAWL_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 }
      );
    }
    if (!firecrawlKey) {
      return NextResponse.json(
        { error: "FIRECRAWL_API_KEY not configured" },
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

    // ── Step 1: Scrape with Firecrawl ───────────────────────────

    const firecrawlRes = await fetch(`${FIRECRAWL_BASE}/scrape`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${firecrawlKey}`,
      },
      body: JSON.stringify({
        url: profileUrl,
        formats: ["markdown"],
        waitFor: 5000,
      }),
    });

    if (!firecrawlRes.ok) {
      const errText = await firecrawlRes.text().catch(() => "Unknown error");
      return NextResponse.json(
        {
          error: `Firecrawl scrape failed (${firecrawlRes.status}): ${errText.slice(0, 200)}`,
        },
        { status: 502 }
      );
    }

    const firecrawlData = await firecrawlRes.json();
    const markdown: string =
      firecrawlData?.data?.markdown || firecrawlData?.markdown || "";

    if (!markdown || markdown.length < 100) {
      return NextResponse.json(
        {
          error:
            "Scrape returned very little content. The profile may be private, empty, or blocked.",
          posts: [],
          account: account.name,
          platform,
          profileUrl,
        } satisfies SyncResponse,
        { status: 200 }
      );
    }

    // ── Step 2: Extract posts with Claude ───────────────────────

    const handle =
      platform === "twitter" ? account.twitter : account.linkedin;
    const today = new Date().toISOString().slice(0, 10);

    const extractionPrompt = `You are extracting social media posts from a scraped ${platform === "twitter" ? "Twitter/X" : "LinkedIn"} profile page.

The page belongs to: ${account.name} (${platform === "twitter" ? "@" + handle : handle})
Today's date: ${today}

Extract ALL individual posts you can find from this person. For each post return a JSON object with:
- "content": The full text of the post (include the complete text, not truncated)
- "post_url": Direct URL to the post. For Twitter construct as https://x.com/${handle}/status/{tweet_id} if you can find the ID. For LinkedIn use the post URL if visible, otherwise use an empty string.
- "post_date": Date in YYYY-MM-DD format. Convert relative dates ("2h ago" = today, "3d" = 3 days before ${today}, "Mar 5" = 2025-03-05 or 2026-03-05 whichever is most recent and not in the future).
- "likes": Number of likes/reactions (0 if not visible)
- "retweets": Number of retweets/reposts/shares (0 if not visible)
- "replies": Number of replies/comments (0 if not visible)
- "category": Best-fit category from exactly these options: "case-study", "insight", "behind-the-scenes", "hot-take", "educational", "promotional", "thread", "other"

Rules:
- Only extract posts authored BY ${account.name}, not reposts/retweets of others (unless they added their own text)
- Skip ads, promoted content, and pinned navigation elements
- If engagement numbers show as "K" (e.g. "1.2K"), convert to actual numbers (1200)
- Return ONLY a valid JSON array. No markdown fences. No commentary.

Scraped content:
${markdown.slice(0, 60000)}`;

    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: "user", content: extractionPrompt }],
    });

    const responseText =
      message.content[0]?.type === "text" ? message.content[0].text : "";

    const posts = parseJsonFromText(responseText);

    // Sanitise each post
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
  if (typeof cat === "string" && validCategories.includes(cat as ContentCategory)) {
    return cat as ContentCategory;
  }
  return "other";
}
