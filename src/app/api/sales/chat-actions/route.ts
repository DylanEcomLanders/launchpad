/* ── Beeper chat actions: mark read + archive ──
 *
 * POST /api/sales/chat-actions
 * Body: { chatId: string, action: "read" | "archive" | "unarchive" }
 *
 * Wraps Beeper's /v1/chats/{id}/read and /v1/chats/{id}/archive
 * endpoints behind one route so the Inbox doesn't need to know
 * about Beeper directly. Returns { ok, error? }.
 */

import { NextResponse } from "next/server";
import {
  isBeeperLive,
  markBeeperChatRead,
  archiveBeeperChat,
} from "@/lib/sales-dashboard/beeper-adapter";

export async function POST(req: Request) {
  if (!isBeeperLive()) {
    return NextResponse.json(
      { error: "Beeper not configured" },
      { status: 501 },
    );
  }
  let payload: { chatId?: string; action?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { chatId, action } = payload;
  if (!chatId || !action) {
    return NextResponse.json(
      { error: "Required: { chatId, action }" },
      { status: 400 },
    );
  }
  if (action === "read") {
    const r = await markBeeperChatRead(chatId);
    return NextResponse.json(r, { status: r.ok ? 200 : 502 });
  }
  if (action === "archive" || action === "unarchive") {
    const r = await archiveBeeperChat(chatId, action === "archive");
    return NextResponse.json(r, { status: r.ok ? 200 : 502 });
  }
  return NextResponse.json(
    { error: `Unknown action: ${action}` },
    { status: 400 },
  );
}
