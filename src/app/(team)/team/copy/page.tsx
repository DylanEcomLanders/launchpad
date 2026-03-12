"use client";

import { useState, useEffect, useRef } from "react";
import {
  ClipboardDocumentIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/solid";
import { DecorativeBlocks } from "@/components/decorative-blocks";
import {
  type CopyMode,
  type CopySection,
  modeSections,
} from "@/lib/copy-engine/types";
import type { BrandProfile } from "@/lib/brand-profiles/types";
import { getBrandProfiles } from "@/lib/brand-profiles/data";

const copyModes: CopyMode[] = ["PDP", "Collection", "Landing Page"];

type Status = "idle" | "generating" | "done" | "error";

export default function CopyEnginePage() {
  /* ── state ── */
  const [mode, setMode] = useState<CopyMode>("PDP");
  const [profiles, setProfiles] = useState<BrandProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [keyBenefits, setKeyBenefits] = useState("");
  const [tone, setTone] = useState("conversational, confident");

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

  /* ── auto-fill from profile ── */
  useEffect(() => {
    if (!selectedProfileId) return;
    const profile = profiles.find((p) => p.id === selectedProfileId);
    if (!profile) return;

    setProductName(profile.project_name);
    setProductDescription(
      `${profile.brand_url}\n\nKey objections: ${profile.objections.join(", ")}`
    );
    setTargetAudience(
      profile.desires.length > 0
        ? `People who want: ${profile.desires.slice(0, 3).join("; ")}`
        : ""
    );
    setKeyBenefits(
      profile.pain_points.length > 0
        ? profile.pain_points.slice(0, 4).join("; ")
        : ""
    );
  }, [selectedProfileId, profiles]);

  /* ── auto-scroll during generation ── */
  useEffect(() => {
    if (status === "generating" && outputRef.current) {
      outputRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [rawStream, status]);

  /* ── generate copy ── */
  async function handleGenerate() {
    if (!productName.trim() || !productDescription.trim()) return;

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
          productName: productName.trim(),
          productDescription: productDescription.trim(),
          targetAudience: targetAudience.trim(),
          keyBenefits: keyBenefits.trim(),
          tone: tone.trim(),
          brandContext: profile?.raw_report || null,
        }),
      });

      if (!res.ok || !res.body) {
        setStatus("error");
        setErrorMessage("Failed to connect to the copy engine.");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if ("text" in data) {
                accumulated += data.text;
                setRawStream(accumulated);
              }
              if ("message" in data && line.includes("generation_complete")) {
                // Parse accumulated JSON
                try {
                  const parsed = JSON.parse(accumulated);
                  if (parsed.sections && Array.isArray(parsed.sections)) {
                    setSections(parsed.sections);
                    setStatus("done");
                  } else {
                    throw new Error("Invalid response shape");
                  }
                } catch {
                  // Try extracting JSON from the accumulated text
                  const jsonMatch = accumulated.match(/\{[\s\S]*\}/);
                  if (jsonMatch) {
                    try {
                      const parsed = JSON.parse(jsonMatch[0]);
                      if (parsed.sections) {
                        setSections(parsed.sections);
                        setStatus("done");
                      } else {
                        throw new Error("No sections");
                      }
                    } catch {
                      setStatus("error");
                      setErrorMessage(
                        "Failed to parse generated copy. Please try again."
                      );
                    }
                  } else {
                    setStatus("error");
                    setErrorMessage(
                      "Failed to parse generated copy. Please try again."
                    );
                  }
                }
              }
              if ("message" in data && line.includes("app_error")) {
                setStatus("error");
                setErrorMessage(data.message);
              }
            } catch {
              // skip unparseable lines
            }
          }
        }
      }

      // If stream ended without generation_complete event, try parsing
      if (status !== "done" && status !== "error" && accumulated) {
        try {
          const jsonMatch = accumulated.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.sections) {
              setSections(parsed.sections);
              setStatus("done");
              return;
            }
          }
        } catch {
          // fallback handled below
        }
        setStatus("error");
        setErrorMessage("Generation ended unexpectedly. Please try again.");
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    }
  }

  /* ── copy helpers ── */
  function copySection(id: string, content: string) {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function copyAll() {
    const text = sections
      .map((s) => `── ${s.label} ──\n${s.content}`)
      .join("\n\n");
    navigator.clipboard.writeText(text);
    setCopiedId("__all__");
    setTimeout(() => setCopiedId(null), 2000);
  }

  /* ── expected sections for current mode ── */
  const expectedSections = modeSections[mode];

  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-12 py-12 md:py-16">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
            Copy Engine
          </h1>
          <p className="text-[#6B6B6B] text-sm">
            AI-generated page copy powered by brand research and VOC data
          </p>
        </div>

        {/* Mode selector */}
        <div className="flex flex-wrap gap-2 mb-6">
          {copyModes.map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                mode === m
                  ? "bg-[#0A0A0A] text-white"
                  : "bg-[#F5F5F5] text-[#6B6B6B] hover:bg-[#EBEBEB]"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Expected sections preview */}
        <div className="bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg px-5 py-3 mb-6">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA] mb-2">
            Sections for {mode}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {expectedSections.map((s) => (
              <span
                key={s.id}
                className="px-2 py-0.5 text-[10px] font-medium bg-white text-[#6B6B6B] border border-[#E5E5E5] rounded"
              >
                {s.label}
              </span>
            ))}
          </div>
        </div>

        {/* Input form */}
        <div className="bg-white border border-[#E5E5E5] rounded-lg p-6 mb-6 space-y-4">
          {/* Brand profile selector */}
          {profiles.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-[#3A3A3A] mb-1.5">
                Brand Profile{" "}
                <span className="text-[#AAAAAA] font-normal">(optional — auto-fills fields + adds VOC context)</span>
              </label>
              <select
                value={selectedProfileId}
                onChange={(e) => setSelectedProfileId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#E5E5E5] rounded-md bg-white focus:outline-none focus:border-[#0A0A0A] transition-colors"
              >
                <option value="">None — manual input</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.project_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Product name */}
          <div>
            <label className="block text-xs font-medium text-[#3A3A3A] mb-1.5">
              Product / Page Name *
            </label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g. Ultra-Hydrating Serum"
              className="w-full px-3 py-2 text-sm border border-[#E5E5E5] rounded-md focus:outline-none focus:border-[#0A0A0A] transition-colors"
            />
          </div>

          {/* Product description */}
          <div>
            <label className="block text-xs font-medium text-[#3A3A3A] mb-1.5">
              Product Description *
            </label>
            <textarea
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              rows={3}
              placeholder="What is this product? Key ingredients, features, what makes it different..."
              className="w-full px-3 py-2 text-sm border border-[#E5E5E5] rounded-md focus:outline-none focus:border-[#0A0A0A] transition-colors resize-none"
            />
          </div>

          {/* Target audience */}
          <div>
            <label className="block text-xs font-medium text-[#3A3A3A] mb-1.5">
              Target Audience
            </label>
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g. Women 25-45 dealing with dry skin, willing to invest in skincare"
              className="w-full px-3 py-2 text-sm border border-[#E5E5E5] rounded-md focus:outline-none focus:border-[#0A0A0A] transition-colors"
            />
          </div>

          {/* Key benefits */}
          <div>
            <label className="block text-xs font-medium text-[#3A3A3A] mb-1.5">
              Key Benefits / Pain Points
            </label>
            <input
              type="text"
              value={keyBenefits}
              onChange={(e) => setKeyBenefits(e.target.value)}
              placeholder="e.g. 72hr hydration; reduces fine lines; absorbs instantly"
              className="w-full px-3 py-2 text-sm border border-[#E5E5E5] rounded-md focus:outline-none focus:border-[#0A0A0A] transition-colors"
            />
          </div>

          {/* Tone */}
          <div>
            <label className="block text-xs font-medium text-[#3A3A3A] mb-1.5">
              Tone
            </label>
            <input
              type="text"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              placeholder="e.g. conversational, confident"
              className="w-full px-3 py-2 text-sm border border-[#E5E5E5] rounded-md focus:outline-none focus:border-[#0A0A0A] transition-colors"
            />
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={
              status === "generating" ||
              !productName.trim() ||
              !productDescription.trim()
            }
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-md transition-all ${
              status === "generating"
                ? "bg-[#3A3A3A] text-white cursor-wait"
                : !productName.trim() || !productDescription.trim()
                ? "bg-[#E5E5E5] text-[#AAAAAA] cursor-not-allowed"
                : "bg-[#0A0A0A] text-white hover:bg-[#2A2A2A]"
            }`}
          >
            {status === "generating" ? (
              <>
                <ArrowPathIcon className="size-4 animate-spin" />
                Generating {mode} copy...
              </>
            ) : (
              `Generate ${mode} Copy`
            )}
          </button>
        </div>

        {/* Output area */}
        <div ref={outputRef}>
          {/* Streaming indicator */}
          {status === "generating" && (
            <div className="bg-white border border-[#E5E5E5] rounded-lg p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <ArrowPathIcon className="size-4 text-[#6B6B6B] animate-spin" />
                <span className="text-sm text-[#6B6B6B]">
                  Writing {mode} copy...
                </span>
              </div>
              <div className="bg-[#F5F5F5] rounded-md p-4 max-h-64 overflow-y-auto">
                <pre className="text-xs text-[#6B6B6B] whitespace-pre-wrap font-mono">
                  {rawStream || "Waiting for response..."}
                </pre>
              </div>
            </div>
          )}

          {/* Error */}
          {status === "error" && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-5 mb-6">
              <p className="text-sm text-red-700 font-medium mb-1">
                Generation failed
              </p>
              <p className="text-xs text-red-600">{errorMessage}</p>
            </div>
          )}

          {/* Generated sections */}
          {status === "done" && sections.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold">
                  Generated {mode} Copy
                </h2>
                <button
                  onClick={copyAll}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    copiedId === "__all__"
                      ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                      : "bg-[#0A0A0A] text-white hover:bg-[#2A2A2A]"
                  }`}
                >
                  {copiedId === "__all__" ? (
                    <>
                      <CheckCircleIcon className="size-3.5" />
                      Copied All
                    </>
                  ) : (
                    <>
                      <ClipboardDocumentIcon className="size-3.5" />
                      Copy All Sections
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-3">
                {sections.map((section) => (
                  <div
                    key={section.id}
                    className="bg-white border border-[#E5E5E5] rounded-lg overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-5 py-3 border-b border-[#F0F0F0]">
                      <h3 className="text-xs font-semibold text-[#3A3A3A] uppercase tracking-wider">
                        {section.label}
                      </h3>
                      <button
                        onClick={() =>
                          copySection(section.id, section.content)
                        }
                        className={`flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded transition-all ${
                          copiedId === section.id
                            ? "bg-emerald-50 text-emerald-700"
                            : "text-[#AAAAAA] hover:text-[#3A3A3A] hover:bg-[#F5F5F5]"
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
                    <div className="px-5 py-4">
                      <p className="text-sm text-[#3A3A3A] leading-relaxed whitespace-pre-wrap">
                        {section.content}
                      </p>
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
