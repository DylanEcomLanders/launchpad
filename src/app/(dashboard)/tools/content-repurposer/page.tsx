"use client";

import { useState, useCallback } from "react";
import { DecorativeBlocks } from "@/components/decorative-blocks";
import {
  ClipboardDocumentIcon,
  CheckIcon,
  ChevronDownIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { ArrowsRightLeftIcon } from "@heroicons/react/24/solid";
import { inputClass, labelClass, textareaClass } from "@/lib/form-styles";
import {
  type Platform,
  type SourceFormat,
  type SourceContent,
  type RepurposedOutput,
  platforms,
  repurposeContent,
} from "@/lib/content-engine";

const sourceFormats: { id: SourceFormat; label: string }[] = [
  { id: "case-study", label: "Case Study" },
  { id: "blog-post", label: "Blog Post" },
  { id: "video-script", label: "Video Script" },
  { id: "twitter-thread", label: "Twitter Thread" },
  { id: "linkedin-article", label: "LinkedIn Article" },
  { id: "podcast-notes", label: "Podcast Notes" },
  { id: "client-result", label: "Client Result" },
];

const defaultSource: SourceContent = {
  format: "case-study",
  title: "",
  body: "",
  keyPoints: ["", "", ""],
  clientName: "",
  metric: "",
  topic: "",
};

export default function ContentRepurposerPage() {
  const [source, setSource] = useState<SourceContent>({ ...defaultSource });
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<Platform>>(
    new Set(["twitter", "linkedin"])
  );
  const [outputs, setOutputs] = useState<RepurposedOutput[]>([]);
  const [showOutputs, setShowOutputs] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [expandedTips, setExpandedTips] = useState<Set<number>>(new Set());

  const updateSource = useCallback(
    <K extends keyof SourceContent>(key: K, value: SourceContent[K]) => {
      setSource((prev) => ({ ...prev, [key]: value }));
      setShowOutputs(false);
    },
    []
  );

  const updateKeyPoint = (index: number, value: string) => {
    const updated = [...source.keyPoints];
    updated[index] = value;
    updateSource("keyPoints", updated);
  };

  const addKeyPoint = () => {
    updateSource("keyPoints", [...source.keyPoints, ""]);
  };

  const removeKeyPoint = (index: number) => {
    if (source.keyPoints.length <= 1) return;
    updateSource(
      "keyPoints",
      source.keyPoints.filter((_, i) => i !== index)
    );
  };

  const togglePlatform = (p: Platform) => {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(p)) {
        if (next.size > 1) next.delete(p);
      } else {
        next.add(p);
      }
      return next;
    });
    setShowOutputs(false);
  };

  const handleRepurpose = () => {
    const result = repurposeContent(source, Array.from(selectedPlatforms));
    setOutputs(result);
    setShowOutputs(true);
    setExpandedTips(new Set());
  };

  const copyOutput = async (text: string, idx: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const toggleTips = (idx: number) => {
    setExpandedTips((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const hasKeyPoints = source.keyPoints.some((kp) => kp.trim());
  const isValid = source.title.trim() && source.topic.trim() && hasKeyPoints;
  const showClientFields =
    source.format === "case-study" || source.format === "client-result";

  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-12 py-16 md:py-24">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            Content Repurposer
          </h1>
          <p className="text-[#7A7A7A]">
            Write once, get native variants for Twitter, LinkedIn, TikTok, and
            Instagram
          </p>
        </div>

        <div className="space-y-8">
          {/* ── Source Format ── */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A7A7A] mb-4">
              Source Format
            </label>
            <div className="flex flex-wrap gap-2">
              {sourceFormats.map((sf) => (
                <button
                  key={sf.id}
                  onClick={() => updateSource("format", sf.id)}
                  className={`px-3 py-2 text-xs font-medium rounded-md border transition-colors ${
                    source.format === sf.id
                      ? "bg-[#1B1B1B] text-white border-[#1B1B1B]"
                      : "bg-white text-[#7A7A7A] border-[#E5E5EA] hover:bg-[#F3F3F5]"
                  }`}
                >
                  {sf.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Source Content ── */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A7A7A] mb-4">
              Source Content
            </label>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={source.title}
                    onChange={(e) => updateSource("title", e.target.value)}
                    placeholder="e.g., How we rebuilt Nutribloom's PDP for 43% more conversions"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Topic <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={source.topic}
                    onChange={(e) => updateSource("topic", e.target.value)}
                    placeholder="e.g., conversion optimization"
                    className={inputClass}
                  />
                </div>
              </div>

              {showClientFields && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>
                      Client Name{" "}
                      <span className="font-normal text-[#A0A0A0]">
                        (optional)
                      </span>
                    </label>
                    <input
                      type="text"
                      value={source.clientName}
                      onChange={(e) =>
                        updateSource("clientName", e.target.value)
                      }
                      placeholder="e.g., Nutribloom"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      Key Metric{" "}
                      <span className="font-normal text-[#A0A0A0]">
                        (optional)
                      </span>
                    </label>
                    <input
                      type="text"
                      value={source.metric}
                      onChange={(e) => updateSource("metric", e.target.value)}
                      placeholder="e.g., 43% CVR increase"
                      className={inputClass}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className={labelClass}>
                  Body / Context{" "}
                  <span className="font-normal text-[#A0A0A0]">
                    (optional)
                  </span>
                </label>
                <textarea
                  value={source.body}
                  onChange={(e) => updateSource("body", e.target.value)}
                  placeholder="Paste the full content, or a summary of what happened..."
                  rows={6}
                  className={textareaClass}
                />
              </div>

              {/* Key Points */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={labelClass}>
                    Key Points <span className="text-red-400">*</span>
                  </label>
                  <button
                    onClick={addKeyPoint}
                    className="flex items-center gap-1 text-xs font-medium text-[#7A7A7A] hover:text-[#1B1B1B] transition-colors"
                  >
                    <PlusIcon className="size-3.5" />
                    Add point
                  </button>
                </div>
                <div className="space-y-2">
                  {source.keyPoints.map((kp, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-[1fr_36px] gap-2 items-start"
                    >
                      <input
                        type="text"
                        value={kp}
                        onChange={(e) => updateKeyPoint(i, e.target.value)}
                        placeholder={`Key takeaway ${i + 1}...`}
                        className={inputClass}
                      />
                      <button
                        onClick={() => removeKeyPoint(i)}
                        disabled={source.keyPoints.length <= 1}
                        className="p-2.5 text-[#A0A0A0] hover:text-[#1B1B1B] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <TrashIcon className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-[#A0A0A0] mt-1.5">
                  Pull out the 3-5 most important points — these drive the
                  outputs
                </p>
              </div>
            </div>
          </div>

          {/* ── Platform Selection ── */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A7A7A] mb-4">
              Output Platforms
            </label>
            <div className="flex flex-wrap gap-2">
              {platforms.map((p) => (
                <button
                  key={p.id}
                  onClick={() => togglePlatform(p.id)}
                  className={`px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
                    selectedPlatforms.has(p.id)
                      ? "bg-[#1B1B1B] text-white border-[#1B1B1B]"
                      : "bg-white text-[#7A7A7A] border-[#E5E5EA] hover:bg-[#F3F3F5]"
                  }`}
                >
                  <span className="mr-1.5">{p.icon}</span>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Generate Button ── */}
          <div className="pt-4">
            <button
              onClick={handleRepurpose}
              disabled={!isValid}
              className="flex items-center gap-2 px-6 py-3 bg-[#1B1B1B] text-white text-sm font-medium rounded-md hover:bg-[#2D2D2D] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArrowsRightLeftIcon className="size-4" />
              Repurpose Content
            </button>
            {!isValid && (
              <p className="text-xs text-[#A0A0A0] mt-2">
                Add a title, topic, and at least one key point
              </p>
            )}
          </div>
        </div>

        {/* ── Outputs ── */}
        {showOutputs && outputs.length > 0 && (
          <div className="mt-12 pt-12 border-t border-[#E5E5EA] space-y-6">
            <div>
              <h2 className="text-lg font-bold tracking-tight mb-1">
                Repurposed Content
              </h2>
              <p className="text-xs text-[#7A7A7A]">
                {outputs.length} outputs across{" "}
                {selectedPlatforms.size} platforms
              </p>
            </div>

            {outputs.map((output, idx) => {
              const plat = platforms.find((p) => p.id === output.platform);
              return (
                <div
                  key={idx}
                  className="bg-[#F7F8FA] border border-[#E5E5EA] rounded-lg overflow-hidden"
                >
                  <div className="p-4 border-b border-[#E5E5EA] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-[#EDEDEF] text-[10px] font-bold">
                        {plat?.icon}
                      </span>
                      <span className="text-sm font-semibold text-[#1B1B1B]">
                        {plat?.label}
                      </span>
                      <span className="text-[10px] font-medium text-[#A0A0A0] bg-white px-2 py-0.5 rounded border border-[#E5E5EA]">
                        {output.format}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#A0A0A0] tabular-nums">
                      {output.charCount} chars
                    </span>
                  </div>

                  <div className="p-4">
                    <pre className="text-sm text-[#1B1B1B] leading-relaxed whitespace-pre-wrap font-sans">
                      {output.content}
                    </pre>
                  </div>

                  <div className="px-4 pb-4 flex items-center gap-2">
                    <button
                      onClick={() => copyOutput(output.content, idx)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-[#E5E5EA] bg-white text-[#7A7A7A] hover:bg-[#F3F3F5] transition-colors"
                    >
                      {copiedIdx === idx ? (
                        <>
                          <CheckIcon className="size-3.5 text-emerald-500" />
                          Copied
                        </>
                      ) : (
                        <>
                          <ClipboardDocumentIcon className="size-3.5" />
                          Copy
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => toggleTips(idx)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-[#E5E5EA] bg-white text-[#7A7A7A] hover:bg-[#F3F3F5] transition-colors"
                    >
                      Platform Tips
                      <ChevronDownIcon
                        className={`size-3 transition-transform ${
                          expandedTips.has(idx) ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </div>

                  {expandedTips.has(idx) && (
                    <div className="px-4 pb-4">
                      <div className="bg-white border border-[#E5E5EA] rounded-md p-3">
                        <ul className="space-y-1.5">
                          {output.tips.map((tip, ti) => (
                            <li
                              key={ti}
                              className="text-xs text-[#7A7A7A] flex items-start gap-2"
                            >
                              <span className="text-[#A0A0A0] mt-0.5">
                                \u2192
                              </span>
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
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
