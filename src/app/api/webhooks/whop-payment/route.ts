import { NextResponse } from "next/server";
import Whop from "@whop/sdk";
import { WebClient } from "@slack/web-api";
import { supabase } from "@/lib/supabase";

// ── Whop payment.succeeded webhook handler ──────────────────────
// Fires when a Whop payment succeeds. Verifies signature via the
// SDK, marks proposal as converted, creates Slack channel, invites
// team, and posts summary — same post-payment flow as before.

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

  // Collect headers into a plain object for the SDK
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
    slack_channel: false,
    slack_invite: false,
    slack_message: false,
  };

  // ── 2. Update Supabase — mark converted ─────────────────────
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
        shopify_order_id: String(payment.id), // reusing column for Whop payment ID
      })
      .eq("token", proposalToken);

    results.supabase = true;
  } catch (err) {
    console.error("[webhook] Supabase update failed:", err);
  }

  // ── 3. Create Slack channel ─────────────────────────────────
  const slackToken = process.env.SLACK_TOKEN;
  let channelId: string | undefined;

  if (slackToken) {
    const slack = new WebClient(slackToken);

    // Sanitise channel name: lowercase, alphanumeric + hyphens, max 80 chars
    const channelSlug = clientName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);
    const channelName = `external-x-${channelSlug}`;

    try {
      const createRes = await slack.conversations.create({
        name: channelName,
        is_private: true,
      });
      channelId = createRes.channel?.id;
      results.slack_channel = true;
    } catch (err: any) {
      if (err?.data?.error === "name_taken") {
        const suffix = `-${Date.now().toString(36).slice(-4)}`;
        const retryName = `${channelName.slice(0, 75)}${suffix}`;
        try {
          const retryRes = await slack.conversations.create({
            name: retryName,
            is_private: true,
          });
          channelId = retryRes.channel?.id;
          results.slack_channel = true;
        } catch (retryErr) {
          console.error("[webhook] Slack channel retry failed:", retryErr);
        }
      } else {
        console.error("[webhook] Slack channel creation failed:", err);
      }
    }

    // ── 4. Invite team to channel ──────────────────────────────
    if (channelId) {
      const dylanId = process.env.SLACK_DYLAN_USER_ID;
      const ajayId = process.env.SLACK_AJAY_USER_ID;
      const alisterId = process.env.SLACK_ALISTER_USER_ID;
      const userIds = [dylanId, ajayId, alisterId].filter(
        (id): id is string => Boolean(id)
      );

      let inviteSuccesses = 0;
      for (const userId of userIds) {
        try {
          await slack.conversations.invite({
            channel: channelId,
            users: userId,
          });
          inviteSuccesses++;
        } catch (err: any) {
          const slackErr = err?.data?.error;
          if (
            slackErr === "already_in_channel" ||
            slackErr === "cant_invite_self"
          ) {
            inviteSuccesses++;
          } else {
            console.error(
              `[webhook] Slack invite failed for ${userId}:`,
              slackErr
            );
          }
        }
      }
      results.slack_invite = inviteSuccesses > 0;

      // ── 5. Post onboarding summary to ops channel ──────────────
      const opsChannelId = process.env.SLACK_OPS_CHANNEL_ID;
      if (opsChannelId) {
        try {
          const lineItemText = lineItems
            .map(
              (li) => `${li.title} x${li.quantity} (£${li.price})`
            )
            .join(", ");

          const totalDisplay =
            payment.amount_after_fees ?? payment.initial_price ?? "0";

          const today = new Date().toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          });

          await slack.chat.postMessage({
            channel: opsChannelId,
            text:
              `:tada: *New Client Onboarded: ${clientName}*\n\n` +
              `:package: *Services:* ${lineItemText}\n` +
              `:moneybag: *Value:* £${totalDisplay}\n` +
              `:calendar: *Date:* ${today}\n` +
              `:hash: *Channel:* <#${channelId}>\n` +
              (clientEmail ? `:email: *Client email:* \`${clientEmail}\`\n` : "") +
              `\n:point_right: *Next step:* ${clientEmail ? `Send Slack Connect invite to \`${clientEmail}\` in <#${channelId}>` : `Invite client to <#${channelId}>`}`,
          });
          results.slack_message = true;
        } catch (err) {
          console.error("[webhook] Slack ops message failed:", err);
        }
      }
    }
  }

  // ── 6. Set channel topic with client email ──────────────────
  if (slackToken && channelId && clientEmail) {
    const slack = new WebClient(slackToken);
    try {
      await slack.conversations.setTopic({
        channel: channelId,
        topic: `Client: ${clientName} · ${clientEmail}`,
      });
    } catch (err) {
      console.error("[webhook] Slack topic set failed:", err);
    }
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

  // Always return 200 — Whop retries on non-2xx
  return NextResponse.json({ ok: true, results });
}
