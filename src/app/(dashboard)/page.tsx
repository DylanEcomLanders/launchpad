"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import {
  type PulseFeedItem,
  type PulseFeedResponse,
  type FeedItemType,
} from "@/lib/pulse/types";
import { getPortals } from "@/lib/portal/data";
import { getIssues } from "@/lib/issues/data";
import type { OpsRadarData, OpsTask } from "@/lib/clickup/types";
import { TEAM_MEMBERS } from "@/lib/clickup/constants";

// ── Helpers ─────────────────────────────────────────────────────

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
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

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function severityColor(days: number): string {
  if (days > 7) return "bg-red-500";
  if (days >= 3) return "bg-amber-400";
  return "bg-[#A0A0A0]";
}

function barColor(count: number): string {
  if (count > 12) return "bg-red-500";
  if (count > 8) return "bg-amber-400";
  return "bg-[#1B1B1B]";
}

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

// ── Feed Config ─────────────────────────────────────────────────

const feedTypeConfig: Record<FeedItemType, { border: string; badge: string; label: string }> = {
  client: { border: "border-l-blue-500", badge: "bg-blue-50 text-blue-600", label: "Client" },
  internal: { border: "border-l-[#1B1B1B]", badge: "bg-gray-100 text-gray-600", label: "Internal" },
  status: { border: "border-l-emerald-500", badge: "bg-emerald-50 text-emerald-600", label: "Status" },
  chase: { border: "border-l-amber-500", badge: "bg-amber-50 text-amber-600", label: "Chase" },
  blocker: { border: "border-l-red-500", badge: "bg-red-50 text-red-600", label: "Blocker" },
  request: { border: "border-l-violet-500", badge: "bg-violet-50 text-violet-600", label: "Request" },
};

type FeedFilter = "important" | "all";
const IMPORTANT_TYPES: FeedItemType[] = ["blocker", "chase", "request", "client"];

// ── Page Component ──────────────────────────────────────────────

export default function MissionControl() {
  // Feed state
  const [feedItems, setFeedItems] = useState<PulseFeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [feedHours, setFeedHours] = useState(48);
  const [hasMore, setHasMore] = useState(false);
  const [feedTotal, setFeedTotal] = useState(0);
  const [feedFilter, setFeedFilter] = useState<FeedFilter>("important");

  // Stats state
  const [stats, setStats] = useState({ portals: 0, overdue: 0, issues: 0, adHoc: 0 });
  const [needsAttention, setNeedsAttention] = useState<{ type: string; label: string; detail: string; href: string }[]>([]);

  // Ops radar state
  const [opsData, setOpsData] = useState<OpsRadarData | null>(null);

  // Load stats + ops radar
  useEffect(() => {
    async function loadStats() {
      try {
        const [portals, issues, clickupRes] = await Promise.all([
          getPortals(),
          getIssues(),
          fetch("/api/clickup/tasks").then((r) => r.ok ? r.json() : null).catch(() => null),
        ]);

        if (clickupRes) setOpsData(clickupRes);

        const openIssues = issues.filter((i) => i.status === "open" || i.status === "noted");
        const adHocRequests = portals.flatMap((p) => p.ad_hoc_requests || []).filter((r) => r.status === "open");
        const overdueCount = clickupRes?.summary?.overdue ?? 0;

        setStats({
          portals: portals.length,
          overdue: overdueCount,
          issues: openIssues.length,
          adHoc: adHocRequests.length,
        });

        const attention: { type: string; label: string; detail: string; href: string }[] = [];
        if (overdueCount > 0) {
          attention.push({ type: "overdue", label: `${overdueCount} overdue task${overdueCount !== 1 ? "s" : ""}`, detail: "ClickUp tasks past deadline", href: "/tools/ops-radar" });
        }
        adHocRequests.slice(0, 3).forEach((r) => {
          attention.push({ type: "adhoc", label: r.title, detail: "Ad hoc request", href: "/tools/client-portal" });
        });
        openIssues.slice(0, 3).forEach((i) => {
          attention.push({ type: "issue", label: i.title, detail: i.type === "bug" ? "Bug report" : i.type === "change-request" ? "Change request" : "Idea", href: "/tools/issues" });
        });
        setNeedsAttention(attention);
      } catch {
        // Stats are best-effort
      }
    }
    loadStats();
  }, []);

  // Derived ops radar data
  const opsDerived = useMemo(() => {
    if (!opsData) return null;

    const weekStart = getWeekStart();
    const today = new Date();

    const weekDays: { date: Date; count: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + i);
      const count = opsData.tasks.filter((t) => {
        const dd = t.designDeadline ? new Date(t.designDeadline) : null;
        const dv = t.devDeadline ? new Date(t.devDeadline) : null;
        return (dd && sameDay(dd, day)) || (dv && sameDay(dv, day));
      }).length;
      weekDays.push({ date: day, count });
    }

    const overdue = opsData.tasks
      .filter((t) => t.daysOverdue > 0)
      .sort((a, b) => b.daysOverdue - a.daysOverdue);

    const teamLoad = TEAM_MEMBERS.map((member) => {
      const count = opsData.summary.byAssignee[member.name] ?? 0;
      const memberOverdue = opsData.tasks.filter(
        (t) => t.assignees.includes(member.name) && t.daysOverdue > 0
      ).length;
      return { name: member.name, role: member.role, count, overdue: memberOverdue };
    });

    const designTeam = teamLoad.filter((m) => m.role === "design").sort((a, b) => b.count - a.count);
    const devTeam = teamLoad.filter((m) => m.role === "dev").sort((a, b) => b.count - a.count);

    return { weekDays, overdueTasks: overdue, designTeam, devTeam, today };
  }, [opsData]);

  // Load feed
  const loadFeed = useCallback(async (hours?: number) => {
    setFeedLoading(true);
    setFeedError(null);
    try {
      const h = hours ?? feedHours;
      const res = await fetch(`/api/pulse-feed?hours=${h}&limit=50`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to load feed");
      }
      const data: PulseFeedResponse = await res.json();
      setFeedItems(data.items);
      setHasMore(data.has_more);
      setFeedTotal(data.total);
    } catch (err) {
      setFeedError(err instanceof Error ? err.message : "Failed to load feed");
    } finally {
      setFeedLoading(false);
    }
  }, [feedHours]);

  useEffect(() => {
    loadFeed();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleHoursChange = (h: number) => {
    setFeedHours(h);
    loadFeed(h);
  };

  const filteredFeed = useMemo(() => {
    if (feedFilter === "all") return feedItems;
    return feedItems.filter((item) => IMPORTANT_TYPES.includes(item.channel_type));
  }, [feedItems, feedFilter]);

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="min-h-screen p-6 md:p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mission Control</h1>
          <p className="text-sm text-[#7A7A7A]">{dateStr}</p>
        </div>
      </div>

      {/* ── Stats Strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Active Projects" value={stats.portals} href="/tools/client-portal" />
        <StatCard label="Overdue Tasks" value={stats.overdue} warn={stats.overdue > 0} href="/tools/ops-radar" />
        <StatCard label="Open Issues" value={stats.issues} href="/tools/issues" />
        <StatCard label="Ad Hoc Requests" value={stats.adHoc} warn={stats.adHoc > 0} href="/tools/client-portal" />
      </div>

      {/* ── Main Grid: 2 columns on desktop ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left column (2/3) ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Needs Attention */}
          {needsAttention.length > 0 && (
            <div>
              <SectionHeader title="Needs Attention" />
              <div className="border border-[#E5E5EA] rounded-lg divide-y divide-[#EDEDEF] shadow-[var(--shadow-soft)]">
                {needsAttention.map((item, i) => (
                  <Link
                    key={i}
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-[#F7F8FA] transition-colors"
                  >
                    <span className={`size-2 rounded-full shrink-0 ${
                      item.type === "overdue" ? "bg-red-500" : item.type === "adhoc" ? "bg-amber-400" : "bg-blue-400"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.label}</p>
                      <p className="text-[11px] text-[#A0A0A0]">{item.detail}</p>
                    </div>
                    <ChevronRightIcon className="size-3.5 text-[#C5C5C5] shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Pulse Feed — contained with scroll */}
          <div className="flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <SectionHeader title="Feed" />
                <div className="flex bg-[#F3F3F5] rounded-md p-0.5 -mt-1">
                  <button
                    onClick={() => setFeedFilter("important")}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
                      feedFilter === "important" ? "bg-white text-[#1B1B1B] shadow-sm" : "text-[#7A7A7A]"
                    }`}
                  >
                    Important
                  </button>
                  <button
                    onClick={() => setFeedFilter("all")}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
                      feedFilter === "all" ? "bg-white text-[#1B1B1B] shadow-sm" : "text-[#7A7A7A]"
                    }`}
                  >
                    All {feedTotal > 0 && `(${feedTotal})`}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={feedHours}
                  onChange={(e) => handleHoursChange(Number(e.target.value))}
                  className="px-2 py-1 text-[11px] border border-[#E5E5EA] rounded-md bg-white text-[#7A7A7A]"
                >
                  <option value={24}>24h</option>
                  <option value={48}>48h</option>
                  <option value={168}>7d</option>
                </select>
                <button
                  onClick={() => loadFeed()}
                  disabled={feedLoading}
                  className="p-1.5 text-[#7A7A7A] hover:text-[#1B1B1B] transition-colors disabled:opacity-40"
                  title="Refresh feed"
                >
                  <ArrowPathIcon className={`size-3.5 ${feedLoading ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            <div className="border border-[#E5E5EA] rounded-lg shadow-[var(--shadow-soft)] overflow-hidden">
              <div className="max-h-[500px] overflow-y-auto scrollbar-thin divide-y divide-[#EDEDEF]">
                {feedLoading && feedItems.length === 0 && (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-3 bg-[#EDEDEF] rounded w-1/3 mb-2" />
                        <div className="h-4 bg-[#EDEDEF] rounded w-full mb-2" />
                        <div className="h-3 bg-[#EDEDEF] rounded w-1/4" />
                      </div>
                    ))}
                  </div>
                )}

                {feedError && (
                  <div className="flex items-start gap-2 bg-red-50 p-4">
                    <ExclamationTriangleIcon className="size-4 text-red-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-red-800 font-medium">Failed to load feed</p>
                      <p className="text-[11px] text-red-600 mt-0.5">{feedError}</p>
                      <button onClick={() => loadFeed()} className="text-[11px] font-medium text-red-600 hover:text-red-800 mt-1 underline">Try again</button>
                    </div>
                  </div>
                )}

                {!feedLoading && !feedError && filteredFeed.length === 0 && (
                  <div className="p-8 text-center">
                    <p className="text-xs text-[#A0A0A0] mb-1">
                      {feedFilter === "important" ? "No important activity" : "No activity"} in the last {feedHours}h
                    </p>
                  </div>
                )}

                {filteredFeed.map((item) => {
                  const cfg = feedTypeConfig[item.channel_type];
                  return (
                    <div key={item.id} className={`border-l-2 ${cfg.border} px-4 py-3 hover:bg-[#F7F8FA] transition-colors`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-[#7A7A7A]">#{item.channel_name}</span>
                          <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${cfg.badge}`}>{cfg.label}</span>
                        </div>
                        <span className="text-[11px] text-[#A0A0A0] tabular-nums">{relativeTime(item.timestamp)}</span>
                      </div>
                      <p className="text-sm text-[#3A3A3A] leading-relaxed mb-1">{item.message}</p>
                      <span className="text-[11px] text-[#A0A0A0]">{item.author}</span>
                    </div>
                  );
                })}
              </div>

              {hasMore && !feedLoading && (
                <button
                  onClick={() => handleHoursChange(Math.min(feedHours * 2, 168))}
                  className="w-full py-2 text-xs font-medium text-[#7A7A7A] hover:text-[#1B1B1B] border-t border-[#EDEDEF] hover:bg-[#F3F3F5] transition-colors"
                >
                  Load more
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Right column (1/3) ── */}
        <div className="space-y-6">

          {/* This Week — Deadlines */}
          {opsDerived && (
            <div>
              <SectionHeader title="Deadlines This Week" />
              <div className="border border-[#E5E5EA] rounded-lg p-4 shadow-[var(--shadow-soft)]">
                <div className="grid grid-cols-7 gap-1">
                  {opsDerived.weekDays.map(({ date, count }, i) => {
                    const isToday = sameDay(date, opsDerived.today);
                    const isPast = date < opsDerived.today && !isToday;
                    const dayNum = date.getDate();
                    return (
                      <div
                        key={i}
                        className={`text-center py-2.5 rounded-md ${
                          isToday ? "bg-[#1B1B1B] text-white" : isPast ? "opacity-40" : ""
                        }`}
                      >
                        <div className={`text-[10px] uppercase tracking-wider ${isToday ? "text-white/70" : "text-[#A0A0A0]"}`}>
                          {DAY_NAMES[i]}
                        </div>
                        <div className={`text-[10px] tabular-nums ${isToday ? "text-white/50" : "text-[#C5C5C5]"}`}>
                          {dayNum}
                        </div>
                        <div className={`text-sm font-semibold tabular-nums mt-1 ${isToday ? "text-white" : count > 0 ? "text-[#1B1B1B]" : "text-[#D4D4D4]"}`}>
                          {count > 0 ? count : "—"}
                        </div>
                        {count > 0 && (
                          <div className={`text-[9px] mt-0.5 ${isToday ? "text-white/60" : "text-[#A0A0A0]"}`}>
                            {count === 1 ? "task" : "tasks"}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-[#C5C5C5] text-center mt-3">Design & dev deadlines from ClickUp</p>
              </div>
            </div>
          )}

          {/* Team Load */}
          {opsDerived && (
            <div>
              <SectionHeader title="Team Load" />
              <div className="border border-[#E5E5EA] rounded-lg shadow-[var(--shadow-soft)] divide-y divide-[#EDEDEF]">
                {/* Design */}
                <div className="p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A0A0A0] mb-2">Design</p>
                  <div className="space-y-1.5">
                    {opsDerived.designTeam.map(({ name, count, overdue }) => (
                      <TeamMemberRow key={name} name={name} count={count} overdue={overdue} />
                    ))}
                  </div>
                </div>
                {/* Dev */}
                <div className="p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A0A0A0] mb-2">Development</p>
                  <div className="space-y-1.5">
                    {opsDerived.devTeam.map(({ name, count, overdue }) => (
                      <TeamMemberRow key={name} name={name} count={count} overdue={overdue} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Links */}
          <div>
            <SectionHeader title="Workflows" />
            <div className="space-y-2">
              {[
                { title: "Win the Client", steps: ["Find prospects", "Research store", "Send outreach", "Write proposal"], href: "/tools/prospect-scraper" },
                { title: "Deliver the Project", steps: ["Kick off", "Dev check", "QA checklist", "Client portal"], href: "/tools/project-kickoff" },
                { title: "Get Paid", steps: ["Log hours", "Generate invoice", "Track expenses"], href: "/tools/dev-hours" },
              ].map((wf) => (
                <Link
                  key={wf.title}
                  href={wf.href}
                  className="block border border-[#E5E5EA] rounded-lg p-3 hover:border-[#A0A0A0] transition-colors shadow-[var(--shadow-soft)]"
                >
                  <p className="text-xs font-semibold mb-1">{wf.title}</p>
                  <p className="text-[11px] text-[#A0A0A0]">{wf.steps.join(" → ")}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────

function StatCard({ label, value, warn, href }: { label: string; value: number; warn?: boolean; href: string }) {
  return (
    <Link href={href} className="border border-[#E5E5EA] rounded-lg p-4 hover:border-[#A0A0A0] transition-colors shadow-[var(--shadow-soft)]">
      <div className="flex items-baseline gap-1.5">
        <span className="text-xl font-semibold tabular-nums">{value}</span>
        {warn && <span className="size-1.5 rounded-full bg-red-500" />}
      </div>
      <p className="text-[11px] text-[#A0A0A0] mt-0.5">{label}</p>
    </Link>
  );
}

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#7A7A7A]">{title}</h2>
      {count !== undefined && (
        <span className="text-[11px] text-[#A0A0A0] tabular-nums">{count}</span>
      )}
    </div>
  );
}

function TeamMemberRow({ name, count, overdue }: { name: string; count: number; overdue: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[12px] w-28 truncate">{name}</span>
      {count === 0 ? (
        <span className="flex-1 text-[11px] text-[#D4D4D4]">No tasks</span>
      ) : (
        <div className="flex-1 h-1.5 bg-[#EDEDEF] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor(count)}`}
            style={{ width: `${Math.max((count / 20) * 100, 4)}%` }}
          />
        </div>
      )}
      <span className={`text-[11px] w-6 text-right tabular-nums ${count > 12 ? "text-red-600 font-semibold" : count > 8 ? "text-amber-600" : "text-[#A0A0A0]"}`}>
        {count}
      </span>
      {overdue > 0 && (
        <span className="text-[10px] font-medium text-red-600 tabular-nums">{overdue} late</span>
      )}
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
