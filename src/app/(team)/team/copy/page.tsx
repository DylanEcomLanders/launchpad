"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  ClipboardDocumentIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import { DecorativeBlocks } from "@/components/decorative-blocks";
import {
  type CopyMode,
  type CopySection,
  type ContextBlock,
  type ContextBlockLabel,
  contextBlockLabels,
} from "@/lib/copy-engine/types";
import type { BrandProfile } from "@/lib/brand-profiles/types";
import { getBrandProfiles } from "@/lib/brand-profiles/data";
import {
  pageChecklists,
  checklistPageTypes,
  type ChecklistPageType,
} from "@/data/page-checklists";

const copyModes: { value: CopyMode; label: string }[] = [
  { value: "Page", label: "Page" },
  { value: "Advertorial", label: "Advertorial" },
  { value: "Listicle", label: "Listicle" },
];

type Status = "idle" | "generating" | "done" | "error";

let blockCounter = 0;

export default function CopyEnginePage() {
  /* ── state ── */
  const [mode, setMode] = useState<CopyMode>("Page");
  const [brief, setBrief] = useState("");
  const [contextBlocks, setContextBlocks] = useState<ContextBlock[]>([]);
  const [profiles, setProfiles] = useState<BrandProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState("");

  // Page mode
  const [pageType, setPageType] = useState<ChecklistPageType>("PDP");
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());

  // Output
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [sections, setSections] = useState<CopySection[]>([]);
  const [rawStream, setRawStream] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const outputRef = useRef<HTMLDivElement>(null);

  /* ── load brand profiles ── */
  useEffect(() => {
    getBrandProfiles().then(setProfiles).catch(() => {});
  }, []);

  /* ── auto-select sections when page type changes ── */
  const syncSections = useCallback((pt: ChecklistPageType) => {
    const items = pageChecklists[pt];
    const autoSelected = new Set(
      items
        .filter((i) => i.priority === "required" || i.priority === "recommended")
        .map((i) => i.sectionName)
    );
    setSelectedSections(autoSelected);
  }, []);

  useEffect(() => {
    syncSections(pageType);
  }, [pageType, syncSections]);

  /* ── auto-scroll during generation ── */
  useEffect(() => {
    if (status === "generating" && outputRef.current) {
      outputRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [rawStream, status]);

  /* ── context block handlers ── */
  function addContextBlock() {
    blockCounter++;
    setContextBlocks((prev) => [
      ...prev,
      { id: `block-${blockCounter}`, label: "Ad Copy", content: "" },
    ]);
  }

  function updateBlockLabel(id: string, label: ContextBlockLabel) {
    setContextBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, label } : b))
    );
  }

  function updateBlockContent(id: string, content: string) {
    setContextBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, content } : b))
    );
  }

  function removeBlock(id: string) {
    setContextBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  /* ── section toggle ── */
  function toggleSection(name: string) {
    setSelectedSections((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  /* ── generate ── */
  async function handleGenerate() {
    if (!brief.trim()) return;
    if (mode === "Page" && selectedSections.size === 0) return;

    setStatus("generating");
    setErrorMessage("");
    setSections([]);
    setRawStream("");

    const profile = profiles.find((p) => p.id === selectedProfileId);

    try {
      const res = await fetch("/api/copy/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          brief: brief.trim(),
          contextBlocks: contextBlocks
            .filter((b) => b.content.trim())
            .map((b) => ({ label: b.label, content: b.content })),
          brandContext: profile?.raw_report || null,
          pageType: mode === "Page" ? pageType : undefined,
          selectedSections:
            mode === "Page" ? Array.from(selectedSections) : undefined,
        }),
      });

      if (!res.ok || !res.body) {
        const err = res.ok ? null : await res.json().catch(() => null);
        setStatus("error");
        setErrorMessage(err?.error || "Failed to connect to the copy engine.");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let completed = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          try {
            const data = JSON.parse(line.slice(6));

            if ("text" in data) {
              accumulated += data.text;
              setRawStream(accumulated);
            }

            if ("message" in data && data.message === "Copy generation complete") {
              completed = true;

              if (mode === "Page") {
                // Parse JSON sections
                const parsed = tryParseJsonSections(accumulated);
                if (parsed) {
                  setSections(parsed);
                  setStatus("done");
                } else {
                  setStatus("error");
                  setErrorMessage("Failed to parse section copy. Try again.");
                }
              } else {
                // Advertorial / Listicle — raw text output
                setSections([
                  {
                    id: mode.toLowerCase(),
                    label: mode,
                    content: accumulated.trim(),
                  },
                ]);
                setStatus("done");
              }
            }

            if ("message" in data && line.includes("app_error")) {
              setStatus("error");
              setErrorMessage(data.message);
              completed = true;
            }
          } catch {
            // skip
          }
        }
      }

      // Fallback if stream ended without completion event
      if (!completed && accumulated) {
        if (mode === "Page") {
          const parsed = tryParseJsonSections(accumulated);
          if (parsed) {
            setSections(parsed);
            setStatus("done");
          } else {
            setStatus("error");
            setErrorMessage("Generation ended unexpectedly. Try again.");
          }
        } else {
          setSections([
            { id: mode.toLowerCase(), label: mode, content: accumulated.trim() },
          ]);
          setStatus("done");
        }
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    }
  }

  /* ── JSON parsing helper ── */
  function tryParseJsonSections(text: string): CopySection[] | null {
    // Try direct parse first
    try {
      const parsed = JSON.parse(text);
      if (parsed.sections && Array.isArray(parsed.sections)) return parsed.sections;
    } catch {
      // fallthrough
    }

    // Try extracting JSON from text
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (parsed.sections && Array.isArray(parsed.sections)) return parsed.sections;
      } catch {
        // fallthrough
      }
    }

    return null;
  }

  /* ── copy helpers ── */
  function copyText(id: string, content: string) {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function copyAll() {
    const text = sections
      .map((s) =>
        mode === "Page"
          ? `── ${s.label} ──\n${s.content}`
          : s.content
      )
      .join("\n\n");
    navigator.clipboard.writeText(text);
    setCopiedId("__all__");
    setTimeout(() => setCopiedId(null), 2000);
  }

  /* ── derived ── */
  const checklistItems = pageChecklists[pageType];
  const canGenerate =
    brief.trim().length >= 20 &&
    (mode !== "Page" || selectedSections.size > 0) &&
    status !== "generating";

  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-12 py-12 md:py-16">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            Copy Engine
          </h1>
          <p className="text-subtle text-sm">
            Drop in the brief, add context, generate conversion copy
          </p>
        </div>

        {/* ── Mode selector ── */}
        <div className="flex gap-2 mb-8">
          {copyModes.map((m) => (
            <button
              key={m.value}
              onClick={() => setMode(m.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === m.value
                  ? "bg-surface-raised text-foreground"
                  : "bg-surface-raised text-subtle hover:bg-border"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* ── Input area ── */}
        <div className="bg-surface border border-border rounded-lg p-6 mb-6 space-y-5">
          {/* Client brief */}
          <div>
            <label className="block text-xs font-semibold text-subtle mb-1.5 uppercase tracking-wider">
              Client Brief *
            </label>
            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              rows={6}
              placeholder="Paste the client brief here — product info, goals, target audience, tone, URLs, whatever you have..."
              className="w-full px-4 py-3 text-sm border border-border rounded-md focus:outline-none focus:border-surface transition-colors resize-none leading-relaxed"
            />
          </div>

          {/* Context blocks */}
          {contextBlocks.length > 0 && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-subtle uppercase tracking-wider">
                Additional Context
              </label>
              {contextBlocks.map((block) => (
                <div
                  key={block.id}
                  className="border border-border rounded-md p-3 bg-background"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <select
                      value={block.label}
                      onChange={(e) =>
                        updateBlockLabel(
                          block.id,
                          e.target.value as ContextBlockLabel
                        )
                      }
                      className="px-2 py-1 text-xs font-medium border border-border rounded bg-surface focus:outline-none focus:border-surface transition-colors"
                    >
                      {contextBlockLabels.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => removeBlock(block.id)}
                      className="ml-auto p-1 text-subtle hover:text-danger transition-colors"
                    >
                      <XMarkIcon className="size-4" />
                    </button>
                  </div>
                  <textarea
                    value={block.content}
                    onChange={(e) =>
                      updateBlockContent(block.id, e.target.value)
                    }
                    rows={3}
                    placeholder={
                      block.label === "Ad Copy"
                        ? "Paste ad copy, headlines, hooks..."
                        : block.label === "Inspo Page"
                        ? "Paste content from an inspiration page..."
                        : block.label === "Competitor Page"
                        ? "Paste competitor page content..."
                        : "Paste any additional context..."
                    }
                    className="w-full px-3 py-2 text-sm border border-border rounded bg-surface focus:outline-none focus:border-surface transition-colors resize-none"
                  />
                </div>
              ))}
            </div>
          )}

          <button
            onClick={addContextBlock}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-subtle border border-dashed border-muted rounded-md hover:border-surface hover:text-foreground transition-all"
          >
            <PlusIcon className="size-3.5" />
            Add Context
            <span className="text-subtle">(ads, inspo, competitor pages)</span>
          </button>

          {/* Brand profile */}
          {profiles.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-subtle mb-1.5 uppercase tracking-wider">
                Brand Profile{" "}
                <span className="text-subtle font-normal normal-case tracking-normal">
                  (optional — adds VOC data as context)
                </span>
              </label>
              <select
                value={selectedProfileId}
                onChange={(e) => setSelectedProfileId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface focus:outline-none focus:border-surface transition-colors"
              >
                <option value="">None</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.project_name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* ── Page mode: section picker ── */}
        {mode === "Page" && (
          <div className="bg-surface border border-border rounded-lg p-6 mb-6">
            <label className="block text-xs font-semibold text-subtle mb-4 uppercase tracking-wider">
              Page Sections
            </label>

            {/* Page type pills */}
            <div className="flex flex-wrap gap-2 mb-5">
              {checklistPageTypes.map((pt) => (
                <button
                  key={pt}
                  onClick={() => setPageType(pt)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                    pageType === pt
                      ? "bg-surface-raised text-foreground"
                      : "bg-surface-raised text-subtle hover:bg-border"
                  }`}
                >
                  {pt}
                </button>
              ))}
            </div>

            {/* Section count */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-subtle">
                {selectedSections.size}/{checklistItems.length} sections selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setSelectedSections(
                      new Set(checklistItems.map((i) => i.sectionName))
                    )
                  }
                  className="text-[10px] font-medium text-subtle hover:text-foreground transition-colors"
                >
                  Select All
                </button>
                <span className="text-foreground">|</span>
                <button
                  onClick={() => setSelectedSections(new Set())}
                  className="text-[10px] font-medium text-subtle hover:text-foreground transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Section checkboxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              {checklistItems.map((item) => {
                const isSelected = selectedSections.has(item.sectionName);
                return (
                  <button
                    key={item.sectionName}
                    onClick={() => toggleSection(item.sectionName)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-left transition-all ${
                      isSelected
                        ? "bg-surface-raised text-foreground"
                        : "bg-surface-raised text-subtle hover:bg-border"
                    }`}
                  >
                    <div
                      className={`size-3.5 rounded border-2 shrink-0 flex items-center justify-center ${
                        isSelected
                          ? "border-foreground bg-surface"
                          : "border-muted"
                      }`}
                    >
                      {isSelected && (
                        <CheckCircleIcon className="size-3 text-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-medium block truncate">
                        {item.sectionName}
                      </span>
                    </div>
                    <span
                      className={`ml-auto text-[9px] font-semibold uppercase tracking-wider shrink-0 px-1.5 py-0.5 rounded ${
                        isSelected
                          ? item.priority === "required"
                            ? "bg-surface/20 text-foreground"
                            : item.priority === "recommended"
                            ? "bg-surface/10 text-muted"
                            : "bg-surface/5 text-subtle"
                          : item.priority === "required"
                          ? "bg-surface/10 text-subtle"
                          : item.priority === "recommended"
                          ? "bg-surface/5 text-subtle"
                          : "text-muted"
                      }`}
                    >
                      {item.priority === "required"
                        ? "Req"
                        : item.priority === "recommended"
                        ? "Rec"
                        : "Opt"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Generate button ── */}
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-medium rounded-lg transition-all mb-8 ${
            status === "generating"
              ? "bg-subtle text-foreground cursor-wait"
              : !canGenerate
              ? "bg-foreground text-subtle cursor-not-allowed"
              : "bg-surface-raised text-foreground hover:bg-foreground"
          }`}
        >
          {status === "generating" ? (
            <>
              <ArrowPathIcon className="size-4 animate-spin" />
              Generating{" "}
              {mode === "Page" ? `${pageType} copy` : `${mode}`}...
            </>
          ) : (
            <>
              Generate{" "}
              {mode === "Page"
                ? `${pageType} Copy (${selectedSections.size} sections)`
                : `${mode}`}
            </>
          )}
        </button>

        {/* ── Output ── */}
        <div ref={outputRef}>
          {/* Streaming indicator */}
          {status === "generating" && (
            <div className="bg-surface border border-border rounded-lg p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <ArrowPathIcon className="size-4 text-subtle animate-spin" />
                <span className="text-sm text-subtle">
                  Writing {mode === "Page" ? `${pageType}` : mode} copy...
                </span>
              </div>
              <div className="bg-surface-raised rounded-md p-4 max-h-72 overflow-y-auto">
                <pre className="text-xs text-subtle whitespace-pre-wrap font-mono leading-relaxed">
                  {rawStream || "Waiting for response..."}
                </pre>
              </div>
            </div>
          )}

          {/* Error */}
          {status === "error" && (
            <div className="bg-danger/10 border border-danger/20 rounded-lg p-5 mb-6">
              <p className="text-sm text-danger font-medium mb-1">
                Generation failed
              </p>
              <p className="text-xs text-danger">{errorMessage}</p>
            </div>
          )}

          {/* Results */}
          {status === "done" && sections.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold">
                  {mode === "Page"
                    ? `${pageType} — ${sections.length} sections`
                    : mode}
                </h2>
                <button
                  onClick={copyAll}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    copiedId === "__all__"
                      ? "bg-success/10 border border-success/20 text-success"
                      : "bg-surface-raised text-foreground hover:bg-foreground"
                  }`}
                >
                  {copiedId === "__all__" ? (
                    <>
                      <CheckCircleIcon className="size-3.5" />
                      Copied
                    </>
                  ) : (
                    <>
                      <ClipboardDocumentIcon className="size-3.5" />
                      Copy All
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-3">
                {sections.map((section) => (
                  <div
                    key={section.id}
                    className="bg-surface border border-border rounded-lg overflow-hidden"
                  >
                    {/* Section header — only show for Page mode (multi-section) */}
                    {mode === "Page" && (
                      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                        <h3 className="text-xs font-semibold text-subtle uppercase tracking-wider">
                          {section.label}
                        </h3>
                        <button
                          onClick={() =>
                            copyText(section.id, section.content)
                          }
                          className={`flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded transition-all ${
                            copiedId === section.id
                              ? "bg-success/10 text-success"
                              : "text-subtle hover:text-subtle hover:bg-surface-raised"
                          }`}
                        >
                          {copiedId === section.id ? (
                            <>
                              <CheckCircleIcon className="size-3" />
                              Copied
                            </>
                          ) : (
                            <>
                              <ClipboardDocumentIcon className="size-3" />
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    <div className="px-5 py-4">
                      <div className="text-sm text-subtle leading-relaxed whitespace-pre-wrap">
                        {section.content}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
