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
    const { imageBase64, imageType, sectionName, brief, vocData, previousAnalysis } = await req.json();

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

${previousAnalysis ? `PREVIOUS ANALYSIS OF THIS SECTION:
This section was previously analysed and scored ${previousAnalysis.score}/10.
Previous issues identified: ${previousAnalysis.issues?.join("; ") || "None"}
Previous suggestions: ${previousAnalysis.suggestions?.map((s: any) => `"${s.copy}" — ${s.direction}`).join("; ") || "None"}

IMPORTANT: If the copy has been updated to address previous issues, the score MUST reflect the improvement. Do not score lower than before unless the changes made things worse. Use the criteria-based scoring from the framework — count actual points met.` : ""}

BRIEF ANALYSIS — READ THIS CAREFULLY:
Before analysing the copy, you MUST first understand the brief's intent:
- Is the brief focused on ONE specific angle/pain point, or does it cover MULTIPLE angles?
- If the page addresses multiple angles (e.g. energy + immunity + digestion), your suggestions must respect ALL of those angles — do NOT collapse everything into a single narrative or fixate on one angle.
- If the brief is angle-specific (e.g. "this page targets people switching from competitor X"), then your suggestions should be laser-focused on that angle.
- Look at what the page is TRYING to do with its copy. If it's covering multiple benefits or audience segments, your feedback should help them do that BETTER — not tell them to narrow down.
- The goal is to make the existing approach more effective, not to change the approach entirely.

SCORING RULES:
- Use the CRITERIA-BASED scoring from the system prompt. Count actual points met for this section type.
- Each criterion is worth specific points. Add them up. Don't guess.
- If this is a re-analysis after improvements, explicitly state which criteria are NOW met that weren't before.

CRITICAL INSTRUCTIONS:
1. Read EVERY word of text visible in this screenshot carefully.
2. Quote the EXACT copy from the screenshot when referencing it — word for word.
3. Be SUGGESTIVE, not prescriptive. Don't write the copy for them. Instead:
   - Explain WHY specific copy is weak (what DTC principle it violates)
   - Point them in the right direction (what approach would be stronger)
   - Reference the brief to show how the copy could better serve the stated goals
4. In "suggestions", quote the exact weak copy, explain the problem, and give directional guidance — NOT an exact rewrite.
5. RESPECT THE PAGE'S APPROACH:
   - If the page covers multiple angles, evaluate each angle on its own merits
   - Don't suggest narrowing when the brief calls for breadth
   - Don't suggest broadening when the brief calls for a specific angle
   - Evaluate whether each angle is being communicated effectively on its own terms
6. If VOC data is available, highlight relevant customer language — but only where it genuinely fits the angles being addressed. Don't force VOC data into angles where it doesn't belong.
7. Be brutally honest but fair. If the copy is weak, explain exactly why. If it's strong on one angle but weak on another, say so specifically.
8. Consider the brief holistically — does the copy achieve what the brief set out to do? Where does it fall short of the brief's intent?

Return ONLY valid JSON with this structure:
{
  "score": 7,
  "working": ["'Exact quote from the design' — why this works, which angle it serves, and what DTC principle it follows"],
  "issues": ["'Exact quote from the design' — why this is weak, which angle it undermines, and what approach would strengthen it"],
  "suggestions": [
    {"copy": "Exact text from the screenshot that needs work", "problem": "Why this doesn't work — the specific issue and which angle/goal from the brief it fails to serve", "direction": "The approach they should take to make this copy more effective for the intended angle — what to focus on, what's missing, what would make it more compelling — without writing the exact words for them"}
  ],
  "vocInsight": "Specific customer language or pain points from VOC data that are relevant to the angles this section is addressing — only include what genuinely fits"
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
