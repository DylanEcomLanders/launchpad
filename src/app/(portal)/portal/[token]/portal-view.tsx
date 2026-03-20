"use client";

import { useState, useEffect } from "react";
import { Logo } from "@/components/logo";
import { IntelligemsClientCards } from "@/components/intelligems-tests";
import type {
  PortalData,
  PortalPhase,
  PortalDocument,
  PortalTestResult,
  PortalWin,
  PortalUpdate,
  PortalApproval,
  AdHocRequest,
  PhaseStatus,
  PortalProject,
} from "@/lib/portal/types";
import type { DesignReview, DesignReviewVersion, DesignReviewFeedback } from "@/lib/portal/review-types";
import type { FunnelData } from "@/lib/funnel-builder/types";

import { toLoomEmbed } from "@/lib/portal/loom";
import { toFigmaEmbed } from "@/lib/portal/review-types";

/* ── Tab type ── */
type Tab = "overview" | "timeline" | "testing" | "updates" | "scope" | "designs" | "development" | "results" | "requests" | "funnels";

/* ── SVG Progress Ring ── */
function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 6,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E5E5EA"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1B1B1B"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tracking-tight">{progress}</span>
        <span className="text-[10px] font-medium text-[#AAA] -mt-0.5">
          percent
        </span>
      </div>
    </div>
  );
}

/* ── Status helpers ── */
function phaseStatusIcon(status: PhaseStatus, size: "sm" | "md" = "md") {
  const s = size === "sm" ? "size-4" : "size-5";
  const inner = size === "sm" ? "size-1.5" : "size-2";
  const check = size === "sm" ? "size-2.5" : "size-3";

  switch (status) {
    case "complete":
      return (
        <span className={`inline-flex items-center justify-center ${s} rounded-full bg-accent text-[#1A1A1A]`}>
          <svg className={check} viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      );
    case "in-progress":
      return (
        <span className={`inline-flex items-center justify-center ${s} rounded-full border-2 border-accent`}>
          <span className={`${inner} rounded-full bg-accent animate-pulse`} />
        </span>
      );
    case "upcoming":
      return (
        <span className={`inline-flex items-center justify-center ${s} rounded-full border-2 border-[#D4D4D4]`} />
      );
  }
}

/* ── UK Time Banner ── */

function UKTimeBanner({ dark = false }: { dark?: boolean }) {
  const [ukTime, setUkTime] = useState("");
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    function update() {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/London",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      const timeStr = formatter.format(now);
      setUkTime(timeStr);

      const hourFormatter = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/London",
        hour: "numeric",
        hour12: false,
      });
      const hour = parseInt(hourFormatter.format(now), 10);
      const day = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/London",
        weekday: "short",
      }).format(now);
      const isWeekday = !["Sat", "Sun"].includes(day);
      setIsOnline(isWeekday && hour >= 9 && hour < 18);
    }

    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, []);

  if (!ukTime) return null;

  return (
    <div className="flex items-center gap-2">
      <span
        className={`size-2 rounded-full shrink-0 ${
          isOnline ? "bg-green-500" : "bg-red-500"
        }`}
      />
      <span className={`text-[11px] ${dark ? "text-[#999]" : "text-[#777]"}`}>
        {isOnline ? "Online" : "Offline"} &middot; {ukTime} UK
      </span>
    </div>
  );
}

/* ── Nav Icons ── */
function NavIcon({ type }: { type: Tab }) {
  const cls = "size-4";
  switch (type) {
    case "overview": return <svg className={cls} viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>;
    case "timeline": return <svg className={cls} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>;
    case "updates": return <svg className={cls} viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm6.5 1a.5.5 0 00-.5.5v5a.5.5 0 00.75.43l4-2.5a.5.5 0 000-.86l-4-2.5A.5.5 0 008.5 7z" /></svg>;
    case "scope": return <svg className={cls} viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>;
    case "designs": return <svg className={cls} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>;
    case "results": return <svg className={cls} viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg>;
    case "development": return <svg className={cls} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>;
    case "testing": return <svg className={cls} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>;
    case "requests": return <svg className={cls} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>;
    case "funnels": return <svg className={cls} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" /></svg>;
    default: return null;
  }
}

/* ── Main Component ── */

export function PortalView({
  portal,
  updates = [],
  approvals = [],
  reviews = [],
  pageReviews = [],
  reviewVersions = {},
  reviewFeedback = {},
  funnels = [],
  onSubmitRequest,
}: {
  portal: PortalData;
  updates?: PortalUpdate[];
  approvals?: PortalApproval[];
  reviews?: DesignReview[];
  pageReviews?: DesignReview[];
  reviewVersions?: Record<string, DesignReviewVersion[]>;
  reviewFeedback?: Record<string, DesignReviewFeedback[]>;
  funnels?: FunnelData[];
  onSubmitRequest?: (title: string, description: string) => Promise<void>;
}) {
  const isRetainerPortal = portal.client_type === "retainer";
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showRequestPopup, setShowRequestPopup] = useState(false);
  const [selectedProjectIdx, setSelectedProjectIdx] = useState(-1); // -1 = home/hub view
  const [drillView, setDrillView] = useState<"home" | "project" | "retainer">("home");

  const hasDesigns = reviews.length > 0;
  const hasPageReviews = pageReviews.length > 0;

  const hasProjects = portal.projects && portal.projects.length > 0;
  const selectedProject: PortalProject | null = selectedProjectIdx >= 0 && hasProjects ? portal.projects[selectedProjectIdx] ?? null : null;
  const isRetainer = selectedProject?.type === "retainer" || (drillView === "retainer");

  // Drill into a project
  const openProject = (idx: number) => {
    setSelectedProjectIdx(idx);
    const proj = portal.projects?.[idx];
    if (proj?.type === "retainer") {
      setDrillView("retainer");
      setActiveTab("testing");
    } else {
      setDrillView("project");
      setActiveTab("timeline");
    }
  };

  const goHome = () => {
    setSelectedProjectIdx(-1);
    setDrillView("home");
    setActiveTab("overview");
  };

  // Derive phases/scope/documents/deliverables from selected project when available
  const activePhases = (selectedProject?.phases?.length ? selectedProject.phases : null) ?? portal.phases;
  const activeScope = (selectedProject?.scope?.length ? selectedProject.scope : null) ?? portal.scope;
  const activeDocuments = (selectedProject?.documents?.length ? selectedProject.documents : null) ?? portal.documents;
  const activeDeliverables = (selectedProject?.deliverables?.length ? selectedProject.deliverables : null) ?? portal.deliverables;
  const activeCurrentPhase = activePhases.find((p) => p.status === "in-progress");
  const activeProgress = selectedProject?.progress || portal.progress;
  const activeCurrentPhaseName = selectedProject?.current_phase || portal.current_phase;

  const currentPhase = portal.phases.find((p) => p.status === "in-progress");

  // Open requests count
  const openRequestCount = (portal.ad_hoc_requests || []).filter(r => r.status !== "done").length;

  // Nav items depend on drill view
  const navItems: { key: Tab; label: string }[] = drillView === "home"
    ? [
        { key: "overview", label: "Home" },
        ...(updates.length > 0 ? [{ key: "updates" as Tab, label: "Updates" }] : []),
        { key: "requests", label: "Requests" },
      ]
    : drillView === "retainer"
    ? [
        { key: "testing" as Tab, label: "Testing" },
        { key: "scope", label: "Scope" },
        { key: "designs" as Tab, label: "Designs" },
        { key: "development", label: "Development" },
        ...(funnels.length > 0 ? [{ key: "funnels" as Tab, label: "Funnels" }] : []),
      ]
    : [
        { key: "timeline" as Tab, label: "Timeline" },
        { key: "scope", label: "Scope" },
        { key: "designs" as Tab, label: "Designs" },
        { key: "development", label: "Development" },
        ...(funnels.length > 0 ? [{ key: "funnels" as Tab, label: "Funnels" }] : []),
      ];

  const firstName = portal.client_name.split(" ")[0].split("[")[0].trim();

  return (
    <div className="flex min-h-screen bg-white">
      {/* ── Mobile header ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-[#E8E8E8] px-4 py-3 flex items-center justify-between">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-lg hover:bg-[#F5F5F5] text-[#777]">
          <svg className="size-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
        </button>
        <Logo height={14} />
        <div className="w-8" />
      </div>

      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`fixed md:sticky top-0 left-0 h-screen z-50 md:z-auto w-[220px] bg-white border-r border-[#E8E8E8] flex flex-col transition-transform duration-200 md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Logo */}
        <div className="px-5 py-6 border-b border-[#E8E8E8]">
          <Logo height={14} />
        </div>

        {/* Back to home when drilled in */}
        {drillView !== "home" && (
          <div className="px-3 pt-3 pb-1">
            <button
              onClick={() => { goHome(); setSidebarOpen(false); }}
              className="w-full text-left px-2.5 py-2 text-[11px] font-medium text-[#AAA] hover:text-[#1A1A1A] rounded-md hover:bg-[#F5F5F5] transition-all flex items-center gap-1.5"
            >
              <svg className="size-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" /></svg>
              Home
            </button>
            <p className="px-2.5 mt-2 text-[10px] font-semibold text-[#1A1A1A] truncate">{selectedProject?.name}</p>
            <p className="px-2.5 text-[9px] text-[#CCC] uppercase tracking-wider">{selectedProject?.type === "retainer" ? "Retainer" : "Project"}</p>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => { setActiveTab(item.key); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium rounded-lg transition-all duration-150 ${
                activeTab === item.key
                  ? "bg-[#1A1A1A] text-white"
                  : "text-[#999] hover:bg-[#F5F5F5] hover:text-[#1A1A1A]"
              }`}
            >
              <NavIcon type={item.key} />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="px-5 py-4 border-t border-[#E8E8E8] space-y-2">
          <UKTimeBanner />
          <p className="text-[10px] text-[#CCC]">Powered by Ecomlanders</p>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 min-w-0 pt-14 md:pt-0">
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-8 md:py-10">
          {/* Tab content */}
          <div key={activeTab} className="animate-fadeIn">
            {activeTab === "overview" && drillView === "home" && (
              <ClientHub
                portal={portal}
                updates={updates}
                onOpenProject={openProject}
                onRequestClick={() => setShowRequestPopup(true)}
              />
            )}
            {activeTab === "overview" && drillView !== "home" && (
              <DashboardView
                portal={portal}
                currentPhase={activeCurrentPhase}
                currentPhaseName={activeCurrentPhaseName}
                phases={activePhases}
                documents={activeDocuments}
                progress={activeProgress}
                isRetainer={isRetainer}
                testingTier={selectedProject?.testing_tier ?? portal.testing_tier}
                firstName={firstName}
                onRequestClick={() => setShowRequestPopup(true)}
              />
            )}
            {activeTab === "timeline" && !isRetainer && (
              <>
                <PageHeader title="Timeline" subtitle="Your project phases and milestones" />
                <TimelineTab phases={activePhases} />
              </>
            )}
            {activeTab === "testing" && isRetainer && (
              <>
                <PageHeader title="Weekly Testing" subtitle="Your testing cadence and schedule" />
                <WeeklyTestingTab
                  results={portal.results}
                  testingTier={selectedProject?.testing_tier ?? portal.testing_tier}
                />
              </>
            )}
            {activeTab === "updates" && (
              <>
                <PageHeader title="Updates" subtitle="Video updates from the team" />
                <UpdatesTab updates={updates} />
              </>
            )}
            {activeTab === "scope" && (
              <>
                <PageHeader title="Scope & Deliverables" subtitle="Everything included in your project" />
                <ScopeTab scope={activeScope} deliverables={activeDeliverables} documents={activeDocuments} />
              </>
            )}
            {activeTab === "designs" && (
              <>
                <PageHeader title="Designs" subtitle="Review and approve design work" />
                <DesignsTab
                  reviews={reviews}
                  reviewVersions={reviewVersions}
                  reviewFeedback={reviewFeedback}
                  portalToken={portal.token}
                  clientName={portal.client_name}
                />
              </>
            )}
            {activeTab === "results" && portal.show_results && (
              <>
                <PageHeader title="Test Results" subtitle="A/B tests and optimisation results" />
                {portal.intelligems_key && (
                  <div className="mb-6">
                    <IntelligemsClientCards
                      apiKey={portal.intelligems_key}
                      assignments={portal.intelligems_assignments}
                      selectedTests={portal.intelligems_selected_tests}
                    />
                  </div>
                )}
                <ResultsTab results={portal.results} />
              </>
            )}
            {activeTab === "development" && (
              <>
                <PageHeader title="Development" subtitle="Review staging pages and leave feedback" />
                {hasPageReviews ? (
                  <div className="space-y-4">
                    {pageReviews.map((review) => {
                      const versions = reviewVersions[review.id] || [];
                      const latestVersion = versions[versions.length - 1];
                      const fb = Object.values(reviewFeedback)
                        .flat()
                        .filter((f) => f.review_id === review.id);

                      return (
                        <div key={review.id} className="border border-[#E8E8E8] rounded-xl bg-white overflow-hidden">
                          {/* Page Header */}
                          <div className="flex items-center justify-between px-5 py-3 border-b border-[#F0F0F0]">
                            <div>
                              <p className="text-sm font-semibold text-[#1A1A1A]">{review.title}</p>
                              {review.description && (
                                <p className="text-xs text-[#7A7A7A] mt-0.5">{review.description}</p>
                              )}
                            </div>
                            <span className={`px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full border ${
                              review.status === "approved"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : review.status === "changes_requested"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                            }`}>
                              {review.status === "changes_requested" ? "Changes Requested" : review.status === "approved" ? "Approved" : "In Review"}
                            </span>
                          </div>

                          {/* Version History */}
                          <div className="px-5 py-3">
                            {versions.length > 0 ? (
                              <div className="space-y-2">
                                {[...versions].reverse().map((v, i) => {
                                  const isLatest = v.id === latestVersion?.id;
                                  const vDate = new Date(v.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
                                  return (
                                    <div key={v.id} className={`flex items-center justify-between p-3 rounded-lg ${isLatest ? "bg-[#F7F8FA] border border-[#E5E5EA]" : "bg-white"}`}>
                                      <div className="flex items-center gap-3">
                                        <span className={`inline-flex items-center justify-center size-7 rounded-full text-[11px] font-bold ${isLatest ? "bg-[#1A1A1A] text-white" : "bg-[#F0F0F0] text-[#777]"}`}>
                                          V{v.version_number}
                                        </span>
                                        <div>
                                          <p className="text-xs font-medium text-[#1A1A1A]">
                                            Version {v.version_number}
                                            {isLatest && <span className="ml-2 text-[10px] text-emerald-600 font-semibold">Latest</span>}
                                          </p>
                                          <p className="text-[10px] text-[#AAA]">{vDate}{v.notes ? ` — ${v.notes}` : ""}</p>
                                        </div>
                                      </div>
                                      {v.staging_url && (
                                        <a
                                          href={v.staging_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-white bg-[#1A1A1A] rounded-lg hover:bg-[#333] transition-colors"
                                        >
                                          <svg className="size-3" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5zm7.25-.75a.75.75 0 01.75-.75h3.5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0V6.31l-5.47 5.47a.75.75 0 01-1.06-1.06l5.47-5.47H12.25a.75.75 0 01-.75-.75z" clipRule="evenodd" />
                                          </svg>
                                          Review Page
                                        </a>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-xs text-[#AAA] text-center py-4">Staging link coming soon</p>
                            )}
                          </div>

                          {/* Feedback */}
                          {fb.length > 0 && (
                            <div className="px-5 py-3 border-t border-[#F0F0F0] bg-[#FAFAFA]">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-2">Feedback</p>
                              <div className="space-y-2">
                                {fb.map((item) => (
                                  <div key={item.id} className="flex items-start gap-2">
                                    <div className={`size-2 rounded-full mt-1.5 shrink-0 ${item.resolved ? "bg-emerald-400" : "bg-amber-400"}`} />
                                    <div>
                                      <p className="text-xs text-[#1A1A1A]">{item.comment}</p>
                                      <p className="text-[10px] text-[#AAA]">
                                        {item.submitted_by} · {new Date(item.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                                        {item.resolved && " · Resolved"}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-20">
                    <div className="inline-flex items-center justify-center size-12 rounded-full bg-[#F0F0F0] mb-4">
                      <svg className="size-5 text-[#AAA]" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-sm text-[#777] mb-1">Development updates coming soon</p>
                    <p className="text-xs text-[#AAA]">Build progress and staging links will appear here</p>
                  </div>
                )}
              </>
            )}
            {activeTab === "funnels" && funnels.length > 0 && (
              <>
                <PageHeader title="Funnels" subtitle="Your customer journey maps" />
                <div className="space-y-3">
                  {funnels.map((funnel) => (
                    <div
                      key={funnel.id}
                      className="border border-[#E8E8E8] rounded-xl bg-white overflow-hidden"
                    >
                      <div className="px-5 py-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-semibold text-[#1A1A1A]">
                            {funnel.name || "Untitled Funnel"}
                          </p>
                          <span className={`px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full border ${
                            funnel.mode === "performance"
                              ? "bg-[#F0F0F0] text-[#555] border-[#E0E0E0]"
                              : "bg-white text-[#999] border-[#E5E5EA]"
                          }`}>
                            {funnel.mode}
                          </span>
                        </div>
                        {funnel.created_at && (
                          <p className="text-[11px] text-[#AAA] mb-3">
                            Created {new Date(funnel.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        )}
                        {funnel.nodes.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {funnel.nodes.map((node) => (
                              <span
                                key={node.id}
                                className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-md border ${
                                  node.data.nodeType === "traffic"
                                    ? "bg-[#FAFAFA] text-[#777] border-[#E8E8E8]"
                                    : "bg-white text-[#555] border-[#E5E5EA]"
                                }`}
                              >
                                <span className={`size-1.5 rounded-full ${
                                  node.data.status === "live" ? "bg-emerald-400"
                                    : node.data.status === "in-progress" ? "bg-amber-400"
                                    : "bg-[#D4D4D4]"
                                }`} />
                                {node.data.label}
                              </span>
                            ))}
                          </div>
                        )}
                        {funnel.nodes.length === 0 && (
                          <p className="text-xs text-[#AAA]">No nodes added yet</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            {activeTab === "requests" && (
              <>
                <PageHeader title="Requests" subtitle="Track your ad-hoc requests" />
                <RequestsTab
                  requests={portal.ad_hoc_requests || []}
                  onSubmit={onSubmitRequest}
                  onOpenPopup={() => setShowRequestPopup(true)}
                />
              </>
            )}
          </div>
        </div>
      </main>

      {/* Request popup */}
      {showRequestPopup && (
        <RequestPopup
          onSubmit={onSubmitRequest}
          onClose={() => setShowRequestPopup(false)}
        />
      )}
    </div>
  );
}

/* ── Page Header ── */
function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-xl font-bold tracking-tight text-[#1A1A1A] mb-1">{title}</h1>
      <p className="text-sm text-[#AAA]">{subtitle}</p>
    </div>
  );
}

/* ── Client Hub (Home) ── */
function ClientHub({
  portal,
  updates,
  onOpenProject,
  onRequestClick,
}: {
  portal: PortalData;
  updates: PortalUpdate[];
  onOpenProject: (idx: number) => void;
  onRequestClick: () => void;
}) {
  const firstName = portal.client_name.split(" ")[0].split("[")[0].trim();
  const projects = portal.projects || [];
  const retainerProjects = projects.filter(p => p.type === "retainer" && p.status !== "complete");
  const pageProjects = projects.filter(p => p.type !== "retainer");
  const activePageProjects = pageProjects.filter(p => p.status === "active");
  const completedPageProjects = pageProjects.filter(p => p.status === "complete");
  const openRequests = (portal.ad_hoc_requests || []).filter(r => r.status !== "done");
  const hasRetainer = retainerProjects.length > 0 || portal.client_type === "retainer";

  // Touchpoint
  const touchpoint = portal.next_touchpoint;
  const touchpointDate = (() => {
    const d = touchpoint?.date;
    if (!d) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const dt = new Date(d + "T00:00:00");
      return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    }
    return d;
  })();

  // Current phase for fallback display
  const currentPhase = portal.phases.find(p => p.status === "in-progress");

  return (
    <div>
      {/* Welcome */}
      <div className="mb-10">
        <h1 className="text-2xl font-bold tracking-tight text-[#1A1A1A]">
          Welcome, {firstName}
        </h1>
        <p className="text-sm text-[#999] mt-1">
          Here&apos;s an overview of everything we&apos;re working on together.
        </p>
      </div>

      {/* Next touchpoint */}
      {touchpoint?.date && (
        <div className="mb-8 pb-8 border-b border-[#F0F0F0]">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#CCC] mb-2">Next Touchpoint</p>
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#1A1A1A]">{touchpoint.description || "Scheduled call"}</p>
            <p className="text-sm font-medium text-[#1A1A1A]">{touchpointDate}</p>
          </div>
        </div>
      )}

      {/* Retainer section */}
      {hasRetainer && (
        <div className="mb-8 pb-8 border-b border-[#F0F0F0]">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#CCC] mb-3">Retainer</p>
          {retainerProjects.length > 0 ? retainerProjects.map((proj, _) => {
            const idx = projects.indexOf(proj);
            const tier = proj.testing_tier || portal.testing_tier;
            const liveTests = (portal.results || []).filter(r => r.status === "live").length;
            const completedTests = (portal.results || []).filter(r => r.status === "complete").length;
            return (
              <button
                key={proj.id}
                onClick={() => onOpenProject(idx)}
                className="w-full text-left group"
              >
                <div className="flex items-center justify-between py-3 hover:bg-[#FAFAFA] -mx-2 px-2 rounded-lg transition-colors">
                  <div>
                    <p className="text-sm font-medium text-[#1A1A1A] group-hover:text-[#000]">{proj.name}</p>
                    <p className="text-xs text-[#AAA] mt-0.5">
                      {tier && <span className="mr-3">{tier} · {tier === "T1" ? "1" : tier === "T2" ? "2" : "4"} tests/week</span>}
                      {liveTests > 0 && <span className="text-emerald-600">{liveTests} live</span>}
                      {completedTests > 0 && <span className="ml-3">{completedTests} completed</span>}
                    </p>
                  </div>
                  <svg className="size-4 text-[#CCC] group-hover:text-[#999]" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
                </div>
              </button>
            );
          }) : (
            <button
              onClick={() => {
                // If no retainer project in array, open with portal-level retainer data
                if (projects.length > 0) onOpenProject(0);
              }}
              className="w-full text-left group"
            >
              <div className="flex items-center justify-between py-3 hover:bg-[#FAFAFA] -mx-2 px-2 rounded-lg transition-colors">
                <div>
                  <p className="text-sm font-medium text-[#1A1A1A]">CRO Testing</p>
                  <p className="text-xs text-[#AAA] mt-0.5">
                    {portal.testing_tier && <span>{portal.testing_tier} · {portal.testing_tier === "T1" ? "1" : portal.testing_tier === "T2" ? "2" : "4"} tests/week</span>}
                  </p>
                </div>
                <svg className="size-4 text-[#CCC] group-hover:text-[#999]" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
              </div>
            </button>
          )}
        </div>
      )}

      {/* Active projects */}
      {activePageProjects.length > 0 && (
        <div className="mb-8 pb-8 border-b border-[#F0F0F0]">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#CCC] mb-3">Active Projects</p>
          {activePageProjects.map((proj) => {
            const idx = projects.indexOf(proj);
            const phase = (proj.phases?.length ? proj.phases : portal.phases).find(p => p.status === "in-progress");
            const progress = proj.progress || portal.progress || 0;
            return (
              <button
                key={proj.id}
                onClick={() => onOpenProject(idx)}
                className="w-full text-left group"
              >
                <div className="flex items-center justify-between py-3 hover:bg-[#FAFAFA] -mx-2 px-2 rounded-lg transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1A1A1A] group-hover:text-[#000]">{proj.name}</p>
                    <p className="text-xs text-[#AAA] mt-0.5">
                      {phase ? phase.name : proj.current_phase || portal.current_phase || "In progress"}
                      {progress > 0 && <span className="ml-3">{progress}%</span>}
                    </p>
                  </div>
                  {/* Mini progress bar */}
                  {progress > 0 && (
                    <div className="w-16 h-1 bg-[#F0F0F0] rounded-full mr-3 shrink-0">
                      <div className="h-full bg-[#1A1A1A] rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                  )}
                  <svg className="size-4 text-[#CCC] group-hover:text-[#999] shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* If no projects array but portal has phases (legacy), show as single project */}
      {projects.length === 0 && portal.phases.length > 0 && (
        <div className="mb-8 pb-8 border-b border-[#F0F0F0]">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#CCC] mb-3">Active Projects</p>
          <div className="py-3">
            <p className="text-sm font-medium text-[#1A1A1A]">{portal.project_type || "Page Build"}</p>
            <p className="text-xs text-[#AAA] mt-0.5">
              {currentPhase?.name || portal.current_phase || "In progress"}
              {portal.progress > 0 && <span className="ml-3">{portal.progress}%</span>}
            </p>
          </div>
        </div>
      )}

      {/* Completed projects */}
      {completedPageProjects.length > 0 && (
        <div className="mb-8 pb-8 border-b border-[#F0F0F0]">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#CCC] mb-3">Completed</p>
          {completedPageProjects.map((proj) => {
            const idx = projects.indexOf(proj);
            return (
              <button
                key={proj.id}
                onClick={() => onOpenProject(idx)}
                className="w-full text-left group"
              >
                <div className="flex items-center justify-between py-2.5 hover:bg-[#FAFAFA] -mx-2 px-2 rounded-lg transition-colors">
                  <div className="flex items-center gap-2">
                    <svg className="size-3.5 text-emerald-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>
                    <p className="text-sm text-[#777]">{proj.name}</p>
                  </div>
                  <svg className="size-4 text-[#CCC] group-hover:text-[#999]" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Open requests */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#CCC]">
            Open Requests {openRequests.length > 0 && `(${openRequests.length})`}
          </p>
          <button
            onClick={onRequestClick}
            className="text-[11px] font-medium text-[#AAA] hover:text-[#1A1A1A] transition-colors"
          >
            + Submit Request
          </button>
        </div>
        {openRequests.length > 0 ? (
          <div className="space-y-0">
            {openRequests.slice(0, 5).map((req) => (
              <div key={req.id} className="flex items-center justify-between py-2.5 border-b border-[#F5F5F5] last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[#1A1A1A] truncate">{req.title}</p>
                  <p className="text-[10px] text-[#CCC] mt-0.5">
                    {new Date(req.requested_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                  req.status === "in-progress" ? "text-blue-600" : "text-[#AAA]"
                }`}>
                  {req.status === "in-progress" ? "In Progress" : "Open"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#CCC] py-2">No open requests</p>
        )}
      </div>

      {/* Recent updates */}
      {updates.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#CCC] mb-3">Recent Updates</p>
          {updates.slice(0, 3).map((u) => (
            <div key={u.id} className="py-2.5 border-b border-[#F5F5F5] last:border-0">
              <p className="text-sm font-medium text-[#1A1A1A]">{u.title}</p>
              <p className="text-xs text-[#999] mt-0.5 line-clamp-1">{u.description}</p>
              <p className="text-[10px] text-[#CCC] mt-1">
                {new Date(u.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Dashboard View (Overview) ── */
function DashboardView({
  portal,
  currentPhase,
  currentPhaseName,
  phases,
  documents,
  progress,
  isRetainer,
  testingTier,
  firstName,
  onRequestClick,
}: {
  portal: PortalData;
  currentPhase?: PortalPhase;
  currentPhaseName: string;
  phases: PortalPhase[];
  documents: PortalDocument[];
  progress: number;
  isRetainer: boolean;
  testingTier?: import("@/lib/portal/types").TestingTier | null;
  firstName: string;
  onRequestClick: () => void;
}) {
  const [selectedDoc, setSelectedDoc] = useState<PortalDocument | null>(null);

  const tierLabel: Record<string, string> = { T1: "1 test / week", T2: "2 tests / week", T3: "4 tests / week" };

  return (
    <div className="space-y-6">
      {/* Welcome + Request button */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#AAA] mb-1">Client Portal</p>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1A1A] mb-1">
            Welcome, {firstName}
          </h1>
          <p className="text-sm text-[#AAA]">Here&apos;s an overview of your project</p>
        </div>
        <button
          onClick={onRequestClick}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-[#1A1A1A] text-white rounded-lg hover:bg-[#333] transition-colors"
        >
          <svg className="size-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
          </svg>
          Submit Request
        </button>
      </div>

      {/* Retainer dashboard variant */}
      {isRetainer ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Testing tier */}
            <div className="bg-white border border-[#E8E8E8] rounded-lg p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#AAA] mb-3">Testing Tier</p>
              <p className="text-lg font-bold tracking-tight text-[#1A1A1A] mb-1">{testingTier || "—"}</p>
              <p className="text-sm text-[#999]">{testingTier ? tierLabel[testingTier] || testingTier : "Not configured"}</p>
            </div>

            {/* Next touchpoint */}
            <div className="bg-[#1A1A1A] rounded-lg p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/50 mb-3">Next Touchpoint</p>
              <p className="text-lg font-bold tracking-tight text-white mb-1">
                {(() => {
                  const d = portal.next_touchpoint?.date;
                  if (!d) return "\u2014";
                  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
                    const dt = new Date(d + "T00:00:00");
                    return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
                  }
                  return d;
                })()}
              </p>
              <p className="text-sm text-white/60 leading-relaxed">
                {portal.next_touchpoint?.description || "No touchpoint scheduled"}
              </p>
            </div>
          </div>

          {/* Current week tests summary */}
          {portal.results.length > 0 && (() => {
            const liveTests = portal.results.filter(r => r.status === "live");
            const scheduledTests = portal.results.filter(r => r.status === "scheduled");
            const winners = portal.results.filter(r => r.result === "winner");
            return (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white border border-[#E8E8E8] rounded-lg p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#AAA] mb-2">Live Now</p>
                  <p className="text-2xl font-bold tracking-tight text-[#1A1A1A]">{liveTests.length}</p>
                </div>
                <div className="bg-white border border-[#E8E8E8] rounded-lg p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#AAA] mb-2">Upcoming</p>
                  <p className="text-2xl font-bold tracking-tight text-[#1A1A1A]">{scheduledTests.length}</p>
                </div>
                <div className="bg-white border border-[#E8E8E8] rounded-lg p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#AAA] mb-2">Winners</p>
                  <p className="text-2xl font-bold tracking-tight text-[#1A1A1A]">{winners.length}</p>
                </div>
              </div>
            );
          })()}
        </>
      ) : (
        <>
          {/* Current stage + Next touchpoint */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white border border-[#E8E8E8] rounded-lg p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#AAA] mb-3">Current Stage</p>
              <p className="text-lg font-bold tracking-tight text-[#1A1A1A] mb-1">{currentPhase?.name || currentPhaseName}</p>
              {currentPhase && (
                <p className="text-sm text-[#999] leading-relaxed">{currentPhase.description}</p>
              )}
              {currentPhase?.dates && (
                <p className="text-xs text-[#CCC] mt-3">{currentPhase.dates}</p>
              )}
            </div>

            <div className="bg-[#1A1A1A] rounded-lg p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/50 mb-3">Next Touchpoint</p>
              <p className="text-lg font-bold tracking-tight text-white mb-1">
                {(() => {
                  const d = portal.next_touchpoint?.date;
                  if (!d) return "\u2014";
                  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
                    const dt = new Date(d + "T00:00:00");
                    return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
                  }
                  return d;
                })()}
              </p>
              <p className="text-sm text-white/60 leading-relaxed">
                {portal.next_touchpoint?.description || "No touchpoint scheduled"}
              </p>
            </div>
          </div>

          {/* Phase progress bar */}
          {phases.length > 0 && (
            <div className="bg-white border border-[#E8E8E8] rounded-lg p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#AAA] mb-4">Project Phases</p>
              <div className="flex gap-1.5">
                {phases.map((phase) => (
                  <div key={phase.id || phase.name} className="flex-1 min-w-0">
                    <div
                      className={`h-2 rounded-full mb-2 ${
                        phase.status === "complete"
                          ? "bg-[#1A1A1A]"
                          : phase.status === "in-progress"
                          ? "bg-[#1A1A1A]"
                          : "bg-[#F0F0F0]"
                      }`}
                    />
                    <p className={`text-[10px] font-medium truncate ${
                      phase.status === "in-progress"
                        ? "text-[#1A1A1A]"
                        : phase.status === "complete"
                        ? "text-[#999]"
                        : "text-[#CCC]"
                    }`}>
                      {phase.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Documents */}
      {documents.length > 0 && (
        <div className="bg-white border border-[#E8E8E8] rounded-lg p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#AAA] mb-4">Documents</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {documents.map((doc, i) => (
              <button
                key={i}
                onClick={() => setSelectedDoc(doc)}
                className="group flex items-center gap-3 bg-white border border-[#E8E8E8] rounded-lg p-3.5 text-left hover:border-[#333] transition-all duration-200"
              >
                <div className="shrink-0 size-9 rounded-lg bg-[#F0F0F0] flex items-center justify-center text-[#777]">
                  <DocTypeIcon type={doc.type} className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1A1A1A] truncate">{doc.name}</p>
                  <p className="text-[10px] text-[#AAA]">{doc.type} &middot; {doc.date}</p>
                </div>
                <svg
                  className="size-4 text-[#CCC] group-hover:text-[#777] group-hover:translate-x-0.5 transition-all shrink-0"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Document preview modal */}
      {selectedDoc && (
        <DocumentPreview doc={selectedDoc} onClose={() => setSelectedDoc(null)} />
      )}
    </div>
  );
}

/* ── Timeline Tab ── */

function TimelineTab({
  phases,
}: {
  phases: PortalPhase[];
}) {
  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-[11px] top-4 bottom-4 w-px bg-[#F0F0F0]" />

      <div className="space-y-0">
        {phases.map((phase) => {
          const isActive = phase.status === "in-progress";
          const isComplete = phase.status === "complete";
          const pct = phase.tasks > 0 ? Math.round((phase.completed / phase.tasks) * 100) : 0;

          return (
            <div key={phase.id || phase.name} className="relative flex gap-5 pb-8 last:pb-0">
              {/* Node */}
              <div className="relative z-10 shrink-0 pt-1">
                <div
                  className={`size-[23px] rounded-full border-2 flex items-center justify-center transition-all ${
                    isComplete
                      ? "border-[#1A1A1A] bg-white"
                      : isActive
                      ? "border-[#1A1A1A] bg-white"
                      : "border-[#2A2A35] bg-white"
                  }`}
                >
                  {isComplete && (
                    <svg className="size-3 text-[#1A1A1A]" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {isActive && (
                    <span className="size-2 rounded-full bg-[#1A1A1A] animate-pulse" />
                  )}
                </div>
              </div>

              {/* Content */}
              <div
                className={`flex-1 rounded-lg p-5 transition-all ${
                  isActive
                    ? "ring-1 ring-[#1A1A1A] bg-white"
                    : isComplete
                    ? "border border-[#E8E8E8] bg-white"
                    : "bg-white border border-[#1A1A22]"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className={`text-sm font-bold ${!isComplete && !isActive ? "text-[#CCC]" : "text-[#1A1A1A]"}`}>{phase.name}</h3>
                      {isActive && (
                        <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-[#1A1A1A]/20 text-[#1A1A1A] rounded-full">
                          Current
                        </span>
                      )}
                      {isComplete && (
                        <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-green-100 text-green-700 rounded-full">
                          Complete
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#AAA]">
                      {phase.dates}
                      {isComplete && phase.completedDate && phase.deadline && new Date(phase.completedDate) < new Date(phase.deadline) ? (
                        <>
                          <span className="ml-2 line-through text-[#CCC]">
                            Deadline: {new Date(phase.deadline + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </span>
                          <span className="ml-1.5 text-green-600 font-medium">
                            Completed {new Date(phase.completedDate + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </span>
                        </>
                      ) : isComplete && phase.completedDate ? (
                        <span className="ml-2 text-green-600">
                          &middot; Completed {new Date(phase.completedDate + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </span>
                      ) : phase.deadline ? (
                        <span className="ml-2 text-[#AAA]">
                          &middot; Deadline: {new Date(phase.deadline + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </span>
                      ) : null}
                    </p>
                  </div>
                </div>

                <p className={`text-sm leading-relaxed ${(isComplete || isActive) ? "text-[#777]" : "text-[#CCC]"} ${pct > 0 ? "mb-3" : ""}`}>
                  {phase.description}
                </p>

                {/* Progress bar */}
                {pct > 0 && (
                  <div className="h-1 rounded-full overflow-hidden bg-[#F0F0F0]">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        isComplete ? "bg-[#1A1A1A]" : "bg-[#1A1A1A]"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Updates Tab ── */

function UpdatesTab({ updates }: { updates: PortalUpdate[] }) {
  if (updates.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="inline-flex items-center justify-center size-12 rounded-full bg-[#F0F0F0] mb-4">
          <svg className="size-5 text-[#AAA]" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 3a1 1 0 00-1 1v1a1 1 0 001 1h16a1 1 0 001-1V4a1 1 0 00-1-1H2zM2 7.5h16l-.811 7.71a2 2 0 01-1.99 1.79H4.802a2 2 0 01-1.99-1.79L2 7.5z" />
          </svg>
        </div>
        <p className="text-sm text-[#777] mb-1">No updates yet</p>
        <p className="text-xs text-[#AAA]">
          Video updates from the team will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {updates.map((update) => (
        <div key={update.id} className="bg-white border border-[#E8E8E8] rounded-lg overflow-hidden">
          {/* Video embed */}
          {toLoomEmbed(update.loom_url) && (
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe
                src={toLoomEmbed(update.loom_url) || ""}
                className="absolute inset-0 w-full h-full"
                allowFullScreen
              />
            </div>
          )}

          {/* Info */}
          <div className="p-4">
            <h3 className="text-sm font-bold text-[#1A1A1A] mb-1">{update.title}</h3>
            {update.description && (
              <p className="text-xs text-[#777] leading-relaxed line-clamp-2">
                {update.description}
              </p>
            )}
            <div className="flex items-center justify-between mt-2">
              <p className="text-[10px] text-[#AAA]">
                {update.posted_by}
              </p>
              <p className="text-[10px] text-[#AAA]">
                {new Date(update.created_at).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                })}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Scope Tab (merged with Documents + Deliverables) ── */

const typeLabels: Record<string, string> = {
  Roadmap: "RDM",
  Scope: "SCP",
  Agreement: "AGR",
  "QA Checklist": "QA",
  Other: "DOC",
};

function DocTypeIcon({ type, className = "size-4" }: { type: string; className?: string }) {
  switch (type) {
    case "Roadmap":
      return <svg className={className} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" /></svg>;
    case "Scope":
      return <svg className={className} viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>;
    case "Agreement":
      return <svg className={className} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 2a1 1 0 00-1 1v1a1 1 0 002 0V3a1 1 0 00-1-1zM4 4h3a3 3 0 006 0h3a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm2.5 7a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm2.45 4a2.5 2.5 0 10-4.9 0h4.9zM12 9a1 1 0 100 2h3a1 1 0 100-2h-3zm-1 4a1 1 0 011-1h3a1 1 0 110 2h-3a1 1 0 01-1-1z" clipRule="evenodd" /></svg>;
    case "QA Checklist":
      return <svg className={className} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" /></svg>;
    default:
      return <svg className={className} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>;
  }
}

function ScopeTab({
  scope,
  deliverables,
  documents,
}: {
  scope: (string | { description: string; type: string })[];
  deliverables: { id?: string; name: string; status: string; phase?: string }[];
  documents: PortalDocument[];
}) {
  const [selected, setSelected] = useState<PortalDocument | null>(null);

  return (
    <div className="space-y-12">
      {/* Deliverables list */}
      {deliverables.length > 0 && (
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#AAA] mb-5">
            Deliverables
          </h3>
          <div className="bg-white border border-[#E8E8E8] rounded-lg divide-y divide-[#E8E8E8]">
            {deliverables.map((del, i) => (
              <div key={del.id || i} className="flex items-center gap-3 px-5 py-3.5">
                {del.status === "complete" ? (
                  <svg className="size-4 text-[#1A1A1A] shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                  </svg>
                ) : del.status === "in-progress" ? (
                  <span className="size-4 rounded-full border-2 border-[#1A1A1A] flex items-center justify-center shrink-0">
                    <span className="size-1.5 rounded-full bg-[#1A1A1A] animate-pulse" />
                  </span>
                ) : (
                  <span className="size-4 rounded-full border-2 border-[#D4D4D4] shrink-0" />
                )}
                <span className={`text-sm flex-1 ${del.status === "complete" ? "text-[#999]" : "text-[#1A1A1A]"}`}>{del.name}</span>
                {del.phase && (
                  <span className="text-[10px] text-[#AAA] shrink-0">{del.phase}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scope items */}
      {scope.length > 0 && (
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#AAA] mb-5">
            Scope
          </h3>
          <div className="bg-white border border-[#E8E8E8] rounded-lg p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
              {scope.map((item, i) => {
                const desc = typeof item === "string" ? item : item.description;
                const typ = typeof item === "string" ? "" : item.type;
                return (
                  <div key={i} className="flex items-center gap-2.5 py-1">
                    <span className="size-1.5 rounded-full bg-[#1A1A1A] shrink-0" />
                    <span className="text-sm text-[#777] flex-1">{desc}</span>
                    {typ && (
                      <span className="shrink-0 px-2 py-0.5 text-[9px] font-medium text-[#999] bg-[#F0F0F0] rounded-full">{typ}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Documents */}
      {documents.length > 0 && (
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#AAA] mb-5">
            Key Documents
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {documents.map((doc, i) => (
              <button
                key={i}
                onClick={() => setSelected(doc)}
                className="group text-left bg-white border border-[#E8E8E8] rounded-lg p-5 hover:border-[#333] transition-all duration-200"
              >
                <div className="flex items-start gap-4">
                  <div className="shrink-0 size-10 rounded-lg bg-[#F0F0F0] text-[#777] flex items-center justify-center">
                    <DocTypeIcon type={doc.type} className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1A1A1A] mb-1.5 truncate">
                      {doc.name}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-medium text-[#AAA] uppercase tracking-wider">
                        {doc.type}
                      </span>
                      <span className="text-[#CCC]">&middot;</span>
                      <span className="text-[10px] text-[#AAA]">
                        {doc.date}
                      </span>
                    </div>
                  </div>
                  <svg
                    className="size-4 text-[#CCC] group-hover:text-[#777] group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Document preview modal */}
      {selected && (
        <DocumentPreview doc={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

/* ── Results Tab ── */

/* ── Wins Tab ── */

function WinsTab({ wins }: { wins: PortalWin[] }) {
  if (wins.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="inline-flex items-center justify-center size-12 rounded-full bg-[#F0F0F0] mb-4">
          <svg className="size-5 text-[#AAA]" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
          </svg>
        </div>
        <p className="text-sm text-[#999] mb-1">No wins recorded yet</p>
        <p className="text-xs text-[#CCC]">Results and milestones will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="border border-[#E8E8E8] rounded-lg p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#AAA] mb-2">Total Wins</p>
          <p className="text-2xl font-bold tracking-tight text-[#1A1A1A]">{wins.length}</p>
        </div>
        <div className="border border-[#E8E8E8] rounded-lg p-5 col-span-1 md:col-span-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#AAA] mb-2">Latest Win</p>
          <p className="text-sm font-semibold">{wins[0]?.title}</p>
          <p className="text-xs text-[#1A1A1A] font-semibold mt-0.5">{wins[0]?.lift}</p>
        </div>
      </div>

      {/* Win cards */}
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#AAA] mb-5">
          All Wins
        </h3>
        <div className="space-y-4">
          {wins.map((win) => (
            <div key={win.id} className="border border-[#E8E8E8] rounded-lg p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h4 className="text-sm font-semibold mb-0.5">{win.title}</h4>
                  <p className="text-xs text-[#999]">{win.metric} · {win.date}</p>
                </div>
                <span className="shrink-0 px-2.5 py-1 text-xs font-bold text-[#1A1A1A] bg-[#F0F0F0] rounded-full">
                  {win.lift}
                </span>
              </div>
              {/* Before → After bar */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 bg-[#F0F0F0] rounded-lg p-3 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-1">Before</p>
                  <p className="text-lg font-bold text-[#999]">{win.before}</p>
                </div>
                <svg className="size-5 text-[#1A1A1A] shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638l-3.96-4.158a.75.75 0 111.085-1.034l5.25 5.5a.75.75 0 010 1.034l-5.25 5.5a.75.75 0 01-1.085-1.034l3.96-4.158H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                </svg>
                <div className="flex-1 bg-[#F0F0F0] border border-[#E8E8E8] rounded-lg p-3 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#1A1A1A] mb-1">After</p>
                  <p className="text-lg font-bold text-[#1A1A1A]">{win.after}</p>
                </div>
              </div>
              {win.description && (
                <p className="text-xs text-[#999] leading-relaxed">{win.description}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Results Tab ── */

function ResultsTab({ results }: { results: PortalTestResult[] }) {
  const live = results.filter(r => r.status === "live");
  const scheduled = results.filter(r => r.status === "scheduled");
  const completed = results.filter(r => r.status === "complete");

  // Group by week, most recent first
  const weekGroups = results.reduce<Record<string, PortalTestResult[]>>((acc, test) => {
    const w = test.week || "Other";
    if (!acc[w]) acc[w] = [];
    acc[w].push(test);
    return acc;
  }, {});
  const sortedWeeks = Object.keys(weekGroups).sort((a, b) => {
    if (a === "Other") return 1;
    if (b === "Other") return -1;
    const numA = parseInt(a.replace(/\D/g, "")) || 0;
    const numB = parseInt(b.replace(/\D/g, "")) || 0;
    return numB - numA;
  });

  if (results.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="inline-flex items-center justify-center size-12 rounded-full bg-[#F0F0F0] mb-4">
          <svg className="size-5 text-[#AAA]" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M2 3.75A.75.75 0 012.75 3h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 3.75zm0 4.167a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zm0 4.166a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zm0 4.167a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
          </svg>
        </div>
        <p className="text-sm text-[#999] mb-1">No tests yet</p>
        <p className="text-xs text-[#CCC]">Results will appear here once testing begins</p>
      </div>
    );
  }

  const resultBadge = (test: PortalTestResult) => {
    if (test.status === "live") return { label: "Live", color: "text-[#1A1A1A]", bg: "bg-[#F0F0F0]" };
    if (test.status === "scheduled") return { label: "Upcoming", color: "text-[#777]", bg: "bg-[#F0F0F0]" };
    if (test.result === "winner") return { label: "Winner", color: "text-emerald-700", bg: "bg-emerald-50" };
    if (test.result === "loser") return { label: "No Lift", color: "text-[#777]", bg: "bg-[#F0F0F0]" };
    return { label: "Inconclusive", color: "text-amber-700", bg: "bg-amber-50" };
  };

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  function TestCard({ test }: { test: PortalTestResult }) {
    const badge = resultBadge(test);

    return (
      <div className="border border-[#E8E8E8] rounded-lg overflow-hidden">
        <div className="p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <p className="text-sm font-medium">{test.name}</p>
            <div className="flex items-center gap-2 shrink-0">
              {test.figma_url && (
                <button
                  onClick={() => setPreviewUrl(test.figma_url!)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold text-[#777] bg-[#F7F7F7] rounded-md hover:bg-[#EBEBEB] transition-colors"
                >
                  <svg className="size-3" viewBox="0 0 24 24" fill="none"><path d="M5 5.5A3.5 3.5 0 018.5 2H12v7H8.5A3.5 3.5 0 015 5.5z" fill="#F24E1E"/><path d="M12 2h3.5a3.5 3.5 0 010 7H12V2z" fill="#FF7262"/><path d="M12 9.5h3.5a3.5 3.5 0 010 7H12V9.5z" fill="#1ABCFE"/><path d="M5 19.5A3.5 3.5 0 018.5 16H12v3.5a3.5 3.5 0 11-7 0z" fill="#0ACF83"/><path d="M5 12.5A3.5 3.5 0 018.5 9H12v7H8.5A3.5 3.5 0 015 12.5z" fill="#A259FF"/></svg>
                  Design
                </button>
              )}
              <span className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-full ${badge.color} ${badge.bg}`}>
                {badge.label}
              </span>
            </div>
          </div>
          <p className="text-xs text-[#999] mb-1">{test.metric}</p>
          {(test.cvr || test.aov || test.rpv) && (
            <div className="grid grid-cols-3 gap-3 mt-2 mb-2 pt-2 border-t border-[#F0F0F0]">
              {[
                { label: "CVR", data: test.cvr },
                { label: "AOV", data: test.aov },
                { label: "RPV", data: test.rpv },
              ].map(({ label, data }) => {
                const lift = (() => {
                  if (!data?.a || !data?.b) return null;
                  const nA = parseFloat(data.a.replace(/[^0-9.\-]/g, ""));
                  const nB = parseFloat(data.b.replace(/[^0-9.\-]/g, ""));
                  if (isNaN(nA) || isNaN(nB) || nA === 0) return null;
                  const pct = ((nB - nA) / nA) * 100;
                  return { value: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`, positive: pct >= 0 };
                })();
                return (
                  <div key={label}>
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-[#CCC] mb-1">{label}</p>
                    {data ? (
                      <div className="flex items-baseline gap-1 flex-wrap">
                        <span className="text-[10px] text-[#AAA]">{data.a}</span>
                        <svg className="size-2 text-[#CCC] shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" /></svg>
                        <span className="text-[11px] font-semibold text-[#1A1A1A]">{data.b}</span>
                        {lift && (
                          <span className={`text-[9px] font-semibold ${lift.positive ? "text-emerald-500" : "text-red-400"}`}>
                            {lift.value}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-[#E8E8E8]">—</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-xs text-[#CCC]">
            {test.status === "scheduled"
              ? `Starts ${test.startDate}`
              : test.endDate
                ? `${test.startDate} → ${test.endDate}`
                : `Started ${test.startDate}`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border border-[#E8E8E8] rounded-lg p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#AAA] mb-2">Live Tests</p>
          <p className="text-2xl font-bold tracking-tight">{live.length}</p>
        </div>
        <div className="border border-[#E8E8E8] rounded-lg p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#AAA] mb-2">Winners</p>
          <p className="text-2xl font-bold tracking-tight text-[#1A1A1A]">{completed.filter(r => r.result === "winner").length}</p>
        </div>
        <div className="border border-[#E8E8E8] rounded-lg p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#AAA] mb-2">Coming Up</p>
          <p className="text-2xl font-bold tracking-tight text-[#1A1A1A]">{scheduled.length}</p>
        </div>
      </div>

      {/* Tests grouped by week */}
      {sortedWeeks.map((weekLabel) => (
        <div key={weekLabel}>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#AAA] mb-4">
            {weekLabel}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {weekGroups[weekLabel].map(test => <TestCard key={test.id} test={test} />)}
          </div>
        </div>
      ))}

      {/* Figma preview popup */}
      {previewUrl && toFigmaEmbed(previewUrl) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setPreviewUrl(null)}>
          <div className="relative w-full max-w-4xl mx-4 bg-white rounded-xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#E8E8E8]">
              <p className="text-sm font-semibold text-[#1A1A1A]">Design Preview</p>
              <div className="flex items-center gap-3">
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-semibold text-[#777] hover:text-[#1A1A1A] transition-colors"
                >
                  Open in Figma
                </a>
                <button onClick={() => setPreviewUrl(null)} className="text-[#AAA] hover:text-[#1A1A1A] transition-colors">
                  <svg className="size-5" viewBox="0 0 20 20" fill="currentColor"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
                </button>
              </div>
            </div>
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe src={toFigmaEmbed(previewUrl) || ""} className="absolute inset-0 w-full h-full border-0" allowFullScreen />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Designs Tab ── */

function DesignsTab({
  reviews,
  reviewVersions,
  reviewFeedback,
  portalToken,
  clientName,
}: {
  reviews: DesignReview[];
  reviewVersions: Record<string, DesignReviewVersion[]>;
  reviewFeedback: Record<string, DesignReviewFeedback[]>;
  portalToken: string;
  clientName: string;
}) {
  const [feedbackState, setFeedbackState] = useState<Record<string, { show: boolean; comment: string }>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [localFeedback, setLocalFeedback] = useState<Record<string, DesignReviewFeedback[]>>(reviewFeedback);
  const [selectedVersions, setSelectedVersions] = useState<Record<string, string>>({});

  const handleFeedback = async (reviewId: string, versionId: string, action: "approved" | "changes_requested") => {
    const comment = feedbackState[versionId]?.comment || "";
    setSubmitting(versionId);
    try {
      const res = await fetch("/api/portal/review-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: portalToken,
          reviewId,
          versionId,
          action,
          comment,
          submittedBy: clientName || "Client",
        }),
      });
      if (res.ok) {
        const newFb: DesignReviewFeedback = {
          id: crypto.randomUUID(),
          version_id: versionId,
          review_id: reviewId,
          action,
          comment,
          submitted_by: clientName || "Client",
          created_at: new Date().toISOString(),
        };
        setLocalFeedback(prev => ({
          ...prev,
          [versionId]: [...(prev[versionId] || []), newFb],
        }));
        setFeedbackState(prev => ({ ...prev, [versionId]: { show: false, comment: "" } }));
      }
    } catch {
      // Silent
    } finally {
      setSubmitting(null);
    }
  };

  if (reviews.length === 0) {
    return (
      <div className="bg-white border border-dashed border-[#E8E8E8] rounded-lg p-8 text-center">
        <p className="text-sm text-[#999] mb-1">Design updates coming soon</p>
        <p className="text-xs text-[#CCC]">Wireframes and mockups will appear here when they&apos;re ready for your review</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {reviews.map((review) => {
        const versions = (reviewVersions[review.id] || []).sort((a, b) => b.version_number - a.version_number);
        const latestVersion = versions[0];
        const activeVersionId = selectedVersions[review.id] || latestVersion?.id;
        const activeVersion = versions.find(v => v.id === activeVersionId) || latestVersion;
        const isCurrentSelected = activeVersion?.id === latestVersion?.id;

        return (
          <div key={review.id}>
            {/* Title + status */}
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-base font-bold">{review.title}</h3>
              <span className={`shrink-0 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-full ${
                review.status === "approved" ? "text-[#1A1A1A] bg-[#F0F0F0]" :
                review.status === "changes_requested" ? "text-[#777] bg-[#F0F0F0]" :
                "text-[#999] bg-[#F0F0F0]"
              }`}>
                {review.status === "approved" ? "Approved" : review.status === "changes_requested" ? "Amends Needed" : "Pending"}
              </span>
            </div>

            {/* Horizontal version tabs */}
            {versions.length > 0 && (
              <div className="flex items-center gap-1.5 mb-4">
                {versions.map((v, i) => {
                  const isCurrent = i === 0;
                  const isActive = v.id === activeVersionId;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVersions(prev => ({ ...prev, [review.id]: v.id }))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                        isActive
                          ? "bg-[#F0F0F0] text-[#1A1A1A] border-[#E8E8E8]"
                          : "bg-white text-[#777] border-[#E5E5EA] hover:border-[#E8E8E8] hover:text-[#1A1A1A]"
                      }`}
                    >
                      v{v.version_number}
                      {isCurrent && (
                        <span className={`text-[9px] font-semibold uppercase ${isActive ? "text-[#999]" : "text-[#1A1A1A]"}`}>
                          Current
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Figma embed for selected version */}
            {activeVersion && (
              <div>
                {toFigmaEmbed(activeVersion.figma_url) && (
                  <div className="relative w-full rounded-lg overflow-hidden border border-[#E8E8E8]" style={{ paddingBottom: "65%" }}>
                    <iframe
                      src={toFigmaEmbed(activeVersion.figma_url) || ""}
                      className="absolute inset-0 w-full h-full"
                      allowFullScreen
                    />
                    <a
                      href={activeVersion.figma_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute bottom-3 right-3 inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-[#1A1A1A] text-white rounded-lg hover:bg-[#333] transition-colors shadow-lg"
                    >
                      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                      Review &amp; Comment in Figma
                    </a>
                  </div>
                )}

              </div>
            )}

            {/* Feedback history for active version */}
            {activeVersion && (() => {
              const versionFeedback = localFeedback[activeVersion.id] || [];
              const statusFeedback = versionFeedback.filter(fb => fb.action !== "comment");
              return statusFeedback.length > 0 ? (
                <div className="space-y-2 mt-5">
                  {statusFeedback.map((fb) => (
                    <div key={fb.id} className={`rounded-lg p-3 text-xs ${
                      fb.action === "approved" ? "bg-[#F0F0F0] border border-[#E8E8E8]" : "bg-[#F0F0F0] border border-[#E8E8E8]"
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${fb.action === "approved" ? "text-[#1A1A1A]" : "text-[#777]"}`}>
                          {fb.action === "approved" ? "Approved" : "Changes Requested"}
                        </span>
                        <span className="text-[#AAA]">&middot;</span>
                        <span className="text-[#999]">{fb.submitted_by}</span>
                        <span className="text-[#AAA]">&middot;</span>
                        <span className="text-[#999]">
                          {new Date(fb.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                      {fb.comment && <p className="text-[#777] mt-1">{fb.comment}</p>}
                    </div>
                  ))}
                </div>
              ) : null;
            })()}

            {/* Approve / Request Amends — only on current version */}
            {isCurrentSelected && activeVersion && review.status !== "approved" && (() => {
              const showFb = feedbackState[activeVersion.id]?.show || false;
              return (
                <div className="border border-[#E8E8E8] rounded-lg p-5 mt-5">
                  <p className="text-sm font-semibold mb-1">Ready to approve?</p>
                  <p className="text-xs text-[#999] mb-4">Leave any comments in Figma first, then approve or request amends below.</p>
                  {showFb ? (
                    <div className="space-y-3">
                      <textarea
                        value={feedbackState[activeVersion.id]?.comment || ""}
                        onChange={(e) => setFeedbackState(prev => ({
                          ...prev,
                          [activeVersion.id]: { ...prev[activeVersion.id], show: true, comment: e.target.value }
                        }))}
                        placeholder="Any notes (optional)"
                        className="w-full px-3 py-2.5 text-sm border border-[#E8E8E8] rounded-lg resize-none h-20 focus:outline-none focus:ring-1 focus:ring-[#1B1B1B]/10 focus:border-[#C5C5C5]"
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleFeedback(review.id, activeVersion.id, "approved")}
                          disabled={submitting === activeVersion.id}
                          className="px-5 py-2.5 text-xs font-semibold bg-[#1A1A1A] text-white rounded-lg hover:bg-[#333] transition-colors disabled:opacity-50"
                        >
                          {submitting === activeVersion.id ? "Saving..." : "Approve"}
                        </button>
                        <button
                          onClick={() => handleFeedback(review.id, activeVersion.id, "changes_requested")}
                          disabled={submitting === activeVersion.id}
                          className="px-5 py-2.5 text-xs font-semibold bg-[#F0F0F0] text-[#1A1A1A] rounded-lg hover:bg-[#333] transition-colors disabled:opacity-50"
                        >
                          Request Amends
                        </button>
                        <button
                          onClick={() => setFeedbackState(prev => ({ ...prev, [activeVersion.id]: { show: false, comment: "" } }))}
                          className="px-3 py-2.5 text-xs font-medium text-[#AAA] hover:text-[#1A1A1A] transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setFeedbackState(prev => ({ ...prev, [activeVersion.id]: { show: true, comment: "" } }))}
                        className="px-5 py-2.5 text-xs font-semibold bg-[#1A1A1A] text-white rounded-lg hover:bg-[#333] transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setFeedbackState(prev => ({ ...prev, [activeVersion.id]: { show: true, comment: "" } }))}
                        className="px-5 py-2.5 text-xs font-semibold border border-[#E8E8E8] text-[#777] rounded-lg hover:bg-[#F0F0F0] transition-colors"
                      >
                        Request Amends
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Approved banner */}
            {review.status === "approved" && (
              <div className="flex items-center gap-2 p-4 bg-[#F0F0F0] border border-[#E8E8E8] rounded-lg mt-5">
                <svg className="size-5 text-[#1A1A1A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-semibold text-[#1A1A1A]">This design has been approved</span>
              </div>
            )}
          </div>
        );
      })}

    </div>
  );
}

/* ── Approve Button ── */

function ApproveButton({
  label,
  onApprove,
  compact = false,
}: {
  label: string;
  onApprove: (comment: string) => void;
  compact?: boolean;
}) {
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState("");

  if (showComment) {
    return (
      <div className={compact ? "flex items-center gap-1.5" : "space-y-2"}>
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add a note (optional)"
          className={`px-2 py-1 text-xs border border-[#E8E8E8] rounded ${compact ? "w-32" : "w-full"}`}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onApprove(comment);
              setShowComment(false);
            }
            if (e.key === "Escape") setShowComment(false);
          }}
        />
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              onApprove(comment);
              setShowComment(false);
            }}
            className="px-2 py-1 text-[10px] font-semibold bg-[#1A1A1A] text-white rounded hover:bg-[#333] transition-colors"
          >
            Confirm
          </button>
          <button
            onClick={() => setShowComment(false)}
            className="px-2 py-1 text-[10px] font-semibold text-[#AAA] hover:text-[#1A1A1A] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowComment(true)}
      className={`inline-flex items-center gap-1 font-semibold text-[#1A1A1A] hover:text-[#1A1A1A] transition-colors ${
        compact ? "text-[10px] px-2 py-1 border border-[#E8E8E8] rounded" : "text-xs"
      }`}
    >
      <svg className="size-3" viewBox="0 0 12 12" fill="none">
        <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </button>
  );
}

/* ── Document Preview Modal ── */

function DocumentPreview({
  doc,
  onClose,
}: {
  doc: PortalDocument;
  onClose: () => void;
}) {
  const [toast, setToast] = useState("");

  function handleDownload() {
    if (doc.url) {
      const a = document.createElement("a");
      a.href = doc.url;
      a.download = `${doc.name}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      setToast("Document not yet available");
      setTimeout(() => setToast(""), 3000);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white border border-[#E8E8E8] rounded-lg shadow-2xl animate-fadeIn">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-[#E8E8E8]">
          <div className="flex items-start gap-4">
            <div className="shrink-0 size-12 rounded-lg bg-[#F0F0F0] text-[#777] flex items-center justify-center">
              <DocTypeIcon type={doc.type} className="size-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1A1A1A] mb-1">{doc.name}</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#AAA] uppercase tracking-wider font-medium">
                  {doc.type}
                </span>
                <span className="text-[#CCC]">&middot;</span>
                <span className="text-xs text-[#AAA]">{doc.date}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-[#F0F0F0] transition-colors text-[#AAA] hover:text-[#1A1A1A]"
          >
            <svg className="size-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Document preview placeholder */}
        <div className="p-6">
          <div className="border border-[#E8E8E8] rounded-lg bg-white p-8 mb-6">
            <div className="space-y-4">
              <div className="h-3 bg-[#F0F0F0] rounded w-2/3" />
              <div className="space-y-2">
                <div className="h-2 bg-[#F0F0F0] rounded w-full" />
                <div className="h-2 bg-[#F0F0F0] rounded w-5/6" />
                <div className="h-2 bg-[#F0F0F0] rounded w-4/6" />
              </div>
              <div className="h-px bg-[#F0F0F0]" />
              <div className="space-y-2">
                <div className="h-2 bg-[#F0F0F0] rounded w-full" />
                <div className="h-2 bg-[#F0F0F0] rounded w-3/4" />
                <div className="h-2 bg-[#F0F0F0] rounded w-5/6" />
                <div className="h-2 bg-[#F0F0F0] rounded w-2/3" />
              </div>
              <div className="h-px bg-[#F0F0F0]" />
              <div className="space-y-2">
                <div className="h-2 bg-[#F0F0F0] rounded w-full" />
                <div className="h-2 bg-[#F0F0F0] rounded w-4/5" />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownload}
              className={`flex-1 flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium rounded-lg transition-colors ${
                doc.url
                  ? "bg-[#1A1A1A] text-white hover:bg-[#333]"
                  : "bg-[#F0F0F0] text-[#AAA] cursor-not-allowed"
              }`}
            >
              <svg className="size-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
              </svg>
              {doc.url ? "Download PDF" : "Not yet available"}
            </button>
            <button
              onClick={onClose}
              className="px-5 py-3 text-sm font-medium text-[#777] border border-[#E8E8E8] rounded-lg hover:bg-[#1A1A24] transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 px-5 py-3 bg-[#F0F0F0] text-[#1A1A1A] text-sm font-medium rounded-full shadow-xl whitespace-nowrap animate-fadeIn">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Weekly Testing Tab (Retainer) ── */

function WeeklyTestingTab({
  results,
  testingTier,
}: {
  results: PortalTestResult[];
  testingTier?: import("@/lib/portal/types").TestingTier | null;
}) {
  const tierLabel: Record<string, string> = { T1: "1 test / week", T2: "2 tests / week", T3: "4 tests / week" };

  // Group tests by week
  const weekGroups = results.reduce<Record<string, PortalTestResult[]>>((acc, test) => {
    const w = test.week || "Other";
    if (!acc[w]) acc[w] = [];
    acc[w].push(test);
    return acc;
  }, {});
  const sortedWeeks = Object.keys(weekGroups).sort((a, b) => {
    if (a === "Other") return 1;
    if (b === "Other") return -1;
    const numA = parseInt(a.replace(/\D/g, "")) || 0;
    const numB = parseInt(b.replace(/\D/g, "")) || 0;
    return numB - numA;
  });

  const live = results.filter(r => r.status === "live");
  const scheduled = results.filter(r => r.status === "scheduled");
  const completed = results.filter(r => r.status === "complete");
  const winners = completed.filter(r => r.result === "winner");

  if (results.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="inline-flex items-center justify-center size-12 rounded-full bg-[#F0F0F0] mb-4">
          <svg className="size-5 text-[#AAA]" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>
        </div>
        <p className="text-sm text-[#777] mb-1">No tests scheduled yet</p>
        <p className="text-xs text-[#AAA]">Weekly tests will appear here as they are scheduled</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Tier + stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {testingTier && (
          <div className="bg-white border border-[#E8E8E8] rounded-lg p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#AAA] mb-2">Tier</p>
            <p className="text-lg font-bold tracking-tight text-[#1A1A1A]">{testingTier}</p>
            <p className="text-[10px] text-[#999] mt-0.5">{tierLabel[testingTier]}</p>
          </div>
        )}
        <div className="bg-white border border-[#E8E8E8] rounded-lg p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#AAA] mb-2">Live</p>
          <p className="text-2xl font-bold tracking-tight text-[#1A1A1A]">{live.length}</p>
        </div>
        <div className="bg-white border border-[#E8E8E8] rounded-lg p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#AAA] mb-2">Upcoming</p>
          <p className="text-2xl font-bold tracking-tight text-[#1A1A1A]">{scheduled.length}</p>
        </div>
        <div className="bg-white border border-[#E8E8E8] rounded-lg p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#AAA] mb-2">Winners</p>
          <p className="text-2xl font-bold tracking-tight text-[#1A1A1A]">{winners.length}</p>
        </div>
      </div>

      {/* Tests grouped by week */}
      {sortedWeeks.map((weekLabel) => {
        const tests = weekGroups[weekLabel];
        return (
          <div key={weekLabel}>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#AAA] mb-4">{weekLabel}</h3>
            <div className="bg-white border border-[#E8E8E8] rounded-lg divide-y divide-[#E8E8E8]">
              {tests.map((test) => {
                const badge = test.status === "live"
                  ? { label: "Live", cls: "bg-[#1A1A1A] text-white" }
                  : test.status === "scheduled"
                  ? { label: "Upcoming", cls: "bg-[#F0F0F0] text-[#777]" }
                  : test.result === "winner"
                  ? { label: "Winner", cls: "bg-emerald-50 text-emerald-700" }
                  : test.result === "loser"
                  ? { label: "No Lift", cls: "bg-[#F0F0F0] text-[#777]" }
                  : { label: "Inconclusive", cls: "bg-amber-50 text-amber-700" };

                return (
                  <div key={test.id} className="px-5 py-4 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1A1A1A] truncate">{test.name}</p>
                      <p className="text-xs text-[#999] mt-0.5">{test.metric}</p>
                      <p className="text-[10px] text-[#CCC] mt-1">
                        {test.status === "scheduled"
                          ? `Starts ${test.startDate}`
                          : test.endDate
                            ? `${test.startDate} \u2192 ${test.endDate}`
                            : `Started ${test.startDate}`}
                      </p>
                    </div>
                    <span className={`shrink-0 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-full ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Requests Tab ── */

function RequestsTab({
  requests,
  onSubmit,
  onOpenPopup,
}: {
  requests: AdHocRequest[];
  onSubmit?: (title: string, description: string) => Promise<void>;
  onOpenPopup: () => void;
}) {
  const statusColor = (status: AdHocRequest["status"]) => {
    switch (status) {
      case "open":
        return "bg-[#F0F0F0] text-[#777] border-[#E8E8E8]";
      case "in-progress":
        return "bg-[#F0F0F0] text-[#777] border-[#E8E8E8]";
      case "done":
        return "bg-[#F0F0F0] text-[#777] border-[#E8E8E8]";
    }
  };

  const statusLabel = (status: AdHocRequest["status"]) => {
    switch (status) {
      case "open":
        return "Open";
      case "in-progress":
        return "In Progress";
      case "done":
        return "Done";
    }
  };

  return (
    <div className="space-y-6">
      {/* Submit button */}
      <button
        onClick={onOpenPopup}
        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-[#1A1A1A] text-white rounded-lg hover:bg-[#333] transition-colors"
      >
        <svg className="size-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
        </svg>
        Submit Request
      </button>

      {/* Existing requests */}
      {requests.length > 0 && (
        <div className="bg-white border border-[#E8E8E8] rounded-lg divide-y divide-[#E8E8E8]">
          {requests.map((req) => (
            <div key={req.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1A1A1A]">{req.title}</p>
                  {req.description && (
                    <p className="text-xs text-[#777] mt-1 leading-relaxed">
                      {req.description}
                    </p>
                  )}
                  <p className="text-[10px] text-[#AAA] mt-2">
                    {new Date(req.requested_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full border shrink-0 ${statusColor(req.status)}`}
                >
                  {statusLabel(req.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {requests.length === 0 && (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center size-12 rounded-full bg-[#F0F0F0] mb-4">
            <svg className="size-5 text-[#AAA]" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-sm text-[#777] mb-1">No requests yet</p>
          <p className="text-xs text-[#AAA]">Submit a request for out-of-scope work that needs quoting</p>
        </div>
      )}
    </div>
  );
}

/* ── Request Popup ── */

function RequestPopup({
  onSubmit,
  onClose,
}: {
  onSubmit?: (title: string, description: string) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !onSubmit) return;

    setSubmitting(true);
    try {
      await onSubmit(title.trim(), description.trim());
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white border border-[#E8E8E8] rounded-lg shadow-2xl animate-fadeIn">
        <div className="flex items-center justify-between p-6 border-b border-[#E8E8E8]">
          <h3 className="text-base font-bold text-[#1A1A1A]">Submit a Request</h3>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-[#F0F0F0] transition-colors text-[#AAA] hover:text-[#1A1A1A]">
            <svg className="size-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="popup-req-title" className="block text-xs font-medium text-[#777] mb-1.5">
              Title <span className="text-[#CCC]">*</span>
            </label>
            <input
              id="popup-req-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Add announcement bar to homepage"
              className="w-full px-3 py-2.5 text-sm border border-[#E8E8E8] rounded-lg bg-white text-[#1A1A1A] placeholder:text-[#CCC] focus:outline-none focus:border-[#1A1A1A]/50 transition-colors"
              required
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="popup-req-desc" className="block text-xs font-medium text-[#777] mb-1.5">
              Description <span className="text-[#CCC]">(optional)</span>
            </label>
            <textarea
              id="popup-req-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any details, context, or links..."
              rows={3}
              className="w-full px-3 py-2.5 text-sm border border-[#E8E8E8] rounded-lg bg-white text-[#1A1A1A] placeholder:text-[#CCC] focus:outline-none focus:border-[#1A1A1A]/50 transition-colors resize-none"
            />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={!title.trim() || submitting}
              className="flex-1 px-5 py-2.5 text-sm font-semibold bg-[#1A1A1A] text-white rounded-lg hover:bg-[#333] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-[#777] border border-[#E8E8E8] rounded-lg hover:bg-[#F5F5F5] transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
