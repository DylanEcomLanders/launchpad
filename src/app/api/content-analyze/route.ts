import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAccountById } from "@/lib/content-database/accounts";
import type { SyncedPost, ContentAnalysis } from "@/lib/content-database/types";

// ── Config ──────────────────────────────────────────────────────

export const maxDuration = 60;

const MODEL = "claude-sonnet-4-5-20250929";
const MAX_TOKENS = 4000;

// ── Helpers ─────────────────────────────────────────────────────

function parseJsonFromText<T>(text: string): T | null {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  // Find JSON object
  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      return JSON.parse(objMatch[0]) as T;
    } catch {
      /* fall through */
    }
  }
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
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
    const { accountId, posts } = body as {
      accountId: string;
      posts: SyncedPost[];
    };

    if (!accountId || !posts || !Array.isArray(posts) || posts.length === 0) {
      return NextResponse.json(
        { error: "Missing accountId or posts array is empty" },
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

    // Sort by engagement to identify top performers
    const sorted = [...posts].sort(
      (a, b) => b.totalEngagement - a.totalEngagement
    );
    const topPerformers = sorted.slice(0, 5);

    const twitterCount = posts.filter((p) => p.platform === "twitter").length;
    const linkedinCount = posts.filter((p) => p.platform === "linkedin").length;

    // ── Claude analysis ──────────────────────────────────────

    const postsJson = JSON.stringify(
      posts.map((p) => ({
        platform: p.platform,
        content: p.content.slice(0, 500),
        post_date: p.post_date,
        likes: p.likes,
        retweets: p.retweets,
        replies: p.replies,
        totalEngagement: p.totalEngagement,
        category: p.category,
      })),
      null,
      2
    );

    const prompt = `You are a social media content strategist. Analyse the following ${posts.length} posts from ${account.name}'s social media (${twitterCount} Twitter, ${linkedinCount} LinkedIn) and return a structured analysis.

Posts data:
${postsJson}

Return a JSON object with exactly this structure:
{
  "summary": "2-3 sentence overview of this person's content strategy, what's working, and main opportunity",
  "patterns": [
    {
      "title": "Short pattern name",
      "description": "What the pattern is and why it matters",
      "evidence": "Specific examples from the posts that prove this pattern",
      "category": "format" | "topic" | "timing" | "engagement"
    }
  ],
  "contentIdeas": [
    {
      "title": "Idea name",
      "description": "What to post and how to structure it",
      "basedOn": "Which pattern or top-performing post inspired this",
      "platform": "twitter" | "linkedin" | "both"
    }
  ]
}

Rules:
- Provide 3-5 patterns, each backed by real evidence from the posts
- Provide 3-5 actionable content ideas that build on what's already working
- Pattern categories: "format" (post structure, length, media), "topic" (subject matter), "timing" (posting schedule), "engagement" (what drives likes/replies/shares)
- Be specific and actionable — no generic advice like "post consistently"
- Reference actual post content as evidence
- Return ONLY valid JSON. No markdown fences, no commentary.`;

    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: "user", content: prompt }],
    });

    const responseText =
      message.content[0]?.type === "text" ? message.content[0].text : "";

    const parsed = parseJsonFromText<{
      summary: string;
      patterns: ContentAnalysis["patterns"];
      contentIdeas: ContentAnalysis["contentIdeas"];
    }>(responseText);

    const analysis: ContentAnalysis = {
      accountId,
      analyzedAt: new Date().toISOString(),
      totalPosts: posts.length,
      platformBreakdown: { twitter: twitterCount, linkedin: linkedinCount },
      topPerformers,
      patterns: parsed?.patterns ?? [],
      contentIdeas: parsed?.contentIdeas ?? [],
      summary:
        parsed?.summary ??
        `Found ${posts.length} posts across ${twitterCount ? "Twitter" : ""}${twitterCount && linkedinCount ? " and " : ""}${linkedinCount ? "LinkedIn" : ""}.`,
    };

    return NextResponse.json(analysis);
  } catch (err) {
    console.error("Content analysis error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
