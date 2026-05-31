"use client";

// My Work — THE front door (launchpad-build-brief North Star).
// "Every person, every morning, opens one screen and knows exactly what to
//  do next." Per logged-in person, their deliverables in priority order,
//  Red → Amber → Green, blocked items visibly off their plate, one tap to
//  advance a phase. Reads the unified Deliverable (pods-v2 Task) directly.
//
// Identity: Launchpad has no per-user member identity (single shared
// login + role). So the operator picks "who am I" once; it persists in
// localStorage. Surfaced visibly in the header — not a silent assumption.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRightCircleIcon,
  CheckCircleIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import {
  ensureSeed,
  getTasks,
  getProjects,
  getClients,
  getPods,
  updateTaskPhase,
  updateTaskStatus,
} from "@/lib/pods-v2/data";
import { bootstrapPodsSync } from "@/lib/pods-v2/sync";
import {
  deliverableStatus,
  riskLevel,
  riskReason,
  isBlocked,
  RISK_RANK,
  DELIVERABLE_STATUS_LABEL,
  type RiskLevel,
  type DeliverableStatus,
} from "@/lib/pods-v2/deliverable";
import { engagementKindOf, engagementDay } from "@/lib/pods-v2/calc";
import {
  TASK_PHASE_ORDER,
  TASK_PHASE_LABEL,
  ROLE_LABEL,
  type Task,
  type Project,
  type Client,
  type Pod,
  type PodMember,
} from "@/lib/pods-v2/types";
import { Card, Pill, EmptyState } from "@/components/pod-os/ui";

const ME_KEY = "launchpad-my-work-me";

function todayYMD(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const RISK_PILL: Record<RiskLevel, Parameters<typeof Pill>[0]["tone"]> = {
  red: "rose",
  amber: "amber",
  green: "emerald",
  blocked: "muted",
  shipped: "muted",
};
const STATUS_PILL: Record<DeliverableStatus, Parameters<typeof Pill>[0]["tone"]> = {
  not_started: "default",
  in_progress: "blue",
  in_review: "purple",
  shipped: "emerald",
  blocked_client: "amber",
  blocked_resource: "rose",
};

interface Row {
  task: Task;
  client: Client | null;
  clientName: string;
  status: DeliverableStatus;
  risk: RiskLevel;
  reason: string;
  day: number | null;
  isRetainer: boolean;
}

export default function MyWorkClient() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [pods, setPods] = useState<Pod[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [today] = useState(todayYMD);
  const [showShipped, setShowShipped] = useState(false);

  const refresh = useCallback(() => {
    setTasks(getTasks());
    setProjects(getProjects());
    setClients(getClients());
    setPods(getPods());
  }, []);

  useEffect(() => {
    ensureSeed();
    refresh();
    bootstrapPodsSync().then((changed) => {
      if (changed) refresh();
    });
    const saved = typeof window !== "undefined" ? localStorage.getItem(ME_KEY) : null;
    if (saved) setMeId(saved);
  }, [refresh]);

  const members: PodMember[] = useMemo(() => pods.flatMap((p) => p.members), [pods]);
  const podNameById = useMemo(
    () => Object.fromEntries(pods.map((p) => [p.id, p.name])),
    [pods],
  );

  // Default identity to the first real (non-placeholder) member once loaded.
  useEffect(() => {
    if (meId || members.length === 0) return;
    const first = members.find((m) => !m.is_placeholder) ?? members[0];
    if (first) setMeId(first.id);
  }, [meId, members]);

  const setMe = (id: string) => {
    setMeId(id);
    if (typeof window !== "undefined") localStorage.setItem(ME_KEY, id);
  };

  const clientByProject = useMemo(() => {
    const projToClient: Record<string, string> = {};
    for (const p of projects) projToClient[p.id] = p.client_id;
    const byId: Record<string, Client> = {};
    for (const c of clients) byId[c.id] = c;
    return (projectId: string): Client | null => byId[projToClient[projectId]] ?? null;
  }, [projects, clients]);

  const rows: Row[] = useMemo(() => {
    if (!meId) return [];
    return tasks
      .filter((t) => t.assigned_to === meId)
      .map((t) => {
        const client = clientByProject(t.project_id);
        const isRetainer = client ? engagementKindOf(client) === "retainer" : false;
        return {
          task: t,
          client,
          clientName: client?.name ?? "—",
          status: deliverableStatus(t, client),
          risk: riskLevel(t, client, today),
          reason: riskReason(t, client, today),
          day: client && isRetainer ? engagementDay(client, today) : null,
          isRetainer,
        };
      })
      .sort((a, b) => RISK_RANK[a.risk] - RISK_RANK[b.risk] || a.task.due_date.localeCompare(b.task.due_date));
  }, [tasks, meId, clientByProject, today]);

  const me = members.find((m) => m.id === meId) ?? null;

  const redAmber = rows.filter((r) => r.risk === "red" || r.risk === "amber");
  const green = rows.filter((r) => r.risk === "green");
  const blocked = rows.filter((r) => r.risk === "blocked");
  const shipped = rows.filter((r) => r.risk === "shipped");
  const redCount = rows.filter((r) => r.risk === "red").length;

  // One-tap advance: move to the next phase in order; at the end, ship it.
  const advance = (task: Task) => {
    const current = task.phase;
    const idx = current ? TASK_PHASE_ORDER.indexOf(current) : -1;
    const next = TASK_PHASE_ORDER[idx + 1];
    if (!next || current === "launch") {
      updateTaskStatus(task.id, "done");
    } else {
      updateTaskPhase(task.id, next);
      if (task.status === "todo") updateTaskStatus(task.id, "in_progress");
    }
    refresh();
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 md:px-10">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-[#1B1B1B]">My Work</h1>
        {/* identity picker */}
        <label className="flex items-center gap-2 text-[12px] text-[#7A7A7A]">
          <span>I&apos;m</span>
          <div className="relative">
            <select
              value={meId ?? ""}
              onChange={(e) => setMe(e.target.value)}
              className="appearance-none rounded-lg border border-[#E5E5EA] bg-white py-1.5 pl-3 pr-8 text-[13px] font-medium text-[#1B1B1B] shadow-[var(--shadow-soft)] focus:border-[#1B1B1B] focus:outline-none"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} · {podNameById[m.pod_id] ?? ""}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-[#A0A0A0]" />
          </div>
        </label>
      </div>
      <p className="mb-5 text-sm text-[#7A7A7A]">
        {me ? `${me.name} · ${ROLE_LABEL[me.role]}` : "Pick who you are"} — what you owe, in priority
        order, today.
      </p>

      {rows.length === 0 ? (
        <Card>
          <EmptyState>
            {meId
              ? "Nothing assigned to you right now. New deliverables land here the moment they're assigned."
              : "Pick who you are above to see your work."}
          </EmptyState>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Needs you now — red + amber */}
          <Section
            title="Needs you now"
            hint={redCount > 0 ? `${redCount} at risk` : redAmber.length > 0 ? "due this week" : undefined}
          >
            {redAmber.length === 0 ? (
              <EmptyState>Nothing urgent. Clear plate 🎉</EmptyState>
            ) : (
              redAmber.map((r) => <DeliverableRow key={r.task.id} row={r} onAdvance={advance} />)
            )}
          </Section>

          {green.length > 0 && (
            <Section title="On track">
              {green.map((r) => (
                <DeliverableRow key={r.task.id} row={r} onAdvance={advance} />
              ))}
            </Section>
          )}

          {blocked.length > 0 && (
            <Section title="Off your plate" hint="blocked — not on you">
              {blocked.map((r) => (
                <DeliverableRow key={r.task.id} row={r} onAdvance={advance} muted />
              ))}
            </Section>
          )}

          {shipped.length > 0 && (
            <div>
              <button
                onClick={() => setShowShipped((s) => !s)}
                className="mb-2 inline-flex items-center gap-1 text-[12px] font-medium text-[#7A7A7A] hover:text-[#1B1B1B]"
              >
                <ChevronDownIcon className={`size-4 transition-transform ${showShipped ? "" : "-rotate-90"}`} />
                Shipped ({shipped.length})
              </button>
              {showShipped && (
                <div className="space-y-1.5">
                  {shipped.map((r) => (
                    <DeliverableRow key={r.task.id} row={r} onAdvance={advance} muted />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A]">{title}</h2>
        {hint && <span className="text-[11px] text-[#A0A0A0]">{hint}</span>}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

const RISK_BORDER: Record<RiskLevel, string> = {
  red: "border-l-rose-500",
  amber: "border-l-amber-400",
  green: "border-l-emerald-400",
  blocked: "border-l-[#D5D5DA]",
  shipped: "border-l-[#D5D5DA]",
};

function DeliverableRow({
  row,
  onAdvance,
  muted = false,
}: {
  row: Row;
  onAdvance: (t: Task) => void;
  muted?: boolean;
}) {
  const { task, status, risk, reason, clientName, day } = row;
  const canAdvance = status !== "shipped" && !isBlocked(status);
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border border-l-2 border-[#F0F0F2] bg-white px-3 py-2.5 shadow-[var(--shadow-soft)] ${RISK_BORDER[risk]} ${muted ? "opacity-70" : ""}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13px] font-semibold text-[#1B1B1B]">{task.title}</span>
          {day != null && (
            <span className="shrink-0 text-[10px] tabular-nums text-[#A0A0A0]">Day {Math.max(1, day)}/90</span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[#7A7A7A]">
          <span className="truncate">{clientName}</span>
          {task.phase && <span className="text-[#C5C5C5]">· {TASK_PHASE_LABEL[task.phase]}</span>}
          <span className={risk === "red" ? "font-semibold text-rose-600" : ""}>· {reason}</span>
        </div>
      </div>
      <Pill tone={STATUS_PILL[status]}>{DELIVERABLE_STATUS_LABEL[status]}</Pill>
      {canAdvance ? (
        <button
          onClick={() => onAdvance(task)}
          title={task.phase === "launch" ? "Mark shipped" : "Advance phase"}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[#E5E5EA] bg-white px-2 py-1 text-[11px] font-medium text-[#1B1B1B] transition-colors hover:border-[#1B1B1B] hover:bg-[#1B1B1B] hover:text-white"
        >
          {task.phase === "launch" ? <CheckCircleIcon className="size-3.5" /> : <ArrowRightCircleIcon className="size-3.5" />}
          {task.phase === "launch" ? "Ship" : "Advance"}
        </button>
      ) : (
        <Link
          href={`/engagements/${row.client?.id ?? ""}`}
          className="shrink-0 text-[11px] font-medium text-[#7A7A7A] underline underline-offset-2 hover:text-[#1B1B1B]"
        >
          Open
        </Link>
      )}
    </div>
  );
}
