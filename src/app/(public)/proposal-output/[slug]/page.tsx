"use client";

/* ── Proposal output (public, shareable) ── */

import { use, useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CheckCircleIcon, DocumentTextIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { formatMoney, proposalsStore, quotedTotal } from "@/lib/proposals/data";
import type { Proposal } from "@/lib/proposals/types";

export default function ProposalOutputPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await proposalsStore.getAll();
      if (cancelled) return;
      setProposal(rows.find((r) => r.output_slug === slug) ?? null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) {
    return (<div className="min-h-screen bg-[#080808] flex items-center justify-center"><div className="size-8 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" /></div>);
  }
  if (!proposal) {
    return (<div className="min-h-screen bg-[#080808] flex items-center justify-center px-4"><div className="text-center max-w-md"><h1 className="text-2xl font-semibold text-[#E5E5EA] mb-3">Proposal not found</h1><p className="text-sm text-[#9CA3AF]">This link may have moved. Reach out and we&apos;ll send a new one.</p></div></div>);
  }

  return (
    <div className="min-h-screen bg-[#080808] text-[#E5E5EA]">
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-50" style={{ backgroundImage: "radial-gradient(circle at 20% 0%, rgba(16,185,129,0.12) 0%, transparent 50%), radial-gradient(circle at 80% 100%, rgba(14,165,233,0.10) 0%, transparent 50%)" }} />

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-10">
        {/* Cover */}
        <header>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-emerald-300/80 font-semibold mb-6">
            <DocumentTextIcon className="size-3.5" />
            {proposal.is_renewal ? "Renewal proposal" : "Proposal"} · Ecom Landers
          </div>
          <p className="text-sm text-[#9CA3AF] mb-2">
            For {proposal.contact_name || proposal.brand_name}
          </p>
          <h1 className="text-4xl md:text-5xl font-semibold bg-gradient-to-br from-white via-emerald-100 to-cyan-200 bg-clip-text text-transparent leading-[1.05] mb-4">
            {proposal.brand_name}
          </h1>
          <p className="text-lg text-[#9CA3AF]">
            {proposal.is_renewal ? "Continuation of the Conversion Engine" : "The Conversion Engine"} · <span className="text-[#E5E5EA]">{proposal.tier} tier</span>
          </p>
          {proposal.is_renewal && (
            <p className="text-sm text-emerald-300/80 mt-2">
              Rolling forward into your next {proposal.term_months}-month term. Same engine, building on the momentum we&apos;ve built.
            </p>
          )}
        </header>

        {/* Total */}
        <div className="bg-gradient-to-br from-emerald-500/15 to-cyan-500/15 rounded-2xl p-6 ring-1 ring-emerald-500/30">
          <div className="text-[10px] uppercase tracking-wider text-emerald-300 font-semibold mb-2">
            Investment
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-5xl font-semibold bg-gradient-to-br from-emerald-200 to-cyan-200 bg-clip-text text-transparent">
              {formatMoney(proposal.monthly_fee, proposal.fee_currency)}
            </span>
            <span className="text-lg text-[#9CA3AF]">/ month</span>
          </div>
          <div className="text-sm text-[#9CA3AF]">
            {proposal.term_months}-month minimum term · {formatMoney(quotedTotal(proposal), proposal.fee_currency)} total
            {proposal.prepay && (
              <span className="text-emerald-300"> (incl. {proposal.prepay_discount_pct}% prepay discount)</span>
            )}
          </div>
          {proposal.kickoff_date && (
            <div className="text-[11px] text-[#71757D] mt-3">
              Proposed kickoff: {new Date(proposal.kickoff_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          )}
        </div>

        {/* What's included */}
        <section>
          <h2 className="text-xs uppercase tracking-[0.18em] font-semibold text-[#E5E5EA] mb-4">
            What you get, every month
          </h2>
          <ul className="space-y-2">
            {proposal.scope_items.filter((s) => s.label.trim()).map((s) => (
              <li key={s.id} className="flex items-start gap-3 bg-[#0F0F10] rounded-xl p-3 ring-1 ring-white/[0.04]">
                <CheckCircleIcon className="size-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm text-[#E5E5EA]">{s.label}</div>
                  {s.detail && <div className="text-[12px] text-[#71757D] mt-0.5">{s.detail}</div>}
                </div>
              </li>
            ))}
          </ul>
          {proposal.custom_scope_notes.trim() && (
            <div className="mt-4 prose prose-invert prose-sm max-w-none prose-p:text-[#9CA3AF] prose-li:text-[#9CA3AF] prose-strong:text-[#E5E5EA]">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{proposal.custom_scope_notes}</ReactMarkdown>
            </div>
          )}
        </section>

        {/* Guarantee */}
        {proposal.guarantee_text.trim() && (
          <section>
            <div className="bg-[#0F0F10] rounded-2xl ring-1 ring-emerald-500/30 p-6">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheckIcon className="size-5 text-emerald-400" />
                <h2 className="text-xs uppercase tracking-[0.18em] font-semibold text-emerald-300">
                  The guarantee
                </h2>
              </div>
              <div className="prose prose-invert prose-sm max-w-none prose-p:text-[#E5E5EA]">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{proposal.guarantee_text}</ReactMarkdown>
              </div>
            </div>
          </section>
        )}

        {/* Terms */}
        <section>
          <h2 className="text-xs uppercase tracking-[0.18em] font-semibold text-[#E5E5EA] mb-3">Terms</h2>
          <ul className="text-[13px] text-[#9CA3AF] space-y-1.5">
            <li>· {proposal.term_months}-month minimum term, then rolls month to month</li>
            <li>· {proposal.prepay ? `Prepaid: ${formatMoney(quotedTotal(proposal), proposal.fee_currency)} for the term, ${proposal.prepay_discount_pct}% saved` : `Monthly: ${formatMoney(proposal.monthly_fee, proposal.fee_currency)} per month`}</li>
            <li>· Payment via {proposal.payment_method}</li>
            <li>· Same-day response SLA, dedicated channel</li>
          </ul>
        </section>

        <footer className="pt-8 pb-4 text-center border-t border-white/[0.04]">
          <p className="text-[11px] text-[#71757D]">
            Built by Ecom Landers · Conversion engine for Shopify brands
          </p>
          {proposal.prepared_by && (
            <p className="text-[11px] text-[#71757D] mt-1">Prepared by {proposal.prepared_by}</p>
          )}
          <Link href="/" className="text-[11px] text-[#71757D] hover:text-emerald-300 transition-colors">
            ecomlanders.app
          </Link>
        </footer>
      </div>
    </div>
  );
}
