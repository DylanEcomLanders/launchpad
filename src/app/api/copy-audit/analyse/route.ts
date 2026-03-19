import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { COPY_AUDIT_SYSTEM_PROMPT } from "@/lib/copy-audit/training-prompt";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

/**
 * Analyse page copy using Claude Vision.
 * POST { images: string[], textContent: string[], brandName: string, productType: string, niche: string, vocData?: object }
 * Returns { audit: AuditResult }
 */
export async function POST(req: NextRequest) {
  try {
    const { images, textContent, brandName, productType, niche, vocData } = await req.json();

    if (!images?.length && !textContent?.length) {
      return NextResponse.json({ error: "No images or text content provided" }, { status: 400 });
    }

    // Build the content array for Claude
    const content: Anthropic.MessageCreateParams["messages"][0]["content"] = [];

    // Add images for vision analysis
    for (const imgUrl of (images || []).slice(0, 5)) {
      try {
        // Fetch image and convert to base64
        const imgRes = await fetch(imgUrl);
        if (!imgRes.ok) continue;
        const buffer = await imgRes.arrayBuffer();
        // Skip images over 4.5MB (Claude limit is 5MB)
        if (buffer.byteLength > 4_500_000) continue;
        const base64 = Buffer.from(buffer).toString("base64");
        const contentType = imgRes.headers.get("content-type") || "image/jpeg";

        content.push({
          type: "image",
          source: {
            type: "base64",
            media_type: contentType as "image/png" | "image/jpeg" | "image/gif" | "image/webp",
            data: base64,
          },
        });
      } catch {
        // Skip failed image fetches
      }
    }

    // Build the analysis prompt
    let userPrompt = `Analyse this DTC product page design and evaluate the copy.\n\n`;

    if (brandName) userPrompt += `Brand: ${brandName}\n`;
    if (productType) userPrompt += `Product: ${productType}\n`;
    if (niche) userPrompt += `Niche: ${niche}\n`;

    if (textContent?.length) {
      userPrompt += `\nExtracted text from the design:\n${textContent.join("\n")}\n`;
    }

    if (vocData) {
      userPrompt += `\nVoice of Customer data to incorporate into suggestions:\n${JSON.stringify(vocData, null, 2)}\n`;
    }

    userPrompt += `\nCRITICAL INSTRUCTIONS:
1. Read ALL visible text from the design images carefully. Every headline, subhead, body text, button, callout — read it word for word.
2. In the "before" field of rewrites, you MUST quote the EXACT copy from the design — the actual words on the page, not a paraphrase.
3. In the "after" field, write the specific improved version you'd replace it with.
4. In "issues", reference the EXACT text that's problematic by quoting it.
5. Be specific and actionable — not generic advice. Say exactly what's wrong with the specific words used.
6. Every section that exists on the page must have at least one rewrite suggestion.

Return your evaluation as a JSON object with this exact structure:
{
  "sections": [
    {
      "name": "Section Name",
      "score": 7,
      "working": ["Quote the specific copy that works well and explain why"],
      "issues": ["Quote the specific copy that's weak: 'exact text here' — explanation of why it fails"],
      "rewrites": [{"before": "EXACT copy from the page — word for word", "after": "Your improved version"}],
      "vocInsight": "Optional VOC-informed suggestion using customer language"
    }
  ],
  "overallScore": 6.5,
  "grade": "B",
  "topPriorities": ["Specific priority with exact copy to change and what to change it to"],
  "vocData": {
    "painPoints": ["Customer pain point quotes"],
    "objections": ["Customer objection quotes"],
    "keyPhrases": ["phrases to use in copy"]
  }
}

Evaluate these sections (include all that are visible in the design):
- Hero Section (headline, subhead, CTA button)
- Benefit Callouts (icon/emoji benefit list)
- Product Description (body copy explaining the product)
- Trust & Social Proof (reviews, badges, expert quotes, guarantees)
- Page Flow & Architecture (overall structure and section ordering)
- Tone & Voice (language style, confidence level, specificity)
- FAQ Section (if present)
- CTA & Purchase Area (buy button, pricing, subscription offer)

Grade scale: A = 8-10, B = 6-7.9, C = 4-5.9, D = 2-3.9, F = 0-1.9

Return ONLY valid JSON, no markdown code blocks.`;

    content.push({ type: "text", text: userPrompt });

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: COPY_AUDIT_SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
    });

    // Extract text from response
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "No response from Claude" }, { status: 500 });
    }

    // Parse JSON from response (handle potential markdown wrapping)
    let jsonStr = textBlock.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const audit = JSON.parse(jsonStr);
    return NextResponse.json({ audit });
  } catch (err: any) {
    console.error("Copy audit analysis error:", err);
    return NextResponse.json(
      { error: err?.message || "Analysis failed" },
      { status: 500 }
    );
  }
}
