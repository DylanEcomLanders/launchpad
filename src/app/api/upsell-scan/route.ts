import { NextResponse } from "next/server";
import { WebClient } from "@slack/web-api";
import Anthropic from "@anthropic-ai/sdk";

// ── Config ──────────────────────────────────────────────────────────

const SEARCH_TERMS = [
  "conversion",
  "CR",
  "AOV",
  "results",
  "live",
  "launched",
  "client loved",
  "positive feedback",
  "increase",
  "improvement",
  "beating control",
  "winner",
  "test won",
];

const LOOKBACK_HOURS = 24;
const MODEL = "claude-sonnet-4-5-20250929";

const SYSTEM_PROMPT = `You are an upsell intelligence system for Ecomlanders, a Shopify CRO and landing page agency. You will receive Slack messages from the last 24 hours. Your job is to:

1. Identify messages that contain genuine positive client signals — test wins, conversion improvements, AOV increases, client praise, successful launches, milestone completions
2. Filter out noise — generic pleasantries, internal banter, minor updates that don't indicate upsell readiness
3. For each genuine signal, output a structured upsell brief

Our services for upselling:
- CRO retainers (ongoing testing and optimisation, tiered pricing)
- Additional landing page builds (PDP, collection pages, advertorials)
- Funnel architecture and restructuring
- Email flow design (via our sister agency Skroll)

For each opportunity output this JSON structure:
{
  "client_name": "string",
  "signal": "string — what was said and by who",
  "signal_strength": "strong | moderate | weak",
  "recommended_upsell": "string",
  "reasoning": "string — why this is the right upsell based on the signal",
  "draft_message": "string — a short outreach message to the client framed around their results, not deliverables",
  "urgency": "act_now | this_week | monitor"
}

Only return opportunities with moderate or strong signal strength. Return as a JSON array. If no opportunities found, return an empty array [].`;

// ── Types ───────────────────────────────────────────────────────────

interface SlackMessage {
  text: string;
  user: string;
  channel: string;
  ts: string;
  permalink: string;
}

export interface UpsellOpportunity {
  client_name: string;
  signal: string;
  signal_strength: "strong" | "moderate" | "weak";
  recommended_upsell: string;
  reasoning: string;
  draft_message: string;
  urgency: "act_now" | "this_week" | "monitor";
}

export interface ScanResult {
  opportunities: UpsellOpportunity[];
  messagesScanned: number;
  searchTermsUsed: number;
  elapsedMs: number;
}

// ── Route Handler ───────────────────────────────────────────────────

export async function POST() {
  const startTime = Date.now();

  // Validate env
  if (!process.env.SLACK_TOKEN) {
    return NextResponse.json(
      { error: "Missing SLACK_TOKEN — add it to .env.local" },
      { status: 500 }
    );
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Missing ANTHROPIC_API_KEY — add it to .env.local" },
      { status: 500 }
    );
  }

  try {
    const slack = new WebClient(process.env.SLACK_TOKEN);
    const anthropic = new Anthropic();

    // Step 1: Search Slack
    const { messages, searchTermsUsed } = await searchSlack(slack);

    if (messages.length === 0) {
      return NextResponse.json({
        opportunities: [],
        messagesScanned: 0,
        searchTermsUsed,
        elapsedMs: Date.now() - startTime,
      } satisfies ScanResult);
    }

    // Step 2: Analyse with Claude
    const opportunities = await analyseWithClaude(anthropic, messages);

    return NextResponse.json({
      opportunities,
      messagesScanned: messages.length,
      searchTermsUsed,
      elapsedMs: Date.now() - startTime,
    } satisfies ScanResult);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown error during scan";
    const status =
      err && typeof err === "object" && "status" in err
        ? (err as { status: number }).status
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

// ── Slack Search ────────────────────────────────────────────────────

async function searchSlack(slack: WebClient) {
  const seen = new Map<string, SlackMessage>();
  const afterDate = getAfterDate();
  let searchedCount = 0;

  for (const term of SEARCH_TERMS) {
    try {
      const res = await slack.search.messages({
        query: `${term} after:${afterDate}`,
        sort: "timestamp",
        sort_dir: "desc",
        count: 100,
      });

      const matches =
        (res.messages as { matches?: Array<Record<string, unknown>> })
          ?.matches || [];

      for (const m of matches) {
        const ch = m.channel as { id?: string; name?: string } | undefined;
        const key = `${ch?.id || "?"}-${m.ts}`;
        if (!seen.has(key)) {
          seen.set(key, {
            text: (m.text as string) || "",
            user:
              (m.username as string) || (m.user as string) || "unknown",
            channel: ch?.name || "unknown",
            ts: m.ts as string,
            permalink: (m.permalink as string) || "",
          });
        }
      }

      searchedCount++;
      await sleep(200);
    } catch {
      // Skip failed terms but keep going
      searchedCount++;
    }
  }

  return {
    messages: Array.from(seen.values()),
    searchTermsUsed: searchedCount,
  };
}

// ── Claude Analysis ─────────────────────────────────────────────────

async function analyseWithClaude(
  anthropic: Anthropic,
  messages: SlackMessage[]
): Promise<UpsellOpportunity[]> {
  const formatted = messages
    .map((m) => `[#${m.channel}] @${m.user}: ${m.text}`)
    .join("\n---\n");

  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Here are ${messages.length} Slack messages from the last ${LOOKBACK_HOURS} hours. Identify any genuine upsell signals:\n\n${formatted}`,
      },
    ],
  });

  const text =
    res.content[0]?.type === "text" ? res.content[0].text : "[]";

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

// ── Helpers ─────────────────────────────────────────────────────────

function getAfterDate() {
  const d = new Date();
  d.setHours(d.getHours() - LOOKBACK_HOURS);
  return d.toISOString().split("T")[0];
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
