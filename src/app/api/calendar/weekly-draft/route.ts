import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

const SYSTEM_PROMPT = `You are a content strategist for Ecom Landers, an ecommerce CRO and landing page agency. You plan weekly content calendars optimised for reach and authority.

The content workflow is: ideas start as X (Twitter) posts first — short, punchy takes. The team then repurposes them to LinkedIn, Instagram, and TikTok. So every idea you generate should be expressed as an X-first angle.

Rules:
- Generate ideas as X posts — each idea is a specific angle, not a topic
- Every brief must be specific enough that someone could write the tweet in 60 seconds
- No generic "share a tip" or "post about X" filler — give the actual angle
- Reference real CRO patterns, landing page strategies, A/B tests, DTC brand analysis, agency life
- Vary content types: educational (40-50%), social proof (20-30%), personal (15-20%), promotional (under 15%)
- Place ideas at optimal time slots based on the analytics provided
- No emojis`;

export async function POST(req: NextRequest) {
  try {
    const {
      weekDates,
      existingPosts,
      pastPerformance,
      optimalSlots,
    } = await req.json();

    if (!weekDates) {
      return NextResponse.json(
        { error: "weekDates is required" },
        { status: 400 }
      );
    }

    const prompt = `Fill the week of ${weekDates[0]} to ${weekDates[6]} with content ideas.

Optimal posting slots (from analytics — score = predicted engagement):
${JSON.stringify(optimalSlots, null, 2)}

${pastPerformance ? `Past performance:
- Top content types: ${pastPerformance.topContentTypes || "N/A"}
- Best days: ${pastPerformance.topDays || "N/A"}
- Avg engagement score: ${pastPerformance.avgScore || "N/A"}
- High-performing angles: ${pastPerformance.recentCaptions || "N/A"}` : "No past data — use best practices."}

Already scheduled: ${existingPosts?.length || 0} posts${existingPosts?.length > 0 ? ` — avoid these slots:\n${existingPosts.map((p: any) => `  ${p.scheduled_date} ${p.scheduled_time} (${p.platform})`).join("\n")}` : ""}

Generate 7-12 content ideas. Every idea starts as an X post. Place them at the best available time slots (X slots preferred, but spread across the week). The team will repurpose each to other platforms after.

Return ONLY a JSON array:
[
  {
    "content_type": "educational" | "social_proof" | "personal" | "promotional",
    "post_format": "text" | "image",
    "scheduled_date": "YYYY-MM-DD",
    "scheduled_time": "HH:mm",
    "angle": "The specific angle/hook in one line",
    "brief": "1-2 sentence expansion of what this post should say"
  }
]

No other text.`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
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

    const drafts = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ drafts });
  } catch (err: any) {
    console.error("Weekly draft generation error:", err);
    return NextResponse.json(
      { error: err?.message || "Weekly draft generation failed" },
      { status: 500 }
    );
  }
}
