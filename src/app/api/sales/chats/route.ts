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
import {
  isBeeperLive,
  listChatsBeeper,
} from "@/lib/sales-dashboard/beeper-adapter";

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

  /* Beeper path - when BEEPER_API_URL + BEEPER_API_TOKEN are set,
   * use Beeper Desktop as the source of truth. Names + avatars come
   * pre-resolved on chat.title / chat.imgURL so we skip the per-chat
   * attendee enrichment that the Unipile path needs. */
  if (isBeeperLive()) {
    const beeper = await listChatsBeeper(500);
    if (!beeper.ok) {
      return NextResponse.json(
        { error: beeper.error ?? "Beeper fetch failed" },
        { status: 502 },
      );
    }
    /* Filter to chats whose network matches the requested channel
     * (whatsapp / linkedin / email). Network strings are
     * human-readable so we lowercase-compare contains. */
    const wanted = channel.toLowerCase();
    const channelChats = beeper.chats.filter((c) => {
      const network = c.network.toLowerCase();
      if (wanted === "email") {
        return network.includes("gmail") || network.includes("mail");
      }
      if (wanted === "whatsapp") return network.includes("whatsapp");
      if (wanted === "linkedin") return network.includes("linkedin");
      return false;
    });

    const leadsAll = await leadsStore.getAll();
    const matchedB: MatchedChat[] = [];
    const unmatchedB: ChatSummary[] = [];
    for (const c of channelChats) {
      /* ChatWithPreview nests last-message text under `preview.text`.
       * Surface it + the unread count, avatar, network badge, type
       * (single/group) so the inbox list can render them. */
      const preview =
        (c as unknown as { preview?: { text?: string } }).preview ?? {};
      const summary: ChatSummary & {
        unread_count?: number;
        imgURL?: string | null;
        network?: string;
        chat_type?: "single" | "group";
      } = {
        id: c.id,
        attendee_handle: c.id,         // Beeper IDs are opaque
        attendee_name: c.title || c.id,
        last_message_preview: preview.text?.slice(0, 80),
        last_message_at: c.lastActivity,
        last_message_direction: undefined,
        unread_count: c.unreadCount,
        imgURL: c.imgURL,
        network: c.network,
        chat_type: c.type,
      };
      /* TODO: tighter lead match by email-in-participants or
       * phone-in-id. For first cut, everything Beeper sends is in
       * the unmatched pile unless title equals an existing lead's
       * brand or name. */
      const lead = leadsAll.find(
        (l) =>
          (l.full_name && l.full_name === c.title) ||
          (l.brand_name && l.brand_name === c.title),
      );
      if (lead) {
        matchedB.push({
          ...summary,
          lead_id: lead.id,
          lead_name: lead.full_name,
          lead_company: lead.brand_name,
        });
      } else {
        unmatchedB.push(summary);
      }
    }
    /* Sort: unread first (by count desc), then by lastActivity desc.
     * Mirrors how WhatsApp / Beeper themselves order — unread chats
     * are the things that need attention. */
    const sortByUnreadThenActivity = (
      a: ChatSummary & { unread_count?: number },
      b: ChatSummary & { unread_count?: number },
    ) => {
      const ua = a.unread_count ?? 0;
      const ub = b.unread_count ?? 0;
      if (ua !== ub) return ub - ua;
      return (b.last_message_at ?? "").localeCompare(a.last_message_at ?? "");
    };
    matchedB.sort(sortByUnreadThenActivity);
    unmatchedB.sort(sortByUnreadThenActivity);
    return NextResponse.json({
      ok: true,
      channel,
      provider: "beeper",
      matched: matchedB,
      unmatched: unmatchedB,
      totals: {
        matched: matchedB.length,
        unmatched: unmatchedB.length,
        total: channelChats.length,
      },
    });
  }

  /* Unipile path (fallback / existing). */
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
