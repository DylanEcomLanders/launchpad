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
        <h1 className="text-[28px] leading-tight font-bold text-foreground mb-1">
          Upsell Scanner
        </h1>
        <p className="text-sm text-subtle">
          Scan the last 24 hours of Slack for upsell signals
        </p>
      </div>

      {/* Scan Controls */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={runScan}
          disabled={scanning}
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-background text-sm font-medium rounded-md hover:bg-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          <span className="text-xs text-subtle">
            {result.messagesScanned} messages scanned ·{" "}
            {(result.elapsedMs / 1000).toFixed(1)}s
          </span>
        )}
      </div>

      {/* Scanning State */}
      {scanning && (
        <div className="flex items-center gap-3 p-6 bg-surface-raised border border-border rounded-lg mb-8">
          <ArrowPathIcon className="size-5 animate-spin text-subtle" />
          <div>
            <p className="text-sm font-medium">Scanning Slack & analysing with Claude...</p>
            <p className="text-xs text-subtle mt-0.5">
              This usually takes 15–30 seconds
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-900/20 border border-red-200 rounded-lg mb-8">
          <p className="text-sm text-red-700 font-medium">Scan failed</p>
          <p className="text-xs text-red-600 mt-1">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && !scanning && (
        <>
          {/* Summary Bar */}
          {result.opportunities.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 p-4 bg-surface-raised border border-border rounded-lg mb-6">
              <span className="text-sm font-semibold">
                {result.opportunities.length} signal
                {result.opportunities.length !== 1 ? "s" : ""} detected
              </span>
              <span className="text-foreground">|</span>
              {actNow > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-900/20 text-red-700 text-xs font-semibold rounded-full">
                  <span className="size-1.5 rounded-full bg-red-500" />
                  {actNow} act now
                </span>
              )}
              {thisWeek > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-900/20 text-amber-700 text-xs font-semibold rounded-full">
                  <span className="size-1.5 rounded-full bg-amber-500" />
                  {thisWeek} this week
                </span>
              )}
              {monitor > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-900/20 text-blue-700 text-xs font-semibold rounded-full">
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
              <p className="text-lg font-medium text-subtle mb-1">
                📭 No upsell signals detected
              </p>
              <p className="text-sm text-subtle">
                All quiet in the last 24 hours — check back tomorrow
              </p>
            </div>
          )}
        </>
      )}

      {/* Initial Empty State */}
      {!result && !scanning && !error && (
        <div className="text-center py-16">
          <SignalIcon className="size-10 text-foreground mx-auto mb-4" />
          <p className="text-sm text-subtle">
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
      bg: "bg-red-900/20",
      text: "text-red-700",
      dot: "bg-red-500",
    },
    this_week: {
      label: "This Week",
      bg: "bg-amber-900/20",
      text: "text-amber-700",
      dot: "bg-amber-500",
    },
    monitor: {
      label: "Monitor",
      bg: "bg-blue-900/20",
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
    <div className="bg-surface-raised border border-border rounded-lg p-6">
      {/* Badges */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${u.bg} ${u.text} text-xs font-semibold rounded-full`}
        >
          <span className={`size-1.5 rounded-full ${u.dot}`} />
          {u.label}
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-border text-subtle text-xs font-semibold rounded-full">
          <span className={`size-1.5 rounded-full ${s.dot}`} />
          {s.label} signal
        </span>
      </div>

      {/* Client Name */}
      <h3 className="text-lg font-bold mb-4">
        {opp.client_name}
      </h3>

      {/* Sections */}
      <div className="space-y-4">
        <Section label="What was spotted" content={opp.signal} />
        <Section label="Recommended upsell" content={opp.recommended_upsell} />
        <Section label="Why this client, why now" content={opp.reasoning} />

        {/* Draft Message */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle mb-2">
            Ready-to-send message
          </p>
          <div className="relative bg-surface border-l-2 border-white rounded-r-md p-4">
            <p className="text-sm text-subtle leading-relaxed pr-8">
              {opp.draft_message}
            </p>
            <button
              onClick={() => onCopy(opp, index)}
              className="absolute top-3 right-3 p-1.5 rounded hover:bg-surface-raised transition-colors"
              title="Copy to clipboard"
            >
              {copiedId === `${index}` ? (
                <CheckIcon className="size-3.5 text-emerald-500" />
              ) : (
                <ClipboardDocumentIcon className="size-3.5 text-subtle" />
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
      <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle mb-1">
        {label}
      </p>
      <p className="text-sm text-subtle leading-relaxed">{content}</p>
    </div>
  );
}
