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
  PhaseStatus,
} from "@/lib/portal/types";
import { toLoomEmbed } from "@/lib/portal/loom";

/* ── Tab type ── */
type Tab = "overview" | "timeline" | "updates" | "scope" | "wins" | "results";

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
          stroke="#E5E5E5"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#0A0A0A"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tracking-tight">{progress}</span>
        <span className="text-[10px] font-medium text-[#AAAAAA] -mt-0.5">
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
          isOnline ? "bg-emerald-400" : "bg-[#CCCCCC]"
        }`}
      />
      <span className="text-[11px] text-[#6B6B6B]">
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
}: {
  portal: PortalData;
  updates?: PortalUpdate[];
  approvals?: PortalApproval[];
}) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [localApprovals, setLocalApprovals] = useState<PortalApproval[]>(approvals);

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "timeline", label: "Timeline" },
    ...(updates.length > 0 ? [{ key: "updates" as Tab, label: "Updates" }] : []),
    { key: "scope", label: "Scope" },
    ...(portal.wins && portal.wins.length > 0 ? [{ key: "wins" as Tab, label: "Wins" }] : []),
    { key: "results", label: "Results" },
  ];

  const handleApprove = async (
    approvalType: "deliverable" | "phase",
    referenceId: string,
    comment: string = ""
  ) => {
    try {
      const res = await fetch("/api/portal/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: portal.token,
          approvalType,
          referenceId,
          approvedBy: portal.client_name || "Client",
          comment,
        }),
      });
      const data = await res.json();
      if (data.approved || data.already_approved) {
        const newApproval: PortalApproval = {
          id: data.approval?.id || data.id || crypto.randomUUID(),
          portal_id: portal.id,
          approval_type: approvalType,
          reference_id: referenceId,
          approved_by: portal.client_name || "Client",
          comment,
          approved_at: new Date().toISOString(),
        };
        setLocalApprovals((prev) => [...prev, newApproval]);
      }
    } catch {
      // Silent — could add toast
    }
  };

  const isApproved = (type: "deliverable" | "phase", refId: string) =>
    localApprovals.some(
      (a) => a.approval_type === type && a.reference_id === refId
    );

  return (
    <div>
      {/* ── Header ── */}
      <div className="border-b border-[#E5E5E5]">
        <div className="max-w-3xl mx-auto px-6 md:px-12 pt-10 pb-8 md:pt-12 md:pb-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#AAAAAA] mb-3">
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
                            ? "bg-[#0A0A0A]"
                            : "bg-[#E5E5E5]"
                        }`}
                      />
                      <p
                        className={`text-[10px] md:text-[11px] font-medium truncate ${
                          phase.status === "in-progress"
                            ? "text-[#0A0A0A]"
                            : phase.status === "complete"
                            ? "text-[#999999]"
                            : "text-[#CCCCCC]"
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
          <div className="inline-flex bg-[#F5F5F5] rounded-md p-1 gap-0.5 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 md:px-5 py-2 text-xs md:text-sm font-medium rounded transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.key
                    ? "bg-accent text-white shadow-sm"
                    : "text-[#6B6B6B] hover:text-[#0A0A0A]"
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
            <OverviewTab
              portal={portal}
              approvals={localApprovals}
              onApprove={handleApprove}
              isApproved={isApproved}
            />
          )}
          {activeTab === "timeline" && (
            <TimelineTab
              phases={portal.phases}
              approvals={localApprovals}
              onApprove={handleApprove}
              isApproved={isApproved}
            />
          )}
          {activeTab === "updates" && <UpdatesTab updates={updates} />}
          {activeTab === "scope" && (
            <ScopeTab
              scope={portal.scope}
              documents={portal.documents}
              deliverables={portal.deliverables}
              approvals={localApprovals}
              onApprove={handleApprove}
              isApproved={isApproved}
            />
          )}
          {activeTab === "wins" && <WinsTab wins={portal.wins || []} />}
          {activeTab === "results" && <ResultsTab results={portal.results} />}
        </div>
      </div>
    </div>
  );
}

/* ── Overview Tab ── */

function OverviewTab({
  portal,
  approvals,
  onApprove,
  isApproved,
}: {
  portal: PortalData;
  approvals: PortalApproval[];
  onApprove: (type: "deliverable" | "phase", refId: string, comment?: string) => void;
  isApproved: (type: "deliverable" | "phase", refId: string) => boolean;
}) {
  const currentPhase = portal.phases.find((p) => p.status === "in-progress");

  // Check for any pending approvals
  const hasPendingApproval = portal.phases.some(
    (p) => (p.status === "complete" || p.status === "in-progress") && !isApproved("phase", p.id)
  );

  return (
    <div className="space-y-12">
      {/* Welcome Section */}
      <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg p-6">
        <h3 className="text-sm font-semibold mb-2">Welcome to your project portal</h3>
        <p className="text-xs text-[#6B6B6B] leading-relaxed">
          This is your central hub for tracking project progress. Use the tabs above to view your
          timeline, scope, and any updates from the team. You can approve deliverables and phases
          directly from here. If you have questions, reply to any update email or reach out to your
          project manager.
        </p>
      </div>

      {/* Next Touchpoint (prominent) + Current Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
        <div className={`border rounded-lg p-6 ${hasPendingApproval ? "border-[#0A0A0A] bg-white" : "border-[#E5E5E5] bg-[#FAFAFA]"}`}>
          {hasPendingApproval && (
            <span className="inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-[#0A0A0A] text-white rounded-full mb-3">
              Your Next Step
            </span>
          )}
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#AAAAAA] mb-3">
            Next Touchpoint
          </p>
          <p className="text-xl font-bold tracking-tight mb-1">
            {portal.next_touchpoint?.date || "\u2014"}
          </p>
          <p className="text-sm text-[#6B6B6B] leading-relaxed">
            {portal.next_touchpoint?.description || "No touchpoint scheduled"}
          </p>
        </div>

        <div className="border border-[#E5E5E5] rounded-lg p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#AAAAAA] mb-3">
            Current Status
          </p>
          <p className="text-xl font-bold tracking-tight mb-1">
            {portal.current_phase}
          </p>
          {currentPhase && (
            <p className="text-sm text-[#6B6B6B] leading-relaxed">
              {currentPhase.description}
            </p>
          )}
        </div>
      </div>

      {/* Project journey */}
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#AAAAAA] mb-5">
          Project Journey
        </h3>
        <div className="border border-[#E5E5E5] rounded-lg divide-y divide-[#F0F0F0]">
          {portal.phases.map((phase) => {
            const phaseApproved = isApproved("phase", phase.id);
            return (
              <div key={phase.id || phase.name} className="flex items-start gap-4 p-4">
                <div className="pt-0.5">
                  {phaseApproved ? (
                    <span className="inline-flex items-center justify-center size-4 rounded-full bg-emerald-500 text-white">
                      <svg className="size-2.5" viewBox="0 0 12 12" fill="none">
                        <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  ) : (
                    phaseStatusIcon(phase.status, "sm")
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${phase.status === "upcoming" ? "text-[#BBBBBB]" : ""}`}>
                        {phase.name}
                      </span>
                      {phaseApproved && (
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-emerald-500">
                          Signed off
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[#AAAAAA] shrink-0">
                      {phase.dates}
                    </span>
                  </div>
                  <p className={`text-xs mt-0.5 leading-relaxed ${phase.status === "upcoming" ? "text-[#CCCCCC]" : "text-[#999999]"}`}>
                    {phase.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* What we're building */}
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#AAAAAA] mb-5">
          What We&apos;re Building
        </h3>
        <div className="border border-[#E5E5E5] rounded-lg p-5">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {portal.scope.map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 py-1">
                <span className="size-1 rounded-full bg-[#CCCCCC] shrink-0" />
                <span className="text-sm text-[#6B6B6B]">{item}</span>
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
  approvals,
  onApprove,
  isApproved,
}: {
  phases: PortalPhase[];
  approvals: PortalApproval[];
  onApprove: (type: "deliverable" | "phase", refId: string, comment?: string) => void;
  isApproved: (type: "deliverable" | "phase", refId: string) => boolean;
}) {
  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-[11px] top-4 bottom-4 w-px bg-[#E5E5E5]" />

      <div className="space-y-0">
        {phases.map((phase) => {
          const isActive = phase.status === "in-progress";
          const isComplete = phase.status === "complete";
          const pct = phase.tasks > 0 ? Math.round((phase.completed / phase.tasks) * 100) : 0;
          const phaseApproved = isApproved("phase", phase.id);

          return (
            <div key={phase.id || phase.name} className="relative flex gap-5 pb-8 last:pb-0">
              {/* Node */}
              <div className="relative z-10 shrink-0 pt-1">
                <div
                  className={`size-[23px] rounded-full border-2 flex items-center justify-center transition-all ${
                    phaseApproved
                      ? "border-emerald-400 bg-emerald-50"
                      : isComplete
                      ? "border-emerald-400 bg-white"
                      : isActive
                      ? "border-[#0A0A0A] bg-white"
                      : "border-[#D4D4D4] bg-white"
                  }`}
                >
                  {(isComplete || phaseApproved) && (
                    <svg className="size-3 text-emerald-400" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {isActive && !phaseApproved && (
                    <span className="size-2 rounded-full bg-[#0A0A0A] animate-pulse" />
                  )}
                </div>
              </div>

              {/* Content */}
              <div
                className={`flex-1 rounded-lg p-5 transition-all ${
                  isActive
                    ? "ring-1 ring-[#0A0A0A] bg-white"
                    : isComplete
                    ? "ring-1 ring-emerald-300 bg-white"
                    : "bg-[#FAFAFA]"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className={`text-sm font-bold ${!isComplete && !isActive ? "text-[#BBBBBB]" : ""}`}>{phase.name}</h3>
                      {isActive && !phaseApproved && (
                        <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-[#0A0A0A] text-white rounded-full">
                          Current
                        </span>
                      )}
                      {phaseApproved && (
                        <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-600 rounded-full">
                          Signed Off
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#AAAAAA]">
                      {phase.dates}
                    </p>
                  </div>
                </div>

                <p className={`text-sm leading-relaxed ${(isComplete || isActive) ? "text-[#6B6B6B]" : "text-[#BBBBBB]"} ${pct > 0 ? "mb-3" : ""}`}>
                  {phase.description}
                </p>

                {/* Progress bar */}
                {pct > 0 && (
                  <div className="h-1 rounded-full overflow-hidden bg-[#EBEBEB]">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        isComplete ? "bg-emerald-400" : "bg-[#0A0A0A]"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}

                {/* Phase sign-off button */}
                {(isComplete || isActive) && !phaseApproved && (
                  <div className="mt-4 pt-3 border-t border-[#F0F0F0]">
                    <ApproveButton
                      label="Sign off on this phase"
                      onApprove={(comment) => onApprove("phase", phase.id, comment)}
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
        <div className="inline-flex items-center justify-center size-12 rounded-full bg-[#F5F5F5] mb-4">
          <svg className="size-5 text-[#AAAAAA]" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 3a1 1 0 00-1 1v1a1 1 0 001 1h16a1 1 0 001-1V4a1 1 0 00-1-1H2zM2 7.5h16l-.811 7.71a2 2 0 01-1.99 1.79H4.802a2 2 0 01-1.99-1.79L2 7.5z" />
          </svg>
        </div>
        <p className="text-sm text-[#999999] mb-1">No updates yet</p>
        <p className="text-xs text-[#CCCCCC]">
          Video updates from the team will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {updates.map((update) => (
        <div key={update.id} className="border border-[#E5E5E5] rounded-lg overflow-hidden">
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
              <p className="text-xs text-[#AAAAAA] shrink-0">
                {new Date(update.created_at).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
            {update.description && (
              <p className="text-sm text-[#6B6B6B] leading-relaxed">
                {update.description}
              </p>
            )}
            <p className="text-[11px] text-[#AAAAAA] mt-2">
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
  deliverables,
  approvals,
  onApprove,
  isApproved,
}: {
  scope: string[];
  documents: PortalDocument[];
  deliverables: PortalData["deliverables"];
  approvals: PortalApproval[];
  onApprove: (type: "deliverable" | "phase", refId: string, comment?: string) => void;
  isApproved: (type: "deliverable" | "phase", refId: string) => boolean;
}) {
  const [selected, setSelected] = useState<PortalDocument | null>(null);

  // Group deliverables by phase
  const phaseGroups = deliverables.reduce((acc, del) => {
    const phase = del.phase || "Other";
    if (!acc[phase]) acc[phase] = [];
    acc[phase].push(del);
    return acc;
  }, {} as Record<string, typeof deliverables>);

  return (
    <div className="space-y-12">
      {/* Scope items */}
      {scope.length > 0 && (
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#AAAAAA] mb-5">
            What&apos;s Included
          </h3>
          <div className="border border-[#E5E5E5] rounded-lg p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
              {scope.map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 py-1">
                  <span className="size-1 rounded-full bg-[#CCCCCC] shrink-0" />
                  <span className="text-sm text-[#6B6B6B]">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Deliverables with approval */}
      {deliverables.length > 0 && (
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#AAAAAA] mb-5">
            Deliverables
          </h3>
          <div className="space-y-6">
            {Object.entries(phaseGroups).map(([phaseName, dels]) => (
              <div key={phaseName}>
                <p className="text-xs font-semibold text-[#6B6B6B] mb-2">
                  {phaseName}
                </p>
                <div className="border border-[#E5E5E5] rounded-lg divide-y divide-[#F0F0F0]">
                  {dels.map((del) => {
                    const approved = isApproved("deliverable", del.id);
                    return (
                      <div
                        key={del.id}
                        className="flex items-center gap-3 p-3"
                      >
                        {approved ? (
                          <span className="size-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                            <svg
                              className="size-3 text-emerald-600"
                              viewBox="0 0 12 12"
                              fill="none"
                            >
                              <path
                                d="M2.5 6L5 8.5L9.5 3.5"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </span>
                        ) : (
                          <span
                            className={`size-2 rounded-full shrink-0 ${
                              del.status === "complete"
                                ? "bg-emerald-400"
                                : del.status === "in-progress"
                                ? "bg-blue-400"
                                : "bg-[#D4D4D4]"
                            }`}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-medium ${
                              approved ? "text-[#999999]" : ""
                            }`}
                          >
                            {del.name}
                          </p>
                          <p className="text-[11px] text-[#AAAAAA]">
                            {del.assignee}
                            {approved && " · Approved"}
                          </p>
                        </div>
                        {(del.status === "complete" ||
                          del.status === "in-progress") &&
                          !approved && (
                            <ApproveButton
                              label="Approve"
                              compact
                              onApprove={(comment) =>
                                onApprove("deliverable", del.id, comment)
                              }
                            />
                          )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents */}
      {documents.length > 0 && (
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#AAAAAA] mb-5">
            Key Documents
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {documents.map((doc, i) => (
              <button
                key={i}
                onClick={() => setSelected(doc)}
                className="group text-left border border-[#E5E5E5] rounded-lg p-5 hover:border-[#0A0A0A] hover:shadow-sm transition-all duration-200"
              >
                <div className="flex items-start gap-4">
                  <div className="shrink-0 size-10 rounded-lg bg-[#0A0A0A] text-white flex items-center justify-center text-[10px] font-bold tracking-wider">
                    {typeLabels[doc.type] || "DOC"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold mb-1.5 truncate">
                      {doc.name}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-medium text-[#AAAAAA] uppercase tracking-wider">
                        {doc.type}
                      </span>
                      <span className="text-[#E5E5E5]">&middot;</span>
                      <span className="text-[10px] text-[#AAAAAA]">
                        {doc.date}
                      </span>
                    </div>
                  </div>
                  <svg
                    className="size-4 text-[#CCCCCC] group-hover:text-[#0A0A0A] group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5"
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
        <div className="inline-flex items-center justify-center size-12 rounded-full bg-[#F5F5F5] mb-4">
          <svg className="size-5 text-[#AAAAAA]" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
          </svg>
        </div>
        <p className="text-sm text-[#999999] mb-1">No wins recorded yet</p>
        <p className="text-xs text-[#CCCCCC]">Results and milestones will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="border border-[#E5E5E5] rounded-lg p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#AAAAAA] mb-2">Total Wins</p>
          <p className="text-2xl font-bold tracking-tight text-emerald-500">{wins.length}</p>
        </div>
        <div className="border border-[#E5E5E5] rounded-lg p-5 col-span-1 md:col-span-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#AAAAAA] mb-2">Latest Win</p>
          <p className="text-sm font-semibold">{wins[0]?.title}</p>
          <p className="text-xs text-emerald-500 font-semibold mt-0.5">{wins[0]?.lift}</p>
        </div>
      </div>

      {/* Win cards */}
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#AAAAAA] mb-5">
          All Wins
        </h3>
        <div className="space-y-4">
          {wins.map((win) => (
            <div key={win.id} className="border border-[#E5E5E5] rounded-lg p-5">
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
                <div className="flex-1 bg-[#F5F5F5] rounded-lg p-3 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA] mb-1">Before</p>
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
  if (results.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="inline-flex items-center justify-center size-12 rounded-full bg-[#F5F5F5] mb-4">
          <svg className="size-5 text-[#AAAAAA]" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M2 3.75A.75.75 0 012.75 3h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 3.75zm0 4.167a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zm0 4.166a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zm0 4.167a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
          </svg>
        </div>
        <p className="text-sm text-[#999999] mb-1">No tests yet</p>
        <p className="text-xs text-[#CCCCCC]">Results will appear here once testing begins</p>
      </div>
    );
  }

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    running: { label: "Running", color: "text-blue-600", bg: "bg-blue-50" },
    winner: { label: "Winner", color: "text-emerald-600", bg: "bg-emerald-50" },
    loser: { label: "No lift", color: "text-red-500", bg: "bg-red-50" },
    scheduled: { label: "Scheduled", color: "text-[#999999]", bg: "bg-[#F5F5F5]" },
  };

  return (
    <div className="space-y-10">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border border-[#E5E5E5] rounded-lg p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#AAAAAA] mb-2">Active Tests</p>
          <p className="text-2xl font-bold tracking-tight">{results.filter(r => r.status === "running").length}</p>
        </div>
        <div className="border border-[#E5E5E5] rounded-lg p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#AAAAAA] mb-2">Winners</p>
          <p className="text-2xl font-bold tracking-tight text-emerald-500">{results.filter(r => r.status === "winner").length}</p>
        </div>
        <div className="border border-[#E5E5E5] rounded-lg p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#AAAAAA] mb-2">Scheduled</p>
          <p className="text-2xl font-bold tracking-tight">{results.filter(r => r.status === "scheduled").length}</p>
        </div>
      </div>

      {/* Test list */}
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#AAAAAA] mb-5">
          All Tests
        </h3>
        <div className="border border-[#E5E5E5] rounded-lg divide-y divide-[#F0F0F0]">
          {results.map((test, i) => {
            const config = statusConfig[test.status];
            return (
              <div key={i} className="flex items-center gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium mb-0.5">{test.name}</p>
                  <p className="text-xs text-[#999999]">
                    {test.metric} · Started {test.startDate}
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
      </div>
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
          className={`px-2 py-1 text-xs border border-[#E5E5E5] rounded ${compact ? "w-32" : "w-full"}`}
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
            className="px-2 py-1 text-[10px] font-semibold text-[#AAAAAA] hover:text-[#0A0A0A] transition-colors"
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
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl animate-fadeIn">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-[#F0F0F0]">
          <div className="flex items-start gap-4">
            <div className="shrink-0 size-12 rounded-lg bg-[#0A0A0A] text-white flex items-center justify-center text-[11px] font-bold tracking-wider">
              {typeLabels[doc.type] || "DOC"}
            </div>
            <div>
              <h3 className="text-base font-bold mb-1">{doc.name}</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#AAAAAA] uppercase tracking-wider font-medium">
                  {doc.type}
                </span>
                <span className="text-[#E5E5E5]">&middot;</span>
                <span className="text-xs text-[#AAAAAA]">{doc.date}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-[#F5F5F5] transition-colors text-[#AAAAAA] hover:text-[#0A0A0A]"
          >
            <svg className="size-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Document preview placeholder */}
        <div className="p-6">
          <div className="border border-[#E5E5E5] rounded-lg bg-[#FAFAFA] p-8 mb-6">
            <div className="space-y-4">
              <div className="h-3 bg-[#E5E5E5] rounded w-2/3" />
              <div className="space-y-2">
                <div className="h-2 bg-[#EBEBEB] rounded w-full" />
                <div className="h-2 bg-[#EBEBEB] rounded w-5/6" />
                <div className="h-2 bg-[#EBEBEB] rounded w-4/6" />
              </div>
              <div className="h-px bg-[#E5E5E5]" />
              <div className="space-y-2">
                <div className="h-2 bg-[#EBEBEB] rounded w-full" />
                <div className="h-2 bg-[#EBEBEB] rounded w-3/4" />
                <div className="h-2 bg-[#EBEBEB] rounded w-5/6" />
                <div className="h-2 bg-[#EBEBEB] rounded w-2/3" />
              </div>
              <div className="h-px bg-[#E5E5E5]" />
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
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-[#0A0A0A] text-white text-sm font-medium rounded-lg hover:bg-[#2A2A2A] transition-colors"
            >
              <svg className="size-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
              </svg>
              Download PDF
            </button>
            <button
              onClick={onClose}
              className="px-5 py-3 text-sm font-medium text-[#6B6B6B] border border-[#E5E5E5] rounded-lg hover:bg-[#F5F5F5] transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 px-5 py-3 bg-[#0A0A0A] text-white text-sm font-medium rounded-full shadow-xl whitespace-nowrap animate-fadeIn">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
