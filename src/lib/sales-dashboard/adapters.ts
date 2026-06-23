// Sales Dashboard — unified inbox channel adapters.
//
// One common interface, one adapter per channel. At wire-up each adapter's
// `syncInbound` runs on a webhook/cron and writes lead_messages (deduped on
// external_id); `send` performs the outbound action and returns the message
// it logged. For the preview these are MOCK implementations — they mutate
// in-memory state only and never hit a network.
//
// Channel reality check (documented for the build summary):
//   - email     → existing Gmail integration. Full two-way. (stub)
//   - whatsapp  → Meta WhatsApp Cloud API (or Twilio). Two-way. (stub)
//   - instagram → Meta Graph API IG Messaging (needs IG Business + FB Page).
//                 Two-way. (stub)
//   - linkedin  → NO official API for general/sales DMs. v1 = MANUAL logging
//                 only. Adapter implements `send` as a local log; `syncInbound`
//                 is a no-op. Upgrade paths flagged in the build summary.

import type { Channel, Lead, LeadMessage, MessageDirection } from "./types";

export interface InboundMessage {
  /** Provider id, used to dedupe. */
  externalId: string;
  /** Best-effort sender identity to match/create a lead. */
  fromEmail?: string;
  fromPhone?: string;
  fromHandle?: string;
  fromName?: string;
  subject: string;
  body: string;
  receivedAt: string;
}

export interface OutboundMessage {
  leadId: string;
  subject: string;
  body: string;
}

export interface ChannelAdapter {
  channel: Channel;
  label: string;
  /** Whether this channel supports programmatic inbound sync + outbound send. */
  twoWay: boolean;
  /** Pull new inbound messages from the provider (mock: returns []). */
  syncInbound(): Promise<InboundMessage[]>;
  /** Send an outbound message; returns the row to persist. */
  send(msg: OutboundMessage): Promise<Omit<LeadMessage, "id" | "is_read">>;
}

function outboundRow(
  channel: Channel,
  msg: OutboundMessage,
  externalId: string | null,
  now: string,
): Omit<LeadMessage, "id" | "is_read"> {
  return {
    lead_id: msg.leadId,
    channel,
    direction: "outbound" as MessageDirection,
    subject: msg.subject,
    body: msg.body,
    external_id: externalId,
    created_at: now,
  };
}

// --- Two-way provider adapters (stubbed for preview) -----------------------

export const gmailAdapter: ChannelAdapter = {
  channel: "email",
  label: "Email",
  twoWay: true,
  async syncInbound() {
    // Wire-up: reuse existing Gmail integration, list since last sync,
    // map each thread message → InboundMessage, dedupe on Gmail message id.
    return [];
  },
  async send(msg) {
    // Wire-up: Gmail send API. external_id = returned message id.
    return outboundRow("email", msg, `mock-gmail-${msg.leadId}`, new Date().toISOString());
  },
};

export const whatsappAdapter: ChannelAdapter = {
  channel: "whatsapp",
  label: "WhatsApp",
  twoWay: true,
  async syncInbound() {
    // Wire-up: Meta WhatsApp Cloud API inbound webhook → InboundMessage.
    return [];
  },
  async send(msg) {
    return outboundRow("whatsapp", msg, `mock-wa-${msg.leadId}`, new Date().toISOString());
  },
};

export const instagramAdapter: ChannelAdapter = {
  channel: "instagram",
  label: "Instagram",
  twoWay: true,
  async syncInbound() {
    // Wire-up: Meta Graph API IG Messaging webhook → InboundMessage.
    return [];
  },
  async send(msg) {
    return outboundRow("instagram", msg, `mock-ig-${msg.leadId}`, new Date().toISOString());
  },
};

// --- Manual-only adapter ---------------------------------------------------

export const linkedinAdapter: ChannelAdapter = {
  channel: "linkedin",
  label: "LinkedIn (manual)",
  twoWay: false,
  async syncInbound() {
    // No official LinkedIn API for general/sales messaging. No-op by design.
    return [];
  },
  async send(msg) {
    // "Send" = log what you sent manually. No external id.
    return outboundRow("linkedin", msg, null, new Date().toISOString());
  },
};

export const ADAPTERS: Record<Channel, ChannelAdapter | undefined> = {
  email: gmailAdapter,
  whatsapp: whatsappAdapter,
  twitter: undefined,  // wired via /api/sales/outbound/send stub; see docs/sales-integrations.md
  instagram: instagramAdapter,
  linkedin: linkedinAdapter,
  cal_com: undefined, // intake-only; surfaced in inbox, not replied to here
  lander: undefined, // intake-only
  manual: undefined, // logged directly, no provider
};

/**
 * Match an inbound message to an existing lead by email/phone/handle, or
 * signal that a new lead should be created (source = channel, stage = New).
 * Pure matcher — caller does the create. Returns the matched lead id or null.
 */
export function matchLead(inbound: InboundMessage, leads: Lead[]): string | null {
  const byEmail =
    inbound.fromEmail && leads.find((l) => l.email.toLowerCase() === inbound.fromEmail!.toLowerCase());
  if (byEmail) return byEmail.id;
  const byPhone = inbound.fromPhone && leads.find((l) => l.phone === inbound.fromPhone);
  if (byPhone) return byPhone.id;
  return null;
}
