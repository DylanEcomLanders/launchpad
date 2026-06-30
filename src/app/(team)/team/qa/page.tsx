"use client";

import { useEffect, useMemo, useState } from "react";
import { DecorativeBlocks } from "@/components/decorative-blocks";
import { DEV_HANDOFF_ITEMS, DEV_HANDOFF_CATEGORIES } from "@/lib/portal/qa-gates";

const STORAGE_KEY = "team-qa-checklist-state";

export default function TeamQAPage() {
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      if (raw) setChecked(JSON.parse(raw));
    } catch { /* ignore */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(checked));
    } catch { /* ignore */ }
  }, [checked, ready]);

  const toggle = (i: number) => setChecked((c) => ({ ...c, [i]: !c[i] }));
  const reset = () => setChecked({});

  const totalDone = useMemo(() => Object.values(checked).filter(Boolean).length, [checked]);
  const total = DEV_HANDOFF_ITEMS.length;

  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-12 py-12 md:py-20">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1">
              Dev QA Checklist
            </h1>
            <p className="text-sm text-subtle">
              Evergreen reference — run through before handing anything to a client. Progress saves to this browser.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-medium text-subtle">
              {totalDone} / {total}
            </span>
            <button
              onClick={reset}
              className="text-xs font-medium text-subtle hover:text-foreground transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {DEV_HANDOFF_CATEGORIES.map((section) => {
            const sectionDone = Array.from({ length: section.count }).filter(
              (_, i) => !!checked[section.startIndex + i]
            ).length;
            return (
              <div key={section.label}>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-[11px] font-semibold uppercase tracking-wider text-subtle">
                    {section.label}
                  </h2>
                  <span className="text-[10px] text-muted tabular-nums">
                    {sectionDone}/{section.count}
                  </span>
                </div>
                <div className="border border-border rounded-lg bg-surface divide-y divide-border">
                  {DEV_HANDOFF_ITEMS.slice(section.startIndex, section.startIndex + section.count).map((item, offset) => {
                    const idx = section.startIndex + offset;
                    const isChecked = !!checked[idx];
                    return (
                      <label
                        key={idx}
                        className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-background transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggle(idx)}
                          className="mt-0.5 size-4 accent-surface cursor-pointer shrink-0"
                        />
                        <span className={`text-sm leading-relaxed ${isChecked ? "text-muted line-through" : "text-foreground"}`}>
                          {item}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
