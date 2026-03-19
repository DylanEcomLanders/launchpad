import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { COPY_AUDIT_SYSTEM_PROMPT } from "@/lib/copy-audit/training-prompt";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

/**
 * Analyse a single page section screenshot.
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
        text: `You are analysing the "${sectionName}" section of a DTC product page.

PROJECT BRIEF:
- Brand: ${brief.clientName}
- Product: ${brief.productName}
- Product Type: ${brief.productType || "N/A"}
- Niche: ${brief.niche || "N/A"}
- Target Audience: ${brief.targetAudience || "N/A"}
- USPs: ${brief.usps || "N/A"}
- Competitors: ${brief.competitors || "N/A"}
- Page Goal: ${brief.pageGoal || "Drive purchase"}
- Additional Context: ${brief.additionalContext || "None"}

${vocData ? `VOICE OF CUSTOMER DATA:
Pain Points: ${vocData.painPoints?.join("; ") || "N/A"}
Objections: ${vocData.objections?.join("; ") || "N/A"}
Key Phrases Customers Use: ${vocData.keyPhrases?.join(", ") || "N/A"}` : ""}

CRITICAL INSTRUCTIONS:
1. Read EVERY word of text visible in this screenshot. Do not miss any copy.
2. In "before" fields, quote the EXACT text from the screenshot — word for word, character for character.
3. In "after" fields, write your improved version that follows DTC best practices and incorporates customer language from the VOC data.
4. In "issues", always quote the specific problematic text: 'exact words here' — then explain why it fails.
5. In "working", quote the specific text that's effective and explain why.
6. Give at least 2-3 specific rewrite suggestions with exact before/after pairs.
7. If VOC data is available, suggest copy that uses the customers' own language and addresses their pain points.
8. Be brutally honest. If the copy is weak, say so and explain exactly why.

Return ONLY valid JSON with this structure:
{
  "score": 7,
  "working": ["'Exact quote from the design' — why this works"],
  "issues": ["'Exact quote from the design' — why this is weak and what principle it violates"],
  "rewrites": [
    {"before": "Exact text from the screenshot", "after": "Your improved version using DTC principles and customer language"}
  ],
  "vocInsight": "How to incorporate customer language from the VOC research into this section"
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
