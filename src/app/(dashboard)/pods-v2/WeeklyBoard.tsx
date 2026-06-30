"use client";

// Weekly board — the anti-slippage hero of the pod page.
// "If we say something's due Thursday and it's not done, it slides to Friday,
//  Monday, Tuesday…" — so this puts THIS WEEK's duties dead-centre, split into
// the two ship slots (Tuesday = iterations, Thursday = net-new). Every card
// shows the owner (person), client, design/dev, the internal date (client − 1
// working day) and the client date. Anything past its internal date goes RED
// with days-behind and STAYS in this week until it ships — it stays in your
// face. Simple enough for Alistair to run the pod off it.

import Link from "next/link";
import {
  deliverableStatus,
  riskLevel,
  riskReason,
  internalDue,
  clientDue,
  DELIVERABLE_STATUS_LABEL,
} from "@/lib/pods-v2/deliverable";
import { setTaskSlipReason } from "@/lib/pods-v2/data";
import { engagementKindOf } from "@/lib/pods-v2/calc";
import type { Task, Project, Client, PodMember, SlipReason } from "@/lib/pods-v2/types";
import { Pill } from "@/components/pod-os/ui";

const SLIP_REASON_LABEL: Record<SlipReason, string> = {
  scope: "Scope grew",
  capacity: "No capacity",
  skill: "Skill gap",
  dependency: "Waiting on dependency",
  external: "External / client",
};
const SLIP_REASONS: SlipReason[] = ["scope", "capacity", "skill", "dependency", "external"];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmt(ymd: string): string {
  const [, m, d] = ymd.split("-").map(Number);
  if (!m || !d) return ymd;
  return `${MONTHS[m - 1]} ${d}`;
}

/** Monday (incl.) and Sunday (incl.) of the week containing `todayYMD`. */
function weekBounds(todayYMD: string): { monday: string; sunday: string } {
  const d = new Date(`${todayYMD}T00:00:00Z`);
  const dow = d.getUTCDay(); // 0 Sun .. 6 Sat
  const back = dow === 0 ? 6 : dow - 1;
  const mon = new Date(d);
  mon.setUTCDate(d.getUTCDate() - back);
  const sun = new Date(mon);
  sun.setUTCDate(mon.getUTCDate() + 6);
  return { monday: mon.toISOString().slice(0, 10), sunday: sun.toISOString().slice(0, 10) };
}

const DISCIPLINE_LABEL: Record<string, string> = {
  design: "Design",
  development: "Dev",
  strategy: "Strategy",
};

// Tuesday slot = iterations/revisions; Thursday slot = net-new deliverables.
const ITERATION_TYPES = new Set(["revision", "bug", "desktop_fix", "asset_prep"]);

interface Row {
  task: Task;
  clientName: string;
  clientId: string;
  ownerName: string;
  behind: boolean;
  daysBehind: number;
  reason: string;
  isRetainer: boolean;
}

export function WeeklyBoard({
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
  const { monday, sunday } = weekBounds(today);
  const clientByProject = new Map<string, string>();
  for (const p of projects) clientByProject.set(p.id, p.client_id);
  const clientById = new Map(clients.map((c) => [c.id, c]));
  const memberName = new Map(members.map((m) => [m.id, m.name]));

  // Active this week = open (not shipped) deliverables that are due this week
  // OR already past their internal date (carried over so slips never vanish).
  function toRow(t: Task): Row | null {
    const clientId = clientByProject.get(t.project_id) ?? "";
    const client = clientById.get(clientId) ?? null;
    const status = deliverableStatus(t, client);
    if (status === "shipped") return null;
    const internal = internalDue(t);
    const dueThisWeek = t.due_date >= monday && t.due_date <= sunday;
    const overdueCarry = internal < today;
    if (!dueThisWeek && !overdueCarry) return null;
    const risk = riskLevel(t, client, today);
    const behind = risk === "red";
    const daysBehind = behind && internal < today
      ? Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${internal}T00:00:00Z`)) / 86_400_000)
      : 0;
    return {
      task: t,
      clientName: client?.name ?? "—",
      clientId,
      ownerName: memberName.get(t.assigned_to) ?? "Unassigned",
      behind,
      daysBehind,
      reason: riskReason(t, client, today),
      isRetainer: client ? engagementKindOf(client) === "retainer" : false,
    };
  }

  const rows = tasks.map(toRow).filter((r): r is Row => r !== null);
  // Retainers are VIP (#8): within the same risk band, they sort first.
  const sortRows = (a: Row, b: Row) =>
    Number(b.behind) - Number(a.behind) ||
    Number(b.isRetainer) - Number(a.isRetainer) ||
    a.task.due_date.localeCompare(b.task.due_date);
  const tuesday = rows.filter((r) => ITERATION_TYPES.has(r.task.type)).sort(sortRows);
  const thursday = rows.filter((r) => r.task.type === "core_deliverable").sort(sortRows);

  const behindCount = rows.filter((r) => r.behind).length;
  const shippedThisWeek = tasks.filter(
    (t) => t.status === "done" && t.due_date >= monday && t.due_date <= sunday,
  ).length;

  return (
    <section className="rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-card)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">This week</h2>
          <p className="text-[11px] text-subtle">w/c {fmt(monday)} · internal dates are a day before the client sees them</p>
        </div>
        <div className="flex items-center gap-2">
          {behindCount > 0 ? (
            <Pill tone="rose">{behindCount} behind</Pill>
          ) : (
            <Pill tone="emerald">On track</Pill>
          )}
          {shippedThisWeek > 0 && <Pill tone="muted">{shippedThisWeek} shipped</Pill>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Column title="Tuesday" subtitle="Iterations & revisions" rows={tuesday} onMutate={onMutate} />
        <Column title="Thursday" subtitle="Net-new deliverables" rows={thursday} onMutate={onMutate} />
      </div>
    </section>
  );
}

function Column({
  title,
  subtitle,
  rows,
  onMutate,
}: {
  title: string;
  subtitle: string;
  rows: Row[];
  onMutate?: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-2.5">
      <div className="mb-2 flex items-baseline justify-between">
        <div>
          <span className="text-[12px] font-semibold text-foreground">{title}</span>
          <span className="ml-1.5 text-[10px] text-subtle">{subtitle}</span>
        </div>
        <span className="text-[10px] tabular-nums text-subtle">{rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-border px-2 py-4 text-center text-[10px] text-muted">
          Nothing this slot
        </div>
      ) : (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <WeekCard key={r.task.id} row={r} onMutate={onMutate} />
          ))}
        </div>
      )}
    </div>
  );
}

function WeekCard({ row, onMutate }: { row: Row; onMutate?: () => void }) {
  const { task, clientName, clientId, ownerName, behind, daysBehind, reason, isRetainer } = row;
  const status = deliverableStatus(task, null);
  return (
    <Link
      href={`/engagements/${clientId}`}
      className={`block rounded-lg border bg-surface p-2.5 shadow-[var(--shadow-soft)] transition-colors hover:border-muted ${
        behind ? "border-l-2 border-l-rose-500 border-rose-200" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-foreground">{task.title}</span>
        {behind && (
          <span className="shrink-0 rounded-md bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300">
            {daysBehind}d behind
          </span>
        )}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        {isRetainer && <Pill tone="emerald">Retainer</Pill>}
        <Pill tone="default">{ownerName}</Pill>
        <Pill tone="muted">{DISCIPLINE_LABEL[task.discipline] ?? task.discipline}</Pill>
        <span className="text-[10px] text-subtle">· {clientName}</span>
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[10px] tabular-nums">
        <span className={behind ? "font-semibold text-rose-600" : "text-subtle"}>{reason}</span>
        <span className="text-subtle">
          internal {fmt(internalDue(task))} · client {fmt(clientDue(task))}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="text-[10px] text-subtle">{DELIVERABLE_STATUS_LABEL[status]}</span>
        {behind && (
          <span
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="inline-flex items-center gap-1"
          >
            <span className="text-[10px] text-subtle">Why?</span>
            <select
              value={task.slip_reason ?? ""}
              onChange={(e) => {
                setTaskSlipReason(task.id, (e.target.value || null) as SlipReason | null);
                onMutate?.();
              }}
              className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium focus:outline-none ${
                task.slip_reason
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                  : "border-border bg-surface text-subtle"
              }`}
            >
              <option value="">— pick —</option>
              {SLIP_REASONS.map((r) => (
                <option key={r} value={r}>
                  {SLIP_REASON_LABEL[r]}
                </option>
              ))}
            </select>
          </span>
        )}
      </div>
    </Link>
  );
}
