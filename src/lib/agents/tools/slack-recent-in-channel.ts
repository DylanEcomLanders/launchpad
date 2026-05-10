/* ── slack_recent_in_channel ──
 * Recent messages in a specific Slack channel. Useful for "what's the
 * latest in #clients-acme?" or sweeping for unanswered threads.
 *
 * User IDs are resolved to friendly names server-side so Felix doesn't
 * have to invent who's who from raw Slack IDs.
 */

import { recentMessagesInChannel } from "@/lib/slack-client";
import type { AgentTool } from "./types";

interface Input {
  channel: string;
  limit?: number;
  hours_back?: number;
}

interface Message {
  /** Friendly sender name (already resolved server-side). Falls back to
   * the Slack user ID if name resolution failed — never an empty string. */
  user?: string;
  text: string;
  /** UK-localised readable timestamp, e.g. "Wed 30 Apr 2026, 08:35". */
  at: string;
  /** ISO 8601 UTC, for any maths you need to do. */
  at_iso: string;
  thread_ts?: string;
  reply_count?: number;
  /** True if this is a top-level message (not a reply) and has no replies yet. */
  unreplied?: boolean;
}

interface Output { channel: string; count: number; messages: Message[] }

export const slackRecentInChannel: AgentTool<Input, Output> = {
  name: "slack_recent_in_channel",
  description:
    "Fetches recent messages from a specific Slack channel. Pass either a channel ID (preferred — starts with C/G/D) or a name with or without #. Optional `hours_back` to limit how far back, and `limit` to cap the number returned. Each message includes the sender's resolved name (NOT a raw Slack ID — never invent or guess a name from an ID), the message text, a UK-localised timestamp, and an `unreplied` flag for top-level messages with no replies yet (useful for finding stale client questions). Use for 'what's the latest in #clients-velvet?', 'any unanswered threads in #ops?'. If the tool throws \"channel not found\" the user/bot is not a member — say so plainly, do not make up content.",
  inputSchema: {
    type: "object",
    properties: {
      channel: {
        type: "string",
        description: "Channel ID (e.g. C0123456789) or channel name (e.g. #clients-velvet or clients-velvet).",
      },
      limit: {
        type: "number",
        description: "Max messages to return (1–200). Default 30.",
      },
      hours_back: {
        type: "number",
        description: "Only return messages newer than this many hours ago. Default no limit.",
      },
    },
    required: ["channel"],
  },
  execute: async ({ channel, limit, hours_back }, ctx) => {
    const since = hours_back ? new Date(ctx.now.getTime() - hours_back * 3_600_000) : undefined;
    const messages = await recentMessagesInChannel({ channel, limit, since });

    const out: Message[] = messages
      .filter((m) => !m.subtype || m.subtype === "thread_broadcast")
      .map((m) => ({
        user: m.user,
        text: truncate(m.text, 320),
        at: m.at_uk,
        at_iso: m.at_iso,
        thread_ts: m.thread_ts,
        reply_count: m.reply_count,
        unreplied: !m.thread_ts && (!m.reply_count || m.reply_count === 0),
      }));

    return { channel, count: out.length, messages: out };
  },
};

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}
