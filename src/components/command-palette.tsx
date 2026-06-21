"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";

export interface CommandItem {
  label: string;
  href: string;
  group: string;
  icon?: React.ReactNode;
  keywords?: string[];
  shelved?: boolean;
  shortcut?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  items: CommandItem[];
}

/* Fuzzy scorer: returns 0 if no match, higher = better.
 * Rewards: prefix match on label, contiguous run, earlier position. */
function score(item: CommandItem, q: string): number {
  if (!q) return 1;
  const query = q.toLowerCase();
  const haystacks = [item.label, ...(item.keywords ?? [])].map((s) =>
    s.toLowerCase(),
  );

  let best = 0;
  for (const hay of haystacks) {
    if (hay === query) best = Math.max(best, 1000);
    else if (hay.startsWith(query)) best = Math.max(best, 500 - hay.length);
    else if (hay.includes(query)) best = Math.max(best, 200 - hay.indexOf(query));
    else {
      // Subsequence match (letters appear in order)
      let qi = 0;
      let runs = 0;
      let inRun = false;
      for (let i = 0; i < hay.length && qi < query.length; i++) {
        if (hay[i] === query[qi]) {
          qi++;
          if (!inRun) {
            runs++;
            inRun = true;
          }
        } else {
          inRun = false;
        }
      }
      if (qi === query.length) {
        best = Math.max(best, 50 - runs * 5);
      }
    }
  }
  return best;
}

export function CommandPalette({ open, onClose, items }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const scored = items
      .map((item) => ({ item, s: score(item, query) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s);
    return scored.map((r) => r.item);
  }, [items, query]);

  // Group results by their group field, preserving sort order
  const grouped = useMemo(() => {
    const groups: { name: string; items: CommandItem[] }[] = [];
    const indexByName = new Map<string, number>();
    for (const item of filtered) {
      const name = item.shelved ? "Shelved" : item.group;
      let idx = indexByName.get(name);
      if (idx === undefined) {
        idx = groups.length;
        indexByName.set(name, idx);
        groups.push({ name, items: [] });
      }
      groups[idx].items.push(item);
    }
    return groups;
  }, [filtered]);

  // Reset state when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      // Focus the input on next tick so the modal animates in cleanly
      const id = setTimeout(() => inputRef.current?.focus(), 10);
      return () => clearTimeout(id);
    }
  }, [open]);

  // Clamp active index when results change
  useEffect(() => {
    if (activeIdx >= filtered.length) setActiveIdx(Math.max(0, filtered.length - 1));
  }, [filtered.length, activeIdx]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = filtered[activeIdx];
      if (target) {
        router.push(target.href);
        onClose();
      }
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] px-4"
      onKeyDown={onKeyDown}
    >
      <div
        className="absolute inset-0 bg-[#1B1B1B]/30 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative w-full max-w-[640px] bg-[#181818] rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 h-12 border-b border-[#2A2A2A]">
          <MagnifyingGlassIcon className="size-4 text-[#71757D]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIdx(0);
            }}
            placeholder="Jump to..."
            className="flex-1 bg-transparent outline-none text-[14px] text-[#E5E5EA] placeholder:text-[#71757D]"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-[#222222] transition-colors"
            aria-label="Close"
          >
            <XMarkIcon className="size-4 text-[#71757D]" />
          </button>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          className="max-h-[55vh] overflow-y-auto scrollbar-thin py-2"
        >
          {grouped.length === 0 ? (
            <div className="px-4 py-10 text-center text-[13px] text-[#71757D]">
              No matches for &ldquo;{query}&rdquo;
            </div>
          ) : (
            grouped.map((g) => (
              <div key={g.name} className="mb-1">
                <div className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">
                  {g.name}
                </div>
                {g.items.map((item) => {
                  const idx = filtered.indexOf(item);
                  const active = idx === activeIdx;
                  return (
                    <button
                      key={`${item.group}-${item.href}`}
                      data-idx={idx}
                      onMouseEnter={() => setActiveIdx(idx)}
                      onClick={() => {
                        router.push(item.href);
                        onClose();
                      }}
                      className={`w-full flex items-center gap-2.5 px-4 py-2 text-left text-[13px] transition-colors ${
                        active
                          ? "bg-[#222222] text-[#E5E5EA]"
                          : "text-[#3A3A3A] hover:bg-[#0C0C0C]"
                      }`}
                    >
                      {item.icon && (
                        <span className="text-[#71757D] shrink-0">{item.icon}</span>
                      )}
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.shelved && (
                        <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#222222] text-[#71757D]">
                          Shelved
                        </span>
                      )}
                      {item.shortcut && !item.shelved && (
                        <span className="text-[10px] text-[#71757D] font-mono">
                          {item.shortcut}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center justify-between px-4 h-9 border-t border-[#2A2A2A] bg-[#0C0C0C] text-[11px] text-[#71757D]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-[#181818] border border-[#2A2A2A] font-mono text-[10px]">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-[#181818] border border-[#2A2A2A] font-mono text-[10px]">↵</kbd>
              Open
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-[#181818] border border-[#2A2A2A] font-mono text-[10px]">esc</kbd>
              Close
            </span>
          </div>
          <span>{filtered.length} {filtered.length === 1 ? "result" : "results"}</span>
        </div>
      </div>
    </div>
  );
}
