"use client";

import { useState } from "react";
import {
  LockClosedIcon,
  ArrowDownIcon,
  XMarkIcon,
  CheckCircleIcon,
  PauseCircleIcon,
  PlayCircleIcon,
  CalendarDaysIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  TrophyIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckSolid } from "@heroicons/react/24/solid";
import {
  PODS,
  POD_BY_ID,
  CLIENTS,
  CLIENT_BY_ID,
  TASKS,
  PROJECTS,
  ROLE_LABEL,
  MEMBER_BY_ID,
  taskState,
  daysUntil,
  fmtDayMonth,
  capacityUsed,
  capacityInWindow,
  PHASE_LABEL,
  LEAD_STRATEGIST,
  type Pod,
  type Task,
  type TaskState,
  type TaskStatus,
} from "../mock-data";
import {
  Avatar,
  AnnotationStrip,
  StateBadge,
  CapacityBar,
  SectionHeader,
  Disclosure,
  MemberChip,
} from "../components";
import { useStrategyStore } from "../strategy/use-strategy-store";
import { ClientStrategyPanel } from "../strategy/client";

type Tab = "overview" | "pipeline" | "strategy";
const ATTENTION: TaskState[] = ["overdue_internal", "blocked", "waiting_client"];

// ---- per-pod derived numbers -------------------------------------------------

function podStats(podId: string) {
  const pTasks = TASKS.filter((t) => t.podId === podId);
  const projects = PROJECTS.filter((p) => p.podId === podId);
  const projTasks = (pid: string) => pTasks.filter((t) => t.projectId === pid);
  const shipped = (pid: string) => {
    const ts = projTasks(pid);
    return ts.length > 0 && ts.every((t) => t.status === "done");
  };
  const started = (pid: string) => projTasks(pid).some((t) => t.status !== "todo");
  const live = projects.filter((p) => !shipped(p.id));
  return {
    used: capacityUsed(podId),
    thisWeek: capacityInWindow(podId, 0, 7),
    nextWeek: capacityInWindow(podId, 8, 14),
    inFlight: live.filter((p) => started(p.id)).length,
    queued: live.filter((p) => !started(p.id)).length,
    blockers: pTasks.filter((t) => t.blocked).length,
  };
}

export default function PodsClient() {
  const [tab, setTab] = useState<Tab>("overview");
  const [detailPodId, setDetailPodId] = useState<string | null>(null);

  // shared task state (per-pod task list + cascade + dates)
  const [tasks, setTasks] = useState<Task[]>(() =>
    TASKS.map((t) => ({ ...t, milestones: t.milestones?.map((m) => ({ ...m })) })),
  );
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [editingDate, setEditingDate] = useState<string | null>(null);

  const strategyStore = useStrategyStore();
  const [strategyClientId, setStrategyClientId] = useState<string | null>(null);

  function patch(id: string, p: Partial<Task>) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...p } : t)));
  }
  function cycleStatus(id: string) {
    const next: Record<TaskStatus, TaskStatus> = { todo: "in_progress", in_progress: "done", done: "todo" };
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: next[t.status] } : t)));
  }
  function toggleWaiting(id: string) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, waitingOn: t.waitingOn === "client" ? null : "client" } : t)));
  }
  function toggleMilestone(taskId: string, mId: string) {
    setTasks((prev) => {
      const task = prev.find((t) => t.id === taskId);
      const ms = task?.milestones?.find((m) => m.id === mId);
      const willBeDone = !ms?.done;
      return prev.map((t) => {
        if (t.id === taskId)
          return { ...t, milestones: t.milestones?.map((m) => (m.id === mId ? { ...m, done: willBeDone } : m)) };
        if (ms?.triggersSecondary && t.id === task?.pairedTaskId && t.status === "todo") return { ...t, locked: !willBeDone };
        return t;
      });
    });
  }

  const openTask = tasks.find((t) => t.id === openTaskId) ?? null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
      <AnnotationStrip title="What changed — Pods">
        <p>
          Kept the same as the system the team runs today — <strong>Overview / Pipeline / Strategy</strong>
          tabs, the pod cards, and the per-pod view are unchanged in how they work.
        </p>
        <p>
          The one addition: the <strong>Strategy tab is now built out</strong> for {LEAD_STRATEGIST.name}
          {" "}(Lead Strategist) — Briefs land from onboarding, live tests show under Results, and each
          brief opens that client&apos;s strategy home.
        </p>
      </AnnotationStrip>

      {detailPodId ? (
        <PodDetail
          pod={POD_BY_ID[detailPodId]}
          tasks={tasks}
          editingDate={editingDate}
          onBack={() => setDetailPodId(null)}
          onEditDate={setEditingDate}
          onCommitDate={(id, d) => {
            patch(id, { dueDate: d });
            setEditingDate(null);
          }}
          onCycleStatus={cycleStatus}
          onToggleWaiting={toggleWaiting}
          onOpen={setOpenTaskId}
        />
      ) : (
        <>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-subtle">Operating system</div>
          <h1 className="text-2xl font-semibold text-foreground">Pod Overview</h1>
          <p className="mb-5 text-sm text-subtle">Three pods. One cadence. Mondays kick off, Thursdays ship.</p>

          {/* Tabs */}
          <div className="mb-6 flex gap-1 border-b border-border">
            {(
              [
                ["overview", "Overview"],
                ["pipeline", "Pipeline"],
                ["strategy", "Strategy"],
              ] as [Tab, string][]
            ).map(([t, label]) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                  tab === t ? "border-white text-foreground" : "border-transparent text-subtle hover:text-foreground"
                }`}
              >
                {label}
                {t === "strategy" && (
                  <span className="ml-1.5 rounded-full bg-surface px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white">
                    New
                  </span>
                )}
              </button>
            ))}
          </div>

          {tab === "overview" && <OverviewTab onOpenPod={setDetailPodId} />}
          {tab === "pipeline" && <PipelineTab onOpen={setOpenTaskId} />}
          {tab === "strategy" && <StrategyTab onOpenBrief={setStrategyClientId} />}
        </>
      )}

      {openTask && (
        <TaskPanel
          task={openTask}
          onClose={() => setOpenTaskId(null)}
          onToggleMilestone={(mId) => toggleMilestone(openTask.id, mId)}
          onToggleWaiting={() => toggleWaiting(openTask.id)}
          onSetDate={(d) => patch(openTask.id, { dueDate: d })}
          allTasks={tasks}
        />
      )}
      {strategyClientId && (
        <ClientStrategyPanel clientId={strategyClientId} store={strategyStore} onClose={() => setStrategyClientId(null)} />
      )}
    </div>
  );
}

// ===========================================================================
// OVERVIEW TAB — agency health + pod cards
// ===========================================================================

function OverviewTab({ onOpenPod }: { onOpenPod: (id: string) => void }) {
  const anyTrouble = PODS.some((p) => podStats(p.id).blockers > 0);
  return (
    <>
      <div className="mb-5 rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-soft)]">
        <div className="mb-3 flex items-center gap-2">
          <span className={`size-2 rounded-full ${anyTrouble ? "bg-amber-500" : "bg-emerald-500"}`} />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-subtle">Agency health</span>
          <span className={`text-[12px] font-medium ${anyTrouble ? "text-amber-700" : "text-emerald-700"}`}>
            {anyTrouble ? "Watch" : "Healthy"}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {PODS.map((p) => {
            const s = podStats(p.id);
            const pct = Math.round((s.used / p.capacityTotal) * 100);
            return (
              <div key={p.id} className="rounded-lg border border-border bg-surface p-3">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[12px] font-semibold">{p.name}</span>
                </div>
                <div className="flex gap-4 text-[11px]">
                  <Mini label="Cap" value={`${pct}%`} />
                  <Mini label="Blockers" value={s.blockers} bad={s.blockers > 0} />
                  <Mini label="In flight" value={s.inFlight} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {PODS.map((p) => (
          <PodCard key={p.id} pod={p} onOpen={() => onOpenPod(p.id)} />
        ))}
      </div>
    </>
  );
}

function Mini({ label, value, bad }: { label: string; value: string | number; bad?: boolean }) {
  return (
    <div>
      <div className="text-[9px] font-semibold uppercase tracking-wider text-subtle">{label}</div>
      <div className={`text-sm font-semibold tabular-nums ${bad ? "text-rose-700" : "text-foreground"}`}>{value}</div>
    </div>
  );
}

function PodCard({ pod, onOpen }: { pod: Pod; onOpen: () => void }) {
  const s = podStats(pod.id);
  return (
    <button
      onClick={onOpen}
      className="rounded-xl border border-border bg-surface p-5 text-left shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:border-muted hover:shadow-[var(--shadow-card)]"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-lg font-semibold text-foreground">{pod.name}</div>
          <div className="text-[12px] text-subtle">{pod.tagline}</div>
        </div>
        <ChevronRightIcon className="size-4 text-muted" />
      </div>

      <div className="mt-3 flex -space-x-1.5">
        {pod.members.map((m) => (
          <Avatar key={m.id} name={m.name} id={m.id} size={28} placeholder={m.isPlaceholder} />
        ))}
      </div>

      <div className="mt-4">
        <CapacityBar used={s.used} total={pod.capacityTotal} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <WeekCell label="This week" used={s.thisWeek} cap={pod.capacityTotal / 4} />
        <WeekCell label="Next week" used={s.nextWeek} cap={pod.capacityTotal / 4} />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-surface-raised pt-3">
        <Stat label="In flight" value={s.inFlight} />
        <Stat label="Queued" value={s.queued} />
        <Stat label="Blockers" value={s.blockers} bad={s.blockers > 0} />
      </div>
    </button>
  );
}

function WeekCell({ label, used, cap }: { label: string; used: number; cap: number }) {
  const pct = Math.min(100, Math.round((used / cap) * 100));
  const tone = used >= cap ? "bg-rose-400" : used >= cap * 0.8 ? "bg-amber-400" : "bg-emerald-400";
  return (
    <div className="rounded-md border border-border bg-surface px-2 py-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-subtle">{label}</span>
        <span className="text-[11px] tabular-nums text-subtle">{used}/{cap} pts</span>
      </div>
      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-surface-raised">
        <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Stat({ label, value, bad }: { label: string; value: number; bad?: boolean }) {
  return (
    <div>
      <div className="text-[9px] font-semibold uppercase tracking-wider text-subtle">{label}</div>
      <div className={`text-lg font-semibold tabular-nums ${bad ? "text-rose-700" : "text-foreground"}`}>{value}</div>
    </div>
  );
}

// ===========================================================================
// PIPELINE TAB — projects across all pods by stage / delivery
// ===========================================================================

function PipelineTab({ onOpen }: { onOpen: (id: string) => void }) {
  const rows = PROJECTS.map((p) => {
    const pt = TASKS.filter((t) => t.projectId === p.id);
    const phased = pt.filter((t) => t.phase);
    const lead = phased.find((t) => t.discipline === "design" && t.tier === "primary") ?? phased[0] ?? pt[0];
    const shipped = pt.length > 0 && pt.every((t) => t.status === "done");
    return { p, lead, shipped, state: lead ? taskState(lead) : ("on_track" as TaskState) };
  }).sort((a, b) => (a.lead?.dueDate ?? "").localeCompare(b.lead?.dueDate ?? ""));

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-[var(--shadow-soft)]">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-border bg-background text-left text-[11px] font-semibold uppercase tracking-wider text-subtle">
            <th className="px-4 py-2.5">Project</th>
            <th className="px-4 py-2.5">Client</th>
            <th className="px-4 py-2.5">Pod</th>
            <th className="px-4 py-2.5">Stage</th>
            <th className="px-4 py-2.5">Ships</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map(({ p, lead, shipped, state }) => (
            <tr
              key={p.id}
              onClick={() => lead && onOpen(lead.id)}
              className="cursor-pointer hover:bg-background"
            >
              <td className="px-4 py-2.5 font-medium text-foreground">{p.name}</td>
              <td className="px-4 py-2.5 text-subtle">{CLIENT_BY_ID[p.clientId]?.name}</td>
              <td className="px-4 py-2.5 text-[12px] text-subtle">{POD_BY_ID[p.podId]?.tagline}</td>
              <td className="px-4 py-2.5">
                {shipped ? (
                  <span className="text-[12px] font-medium text-emerald-700">Shipped</span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <span className="text-[12px] text-foreground">{lead?.phase ? PHASE_LABEL[lead.phase] : "—"}</span>
                    {ATTENTION.includes(state) && <StateBadge state={state} />}
                  </span>
                )}
              </td>
              <td className="px-4 py-2.5 text-[12px] tabular-nums text-subtle">
                {shipped ? "—" : lead ? fmtDayMonth(lead.dueDate) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ===========================================================================
// STRATEGY TAB — Briefs (from onboarding) + Results (live tests), owned by Aanchal
// ===========================================================================

function StrategyTab({ onOpenBrief }: { onOpenBrief: (clientId: string) => void }) {
  const briefs = CLIENTS.filter((c) => c.strategy);
  const results = TASKS.filter((t) => t.testResult);

  function clientStatus(clientId: string): string {
    const pt = TASKS.filter((t) => t.clientId === clientId && t.phase && t.status !== "done");
    if (pt.length === 0) return "In delivery";
    const earliest = pt.find((t) => t.phase === "onboarding" || t.phase === "research");
    return earliest ? "Onboarding" : "In delivery";
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-[12px] text-subtle">
        <Avatar name={LEAD_STRATEGIST.name} id={LEAD_STRATEGIST.id} size={20} />
        Owned by {LEAD_STRATEGIST.name} · Lead Strategist · across all pods
      </div>

      {/* Briefs */}
      <div className="rounded-xl border border-border bg-surface shadow-[var(--shadow-soft)]">
        <div className="flex items-center gap-2 border-b border-surface-raised px-4 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-subtle">Briefs</span>
          <span className="text-[11px] text-subtle">{briefs.length}</span>
          <span className="text-[11px] text-subtle">· auto-added when onboarding lands on a pod · one per client</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] font-semibold uppercase tracking-wider text-subtle">
              <th className="px-4 py-2">Client</th>
              <th className="px-4 py-2">Pod</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Hypotheses</th>
              <th className="px-4 py-2 text-right">Strategy home</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {briefs.map((c) => (
              <tr key={c.id} onClick={() => onOpenBrief(c.id)} className="cursor-pointer hover:bg-background">
                <td className="px-4 py-2.5 font-medium text-foreground">{c.name}</td>
                <td className="px-4 py-2.5 text-[12px] text-subtle">{POD_BY_ID[c.podId]?.tagline}</td>
                <td className="px-4 py-2.5">
                  <span className="rounded-md border border-border bg-surface-raised px-1.5 py-0.5 text-[11px] font-medium text-subtle">
                    {clientStatus(c.id)}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-[12px] text-subtle">{c.strategy?.hypotheses.length ?? 0}</td>
                <td className="px-4 py-2.5 text-right">
                  <span className="inline-flex items-center gap-1 text-[12px] font-medium text-foreground">
                    Open <ArrowRightIcon className="size-3.5" />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Results */}
      <div className="rounded-xl border border-border bg-surface shadow-[var(--shadow-soft)]">
        <div className="flex items-center gap-2 border-b border-surface-raised px-4 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-subtle">Results</span>
          <span className="text-[11px] text-subtle">{results.length}</span>
          <span className="text-[11px] text-subtle">· live tests Aanchal is tracking</span>
        </div>
        {results.length === 0 ? (
          <p className="px-4 py-6 text-center text-[12px] text-muted">No live tests right now.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-semibold uppercase tracking-wider text-subtle">
                <th className="px-4 py-2">Client</th>
                <th className="px-4 py-2">Test</th>
                <th className="px-4 py-2">Pod</th>
                <th className="px-4 py-2 text-right">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {results.map((t) => (
                <tr key={t.id} className="hover:bg-background">
                  <td className="px-4 py-2.5 font-medium text-foreground">{CLIENT_BY_ID[t.clientId]?.name}</td>
                  <td className="px-4 py-2.5 text-[12px] text-subtle">{t.title}</td>
                  <td className="px-4 py-2.5 text-[12px] text-subtle">{POD_BY_ID[t.podId]?.tagline}</td>
                  <td className="px-4 py-2.5 text-right">
                    {t.testResult?.status === "winner" ? (
                      <span className="text-[12px] font-semibold text-emerald-700">Winner · +{t.testResult.lift}%</span>
                    ) : t.testResult?.status === "loser" ? (
                      <span className="text-[12px] font-semibold text-rose-700">Lost · {t.testResult.lift}%</span>
                    ) : (
                      <span className="text-[12px] font-medium text-subtle">Awaiting results</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ===========================================================================
// PER-POD DETAIL — header, capacity, stats, blockers, roster, task list
// ===========================================================================

function PodDetail({
  pod,
  tasks,
  editingDate,
  onBack,
  onEditDate,
  onCommitDate,
  onCycleStatus,
  onToggleWaiting,
  onOpen,
}: {
  pod: Pod;
  tasks: Task[];
  editingDate: string | null;
  onBack: () => void;
  onEditDate: (id: string) => void;
  onCommitDate: (id: string, d: string) => void;
  onCycleStatus: (id: string) => void;
  onToggleWaiting: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  const pTasks = tasks.filter((t) => t.podId === pod.id);
  const projects = PROJECTS.filter((p) => p.podId === pod.id);
  const s = podStats(pod.id);
  const clients = CLIENTS.filter((c) => c.podId === pod.id);
  const blocked = pTasks.filter((t) => t.blocked);

  return (
    <div>
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-sm text-subtle hover:text-foreground">
        <ArrowLeftIcon className="size-4" /> All pods
      </button>

      {/* header + members */}
      <div className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-soft)]">
        <h1 className="text-2xl font-semibold text-foreground">{pod.name}</h1>
        <p className="text-sm text-subtle">{pod.tagline}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {pod.members.map((m) => (
            <div key={m.id} className="flex items-center gap-2">
              <Avatar name={m.name} id={m.id} size={36} placeholder={m.isPlaceholder} />
              <div className="min-w-0 leading-tight">
                <div className={`truncate text-[13px] font-medium ${m.isPlaceholder ? "italic text-subtle" : "text-foreground"}`}>
                  {m.isPlaceholder ? "TO HIRE" : m.name}
                </div>
                <div className="truncate text-[11px] text-subtle">{ROLE_LABEL[m.role]}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* capacity + stats */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-soft)]">
          <CapacityBar used={s.used} total={pod.capacityTotal} label="Capacity · this month" />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <WeekCell label="This week" used={s.thisWeek} cap={pod.capacityTotal / 4} />
            <WeekCell label="Next week" used={s.nextWeek} cap={pod.capacityTotal / 4} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <BigStat label="In flight" value={s.inFlight} />
          <BigStat label="Queued" value={s.queued} />
          <BigStat label="Members" value={pod.members.length} />
          <BigStat label="Blockers" value={s.blockers} bad={s.blockers > 0} />
        </div>
      </div>

      {/* open tasks per member */}
      <div className="mt-4 rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-soft)]">
        <SectionHeader>Open tasks per member</SectionHeader>
        <div className="space-y-1">
          {pod.members.map((m) => {
            const count = pTasks.filter((t) => t.assignedTo === m.id && t.status !== "done").length;
            return (
              <div key={m.id} className="flex items-center justify-between text-[13px]">
                <span className={m.isPlaceholder ? "italic text-subtle" : "text-foreground"}>
                  {m.isPlaceholder ? "TO HIRE" : m.name}
                </span>
                <span className="tabular-nums text-subtle">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* blockers */}
      <div className="mt-4 rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-soft)]">
        <SectionHeader>Blockers</SectionHeader>
        {blocked.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-background py-4 text-center text-[12px] text-subtle">
            No active blockers. Pod is clear.
          </p>
        ) : (
          <div className="space-y-1.5">
            {blocked.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-[12px]">
                <span className="text-orange-800">{t.title}{t.blockedReason ? ` — ${t.blockedReason}` : ""}</span>
                <span className="text-orange-700">{MEMBER_BY_ID[t.assignedTo]?.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* client roster */}
      <div className="mt-4">
        <SectionHeader>Client roster</SectionHeader>
        <div className="grid gap-3 md:grid-cols-2">
          {clients.map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-surface p-3 shadow-[var(--shadow-soft)]">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">{c.name}</span>
                <span className="rounded-md border border-border bg-surface-raised px-1.5 py-0.5 text-[10px] font-medium text-subtle">
                  £{c.retainerTier}/mo
                </span>
              </div>
              {c.cvrCurrent != null && (
                <div className="mt-2 text-[11px] text-subtle">
                  CVR {c.cvrBaseline}% → <span className="font-medium text-foreground">{c.cvrCurrent}%</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* task list (the familiar working view) */}
      <div className="mt-6">
        <SectionHeader right={<span className="text-[11px] text-subtle">Click the circle to advance status</span>}>
          Active work
        </SectionHeader>
        <div className="space-y-4">
          {clients.map((client) => {
            const ct = pTasks.filter((t) => t.clientId === client.id);
            const live = ct.filter((t) => t.status !== "done");
            const done = ct.filter((t) => t.status === "done");
            if (ct.length === 0) return null;
            return (
              <div key={client.id} className="rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-soft)]">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">{client.name}</h4>
                  <span className="text-[11px] text-subtle">{live.length} in flight</span>
                </div>
                <div className="divide-y divide-border">
                  {live.map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      state={taskState(t)}
                      editing={editingDate === t.id}
                      onEditDate={() => onEditDate(t.id)}
                      onCommitDate={(d) => onCommitDate(t.id, d)}
                      onCycleStatus={() => onCycleStatus(t.id)}
                      onToggleWaiting={() => onToggleWaiting(t.id)}
                      onOpen={() => onOpen(t.id)}
                    />
                  ))}
                </div>
                {done.length > 0 && (
                  <div className="mt-3 border-t border-surface-raised pt-3">
                    <Disclosure label="Done" count={done.length}>
                      <div className="divide-y divide-border">
                        {done.map((t) => (
                          <TaskRow
                            key={t.id}
                            task={t}
                            state="done"
                            editing={false}
                            onEditDate={() => {}}
                            onCommitDate={() => {}}
                            onCycleStatus={() => onCycleStatus(t.id)}
                            onToggleWaiting={() => {}}
                            onOpen={() => onOpen(t.id)}
                          />
                        ))}
                      </div>
                    </Disclosure>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {projects.length === 0 && <p className="text-[12px] text-subtle">No projects yet.</p>}
      </div>
    </div>
  );
}

function BigStat({ label, value, bad }: { label: string; value: number; bad?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3 shadow-[var(--shadow-soft)]">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-subtle">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${bad ? "text-rose-700" : "text-foreground"}`}>{value}</div>
    </div>
  );
}

// ===========================================================================
// Task row (familiar working view) + status control
// ===========================================================================

function StatusControl({ status, onClick }: { status: TaskStatus; onClick: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title="Click to advance status"
      className="shrink-0"
    >
      {status === "done" ? (
        <CheckSolid className="size-5 text-emerald-500" />
      ) : status === "in_progress" ? (
        <span className="grid size-5 place-items-center rounded-full border-2 border-blue-500">
          <span className="size-2 rounded-full bg-blue-500" />
        </span>
      ) : (
        <span className="block size-5 rounded-full border-2 border-[#D5D5DA]" />
      )}
    </button>
  );
}

function TaskRow({
  task,
  state,
  editing,
  onEditDate,
  onCommitDate,
  onCycleStatus,
  onToggleWaiting,
  onOpen,
}: {
  task: Task;
  state: TaskState;
  editing: boolean;
  onEditDate: () => void;
  onCommitDate: (d: string) => void;
  onCycleStatus: () => void;
  onToggleWaiting: () => void;
  onOpen: () => void;
}) {
  const assignee = MEMBER_BY_ID[task.assignedTo];
  const d = daysUntil(task.dueDate);
  const dateTone =
    state === "overdue_internal"
      ? "text-rose-700"
      : state === "due_soon"
        ? "text-amber-700"
        : state === "waiting_client"
          ? "text-blue-600 line-through"
          : "text-subtle";

  return (
    <div className="group flex items-center gap-3 py-2.5">
      {task.locked ? <LockClosedIcon className="size-5 shrink-0 text-muted" /> : <StatusControl status={task.status} onClick={onCycleStatus} />}

      <button onClick={onOpen} className="min-w-0 flex-1 text-left">
        <div className="flex items-center gap-2">
          <span className={`truncate text-sm font-medium ${task.locked || task.status === "done" ? "text-subtle" : "text-foreground"}`}>
            {task.title}
          </span>
          {task.testResult?.status === "winner" && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700">
              <TrophyIcon className="size-3" /> +{task.testResult.lift}%
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-subtle">
          {task.phase && <span>{PHASE_LABEL[task.phase]}</span>}
          {task.locked && <span>· Locked, cascades from primary</span>}
          {task.blocked && task.blockedReason && <span className="text-orange-700">· {task.blockedReason}</span>}
        </div>
      </button>

      {ATTENTION.includes(state) && <StateBadge state={state} />}

      <Avatar name={assignee?.name ?? "?"} id={assignee?.id ?? task.assignedTo} size={22} placeholder={assignee?.isPlaceholder} />

      <div className="w-24 text-right">
        {editing ? (
          <input
            type="date"
            autoFocus
            defaultValue={task.dueDate}
            onBlur={(e) => onCommitDate(e.target.value || task.dueDate)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onCommitDate((e.target as HTMLInputElement).value || task.dueDate);
            }}
            className="w-full rounded-md border border-white bg-surface px-1.5 py-1 text-[11px] focus:outline-none"
          />
        ) : (
          <button
            onClick={onEditDate}
            disabled={state === "done"}
            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[12px] tabular-nums hover:bg-surface-raised disabled:opacity-50 ${dateTone}`}
            title="Click to edit due date"
          >
            <CalendarDaysIcon className="size-3.5 opacity-60" />
            {fmtDayMonth(task.dueDate)}
            {state === "overdue_internal" && <span className="text-[10px]">({Math.abs(d)}d late)</span>}
          </button>
        )}
      </div>

      {state !== "done" && !task.blocked && task.tier === "primary" && (
        <button
          onClick={onToggleWaiting}
          title={task.waitingOn === "client" ? "Resume — clock restarts" : "Mark waiting on client — pauses the clock"}
          className="text-muted opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
        >
          {task.waitingOn === "client" ? <PlayCircleIcon className="size-5" /> : <PauseCircleIcon className="size-5" />}
        </button>
      )}
    </div>
  );
}

// ===========================================================================
// TASK PANEL — detail + cascade + editable date
// ===========================================================================

function TaskPanel({
  task,
  onClose,
  onToggleMilestone,
  onToggleWaiting,
  onSetDate,
  allTasks,
}: {
  task: Task;
  onClose: () => void;
  onToggleMilestone: (mId: string) => void;
  onToggleWaiting: () => void;
  onSetDate: (d: string) => void;
  allTasks: Task[];
}) {
  const assignee = MEMBER_BY_ID[task.assignedTo];
  const paired = task.pairedTaskId ? allTasks.find((t) => t.id === task.pairedTaskId) : null;
  const primaryParent = task.locked ? allTasks.find((t) => t.pairedTaskId === task.id) : null;
  const state = taskState(task);
  const [editingDate, setEditingDate] = useState(false);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative h-full w-full max-w-md overflow-y-auto border-l border-border bg-surface p-6 shadow-[var(--shadow-elevated)]">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-subtle">
              {task.phase ? `${PHASE_LABEL[task.phase]} · ` : ""}
              {task.tier} · {task.discipline}
            </div>
            <h3 className="mt-2 text-lg font-semibold text-foreground">{task.title}</h3>
          </div>
          <button onClick={onClose} className="text-subtle hover:text-foreground">
            <XMarkIcon className="size-5" />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <StateBadge state={state} />
          <span className="inline-flex items-center gap-1.5 text-[12px] text-subtle">
            <Avatar name={assignee?.name ?? "?"} id={assignee?.id ?? ""} size={20} placeholder={assignee?.isPlaceholder} />
            {assignee?.name}
          </span>
          {task.points != null && (
            <span className="rounded-md border border-border bg-surface-raised px-1.5 py-0.5 text-[10px] font-medium text-subtle">
              {task.points} pts
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2 text-[12px] text-subtle">
          <CalendarDaysIcon className="size-4" /> Due
          {editingDate ? (
            <input
              type="date"
              autoFocus
              defaultValue={task.dueDate}
              onBlur={(e) => {
                onSetDate(e.target.value || task.dueDate);
                setEditingDate(false);
              }}
              className="rounded-md border border-white bg-surface px-1.5 py-0.5 text-[12px] focus:outline-none"
            />
          ) : (
            <button onClick={() => setEditingDate(true)} className="font-medium text-foreground underline decoration-dotted underline-offset-2">
              {fmtDayMonth(task.dueDate)}
            </button>
          )}
        </div>

        {task.tier === "primary" && state !== "done" && !task.blocked && (
          <button
            onClick={onToggleWaiting}
            className={`mt-4 flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
              task.waitingOn === "client" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-border bg-surface text-subtle hover:text-foreground"
            }`}
          >
            {task.waitingOn === "client" ? (
              <>
                <PlayCircleIcon className="size-4" /> Waiting on client — clock paused (tap to resume)
              </>
            ) : (
              <>
                <PauseCircleIcon className="size-4" /> Mark waiting on client
              </>
            )}
          </button>
        )}

        {task.milestones && (
          <div className="mt-6">
            <SectionHeader>Cascade · milestones</SectionHeader>
            <p className="mb-3 text-[12px] text-subtle">Completing the trigger milestone hands off to and unlocks the paired build task.</p>
            <div className="space-y-1.5">
              {task.milestones.map((m) => (
                <button
                  key={m.id}
                  onClick={() => onToggleMilestone(m.id)}
                  className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-surface px-3 py-2 text-left hover:border-muted"
                >
                  {m.done ? <CheckSolid className="size-5 shrink-0 text-emerald-500" /> : <CheckCircleIcon className="size-5 shrink-0 text-muted" />}
                  <span className={`flex-1 text-sm ${m.done ? "text-subtle line-through" : "text-foreground"}`}>{m.label}</span>
                  {m.triggersSecondary && (
                    <span className="rounded-md border border-white bg-surface px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white">
                      Trigger
                    </span>
                  )}
                </button>
              ))}
            </div>

            {paired && (
              <div className="mt-3">
                <div className="flex justify-center">
                  <ArrowDownIcon className="size-4 text-muted" />
                </div>
                <div className={`mt-1 rounded-lg border p-3 ${paired.locked ? "border-dashed border-[#D5D5DA] bg-background" : "border-emerald-200 bg-emerald-50"}`}>
                  <div className="flex items-center gap-2">
                    {paired.locked ? <LockClosedIcon className="size-4 text-subtle" /> : <CheckCircleIcon className="size-4 text-emerald-600" />}
                    <span className="text-sm font-medium text-foreground">{paired.title}</span>
                  </div>
                  <div className="mt-1 pl-6 text-[12px]">
                    {paired.locked ? (
                      <span className="text-subtle">Locked — unlocks when client design approval is ticked</span>
                    ) : (
                      <span className="font-medium text-emerald-700">
                        Ready · handed off to {MEMBER_BY_ID[paired.assignedTo]?.name} · due {fmtDayMonth(paired.dueDate)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {primaryParent && (
          <div className="mt-6">
            <SectionHeader>Cascaded from</SectionHeader>
            <div className="rounded-lg border border-border bg-surface p-3">
              <div className="flex items-center gap-2 text-sm">
                <ArrowRightIcon className="size-4 text-muted" />
                <span className="font-medium">{primaryParent.title}</span>
              </div>
              <p className="mt-1 pl-6 text-[12px] text-subtle">
                <MemberChip id={primaryParent.assignedTo} /> · {task.locked ? "not yet handed off" : "handed off"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
