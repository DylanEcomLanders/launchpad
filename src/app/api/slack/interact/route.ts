import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { saveTicket, getClientForChannel, type Ticket } from "@/lib/slack-tickets";

const SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET || "";
const BOT_TOKEN = process.env.SLACK_BOT_TOKEN || "";

function verifySlackSignature(body: string, timestamp: string, signature: string): boolean {
  if (!SIGNING_SECRET) return false;
  const baseString = `v0:${timestamp}:${body}`;
  const hash = "v0=" + crypto.createHmac("sha256", SIGNING_SECRET).update(baseString).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
  } catch {
    return false;
  }
}

/**
 * POST /api/slack/interact
 * Handles Slack interactive payloads (modal submissions)
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const timestamp = req.headers.get("x-slack-request-timestamp") || "";
  const signature = req.headers.get("x-slack-signature") || "";

  if (SIGNING_SECRET && !verifySlackSignature(body, timestamp, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const params = new URLSearchParams(body);
  const payloadStr = params.get("payload");
  if (!payloadStr) {
    return NextResponse.json({ error: "Missing payload" }, { status: 400 });
  }

  const payload = JSON.parse(payloadStr);

  if (payload.type === "view_submission" && payload.view?.callback_id === "ticket_submit") {
    const values = payload.view.state.values;
    const meta = JSON.parse(payload.view.private_metadata || "{}");

    const title = values.title_block?.title?.value || "";
    const description = values.description_block?.description?.value || "";
    const priority = values.priority_block?.priority?.selected_option?.value || "medium";
    const attachment = values.attachment_block?.attachment?.value || "";

    const channelId = meta.channel_id || "";
    const channelName = meta.channel_name || "";
    const userId = payload.user?.id || "";
    const userName = payload.user?.name || payload.user?.username || "";

    // Look up client name from channel mapping
    const clientName = await getClientForChannel(channelId) || channelName || "Unknown";

    const ticket: Ticket = {
      id: crypto.randomUUID(),
      client_name: clientName,
      channel_id: channelId,
      channel_name: channelName,
      submitted_by: userName,
      submitted_by_id: userId,
      title,
      description,
      priority,
      attachment_url: attachment,
      status: "open",
      notes: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await saveTicket(ticket);

    // Post confirmation message in channel
    try {
      const priorityEmoji: Record<string, string> = {
        low: "🟢",
        medium: "🟡",
        high: "🟠",
        urgent: "🔴",
      };

      await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${BOT_TOKEN}`,
        },
        body: JSON.stringify({
          channel: channelId,
          text: `${priorityEmoji[priority] || "🟡"} *Ticket logged* — ${title}\n>${description.slice(0, 200)}${description.length > 200 ? "..." : ""}\n\n_Priority: ${priority} · Submitted by <@${userId}> · ID: \`${ticket.id.slice(0, 8)}\`_${attachment ? `\n<${attachment}|View attachment>` : ""}`,
        }),
      });
    } catch {
      // Non-critical — ticket is saved regardless
    }

    // Return empty response to close the modal
    return NextResponse.json({});
  }

  return NextResponse.json({});
}
