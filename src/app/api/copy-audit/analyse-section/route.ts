import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { COPY_AUDIT_SYSTEM_PROMPT } from "@/lib/copy-audit/training-prompt";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

/**
 * Analyse a single page section screenshot — flag-based, no scoring.
 * POST { imageBase64, imageType, sectionName, brief, vocData }
 */
export async function POST(req: NextRequest) {
  try {
    const { imageBase64, imageType, sectionName, brief, vocData } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const content: Anthropic.MessageCreateParams["messages"][0]["content"] = [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: (imageType || "image/png") as "image/png" | "image/jpeg" | "image/gif" | "image/webp",
          data: imageBase64,
        },
      },
      {
        type: "text",
        text: `You are checking the "${sectionName}" section of a DTC product page.

PROJECT BRIEF:
${brief.additionalContext || `- Brand: ${brief.clientName}
- Product: ${brief.productName}
- Product Type: ${brief.productType || "N/A"}
- Niche: ${brief.niche || "N/A"}
- Target Audience: ${brief.targetAudience || "N/A"}
- USPs: ${brief.usps || "N/A"}
- Competitors: ${brief.competitors || "N/A"}
- Page Goal: ${brief.pageGoal || "Drive purchase"}`}

${vocData ? `VOICE OF CUSTOMER DATA:
Pain Points: ${vocData.painPoints?.join("; ") || "N/A"}
Objections: ${vocData.objections?.join("; ") || "N/A"}
Key Phrases Customers Use: ${vocData.keyPhrases?.join(", ") || "N/A"}` : ""}

YOUR TASK:
1. Read EVERY word visible in this screenshot.
2. Check against the BANNED PHRASES list. Flag any matches as red flags.
3. Check against the STRUCTURAL CHECKLIST for "${sectionName}". Flag missing elements as warnings.
4. Confirm elements that pass the checklist.
5. If VOC data is provided, list specific customer phrases/pain points that are NOT used in the visible copy.

IMPORTANT:
- Quote the EXACT text from the screenshot. Word for word.
- Only flag what you can SEE. If the screenshot only shows part of the page, don't flag missing elements you can't verify.
- Be binary. Something violates a rule or it doesn't. No "could be improved" or "consider changing" — that's subjective and not your job.
- If a banned phrase IS substantiated right next to it (e.g. "premium quality — SGS lab tested"), don't flag it.
- Consider the brief. If the brief says "broad multi-angle approach", don't flag the page for covering multiple angles.

Return ONLY valid JSON:
{
  "redFlags": [
    {"quote": "exact text from screenshot", "rule": "rule name", "why": "one sentence: what's wrong and what it should have instead"}
  ],
  "warnings": [
    {"quote": "exact text or 'Missing: [element]'", "rule": "rule name", "why": "one sentence explanation"}
  ],
  "passing": [
    {"element": "what's working", "why": "one sentence: which rule it satisfies"}
  ],
  "vocGaps": ["'exact customer phrase' — not used on page", "specific objection not addressed"],
  "summary": "X red flags · Y warnings · Z passing"
}

No markdown code blocks. Just raw JSON.`,
      },
    ];

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: COPY_AUDIT_SYSTEM_PROMPT,
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

    const analysis = JSON.parse(jsonStr);
    return NextResponse.json({ analysis });
  } catch (err: any) {
    console.error("Section analysis error:", err);
    return NextResponse.json({ error: err?.message || "Analysis failed" }, { status: 500 });
  }
}
