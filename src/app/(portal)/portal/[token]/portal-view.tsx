"use client";

import { useState } from "react";
import type {
  PortalData,
  PortalPhase,
  PortalDocument,
  PortalTestResult,
  PhaseStatus,
} from "@/lib/portal-types";

/* ── Tab type ── */
type Tab = "overview" | "timeline" | "scope" | "results";

const tabs: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "timeline", label: "Timeline" },
  { key: "scope", label: "Scope" },
  { key: "results", label: "Results" },
];

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

/* ── Main Component ── */

export function PortalView({ portal }: { portal: PortalData }) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  return (
    <div>
      {/* ── Header ── */}
      <div className="border-b border-[#E5E5E5]">
        <div className="max-w-3xl mx-auto px-6 md:px-12 pt-10 pb-8 md:pt-12 md:pb-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#AAAAAA] mb-3">
            Client Portal
          </p>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">
            {portal.clientName}
          </h1>
          <p className="text-sm text-[#999999]">
            Start date: {portal.phases[0]?.dates}
          </p>

          {/* Progress track with phase labels */}
          <div className="mt-8">
            <div className="flex gap-1">
              {portal.phases.map((phase) => (
                <div key={phase.name} className="flex-1 min-w-0">
                  <div
                    className={`h-1 rounded-full mb-2 ${
                      phase.status === "complete"
                        ? "bg-emerald-400"
                        : phase.status === "in-progress"
                        ? "bg-[#0A0A0A]"
                        : "bg-[#E5E5E5]"
                    }`}
                  />
                  <p
                    className={`text-[10px] font-medium truncate ${
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
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-3xl mx-auto px-6 md:px-12 py-10 md:py-14">
        {/* Tabs */}
        <div className="mb-10 -mx-6 px-6 md:mx-0 md:px-0 overflow-x-auto">
          <div className="inline-flex bg-[#F5F5F5] rounded-md p-1 gap-0.5 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3.5 md:px-5 py-2 text-sm font-medium rounded transition-all duration-200 whitespace-nowrap ${
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
          {activeTab === "overview" && <OverviewTab portal={portal} />}
          {activeTab === "timeline" && <TimelineTab phases={portal.phases} />}
          {activeTab === "scope" && <ScopeTab scope={portal.scope} documents={portal.documents} />}
          {activeTab === "results" && <ResultsTab results={portal.results} />}
        </div>
      </div>
    </div>
  );
}

/* ── Overview Tab ── */

function OverviewTab({ portal }: { portal: PortalData }) {
  const currentPhase = portal.phases.find((p) => p.status === "in-progress");

  return (
    <div className="space-y-12">
      {/* Status + Next Touchpoint — the two things clients care about most */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Current status card */}
        <div className="border border-[#E5E5E5] rounded-lg p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#AAAAAA] mb-3">
            Current Status
          </p>
          <p className="text-xl font-bold tracking-tight mb-1">
            {portal.currentPhase}
          </p>
          {currentPhase && (
            <p className="text-sm text-[#6B6B6B] leading-relaxed">
              {currentPhase.description}
            </p>
          )}
        </div>

        {/* Next touchpoint card */}
        <div className="border border-[#E5E5E5] rounded-lg p-6 bg-[#FAFAFA]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#AAAAAA] mb-3">
            Next Touchpoint
          </p>
          <p className="text-xl font-bold tracking-tight mb-1">
            {portal.nextTouchpoint.date}
          </p>
          <p className="text-sm text-[#6B6B6B] leading-relaxed">
            {portal.nextTouchpoint.description}
          </p>
        </div>
      </div>

      {/* Project journey */}
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#AAAAAA] mb-5">
          Project Journey
        </h3>
        <div className="border border-[#E5E5E5] rounded-lg divide-y divide-[#F0F0F0]">
          {portal.phases.map((phase) => (
            <div key={phase.name} className="flex items-start gap-4 p-4">
              <div className="pt-0.5">
                {phaseStatusIcon(phase.status, "sm")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-4">
                  <span className={`text-sm font-medium ${phase.status === "upcoming" ? "text-[#BBBBBB]" : ""}`}>
                    {phase.name}
                  </span>
                  <span className="text-xs text-[#AAAAAA] shrink-0">
                    {phase.dates}
                  </span>
                </div>
                <p className={`text-xs mt-0.5 leading-relaxed ${phase.status === "upcoming" ? "text-[#CCCCCC]" : "text-[#999999]"}`}>
                  {phase.description}
                </p>
              </div>
            </div>
          ))}
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

function TimelineTab({ phases }: { phases: PortalPhase[] }) {
  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-[11px] top-4 bottom-4 w-px bg-[#E5E5E5]" />

      <div className="space-y-0">
        {phases.map((phase, i) => {
          const isActive = phase.status === "in-progress";
          const isComplete = phase.status === "complete";
          const pct = phase.tasks > 0 ? Math.round((phase.completed / phase.tasks) * 100) : 0;

          return (
            <div key={phase.name} className="relative flex gap-5 pb-8 last:pb-0">
              {/* Node */}
              <div className="relative z-10 shrink-0 pt-1">
                <div
                  className={`size-[23px] rounded-full border-2 flex items-center justify-center transition-all ${
                    isComplete
                      ? "border-emerald-400 bg-white"
                      : isActive
                      ? "border-[#0A0A0A] bg-white"
                      : "border-[#D4D4D4] bg-white"
                  }`}
                >
                  {isComplete && (
                    <svg className="size-3 text-emerald-400" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {isActive && (
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
                      {isActive && (
                        <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-[#0A0A0A] text-white rounded-full">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#AAAAAA]">
                      {phase.dates}
                    </p>
                  </div>
                </div>

                {/* Phase description */}
                <p className={`text-sm leading-relaxed ${(isComplete || isActive) ? "text-[#6B6B6B]" : "text-[#BBBBBB]"} ${pct > 0 ? "mb-3" : ""}`}>
                  {phase.description}
                </p>

                {/* Progress bar — only show if there's progress */}
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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Scope Tab (merged with Documents) ── */

const typeLabels: Record<string, string> = {
  Roadmap: "RDM",
  Scope: "SCP",
  Agreement: "AGR",
  "QA Checklist": "QA",
  Other: "DOC",
};

function ScopeTab({ scope, documents }: { scope: string[]; documents: PortalDocument[] }) {
  const [selected, setSelected] = useState<PortalDocument | null>(null);

  return (
    <div className="space-y-12">
      {/* Scope items */}
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

      {/* Documents */}
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#AAAAAA] mb-5">
          Key Documents
        </h3>
        {documents.length === 0 ? (
          <p className="text-sm text-[#AAAAAA]">No documents yet</p>
        ) : (
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
        )}
      </div>

      {/* Document preview modal */}
      {selected && (
        <DocumentPreview doc={selected} onClose={() => setSelected(null)} />
      )}
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
            {/* Simulated document lines */}
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
