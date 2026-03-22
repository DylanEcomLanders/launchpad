"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAuditById, saveAudit } from "@/lib/cro-audit-engine/data";
import type { AuditReport } from "@/lib/cro-audit-engine/types";
import Link from "next/link";
import { ArrowLeftIcon, CheckIcon, ClipboardDocumentIcon } from "@heroicons/react/24/outline";

const severityColor: Record<string, string> = {
  critical: "bg-red-50 text-red-600 border-red-200",
  high: "bg-amber-50 text-amber-600 border-amber-200",
  "quick-win": "bg-emerald-50 text-emerald-600 border-emerald-200",
};

const ratingColor: Record<string, string> = {
  strong: "text-emerald-600",
  average: "text-amber-600",
  weak: "text-red-500",
};

export default function AuditDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [audit, setAudit] = useState<AuditReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getAuditById(params.id as string).then((a) => {
      setAudit(a);
      setLoading(false);
    });
  }, [params.id]);

  const handlePublish = async () => {
    if (!audit) return;
    const updated = { ...audit, status: "published" as const, updated_at: new Date().toISOString() };
    await saveAudit(updated);
    setAudit(updated);
  };

  const copyLink = () => {
    if (!audit) return;
    navigator.clipboard.writeText(`${window.location.origin}/audit/${audit.token}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="max-w-3xl mx-auto py-20 text-center"><div className="animate-spin size-6 border-2 border-[#E5E5EA] border-t-[#1A1A1A] rounded-full mx-auto" /></div>;
  if (!audit) return <div className="max-w-3xl mx-auto py-20 text-center"><p className="text-sm text-[#AAA]">Audit not found</p></div>;

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      {/* Header */}
      <div className="mb-8">
        <Link href="/sales-engine/audits" className="inline-flex items-center gap-1 text-xs font-medium text-[#A0A0A0] hover:text-[#1B1B1B] transition-colors mb-4">
          <ArrowLeftIcon className="size-3" />
          All Audits
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight capitalize">{audit.brand_name}</h1>
              <span className={`text-[9px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                audit.status === "published" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
              }`}>{audit.status}</span>
            </div>
            <p className="text-xs text-[#AAA] mt-1">{audit.url} · {audit.issues.length} issues · {audit.view_count} views</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {audit.status === "published" && (
              <button onClick={copyLink} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium border border-[#E5E5EA] rounded-lg text-[#7A7A7A] hover:text-[#1A1A1A] hover:border-[#999] transition-colors">
                {copied ? <CheckIcon className="size-3.5 text-emerald-500" /> : <ClipboardDocumentIcon className="size-3.5" />}
                {copied ? "Copied!" : "Copy Link"}
              </button>
            )}
            {audit.status === "draft" && (
              <button onClick={handlePublish} className="px-4 py-1.5 bg-[#1B1B1B] text-white text-[11px] font-medium rounded-lg hover:bg-[#2D2D2D] transition-colors">
                Publish
              </button>
            )}
            <a href={`/audit/${audit.token}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium border border-[#E5E5EA] rounded-lg text-[#7A7A7A] hover:text-[#1A1A1A] hover:border-[#999] transition-colors">
              Preview
            </a>
          </div>
        </div>
      </div>

      {/* Preview of audit content */}
      <div className="space-y-8">
        {/* Executive Summary */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#AAA] mb-3">Executive Summary</h2>
          <p className="text-sm text-[#333] leading-relaxed whitespace-pre-wrap">{audit.executive_summary}</p>
        </div>

        {/* Scorecard */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#AAA] mb-3">Scorecard</h2>
          <div className="border border-[#E5E5EA] rounded-xl bg-white divide-y divide-[#F0F0F0] overflow-hidden">
            {audit.scorecard.map((s, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-xs text-[#1A1A1A]">{s.area}</span>
                <span className={`text-[10px] font-semibold uppercase ${ratingColor[s.rating]}`}>{s.rating}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Issues */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#AAA] mb-3">Issues ({audit.issues.length})</h2>
          <div className="space-y-4">
            {audit.issues.map((issue, i) => (
              <div key={issue.id || i} className="border border-[#E5E5EA] rounded-xl bg-white overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#F0F0F0]">
                  <p className="text-sm font-semibold text-[#1A1A1A]">Issue {i + 1} — {issue.title}</p>
                  <span className={`text-[9px] font-semibold uppercase px-2 py-0.5 rounded-full border ${severityColor[issue.severity]}`}>
                    {issue.severity === "quick-win" ? "Quick Win" : issue.severity}
                  </span>
                </div>
                <div className="px-4 py-3 space-y-3">
                  <p className="text-xs text-[#999] italic">{issue.subtitle}</p>
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-red-400 mb-1">The problem</p>
                    <p className="text-xs text-[#555] leading-relaxed">{issue.problem}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-emerald-600 mb-1">The fix</p>
                    <p className="text-xs text-[#555] leading-relaxed">{issue.fix}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Order */}
        {audit.priority_order.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#AAA] mb-3">Priority Order</h2>
            <div className="space-y-2">
              {audit.priority_order.map((p, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-2.5 bg-[#FAFAFA] rounded-lg">
                  <span className="text-xs font-bold text-[#1A1A1A] shrink-0">{i + 1}.</span>
                  <p className="text-xs text-[#555]">{p}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Not Saying */}
        {audit.not_saying && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#AAA] mb-3">What This Audit Is Not Saying</h2>
            <p className="text-sm text-[#555] leading-relaxed italic">{audit.not_saying}</p>
          </div>
        )}
      </div>
    </div>
  );
}
