/* ── slack_thread_replies ──
 * Fetches the replies to a specific Slack thread. conversations.history
 * (via slack_recent_in_channel) only returns top-level messages, so when
 * a discussion buried in a thread matters, Felix needs this to see it.
 *
 * Usage pattern: slack_recent_in_channel surfaces a top-level message
 * with reply_count > 0 → if the thread looks relevant, follow up with
 * slack_thread_replies(thread_ts).
 */

import { threadReplies } from "@/lib/slack-client";
import type { AgentTool } from "./types";

interface Input {
  channel: string;
  thread_ts: string;
  limit?: number;
}

interface Reply {
  user?: string;
  text: string;
  at: string;
  at_iso: string;
}

interface Output { channel: string; thread_ts: string; count: number; replies: Reply[] }

export const slackThreadReplies: AgentTool<Input, Output> = {
  name: "slack_thread_replies",
  description:
    "Fetches replies inside a specific Slack thread. Pass the channel (ID or name) and the parent message's `thread_ts` (you can get this from a slack_recent_in_channel result — top-level messages with reply_count > 0 have a thread_ts). Returns the parent + each reply with sender, text, and UK-localised timestamp. Use this when slack_recent_in_channel surfaces a message with replies and you need to know what was actually discussed.",
  inputSchema: {
    type: "object",
    properties: {
      channel: { type: "string", description: "Channel ID or name (with or without #)." },
      thread_ts: { type: "string", description: "The parent message's ts, e.g. 1730340103.080039" },
      limit: { type: "number", description: "Max replies to return (1–200). Default 50." },
    },
    required: ["channel", "thread_ts"],
  },
  execute: async ({ channel, thread_ts, limit }) => {
    const messages = await threadReplies({ channel, thread_ts, limit });
    return {
      channel,
      thread_ts,
      count: messages.length,
      replies: messages
        .filter((m) => !m.subtype || m.subtype === "thread_broadcast")
        .map((m) => ({
          user: m.user,
          text: truncate(m.text, 320),
          at: m.at_uk,
          at_iso: m.at_iso,
        })),
    };
  },
};

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}
