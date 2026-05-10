/* ── launchpad_recent_activity ──
 * Cross-system activity feed for the last N hours. Surfaces:
 *   - Phase completions on portals
 *   - Blockers added or resolved
 *   - Lead status changes (deals table — by updated_at)
 *   - New onboarding submissions
 *   - Task phase transitions (from task_board phaseHistory)
 *
 * Felix uses this for "anything on fire from yesterday?" and as the
 * primary feed for the daily digest. Default window is 24h.
 */

import { supabase } from "@/lib/supabase";
import type { AgentTool } from "./types";
import type { PortalPhase, PortalProject, BlockerHistory } from "@/lib/portal/types";

interface Input {
  hours_back?: number;
  client?: string;
}

interface ActivityEvent {
  type:
    | "phase_completed"
    | "blocker_added"
    | "blocker_resolved"
    | "lead_status_changed"
    | "onboarding_submitted"
    | "task_phase_changed";
  client?: string;
  brand?: string;
  summary: string;
  at: string;
  /** Free-form details Claude can quote — keep it short. */
  meta?: Record<string, unknown>;
}

interface Output {
  hours_back: number;
  count: number;
  events: ActivityEvent[];
}

interface TaskShape {
  id: string;
  title?: string;
  client?: string;
  phase?: string;
  phaseHistory?: { phase: string; at: string; from?: string }[];
}

export const launchpadRecentActivity: AgentTool<Input, Output> = {
  name: "launchpad_recent_activity",
  description:
    "Returns recent activity across Launchpad (last N hours, default 24): phase completions on client portals, blockers added or resolved, lead status changes, new onboarding submissions, and task phase transitions. Each event has a type, client/brand name, a one-line summary, and a timestamp. Use this for 'anything happen overnight?', 'what changed today?', or as the source for the daily digest. Pass `hours_back` to widen the window (e.g. 48 for a Monday catch-up). Pass `client` to filter to one client.",
  inputSchema: {
    type: "object",
    properties: {
      hours_back: {
        type: "number",
        description: "How far back to look, in hours. Default 24.",
      },
      client: {
        type: "string",
        description: "Optional client/brand filter. Partial, case-insensitive.",
      },
    },
  },
  execute: async ({ hours_back, client }, ctx) => {
    const hours = Math.max(1, Math.min(168, hours_back ?? 24));
    const since = new Date(ctx.now.getTime() - hours * 3_600_000);
    const sinceIso = since.toISOString();
    const filterLower = client?.trim().toLowerCase();
    const matches = (name?: string) => !filterLower || (name ?? "").toLowerCase().includes(filterLower);

    const events: ActivityEvent[] = [];

    // ── Portals: phase completions + blockers ──
    const { data: portals } = await supabase
      .from("client_portals")
      .select("client_name, phases, projects, blocker, blocker_history, updated_at, deleted_at")
      .is("deleted_at", null);

    for (const portal of portals ?? []) {
      if (!matches(portal.client_name)) continue;

      const allPhases: Array<PortalPhase & { projectName?: string }> = [];
      for (const p of (portal.phases ?? []) as PortalPhase[]) allPhases.push(p);
      for (const proj of (portal.projects ?? []) as PortalProject[]) {
        for (const p of proj.phases ?? []) allPhases.push({ ...p, projectName: proj.name });
      }

      for (const phase of allPhases) {
        if (phase.status === "complete" && phase.completedDate) {
          const at = new Date(phase.completedDate);
          if (at >= since) {
            const label = phase.projectName ? `${phase.name} (${phase.projectName})` : phase.name;
            events.push({
              type: "phase_completed",
              client: portal.client_name,
              summary: `${label} completed`,
              at: phase.completedDate,
            });
          }
        }
      }

      const b = portal.blocker as { reason?: string; type?: string; since?: string; resolved_at?: string } | null;
      if (b && b.since && new Date(b.since) >= since && !b.resolved_at) {
        events.push({
          type: "blocker_added",
          client: portal.client_name,
          summary: `Blocker added: ${b.reason ?? "(no reason)"}`,
          at: b.since,
          meta: { blocker_type: b.type },
        });
      }

      const history = (portal.blocker_history ?? []) as BlockerHistory[];
      for (const entry of history) {
        const r = entry.blocker?.resolved_at;
        if (r && new Date(r) >= since) {
          events.push({
            type: "blocker_resolved",
            client: portal.client_name,
            summary: `Blocker resolved: ${entry.blocker.reason ?? "(no reason)"}`,
            at: r,
            meta: { days_lost: entry.shifted_days },
          });
        }
      }
    }

    // ── Leads: status changes (proxy: updated_at) ──
    const { data: leads } = await supabase
      .from("deals")
      .select("id, data, created_at")
      .gte("created_at", sinceIso);
    for (const row of leads ?? []) {
      const lead = row.data as { brand_name?: string; status?: string; updated_at?: string };
      const at = lead.updated_at ?? row.created_at;
      if (!at) continue;
      if (new Date(at) < since) continue;
      if (!matches(lead.brand_name)) continue;
      events.push({
        type: "lead_status_changed",
        brand: lead.brand_name ?? "(unnamed)",
        summary: `Lead "${lead.brand_name ?? "(unnamed)"}" → ${lead.status ?? "?"}`,
        at,
      });
    }

    // ── Onboarding: new submissions ──
    const { data: onboarding } = await supabase
      .from("onboarding_submissions")
      .select("id, data, created_at")
      .gte("created_at", sinceIso);
    for (const row of onboarding ?? []) {
      const sub = row.data as { company_name?: string; status?: string };
      if (!matches(sub.company_name)) continue;
      events.push({
        type: "onboarding_submitted",
        brand: sub.company_name ?? "(unnamed)",
        summary: `New onboarding from ${sub.company_name ?? "(unnamed)"} (${sub.status ?? "pending"})`,
        at: row.created_at,
      });
    }

    // ── Task board: recent phase transitions ──
    try {
      const { data: board } = await supabase
        .from("task_board")
        .select("data")
        .eq("id", "main-board")
        .maybeSingle();
      const boardData = board?.data as { designTasks?: TaskShape[]; devTasks?: TaskShape[] } | null;

      const allTasks = [...(boardData?.designTasks ?? []), ...(boardData?.devTasks ?? [])];
      for (const t of allTasks) {
        if (!matches(t.client)) continue;
        const transitions = (t.phaseHistory ?? []).filter((h) => h.at && new Date(h.at) >= since);
        for (const tr of transitions) {
          events.push({
            type: "task_phase_changed",
            client: t.client,
            summary: `${t.title ?? `Task ${t.id}`} → ${tr.phase}`,
            at: tr.at,
            meta: { from: tr.from, to: tr.phase },
          });
        }
      }
    } catch {
      // task_board missing — skip silently
    }

    events.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
    return { hours_back: hours, count: events.length, events };
  },
};
