"use client";

import { useState } from "react";
import {
  SignalIcon,
  ArrowPathIcon,
  ClipboardDocumentIcon,
  CheckIcon,
} from "@heroicons/react/24/solid";

// ── Types ───────────────────────────────────────────────────────────

interface UpsellOpportunity {
  client_name: string;
  signal: string;
  signal_strength: "strong" | "moderate" | "weak";
  recommended_upsell: string;
  reasoning: string;
  draft_message: string;
  urgency: "act_now" | "this_week" | "monitor";
}

interface ScanResult {
  opportunities: UpsellOpportunity[];
  messagesScanned: number;
  searchTermsUsed: number;
  elapsedMs: number;
}

// ── Urgency sort order ──────────────────────────────────────────────

const urgencyOrder: Record<string, number> = {
  act_now: 0,
  this_week: 1,
  monitor: 2,
};

// ── Page ────────────────────────────────────────────────────────────

export default function UpsellScannerPage() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function runScan() {
    setScanning(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/upsell-scan", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || `Scan failed (${res.status})`);
        return;
      }

      // Sort by urgency
      data.opportunities.sort(
        (a: UpsellOpportunity, b: UpsellOpportunity) =>
          (urgencyOrder[a.urgency] ?? 9) - (urgencyOrder[b.urgency] ?? 9)
      );

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect to scan API");
    } finally {
      setScanning(false);
    }
  }

  function copyDraft(opp: UpsellOpportunity, index: number) {
    navigator.clipboard.writeText(opp.draft_message);
    setCopiedId(`${index}`);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const actNow = result?.opportunities.filter((o) => o.urgency === "act_now").length ?? 0;
  const thisWeek = result?.opportunities.filter((o) => o.urgency === "this_week").length ?? 0;
  const monitor = result?.opportunities.filter((o) => o.urgency === "monitor").length ?? 0;

  return (
    <div className="max-w-4xl mx-auto px-6 md:px-12 py-12 md:py-16">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl font-bold tracking-tight mb-1">
          Upsell Scanner
        </h1>
        <p className="text-sm text-[#6B6B6B]">
          Scan the last 24 hours of Slack for upsell signals
        </p>
      </div>

      {/* Scan Controls */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={runScan}
          disabled={scanning}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#0A0A0A] text-white text-sm font-medium rounded-md hover:bg-[#1A1A1A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {scanning ? (
            <>
              <ArrowPathIcon className="size-4 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <SignalIcon className="size-4" />
              Run Scan
            </>
          )}
        </button>

        {result && !scanning && (
          <span className="text-xs text-[#AAAAAA]">
            {result.messagesScanned} messages scanned ·{" "}
            {(result.elapsedMs / 1000).toFixed(1)}s
          </span>
        )}
      </div>

      {/* Scanning State */}
      {scanning && (
        <div className="flex items-center gap-3 p-6 bg-[#F0F0F0] border border-[#E5E5E5] rounded-lg mb-8">
          <ArrowPathIcon className="size-5 animate-spin text-[#6B6B6B]" />
          <div>
            <p className="text-sm font-medium">Scanning Slack & analysing with Claude...</p>
            <p className="text-xs text-[#6B6B6B] mt-0.5">
              This usually takes 15–30 seconds
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-8">
          <p className="text-sm text-red-700 font-medium">Scan failed</p>
          <p className="text-xs text-red-600 mt-1">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && !scanning && (
        <>
          {/* Summary Bar */}
          {result.opportunities.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 p-4 bg-[#F0F0F0] border border-[#E5E5E5] rounded-lg mb-6">
              <span className="text-sm font-semibold">
                {result.opportunities.length} signal
                {result.opportunities.length !== 1 ? "s" : ""} detected
              </span>
              <span className="text-[#E5E5E5]">|</span>
              {actNow > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                  <span className="size-1.5 rounded-full bg-red-500" />
                  {actNow} act now
                </span>
              )}
              {thisWeek > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                  <span className="size-1.5 rounded-full bg-amber-500" />
                  {thisWeek} this week
                </span>
              )}
              {monitor > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                  <span className="size-1.5 rounded-full bg-blue-500" />
                  {monitor} monitor
                </span>
              )}
            </div>
          )}

          {/* Opportunity Cards */}
          {result.opportunities.length > 0 ? (
            <div className="space-y-4">
              {result.opportunities.map((opp, i) => (
                <OpportunityCard
                  key={i}
                  opp={opp}
                  index={i}
                  copiedId={copiedId}
                  onCopy={copyDraft}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-lg font-medium text-[#6B6B6B] mb-1">
                📭 No upsell signals detected
              </p>
              <p className="text-sm text-[#AAAAAA]">
                All quiet in the last 24 hours — check back tomorrow
              </p>
            </div>
          )}
        </>
      )}

      {/* Initial Empty State */}
      {!result && !scanning && !error && (
        <div className="text-center py-16">
          <SignalIcon className="size-10 text-[#E5E5E5] mx-auto mb-4" />
          <p className="text-sm text-[#AAAAAA]">
            Click &ldquo;Run Scan&rdquo; to search the last 24 hours of Slack
          </p>
        </div>
      )}
    </div>
  );
}

// ── Opportunity Card ────────────────────────────────────────────────

function OpportunityCard({
  opp,
  index,
  copiedId,
  onCopy,
}: {
  opp: UpsellOpportunity;
  index: number;
  copiedId: string | null;
  onCopy: (opp: UpsellOpportunity, index: number) => void;
}) {
  const urgencyConfig = {
    act_now: {
      label: "Act Now",
      bg: "bg-red-100",
      text: "text-red-700",
      dot: "bg-red-500",
    },
    this_week: {
      label: "This Week",
      bg: "bg-amber-100",
      text: "text-amber-700",
      dot: "bg-amber-500",
    },
    monitor: {
      label: "Monitor",
      bg: "bg-blue-100",
      text: "text-blue-700",
      dot: "bg-blue-500",
    },
  };

  const strengthConfig = {
    strong: { label: "Strong", dot: "bg-emerald-500" },
    moderate: { label: "Moderate", dot: "bg-amber-500" },
    weak: { label: "Weak", dot: "bg-gray-400" },
  };

  const u = urgencyConfig[opp.urgency] || urgencyConfig.monitor;
  const s = strengthConfig[opp.signal_strength] || strengthConfig.moderate;

  return (
    <div className="bg-[#F0F0F0] border border-[#E5E5E5] rounded-lg p-6">
      {/* Badges */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${u.bg} ${u.text} text-xs font-semibold rounded-full`}
        >
          <span className={`size-1.5 rounded-full ${u.dot}`} />
          {u.label}
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#E5E5E5] text-[#6B6B6B] text-xs font-semibold rounded-full">
          <span className={`size-1.5 rounded-full ${s.dot}`} />
          {s.label} signal
        </span>
      </div>

      {/* Client Name */}
      <h3 className="text-lg font-bold tracking-tight mb-4">
        {opp.client_name}
      </h3>

      {/* Sections */}
      <div className="space-y-4">
        <Section label="What was spotted" content={opp.signal} />
        <Section label="Recommended upsell" content={opp.recommended_upsell} />
        <Section label="Why this client, why now" content={opp.reasoning} />

        {/* Draft Message */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6B6B] mb-2">
            Ready-to-send message
          </p>
          <div className="relative bg-white border-l-2 border-[#0A0A0A] rounded-r-md p-4">
            <p className="text-sm text-[#3A3A3A] leading-relaxed pr-8">
              {opp.draft_message}
            </p>
            <button
              onClick={() => onCopy(opp, index)}
              className="absolute top-3 right-3 p-1.5 rounded hover:bg-[#F0F0F0] transition-colors"
              title="Copy to clipboard"
            >
              {copiedId === `${index}` ? (
                <CheckIcon className="size-3.5 text-emerald-500" />
              ) : (
                <ClipboardDocumentIcon className="size-3.5 text-[#AAAAAA]" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ label, content }: { label: string; content: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6B6B] mb-1">
        {label}
      </p>
      <p className="text-sm text-[#3A3A3A] leading-relaxed">{content}</p>
    </div>
  );
}
