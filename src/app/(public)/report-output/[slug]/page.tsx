"use client";

/* ── Report output (public, shareable) ── */

import { use, useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowDownTrayIcon, ChartPieIcon } from "@heroicons/react/24/outline";
import { reportsStore } from "@/lib/reports/data";
import type { Report } from "@/lib/reports/types";

export default function ReportOutputPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await reportsStore.getAll();
      if (cancelled) return;
      setReport(rows.find((r) => r.output_slug === slug) ?? null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) return (<div className="min-h-screen bg-background flex items-center justify-center"><div className="size-8 rounded-full border-2 border-sky-500/30 border-t-sky-500 animate-spin" /></div>);
  if (!report) return (<div className="min-h-screen bg-background flex items-center justify-center px-4"><div className="text-center"><h1 className="text-2xl font-semibold text-foreground">Report not found</h1></div></div>);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-40" style={{ backgroundImage: "radial-gradient(circle at 80% 0%, rgba(14,165,233,0.12) 0%, transparent 50%)" }} />
      <div className="max-w-3xl mx-auto px-6 pt-6 flex justify-end print:hidden">
        <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-surface-raised text-foreground hover:bg-surface-hover ring-1 ring-border">
          <ArrowDownTrayIcon className="size-3.5" />
          Download PDF
        </button>
      </div>
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-10">
        <header>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-sky-300/80 font-semibold mb-4">
            <ChartPieIcon className="size-3.5" />
            {report.is_qbr
              ? "Quarterly business review · Ecom Landers"
              : report.period === "weekly"
                ? "Weekly report · Ecom Landers"
                : report.period === "monthly"
                  ? "Monthly report · Ecom Landers"
                  : "Quarterly report · Ecom Landers"}
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold bg-gradient-to-br from-white via-sky-100 to-cyan-200 bg-clip-text text-transparent leading-[1.05] mb-2">
            {report.client_name}
          </h1>
          <p className="text-lg text-muted">{report.period_label}</p>
        </header>

        {report.headline && (
          <section>
            <div className="bg-gradient-to-br from-emerald-500/15 to-cyan-500/15 rounded-2xl p-5 ring-1 ring-emerald-500/30">
              <div className="prose prose-invert prose-lg max-w-none prose-p:text-foreground prose-strong:text-emerald-200">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.headline}</ReactMarkdown>
              </div>
            </div>
          </section>
        )}

        {/* Stats */}
        <section>
          <h2 className="text-xs uppercase tracking-[0.18em] font-semibold text-foreground mb-4">The numbers</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Pages shipped" value={String(report.pages_shipped)} />
            <Stat label="Tests run" value={String(report.tests_run)} />
            <Stat label="Won" value={String(report.tests_won)} highlight />
            <Stat label="Lost / Inconc." value={`${report.tests_lost} / ${report.tests_inconclusive}`} />
          </div>
          {report.cr_movement && (
            <div className="mt-3 text-[13px] text-emerald-200">{report.cr_movement}</div>
          )}
        </section>

        {report.narrative && (
          <section>
            <h2 className="text-xs uppercase tracking-[0.18em] font-semibold text-foreground mb-4">What we learned</h2>
            <div className="bg-background rounded-2xl p-5 ring-1 ring-border prose prose-invert max-w-none prose-p:text-muted prose-li:text-muted prose-strong:text-foreground">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.narrative}</ReactMarkdown>
            </div>
          </section>
        )}

        {report.tests.length > 0 && (
          <section>
            <h2 className="text-xs uppercase tracking-[0.18em] font-semibold text-foreground mb-4">Tests</h2>
            <ul className="space-y-2">
              {report.tests.map((t) => (
                <li key={t.test_id} className="bg-background rounded-xl p-4 ring-1 ring-border">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface text-muted">{t.status}</span>
                    {t.outcome && (
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-200">
                        {t.outcome}{t.uplift_pct !== undefined && ` ${t.uplift_pct >= 0 ? "+" : ""}${t.uplift_pct}%`}
                      </span>
                    )}
                    {t.surface && <span className="text-[11px] text-subtle">{t.surface}</span>}
                  </div>
                  <p className="text-[14px] text-foreground">{t.hypothesis || "(no hypothesis)"}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {report.pages.length > 0 && (
          <section>
            <h2 className="text-xs uppercase tracking-[0.18em] font-semibold text-foreground mb-4">Pages shipped</h2>
            <ul className="space-y-1.5">
              {report.pages.map((p, i) => (
                <li key={i} className="flex items-center gap-2 bg-background rounded-lg p-3 ring-1 ring-border">
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-200">D{p.horizon}</span>
                  <span className="text-[13px] text-foreground">{p.title}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="pt-8 pb-4 text-center border-t border-border">
          {report.prepared_by && (<p className="text-[11px] text-subtle">Prepared by {report.prepared_by}</p>)}
          <Link href="/" className="text-[11px] text-subtle hover:text-sky-300">ecomlanders.app</Link>
        </footer>
      </div>
    </div>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-3 ring-1 ${highlight ? "bg-emerald-500/15 ring-emerald-500/30" : "bg-background ring-border"}`}>
      <div className="text-[10px] uppercase tracking-wider font-semibold text-subtle">{label}</div>
      <div className={`text-2xl font-semibold ${highlight ? "text-emerald-300" : "text-foreground"}`}>{value}</div>
    </div>
  );
}
