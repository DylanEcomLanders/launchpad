import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { DEFAULT_AUDIT_KNOWLEDGE } from "@/lib/cro-audit-engine/knowledge-base";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });
const FIRECRAWL_KEY = process.env.FIRECRAWL_API_KEY || "";

// Load knowledge base from Supabase if available, fallback to default
async function getKnowledgeBase(): Promise<string> {
  try {
    const { isSupabaseConfigured, supabase } = await import("@/lib/supabase");
    if (isSupabaseConfigured()) {
      const { data } = await supabase
        .from("business_settings")
        .select("data")
        .eq("id", "business-settings-singleton")
        .limit(1);
      const kb = data?.[0]?.data?.audit_knowledge_base;
      if (kb && typeof kb === "string" && kb.trim().length > 100) return kb;
    }
  } catch { /* fallback */ }
  return DEFAULT_AUDIT_KNOWLEDGE;
}

const AUDIT_SYSTEM_PROMPT = `You are a senior CRO strategist conducting a professional page audit for a DTC/ecommerce brand. You produce genuinely useful, specific analysis — not generic advice.

CRITICAL RULES BEFORE YOU START:
- The user chose this specific page to audit. DO NOT criticise them for auditing a product page instead of a homepage, or vice versa. Audit THE PAGE THEY GAVE YOU.
- If it's a product page, audit it as a product page. If it's a homepage, audit it as a homepage. If it's a collection page, audit it as a collection page. Never say "this should be a different page type."
- ONLY flag issues you can genuinely verify from the page content and screenshot. If the page HAS social proof visible, don't say it's missing. If reviews ARE above the fold, don't say they're buried.
- Read the page content CAREFULLY before claiming something is missing. Check the markdown content for reviews, ratings, testimonials before flagging social proof as absent.
- The screenshot shows the MOBILE view. Analyse from a mobile-first perspective.

Your audit follows this exact structure:

1. EXECUTIVE SUMMARY (2-3 paragraphs)
- Acknowledge what the brand does well — genuine strengths, not flattery
- Identify the core structural problems with the page
- Be honest but respectful — this is a diagnosis, not a criticism

2. SCORECARD (rate each area: "strong", "average", or "weak")

For PRODUCT PAGES, score:
- Above the Fold & First Impression
- Product Copy & Benefits
- CTA Strategy & Purchase Flow
- Social Proof & Reviews
- Trust Signals & Risk Reversal
- Cross-sell & Upsell
- Brand Story & Differentiation
- Mobile Experience

For HOMEPAGES, score:
- Hero Section & Above the Fold
- Value Proposition Clarity
- CTA Strategy
- Social Proof Placement & Quality
- Navigation & Information Architecture
- Product Discovery
- Brand Differentiation
- Trust Signals

For COLLECTION/LANDING PAGES, adapt scoring areas appropriately.

3. ISSUES (5-10 issues, each with):
- title: Short, specific title (e.g. "The Hero Is Selling a Product Launch, Not the Brand")
- severity: "critical" (conversion killers), "high" (significant impact), or "quick-win" (easy fixes)
- subtitle: One-line summary of the problem
- problem: 2-3 sentences explaining WHAT is wrong and WHY it matters. Reference specific elements you can see on the page. Be concrete — mention actual text, buttons, sections you can verify in the content.
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
- NEVER flag something as missing if it IS present in the page content. Read the markdown carefully.
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

    // Step 0: PageSpeed Insights (mobile)
    let speedData: { score: number; fcp: string; lcp: string; tbt: string; cls: string; si: string } | null = null;
    try {
      const psRes = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&category=performance`);
      if (psRes.ok) {
        const ps = await psRes.json();
        const lh = ps.lighthouseResult || {};
        const audits = lh.audits || {};
        const perfScore = Math.round((lh.categories?.performance?.score || 0) * 100);
        if (perfScore > 0) {
          speedData = {
            score: perfScore,
            fcp: audits["first-contentful-paint"]?.displayValue || "—",
            lcp: audits["largest-contentful-paint"]?.displayValue || "—",
            tbt: audits["total-blocking-time"]?.displayValue || "—",
            cls: audits["cumulative-layout-shift"]?.displayValue || "—",
            si: audits["speed-index"]?.displayValue || "—",
          };
        }
      }
    } catch { /* non-critical */ }

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
            formats: ["markdown", "screenshot@fullPage"],
            waitFor: 5000,
            timeout: 45000,
            mobile: true,
          }),
        });

        if (scrapeRes.ok) {
          const scrapeData = await scrapeRes.json();
          pageMarkdown = scrapeData.data?.markdown?.slice(0, 25000) || "";
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
      text: `Conduct a comprehensive CRO audit of this page. Identify whether it is a homepage, product page, collection page, or landing page and tailor your analysis accordingly.

URL: ${url}

${speedData ? `PAGESPEED INSIGHTS (Mobile):
Performance Score: ${speedData.score}/100
First Contentful Paint: ${speedData.fcp}
Largest Contentful Paint: ${speedData.lcp}
Total Blocking Time: ${speedData.tbt}
Cumulative Layout Shift: ${speedData.cls}
Speed Index: ${speedData.si}
` : ""}
PAGE CONTENT:
${pageMarkdown}

Analyse the page structure, copy, CTAs, social proof, navigation, and overall conversion architecture. Be specific — reference actual elements you can see.${speedData ? " Include page speed findings in your audit — slow pages kill conversion." : ""}`,
    });

    // Step 3: Load knowledge base and run Claude analysis
    const knowledgeBase = await getKnowledgeBase();

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: AUDIT_SYSTEM_PROMPT + "\n\n## CRO KNOWLEDGE BASE\n" + knowledgeBase,
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
        speed_data: speedData,
      },
    });
  } catch (err: any) {
    console.error("Audit generation error:", err);
    return NextResponse.json({ error: err?.message || "Audit generation failed" }, { status: 500 });
  }
}
