import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

const SYSTEM_PROMPT = `You are a content strategist for Ecom Landers, an ecommerce CRO and landing page agency. You plan weekly content calendars optimised for maximum reach and authority.

The content workflow: every idea starts as an X (Twitter) post — short, punchy take. The team repurposes each to LinkedIn, Instagram, and TikTok after. So generate X-first angles.

CRITICAL RULES:
- EXACTLY 3 posts per day, 7 days = EXACTLY 21 posts total. NOT MORE. Never exceed 3 per day.
- Spread EVENLY across all 7 days
- Place each post at the optimal time for that specific day based on analytics data
- Match content types to the days they perform best on
- Every idea must be a specific angle — not a topic. Someone should be able to write the tweet in 60 seconds
- No generic filler like "share a tip" or "post about growth"
- Reference real CRO patterns, landing page strategies, A/B tests, DTC brand teardowns, agency behind-the-scenes
- Content mix across the week: educational (40-50%), social proof (20-30%), personal (15-20%), promotional (under 10%)
- Vary formats: mostly text, but include 4-5 image posts and 3 article posts across the week
- No emojis
- Space posts throughout the day — morning, midday, afternoon/evening slots
- The JSON array MUST have EXACTLY 21 items. If you return more, the system will reject it.`;

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

    const prompt = `Fill the week of ${weekDates[0]} (Monday) to ${weekDates[6]} (Sunday) with EXACTLY 3 content ideas PER DAY.

That means EXACTLY 21 posts total (3 per day x 7 days). Do NOT exceed 3 per day or 21 total.

Optimal posting slots (from analytics — higher score = better engagement):
${JSON.stringify(optimalSlots?.map((s: any) => ({ ...s, time: `${String(s.hour).padStart(2, "0")}:${String(s.minute ?? 0).padStart(2, "0")}` })), null, 2)}

IMPORTANT: Use the analytics times as a starting point but vary each post's time by a few minutes so nothing lands at the same time. Posts should feel naturally scheduled — use any minute value, not just :00, :15, :30, :45. Examples: "08:23", "12:36", "17:08", "09:41", "18:52", "07:38".
For days/platforms not in the analytics data, pick realistic times across the day. Spread posts so there's at least 2 hours between them on the same day.
Never schedule two posts at the exact same time on the same day.

${pastPerformance ? `Past performance insights:
- Top content types: ${pastPerformance.topContentTypes || "N/A"}
- Best days: ${pastPerformance.topDays || "N/A"}
- Avg engagement score: ${pastPerformance.avgScore || "N/A"}
- High-performing angles: ${pastPerformance.recentCaptions || "N/A"}` : "No past data — use best practices."}

Already scheduled: ${existingPosts?.length || 0} posts${existingPosts?.length > 0 ? ` — avoid clashing with these:\n${existingPosts.map((p: any) => `  ${p.scheduled_date} ${p.scheduled_time}`).join("\n")}` : ""}

Here are the 7 days to fill:
${weekDates.map((d: string, i: number) => `  ${["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i]}: ${d}`).join("\n")}

Generate EXACTLY 3 ideas for EACH of the 7 days. Return ONLY a JSON array with EXACTLY 21 items:
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
      max_tokens: 4000,
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

    const allDrafts = JSON.parse(jsonMatch[0]);

    // Hard cap: max 3 posts per day, no matter what the AI returns
    const perDay: Record<string, any[]> = {};
    for (const d of allDrafts) {
      const date = d.scheduled_date;
      if (!perDay[date]) perDay[date] = [];
      if (perDay[date].length < 3) perDay[date].push(d);
    }
    const drafts = Object.values(perDay).flat();

    return NextResponse.json({ drafts });
  } catch (err: any) {
    console.error("Weekly draft generation error:", err);
    return NextResponse.json(
      { error: err?.message || "Weekly draft generation failed" },
      { status: 500 }
    );
  }
}
