import { NextResponse } from "next/server";
import crypto from "crypto";
import { WebClient } from "@slack/web-api";
import { supabase } from "@/lib/supabase";

// ── Shopify draft_orders/update webhook handler ─────────────────
// Fires on every draft order update — only acts when status is "completed"
// (i.e. client has paid). Verifies HMAC, marks proposal as converted,
// creates private Slack channel, invites team, and posts summary.

export async function POST(request: Request) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook] Missing SHOPIFY_WEBHOOK_SECRET");
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 }
    );
  }

  // ── 1. HMAC verification ────────────────────────────────────
  const rawBody = await request.text();
  const hmacHeader = request.headers.get("X-Shopify-Hmac-Sha256");

  if (!hmacHeader) {
    return NextResponse.json(
      { error: "Missing HMAC header" },
      { status: 401 }
    );
  }

  const expectedHmac = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");

  try {
    if (
      !crypto.timingSafeEqual(
        Buffer.from(hmacHeader),
        Buffer.from(expectedHmac)
      )
    ) {
      return NextResponse.json({ error: "Invalid HMAC" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid HMAC" }, { status: 401 });
  }

  // ── 2. Parse draft order ───────────────────────────────────
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let order: any;
  try {
    order = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // Only act when the draft order has been completed (paid)
  if (order.status !== "completed") {
    return NextResponse.json({ ok: true, skipped: true, reason: "not_completed" });
  }

  const noteAttributes: { name: string; value: string }[] =
    order.note_attributes || [];
  const proposalToken = noteAttributes.find(
    (a) => a.name === "proposal_token"
  )?.value;
  const clientName =
    noteAttributes.find((a) => a.name === "client_name")?.value || "Unknown";
  const clientEmail =
    noteAttributes.find((a) => a.name === "client_email")?.value || order.email;

  // If there's no proposal token this order wasn't from our flow — still return 200
  if (!proposalToken) {
    return NextResponse.json({ ok: true, skipped: true, reason: "no_token" });
  }

  // ── Track which steps succeed ───────────────────────────────
  const results = {
    supabase: false,
    slack_channel: false,
    slack_invite: false,
    slack_message: false,
  };

  // ── 3. Update Supabase — mark converted ─────────────────────
  try {
    const lineItems = (order.line_items || []).map(
      (li: { title: string; quantity: number; price: string }) => ({
        serviceId: li.title,
        mode: "one-off",
        quantity: li.quantity,
      })
    );

    await supabase
      .from("proposals")
      .update({
        converted: true,
        converted_at: new Date().toISOString(),
        selected_services: lineItems,
        order_total_cents: Math.round(
          parseFloat(order.total_price || "0") * 100
        ),
        shopify_order_id: String(order.id),
      })
      .eq("token", proposalToken);

    results.supabase = true;
  } catch (err) {
    console.error("[webhook] Supabase update failed:", err);
  }

  // ── 4. Create Slack channel ─────────────────────────────────
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
        // Name clash (could be archived channel) — retry with short suffix
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

    // ── 5. Invite team to channel ──────────────────────────────
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
          // Already in channel or self-invite are fine
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

      // ── 6. Post onboarding summary to ops channel ──────────────
      const opsChannelId = process.env.SLACK_OPS_CHANNEL_ID;
      if (opsChannelId) {
        try {
          const lineItemText = (order.line_items || [])
            .map(
              (li: { title: string; quantity: number; price: string }) =>
                `${li.title} x${li.quantity} (£${li.price})`
            )
            .join(", ");

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
              `:moneybag: *Value:* £${order.total_price}\n` +
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

  // ── 7. Set channel topic with client email ──────────────────
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

  // Always return 200 — Shopify retries on non-200
  return NextResponse.json({ ok: true, results });
}
