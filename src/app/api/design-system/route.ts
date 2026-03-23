import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });
const FIRECRAWL_KEY = process.env.FIRECRAWL_API_KEY || "";

/**
 * Generate a design system from a URL or screenshots.
 * POST { url?, images?[], niche?, notes? }
 */
export async function POST(req: NextRequest) {
  try {
    const { url, images, niche, notes, knowledgeBase } = await req.json();

    let pageContent = "";
    let screenshotBase64 = "";

    // Scrape the URL if provided
    if (url?.trim()) {
      try {
        const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${FIRECRAWL_KEY}` },
          body: JSON.stringify({
            url: url.trim(),
            formats: ["markdown"],
            actions: [{ type: "screenshot", fullPage: false }],
            timeout: 30000,
          }),
        });
        const scrapeData = await scrapeRes.json();
        if (scrapeData.success) {
          pageContent = (scrapeData.data?.markdown || "").slice(0, 5000);
          screenshotBase64 = scrapeData.data?.screenshot || "";
        }
      } catch { /* continue without scrape */ }
    }

    // Build Claude messages
    const content: Anthropic.MessageCreateParams["messages"][0]["content"] = [];

    // Add screenshot from scrape
    if (screenshotBase64) {
      content.push({
        type: "image",
        source: { type: "base64", media_type: "image/png", data: screenshotBase64 },
      });
    }

    // Add uploaded images
    if (images?.length) {
      for (const img of images.slice(0, 4)) {
        content.push({
          type: "image",
          source: { type: "base64", media_type: (img.type || "image/png") as "image/png", data: img.data },
        });
      }
    }

    content.push({
      type: "text",
      text: `You are a senior ecommerce design system architect. Analyse the provided screenshots/URL and generate a complete design system for this brand.

${url ? `URL: ${url}` : ""}
${niche ? `Niche: ${niche}` : ""}
${notes ? `Designer Notes: ${notes}` : ""}
${pageContent ? `Page Content (first 5000 chars):\n${pageContent}` : ""}

${knowledgeBase ? `TEAM DESIGN PREFERENCES (use these as a starting point):\n${knowledgeBase}` : ""}

Generate a JSON response with this exact structure:
{
  "brand_analysis": "2-3 sentences about the brand's current visual identity and positioning",
  "palette": {
    "primary": { "hex": "#...", "name": "descriptive name", "usage": "when to use" },
    "secondary": { "hex": "#...", "name": "descriptive name", "usage": "when to use" },
    "accent": { "hex": "#...", "name": "descriptive name", "usage": "when to use" },
    "background": { "hex": "#...", "name": "descriptive name", "usage": "when to use" },
    "surface": { "hex": "#...", "name": "descriptive name", "usage": "cards, sections" },
    "text_primary": { "hex": "#...", "name": "descriptive name", "usage": "headings" },
    "text_secondary": { "hex": "#...", "name": "descriptive name", "usage": "body text" },
    "success": { "hex": "#...", "name": "", "usage": "positive states" },
    "warning": { "hex": "#...", "name": "", "usage": "caution states" },
    "error": { "hex": "#...", "name": "", "usage": "error states" }
  },
  "fonts": {
    "heading": { "name": "font name", "weight": "700", "style": "why this works", "fallback": "fallback stack" },
    "subheading": { "name": "font name", "weight": "600", "style": "why this works", "fallback": "fallback stack" },
    "body": { "name": "font name", "weight": "400", "style": "why this works", "fallback": "fallback stack" },
    "accent": { "name": "font name", "weight": "500", "style": "for CTAs, badges, labels", "fallback": "fallback stack" }
  },
  "typography_scale": {
    "hero": "48-64px",
    "h1": "36-42px",
    "h2": "28-32px",
    "h3": "22-26px",
    "body": "16-18px",
    "small": "13-14px",
    "micro": "11-12px"
  },
  "spacing": {
    "base": "8px",
    "section_padding": "suggested value",
    "card_padding": "suggested value",
    "button_padding": "suggested value",
    "grid_gap": "suggested value"
  },
  "buttons": {
    "primary": { "bg": "#...", "text": "#...", "radius": "px value", "style": "description" },
    "secondary": { "bg": "#...", "text": "#...", "radius": "px value", "style": "description" },
    "ghost": { "bg": "transparent", "text": "#...", "border": "#...", "style": "description" }
  },
  "design_direction": [
    "3-5 bullet points about the overall design direction and feel"
  ],
  "avoid": [
    "3-5 things to avoid for this brand/niche"
  ]
}

RULES:
- Suggest fonts available on Google Fonts (free, web-safe)
- Palette should feel premium and conversion-focused for ecommerce
- Consider the niche — supplements feel different to skincare to pet products
- If you can see existing brand colours, build around them rather than replacing
- Be specific with hex codes, not generic
- Typography scale should be optimised for mobile-first ecommerce

Return ONLY valid JSON. No markdown code blocks.`,
    });

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      messages: [{ role: "user", content }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "No response" }, { status: 500 });
    }

    let jsonStr = textBlock.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const designSystem = JSON.parse(jsonStr);
    return NextResponse.json({ designSystem });
  } catch (err: any) {
    console.error("Design system error:", err);
    return NextResponse.json({ error: err?.message || "Generation failed" }, { status: 500 });
  }
}
