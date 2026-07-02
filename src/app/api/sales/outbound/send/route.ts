/* ── Outbound message send ──
 *
 * POST /api/sales/outbound/send
 * Body: { leadId, channel, body, by, recipient? }
 *   channel: "whatsapp" | "twitter" | "linkedin" | "email"
 *   recipient: optional explicit handle/email. Falls back to
 *     lead.email for email; lead.phone (when populated) for
 *     WhatsApp; lead.linkedin_url for LinkedIn; lead.twitter for
 *     Twitter. If no handle is resolvable the request errors with
 *     422 so the UI can prompt for one.
 *
 * Dispatch routes through unipile-adapter:
 *   - when UNIPILE_API_KEY + DSN + per-channel account ID set →
 *     real send via Unipile, returns stubbed:false +
 *     providerMessageId
 *   - any var missing → stub-mode (logs + records the touch so the
 *     dashboard inbox still feels real). Returns stubbed:true.
 *
 * Touch is always recorded regardless of provider result - the
 * dashboard is the source of truth, Unipile is just the transport. */

import { NextResponse } from "next/server";
import { leadsStore } from "@/lib/leads/data";
import type { LeadTouch } from "@/lib/leads/types";
import { sendMessage, type UnipileChannel } from "@/lib/sales-dashboard/unipile-adapter";
import {
  isBeeperLive,
  sendBeeperMessage,
} from "@/lib/sales-dashboard/beeper-adapter";

type OutboundChannel = "whatsapp" | "twitter" | "linkedin" | "email";
const SUPPORTED: OutboundChannel[] = ["whatsapp", "twitter", "linkedin", "email"];

/* Pull the per-channel handle off the Lead. Returns undefined if the
 * lead doesn't have what we need - the caller errors out so the UI
 * can prompt the user to add the missing field. */
function resolveRecipient(
  channel: OutboundChannel,
  lead: { email?: string; brand_url?: string; notes?: string },
): string | undefined {
  if (channel === "email") return lead.email;
  /* WhatsApp/Twitter/LinkedIn handles aren't first-class fields on
   * Lead yet - parked in notes as a soft pattern (e.g. "wa:+44..."
   * "li:profile-slug"). Sniff them out so an integration test can
   * round-trip without schema changes. Productionising this needs
   * dedicated fields on Lead. */
  const notes = lead.notes ?? "";
  if (channel === "whatsapp") {
    const m = notes.match(/wa:\s*([+\d\s\-()]+)/i);
    return m?.[1]?.trim();
  }
  if (channel === "linkedin") {
    const m = notes.match(/li:\s*([^\s]+)/i);
    return m?.[1]?.trim() ?? lead.brand_url;
  }
  if (channel === "twitter") {
    const m = notes.match(/(?:tw|x):\s*@?([\w]+)/i);
    return m?.[1]?.trim();
  }
  return undefined;
}

export async function POST(req: Request) {
  let payload: {
    leadId?: string;
    channel?: string;
    body?: string;
    by?: string;
    recipient?: string;
    subject?: string;
  };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { leadId, channel, body, by, subject } = payload;
  if (!leadId || !channel || !body || !by) {
    return NextResponse.json(
      { error: "Required: { leadId, channel, body, by }" },
      { status: 400 },
    );
  }
  if (!SUPPORTED.includes(channel as OutboundChannel)) {
    return NextResponse.json(
      { error: `Unsupported channel: ${channel}. Supported: ${SUPPORTED.join(", ")}` },
      { status: 400 },
    );
  }

  /* Unlinked chat path: leadId === "unlinked" means the caller is
   * sending into a Beeper chat that doesn't tie to a Lead yet.
   * Recipient must come from the request body (the Beeper chat id).
   * Skip lead lookup + touch recording. */
  const isUnlinked = leadId === "unlinked";
  let lead: Awaited<ReturnType<typeof leadsStore.getById>> = null;
  if (!isUnlinked) {
    lead = await leadsStore.getById(leadId);
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
  }

  const recipient =
    payload.recipient ??
    (lead ? resolveRecipient(channel as OutboundChannel, lead) : undefined);
  if (!recipient) {
    return NextResponse.json(
      {
        error: `No ${channel} recipient. Pass recipient in the request body OR add one to the lead first.`,
      },
      { status: 422 },
    );
  }

  /* Dispatch.
   * - If Beeper is configured AND the recipient looks like a
   *   Beeper chat ID (Matrix-style "!abc:beeper.com"), route there
   * - Otherwise fall back to Unipile */
  let dispatch: {
    ok: boolean;
    stubbed: boolean;
    providerMessageId?: string;
    error?: string;
  };
  if (isBeeperLive() && recipient.startsWith("!")) {
    const beeper = await sendBeeperMessage(recipient, body);
    dispatch = {
      ok: beeper.ok,
      stubbed: false,
      providerMessageId: beeper.pendingMessageID,
      error: beeper.error,
    };
  } else {
    dispatch = await sendMessage({
      channel: channel as UnipileChannel,
      recipient,
      body,
      subject,
    });
  }

  /* Record the outbound touch on the lead - skipped for unlinked
   * Beeper chats since there is no lead. The Beeper preview pane
   * re-fetches the thread after send so the new message appears
   * via the Beeper round-trip instead. */
  const now = new Date().toISOString();
  let touchId: string | undefined;
  if (lead && !isUnlinked) {
    const touch: LeadTouch = {
      id: `touch-${Math.random().toString(36).slice(2, 10)}`,
      kind: "outreach_sent",
      at: now,
      by: `${by} via ${channel}${dispatch.stubbed ? " (stub)" : ""}`,
      summary: dispatch.ok
        ? body.slice(0, 500)
        : `${body.slice(0, 400)}\n\n[send failed: ${dispatch.error ?? "unknown"}]`,
    };
    await leadsStore.update(leadId, {
      touches: [...lead.touches, touch],
      last_touched_at: now,
      updated_at: now,
    });
    touchId = touch.id;
  }

  return NextResponse.json(
    {
      ok: dispatch.ok,
      leadId,
      channel,
      touchId,
      stubbed: dispatch.stubbed,
      providerMessageId: dispatch.providerMessageId,
      error: dispatch.error,
    },
    { status: dispatch.ok ? 200 : 502 },
  );
}
