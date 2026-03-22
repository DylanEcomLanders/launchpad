import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });
const FIRECRAWL_KEY = process.env.FIRECRAWL_API_KEY || "";

const AUDIT_SYSTEM_PROMPT = `You are a senior CRO strategist conducting a professional homepage audit for a DTC/ecommerce brand. You produce genuinely useful, specific analysis — not generic advice.

Your audit follows this exact structure:

1. EXECUTIVE SUMMARY (2-3 paragraphs)
- Acknowledge what the brand does well — genuine strengths, not flattery
- Identify the core structural problem with the homepage
- Be honest but respectful — this is a diagnosis, not a criticism

2. SCORECARD (rate each area: "strong", "average", or "weak")
Areas to score:
- Hero Section & Above the Fold
- Value Proposition Clarity
- CTA Strategy
- Social Proof Placement & Quality
- Navigation & Information Architecture
- Product Discovery
- Brand Differentiation
- Trust Signals

3. ISSUES (5-10 issues, each with):
- title: Short, specific title (e.g. "The Hero Is Selling a Product Launch, Not the Brand")
- severity: "critical" (conversion killers), "high" (significant impact), or "quick-win" (easy fixes)
- subtitle: One-line summary of the problem
- problem: 2-3 sentences explaining WHAT is wrong and WHY it matters. Reference specific elements you can see on the page. Be concrete — mention actual text, buttons, sections.
- fix: 2-3 sentences explaining HOW to fix it. Be actionable and specific — not "improve your CTA" but "Replace 'Shop Now' with a single primary CTA that communicates the value proposition."

4. PRIORITY ORDER
Numbered list of issues in order of impact. First 3 should have the most impact on conversion rate.

5. NOT SAYING (1 paragraph)
"What This Audit Is Not Saying" — acknowledge the brand's strengths and clarify this is about unlocking what's already there, not criticising the business.

RULES:
- Be SPECIFIC. Reference actual text, buttons, images, and sections you see on the page.
- Be STRUCTURAL. These are architectural issues, not cosmetic tweaks.
- Be GENUINE. If something is good, say so. Don't manufacture problems.
- Be PROFESSIONAL. This goes directly to the brand owner.
- Write in British English.
- No marketing speak. No buzzwords. Direct and honest.
- Each issue should be genuinely actionable — something they could brief a designer/developer to fix.

Return ONLY valid JSON (no markdown code blocks):
{
  "brand_name": "Brand Name",
  "executive_summary": "...",
  "not_saying": "...",
  "scorecard": [{"area": "Hero Section & Above the Fold", "rating": "weak"}, ...],
  "issues": [{"id": "1", "title": "...", "severity": "critical", "subtitle": "...", "problem": "...", "fix": "..."}, ...],
  "priority_order": ["Rebuild the hero with...", "Add value proposition...", ...]
}`;

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "No URL provided" }, { status: 400 });

    // Step 1: Scrape with Firecrawl
    let pageMarkdown = "";
    let screenshotUrl = "";

    if (FIRECRAWL_KEY) {
      try {
        const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${FIRECRAWL_KEY}` },
          body: JSON.stringify({
            url,
            formats: ["markdown", "screenshot"],
            waitFor: 3000,
            timeout: 30000,
          }),
        });

        if (scrapeRes.ok) {
          const scrapeData = await scrapeRes.json();
          pageMarkdown = scrapeData.data?.markdown?.slice(0, 15000) || "";
          screenshotUrl = scrapeData.data?.screenshot || "";
        }
      } catch (e) {
        console.error("Firecrawl error:", e);
      }
    }

    if (!pageMarkdown) {
      // Fallback: try basic fetch
      try {
        const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
        const html = await res.text();
        pageMarkdown = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 10000);
      } catch {
        return NextResponse.json({ error: "Could not access the URL" }, { status: 400 });
      }
    }

    // Step 2: Build Claude message
    const userContent: Anthropic.MessageCreateParams["messages"][0]["content"] = [];

    // Add screenshot if available
    if (screenshotUrl && screenshotUrl.startsWith("http")) {
      try {
        const imgRes = await fetch(screenshotUrl);
        const imgBuffer = await imgRes.arrayBuffer();
        const base64 = Buffer.from(imgBuffer).toString("base64");
        const contentType = imgRes.headers.get("content-type") || "image/png";
        userContent.push({
          type: "image",
          source: { type: "base64", media_type: contentType as "image/png" | "image/jpeg", data: base64 },
        });
      } catch { /* skip screenshot */ }
    }

    userContent.push({
      type: "text",
      text: `Conduct a comprehensive CRO audit of this homepage.

URL: ${url}

PAGE CONTENT:
${pageMarkdown}

Analyse the page structure, copy, CTAs, social proof, navigation, and overall conversion architecture. Be specific — reference actual elements you can see.`,
    });

    // Step 3: Claude analysis
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: AUDIT_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "No analysis generated" }, { status: 500 });
    }

    let jsonStr = textBlock.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const audit = JSON.parse(jsonStr);

    return NextResponse.json({
      audit: {
        ...audit,
        screenshot_url: screenshotUrl,
      },
    });
  } catch (err: any) {
    console.error("Audit generation error:", err);
    return NextResponse.json({ error: err?.message || "Audit generation failed" }, { status: 500 });
  }
}
