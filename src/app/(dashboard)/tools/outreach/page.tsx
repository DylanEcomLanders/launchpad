"use client";

import { useState } from "react";
import {
  PaperAirplaneIcon,
  ClipboardDocumentIcon,
  CheckIcon,
} from "@heroicons/react/24/solid";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { DecorativeBlocks } from "@/components/decorative-blocks";
import { inputClass, labelClass } from "@/lib/form-styles";

// ── Types ───────────────────────────────────────────────────────

type OutreachType = "cold-email" | "follow-up" | "loom-script" | "linkedin-dm";
type ToneType = "professional" | "casual" | "direct";

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

// ── Component ───────────────────────────────────────────────────

export default function OutreachPage() {
  // Form state
  const [brandName, setBrandName] = useState("");
  const [contactName, setContactName] = useState("");
  const [storeUrl, setStoreUrl] = useState("");
  const [findings, setFindings] = useState("");
  const [outreachType, setOutreachType] = useState<OutreachType>("cold-email");
  const [tone, setTone] = useState<ToneType>("casual");

  // Result state
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<OutreachResult | null>(null);
  const [error, setError] = useState("");

  // Copy state
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedSubject, setCopiedSubject] = useState(false);

  const canSubmit =
    brandName.trim() && findings.trim() && !loading;

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

  const hasSubject =
    outreachType === "cold-email" || outreachType === "follow-up";

  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-12 py-16 md:py-24">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            Outreach Generator
          </h1>
          <p className="text-[#6B6B6B]">
            Generate personalised outreach copy for Shopify brand prospects
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
            <button
              onClick={() => setError("")}
              className="ml-3 text-red-500 hover:text-red-700"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Input Form */}
        <div className="bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg p-5 space-y-5 mb-10">
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
            <p className="text-[10px] text-[#AAAAAA] mt-1">
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

          {/* Outreach Type */}
          <div>
            <label className={labelClass}>Outreach Type</label>
            <div className="inline-flex rounded-md border border-[#E5E5E5] bg-white p-0.5">
              {outreachTypes.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setOutreachType(t.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                    outreachType === t.value
                      ? "bg-[#0A0A0A] text-white"
                      : "text-[#6B6B6B] hover:text-[#0A0A0A]"
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
            <div className="inline-flex rounded-md border border-[#E5E5E5] bg-white p-0.5">
              {tones.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTone(t.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                    tone === t.value
                      ? "bg-[#0A0A0A] text-white"
                      : "text-[#6B6B6B] hover:text-[#0A0A0A]"
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
            className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#0A0A0A] text-white text-sm font-medium rounded-md hover:bg-accent hover:text-[#0A0A0A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Subject line */}
            {hasSubject && result.subjectLine && (
              <div className="bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA] block mb-1">
                      Subject Line
                    </span>
                    <p className="text-sm font-semibold text-[#0A0A0A]">
                      {result.subjectLine}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={copySubject}
                    className="shrink-0 p-2 rounded-md border border-[#E5E5E5] bg-white hover:bg-[#F5F5F5] transition-colors"
                    title="Copy subject line"
                  >
                    {copiedSubject ? (
                      <CheckIcon className="size-3.5 text-emerald-600" />
                    ) : (
                      <ClipboardDocumentIcon className="size-3.5 text-[#AAAAAA]" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Body */}
            <div className="bg-white border border-[#E5E5E5] rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA]">
                  {outreachType === "loom-script"
                    ? "Loom Script"
                    : outreachType === "linkedin-dm"
                    ? "LinkedIn DM"
                    : "Email Body"}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#CCCCCC]">
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
                    : "bg-[#0A0A0A] border-[#0A0A0A] text-white hover:bg-accent hover:text-[#0A0A0A]"
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
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md border border-[#E5E5E5] bg-white text-[#6B6B6B] hover:border-[#CCCCCC] hover:text-[#0A0A0A] transition-colors disabled:opacity-40"
              >
                <ArrowPathIcon className="size-3.5" />
                Regenerate
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
      '<h2 class="text-lg font-bold mt-8 mb-3 pb-2 border-b border-[#E5E5E5]">$1</h2>'
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
      '<span class="inline-block mt-4 mb-1 text-xs font-semibold uppercase tracking-wider text-[#AAAAAA]">$1</span>'
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
