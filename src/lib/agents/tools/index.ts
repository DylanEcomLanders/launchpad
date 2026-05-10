/* ── Tool registry ──
 * Central index of every tool agents can call. Per-agent runners pick
 * their subset by name (matching the strings in NAMED_AGENTS[...].tools).
 */

import type { AgentTool } from "./types";
import { launchpadRecentActivity } from "./launchpad-recent-activity";
import { launchpadBlockedTasks } from "./launchpad-blocked-tasks";
import { launchpadOverdueTasks } from "./launchpad-overdue-tasks";
import { slackSearchMessages } from "./slack-search-messages";
import { slackRecentInChannel } from "./slack-recent-in-channel";
import { slackThreadReplies } from "./slack-thread-replies";
import { slackListChannels } from "./slack-list-channels";

/* Tool generics are widened here so the registry can hold tools with
 * different specific Input/Output shapes. The runner's tool_result loop
 * already validates inputs at runtime via inputSchema (Claude is the
 * source of truth on what shape the input has), so giving up the strict
 * generic on the registry is the right tradeoff. */
const ALL_TOOLS = [
  launchpadRecentActivity,
  launchpadBlockedTasks,
  launchpadOverdueTasks,
  slackSearchMessages,
  slackRecentInChannel,
  slackThreadReplies,
  slackListChannels,
] as unknown as AgentTool[];

const TOOLS_BY_NAME = new Map(ALL_TOOLS.map((t) => [t.name, t]));

/** Resolve a list of tool name strings (from NAMED_AGENTS[...].tools) into
 * AgentTool objects. Skips names that aren't registered yet — those are
 * documentation-only placeholders for tools we haven't built. */
export function resolveTools(names: readonly string[]): AgentTool[] {
  const out: AgentTool[] = [];
  for (const name of names) {
    const tool = TOOLS_BY_NAME.get(name);
    if (tool) out.push(tool);
  }
  return out;
}

export { ALL_TOOLS };
export type { AgentTool };
