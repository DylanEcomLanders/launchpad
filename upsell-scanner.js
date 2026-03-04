#!/usr/bin/env node

// Load .env.local (same file Next.js uses)
require("dotenv").config({ path: ".env.local" });

/**
 * upsell-scanner.js
 *
 * Scans Slack for positive client signals (test wins, good feedback,
 * metric improvements) and uses Claude to generate upsell recommendations,
 * then posts them to #upsell-opportunities.
 *
 * Usage:
 *   node upsell-scanner.js
 *
 * Cron (weekdays 9am):
 *   0 9 * * 1-5  cd /path/to/launchpad && node upsell-scanner.js
 *
 * Required environment variables:
 *   SLACK_TOKEN       Slack user token (xoxp-...) with search:read + chat:write scopes
 *   ANTHROPIC_API_KEY Anthropic API key
 *
 * Install:
 *   npm install @slack/web-api @anthropic-ai/sdk
 *
 * Slack token setup:
 *   1. Create a Slack app at https://api.slack.com/apps
 *   2. Under OAuth & Permissions, add scopes: search:read, chat:write, channels:read
 *   3. Install to your workspace
 *   4. Copy the User OAuth Token (xoxp-...) — search requires a user token, not bot token
 *   5. Add to .env.local: SLACK_TOKEN=xoxp-...
 *
 * Note: This uses the Slack Web API rather than the MCP server at mcp.slack.com
 * because standalone cron scripts need long-lived tokens. The MCP server uses
 * OAuth sessions that expire, which isn't suited for unattended scheduled runs.
 */

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

const TARGET_CHANNEL = "upsell-opportunities";
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

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  // Dynamic imports (works regardless of CJS/ESM project config)
  const { WebClient } = await import("@slack/web-api");
  const AnthropicMod = await import("@anthropic-ai/sdk");
  const Anthropic = AnthropicMod.default || AnthropicMod;

  // Validate env
  if (!process.env.SLACK_TOKEN) {
    console.error("❌ Missing SLACK_TOKEN — set it in your environment or .env.local");
    console.error("   Needs a Slack user token (xoxp-...) with search:read + chat:write scopes");
    process.exit(1);
  }

  const slack = new WebClient(process.env.SLACK_TOKEN);
  const anthropic = new Anthropic();

  const startTime = Date.now();
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  console.log(`\n📡 Upsell Scanner — ${today}`);
  console.log(`   Scanning last ${LOOKBACK_HOURS}h of Slack messages\n`);

  // ── Step 1: Search Slack ──────────────────────────

  const messages = await searchSlack(slack);

  if (messages.length === 0) {
    console.log("\n📭 No relevant messages found — posting quiet status");
    await postQuietDay(slack);
    logDone(startTime);
    return;
  }

  console.log(`\n📨 ${messages.length} unique messages collected\n`);

  // ── Step 2: Analyse with Claude ───────────────────

  console.log("🧠 Analysing signals with Claude...\n");
  const opportunities = await analyseWithClaude(anthropic, messages);

  if (opportunities.length === 0) {
    console.log("   No actionable opportunities in the noise — posting quiet status");
    await postQuietDay(slack);
    logDone(startTime);
    return;
  }

  console.log(`💡 ${opportunities.length} upsell signal${opportunities.length !== 1 ? "s" : ""} identified:\n`);
  for (const opp of opportunities) {
    const tag = opp.urgency === "act_now" ? "🔴" : opp.urgency === "this_week" ? "🟡" : "🔵";
    console.log(`   ${tag} ${opp.client_name} — ${opp.recommended_upsell}`);
  }

  // ── Step 3: Post to Slack ─────────────────────────

  console.log(`\n📤 Posting to #${TARGET_CHANNEL}...`);
  await postOpportunities(slack, opportunities);

  logDone(startTime);
}

// ── Slack Search ────────────────────────────────────────────────────

async function searchSlack(slack) {
  const seen = new Map();
  const afterDate = getAfterDate();
  let searchedCount = 0;
  let totalHits = 0;

  for (const term of SEARCH_TERMS) {
    try {
      const res = await slack.search.messages({
        query: `${term} after:${afterDate}`,
        sort: "timestamp",
        sort_dir: "desc",
        count: 100,
      });

      const matches = res.messages?.matches || [];
      let added = 0;

      for (const m of matches) {
        const key = `${m.channel?.id || "?"}-${m.ts}`;
        if (!seen.has(key)) {
          seen.set(key, {
            text: m.text || "",
            user: m.username || m.user || "unknown",
            channel: m.channel?.name || "unknown",
            ts: m.ts,
            permalink: m.permalink || "",
          });
          added++;
        }
      }

      searchedCount++;
      totalHits += matches.length;

      if (matches.length > 0) {
        console.log(`   🔎 "${term}" → ${matches.length} hit${matches.length !== 1 ? "s" : ""} (${added} new)`);
      }

      // Small delay to respect rate limits
      await sleep(200);
    } catch (err) {
      const errMsg = err.data?.error || err.message || "unknown error";
      console.warn(`   ⚠️  "${term}" — skipped (${errMsg})`);

      if (errMsg === "missing_scope" || errMsg === "not_authed" || errMsg === "invalid_auth") {
        console.error("\n❌ Token issue — search:read scope requires a user token (xoxp-...), not a bot token.");
        process.exit(1);
      }
    }
  }

  console.log(`\n   Searched ${searchedCount}/${SEARCH_TERMS.length} terms — ${totalHits} total hits → ${seen.size} unique`);
  return Array.from(seen.values());
}

// ── Claude Analysis ─────────────────────────────────────────────────

async function analyseWithClaude(anthropic, messages) {
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

  const text = res.content[0]?.text || "[]";

  // Extract JSON array — Claude might wrap it in markdown code fences
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.warn("   ⚠️  Claude returned no parseable JSON — treating as zero opportunities");
    return [];
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    console.warn("   ⚠️  Failed to parse Claude JSON — treating as zero opportunities");
    return [];
  }
}

// ── Slack Posting ───────────────────────────────────────────────────

async function postOpportunities(slack, opportunities) {
  const channelId = await resolveChannel(slack, TARGET_CHANNEL);
  const today = shortDate();

  const actNow = opportunities.filter((o) => o.urgency === "act_now").length;
  const thisWeek = opportunities.filter((o) => o.urgency === "this_week").length;
  const monitor = opportunities.filter((o) => o.urgency === "monitor").length;

  // ── Header message ──

  const summaryParts = [];
  if (actNow > 0) summaryParts.push(`🔴 ${actNow} act now`);
  if (thisWeek > 0) summaryParts.push(`🟡 ${thisWeek} this week`);
  if (monitor > 0) summaryParts.push(`🔵 ${monitor} monitor`);

  await slack.chat.postMessage({
    channel: channelId,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: `📡 Upsell Scanner — ${today}`, emoji: true },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${opportunities.length} signal${opportunities.length !== 1 ? "s" : ""} detected*\n${summaryParts.join("  ·  ")}`,
        },
      },
      { type: "divider" },
    ],
    text: `📡 ${opportunities.length} upsell signals detected`,
  });

  // ── Individual opportunity messages ──

  for (const opp of opportunities) {
    const urgencyLabel =
      opp.urgency === "act_now"
        ? "🔴 Act Now"
        : opp.urgency === "this_week"
          ? "🟡 This Week"
          : "🔵 Monitor";

    const strengthLabel =
      opp.signal_strength === "strong" ? "🟢 Strong" : "🟠 Moderate";

    await slack.chat.postMessage({
      channel: channelId,
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: opp.client_name, emoji: true },
        },
        {
          type: "context",
          elements: [
            { type: "mrkdwn", text: `${urgencyLabel}  •  Signal: ${strengthLabel}` },
          ],
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*What was spotted*\n${opp.signal}`,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Recommended upsell*\n${opp.recommended_upsell}`,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Why this client, why now*\n${opp.reasoning}`,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Ready-to-send message*\n>>>${opp.draft_message}`,
          },
        },
        { type: "divider" },
      ],
      text: `Upsell: ${opp.client_name} — ${opp.recommended_upsell}`,
    });

    await sleep(300); // rate limit buffer
  }

  console.log(`   ✅ Posted ${opportunities.length + 1} messages to #${TARGET_CHANNEL}`);
}

async function postQuietDay(slack) {
  const channelId = await resolveChannel(slack, TARGET_CHANNEL);
  const today = shortDate();

  await slack.chat.postMessage({
    channel: channelId,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `📡 *Upsell Scanner — ${today}*\n\nNo upsell signals detected today — all quiet.`,
        },
      },
    ],
    text: "No upsell signals detected today — all quiet.",
  });

  console.log(`   ✅ Posted quiet-day message to #${TARGET_CHANNEL}`);
}

// ── Channel resolver ────────────────────────────────────────────────

let channelCache = null;

async function resolveChannel(slack, name) {
  if (channelCache) return channelCache;

  const cleanName = name.replace(/^#/, "");
  let cursor;

  do {
    const res = await slack.conversations.list({
      types: "public_channel,private_channel",
      limit: 200,
      exclude_archived: true,
      cursor,
    });

    const match = (res.channels || []).find((c) => c.name === cleanName);
    if (match) {
      channelCache = match.id;
      return match.id;
    }

    cursor = res.response_metadata?.next_cursor;
  } while (cursor);

  console.error(`\n❌ Channel #${cleanName} not found — create it first, then re-run.`);
  process.exit(1);
}

// ── Helpers ─────────────────────────────────────────────────────────

function getAfterDate() {
  const d = new Date();
  d.setHours(d.getHours() - LOOKBACK_HOURS);
  return d.toISOString().split("T")[0];
}

function shortDate() {
  return new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function logDone(startTime) {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ Finished in ${elapsed}s\n`);
}

// ── Run ─────────────────────────────────────────────────────────────

main().catch((err) => {
  console.error("\n❌ Fatal error:", err.message || err);
  if (err.status) console.error("   Status:", err.status);
  if (err.data?.error) console.error("   Slack:", err.data.error);
  process.exit(1);
});
