"use client";

import { useState } from "react";
import {
  ChevronDownIcon,
  ClipboardDocumentIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";

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

export function DeckBuilderInline() {
  const [open, setOpen] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [brandUrl, setBrandUrl] = useState("");
  const [traffic, setTraffic] = useState("");
  const [cvr, setCvr] = useState("");
  const [benchmarkCvr, setBenchmarkCvr] = useState("3.2");
  const [aov, setAov] = useState("");
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(SCORE_KEYS.map((k) => [k.key, 5]))
  );
  const [priorities, setPriorities] = useState(["", "", ""]);
  const [retainerPrice, setRetainerPrice] = useState("9000");
  const [anchorPrice, setAnchorPrice] = useState("14000");
  const [generating, setGenerating] = useState(false);
  const [deckUrl, setDeckUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function updateScore(key: string, val: number) {
    setScores((prev) => ({ ...prev, [key]: Math.max(1, Math.min(10, val)) }));
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
          priorities: priorities.filter((p) => p.trim()),
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

  const gap =
    Number(traffic) *
    (Number(benchmarkCvr) / 100 - Number(cvr) / 100) *
    Number(aov);

  const inputClass =
    "w-full px-3 py-1.5 text-xs border border-[#E5E5EA] rounded-lg focus:outline-none focus:border-[#1B1B1B] bg-white";
  const labelClass = "block text-[10px] text-[#999] uppercase tracking-wider mb-1";

  return (
    <div className="border border-[#E5E5EA] rounded-xl mb-6 overflow-hidden">
      {/* Accordion header */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 w-full px-5 py-3.5 text-left hover:bg-[#FAFAFA] transition-colors"
      >
        <div className="size-8 rounded-lg bg-[#1B1B1B] flex items-center justify-center shrink-0">
          <svg className="size-4 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#1B1B1B]">Generate Deck</p>
          <p className="text-[10px] text-[#999]">Fill in the inputs below and generate a shareable link</p>
        </div>
        <ChevronDownIcon
          className={`size-4 text-[#999] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Accordion body */}
      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-[#F0F0F0] space-y-4">
          {/* Brand row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Brand Name</label>
              <input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g. Surreal"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>URL</label>
              <input
                value={brandUrl}
                onChange={(e) => setBrandUrl(e.target.value)}
                placeholder="https://eatsurreal.com"
                className={inputClass}
              />
            </div>
          </div>

          {/* Numbers row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className={labelClass}>Monthly Traffic</label>
              <input
                type="number"
                value={traffic}
                onChange={(e) => setTraffic(e.target.value)}
                placeholder="150000"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Current CVR (%)</label>
              <input
                type="number"
                step="0.1"
                value={cvr}
                onChange={(e) => setCvr(e.target.value)}
                placeholder="1.8"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Benchmark CVR (%)</label>
              <input
                type="number"
                step="0.1"
                value={benchmarkCvr}
                onChange={(e) => setBenchmarkCvr(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>AOV (£)</label>
              <input
                type="number"
                value={aov}
                onChange={(e) => setAov(e.target.value)}
                placeholder="55"
                className={inputClass}
              />
            </div>
          </div>

          {/* Revenue gap preview */}
          {traffic && cvr && aov && gap > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5">
              <p className="text-xs text-emerald-700">
                Revenue gap:{" "}
                <span className="font-bold">
                  £{gap.toLocaleString("en-GB", { maximumFractionDigits: 0 })}/mo
                </span>{" "}
                (£{(gap * 12).toLocaleString("en-GB", { maximumFractionDigits: 0 })}/year)
              </p>
            </div>
          )}

          {/* Scores */}
          <div>
            <p className={`${labelClass} mb-2`}>Conversion Matrix Scores</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2">
              {SCORE_KEYS.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <label className="text-[10px] text-[#999] w-20 shrink-0 truncate">{label}</label>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={scores[key]}
                    onChange={(e) => updateScore(key, Number(e.target.value))}
                    className="flex-1 accent-[#1B1B1B] h-1"
                  />
                  <span
                    className={`text-xs font-bold w-4 text-right ${
                      scores[key] >= 7
                        ? "text-emerald-600"
                        : scores[key] >= 5
                        ? "text-amber-500"
                        : "text-red-500"
                    }`}
                  >
                    {scores[key]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Priorities */}
          <div>
            <p className={`${labelClass} mb-2`}>Top 3 Priorities (90-day roadmap)</p>
            <div className="space-y-2">
              {priorities.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="size-5 rounded-full bg-[#F0F0F0] flex items-center justify-center text-[10px] font-bold text-[#999] shrink-0">
                    {i + 1}
                  </span>
                  <input
                    value={p}
                    onChange={(e) => {
                      const next = [...priorities];
                      next[i] = e.target.value;
                      setPriorities(next);
                    }}
                    placeholder={`Priority ${i + 1}...`}
                    className={inputClass}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Core Retainer (£/mo)</label>
              <input
                type="number"
                value={retainerPrice}
                onChange={(e) => setRetainerPrice(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Anchor / Pro (£/mo)</label>
              <input
                type="number"
                value={anchorPrice}
                onChange={(e) => setAnchorPrice(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Generate button + result */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={generate}
              disabled={generating || !brandName.trim()}
              className="px-5 py-2 bg-[#1B1B1B] text-white text-xs font-semibold rounded-lg hover:bg-[#2D2D2D] disabled:opacity-40 transition-colors"
            >
              {generating ? "Generating..." : "Generate Deck"}
            </button>

            {deckUrl && (
              <div className="flex items-center gap-2 flex-1 bg-[#F8F8F8] border border-[#E5E5EA] rounded-lg px-3 py-2">
                <a
                  href={deckUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline truncate flex-1"
                >
                  {deckUrl}
                </a>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(deckUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="shrink-0 p-1 text-[#999] hover:text-[#1B1B1B] transition-colors"
                  title="Copy link"
                >
                  {copied ? (
                    <span className="text-[10px] text-emerald-600 font-medium">Copied</span>
                  ) : (
                    <ClipboardDocumentIcon className="size-3.5" />
                  )}
                </button>
                <a
                  href={deckUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 p-1 text-[#999] hover:text-[#1B1B1B] transition-colors"
                  title="Open"
                >
                  <ArrowTopRightOnSquareIcon className="size-3.5" />
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
