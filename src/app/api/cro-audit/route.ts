import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// ── Config ──────────────────────────────────────────────────────────

const MODEL = "claude-sonnet-4-5-20250929";

const SYSTEM_PROMPT = `You are a senior CRO (conversion rate optimisation) analyst specialising in Shopify ecommerce. You work for Ecomlanders, a Shopify CRO and landing page agency.

You will receive two screenshots:
1. IMAGE 1: The client's current CONTROL page (their existing design)
2. IMAGE 2: The team's new VARIANT design (our proposed improvement)

You may also receive current page statistics and additional context about the client.

Your job is to provide a thorough, actionable CRO analysis comparing both designs. Be specific — reference actual elements you can see in the screenshots (colours, positioning, copy, layout). Don't be generic.

Analyse these areas:
- Hero Section & First Impression: What does the user see first? Is the value prop clear? CTA visibility above the fold.
- Trust Signals: Reviews, ratings, badges, guarantees, social proof, press logos, user-generated content.
- CTA Strategy: Button placement, copy, colour contrast, urgency elements, number of CTAs, sticky elements.
- Content Hierarchy: Information flow, scanability, use of whitespace, visual weight distribution, F-pattern or Z-pattern compliance.
- Product Information: How well product benefits, features, and details are presented. Price presentation.
- Mobile Considerations: How each design likely performs on mobile (based on layout, element sizes, tap targets).
- Risk Areas: Anything that could hurt conversion in either design — friction points, confusing navigation, slow-loading elements.

Return your analysis as a JSON object with this exact structure:
{
  "verdict": {
    "winner": "variant" | "control" | "mixed",
    "summary": "2-3 sentence summary of the overall comparison"
  },
  "sections": [
    {
      "title": "Section name",
      "analysis": "Detailed analysis paragraph comparing both designs for this area. Be specific about what you see.",
      "rating": "strong" | "moderate" | "weak"
    }
  ],
  "quickWins": [
    "Specific, actionable improvement 1",
    "Specific, actionable improvement 2",
    "etc — provide 3-5 quick wins"
  ],
  "predictedImpact": "A realistic predicted impact range, e.g. '+5-12% conversion rate improvement' with brief justification"
}

The rating for each section refers to how well the VARIANT performs in that area (strong = variant clearly better, moderate = slight improvement or mixed, weak = control is better here).

Only return the JSON object. No markdown fences, no extra text.`;

// ── Types ───────────────────────────────────────────────────────────

interface AuditRequest {
  controlImage: string;
  variantImage: string;
  clientName: string;
  pageType: string;
  currentStats: {
    conversionRate?: string;
    aov?: string;
    bounceRate?: string;
    sessions?: string;
  };
  additionalContext?: string;
}

export interface AuditSection {
  title: string;
  analysis: string;
  rating: "strong" | "moderate" | "weak";
}

export interface AuditResult {
  verdict: {
    winner: "variant" | "control" | "mixed";
    summary: string;
  };
  sections: AuditSection[];
  quickWins: string[];
  predictedImpact: string;
}

// ── Route Handler ───────────────────────────────────────────────────

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Missing ANTHROPIC_API_KEY — add it to .env.local" },
      { status: 500 }
    );
  }

  try {
    const body: AuditRequest = await request.json();

    // Validate required fields
    if (!body.controlImage || !body.variantImage) {
      return NextResponse.json(
        { error: "Both control and variant screenshots are required" },
        { status: 400 }
      );
    }
    if (!body.clientName?.trim()) {
      return NextResponse.json(
        { error: "Client name is required" },
        { status: 400 }
      );
    }

    const anthropic = new Anthropic();

    // Parse base64 images
    const controlImg = parseDataUri(body.controlImage);
    const variantImg = parseDataUri(body.variantImage);

    // Build context string
    const contextParts: string[] = [];
    contextParts.push(`Client: ${body.clientName}`);
    if (body.pageType) contextParts.push(`Page type: ${body.pageType}`);

    const stats = body.currentStats;
    if (stats) {
      const statParts: string[] = [];
      if (stats.conversionRate) statParts.push(`CR: ${stats.conversionRate}%`);
      if (stats.aov) statParts.push(`AOV: $${stats.aov}`);
      if (stats.bounceRate) statParts.push(`Bounce: ${stats.bounceRate}%`);
      if (stats.sessions) statParts.push(`Sessions: ${stats.sessions}`);
      if (statParts.length > 0) {
        contextParts.push(`Current stats: ${statParts.join(", ")}`);
      }
    }

    if (body.additionalContext?.trim()) {
      contextParts.push(`Additional context: ${body.additionalContext}`);
    }

    // Call Claude with vision
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyse these two Shopify page designs.\n\n${contextParts.join("\n")}\n\nIMAGE 1 (Control — client's current page):`,
            },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: controlImg.mediaType,
                data: controlImg.data,
              },
            },
            {
              type: "text",
              text: "IMAGE 2 (Variant — our new design):",
            },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: variantImg.mediaType,
                data: variantImg.data,
              },
            },
            {
              type: "text",
              text: "Provide your CRO analysis as the specified JSON structure.",
            },
          ],
        },
      ],
    });

    const text =
      res.content[0]?.type === "text" ? res.content[0].text : "{}";

    // Parse JSON — Claude might wrap in code fences
    const cleaned = text
      .replace(/^```json?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();

    const parsed: AuditResult = JSON.parse(cleaned);

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown error during audit";

    // Check for JSON parse errors
    if (err instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Failed to parse AI response — please try again" },
        { status: 500 }
      );
    }

    const status =
      err && typeof err === "object" && "status" in err
        ? (err as { status: number }).status
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

// ── Helpers ─────────────────────────────────────────────────────────

function parseDataUri(dataUri: string): {
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  data: string;
} {
  // Format: data:image/png;base64,iVBORw0KGgo...
  const match = dataUri.match(
    /^data:(image\/(?:jpeg|png|gif|webp));base64,(.+)$/
  );

  if (match) {
    return {
      mediaType: match[1] as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
      data: match[2],
    };
  }

  // Fallback: assume JPEG if no prefix (raw base64)
  return {
    mediaType: "image/jpeg",
    data: dataUri.replace(/^data:.*?;base64,/, ""),
  };
}
