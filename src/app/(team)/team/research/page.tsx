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

// ── Source metadata ─────────────────────────────────────────────

const SOURCES = [
  { name: "Amazon Reviews", icon: "📦" },
  { name: "Reddit", icon: "💬" },
  { name: "Trustpilot", icon: "⭐" },
  { name: "G2", icon: "🏆" },
  { name: "YouTube", icon: "▶️" },
  { name: "Quora", icon: "❓" },
];

// ── Section metadata for report rendering ───────────────────────

const SECTION_META = [
  { label: "Top Pain Points", border: "border-l-red-500", headerBg: "bg-red-50" },
  { label: "Customer Language Bank", border: "border-l-amber-500", headerBg: "bg-amber-50" },
  { label: "Purchase Triggers", border: "border-l-emerald-500", headerBg: "bg-emerald-50" },
  { label: "Objections & Hesitations", border: "border-l-orange-500", headerBg: "bg-orange-50" },
  { label: "Competitor Weaknesses", border: "border-l-blue-500", headerBg: "bg-blue-50" },
  { label: "Messaging Hierarchy", border: "border-l-violet-500", headerBg: "bg-violet-50" },
];

// ── Types ───────────────────────────────────────────────────────

type SourceStatus = "waiting" | "loading" | "done" | "empty" | "error";

// ── Page Component ──────────────────────────────────────────────

export default function ResearchPage() {
  // Input
  const [query, setQuery] = useState("");
  const [brandUrl, setBrandUrl] = useState("");

  // Research state
  const [isRunning, setIsRunning] = useState(false);
  const [sourceStatuses, setSourceStatuses] = useState<Record<string, SourceStatus>>({});
  const [sourceCounts, setSourceCounts] = useState<Record<string, number>>({});
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

  const handleSSEEvent = useCallback((event: string, data: Record<string, unknown>) => {
    switch (event) {
      case "source_start":
        setSourceStatuses((prev) => ({ ...prev, [data.name as string]: "loading" }));
        break;
      case "source_done":
        setSourceStatuses((prev) => ({ ...prev, [data.name as string]: "done" }));
        setSourceCounts((prev) => ({ ...prev, [data.name as string]: data.count as number }));
        break;
      case "source_empty":
        setSourceStatuses((prev) => ({ ...prev, [data.name as string]: "empty" }));
        break;
      case "source_error":
        setSourceStatuses((prev) => ({ ...prev, [data.name as string]: "error" }));
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
  }, []);

  // ── Start Research ──────────────────────────────────────────

  async function startResearch() {
    // Reset state
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
    setSourceStatuses(Object.fromEntries(SOURCES.map((s) => [s.name, "waiting" as const])));
    setSourceCounts({});

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/research/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
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

        // Parse SSE events
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
              // skip malformed events
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
        project_name: query.trim(),
        brand_url: brandUrl.trim(),
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
    setQuery(profile.project_name);
    setBrandUrl(profile.brand_url);
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
    setQuery("");
    setBrandUrl("");
    setStreamText("");
    streamRef.current = "";
    setFullReport("");
    setIsComplete(false);
    setIsRunning(false);
    setError(null);
    setAnalysisStarted(false);
    setAnalysisMessage("");
    setSourceStatuses({});
    setSourceCounts({});
    setCopied(false);
    setSaved(false);
    setCollapsedSections(new Set());
  }

  // ── Report Section Parsing ──────────────────────────────────

  function parseReportSections(report: string): string[] {
    const sections = report.split(/(?=^## \d+\.)/m).filter((s) => s.trim());
    // Remove everything before the first ## section (the header)
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

  const completedSources = Object.values(sourceStatuses).filter(
    (s) => s === "done" || s === "empty" || s === "error"
  ).length;
  const progressPercent = SOURCES.length > 0 ? Math.round((completedSources / SOURCES.length) * 100) : 0;

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
              Scrape customer language from 6 sources — powered by Firecrawl + Claude
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
                Saved Brand Profiles
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className={labelClass}>Brand / Product / Niche</label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && query.trim() && !isRunning) startResearch();
                }}
                placeholder="e.g. standing desk, Notion, meditation apps"
                className={inputClass}
                disabled={isRunning}
              />
            </div>
            <div>
              <label className={labelClass}>Brand URL (optional)</label>
              <input
                type="text"
                value={brandUrl}
                onChange={(e) => setBrandUrl(e.target.value)}
                placeholder="e.g. notion.so"
                className={inputClass}
                disabled={isRunning}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isRunning ? (
              <button
                onClick={startResearch}
                disabled={!query.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#0A0A0A] text-white text-sm font-medium rounded-md hover:bg-[#1a1a1a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <MagnifyingGlassIcon className="size-4" />
                Start Research
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

            {!isRunning && !isComplete && (
              <span className="text-[11px] text-[#AAAAAA]">
                Examples: &quot;meditation apps&quot; · &quot;standing desk&quot; · &quot;project management tools for agencies&quot;
              </span>
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
        {isRunning && Object.keys(sourceStatuses).length > 0 && (
          <div className="bg-white border border-[#E5E5E5] rounded-lg p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">
                Scraping Sources
              </span>
              <span className="text-[11px] text-[#AAAAAA] tabular-nums">
                {completedSources} / {SOURCES.length}
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-[#F0F0F0] rounded-full mb-4 overflow-hidden">
              <div
                className="h-full bg-[#0A0A0A] rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Source rows */}
            <div className="space-y-2">
              {SOURCES.map((source) => {
                const status = sourceStatuses[source.name] || "waiting";
                const count = sourceCounts[source.name];
                return (
                  <div
                    key={source.name}
                    className="flex items-center justify-between py-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{source.icon}</span>
                      <span className="text-sm text-[#6B6B6B]">{source.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] ${
                          status === "done"
                            ? "text-emerald-600"
                            : status === "loading"
                              ? "text-amber-500"
                              : status === "empty"
                                ? "text-[#AAAAAA]"
                                : status === "error"
                                  ? "text-red-500"
                                  : "text-[#CCCCCC]"
                        }`}
                      >
                        {status === "waiting" && "Waiting"}
                        {status === "loading" && "Searching..."}
                        {status === "done" && `${count} results`}
                        {status === "empty" && "No results"}
                        {status === "error" && "Failed"}
                      </span>
                      <span
                        className={`size-2 rounded-full ${
                          status === "done"
                            ? "bg-emerald-500"
                            : status === "loading"
                              ? "bg-amber-400 animate-pulse"
                              : status === "empty"
                                ? "bg-[#CCCCCC]"
                                : status === "error"
                                  ? "bg-red-500"
                                  : "bg-[#E5E5E5]"
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
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
          <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4 mb-6 max-h-72 overflow-y-auto" ref={streamDisplayRef}>
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
              {saved ? "Saved!" : "Save as Brand Profile"}
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

              // Extract section title from first line
              const firstLine = section.split("\n")[0] || "";
              const titleMatch = firstLine.match(/^## \d+\.\s*(.+)/);
              const title = titleMatch ? titleMatch[1] : meta.label;

              // Body is everything after the first line
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
// Renders markdown to JSX without external deps — handles the most
// common patterns from the VOC report output.

function ReportMarkdown({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Empty line
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

    // Bold paragraph (starts with **)
    if (line.startsWith("**")) {
      elements.push(
        <p key={i} className="text-xs leading-relaxed my-1.5">
          {inlineFormat(line)}
        </p>
      );
      i++;
      continue;
    }

    // Italic line (starts with *)
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

// Inline formatting: **bold**, *italic*, `code`, "[quotes]"
function inlineFormat(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;

  while (remaining.length > 0) {
    // Bold
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Italic
    const italicMatch = remaining.match(/(?<!\*)\*([^*]+?)\*(?!\*)/);
    // Code
    const codeMatch = remaining.match(/`([^`]+?)`/);

    // Find earliest match
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
