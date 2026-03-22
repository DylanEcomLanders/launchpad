"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAuditById, saveAudit } from "@/lib/cro-audit-engine/data";
import type { AuditReport, AuditIssue, ScorecardItem } from "@/lib/cro-audit-engine/types";
import Link from "next/link";
import { ArrowLeftIcon, CheckIcon, ClipboardDocumentIcon, TrashIcon, PlusIcon } from "@heroicons/react/24/outline";

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
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    getAuditById(params.id as string).then((a) => {
      setAudit(a);
      setLoading(false);
    });
  }, [params.id]);

  const update = (patch: Partial<AuditReport>) => {
    if (!audit) return;
    setAudit({ ...audit, ...patch });
    setDirty(true);
  };

  const updateIssue = (index: number, patch: Partial<AuditIssue>) => {
    if (!audit) return;
    const issues = audit.issues.map((iss, i) => i === index ? { ...iss, ...patch } : iss);
    update({ issues });
  };

  const removeIssue = (index: number) => {
    if (!audit) return;
    update({ issues: audit.issues.filter((_, i) => i !== index) });
  };

  const addIssue = () => {
    if (!audit) return;
    const newIssue: AuditIssue = {
      id: crypto.randomUUID(),
      title: "New Issue",
      severity: "high",
      subtitle: "",
      problem: "",
      fix: "",
    };
    update({ issues: [...audit.issues, newIssue] });
  };

  const updateScorecard = (index: number, patch: Partial<ScorecardItem>) => {
    if (!audit) return;
    const scorecard = audit.scorecard.map((s, i) => i === index ? { ...s, ...patch } : s);
    update({ scorecard });
  };

  const updatePriority = (index: number, value: string) => {
    if (!audit) return;
    const priority_order = audit.priority_order.map((p, i) => i === index ? value : p);
    update({ priority_order });
  };

  const removePriority = (index: number) => {
    if (!audit) return;
    update({ priority_order: audit.priority_order.filter((_, i) => i !== index) });
  };

  const addPriority = () => {
    if (!audit) return;
    update({ priority_order: [...audit.priority_order, ""] });
  };

  const handleSave = async () => {
    if (!audit) return;
    setSaving(true);
    const updated = { ...audit, updated_at: new Date().toISOString() };
    await saveAudit(updated);
    setAudit(updated);
    setDirty(false);
    setSaving(false);
  };

  const handlePublish = async () => {
    if (!audit) return;
    setSaving(true);
    const updated = { ...audit, status: "published" as const, updated_at: new Date().toISOString() };
    await saveAudit(updated);
    setAudit(updated);
    setDirty(false);
    setSaving(false);
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
              <input
                type="text"
                value={audit.brand_name}
                onChange={(e) => update({ brand_name: e.target.value })}
                className="text-2xl font-bold tracking-tight capitalize bg-transparent border-0 border-b border-transparent hover:border-[#E5E5EA] focus:border-[#999] focus:outline-none px-0 py-0"
              />
              <span className={`text-[9px] font-semibold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                audit.status === "published" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
              }`}>{audit.status}</span>
            </div>
            <p className="text-xs text-[#AAA] mt-1">{audit.url} · {audit.issues.length} issues · {audit.view_count} views</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {dirty && (
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-1.5 bg-[#1B1B1B] text-white text-[11px] font-medium rounded-lg hover:bg-[#2D2D2D] transition-colors disabled:opacity-50">
                <CheckIcon className="size-3.5" />
                {saving ? "Saving..." : "Save"}
              </button>
            )}
            {audit.status === "published" && (
              <button onClick={copyLink} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium border border-[#E5E5EA] rounded-lg text-[#7A7A7A] hover:text-[#1A1A1A] hover:border-[#999] transition-colors">
                {copied ? <CheckIcon className="size-3.5 text-emerald-500" /> : <ClipboardDocumentIcon className="size-3.5" />}
                {copied ? "Copied!" : "Copy Link"}
              </button>
            )}
            {audit.status === "draft" && (
              <button onClick={handlePublish} disabled={saving} className="px-4 py-1.5 bg-emerald-600 text-white text-[11px] font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50">
                Publish
              </button>
            )}
            <a href={`/audit/${audit.token}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium border border-[#E5E5EA] rounded-lg text-[#7A7A7A] hover:text-[#1A1A1A] hover:border-[#999] transition-colors">
              Preview
            </a>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Executive Summary */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#AAA] mb-3">Executive Summary</h2>
          <textarea
            value={audit.executive_summary}
            onChange={(e) => update({ executive_summary: e.target.value })}
            className="w-full text-sm text-[#333] leading-relaxed bg-transparent border border-transparent hover:border-[#E5E5EA] focus:border-[#999] focus:outline-none rounded-lg px-3 py-2 min-h-[120px] resize-y"
          />
        </div>

        {/* Scorecard */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#AAA] mb-3">Scorecard</h2>
          <div className="border border-[#E5E5EA] rounded-xl bg-white divide-y divide-[#F0F0F0] overflow-hidden">
            {audit.scorecard.map((s, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5">
                <input
                  type="text"
                  value={s.area}
                  onChange={(e) => updateScorecard(i, { area: e.target.value })}
                  className="text-xs text-[#1A1A1A] bg-transparent border-0 border-b border-transparent hover:border-[#E5E5EA] focus:border-[#999] focus:outline-none flex-1 px-0 py-0"
                />
                <select
                  value={s.rating}
                  onChange={(e) => updateScorecard(i, { rating: e.target.value as "strong" | "average" | "weak" })}
                  className={`text-[10px] font-semibold uppercase bg-transparent border-0 cursor-pointer focus:outline-none ${ratingColor[s.rating]}`}
                >
                  <option value="strong">Strong</option>
                  <option value="average">Average</option>
                  <option value="weak">Weak</option>
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Issues */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#AAA]">Issues ({audit.issues.length})</h2>
            <button onClick={addIssue} className="flex items-center gap-1 text-[10px] text-[#AAA] hover:text-[#1A1A1A] transition-colors">
              <PlusIcon className="size-3" /> Add Issue
            </button>
          </div>
          <div className="space-y-4">
            {audit.issues.map((issue, i) => (
              <div key={issue.id || i} className="border border-[#E5E5EA] rounded-xl bg-white overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#F0F0F0]">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-xs text-[#AAA] shrink-0">Issue {i + 1} —</span>
                    <input
                      type="text"
                      value={issue.title}
                      onChange={(e) => updateIssue(i, { title: e.target.value })}
                      className="text-sm font-semibold text-[#1A1A1A] bg-transparent border-0 border-b border-transparent hover:border-[#E5E5EA] focus:border-[#999] focus:outline-none flex-1 px-0 py-0"
                    />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={issue.severity}
                      onChange={(e) => updateIssue(i, { severity: e.target.value as "critical" | "high" | "quick-win" })}
                      className={`text-[9px] font-semibold uppercase px-2 py-0.5 rounded-full border cursor-pointer ${severityColor[issue.severity]}`}
                    >
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="quick-win">Quick Win</option>
                    </select>
                    <button onClick={() => removeIssue(i)} className="text-[#CCC] hover:text-red-500 transition-colors">
                      <TrashIcon className="size-3.5" />
                    </button>
                  </div>
                </div>
                <div className="px-4 py-3 space-y-3">
                  <input
                    type="text"
                    value={issue.subtitle}
                    onChange={(e) => updateIssue(i, { subtitle: e.target.value })}
                    className="w-full text-xs text-[#999] italic bg-transparent border-0 border-b border-transparent hover:border-[#E5E5EA] focus:border-[#999] focus:outline-none px-0 py-0"
                    placeholder="One-line subtitle..."
                  />
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-red-400 mb-1">The problem</p>
                    <textarea
                      value={issue.problem}
                      onChange={(e) => updateIssue(i, { problem: e.target.value })}
                      className="w-full text-xs text-[#555] leading-relaxed bg-transparent border border-transparent hover:border-[#E5E5EA] focus:border-[#999] focus:outline-none rounded px-2 py-1.5 min-h-[60px] resize-y"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-emerald-600 mb-1">The fix</p>
                    <textarea
                      value={issue.fix}
                      onChange={(e) => updateIssue(i, { fix: e.target.value })}
                      className="w-full text-xs text-[#555] leading-relaxed bg-transparent border border-transparent hover:border-[#E5E5EA] focus:border-[#999] focus:outline-none rounded px-2 py-1.5 min-h-[60px] resize-y"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Order */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#AAA]">Priority Order</h2>
            <button onClick={addPriority} className="flex items-center gap-1 text-[10px] text-[#AAA] hover:text-[#1A1A1A] transition-colors">
              <PlusIcon className="size-3" /> Add
            </button>
          </div>
          <div className="space-y-2">
            {audit.priority_order.map((p, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 bg-[#FAFAFA] rounded-lg">
                <span className="text-xs font-bold text-[#1A1A1A] shrink-0">{i + 1}.</span>
                <input
                  type="text"
                  value={p}
                  onChange={(e) => updatePriority(i, e.target.value)}
                  className="flex-1 text-xs text-[#555] bg-transparent border-0 border-b border-transparent hover:border-[#E5E5EA] focus:border-[#999] focus:outline-none px-0 py-0"
                />
                <button onClick={() => removePriority(i)} className="text-[#CCC] hover:text-red-500 transition-colors">
                  <TrashIcon className="size-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Not Saying */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#AAA] mb-3">What This Audit Is Not Saying</h2>
          <textarea
            value={audit.not_saying || ""}
            onChange={(e) => update({ not_saying: e.target.value })}
            className="w-full text-sm text-[#555] leading-relaxed italic bg-transparent border border-transparent hover:border-[#E5E5EA] focus:border-[#999] focus:outline-none rounded-lg px-3 py-2 min-h-[80px] resize-y"
            placeholder="Acknowledge the brand's strengths..."
          />
        </div>
      </div>

      {/* Sticky save bar */}
      {dirty && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E5EA] px-6 py-3 flex items-center justify-end gap-3 z-50">
          <p className="text-xs text-[#AAA] mr-auto">Unsaved changes</p>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-[#1B1B1B] text-white text-xs font-medium rounded-lg hover:bg-[#2D2D2D] disabled:opacity-50">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  );
}
