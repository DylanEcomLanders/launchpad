"use client";

/* ── Brief output (public, shareable doc) ── */

import { use, useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowDownTrayIcon, DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import { briefsStore, iceScore } from "@/lib/briefs/data";
import { KIND_LABEL, KIND_TINT, type Brief } from "@/lib/briefs/types";

export default function BriefOutputPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await briefsStore.getAll();
      if (cancelled) return;
      setBrief(rows.find((r) => r.output_slug === slug) ?? null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) return (<div className="min-h-screen bg-[#080808] flex items-center justify-center"><div className="size-8 rounded-full border-2 border-cyan-500/30 border-t-cyan-500 animate-spin" /></div>);
  if (!brief) return (<div className="min-h-screen bg-[#080808] flex items-center justify-center px-4"><div className="text-center"><h1 className="text-2xl font-semibold text-[#E5E5EA] mb-3">Brief not found</h1></div></div>);

  return (
    <div className="min-h-screen bg-[#080808] text-[#E5E5EA]">
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-40" style={{ backgroundImage: "radial-gradient(circle at 80% 0%, rgba(6,182,212,0.12) 0%, transparent 50%)" }} />
      <div className="max-w-3xl mx-auto px-6 pt-6 flex justify-end print:hidden">
        <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-white/10 text-white hover:bg-white/15 ring-1 ring-white/20">
          <ArrowDownTrayIcon className="size-3.5" />
          Download PDF
        </button>
      </div>
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-10">
        <header>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-cyan-300/80 font-semibold mb-4">
            <DocumentDuplicateIcon className="size-3.5" />
            {KIND_LABEL[brief.kind]} · Ecom Landers
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold bg-gradient-to-br from-white via-cyan-100 to-sky-200 bg-clip-text text-transparent leading-[1.05] mb-2">
            {brief.title}
          </h1>
          <p className="text-base text-[#9CA3AF]">
            {brief.client_name}{brief.project_label && ` · ${brief.project_label}`}
          </p>
          <div className="mt-4 flex items-center gap-2 flex-wrap text-[11px] text-[#71757D]">
            {brief.owner && <Pill>{brief.owner}</Pill>}
            {brief.deadline && <Pill>Due {new Date(brief.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}</Pill>}
            {brief.audience && <Pill>{brief.audience}</Pill>}
            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold ${KIND_TINT[brief.kind]}`}>{KIND_LABEL[brief.kind]}</span>
          </div>
        </header>

        {brief.objective && (<Block title="Objective" body={brief.objective} />)}

        {brief.kind === "design" && (
          <>
            {brief.design_key_message && (<Block title="Key message + hierarchy" body={brief.design_key_message} />)}
            {brief.design_must_include && (<Block title="Must include" body={brief.design_must_include} />)}
            {brief.design_brand_constraints && (<Block title="Brand constraints" body={brief.design_brand_constraints} />)}
          </>
        )}

        {brief.kind === "dev" && (
          <>
            {brief.dev_what_built && (<Block title="What gets built" body={brief.dev_what_built} />)}
            {brief.dev_design_link && (<Block title="Design link" body={`[${brief.dev_design_link}](${brief.dev_design_link})`} />)}
            {brief.dev_functionality && (<Block title="Functionality" body={brief.dev_functionality} />)}
            {brief.dev_variant_logic && (<Block title="Variant logic" body={brief.dev_variant_logic} />)}
            {brief.dev_tracking_events && (<Block title="Tracking + events" body={brief.dev_tracking_events} />)}
            {brief.dev_qa_criteria && (<Block title="QA criteria" body={brief.dev_qa_criteria} />)}
            {(brief.dev_testing_tool || brief.dev_browsers) && (
              <div className="grid grid-cols-2 gap-3">
                {brief.dev_testing_tool && <Stat label="Tool" value={brief.dev_testing_tool} />}
                {brief.dev_browsers && <Stat label="Browsers" value={brief.dev_browsers} />}
              </div>
            )}
          </>
        )}

        {brief.kind === "hypothesis" && (
          <>
            {brief.hyp_hypothesis_line && (
              <section>
                <h2 className="text-xs uppercase tracking-[0.18em] font-semibold text-emerald-300 mb-3">The hypothesis</h2>
                <div className="bg-gradient-to-br from-emerald-500/15 to-cyan-500/15 rounded-2xl p-5 ring-1 ring-emerald-500/30">
                  <p className="text-lg text-[#E5E5EA] leading-relaxed">{brief.hyp_hypothesis_line}</p>
                </div>
              </section>
            )}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Stat label="Primary metric" value={brief.hyp_primary_metric || "—"} />
              <Stat label="Impact" value={String(brief.hyp_impact ?? "—")} />
              <Stat label="Confidence" value={String(brief.hyp_confidence ?? "—")} />
              <Stat label="ICE" value={String(iceScore(brief))} highlight />
            </div>
            {brief.hyp_control_desc && (<Block title="Control" body={brief.hyp_control_desc} />)}
            {brief.hyp_variant_desc && (<Block title="Variant" body={brief.hyp_variant_desc} />)}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {brief.hyp_traffic_split && <Stat label="Split" value={brief.hyp_traffic_split} />}
              {brief.hyp_min_runtime && <Stat label="Runtime" value={brief.hyp_min_runtime} />}
              {brief.hyp_tool && <Stat label="Tool" value={brief.hyp_tool} />}
            </div>
            {brief.hyp_success_criteria && (<Block title="Success criteria" body={brief.hyp_success_criteria} />)}
          </>
        )}

        {brief.references && (<Block title="References + inspiration" body={brief.references} />)}

        <footer className="pt-8 pb-4 text-center border-t border-white/[0.04]">
          <Link href="/" className="text-[11px] text-[#71757D] hover:text-cyan-300">ecomlanders.app</Link>
        </footer>
      </div>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (<span className="px-2.5 py-0.5 rounded-full bg-[#1A1A1A] text-[11px] uppercase tracking-wider text-[#9CA3AF]">{children}</span>);
}
function Block({ title, body }: { title: string; body: string }) {
  return (
    <section>
      <h2 className="text-xs uppercase tracking-[0.18em] font-semibold text-[#E5E5EA] mb-3">{title}</h2>
      <div className="bg-[#0F0F10] rounded-2xl p-5 ring-1 ring-white/[0.04] prose prose-invert prose-sm max-w-none prose-p:text-[#9CA3AF] prose-li:text-[#9CA3AF] prose-strong:text-[#E5E5EA] prose-a:text-cyan-300">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
      </div>
    </section>
  );
}
function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-3 ring-1 ${highlight ? "bg-emerald-500/15 ring-emerald-500/30" : "bg-[#0F0F10] ring-white/[0.04]"}`}>
      <div className="text-[10px] uppercase tracking-wider font-semibold text-[#71757D]">{label}</div>
      <div className={`text-xl font-semibold ${highlight ? "text-emerald-300 font-mono" : "text-[#E5E5EA]"}`}>{value}</div>
    </div>
  );
}
