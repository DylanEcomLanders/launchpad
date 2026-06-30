"use client";

// My Week — Dylan's private weekly planner. Founder-gated (admin role only,
// same "private" posture as Finance), separate from the pod/client delivery
// views. A Mon-Fri time-blocked grid you fill with your own blocks; persists
// to localStorage, keyed by absolute date so each week keeps its own plan.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useRole } from "@/components/auth-gate";

const LS_KEY = "launchpad-my-week";
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function mondayOf(d: Date): Date {
  const x = new Date(d);
  const dow = x.getDay(); // 0 Sun..6 Sat
  const back = dow === 0 ? 6 : dow - 1;
  x.setDate(x.getDate() - back);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function hourLabel(h: number): string {
  const ampm = h < 12 ? "AM" : "PM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr} ${ampm}`;
}
function cellKey(dateStr: string, hour: number): string {
  return `${dateStr}|${hour}`;
}

export default function MyWeekClient() {
  const role = useRole();
  const [weekStart, setWeekStart] = useState<Date>(() => mondayOf(new Date()));
  const [blocks, setBlocks] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setBlocks(JSON.parse(raw));
    } catch {
      /* ignore corrupt cache */
    }
  }, []);

  const persist = useCallback((next: Record<string, string>) => {
    setBlocks(next);
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota */
    }
  }, []);

  const days = useMemo(
    () => Array.from({ length: 5 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const today = ymd(new Date());

  const openEdit = (key: string) => {
    setEditing(key);
    setDraft(blocks[key] ?? "");
    setTimeout(() => taRef.current?.focus(), 0);
  };
  const saveEdit = () => {
    if (editing == null) return;
    const next = { ...blocks };
    const v = draft.trim();
    if (v) next[editing] = v;
    else delete next[editing];
    persist(next);
    setEditing(null);
    setDraft("");
  };

  const weekLabel = `${MONTHS[weekStart.getMonth()]} ${weekStart.getDate()} – ${MONTHS[days[4].getMonth()]} ${days[4].getDate()}`;
  const isThisWeek = ymd(weekStart) === ymd(mondayOf(new Date()));

  if (role !== "admin") {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="text-lg font-semibold text-foreground">My Week</h1>
        <p className="mt-2 text-sm text-subtle">This area is private.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 md:px-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">My Week</h1>
          <p className="text-sm text-subtle">Your private schedule. Click any slot to block time.</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            className="rounded-md border border-border bg-surface p-1.5 text-subtle hover:text-foreground"
            aria-label="Previous week"
          >
            <ChevronLeftIcon className="size-4" />
          </button>
          <button
            onClick={() => setWeekStart(mondayOf(new Date()))}
            className={`rounded-md border px-3 py-1.5 text-[12px] font-medium ${
              isThisWeek ? "border-white bg-white text-background" : "border-border bg-surface text-foreground hover:border-white"
            }`}
          >
            {weekLabel}
          </button>
          <button
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            className="rounded-md border border-border bg-surface p-1.5 text-subtle hover:text-foreground"
            aria-label="Next week"
          >
            <ChevronRightIcon className="size-4" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-[var(--shadow-soft)]">
        <div className="min-w-[720px]">
          {/* Header row */}
          <div className="grid grid-cols-[64px_repeat(5,1fr)] border-b border-border bg-background">
            <div className="px-2 py-2" />
            {days.map((d, i) => {
              const isToday = ymd(d) === today;
              return (
                <div
                  key={i}
                  className={`px-3 py-2 text-center text-[12px] font-semibold ${isToday ? "text-foreground" : "text-subtle"}`}
                >
                  <div className="uppercase tracking-wider">{DAY_LABELS[i]}</div>
                  <div className={`text-[11px] font-normal tabular-nums ${isToday ? "text-foreground" : "text-subtle"}`}>
                    {MONTHS[d.getMonth()]} {d.getDate()}
                    {isToday && <span className="ml-1 inline-block size-1.5 rounded-full bg-rose-500 align-middle" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time rows */}
          {HOURS.map((h) => (
            <div key={h} className="grid grid-cols-[64px_repeat(5,1fr)] border-b border-surface-raised last:border-0">
              <div className="px-2 py-1 text-right text-[10px] tabular-nums text-subtle">{hourLabel(h)}</div>
              {days.map((d, i) => {
                const key = cellKey(ymd(d), h);
                const val = blocks[key];
                const isEditing = editing === key;
                return (
                  <div
                    key={i}
                    className="min-h-[44px] border-l border-surface-raised p-1"
                  >
                    {isEditing ? (
                      <textarea
                        ref={taRef}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={saveEdit}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            saveEdit();
                          }
                          if (e.key === "Escape") {
                            setEditing(null);
                            setDraft("");
                          }
                        }}
                        className="h-full min-h-[40px] w-full resize-none rounded-md border border-white bg-surface p-1.5 text-[12px] focus:outline-none"
                        placeholder="Block…"
                      />
                    ) : val ? (
                      <button
                        onClick={() => openEdit(key)}
                        className="group relative flex h-full w-full items-start rounded-md border border-border bg-[#F3F6FF] p-1.5 text-left text-[12px] leading-tight text-foreground transition-colors hover:border-white"
                      >
                        <span className="whitespace-pre-wrap break-words">{val}</span>
                        <span
                          role="button"
                          tabIndex={-1}
                          onClick={(e) => {
                            e.stopPropagation();
                            const next = { ...blocks };
                            delete next[key];
                            persist(next);
                          }}
                          className="absolute right-0.5 top-0.5 hidden rounded p-0.5 text-subtle hover:text-rose-600 group-hover:block"
                          aria-label="Clear block"
                        >
                          <XMarkIcon className="size-3" />
                        </span>
                      </button>
                    ) : (
                      <button
                        onClick={() => openEdit(key)}
                        className="h-full min-h-[40px] w-full rounded-md text-left text-[12px] text-transparent transition-colors hover:bg-background"
                      >
                        +
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <p className="mt-3 text-[11px] text-subtle">
        Private to you. Enter to save · Shift+Enter for a new line · hover a block to clear it.
      </p>
    </div>
  );
}
