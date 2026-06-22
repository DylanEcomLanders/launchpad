"use client";

/* ── Report detail / editor ── */

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowTopRightOnSquareIcon,
  ChartPieIcon,
  ClipboardIcon,
  CheckIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useRole } from "@/components/auth-gate";
import { nowISO, reportsStore } from "@/lib/reports/data";
import { STATUS_LABEL, STATUS_TINT, type Report, type ReportStatus } from "@/lib/reports/types";
import { inputClass, labelClass, textareaClass } from "@/lib/form-styles";

const STATUSES: ReportStatus[] = ["draft", "ready", "sent"];

export default function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const role = useRole();
  const isAdmin = role === "admin" || role === "cro";

  const [report, setReport] = useState<Report | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await reportsStore.getAll();
      if (cancelled) return;
      const found = rows.find((r) => r.id === id);
      if (!found) setNotFound(true);
      else setReport(found);
      setHydrated(true);
    })();
    return () => { cancelled = true; };
  }, [id]);

  const isFirstSave = useRef(true);
  useEffect(() => {
    if (!report) return;
    if (isFirstSave.current) { isFirstSave.current = false; return; }
    const t = setTimeout(async () => {
      setSaving(true);
      const stamped = { ...report, updated_at: nowISO() };
      if (report.status === "sent" && !report.sent_at) stamped.sent_at = nowISO();
      await reportsStore.update(report.id, stamped);
      setSaving(false);
      setSavedAt(stamped.updated_at);
    }, 600);
    return () => clearTimeout(t);
  }, [report]);

  function patch(p: Partial<Report>) {
    setReport((prev) => (prev ? { ...prev, ...p } : prev));
  }
  async function copyShareLink() {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/report-output/${report.output_slug}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* deny */ }
  }
  async function deleteReport() {
    if (!report) return;
    if (!window.confirm("Delete this report?")) return;
    await reportsStore.remove(report.id);
    router.push("/tools/reports");
  }

  if (!isAdmin) return (<div className="p-6"><div className="bg-[#0F0F10] rounded-2xl p-8 text-center ring-1 ring-white/[0.04]"><p className="text-sm text-[#71757D]">Admin / CRO only.</p></div></div>);
  if (!hydrated) return (<div className="p-6 space-y-3 max-w-5xl mx-auto">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 bg-[#0C0C0C] rounded-xl animate-pulse" />)}</div>);
  if (notFound || !report) return (<div className="p-6"><div className="bg-[#0F0F10] rounded-2xl p-8 text-center ring-1 ring-white/[0.04]"><p className="text-sm text-[#71757D] mb-3">Report not found.</p><Link href="/tools/reports" className="text-[12px] uppercase tracking-wider text-sky-300">← Back</Link></div></div>);

  const sharePath = `/report-output/${report.output_slug}`;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Link href="/tools/reports" className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-[#71757D] hover:text-[#E5E5EA] mb-3">
            <ArrowLeftIcon className="size-3.5" />
            All reports
          </Link>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <div className="size-8 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-[0_8px_24px_rgba(14,165,233,0.3)] shrink-0">
              <ChartPieIcon className="size-4 text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-[#E5E5EA] truncate">
              {report.client_name} · {report.period_label}
            </h1>
            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold ${STATUS_TINT[report.status]}`}>
              {STATUS_LABEL[report.status]}
            </span>
          </div>
          <div className="text-[12px] text-[#71757D] flex items-center gap-2">
            <span>{saving ? "Saving…" : savedAt ? `Saved ${new Date(savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Loaded"}</span>
            <span>·</span>
            <button onClick={copyShareLink} className="inline-flex items-center gap-1 hover:text-[#E5E5EA]">
              {copied ? <CheckIcon className="size-3.5" /> : <ClipboardIcon className="size-3.5" />}
              {copied ? "Copied" : "Copy link"}
            </button>
            <span>·</span>
            <Link href={sharePath} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-sky-300">
              Open report
              <ArrowTopRightOnSquareIcon className="size-3" />
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select value={report.status} onChange={(e) => patch({ status: e.target.value as ReportStatus })} className={`${inputClass} w-auto`}>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <button onClick={deleteReport} className="p-1.5 rounded-md text-[#71757D] hover:text-rose-400"><TrashIcon className="size-4" /></button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Pages shipped" value={report.pages_shipped} />
        <Stat label="Tests run" value={report.tests_run} />
        <Stat label="Won" value={report.tests_won} accent="emerald" />
        <Stat label="Inconclusive" value={report.tests_inconclusive} accent="zinc" />
      </div>

      {/* Editable headline + narrative */}
      <Section title="Headline + narrative">
        <Field label="Headline (one line, markdown)">
          <input value={report.headline} onChange={(e) => patch({ headline: e.target.value })} className={inputClass} placeholder="The wins of the period in a sentence" />
        </Field>
        <Field label="Narrative (markdown - what we learned, what's next)">
          <textarea value={report.narrative} onChange={(e) => patch({ narrative: e.target.value })} rows={6} className={`${textareaClass} font-mono text-[13px]`} />
        </Field>
        <Field label="CR movement vs baseline (with caveat)">
          <input value={report.cr_movement} onChange={(e) => patch({ cr_movement: e.target.value })} className={inputClass} placeholder="+12% on PDP (mind the spend mix)" />
        </Field>
        <Field label="Prepared by">
          <input value={report.prepared_by} onChange={(e) => patch({ prepared_by: e.target.value })} className={inputClass} />
        </Field>
      </Section>

      {/* Tests summary */}
      <Section title={`Tests this period (${report.tests.length})`}>
        {report.tests.length === 0 ? (
          <p className="text-[11px] italic text-[#71757D]">Nothing to summarise.</p>
        ) : (
          <ul className="space-y-2">
            {report.tests.map((t) => (
              <li key={t.test_id} className="bg-black/40 rounded-lg p-3 ring-1 ring-white/[0.04]">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#1A1A1A] text-[#9CA3AF]">{t.status}</span>
                  {t.outcome && <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-200">{t.outcome}{t.uplift_pct !== undefined && ` ${t.uplift_pct >= 0 ? "+" : ""}${t.uplift_pct}%`}</span>}
                  {t.surface && <span className="text-[11px] text-[#71757D]">{t.surface}</span>}
                </div>
                <p className="text-[13px] text-[#E5E5EA] line-clamp-2">{t.hypothesis || "(no hypothesis)"}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Pages shipped (${report.pages.length})`}>
        {report.pages.length === 0 ? (
          <p className="text-[11px] italic text-[#71757D]">Nothing to summarise.</p>
        ) : (
          <ul className="space-y-1">
            {report.pages.map((p, i) => (
              <li key={i} className="flex items-center gap-2 text-[13px]">
                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-200">D{p.horizon}</span>
                <span className="text-[#E5E5EA]">{p.title}</span>
                <span className="text-[10px] text-cyan-300 font-mono ml-auto">ICE {p.ice_score}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (<div className="bg-[#0F0F10] rounded-2xl ring-1 ring-white/[0.04] p-5"><h2 className="text-sm font-semibold text-[#E5E5EA] mb-4">{title}</h2><div className="space-y-3">{children}</div></div>);
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<div><label className={labelClass}>{label}</label>{children}</div>);
}
function Stat({ label, value, accent = "default" }: { label: string; value: number; accent?: "default" | "emerald" | "zinc" }) {
  const tint = accent === "emerald" ? "text-emerald-300" : accent === "zinc" ? "text-zinc-300" : "text-[#E5E5EA]";
  return (
    <div className="bg-[#0F0F10] rounded-xl p-4 ring-1 ring-white/[0.04]">
      <div className="text-[10px] uppercase tracking-wider text-[#71757D] font-semibold">{label}</div>
      <div className={`text-2xl font-semibold ${tint}`}>{value}</div>
    </div>
  );
}
