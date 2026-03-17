"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { OpsRadarData, OpsTask } from "@/lib/clickup/types";
import { TEAM_MEMBERS, type TeamRole } from "@/lib/clickup/constants";

/* ── Helpers ── */

function groupByClient(tasks: OpsTask[]): { client: string; tasks: OpsTask[] }[] {
  const map = new Map<string, OpsTask[]>();
  for (const t of tasks) {
    const list = map.get(t.client) ?? [];
    list.push(t);
    map.set(t.client, list);
  }
  return Array.from(map.entries())
    .map(([client, tasks]) => ({ client, tasks }))
    .sort((a, b) => {
      const aMax = Math.max(...a.tasks.map((t) => t.daysOverdue));
      const bMax = Math.max(...b.tasks.map((t) => t.daysOverdue));
      return bMax - aMax;
    });
}

function getWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setHours(0, 0, 0, 0);
  mon.setDate(mon.getDate() + diff);
  return mon;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function severityColor(days: number): string {
  if (days > 7) return "bg-red-500";
  if (days >= 3) return "bg-amber-400";
  return "bg-[#AAAAAA]";
}

function severityText(days: number): string {
  if (days > 7) return "text-red-600";
  if (days >= 3) return "text-amber-600";
  return "text-[#6B6B6B]";
}

function barColor(count: number): string {
  if (count > 12) return "bg-red-500";
  if (count > 8) return "bg-amber-400";
  return "bg-[#0A0A0A]";
}

/* ── Main page ── */

export default function OpsRadarPage() {
  const [data, setData] = useState<OpsRadarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/clickup/tasks");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const json: OpsRadarData = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 300_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const derived = useMemo(() => {
    if (!data) return null;

    const weekStart = getWeekStart();

    // Compact week — just counts per day
    const weekDays: { date: Date; count: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + i);
      const count = data.tasks.filter((t) => {
        const dd = t.designDeadline ? new Date(t.designDeadline) : null;
        const dv = t.devDeadline ? new Date(t.devDeadline) : null;
        return (dd && sameDay(dd, day)) || (dv && sameDay(dv, day));
      }).length;
      weekDays.push({ date: day, count });
    }

    const overdue = data.tasks
      .filter((t) => t.daysOverdue > 0)
      .sort((a, b) => b.daysOverdue - a.daysOverdue);

    const teamLoad = TEAM_MEMBERS.map((member) => {
      const count = data.summary.byAssignee[member.name] ?? 0;
      const memberOverdue = data.tasks.filter(
        (t) => t.assignees.includes(member.name) && t.daysOverdue > 0
      ).length;
      return { name: member.name, role: member.role, count, overdue: memberOverdue };
    });

    const designTeam = teamLoad.filter((m) => m.role === "design").sort((a, b) => b.count - a.count);
    const devTeam = teamLoad.filter((m) => m.role === "dev").sort((a, b) => b.count - a.count);
    const pmTeam = teamLoad.filter((m) => m.role === "pm").sort((a, b) => b.count - a.count);

    return { weekDays, overdueTasks: overdue, designTeam, devTeam, pmTeam };
  }, [data]);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 md:px-12 py-12">
        <h1 className="text-xl font-semibold mb-6">Ops Radar</h1>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border border-[#E5E5E5] rounded-lg p-6 animate-pulse">
              <div className="h-3 w-24 bg-[#F0F0F0] rounded mb-4" />
              <div className="space-y-2">
                <div className="h-3 w-full bg-[#F0F0F0] rounded" />
                <div className="h-3 w-3/4 bg-[#F0F0F0] rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-6 md:px-12 py-12">
        <h1 className="text-xl font-semibold mb-6">Ops Radar</h1>
        <div className="border border-[#E5E5E5] rounded-lg p-8 text-center">
          <p className="text-sm text-[#6B6B6B] mb-4">{error}</p>
          <button
            onClick={() => { setLoading(true); fetchData(); }}
            className="px-4 py-2 bg-[#0A0A0A] text-white text-sm rounded-md hover:bg-[#333]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data || !derived) return null;

  const { weekDays, overdueTasks, designTeam, devTeam, pmTeam } = derived;
  const overdueByClient = groupByClient(overdueTasks);
  const today = new Date();

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-12 py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Ops Radar</h1>
          <p className="text-xs text-[#AAAAAA] mt-0.5">
            Synced from ClickUp &middot; {new Date(data.fetchedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchData(); }}
          className="text-xs text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* ── Summary strip ── */}
      <div className="flex items-center gap-6 mb-6 text-sm">
        <Stat label="Active" value={data.summary.total} />
        <Stat label="Overdue" value={data.summary.overdue} warn={data.summary.overdue > 0} />
      </div>

      {/* ── Compact week strip ── */}
      <div className="mb-8">
        <SectionHeader title="This week" />
        <div className="flex gap-1">
          {weekDays.map(({ date, count }, i) => {
            const isToday = sameDay(date, today);
            const isPast = date < today && !isToday;
            return (
              <div
                key={i}
                className={`flex-1 text-center py-2 rounded-md ${
                  isToday ? "bg-[#0A0A0A] text-white" : isPast ? "bg-[#FAFAFA] opacity-50" : "bg-[#FAFAFA]"
                }`}
              >
                <div className={`text-[10px] uppercase tracking-wider ${isToday ? "text-white/70" : "text-[#AAAAAA]"}`}>
                  {DAY_NAMES[i]}
                </div>
                <div className={`text-sm font-semibold tabular-nums mt-0.5 ${isToday ? "text-white" : count > 0 ? "text-[#0A0A0A]" : "text-[#D4D4D4]"}`}>
                  {count}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Overdue ── */}
      {overdueTasks.length > 0 && (
        <div className="mb-8">
          <SectionHeader title="Overdue" count={overdueTasks.length} />
          <div className="border border-[#E5E5E5] rounded-lg divide-y divide-[#F0F0F0]">
            {overdueByClient.map(({ client, tasks }) => {
              const worst = Math.max(...tasks.map((t) => t.daysOverdue));
              const isExpanded = expandedClient === client;
              return (
                <div key={client}>
                  <button
                    onClick={() => setExpandedClient(isExpanded ? null : client)}
                    className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-[#FAFAFA] transition-colors text-left"
                  >
                    <span className={`size-2 rounded-full shrink-0 ${severityColor(worst)}`} />
                    <span className="text-sm font-medium flex-1 truncate">{client}</span>
                    <span className="text-[11px] text-[#AAAAAA] tabular-nums">{tasks.length} task{tasks.length !== 1 ? "s" : ""}</span>
                    <span className={`text-xs font-semibold tabular-nums ${severityText(worst)}`}>{worst}d</span>
                  </button>
                  {isExpanded && (
                    <div className="px-3 pb-2.5 pl-8 space-y-1">
                      {tasks.map((t) => (
                        <a
                          key={t.id}
                          href={t.clickupUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-[11px] text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors"
                        >
                          <span className={`size-1.5 rounded-full shrink-0 ${severityColor(t.daysOverdue)}`} />
                          <span className="flex-1 truncate">{t.name}</span>
                          <span className={`tabular-nums shrink-0 ${severityText(t.daysOverdue)}`}>{t.daysOverdue}d</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Team load — by role ── */}
      <div className="space-y-6">
        <TeamGroup title="Design" members={designTeam} />
        <TeamGroup title="Development" members={devTeam} />
        {pmTeam.length > 0 && <TeamGroup title="PM" members={pmTeam} />}
      </div>
    </div>
  );
}

/* ── Components ── */

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-lg font-semibold tabular-nums">{value}</span>
      <span className="text-xs text-[#AAAAAA]">{label}</span>
      {warn && <span className="w-1.5 h-1.5 rounded-full bg-red-500 ml-0.5" />}
    </div>
  );
}

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-[#E5E5E5]">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#0A0A0A]">{title}</h2>
      {count !== undefined && (
        <span className="text-[11px] text-[#AAAAAA] tabular-nums">{count}</span>
      )}
    </div>
  );
}

function TeamGroup({
  title,
  members,
}: {
  title: string;
  members: { name: string; role: TeamRole; count: number; overdue: number }[];
}) {
  return (
    <div>
      <SectionHeader title={title} />
      <div className="space-y-0.5">
        {members.map(({ name, count, overdue }) => (
          <div key={name} className="flex items-center gap-2 py-1">
            <span className="text-xs w-36 truncate">{name}</span>
            {count === 0 ? (
              <span className="flex-1 text-[11px] text-[#D4D4D4]">No tasks</span>
            ) : (
              <div className="flex-1 h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${barColor(count)}`}
                  style={{ width: `${Math.max((count / 20) * 100, 4)}%` }}
                />
              </div>
            )}
            <span className={`text-[11px] w-10 text-right tabular-nums ${count > 12 ? "text-red-600 font-semibold" : count > 8 ? "text-amber-600 font-medium" : "text-[#AAAAAA]"}`}>
              {count}
            </span>
            {overdue > 0 ? (
              <span className="text-[11px] font-medium w-14 text-right tabular-nums text-red-600">{overdue} late</span>
            ) : (
              <span className="w-14" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
