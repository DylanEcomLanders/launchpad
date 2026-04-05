import { NextResponse } from "next/server";
import Whop from "@whop/sdk";
import { supabase } from "@/lib/supabase";
import { isNotificationEnabled } from "@/lib/notification-settings";

// ── Whop payment.succeeded webhook handler ──────────────────────
// Fires when a Whop payment succeeds. Verifies signature via the
// SDK, marks proposal as converted, creates a portal shell, and
// posts an approval message to #ops for the team to review before
// sharing with the client.

const BOT_TOKEN = process.env.SLACK_BOT_TOKEN || "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://ecomlanders.app";

export async function POST(request: Request) {
  const webhookSecret = process.env.WHOP_WEBHOOK_SECRET;
  const apiKey = process.env.WHOP_API_KEY;

  if (!webhookSecret || !apiKey) {
    console.error("[webhook] Missing WHOP_WEBHOOK_SECRET or WHOP_API_KEY");
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 }
    );
  }

  // ── 1. Verify webhook signature via SDK ───────────────────────
  const rawBody = await request.text();

  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  /* eslint-disable @typescript-eslint/no-explicit-any */
  let event: any;
  try {
    const client = new Whop({ apiKey, webhookKey: webhookSecret });
    event = client.webhooks.unwrap(rawBody, { headers });
  } catch (err) {
    console.error("[webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Only act on successful payments
  if (event.type !== "payment.succeeded") {
    return NextResponse.json({ ok: true, skipped: true, reason: event.type });
  }

  const payment = event.data;
  const metadata: Record<string, string> = payment?.metadata || {};

  const proposalToken = metadata.proposal_token;
  const clientName = metadata.client_name || "Unknown";
  const clientEmail = metadata.client_email || "";

  // If no proposal token this payment wasn't from our flow — still return 200
  if (!proposalToken) {
    return NextResponse.json({ ok: true, skipped: true, reason: "no_token" });
  }

  // Parse line items from metadata
  let lineItems: { title: string; price: string; quantity: number }[] = [];
  try {
    lineItems = JSON.parse(metadata.line_items || "[]");
  } catch {
    console.error("[webhook] Failed to parse line_items metadata");
  }

  // ── Track which steps succeed ───────────────────────────────
  const results = {
    supabase: false,
    portal_created: false,
    slack_message: false,
  };

  // ── 2. Update Supabase — mark proposal converted ─────────────
  try {
    const selectedServices = lineItems.map((li) => ({
      serviceId: li.title,
      mode: "one-off" as const,
      quantity: li.quantity,
    }));

    const totalCents = Math.round(
      (payment.amount_after_fees ?? payment.initial_price ?? 0) * 100
    );

    await supabase
      .from("proposals")
      .update({
        converted: true,
        converted_at: new Date().toISOString(),
        selected_services: selectedServices,
        order_total_cents: totalCents,
        shopify_order_id: String(payment.id),
      })
      .eq("token", proposalToken);

    results.supabase = true;
  } catch (err) {
    console.error("[webhook] Supabase update failed:", err);
  }

  // ── 3. Create portal shell ──────────────────────────────────
  let portalId: string | undefined;
  let portalToken: string | undefined;

  try {
    const uid = () =>
      "p" +
      Math.random().toString(36).slice(2, 10) +
      Date.now().toString(36).slice(-4);

    portalId = uid();
    portalToken = uid();

    const lineItemText = lineItems
      .map((li) => `${li.title} x${li.quantity}`)
      .join(", ");

    const { error } = await supabase.from("client_portals").insert({
      id: portalId,
      token: portalToken,
      client_name: clientName,
      client_email: clientEmail,
      client_type: "regular",
      project_type: lineItemText || "New Project",
      current_phase: "Kickoff",
      progress: 0,
      next_touchpoint: {},
      phases: [],
      scope: [],
      deliverables: [],
      documents: [],
      results: [],
      wins: [],
      show_results: false,
      slack_channel_url: "",
      ad_hoc_requests: [],
      reports: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      view_count: 0,
    });

    if (error) throw error;
    results.portal_created = true;
  } catch (err) {
    console.error("[webhook] Portal creation failed:", err);
  }

  // ── 4. Post approval message to #ops ────────────────────────
  const opsChannelId = process.env.SLACK_OPS_CHANNEL_ID;
  const notifyEnabled = await isNotificationEnabled("payment_received");

  if (BOT_TOKEN && opsChannelId && notifyEnabled) {
    try {
      const totalDisplay =
        payment.amount_after_fees ?? payment.initial_price ?? "0";

      const lineItemText = lineItems
        .map((li) => `${li.title} x${li.quantity} (£${li.price})`)
        .join(", ");

      const today = new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      const channelSlug = clientName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 60);

      const portalUrl = portalId
        ? `${APP_URL}/tools/client-portal/${portalId}`
        : null;

      const blocks: any[] = [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `💰 Payment Received — £${totalDisplay}`,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text:
              `*Client:* ${clientName}\n` +
              (clientEmail ? `*Email:* \`${clientEmail}\`\n` : "") +
              `*Services:* ${lineItemText || "—"}\n` +
              `*Date:* ${today}`,
          },
        },
        { type: "divider" },
      ];

      // Portal link section
      if (portalUrl) {
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `📋 *Draft portal created.* Review and fill in project details before sharing with the client.\n<${portalUrl}|Review Portal →>`,
          },
        });
      }

      // Channel reminder
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `💬 *Reminder:* Create Slack channel \`external-x-${channelSlug}\` and link it to the portal.`,
        },
      });

      // Approve button
      if (portalToken) {
        blocks.push({
          type: "actions",
          block_id: "portal_approval",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "✅ Approve & Send to Client" },
              style: "primary",
              action_id: "approve_portal",
              value: JSON.stringify({
                portal_token: portalToken,
                client_name: clientName,
              }),
            },
          ],
        });
      }

      const res = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${BOT_TOKEN}`,
        },
        body: JSON.stringify({
          channel: opsChannelId,
          text: `💰 Payment received — £${totalDisplay} from ${clientName}. Draft portal created.`,
          blocks,
        }),
      });

      const data = await res.json();
      results.slack_message = data.ok;
    } catch (err) {
      console.error("[webhook] Slack ops message failed:", err);
    }
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

  // Always return 200 — Whop retries on non-2xx
  return NextResponse.json({ ok: true, results });
}
