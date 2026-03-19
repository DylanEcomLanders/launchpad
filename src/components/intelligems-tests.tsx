"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircleIcon } from "@heroicons/react/24/solid";

/* ── Types ── */

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

export interface IntelligemsTest {
  id: string;
  name: string;
  status: string;
  startedAt: string;
  variations: VariationMetrics[];
}

/* ── Helpers ── */

function calcLift(a: number, b: number): { value: string; positive: boolean } | null {
  if (a === 0 && b === 0) return null;
  if (a === 0) return { value: "+∞", positive: true };
  const pct = ((b - a) / a) * 100;
  return { value: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`, positive: pct >= 0 };
}

function statusColor(s: string) {
  if (s === "started") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s === "paused") return "bg-amber-50 text-amber-700 border-amber-200";
  if (s === "ended") return "bg-[#F0F0F0] text-[#777] border-[#E8E8E8]";
  return "bg-[#F0F0F0] text-[#999] border-[#E8E8E8]";
}

function statusLabel(s: string) {
  if (s === "started") return "Live";
  if (s === "paused") return "Paused";
  if (s === "ended") return "Complete";
  return s;
}

/* ── Hook ── */

export function useIntelligemsTests(apiKey: string | undefined) {
  const [tests, setTests] = useState<IntelligemsTest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTests = useCallback(async () => {
    if (!apiKey) return;
    setLoading(true);
    setError(null);

    try {
      const listRes = await fetch(`/api/intelligems?key=${encodeURIComponent(apiKey)}`);
      if (!listRes.ok) throw new Error("Failed to fetch tests");
      const listData = await listRes.json();
      const experiences = listData.experiencesList || [];

      // Fetch all test details in parallel (batches of 3 with delays to avoid 429s)
      const results: IntelligemsTest[] = [];
      const batchSize = 3;
      for (let i = 0; i < experiences.length; i += batchSize) {
        if (i > 0) await new Promise((r) => setTimeout(r, 500)); // 500ms between batches
        const batch = experiences.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(
          batch.map(async (exp: Record<string, unknown>) => {
            let detailRes = await fetch(
              `/api/intelligems?key=${encodeURIComponent(apiKey)}&id=${exp.id}`
            );
            // Retry once on 429
            if (detailRes.status === 429) {
              await new Promise((r) => setTimeout(r, 1000));
              detailRes = await fetch(
                `/api/intelligems?key=${encodeURIComponent(apiKey)}&id=${exp.id}`
              );
            }
            if (!detailRes.ok) return null;
            const detailData = await detailRes.json();
            const metrics = detailData.analytics?.metrics || [];

            const varNames: Record<string, string> = {};
            for (const v of (exp.variations as { id: string; name: string }[]) || []) {
              varNames[v.id] = v.name || "Unknown";
            }

            const variations: VariationMetrics[] = metrics.map(
              (m: Record<string, unknown>) => ({
                variation_id: m.variation_id as string,
                name: varNames[m.variation_id as string] || (m.variation_id as string).slice(0, 8),
                conversion_rate: (m.conversion_rate as { value: number })?.value || 0,
                aov: (m.net_revenue_per_order as { value: number })?.value || 0,
                rpv: (m.net_revenue_per_visitor as { value: number })?.value || 0,
                atc_rate: (m.add_to_cart_rate as { value: number })?.value || 0,
                visitors: (m.n_visitors as { value: number })?.value || 0,
                orders: (m.n_orders as { value: number })?.value || 0,
                revenue: (m.net_revenue as { value: number })?.value || 0,
              })
            );

            const startedAt = exp.startedAtTs
              ? new Date(exp.startedAtTs as number).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                })
              : "—";

            return {
              id: exp.id as string,
              name: exp.name as string,
              status: exp.status as string,
              startedAt,
              variations,
            };
          })
        );
        for (const r of batchResults) {
          if (r.status === "fulfilled" && r.value) results.push(r.value);
        }
      }

      setTests(results);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  return { tests, loading, error, refetch: fetchTests };
}

/* ── Test Card (shared between admin and client) ── */

function TestCard({
  test,
  compact,
  selectable,
  selected,
  onToggle,
}: {
  test: IntelligemsTest;
  compact?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: (id: string) => void;
}) {
  const control = test.variations.find((v) =>
    v.name.toLowerCase().includes("control")
  ) || test.variations[0];
  const challengers = test.variations.filter((v) => v !== control);

  return (
    <div
      className={`border rounded-xl bg-white overflow-hidden transition-all ${
        selectable
          ? selected
            ? "border-[#1A1A1A] ring-1 ring-[#1A1A1A]"
            : "border-[#E8E8E8] hover:border-[#CCC] cursor-pointer"
          : "border-[#E8E8E8]"
      }`}
      onClick={selectable && onToggle ? () => onToggle(test.id) : undefined}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#F0F0F0]">
        <div className="flex items-center gap-3">
          {selectable && (
            <div className={`size-5 rounded-full border-2 flex items-center justify-center transition-colors ${
              selected ? "bg-[#1A1A1A] border-[#1A1A1A]" : "border-[#D0D0D0]"
            }`}>
              {selected && <CheckCircleIcon className="size-4 text-white" />}
            </div>
          )}
          <h3 className={`font-semibold text-[#1A1A1A] ${compact ? "text-xs" : "text-sm"}`}>
            {test.name}
          </h3>
          <span className="text-[10px] text-[#AAA]">Started {test.startedAt}</span>
        </div>
        <span
          className={`px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full border ${statusColor(test.status)}`}
        >
          {statusLabel(test.status)}
        </span>
      </div>

      {/* Metrics Table */}
      <div className="px-5 py-3">
        {/* Column Headers */}
        <div className="grid grid-cols-[1fr_repeat(3,_minmax(0,1fr))_72px] gap-3 mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA]">Variation</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] text-right">CVR</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] text-right">AOV</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] text-right">RPV</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] text-right">Lift</span>
        </div>

        {/* Control */}
        {control && (
          <div className="grid grid-cols-[1fr_repeat(3,_minmax(0,1fr))_72px] gap-3 py-2 border-b border-[#F5F5F5]">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center size-5 rounded bg-[#F0F0F0] text-[10px] font-bold text-[#777]">A</span>
              <span className="text-xs font-medium text-[#1A1A1A] truncate">{control.name}</span>
            </div>
            <span className="text-xs font-semibold text-[#1A1A1A] text-right">{(control.conversion_rate * 100).toFixed(1)}%</span>
            <span className="text-xs font-semibold text-[#1A1A1A] text-right">${control.aov.toFixed(2)}</span>
            <span className="text-xs font-semibold text-[#1A1A1A] text-right">${control.rpv.toFixed(2)}</span>
            <span className="text-[10px] text-[#CCC] text-right italic">baseline</span>
          </div>
        )}

        {/* Challengers */}
        {challengers.map((v, i) => {
          const cvrLift = control ? calcLift(control.conversion_rate, v.conversion_rate) : null;
          const aovLift = control ? calcLift(control.aov, v.aov) : null;
          const rpvLift = control ? calcLift(control.rpv, v.rpv) : null;
          const mainLift = rpvLift || cvrLift;

          return (
            <div
              key={v.variation_id}
              className="grid grid-cols-[1fr_repeat(3,_minmax(0,1fr))_72px] gap-3 py-2 border-b border-[#F5F5F5] last:border-0"
            >
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

      {/* Footer */}
      {!compact && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-2 bg-[#FAFAFA] border-t border-[#F0F0F0]">
          {test.variations.map((v) => (
            <div key={v.variation_id} className="flex items-center gap-2 text-[10px] text-[#999]">
              <span className="font-medium text-[#777]">{v.name}:</span>
              <span>{v.visitors} visitors</span>
              <span>·</span>
              <span>{v.orders} orders</span>
              <span>·</span>
              <span>${v.revenue.toFixed(0)} rev</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Assignment type ── */

export interface IntelligemsAssignment {
  testId: string;
  week: string;
  figma_url?: string;
}

/* ── Admin Component (with assignments) ── */

export function IntelligemsTestCards({
  apiKey,
  assignments,
  onAssignmentsChange,
}: {
  apiKey: string | undefined;
  assignments: IntelligemsAssignment[];
  onAssignmentsChange: (assignments: IntelligemsAssignment[]) => void;
}) {
  const { tests, loading, error } = useIntelligemsTests(apiKey);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!apiKey) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-6">
        <div className="size-4 border-2 border-[#1A1A1A] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-[#777]">Pulling live test data from Intelligems...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-4 px-4 bg-red-50 text-red-600 text-xs rounded-lg border border-red-200">
        Failed to load Intelligems data: {error}
      </div>
    );
  }

  if (tests.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-[#AAA]">
        No tests found in Intelligems
      </div>
    );
  }

  const isAssigned = (id: string) => assignments.some((a) => a.testId === id);
  const getAssignment = (id: string) => assignments.find((a) => a.testId === id);

  const handleToggleAssign = (id: string) => {
    if (isAssigned(id)) {
      onAssignmentsChange(assignments.filter((a) => a.testId !== id));
    } else {
      // Auto-generate week label from test start date
      const test = tests.find((t) => t.id === id);
      const weekLabel = test?.startedAt || "";
      onAssignmentsChange([...assignments, { testId: id, week: weekLabel }]);
      setExpandedId(id);
    }
  };

  const handleUpdateAssignment = (id: string, field: "week" | "figma_url", value: string) => {
    onAssignmentsChange(
      assignments.map((a) => (a.testId === id ? { ...a, [field]: value } : a))
    );
  };

  const assignedCount = assignments.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-[#AAA]">
          Select tests your team is running, assign to weeks, and add Figma design links.
        </p>
        <span className="text-[10px] font-semibold text-[#777]">
          {assignedCount} assigned
        </span>
      </div>
      {tests.map((test) => {
        const assigned = isAssigned(test.id);
        const assignment = getAssignment(test.id);
        const isExpanded = expandedId === test.id && assigned;

        return (
          <div key={test.id}>
            <TestCard
              test={test}
              compact={false}
              selectable
              selected={assigned}
              onToggle={handleToggleAssign}
            />
            {/* Assignment details (expanded when assigned) */}
            {assigned && (
              <div
                className="ml-8 mr-2 -mt-1 border border-t-0 border-[#E8E8E8] rounded-b-lg bg-[#FAFAFA] px-4 py-3 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : test.id)}
              >
                {isExpanded ? (
                  <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] block mb-1">Week</label>
                        <input
                          type="text"
                          value={assignment?.week || ""}
                          onChange={(e) => handleUpdateAssignment(test.id, "week", e.target.value)}
                          placeholder="e.g. W12 — 16 Mar"
                          className="w-full text-xs px-2 py-1.5 border border-[#E5E5EA] rounded bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] block mb-1">Figma Design URL</label>
                        <input
                          type="text"
                          value={assignment?.figma_url || ""}
                          onChange={(e) => handleUpdateAssignment(test.id, "figma_url", e.target.value)}
                          placeholder="https://www.figma.com/design/..."
                          className="w-full text-xs px-2 py-1.5 border border-[#E5E5EA] rounded bg-white font-mono"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-[10px] text-[#999]">
                    <span>{assignment?.week || "No week assigned"}</span>
                    {assignment?.figma_url && <span className="text-emerald-600">Figma linked ✓</span>}
                    <span className="ml-auto text-[#CCC]">Click to edit</span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Client-Facing Component (shows assigned tests with Figma preview) ── */

export function IntelligemsClientCards({
  apiKey,
  assignments,
  selectedTests,
}: {
  apiKey: string | undefined;
  assignments?: IntelligemsAssignment[];
  selectedTests?: string[]; // Legacy support
}) {
  const { tests, loading, error } = useIntelligemsTests(apiKey);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  if (!apiKey) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-6">
        <div className="size-4 border-2 border-[#1A1A1A] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-[#777]">Loading test results...</span>
      </div>
    );
  }

  if (error) return null;

  // Use assignments if available, fall back to legacy selectedTests
  const assignedIds = assignments && assignments.length > 0
    ? assignments.map((a) => a.testId)
    : selectedTests || [];

  const visibleTests = assignedIds.length > 0
    ? tests.filter((t) => assignedIds.includes(t.id))
    : [];

  if (visibleTests.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-[#AAA]">
        Test results coming soon
      </div>
    );
  }

  // Group by week if assignments exist
  const getWeek = (testId: string) => assignments?.find((a) => a.testId === testId)?.week || "";
  const getFigma = (testId: string) => assignments?.find((a) => a.testId === testId)?.figma_url || "";

  // Convert Figma URL to embed
  const toEmbed = (url: string) => {
    if (!url) return null;
    try {
      return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`;
    } catch { return null; }
  };

  // Group tests by week
  const weekGroups: Record<string, typeof visibleTests> = {};
  for (const test of visibleTests) {
    const week = getWeek(test.id) || "Unassigned";
    if (!weekGroups[week]) weekGroups[week] = [];
    weekGroups[week].push(test);
  }

  const sortedWeeks = Object.keys(weekGroups).sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, "")) || 0;
    const numB = parseInt(b.replace(/\D/g, "")) || 0;
    return numB - numA;
  });

  return (
    <>
      <div className="space-y-6">
        {sortedWeeks.map((week) => (
          <div key={week}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-2">{week}</p>
            <div className="space-y-3">
              {weekGroups[week].map((test) => {
                const figma = getFigma(test.id);
                return (
                  <div key={test.id}>
                    <TestCard test={test} compact />
                    {figma && (
                      <div className="flex justify-end -mt-1 mr-2">
                        <button
                          onClick={() => setPreviewUrl(figma)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-[#777] hover:text-[#1A1A1A] transition-colors"
                        >
                          <svg className="size-3" viewBox="0 0 24 24" fill="none"><path d="M5 5.5A3.5 3.5 0 018.5 2H12v7H8.5A3.5 3.5 0 015 5.5z" fill="#F24E1E"/><path d="M12 2h3.5a3.5 3.5 0 010 7H12V2z" fill="#FF7262"/><path d="M12 9.5h3.5a3.5 3.5 0 010 7H12V9.5z" fill="#1ABCFE"/><path d="M5 19.5A3.5 3.5 0 018.5 16H12v3.5a3.5 3.5 0 11-7 0z" fill="#0ACF83"/><path d="M5 12.5A3.5 3.5 0 018.5 9H12v7H8.5A3.5 3.5 0 015 12.5z" fill="#A259FF"/></svg>
                          View Design
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Figma preview popup */}
      {previewUrl && toEmbed(previewUrl) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setPreviewUrl(null)}>
          <div className="relative w-full max-w-4xl mx-4 bg-white rounded-xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#E8E8E8]">
              <p className="text-sm font-semibold text-[#1A1A1A]">Design Preview</p>
              <div className="flex items-center gap-3">
                <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold text-[#777] hover:text-[#1A1A1A] transition-colors">Open in Figma</a>
                <button onClick={() => setPreviewUrl(null)} className="text-[#AAA] hover:text-[#1A1A1A] transition-colors">
                  <svg className="size-5" viewBox="0 0 20 20" fill="currentColor"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
                </button>
              </div>
            </div>
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe src={toEmbed(previewUrl) || ""} className="absolute inset-0 w-full h-full border-0" allowFullScreen />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
