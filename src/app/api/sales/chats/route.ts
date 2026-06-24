/* ── Sales chats feed ──
 *
 * GET /api/sales/chats?channel=whatsapp
 *
 * Pulls every chat from Unipile on the given channel and splits them
 * into:
 *   matched    -> chats whose attendee_handle ties to an existing
 *                 Lead (by phone for WhatsApp, by email for email, by
 *                 linkedin handle for LinkedIn)
 *   unmatched  -> chats with no Lead match yet. Surfaced in the inbox
 *                 as the "Unlinked" section so the user can promote
 *                 them with one click.
 *
 * Returns { ok, matched, unmatched, error? }. matched includes the
 * leadId so the inbox can deep-link to the existing conversation.
 *
 * This is on-demand fetch (no caching today). Inbox calls it on mount
 * and on channel-filter change. Could add an in-memory cache later
 * if call volume grows.
 */

import { NextResponse } from "next/server";
import { leadsStore } from "@/lib/leads/data";
import type { Lead } from "@/lib/leads/types";
import {
  listChats,
  fetchChatAttendees,
  type ChatSummary,
  type UnipileChannel,
} from "@/lib/sales-dashboard/unipile-adapter";

const SUPPORTED: UnipileChannel[] = ["whatsapp", "linkedin", "email"];

interface MatchedChat extends ChatSummary {
  lead_id: string;
  lead_name: string;
  lead_company: string;
}

/* Strip non-digits + leading zeros to normalise WhatsApp numbers
 * across Unipile's various phone formats (e164, with-country-code,
 * with-suffix etc). Two phones match if their digit-only forms are
 * equal OR one is a suffix of the other (handles "07712..." vs
 * "+447712..."). */
function phonesMatch(a: string, b: string): boolean {
  const aD = a.replace(/\D/g, "").replace(/^0+/, "");
  const bD = b.replace(/\D/g, "").replace(/^0+/, "");
  if (!aD || !bD) return false;
  return aD === bD || aD.endsWith(bD) || bD.endsWith(aD);
}

function leadMatchesChat(
  channel: UnipileChannel,
  lead: Lead,
  chat: ChatSummary,
): boolean {
  if (channel === "whatsapp") {
    if (!lead.phone) {
      /* Fallback: legacy leads with "wa:+44..." in notes still
       * count as matched. */
      const m = lead.notes?.match(/wa:\s*([+\d\s\-()]+)/i);
      if (!m) return false;
      return phonesMatch(m[1], chat.attendee_handle);
    }
    return phonesMatch(lead.phone, chat.attendee_handle);
  }
  if (channel === "email") {
    return (
      !!lead.email &&
      lead.email.toLowerCase() === chat.attendee_handle.toLowerCase()
    );
  }
  if (channel === "linkedin") {
    /* LinkedIn handle/profile match - best-effort, sniff from
     * notes "li:..." or brand_url. */
    const liNotes = lead.notes?.match(/li:\s*([^\s]+)/i)?.[1];
    if (liNotes && chat.attendee_handle.toLowerCase().includes(liNotes.toLowerCase())) {
      return true;
    }
    if (lead.brand_url && chat.attendee_handle.toLowerCase().includes(lead.brand_url.toLowerCase())) {
      return true;
    }
    return false;
  }
  return false;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const channel = url.searchParams.get("channel") as UnipileChannel | null;
  if (!channel || !SUPPORTED.includes(channel)) {
    return NextResponse.json(
      { error: `Required ?channel=. Supported: ${SUPPORTED.join(", ")}` },
      { status: 400 },
    );
  }

  const result = await listChats(channel);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Unipile fetch failed" },
      { status: 502 },
    );
  }

  /* Enrich each chat with the contact's saved name from Unipile's
   * attendees endpoint (which DOES expose Ajay's address-book names).
   * Parallel-fetched to keep the response fast - 50 chats in ~1-2s
   * on a healthy Unipile connection. */
  const enriched = await Promise.all(
    result.chats.map(async (chat) => {
      const att = await fetchChatAttendees(channel, chat.id);
      const other = att.attendees.find((a) => !a.is_self && a.name);
      if (other?.name) {
        return { ...chat, attendee_name: other.name };
      }
      return chat;
    }),
  );

  /* Match each chat against the lead store. O(chats * leads) is
   * fine for small N; if Ajay accumulates thousands of leads, index
   * by phone/email upfront here. */
  const leads = await leadsStore.getAll();
  const matched: MatchedChat[] = [];
  const unmatched: ChatSummary[] = [];

  for (const chat of enriched) {
    const lead = leads.find((l) => leadMatchesChat(channel, l, chat));
    if (lead) {
      matched.push({
        ...chat,
        lead_id: lead.id,
        lead_name: lead.full_name,
        lead_company: lead.brand_name,
      });
    } else {
      unmatched.push(chat);
    }
  }

  return NextResponse.json({
    ok: true,
    channel,
    matched,
    unmatched,
    totals: {
      matched: matched.length,
      unmatched: unmatched.length,
      total: result.chats.length,
    },
  });
}
