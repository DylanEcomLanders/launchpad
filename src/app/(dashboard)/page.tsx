"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import {
  CalculatorIcon,
  ReceiptPercentIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  WalletIcon,
  RocketLaunchIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { DecorativeBlocks } from "@/components/decorative-blocks";
import {
  type PulseFeedItem,
  type PulseFeedResponse,
  type FeedItemType,
} from "@/lib/pulse/types";

// ── Quick Actions Config ────────────────────────────────────────

const quickActions = [
  { label: "Project Setup", href: "/tools/project-kickoff", icon: RocketLaunchIcon },
  { label: "Price Calc", href: "/tools/price-calculator", icon: CalculatorIcon },
  { label: "QA Checklist", href: "/tools/qa-checklist", icon: ClipboardDocumentCheckIcon },
  { label: "Invoices", href: "/tools/invoice-generator", icon: ReceiptPercentIcon },
  { label: "Dev Hours", href: "/tools/dev-hours", icon: ClockIcon },
  { label: "Expenses", href: "/tools/expenses", icon: WalletIcon },
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

// ── Page Component ──────────────────────────────────────────────

export default function PulseDashboard() {
  // Feed state
  const [feedItems, setFeedItems] = useState<PulseFeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [feedHours, setFeedHours] = useState(48);
  const [hasMore, setHasMore] = useState(false);
  const [feedTotal, setFeedTotal] = useState(0);

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
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">
              Pulse
            </h1>
            <p className="text-sm text-[#6B6B6B]">
              Mission control for the Ecomlanders team
            </p>
          </div>
          <span className="text-xs text-[#AAAAAA] mt-2 hidden md:block">
            {dateStr}
          </span>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 mb-10">
          {quickActions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E5E5E5] rounded-md text-xs font-medium text-[#6B6B6B] hover:border-[#0A0A0A] hover:text-[#0A0A0A] transition-colors"
            >
              <a.icon className="size-3.5" />
              {a.label}
            </Link>
          ))}
        </div>

        {/* ── Pulse Feed ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">
                Pulse Feed
              </h2>
              {feedTotal > 0 && (
                <span className="text-[10px] font-bold bg-[#F0F0F0] text-[#6B6B6B] px-1.5 py-0.5 rounded">
                  {feedTotal}
                </span>
              )}
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

            {!feedLoading && !feedError && feedItems.length === 0 && (
              <div className="bg-white border border-dashed border-[#E5E5E5] rounded-lg p-8 text-center">
                <p className="text-xs text-[#AAAAAA] mb-1">No activity in the last {feedHours}h</p>
                <p className="text-[10px] text-[#CCCCCC]">
                  Messages from channels containing &quot;external&quot; or &quot;internal&quot; will appear here
                </p>
              </div>
            )}

            {feedItems.map((item) => {
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
