"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { DecorativeBlocks } from "@/components/decorative-blocks";
import {
  type PulseFeedItem,
  type PulseFeedResponse,
  type FeedItemType,
} from "@/lib/pulse/types";
import { getPortals } from "@/lib/portal/data";
import { getIssues } from "@/lib/issues/data";

// ── Workflows Config ────────────────────────────────────────────

const workflows = [
  {
    title: "Win the Client",
    steps: [
      { label: "Find prospects", href: "/tools/prospect-scraper" },
      { label: "Research their store", href: "/tools/store-intel" },
      { label: "Send outreach", href: "/tools/outreach" },
      { label: "Write proposal", href: "/tools/proposals" },
      { label: "Calculate price", href: "/tools/price-calculator" },
    ],
  },
  {
    title: "Deliver the Project",
    steps: [
      { label: "Kick off project", href: "/tools/project-kickoff" },
      { label: "Dev self-check", href: "/tools/dev-selfcheck" },
      { label: "QA checklist", href: "/tools/qa-checklist" },
      { label: "Client portal", href: "/tools/client-portal" },
    ],
  },
  {
    title: "Get Paid",
    steps: [
      { label: "Log dev hours", href: "/tools/dev-hours" },
      { label: "Generate invoice", href: "/tools/invoice-generator" },
      { label: "Track expenses", href: "/tools/expenses" },
    ],
  },
];

// ── Feed Type Config ────────────────────────────────────────────

const feedTypeConfig: Record<FeedItemType, { border: string; badge: string; label: string }> = {
  client: { border: "border-l-blue-500", badge: "bg-blue-50 text-blue-600", label: "Client" },
  internal: { border: "border-l-[#0A0A0A]", badge: "bg-gray-100 text-gray-600", label: "Internal" },
  status: { border: "border-l-emerald-500", badge: "bg-emerald-50 text-emerald-600", label: "Status" },
  chase: { border: "border-l-amber-500", badge: "bg-amber-50 text-amber-600", label: "Chase" },
  blocker: { border: "border-l-red-500", badge: "bg-red-50 text-red-600", label: "Blocker" },
  request: { border: "border-l-violet-500", badge: "bg-violet-50 text-violet-600", label: "Request" },
};

type FeedFilter = "important" | "all";
const IMPORTANT_TYPES: FeedItemType[] = ["blocker", "chase", "request", "client"];

// ── Page Component ──────────────────────────────────────────────

export default function PulseDashboard() {
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

  // Load stats
  useEffect(() => {
    async function loadStats() {
      try {
        const [portals, issues, clickupRes] = await Promise.all([
          getPortals(),
          getIssues(),
          fetch("/api/clickup/tasks").then((r) => r.ok ? r.json() : null).catch(() => null),
        ]);

        const openIssues = issues.filter((i) => i.status === "open" || i.status === "noted");
        const adHocRequests = portals.flatMap((p) => p.ad_hoc_requests || []).filter((r) => r.status === "open");
        const overdueCount = clickupRes?.summary?.overdue ?? 0;

        setStats({
          portals: portals.length,
          overdue: overdueCount,
          issues: openIssues.length,
          adHoc: adHocRequests.length,
        });

        // Build needs attention list
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

  // Date formatting
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-12 py-12 md:py-20">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">
              Mission Control
            </h1>
            <p className="text-sm text-[#6B6B6B]">
              {dateStr}
            </p>
          </div>
        </div>

        {/* ── Stats Strip ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <StatCard label="Active Projects" value={stats.portals} href="/tools/client-portal" />
          <StatCard label="Overdue Tasks" value={stats.overdue} warn={stats.overdue > 0} href="/tools/ops-radar" />
          <StatCard label="Open Issues" value={stats.issues} href="/tools/issues" />
          <StatCard label="Ad Hoc Requests" value={stats.adHoc} warn={stats.adHoc > 0} href="/tools/client-portal" />
        </div>

        {/* ── Needs Attention ── */}
        {needsAttention.length > 0 && (
          <div className="mb-8">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6B6B] mb-2">
              Needs Attention
            </h2>
            <div className="border border-[#E5E5E5] rounded-lg divide-y divide-[#F0F0F0]">
              {needsAttention.map((item, i) => (
                <Link
                  key={i}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[#FAFAFA] transition-colors"
                >
                  <span className={`size-2 rounded-full shrink-0 ${
                    item.type === "overdue" ? "bg-red-500" : item.type === "adhoc" ? "bg-amber-400" : "bg-blue-400"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.label}</p>
                    <p className="text-[11px] text-[#AAAAAA]">{item.detail}</p>
                  </div>
                  <ChevronRightIcon className="size-3.5 text-[#CCCCCC] shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Workflow Lanes — compact */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
          {workflows.map((wf) => (
            <div
              key={wf.title}
              className="bg-white border border-[#E5E5E5] rounded-lg p-4"
            >
              <h2 className="text-xs font-semibold text-[#0A0A0A] mb-2">
                {wf.title}
              </h2>
              <ol className="space-y-0.5">
                {wf.steps.map((step, i) => (
                  <li key={step.href}>
                    <Link
                      href={step.href}
                      className="flex items-center gap-2 px-1.5 py-1 -mx-1.5 rounded text-[13px] text-[#6B6B6B] hover:bg-[#F5F5F5] hover:text-[#0A0A0A] transition-colors group"
                    >
                      <span className="text-[10px] font-mono text-[#CCCCCC] w-3 shrink-0">
                        {i + 1}.
                      </span>
                      <span className="flex-1">{step.label}</span>
                      <ChevronRightIcon className="size-3 text-[#CCCCCC] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>

        {/* ── Pulse Feed ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6B6B]">
                Feed
              </h2>
              <div className="flex bg-[#F5F5F5] rounded-md p-0.5">
                <button
                  onClick={() => setFeedFilter("important")}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
                    feedFilter === "important" ? "bg-white text-[#0A0A0A] shadow-sm" : "text-[#6B6B6B]"
                  }`}
                >
                  Important
                </button>
                <button
                  onClick={() => setFeedFilter("all")}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
                    feedFilter === "all" ? "bg-white text-[#0A0A0A] shadow-sm" : "text-[#6B6B6B]"
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
                className="px-2 py-1 text-[11px] border border-[#E5E5E5] rounded-md bg-white text-[#6B6B6B]"
              >
                <option value={24}>24h</option>
                <option value={48}>48h</option>
                <option value={168}>7d</option>
              </select>
              <button
                onClick={() => loadFeed()}
                disabled={feedLoading}
                className="p-1.5 text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors disabled:opacity-40"
                title="Refresh feed"
              >
                <ArrowPathIcon className={`size-3.5 ${feedLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Feed Items */}
          <div className="space-y-2">
            {feedLoading && feedItems.length === 0 && (
              <>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="bg-white border border-[#E5E5E5] border-l-2 border-l-[#E5E5E5] rounded-lg p-4 animate-pulse">
                    <div className="h-3 bg-[#F0F0F0] rounded w-1/3 mb-2" />
                    <div className="h-4 bg-[#F0F0F0] rounded w-full mb-2" />
                    <div className="h-3 bg-[#F0F0F0] rounded w-1/4" />
                  </div>
                ))}
              </>
            )}

            {feedError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-4">
                <ExclamationTriangleIcon className="size-4 text-red-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-red-800 font-medium">Failed to load feed</p>
                  <p className="text-[11px] text-red-600 mt-0.5">{feedError}</p>
                  <button
                    onClick={() => loadFeed()}
                    className="text-[11px] font-medium text-red-600 hover:text-red-800 mt-1 underline"
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}

            {!feedLoading && !feedError && filteredFeed.length === 0 && (
              <div className="bg-white border border-dashed border-[#E5E5E5] rounded-lg p-8 text-center">
                <p className="text-xs text-[#AAAAAA] mb-1">
                  {feedFilter === "important" ? "No important activity" : "No activity"} in the last {feedHours}h
                </p>
                <p className="text-[10px] text-[#CCCCCC]">
                  {feedFilter === "important" ? "Showing blockers, chases, requests, and client messages" : "Messages from Slack channels will appear here"}
                </p>
              </div>
            )}

            {filteredFeed.map((item) => {
              const cfg = feedTypeConfig[item.channel_type];
              return (
                <div
                  key={item.id}
                  className={`bg-white border border-[#E5E5E5] border-l-2 ${cfg.border} rounded-lg p-4`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-[#6B6B6B]">
                        #{item.channel_name}
                      </span>
                      <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#AAAAAA] tabular-nums">
                      {relativeTime(item.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-[#3A3A3A] leading-relaxed mb-1.5">
                    {item.message}
                  </p>
                  <span className="text-[11px] text-[#AAAAAA]">
                    {item.author}
                  </span>
                </div>
              );
            })}

            {hasMore && !feedLoading && (
              <button
                onClick={() => {
                  handleHoursChange(Math.min(feedHours * 2, 168));
                }}
                className="w-full py-2 text-xs font-medium text-[#6B6B6B] hover:text-[#0A0A0A] bg-white border border-[#E5E5E5] rounded-lg hover:bg-[#F5F5F5] transition-colors"
              >
                Load more
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────

function StatCard({ label, value, warn, href }: { label: string; value: number; warn?: boolean; href: string }) {
  return (
    <Link href={href} className="bg-white border border-[#E5E5E5] rounded-lg p-4 hover:border-[#AAAAAA] transition-colors">
      <div className="flex items-baseline gap-1.5">
        <span className="text-xl font-semibold tabular-nums">{value}</span>
        {warn && <span className="size-1.5 rounded-full bg-red-500" />}
      </div>
      <p className="text-[11px] text-[#AAAAAA] mt-0.5">{label}</p>
    </Link>
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
