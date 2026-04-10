"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface DeckData {
  id: string;
  brand_name: string;
  brand_url: string;
  monthly_traffic: number;
  current_cvr: number;
  benchmark_cvr: number;
  aov: number;
  scores: Record<string, number>;
  priorities: string[];
  retainer_price: number;
  anchor_price: number;
  created_by: string;
}

const SCORE_LABELS: Record<string, string> = {
  traffic: "Traffic Quality",
  ad_alignment: "Ad-to-Page Alignment",
  landing_page: "Landing Page",
  pdp: "Product Page",
  cart: "Cart",
  checkout: "Checkout",
  post_purchase: "Post-Purchase",
  retention: "Retention",
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const color = score >= 7 ? "#10B981" : score >= 5 ? "#F59E0B" : "#EF4444";
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[#999] w-36 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-[#F0F0F0] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${score * 10}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-semibold w-6 text-right" style={{ color }}>{score}</span>
    </div>
  );
}

export default function DeckPage() {
  const { id } = useParams();
  const [deck, setDeck] = useState<DeckData | null>(null);
  const [loading, setLoading] = useState(true);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    fetch(`/api/decks?id=${id}`)
      .then(r => r.json())
      .then(d => { setDeck(d.deck); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center"><div className="animate-spin size-6 border-2 border-white/20 border-t-white rounded-full" /></div>;
  if (!deck) return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-white/50 text-sm">Deck not found</div>;

  const gap = deck.monthly_traffic * (deck.benchmark_cvr / 100 - deck.current_cvr / 100) * deck.aov;
  const annual = gap * 12;
  const breakeven = deck.retainer_price / (deck.monthly_traffic * deck.aov) * 100;
  const avgScore = Object.values(deck.scores).reduce((a, b) => a + b, 0) / Object.values(deck.scores).length;

  const slides = [
    // Slide 0: Cover
    <div key="cover" className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="mb-12">
        <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-4">Conversion Opportunity Analysis</div>
        <h1 className="text-5xl font-bold text-white mb-4">{deck.brand_name}</h1>
        <div className="w-16 h-px bg-white/20 mx-auto mb-4" />
        <p className="text-sm text-white/40">Prepared by Ecom Landers</p>
      </div>
    </div>,

    // Slide 1: The Problem
    <div key="problem" className="flex flex-col justify-center h-full px-12 md:px-20">
      <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-6">The Problem</p>
      <h2 className="text-3xl font-bold text-white mb-8">Your ad spend is working.<br />Your post-click experience isn&apos;t.</h2>
      <div className="grid grid-cols-3 gap-6 mt-4">
        <div className="border border-white/10 rounded-xl p-6 text-center">
          <p className="text-3xl font-bold text-white">{(deck.monthly_traffic / 1000).toFixed(0)}K</p>
          <p className="text-[10px] text-white/40 mt-2 uppercase tracking-wider">Monthly Sessions</p>
        </div>
        <div className="border border-white/10 rounded-xl p-6 text-center">
          <p className="text-3xl font-bold text-red-400">{deck.current_cvr}%</p>
          <p className="text-[10px] text-white/40 mt-2 uppercase tracking-wider">Current CVR</p>
        </div>
        <div className="border border-white/10 rounded-xl p-6 text-center">
          <p className="text-3xl font-bold text-emerald-400">{deck.benchmark_cvr}%</p>
          <p className="text-[10px] text-white/40 mt-2 uppercase tracking-wider">Benchmark CVR</p>
        </div>
      </div>
    </div>,

    // Slide 2: Where You're Leaking
    <div key="scores" className="flex flex-col justify-center h-full px-12 md:px-20">
      <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-6">Funnel Analysis</p>
      <h2 className="text-3xl font-bold text-white mb-2">Where you&apos;re leaking</h2>
      <p className="text-sm text-white/40 mb-8">Average score: <span className={avgScore >= 6 ? "text-amber-400" : "text-red-400"}>{avgScore.toFixed(1)}/10</span></p>
      <div className="space-y-3">
        {Object.entries(deck.scores).map(([key, score]) => (
          <ScoreBar key={key} label={SCORE_LABELS[key] || key} score={score} />
        ))}
      </div>
    </div>,

    // Slide 3: Revenue Gap
    <div key="revenue" className="flex flex-col justify-center h-full px-12 md:px-20">
      <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-6">Revenue Gap</p>
      <h2 className="text-3xl font-bold text-white mb-3">You&apos;re leaving money on the table</h2>
      <p className="text-sm text-white/40 mb-10">Based on your current traffic, closing the CVR gap represents:</p>
      <div className="grid grid-cols-2 gap-6">
        <div className="border border-white/10 rounded-xl p-8">
          <p className="text-4xl font-bold text-emerald-400">{fmt(gap)}</p>
          <p className="text-xs text-white/40 mt-2">Recovered revenue per month</p>
        </div>
        <div className="border border-white/10 rounded-xl p-8">
          <p className="text-4xl font-bold text-emerald-400">{fmt(annual)}</p>
          <p className="text-xs text-white/40 mt-2">Annual opportunity</p>
        </div>
      </div>
      <p className="text-xs text-white/30 mt-6">This is revenue your traffic is already generating — you&apos;re just losing it after the click.</p>
    </div>,

    // Slide 4: Priorities
    <div key="priorities" className="flex flex-col justify-center h-full px-12 md:px-20">
      <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-6">90-Day Roadmap</p>
      <h2 className="text-3xl font-bold text-white mb-8">What we&apos;d fix first</h2>
      <div className="space-y-4">
        {deck.priorities.map((p, i) => (
          <div key={i} className="flex gap-4 items-start border border-white/10 rounded-xl p-5">
            <div className="size-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-white">{i + 1}</span>
            </div>
            <p className="text-sm text-white/80 leading-relaxed">{p}</p>
          </div>
        ))}
      </div>
    </div>,

    // Slide 5: How We Work
    <div key="how" className="flex flex-col justify-center h-full px-12 md:px-20">
      <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-6">How We Work</p>
      <h2 className="text-3xl font-bold text-white mb-8">Not a vendor. Your conversion team.</h2>
      <div className="grid grid-cols-3 gap-4">
        {[
          { month: "Month 1", title: "Audit & Roadmap", desc: "Deep-dive into every funnel layer. Prioritised roadmap based on revenue impact." },
          { month: "Month 2-3", title: "Build & Test", desc: "Landing pages, PDP optimisation, checkout improvements. Every build has a hypothesis." },
          { month: "Month 4+", title: "Compound", desc: "Test results feed the next round. CVR climbs month over month. Results compound." },
        ].map((step) => (
          <div key={step.month} className="border border-white/10 rounded-xl p-5">
            <p className="text-[10px] text-emerald-400 uppercase tracking-wider mb-2">{step.month}</p>
            <p className="text-sm font-semibold text-white mb-2">{step.title}</p>
            <p className="text-xs text-white/40 leading-relaxed">{step.desc}</p>
          </div>
        ))}
      </div>
    </div>,

    // Slide 6: The Offer
    <div key="offer" className="flex flex-col justify-center h-full px-12 md:px-20">
      <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-6">The Investment</p>
      <h2 className="text-3xl font-bold text-white mb-8">Two ways to work together</h2>
      <div className="grid grid-cols-2 gap-6">
        <div className="border border-white/10 rounded-xl p-8 relative">
          <div className="absolute -top-3 left-6 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">Recommended</div>
          <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Conversion Engine</p>
          <p className="text-3xl font-bold text-white mb-1">{fmt(deck.retainer_price)}<span className="text-base font-normal text-white/40">/mo</span></p>
          <div className="w-full h-px bg-white/10 my-4" />
          <ul className="space-y-2 text-xs text-white/60">
            <li>Full conversion audit & roadmap</li>
            <li>Monthly page builds</li>
            <li>Testing roadmap & execution</li>
            <li>Offer & positioning optimisation</li>
            <li>Monthly reporting</li>
            <li>Dedicated Slack channel</li>
          </ul>
        </div>
        <div className="border border-white/5 rounded-xl p-8 bg-white/[0.02]">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-3 mt-3">Conversion Engine Pro</p>
          <p className="text-3xl font-bold text-white/60 mb-1">{fmt(deck.anchor_price)}<span className="text-base font-normal text-white/30">/mo</span></p>
          <div className="w-full h-px bg-white/10 my-4" />
          <ul className="space-y-2 text-xs text-white/40">
            <li>Everything in Core, plus:</li>
            <li>48h design turnaround</li>
            <li>Dedicated strategist</li>
            <li>Weekly calls</li>
            <li>Ad creative alignment</li>
            <li>Quarterly business reviews</li>
          </ul>
        </div>
      </div>
      <p className="text-xs text-white/30 mt-6 text-center">Pays for itself at a {breakeven.toFixed(2)}% CVR lift. Our average client sees 1-2% in the first 90 days.</p>
    </div>,

    // Slide 7: Next Steps
    <div key="next" className="flex flex-col items-center justify-center h-full text-center px-8">
      <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-6">Next Steps</p>
      <h2 className="text-4xl font-bold text-white mb-6">Ready to close the gap?</h2>
      <p className="text-sm text-white/40 mb-8 max-w-md">First deliverable: comprehensive audit and prioritised roadmap within 3 business days of kickoff.</p>
      <div className="border border-white/10 rounded-xl p-6 inline-block">
        <p className="text-xs text-white/40 mb-1">Get in touch</p>
        <p className="text-sm font-semibold text-white">dylan@ecomlanders.com</p>
      </div>
      <div className="mt-12 flex items-center gap-2 text-white/20 text-[10px]">
        <span>Prepared by</span>
        <span className="font-semibold text-white/30">Ecom Landers</span>
      </div>
    </div>,
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Slide */}
      <div className="h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-4xl mx-auto">
            {slides[slide]}
          </div>
        </div>

        {/* Nav */}
        <div className="shrink-0 flex items-center justify-between px-8 py-4 border-t border-white/5">
          <button
            onClick={() => setSlide(Math.max(0, slide - 1))}
            disabled={slide === 0}
            className="px-4 py-2 text-xs text-white/40 hover:text-white disabled:opacity-20 transition-colors"
          >
            Previous
          </button>
          <div className="flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                className={`size-2 rounded-full transition-colors ${i === slide ? "bg-white" : "bg-white/20 hover:bg-white/40"}`}
              />
            ))}
          </div>
          <button
            onClick={() => setSlide(Math.min(slides.length - 1, slide + 1))}
            disabled={slide === slides.length - 1}
            className="px-4 py-2 text-xs text-white/40 hover:text-white disabled:opacity-20 transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
