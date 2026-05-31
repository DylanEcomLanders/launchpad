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
import type { Task, Project, Client, PodMember } from "@/lib/pods-v2/types";
import { Pill } from "@/components/pod-os/ui";

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
}

export function WeeklyBoard({
  tasks,
  projects,
  clients,
  members,
  today,
}: {
  tasks: Task[];
  projects: Project[];
  clients: Client[];
  members: PodMember[];
  today: string;
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
    };
  }

  const rows = tasks.map(toRow).filter((r): r is Row => r !== null);
  const sortRows = (a: Row, b: Row) =>
    Number(b.behind) - Number(a.behind) || a.task.due_date.localeCompare(b.task.due_date);
  const tuesday = rows.filter((r) => ITERATION_TYPES.has(r.task.type)).sort(sortRows);
  const thursday = rows.filter((r) => r.task.type === "core_deliverable").sort(sortRows);

  const behindCount = rows.filter((r) => r.behind).length;
  const shippedThisWeek = tasks.filter(
    (t) => t.status === "done" && t.due_date >= monday && t.due_date <= sunday,
  ).length;

  return (
    <section className="rounded-xl border border-[#E5E5EA] bg-white p-4 shadow-[var(--shadow-card)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-[#1B1B1B]">This week</h2>
          <p className="text-[11px] text-[#7A7A7A]">w/c {fmt(monday)} · internal dates are a day before the client sees them</p>
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
        <Column title="Tuesday" subtitle="Iterations & revisions" rows={tuesday} />
        <Column title="Thursday" subtitle="Net-new deliverables" rows={thursday} />
      </div>
    </section>
  );
}

function Column({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle: string;
  rows: Row[];
}) {
  return (
    <div className="rounded-lg border border-[#E5E5EA] bg-[#F7F8FA] p-2.5">
      <div className="mb-2 flex items-baseline justify-between">
        <div>
          <span className="text-[12px] font-semibold text-[#1B1B1B]">{title}</span>
          <span className="ml-1.5 text-[10px] text-[#A0A0A0]">{subtitle}</span>
        </div>
        <span className="text-[10px] tabular-nums text-[#A0A0A0]">{rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-[#E5E5EA] px-2 py-4 text-center text-[10px] text-[#C5C5C5]">
          Nothing this slot
        </div>
      ) : (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <WeekCard key={r.task.id} row={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function WeekCard({ row }: { row: Row }) {
  const { task, clientName, clientId, ownerName, behind, daysBehind, reason } = row;
  const status = deliverableStatus(task, null);
  return (
    <Link
      href={`/engagements/${clientId}`}
      className={`block rounded-lg border bg-white p-2.5 shadow-[var(--shadow-soft)] transition-colors hover:border-[#C5C5C5] ${
        behind ? "border-l-2 border-l-rose-500 border-rose-200" : "border-[#F0F0F2]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-[#1B1B1B]">{task.title}</span>
        {behind && (
          <span className="shrink-0 rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
            {daysBehind}d behind
          </span>
        )}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        <Pill tone="default">{ownerName}</Pill>
        <Pill tone="muted">{DISCIPLINE_LABEL[task.discipline] ?? task.discipline}</Pill>
        <span className="text-[10px] text-[#7A7A7A]">· {clientName}</span>
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[10px] tabular-nums">
        <span className={behind ? "font-semibold text-rose-600" : "text-[#7A7A7A]"}>{reason}</span>
        <span className="text-[#A0A0A0]">
          internal {fmt(internalDue(task))} · client {fmt(clientDue(task))}
        </span>
      </div>
      <div className="mt-1 text-[10px] text-[#A0A0A0]">{DELIVERABLE_STATUS_LABEL[status]}</div>
    </Link>
  );
}
