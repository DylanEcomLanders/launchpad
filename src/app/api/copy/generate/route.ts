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
  return `You are an expert DTC direct response copywriter who specialises in long-form advertorial landing pages for ecommerce brands. Your advertorials follow a strict 10-phase persuasion structure and are written to warm cold paid traffic (Meta/TikTok ads) before a product page.

The advertorial's job is NOT to sell. Its job is to make the sale feel inevitable. By the time the reader reaches the CTA, they should feel like they discovered the solution themselves. Every section earns the right to move to the next one. The best advertorials feel like discoveries, not ads.
${formatBrandContext(brandContext)}${formatContextBlocks(contextBlocks)}
═══════════════════════════════════════
CLIENT BRIEF:
═══════════════════════════════════════
${brief}
═══════════════════════════════════════

Write a full advertorial (1,500–2,500 words) following this exact 10-phase structure. Each phase has a specific psychological job — do NOT skip or reorder phases.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 1 — HOOK (Headline + Sub-headline + Byline)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Interrupt the scroll. Bold, specific, curiosity-driven headline that speaks directly to a pain point or surprising truth.

Rules:
- Always include a specific, credible sub-headline that names the target audience and pain
- NEVER open with the product name or brand
- Use numbers in headlines where possible (4,237 ratings, 82% of women, 50 million units)
- Include a byline with the narrator's name and credentials (Doctor / Founder / Consumer journalist — whichever fits the brief)

Proven headline structures:
- "[Authoritative Source]: This Is the Real Reason You Can't [Problem] (And How to Fix It Naturally)"
- "When I found out what [shocking thing] really means, I almost [dramatic reaction]"
- "[Number]% of [Target] Suffer From [Problem] — Here's Why [Unexpected Cause] Is The Secret"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 2 — EMPATHY / PROBLEM AGITATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Make the reader feel seen. Describe their problem in precise, uncomfortable detail.

Rules:
- List specific symptoms, not generic ones ('Racing thoughts, tired all day, wide awake at midnight' NOT 'sleep issues')
- Use first-person or second-person framing — 'You've noticed...' or 'I was the person who...'
- Include emotional consequences, not just physical ones (shame, relationship damage, embarrassment)
- Build a list of 4–6 bullet symptoms early — this is a scroll-stopping pattern interrupt
- Don't rush to the solution — stay in the pain longer than feels comfortable

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 3 — FAILED ALTERNATIVES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Destroy confidence in existing solutions. This validates why they haven't solved it yet and opens them to something new.

Rules:
- Name 2–4 specific alternatives the reader has probably tried
- Don't insult the reader for trying them — validate their effort, blame the solutions
- Use framing: 'Even the most recommended solutions fail to...' or 'Most [X] on the market...'
- This primes the reader to see your product as categorically different

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 4 — ROOT CAUSE REVEAL (The Mechanism)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Introduce a fresh mechanism or 'hidden enemy'. Give the problem a name. This is the pivot from pain to hope.

Rules:
- ALWAYS name the mechanism — give it a proper noun title in quotes (e.g. "The Brain-Body Signal Solution", "The Lymphatic Drainage Connection")
- Frame it as something experts/researchers have known but isn't mainstream
- Explain WHY the old solutions fail using this new framework
- Keep it accessible — semi-scientific, not academic
- Tease the product's key ingredient or technology here (but do NOT reveal the product yet)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 5 — AGITATE (The Downward Spiral)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Make the cost of inaction visceral. Paint a specific picture of what happens if they do nothing.

Rules:
- Use 'The longer this continues...' or 'Without taking action...' framing
- Escalate from physical → emotional → social consequences (relationship damage, isolation, shame)
- List 4–6 progressively worse outcomes as bullets
- End with a pivot line: 'So What's the Solution?' — this creates a pattern break and relief

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 6 — SOLUTION INTRO (The Discovery)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Introduce the product through a story, not an announcement. The reader discovers it alongside the narrator.

Rules:
- Give the narrator specific credentials (years of experience, patients seen, hours logged)
- Include an 'a-ha moment' — the specific moment everything changed
- The product should be introduced as a logical conclusion to the story, not a pivot
- NEVER say 'And that's why we created [Product]' — too obviously salesy
- This is where the product name appears for the FIRST time (at least 40% through the page)
- Include a SOFT CTA here — first call to action on the page

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 7 — MECHANISM DEEP DIVE (How It Works)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Explain specifically HOW the product works. Ingredient-by-ingredient or feature-by-feature.

Rules:
- List 4–7 key ingredients or features with individual explanations
- Each explanation should name what it does AND why that matters for the reader's specific problem
- Use bold ingredient/feature names, then 1–2 sentences of mechanism explanation
- Compare to what the alternatives lack ('Most solutions only address X, not Y and Z')
- Use 'But that's not all...' transitions to keep momentum
- Tie every ingredient/feature back to the named root cause mechanism from Phase 4

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 8 — SOCIAL PROOF
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Testimonials are the conversion mechanism — specific, varied, and woven throughout.

Rules:
- Include 3–5 testimonials with first name, last initial
- Each MUST reference specific outcomes, not generic praise ('I lost 9 lbs in 3 weeks', NOT 'Great product!')
- Mix demographics where relevant — age groups, severity levels
- Include star ratings or verified purchase labels for credibility
- Place testimonials before AND after the product intro, not just at the end
- Include large aggregate numbers for trust: '50,000+ customers', '12,500 five-star reviews'
- Include a second CTA after the social proof section

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 9 — COMPARISON TABLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
A structured visual comparison between the product and generic alternatives.

Rules:
- Product column ALWAYS wins every row — no draws or losses
- Alternatives described with negative framing: 'Harsh chemicals', 'Temporary only', 'Single-use/wasteful'
- Use ✅ for product and ❌ for alternatives
- Include 6–8 comparison rows for maximum impact
- Place this just before the offer section
- Format as a clean comparison table with columns: Feature | ✅ [Product] | ❌ [Alternative]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 10 — OFFER, URGENCY & CTA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Remove price objection, create urgency, and eliminate risk. All three must be present.

Offer:
- Anchor the price against a more expensive alternative
- Introduce the discount with a reason ('limited batch', 'internet-only offer', 'new customer price')
- Show the full price crossed out, discounted price prominent
- Break it down to cost-per-day ('less than a cup of coffee')

Urgency:
- Stock scarcity: 'selling out faster than expected', 'limited batch'
- Time-limited deal: 'this price guaranteed today only'
- Do NOT use fake countdown timers — use narrative urgency

Risk Removal:
- Money-back guarantee clearly stated with exact duration (30–120 days)
- 'No questions asked' / 'just email us' language

CTA:
- Button text should be benefit-first: 'Get 30% OFF [Product]', NOT 'Buy Now'
- This is the THIRD CTA on the page (after Phase 6 and Phase 8)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VOICE & STYLE RULES:
- Choose the voice persona that fits the brief: Doctor/Specialist (health/supplements), Relatable Founder (everyday problems), or Consumer Journalist (eco/social causes)
- Short sentences. Especially when building tension.
- Sentence fragments are allowed and encouraged: 'Like this.'
- Use ellipsis for suspense: 'But it wasn't until last year that I finally discovered...'
- Repeat key phrases for rhythm: 'Exhausted. Frustrated. Defeated.'
- Use bold text mid-paragraph to emphasise the most important clause
- Include at least one 'bad news / good news' pivot: 'Here's the bad news... / The good news is...'
- Section headers must be clear and scannable — readers scan before they read
- No sentences longer than 25 words without a natural break

WHAT YOU MUST NEVER DO:
- ❌ Introduce the product in the first 40% of the page
- ❌ Use generic symptom language ('feel tired', 'poor sleep') instead of specific pain
- ❌ Lead with features before establishing the problem and mechanism
- ❌ Have only one CTA — you need minimum 3 (Phase 6, Phase 8, Phase 10)
- ❌ Write testimonials that say 'Great product!' without a specific outcome
- ❌ Skip the failed alternatives section
- ❌ Use formal or clinical language throughout — tone must stay conversational
- ❌ Forget to give the root cause a proper named mechanism
- ❌ Use "unlock", "elevate", "transform", "game-changer", "revolutionary"
- ❌ Use exclamation marks in body copy (CTAs are fine)

Write the full advertorial now. Output the copy directly — no JSON, no code fences, no commentary. Use section headers for each phase. The copy must be publication-ready.`;
}

function buildListiclePrompt(
  brief: string,
  contextBlocks: ContextBlockInput[],
  brandContext: string | null
): string {
  return `You are an expert DTC direct response copywriter who specialises in listicle landing pages ('N Reasons Why') for ecommerce brands. Your listicles convert cold paid traffic by packaging product benefits as numbered, scannable items. Each item must independently justify the click — but the cumulative effect of all items together is what converts.

Unlike advertorials, listicles lead with the product. The format creates a sense of completeness: if a reader reaches the last item, they've implicitly consumed the full pitch. The listicle's job: deliver enough benefit evidence, fast enough, that clicking to the product page feels like the only logical next step.
${formatBrandContext(brandContext)}${formatContextBlocks(contextBlocks)}
═══════════════════════════════════════
CLIENT BRIEF:
═══════════════════════════════════════
${brief}
═══════════════════════════════════════

Write a full listicle landing page (600–1,200 words) following this exact structure:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION H — URGENCY BANNER (Optional)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Top-of-page strip with live offer. Creates FOMO before a word is read.
- Format: "UPDATE: [Scarcity signal] — Lock in [Discount]% OFF"
- Only include if the brief mentions a discount or limited offer

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 1 — HEADLINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Number + authority signal + outcome promise. Must name the audience or pain.

Proven headline formulas:
- "[Authority] Baffled: [Product] [Outcome]. Here's [N] Reasons Why."
- "Why [Audience] Are Switching to [Product] — [N] Reasons"
- "[N] Reasons Why [Product] Will [Outcome] in 2026"
- "What Makes [Product] Different? Here Are [N] Reasons."

Rules:
- ALWAYS include the specific number of items (N Reasons)
- Name the audience explicitly if targeting a niche
- Include an authority signal where possible (Harvard, Neurologists, Doctor-recommended)
- The outcome must be concrete: 'Burn calories', 'alleviate pain' — not vague
- Year in headline ('in 2026') increases CTR — use it for lifestyle products

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 2 — BYLINE + DATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Author name + date creates editorial credibility. Makes it feel like news.
- Format: "By [Name] | [Date] | [Time] EST"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 3 — HOOK STAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1–2 sentences with a specific, audience-relevant statistic before item 1.
- Must be specific and sourced-sounding — not a generic claim
- Frame the problem the product solves

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 4 — NUMBERED ITEMS (8–12 items)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Each item must have:
1. **Bold outcome-driven title** — write as an outcome statement, NOT a feature label ('Live Pain Free!' NOT 'Arch Support')
2. **Feature + mechanism explanation** — 2–4 sentences explaining WHAT it does AND HOW/WHY it works
3. **Micro-testimonial** (every 3–4 items) — "Quote with specific outcome" — First Name, Last Initial

THE 7 ITEM TYPES — vary these across the list:
- **Pain-relief**: Validates the problem before presenting the solution
- **Feature + mechanism**: Explains HOW a feature works, not just what it is
- **Comparison / contrast**: Positions against the status quo or category norm
- **Social proof**: 3rd-party validation at the item level
- **Value / savings**: Makes the purchase feel financially rational
- **Risk removal**: Removes the last objection before the CTA
- **Lifestyle / identity**: Sells the feeling, not the product. Best near the end.

RECOMMENDED ITEM ORDER:
- Items 1–2: Pain-relief or comparison (hook the reader's specific problem)
- Items 3–5: Feature + mechanism (build rational case)
- Item 6: Social proof or authority (credibility checkpoint)
- Items 7–9: Lifestyle / value / savings (make it feel right)
- Item 10+: Risk removal + volume social proof (final conversion push)

CRITICAL RULES FOR ITEMS:
- Item titles must be OUTCOME statements, not feature labels
- Keep item body copy to 2–4 sentences maximum — do not write paragraphs
- Use bold for the most important clause within each item body
- Use numbers wherever possible: '3x more lightweight', 'up to 12 hours', '35 cups per bottle'
- NEVER write 3+ consecutive items of the same type — vary them
- Emoji sparingly as category icons are fine (⚡ 🎒 🌱 🚫)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 5 — MID-LIST CTA WIDGET (after items 4–6)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Soft inline CTA card embedded in the list. Does not interrupt the flow.
- Star rating + review count
- 1-line benefit summary or 3 benefit bullet points
- 'Check Availability →' or similar soft CTA link
- This is the FIRST CTA on the page

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 6 — FINAL ITEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The last numbered item must be emotionally charged — high social proof volume or a bold guarantee.
- Large aggregate number: '1,450,000+ Happy Customers', '57,000 Five-Star Reviews'
- OR: 'Reaching #[N] means you're serious — here's an exclusive deal'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 7 — 3-STEP PURCHASE PROCESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Removes friction. Makes buying feel simple and obvious. This section is MANDATORY.
- Step 1: Order today (action)
- Step 2: Try it / adjust (experience)
- Step 3: Enjoy the outcome (benefit)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 8 — FINAL CTA BLOCK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Last conversion push. All three must be present:

Offer:
- Discount framed as % off with scarcity signal
- Free shipping if applicable
- 'Only available online / not in stores' for exclusivity

Risk Removal:
- Money-back guarantee with exact duration (30, 60, or 120 days)

CTA:
- Button text starts with action + benefit: 'Get 70% OFF Now', NOT 'Buy Now'
- This is the SECOND CTA on the page

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TONE & STYLE RULES:
- Faster, punchier, and more benefit-forward than advertorials
- Short item bodies: 2–4 sentences max per item
- Use bold for the most important phrase in each item body
- Use numbers everywhere: percentages, customer counts, hours, cups, savings
- End item titles with an exclamation or benefit punchline where natural
- Use emoji sparingly as visual category markers

WHAT YOU MUST NEVER DO:
- ❌ Write item titles that are just feature names: 'Arch Support', 'Breathable Material'
- ❌ Write 5+ sentence item bodies — listicles are scannable, not essays
- ❌ Use the same item type 3+ times in a row — vary feature / proof / lifestyle / value
- ❌ Leave all social proof to the final item — embed at least one review mid-list
- ❌ Have only one CTA at the bottom — mid-list CTA widget is required
- ❌ Omit the 3-step purchase process — it's mandatory
- ❌ Write a generic hook stat — it must be specific and audience-targeted
- ❌ Use "unlock", "elevate", "transform", "game-changer", "revolutionary"
- ❌ Use exclamation marks excessively in body copy (item titles and CTAs are fine)

Write the full listicle now. Output the copy directly — no JSON, no code fences, no commentary. Use clear section formatting. The copy must be publication-ready. Total word count: 600–1,200 words.`;
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
