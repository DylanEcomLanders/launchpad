/* ── Promote an unlinked chat to a Lead ──
 *
 * POST /api/sales/promote-chat
 * Body: {
 *   channel: "whatsapp" | "linkedin" | "email",
 *   attendee_handle: string,    // phone for WA, email for mail, slug for LI
 *   attendee_name?: string,
 *   source?: string,            // optional - defaults to channel
 *   owner?: string,             // optional - defaults to "Ajay"
 * }
 *
 * Creates a new Lead with channel handle saved to the right field
 * (phone for WhatsApp, email for email), then backfills the chat
 * history into it by calling fetchChatHistory inline. Returns
 * { ok, leadId, imported }.
 *
 * Used by the orphan inbox - click an unlinked chat → "Promote to
 * lead" → new lead appears in the matched section with full history.
 */

import { NextResponse } from "next/server";
import { leadsStore } from "@/lib/leads/data";
import type { Lead, LeadTouch } from "@/lib/leads/types";
import {
  fetchChatHistory,
  type UnipileChannel,
} from "@/lib/sales-dashboard/unipile-adapter";

const SUPPORTED: UnipileChannel[] = ["whatsapp", "linkedin", "email"];

export async function POST(req: Request) {
  let payload: {
    channel?: string;
    attendee_handle?: string;
    attendee_name?: string;
    source?: string;
    owner?: string;
  };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { channel, attendee_handle, attendee_name, source, owner } = payload;
  if (!channel || !attendee_handle) {
    return NextResponse.json(
      { error: "Required: { channel, attendee_handle }" },
      { status: 400 },
    );
  }
  if (!SUPPORTED.includes(channel as UnipileChannel)) {
    return NextResponse.json(
      { error: `Unsupported channel: ${channel}. Supported: ${SUPPORTED.join(", ")}` },
      { status: 400 },
    );
  }

  /* Idempotency: if a Lead already exists for this handle on this
   * channel, return it instead of creating a duplicate. Prevents
   * accidental double-promotes if the user clicks fast. */
  const leads = await leadsStore.getAll();
  const existing = leads.find((l) => {
    if (channel === "whatsapp") {
      const phone = l.phone?.replace(/\D/g, "").replace(/^0+/, "");
      const handle = attendee_handle.replace(/\D/g, "").replace(/^0+/, "");
      return phone && handle && (phone === handle || phone.endsWith(handle) || handle.endsWith(phone));
    }
    if (channel === "email") {
      return l.email && l.email.toLowerCase() === attendee_handle.toLowerCase();
    }
    return false;
  });
  if (existing) {
    return NextResponse.json({
      ok: true,
      leadId: existing.id,
      created: false,
      imported: 0,
      message: "Already promoted",
    });
  }

  /* Build the new Lead. Channel-specific fields land in the right
   * place: WhatsApp handle → phone, email handle → email. Notes
   * gets a "wa:" / "li:" hint so the existing recipient-resolution
   * in /api/sales/outbound/send keeps working. */
  const now = new Date().toISOString();
  const phoneE164 =
    channel === "whatsapp" && /^\d+$/.test(attendee_handle)
      ? `+${attendee_handle}`
      : undefined;
  const notesHint =
    channel === "whatsapp"
      ? `wa:${phoneE164 ?? attendee_handle}`
      : channel === "linkedin"
        ? `li:${attendee_handle}`
        : "";

  const lead: Lead = {
    id: `lead-${Math.random().toString(36).slice(2, 10)}`,
    full_name: attendee_name?.trim() || "Unknown contact",
    brand_name: "",
    brand_url: "",
    email: channel === "email" ? attendee_handle : "",
    phone: channel === "whatsapp" ? (phoneE164 ?? attendee_handle) : undefined,
    path: "cold_direct",
    stage: "new",
    source: source?.trim() || `${channel} inbound`,
    owner: owner?.trim() || "Ajay",
    revenue_band: "",
    next_action: "Read the thread",
    notes: notesHint,
    touches: [],
    sales_calls: [],
    created_at: now,
    updated_at: now,
  };

  /* Backfill the chat history immediately - that's the whole point
   * of promoting. Fail soft: lead is created even if history fetch
   * errors, user can re-sync later. */
  const recipientForHistory =
    channel === "whatsapp" ? (phoneE164 ?? attendee_handle) : attendee_handle;
  const history = await fetchChatHistory(
    channel as UnipileChannel,
    recipientForHistory,
    100,
  );

  if (history.ok && history.messages.length > 0) {
    const touches: LeadTouch[] = history.messages.map((m) => ({
      id: `touch-${Math.random().toString(36).slice(2, 10)}`,
      kind: m.direction === "outbound" ? "outreach_sent" : "reply_received",
      at: m.sent_at ?? now,
      by: m.direction === "outbound" ? "Ajay" : "Contact",
      summary: m.body.slice(0, 500),
      external_id: m.external_id,
      channel,
    }));
    touches.sort((a, b) => a.at.localeCompare(b.at));
    lead.touches = touches;
    lead.last_touched_at = touches[touches.length - 1].at;
  }

  await leadsStore.create(lead);

  return NextResponse.json({
    ok: true,
    leadId: lead.id,
    created: true,
    imported: lead.touches.length,
    historyError: history.ok ? undefined : history.error,
  });
}
