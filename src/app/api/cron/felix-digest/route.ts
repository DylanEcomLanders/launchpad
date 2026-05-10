/* GET /api/cron/felix-digest
 *
 * Felix's daily 08:00 UK digest. Vercel cron hits this; the endpoint runs
 * Felix with a specific digest instruction, then posts the resulting
 * markdown to the #ops channel.
 *
 * Manual testing:
 *   curl -H "Authorization: Bearer $CRON_SECRET" \
 *        "http://localhost:3001/api/cron/felix-digest?dryRun=1"
 *
 * `?dryRun=1` skips the Slack post and returns the generated markdown so
 * you can iterate on the prompt without spamming #ops.
 */

import { NextRequest, NextResponse } from "next/server";
import { runFelix } from "@/lib/agents/runners/felix";
import { postSlackMessage, getOpsChannelId } from "@/lib/slack-bot";

export const maxDuration = 60;

const DIGEST_INSTRUCTION = `Build today's morning ops digest. Use your tools to gather:
- launchpad_recent_activity (hours_back: 24) — anything that happened overnight
- launchpad_blocked_tasks — every active blocker
- launchpad_overdue_tasks — anything past deadline
- slack_recent_in_channel (channel: "ops", hours_back: 24) — sweep #ops for unresolved threads
- slack_search_messages — sweep for client messages without replies in the last 24h. Try queries like "is:client_msg" if your workspace has that filter, or just fall back to the channel reads.

Then write the digest in this exact format. Use Slack mrkdwn (single asterisks for bold, no markdown headings, no code blocks). Section headers are the only place you may use emojis:

🔥 *On fire*
- Bullet items (omit the section entirely if empty)

⏰ *Overdue*
- ...

🚧 *Blocked*
- ...

📋 *In motion*
- ...

👀 *Worth a look*
- ...

Rules for the digest:
- Omit any section that's empty. Don't write "nothing here".
- Each bullet is one line. Lead with the client name in *bold*. Be specific (numbers, days, who's on it).
- No padding, no commentary, no greetings. Dylan reads this in under 60 seconds.
- If everything is calm, return: "All quiet. Nothing on fire, nothing overdue, nothing blocked." — nothing else.`;

export async function GET(req: NextRequest) {
  /* Cron auth: bearer header in production. In dev (and only dev) we
   * also accept the launchpad-role cookie (admin/cro) so iteration on
   * the digest doesn't require setting CRON_SECRET locally. */
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  const bearerOk = !!process.env.CRON_SECRET && auth === expected;
  const role = req.cookies.get("launchpad-role")?.value;
  const devCookieOk = process.env.NODE_ENV !== "production" && (role === "admin" || role === "cro");
  if (!bearerOk && !devCookieOk) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dryRun = req.nextUrl.searchParams.get("dryRun") === "1";

  try {
    const result = await runFelix({
      input: DIGEST_INSTRUCTION,
      triggeredBy: dryRun ? "cron-dryrun" : "cron",
      source: "cron",
    });

    if (!result.output) {
      return NextResponse.json({
        ok: false,
        reason: "Felix returned no text",
        toolCalls: result.toolCalls.length,
        stopReason: result.stopReason,
      });
    }

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        digest: result.output,
        toolCalls: result.toolCalls.length,
        iterations: result.iterations,
      });
    }

    const channel = getOpsChannelId();
    if (!channel) {
      return NextResponse.json({
        ok: false,
        reason: "SLACK_OPS_CHANNEL_ID not configured",
        digest: result.output,
      });
    }

    const blocks = [
      { type: "header", text: { type: "plain_text", text: `Felix — daily ops digest` } },
      { type: "section", text: { type: "mrkdwn", text: result.output } },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `_Generated ${new Date().toLocaleString("en-GB", { timeZone: "Europe/London", dateStyle: "medium", timeStyle: "short" })} UK · ${result.toolCalls.length} tool calls · ${result.iterations} iterations_`,
          },
        ],
      },
    ];

    const slackRes = await postSlackMessage(channel, "Felix — daily ops digest", blocks);

    return NextResponse.json({
      ok: true,
      posted: !!slackRes?.ok,
      slack: slackRes,
      toolCalls: result.toolCalls.length,
      iterations: result.iterations,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
