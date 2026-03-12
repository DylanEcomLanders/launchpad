"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { inputClass, labelClass } from "@/lib/form-styles";
import { DecorativeBlocks } from "@/components/decorative-blocks";
import {
  MagnifyingGlassIcon,
  DocumentDuplicateIcon,
  BookmarkIcon,
  ChevronDownIcon,
  TrashIcon,
  ArrowPathIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import {
  getBrandProfiles,
  createBrandProfile,
  deleteBrandProfile,
} from "@/lib/brand-profiles/data";
import type { BrandProfile } from "@/lib/brand-profiles/types";

// ── Section metadata for report rendering ───────────────────────

const SECTION_META = [
  { label: "Product Deep Dive", border: "border-l-blue-500", headerBg: "bg-blue-50" },
  { label: "Customer Voice & Language Bank", border: "border-l-amber-500", headerBg: "bg-amber-50" },
  { label: "Competitor & Market Intel", border: "border-l-emerald-500", headerBg: "bg-emerald-50" },
  { label: "Objection Handling Framework", border: "border-l-red-500", headerBg: "bg-red-50" },
  { label: "Messaging Direction", border: "border-l-violet-500", headerBg: "bg-violet-50" },
  { label: "CRO & Page Structure Notes", border: "border-l-orange-500", headerBg: "bg-orange-50" },
];

// ── Types ───────────────────────────────────────────────────────

interface ResearchStep {
  id: string;
  label: string;
  icon: string;
  status: "loading" | "done" | "empty" | "error";
  resultCount?: number;
}

// ── Page Component ──────────────────────────────────────────────

export default function ResearchPage() {
  // Input
  const [projectName, setProjectName] = useState("");
  const [brief, setBrief] = useState("");

  // Research state
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<ResearchStep[]>([]);
  const [analysisStarted, setAnalysisStarted] = useState(false);
  const [analysisMessage, setAnalysisMessage] = useState("");
  const [streamText, setStreamText] = useState("");
  const [fullReport, setFullReport] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Saved profiles
  const [savedProfiles, setSavedProfiles] = useState<BrandProfile[]>([]);
  const [showSaved, setShowSaved] = useState(false);

  // Report sections
  const [collapsedSections, setCollapsedSections] = useState<Set<number>>(new Set());

  // Refs
  const abortRef = useRef<AbortController | null>(null);
  const streamRef = useRef("");
  const streamDisplayRef = useRef<HTMLDivElement>(null);

  // Copy feedback
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load saved profiles on mount
  useEffect(() => {
    getBrandProfiles().then(setSavedProfiles).catch(() => {});
  }, []);

  // Auto-scroll stream display
  useEffect(() => {
    if (streamDisplayRef.current && analysisStarted && !isComplete) {
      streamDisplayRef.current.scrollTop = streamDisplayRef.current.scrollHeight;
    }
  }, [streamText, analysisStarted, isComplete]);

  // ── SSE Event Handler ───────────────────────────────────────

  const handleSSEEvent = useCallback(
    (event: string, data: Record<string, unknown>) => {
      switch (event) {
        case "step_start":
          setSteps((prev) => [
            ...prev,
            {
              id: data.id as string,
              label: data.label as string,
              icon: data.icon as string,
              status: "loading",
            },
          ]);
          break;
        case "step_done":
          setSteps((prev) =>
            prev.map((s) =>
              s.id === data.id
                ? { ...s, status: "done" as const, resultCount: data.resultCount as number }
                : s
            )
          );
          break;
        case "step_empty":
          setSteps((prev) =>
            prev.map((s) => (s.id === data.id ? { ...s, status: "empty" as const } : s))
          );
          break;
        case "step_error":
          setSteps((prev) =>
            prev.map((s) => (s.id === data.id ? { ...s, status: "error" as const } : s))
          );
          break;
        case "analysis_start":
          setAnalysisStarted(true);
          setAnalysisMessage(data.message as string);
          break;
        case "text_chunk":
          streamRef.current += data.text as string;
          setStreamText(streamRef.current);
          break;
        case "research_complete":
          setFullReport(streamRef.current);
          setIsComplete(true);
          break;
        case "app_error":
          setError(data.message as string);
          break;
      }
    },
    []
  );

  // ── Start Research ──────────────────────────────────────────

  async function startResearch() {
    setIsRunning(true);
    setStreamText("");
    streamRef.current = "";
    setFullReport("");
    setIsComplete(false);
    setError(null);
    setAnalysisStarted(false);
    setAnalysisMessage("");
    setCopied(false);
    setSaved(false);
    setCollapsedSections(new Set());
    setSteps([]);

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/research/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: projectName.trim(),
          brief: brief.trim(),
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Failed to start research" }));
        throw new Error(err.error || "Failed to start research");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        while (buffer.includes("\n\n")) {
          const eventEnd = buffer.indexOf("\n\n");
          const rawEvent = buffer.slice(0, eventEnd);
          buffer = buffer.slice(eventEnd + 2);

          let eventName = "";
          let eventData = "";
          for (const line of rawEvent.split("\n")) {
            if (line.startsWith("event: ")) eventName = line.slice(7);
            else if (line.startsWith("data: ")) eventData = line.slice(6);
          }

          if (eventName && eventData) {
            try {
              handleSSEEvent(eventName, JSON.parse(eventData));
            } catch {
              // skip malformed
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message || "Research failed");
      }
    } finally {
      setIsRunning(false);
    }
  }

  function cancelResearch() {
    abortRef.current?.abort();
    setIsRunning(false);
  }

  // ── Actions ─────────────────────────────────────────────────

  async function copyReport() {
    await navigator.clipboard.writeText(fullReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function saveProfile() {
    try {
      const profile = await createBrandProfile({
        project_name: projectName.trim() || brief.split("\n")[0].slice(0, 60),
        brand_url: "",
        pain_points: [],
        desires: [],
        objections: [],
        language_pulls: [],
        raw_report: fullReport,
        last_researched: new Date().toISOString(),
      });
      setSavedProfiles((prev) => [profile, ...prev]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Failed to save profile");
    }
  }

  async function deleteProfile(id: string) {
    await deleteBrandProfile(id);
    setSavedProfiles((prev) => prev.filter((p) => p.id !== id));
  }

  function loadProfile(profile: BrandProfile) {
    setProjectName(profile.project_name);
    setBrief("");
    setFullReport(profile.raw_report);
    streamRef.current = profile.raw_report;
    setStreamText(profile.raw_report);
    setIsComplete(true);
    setIsRunning(false);
    setError(null);
    setCollapsedSections(new Set());
    setShowSaved(false);
  }

  function newResearch() {
    setProjectName("");
    setBrief("");
    setStreamText("");
    streamRef.current = "";
    setFullReport("");
    setIsComplete(false);
    setIsRunning(false);
    setError(null);
    setAnalysisStarted(false);
    setAnalysisMessage("");
    setSteps([]);
    setCopied(false);
    setSaved(false);
    setCollapsedSections(new Set());
  }

  // ── Report Section Parsing ──────────────────────────────────

  function parseReportSections(report: string): string[] {
    const sections = report.split(/(?=^## \d+\.)/m).filter((s) => s.trim());
    const sectionStart = sections.findIndex((s) => /^## \d+\./.test(s));
    return sectionStart >= 0 ? sections.slice(sectionStart) : sections;
  }

  function toggleSection(idx: number) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  // ── Progress helpers ────────────────────────────────────────

  const completedSteps = steps.filter(
    (s) => s.status === "done" || s.status === "empty" || s.status === "error"
  ).length;
  const totalSteps = steps.length;
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  // ── Render ──────────────────────────────────────────────────

  const reportSections = isComplete ? parseReportSections(fullReport) : [];

  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-12 py-12 md:py-20">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">
              Research & Intel
            </h1>
            <p className="text-sm text-[#6B6B6B]">
              Paste a client brief — get deep strategic research for the page build
            </p>
          </div>
          {savedProfiles.length > 0 && (
            <button
              onClick={() => setShowSaved(!showSaved)}
              className="text-xs font-medium text-[#6B6B6B] hover:text-[#0A0A0A] px-3 py-1.5 border border-[#E5E5E5] rounded-md hover:border-[#0A0A0A] transition-colors"
            >
              Saved ({savedProfiles.length})
            </button>
          )}
        </div>

        {/* Saved Profiles Panel */}
        {showSaved && savedProfiles.length > 0 && (
          <div className="bg-white border border-[#E5E5E5] rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">
                Saved Research
              </h3>
              <button onClick={() => setShowSaved(false)}>
                <XMarkIcon className="size-4 text-[#AAAAAA] hover:text-[#0A0A0A]" />
              </button>
            </div>
            <div className="space-y-2">
              {savedProfiles.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-2 px-3 bg-[#F7F7F8] rounded-md"
                >
                  <div>
                    <span className="text-sm font-medium text-[#0A0A0A]">
                      {p.project_name}
                    </span>
                    <span className="text-[11px] text-[#AAAAAA] ml-2">
                      {new Date(p.last_researched).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => loadProfile(p)}
                      className="text-[11px] font-medium text-[#6B6B6B] hover:text-[#0A0A0A] px-2 py-1 border border-[#E5E5E5] rounded hover:border-[#0A0A0A] transition-colors"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => deleteProfile(p.id)}
                      className="p-1 text-[#CCCCCC] hover:text-red-500 transition-colors"
                    >
                      <TrashIcon className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input Form */}
        <div className="bg-white border border-[#E5E5E5] rounded-lg p-5 mb-6">
          {/* Project name */}
          <div className="mb-4">
            <label className={labelClass}>Project Name</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. AntiApex Defender, Kyoku Knives, Hydra Bottle"
              className={inputClass}
              disabled={isRunning}
            />
          </div>

          {/* Brief textarea */}
          <div className="mb-4">
            <label className={labelClass}>Client Brief</label>
            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder={`Paste the full client brief here...\n\nInclude product URLs, goals, target audience, known objections, competitor info — the more detail, the better the research.`}
              className={`${inputClass} min-h-[200px] resize-y`}
              rows={10}
              disabled={isRunning}
            />
            <p className="text-[11px] text-[#AAAAAA] mt-1.5">
              Include product links, goals, objections, and any context — Claude will extract what it needs
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!isRunning ? (
              <button
                onClick={startResearch}
                disabled={!brief.trim() || brief.trim().length < 20}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#0A0A0A] text-white text-sm font-medium rounded-md hover:bg-[#1a1a1a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <MagnifyingGlassIcon className="size-4" />
                Run Research
              </button>
            ) : (
              <button
                onClick={cancelResearch}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-md hover:bg-red-600 transition-colors"
              >
                <XMarkIcon className="size-4" />
                Cancel
              </button>
            )}

            {isComplete && (
              <button
                onClick={newResearch}
                className="inline-flex items-center gap-2 px-4 py-2 border border-[#E5E5E5] text-sm font-medium rounded-md hover:border-[#0A0A0A] transition-colors"
              >
                <ArrowPathIcon className="size-4" />
                New Research
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800 font-medium">Research failed</p>
            <p className="text-xs text-red-600 mt-1">{error}</p>
          </div>
        )}

        {/* Progress */}
        {isRunning && steps.length > 0 && (
          <div className="bg-white border border-[#E5E5E5] rounded-lg p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">
                Researching
              </span>
              <span className="text-[11px] text-[#AAAAAA] tabular-nums">
                {completedSteps} / {totalSteps} steps
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-[#F0F0F0] rounded-full mb-4 overflow-hidden">
              <div
                className="h-full bg-[#0A0A0A] rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Step rows */}
            <div className="space-y-2">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className="flex items-center justify-between py-1.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{step.icon}</span>
                    <span className="text-sm text-[#6B6B6B]">{step.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] ${
                        step.status === "done"
                          ? "text-emerald-600"
                          : step.status === "loading"
                            ? "text-amber-500"
                            : step.status === "empty"
                              ? "text-[#AAAAAA]"
                              : "text-red-500"
                      }`}
                    >
                      {step.status === "loading" && "Searching..."}
                      {step.status === "done" &&
                        `${step.resultCount} result${step.resultCount !== 1 ? "s" : ""}`}
                      {step.status === "empty" && "No results"}
                      {step.status === "error" && "Failed"}
                    </span>
                    <span
                      className={`size-2 rounded-full ${
                        step.status === "done"
                          ? "bg-emerald-500"
                          : step.status === "loading"
                            ? "bg-amber-400 animate-pulse"
                            : step.status === "empty"
                              ? "bg-[#CCCCCC]"
                              : "bg-red-500"
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Analysis status */}
            {analysisStarted && !isComplete && (
              <div className="mt-4 pt-4 border-t border-[#E5E5E5]">
                <div className="flex items-center gap-2">
                  <div className="size-2 bg-violet-400 rounded-full animate-pulse" />
                  <span className="text-xs text-[#6B6B6B]">{analysisMessage}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stream Display (during analysis) */}
        {analysisStarted && !isComplete && streamText && (
          <div
            className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4 mb-6 max-h-72 overflow-y-auto"
            ref={streamDisplayRef}
          >
            <pre className="text-xs text-[#CCCCCC] font-mono whitespace-pre-wrap leading-relaxed">
              {streamText}
              <span className="animate-pulse text-white">▊</span>
            </pre>
          </div>
        )}

        {/* Action Buttons */}
        {isComplete && (
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={copyReport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E5E5] rounded-md text-xs font-medium text-[#6B6B6B] hover:border-[#0A0A0A] hover:text-[#0A0A0A] transition-colors"
            >
              <DocumentDuplicateIcon className="size-3.5" />
              {copied ? "Copied!" : "Copy Report"}
            </button>
            <button
              onClick={saveProfile}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E5E5] rounded-md text-xs font-medium text-[#6B6B6B] hover:border-[#0A0A0A] hover:text-[#0A0A0A] transition-colors"
            >
              <BookmarkIcon className="size-3.5" />
              {saved ? "Saved!" : "Save Research"}
            </button>
            <button
              onClick={newResearch}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E5E5] rounded-md text-xs font-medium text-[#6B6B6B] hover:border-[#0A0A0A] hover:text-[#0A0A0A] transition-colors"
            >
              <ArrowPathIcon className="size-3.5" />
              New Research
            </button>
          </div>
        )}

        {/* Report Sections */}
        {isComplete && reportSections.length > 0 && (
          <div className="space-y-3">
            {reportSections.map((section, idx) => {
              const meta = SECTION_META[idx] || {
                label: `Section ${idx + 1}`,
                border: "border-l-gray-400",
                headerBg: "bg-gray-50",
              };
              const isCollapsed = collapsedSections.has(idx);

              const firstLine = section.split("\n")[0] || "";
              const titleMatch = firstLine.match(/^## \d+\.\s*(.+)/);
              const title = titleMatch ? titleMatch[1] : meta.label;

              const body = section.split("\n").slice(1).join("\n").trim();

              return (
                <div
                  key={idx}
                  className={`bg-white border border-[#E5E5E5] border-l-4 ${meta.border} rounded-lg overflow-hidden`}
                >
                  <button
                    onClick={() => toggleSection(idx)}
                    className={`w-full flex items-center justify-between px-5 py-3.5 text-left ${meta.headerBg} hover:brightness-95 transition-all`}
                  >
                    <span className="text-sm font-semibold text-[#0A0A0A]">
                      {title}
                    </span>
                    <ChevronDownIcon
                      className={`size-4 text-[#6B6B6B] transition-transform duration-200 ${
                        isCollapsed ? "-rotate-90" : ""
                      }`}
                    />
                  </button>
                  {!isCollapsed && (
                    <div className="px-5 py-4 prose prose-sm max-w-none text-[#3A3A3A] leading-relaxed">
                      <ReportMarkdown content={body} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Simple Markdown Renderer ────────────────────────────────────

function ReportMarkdown({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={i} className="my-4 border-[#E5E5E5]" />);
      i++;
      continue;
    }

    // H3
    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="text-sm font-semibold text-[#0A0A0A] mt-4 mb-2">
          {inlineFormat(line.slice(4))}
        </h3>
      );
      i++;
      continue;
    }

    // Table (simple markdown table)
    if (line.includes("|") && i + 1 < lines.length && /^\|[\s-|]+\|$/.test(lines[i + 1]?.trim() || "")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      const headerCells = tableLines[0]
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean);
      const bodyRows = tableLines.slice(2).map((row) =>
        row
          .split("|")
          .map((c) => c.trim())
          .filter(Boolean)
      );
      elements.push(
        <div key={`table-${i}`} className="overflow-x-auto my-3">
          <table className="w-full text-xs border border-[#E5E5E5] rounded">
            <thead>
              <tr className="bg-[#F7F7F8]">
                {headerCells.map((cell, j) => (
                  <th key={j} className="px-3 py-2 text-left font-semibold text-[#0A0A0A] border-b border-[#E5E5E5]">
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, ri) => (
                <tr key={ri} className="border-b border-[#F0F0F0] last:border-0">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 text-[#3A3A3A]">
                      {inlineFormat(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <blockquote
          key={`bq-${i}`}
          className="border-l-2 border-[#E5E5E5] pl-3 my-2 text-[#6B6B6B] italic text-xs"
        >
          {inlineFormat(quoteLines.join(" "))}
        </blockquote>
      );
      continue;
    }

    // Unordered list
    if (/^[-*] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        items.push(lines[i].replace(/^[-*] /, ""));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="space-y-1 my-2">
          {items.map((item, j) => (
            <li key={j} className="flex gap-1.5 text-xs leading-relaxed">
              <span className="text-[#CCCCCC] mt-0.5 shrink-0">•</span>
              <span>{inlineFormat(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s*/, ""));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="space-y-1 my-2">
          {items.map((item, j) => (
            <li key={j} className="flex gap-1.5 text-xs leading-relaxed">
              <span className="text-[#AAAAAA] font-mono text-[10px] mt-0.5 shrink-0 w-3">
                {j + 1}.
              </span>
              <span>{inlineFormat(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Bold paragraph
    if (line.startsWith("**")) {
      elements.push(
        <p key={i} className="text-xs leading-relaxed my-1.5">
          {inlineFormat(line)}
        </p>
      );
      i++;
      continue;
    }

    // Italic line
    if (line.startsWith("*") && !line.startsWith("**")) {
      elements.push(
        <p key={i} className="text-[11px] text-[#AAAAAA] italic my-1">
          {inlineFormat(line)}
        </p>
      );
      i++;
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="text-xs leading-relaxed my-1.5">
        {inlineFormat(line)}
      </p>
    );
    i++;
  }

  return <>{elements}</>;
}

// Inline formatting: **bold**, *italic*, `code`
function inlineFormat(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const italicMatch = remaining.match(/(?<!\*)\*([^*]+?)\*(?!\*)/);
    const codeMatch = remaining.match(/`([^`]+?)`/);

    const matches = [
      boldMatch ? { type: "bold", match: boldMatch, index: boldMatch.index! } : null,
      italicMatch ? { type: "italic", match: italicMatch, index: italicMatch.index! } : null,
      codeMatch ? { type: "code", match: codeMatch, index: codeMatch.index! } : null,
    ]
      .filter(Boolean)
      .sort((a, b) => a!.index - b!.index);

    if (matches.length === 0) {
      parts.push(remaining);
      break;
    }

    const first = matches[0]!;
    const beforeText = remaining.slice(0, first.index);
    if (beforeText) parts.push(beforeText);

    if (first.type === "bold") {
      parts.push(
        <strong key={`b-${keyIdx++}`} className="font-semibold text-[#0A0A0A]">
          {first.match![1]}
        </strong>
      );
    } else if (first.type === "italic") {
      parts.push(
        <em key={`i-${keyIdx++}`} className="italic text-[#6B6B6B]">
          {first.match![1]}
        </em>
      );
    } else if (first.type === "code") {
      parts.push(
        <code
          key={`c-${keyIdx++}`}
          className="px-1 py-0.5 bg-[#F0F0F0] rounded text-[10px] font-mono"
        >
          {first.match![1]}
        </code>
      );
    }

    remaining = remaining.slice(first.index + first.match![0].length);
  }

  return <>{parts}</>;
}
