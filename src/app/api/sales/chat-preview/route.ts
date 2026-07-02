/* ── Live chat preview ──
 *
 * GET /api/sales/chat-preview?channel=whatsapp&chatId=...
 *
 * Fetches a specific chat's messages directly from Unipile (no
 * caching, no DB). Returns the normalised thread + the contact's
 * display name extracted from message pushName.
 *
 * Used by the Inbox to show the FULL conversation when the user
 * clicks an unlinked chat - so they can read it before deciding
 * to promote to a lead.
 */

import { NextResponse } from "next/server";
import {
  previewChat,
  type UnipileChannel,
} from "@/lib/sales-dashboard/unipile-adapter";
import {
  isBeeperLive,
  previewChatBeeper,
} from "@/lib/sales-dashboard/beeper-adapter";

const SUPPORTED: UnipileChannel[] = ["whatsapp", "linkedin", "email"];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const channel = url.searchParams.get("channel") as UnipileChannel | null;
  const chatId = url.searchParams.get("chatId");
  if (!channel || !SUPPORTED.includes(channel)) {
    return NextResponse.json(
      { error: `Required ?channel=. Supported: ${SUPPORTED.join(", ")}` },
      { status: 400 },
    );
  }
  if (!chatId) {
    return NextResponse.json(
      { error: "Required ?chatId=..." },
      { status: 400 },
    );
  }

  /* Beeper path - one local API call returns the full thread
   * with names, attachments, and proper isSender flags built in. */
  if (isBeeperLive()) {
    const beeper = await previewChatBeeper(chatId, 500);
    if (!beeper.ok) {
      return NextResponse.json(
        { error: beeper.error ?? "Beeper preview failed" },
        { status: 502 },
      );
    }
    return NextResponse.json({
      ok: true,
      provider: "beeper",
      attendee_name: beeper.chat?.title,
      attendee_handle: beeper.chat?.id ?? chatId,
      messages: beeper.messages.map((m) => ({
        body: m.text ?? "",
        direction: m.isSender ? "outbound" : "inbound",
        sent_at: m.timestamp,
        external_id: m.id,
        attachments: (m.attachments ?? []).map((a) => ({
          id: a.id ?? "",
          type: a.type ?? "file",
          mimetype: a.mimeType,
          srcURL: a.srcURL,
        })),
        senderName: m.senderName,
      })),
    });
  }

  /* maxMessages defaults to 500 - covers months of normal chat
   * history. Pagination inside previewChat walks the Unipile cursor
   * until it's exhausted or the cap is hit. */
  const result = await previewChat(channel, chatId, 500);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Preview fetch failed" },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    attendee_name: result.attendee_name,
    attendee_handle: result.attendee_handle,
    /* Sort oldest-first for thread display. */
    messages: result.messages.sort((a, b) =>
      (a.sent_at ?? "").localeCompare(b.sent_at ?? ""),
    ),
  });
}
