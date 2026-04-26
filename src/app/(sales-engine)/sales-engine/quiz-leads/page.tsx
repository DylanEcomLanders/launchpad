"use client";

// Internal admin dashboard for quiz submissions. Mirrors the style of
// /sales-engine/leads — same table chrome, same edit-in-row save-on-change
// pattern. Tier filter pills at the top, click a row to expand the full
// answer trace, "Mark as contacted" toggle on each row.

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowPathIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import {
  CRO_LABELS,
  PAIN_LABELS,
  REVENUE_LABELS,
  TRAFFIC_LABELS,
  VERTICAL_LABELS,
} from "@/lib/quiz/questions";
import { fromRow, type LeadTier, type QuizSubmission, type QuizSubmissionRow } from "@/lib/quiz/types";

const TIER_META: Record<LeadTier, { label: string; color: string; bg: string }> = {
  A: { label: "Tier A", color: "#059669", bg: "#ECFDF5" },
  B: { label: "Tier B", color: "#2563EB", bg: "#EFF6FF" },
  C: { label: "Tier C", color: "#777", bg: "#F3F3F5" },
};

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
function formatDateLong(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}
function faviconUrl(storeUrl: string): string {
  const host = storeUrl.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  return `https://www.google.com/s2/favicons?sz=32&domain=${host}`;
}

export default function QuizLeadsPage() {
  const [rows, setRows] = useState<QuizSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<LeadTier | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/quiz-leads", { cache: "no-store" });
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.leadTier === filter)),
    [rows, filter],
  );

  const counts = useMemo(
    () => ({
      all: rows.length,
      A: rows.filter((r) => r.leadTier === "A").length,
      B: rows.filter((r) => r.leadTier === "B").length,
      C: rows.filter((r) => r.leadTier === "C").length,
    }),
    [rows],
  );

  const markContacted = async (id: string, contacted: boolean) => {
    // Optimistic: update local state immediately
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              contactedBy: contacted ? "team" : null,
              contactedAt: contacted ? new Date().toISOString() : null,
            }
          : r,
      ),
    );
    try {
      await fetch(`/api/quiz-leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacted }),
      });
    } catch {
      // Revert silently — load() will reconcile if needed
      load();
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1B1B1B]">Quiz Leads</h1>
            <p className="text-sm text-[#999] mt-1">Submissions from /quiz, newest first</p>
          </div>
          <button
            onClick={load}
            className="p-2 text-[#999] hover:text-[#1B1B1B] transition-colors"
            title="Refresh"
          >
            <ArrowPathIcon className="size-4" />
          </button>
        </div>

        {/* Tier filter */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {(["all", "A", "B", "C"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`text-[11px] px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1.5 ${
                filter === t
                  ? "bg-[#1B1B1B] text-white border-[#1B1B1B]"
                  : "bg-white text-[#777] border-[#E5E5E5] hover:border-[#1B1B1B]"
              }`}
            >
              {t === "all" ? "All" : `Tier ${t}`}
              <span className={`tabular-nums ${filter === t ? "text-[#AAA]" : "text-[#999]"}`}>
                {counts[t]}
              </span>
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin size-6 border-2 border-[#E5E5E5] border-t-[#1B1B1B] rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="border border-[#F0F0F0] rounded-lg py-14 text-center">
            <p className="text-sm text-[#777]">
              {rows.length === 0 ? "No quiz leads yet." : "No leads match this tier."}
            </p>
          </div>
        ) : (
          <div className="border border-[#F0F0F0] rounded-lg overflow-hidden">
            {/* Header row */}
            <div className="grid grid-cols-[80px_1fr_80px_120px_120px_140px_120px_24px] gap-3 px-4 py-2.5 bg-[#FAFAFA] border-b border-[#F0F0F0]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#999]">Date</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#999]">Name / Store</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#999]">Tier</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#999]">Vertical</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#999]">Revenue</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#999]">Email</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#999]">Contacted</span>
              <span />
            </div>

            {filtered.map((r) => {
              const tierMeta = TIER_META[r.leadTier];
              const isExpanded = expandedId === r.id;
              return (
                <div key={r.id} className="border-b border-[#F8F8F8] last:border-0">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : r.id)}
                    className="w-full grid grid-cols-[80px_1fr_80px_120px_120px_140px_120px_24px] gap-3 px-4 py-3 items-center text-left hover:bg-[#FAFAFA] transition-colors"
                  >
                    <span className="text-xs text-[#777] tabular-nums">{formatDateShort(r.createdAt)}</span>
                    <div className="flex items-center gap-2 min-w-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={faviconUrl(r.storeUrl)}
                        alt=""
                        width={16}
                        height={16}
                        className="shrink-0 size-4 rounded"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#1B1B1B] truncate">{r.firstName}</p>
                        <p className="text-[11px] text-[#999] truncate">{r.storeUrl}</p>
                      </div>
                    </div>
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full justify-self-start"
                      style={{ background: tierMeta.bg, color: tierMeta.color }}
                    >
                      {tierMeta.label}
                    </span>
                    <span className="text-xs text-[#1B1B1B] truncate">{VERTICAL_LABELS[r.vertical]}</span>
                    <span className="text-xs text-[#777] truncate">{REVENUE_LABELS[r.revenue]}</span>
                    <span className="text-xs text-[#777] truncate">{r.email}</span>
                    <ContactedToggle
                      contacted={!!r.contactedAt}
                      contactedAt={r.contactedAt}
                      onToggle={(next) => markContacted(r.id, next)}
                    />
                    <ChevronDownIcon
                      className={`size-3.5 text-[#CCC] transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    />
                  </button>

                  {isExpanded && (
                    <ExpandedRow submission={r} />
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

function ContactedToggle({
  contacted,
  contactedAt,
  onToggle,
}: {
  contacted: boolean;
  contactedAt: string | null;
  onToggle: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle(!contacted);
      }}
      className={`text-[11px] px-2 py-1 rounded border transition-colors ${
        contacted
          ? "bg-[#ECFDF5] border-[#A7F3D0] text-[#059669]"
          : "bg-white border-[#E5E5E5] text-[#999] hover:border-[#1B1B1B] hover:text-[#1B1B1B]"
      }`}
      title={contacted && contactedAt ? `Contacted ${new Date(contactedAt).toLocaleString("en-GB")}` : "Mark as contacted"}
    >
      {contacted ? "Contacted ✓" : "Mark contacted"}
    </button>
  );
}

function ExpandedRow({ submission }: { submission: QuizSubmission }) {
  return (
    <div className="bg-[#FAFAFA] border-t border-[#F0F0F0] px-4 py-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 max-w-3xl">
        <Field label="Submitted" value={formatDateLong(submission.createdAt)} />
        <Field label="Source" value={submission.source} />
        <Field label="Vertical" value={VERTICAL_LABELS[submission.vertical]} />
        <Field label="Revenue" value={REVENUE_LABELS[submission.revenue]} />
        <Field label="Traffic source" value={TRAFFIC_LABELS[submission.trafficSource]} />
        <Field label="Pain point" value={PAIN_LABELS[submission.painPoint]} />
        <Field label="CRO history" value={CRO_LABELS[submission.croHistory]} />
        <Field label="Email" value={submission.email} mono />
        <Field
          label="Store URL"
          value={
            <a
              href={`https://${submission.storeUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#2563EB] hover:underline"
            >
              {submission.storeUrl}
            </a>
          }
        />
        <Field label="WhatsApp" value={submission.whatsapp || <span className="text-[#BBB]">Not provided</span>} />
        <Field label="Slack notified" value={submission.slackSent ? "Yes" : <span className="text-[#BBB]">Pending</span>} />
        <Field label="Email queued" value={submission.emailSent ? "Yes" : <span className="text-[#BBB]">Pending</span>} />
      </div>

      <div className="mt-5 pt-4 border-t border-[#EEE] flex items-center gap-3">
        <a
          href={`/quiz/results/${submission.resultPageId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-medium text-[#1B1B1B] hover:underline"
        >
          View result page →
        </a>
        {submission.contactedAt && (
          <span className="text-[11px] text-[#999]">
            Contacted {formatDateLong(submission.contactedAt)}
            {submission.contactedBy && ` by ${submission.contactedBy}`}
          </span>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#999] mb-0.5">{label}</p>
      <p className={`text-sm text-[#1B1B1B] ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

// Re-export types — useful when extending
export type { QuizSubmission as _QuizSubmission, QuizSubmissionRow as _QuizSubmissionRow };
export const _fromRow = fromRow;
