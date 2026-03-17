"use client";

import { useState, useEffect } from "react";
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
} from "@/lib/portal/types";
import type { DesignReview, DesignReviewVersion, DesignReviewFeedback } from "@/lib/portal/review-types";
import { toLoomEmbed } from "@/lib/portal/loom";
import { toFigmaEmbed } from "@/lib/portal/review-types";

/* ── Tab type ── */
type Tab = "overview" | "timeline" | "updates" | "scope" | "designs" | "wins" | "results" | "requests";

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
        <span className="text-[10px] font-medium text-[#A0A0A0] -mt-0.5">
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
        <span className={`inline-flex items-center justify-center ${s} rounded-full bg-accent text-white`}>
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

function UKTimeBanner() {
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
    <div className="flex items-center gap-2 mb-4">
      <span
        className={`size-2 rounded-full shrink-0 ${
          isOnline ? "bg-emerald-400" : "bg-[#C5C5C5]"
        }`}
      />
      <span className="text-[11px] text-[#7A7A7A]">
        Our team works UK hours (GMT/BST 9am&ndash;6pm) &middot;{" "}
        {isOnline ? "Currently online" : "Currently offline"} &middot; UK time: {ukTime}
      </span>
    </div>
  );
}

/* ── Main Component ── */

export function PortalView({
  portal,
  updates = [],
  approvals = [],
  reviews = [],
  reviewVersions = {},
  reviewFeedback = {},
  onSubmitRequest,
}: {
  portal: PortalData;
  updates?: PortalUpdate[];
  approvals?: PortalApproval[];
  reviews?: DesignReview[];
  reviewVersions?: Record<string, DesignReviewVersion[]>;
  reviewFeedback?: Record<string, DesignReviewFeedback[]>;
  onSubmitRequest?: (title: string, description: string) => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const hasDesigns = reviews.length > 0;

  /* Auto-calculate progress from deliverables */
  const computedProgress = portal.deliverables.length > 0
    ? Math.round(portal.deliverables.filter(d => d.status === "complete").length / portal.deliverables.length * 100)
    : portal.progress;

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "timeline", label: "Timeline" },
    ...(updates.length > 0 ? [{ key: "updates" as Tab, label: "Updates" }] : []),
    { key: "scope", label: "Scope / Deliverables" },
    ...(hasDesigns ? [{ key: "designs" as Tab, label: "Designs" }] : []),
    ...(portal.wins && portal.wins.length > 0 ? [{ key: "wins" as Tab, label: "Wins" }] : []),
    ...(portal.show_results ? [{ key: "results" as Tab, label: "Results" }] : []),
    { key: "requests", label: "Requests" },
  ];

  return (
    <div>
      {/* ── Header ── */}
      <div className="border-b border-[#E5E5EA]">
        <div className="max-w-3xl mx-auto px-6 md:px-12 pt-10 pb-8 md:pt-12 md:pb-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#A0A0A0] mb-3">
            Client Portal
          </p>
          <UKTimeBanner />
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">
            {portal.client_name}
          </h1>
          <p className="text-sm text-[#999999]">
            Start date: {portal.phases[0]?.dates}
          </p>

          {/* Progress track with phase labels */}
          {portal.phases.length > 0 && (() => {
            const currentIdx = portal.phases.findIndex((p) => p.status === "in-progress");
            const completedCount = portal.phases.filter((p) => p.status === "complete").length;
            const currentPhase = currentIdx >= 0 ? portal.phases[currentIdx] : null;
            const phaseNum = currentIdx >= 0 ? currentIdx + 1 : completedCount;

            return (
              <div className="mt-8">
                <div className="flex gap-1">
                  {portal.phases.map((phase) => (
                    <div key={phase.id || phase.name} className="flex-1 min-w-0">
                      <div
                        className={`h-1.5 rounded-full mb-2 ${
                          phase.status === "complete"
                            ? "bg-emerald-400"
                            : phase.status === "in-progress"
                            ? "bg-[#1B1B1B]"
                            : "bg-[#E5E5EA]"
                        }`}
                      />
                      <p
                        className={`text-[10px] md:text-[11px] font-medium truncate ${
                          phase.status === "in-progress"
                            ? "text-[#1B1B1B]"
                            : phase.status === "complete"
                            ? "text-[#999999]"
                            : "text-[#C5C5C5]"
                        }`}
                      >
                        {phase.name}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-[#999999] mt-2">
                  Phase {phaseNum} of {portal.phases.length}
                  {currentPhase ? ` \u2014 ${currentPhase.name}` : completedCount === portal.phases.length ? " \u2014 Complete" : ""}
                </p>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-3xl mx-auto px-6 md:px-12 py-10 md:py-14">
        {/* Tabs */}
        <div className="mb-10 -mx-6 px-6 md:mx-0 md:px-0 overflow-x-auto scrollbar-hide">
          <div className="inline-flex bg-[#F3F3F5] rounded-md p-1 gap-0.5 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 md:px-5 py-2 text-xs md:text-sm font-medium rounded transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.key
                    ? "bg-accent text-white shadow-sm"
                    : "text-[#7A7A7A] hover:text-[#1B1B1B]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div key={activeTab} className="animate-fadeIn">
          {activeTab === "overview" && (
            <OverviewTab portal={portal} />
          )}
          {activeTab === "timeline" && (
            <TimelineTab phases={portal.phases} />
          )}
          {activeTab === "updates" && <UpdatesTab updates={updates} />}
          {activeTab === "scope" && (
            <ScopeTab
              scope={portal.scope}
              documents={portal.documents}
            />
          )}
          {activeTab === "designs" && (
            <DesignsTab
              reviews={reviews}
              reviewVersions={reviewVersions}
              reviewFeedback={reviewFeedback}
              portalToken={portal.token}
              clientName={portal.client_name}
            />
          )}
          {activeTab === "wins" && <WinsTab wins={portal.wins || []} />}
          {activeTab === "results" && portal.show_results && <ResultsTab results={portal.results} />}
          {activeTab === "requests" && (
            <RequestsTab
              requests={portal.ad_hoc_requests || []}
              onSubmit={onSubmitRequest}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Overview Tab ── */

function OverviewTab({
  portal,
}: {
  portal: PortalData;
}) {
  const currentPhase = portal.phases.find((p) => p.status === "in-progress");

  return (
    <div className="space-y-12">
      {/* Welcome Section */}
      <div className="bg-[#F7F8FA] border border-[#E5E5EA] rounded-lg p-6">
        <h3 className="text-sm font-semibold mb-2">Welcome to your project portal</h3>
        <p className="text-xs text-[#7A7A7A] leading-relaxed">
          This is your central hub for tracking project progress. Use the tabs above to view your
          timeline, scope, designs, and any updates from the team. If you have questions, reply to
          any update email or reach out to your project manager.
        </p>
      </div>

      {/* Next Touchpoint + Current Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
        <div className="bg-[#1B1B1B] rounded-lg p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#888] mb-3">
            Next Touchpoint
          </p>
          <p className="text-xl font-bold tracking-tight mb-1 text-white">
            {portal.next_touchpoint?.date || "\u2014"}
          </p>
          <p className="text-sm text-[#999] leading-relaxed">
            {portal.next_touchpoint?.description || "No touchpoint scheduled"}
          </p>
        </div>

        <div className="border border-[#E5E5EA] rounded-lg p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#A0A0A0] mb-3">
            Current Status
          </p>
          <p className="text-xl font-bold tracking-tight mb-1">
            {portal.current_phase}
          </p>
          {currentPhase && (
            <p className="text-sm text-[#7A7A7A] leading-relaxed">
              {currentPhase.description}
            </p>
          )}
        </div>
      </div>

      {/* Project journey */}
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#A0A0A0] mb-5">
          Project Journey
        </h3>
        <div className="border border-[#E5E5EA] rounded-lg divide-y divide-[#EDEDEF]">
          {portal.phases.map((phase) => (
              <div key={phase.id || phase.name} className="flex items-start gap-4 p-4">
                <div className="pt-0.5">
                  {phaseStatusIcon(phase.status, "sm")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-4">
                    <span className={`text-sm font-medium ${phase.status === "upcoming" ? "text-[#BBBBBB]" : ""}`}>
                      {phase.name}
                    </span>
                    <span className="text-xs text-[#A0A0A0] shrink-0">
                      {phase.dates}
                    </span>
                  </div>
                  <p className={`text-xs mt-0.5 leading-relaxed ${phase.status === "upcoming" ? "text-[#C5C5C5]" : "text-[#999999]"}`}>
                    {phase.description}
                  </p>
                </div>
              </div>
          ))}
        </div>
      </div>

      {/* What we're building */}
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#A0A0A0] mb-5">
          What We&apos;re Building
        </h3>
        <div className="border border-[#E5E5EA] rounded-lg p-5">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {portal.scope.map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 py-1">
                <span className="size-1 rounded-full bg-[#C5C5C5] shrink-0" />
                <span className="text-sm text-[#7A7A7A]">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
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
      <div className="absolute left-[11px] top-4 bottom-4 w-px bg-[#E5E5EA]" />

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
                      ? "border-emerald-400 bg-white"
                      : isActive
                      ? "border-[#1B1B1B] bg-white"
                      : "border-[#D4D4D4] bg-white"
                  }`}
                >
                  {isComplete && (
                    <svg className="size-3 text-emerald-400" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {isActive && (
                    <span className="size-2 rounded-full bg-[#1B1B1B] animate-pulse" />
                  )}
                </div>
              </div>

              {/* Content */}
              <div
                className={`flex-1 rounded-lg p-5 transition-all ${
                  isActive
                    ? "ring-1 ring-[#1B1B1B] bg-white"
                    : isComplete
                    ? "ring-1 ring-emerald-300 bg-white"
                    : "bg-[#F7F8FA]"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className={`text-sm font-bold ${!isComplete && !isActive ? "text-[#BBBBBB]" : ""}`}>{phase.name}</h3>
                      {isActive && (
                        <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-[#1B1B1B] text-white rounded-full">
                          Current
                        </span>
                      )}
                      {isComplete && (
                        <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-600 rounded-full">
                          Complete
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#A0A0A0]">
                      {phase.dates}
                      {phase.deadline && (
                        <span className="ml-2 text-[#999999]">
                          &middot; Deadline: {new Date(phase.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <p className={`text-sm leading-relaxed ${(isComplete || isActive) ? "text-[#7A7A7A]" : "text-[#BBBBBB]"} ${pct > 0 ? "mb-3" : ""}`}>
                  {phase.description}
                </p>

                {/* Progress bar */}
                {pct > 0 && (
                  <div className="h-1 rounded-full overflow-hidden bg-[#EBEBEB]">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        isComplete ? "bg-emerald-400" : "bg-[#1B1B1B]"
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
        <div className="inline-flex items-center justify-center size-12 rounded-full bg-[#F3F3F5] mb-4">
          <svg className="size-5 text-[#A0A0A0]" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 3a1 1 0 00-1 1v1a1 1 0 001 1h16a1 1 0 001-1V4a1 1 0 00-1-1H2zM2 7.5h16l-.811 7.71a2 2 0 01-1.99 1.79H4.802a2 2 0 01-1.99-1.79L2 7.5z" />
          </svg>
        </div>
        <p className="text-sm text-[#999999] mb-1">No updates yet</p>
        <p className="text-xs text-[#C5C5C5]">
          Video updates from the team will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {updates.map((update) => (
        <div key={update.id} className="border border-[#E5E5EA] rounded-lg overflow-hidden">
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
          <div className="p-5">
            <div className="flex items-start justify-between gap-3 mb-1">
              <h3 className="text-base font-bold">{update.title}</h3>
              <p className="text-xs text-[#A0A0A0] shrink-0">
                {new Date(update.created_at).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
            {update.description && (
              <p className="text-sm text-[#7A7A7A] leading-relaxed">
                {update.description}
              </p>
            )}
            <p className="text-[11px] text-[#A0A0A0] mt-2">
              Posted by {update.posted_by}
            </p>
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

function ScopeTab({
  scope,
  documents,
}: {
  scope: string[];
  documents: PortalDocument[];
}) {
  const [selected, setSelected] = useState<PortalDocument | null>(null);

  return (
    <div className="space-y-12">
      {/* Scope / Deliverables */}
      {scope.length > 0 && (
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#A0A0A0] mb-5">
            Scope / Deliverables
          </h3>
          <div className="border border-[#E5E5EA] rounded-lg p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
              {scope.map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 py-1">
                  <span className="size-1 rounded-full bg-[#C5C5C5] shrink-0" />
                  <span className="text-sm text-[#7A7A7A]">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Documents */}
      {documents.length > 0 && (
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#A0A0A0] mb-5">
            Key Documents
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {documents.map((doc, i) => (
              <button
                key={i}
                onClick={() => setSelected(doc)}
                className="group text-left border border-[#E5E5EA] rounded-lg p-5 hover:border-[#1B1B1B] hover:shadow-sm transition-all duration-200"
              >
                <div className="flex items-start gap-4">
                  <div className="shrink-0 size-10 rounded-lg bg-[#1B1B1B] text-white flex items-center justify-center text-[10px] font-bold tracking-wider">
                    {typeLabels[doc.type] || "DOC"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold mb-1.5 truncate">
                      {doc.name}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-medium text-[#A0A0A0] uppercase tracking-wider">
                        {doc.type}
                      </span>
                      <span className="text-[#E5E5EA]">&middot;</span>
                      <span className="text-[10px] text-[#A0A0A0]">
                        {doc.date}
                      </span>
                    </div>
                  </div>
                  <svg
                    className="size-4 text-[#C5C5C5] group-hover:text-[#1B1B1B] group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5"
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
        <div className="inline-flex items-center justify-center size-12 rounded-full bg-[#F3F3F5] mb-4">
          <svg className="size-5 text-[#A0A0A0]" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
          </svg>
        </div>
        <p className="text-sm text-[#999999] mb-1">No wins recorded yet</p>
        <p className="text-xs text-[#C5C5C5]">Results and milestones will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="border border-[#E5E5EA] rounded-lg p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#A0A0A0] mb-2">Total Wins</p>
          <p className="text-2xl font-bold tracking-tight text-emerald-500">{wins.length}</p>
        </div>
        <div className="border border-[#E5E5EA] rounded-lg p-5 col-span-1 md:col-span-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#A0A0A0] mb-2">Latest Win</p>
          <p className="text-sm font-semibold">{wins[0]?.title}</p>
          <p className="text-xs text-emerald-500 font-semibold mt-0.5">{wins[0]?.lift}</p>
        </div>
      </div>

      {/* Win cards */}
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#A0A0A0] mb-5">
          All Wins
        </h3>
        <div className="space-y-4">
          {wins.map((win) => (
            <div key={win.id} className="border border-[#E5E5EA] rounded-lg p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h4 className="text-sm font-semibold mb-0.5">{win.title}</h4>
                  <p className="text-xs text-[#999999]">{win.metric} · {win.date}</p>
                </div>
                <span className="shrink-0 px-2.5 py-1 text-xs font-bold text-emerald-600 bg-emerald-50 rounded-full">
                  {win.lift}
                </span>
              </div>
              {/* Before → After bar */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 bg-[#F3F3F5] rounded-lg p-3 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1">Before</p>
                  <p className="text-lg font-bold text-[#999999]">{win.before}</p>
                </div>
                <svg className="size-5 text-emerald-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638l-3.96-4.158a.75.75 0 111.085-1.034l5.25 5.5a.75.75 0 010 1.034l-5.25 5.5a.75.75 0 01-1.085-1.034l3.96-4.158H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                </svg>
                <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 mb-1">After</p>
                  <p className="text-lg font-bold text-emerald-600">{win.after}</p>
                </div>
              </div>
              {win.description && (
                <p className="text-xs text-[#999999] leading-relaxed">{win.description}</p>
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
  const running = results.filter(r => r.status === "running");
  const scheduled = results.filter(r => r.status === "scheduled");
  const completed = results.filter(r => r.status === "winner" || r.status === "loser");

  if (results.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="inline-flex items-center justify-center size-12 rounded-full bg-[#F3F3F5] mb-4">
          <svg className="size-5 text-[#A0A0A0]" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M2 3.75A.75.75 0 012.75 3h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 3.75zm0 4.167a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zm0 4.166a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zm0 4.167a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
          </svg>
        </div>
        <p className="text-sm text-[#999999] mb-1">No tests yet</p>
        <p className="text-xs text-[#C5C5C5]">Results will appear here once testing begins</p>
      </div>
    );
  }

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    running: { label: "Running", color: "text-blue-600", bg: "bg-blue-50" },
    winner: { label: "Winner", color: "text-emerald-600", bg: "bg-emerald-50" },
    loser: { label: "No lift", color: "text-red-500", bg: "bg-red-50" },
    scheduled: { label: "Upcoming", color: "text-amber-600", bg: "bg-amber-50" },
  };

  function TestList({ tests }: { tests: PortalTestResult[] }) {
    return (
      <div className="border border-[#E5E5EA] rounded-lg divide-y divide-[#EDEDEF]">
        {tests.map((test, i) => {
          const config = statusConfig[test.status];
          return (
            <div key={i} className="flex items-center gap-4 p-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium mb-0.5">{test.name}</p>
                <p className="text-xs text-[#999999]">
                  {test.metric} &middot; {test.status === "scheduled" ? `Starts ${test.startDate}` : `Started ${test.startDate}`}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {test.lift && (
                  <span className="text-sm font-semibold text-emerald-500">{test.lift}</span>
                )}
                <span className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-full ${config.color} ${config.bg}`}>
                  {config.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border border-[#E5E5EA] rounded-lg p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#A0A0A0] mb-2">Active Tests</p>
          <p className="text-2xl font-bold tracking-tight">{running.length}</p>
        </div>
        <div className="border border-[#E5E5EA] rounded-lg p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#A0A0A0] mb-2">Winners</p>
          <p className="text-2xl font-bold tracking-tight text-emerald-500">{completed.filter(r => r.status === "winner").length}</p>
        </div>
        <div className="border border-[#E5E5EA] rounded-lg p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#A0A0A0] mb-2">Coming Up</p>
          <p className="text-2xl font-bold tracking-tight text-amber-500">{scheduled.length}</p>
        </div>
      </div>

      {/* Currently Running */}
      {running.length > 0 && (
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#A0A0A0] mb-5">
            Currently Running
          </h3>
          <TestList tests={running} />
        </div>
      )}

      {/* What's Coming Next */}
      {scheduled.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-5">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#A0A0A0]">
              What&apos;s Coming Next
            </h3>
            <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 rounded-full">
              {scheduled.length} planned
            </span>
          </div>
          <TestList tests={scheduled} />
        </div>
      )}

      {/* Completed Tests */}
      {completed.length > 0 && (
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#A0A0A0] mb-5">
            Completed Tests
          </h3>
          <TestList tests={completed} />
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
  // Track selected version per review
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
      <div className="text-center py-20">
        <div className="inline-flex items-center justify-center size-12 rounded-full bg-[#F3F3F5] mb-4">
          <svg className="size-5 text-[#A0A0A0]" viewBox="0 0 15 15" fill="currentColor">
            <path fillRule="evenodd" clipRule="evenodd" d="M7.5 0C5.57 0 4 1.57 4 3.5c0 .62.16 1.2.44 1.7A3.49 3.49 0 003 8.5c0 1.63 1.12 3 2.63 3.38A3.49 3.49 0 007 15a3.5 3.5 0 003.5-3.5V9.95A3.49 3.49 0 0011 3.5C11 1.57 9.43 0 7.5 0zM5 3.5C5 2.12 6.12 1 7.5 1H8v5H7.5A2.5 2.5 0 015 3.5zM7 12v-.5a2.5 2.5 0 112.5-2.5H9v2.5A2 2 0 017 12z" />
          </svg>
        </div>
        <p className="text-sm text-[#999999] mb-1">No designs shared yet</p>
        <p className="text-xs text-[#C5C5C5]">Designs will appear here when they&apos;re ready for review</p>
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
                review.status === "approved" ? "text-emerald-600 bg-emerald-50" :
                review.status === "changes_requested" ? "text-amber-600 bg-amber-50" :
                "text-[#999] bg-[#F3F3F5]"
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
                          ? "bg-[#1B1B1B] text-white border-[#1B1B1B]"
                          : "bg-white text-[#7A7A7A] border-[#E5E5EA] hover:border-[#1B1B1B] hover:text-[#1B1B1B]"
                      }`}
                    >
                      v{v.version_number}
                      {isCurrent && (
                        <span className={`text-[9px] font-semibold uppercase ${isActive ? "text-emerald-300" : "text-emerald-500"}`}>
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
                  <div className="relative w-full rounded-lg overflow-hidden border border-[#E5E5EA]" style={{ paddingBottom: "65%" }}>
                    <iframe
                      src={toFigmaEmbed(activeVersion.figma_url) || ""}
                      className="absolute inset-0 w-full h-full"
                      allowFullScreen
                    />
                  </div>
                )}

                {/* Open in Figma */}
                <a
                  href={activeVersion.figma_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-[#1B1B1B] text-white rounded-lg hover:bg-[#333] transition-colors"
                >
                  <svg className="size-4" viewBox="0 0 15 15" fill="currentColor">
                    <path fillRule="evenodd" clipRule="evenodd" d="M7.5 0C5.57 0 4 1.57 4 3.5c0 .62.16 1.2.44 1.7A3.49 3.49 0 003 8.5c0 1.63 1.12 3 2.63 3.38A3.49 3.49 0 007 15a3.5 3.5 0 003.5-3.5V9.95A3.49 3.49 0 0011 3.5C11 1.57 9.43 0 7.5 0zM5 3.5C5 2.12 6.12 1 7.5 1H8v5H7.5A2.5 2.5 0 015 3.5zM7 12v-.5a2.5 2.5 0 112.5-2.5H9v2.5A2 2 0 017 12z" />
                  </svg>
                  Open in Figma
                  <svg className="size-3 text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                </a>
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
                      fb.action === "approved" ? "bg-emerald-50 border border-emerald-100" : "bg-amber-50 border border-amber-100"
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${fb.action === "approved" ? "text-emerald-600" : "text-amber-600"}`}>
                          {fb.action === "approved" ? "Approved" : "Changes Requested"}
                        </span>
                        <span className="text-[#A0A0A0]">&middot;</span>
                        <span className="text-[#999999]">{fb.submitted_by}</span>
                        <span className="text-[#A0A0A0]">&middot;</span>
                        <span className="text-[#999999]">
                          {new Date(fb.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                      {fb.comment && <p className="text-[#7A7A7A] mt-1">{fb.comment}</p>}
                    </div>
                  ))}
                </div>
              ) : null;
            })()}

            {/* Approve / Request Amends — only on current version */}
            {isCurrentSelected && activeVersion && review.status !== "approved" && (() => {
              const showFb = feedbackState[activeVersion.id]?.show || false;
              return (
                <div className="border border-[#E5E5EA] rounded-lg p-5 mt-5">
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
                        className="w-full px-3 py-2.5 text-sm border border-[#E5E5EA] rounded-lg resize-none h-20 focus:outline-none focus:ring-1 focus:ring-[#1B1B1B]/10 focus:border-[#C5C5C5]"
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleFeedback(review.id, activeVersion.id, "approved")}
                          disabled={submitting === activeVersion.id}
                          className="px-5 py-2.5 text-xs font-semibold bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
                        >
                          {submitting === activeVersion.id ? "Saving..." : "Approve"}
                        </button>
                        <button
                          onClick={() => handleFeedback(review.id, activeVersion.id, "changes_requested")}
                          disabled={submitting === activeVersion.id}
                          className="px-5 py-2.5 text-xs font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
                        >
                          Request Amends
                        </button>
                        <button
                          onClick={() => setFeedbackState(prev => ({ ...prev, [activeVersion.id]: { show: false, comment: "" } }))}
                          className="px-3 py-2.5 text-xs font-medium text-[#A0A0A0] hover:text-[#1B1B1B] transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setFeedbackState(prev => ({ ...prev, [activeVersion.id]: { show: true, comment: "" } }))}
                        className="px-5 py-2.5 text-xs font-semibold bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setFeedbackState(prev => ({ ...prev, [activeVersion.id]: { show: true, comment: "" } }))}
                        className="px-5 py-2.5 text-xs font-semibold border border-[#E5E5EA] text-[#7A7A7A] rounded-lg hover:bg-[#F3F3F5] transition-colors"
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
              <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-100 rounded-lg mt-5">
                <svg className="size-5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-semibold text-emerald-600">This design has been approved</span>
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
          className={`px-2 py-1 text-xs border border-[#E5E5EA] rounded ${compact ? "w-32" : "w-full"}`}
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
            className="px-2 py-1 text-[10px] font-semibold bg-emerald-500 text-white rounded hover:bg-emerald-600 transition-colors"
          >
            Confirm
          </button>
          <button
            onClick={() => setShowComment(false)}
            className="px-2 py-1 text-[10px] font-semibold text-[#A0A0A0] hover:text-[#1B1B1B] transition-colors"
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
      className={`inline-flex items-center gap-1 font-semibold text-emerald-500 hover:text-emerald-600 transition-colors ${
        compact ? "text-[10px] px-2 py-1 border border-emerald-200 rounded" : "text-xs"
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
    setToast("Download coming soon — documents will be linked when your portal goes live");
    setTimeout(() => setToast(""), 3000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-lg shadow-2xl animate-fadeIn">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-[#EDEDEF]">
          <div className="flex items-start gap-4">
            <div className="shrink-0 size-12 rounded-lg bg-[#1B1B1B] text-white flex items-center justify-center text-[11px] font-bold tracking-wider">
              {typeLabels[doc.type] || "DOC"}
            </div>
            <div>
              <h3 className="text-base font-bold mb-1">{doc.name}</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#A0A0A0] uppercase tracking-wider font-medium">
                  {doc.type}
                </span>
                <span className="text-[#E5E5EA]">&middot;</span>
                <span className="text-xs text-[#A0A0A0]">{doc.date}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-[#F3F3F5] transition-colors text-[#A0A0A0] hover:text-[#1B1B1B]"
          >
            <svg className="size-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Document preview placeholder */}
        <div className="p-6">
          <div className="border border-[#E5E5EA] rounded-lg bg-[#F7F8FA] p-8 mb-6">
            <div className="space-y-4">
              <div className="h-3 bg-[#E5E5EA] rounded w-2/3" />
              <div className="space-y-2">
                <div className="h-2 bg-[#EBEBEB] rounded w-full" />
                <div className="h-2 bg-[#EBEBEB] rounded w-5/6" />
                <div className="h-2 bg-[#EBEBEB] rounded w-4/6" />
              </div>
              <div className="h-px bg-[#E5E5EA]" />
              <div className="space-y-2">
                <div className="h-2 bg-[#EBEBEB] rounded w-full" />
                <div className="h-2 bg-[#EBEBEB] rounded w-3/4" />
                <div className="h-2 bg-[#EBEBEB] rounded w-5/6" />
                <div className="h-2 bg-[#EBEBEB] rounded w-2/3" />
              </div>
              <div className="h-px bg-[#E5E5EA]" />
              <div className="space-y-2">
                <div className="h-2 bg-[#EBEBEB] rounded w-full" />
                <div className="h-2 bg-[#EBEBEB] rounded w-4/5" />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-[#1B1B1B] text-white text-sm font-medium rounded-lg hover:bg-[#2A2A3E] transition-colors"
            >
              <svg className="size-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
              </svg>
              Download PDF
            </button>
            <button
              onClick={onClose}
              className="px-5 py-3 text-sm font-medium text-[#7A7A7A] border border-[#E5E5EA] rounded-lg hover:bg-[#F3F3F5] transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 px-5 py-3 bg-[#1B1B1B] text-white text-sm font-medium rounded-full shadow-xl whitespace-nowrap animate-fadeIn">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Requests Tab ── */

function RequestsTab({
  requests,
  onSubmit,
}: {
  requests: AdHocRequest[];
  onSubmit?: (title: string, description: string) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const statusColor = (status: AdHocRequest["status"]) => {
    switch (status) {
      case "open":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "in-progress":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "done":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !onSubmit) return;

    setSubmitting(true);
    try {
      await onSubmit(title.trim(), description.trim());
      setTitle("");
      setDescription("");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-10">
      {/* Submit form */}
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#A0A0A0] mb-5">
          Submit a Request
        </h3>
        <form onSubmit={handleSubmit} className="border border-[#E5E5EA] rounded-lg p-5 space-y-4">
          <div>
            <label htmlFor="req-title" className="block text-xs font-medium text-[#7A7A7A] mb-1.5">
              Title <span className="text-[#C5C5C5]">*</span>
            </label>
            <input
              id="req-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Add announcement bar to homepage"
              className="w-full px-3 py-2.5 text-sm border border-[#E5E5EA] rounded-lg bg-white placeholder:text-[#C5C5C5] focus:outline-none focus:border-[#1B1B1B] transition-colors"
              required
            />
          </div>
          <div>
            <label htmlFor="req-desc" className="block text-xs font-medium text-[#7A7A7A] mb-1.5">
              Description <span className="text-[#C5C5C5]">(optional)</span>
            </label>
            <textarea
              id="req-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any details, context, or links..."
              rows={3}
              className="w-full px-3 py-2.5 text-sm border border-[#E5E5EA] rounded-lg bg-white placeholder:text-[#C5C5C5] focus:outline-none focus:border-[#1B1B1B] transition-colors resize-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={!title.trim() || submitting}
              className="px-5 py-2.5 text-sm font-medium bg-[#1B1B1B] text-white rounded-lg hover:bg-[#1A1A1A] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
            {showSuccess && (
              <span className="text-sm text-emerald-600 font-medium animate-fadeIn">
                Request submitted
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Existing requests */}
      {requests.length > 0 && (
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#A0A0A0] mb-5">
            Your Requests
          </h3>
          <div className="border border-[#E5E5EA] rounded-lg divide-y divide-[#EDEDEF]">
            {requests.map((req) => (
              <div key={req.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1B1B1B]">{req.title}</p>
                    {req.description && (
                      <p className="text-xs text-[#7A7A7A] mt-1 leading-relaxed">
                        {req.description}
                      </p>
                    )}
                    <p className="text-[10px] text-[#A0A0A0] mt-2">
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
        </div>
      )}

      {requests.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-[#A0A0A0]">
            No requests yet. Use the form above to submit your first request.
          </p>
        </div>
      )}
    </div>
  );
}
