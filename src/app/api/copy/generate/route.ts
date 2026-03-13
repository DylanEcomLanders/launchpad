import Anthropic from "@anthropic-ai/sdk";
import type { CopyMode } from "@/lib/copy-engine/types";

// ── Config ──────────────────────────────────────────────────────

const MODEL = "claude-sonnet-4-5-20250929";
const MAX_TOKENS = 16000;

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

  return `You are a senior e-commerce copywriter at a Shopify landing page agency. Your job is to write the ACTUAL copy that goes on the page — not briefs, not outlines, not suggestions. Real, final, designer-ready copy.

You are writing for cold paid traffic (Meta/TikTok ads → landing page). The reader has never heard of this brand. They clicked an ad and landed here. Every word needs to earn their attention and move them toward purchase.
${formatBrandContext(brandContext)}${formatContextBlocks(contextBlocks)}
═══════════════════════════════════════
CLIENT BRIEF:
═══════════════════════════════════════
${brief}
═══════════════════════════════════════

You are writing copy for a **${pageType}** page.

Write the ACTUAL page copy for each of these sections:

${sectionList}

SECTION FORMAT RULES — follow these precisely:

**Hero / Headline sections:**
Write the headline (max 12 words), a subline (1-2 sentences), and CTA button text. Format as:
HEADLINE: [headline]
SUBLINE: [subline]
CTA: [button text]

**Benefits / Features / USP sections:**
Write 3-4 benefit blocks. Each block needs a short bold title (2-4 words) and 1-2 sentences of supporting copy. Format as:
[Bold Title]
[Supporting copy]

**Social Proof / Reviews / Testimonials sections:**
Write a section intro line, then 3 testimonials with name, detail, and quote. Format as:
INTRO: [intro line, e.g. "Join 12,000+ customers who..."]
"[testimonial quote]" — [Name], [detail]

**FAQ sections:**
Write 5-6 Q&A pairs. Questions should be the REAL objections someone has before buying — not soft questions. Format as:
Q: [question]
A: [answer — direct, confident, 2-3 sentences max]

**CTA / Conversion Block sections:**
Write headline, supporting line, primary CTA, and secondary CTA or guarantee text. Format as:
HEADLINE: [headline]
SUPPORTING: [1-2 sentences]
CTA: [button text]
GUARANTEE: [guarantee line]

**Product Description / Showcase sections:**
Write the actual product copy — what it is, what it does, why it's different. 2-3 short paragraphs. No fluff.

**Comparison Table sections:**
Write a brief intro line, then a table comparing "Us" vs "Alternatives" across 4-5 criteria.

**Problem / Pain sections:**
Write 2-3 short paragraphs that articulate the customer's frustration in THEIR language. This should read like you're inside their head.

**Solution sections:**
Write 2-3 short paragraphs that introduce the product as the answer. Bridge from the pain to the product naturally.

**Guarantee / Risk Reversal sections:**
Write a guarantee headline and 2-3 sentences explaining the guarantee. Be specific (days, refund process, etc).

**Brand Story / About sections:**
Write 2-3 paragraphs of founder/brand story. Keep it human, specific, not corporate.

**Collection / Category sections:**
Write a compelling collection headline and 2-3 sentences of SEO-friendly description.

**Any other section:** Write the actual copy in a format appropriate for that section type.

WRITING RULES:
- Write the ACTUAL copy, not descriptions of what the copy should say
- Be specific to THIS product — no generic marketing language
- Use the customer's own words from the brief / VOC data wherever possible
- Short sentences. Short paragraphs. Scannable.
- Benefits over features. Outcomes over ingredients.
- No exclamation marks except in CTAs. No "unlock", "elevate", "transform", "revolutionary"
- If the brief mentions specific claims, stats, or proof points — use them
- If ad copy or inspo pages were provided, match their energy and angle

Return your response as a valid JSON object with this EXACT structure:
{
  "sections": [
    { "id": "section_slug", "label": "Section Name", "content": "The copy content here" }
  ]
}

Generate one entry per section listed above. The "id" should be a lowercase slug of the section name (spaces to underscores). The "label" should be the section name exactly as written above. The "content" should be the full copy for that section using the format rules above. Use \\n for line breaks within the content.

Return ONLY the JSON object. No markdown code fences, no explanation before or after.`;
}

function buildAdvertorialPrompt(
  brief: string,
  contextBlocks: ContextBlockInput[],
  brandContext: string | null
): string {
  return `You are a senior direct response copywriter at an e-commerce agency. You write advertorials — long-form editorial sales pages disguised as articles. These pages sit between a Meta/TikTok ad and the product page. The reader clicked a curiosity-driven ad and expects to read an article, not get sold to.

Your advertorials consistently convert at 3-5% because you understand one thing: the reader must feel like they discovered this product through a genuine story, not through marketing.
${formatBrandContext(brandContext)}${formatContextBlocks(contextBlocks)}
═══════════════════════════════════════
CLIENT BRIEF:
═══════════════════════════════════════
${brief}
═══════════════════════════════════════

Write a full advertorial (1500-2500 words). Follow this structure precisely:

**HEADLINE** (above the fold)
- Editorial style, not ad style. Think magazine feature, not Facebook ad.
- Examples of the TONE (not to copy): "The $39 Product Dermatologists Don't Want You to Know About", "Why Thousands of Women Are Ditching Their $200 Serums for This"
- Create a knowledge gap the reader needs to fill

**HOOK** (first 2-3 paragraphs)
- Open with a specific, relatable scenario in second person ("You know that feeling when...")
- OR open with a surprising stat/claim that challenges what they believe
- The reader must think "that's exactly me" or "wait, really?" within 3 sentences
- End the hook with an implicit promise that this article has the answer

**THE PROBLEM** (2-3 paragraphs)
- Articulate the pain in the customer's own words (use VOC data if available)
- Be specific — name the frustrations, the failed solutions, the money wasted
- Build enough tension that the reader NEEDS a solution

**THE DISCOVERY** (2-3 paragraphs)
- Transition naturally: a friend mentioned it, stumbled across a study, saw it trending
- Introduce the product through the lens of someone discovering it, not selling it
- Keep it third-person or second-person narrative

**THE PRODUCT** (3-4 paragraphs)
- Now explain what it actually is and why it works
- Lead with the mechanism / unique angle, not features
- Use specific proof: ingredients, studies, numbers, patents
- If the brief has specific claims — use them here

**SOCIAL PROOF** (woven in, 2-3 blocks)
- 2-3 customer quotes embedded in the narrative (not a testimonial section)
- Reference specific results: timelines, percentages, before/after
- If VOC data is available, use actual customer language

**THE OFFER** (2-3 paragraphs)
- Transition from editorial to soft sell
- Mention price in context of value ("less than your daily coffee")
- Include the guarantee prominently
- Primary CTA — clear, specific button text

**CLOSE** (final paragraph)
- Brief urgency or scarcity if appropriate (no fake countdown timers)
- Restate the core promise in one sentence
- Final CTA

WRITING RULES:
- Write like a journalist who happens to love this product, not a marketer
- Short paragraphs (2-3 sentences max). Lots of white space.
- Use subheadings every 3-4 paragraphs to break up the flow
- No "unlock", "elevate", "transform", "game-changer", "revolutionary"
- No exclamation marks in body copy
- Be specific: names, numbers, timeframes, results
- If ad copy was provided as context, match its angle and energy
- The copy must be publication-ready — not a draft, not an outline

Write the full advertorial now. Output the copy directly — no JSON, no code fences, no commentary.`;
}

function buildListiclePrompt(
  brief: string,
  contextBlocks: ContextBlockInput[],
  brandContext: string | null
): string {
  return `You are a senior direct response copywriter at an e-commerce agency. You write listicle-style sales pages — the format that dominates native advertising and converts cold social traffic. These pages sit between a Meta/TikTok ad and the product page.

Your listicles work because each list item delivers genuine value while building an irresistible case for the product. The reader finishes feeling educated AND ready to buy.
${formatBrandContext(brandContext)}${formatContextBlocks(contextBlocks)}
═══════════════════════════════════════
CLIENT BRIEF:
═══════════════════════════════════════
${brief}
═══════════════════════════════════════

Write a full listicle (1500-2500 words). Follow this structure:

**HEADLINE**
- Numbered format: "X Reasons...", "X Things...", "X Ways...", "X Mistakes..."
- The number should be 5-8 (enough depth, not overwhelming)
- Create a knowledge gap: the reader should feel they NEED to know all X items
- Examples of TONE (not to copy): "7 Things Dermatologists Check Before Buying Skincare", "5 Reasons Your Protein Powder Might Be Working Against You"

**INTRO** (2-3 paragraphs)
- Hook with a bold claim or surprising insight
- Establish why this matters to the reader right now
- Preview what they'll learn (without giving it all away)
- Keep it to 3-4 sentences max

**LIST ITEMS** (5-8 items, each 150-250 words)

Each item should follow this pattern:
- **Numbered subheading** — specific and intriguing, not generic
- **The insight** — teach them something real. A fact, a mistake, a hack, a reframe.
- **The proof** — back it up with data, expert opinion, customer experience, or logic
- **The product connection** — naturally show how this product addresses this point (don't force it — some items can be purely educational, which builds credibility)

Item pacing:
- Items 1-2: Purely educational / insight-driven. Build trust. No hard sell.
- Items 3-4: Start connecting insights to the product. "This is exactly why [product] uses..."
- Items 5-6: Social proof items. Customer results, before/after, specific outcomes.
- Item 7+ (if applicable): The "kicker" — the most compelling reason, leads into the CTA.

**CLOSE** (after the final list item)
- Brief summary: "So here's the bottom line..."
- Restate the core value prop in one sentence
- Clear CTA with specific button text
- Guarantee / risk reversal
- Optional: urgency or scarcity (no fake countdown timers)

WRITING RULES:
- Each list item must teach something — not just sell
- Short paragraphs (2-3 sentences). Scannable.
- Use customer language from VOC data / brief wherever possible
- Be specific: cite numbers, timelines, ingredients, studies, results
- No "unlock", "elevate", "transform", "game-changer", "revolutionary"
- No exclamation marks in body copy (CTAs are fine)
- If ad copy was provided as context, match its angle and energy
- The copy must be publication-ready — not a draft, not an outline

Write the full listicle now. Output the copy directly — no JSON, no code fences, no commentary.`;
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
