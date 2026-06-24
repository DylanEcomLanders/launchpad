/* ── Unipile debug reflector ──
 *
 * GET /api/sales/debug?channel=whatsapp&endpoint=chats
 *
 * Hits Unipile's API and returns the raw response so we can see
 * exactly what their field names + shape look like for THIS account.
 * Used to align the adapter normalisers after they've drifted (or
 * been guessed wrong in the first place).
 *
 *   ?endpoint=chats     → GET /api/v1/chats?account_id=...
 *   ?endpoint=messages  → GET /api/v1/chats/{chat_id}/messages
 *                         (requires ?chatId=... too)
 *
 * Returns Unipile's exact response truncated to the first 3 items
 * to keep things readable. Strips obvious PII (phone digits) so this
 * is safe to paste into chat.
 *
 * NOT linked from any UI - call directly in the browser. */

import { NextResponse } from "next/server";

type Channel = "whatsapp" | "linkedin" | "email";

function envAccountId(channel: Channel): string | undefined {
  if (channel === "whatsapp") return process.env.UNIPILE_WHATSAPP_ACCOUNT_ID;
  if (channel === "linkedin") return process.env.UNIPILE_LINKEDIN_ACCOUNT_ID;
  if (channel === "email") return process.env.UNIPILE_EMAIL_ACCOUNT_ID;
  return undefined;
}

/* Mask digit sequences over 4 chars so phone numbers / IDs don't
 * leak when Dylan pastes the response back. Keeps the structure
 * intact - field names are what we actually need to see. */
function redactPII(json: unknown): unknown {
  const text = JSON.stringify(json);
  const redacted = text
    .replace(/\d{5,}/g, "[REDACTED-DIGITS]")
    .replace(/[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[REDACTED-EMAIL]");
  try {
    return JSON.parse(redacted);
  } catch {
    return { error: "Redact failed", raw_truncated: text.slice(0, 2000) };
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const channel = (url.searchParams.get("channel") ?? "whatsapp") as Channel;
  const endpoint = url.searchParams.get("endpoint") ?? "chats";
  const chatId = url.searchParams.get("chatId");

  const apiKey = process.env.UNIPILE_API_KEY;
  const dsn = process.env.UNIPILE_DSN?.replace(/\/+$/, "");
  const accountId = envAccountId(channel);

  if (!apiKey || !dsn || !accountId) {
    return NextResponse.json(
      {
        error: "Missing env vars",
        have: {
          UNIPILE_API_KEY: !!apiKey,
          UNIPILE_DSN: !!dsn,
          accountId: !!accountId,
        },
      },
      { status: 500 },
    );
  }

  let unipileUrl: string;
  if (endpoint === "messages") {
    if (!chatId) {
      return NextResponse.json(
        { error: "messages endpoint requires ?chatId=..." },
        { status: 400 },
      );
    }
    unipileUrl = `${dsn}/api/v1/chats/${encodeURIComponent(chatId)}/messages?limit=3`;
  } else if (endpoint === "attendees") {
    /* Per-chat attendees - might have richer contact info than the
     * chat list does. Worth probing for contact names. */
    if (!chatId) {
      return NextResponse.json(
        { error: "attendees endpoint requires ?chatId=..." },
        { status: 400 },
      );
    }
    unipileUrl = `${dsn}/api/v1/chats/${encodeURIComponent(chatId)}/attendees`;
  } else if (endpoint === "users") {
    /* Global users/contacts list for this account. If exists,
     * gives us contact names without per-chat probing. */
    unipileUrl = `${dsn}/api/v1/users?account_id=${encodeURIComponent(accountId)}&limit=10`;
  } else if (endpoint === "contacts") {
    /* Try a contacts-specific endpoint if Unipile has one. */
    unipileUrl = `${dsn}/api/v1/contacts?account_id=${encodeURIComponent(accountId)}&limit=10`;
  } else {
    unipileUrl = `${dsn}/api/v1/chats?account_id=${encodeURIComponent(accountId)}&limit=3`;
  }

  const res = await fetch(unipileUrl, {
    method: "GET",
    headers: { "X-API-KEY": apiKey, Accept: "application/json" },
  });
  const raw = await res.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({
      ok: false,
      status: res.status,
      called: unipileUrl.replace(accountId, "[ACCOUNT_ID]"),
      raw_first_2000: raw.slice(0, 2000),
    });
  }

  return NextResponse.json({
    ok: res.ok,
    status: res.status,
    called: unipileUrl.replace(accountId, "[ACCOUNT_ID]"),
    response_keys: Object.keys(parsed as object),
    first_3_items_redacted: redactPII(parsed),
  });
}
