import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

const SYSTEM_PROMPT = `You are a content strategist for Ecom Landers, an ecommerce CRO and landing page agency. You plan weekly content calendars optimised for maximum reach and authority.

The content workflow: every idea starts as an X (Twitter) post — short, punchy take. The team repurposes each to LinkedIn, Instagram, and TikTok after. So generate X-first angles.

Rules:
- Target 3-4 posts PER DAY, 7 days a week (21-28 total posts for the week)
- Spread EVENLY across all 7 days — no day should have fewer than 3 posts
- Place each post at the optimal time for that specific day based on analytics data
- Match content types to the days they perform best on
- Every idea must be a specific angle — not a topic. Someone should be able to write the tweet in 60 seconds
- No generic filler like "share a tip" or "post about growth"
- Reference real CRO patterns, landing page strategies, A/B tests, DTC brand teardowns, agency behind-the-scenes
- Content mix across the week: educational (40-50%), social proof (20-30%), personal (15-20%), promotional (under 10%)
- Vary formats: mostly text, but include 5-8 image posts and AT LEAST 3 article posts across the week (articles are important for authority — aim for 3-4)
- No emojis
- Space posts throughout the day — morning, midday, afternoon/evening slots`;

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

    const prompt = `Fill the week of ${weekDates[0]} (Monday) to ${weekDates[6]} (Sunday) with 3-4 content ideas PER DAY.

That means 21-28 posts total, evenly spread. Every day must have at least 3 posts.

Optimal posting slots (from analytics — higher score = better engagement):
${JSON.stringify(optimalSlots, null, 2)}

Use these slots to place posts at the best times. For days/times not in the analytics data, use these general best times:
- Morning: 08:00-09:00
- Midday: 12:00-13:00
- Afternoon: 15:00-16:00
- Evening: 18:00-19:00

${pastPerformance ? `Past performance insights:
- Top content types: ${pastPerformance.topContentTypes || "N/A"}
- Best days: ${pastPerformance.topDays || "N/A"}
- Avg engagement score: ${pastPerformance.avgScore || "N/A"}
- High-performing angles: ${pastPerformance.recentCaptions || "N/A"}` : "No past data — use best practices."}

Already scheduled: ${existingPosts?.length || 0} posts${existingPosts?.length > 0 ? ` — avoid clashing with these:\n${existingPosts.map((p: any) => `  ${p.scheduled_date} ${p.scheduled_time}`).join("\n")}` : ""}

Here are the 7 days to fill:
${weekDates.map((d: string, i: number) => `  ${["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i]}: ${d}`).join("\n")}

Generate exactly 3-4 ideas for EACH of the 7 days. Return ONLY a JSON array (21-28 items):
[
  {
    "content_type": "educational" | "social_proof" | "personal" | "promotional",
    "post_format": "text" | "image" | "article",
    "scheduled_date": "YYYY-MM-DD",
    "scheduled_time": "HH:mm",
    "angle": "The specific hook in one punchy line",
    "brief": "1-2 sentence expansion of what this post should cover"
  }
]

No other text outside the JSON array.`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
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
