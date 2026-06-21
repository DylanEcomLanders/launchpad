"use client";

// Pod pipeline (kanban) — pain points #6 (kanban per pod) + #3 (adoption /
// "just mine"). The 12 task phases collapse into 5 readable stage columns;
// each deliverable is a card you can advance one tap at a time (no forms —
// advancing IS the status update). A "Just mine" filter scopes it to one
// member so a pod member opens it and sees only their lane. Self-contained.

import { useState } from "react";
import { ArrowRightCircleIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { updateTaskPhase, updateTaskStatus } from "@/lib/pods-v2/data";
import { riskLevel, type RiskLevel } from "@/lib/pods-v2/deliverable";
import {
  TASK_PHASE_ORDER,
  type Task,
  type Project,
  type Client,
  type PodMember,
  type TaskPhase,
} from "@/lib/pods-v2/types";

const STAGES = ["Discovery", "Design", "Review", "Build", "Launch"] as const;

const PHASE_STAGE: Record<TaskPhase, number> = {
  onboarding: 0,
  research: 0,
  wireframe: 0,
  design: 1,
  "internal-design-qa": 1,
  "external-design-review": 2,
  "design-revision": 2,
  development: 3,
  "development-qa": 3,
  "external-dev-review": 3,
  "dev-revision": 3,
  launch: 4,
};

const RISK_DOT: Record<RiskLevel, string> = {
  red: "bg-rose-500",
  amber: "bg-amber-400",
  green: "bg-emerald-400",
  blocked: "bg-[#C5C5C5]",
  shipped: "bg-[#C5C5C5]",
};

export function PodKanban({
  tasks,
  projects,
  clients,
  members,
  today,
  onMutate,
}: {
  tasks: Task[];
  projects: Project[];
  clients: Client[];
  members: PodMember[];
  today: string;
  onMutate?: () => void;
}) {
  const [mine, setMine] = useState<string>("");

  const clientByProject = new Map<string, string>();
  for (const p of projects) clientByProject.set(p.id, p.client_id);
  const clientById = new Map(clients.map((c) => [c.id, c]));
  const memberName = new Map(members.map((m) => [m.id, m.name]));

  // Deliverables only; not shipped; optionally scoped to one member.
  const cards = tasks
    .filter((t) => t.type === "core_deliverable" && t.status !== "done")
    .filter((t) => (mine ? t.assigned_to === mine : true));

  const advance = (task: Task) => {
    const idx = task.phase ? TASK_PHASE_ORDER.indexOf(task.phase) : -1;
    const next = TASK_PHASE_ORDER[idx + 1];
    if (!next || task.phase === "launch") {
      updateTaskStatus(task.id, "done");
    } else {
      updateTaskPhase(task.id, next);
      if (task.status === "todo") updateTaskStatus(task.id, "in_progress");
    }
    onMutate?.();
  };

  const stageOf = (t: Task) => (t.phase ? PHASE_STAGE[t.phase] ?? 0 : 0);

  return (
    <section className="rounded-xl border border-[#2A2A2A] bg-[#181818] p-4 shadow-[var(--shadow-soft)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-[#E5E5EA]">Pipeline</h2>
        <label className="flex items-center gap-1.5 text-[11px] text-[#71757D]">
          Show
          <select
            value={mine}
            onChange={(e) => setMine(e.target.value)}
            className="rounded-md border border-[#2A2A2A] bg-[#181818] px-2 py-1 text-[12px] font-medium text-[#E5E5EA] focus:outline-none"
          >
            <option value="">Whole pod</option>
            {members
              .filter((m) => !m.is_placeholder)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  Just {m.name}
                </option>
              ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        {STAGES.map((stage, si) => {
          const items = cards.filter((t) => stageOf(t) === si);
          return (
            <div key={stage} className="rounded-lg border border-[#2A2A2A] bg-[#0C0C0C] p-2">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">{stage}</span>
                <span className="text-[10px] tabular-nums text-[#71757D]">{items.length}</span>
              </div>
              {items.length === 0 ? (
                <div className="rounded-md border border-dashed border-[#2A2A2A] px-1.5 py-3 text-center text-[10px] text-[#C5C5C5]">
                  —
                </div>
              ) : (
                <div className="space-y-1.5">
                  {items.map((t) => {
                    const client = clientById.get(clientByProject.get(t.project_id) ?? "") ?? null;
                    const risk = riskLevel(t, client, today);
                    return (
                      <div key={t.id} className="rounded-md border border-[#2A2A2A] bg-[#181818] p-2 shadow-[var(--shadow-soft)]">
                        <div className="flex items-start gap-1.5">
                          <span className={`mt-1 size-1.5 shrink-0 rounded-full ${RISK_DOT[risk]}`} />
                          <span className="min-w-0 flex-1 text-[11px] font-medium leading-tight text-[#E5E5EA]">{t.title}</span>
                        </div>
                        <div className="mt-1 truncate text-[10px] text-[#71757D]">
                          {memberName.get(t.assigned_to) ?? "—"}
                          {client && <span className="text-[#C5C5C5]"> · {client.name}</span>}
                        </div>
                        <button
                          onClick={() => advance(t)}
                          title={t.phase === "launch" ? "Mark shipped" : "Advance stage"}
                          className="mt-1.5 inline-flex items-center gap-1 rounded border border-[#2A2A2A] bg-[#181818] px-1.5 py-0.5 text-[9px] font-medium text-[#E5E5EA] transition-colors hover:border-white hover:bg-[#1B1B1B] hover:text-white"
                        >
                          {t.phase === "launch" ? <CheckCircleIcon className="size-3" /> : <ArrowRightCircleIcon className="size-3" />}
                          {t.phase === "launch" ? "Ship" : "Advance"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
