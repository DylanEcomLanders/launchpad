import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { VOC_RESEARCH_PROMPT } from "@/lib/copy-audit/training-prompt";

const FIRECRAWL_KEY = process.env.FIRECRAWL_API_KEY || "";
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

/**
 * Scrape Trustpilot + Reddit for Voice of Customer data.
 * POST { brandName: string, productType: string }
 * Returns { vocData: { painPoints, objections, keyPhrases } }
 */
export async function POST(req: NextRequest) {
  try {
    const { brandName, productType } = await req.json();
    if (!brandName) {
      return NextResponse.json({ error: "Brand name required" }, { status: 400 });
    }

    // productType might be a full brief — extract key terms for search
    const briefText = productType || "";
    // Use first 100 chars of brief for search context, or just brand name
    const searchContext = briefText.length > 100
      ? briefText.slice(0, 100).split(/[.\n]/).filter(Boolean)[0] || brandName
      : briefText || brandName;

    const scrapedContent: string[] = [];

    // Scrape Trustpilot
    try {
      const tpUrl = `https://www.trustpilot.com/review/${brandName.toLowerCase().replace(/\s+/g, "")}`;
      const tpRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${FIRECRAWL_KEY}`,
        },
        body: JSON.stringify({
          url: tpUrl,
          formats: ["markdown"],
          waitFor: 3000,
        }),
      });
      if (tpRes.ok) {
        const tpData = await tpRes.json();
        if (tpData.data?.markdown) {
          scrapedContent.push(`=== TRUSTPILOT REVIEWS ===\n${tpData.data.markdown.slice(0, 5000)}`);
        }
      }
    } catch {
      // Trustpilot scrape failed — continue
    }

    // Scrape Reddit
    try {
      const redditSearchUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(brandName + " " + searchContext)}&sort=relevance&limit=10`;
      const redditRes = await fetch(redditSearchUrl, {
        headers: { "User-Agent": "EcomlandersBot/1.0" },
      });
      if (redditRes.ok) {
        const redditData = await redditRes.json();
        const posts = redditData?.data?.children || [];
        const redditContent = posts
          .slice(0, 5)
          .map((p: any) => `[${p.data.subreddit}] ${p.data.title}\n${(p.data.selftext || "").slice(0, 500)}`)
          .join("\n\n");
        if (redditContent) {
          scrapedContent.push(`=== REDDIT DISCUSSIONS ===\n${redditContent}`);
        }
      }
    } catch {
      // Reddit scrape failed — continue
    }

    if (scrapedContent.length === 0) {
      // No scraped data — use Claude to generate VOC insights from its knowledge
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        system: VOC_RESEARCH_PROMPT,
        messages: [
          {
            role: "user",
            content: `Research Voice of Customer data for: ${brandName}

BRIEF CONTEXT:
${briefText || "No brief provided"}

Based on your knowledge of this brand and the product described in the brief, provide VOC insights. Make sure the insights are relevant to the SPECIFIC product described — not other products the brand may sell.

Return ONLY valid JSON:
{
  "painPoints": ["5 customer pain point quotes"],
  "objections": ["5 common customer objections"],
  "keyPhrases": ["5-8 key phrases customers use"]
}`,
          },
        ],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      if (textBlock && textBlock.type === "text") {
        let jsonStr = textBlock.text.trim();
        if (jsonStr.startsWith("```")) {
          jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
        }
        const vocData = JSON.parse(jsonStr);
        return NextResponse.json({ vocData });
      }
    }

    // Have scraped content — send to Claude for synthesis
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: VOC_RESEARCH_PROMPT,
      messages: [
        {
          role: "user",
          content: `Analyse this scraped customer feedback for ${brandName} and extract VOC insights.

BRIEF CONTEXT (use this to determine which product/angle to focus on):
${briefText || "No brief provided"}

IMPORTANT: Only include VOC insights relevant to the specific product in the brief. Ignore reviews about other products from this brand.

SCRAPED DATA:
${scrapedContent.join("\n\n")}

Return ONLY valid JSON:
{
  "painPoints": ["5 customer pain point quotes - use their actual words, relevant to the product in the brief"],
  "objections": ["5 common customer objections about this specific product"],
  "keyPhrases": ["5-8 key phrases/language patterns customers use when discussing this product"]
}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (textBlock && textBlock.type === "text") {
      let jsonStr = textBlock.text.trim();
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      const vocData = JSON.parse(jsonStr);
      return NextResponse.json({ vocData });
    }

    return NextResponse.json({ error: "VOC analysis failed" }, { status: 500 });
  } catch (err: any) {
    console.error("VOC research error:", err);
    return NextResponse.json(
      { error: err?.message || "VOC research failed" },
      { status: 500 }
    );
  }
}
