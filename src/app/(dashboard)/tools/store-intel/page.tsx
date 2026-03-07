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
  BoltIcon,
  ChartBarIcon,
  LightBulbIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  EyeIcon,
  LinkIcon,
  ChatBubbleBottomCenterTextIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  DevicePhoneMobileIcon,
} from "@heroicons/react/24/solid";
import { DecorativeBlocks } from "@/components/decorative-blocks";
import { inputClass, labelClass } from "@/lib/form-styles";

// ── Types ───────────────────────────────────────────────────────

type Mode = "store" | "page";

interface ProductAnalysis {
  totalProducts: number;
  priceRange: { min: number; max: number; median: number; average: number };
  discounting: { count: number; percent: string; avgDiscount: string };
  productTypes: Record<string, number>;
  multiVariantPercent: string;
}

interface StoreIntelResult {
  brand: string;
  storeUrl: string;
  products: number;
  collections: number;
  pagesCrawled: number;
  appsDetected: string[];
  theme: string;
  funnelMaturity: number | null;
  brief: string;
  productAnalysis: ProductAnalysis | null;
  quickWins: string[];
}

interface PageAuditResult {
  mode: "page";
  pageUrl: string;
  pageType: string;
  title: string;
  appsDetected: string[];
  theme: string;
  effectivenessScore: number | null;
  brief: string;
  quickWins: string[];
  elements: {
    h1: string;
    heroText: string;
    ctaCount: number;
    ctas: string[];
    imageCount: number;
    scriptCount: number;
    wordCount: number;
    headingStructure: string[];
    persuasionElements: Record<string, boolean>;
    forms: number;
    videos: number;
    links: { internal: number; external: number };
  };
}

// ── Component ───────────────────────────────────────────────────

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
            if (prev.includes("Detecting")) return "Running AI page audit with Claude...";
            return "Generating design brief...";
          }
          if (prev.includes("Crawling")) return "Analysing products and collections...";
          if (prev.includes("products")) return "Detecting tech stack and apps...";
          if (prev.includes("tech")) return "Running AI analysis with Claude...";
          return "Generating intelligence brief...";
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
            Store Intelligence
          </h1>
          <p className="text-[#6B6B6B] text-sm">
            Analyse any Shopify store or audit a single page for design quick wins
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-1 mb-6 bg-[#F0F0F0] border border-[#E5E5E5] rounded-lg p-1 w-fit">
          <button
            onClick={() => { setMode("store"); setStoreResult(null); setPageResult(null); setError(""); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              mode === "store"
                ? "bg-white border border-[#E5E5E5] shadow-sm"
                : "text-[#6B6B6B] hover:text-[#3A3A3A]"
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
                ? "bg-white border border-[#E5E5E5] shadow-sm"
                : "text-[#6B6B6B] hover:text-[#3A3A3A]"
            }`}
          >
            <span className="flex items-center gap-2">
              <DocumentTextIcon className="size-3.5" />
              Single Page Audit
            </span>
          </button>
        </div>

        {/* Input Form */}
        <div className="bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg p-5 mb-8">
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
              <p className="text-[11px] text-[#AAAAAA] mt-1.5">
                Paste any page — PDP, collection, homepage, landing page. Get a design-focused audit.
              </p>
            </div>
          )}
          <button
            onClick={runAnalysis}
            disabled={loading || !canRun}
            className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0A0A0A] text-white text-sm font-medium rounded-md hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
            <p className="text-xs text-[#AAAAAA] text-center mt-2">
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
      <div className="bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg p-5">
        <div className="flex items-center gap-2 mb-1">
          <DocumentTextIcon className="size-4 text-[#6B6B6B]" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA]">{result.pageType}</span>
        </div>
        <h2 className="text-sm font-semibold mb-1">{result.title}</h2>
        <p className="text-xs text-[#AAAAAA] break-all">{result.pageUrl}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <StatBox
            icon={<ChartBarIcon className="size-3.5" />}
            label="Effectiveness"
            value={result.effectivenessScore ? `${result.effectivenessScore}/10` : "—"}
            highlight={result.effectivenessScore !== null}
            color={
              result.effectivenessScore !== null
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

      {/* Two-col: Persuasion Elements + CTAs/Tech */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Persuasion Elements */}
        <div className="bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] mb-3">
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

        {/* CTAs + Tech */}
        <div className="space-y-4">
          {/* CTAs Found */}
          <div className="bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] mb-3">
              CTAs Found
            </h3>
            {result.elements.ctas.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {result.elements.ctas.map((cta, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-2.5 py-1 bg-white border border-[#E5E5E5] rounded text-xs text-[#3A3A3A]"
                  >
                    {cta}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#AAAAAA]">No clear CTAs detected</p>
            )}
          </div>

          {/* Tech */}
          <div className="bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg p-5">
            <div className="flex items-center gap-2 mb-3">
              <SwatchIcon className="size-4 text-[#6B6B6B]" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Tech Stack</h3>
            </div>
            <p className="text-sm font-medium mb-2">{result.theme}</p>
            {result.appsDetected.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {result.appsDetected.map((app) => (
                  <span
                    key={app}
                    className="inline-flex items-center px-2 py-0.5 bg-white border border-[#E5E5E5] rounded text-[11px] text-[#3A3A3A]"
                  >
                    {app}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#AAAAAA]">No major apps detected</p>
            )}
          </div>
        </div>
      </div>

      {/* Page Stats Row */}
      <div className="bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] mb-3">Page Stats</h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          <MiniStat label="Scripts" value={String(result.elements.scriptCount)} />
          <MiniStat label="Forms" value={String(result.elements.forms)} />
          <MiniStat label="Videos" value={String(result.elements.videos)} />
          <MiniStat label="Internal Links" value={String(result.elements.links.internal)} />
          <MiniStat label="External Links" value={String(result.elements.links.external)} />
          <MiniStat label="Headings" value={String(result.elements.headingStructure.length)} />
        </div>
      </div>

      {/* Quick Wins */}
      {result.quickWins.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <BoltIcon className="size-4 text-emerald-700" />
            <h3 className="text-sm font-semibold text-emerald-900">Design Quick Wins</h3>
          </div>
          <div className="space-y-2">
            {result.quickWins.map((win, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircleIcon className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                <p className="text-sm text-emerald-900">{win}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full Brief */}
      <div className="bg-white border border-[#E5E5E5] rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <LightBulbIcon className="size-4 text-[#6B6B6B]" />
            <h3 className="text-sm font-semibold">Full Page Audit Brief</h3>
          </div>
          <button
            onClick={() => {
              const blob = new Blob([result.brief], { type: "text/markdown" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `page-audit-${new Date().toISOString().slice(0, 10)}.md`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="text-xs text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors"
          >
            Download .md
          </button>
        </div>
        <div className="prose prose-sm max-w-none prose-headings:text-[#0A0A0A] prose-headings:font-semibold prose-p:text-[#3A3A3A] prose-li:text-[#3A3A3A] prose-strong:text-[#0A0A0A]">
          <MarkdownRenderer content={result.brief} />
        </div>
      </div>
    </div>
  );
}

// ── Store Results (existing) ────────────────────────────────────

function StoreResults({ result }: { result: StoreIntelResult }) {
  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <BuildingStorefrontIcon className="size-4 text-[#6B6B6B]" />
          <h2 className="text-sm font-semibold">{result.brand}</h2>
          <span className="text-xs text-[#AAAAAA]">{result.storeUrl}</span>
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
            highlight={result.funnelMaturity !== null}
            color={
              result.funnelMaturity !== null
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
        <div className="bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <SwatchIcon className="size-4 text-[#6B6B6B]" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Tech Stack</h3>
          </div>
          <p className="text-sm font-medium mb-2">{result.theme}</p>
          {result.appsDetected.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {result.appsDetected.map((app) => (
                <span
                  key={app}
                  className="inline-flex items-center px-2 py-0.5 bg-white border border-[#E5E5E5] rounded text-[11px] text-[#3A3A3A]"
                >
                  {app}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#AAAAAA]">No major apps detected</p>
          )}
        </div>

        {result.productAnalysis && (
          <div className="bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg p-5">
            <div className="flex items-center gap-2 mb-3">
              <CubeIcon className="size-4 text-[#6B6B6B]" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">Price Analysis</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[10px] text-[#AAAAAA] uppercase">Range</p>
                <p className="font-medium tabular-nums">
                  ${result.productAnalysis.priceRange.min.toFixed(0)} – ${result.productAnalysis.priceRange.max.toFixed(0)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[#AAAAAA] uppercase">Median</p>
                <p className="font-medium tabular-nums">${result.productAnalysis.priceRange.median.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#AAAAAA] uppercase">Discounted</p>
                <p className="font-medium tabular-nums">{result.productAnalysis.discounting.percent}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#AAAAAA] uppercase">Avg Discount</p>
                <p className="font-medium tabular-nums">{result.productAnalysis.discounting.avgDiscount}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Wins */}
      {result.quickWins.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <BoltIcon className="size-4 text-emerald-700" />
            <h3 className="text-sm font-semibold text-emerald-900">Quick Wins</h3>
          </div>
          <div className="space-y-2">
            {result.quickWins.map((win, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircleIcon className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                <p className="text-sm text-emerald-900">{win}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full Brief */}
      <div className="bg-white border border-[#E5E5E5] rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <LightBulbIcon className="size-4 text-[#6B6B6B]" />
            <h3 className="text-sm font-semibold">Full Intelligence Brief</h3>
          </div>
          <button
            onClick={() => {
              const blob = new Blob([result.brief], { type: "text/markdown" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${result.brand.toLowerCase().replace(/\s+/g, "-")}-brief.md`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="text-xs text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors"
          >
            Download .md
          </button>
        </div>
        <div className="prose prose-sm max-w-none prose-headings:text-[#0A0A0A] prose-headings:font-semibold prose-p:text-[#3A3A3A] prose-li:text-[#3A3A3A] prose-strong:text-[#0A0A0A]">
          <MarkdownRenderer content={result.brief} />
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function StatBox({
  icon,
  label,
  value,
  highlight,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
  color?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 mb-1">
        <span className="text-[#AAAAAA]">{icon}</span>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA]">{label}</p>
      </div>
      <p className={`text-lg font-semibold tabular-nums ${color || ""} ${highlight ? "" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-[#AAAAAA] uppercase">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function MarkdownRenderer({ content }: { content: string }) {
  const html = content
    .replace(/^### (.*$)/gm, '<h3 class="text-base font-semibold mt-6 mb-2">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-lg font-bold mt-8 mb-3 pb-2 border-b border-[#E5E5E5]">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold mt-8 mb-3">$1</h1>')
    .replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc text-sm leading-relaxed">$1</li>')
    .replace(/^\d+\. (.*$)/gm, '<li class="ml-4 list-decimal text-sm leading-relaxed">$1</li>')
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
