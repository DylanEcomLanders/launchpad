import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { saveTicket, getClientForChannel, type Ticket } from "@/lib/slack-tickets";
import { supabase } from "@/lib/supabase";

const SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET || "";
const BOT_TOKEN = process.env.SLACK_BOT_TOKEN || "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://ecomlanders.app";

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
 * Handles Slack interactive payloads (modal submissions + button clicks)
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

  // ── Button clicks (block_actions) ──────────────────────────
  if (payload.type === "block_actions") {
    for (const action of payload.actions || []) {
      if (action.action_id === "approve_portal") {
        await handlePortalApproval(payload, action);
      }
    }
    return NextResponse.json({});
  }

  // ── Modal submissions ──────────────────────────────────────
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
      ticket_type: "unassigned",
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
          text: `✅ *Ticket logged* — ${title}\n>${description.slice(0, 200)}${description.length > 200 ? "..." : ""}\n\n_Priority: ${priority} · Submitted by <@${userId}>_${attachment ? `\n<${attachment}|View attachment>` : ""}`,
        }),
      });
    } catch {
      // Non-critical — ticket is saved regardless
    }

    return NextResponse.json({});
  }

  return NextResponse.json({});
}

// ── Portal approval handler ──────────────────────────────────
async function handlePortalApproval(
  payload: { user?: { id?: string; name?: string; username?: string }; channel?: { id?: string }; message?: { ts?: string } },
  action: { value?: string }
) {
  const userId = payload.user?.id || "";
  const userName = payload.user?.name || payload.user?.username || "Someone";
  const channelId = payload.channel?.id || "";
  const messageTs = payload.message?.ts || "";

  let portalToken = "";
  let clientName = "Client";
  try {
    const val = JSON.parse(action.value || "{}");
    portalToken = val.portal_token || "";
    clientName = val.client_name || "Client";
  } catch {
    return;
  }

  if (!portalToken) return;

  // Look up portal to find the external Slack channel
  const { data: portal } = await supabase
    .from("client_portals")
    .select("id, token, slack_channel_url")
    .eq("token", portalToken)
    .single();

  const portalUrl = `${APP_URL}/portal/${portalToken}`;

  // Extract channel ID from Slack URL if available
  // URLs look like: https://app.slack.com/client/T.../C... or just a channel ID
  let externalChannelId: string | undefined;
  if (portal?.slack_channel_url) {
    const match = portal.slack_channel_url.match(/([CG][A-Z0-9]{8,})/);
    if (match) externalChannelId = match[1];
  }

  // Post portal link to client's external channel
  if (externalChannelId && BOT_TOKEN) {
    try {
      await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${BOT_TOKEN}`,
        },
        body: JSON.stringify({
          channel: externalChannelId,
          text: `👋 Welcome! Your project portal is ready — track progress, view deliverables, and leave feedback all in one place.\n\n<${portalUrl}|View your portal →>`,
        }),
      });
    } catch (err) {
      console.error("[interact] Failed to post to external channel:", err);
    }
  }

  // Update the original ops message to show approval
  if (channelId && messageTs && BOT_TOKEN) {
    const now = new Date().toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

    try {
      await fetch("https://slack.com/api/chat.update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${BOT_TOKEN}`,
        },
        body: JSON.stringify({
          channel: channelId,
          ts: messageTs,
          text: `✅ Portal approved for ${clientName} by <@${userId}>`,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `✅ *Portal approved for ${clientName}*\n\nApproved by <@${userId}> · ${now}${externalChannelId ? "\nPortal link sent to client channel." : "\n⚠️ No external channel linked — portal link not sent. Share manually."}`,
              },
            },
          ],
        }),
      });
    } catch (err) {
      console.error("[interact] Failed to update ops message:", err);
    }
  }
}
