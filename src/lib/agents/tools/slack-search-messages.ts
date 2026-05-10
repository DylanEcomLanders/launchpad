/* ── slack_search_messages ──
 * Keyword search across Slack channels Felix has access to. Wraps the
 * Slack search.messages API; the query string supports Slack's standard
 * modifiers (in:, from:, before:, after:, has:link, etc.).
 *
 * User IDs are resolved to names server-side. If the search returns zero
 * hits, that means no matching messages in channels the search token can
 * see — Felix should not invent content to fill the gap.
 */

import { searchMessages } from "@/lib/slack-client";
import type { AgentTool } from "./types";

interface Input { query: string; count?: number }
interface Hit {
  channel: string;
  /** Friendly sender name (resolved server-side). Falls back to the user ID. */
  user?: string;
  text: string;
  /** UK-localised readable timestamp. */
  at: string;
  at_iso: string;
  permalink?: string;
}
interface Output { count: number; hits: Hit[] }

export const slackSearchMessages: AgentTool<Input, Output> = {
  name: "slack_search_messages",
  description:
    "Searches across Slack channels accessible to the search token. Use Slack's query syntax: free-text keywords, optionally combined with `in:#channel-name`, `from:@username`, `after:YYYY-MM-DD`, `before:YYYY-MM-DD`, `has:link`. Returns the top matches with channel, sender (resolved name — NEVER invent or guess from a raw ID), message text, and UK-localised timestamp. A `count: 0` response means there are genuinely no matches in accessible channels — do not fabricate. Use this when Dylan asks about specific topics across Slack ('any chatter about the Velvet roadmap?', 'who mentioned brand assets recently?'). Default limit 20 hits.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Slack search query. e.g. `brand assets in:#clients-velvet after:2026-04-28` or just `pricing question`.",
      },
      count: {
        type: "number",
        description: "Max hits to return (1–100). Default 20.",
      },
    },
    required: ["query"],
  },
  execute: async ({ query, count }) => {
    const hits = await searchMessages({ query, count });
    return {
      count: hits.length,
      hits: hits.map((h) => ({
        channel: h.channel,
        user: h.user,
        text: truncate(h.text, 280),
        at: h.at_uk,
        at_iso: h.at_iso,
        permalink: h.permalink,
      })),
    };
  },
};

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}
