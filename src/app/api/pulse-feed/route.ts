import { NextResponse } from "next/server";
import { WebClient } from "@slack/web-api";
import type { PulseFeedItem, PulseFeedResponse, FeedItemType } from "@/lib/pulse/types";

// ── Config ──────────────────────────────────────────────────────

const STATUS_KEYWORDS = [
  "launched",
  "live",
  "shipped",
  "deployed",
  "completed",
  "milestone",
  "done",
  "released",
  "pushed",
  "merged",
];

const CHANNEL_NAME_FILTERS = ["external", "internal"];

// ── Route Handler ───────────────────────────────────────────────

export async function GET(request: Request) {
  if (!process.env.SLACK_TOKEN) {
    return NextResponse.json(
      { error: "Missing SLACK_TOKEN — add it to .env.local" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const hours = Math.min(Number(searchParams.get("hours") || "48"), 168); // max 7 days
  const limit = Math.min(Number(searchParams.get("limit") || "50"), 100);

  try {
    const slack = new WebClient(process.env.SLACK_TOKEN);

    // Step 1: Get matching channels
    const channels = await getMatchingChannels(slack);

    if (channels.length === 0) {
      return NextResponse.json({
        items: [],
        total: 0,
        has_more: false,
        fetched_at: new Date().toISOString(),
      } satisfies PulseFeedResponse);
    }

    // Step 2: Fetch history from each channel
    const oldest = getOldestTimestamp(hours);
    const allMessages: RawMessage[] = [];

    for (const channel of channels) {
      try {
        const res = await slack.conversations.history({
          channel: channel.id,
          oldest,
          limit: 50,
          inclusive: true,
        });

        const messages = res.messages || [];
        for (const m of messages) {
          // Skip bot messages, join/leave, and empty messages
          if (m.subtype && m.subtype !== "file_share") continue;
          if (!m.text?.trim()) continue;

          allMessages.push({
            text: m.text || "",
            user_id: m.user || "",
            channel_id: channel.id,
            channel_name: channel.name,
            channel_type: classifyChannel(channel.name),
            ts: m.ts || "",
          });
        }

        await sleep(200);
      } catch {
        // Skip failed channels but keep going
      }
    }

    // Step 3: Resolve user IDs to display names
    const userNames = await resolveUserNames(
      slack,
      [...new Set(allMessages.map((m) => m.user_id).filter(Boolean))]
    );

    // Step 4: Build feed items, sorted newest first
    const sorted = allMessages.sort((a, b) => parseFloat(b.ts) - parseFloat(a.ts));
    const total = sorted.length;
    const sliced = sorted.slice(0, limit);

    const items: PulseFeedItem[] = sliced.map((m) => ({
      id: `${m.channel_id}-${m.ts}`,
      timestamp: slackTsToISO(m.ts),
      channel_name: m.channel_name,
      channel_type: detectStatusOverride(m.text, m.channel_type),
      author: userNames.get(m.user_id) || "Unknown",
      message: truncate(m.text, 200),
      permalink: `https://slack.com/archives/${m.channel_id}/p${m.ts.replace(".", "")}`,
    }));

    return NextResponse.json({
      items,
      total,
      has_more: total > limit,
      fetched_at: new Date().toISOString(),
    } satisfies PulseFeedResponse);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown error fetching feed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── Types ───────────────────────────────────────────────────────

interface SlackChannel {
  id: string;
  name: string;
}

interface RawMessage {
  text: string;
  user_id: string;
  channel_id: string;
  channel_name: string;
  channel_type: FeedItemType;
  ts: string;
}

// ── Channel Discovery ───────────────────────────────────────────

async function getMatchingChannels(slack: WebClient): Promise<SlackChannel[]> {
  const matched: SlackChannel[] = [];
  let cursor: string | undefined;

  do {
    const res = await slack.conversations.list({
      types: "public_channel,private_channel",
      limit: 200,
      exclude_archived: true,
      cursor,
    });

    const channels = res.channels || [];
    for (const ch of channels) {
      const name = ch.name || "";
      if (CHANNEL_NAME_FILTERS.some((f) => name.includes(f))) {
        matched.push({ id: ch.id || "", name });
      }
    }

    cursor = res.response_metadata?.next_cursor || undefined;
    if (cursor) await sleep(200);
  } while (cursor);

  return matched;
}

// ── User Resolution ─────────────────────────────────────────────

async function resolveUserNames(
  slack: WebClient,
  userIds: string[]
): Promise<Map<string, string>> {
  const names = new Map<string, string>();

  for (const uid of userIds) {
    try {
      const res = await slack.users.info({ user: uid });
      const user = res.user;
      names.set(
        uid,
        user?.profile?.display_name || user?.real_name || user?.name || uid
      );
      await sleep(100);
    } catch {
      names.set(uid, uid);
    }
  }

  return names;
}

// ── Helpers ─────────────────────────────────────────────────────

function classifyChannel(name: string): FeedItemType {
  if (name.includes("external")) return "client";
  return "internal";
}

function detectStatusOverride(text: string, base: FeedItemType): FeedItemType {
  const lower = text.toLowerCase();
  if (STATUS_KEYWORDS.some((kw) => lower.includes(kw))) return "status";
  return base;
}

function getOldestTimestamp(hours: number): string {
  const d = new Date();
  d.setHours(d.getHours() - hours);
  return String(d.getTime() / 1000);
}

function slackTsToISO(ts: string): string {
  return new Date(parseFloat(ts) * 1000).toISOString();
}

function truncate(text: string, max: number): string {
  // Clean Slack formatting
  const cleaned = text
    .replace(/<@[A-Z0-9]+>/g, "@user")
    .replace(/<#[A-Z0-9]+\|([^>]+)>/g, "#$1")
    .replace(/<(https?:\/\/[^|>]+)\|?[^>]*>/g, "$1")
    .replace(/\n+/g, " ")
    .trim();
  if (cleaned.length <= max) return cleaned;
  return cleaned.slice(0, max).trim() + "…";
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
