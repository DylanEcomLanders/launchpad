/* ── Client milestone data layer + default checklists ── */

import { createStore } from "@/lib/supabase-store";
import type {
  ClientMilestone,
  MilestoneChecklistItem,
  MilestoneDay,
} from "./types";

export const clientMilestonesStore = createStore<ClientMilestone>({
  table: "client_milestones",
  lsKey: "launchpad-client-milestones",
});

export function uid(): string {
  return Math.random().toString(36).slice(2, 12);
}
export function nowISO(): string {
  return new Date().toISOString();
}

/* Default checklist per milestone, straight from the playbook. */
export function defaultItems(day: MilestoneDay): MilestoneChecklistItem[] {
  if (day === 30) return [
    { id: uid(), title: "Pages we quoted are live" },
    { id: uid(), title: "Tests we quoted are live" },
    { id: uid(), title: "Results banking, data accumulating to significance" },
    { id: uid(), title: "Kickoff retro held - what shipped, what's next" },
  ];
  if (day === 90) return [
    { id: uid(), title: "Pattern of wins forming, results compounding" },
    { id: uid(), title: "Roadmap refresh for next quarter" },
    { id: uid(), title: "90-day minimum met - rolling month-to-month confirmed" },
    { id: uid(), title: "Expansion conversation if signals are there" },
  ];
  if (day === 180) return [
    { id: uid(), title: "Wins compounding further; programme mature" },
    { id: uid(), title: "Case study angle captured" },
    { id: uid(), title: "Renewal anchor conversation held" },
  ];
  return [
    { id: uid(), title: "Annual review held" },
    { id: uid(), title: "Continuation or multi-year framing" },
    { id: uid(), title: "Referral ask made" },
    { id: uid(), title: "Second-pod offer for VIP-scale clients" },
  ];
}

export function makeMilestone(
  clientName: string,
  day: MilestoneDay,
  engagementStartedAt: string,
): ClientMilestone {
  const due = new Date(new Date(engagementStartedAt).getTime() + day * 86_400_000);
  return {
    id: uid(),
    client_name: clientName,
    day,
    engagement_started_at: engagementStartedAt,
    due_at: due.toISOString(),
    status: "upcoming",
    owner: "",
    notes: "",
    items: defaultItems(day),
    created_at: nowISO(),
    updated_at: nowISO(),
  };
}

/* Status auto-resolves from due_at + items completion. */
export function resolvedStatus(m: ClientMilestone): ClientMilestone["status"] {
  if (m.status === "completed" || m.status === "skipped") return m.status;
  const allDone = m.items.length > 0 && m.items.every((i) => i.done_at);
  if (allDone) return "completed";
  const someDone = m.items.some((i) => i.done_at);
  if (someDone) return "in_progress";
  const dueT = new Date(m.due_at).getTime();
  if (Date.now() >= dueT) return "due";
  return "upcoming";
}

export function daysUntilDue(m: ClientMilestone): number {
  return Math.round((new Date(m.due_at).getTime() - Date.now()) / 86_400_000);
}

export const MILESTONE_DAYS: MilestoneDay[] = [30, 90, 180, 365];
