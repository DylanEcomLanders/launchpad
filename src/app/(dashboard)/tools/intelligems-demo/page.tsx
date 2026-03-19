"use client";

import { useState, useEffect } from "react";

interface VariationMetrics {
  variation_id: string;
  name: string;
  conversion_rate: number;
  aov: number;
  rpv: number;
  atc_rate: number;
  visitors: number;
  orders: number;
  revenue: number;
}

interface TestData {
  id: string;
  name: string;
  status: string;
  startedAt: string;
  variations: VariationMetrics[];
}

const API_KEY = "ig_live_9a1b2bbfcbaf47fb9802b92ec2819cb153b3e3c4";
const BASE = "https://api.intelligems.io/v25-10-beta";

function calcLift(a: number, b: number): { value: string; positive: boolean } | null {
  if (a === 0 && b === 0) return null;
  if (a === 0) return { value: "+∞", positive: true };
  const pct = ((b - a) / a) * 100;
  return { value: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`, positive: pct >= 0 };
}

export default function IntelligemsDemoPage() {
  const [tests, setTests] = useState<TestData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // 1. Get all experiences
        const listRes = await fetch(`${BASE}/experiences-list`, {
          headers: { "intelligems-access-token": API_KEY },
        });
        const listData = await listRes.json();
        const experiences = listData.experiencesList || [];

        // 2. For each experience, get analytics
        const results: TestData[] = [];
        for (const exp of experiences.slice(0, 10)) {
          const analyticsRes = await fetch(`${BASE}/analytics/resource/${exp.id}`, {
            headers: { "intelligems-access-token": API_KEY },
          });
          const analyticsData = await analyticsRes.json();
          const metrics = analyticsData.metrics || [];

          // Map variation IDs to names
          const varNames: Record<string, string> = {};
          for (const v of exp.variations || []) {
            varNames[v.id] = v.name || "Unknown";
          }

          const variations: VariationMetrics[] = metrics.map((m: Record<string, unknown>) => ({
            variation_id: m.variation_id as string,
            name: varNames[m.variation_id as string] || (m.variation_id as string).slice(0, 8),
            conversion_rate: (m.conversion_rate as { value: number })?.value || 0,
            aov: (m.net_revenue_per_order as { value: number })?.value || 0,
            rpv: (m.net_revenue_per_visitor as { value: number })?.value || 0,
            atc_rate: (m.add_to_cart_rate as { value: number })?.value || 0,
            visitors: (m.n_visitors as { value: number })?.value || 0,
            orders: (m.n_orders as { value: number })?.value || 0,
            revenue: (m.net_revenue as { value: number })?.value || 0,
          }));

          const startedAt = exp.startedAtTs
            ? new Date(exp.startedAtTs).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
            : "—";

          results.push({
            id: exp.id,
            name: exp.name,
            status: exp.status,
            startedAt,
            variations,
          });
        }

        setTests(results);
      } catch (e) {
        console.error("Intelligems fetch error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const statusColor = (s: string) => {
    if (s === "started") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (s === "paused") return "bg-amber-50 text-amber-700 border-amber-200";
    if (s === "ended") return "bg-[#F0F0F0] text-[#777] border-[#E8E8E8]";
    return "bg-[#F0F0F0] text-[#999] border-[#E8E8E8]";
  };

  const statusLabel = (s: string) => {
    if (s === "started") return "Live";
    if (s === "paused") return "Paused";
    if (s === "ended") return "Complete";
    return s;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-10 px-4">
        <h1 className="text-2xl font-bold mb-2">Intelligems Integration Preview</h1>
        <p className="text-sm text-[#999] mb-8">Pulling live A/B test data...</p>
        <div className="flex items-center gap-3">
          <div className="size-4 border-2 border-[#1A1A1A] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[#777]">Fetching from Intelligems API...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Intelligems Integration Preview</h1>
        <p className="text-sm text-[#7A7A7A] mt-1">
          Live A/B test data pulled automatically from the Intelligems API
        </p>
      </div>

      <div className="space-y-4">
        {tests.map((test) => {
          const control = test.variations.find((v) => v.name === "Control") || test.variations[0];
          const challengers = test.variations.filter((v) => v !== control);

          return (
            <div key={test.id} className="border border-[#E8E8E8] rounded-xl bg-white overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F0F0F0]">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-[#1A1A1A]">{test.name}</h3>
                  <span className="text-[10px] text-[#AAA]">Started {test.startedAt}</span>
                </div>
                <span className={`px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full border ${statusColor(test.status)}`}>
                  {statusLabel(test.status)}
                </span>
              </div>

              {/* Metrics Grid */}
              <div className="px-5 py-4">
                {/* Column Headers */}
                <div className="grid grid-cols-[1fr_repeat(3,_minmax(0,1fr))_80px] gap-3 mb-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA]">Variation</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] text-right">CVR</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] text-right">AOV</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] text-right">RPV</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] text-right">Lift</span>
                </div>

                {/* Control Row */}
                {control && (
                  <div className="grid grid-cols-[1fr_repeat(3,_minmax(0,1fr))_80px] gap-3 py-2 border-b border-[#F5F5F5]">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center size-5 rounded bg-[#F0F0F0] text-[10px] font-bold text-[#777]">A</span>
                      <span className="text-xs font-medium text-[#1A1A1A] truncate">{control.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-[#1A1A1A] text-right">{(control.conversion_rate * 100).toFixed(1)}%</span>
                    <span className="text-xs font-semibold text-[#1A1A1A] text-right">${control.aov.toFixed(2)}</span>
                    <span className="text-xs font-semibold text-[#1A1A1A] text-right">${control.rpv.toFixed(2)}</span>
                    <span className="text-[10px] text-[#AAA] text-right">baseline</span>
                  </div>
                )}

                {/* Challenger Rows */}
                {challengers.map((v, i) => {
                  const cvrLift = control ? calcLift(control.conversion_rate, v.conversion_rate) : null;
                  const aovLift = control ? calcLift(control.aov, v.aov) : null;
                  const rpvLift = control ? calcLift(control.rpv, v.rpv) : null;
                  // Pick the "main" lift (RPV is most important)
                  const mainLift = rpvLift || cvrLift;

                  return (
                    <div key={v.variation_id} className="grid grid-cols-[1fr_repeat(3,_minmax(0,1fr))_80px] gap-3 py-2 border-b border-[#F5F5F5] last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center size-5 rounded bg-[#1A1A1A] text-[10px] font-bold text-white">
                          {String.fromCharCode(66 + i)}
                        </span>
                        <span className="text-xs font-medium text-[#1A1A1A] truncate">{v.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold text-[#1A1A1A]">{(v.conversion_rate * 100).toFixed(1)}%</span>
                        {cvrLift && (
                          <span className={`ml-1 text-[10px] font-medium ${cvrLift.positive ? "text-emerald-600" : "text-red-500"}`}>
                            {cvrLift.value}
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold text-[#1A1A1A]">${v.aov.toFixed(2)}</span>
                        {aovLift && (
                          <span className={`ml-1 text-[10px] font-medium ${aovLift.positive ? "text-emerald-600" : "text-red-500"}`}>
                            {aovLift.value}
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold text-[#1A1A1A]">${v.rpv.toFixed(2)}</span>
                        {rpvLift && (
                          <span className={`ml-1 text-[10px] font-medium ${rpvLift.positive ? "text-emerald-600" : "text-red-500"}`}>
                            {rpvLift.value}
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        {mainLift && (
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${mainLift.positive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                            {mainLift.value}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer Stats */}
              <div className="flex items-center gap-4 px-5 py-2.5 bg-[#FAFAFA] border-t border-[#F0F0F0]">
                {test.variations.map((v) => (
                  <div key={v.variation_id} className="flex items-center gap-3 text-[10px] text-[#999]">
                    <span className="font-medium text-[#777]">{v.name}:</span>
                    <span>{v.visitors} visitors</span>
                    <span>·</span>
                    <span>{v.orders} orders</span>
                    <span>·</span>
                    <span>${v.revenue.toFixed(0)} rev</span>
                    <span>·</span>
                    <span>{(v.atc_rate * 100).toFixed(0)}% ATC</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
