"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import {
  type PulseFeedItem,
  type PulseFeedResponse,
  type FeedItemType,
} from "@/lib/pulse/types";
import { getPortals } from "@/lib/portal/data";
import { getIssues } from "@/lib/issues/data";
import type { OpsRadarData, OpsTask } from "@/lib/clickup/types";

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

// ── Feed Config ─────────────────────────────────────────────────

const feedTypeConfig: Record<FeedItemType, { border: string; badge: string; label: string }> = {
  client: { border: "border-l-blue-500", badge: "bg-blue-50 text-blue-600", label: "Client" },
  internal: { border: "border-l-[#1B1B1B]", badge: "bg-gray-100 text-gray-600", label: "Internal" },
  status: { border: "border-l-emerald-500", badge: "bg-emerald-50 text-emerald-600", label: "Status" },
  chase: { border: "border-l-amber-500", badge: "bg-amber-50 text-amber-600", label: "Chase" },
  blocker: { border: "border-l-red-500", badge: "bg-red-50 text-red-600", label: "Blocker" },
  request: { border: "border-l-violet-500", badge: "bg-violet-50 text-violet-600", label: "Request" },
};

const ALL_FEED_TYPES: FeedItemType[] = ["client", "internal", "status", "chase", "blocker", "request"];

// ── Page Component ──────────────────────────────────────────────

export default function MissionControl() {
  // Feed state
  const [feedItems, setFeedItems] = useState<PulseFeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [feedHours, setFeedHours] = useState(48);
  const [hasMore, setHasMore] = useState(false);
  const [feedTotal, setFeedTotal] = useState(0);
  const [feedTypeFilter, setFeedTypeFilter] = useState<FeedItemType | "all">("blocker");

  // Stats state
  const [stats, setStats] = useState({ portals: 0, overdue: 0, issues: 0, adHoc: 0 });

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
        const allAdHoc = portals.flatMap((p) =>
          (p.ad_hoc_requests || [])
            .filter((r: { status: string }) => r.status === "open")
            .map((r: { title: string; status: string }) => ({ title: r.title, client: p.client_name || "Unknown", status: r.status }))
        );
        const overdueCount = clickupRes?.summary?.overdue ?? 0;

        setStats({
          portals: portals.length,
          overdue: overdueCount,
          issues: openIssues.length,
          adHoc: allAdHoc.length,
        });
      } catch {
        // Stats are best-effort
      }
    }
    loadStats();
  }, []);

  // Derived ops radar data — split into design and dev deadlines per day
  const weekData = useMemo(() => {
    if (!opsData) return null;

    const weekStart = getWeekStart();
    const today = new Date();

    const days: {
      date: Date;
      designTasks: { name: string; client: string; assignees: string[] }[];
      devTasks: { name: string; client: string; assignees: string[] }[];
    }[] = [];

    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + i);

      const designTasks: { name: string; client: string; assignees: string[] }[] = [];
      const devTasks: { name: string; client: string; assignees: string[] }[] = [];

      for (const t of opsData.tasks) {
        if (t.designDeadline && sameDay(new Date(t.designDeadline), day)) {
          designTasks.push({ name: t.name, client: t.client, assignees: t.assignees });
        }
        if (t.devDeadline && sameDay(new Date(t.devDeadline), day)) {
          devTasks.push({ name: t.name, client: t.client, assignees: t.assignees });
        }
      }

      days.push({ date: day, designTasks, devTasks });
    }

    return { days, today };
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
    if (feedTypeFilter === "all") return feedItems;
    return feedItems.filter((item) => item.channel_type === feedTypeFilter);
  }, [feedItems, feedTypeFilter]);

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="min-h-screen p-5 md:p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4 animate-fadeInUp">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mission Control</h1>
          <p className="text-sm text-[#7A7A7A]">{dateStr}</p>
        </div>
      </div>

      {/* ── Weekly Rhythm ── */}
      <div className="animate-fadeInUp-d1"><WeeklyRhythm /></div>

      {/* ── Blocker Feed ── */}
      <div className="border border-[#E5E5EA] rounded-lg overflow-hidden flex flex-col lg:max-h-[280px] animate-fadeInUp-d2">
        {/* Feed toolbar — inside container */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#EDEDEF] shrink-0">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {[{ key: "all" as const, label: "All" }, ...ALL_FEED_TYPES.map((t) => ({ key: t, label: feedTypeConfig[t].label }))].map(({ key, label }) => {
              const count = key === "all" ? feedTotal : feedItems.filter((i) => i.channel_type === key).length;
              if (key !== "all" && count === 0) return null;
              return (
                <button
                  key={key}
                  onClick={() => setFeedTypeFilter(key)}
                  className={`px-2.5 py-1 text-[11px] rounded-md transition-colors whitespace-nowrap ${
                    feedTypeFilter === key
                      ? "font-medium text-[#1B1B1B] bg-[#F3F3F5]"
                      : "text-[#A0A0A0] hover:text-[#7A7A7A]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <select
              value={feedHours}
              onChange={(e) => handleHoursChange(Number(e.target.value))}
              className="px-1.5 py-1 text-[11px] text-[#A0A0A0] bg-transparent border-0 outline-none cursor-pointer"
            >
              <option value={24}>24h</option>
              <option value={48}>48h</option>
              <option value={168}>7d</option>
            </select>
            <button
              onClick={() => loadFeed()}
              disabled={feedLoading}
              className="p-1 text-[#C5C5C5] hover:text-[#7A7A7A] transition-colors disabled:opacity-40"
              title="Refresh"
            >
              <ArrowPathIcon className={`size-3 ${feedLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Feed items */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {feedLoading && feedItems.length === 0 && (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-3 bg-[#EDEDEF] rounded w-1/4 mb-2" />
                  <div className="h-3 bg-[#EDEDEF] rounded w-3/4" />
                </div>
              ))}
            </div>
          )}

          {feedError && (
            <div className="flex items-start gap-2 p-4">
              <ExclamationTriangleIcon className="size-4 text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-red-800 font-medium">Failed to load feed</p>
                <button onClick={() => loadFeed()} className="text-[11px] text-red-600 hover:text-red-800 mt-1 underline">Try again</button>
              </div>
            </div>
          )}

          {!feedLoading && !feedError && filteredFeed.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-xs text-[#A0A0A0]">
                {feedTypeFilter !== "all" ? `No ${feedTypeConfig[feedTypeFilter].label.toLowerCase()} messages` : "No activity"} in the last {feedHours}h
              </p>
            </div>
          )}

          {filteredFeed.map((item, idx) => {
            const cfg = feedTypeConfig[item.channel_type];
            return (
              <div key={item.id} className={`px-4 py-3 hover:bg-[#FAFAFA] transition-colors ${idx > 0 ? "border-t border-[#F3F3F5]" : ""}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[12px] font-medium text-[#1B1B1B]">{item.author}</span>
                  <span className={`text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded ${cfg.badge}`}>{cfg.label}</span>
                  <span className="text-[10px] text-[#C5C5C5] ml-auto tabular-nums">{relativeTime(item.timestamp)}</span>
                </div>
                <p className="text-[13px] text-[#5A5A5A] leading-relaxed">{item.message}</p>
              </div>
            );
          })}
        </div>

        {hasMore && !feedLoading && (
          <button
            onClick={() => handleHoursChange(Math.min(feedHours * 2, 168))}
            className="w-full py-2 text-[11px] text-[#A0A0A0] hover:text-[#7A7A7A] border-t border-[#EDEDEF] hover:bg-[#FAFAFA] transition-colors"
          >
            Load more
          </button>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────

function StatCard({ label, value, warn, href }: { label: string; value: number; warn?: boolean; href: string }) {
  return (
    <Link href={href} className="border border-[#E5E5EA] rounded-lg px-3 py-2.5 hover:border-[#A0A0A0] transition-colors">
      <div className="flex items-baseline gap-1.5">
        <span className="text-lg font-semibold tabular-nums">{value}</span>
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

// ── Weekly Rhythm ──────────────────────────────────────────────

interface RhythmItem {
  label: string;
  time?: string;
  owner?: string;
  type: "call" | "delivery" | "touchpoint" | "internal" | "report";
}

const RHYTHM: Record<string, RhythmItem[]> = {
  Mon: [
    { label: "Ops Call (Leadership)", time: "10:00", type: "call" },
    { label: "Send retainer briefs & mission statements", type: "delivery" },
    { label: "Client touchpoints", type: "touchpoint" },
    { label: "Plan week deliverables", type: "internal" },
  ],
  Tue: [
    { label: "Design Call (All Designers)", time: "TBC", type: "call" },
    { label: "3pm Design Review", time: "15:00", owner: "Dylan + Design Lead", type: "call" },
    { label: "Internal execution day — no client chasing", type: "internal" },
    { label: "PM: ensure team on track", owner: "PM", type: "internal" },
    { label: "Prep Wednesday client touchpoints", type: "internal" },
  ],
  Wed: [
    { label: "Client touchpoints", type: "touchpoint" },
    { label: "3pm Design Review", time: "15:00", type: "call" },
    { label: "Mid-week progress check", type: "internal" },
  ],
  Thu: [
    { label: "Dev Call (All Developers)", time: "TBC", type: "call" },
    { label: "3pm Design Review", time: "15:00", type: "call" },
    { label: "Prep Friday client reports", type: "report" },
    { label: "Internal execution day", type: "internal" },
  ],
  Fri: [
    { label: "Client touchpoints", type: "touchpoint" },
    { label: "Send retainer weekly reports", type: "report" },
    { label: "Send project client weekly updates", type: "report" },
    { label: "3pm Design Review", time: "15:00", type: "call" },
    { label: "Week wrap — what shipped, what rolls over", type: "internal" },
    { label: "Bi-weekly full team call (every other Fri)", time: "TBC", type: "call" },
  ],
};

const rhythmTypeStyles: Record<string, { dot: string; text: string }> = {
  call: { dot: "bg-blue-500", text: "text-blue-600" },
  delivery: { dot: "bg-emerald-500", text: "text-emerald-600" },
  touchpoint: { dot: "bg-amber-500", text: "text-amber-600" },
  internal: { dot: "bg-[#999]", text: "text-[#777]" },
  report: { dot: "bg-violet-500", text: "text-violet-600" },
};

function WeeklyRhythm() {
  const todayIdx = new Date().getDay(); // 0=Sun, 1=Mon...
  const dayKeys = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  return (
    <div className="mb-4">
      <SectionHeader title="Weekly Rhythm" />
      <div className="grid grid-cols-5 gap-0 border border-[#E5E5EA] rounded-lg overflow-hidden">
        {dayKeys.map((day, i) => {
          const items = RHYTHM[day] || [];
          const isToday = todayIdx === i + 1; // Mon=1, Tue=2, etc
          const isPast = todayIdx > i + 1;

          return (
            <div
              key={day}
              className={`${i > 0 ? "border-l border-[#E5E5EA]" : ""} ${isToday ? "bg-[#FAFAFA]" : ""} ${isPast ? "opacity-50" : ""}`}
            >
              {/* Day header */}
              <div className={`px-3 py-2 text-center border-b border-[#EDEDEF] ${isToday ? "bg-[#1B1B1B]" : "bg-[#F7F8FA]"}`}>
                <span className={`text-[11px] font-bold uppercase tracking-wider ${isToday ? "text-white" : "text-[#777]"}`}>
                  {day}
                </span>
                {isToday && <span className="ml-1.5 text-[9px] text-white/50">Today</span>}
              </div>

              {/* Items */}
              <div className="p-2 space-y-1.5 min-h-[120px]">
                {items.map((item, j) => {
                  const style = rhythmTypeStyles[item.type] || rhythmTypeStyles.internal;
                  return (
                    <div key={j} className="flex items-start gap-1.5">
                      <span className={`size-1.5 rounded-full ${style.dot} mt-1.5 shrink-0`} />
                      <div className="min-w-0">
                        <p className={`text-[10px] leading-tight ${style.text}`}>{item.label}</p>
                        {item.time && <p className="text-[9px] text-[#CCC]">{item.time}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-2">
        {Object.entries(rhythmTypeStyles).map(([type, style]) => (
          <div key={type} className="flex items-center gap-1">
            <span className={`size-1.5 rounded-full ${style.dot}`} />
            <span className="text-[9px] text-[#AAA] capitalize">{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
