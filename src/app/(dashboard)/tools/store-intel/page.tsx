"use client";

import { useState } from "react";
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  BuildingStorefrontIcon,
  CubeIcon,
  RectangleGroupIcon,
  DocumentMagnifyingGlassIcon,
  CpuChipIcon,
  SwatchIcon,
  ChartBarIcon,
  ChevronDownIcon,
  ClipboardDocumentIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
  EyeIcon,
  ChatBubbleBottomCenterTextIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
} from "@heroicons/react/24/solid";
import { DecorativeBlocks } from "@/components/decorative-blocks";
import { inputClass, labelClass } from "@/lib/form-styles";
import type {
  StoreIntelResult,
  PageAuditResult,
  Finding,
  FindingCategory,
} from "@/lib/store-intel/types";
import {
  CATEGORY_ORDER,
  CATEGORY_META,
  SEVERITY_META,
  generateMarkdownReport,
  generateFindingsText,
} from "@/lib/store-intel/types";

// ── Component ───────────────────────────────────────────────────

type Mode = "store" | "page";

export default function StoreIntelPage() {
  const [mode, setMode] = useState<Mode>("store");
  const [storeUrl, setStoreUrl] = useState("");
  const [brandName, setBrandName] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [storeResult, setStoreResult] = useState<StoreIntelResult | null>(null);
  const [pageResult, setPageResult] = useState<PageAuditResult | null>(null);
  const [error, setError] = useState("");

  async function runAnalysis() {
    if (mode === "store" && (!storeUrl.trim() || !brandName.trim())) return;
    if (mode === "page" && !pageUrl.trim()) return;

    setLoading(true);
    setError("");
    setStoreResult(null);
    setPageResult(null);

    if (mode === "store") {
      setProgress("Crawling store and collecting data...");
    } else {
      setProgress("Crawling page and analysing elements...");
    }

    try {
      const progressTimer = setInterval(() => {
        setProgress((prev) => {
          if (mode === "page") {
            if (prev.includes("Crawling")) return "Detecting tech stack and persuasion elements...";
            if (prev.includes("Detecting")) return "Running AI audit with Claude...";
            return "Generating findings...";
          }
          if (prev.includes("Crawling")) return "Analysing products and collections...";
          if (prev.includes("products")) return "Detecting tech stack and apps...";
          if (prev.includes("tech")) return "Running AI analysis with Claude...";
          return "Generating findings...";
        });
      }, 6000);

      const res = await fetch("/api/store-intel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "store"
            ? { storeUrl, brandName, mode: "store" }
            : { pageUrl, mode: "page" }
        ),
      });

      clearInterval(progressTimer);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      if (mode === "page") {
        setPageResult(data as PageAuditResult);
      } else {
        setStoreResult(data as StoreIntelResult);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
      setProgress("");
    }
  }

  const canRun = mode === "store"
    ? storeUrl.trim() && brandName.trim()
    : pageUrl.trim();

  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-12 py-12 md:py-16">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
            Audit Machine
          </h1>
          <p className="text-[#7A7A7A] text-sm">
            Analyse any Shopify store or audit a single page — get categorised, actionable findings
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-1 mb-6 bg-[#EDEDEF] border border-[#E5E5EA] rounded-lg p-1 w-fit">
          <button
            onClick={() => { setMode("store"); setStoreResult(null); setPageResult(null); setError(""); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              mode === "store"
                ? "bg-white border border-[#E5E5EA] shadow-sm"
                : "text-[#7A7A7A] hover:text-[#3A3A3A]"
            }`}
          >
            <span className="flex items-center gap-2">
              <BuildingStorefrontIcon className="size-3.5" />
              Full Store Analysis
            </span>
          </button>
          <button
            onClick={() => { setMode("page"); setStoreResult(null); setPageResult(null); setError(""); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              mode === "page"
                ? "bg-white border border-[#E5E5EA] shadow-sm"
                : "text-[#7A7A7A] hover:text-[#3A3A3A]"
            }`}
          >
            <span className="flex items-center gap-2">
              <DocumentTextIcon className="size-3.5" />
              Single Page Audit
            </span>
          </button>
        </div>

        {/* Input Form */}
        <div className="bg-[#F3F3F5] border border-[#E5E5EA] rounded-lg p-5 mb-8">
          {mode === "store" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className={labelClass}>Store URL</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="https://example-brand.com"
                  value={storeUrl}
                  onChange={(e) => setStoreUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runAnalysis()}
                />
              </div>
              <div>
                <label className={labelClass}>Brand Name</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Example Brand"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runAnalysis()}
                />
              </div>
            </div>
          ) : (
            <div className="mb-4">
              <label className={labelClass}>Page URL</label>
              <input
                type="text"
                className={inputClass}
                placeholder="https://example-brand.com/products/hero-product"
                value={pageUrl}
                onChange={(e) => setPageUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runAnalysis()}
              />
              <p className="text-[11px] text-[#A0A0A0] mt-1.5">
                Paste any page — PDP, collection, homepage, landing page. Get a design-focused audit.
              </p>
            </div>
          )}
          <button
            onClick={runAnalysis}
            disabled={loading || !canRun}
            className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1B1B1B] text-white text-sm font-medium rounded-md hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <ArrowPathIcon className="size-4 animate-spin" />
                {progress}
              </>
            ) : (
              <>
                <MagnifyingGlassIcon className="size-4" />
                {mode === "store" ? "Run Store Analysis" : "Run Page Audit"}
              </>
            )}
          </button>
          {loading && (
            <p className="text-xs text-[#A0A0A0] text-center mt-2">
              {mode === "store"
                ? "This takes 2-4 minutes — crawling pages and running AI analysis"
                : "This takes 30-60 seconds — crawling page and running AI audit"}
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* ── Page Audit Results ──────────────────────────────── */}
        {pageResult && <PageAuditResults result={pageResult} />}

        {/* ── Store Analysis Results ──────────────────────────── */}
        {storeResult && <StoreResults result={storeResult} />}
      </div>
    </div>
  );
}

// ── Page Audit Results ──────────────────────────────────────────

function PageAuditResults({ result }: { result: PageAuditResult }) {
  const pe = result.elements.persuasionElements;
  const presentElements = Object.entries(pe).filter(([, v]) => v).map(([k]) => k);
  const missingElements = Object.entries(pe).filter(([, v]) => !v).map(([k]) => k);

  return (
    <div className="space-y-6">
      {/* Page Overview */}
      <div className="bg-[#F3F3F5] border border-[#E5E5EA] rounded-lg p-5">
        <div className="flex items-center gap-2 mb-1">
          <DocumentTextIcon className="size-4 text-[#7A7A7A]" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0]">{result.pageType}</span>
        </div>
        <h2 className="text-sm font-semibold mb-1">{result.title}</h2>
        <p className="text-xs text-[#A0A0A0] break-all">{result.pageUrl}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <StatBox
            icon={<ChartBarIcon className="size-3.5" />}
            label="Effectiveness"
            value={result.effectivenessScore ? `${result.effectivenessScore}/10` : "—"}
            color={
              result.effectivenessScore
                ? result.effectivenessScore >= 7
                  ? "text-emerald-700"
                  : result.effectivenessScore >= 4
                  ? "text-amber-700"
                  : "text-red-700"
                : undefined
            }
          />
          <StatBox icon={<EyeIcon className="size-3.5" />} label="CTAs Found" value={String(result.elements.ctaCount)} />
          <StatBox icon={<CubeIcon className="size-3.5" />} label="Images" value={String(result.elements.imageCount)} />
          <StatBox icon={<ChatBubbleBottomCenterTextIcon className="size-3.5" />} label="Word Count" value={String(result.elements.wordCount)} />
        </div>
      </div>

      {/* Two-col: Persuasion + CTAs/Tech */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#F3F3F5] border border-[#E5E5EA] rounded-lg p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A] mb-3">
            Persuasion Elements
          </h3>
          <div className="space-y-1.5">
            {presentElements.map((el) => (
              <div key={el} className="flex items-center gap-2 text-sm">
                <HandThumbUpIcon className="size-3.5 text-emerald-500 shrink-0" />
                <span className="capitalize text-[#3A3A3A]">{el.replace(/([A-Z])/g, " $1").trim()}</span>
              </div>
            ))}
            {missingElements.map((el) => (
              <div key={el} className="flex items-center gap-2 text-sm">
                <HandThumbDownIcon className="size-3.5 text-red-400 shrink-0" />
                <span className="capitalize text-[#999]">{el.replace(/([A-Z])/g, " $1").trim()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-[#F3F3F5] border border-[#E5E5EA] rounded-lg p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A] mb-3">
              CTAs Found
            </h3>
            {result.elements.ctas.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {result.elements.ctas.map((cta, i) => (
                  <span key={i} className="inline-flex items-center px-2.5 py-1 bg-white border border-[#E5E5EA] rounded text-xs text-[#3A3A3A]">
                    {cta}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#A0A0A0]">No clear CTAs detected</p>
            )}
          </div>

          <div className="bg-[#F3F3F5] border border-[#E5E5EA] rounded-lg p-5">
            <div className="flex items-center gap-2 mb-3">
              <SwatchIcon className="size-4 text-[#7A7A7A]" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A]">Tech Stack</h3>
            </div>
            <p className="text-sm font-medium mb-2">{result.theme}</p>
            {result.appsDetected.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {result.appsDetected.map((app) => (
                  <span key={app} className="inline-flex items-center px-2 py-0.5 bg-white border border-[#E5E5EA] rounded text-[11px] text-[#3A3A3A]">
                    {app}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#A0A0A0]">No major apps detected</p>
            )}
          </div>
        </div>
      </div>

      {/* Summary + Findings */}
      <SummaryCard summary={result.summary} />
      <FindingsSummaryStrip findings={result.findings} />
      <FindingsByCategory findings={result.findings} />
      <ExportBar result={result} />
    </div>
  );
}

// ── Store Results ───────────────────────────────────────────────

function StoreResults({ result }: { result: StoreIntelResult }) {
  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="bg-[#F3F3F5] border border-[#E5E5EA] rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <BuildingStorefrontIcon className="size-4 text-[#7A7A7A]" />
          <h2 className="text-sm font-semibold">{result.brand}</h2>
          <span className="text-xs text-[#A0A0A0]">{result.storeUrl}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatBox icon={<CubeIcon className="size-3.5" />} label="Products" value={String(result.products)} />
          <StatBox icon={<RectangleGroupIcon className="size-3.5" />} label="Collections" value={String(result.collections)} />
          <StatBox icon={<DocumentMagnifyingGlassIcon className="size-3.5" />} label="Pages Crawled" value={String(result.pagesCrawled)} />
          <StatBox icon={<CpuChipIcon className="size-3.5" />} label="Apps Found" value={String(result.appsDetected.length)} />
          <StatBox
            icon={<ChartBarIcon className="size-3.5" />}
            label="Funnel Maturity"
            value={result.funnelMaturity ? `${result.funnelMaturity}/10` : "—"}
            color={
              result.funnelMaturity
                ? result.funnelMaturity >= 7
                  ? "text-emerald-700"
                  : result.funnelMaturity >= 4
                  ? "text-amber-700"
                  : "text-red-700"
                : undefined
            }
          />
        </div>
      </div>

      {/* Tech Stack & Price */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#F3F3F5] border border-[#E5E5EA] rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <SwatchIcon className="size-4 text-[#7A7A7A]" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A]">Tech Stack</h3>
          </div>
          <p className="text-sm font-medium mb-2">{result.theme}</p>
          {result.appsDetected.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {result.appsDetected.map((app) => (
                <span key={app} className="inline-flex items-center px-2 py-0.5 bg-white border border-[#E5E5EA] rounded text-[11px] text-[#3A3A3A]">
                  {app}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#A0A0A0]">No major apps detected</p>
          )}
        </div>

        {result.productAnalysis && (
          <div className="bg-[#F3F3F5] border border-[#E5E5EA] rounded-lg p-5">
            <div className="flex items-center gap-2 mb-3">
              <CubeIcon className="size-4 text-[#7A7A7A]" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A]">Price Analysis</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[10px] text-[#A0A0A0] uppercase">Range</p>
                <p className="font-medium tabular-nums">
                  ${result.productAnalysis.priceRange.min.toFixed(0)} – ${result.productAnalysis.priceRange.max.toFixed(0)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[#A0A0A0] uppercase">Median</p>
                <p className="font-medium tabular-nums">${result.productAnalysis.priceRange.median.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#A0A0A0] uppercase">Discounted</p>
                <p className="font-medium tabular-nums">{result.productAnalysis.discounting.percent}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#A0A0A0] uppercase">Avg Discount</p>
                <p className="font-medium tabular-nums">{result.productAnalysis.discounting.avgDiscount}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary + Findings */}
      <SummaryCard summary={result.summary} />
      <FindingsSummaryStrip findings={result.findings} />
      <FindingsByCategory findings={result.findings} />
      <ExportBar result={result} />
    </div>
  );
}

// ── Summary Card ────────────────────────────────────────────────

function SummaryCard({ summary }: { summary: string }) {
  return (
    <div className="bg-[#F9F9F9] border border-[#E5E5EA] rounded-lg p-5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0] mb-2">Executive Summary</p>
      <p className="text-sm text-[#3A3A3A] leading-relaxed">{summary}</p>
    </div>
  );
}

// ── Findings Summary Strip ──────────────────────────────────────

function FindingsSummaryStrip({ findings }: { findings: Finding[] }) {
  const grouped = groupByCategory(findings);
  const highCount = findings.filter((f) => f.severity === "high").length;

  return (
    <div className="flex flex-wrap items-center gap-4 bg-[#F3F3F5] border border-[#E5E5EA] rounded-lg px-5 py-3">
      {CATEGORY_ORDER.map((cat) => {
        const count = grouped[cat]?.length || 0;
        if (!count) return null;
        const meta = CATEGORY_META[cat];
        return (
          <div key={cat} className="flex items-center gap-1.5">
            <span className={`size-2 rounded-full ${meta.dot}`} />
            <span className="text-xs font-semibold tabular-nums">{count}</span>
            <span className="text-xs text-[#7A7A7A]">{meta.label}</span>
          </div>
        );
      })}
      <div className="ml-auto flex items-center gap-1.5">
        <span className="text-xs text-[#A0A0A0]">{findings.length} total</span>
        {highCount > 0 && (
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-red-100 text-red-700">
            {highCount} critical
          </span>
        )}
      </div>
    </div>
  );
}

// ── Findings by Category ────────────────────────────────────────

function FindingsByCategory({ findings }: { findings: Finding[] }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const grouped = groupByCategory(findings);

  function toggle(cat: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  // Sort findings: high → medium → low
  const severityOrder = { high: 0, medium: 1, low: 2 };

  return (
    <div className="space-y-4">
      {CATEGORY_ORDER.map((cat) => {
        const catFindings = grouped[cat];
        if (!catFindings?.length) return null;
        const meta = CATEGORY_META[cat];
        const isCollapsed = collapsed.has(cat);
        const sorted = [...catFindings].sort(
          (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
        );

        return (
          <div
            key={cat}
            className={`bg-white border border-[#E5E5EA] border-l-4 ${meta.border} rounded-lg overflow-hidden`}
          >
            {/* Category Header */}
            <button
              onClick={() => toggle(cat)}
              className={`w-full flex items-center justify-between px-5 py-3.5 text-left ${meta.bg} hover:brightness-95 transition-all`}
            >
              <span className="text-sm font-semibold text-[#1B1B1B]">
                {meta.label}
              </span>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${meta.pillBg} ${meta.text}`}>
                  {catFindings.length} {catFindings.length === 1 ? "finding" : "findings"}
                </span>
                <ChevronDownIcon
                  className={`size-4 text-[#7A7A7A] transition-transform duration-200 ${
                    isCollapsed ? "-rotate-90" : ""
                  }`}
                />
              </div>
            </button>

            {/* Finding Cards */}
            {!isCollapsed && (
              <div className="px-5 py-4 space-y-3">
                {sorted.map((finding, i) => (
                  <FindingCard key={i} finding={finding} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Finding Card ────────────────────────────────────────────────

function FindingCard({ finding }: { finding: Finding }) {
  const sev = SEVERITY_META[finding.severity];

  return (
    <div className="bg-[#F3F3F5] border border-[#E5E5EA] rounded-md p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${sev.pillBg} ${sev.text}`}>
          {sev.label}
        </span>
        {finding.page && (
          <span className="text-[10px] px-2 py-0.5 bg-[#E5E5EA] rounded text-[#7A7A7A]">
            {finding.page}
          </span>
        )}
      </div>
      <h4 className="text-sm font-semibold text-[#1B1B1B] mb-1">{finding.title}</h4>
      <p className="text-xs text-[#3A3A3A] leading-relaxed">{finding.description}</p>
    </div>
  );
}

// ── Export Bar ───────────────────────────────────────────────────

function ExportBar({ result }: { result: StoreIntelResult | PageAuditResult }) {
  const [copied, setCopied] = useState(false);

  function copyFindings() {
    const text = generateFindingsText(result.findings);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadReport() {
    const md = generateMarkdownReport(result);
    const isStore = !("mode" in result);
    const name = isStore
      ? (result as StoreIntelResult).brand.toLowerCase().replace(/\s+/g, "-")
      : "page-audit";
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}-intel-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex items-center gap-3 pt-2">
      <button
        onClick={copyFindings}
        className="flex items-center gap-2 px-4 py-2 bg-[#F3F3F5] border border-[#E5E5EA] rounded-md text-xs font-medium text-[#3A3A3A] hover:bg-[#EBEBEB] transition-colors"
      >
        <ClipboardDocumentIcon className="size-3.5" />
        {copied ? "Copied!" : "Copy Findings"}
      </button>
      <button
        onClick={downloadReport}
        className="flex items-center gap-2 px-4 py-2 bg-[#F3F3F5] border border-[#E5E5EA] rounded-md text-xs font-medium text-[#3A3A3A] hover:bg-[#EBEBEB] transition-colors"
      >
        <ArrowDownTrayIcon className="size-3.5" />
        Download .md
      </button>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function StatBox({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 mb-1">
        <span className="text-[#A0A0A0]">{icon}</span>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0]">{label}</p>
      </div>
      <p className={`text-lg font-semibold tabular-nums ${color || ""}`}>
        {value}
      </p>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────

function groupByCategory(findings: Finding[]): Partial<Record<FindingCategory, Finding[]>> {
  const map: Partial<Record<FindingCategory, Finding[]>> = {};
  for (const f of findings) {
    if (!map[f.category]) map[f.category] = [];
    map[f.category]!.push(f);
  }
  return map;
}
