import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET || "";
const BOT_TOKEN = process.env.SLACK_BOT_TOKEN || "";

/** Verify Slack request signature */
function verifySlackSignature(body: string, timestamp: string, signature: string): boolean {
  if (!SIGNING_SECRET) return false;
  const baseString = `v0:${timestamp}:${body}`;
  const hash = "v0=" + crypto.createHmac("sha256", SIGNING_SECRET).update(baseString).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
}

/**
 * POST /api/slack/ticket
 * Handles the /ticket slash command — opens a modal
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const timestamp = req.headers.get("x-slack-request-timestamp") || "";
  const signature = req.headers.get("x-slack-signature") || "";

  // Verify signature
  if (SIGNING_SECRET && !verifySlackSignature(body, timestamp, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const params = new URLSearchParams(body);
  const triggerId = params.get("trigger_id");
  const channelId = params.get("channel_id");
  const channelName = params.get("channel_name");

  if (!triggerId) {
    return NextResponse.json({ error: "Missing trigger_id" }, { status: 400 });
  }

  // Open modal
  const modal = {
    trigger_id: triggerId,
    view: {
      type: "modal",
      callback_id: "ticket_submit",
      private_metadata: JSON.stringify({ channel_id: channelId, channel_name: channelName }),
      title: { type: "plain_text", text: "Log a Ticket" },
      submit: { type: "plain_text", text: "Submit" },
      close: { type: "plain_text", text: "Cancel" },
      blocks: [
        {
          type: "input",
          block_id: "title_block",
          label: { type: "plain_text", text: "Issue Title" },
          element: {
            type: "plain_text_input",
            action_id: "title",
            placeholder: { type: "plain_text", text: "Brief summary of the issue" },
          },
        },
        {
          type: "input",
          block_id: "description_block",
          label: { type: "plain_text", text: "Description" },
          element: {
            type: "plain_text_input",
            action_id: "description",
            multiline: true,
            placeholder: { type: "plain_text", text: "Describe the issue in detail..." },
          },
        },
        {
          type: "input",
          block_id: "priority_block",
          label: { type: "plain_text", text: "Priority" },
          element: {
            type: "static_select",
            action_id: "priority",
            placeholder: { type: "plain_text", text: "Select priority" },
            options: [
              { text: { type: "plain_text", text: "Low" }, value: "low" },
              { text: { type: "plain_text", text: "Medium" }, value: "medium" },
              { text: { type: "plain_text", text: "High" }, value: "high" },
              { text: { type: "plain_text", text: "Urgent" }, value: "urgent" },
            ],
            initial_option: { text: { type: "plain_text", text: "Medium" }, value: "medium" },
          },
        },
        {
          type: "input",
          block_id: "attachment_block",
          optional: true,
          label: { type: "plain_text", text: "Screenshot / Loom URL" },
          element: {
            type: "plain_text_input",
            action_id: "attachment",
            placeholder: { type: "plain_text", text: "Paste a screenshot URL or Loom link" },
          },
        },
      ],
    },
  };

  try {
    const res = await fetch("https://slack.com/api/views.open", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BOT_TOKEN}`,
      },
      body: JSON.stringify(modal),
    });

    const result = await res.json();
    if (!result.ok) {
      console.error("Slack views.open error:", result.error);
    }
  } catch (err) {
    console.error("Failed to open modal:", err);
  }

  // Must respond with 200 within 3 seconds for slash commands
  return new NextResponse("", { status: 200 });
}
