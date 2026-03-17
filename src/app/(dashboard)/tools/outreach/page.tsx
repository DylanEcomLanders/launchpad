"use client";

import { useState, useEffect } from "react";
import {
  PaperAirplaneIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  ListBulletIcon,
  TrashIcon,
  PlusIcon,
} from "@heroicons/react/24/solid";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { DecorativeBlocks } from "@/components/decorative-blocks";
import { inputClass, labelClass, selectClass } from "@/lib/form-styles";
import type { OutreachStep, OutreachType, ToneType } from "@/lib/outreach/types";
import { createSequence, getSequences, deleteSequence } from "@/lib/outreach/data";
import type { OutreachSequence } from "@/lib/outreach/types";

// ── Types ───────────────────────────────────────────────────────

interface OutreachResult {
  outreachType: OutreachType;
  tone: ToneType;
  brandName: string;
  storeUrl?: string | null;
  storeContext?: string | null;
  subjectLine?: string | null;
  body: string;
}

// ── Constants ───────────────────────────────────────────────────

const outreachTypes: { value: OutreachType; label: string }[] = [
  { value: "cold-email", label: "Cold Email" },
  { value: "follow-up", label: "Follow-up" },
  { value: "loom-script", label: "Loom Script" },
  { value: "linkedin-dm", label: "LinkedIn DM" },
];

const tones: { value: ToneType; label: string }[] = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "direct", label: "Direct" },
];

type Mode = "single" | "sequence";

const DEFAULT_SEQUENCE_STEPS: Pick<OutreachStep, "day" | "outreachType" | "tone">[] = [
  { day: 0, outreachType: "cold-email", tone: "casual" },
  { day: 3, outreachType: "follow-up", tone: "casual" },
  { day: 7, outreachType: "linkedin-dm", tone: "direct" },
];

let nextStepId = 1;
function stepUid() {
  return `step-${nextStepId++}`;
}

// ── Component ───────────────────────────────────────────────────

export default function OutreachPage() {
  // Mode
  const [mode, setMode] = useState<Mode>("single");

  // Form state
  const [brandName, setBrandName] = useState("");
  const [contactName, setContactName] = useState("");
  const [storeUrl, setStoreUrl] = useState("");
  const [findings, setFindings] = useState("");
  const [outreachType, setOutreachType] = useState<OutreachType>("cold-email");
  const [tone, setTone] = useState<ToneType>("casual");
  const [prefilled, setPrefilled] = useState(false);

  // Single mode result state
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<OutreachResult | null>(null);
  const [error, setError] = useState("");

  // Read prefill data from prospect scraper
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("outreach-prefill");
      if (raw) {
        const data = JSON.parse(raw);
        if (data.brandName) setBrandName(data.brandName);
        if (data.contactName) setContactName(data.contactName);
        if (data.storeUrl) setStoreUrl(data.storeUrl);
        if (data.findings) setFindings(data.findings);
        setPrefilled(true);
        sessionStorage.removeItem("outreach-prefill");
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Copy state
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedSubject, setCopiedSubject] = useState(false);

  // Sequence mode state
  const [seqSteps, setSeqSteps] = useState<OutreachStep[]>(() =>
    DEFAULT_SEQUENCE_STEPS.map((s) => ({
      id: stepUid(),
      ...s,
      subjectLine: null,
      body: "",
      generated: false,
    }))
  );
  const [seqLoading, setSeqLoading] = useState(false);
  const [seqProgress, setSeqProgress] = useState("");
  const [seqError, setSeqError] = useState("");
  const [savedSequences, setSavedSequences] = useState<OutreachSequence[]>([]);
  const [showSaved, setShowSaved] = useState(false);

  // Load saved sequences
  useEffect(() => {
    getSequences().then(setSavedSequences).catch(() => {});
  }, []);

  const canSubmit = brandName.trim() && findings.trim() && !loading;
  const canGenerateSequence = brandName.trim() && findings.trim() && !seqLoading && seqSteps.length > 0;

  // ── Single mode functions ──────────────────────────────────────

  async function generate() {
    setLoading(true);
    setError("");
    setResult(null);

    if (storeUrl.trim()) {
      setStatus("Crawling store for context...");
    } else {
      setStatus("Generating outreach...");
    }

    try {
      const res = await fetch("/api/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: brandName.trim(),
          contactName: contactName.trim() || undefined,
          storeUrl: storeUrl.trim() || undefined,
          findings: findings.trim(),
          outreachType,
          tone,
        }),
      });

      if (storeUrl.trim()) setStatus("Generating outreach...");

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");

      setResult(data as OutreachResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
      setStatus("");
    }
  }

  function copyAll() {
    if (!result) return;
    let text = "";
    if (result.subjectLine) text += `Subject: ${result.subjectLine}\n\n`;
    text += result.body;
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  }

  function copySubject() {
    if (!result?.subjectLine) return;
    navigator.clipboard.writeText(result.subjectLine);
    setCopiedSubject(true);
    setTimeout(() => setCopiedSubject(false), 2000);
  }

  // ── Sequence mode functions ────────────────────────────────────

  function addStep() {
    const lastDay = seqSteps.length > 0 ? seqSteps[seqSteps.length - 1].day : 0;
    setSeqSteps((prev) => [
      ...prev,
      {
        id: stepUid(),
        day: lastDay + 4,
        outreachType: "follow-up",
        tone: "casual",
        subjectLine: null,
        body: "",
        generated: false,
      },
    ]);
  }

  function removeStep(id: string) {
    setSeqSteps((prev) => prev.filter((s) => s.id !== id));
  }

  function updateStep(id: string, updates: Partial<OutreachStep>) {
    setSeqSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  }

  async function generateAllSteps() {
    setSeqLoading(true);
    setSeqError("");

    // Reset all steps
    setSeqSteps((prev) =>
      prev.map((s) => ({ ...s, body: "", subjectLine: null, generated: false }))
    );

    const generatedMessages: { outreachType: string; body: string }[] = [];

    for (let i = 0; i < seqSteps.length; i++) {
      const step = seqSteps[i];
      setSeqProgress(`Generating step ${i + 1} of ${seqSteps.length}...`);

      try {
        const res = await fetch("/api/outreach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brandName: brandName.trim(),
            contactName: contactName.trim() || undefined,
            storeUrl: storeUrl.trim() || undefined,
            findings: findings.trim(),
            outreachType: step.outreachType,
            tone: step.tone,
            previousMessages: generatedMessages.length > 0 ? generatedMessages : undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Generation failed");

        const result = data as OutreachResult;

        // Update step with generated content
        setSeqSteps((prev) =>
          prev.map((s) =>
            s.id === step.id
              ? { ...s, body: result.body, subjectLine: result.subjectLine || null, generated: true }
              : s
          )
        );

        // Track for continuity
        generatedMessages.push({
          outreachType: step.outreachType,
          body: result.body,
        });
      } catch (err) {
        setSeqError(
          `Failed at step ${i + 1}: ${err instanceof Error ? err.message : "Unknown error"}`
        );
        break;
      }
    }

    setSeqLoading(false);
    setSeqProgress("");
  }

  async function saveSequence() {
    const seq = await createSequence({
      brand_name: brandName.trim(),
      store_url: storeUrl.trim(),
      contact_name: contactName.trim(),
      findings: findings.trim(),
      steps: seqSteps,
    });
    setSavedSequences((prev) => [seq, ...prev]);
  }

  async function handleDeleteSequence(id: string) {
    await deleteSequence(id);
    setSavedSequences((prev) => prev.filter((s) => s.id !== id));
  }

  function loadSequence(seq: OutreachSequence) {
    setBrandName(seq.brand_name);
    setStoreUrl(seq.store_url);
    setContactName(seq.contact_name);
    setFindings(seq.findings);
    setSeqSteps(seq.steps);
    setShowSaved(false);
  }

  function copyStep(step: OutreachStep) {
    let text = "";
    if (step.subjectLine) text += `Subject: ${step.subjectLine}\n\n`;
    text += step.body;
    navigator.clipboard.writeText(text);
  }

  function copyFullSequence() {
    const parts = seqSteps
      .filter((s) => s.generated)
      .map((s, i) => {
        const typeLabel = outreachTypes.find((t) => t.value === s.outreachType)?.label || s.outreachType;
        let text = `═══ Step ${i + 1}: ${typeLabel} (Day ${s.day}) ═══\n`;
        if (s.subjectLine) text += `Subject: ${s.subjectLine}\n\n`;
        text += s.body;
        return text;
      });
    navigator.clipboard.writeText(parts.join("\n\n"));
  }

  const hasSubject =
    outreachType === "cold-email" || outreachType === "follow-up";
  const allGenerated = seqSteps.length > 0 && seqSteps.every((s) => s.generated);

  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-12 py-16 md:py-24">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            Outreach Generator
          </h1>
          <p className="text-[#7A7A7A]">
            Generate personalised outreach copy for Shopify brand prospects
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-1 mb-8 bg-[#F3F3F5] rounded-lg p-1 w-fit">
          <button
            onClick={() => setMode("single")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              mode === "single"
                ? "bg-white text-[#1B1B1B] shadow-sm"
                : "text-[#7A7A7A] hover:text-[#1B1B1B]"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <PaperAirplaneIcon className="size-3.5" />
              Single
            </span>
          </button>
          <button
            onClick={() => setMode("sequence")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              mode === "sequence"
                ? "bg-white text-[#1B1B1B] shadow-sm"
                : "text-[#7A7A7A] hover:text-[#1B1B1B]"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <ListBulletIcon className="size-3.5" />
              Sequence
            </span>
          </button>
        </div>

        {/* Error */}
        {(error || seqError) && (
          <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error || seqError}
            <button
              onClick={() => { setError(""); setSeqError(""); }}
              className="ml-3 text-red-500 hover:text-red-700"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Prefill banner */}
        {prefilled && (
          <div className="mb-6 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 flex items-center justify-between">
            <span>Pre-filled from Prospect Scraper — review and generate.</span>
            <button onClick={() => setPrefilled(false)} className="text-blue-500 hover:text-blue-700 text-xs font-medium">Dismiss</button>
          </div>
        )}

        {/* ═══ Shared Input Form ═══ */}
        <div className="bg-[#F3F3F5] border border-[#E5E5EA] rounded-lg p-5 space-y-5 mb-10">
          {/* Brand + Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Brand Name *</label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g. Gymshark"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Contact Name</label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="e.g. Sarah"
                className={inputClass}
              />
            </div>
          </div>

          {/* Store URL */}
          <div>
            <label className={labelClass}>Store URL</label>
            <input
              type="text"
              value={storeUrl}
              onChange={(e) => setStoreUrl(e.target.value)}
              placeholder="e.g. gymshark.com"
              className={inputClass}
            />
            <p className="text-[10px] text-[#A0A0A0] mt-1">
              Optional — if provided, we&apos;ll run a quick crawl for extra context
            </p>
          </div>

          {/* Findings */}
          <div>
            <label className={labelClass}>Key Findings / Pain Points *</label>
            <textarea
              value={findings}
              onChange={(e) => setFindings(e.target.value)}
              placeholder="Paste store intel findings, or describe specific issues you've spotted with their store..."
              rows={5}
              className={`${inputClass} resize-y`}
            />
          </div>

          {/* ── Single-mode controls ── */}
          {mode === "single" && (
            <>
              {/* Outreach Type */}
              <div>
                <label className={labelClass}>Outreach Type</label>
                <div className="inline-flex rounded-md border border-[#E5E5EA] bg-white p-0.5">
                  {outreachTypes.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setOutreachType(t.value)}
                      className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                        outreachType === t.value
                          ? "bg-[#1B1B1B] text-white"
                          : "text-[#7A7A7A] hover:text-[#1B1B1B]"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tone */}
              <div>
                <label className={labelClass}>Tone</label>
                <div className="inline-flex rounded-md border border-[#E5E5EA] bg-white p-0.5">
                  {tones.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setTone(t.value)}
                      className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                        tone === t.value
                          ? "bg-[#1B1B1B] text-white"
                          : "text-[#7A7A7A] hover:text-[#1B1B1B]"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate button */}
              <button
                type="button"
                onClick={generate}
                disabled={!canSubmit}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#1B1B1B] text-white text-sm font-medium rounded-md hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <ArrowPathIcon className="size-4 animate-spin" />
                    {status || "Generating..."}
                  </>
                ) : (
                  <>
                    <PaperAirplaneIcon className="size-4" />
                    Generate Outreach
                  </>
                )}
              </button>
            </>
          )}

          {/* ── Sequence-mode controls ── */}
          {mode === "sequence" && (
            <>
              {/* Step timeline */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className={labelClass}>Sequence Steps</label>
                  {savedSequences.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowSaved(!showSaved)}
                      className="text-xs text-[#7A7A7A] hover:text-[#1B1B1B] underline"
                    >
                      {showSaved ? "Hide saved" : `Saved (${savedSequences.length})`}
                    </button>
                  )}
                </div>

                {/* Saved sequences drawer */}
                {showSaved && savedSequences.length > 0 && (
                  <div className="mb-4 bg-white border border-[#E5E5EA] rounded-lg divide-y divide-[#EDEDEF]">
                    {savedSequences.map((seq) => (
                      <div key={seq.id} className="px-4 py-3 flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{seq.brand_name}</p>
                          <p className="text-[10px] text-[#A0A0A0]">
                            {seq.steps.length} steps · {new Date(seq.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => loadSequence(seq)}
                            className="px-2.5 py-1 text-[10px] font-semibold bg-[#EDEDEF] text-[#7A7A7A] rounded-md hover:bg-[#E5E5EA] transition-colors"
                          >
                            Load
                          </button>
                          <button
                            onClick={() => handleDeleteSequence(seq.id)}
                            className="p-1 text-[#C5C5C5] hover:text-red-400 transition-colors"
                          >
                            <TrashIcon className="size-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  {seqSteps.map((step, i) => {
                    const typeLabel = outreachTypes.find((t) => t.value === step.outreachType)?.label || step.outreachType;
                    return (
                      <div key={step.id} className="flex items-center gap-3 bg-white rounded-lg border border-[#E5E5EA] px-4 py-3">
                        {/* Step number + timeline dot */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className={`size-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            step.generated
                              ? "bg-emerald-100 text-emerald-600"
                              : "bg-[#EDEDEF] text-[#999999]"
                          }`}>
                            {step.generated ? "✓" : i + 1}
                          </div>
                        </div>

                        {/* Day */}
                        <div className="shrink-0">
                          <label className="text-[9px] font-semibold uppercase tracking-wider text-[#A0A0A0] block mb-0.5">Day</label>
                          <input
                            type="number"
                            value={step.day}
                            onChange={(e) => updateStep(step.id, { day: parseInt(e.target.value) || 0 })}
                            className="w-14 px-2 py-1 text-xs border border-[#E5E5EA] rounded-md focus:outline-none focus:border-[#999999] text-center"
                            min={0}
                          />
                        </div>

                        {/* Type */}
                        <div className="flex-1 min-w-0">
                          <label className="text-[9px] font-semibold uppercase tracking-wider text-[#A0A0A0] block mb-0.5">Type</label>
                          <select
                            value={step.outreachType}
                            onChange={(e) => updateStep(step.id, { outreachType: e.target.value as OutreachType })}
                            className="w-full px-2 py-1 text-xs border border-[#E5E5EA] rounded-md bg-white focus:outline-none focus:border-[#999999]"
                          >
                            {outreachTypes.map((t) => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </div>

                        {/* Tone */}
                        <div className="flex-1 min-w-0">
                          <label className="text-[9px] font-semibold uppercase tracking-wider text-[#A0A0A0] block mb-0.5">Tone</label>
                          <select
                            value={step.tone}
                            onChange={(e) => updateStep(step.id, { tone: e.target.value as ToneType })}
                            className="w-full px-2 py-1 text-xs border border-[#E5E5EA] rounded-md bg-white focus:outline-none focus:border-[#999999]"
                          >
                            {tones.map((t) => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </div>

                        {/* Remove */}
                        {seqSteps.length > 1 && (
                          <button
                            onClick={() => removeStep(step.id)}
                            className="p-1 text-[#C5C5C5] hover:text-red-400 transition-colors mt-3"
                          >
                            <TrashIcon className="size-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {/* Add step button */}
                  <button
                    type="button"
                    onClick={addStep}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs text-[#A0A0A0] hover:text-[#7A7A7A] transition-colors w-full justify-center border border-dashed border-[#E5E5EA] rounded-lg hover:border-[#C5C5C5]"
                  >
                    <PlusIcon className="size-3" />
                    Add Step
                  </button>
                </div>
              </div>

              {/* Generate All button */}
              <button
                type="button"
                onClick={generateAllSteps}
                disabled={!canGenerateSequence}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#1B1B1B] text-white text-sm font-medium rounded-md hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {seqLoading ? (
                  <>
                    <ArrowPathIcon className="size-4 animate-spin" />
                    {seqProgress || "Generating sequence..."}
                  </>
                ) : (
                  <>
                    <ListBulletIcon className="size-4" />
                    Generate All Steps
                  </>
                )}
              </button>
            </>
          )}
        </div>

        {/* ═══ Single Mode Results ═══ */}
        {mode === "single" && result && (
          <div className="space-y-4">
            {/* Subject line */}
            {hasSubject && result.subjectLine && (
              <div className="bg-[#F3F3F5] border border-[#E5E5EA] rounded-lg px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0] block mb-1">
                      Subject Line
                    </span>
                    <p className="text-sm font-semibold text-[#1B1B1B]">
                      {result.subjectLine}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={copySubject}
                    className="shrink-0 p-2 rounded-md border border-[#E5E5EA] bg-white hover:bg-[#F3F3F5] transition-colors"
                    title="Copy subject line"
                  >
                    {copiedSubject ? (
                      <CheckIcon className="size-3.5 text-emerald-600" />
                    ) : (
                      <ClipboardDocumentIcon className="size-3.5 text-[#A0A0A0]" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Body */}
            <div className="bg-white border border-[#E5E5EA] rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0]">
                  {outreachType === "loom-script"
                    ? "Loom Script"
                    : outreachType === "linkedin-dm"
                    ? "LinkedIn DM"
                    : "Email Body"}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#C5C5C5]">
                    {result.tone} · {outreachTypes.find((t) => t.value === result.outreachType)?.label}
                  </span>
                </div>
              </div>
              <MarkdownRenderer content={result.body} />
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={copyAll}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md border transition-all duration-200 ${
                  copiedAll
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : "bg-[#1B1B1B] border-[#1B1B1B] text-white hover:bg-accent-hover"
                }`}
              >
                {copiedAll ? (
                  <>
                    <CheckIcon className="size-3.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <ClipboardDocumentIcon className="size-3.5" />
                    Copy All
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={generate}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md border border-[#E5E5EA] bg-white text-[#7A7A7A] hover:border-[#C5C5C5] hover:text-[#1B1B1B] transition-colors disabled:opacity-40"
              >
                <ArrowPathIcon className="size-3.5" />
                Regenerate
              </button>
            </div>
          </div>
        )}

        {/* ═══ Sequence Mode Results ═══ */}
        {mode === "sequence" && seqSteps.some((s) => s.generated) && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold">Generated Sequence</h2>
              <div className="flex items-center gap-2">
                {allGenerated && (
                  <button
                    onClick={saveSequence}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#EDEDEF] text-[#7A7A7A] rounded-md hover:bg-[#E5E5EA] transition-colors"
                  >
                    Save Sequence
                  </button>
                )}
                <button
                  onClick={copyFullSequence}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#1B1B1B] text-white rounded-md hover:bg-accent-hover transition-colors"
                >
                  <ClipboardDocumentIcon className="size-3" />
                  Copy All
                </button>
              </div>
            </div>

            {/* Timeline */}
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[19px] top-8 bottom-4 w-px bg-[#E5E5EA]" />

              <div className="space-y-4">
                {seqSteps.map((step, i) => {
                  const typeLabel = outreachTypes.find((t) => t.value === step.outreachType)?.label || step.outreachType;
                  const hasStepSubject = step.outreachType === "cold-email" || step.outreachType === "follow-up";

                  if (!step.generated) return null;

                  return (
                    <div key={step.id} className="relative pl-12">
                      {/* Timeline dot */}
                      <div className="absolute left-[11px] top-4 size-[18px] rounded-full bg-emerald-100 border-2 border-emerald-400 flex items-center justify-center">
                        <CheckIcon className="size-2.5 text-emerald-600" />
                      </div>

                      <div className="bg-white border border-[#E5E5EA] rounded-lg overflow-hidden">
                        {/* Step header */}
                        <div className="flex items-center justify-between px-5 py-3 bg-[#F7F8FA] border-b border-[#EDEDEF]">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold">Step {i + 1}</span>
                            <span className="px-2 py-0.5 text-[10px] font-medium bg-[#EDEDEF] text-[#7A7A7A] rounded-full">
                              {typeLabel}
                            </span>
                            <span className="text-[10px] text-[#A0A0A0]">
                              Day {step.day}
                            </span>
                          </div>
                          <button
                            onClick={() => copyStep(step)}
                            className="p-1.5 text-[#C5C5C5] hover:text-[#7A7A7A] transition-colors"
                            title="Copy this step"
                          >
                            <ClipboardDocumentIcon className="size-3.5" />
                          </button>
                        </div>

                        {/* Subject line */}
                        {hasStepSubject && step.subjectLine && (
                          <div className="px-5 py-2.5 border-b border-[#EDEDEF] bg-[#F7F8FA]">
                            <span className="text-[9px] font-semibold uppercase tracking-wider text-[#A0A0A0]">Subject: </span>
                            <span className="text-xs font-semibold">{step.subjectLine}</span>
                          </div>
                        )}

                        {/* Body */}
                        <div className="px-5 py-4">
                          <MarkdownRenderer content={step.body} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Regenerate all */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={generateAllSteps}
                disabled={seqLoading}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md border border-[#E5E5EA] bg-white text-[#7A7A7A] hover:border-[#C5C5C5] hover:text-[#1B1B1B] transition-colors disabled:opacity-40"
              >
                <ArrowPathIcon className="size-3.5" />
                Regenerate All
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Markdown Renderer ───────────────────────────────────────────

function MarkdownRenderer({ content }: { content: string }) {
  const html = content
    .replace(
      /^### (.*$)/gm,
      '<h3 class="text-base font-semibold mt-6 mb-2">$1</h3>'
    )
    .replace(
      /^## (.*$)/gm,
      '<h2 class="text-lg font-bold mt-8 mb-3 pb-2 border-b border-[#E5E5EA]">$1</h2>'
    )
    .replace(
      /^# (.*$)/gm,
      '<h1 class="text-xl font-bold mt-8 mb-3">$1</h1>'
    )
    .replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(
      /^- (.*$)/gm,
      '<li class="ml-4 list-disc text-sm leading-relaxed">$1</li>'
    )
    .replace(
      /^\d+\. (.*$)/gm,
      '<li class="ml-4 list-decimal text-sm leading-relaxed">$1</li>'
    )
    .replace(
      /\[([^\]]+)\]\s*$/gm,
      '<span class="inline-block mt-4 mb-1 text-xs font-semibold uppercase tracking-wider text-[#A0A0A0]">$1</span>'
    )
    .replace(/\n\n/g, '</p><p class="text-sm leading-relaxed mb-3">')
    .replace(/\n/g, "<br/>");

  return (
    <div
      dangerouslySetInnerHTML={{
        __html: `<p class="text-sm leading-relaxed mb-3">${html}</p>`,
      }}
    />
  );
}
