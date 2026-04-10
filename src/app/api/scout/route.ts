import Anthropic from "@anthropic-ai/sdk";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { postSlackMessage } from "@/lib/slack-bot";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });
const MODEL = "claude-sonnet-4-5-20250929";
const MAX_TOKENS = 64000;

const SYSTEM_PROMPT = `You are Scout, an outreach research agent for Ecom Landers — a UK ecommerce CRO and landing page agency that has built 5,000+ landing pages for 500+ DTC brands.

Your job: find DTC brands in a given niche at ~£80K–£120K/month revenue, research their funnels in depth, identify the right decision-maker with real contact details, and return structured lead data.

## BRAND DISCOVERY
Use traffic signals, Shopify indicators, ad library activity, social velocity, pricing/SKU depth, and press mentions to qualify revenue range. Flag outliers; do not force qualification.

## REVENUE ESTIMATION
Estimate MRR using at least TWO of these signals:
1. Companies House filings (search for annual turnover)
2. Press mentions citing revenue figures, growth rates, or fundraising
3. Employee count × industry benchmarks (DTC ecom: ~£150K–£250K per employee/year)
4. Web traffic estimates × category conversion rates × AOV
5. Funding rounds, investor disclosures, or Crunchbase data

Revenue rules:
- If you cannot find at least two independent signals, set estimated_mrr to null and revenue_confidence to "low"
- Never default to £80K or any number in the target range as a guess
- Always note which signals you used in revenue_notes
- Set revenue_confidence to "high" (Companies House or press-confirmed), "medium" (two+ indirect signals agree), or "low" (insufficient data)

## BRAND RESEARCH
For each brand document:
- Product range and pricing
- Funnel structure (homepage → PDP → cart, or quiz-led, drop model, etc.)
- Landing page and PDP quality — are they running dedicated post-click pages or sending paid traffic to generic pages?
- 1–2 specific CRO observations grounded in what you actually see on their site
- A personalised outreach hook (1–2 sentences, specific and honest, scoped to post-click conversion — never generic flattery)

## CONTACT IDENTIFICATION
Priority order: Founder > CMO/Head of Marketing > Head of Growth > Ecommerce Manager.

Details to capture:
1. Full name
2. Role/title
3. Personal/named email (e.g. shivraj@liveinnermost.com) — NEVER generic (hello@, info@, contact@, support@, team@)
4. LinkedIn profile URL (personal profile)
5. Twitter/X handle (personal)

If you can only find a generic email, leave email empty. Search thoroughly: interviews, podcast show notes, LinkedIn, press bylines, Companies House officers, personal websites, conference speaker bios.

## OUTPUT FORMAT
After researching each brand, output a JSON object for each lead wrapped in <lead> tags:

<lead>
{
  "brand_name": "Brand Name",
  "url": "https://example.com",
  "estimated_mrr": 95000,
  "revenue_confidence": "medium",
  "revenue_notes": "SimilarWeb shows ~200K monthly visits, AOV ~£45, assuming 2% CVR = ~£180K/mo. Glassdoor shows 25 employees.",
  "niche": "Supplements",
  "decision_maker_name": "Jane Smith",
  "decision_maker_role": "Founder & CEO",
  "email": "jane@example.com",
  "email_verified": false,
  "linkedin_url": "https://linkedin.com/in/janesmith",
  "twitter_handle": "@janesmith",
  "cro_observations": "Running Meta ads to generic collection pages. No dedicated landing pages. PDP has weak social proof — no reviews above fold. Cart has no urgency or trust signals.",
  "outreach_hook": "Your Meta ads are driving solid traffic but landing on a collection page with 40+ products. A focused post-click page matching the ad angle would likely 2-3x ROAS without touching ad spend.",
  "priority_flag": true,
  "status": "new",
  "source": "scout"
}
</lead>

Research thoroughly using web search before outputting each lead. Do NOT make up any contact details or revenue figures. Be specific in CRO observations — reference what you actually see on their site.`;

export async function POST(req: Request) {
  const { niche, count = 10, slackChannel } = await req.json();

  if (!niche?.trim()) {
    return new Response(JSON.stringify({ error: "Niche is required" }), { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function emit(event: string, data: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      emit("status", { message: `Starting Scout — researching ${count} ${niche} brands...` });

      try {
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

        const userPrompt = `Find and research ${count} DTC brands in the "${niche}" niche that are likely doing £80K–£120K/month revenue.

IMPORTANT WORKFLOW — research and output ONE brand at a time:
1. Search for DTC brands in this niche
2. Pick one brand, research their site, funnel, and decision-maker
3. Output the <lead> JSON immediately for that brand
4. Then move to the next brand
5. Repeat until you have ${count} brands

Do NOT wait until you've researched all brands to output leads. Output each <lead> as soon as you've finished researching that brand. This is critical — output leads incrementally.

For each brand:
- Search their website to assess funnel quality and post-click experience
- Search for the founder/CMO name and personal email (Companies House, LinkedIn, press)
- Estimate revenue using at least 2 signals
- Write specific CRO observations based on what you actually see
- Write a personalised outreach hook scoped to post-click conversion`;

        const claudeStream = anthropic.messages.stream({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          tools: [
            {
              type: "web_search_20250305" as any,
              name: "web_search",
              max_uses: 30,
            },
          ],
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userPrompt }],
        });

        let fullText = "";
        let searchCount = 0;

        claudeStream.on("streamEvent", (rawEvent: any) => {
          if (rawEvent.type === "content_block_start") {
            const blockType = rawEvent.content_block?.type || "";
            if (blockType === "server_tool_use") {
              searchCount++;
              emit("search", { count: searchCount });
            }
          }
        });

        claudeStream.on("text", (text: string) => {
          fullText += text;
          emit("text", { text });

          // Check for completed leads in the stream
          const leadMatches = fullText.match(/<lead>([\s\S]*?)<\/lead>/g);
          if (leadMatches) {
            const latestLead = leadMatches[leadMatches.length - 1];
            try {
              const json = JSON.parse(latestLead.replace(/<\/?lead>/g, "").trim());
              emit("lead_found", { brand: json.brand_name, priority: json.priority_flag });
            } catch { /* partial JSON, wait for more */ }
          }
        });

        await claudeStream.finalMessage();

        // Parse all leads from the completed response
        const leadMatches = fullText.match(/<lead>([\s\S]*?)<\/lead>/g) || [];
        const leads: any[] = [];
        const errors: string[] = [];

        for (const match of leadMatches) {
          try {
            const json = JSON.parse(match.replace(/<\/?lead>/g, "").trim());
            leads.push(json);
          } catch (e) {
            errors.push(`Failed to parse lead JSON: ${(e as Error).message}`);
          }
        }

        emit("status", { message: `Parsed ${leads.length} leads. Saving to Supabase...` });

        // Save to leads_db
        let saved = 0;
        let skipped = 0;
        for (const lead of leads) {
          if (!lead.brand_name || !lead.url) {
            skipped++;
            continue;
          }

          // Check for duplicates by URL
          if (isSupabaseConfigured()) {
            const { data: existing } = await supabase
              .from("leads_db")
              .select("id")
              .contains("data", { url: lead.url })
              .limit(1);

            if (existing && existing.length > 0) {
              skipped++;
              emit("status", { message: `Skipped ${lead.brand_name} — already exists` });
              continue;
            }
          }

          const id = crypto.randomUUID();
          const row = {
            id,
            data: {
              ...lead,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            created_at: new Date().toISOString(),
          };

          if (isSupabaseConfigured()) {
            const { error } = await supabase.from("leads_db").insert(row);
            if (error) {
              errors.push(`Failed to save ${lead.brand_name}: ${error.message}`);
            } else {
              saved++;
              emit("lead_saved", { brand: lead.brand_name, id });
            }
          }
        }

        // Post to Slack if channel specified
        if (slackChannel) {
          const priorityLeads = leads.filter(l => l.priority_flag);
          const highConf = leads.filter(l => l.revenue_confidence === "high").length;
          const medConf = leads.filter(l => l.revenue_confidence === "medium").length;
          const lowConf = leads.filter(l => l.revenue_confidence === "low").length;
          const missingEmail = leads.filter(l => !l.email).length;

          const summary = [
            `*Scout Report — ${niche}*`,
            `Researched: ${leads.length} brands | Saved: ${saved} | Skipped: ${skipped}`,
            `Revenue confidence: ${highConf} high, ${medConf} medium, ${lowConf} low`,
            missingEmail > 0 ? `Missing personal email: ${missingEmail} (need manual lookup)` : "",
            "",
            priorityLeads.length > 0 ? "*Priority leads:*" : "",
            ...priorityLeads.map(l =>
              `• *${l.brand_name}* — ${l.outreach_hook || "No hook"}`
            ),
          ].filter(Boolean).join("\n");

          await postSlackMessage(slackChannel, summary);
          emit("status", { message: "Slack report posted" });
        }

        emit("done", {
          total: leads.length,
          saved,
          skipped,
          errors: errors.length,
          searches: searchCount,
        });
      } catch (err) {
        emit("error", { message: err instanceof Error ? err.message : String(err) });
      } finally {
        controller.close();
      }
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
