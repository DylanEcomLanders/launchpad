"use client";

import { useState, useRef, useCallback } from "react";
import {
  BeakerIcon,
  ArrowPathIcon,
  PhotoIcon,
  XMarkIcon,
  CheckCircleIcon,
  LightBulbIcon,
} from "@heroicons/react/24/solid";
import { inputClass, selectClass, labelClass } from "@/lib/form-styles";
import type { AuditSection, AuditResult } from "@/lib/types";

const PAGE_TYPES = [
  "PDP",
  "Collection",
  "Landing Page",
  "Homepage",
  "Advertorial",
  "Other",
];

// ── Page ────────────────────────────────────────────────────────────

export default function CroAuditPage() {
  const [controlImage, setControlImage] = useState<string | null>(null);
  const [variantImage, setVariantImage] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [pageType, setPageType] = useState("");
  const [stats, setStats] = useState({
    conversionRate: "",
    aov: "",
    bounceRate: "",
    sessions: "",
  });
  const [additionalContext, setAdditionalContext] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resultsRef = useRef<HTMLDivElement>(null);

  const isFormValid = controlImage && variantImage && clientName.trim();

  async function runAudit() {
    if (!isFormValid) return;
    setScanning(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/cro-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          controlImage,
          variantImage,
          clientName: clientName.trim(),
          pageType,
          currentStats: stats,
          additionalContext: additionalContext.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || `Audit failed (${res.status})`);
        return;
      }

      setResult(data);

      // Scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to connect to audit API"
      );
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 md:px-12 py-12 md:py-16">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl font-bold tracking-tight mb-1">CRO Audit</h1>
        <p className="text-sm text-[#7A7A7A]">
          Upload designs to get an AI-powered conversion analysis
        </p>
      </div>

      {/* Upload Section */}
      <div className="mb-8">
        <p className={labelClass}>Screenshots</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ImageUpload
            label="Control"
            sublabel="Client's current page"
            image={controlImage}
            onImageChange={setControlImage}
          />
          <ImageUpload
            label="Your Design"
            sublabel="Proposed variant"
            image={variantImage}
            onImageChange={setVariantImage}
          />
        </div>
      </div>

      {/* Details Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className={labelClass}>
            Client Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="e.g. Huel"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Page Type</label>
          <select
            value={pageType}
            onChange={(e) => setPageType(e.target.value)}
            className={selectClass}
          >
            <option value="">Select type...</option>
            {PAGE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Current Stats */}
      <div className="mb-6">
        <p className={labelClass}>Current Stats (optional)</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] text-[#A0A0A0] mb-1">
              CR (%)
            </label>
            <input
              type="text"
              value={stats.conversionRate}
              onChange={(e) =>
                setStats((s) => ({ ...s, conversionRate: e.target.value }))
              }
              placeholder="3.2"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-[11px] text-[#A0A0A0] mb-1">
              AOV ($)
            </label>
            <input
              type="text"
              value={stats.aov}
              onChange={(e) =>
                setStats((s) => ({ ...s, aov: e.target.value }))
              }
              placeholder="65"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-[11px] text-[#A0A0A0] mb-1">
              Bounce (%)
            </label>
            <input
              type="text"
              value={stats.bounceRate}
              onChange={(e) =>
                setStats((s) => ({ ...s, bounceRate: e.target.value }))
              }
              placeholder="45"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-[11px] text-[#A0A0A0] mb-1">
              Sessions
            </label>
            <input
              type="text"
              value={stats.sessions}
              onChange={(e) =>
                setStats((s) => ({ ...s, sessions: e.target.value }))
              }
              placeholder="12,000"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Additional Context */}
      <div className="mb-8">
        <label className={labelClass}>Additional Context</label>
        <textarea
          value={additionalContext}
          onChange={(e) => setAdditionalContext(e.target.value)}
          placeholder="e.g. Client sells supplements, targeting 25-40 females, main traffic from Meta ads..."
          rows={3}
          className={`${inputClass} resize-none`}
        />
      </div>

      {/* Run Button */}
      <div className="mb-8">
        <button
          onClick={runAudit}
          disabled={!isFormValid || scanning}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#1B1B1B] text-white text-sm font-medium rounded-md hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {scanning ? (
            <>
              <ArrowPathIcon className="size-4 animate-spin" />
              Analysing...
            </>
          ) : (
            <>
              <BeakerIcon className="size-4" />
              Run CRO Audit
            </>
          )}
        </button>
      </div>

      {/* Scanning State */}
      {scanning && (
        <div className="flex items-center gap-3 p-6 bg-[#EDEDEF] border border-[#E5E5EA] rounded-lg mb-8">
          <ArrowPathIcon className="size-5 animate-spin text-[#7A7A7A]" />
          <div>
            <p className="text-sm font-medium">
              Analysing designs with Claude...
            </p>
            <p className="text-xs text-[#7A7A7A] mt-0.5">
              This usually takes 15–30 seconds
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-8">
          <p className="text-sm text-red-700 font-medium">Audit failed</p>
          <p className="text-xs text-red-600 mt-1">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && !scanning && (
        <div ref={resultsRef} className="space-y-6">
          {/* Verdict Banner */}
          <VerdictBanner verdict={result.verdict} impact={result.predictedImpact} />

          {/* Side-by-side thumbnails */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#7A7A7A] mb-2">
                Control
              </p>
              <div className="rounded-lg overflow-hidden border border-[#E5E5EA]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={controlImage!}
                  alt="Control design"
                  className="w-full h-auto"
                />
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#7A7A7A] mb-2">
                Your Design
              </p>
              <div className="rounded-lg overflow-hidden border border-[#E5E5EA]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={variantImage!}
                  alt="Variant design"
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>

          {/* Analysis Sections */}
          <div>
            <p className={`${labelClass} mb-4`}>Analysis</p>
            <div className="space-y-3">
              {result.sections.map((section, i) => (
                <AnalysisSection key={i} section={section} />
              ))}
            </div>
          </div>

          {/* Quick Wins */}
          {result.quickWins.length > 0 && (
            <div className="bg-[#EDEDEF] border border-[#E5E5EA] rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <LightBulbIcon className="size-4 text-amber-500" />
                <p className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A]">
                  Quick Wins
                </p>
              </div>
              <div className="space-y-3">
                {result.quickWins.map((win, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="flex-shrink-0 size-5 rounded-full bg-[#1B1B1B] text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm text-[#3A3A3A] leading-relaxed">
                      {win}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Image Upload ────────────────────────────────────────────────────

function ImageUpload({
  label,
  sublabel,
  image,
  onImageChange,
}: {
  label: string;
  sublabel: string;
  image: string | null;
  onImageChange: (img: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        onImageChange(reader.result as string);
      };
      reader.readAsDataURL(file);
    },
    [onImageChange]
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  if (image) {
    return (
      <div className="relative group">
        <div className="rounded-lg overflow-hidden border border-[#E5E5EA]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt={label} className="w-full h-auto" />
        </div>
        <div className="absolute top-2 left-2">
          <span className="px-2 py-1 bg-black/70 text-white text-[10px] font-semibold uppercase tracking-wider rounded">
            {label}
          </span>
        </div>
        <button
          onClick={() => onImageChange(null)}
          className="absolute top-2 right-2 p-1.5 bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          title="Remove image"
        >
          <XMarkIcon className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`
        flex flex-col items-center justify-center gap-3 p-8
        border-2 border-dashed rounded-lg cursor-pointer
        transition-colors duration-150
        ${
          dragOver
            ? "border-[#1B1B1B] bg-[#EDEDEF]"
            : "border-[#E5E5EA] bg-[#F7F8FA] hover:border-[#C5C5C5] hover:bg-[#F3F3F5]"
        }
      `}
    >
      <PhotoIcon className="size-8 text-[#C5C5C5]" />
      <div className="text-center">
        <p className="text-sm font-medium text-[#7A7A7A]">{label}</p>
        <p className="text-xs text-[#A0A0A0] mt-0.5">{sublabel}</p>
      </div>
      <p className="text-[10px] text-[#C5C5C5]">
        Drop image or click to browse
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  );
}

// ── Verdict Banner ──────────────────────────────────────────────────

function VerdictBanner({
  verdict,
  impact,
}: {
  verdict: AuditResult["verdict"];
  impact: string;
}) {
  const config = {
    variant: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      icon: "text-emerald-500",
      title: "Your design is stronger",
      titleColor: "text-emerald-700",
    },
    control: {
      bg: "bg-red-50",
      border: "border-red-200",
      icon: "text-red-500",
      title: "Control is stronger",
      titleColor: "text-red-700",
    },
    mixed: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      icon: "text-amber-500",
      title: "Mixed results",
      titleColor: "text-amber-700",
    },
  };

  const c = config[verdict.winner];

  return (
    <div className={`${c.bg} ${c.border} border rounded-lg p-6`}>
      <div className="flex items-center gap-2 mb-2">
        <CheckCircleIcon className={`size-5 ${c.icon}`} />
        <h3 className={`text-lg font-bold ${c.titleColor}`}>{c.title}</h3>
      </div>
      <p className="text-sm text-[#3A3A3A] leading-relaxed mb-3">
        {verdict.summary}
      </p>
      <p className="text-xs font-semibold text-[#7A7A7A]">
        Predicted impact:{" "}
        <span className="text-[#1B1B1B]">{impact}</span>
      </p>
    </div>
  );
}

// ── Analysis Section ────────────────────────────────────────────────

function AnalysisSection({ section }: { section: AuditSection }) {
  const ratingConfig = {
    strong: {
      label: "Strong",
      bg: "bg-emerald-100",
      text: "text-emerald-700",
      dot: "bg-emerald-500",
    },
    moderate: {
      label: "Moderate",
      bg: "bg-amber-100",
      text: "text-amber-700",
      dot: "bg-amber-500",
    },
    weak: {
      label: "Weak",
      bg: "bg-red-100",
      text: "text-red-700",
      dot: "bg-red-500",
    },
  };

  const r = ratingConfig[section.rating] || ratingConfig.moderate;

  return (
    <div className="bg-[#EDEDEF] border border-[#E5E5EA] rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold">{section.title}</h4>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${r.bg} ${r.text} text-[10px] font-semibold rounded-full`}
        >
          <span className={`size-1.5 rounded-full ${r.dot}`} />
          {r.label}
        </span>
      </div>
      <p className="text-sm text-[#3A3A3A] leading-relaxed">
        {section.analysis}
      </p>
    </div>
  );
}
