"use client";

import { useState } from "react";
import { ClipboardDocumentIcon, ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";

const SCORE_KEYS = [
  { key: "traffic", label: "Traffic Quality" },
  { key: "ad_alignment", label: "Ad-to-Page Alignment" },
  { key: "landing_page", label: "Landing Page" },
  { key: "pdp", label: "Product Page (PDP)" },
  { key: "cart", label: "Cart" },
  { key: "checkout", label: "Checkout" },
  { key: "post_purchase", label: "Post-Purchase" },
  { key: "retention", label: "Retention" },
];

export default function DeckBuilderPage() {
  const [brandName, setBrandName] = useState("");
  const [brandUrl, setBrandUrl] = useState("");
  const [traffic, setTraffic] = useState("");
  const [cvr, setCvr] = useState("");
  const [benchmarkCvr, setBenchmarkCvr] = useState("3.2");
  const [aov, setAov] = useState("");
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(SCORE_KEYS.map(k => [k.key, 5]))
  );
  const [priorities, setPriorities] = useState(["", "", ""]);
  const [retainerPrice, setRetainerPrice] = useState("9000");
  const [anchorPrice, setAnchorPrice] = useState("14000");
  const [generating, setGenerating] = useState(false);
  const [deckUrl, setDeckUrl] = useState<string | null>(null);

  function updateScore(key: string, val: number) {
    setScores(prev => ({ ...prev, [key]: Math.max(1, Math.min(10, val)) }));
  }

  async function generate() {
    if (!brandName.trim() || !traffic || !cvr || !aov) {
      alert("Fill in brand name, traffic, CVR, and AOV");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_name: brandName,
          brand_url: brandUrl,
          monthly_traffic: Number(traffic),
          current_cvr: Number(cvr),
          benchmark_cvr: Number(benchmarkCvr),
          aov: Number(aov),
          scores,
          priorities: priorities.filter(p => p.trim()),
          retainer_price: Number(retainerPrice),
          anchor_price: Number(anchorPrice),
          created_by: "dylan",
        }),
      });
      const data = await res.json();
      if (data.url) {
        setDeckUrl(`${window.location.origin}${data.url}`);
      }
    } catch {
      alert("Failed to generate deck");
    } finally {
      setGenerating(false);
    }
  }

  const gap = Number(traffic) * (Number(benchmarkCvr) / 100 - Number(cvr) / 100) * Number(aov);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#1B1B1B]">Deck Builder</h1>
          <p className="text-sm text-[#999] mt-1">Generate a branded discovery deck for Call 2</p>
        </div>

        <div className="space-y-6">
          {/* Brand */}
          <section className="border border-[#E5E5EA] rounded-xl p-5">
            <h2 className="text-xs font-semibold text-[#999] uppercase tracking-wider mb-4">Brand</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#999] mb-1">Brand Name</label>
                <input value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="e.g. Surreal" className="w-full px-3 py-2 text-sm border border-[#E5E5EA] rounded-lg focus:outline-none focus:border-[#1B1B1B]" />
              </div>
              <div>
                <label className="block text-xs text-[#999] mb-1">URL</label>
                <input value={brandUrl} onChange={e => setBrandUrl(e.target.value)} placeholder="https://eatsurreal.com" className="w-full px-3 py-2 text-sm border border-[#E5E5EA] rounded-lg focus:outline-none focus:border-[#1B1B1B]" />
              </div>
            </div>
          </section>

          {/* Numbers */}
          <section className="border border-[#E5E5EA] rounded-xl p-5">
            <h2 className="text-xs font-semibold text-[#999] uppercase tracking-wider mb-4">Traffic & Conversion</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-[#999] mb-1">Monthly Traffic</label>
                <input type="number" value={traffic} onChange={e => setTraffic(e.target.value)} placeholder="150000" className="w-full px-3 py-2 text-sm border border-[#E5E5EA] rounded-lg focus:outline-none focus:border-[#1B1B1B]" />
              </div>
              <div>
                <label className="block text-xs text-[#999] mb-1">Current CVR (%)</label>
                <input type="number" step="0.1" value={cvr} onChange={e => setCvr(e.target.value)} placeholder="1.8" className="w-full px-3 py-2 text-sm border border-[#E5E5EA] rounded-lg focus:outline-none focus:border-[#1B1B1B]" />
              </div>
              <div>
                <label className="block text-xs text-[#999] mb-1">Benchmark CVR (%)</label>
                <input type="number" step="0.1" value={benchmarkCvr} onChange={e => setBenchmarkCvr(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#E5E5EA] rounded-lg focus:outline-none focus:border-[#1B1B1B]" />
              </div>
              <div>
                <label className="block text-xs text-[#999] mb-1">AOV (£)</label>
                <input type="number" value={aov} onChange={e => setAov(e.target.value)} placeholder="55" className="w-full px-3 py-2 text-sm border border-[#E5E5EA] rounded-lg focus:outline-none focus:border-[#1B1B1B]" />
              </div>
            </div>
            {traffic && cvr && aov && gap > 0 && (
              <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                <p className="text-xs text-emerald-700">
                  Revenue gap: <span className="font-bold">£{gap.toLocaleString("en-GB", { maximumFractionDigits: 0 })}/mo</span> (£{(gap * 12).toLocaleString("en-GB", { maximumFractionDigits: 0 })}/year)
                </p>
              </div>
            )}
          </section>

          {/* Scores */}
          <section className="border border-[#E5E5EA] rounded-xl p-5">
            <h2 className="text-xs font-semibold text-[#999] uppercase tracking-wider mb-4">Conversion Matrix Scores</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {SCORE_KEYS.map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs text-[#999] mb-1">{label}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={scores[key]}
                      onChange={e => updateScore(key, Number(e.target.value))}
                      className="flex-1 accent-[#1B1B1B]"
                    />
                    <span className={`text-sm font-bold w-6 text-right ${scores[key] >= 7 ? "text-emerald-600" : scores[key] >= 5 ? "text-amber-500" : "text-red-500"}`}>
                      {scores[key]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Priorities */}
          <section className="border border-[#E5E5EA] rounded-xl p-5">
            <h2 className="text-xs font-semibold text-[#999] uppercase tracking-wider mb-4">Top 3 Priorities (90-day roadmap)</h2>
            {priorities.map((p, i) => (
              <div key={i} className="flex items-center gap-3 mb-3">
                <span className="size-6 rounded-full bg-[#F0F0F0] flex items-center justify-center text-xs font-bold text-[#999] shrink-0">{i + 1}</span>
                <input
                  value={p}
                  onChange={e => {
                    const next = [...priorities];
                    next[i] = e.target.value;
                    setPriorities(next);
                  }}
                  placeholder={`Priority ${i + 1}...`}
                  className="flex-1 px-3 py-2 text-sm border border-[#E5E5EA] rounded-lg focus:outline-none focus:border-[#1B1B1B]"
                />
              </div>
            ))}
          </section>

          {/* Pricing */}
          <section className="border border-[#E5E5EA] rounded-xl p-5">
            <h2 className="text-xs font-semibold text-[#999] uppercase tracking-wider mb-4">Offer Pricing</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#999] mb-1">Core Retainer (£/mo)</label>
                <input type="number" value={retainerPrice} onChange={e => setRetainerPrice(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#E5E5EA] rounded-lg focus:outline-none focus:border-[#1B1B1B]" />
              </div>
              <div>
                <label className="block text-xs text-[#999] mb-1">Anchor / Pro (£/mo)</label>
                <input type="number" value={anchorPrice} onChange={e => setAnchorPrice(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#E5E5EA] rounded-lg focus:outline-none focus:border-[#1B1B1B]" />
              </div>
            </div>
          </section>

          {/* Generate */}
          <div className="flex items-center gap-4">
            <button
              onClick={generate}
              disabled={generating || !brandName.trim()}
              className="px-6 py-3 bg-[#1B1B1B] text-white text-sm font-semibold rounded-lg hover:bg-[#2D2D2D] disabled:opacity-40 transition-colors"
            >
              {generating ? "Generating..." : "Generate Deck"}
            </button>

            {deckUrl && (
              <div className="flex items-center gap-3 flex-1 bg-[#F8F8F8] border border-[#E5E5EA] rounded-lg px-4 py-2.5">
                <a href={deckUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate flex-1">
                  {deckUrl}
                </a>
                <button
                  onClick={() => { navigator.clipboard.writeText(deckUrl); }}
                  className="shrink-0 p-1.5 text-[#999] hover:text-[#1B1B1B] transition-colors"
                  title="Copy link"
                >
                  <ClipboardDocumentIcon className="size-4" />
                </button>
                <a href={deckUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 p-1.5 text-[#999] hover:text-[#1B1B1B] transition-colors" title="Open">
                  <ArrowTopRightOnSquareIcon className="size-4" />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
