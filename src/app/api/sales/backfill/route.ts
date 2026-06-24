/* ── Sales backfill: pull conversation history from Unipile ──
 *
 * POST /api/sales/backfill
 * Body: { leadId: string, channel: "whatsapp" | "linkedin" | "email" }
 *
 * Hits Unipile's chats endpoint, finds the chat matching the lead's
 * recipient on that channel, pulls up to 100 messages, dedupes against
 * existing touches by external_id, appends new ones to lead.touches.
 *
 * Safe to re-run: dedup is on external_id, so a second sync is a
 * no-op unless new messages arrived since.
 *
 * Returns { ok, imported, alreadyHad, error? }. Imported is the count
 * of NEW touches that landed; alreadyHad is the count of historical
 * messages we already knew about (useful diagnostic). */

import { NextResponse } from "next/server";
import { leadsStore } from "@/lib/leads/data";
import type { Lead, LeadTouch } from "@/lib/leads/types";
import {
  fetchChatHistory,
  type UnipileChannel,
} from "@/lib/sales-dashboard/unipile-adapter";

type SupportedChannel = "whatsapp" | "linkedin" | "email";
const SUPPORTED: SupportedChannel[] = ["whatsapp", "linkedin", "email"];

/* Same recipient resolver as outbound/send. Different code path
 * (POST handler) so we keep it inline rather than splitting into a
 * shared lib until a third call-site appears. */
function resolveRecipient(
  channel: SupportedChannel,
  lead: Lead,
): string | undefined {
  if (channel === "email") return lead.email;
  const notes = lead.notes ?? "";
  if (channel === "whatsapp") {
    const m = notes.match(/wa:\s*([+\d\s\-()]+)/i);
    return m?.[1]?.trim();
  }
  if (channel === "linkedin") {
    const m = notes.match(/li:\s*([^\s]+)/i);
    return m?.[1]?.trim() ?? lead.brand_url;
  }
  return undefined;
}

export async function POST(req: Request) {
  let payload: { leadId?: string; channel?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { leadId, channel } = payload;
  if (!leadId || !channel) {
    return NextResponse.json(
      { error: "Required: { leadId, channel }" },
      { status: 400 },
    );
  }
  if (!SUPPORTED.includes(channel as SupportedChannel)) {
    return NextResponse.json(
      {
        error: `Unsupported channel: ${channel}. Supported: ${SUPPORTED.join(", ")}`,
      },
      { status: 400 },
    );
  }

  const lead = await leadsStore.getById(leadId);
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const recipient = resolveRecipient(channel as SupportedChannel, lead);
  if (!recipient) {
    return NextResponse.json(
      {
        error: `No ${channel} recipient on this lead. Add one to the lead first (notes field, e.g. "wa:+44...").`,
      },
      { status: 422 },
    );
  }

  const history = await fetchChatHistory(
    channel as UnipileChannel,
    recipient,
    100,
  );
  if (!history.ok) {
    return NextResponse.json(
      { error: history.error ?? "Unipile fetch failed" },
      { status: 502 },
    );
  }

  /* Dedupe against existing touches. external_id is the source-of-truth
   * - falls back to (kind + summary + at) for older touches that
   * don't have provider IDs. */
  const existingIds = new Set(
    lead.touches
      .map((t) => t.external_id)
      .filter((id): id is string => !!id),
  );
  const existingFingerprints = new Set(
    lead.touches.map((t) => `${t.kind}|${t.summary}|${t.at}`),
  );

  const now = new Date().toISOString();
  const toAdd: LeadTouch[] = [];
  let alreadyHad = 0;

  for (const m of history.messages) {
    if (m.external_id && existingIds.has(m.external_id)) {
      alreadyHad++;
      continue;
    }
    const at = m.sent_at ?? now;
    const kind = m.direction === "outbound" ? "outreach_sent" : "reply_received";
    const summary = m.body.slice(0, 500);
    const fingerprint = `${kind}|${summary}|${at}`;
    if (existingFingerprints.has(fingerprint)) {
      alreadyHad++;
      continue;
    }
    toAdd.push({
      id: `touch-${Math.random().toString(36).slice(2, 10)}`,
      kind,
      at,
      by: m.direction === "outbound" ? "Ajay" : "Contact",
      summary,
      external_id: m.external_id,
      channel,
    });
  }

  if (toAdd.length === 0) {
    return NextResponse.json({ ok: true, imported: 0, alreadyHad });
  }

  /* Sort by timestamp so chronology is preserved when rendered. */
  const merged = [...lead.touches, ...toAdd].sort((a, b) =>
    a.at.localeCompare(b.at),
  );
  const lastAt = merged[merged.length - 1]?.at ?? now;
  await leadsStore.update(leadId, {
    touches: merged,
    last_touched_at: lastAt,
    updated_at: now,
  });

  return NextResponse.json({
    ok: true,
    imported: toAdd.length,
    alreadyHad,
  });
}
