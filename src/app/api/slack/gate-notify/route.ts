import { NextRequest, NextResponse } from "next/server";
import { isNotificationEnabled } from "@/lib/notification-settings";

const BOT_TOKEN = process.env.SLACK_BOT_TOKEN || "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://ecomlanders.app";

/**
 * POST /api/slack/gate-notify
 * Sends a Slack message when a QA gate is submitted.
 * Body: { channelId, gateTitle, clientName, projectName, portalId, portalToken, projectId, gateKey }
 */
export async function POST(req: NextRequest) {
  try {
    const { channelId, gateTitle, clientName, projectName, portalId, portalToken, projectId, gateKey, previews } = await req.json();

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

    const clientLine = projectName ? `${clientName} · ${projectName}` : clientName;

    const blocks: any[] = [
      {
        type: "section",
        text: { type: "mrkdwn", text: `✅ *${gateTitle}* submitted` },
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: clientLine },
      },
    ];

    if (Array.isArray(previews) && previews.length > 0) {
      const previewLines = previews
        .filter((p: { title?: string; url?: string }) => p && p.title && p.url)
        .map((p: { title: string; url: string }) => `• *${p.title}* — <${p.url}|Open preview>`)
        .join("\n");
      if (previewLines) {
        blocks.push({
          type: "section",
          text: { type: "mrkdwn", text: `*Preview URLs*\n${previewLines}` },
        });
      }
    }

    if (portalUrl) {
      blocks.push({
        type: "section",
        text: { type: "mrkdwn", text: `<${portalUrl}|View in Portal →>` },
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
        unfurl_links: false,
        unfurl_media: false,
      }),
    });

    const data = await res.json();
    return NextResponse.json({ ok: data.ok, error: data.error });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
