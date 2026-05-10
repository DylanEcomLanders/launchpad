/* ── launchpad_overdue_tasks ──
 * Returns phases / tasks that are past their deadline and not complete.
 * Pulls from two sources: client_portals.phases (project-level deadlines)
 * and the task_board single-row JSONB (design + dev tasks with dueDate).
 */

import { supabase } from "@/lib/supabase";
import type { AgentTool } from "./types";
import type { PortalPhase, PortalProject } from "@/lib/portal/types";

interface Input { client?: string }

interface OverdueItem {
  client: string;
  item: string;
  type: "phase" | "task";
  deadline: string;
  days_overdue: number;
  /** For phase items: the project name if it's nested under a project. */
  project?: string;
  /** For task items: assignee + lane (design/dev). */
  assignee?: string;
  lane?: "design" | "dev";
}

interface Output { count: number; overdue: OverdueItem[] }

interface TaskShape {
  id: string;
  title?: string;
  client?: string;
  status?: string;
  dueDate?: string;
  designDueDate?: string;
  devDueDate?: string;
  designer?: string;
  developer?: string;
  assignee?: string;
}

export const launchpadOverdueTasks: AgentTool<Input, Output> = {
  name: "launchpad_overdue_tasks",
  description:
    "Returns phases and tasks past their deadline that haven't been completed. Combines two sources: portal phases (project-level deadlines) and the task board (per-task design/dev due dates). Each item includes the client, what's overdue, days overdue, and assignee where known. Use when Dylan asks 'what's overdue?' or 'what's late on Velvet?'.",
  inputSchema: {
    type: "object",
    properties: {
      client: {
        type: "string",
        description: "Optional client name filter. Partial, case-insensitive.",
      },
    },
  },
  execute: async ({ client }, ctx) => {
    const filterLower = client?.trim().toLowerCase();
    const today = ctx.now;
    const matches = (name?: string) => !filterLower || (name ?? "").toLowerCase().includes(filterLower);

    const items: OverdueItem[] = [];

    // ── Source 1: portal phases (top-level + nested per-project) ──
    const { data: portals, error: portalErr } = await supabase
      .from("client_portals")
      .select("client_name, phases, projects, deleted_at")
      .is("deleted_at", null);
    if (portalErr) throw new Error(`Supabase portals: ${portalErr.message}`);

    for (const portal of portals ?? []) {
      if (!matches(portal.client_name)) continue;

      const phases: Array<PortalPhase & { projectName?: string }> = [];
      for (const p of (portal.phases ?? []) as PortalPhase[]) phases.push(p);
      for (const proj of (portal.projects ?? []) as PortalProject[]) {
        for (const p of proj.phases ?? []) phases.push({ ...p, projectName: proj.name });
      }

      for (const phase of phases) {
        if (phase.status === "complete") continue;
        const deadline = phase.endDate || phase.deadline;
        if (!deadline) continue;
        const dl = new Date(deadline);
        if (dl >= today) continue;
        const daysOver = Math.round((today.getTime() - dl.getTime()) / 86_400_000);
        items.push({
          client: portal.client_name,
          item: phase.name,
          type: "phase",
          deadline,
          days_overdue: daysOver,
          project: phase.projectName,
        });
      }
    }

    // ── Source 2: task_board JSONB row ──
    try {
      const { data: board } = await supabase
        .from("task_board")
        .select("data")
        .eq("id", "main-board")
        .maybeSingle();

      const boardData = board?.data as { designTasks?: TaskShape[]; devTasks?: TaskShape[] } | null;

      const checkTask = (t: TaskShape, lane: "design" | "dev") => {
        if (!matches(t.client)) return;
        if (t.status === "done") return;
        const due = lane === "design" ? (t.designDueDate || t.dueDate) : (t.devDueDate || t.dueDate);
        if (!due) return;
        const d = new Date(due);
        if (d >= today) return;
        const daysOver = Math.round((today.getTime() - d.getTime()) / 86_400_000);
        items.push({
          client: t.client ?? "(unassigned)",
          item: t.title ?? `Task ${t.id}`,
          type: "task",
          deadline: due,
          days_overdue: daysOver,
          assignee: lane === "design" ? (t.designer ?? t.assignee) : (t.developer ?? t.assignee),
          lane,
        });
      };

      for (const t of boardData?.designTasks ?? []) checkTask(t, "design");
      for (const t of boardData?.devTasks ?? []) checkTask(t, "dev");
    } catch {
      // task_board table missing — skip the task source rather than fail the tool
    }

    items.sort((a, b) => b.days_overdue - a.days_overdue);
    return { count: items.length, overdue: items };
  },
};
