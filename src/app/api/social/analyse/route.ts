import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

export async function POST(req: NextRequest) {
  try {
    const { tweets, profile, stats } = await req.json();

    if (!tweets?.length) {
      return NextResponse.json({ error: "No tweets to analyse" }, { status: 400 });
    }

    // Build tweet summary for Claude (keep token count manageable)
    const tweetSummary = tweets
      .slice(0, 100)
      .map((t: any) => `[${t.engagementRate.toFixed(1)}% eng | ${t.impressions} views | ${t.likes} likes] ${t.text.slice(0, 200)}`)
      .join("\n\n");

    const topPerformers = [...tweets]
      .sort((a: any, b: any) => b.engagementRate - a.engagementRate)
      .slice(0, 15)
      .map((t: any) => `[${t.engagementRate.toFixed(1)}% | ${t.impressions} views] ${t.text.slice(0, 200)}`)
      .join("\n\n");

    const bottomPerformers = [...tweets]
      .filter((t: any) => t.impressions >= 50)
      .sort((a: any, b: any) => a.engagementRate - b.engagementRate)
      .slice(0, 10)
      .map((t: any) => `[${t.engagementRate.toFixed(1)}% | ${t.impressions} views] ${t.text.slice(0, 200)}`)
      .join("\n\n");

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: `You are a social media strategist analysing a Twitter/X account's content performance. Give actionable, specific insights based on real data. Be direct and practical — no fluff.

Format your response as JSON with these exact keys:
{
  "themes": [{"theme": "topic/angle name", "avgEngagement": number, "count": number, "verdict": "keep posting" or "reduce" or "experiment more"}],
  "hookPatterns": [{"pattern": "pattern name", "example": "short example", "avgEngagement": number, "tip": "how to use this"}],
  "contentGaps": ["specific topic or angle they should try"],
  "nextPosts": ["specific tweet idea based on what works"],
  "keyInsight": "one sentence summary of the biggest opportunity"
}

Rules:
- Themes: group tweets into 4-6 content themes/angles. Calculate which themes get best engagement.
- Hook patterns: identify 3-5 opening structures that work (question, bold statement, stat, contrarian, story etc)
- Content gaps: 2-3 topics they haven't covered but should based on their niche
- Next posts: 3-4 specific tweet ideas they should post this week
- Be specific to THIS account's data, not generic advice`,
      messages: [{
        role: "user",
        content: `Analyse this X/Twitter account:

PROFILE: ${profile.name} (@${profile.username}) — ${profile.followers} followers
BIO: ${profile.bio}

STATS (last 90 days): ${stats.totalTweets} tweets, ${stats.avgEngagementRate}% avg engagement, ${stats.avgImpressions} avg views

TOP PERFORMING TWEETS:
${topPerformers}

WORST PERFORMING TWEETS:
${bottomPerformers}

ALL RECENT TWEETS:
${tweetSummary}

Analyse the content themes, hook patterns, and give specific recommendations. Return ONLY valid JSON.`,
      }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "No response" }, { status: 500 });
    }

    let jsonStr = textBlock.text.trim();
    if (jsonStr.startsWith("```")) jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");

    const analysis = JSON.parse(jsonStr);
    return NextResponse.json({ analysis });
  } catch (err: any) {
    console.error("Social analysis error:", err);
    return NextResponse.json({ error: err?.message || "Analysis failed" }, { status: 500 });
  }
}
