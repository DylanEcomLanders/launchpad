import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

const SYSTEM_PROMPT = `You are a content strategist for Ecom Landers, an ecommerce CRO and landing page agency. You plan weekly content calendars that balance reach, authority, and trust. Every post idea should be specific enough to execute immediately — no generic "share a tip" filler. Reference real CRO patterns, landing page strategies, A/B test learnings, DTC brand analysis, and agency behind-the-scenes.

Rules:
- No emojis in briefs
- Each brief should be 1-2 sentences describing the exact angle
- Vary formats: mix text posts, image posts, and articles across the week
- Keep promotional content under 20% of the total
- Prioritise educational and social proof content
- Assign posts to optimal time slots based on the analytics data provided`;

export async function POST(req: NextRequest) {
  try {
    const {
      weekDates, // array of ISO date strings (Mon-Sun)
      existingPosts, // posts already scheduled this week
      pastPerformance, // { topContentTypes, topPlatforms, topDays, avgScore, recentCaptions }
      optimalSlots, // best time slots by platform
      platforms, // active platforms
    } = await req.json();

    if (!weekDates || !platforms) {
      return NextResponse.json(
        { error: "weekDates and platforms are required" },
        { status: 400 }
      );
    }

    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    const prompt = `Plan a full week of social media content for ${weekDates[0]} to ${weekDates[6]}.

Active platforms: ${platforms.join(", ")}

Optimal posting slots (from analytics):
${JSON.stringify(optimalSlots, null, 2)}

Past performance insights:
${pastPerformance ? `- Top performing content types: ${pastPerformance.topContentTypes || "N/A"}
- Top performing platforms: ${pastPerformance.topPlatforms || "N/A"}
- Best performing days: ${pastPerformance.topDays || "N/A"}
- Average engagement score: ${pastPerformance.avgScore || "N/A"}
- Recent captions that performed well: ${pastPerformance.recentCaptions || "N/A"}` : "No past data available — use best practices."}

Already scheduled this week: ${existingPosts?.length || 0} posts${existingPosts?.length > 0 ? `\n${existingPosts.map((p: any) => `- ${p.platform} ${p.scheduled_date} ${p.scheduled_time}: "${p.caption?.slice(0, 50)}..."`).join("\n")}` : ""}

Generate 7-10 draft posts for the week. Fill the best time slots first. Avoid scheduling on times that already have posts.

Return ONLY a JSON array of objects with this exact shape:
[
  {
    "platform": "linkedin" | "instagram" | "x",
    "content_type": "educational" | "social_proof" | "personal" | "promotional",
    "post_format": "text" | "image" | "article",
    "scheduled_date": "YYYY-MM-DD",
    "scheduled_time": "HH:mm",
    "brief": "1-2 sentence description of the exact post angle",
    "caption_draft": "A full draft caption ready to edit"
  }
]

No other text outside the JSON array.`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const raw = textBlock?.type === "text" ? textBlock.text : "";

    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Failed to parse weekly draft from response" },
        { status: 500 }
      );
    }

    const drafts: Array<{
      platform: string;
      content_type: string;
      post_format: string;
      scheduled_date: string;
      scheduled_time: string;
      brief: string;
      caption_draft: string;
    }> = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ drafts });
  } catch (err: any) {
    console.error("Weekly draft generation error:", err);
    return NextResponse.json(
      { error: err?.message || "Weekly draft generation failed" },
      { status: 500 }
    );
  }
}
