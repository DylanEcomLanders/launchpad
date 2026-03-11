import Anthropic from "@anthropic-ai/sdk";

// ── Config ──────────────────────────────────────────────────────

const MODEL = "claude-sonnet-4-5-20250929";
const MAX_TOKENS = 8000;
const FIRECRAWL_TIMEOUT = 30_000;

// ── Research Sources ────────────────────────────────────────────

const RESEARCH_SOURCES = [
  {
    name: "Amazon Reviews",
    icon: "📦",
    query: (q: string) => `${q} customer reviews complaints site:amazon.com`,
  },
  {
    name: "Reddit",
    icon: "💬",
    query: (q: string) => `${q} reviews honest experience reddit`,
  },
  {
    name: "Trustpilot",
    icon: "⭐",
    query: (q: string) => `${q} reviews site:trustpilot.com`,
  },
  {
    name: "G2",
    icon: "🏆",
    query: (q: string) => `${q} reviews site:g2.com`,
  },
  {
    name: "YouTube",
    icon: "▶️",
    query: (q: string) => `${q} honest review site:youtube.com`,
  },
  {
    name: "Quora",
    icon: "❓",
    query: (q: string) => `${q} site:quora.com`,
  },
];

// ── Firecrawl Search ────────────────────────────────────────────

async function firecrawlSearch(
  searchQuery: string,
  limit = 5
): Promise<Array<{ markdown?: string; description?: string }>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FIRECRAWL_TIMEOUT);

  try {
    const response = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        query: searchQuery,
        limit,
        scrapeOptions: {
          formats: ["markdown"],
          onlyMainContent: true,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(
        `Firecrawl HTTP ${response.status}: ${errText.slice(0, 300)}`
      );
    }

    const json = await response.json();
    return json.data || [];
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Search timed out after 30s");
    }
    throw err;
  }
}

// ── Analysis Prompt ─────────────────────────────────────────────

const ANALYSIS_PROMPT = `You are a world-class conversion copywriter and Voice of Customer researcher. You've scraped raw customer data from Amazon, Reddit, Trustpilot, G2, YouTube, and Quora about: **{QUERY}**

YOUR MISSION: Extract VERBATIM customer language. Do NOT summarize, paraphrase, or generalize. Mine exact phrases conversion copywriters can drop directly into headlines, bullets, and CTAs. Generic insights are worthless — raw customer voice is everything.

CRITICAL RULES:
1. Use EXACT customer quotes — word-for-word, including grammar imperfections and slang
2. Rank pain points by frequency (how many times they appear across sources)
3. List each variation of the same complaint — every phrasing variant matters for A/B testing
4. Preserve emotional intensity — mild frustrations and rage-quits belong in different buckets
5. The Messaging Hierarchy must use CUSTOMER language, not marketing language
6. Every section must feel like it was written by a customer, not a brand

RAW SCRAPED DATA ({SOURCE_COUNT} SOURCES):
{DATA}

---

Write the complete VOC Report now in this exact structure:

# VOICE OF CUSTOMER REPORT: {QUERY}
*Scraped from Amazon, Reddit, Trustpilot, G2, YouTube, and Quora*

---

## 1. TOP PAIN POINTS
*Ranked HIGH/MEDIUM/LOW by frequency across all sources*

**[Pain Point Name]** — Frequency: HIGH/MEDIUM/LOW
What customers say verbatim:
- "[exact customer quote]"
- "[exact customer quote]"
- "[exact customer quote]"
Core issue: [one plain-language sentence]

[Minimum 5 distinct pain points]

---

## 2. CUSTOMER LANGUAGE BANK
*These exact phrases belong in your copy — do not rewrite them*

**Before state — how they describe the problem:**
- "[exact phrase]"
- "[exact phrase]"
- "[exact phrase]"
- "[exact phrase]"
- "[exact phrase]"

**After state — how they describe results/success:**
- "[exact phrase]"
- "[exact phrase]"
- "[exact phrase]"
- "[exact phrase]"

**Emotional language — feelings, desires, and fears:**
- "[exact phrase]"
- "[exact phrase]"
- "[exact phrase]"
- "[exact phrase]"

**Category/product language — what they call things:**
- "[exact phrase]"
- "[exact phrase]"
- "[exact phrase]"

---

## 3. PURCHASE TRIGGERS
*What finally pushed people to buy — verbatim decision moments*

**[Trigger Name]**
> "[verbatim customer quote capturing the exact decision moment]"
Copy angle: [how to weaponize this in marketing]

[Minimum 4 distinct triggers]

---

## 4. OBJECTIONS & HESITATIONS
*Why people didn't buy or almost didn't*

**[Objection]** — Frequency: HIGH/MEDIUM/LOW
> "[verbatim customer language expressing this hesitation]"
Counter-copy: [exact language to dissolve this objection]

[Minimum 4 distinct objections]

---

## 5. COMPETITOR WEAKNESSES
*Exact complaints about alternatives — your positioning goldmine*

**[Competitor or status quo weakness]**
> "[verbatim customer complaints about this gap]"
Positioning angle: [the market position you can own]

[Minimum 3 distinct weaknesses]

---

## 6. MESSAGING HIERARCHY
*Ready-to-deploy copy framework — all in customer language*

**PRIMARY HERO MESSAGE**
[Single most powerful statement — customer language, not marketing speak]

**HEADLINE OPTIONS**
- Pain-focused: [headline using customer language]
- Outcome-focused: [headline using customer language]
- Pattern interrupt: [unexpected angle from the data]

**5 PROOF POINTS**
1. [proof point grounded in customer language]
2. [proof point grounded in customer language]
3. [proof point grounded in customer language]
4. [proof point grounded in customer language]
5. [proof point grounded in customer language]

**OBJECTION HANDLERS**
- "Worried about [objection]?" → [exact copy to neutralize it]
- "Not sure about [objection]?" → [exact copy to neutralize it]
- "What about [objection]?" → [exact copy to neutralize it]

**CTA LANGUAGE**
Power words from the data: [comma-separated list]
Recommended CTAs:
- [CTA option 1]
- [CTA option 2]
- [CTA option 3]

**THE EMOTIONAL ARC**
From: "[their exact words describing their before state]"
To: "[their exact words describing their desired after state]"`;

// ── Route Handler ───────────────────────────────────────────────

export async function POST(request: Request) {
  if (!process.env.FIRECRAWL_API_KEY) {
    return new Response(
      JSON.stringify({ error: "FIRECRAWL_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: { query?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid request body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const query = (body.query || "").trim();
  if (!query || query.length < 2) {
    return new Response(
      JSON.stringify({ error: "Please provide a valid search query" }),
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
          // stream already closed
        }
      }

      try {
        const collectedContent: { source: string; content: string }[] = [];

        // Scrape each source sequentially to stay within rate limits
        for (const source of RESEARCH_SOURCES) {
          emit("source_start", { name: source.name, icon: source.icon });

          try {
            const results = await firecrawlSearch(source.query(query), 5);

            const content = results
              .map((r) =>
                [r.markdown, r.description].filter(Boolean).join("\n").trim()
              )
              .filter((c) => c.length > 80)
              .slice(0, 5)
              .map((c) => c.slice(0, 4000))
              .join("\n\n--- next result ---\n\n");

            if (content) {
              collectedContent.push({ source: source.name, content });
              emit("source_done", {
                name: source.name,
                count: results.length,
              });
            } else {
              emit("source_empty", { name: source.name });
            }
          } catch (err) {
            emit("source_error", {
              name: source.name,
              error: err instanceof Error ? err.message : "Unknown error",
            });
          }
        }

        if (collectedContent.length === 0) {
          emit("app_error", {
            message:
              "No content could be retrieved from any source. Try a more specific product or brand name.",
          });
          controller.close();
          return;
        }

        emit("analysis_start", {
          message: `Data collected from ${collectedContent.length} source${collectedContent.length !== 1 ? "s" : ""}. Running Claude AI analysis...`,
          sourceCount: collectedContent.length,
        });

        // Build prompt
        const dataText = collectedContent
          .map(({ source, content }) => `### ${source}\n\n${content}`)
          .join("\n\n" + "═".repeat(50) + "\n\n");

        const prompt = ANALYSIS_PROMPT.replace(/\{QUERY\}/g, query)
          .replace("{SOURCE_COUNT}", String(collectedContent.length))
          .replace("{DATA}", dataText);

        // Stream Claude response
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

        emit("research_complete", { message: "Research complete" });
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
