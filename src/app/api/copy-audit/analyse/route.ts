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

    userPrompt += `\nPlease analyse the copy and return your evaluation as a JSON object with this exact structure:
{
  "sections": [
    {
      "name": "Section Name",
      "score": 7,
      "working": ["Things done well"],
      "issues": ["Problems found"],
      "rewrites": [{"before": "Current copy", "after": "Improved copy"}],
      "vocInsight": "Optional VOC-informed suggestion"
    }
  ],
  "overallScore": 6.5,
  "grade": "B",
  "topPriorities": ["Priority 1", "Priority 2", "Priority 3"],
  "vocData": {
    "painPoints": ["Customer pain point quotes"],
    "objections": ["Customer objection quotes"],
    "keyPhrases": ["phrases to use in copy"]
  }
}

Evaluate these sections: Hero Section, Benefit Callouts, Product Description, Trust & Social Proof, Page Flow & Architecture, Tone & Voice, FAQ Section (if present).

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
