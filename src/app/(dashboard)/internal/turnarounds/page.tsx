"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowPathIcon, CheckIcon } from "@heroicons/react/24/outline";
import { DecorativeBlocks } from "@/components/decorative-blocks";
import { inputClass, labelClass } from "@/lib/form-styles";
import {
  DEFAULT_TURNAROUND_CONFIG,
  type TurnaroundCategory,
  type TurnaroundConfig,
  type TurnaroundDeliverable,
  getBufferDays,
  getClientQuotedDays,
  loadTurnaroundConfig,
  saveTurnaroundConfig,
} from "@/lib/turnarounds";

const CATEGORIES: TurnaroundCategory[] = ["Builds", "Audits", "Phases", "Revisions"];

function pluralDays(n: number): string {
  return `${n} ${n === 1 ? "day" : "days"}`;
}

export default function TurnaroundsPage() {
  const [config, setConfig] = useState<TurnaroundConfig>(DEFAULT_TURNAROUND_CONFIG);
  const [hydrated, setHydrated] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    setConfig(loadTurnaroundConfig());
    setHydrated(true);
  }, []);

  const updateBuffer = (next: number) => {
    const clamped = Math.max(0, Math.min(200, Number.isFinite(next) ? next : 0));
    setConfig((c) => ({ ...c, bufferPercent: clamped }));
  };

  const updateDeliverable = (id: string, patch: Partial<TurnaroundDeliverable>) => {
    setConfig((c) => ({
      ...c,
      deliverables: c.deliverables.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    }));
  };

  const handleSave = () => {
    saveTurnaroundConfig(config);
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 1800);
  };

  const handleReset = () => {
    if (!confirm("Reset all turnarounds to defaults? Local edits will be lost.")) return;
    setConfig(DEFAULT_TURNAROUND_CONFIG);
    saveTurnaroundConfig(DEFAULT_TURNAROUND_CONFIG);
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 1800);
  };

  const groups = useMemo(() => {
    return CATEGORIES.map((cat) => ({
      cat,
      items: config.deliverables.filter((d) => d.category === cat),
    })).filter((g) => g.items.length > 0);
  }, [config.deliverables]);

  if (!hydrated) {
    return (
      <div className="relative min-h-screen">
        <DecorativeBlocks />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-12 py-16 md:py-24">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-subtle mb-2">
            Internal reference
          </p>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Turnaround Times
          </h1>
          <p className="text-subtle max-w-2xl">
            Source of truth for every deliverable we sell. Internal targets are what the team
            works to. Client-quoted dates are internal target + buffer — never share the internal
            number with a client.
          </p>
        </div>

        {/* Commitment banner */}
        <div className="mb-10 p-5 border border-border bg-surface rounded-xl text-white">
          <p className="text-sm leading-relaxed">
            <span className="font-semibold">These are commitments.</span>{" "}
            If we can&apos;t hit the internal target, flag in{" "}
            <code className="bg-surface/10 px-1.5 py-0.5 rounded text-[12px]">#ops</code>{" "}
            <span className="font-semibold">before</span> the client-quoted date — never on the day.
          </p>
        </div>

        {/* Buffer config */}
        <div className="mb-8 p-5 bg-surface-raised border border-border rounded-lg">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="flex-1 max-w-xs">
              <label className={labelClass}>Buffer (%)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={200}
                  step={5}
                  value={config.bufferPercent}
                  onChange={(e) => updateBuffer(parseFloat(e.target.value))}
                  className={inputClass}
                />
                <span className="text-sm text-subtle tabular-nums">%</span>
              </div>
              <p className="text-[11px] text-subtle mt-1.5 leading-snug">
                Added on top of internal target, rounded up to the nearest business day. Default 30%.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-subtle hover:text-foreground border border-border rounded-md hover:bg-surface transition-colors"
              >
                <ArrowPathIcon className="size-3.5" />
                Reset to defaults
              </button>
              <button
                onClick={handleSave}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-surface bg-foreground rounded-md hover:bg-white transition-colors"
              >
                {savedAt ? (
                  <>
                    <CheckIcon className="size-3.5" />
                    Saved
                  </>
                ) : (
                  "Save"
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Tables by category */}
        <div className="space-y-8">
          {groups.map(({ cat, items }) => (
            <div key={cat}>
              <label className={labelClass}>{cat}</label>
              <div className="bg-surface border border-border rounded-lg overflow-hidden shadow-[var(--shadow-soft)]">
                {/* Desktop header */}
                <div className="hidden md:grid md:grid-cols-[2fr_120px_120px_140px_2fr] gap-3 px-5 py-2.5 border-b border-border bg-background">
                  <span className="text-xs font-semibold uppercase tracking-wider text-subtle">
                    Deliverable
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-subtle text-right">
                    Internal target
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-subtle text-right">
                    Buffer
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-foreground text-right">
                    Client-quoted
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-subtle">
                    Notes
                  </span>
                </div>

                <div className="divide-y divide-border">
                  {items.map((d) => {
                    const buffer = getBufferDays(d.internalDays, config.bufferPercent);
                    const client = getClientQuotedDays(d.internalDays, config.bufferPercent);
                    return (
                      <div key={d.id} className="px-5 py-3">
                        {/* Desktop row */}
                        <div className="hidden md:grid md:grid-cols-[2fr_120px_120px_140px_2fr] gap-3 items-center">
                          <span className="text-sm font-medium text-foreground">{d.name}</span>
                          <div className="flex items-center justify-end gap-1.5">
                            <input
                              type="number"
                              min={0}
                              step={1}
                              value={d.internalDays}
                              onChange={(e) =>
                                updateDeliverable(d.id, {
                                  internalDays: Math.max(0, parseInt(e.target.value, 10) || 0),
                                })
                              }
                              className="w-16 px-2 py-1 bg-surface border border-border rounded text-sm text-right tabular-nums focus:outline-none focus:border-white focus:ring-1 focus:ring-surface/10"
                            />
                            <span className="text-xs text-subtle w-9">
                              {d.internalDays === 1 ? "day" : "days"}
                            </span>
                          </div>
                          <span className="text-sm tabular-nums text-right text-subtle">
                            +{pluralDays(buffer)}
                          </span>
                          <span className="text-sm font-semibold tabular-nums text-right text-foreground">
                            {pluralDays(client)}
                          </span>
                          <input
                            type="text"
                            value={d.notes ?? ""}
                            onChange={(e) => updateDeliverable(d.id, { notes: e.target.value })}
                            placeholder="Caveats / preconditions"
                            className="w-full px-2 py-1 bg-transparent border border-transparent hover:border-border focus:border-white focus:bg-surface rounded text-xs text-subtle focus:text-foreground focus:outline-none focus:ring-1 focus:ring-surface/10 transition-colors"
                          />
                        </div>

                        {/* Mobile row */}
                        <div className="md:hidden">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-foreground">{d.name}</span>
                            <span className="text-sm font-semibold tabular-nums text-foreground">
                              {pluralDays(client)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[11px] text-subtle uppercase tracking-wider">
                              Internal
                            </span>
                            <input
                              type="number"
                              min={0}
                              step={1}
                              value={d.internalDays}
                              onChange={(e) =>
                                updateDeliverable(d.id, {
                                  internalDays: Math.max(0, parseInt(e.target.value, 10) || 0),
                                })
                              }
                              className="w-14 px-2 py-1 bg-surface border border-border rounded text-sm text-right tabular-nums"
                            />
                            <span className="text-xs text-subtle">
                              + {pluralDays(buffer)} buffer
                            </span>
                          </div>
                          <input
                            type="text"
                            value={d.notes ?? ""}
                            onChange={(e) => updateDeliverable(d.id, { notes: e.target.value })}
                            placeholder="Caveats / preconditions"
                            className="w-full px-2 py-1.5 bg-background border border-border rounded text-xs text-subtle focus:text-foreground focus:bg-surface focus:outline-none focus:border-white"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-10 p-4 bg-background border border-border rounded-lg">
          <p className="text-xs text-subtle leading-relaxed">
            Pulled by the price calculator, offers page, and proposal generator via{" "}
            <code className="text-foreground bg-surface border border-border px-1.5 py-0.5 rounded text-[11px]">
              getClientQuotedDays
            </code>{" "}
            in <code className="text-foreground bg-surface border border-border px-1.5 py-0.5 rounded text-[11px]">src/lib/turnarounds.ts</code>.
            Internal targets stay internal.
          </p>
        </div>
      </div>
    </div>
  );
}
