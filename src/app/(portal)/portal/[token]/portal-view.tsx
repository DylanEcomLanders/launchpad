"use client";

import { useState } from "react";
import type {
  PortalData,
  PortalPhase,
  PortalDeliverable,
  PortalDocument,
  PhaseStatus,
} from "@/lib/portal-types";

/* ── Tab type ── */
type Tab = "overview" | "timeline" | "deliverables" | "documents";

const tabs: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "timeline", label: "Timeline" },
  { key: "deliverables", label: "Deliverables" },
  { key: "documents", label: "Documents" },
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
        <span className={`inline-flex items-center justify-center ${s} rounded-full bg-[#0A0A0A] text-white`}>
          <svg className={check} viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      );
    case "in-progress":
      return (
        <span className={`inline-flex items-center justify-center ${s} rounded-full border-2 border-[#0A0A0A]`}>
          <span className={`${inner} rounded-full bg-[#0A0A0A] animate-pulse`} />
        </span>
      );
    case "upcoming":
      return (
        <span className={`inline-flex items-center justify-center ${s} rounded-full border-2 border-[#D4D4D4]`} />
      );
  }
}

function deliverableStatusBadge(status: PortalDeliverable["status"]) {
  switch (status) {
    case "complete":
      return (
        <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-[#0A0A0A] text-white rounded-full">
          Done
        </span>
      );
    case "in-progress":
      return (
        <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border border-[#0A0A0A] text-[#0A0A0A] rounded-full">
          Active
        </span>
      );
    case "not-started":
      return (
        <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-[#F5F5F5] text-[#AAAAAA] rounded-full">
          Queued
        </span>
      );
  }
}

/* ── Main Component ── */

export function PortalView({ portal }: { portal: PortalData }) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const totalTasks = portal.phases.reduce((s, p) => s + p.tasks, 0);
  const completedTasks = portal.phases.reduce((s, p) => s + p.completed, 0);

  return (
    <div>
      {/* ── Dark Hero ── */}
      <div className="bg-[#0A0A0A] text-white">
        <div className="max-w-3xl mx-auto px-6 md:px-12 pt-12 pb-14 md:pt-16 md:pb-18">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#666666] mb-4">
            Client Portal
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">
            {portal.clientName}
          </h1>
          <p className="text-[#888888] text-lg">{portal.projectType}</p>
        </div>
      </div>

      {/* ── Horizontal timeline bar ── */}
      <div className="bg-[#0A0A0A] border-b border-[#222222]">
        <div className="max-w-3xl mx-auto px-6 md:px-12 pb-8">
          <div className="flex items-center gap-0">
            {portal.phases.map((phase, i) => {
              const isLast = i === portal.phases.length - 1;
              return (
                <div key={phase.name} className="flex items-center flex-1 min-w-0">
                  {/* Dot */}
                  <div className="flex flex-col items-center gap-1.5 shrink-0">
                    <div
                      className={`size-3 rounded-full border-2 transition-all ${
                        phase.status === "complete"
                          ? "bg-white border-white"
                          : phase.status === "in-progress"
                          ? "bg-transparent border-white"
                          : "bg-transparent border-[#444444]"
                      }`}
                    >
                      {phase.status === "in-progress" && (
                        <span className="block size-full rounded-full bg-white/40 animate-pulse" />
                      )}
                    </div>
                    <span
                      className={`text-[9px] font-medium tracking-wide whitespace-nowrap ${
                        phase.status === "complete" || phase.status === "in-progress"
                          ? "text-[#AAAAAA]"
                          : "text-[#555555]"
                      }`}
                    >
                      {phase.name}
                    </span>
                  </div>
                  {/* Connector line */}
                  {!isLast && (
                    <div className="flex-1 h-px mx-1.5 mb-5">
                      <div
                        className={`h-full ${
                          phase.status === "complete"
                            ? "bg-white/60"
                            : "bg-[#333333]"
                        }`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-3xl mx-auto px-6 md:px-12 py-10 md:py-14">
        {/* Tabs */}
        <div className="mb-10">
          <div className="inline-flex bg-[#F5F5F5] rounded-full p-1 gap-0.5">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                  activeTab === tab.key
                    ? "bg-[#0A0A0A] text-white shadow-sm"
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
              totalTasks={totalTasks}
              completedTasks={completedTasks}
            />
          )}
          {activeTab === "timeline" && <TimelineTab phases={portal.phases} />}
          {activeTab === "deliverables" && (
            <DeliverablesTab
              deliverables={portal.deliverables}
              phases={portal.phases}
            />
          )}
          {activeTab === "documents" && (
            <DocumentsTab documents={portal.documents} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Overview Tab ── */

function OverviewTab({
  portal,
  totalTasks,
  completedTasks,
}: {
  portal: PortalData;
  totalTasks: number;
  completedTasks: number;
}) {
  return (
    <div className="space-y-10">
      {/* Progress + current phase */}
      <div className="flex items-center gap-8 md:gap-12">
        <ProgressRing progress={portal.progress} />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#AAAAAA] mb-1">
            Current Phase
          </p>
          <p className="text-2xl font-bold tracking-tight mb-1">
            {portal.currentPhase}
          </p>
          <p className="text-sm text-[#6B6B6B]">
            {completedTasks} of {totalTasks} deliverables complete
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-px bg-[#E5E5E5] rounded-lg overflow-hidden">
        {[
          { value: portal.phases.length, label: "Phases" },
          { value: totalTasks, label: "Deliverables" },
          { value: portal.documents.length, label: "Documents" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white p-5 text-center">
            <p className="text-3xl font-bold tracking-tight mb-0.5">
              {stat.value}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#AAAAAA]">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Phase list */}
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#AAAAAA] mb-5">
          Phase Breakdown
        </h3>
        <div className="space-y-0 divide-y divide-[#F0F0F0]">
          {portal.phases.map((phase, i) => {
            const pct = phase.tasks > 0 ? Math.round((phase.completed / phase.tasks) * 100) : 0;
            return (
              <div
                key={phase.name}
                className="flex items-center gap-4 py-3.5 group"
              >
                {phaseStatusIcon(phase.status)}
                <span className="text-[#CCCCCC] text-xs font-bold tabular-nums w-5">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className={`text-sm font-medium flex-1 ${
                    phase.status === "upcoming" ? "text-[#BBBBBB]" : ""
                  }`}
                >
                  {phase.name}
                </span>
                {/* Mini progress */}
                <div className="w-16 h-1 bg-[#F0F0F0] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0A0A0A] rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-[#AAAAAA] tabular-nums w-8 text-right">
                  {pct}%
                </span>
                <span className="text-xs text-[#CCCCCC] w-28 text-right">
                  {phase.dates}
                </span>
              </div>
            );
          })}
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
                  className={`size-[23px] rounded-full border-[2.5px] flex items-center justify-center transition-all ${
                    isComplete
                      ? "border-[#0A0A0A] bg-[#0A0A0A]"
                      : isActive
                      ? "border-[#0A0A0A] bg-white"
                      : "border-[#D4D4D4] bg-white"
                  }`}
                >
                  {isComplete && (
                    <svg className="size-3 text-white" viewBox="0 0 12 12" fill="none">
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
                    ? "bg-[#0A0A0A] text-white"
                    : "bg-[#FAFAFA]"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs font-bold tabular-nums ${isActive ? "text-[#666666]" : "text-[#CCCCCC]"}`}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <h3 className="text-sm font-bold">{phase.name}</h3>
                      {isActive && (
                        <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-white text-[#0A0A0A] rounded-full">
                          Current
                        </span>
                      )}
                    </div>
                    <p className={`text-xs ${isActive ? "text-[#888888]" : "text-[#AAAAAA]"}`}>
                      {phase.dates}
                    </p>
                  </div>
                  <span className={`text-lg font-bold tabular-nums ${isActive ? "text-white" : ""}`}>
                    {pct}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className={`h-1.5 rounded-full overflow-hidden ${isActive ? "bg-[#333333]" : "bg-[#E5E5E5]"}`}>
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${isActive ? "bg-white" : "bg-[#0A0A0A]"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className={`text-[11px] mt-2 ${isActive ? "text-[#666666]" : "text-[#AAAAAA]"}`}>
                  {phase.completed} of {phase.tasks} tasks
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Deliverables Tab ── */

function DeliverablesTab({
  deliverables,
  phases,
}: {
  deliverables: PortalDeliverable[];
  phases: PortalPhase[];
}) {
  const phaseNames = phases.map((p) => p.name);

  return (
    <div className="space-y-10">
      {phaseNames.map((phaseName) => {
        const items = deliverables.filter((d) => d.phase === phaseName);
        if (items.length === 0) return null;

        const phase = phases.find((p) => p.name === phaseName)!;
        const pct = phase.tasks > 0 ? Math.round((phase.completed / phase.tasks) * 100) : 0;

        return (
          <div key={phaseName}>
            {/* Phase header */}
            <div className="flex items-center gap-3 mb-4">
              {phaseStatusIcon(phase.status, "sm")}
              <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#6B6B6B]">
                {phaseName}
              </h3>
              <div className="flex-1 h-px bg-[#F0F0F0]" />
              <span className="text-[11px] font-bold text-[#AAAAAA] tabular-nums">
                {phase.completed}/{phase.tasks}
              </span>
            </div>

            {/* Items */}
            <div className="space-y-0 divide-y divide-[#F5F5F5]">
              {items.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3.5 py-3 group hover:bg-[#FAFAFA] -mx-3 px-3 rounded transition-colors"
                >
                  {/* Checkbox */}
                  <span
                    className={`inline-flex items-center justify-center size-[18px] rounded-full border-[1.5px] shrink-0 transition-all ${
                      item.status === "complete"
                        ? "bg-[#0A0A0A] border-[#0A0A0A]"
                        : "border-[#D4D4D4]"
                    }`}
                  >
                    {item.status === "complete" && (
                      <svg className="size-2.5 text-white" viewBox="0 0 12 12" fill="none">
                        <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>

                  {/* Task name */}
                  <span
                    className={`flex-1 text-sm ${
                      item.status === "complete"
                        ? "text-[#BBBBBB] line-through decoration-[#DDDDDD]"
                        : ""
                    }`}
                  >
                    {item.name}
                  </span>

                  {/* Assignee */}
                  <span className="inline-flex items-center justify-center size-6 rounded-full bg-[#0A0A0A] text-[10px] font-bold text-white shrink-0">
                    {item.assignee}
                  </span>

                  {/* Status badge */}
                  {deliverableStatusBadge(item.status)}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Documents Tab ── */

function DocumentsTab({ documents }: { documents: PortalDocument[] }) {
  const [toast, setToast] = useState("");

  function handleClick(doc: PortalDocument) {
    setToast(`Download coming soon`);
    setTimeout(() => setToast(""), 2500);
  }

  const typeLabels: Record<string, string> = {
    Roadmap: "RDM",
    Scope: "SCP",
    Agreement: "AGR",
    "QA Checklist": "QA",
    Other: "DOC",
  };

  return (
    <div>
      {documents.length === 0 ? (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center size-12 rounded-full bg-[#F5F5F5] mb-4">
            <svg className="size-5 text-[#AAAAAA]" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-sm text-[#AAAAAA]">No documents yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {documents.map((doc, i) => (
            <button
              key={i}
              onClick={() => handleClick(doc)}
              className="group text-left border border-[#E5E5E5] rounded-lg p-5 hover:border-[#0A0A0A] hover:shadow-sm transition-all duration-200"
            >
              <div className="flex items-start gap-4">
                {/* Type badge */}
                <div className="shrink-0 size-10 rounded-lg bg-[#0A0A0A] text-white flex items-center justify-center text-[10px] font-bold tracking-wider">
                  {typeLabels[doc.type] || "DOC"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold mb-1.5 truncate group-hover:text-[#0A0A0A]">
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
                {/* Arrow */}
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

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 bg-[#0A0A0A] text-white text-sm font-medium rounded-full shadow-xl z-50 animate-fadeIn">
          {toast}
        </div>
      )}
    </div>
  );
}
