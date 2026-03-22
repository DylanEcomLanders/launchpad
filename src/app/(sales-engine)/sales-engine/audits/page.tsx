"use client";

import { useState, useEffect, useCallback } from "react";
import { inputClass } from "@/lib/form-styles";
import { getAudits, saveAudit, deleteAudit } from "@/lib/cro-audit-engine/data";
import type { AuditReport } from "@/lib/cro-audit-engine/types";
import Link from "next/link";
import {
  ClipboardDocumentIcon,
  TrashIcon,
  CheckIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";

export default function AuditsPage() {
  const [audits, setAudits] = useState<AuditReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getAudits();
    setAudits(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleGenerate = async () => {
    if (!url.trim() || generating) return;
    setGenerating(true);
    setError("");

    try {
      const res = await fetch("/api/cro-audit-engine/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Generation failed");
      }

      const { audit } = await res.json();
      const now = new Date().toISOString();
      const token = crypto.randomUUID().split("-")[0] + crypto.randomUUID().split("-")[0];

      const report: AuditReport = {
        id: crypto.randomUUID(),
        token,
        brand_name: audit.brand_name || new URL(url.trim()).hostname.replace("www.", "").split(".")[0],
        url: url.trim(),
        status: "draft",
        executive_summary: audit.executive_summary || "",
        not_saying: audit.not_saying || "",
        scorecard: audit.scorecard || [],
        issues: audit.issues || [],
        priority_order: audit.priority_order || [],
        screenshot_url: audit.screenshot_url || "",
        whatsapp_link: "",
        booking_link: "",
        opened_at: null,
        view_count: 0,
        created_at: now,
        updated_at: now,
      };

      await saveAudit(report);
      setUrl("");
      load();
    } catch (err: any) {
      setError(err?.message || "Failed to generate audit");
    }
    setGenerating(false);
  };

  const handlePublish = async (audit: AuditReport) => {
    const updated = { ...audit, status: "published" as const, updated_at: new Date().toISOString() };
    await saveAudit(updated);
    load();
  };

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); return; }
    await deleteAudit(id);
    setConfirmDeleteId(null);
    load();
  };

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/audit/${token}`);
    setCopiedId(token);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">CRO Audits</h1>
        <p className="text-sm text-[#7A7A7A] mt-1">Generate comprehensive homepage audits for prospects</p>
      </div>

      {/* Generate new */}
      <div className="border border-[#E5E5EA] rounded-xl bg-white p-5 mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#AAA] mb-3">New Audit</p>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://brand.com"
              className={inputClass}
              onKeyDown={(e) => { if (e.key === "Enter") handleGenerate(); }}
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={!url.trim() || generating}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#1B1B1B] text-white text-xs font-medium rounded-lg hover:bg-[#2D2D2D] transition-colors disabled:opacity-40"
          >
            {generating ? (
              <>
                <div className="animate-spin size-3 border border-white/30 border-t-white rounded-full" />
                Generating...
              </>
            ) : (
              "Generate Audit"
            )}
          </button>
        </div>
        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        {generating && <p className="text-xs text-[#AAA] mt-2">Scraping page and analysing... this takes 30-60 seconds</p>}
      </div>

      {/* Audits list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="border border-[#E5E5EA] rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-[#EDEDEF] rounded w-1/3 mb-2" />
              <div className="h-3 bg-[#EDEDEF] rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : audits.length === 0 ? (
        <div className="border border-dashed border-[#E5E5EA] rounded-xl p-12 text-center">
          <p className="text-sm text-[#AAA]">No audits yet</p>
          <p className="text-xs text-[#CCC] mt-1">Enter a URL above to generate your first CRO audit</p>
        </div>
      ) : (
        <div className="divide-y divide-[#F0F0F0]">
          {audits.map((audit) => {
            const date = new Date(audit.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
            const issueCount = audit.issues?.length || 0;
            const criticalCount = audit.issues?.filter(i => i.severity === "critical").length || 0;

            return (
              <div key={audit.id} className="flex items-center justify-between py-4 px-2 hover:bg-[#FAFAFA] rounded-lg transition-colors">
                <Link href={`/sales-engine/audits/${audit.id}`} className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold text-[#1A1A1A] capitalize">{audit.brand_name}</p>
                    <span className={`text-[9px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                      audit.status === "published" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                    }`}>
                      {audit.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#AAA] mt-0.5">
                    {date} · {issueCount} issues{criticalCount > 0 ? ` · ${criticalCount} critical` : ""} · {audit.view_count || 0} views
                  </p>
                </Link>
                <div className="flex items-center gap-1 shrink-0">
                  {audit.status === "draft" && (
                    <button
                      onClick={() => handlePublish(audit)}
                      className="px-2.5 py-1 text-[10px] font-medium text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors"
                    >
                      Publish
                    </button>
                  )}
                  {audit.status === "published" && (
                    <>
                      <button
                        onClick={() => copyLink(audit.token)}
                        className="p-1.5 text-[#CCC] hover:text-[#1A1A1A] transition-colors"
                      >
                        {copiedId === audit.token ? <CheckIcon className="size-3.5 text-emerald-500" /> : <ClipboardDocumentIcon className="size-3.5" />}
                      </button>
                      <a
                        href={`/audit/${audit.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-[#CCC] hover:text-[#1A1A1A] transition-colors"
                      >
                        <ArrowTopRightOnSquareIcon className="size-3.5" />
                      </a>
                    </>
                  )}
                  <button
                    onClick={() => handleDelete(audit.id)}
                    className={`p-1.5 transition-colors ${confirmDeleteId === audit.id ? "text-red-500" : "text-[#CCC] hover:text-red-400"}`}
                  >
                    <TrashIcon className="size-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
