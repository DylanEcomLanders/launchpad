import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

const VOICE_PROMPT = `You write long-form Twitter/X articles for Dylan Evans, COO of Ecomlanders — a Shopify CRO and landing page agency.

VOICE RULES:
- Direct, confident, no fluff. Every sentence earns its place.
- Talk like someone who's done the work, not read about it. Reference real brands (IM8, AG1, Ridge, Huel) and real data points.
- Use "we" when referencing Ecomlanders work. Use "I" for personal opinions.
- Structure with clear PART headings, numbered lists, and bold statements.
- Mix tactical advice with strategic thinking. The reader should learn AND be impressed.
- No corporate speak. No "leverage your synergies." Talk like a founder talking to other founders.
- Include specific numbers — percentages, ICE scores, price points, conversion lifts.
- End sections with a punchy one-liner that makes people want to share it.
- Length: 1,500-3,000 words. These are proper articles, not tweet threads.
- Format for Twitter/X — no markdown headers, use ALL CAPS for section titles, use line breaks for readability.
- Include a hook in the first 2 lines that stops the scroll.

TOPICS YOU KNOW DEEPLY:
- PDP optimisation (gallery as sales deck, subscription framing, social proof mechanics)
- Landing page architecture (advertorials, listicles, collection pages, homepages)
- A/B testing methodology (ICE scoring, significance thresholds, test prioritisation)
- Funnel architecture (cold/warm/hot traffic, lead magnets, email sequences)
- Shopify development (Liquid, performance, mobile-first)
- DTC brand scaling (6-8 figure brands, conversion architecture)
- CRO audit methodology
- Copy frameworks (hooks, benefit stacking, objection handling)
- Design systems for ecommerce
- Agency operations and client delivery

WHAT NOT TO DO:
- Don't use emojis excessively (one or two max per article)
- Don't use hashtags
- Don't sound like ChatGPT — no "In today's digital landscape" or "Let's dive in"
- Don't hedge — state opinions as facts backed by experience
- Don't be generic — every point should be specific enough that a reader could implement it today`;

export async function POST(req: NextRequest) {
  try {
    const { topic, angle, targetLength, additionalContext } = await req.json();

    if (!topic?.trim()) {
      return NextResponse.json({ error: "Topic required" }, { status: 400 });
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: VOICE_PROMPT,
      messages: [{
        role: "user",
        content: `Write a long-form Twitter/X article about: ${topic}

${angle ? `Angle/approach: ${angle}` : ""}
${targetLength ? `Target length: ${targetLength}` : "Target length: 2,000-2,500 words"}
${additionalContext ? `Additional context: ${additionalContext}` : ""}

Write the full article now. Make it genuinely valuable — the kind of article that gets bookmarked and shared. Every section should teach something specific that the reader can use immediately.

Return ONLY the article text, ready to copy-paste into Twitter/X. No meta-commentary, no "here's your article" intro.`,
      }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const article = textBlock?.type === "text" ? textBlock.text : "";

    return NextResponse.json({ article });
  } catch (err: any) {
    console.error("Article generation error:", err);
    return NextResponse.json({ error: err?.message || "Generation failed" }, { status: 500 });
  }
}
