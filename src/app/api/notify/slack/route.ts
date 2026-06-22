/* ── Slack notification endpoint ──
 *
 * Stub today - returns 503 when SLACK_BOT_TOKEN isn't set. Once
 * Viktor provisions the token (env var SLACK_BOT_TOKEN + a default
 * channel via SLACK_DEFAULT_CHANNEL), this route fires real messages
 * through the chat.postMessage API.
 *
 * Callers POST { channel?, text, blocks? } and get back { ok: true }
 * or { ok: false, error }.
 */

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const token = process.env.SLACK_BOT_TOKEN;
  const defaultChannel = process.env.SLACK_DEFAULT_CHANNEL;

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "SLACK_BOT_TOKEN not configured. Notifications stubbed - awaiting Viktor's bot token." },
      { status: 503 },
    );
  }

  let body: { channel?: string; text?: string; blocks?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const channel = body.channel || defaultChannel;
  if (!channel) {
    return NextResponse.json({ ok: false, error: "No channel provided + no SLACK_DEFAULT_CHANNEL" }, { status: 400 });
  }
  if (!body.text && !body.blocks) {
    return NextResponse.json({ ok: false, error: "text or blocks required" }, { status: 400 });
  }

  try {
    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        channel,
        text: body.text,
        blocks: body.blocks,
      }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    if (!data.ok) {
      return NextResponse.json({ ok: false, error: data.error || "Slack rejected the message" }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

/* GET returns config status so the UI can show "Notifications: connected/stubbed". */
export async function GET() {
  return NextResponse.json({
    configured: !!process.env.SLACK_BOT_TOKEN,
    default_channel: process.env.SLACK_DEFAULT_CHANNEL ?? null,
  });
}
