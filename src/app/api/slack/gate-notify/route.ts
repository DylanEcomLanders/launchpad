import { NextRequest, NextResponse } from "next/server";
import { isNotificationEnabled } from "@/lib/notification-settings";

const BOT_TOKEN = process.env.SLACK_BOT_TOKEN || "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://ecomlanders.app";

/**
 * POST /api/slack/gate-notify
 * Sends a Slack message when a QA gate is submitted.
 * Body: { channelId, gateTitle, clientName, projectName, submittedBy, nextRole, portalId, portalToken, gateKey }
 */
export async function POST(req: NextRequest) {
  try {
    const { channelId, gateTitle, clientName, projectName, submittedBy, nextRole, portalId, portalToken, projectId, gateKey } = await req.json();

    if (!channelId || !BOT_TOKEN) {
      return NextResponse.json({ ok: false, error: "Missing channel or bot token" }, { status: 400 });
    }

    // Check if notification is enabled in settings
    if (!(await isNotificationEnabled("qa_gate_submitted"))) {
      return NextResponse.json({ ok: true, skipped: true, reason: "disabled" });
    }

    // Prefer the team portal view (tokenised, team-focused) over the admin cockpit.
    // Falls back to the admin URL if a token wasn't passed.
    const teamQuery = [
      projectId ? `project=${encodeURIComponent(projectId)}` : null,
      gateKey ? `gate=${encodeURIComponent(gateKey)}` : null,
    ].filter(Boolean).join("&");
    const portalUrl = portalToken
      ? `${APP_URL}/portal/${portalToken}/team${teamQuery ? `?${teamQuery}` : ""}`
      : portalId
      ? `${APP_URL}/tools/client-portal/${portalId}`
      : null;

    const blocks: any[] = [
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
          text: `👉 *${nextRole}* can now pick this up.${portalUrl ? ` <${portalUrl}|View in Portal →>` : ""}`,
        },
      });
    } else if (portalUrl) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `<${portalUrl}|View in Portal →>`,
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
