/* ── launchpad_blocked_tasks ──
 * Returns active blockers across all client portals — anything where
 * blocker is set and resolved_at is null. Optionally filter by client name.
 */

import { supabase } from "@/lib/supabase";
import type { AgentTool } from "./types";

interface Input { client?: string }

interface BlockerOut {
  client: string;
  reason: string;
  type: "client" | "internal" | "external";
  since: string;
  days_blocked: number;
  client_type: "retainer" | "regular";
}

interface Output { count: number; blockers: BlockerOut[] }

export const launchpadBlockedTasks: AgentTool<Input, Output> = {
  name: "launchpad_blocked_tasks",
  description:
    "Returns all client projects with an active blocker (a blocker that hasn't been resolved). Each blocker includes the client name, reason, blocker type (client/internal/external), how many days it's been blocked, and whether the client is a retainer or regular project. Use this when Dylan asks 'what's blocked?' or 'what's blocked on Acme?'. Pass `client` to filter by client name (partial match, case-insensitive).",
  inputSchema: {
    type: "object",
    properties: {
      client: {
        type: "string",
        description: "Optional client name filter. Matches partial, case-insensitive (e.g. 'acme' matches 'Acme Inc').",
      },
    },
  },
  execute: async ({ client }, ctx) => {
    const { data, error } = await supabase
      .from("client_portals")
      .select("client_name, client_type, blocker, deleted_at")
      .is("deleted_at", null);

    if (error) throw new Error(`Supabase: ${error.message}`);

    const blockers: BlockerOut[] = [];
    const filterLower = client?.trim().toLowerCase();

    for (const portal of data ?? []) {
      const b = portal.blocker as { type?: string; reason?: string; since?: string; resolved_at?: string } | null;
      if (!b || b.resolved_at) continue;
      if (filterLower && !portal.client_name.toLowerCase().includes(filterLower)) continue;

      const sinceDate = b.since ? new Date(b.since) : null;
      const daysBlocked = sinceDate
        ? Math.max(0, Math.round((ctx.now.getTime() - sinceDate.getTime()) / 86_400_000))
        : 0;

      blockers.push({
        client: portal.client_name,
        reason: b.reason ?? "(no reason recorded)",
        type: (b.type as BlockerOut["type"]) ?? "internal",
        since: b.since ?? "",
        days_blocked: daysBlocked,
        client_type: portal.client_type as BlockerOut["client_type"],
      });
    }

    blockers.sort((a, b) => b.days_blocked - a.days_blocked);
    return { count: blockers.length, blockers };
  },
};
