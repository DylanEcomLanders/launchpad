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
1. Read EVERY word of text visible in this screenshot carefully.
2. Quote the EXACT copy from the screenshot when referencing it — word for word.
3. Be SUGGESTIVE, not prescriptive. Don't write the copy for them. Instead:
   - Explain WHY specific copy is weak (what DTC principle it violates)
   - Point them in the right direction (what approach would be stronger)
   - Reference the brief to show how the copy misses the mark for the target audience
4. In "suggestions", quote the exact weak copy, explain the problem, and give directional guidance on how to improve it — NOT an exact rewrite.
5. If VOC data is available, highlight customer language and pain points they should consider incorporating.
6. Be brutally honest. If the copy is weak, explain exactly why with specific examples from the screenshot.
7. Consider the brief context — does the copy speak to the target audience? Does it address their pain points? Does it communicate the USPs effectively?

Return ONLY valid JSON with this structure:
{
  "score": 7,
  "working": ["'Exact quote from the design' — why this works and what DTC principle it follows"],
  "issues": ["'Exact quote from the design' — why this is weak, what principle it violates, and what approach would be stronger"],
  "suggestions": [
    {"copy": "Exact text from the screenshot that needs work", "problem": "Why this doesn't work — the specific DTC principle being violated", "direction": "The approach they should take instead — what to focus on, what angle to use, what the copy should achieve — without writing the exact words for them"}
  ],
  "vocInsight": "Specific customer language, pain points, or objections from the VOC data that should be woven into this section and why"
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
