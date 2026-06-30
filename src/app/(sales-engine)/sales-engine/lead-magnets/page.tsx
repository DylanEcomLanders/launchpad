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
  trackingRef: string;
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

const LINK_TEMPLATES: { label: string; path: string; ref: string; description: string }[] = [
  { label: "X Bio", path: "/{name}", ref: "x-{name}-bio", description: "Pin in your X bio link" },
  { label: "X Posts", path: "/{name}/x", ref: "x-{name}-post", description: "Use in X post CTAs" },
  { label: "LinkedIn", path: "/{name}/linkedin", ref: "li-{name}-post", description: "LinkedIn bio / posts" },
  { label: "TikTok", path: "/{name}/tiktok", ref: "tiktok-{name}-bio", description: "TikTok profile link" },
  { label: "Email Sig", path: "/{name}/email", ref: "email-{name}-sig", description: "Email signature link" },
];

const LEAD_MAGNETS: LeadMagnet[] = [
  {
    id: "audit",
    name: "Free Shopify Audit",
    funnel: "audit",
    path: "/audit",
    status: "live",
    description: "8-point product page audit - captures email, store URL, and name.",
  },
];

function generateLinks(magnet: LeadMagnet, member: TeamMember): TrackedLink[] {
  const name = member.toLowerCase();
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://ecomlanders.app";
  return LINK_TEMPLATES.map((t) => ({
    label: t.label,
    ref: `${baseUrl}${magnet.path}${t.path.replace("{name}", name)}`,
    trackingRef: t.ref.replace("{name}", name),
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
        <div className="animate-spin size-6 border-2 border-foreground border-t-[#1A1A1A] rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Lead Magnets</h1>
        <p className="text-sm text-subtle mt-1">
          Manage your lead magnet pages, tracked links, and conversion stats.
        </p>
      </div>

      {/* Team member selector */}
      <div className="flex items-center gap-1 bg-surface-raised rounded-lg p-1 w-fit">
        {TEAM_MEMBERS.map((m) => (
          <button
            key={m}
            onClick={() => setSelectedMember(m)}
            className={`px-4 py-1.5 text-[13px] font-medium rounded-md transition-all ${
              selectedMember === m
                ? "bg-white text-foreground shadow-sm"
                : "text-subtle hover:text-subtle"
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
              className="bg-white border border-foreground rounded-xl overflow-hidden"
            >
              {/* Magnet header */}
              <button
                onClick={() => setExpandedMagnet(isExpanded ? null : magnet.id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-raised transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="size-9 bg-[#F0FFF0] rounded-lg flex items-center justify-center shrink-0">
                    <ChartBarIcon className="size-4.5 text-success" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-semibold text-foreground">{magnet.name}</span>
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          magnet.status === "live"
                            ? "bg-[#D1FF4C]/20 text-[#3D7A00]"
                            : magnet.status === "draft"
                            ? "bg-surface-raised text-subtle"
                            : "bg-[#FFF3CD] text-[#856404]"
                        }`}
                      >
                        {magnet.status}
                      </span>
                    </div>
                    <p className="text-[12px] text-subtle mt-0.5">{magnet.description}</p>
                  </div>
                </div>

                {/* Quick stats */}
                <div className="flex items-center gap-6 mr-2">
                  <div className="text-right">
                    <p className="text-[18px] font-bold text-foreground">{stats.views}</p>
                    <p className="text-[10px] text-subtle uppercase tracking-wider">Views</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[18px] font-bold text-foreground">{stats.submissions}</p>
                    <p className="text-[10px] text-subtle uppercase tracking-wider">Leads</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[18px] font-bold text-success">{stats.cvr}%</p>
                    <p className="text-[10px] text-subtle uppercase tracking-wider">CVR</p>
                  </div>
                  <svg
                    className={`size-4 text-subtle transition-transform ${isExpanded ? "rotate-180" : ""}`}
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
                <div className="border-t border-foreground px-5 py-5 space-y-6">
                  {/* 7-day snapshot */}
                  <div className="flex items-center gap-6 text-sm">
                    <span className="text-subtle">Last 7 days:</span>
                    <span className="flex items-center gap-1.5">
                      <EyeIcon className="size-3.5 text-subtle" />
                      <span className="font-medium text-foreground">{stats.recentViews}</span>
                      <span className="text-subtle">views</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <PaperAirplaneIcon className="size-3.5 text-subtle" />
                      <span className="font-medium text-foreground">{stats.recentSubmissions}</span>
                      <span className="text-subtle">leads</span>
                    </span>
                    <div className="ml-auto flex items-center gap-3">
                      {magnet.id === "audit" && (
                        <a
                          href="/sales-engine/audits/portfolio"
                          className="flex items-center gap-1 text-[12px] text-subtle hover:text-foreground transition-colors"
                        >
                          <svg className="size-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                          </svg>
                          Edit Portfolio
                        </a>
                      )}
                      <a
                        href={magnet.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[12px] text-[#0A66C2] hover:underline"
                      >
                        View page <ArrowTopRightOnSquareIcon className="size-3" />
                      </a>
                    </div>
                  </div>

                  {/* Tracked links */}
                  <div>
                    <h3 className="text-[12px] font-semibold text-foreground uppercase tracking-wider mb-3">
                      Tracked Links — {selectedMember}
                    </h3>
                    <div className="space-y-2">
                      {links.map((link) => {
                        const key = `${magnet.id}-${selectedMember}-${link.label}`;
                        const isCopied = copiedLink === key;

                        // Count events for this specific ref
                        const ref = link.trackingRef;
                        const refViews = events.filter(
                          (e) => e.funnel === magnet.funnel && e.event_type === "view" && e.source === ref
                        ).length;
                        const refLeads = events.filter(
                          (e) => e.funnel === magnet.funnel && e.event_type === "submission" && e.source === ref
                        ).length;

                        return (
                          <div
                            key={key}
                            className="flex items-center gap-3 bg-surface-raised border border-border rounded-lg px-4 py-2.5 group"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] font-medium text-foreground">{link.label}</span>
                                <span className="text-[11px] text-muted">{link.description}</span>
                              </div>
                              <p className="text-[11px] text-subtle font-mono truncate mt-0.5">{link.ref}</p>
                            </div>

                            {/* Per-link stats */}
                            <div className="flex items-center gap-4 text-[11px] shrink-0">
                              <span className="text-subtle">
                                <span className="font-medium text-foreground">{refViews}</span> views
                              </span>
                              <span className="text-subtle">
                                <span className="font-medium text-foreground">{refLeads}</span> leads
                              </span>
                            </div>

                            <button
                              onClick={() => copyToClipboard(link.ref, key)}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all shrink-0 ${
                                isCopied
                                  ? "bg-[#D1FF4C]/30 text-[#3D7A00]"
                                  : "bg-white border border-foreground text-subtle hover:border-surface hover:text-foreground"
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
                      <h3 className="text-[12px] font-semibold text-foreground uppercase tracking-wider mb-3">
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
                                className="flex items-center justify-between bg-surface-raised border border-border rounded-lg px-3 py-2"
                              >
                                <div className="min-w-0">
                                  <p className="text-[12px] font-medium text-foreground">{detail}</p>
                                  <p className="text-[10px] text-subtle">{label}</p>
                                </div>
                                <div className="flex items-center gap-4 text-[11px] shrink-0">
                                  <span className="text-subtle">
                                    <span className="font-medium text-foreground">{data.views}</span> views
                                  </span>
                                  <span className="text-subtle">
                                    <span className="font-medium text-foreground">{data.submissions}</span> leads
                                  </span>
                                  <span className="font-medium text-success">{srcCvr}%</span>
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
      <div className="border-2 border-dashed border-foreground rounded-xl p-8 text-center">
        <div className="size-10 bg-surface-raised rounded-xl flex items-center justify-center mx-auto mb-3">
          <svg className="size-5 text-subtle" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </div>
        <p className="text-[13px] font-medium text-foreground">Add another lead magnet</p>
        <p className="text-[12px] text-subtle mt-1">
          Checklists, calculators, templates — each gets its own tracked links and analytics.
        </p>
      </div>
    </div>
  );
}
