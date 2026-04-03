import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

/**
 * Clean a raw voice note transcript into structured project context.
 * POST { rawTranscript: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { rawTranscript } = await req.json();

    if (!rawTranscript?.trim()) {
      return NextResponse.json({ error: "No transcript provided" }, { status: 400 });
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: `You restructure raw voice note transcripts (typically from sales calls or client briefings) into clean, actionable project context for a design/development agency's internal team.

Rules:
- Remove filler words, repetition, and verbal tics
- Organise by topic with clear headers
- Use bullet points for action items and requirements
- Keep ALL specific details (names, dates, brand names, URLs, technical requirements)
- STRIP ALL pricing, costs, payment terms, discounts, package prices, and revenue figures — this is for the delivery team, not finance
- Focus on DELIVERABLES: what needs to be built, designed, or changed
- Focus on CONTEXT: client goals, target audience, brand positioning, competitors mentioned
- Focus on REQUIREMENTS: specific functionality, integrations, design preferences, deadlines mentioned
- Be concise but don't lose nuance
- If the speaker mentions preferences or opinions, keep them — they're context
- Format as markdown with ## headers and bullet points
- End with a "## Key Deliverables" section summarising what needs to be produced
- Never add information that wasn't in the original transcript`,
      messages: [{ role: "user", content: `Restructure this voice note transcript into clean, deliverable-focused project context. Remove any mention of pricing or costs:\n\n${rawTranscript}` }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const cleanVersion = textBlock?.type === "text" ? textBlock.text : rawTranscript;

    return NextResponse.json({ cleanVersion });
  } catch (err: any) {
    console.error("Context clean error:", err);
    return NextResponse.json({ error: err?.message || "Failed to clean transcript" }, { status: 500 });
  }
}
