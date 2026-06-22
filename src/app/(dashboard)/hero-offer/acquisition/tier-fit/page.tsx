"use client";

/* Tier-fit calculator - input monthly revenue + ambition, output the
 * recommended tier + value math. Used during the qualification call. */

import { useMemo, useState } from "react";
import { CalculatorIcon } from "@heroicons/react/24/outline";
import { ToolShell } from "@/lib/hero-offer/tool-shell";
import { inputClass, labelClass } from "@/lib/form-styles";

type Tier = "Entry" | "Core" | "VIP" | "Below threshold";

interface TierMeta {
  name: Tier;
  monthly: number | null;
  blurb: string;
}

function tierFor(monthlyRevenue: number, ambition: "stable" | "growing" | "aggressive"): TierMeta {
  if (monthlyRevenue < 200_000) return { name: "Below threshold", monthly: null, blurb: "Revenue too low to make the engine economic. Recommend a one-off audit or politely pass." };
  if (monthlyRevenue < 400_000) {
    if (ambition === "aggressive") return { name: "Core", monthly: 10_000, blurb: "Revenue says Entry, but ambition's high - Core's the better fit. Push for it." };
    return { name: "Entry", monthly: 5_000, blurb: "Two pages + two tests / month. Proven cadence at this revenue band." };
  }
  if (monthlyRevenue < 800_000) {
    if (ambition === "stable") return { name: "Entry", monthly: 5_000, blurb: "Could justify Core but ambition's flat - start them on Entry, upgrade in 90 days if engagement's right." };
    return { name: "Core", monthly: 10_000, blurb: "Four pages + four tests / month. Standard cadence at mid-band revenue." };
  }
  if (ambition === "stable") return { name: "Core", monthly: 10_000, blurb: "VIP-band revenue but ambition's stable - Core's the safer landing zone." };
  return { name: "VIP", monthly: 15_000, blurb: "Six pages + twelve tests / month. Maximum velocity for top-band revenue." };
}

export default function TierFitPage() {
  const [revenue, setRevenue] = useState(400_000);
  const [ambition, setAmbition] = useState<"stable" | "growing" | "aggressive">("growing");
  const [currentCr, setCurrentCr] = useState(2);
  const [aov, setAov] = useState(80);
  const [traffic, setTraffic] = useState(150_000);

  const rec = useMemo(() => tierFor(revenue, ambition), [revenue, ambition]);

  /* Naive value math: lift CR by 30% (target) at current traffic + AOV. */
  const upliftRevenue = useMemo(() => {
    const baselineRev = traffic * (currentCr / 100) * aov;
    const targetRev = traffic * (currentCr * 1.3 / 100) * aov;
    return Math.round(targetRev - baselineRev);
  }, [traffic, currentCr, aov]);

  const annualEngineCost = (rec.monthly ?? 0) * 12;
  const annualValue = upliftRevenue * 12;
  const roi = annualEngineCost > 0 ? (annualValue / annualEngineCost) : 0;

  return (
    <ToolShell
      title="Tier-fit calculator"
      blurb="Input monthly revenue + ambition, output the recommended tier and the value math. Use during the qualification call."
      parentHref="/hero-offer/acquisition"
      parentLabel="Back to Acquisition"
      status="shell"
      accent="emerald"
      icon={<CalculatorIcon className="size-5" />}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <section className="bg-[#0F0F10] rounded-2xl ring-1 ring-white/[0.04] p-5 space-y-3">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-emerald-300 mb-2">Inputs</div>
          <div>
            <label className={labelClass}>Monthly revenue (£)</label>
            <input type="number" value={revenue} onChange={(e) => setRevenue(Number(e.target.value) || 0)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Ambition</label>
            <select value={ambition} onChange={(e) => setAmbition(e.target.value as "stable" | "growing" | "aggressive")} className={inputClass}>
              <option value="stable">Stable — protect what we&apos;ve got</option>
              <option value="growing">Growing — measured push</option>
              <option value="aggressive">Aggressive — go for it</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Current CR (%)</label>
              <input type="number" step="0.1" value={currentCr} onChange={(e) => setCurrentCr(Number(e.target.value) || 0)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>AOV (£)</label>
              <input type="number" value={aov} onChange={(e) => setAov(Number(e.target.value) || 0)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Monthly traffic</label>
            <input type="number" value={traffic} onChange={(e) => setTraffic(Number(e.target.value) || 0)} className={inputClass} />
          </div>
        </section>

        <section className="bg-gradient-to-br from-emerald-500/15 to-cyan-500/15 ring-1 ring-emerald-500/30 rounded-2xl p-5 space-y-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider font-semibold text-emerald-300 mb-1">Recommended tier</div>
            <div className="text-3xl font-semibold bg-gradient-to-br from-emerald-200 to-cyan-200 bg-clip-text text-transparent">{rec.name}</div>
            {rec.monthly && <div className="text-sm text-[#9CA3AF] mt-1">£{rec.monthly.toLocaleString()}/mo</div>}
            <p className="text-[12px] text-[#9CA3AF] mt-2 leading-relaxed">{rec.blurb}</p>
          </div>

          {rec.monthly !== null && (
            <>
              <div className="border-t border-white/[0.06] pt-3">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-emerald-300 mb-2">Value math (30% CR lift target)</div>
                <ul className="text-[13px] text-[#E5E5EA] space-y-1">
                  <li className="flex justify-between"><span className="text-[#9CA3AF]">Uplift / month</span><span className="font-mono">£{upliftRevenue.toLocaleString()}</span></li>
                  <li className="flex justify-between"><span className="text-[#9CA3AF]">Annual value</span><span className="font-mono">£{annualValue.toLocaleString()}</span></li>
                  <li className="flex justify-between"><span className="text-[#9CA3AF]">Engine cost / yr</span><span className="font-mono">£{annualEngineCost.toLocaleString()}</span></li>
                  <li className="flex justify-between border-t border-white/[0.06] pt-1 mt-1"><span className="text-emerald-200 font-semibold">ROI multiple</span><span className="font-mono text-emerald-200 font-semibold">{roi.toFixed(1)}×</span></li>
                </ul>
              </div>
              <p className="text-[11px] text-[#71757D] italic">
                Rough. Doesn&apos;t model AOV lift, retention, or compounding. Use as the floor of the value conversation, not the ceiling.
              </p>
            </>
          )}
        </section>
      </div>
    </ToolShell>
  );
}
