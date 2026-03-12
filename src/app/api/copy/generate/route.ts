import Anthropic from "@anthropic-ai/sdk";
import type { CopyMode } from "@/lib/copy-engine/types";

// ── Config ──────────────────────────────────────────────────────

const MODEL = "claude-sonnet-4-5-20250929";
const MAX_TOKENS = 12000;

// ── Context formatting ─────────────────────────────────────────

interface ContextBlockInput {
  label: string;
  content: string;
}

function formatContextBlocks(blocks: ContextBlockInput[]): string {
  if (!blocks.length) return "";

  const formatted = blocks
    .filter((b) => b.content.trim())
    .map(
      (b) => `── ${b.label.toUpperCase()} ──\n${b.content.trim()}`
    )
    .join("\n\n");

  if (!formatted) return "";

  return `\n\n═══════════════════════════════════════
ADDITIONAL CONTEXT:
═══════════════════════════════════════
${formatted}
═══════════════════════════════════════\n`;
}

function formatBrandContext(brandContext: string | null): string {
  if (!brandContext) return "";

  return `\n\n═══════════════════════════════════════
BRAND RESEARCH & VOC DATA (use verbatim customer language, pain points, desires, and objections from this research):
═══════════════════════════════════════
${brandContext}
═══════════════════════════════════════\n`;
}

// ── Prompt builders ─────────────────────────────────────────────

function buildPagePrompt(
  brief: string,
  contextBlocks: ContextBlockInput[],
  brandContext: string | null,
  pageType: string,
  selectedSections: string[]
): string {
  const sectionList = selectedSections
    .map((s, i) => `${i + 1}. ${s}`)
    .join("\n");

  return `You are an elite e-commerce copywriter who specialises in high-converting ${pageType} pages. You write copy that combines customer voice-of-customer language with proven direct response frameworks.
${formatBrandContext(brandContext)}${formatContextBlocks(contextBlocks)}
═══════════════════════════════════════
CLIENT BRIEF:
═══════════════════════════════════════
${brief}
═══════════════════════════════════════

You are writing copy for a **${pageType}** page. Generate conversion-focused copy for EACH of these sections:

${sectionList}

INSTRUCTIONS:
- Use customer language and emotional triggers — not generic marketing speak
- Headlines should be specific, benefit-driven, and attention-grabbing
- Benefits should focus on outcomes, not features
- CTAs should create urgency without being pushy
- FAQ entries should address real pre-purchase objections
- If brand research / VOC data was provided, weave in verbatim customer quotes and pain points
- Every section should be ready to hand to a designer — not placeholder copy
- Write copy that converts cold paid traffic into customers

Return your response as a valid JSON object with this EXACT structure:
{
  "sections": [
    { "id": "section_slug", "label": "Section Name", "content": "The copy content here" }
  ]
}

Generate one entry per section listed above. The "id" should be a lowercase slug of the section name. The "label" should be the section name as written above. The "content" should be the full copy for that section.

Return ONLY the JSON object. No markdown code fences, no explanation before or after.`;
}

function buildAdvertorialPrompt(
  brief: string,
  contextBlocks: ContextBlockInput[],
  brandContext: string | null
): string {
  return `You are an elite direct response copywriter who specialises in advertorials — editorial-style sales pages that read like magazine articles, not ads. You write advertorials that combine compelling storytelling with conversion psychology.
${formatBrandContext(brandContext)}${formatContextBlocks(contextBlocks)}
═══════════════════════════════════════
CLIENT BRIEF:
═══════════════════════════════════════
${brief}
═══════════════════════════════════════

Write a full advertorial for this product/brand. The advertorial should:

1. Open with a curiosity-driven editorial headline (NOT an ad headline)
2. Hook the reader with a relatable scenario, surprising stat, or personal story
3. Build a narrative arc — problem → discovery → solution → proof → offer
4. Introduce the product naturally mid-story, not as a hard sell
5. Include social proof (testimonials, data, expert quotes) woven into the narrative
6. Use subheadings to break up the flow (like a real article)
7. Close with a clear CTA and risk reversal
8. If brand research / VOC data was provided, use verbatim customer language throughout

Write in a conversational, editorial tone. The reader should feel like they're reading a helpful article, not being sold to. The copy should be publication-ready.

Write the full advertorial now. Output the copy directly — no JSON, no code fences, no meta-commentary.`;
}

function buildListiclePrompt(
  brief: string,
  contextBlocks: ContextBlockInput[],
  brandContext: string | null
): string {
  return `You are an elite direct response copywriter who specialises in listicle-style sales pages — the kind that go viral on social media and convert cold traffic. You write listicles that combine compelling hooks with conversion psychology.
${formatBrandContext(brandContext)}${formatContextBlocks(contextBlocks)}
═══════════════════════════════════════
CLIENT BRIEF:
═══════════════════════════════════════
${brief}
═══════════════════════════════════════

Write a full listicle-style page for this product/brand. The listicle should:

1. Open with a compelling, curiosity-driven headline (e.g. "X Reasons Why...", "The X Things...", "X Ways to...")
2. A brief intro paragraph that hooks the reader and sets up the list
3. Numbered list items — each one should be a mini story or proof point:
   - Attention-grabbing subheading for each item
   - 2-4 paragraphs of persuasive copy per item
   - Weave in social proof, data, or customer quotes where relevant
4. Naturally position the product as the solution across multiple list items
5. Close with a summary + clear CTA and risk reversal
6. If brand research / VOC data was provided, use verbatim customer language throughout

The listicle should feel like content, not an ad. Each list item should provide genuine value while building the case for the product. The copy should be publication-ready.

Write the full listicle now. Output the copy directly — no JSON, no code fences, no meta-commentary.`;
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
    brief?: string;
    contextBlocks?: ContextBlockInput[];
    brandContext?: string | null;
    pageType?: string;
    selectedSections?: string[];
  };

  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid request body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const mode: CopyMode = body.mode || "Page";
  const brief = (body.brief || "").trim();
  const contextBlocks = body.contextBlocks || [];
  const brandContext = body.brandContext || null;
  const pageType = body.pageType || "Landing Page";
  const selectedSections = body.selectedSections || [];

  if (!brief || brief.length < 20) {
    return new Response(
      JSON.stringify({ error: "Please paste a client brief (at least a few lines)" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (mode === "Page" && selectedSections.length === 0) {
    return new Response(
      JSON.stringify({ error: "Please select at least one section to generate copy for" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Build prompt based on mode
  let prompt: string;
  switch (mode) {
    case "Page":
      prompt = buildPagePrompt(brief, contextBlocks, brandContext, pageType, selectedSections);
      break;
    case "Advertorial":
      prompt = buildAdvertorialPrompt(brief, contextBlocks, brandContext);
      break;
    case "Listicle":
      prompt = buildListiclePrompt(brief, contextBlocks, brandContext);
      break;
    default:
      prompt = buildPagePrompt(brief, contextBlocks, brandContext, pageType, selectedSections);
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
          message: `Generating ${mode === "Page" ? pageType : mode} copy...`,
          mode,
        });

        const anthropic = new Anthropic();

        const claudeStream = anthropic.messages.stream({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          messages: [{ role: "user", content: prompt }],
        });

        claudeStream.on("text", (text) => {
          emit("text_chunk", { text });
        });

        await claudeStream.finalMessage();

        emit("generation_complete", {
          message: "Copy generation complete",
          mode,
        });
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
