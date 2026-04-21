"use client";

import { useEffect, useState } from "react";
import { DecorativeBlocks } from "@/components/decorative-blocks";
import { DEV_HANDOFF_ITEMS } from "@/lib/portal/qa-gates";

const STORAGE_KEY = "team-qa-checklist-state";

// Grouped view — splits the flat list into labelled sections by scanning for
// the comment prefixes baked into DEV_HANDOFF_ITEMS. Keeps the source of truth
// in qa-gates.ts untouched.
const SECTIONS: { label: string; start: number; count: number }[] = [
  { label: "Visual", start: 0, count: 4 },
  { label: "Scrolling & Navigation", start: 4, count: 4 },
  { label: "Interactions", start: 8, count: 5 },
  { label: "Buying Flow", start: 13, count: 3 },
  { label: "Edge Cases", start: 16, count: 2 },
  { label: "Client Editability", start: 18, count: 3 },
  { label: "Agency Prefix", start: 21, count: 3 },
  { label: "Snippet & Asset Naming", start: 24, count: 3 },
  { label: "File Template", start: 27, count: 4 },
  { label: "File Length", start: 31, count: 3 },
  { label: "Setting Labels & Info", start: 34, count: 4 },
];

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

  const totalDone = Object.values(checked).filter(Boolean).length;
  const total = DEV_HANDOFF_ITEMS.length;

  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-12 py-12 md:py-20">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">
              Dev QA Checklist
            </h1>
            <p className="text-sm text-[#7A7A7A]">
              Evergreen reference — run through before handing anything to the client. Progress saves to this browser.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-medium text-[#7A7A7A]">
              {totalDone} / {total}
            </span>
            <button
              onClick={reset}
              className="text-xs font-medium text-[#A0A0A0] hover:text-[#1B1B1B] transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {SECTIONS.map((section) => (
            <div key={section.label}>
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#7A7A7A] mb-2">
                {section.label}
              </h2>
              <div className="border border-[#E5E5EA] rounded-lg bg-white divide-y divide-[#F0F0F0]">
                {DEV_HANDOFF_ITEMS.slice(section.start, section.start + section.count).map((item, offset) => {
                  const idx = section.start + offset;
                  const isChecked = !!checked[idx];
                  return (
                    <label
                      key={idx}
                      className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-[#FAFAFA] transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggle(idx)}
                        className="mt-0.5 size-4 accent-[#1B1B1B] cursor-pointer shrink-0"
                      />
                      <span className={`text-sm leading-relaxed ${isChecked ? "text-[#AAA] line-through" : "text-[#1A1A1A]"}`}>
                        {item}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
