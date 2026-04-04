import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

const SYSTEM_PROMPT = `You are a content strategist for Ecom Landers, an ecommerce CRO and landing page agency. Generate content ideas that position the agency as thought leaders. Focus on actionable CRO insights, landing page teardowns, A/B test learnings, DTC brand analysis, and agency life behind-the-scenes. No generic marketing fluff. Every idea should be specific enough to execute immediately.`;

export async function POST(req: NextRequest) {
  try {
    const { contentMix, gaps, platforms } = await req.json();

    if (!contentMix || !gaps || !platforms) {
      return NextResponse.json(
        { error: "contentMix, gaps, and platforms are required" },
        { status: 400 }
      );
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: `Based on this week's content mix: ${JSON.stringify(contentMix)}, gaps: ${JSON.stringify(gaps)}, active platforms: ${JSON.stringify(platforms)}. Generate 5 content ideas. Return ONLY a JSON array of objects with shape: { "type": "educational"|"social_proof"|"personal"|"promotional", "platform": "linkedin"|"instagram"|"x", "brief": "one line description" }. No other text.`,
      }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const raw = textBlock?.type === "text" ? textBlock.text : "";

    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Failed to parse ideas from response" },
        { status: 500 }
      );
    }

    const ideas: Array<{ type: string; platform: string; brief: string }> = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ ideas });
  } catch (err: any) {
    console.error("Idea generation error:", err);
    return NextResponse.json(
      { error: err?.message || "Idea generation failed" },
      { status: 500 }
    );
  }
}
