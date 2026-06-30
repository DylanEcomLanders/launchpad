"use client";

/* ── Reports (list + generate) ── */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowTopRightOnSquareIcon,
  ChartPieIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { useRole } from "@/components/auth-gate";
import { generateReport, reportsStore } from "@/lib/reports/data";
import { roadmapsStore } from "@/lib/roadmaps/data";
import { testsStore } from "@/lib/tests/data";
import { STATUS_LABEL, STATUS_TINT, type Report, type ReportPeriod } from "@/lib/reports/types";
import { inputClass } from "@/lib/form-styles";

export default function ReportsListPage() {
  const role = useRole();
  const isAdmin = role === "admin" || role === "cro";
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [genClient, setGenClient] = useState("");
  const [genPeriod, setGenPeriod] = useState<ReportPeriod>("weekly");
  const [genIsQbr, setGenIsQbr] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await reportsStore.getAll();
      if (cancelled) return;
      setReports(rows.sort((a, b) => b.created_at.localeCompare(a.created_at)));
      setHydrated(true);
    })();
    return () => { cancelled = true; };
  }, []);

  async function generate() {
    if (!genClient.trim()) return;
    setGenerating(true);
    const [tests, roadmaps] = await Promise.all([
      testsStore.getAll(),
      roadmapsStore.getAll(),
    ]);
    const r = generateReport(genClient.trim(), genPeriod, tests, roadmaps, { isQbr: genIsQbr });
    await reportsStore.create(r);
    setGenerating(false);
    router.push(`/tools/reports/${r.id}`);
  }

  if (!isAdmin) return (<div className="p-6"><div className="bg-background rounded-2xl p-8 text-center ring-1 ring-white/[0.04]"><p className="text-sm text-subtle">Admin / CRO only.</p></div></div>);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <header>
        <div className="flex items-center gap-3 mb-2">
          <div className="size-9 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-[0_8px_24px_rgba(14,165,233,0.3)]">
            <ChartPieIcon className="size-5 text-white" />
          </div>
          <h1 className="text-2xl font-semibold bg-gradient-to-br from-emerald-300 via-cyan-300 to-sky-300 bg-clip-text text-transparent">
            Reports
          </h1>
        </div>
        <p className="text-sm text-muted max-w-2xl">
          Weekly + monthly reports auto-filled from tests + roadmaps for the period. Strategist reviews + edits + sends.
        </p>
      </header>

      {/* Generator */}
      <div className="bg-background rounded-2xl p-5 ring-1 ring-white/[0.04]">
        <h2 className="text-sm font-semibold text-foreground mb-3">Generate a report</h2>
        <div className="flex flex-col sm:flex-row items-end gap-3">
          <div className="flex-1">
            <label className="text-[10px] uppercase tracking-wider text-subtle font-semibold">Client</label>
            <input value={genClient} onChange={(e) => setGenClient(e.target.value)} className={inputClass} placeholder="Client / brand name" />
          </div>
          <div className="w-40">
            <label className="text-[10px] uppercase tracking-wider text-subtle font-semibold">Period</label>
            <select value={genPeriod} onChange={(e) => {
              const next = e.target.value as ReportPeriod;
              setGenPeriod(next);
              /* Quarterly → default to QBR; admin can untick. */
              if (next === "quarterly") setGenIsQbr(true);
            }} className={inputClass}>
              <option value="weekly">This week</option>
              <option value="monthly">This month</option>
              <option value="quarterly">This quarter</option>
            </select>
          </div>
          <label className="inline-flex items-center gap-2 text-[11px] text-muted pb-2">
            <input type="checkbox" checked={genIsQbr} onChange={(e) => setGenIsQbr(e.target.checked)} className="accent-sky-500" />
            QBR mode (VIP)
          </label>
          <button onClick={generate} disabled={!genClient.trim() || generating} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-[12px] font-semibold uppercase tracking-wider bg-white text-background hover:bg-foreground disabled:opacity-40 disabled:cursor-not-allowed">
            <PlusIcon className="size-4" />
            {generating ? "Generating…" : "Generate"}
          </button>
        </div>
      </div>

      {!hydrated ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-background rounded-xl animate-pulse" />)}</div>
      ) : reports.length === 0 ? (
        <div className="bg-background rounded-2xl p-12 text-center ring-1 ring-white/[0.04]">
          <p className="text-sm text-subtle">No reports yet. Generate one above.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {reports.map((r) => (
            <li key={r.id}>
              <Link href={`/tools/reports/${r.id}`} className="block bg-background rounded-xl p-4 ring-1 ring-white/[0.04] hover:ring-sky-500/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {r.client_name} · {r.period_label}
                      </span>
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold ${STATUS_TINT[r.status]}`}>
                        {STATUS_LABEL[r.status]}
                      </span>
                    </div>
                    <div className="text-[12px] text-subtle flex items-center gap-2 flex-wrap">
                      <span>{r.period}</span>
                      <span>· {r.pages_shipped} pages</span>
                      <span>· {r.tests_run} tests ({r.tests_won}W / {r.tests_lost}L / {r.tests_inconclusive}I)</span>
                      {r.prepared_by && <span>· {r.prepared_by}</span>}
                    </div>
                  </div>
                  {r.status !== "draft" && (
                    <a href={`/report-output/${r.output_slug}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-subtle hover:text-sky-300 shrink-0">
                      View
                      <ArrowTopRightOnSquareIcon className="size-3.5" />
                    </a>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
