/* ── Inbound message ingestion (shared by all channel adapters) ──
 *
 * Every inbound webhook (WhatsApp Business / Twitter X DM /
 * LinkedIn Messaging / Email-via-Postmark) routes through here.
 * The route handler unwraps the channel's specific payload shape
 * and calls processInboundMessage(); we resolve the matching Lead
 * (by email or by an externally-stored handle), append an inbound
 * touch, and return the result so the route handler can ack 200
 * back to the provider.
 *
 * If no Lead matches, we DON'T auto-create one - sending mystery
 * leads into the pipeline would pollute it. Instead we log the
 * orphan and return { matched: false } so a future "Orphan
 * inbox" UI can surface them for the closer to triage. */

import { leadsStore } from "@/lib/leads/data";
import type { Lead, LeadTouch } from "@/lib/leads/types";

export type InboundChannel = "whatsapp" | "twitter" | "linkedin" | "email";

/* Canonical payload every channel adapter normalises into. */
export interface InboundMessage {
  channel: InboundChannel;
  /* The sender's identifier on the channel. For email this is
   * the from address. For Twitter/LinkedIn this is the handle.
   * For WhatsApp this is the phone number with country code. */
  from: string;
  body: string;
  /* Provider message id for dedupe (avoids double-processing
   * the same webhook fired twice). Optional. */
  external_id?: string;
  /* Subject line for emails. Optional. */
  subject?: string;
}

export interface InboundResult {
  matched: boolean;
  leadId?: string;
  reason?: string;
}

/* Channel → which Lead field to match `from` against. Today only
 * email is reliably stored on a Lead. Twitter/LinkedIn/WhatsApp
 * matching is best-effort (handles in lead.notes / lead.source) -
 * the heuristic below scans the touches log too. */
function findMatchingLead(message: InboundMessage, leads: Lead[]): Lead | null {
  const needle = message.from.trim().toLowerCase();
  if (!needle) return null;
  for (const lead of leads) {
    if (message.channel === "email") {
      if (lead.email.trim().toLowerCase() === needle) return lead;
    }
    /* Best-effort match: handle appears anywhere in source / notes
     * / past touches. Lets the closer link by typing the handle
     * into the notes blob when they manually add the lead. */
    const hay = `${lead.source} ${lead.notes} ${lead.touches.map((t) => t.summary).join(" ")}`.toLowerCase();
    if (hay.includes(needle)) return lead;
  }
  return null;
}

/* All inbound messages map to "reply_received" - the channel is
 * encoded in touch.by ("whatsapp:+447...") so the inbox UI can
 * still differentiate. Avoids extending LeadTouchKind which is
 * used by other surfaces. */
export async function processInboundMessage(
  message: InboundMessage,
): Promise<InboundResult> {
  const all = await leadsStore.getAll();
  const lead = findMatchingLead(message, all);
  if (!lead) {
    console.warn(
      `[sales-dashboard/inbound] No lead match for ${message.channel} from ${message.from}`,
    );
    return { matched: false, reason: "no_lead_match" };
  }
  const now = new Date().toISOString();
  const summary = [
    message.subject ? `${message.subject}: ` : "",
    message.body,
  ].join("").trim().slice(0, 500);
  const touch: LeadTouch = {
    id: `touch-${Math.random().toString(36).slice(2, 10)}`,
    kind: "reply_received",
    at: now,
    by: `${message.channel}:${message.from}`,
    summary,
  };
  await leadsStore.update(lead.id, {
    touches: [...lead.touches, touch],
    last_touched_at: now,
    updated_at: now,
  });
  return { matched: true, leadId: lead.id };
}
