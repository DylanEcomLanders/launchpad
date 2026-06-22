/* ── Outbound message send (stub today, router tomorrow) ──
 *
 * POST /api/sales/outbound/send
 * Body: { leadId: string, channel: "whatsapp" | "twitter" |
 *         "linkedin" | "email", body: string, by: string }
 *
 * Today: appends an outbound touch to the Lead's log + console-logs
 * the intent. The UI feels real (touch shows in the inbox) but no
 * real message goes out.
 *
 * Tomorrow: this becomes a router that dispatches to the right
 * provider client (WhatsApp Business API, Twitter X DM API,
 * LinkedIn Messaging API, Postmark / Resend). The dashboard UI
 * doesn't change - only the per-channel TODO branches below get
 * filled in. See docs/integrations.md. */

import { NextResponse } from "next/server";
import { leadsStore } from "@/lib/leads/data";
import type { LeadTouch } from "@/lib/leads/types";

type OutboundChannel = "whatsapp" | "twitter" | "linkedin" | "email";
const SUPPORTED: OutboundChannel[] = ["whatsapp", "twitter", "linkedin", "email"];

export async function POST(req: Request) {
  let payload: {
    leadId?: string;
    channel?: string;
    body?: string;
    by?: string;
  };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { leadId, channel, body, by } = payload;
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

  const lead = await leadsStore.getById(leadId);
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  /* TODO: route to real provider when API tokens are wired.
   * Each branch lives behind a feature flag / env-var presence:
   *   if (process.env.WHATSAPP_API_TOKEN) await whatsappSend(...)
   * Until then, log the intent so debugging is easy. */
  switch (channel as OutboundChannel) {
    case "whatsapp":
      console.info(`[sales/outbound] WhatsApp → lead ${leadId}: ${body.slice(0, 80)}`);
      break;
    case "twitter":
      console.info(`[sales/outbound] Twitter X DM → lead ${leadId}: ${body.slice(0, 80)}`);
      break;
    case "linkedin":
      console.info(`[sales/outbound] LinkedIn → lead ${leadId}: ${body.slice(0, 80)}`);
      break;
    case "email":
      console.info(`[sales/outbound] Email → lead ${leadId}: ${body.slice(0, 80)}`);
      break;
  }

  /* Record the outbound touch regardless - the dashboard inbox
   * reads from lead.touches so the user sees the message land. */
  const now = new Date().toISOString();
  const touch: LeadTouch = {
    id: `touch-${Math.random().toString(36).slice(2, 10)}`,
    kind: "outreach_sent",
    at: now,
    by: `${by} via ${channel}`,
    summary: body.slice(0, 500),
  };
  await leadsStore.update(leadId, {
    touches: [...lead.touches, touch],
    last_touched_at: now,
    updated_at: now,
  });

  return NextResponse.json(
    { ok: true, leadId, channel, touchId: touch.id, stubbed: true },
    { status: 200 },
  );
}
