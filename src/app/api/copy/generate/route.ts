import Anthropic from "@anthropic-ai/sdk";
import { type CopyMode, modeSections } from "@/lib/copy-engine/types";

// ── Config ──────────────────────────────────────────────────────

const MODEL = "claude-sonnet-4-5-20250929";
const MAX_TOKENS = 8000;

// ── Prompt ──────────────────────────────────────────────────────

function buildPrompt(
  mode: CopyMode,
  productName: string,
  productDescription: string,
  targetAudience: string,
  keyBenefits: string,
  tone: string,
  brandContext: string | null
): string {
  const sections = modeSections[mode];
  const sectionList = sections
    .map((s) => `- **${s.id}**: ${s.label}`)
    .join("\n");

  const brandBlock = brandContext
    ? `\n\n═══════════════════════════════════════
BRAND RESEARCH CONTEXT (use this data — especially verbatim customer language — to write more persuasive copy):
═══════════════════════════════════════
${brandContext}
═══════════════════════════════════════\n`
    : "";

  return `You are an elite e-commerce copywriter who specializes in high-converting ${mode} pages. You write copy that combines customer voice-of-customer language with proven direct response frameworks.
${brandBlock}
Write ${mode} page copy for the following product:

PRODUCT: ${productName}
DESCRIPTION: ${productDescription}
TARGET AUDIENCE: ${targetAudience}
KEY BENEFITS: ${keyBenefits}
TONE: ${tone}

Generate copy for EACH of these sections:
${sectionList}

IMPORTANT INSTRUCTIONS:
- Use customer language and emotional triggers — not generic marketing speak
- Headlines should be specific, benefit-driven, and attention-grabbing
- Benefits should focus on outcomes, not features
- CTAs should create urgency without being pushy
- FAQ entries should address real objections
- If brand research context was provided, use the verbatim customer quotes and pain points to inform your copy
- Write copy that converts cold traffic into customers

Return your response as a valid JSON object with this exact structure:
{
  "sections": [
    { "id": "section_id", "label": "Section Label", "content": "The copy content here" }
  ]
}

Return ONLY the JSON object, no markdown code fences, no explanation before or after.`;
}

// ── Route Handler ───────────────────────────────────────────────

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: {
    mode?: CopyMode;
    productName?: string;
    productDescription?: string;
    targetAudience?: string;
    keyBenefits?: string;
    tone?: string;
    brandContext?: string | null;
  };

  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid request body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const mode = body.mode || "PDP";
  const productName = (body.productName || "").trim();
  const productDescription = (body.productDescription || "").trim();
  const targetAudience = (body.targetAudience || "").trim();
  const keyBenefits = (body.keyBenefits || "").trim();
  const tone = (body.tone || "conversational, confident").trim();
  const brandContext = body.brandContext || null;

  if (!productName || !productDescription) {
    return new Response(
      JSON.stringify({ error: "Product name and description are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function emit(event: string, data: unknown) {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        try {
          controller.enqueue(encoder.encode(payload));
        } catch {
          // stream closed
        }
      }

      try {
        emit("generation_start", {
          message: `Generating ${mode} copy...`,
          mode,
        });

        const anthropic = new Anthropic();
        const prompt = buildPrompt(
          mode,
          productName,
          productDescription,
          targetAudience,
          keyBenefits,
          tone,
          brandContext
        );

        const claudeStream = anthropic.messages.stream({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          messages: [{ role: "user", content: prompt }],
        });

        claudeStream.on("text", (text) => {
          emit("text_chunk", { text });
        });

        await claudeStream.finalMessage();

        emit("generation_complete", { message: "Copy generation complete" });
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "An unexpected error occurred.";
        emit("app_error", { message: msg });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
