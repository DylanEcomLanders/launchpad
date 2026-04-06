"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ClipboardDocumentIcon,
  CheckIcon,
  ArrowTopRightOnSquareIcon,
  EyeIcon,
  PaperAirplaneIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { getEvents, type FunnelEvent } from "@/lib/sales-engine/funnel-events";

/* ── Lead Magnet Definitions ── */

interface TrackedLink {
  label: string;
  ref: string;
  description: string;
}

interface LeadMagnet {
  id: string;
  name: string;
  funnel: string; // matches FunnelEvent.funnel
  path: string; // public path
  status: "live" | "draft" | "paused";
  description: string;
}

const TEAM_MEMBERS = ["Dylan", "Ajay"] as const;
type TeamMember = (typeof TEAM_MEMBERS)[number];

const LINK_TEMPLATES: { label: string; refPrefix: string; description: string }[] = [
  { label: "X Bio", refPrefix: "x-{name}-bio", description: "Pin in your X bio link" },
  { label: "X Posts", refPrefix: "x-{name}-post", description: "Use in X post CTAs" },
  { label: "LinkedIn Bio", refPrefix: "li-{name}-bio", description: "LinkedIn about / featured" },
  { label: "LinkedIn Posts", refPrefix: "li-{name}-post", description: "Use in LinkedIn post CTAs" },
  { label: "TikTok Bio", refPrefix: "tiktok-{name}-bio", description: "TikTok profile link" },
  { label: "Email Sig", refPrefix: "email-{name}-sig", description: "Email signature link" },
];

const LEAD_MAGNETS: LeadMagnet[] = [
  {
    id: "audit",
    name: "Free Shopify Audit",
    funnel: "audit",
    path: "/audit",
    status: "live",
    description: "8-point product page audit — captures email, store URL, and name.",
  },
];

function generateLinks(magnet: LeadMagnet, member: TeamMember): TrackedLink[] {
  const name = member.toLowerCase();
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://ecomlanders.app";
  return LINK_TEMPLATES.map((t) => ({
    label: t.label,
    ref: `${baseUrl}${magnet.path}?ref=${t.refPrefix.replace("{name}", name)}`,
    description: t.description,
  }));
}

/* ── Stats helpers ── */

function computeStats(events: FunnelEvent[], funnel: string) {
  const funnelEvents = events.filter((e) => e.funnel === funnel);
  const views = funnelEvents.filter((e) => e.event_type === "view").length;
  const submissions = funnelEvents.filter((e) => e.event_type === "submission").length;
  const cvr = views > 0 ? ((submissions / views) * 100).toFixed(1) : "0.0";

  // Source breakdown
  const sourceMap: Record<string, { views: number; submissions: number }> = {};
  funnelEvents.forEach((e) => {
    const src = e.source || "direct";
    if (!sourceMap[src]) sourceMap[src] = { views: 0, submissions: 0 };
    sourceMap[src][e.event_type === "view" ? "views" : "submissions"]++;
  });

  // Last 7 days
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentViews = funnelEvents.filter(
    (e) => e.event_type === "view" && new Date(e.created_at).getTime() > weekAgo
  ).length;
  const recentSubmissions = funnelEvents.filter(
    (e) => e.event_type === "submission" && new Date(e.created_at).getTime() > weekAgo
  ).length;

  return { views, submissions, cvr, sourceMap, recentViews, recentSubmissions };
}

function parseSourceLabel(source: string): string {
  if (!source || source === "direct") return "Direct";
  if (source.startsWith("x-")) return "X";
  if (source.startsWith("li-")) return "LinkedIn";
  if (source.startsWith("tiktok-")) return "TikTok";
  if (source.startsWith("email-")) return "Email";
  return source;
}

function parseSourceDetail(source: string): string {
  if (!source || source === "direct") return "Direct traffic";
  const parts = source.split("-");
  if (parts.length >= 3) {
    const person = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
    const type = parts.slice(2).join(" ");
    return `${person} — ${type}`;
  }
  return source;
}

/* ── Component ── */

export default function LeadMagnetsPage() {
  const [events, setEvents] = useState<FunnelEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<TeamMember>("Dylan");
  const [expandedMagnet, setExpandedMagnet] = useState<string | null>("audit");

  useEffect(() => {
    getEvents().then((e) => {
      setEvents(e);
      setLoading(false);
    });
  }, []);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(key);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin size-6 border-2 border-[#E5E5EA] border-t-[#1A1A1A] rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#1B1B1B] tracking-tight">Lead Magnets</h1>
        <p className="text-sm text-[#999] mt-1">
          Manage your lead magnet pages, tracked links, and conversion stats.
        </p>
      </div>

      {/* Team member selector */}
      <div className="flex items-center gap-1 bg-[#F5F5F5] rounded-lg p-1 w-fit">
        {TEAM_MEMBERS.map((m) => (
          <button
            key={m}
            onClick={() => setSelectedMember(m)}
            className={`px-4 py-1.5 text-[13px] font-medium rounded-md transition-all ${
              selectedMember === m
                ? "bg-white text-[#1B1B1B] shadow-sm"
                : "text-[#999] hover:text-[#666]"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Lead Magnets */}
      <div className="space-y-4">
        {LEAD_MAGNETS.map((magnet) => {
          const stats = computeStats(events, magnet.funnel);
          const links = generateLinks(magnet, selectedMember);
          const isExpanded = expandedMagnet === magnet.id;

          return (
            <div
              key={magnet.id}
              className="bg-white border border-[#E5E5EA] rounded-xl overflow-hidden"
            >
              {/* Magnet header */}
              <button
                onClick={() => setExpandedMagnet(isExpanded ? null : magnet.id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#FAFAFA] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="size-9 bg-[#F0FFF0] rounded-lg flex items-center justify-center shrink-0">
                    <ChartBarIcon className="size-4.5 text-[#22C55E]" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-semibold text-[#1B1B1B]">{magnet.name}</span>
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          magnet.status === "live"
                            ? "bg-[#D1FF4C]/20 text-[#3D7A00]"
                            : magnet.status === "draft"
                            ? "bg-[#F5F5F5] text-[#999]"
                            : "bg-[#FFF3CD] text-[#856404]"
                        }`}
                      >
                        {magnet.status}
                      </span>
                    </div>
                    <p className="text-[12px] text-[#999] mt-0.5">{magnet.description}</p>
                  </div>
                </div>

                {/* Quick stats */}
                <div className="flex items-center gap-6 mr-2">
                  <div className="text-right">
                    <p className="text-[18px] font-bold text-[#1B1B1B]">{stats.views}</p>
                    <p className="text-[10px] text-[#999] uppercase tracking-wider">Views</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[18px] font-bold text-[#1B1B1B]">{stats.submissions}</p>
                    <p className="text-[10px] text-[#999] uppercase tracking-wider">Leads</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[18px] font-bold text-[#22C55E]">{stats.cvr}%</p>
                    <p className="text-[10px] text-[#999] uppercase tracking-wider">CVR</p>
                  </div>
                  <svg
                    className={`size-4 text-[#999] transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-[#F0F0F0] px-5 py-5 space-y-6">
                  {/* 7-day snapshot */}
                  <div className="flex items-center gap-6 text-sm">
                    <span className="text-[#999]">Last 7 days:</span>
                    <span className="flex items-center gap-1.5">
                      <EyeIcon className="size-3.5 text-[#999]" />
                      <span className="font-medium text-[#1B1B1B]">{stats.recentViews}</span>
                      <span className="text-[#999]">views</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <PaperAirplaneIcon className="size-3.5 text-[#999]" />
                      <span className="font-medium text-[#1B1B1B]">{stats.recentSubmissions}</span>
                      <span className="text-[#999]">leads</span>
                    </span>
                    <a
                      href={magnet.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto flex items-center gap-1 text-[12px] text-[#0A66C2] hover:underline"
                    >
                      View page <ArrowTopRightOnSquareIcon className="size-3" />
                    </a>
                  </div>

                  {/* Tracked links */}
                  <div>
                    <h3 className="text-[12px] font-semibold text-[#1B1B1B] uppercase tracking-wider mb-3">
                      Tracked Links — {selectedMember}
                    </h3>
                    <div className="space-y-2">
                      {links.map((link) => {
                        const key = `${magnet.id}-${selectedMember}-${link.label}`;
                        const isCopied = copiedLink === key;

                        // Count events for this specific ref
                        const ref = new URL(link.ref).searchParams.get("ref") || "";
                        const refViews = events.filter(
                          (e) => e.funnel === magnet.funnel && e.event_type === "view" && e.source === ref
                        ).length;
                        const refLeads = events.filter(
                          (e) => e.funnel === magnet.funnel && e.event_type === "submission" && e.source === ref
                        ).length;

                        return (
                          <div
                            key={key}
                            className="flex items-center gap-3 bg-[#FAFAFA] border border-[#EDEDEF] rounded-lg px-4 py-2.5 group"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] font-medium text-[#1B1B1B]">{link.label}</span>
                                <span className="text-[11px] text-[#BBB]">{link.description}</span>
                              </div>
                              <p className="text-[11px] text-[#999] font-mono truncate mt-0.5">{link.ref}</p>
                            </div>

                            {/* Per-link stats */}
                            <div className="flex items-center gap-4 text-[11px] shrink-0">
                              <span className="text-[#999]">
                                <span className="font-medium text-[#1B1B1B]">{refViews}</span> views
                              </span>
                              <span className="text-[#999]">
                                <span className="font-medium text-[#1B1B1B]">{refLeads}</span> leads
                              </span>
                            </div>

                            <button
                              onClick={() => copyToClipboard(link.ref, key)}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all shrink-0 ${
                                isCopied
                                  ? "bg-[#D1FF4C]/30 text-[#3D7A00]"
                                  : "bg-white border border-[#E5E5EA] text-[#666] hover:border-[#1B1B1B] hover:text-[#1B1B1B]"
                              }`}
                            >
                              {isCopied ? (
                                <>
                                  <CheckIcon className="size-3" /> Copied
                                </>
                              ) : (
                                <>
                                  <ClipboardDocumentIcon className="size-3" /> Copy
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Source breakdown */}
                  {Object.keys(stats.sourceMap).length > 0 && (
                    <div>
                      <h3 className="text-[12px] font-semibold text-[#1B1B1B] uppercase tracking-wider mb-3">
                        Traffic Sources
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {Object.entries(stats.sourceMap)
                          .sort((a, b) => b[1].views - a[1].views)
                          .slice(0, 10)
                          .map(([source, data]) => {
                            const label = parseSourceLabel(source);
                            const detail = parseSourceDetail(source);
                            const srcCvr =
                              data.views > 0
                                ? ((data.submissions / data.views) * 100).toFixed(1)
                                : "0.0";
                            return (
                              <div
                                key={source}
                                className="flex items-center justify-between bg-[#FAFAFA] border border-[#EDEDEF] rounded-lg px-3 py-2"
                              >
                                <div className="min-w-0">
                                  <p className="text-[12px] font-medium text-[#1B1B1B]">{detail}</p>
                                  <p className="text-[10px] text-[#999]">{label}</p>
                                </div>
                                <div className="flex items-center gap-4 text-[11px] shrink-0">
                                  <span className="text-[#999]">
                                    <span className="font-medium text-[#1B1B1B]">{data.views}</span> views
                                  </span>
                                  <span className="text-[#999]">
                                    <span className="font-medium text-[#1B1B1B]">{data.submissions}</span> leads
                                  </span>
                                  <span className="font-medium text-[#22C55E]">{srcCvr}%</span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty state for adding more */}
      <div className="border-2 border-dashed border-[#E5E5EA] rounded-xl p-8 text-center">
        <div className="size-10 bg-[#F5F5F5] rounded-xl flex items-center justify-center mx-auto mb-3">
          <svg className="size-5 text-[#999]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </div>
        <p className="text-[13px] font-medium text-[#1B1B1B]">Add another lead magnet</p>
        <p className="text-[12px] text-[#999] mt-1">
          Checklists, calculators, templates — each gets its own tracked links and analytics.
        </p>
      </div>
    </div>
  );
}
