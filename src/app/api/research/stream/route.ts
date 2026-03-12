import Anthropic from "@anthropic-ai/sdk";

// ── Config ──────────────────────────────────────────────────────

const MODEL = "claude-sonnet-4-5-20250929";
const MAX_TOKENS = 16000;

// ── Helpers ─────────────────────────────────────────────────────

function extractGoalHint(brief: string): string {
  const patterns = [
    /(?:primary\s*goal|main\s*goal|main\s*objective)[:\s\-—]*([^\n]+)/i,
    /(?:goal|objective)[:\s\-—]*([^\n]+)/i,
  ];
  for (const p of patterns) {
    const m = brief.match(p);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  return "increase conversions";
}

// ── Prompt ──────────────────────────────────────────────────────

function buildPrompt(brief: string, projectName: string, goalHint: string): string {
  return `You are a senior CRO strategist, conversion researcher, and brand intelligence analyst working for a high-end landing page agency. Your team builds pages that convert cold paid traffic into customers.

You have been given a CLIENT BRIEF for a new project. Your job is to deeply research this product/brand using web search and produce a comprehensive research document that the design and copy team will use to build the landing page.

RESEARCH INSTRUCTIONS:
- Use web search EXTENSIVELY. You should search at least 8-12 times to gather thorough data.
- Search for: the product page/website, customer reviews on Amazon/Trustpilot/Reddit, competitor products, comparison articles, forum discussions, and industry context.
- If the brief contains URLs, search for and read those pages.
- Use EXACT customer quotes wherever possible — verbatim language including imperfections and slang is critical for conversion copy.
- Every insight must tie back to the brief's stated goals, challenges, and target audience.
- Do NOT make up quotes or data. Only include information you found through web search.
- Generic advice is worthless — be specific to THIS product and THIS brief.

═══════════════════════════════════════
THE CLIENT BRIEF:
═══════════════════════════════════════
${brief}
═══════════════════════════════════════

After completing your research, write the report in this EXACT structure. Be thorough, specific, and actionable.

# STRATEGIC RESEARCH REPORT: ${projectName}

---

## 1. PRODUCT DEEP DIVE
*What are we selling, to whom, and why should they care?*

**What is this product/service?**
[Clear explanation based on product page + brief — not generic marketing fluff]

**Who is the ideal customer?**
- Demographics: [age, gender, income, location — be specific]
- Psychographics: [values, lifestyle, motivations, fears]
- Buying behavior: [how they shop for this, what triggers purchase]

**Core value proposition:**
[Single powerful sentence]

**Key claims (evidence-backed only):**
- [claim + proof/source]
[Minimum 5]

**Unique differentiators vs alternatives:**
- [specific, not generic]
[Minimum 3]

---

## 2. CUSTOMER VOICE & LANGUAGE BANK
*Verbatim phrases for the copywriter — DO NOT paraphrase*

**Top pain points (ranked by frequency across sources):**

**[Pain Point Name]** — Frequency: HIGH/MEDIUM/LOW
Verbatim quotes:
- "[exact customer quote]"
- "[exact customer quote]"
- "[exact customer quote]"
Copy angle: [how to use this on the page]

[Minimum 5 distinct pain points]

**Desired outcomes — what they want:**
- "[exact quote about what they hope to achieve]"
[Minimum 8 quotes]

**Before / After language:**
Before: "[frustration in their words]"
After: "[desired result in their words]"
[Minimum 4 pairs]

**Emotional triggers — raw feelings:**
- "[exact emotional phrase]"
[Minimum 6]

**Category language — how they refer to this type of product:**
- "[their words for it]"

---

## 3. COMPETITOR & MARKET INTEL
*Where to position and what gaps to exploit*

**Direct competitors:**
| Competitor | Positioning | Price Point | Key Message |
|-----------|-------------|-------------|-------------|
| [name] | [how they position] | [price] | [main angle] |

**Messaging gaps — what NO competitor is saying:**
- [gap + why it's an opportunity]
[Minimum 3]

**What customers say about alternatives (verbatim complaints):**
- "[exact quote about competitor/alternative]"
[Minimum 5]

**Positioning recommendation:**
[Where this brand should sit in the market and why — specific to the brief's goals]

---

## 4. OBJECTION HANDLING FRAMEWORK
*Every barrier to purchase with a specific counter-strategy*

Include objections from the brief PLUS newly discovered ones:

**[Objection]** — Severity: HIGH/MEDIUM/LOW
What they say: "[verbatim customer language]"
Counter-message: [exact copy to overcome this]
Proof to deploy: [testimonial, stat, guarantee, demo]
Where on page: [hero, social proof, FAQ, etc.]

[Minimum 6 objections]

---

## 5. MESSAGING DIRECTION
*Copy strategy tied to the primary goal: ${goalHint}*

**Recommended primary angle:**
[One clear direction with rationale — why this angle for this audience and goal]

**Hero headline options:**
- Pain-led: [headline using customer language]
- Outcome-led: [headline using customer language]
- Social proof-led: [headline using customer language]
- Pattern interrupt: [unexpected angle from the research]

**Key proof points for the page:**
1. [specific proof point — not generic]
2. [specific proof point]
3. [specific proof point]
4. [specific proof point]
5. [specific proof point]

**CTA recommendations:**
- Primary: [text] — Why: [reasoning]
- Secondary: [text] — Why: [reasoning]

**Tone & voice:**
[Specific guidance for this brand — formal/casual, technical/simple, urgent/measured]

**A/B test angles:**
- Angle A: [description + when to use]
- Angle B: [description + when to use]

---

## 6. CRO & PAGE STRUCTURE NOTES
*Recommendations for the page build, informed by product type + traffic source*

**Recommended page flow:**
1. [Section name] — Purpose: [why this section here]
2. [Section name] — Purpose: [why]
3. [Section name] — Purpose: [why]
[Full page flow, 8-12 sections]

**Must-have elements:**
- [element + why it's critical for this product/audience]

**Elements to AVOID:**
- [element + why it would hurt conversion for this case]

**Mobile considerations:**
- [specific to traffic source and audience behavior]

**Trust signals:**
- [specific trust elements needed for this product/industry]`;
}

// ── Route Handler ───────────────────────────────────────────────

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: { projectName?: string; brief?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid request body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const projectName = (body.projectName || "").trim();
  const brief = (body.brief || "").trim();

  if (!brief || brief.length < 20) {
    return new Response(
      JSON.stringify({ error: "Please paste a client brief (at least a few lines)" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const goalHint = extractGoalHint(brief);
  const displayName = projectName || brief.split("\n")[0].slice(0, 60);

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
        emit("analysis_start", {
          message: "Starting deep research with web search...",
          sourceCount: 0,
        });

        const anthropic = new Anthropic();
        const prompt = buildPrompt(brief, displayName, goalHint);

        let searchIdx = 0;
        let inputJsonBuf = "";
        // Track block types by index so we know what each content_block_stop refers to
        const blockTypes: Record<number, string> = {};

        const claudeStream = anthropic.messages.stream({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          tools: [
            {
              type: "web_search_20250305",
              name: "web_search",
              max_uses: 15,
            },
          ],
          messages: [{ role: "user", content: prompt }],
        });

        // Track web search progress via raw stream events
        claudeStream.on("streamEvent", (rawEvent) => {
          const event = rawEvent as unknown as {
            type: string;
            index?: number;
            content_block?: { type: string; name?: string };
            delta?: { type: string; partial_json?: string };
          };

          switch (event.type) {
            case "content_block_start": {
              const blockType = event.content_block?.type || "";
              if (event.index !== undefined) blockTypes[event.index] = blockType;

              if (blockType === "server_tool_use") {
                searchIdx++;
                inputJsonBuf = "";
              }
              if (blockType === "web_search_tool_result") {
                // Results arrived — mark previous search as done
                emit("step_done", { id: `search-${searchIdx}`, resultCount: 0 });
              }
              break;
            }
            case "content_block_delta": {
              if (event.delta?.type === "input_json_delta") {
                inputJsonBuf += event.delta.partial_json || "";
              }
              break;
            }
            case "content_block_stop": {
              const blockType = event.index !== undefined ? blockTypes[event.index] : "";
              if (blockType === "server_tool_use" && inputJsonBuf) {
                let query = `Web search #${searchIdx}`;
                try {
                  const input = JSON.parse(inputJsonBuf);
                  if (input.query) query = input.query;
                } catch {
                  // use fallback label
                }
                emit("step_start", {
                  id: `search-${searchIdx}`,
                  label: query,
                  icon: "🔍",
                });
                inputJsonBuf = "";
              }
              if (event.index !== undefined) delete blockTypes[event.index];
              break;
            }
          }
        });

        // Stream text output (the report)
        claudeStream.on("text", (text) => {
          emit("text_chunk", { text });
        });

        await claudeStream.finalMessage();

        emit("research_complete", { message: "Research complete" });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
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
