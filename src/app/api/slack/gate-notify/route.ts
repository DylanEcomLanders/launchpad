import { NextRequest, NextResponse } from "next/server";

const BOT_TOKEN = process.env.SLACK_BOT_TOKEN || "";

/**
 * POST /api/slack/gate-notify
 * Sends a Slack message when a QA gate is submitted.
 * Body: { channelId, gateTitle, clientName, projectName, submittedBy, nextRole }
 */
export async function POST(req: NextRequest) {
  try {
    const { channelId, gateTitle, clientName, projectName, submittedBy, nextRole } = await req.json();

    if (!channelId || !BOT_TOKEN) {
      return NextResponse.json({ ok: false, error: "Missing channel or bot token" }, { status: 400 });
    }

    const blocks = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `✅ *${gateTitle}* submitted for *${clientName}*${projectName ? ` — ${projectName}` : ""}`,
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Submitted by *${submittedBy || "Team member"}* · ${new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`,
          },
        ],
      },
    ];

    if (nextRole) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `👉 *${nextRole}* can now pick this up.`,
        },
      });
    }

    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: channelId,
        text: `✅ ${gateTitle} submitted for ${clientName}${projectName ? ` — ${projectName}` : ""}`,
        blocks,
      }),
    });

    const data = await res.json();
    return NextResponse.json({ ok: data.ok, error: data.error });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
