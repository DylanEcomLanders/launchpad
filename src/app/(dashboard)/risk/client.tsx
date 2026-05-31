"use client";

// Risk / Triage — the PM's home (launchpad-build-brief).
// Every deliverable trending late, agency-wide, urgency-sorted — replacing
// "is the agency healthy?" as the thing leadership opens first. Plus two
// forcing-function alert bands the brief calls out:
//   • The clock is pressure — a retainer past onboarding with nothing
//     shipped reads as a screaming-red engagement, not a quiet 0%.
//   • Onboarding purgatory — an engagement with no deliverables yet.
// Reads the unified Deliverable (pods-v2 Task) directly; owners are people.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ExclamationTriangleIcon,
  FireIcon,
  InboxIcon,
} from "@heroicons/react/24/outline";
import {
  ensureSeed,
  getTasks,
  getProjects,
  getClients,
  getPods,
} from "@/lib/pods-v2/data";
import { bootstrapPodsSync } from "@/lib/pods-v2/sync";
import {
  deliverableStatus,
  riskLevel,
  riskReason,
  RISK_RANK,
  DELIVERABLE_STATUS_LABEL,
  type RiskLevel,
  type DeliverableStatus,
} from "@/lib/pods-v2/deliverable";
import { engagementKindOf, engagementDay } from "@/lib/pods-v2/calc";
import {
  TASK_PHASE_LABEL,
  type Task,
  type Project,
  type Client,
  type Pod,
  type PodMember,
} from "@/lib/pods-v2/types";
import { Card, StatTile, Pill, EmptyState } from "@/components/pod-os/ui";

function todayYMD(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const STATUS_PILL: Record<DeliverableStatus, Parameters<typeof Pill>[0]["tone"]> = {
  not_started: "default",
  in_progress: "blue",
  in_review: "purple",
  shipped: "emerald",
  blocked_client: "amber",
  blocked_resource: "rose",
};

interface RiskRow {
  task: Task;
  ownerName: string;
  podName: string;
  clientName: string;
  clientId: string;
  status: DeliverableStatus;
  risk: RiskLevel;
  reason: string;
}

interface EngagementAlert {
  clientId: string;
  clientName: string;
  podName: string;
  kind: "screaming_clock" | "onboarding_purgatory";
  detail: string;
}

export default function RiskClient() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [pods, setPods] = useState<Pod[]>([]);
  const [today] = useState(todayYMD);
  const [showGreen, setShowGreen] = useState(false);

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
  }, [refresh]);

  const memberById = useMemo(() => {
    const m: Record<string, PodMember> = {};
    pods.forEach((p) => p.members.forEach((mem) => (m[mem.id] = mem)));
    return m;
  }, [pods]);
  const podNameById = useMemo(() => Object.fromEntries(pods.map((p) => [p.id, p.name])), [pods]);
  const clientById = useMemo(() => {
    const m: Record<string, Client> = {};
    clients.forEach((c) => (m[c.id] = c));
    return m;
  }, [clients]);
  const clientIdByProject = useMemo(() => {
    const m: Record<string, string> = {};
    projects.forEach((p) => (m[p.id] = p.client_id));
    return m;
  }, [projects]);

  const rows: RiskRow[] = useMemo(() => {
    return tasks
      .map((t) => {
        const clientId = clientIdByProject[t.project_id];
        const client = clientId ? clientById[clientId] : null;
        return {
          task: t,
          ownerName: memberById[t.assigned_to]?.name ?? "Unassigned",
          podName: podNameById[client?.pod_id ?? ""] ?? "—",
          clientName: client?.name ?? "—",
          clientId: clientId ?? "",
          status: deliverableStatus(t, client),
          risk: riskLevel(t, client, today),
          reason: riskReason(t, client, today),
        };
      })
      .sort(
        (a, b) =>
          RISK_RANK[a.risk] - RISK_RANK[b.risk] || a.task.due_date.localeCompare(b.task.due_date),
      );
  }, [tasks, clientIdByProject, clientById, memberById, podNameById, today]);

  // Engagement-level forcing-function alerts.
  const alerts: EngagementAlert[] = useMemo(() => {
    const tasksByClient: Record<string, Task[]> = {};
    for (const t of tasks) {
      const cid = clientIdByProject[t.project_id];
      if (cid) (tasksByClient[cid] ??= []).push(t);
    }
    const out: EngagementAlert[] = [];
    for (const c of clients) {
      const cTasks = tasksByClient[c.id] ?? [];
      const shipped = cTasks.filter((t) => t.status === "done").length;
      const day = engagementDay(c, today);
      const isRetainer = engagementKindOf(c) === "retainer";
      if (cTasks.length === 0) {
        out.push({
          clientId: c.id,
          clientName: c.name,
          podName: podNameById[c.pod_id] ?? "—",
          kind: "onboarding_purgatory",
          detail: day != null ? `Day ${Math.max(1, day)} — no deliverables created yet` : "No deliverables created yet",
        });
      } else if (isRetainer && day != null && day > 14 && shipped === 0) {
        out.push({
          clientId: c.id,
          clientName: c.name,
          podName: podNameById[c.pod_id] ?? "—",
          kind: "screaming_clock",
          detail: `Day ${day}/90 — nothing shipped`,
        });
      }
    }
    return out;
  }, [tasks, clients, clientIdByProject, podNameById, today]);

  const red = rows.filter((r) => r.risk === "red");
  const amber = rows.filter((r) => r.risk === "amber");
  const green = rows.filter((r) => r.risk === "green");
  const blocked = rows.filter((r) => r.risk === "blocked");

  const isEmpty = tasks.length === 0;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 md:px-10">
      <h1 className="text-2xl font-semibold tracking-tight text-[#1B1B1B]">Risk &amp; Triage</h1>
      <p className="mb-5 text-sm text-[#7A7A7A]">
        Everything trending late, agency-wide, sorted by urgency. What&apos;s at risk right now — not
        &quot;is the agency healthy?&quot;
      </p>

      {isEmpty ? (
        <Card>
          <EmptyState>No deliverables yet across any pod.</EmptyState>
        </Card>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile label="Red" value={red.length} tone={red.length > 0 ? "rose" : "default"} hint="due ≤2d / overdue" />
            <StatTile label="Amber" value={amber.length} tone={amber.length > 0 ? "amber" : "default"} hint="due ≤4d" />
            <StatTile label="Blocked" value={blocked.length} hint="off the team's plate" />
            <StatTile label="At-risk engagements" value={alerts.length} tone={alerts.length > 0 ? "rose" : "default"} />
          </div>

          {/* forcing-function alerts */}
          {alerts.length > 0 && (
            <div className="mb-6 space-y-1.5">
              {alerts.map((a) => (
                <Link
                  key={`${a.kind}-${a.clientId}`}
                  href={`/engagements/${a.clientId}`}
                  className="flex items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 transition-colors hover:bg-rose-100"
                >
                  {a.kind === "screaming_clock" ? (
                    <FireIcon className="size-5 shrink-0 text-rose-600" />
                  ) : (
                    <InboxIcon className="size-5 shrink-0 text-rose-600" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-rose-900">
                      {a.clientName}
                      <span className="ml-2 font-normal text-rose-700">{a.podName}</span>
                    </div>
                    <div className="text-[12px] text-rose-700">
                      {a.kind === "screaming_clock" ? "Clock pressure — " : "Onboarding purgatory — "}
                      {a.detail}
                    </div>
                  </div>
                  <span className="shrink-0 text-[11px] font-medium text-rose-700">Open →</span>
                </Link>
              ))}
            </div>
          )}

          {/* triage list */}
          <RiskGroup title="Red — needs action now" rows={red} empty="No red deliverables." />
          <RiskGroup title="Amber — trending late" rows={amber} empty="Nothing amber." />
          {blocked.length > 0 && (
            <RiskGroup title="Blocked — waiting on client / resources" rows={blocked} empty="" muted />
          )}

          {green.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setShowGreen((s) => !s)}
                className="text-[12px] font-medium text-[#7A7A7A] hover:text-[#1B1B1B]"
              >
                {showGreen ? "Hide" : "Show"} on-track ({green.length})
              </button>
              {showGreen && (
                <div className="mt-2">
                  <RiskGroup title="" rows={green} empty="" muted />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const RISK_DOT: Record<RiskLevel, string> = {
  red: "bg-rose-500",
  amber: "bg-amber-400",
  green: "bg-emerald-400",
  blocked: "bg-[#C5C5C5]",
  shipped: "bg-[#C5C5C5]",
};

function RiskGroup({
  title,
  rows,
  empty,
  muted = false,
}: {
  title: string;
  rows: RiskRow[];
  empty: string;
  muted?: boolean;
}) {
  if (rows.length === 0 && !empty) return null;
  return (
    <div className="mb-5">
      {title && (
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#7A7A7A]">{title}</h2>
      )}
      {rows.length === 0 ? (
        <EmptyState>{empty}</EmptyState>
      ) : (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <Link
              key={r.task.id}
              href={`/engagements/${r.clientId}`}
              className={`flex items-center gap-3 rounded-lg border border-[#F0F0F2] bg-white px-3 py-2.5 shadow-[var(--shadow-soft)] transition-colors hover:border-[#C5C5C5] ${muted ? "opacity-70" : ""}`}
            >
              <span className={`size-2 shrink-0 rounded-full ${RISK_DOT[r.risk]}`} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-[#1B1B1B]">{r.task.title}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-[#7A7A7A]">
                  <span className="font-medium text-[#3A3A3A]">{r.ownerName}</span>
                  <span className="text-[#C5C5C5]">· {r.clientName}</span>
                  <span className="text-[#C5C5C5]">· {r.podName}</span>
                  {r.task.phase && <span className="text-[#C5C5C5]">· {TASK_PHASE_LABEL[r.task.phase]}</span>}
                  <span className={r.risk === "red" ? "font-semibold text-rose-600" : ""}>· {r.reason}</span>
                </div>
              </div>
              <Pill tone={STATUS_PILL[r.status]}>{DELIVERABLE_STATUS_LABEL[r.status]}</Pill>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
