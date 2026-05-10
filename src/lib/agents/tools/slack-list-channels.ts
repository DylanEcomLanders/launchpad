/* ── slack_list_channels ──
 * Lists every Slack channel the auth token can see. Lets Felix actually
 * verify what coverage he has instead of guessing — when Dylan asks
 * "what channels can you read?" or "do you see #dev?", Felix can call
 * this and answer truthfully.
 *
 * Important nuance: the token may SEE a channel (it's listed) without
 * being a MEMBER (which is what's required to read history). The
 * `is_member` flag distinguishes them. Felix is told to surface this in
 * his answers — "I can see #dev but I'm not a member, so I can't read
 * its history" is honest; "I have full access to #dev" is wrong.
 */

import { listAccessibleChannels } from "@/lib/slack-client";
import type { AgentTool } from "./types";

interface Input {
  /** Optional substring filter — case-insensitive match against channel name. */
  filter?: string;
  /** If true (default), only return channels the token is a member of —
   * the ones we can actually read message history from. Set to false to
   * see every visible channel including non-member ones. */
  members_only?: boolean;
  /** Cap on results returned to Claude. Defaults to 100 — enough to spot
   * coverage gaps without ballooning the tool result. */
  limit?: number;
}

interface ChannelOut {
  name: string;
  id: string;
  is_member: boolean;
  is_private: boolean;
  num_members?: number;
}

interface Output {
  total_visible: number;
  total_member: number;
  filter?: string;
  channels: ChannelOut[];
}

export const slackListChannels: AgentTool<Input, Output> = {
  name: "slack_list_channels",
  description:
    "Lists every Slack channel the auth token can see. Each channel includes a `is_member` flag — true means Felix can read message history; false means the channel is visible but unreadable until the token's user joins. Use this for: 'what channels do you have access to?', 'do you see #dev?', 'are there client channels you're missing?'. Pass `filter` to narrow by name substring (e.g. 'clients-' to see all client channels). Default returns members-only (channels you can actually read). Set `members_only: false` to see the full list including unreadable ones — useful when Dylan needs to know which channels to invite the user to.",
  inputSchema: {
    type: "object",
    properties: {
      filter: {
        type: "string",
        description: "Optional case-insensitive substring filter on channel name.",
      },
      members_only: {
        type: "boolean",
        description: "Default true. If false, returns visible-but-unreadable channels too.",
      },
      limit: {
        type: "number",
        description: "Max channels to return (1–500). Default 100.",
      },
    },
  },
  execute: async ({ filter, members_only = true, limit = 100 }) => {
    const all = await listAccessibleChannels();
    const totalVisible = all.length;
    const totalMember = all.filter((c) => c.is_member).length;

    let filtered = all;
    if (members_only) filtered = filtered.filter((c) => c.is_member);
    if (filter) {
      const f = filter.toLowerCase();
      filtered = filtered.filter((c) => c.name.toLowerCase().includes(f));
    }

    return {
      total_visible: totalVisible,
      total_member: totalMember,
      filter,
      channels: filtered.slice(0, Math.min(Math.max(limit, 1), 500)).map((c) => ({
        name: c.name,
        id: c.id,
        is_member: !!c.is_member,
        is_private: !!c.is_private,
        num_members: c.num_members,
      })),
    };
  },
};
