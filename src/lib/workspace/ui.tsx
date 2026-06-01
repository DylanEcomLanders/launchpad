"use client";

// ─── Workspace UI kit ───────────────────────────────────────────────
// A small, self-contained component set for the new Workspace. Deliberately
// NOT reusing the existing pods-v2 components - fresh, calm, high-whitespace
// aesthetic. Built on the shared design tokens in globals.css.

import type { ReactNode } from "react";
import type { DeadlineState, Lane } from "./derive";
import { countdownLabel } from "./derive";

// ─── Tones ──────────────────────────────────────────────────────────

export type Tone =
  | "neutral"
  | "green"
  | "amber"
  | "red"
  | "blue"
  | "violet";

const TONE_SOFT: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-600",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-rose-50 text-rose-700",
  blue: "bg-sky-50 text-sky-700",
  violet: "bg-violet-50 text-violet-700",
};

const TONE_DOT: Record<Tone, string> = {
  neutral: "bg-slate-300",
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-rose-500",
  blue: "bg-sky-500",
  violet: "bg-violet-500",
};

const TONE_BAR: Record<Tone, string> = {
  neutral: "bg-slate-400",
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-rose-500",
  blue: "bg-sky-500",
  violet: "bg-violet-500",
};

// Lane → tone mapping. Strategy gets its own distinct colour so it reads
// as an equal, first-class lane everywhere.
export const LANE_TONE: Record<Lane, Tone> = {
  strategy: "violet",
  design: "blue",
  development: "green",
};

export function deadlineTone(state: DeadlineState): Tone {
  switch (state) {
    case "overdue":
      return "red";
    case "soon":
      return "amber";
    case "ontrack":
      return "green";
    case "paused":
      return "neutral";
    case "awaiting_approval":
      return "blue";
    case "done":
      return "neutral";
  }
}

export function bandTone(band: "green" | "amber" | "red"): Tone {
  return band;
}

// ─── Primitives ─────────────────────────────────────────────────────

export function Card({
  children,
  className = "",
  as,
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section";
}) {
  const Tag = as ?? "div";
  return (
    <Tag
      className={`rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${className}`}
    >
      {children}
    </Tag>
  );
}

export function Pill({
  tone = "neutral",
  children,
  dot = false,
}: {
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE_SOFT[tone]}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[tone]}`} />}
      {children}
    </span>
  );
}

export function HealthDot({ band }: { band: "green" | "amber" | "red" }) {
  return (
    <span className={`inline-block h-2.5 w-2.5 rounded-full ${TONE_DOT[band]}`} />
  );
}

export function StatTile({
  label,
  value,
  tone = "neutral",
  sub,
}: {
  label: string;
  value: ReactNode;
  tone?: Tone;
  sub?: string;
}) {
  return (
    <Card className="px-5 py-4">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${TONE_DOT[tone]}`} />
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </span>
      </div>
      <div className="mt-2 font-heading text-3xl font-semibold tabular-nums text-slate-900">
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </Card>
  );
}

export function ProgressBar({
  value,
  max,
  tone = "blue",
}: {
  value: number;
  max: number;
  tone?: Tone;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  // Over capacity flips the bar red regardless of the requested tone.
  const barTone: Tone = value > max ? "red" : tone;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-full rounded-full ${TONE_BAR[barTone]} transition-all`}
        style={{ width: `${Math.max(pct, value > 0 ? 4 : 0)}%` }}
      />
    </div>
  );
}

// ─── Owner chip (accountability) ────────────────────────────────────

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "·";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function OwnerChip({
  name,
  avatarUrl,
  size = "sm",
}: {
  name: string;
  avatarUrl?: string;
  size?: "sm" | "xs";
}) {
  const unassigned = name === "Unassigned";
  const dim = size === "xs" ? "h-5 w-5 text-[9px]" : "h-6 w-6 text-[10px]";
  return (
    <span className="inline-flex items-center gap-1.5">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={name}
          className={`${dim} rounded-full object-cover`}
        />
      ) : (
        <span
          className={`${dim} inline-flex items-center justify-center rounded-full font-semibold ${
            unassigned
              ? "bg-rose-100 text-rose-600"
              : "bg-slate-200 text-slate-600"
          }`}
        >
          {unassigned ? "!" : initials(name)}
        </span>
      )}
      <span
        className={`text-xs ${
          unassigned ? "font-medium text-rose-600" : "text-slate-600"
        }`}
      >
        {name}
      </span>
    </span>
  );
}

// ─── Deadline pill ──────────────────────────────────────────────────

export function DeadlinePill({
  state,
  daysToDue,
}: {
  state: DeadlineState;
  daysToDue: number;
}) {
  return (
    <Pill tone={deadlineTone(state)} dot>
      {countdownLabel(daysToDue, state)}
    </Pill>
  );
}

// ─── Section heading ────────────────────────────────────────────────

export function SectionTitle({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-slate-500">
        {children}
      </h2>
      {action}
    </div>
  );
}

export function LaneTag({ lane, label }: { lane: Lane; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${TONE_DOT[LANE_TONE[lane]]}`} />
      <span className="text-xs font-medium text-slate-600">{label}</span>
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
      {children}
    </div>
  );
}

// ─── Interactive controls (editing) ─────────────────────────────────

import { useState } from "react";

/** Round checkbox used to mark a deliverable done / not-done. */
export function Checkbox({
  checked,
  onChange,
  title,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onChange(!checked);
      }}
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
        checked
          ? "border-emerald-500 bg-emerald-500 text-white"
          : "border-slate-300 bg-white hover:border-slate-400"
      }`}
    >
      {checked && (
        <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M2.5 6.5 5 9l4.5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

/** Single-line add control: a text input + Add button that collapses
 *  from a "+ Add" link. Used to append kanban tasks / briefs / docs. */
export function InlineAdd({
  placeholder,
  addLabel = "Add",
  ctaLabel = "+ Add",
  secondaryPlaceholder,
  onAdd,
}: {
  placeholder: string;
  addLabel?: string;
  ctaLabel?: string;
  /** When provided, a second input is shown (e.g. a URL). */
  secondaryPlaceholder?: string;
  onAdd: (value: string, secondary?: string) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [secondary, setSecondary] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const v = value.trim();
    if (!v) return;
    setBusy(true);
    try {
      await onAdd(v, secondary.trim() || undefined);
      setValue("");
      setSecondary("");
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-lg border border-dashed border-slate-200 px-3 py-2 text-left text-xs font-medium text-slate-400 transition-colors hover:border-slate-300 hover:text-slate-600"
      >
        {ctaLabel}
      </button>
    );
  }

  return (
    <div className="space-y-1.5 rounded-lg border border-slate-200 bg-white p-2">
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !secondaryPlaceholder) submit();
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder={placeholder}
        className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-slate-400"
      />
      {secondaryPlaceholder && (
        <input
          value={secondary}
          onChange={(e) => setSecondary(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder={secondaryPlaceholder}
          className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-slate-400"
        />
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={submit}
          className="rounded-md bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {busy ? "Saving..." : addLabel}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/** Compact lane summary chip: "S 1/3" with an at-risk count. Used where
 *  the three full lane boxes would take too much space. */
export function LaneChip({
  lane,
  short,
  done,
  total,
  atRisk,
}: {
  lane: Lane;
  short: string;
  done: number;
  total: number;
  atRisk: number;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1 text-xs">
      <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[LANE_TONE[lane]]}`} />
      <span className="font-medium text-slate-500">{short}</span>
      <span className="tabular-nums text-slate-700">
        {done}/{total}
      </span>
      {atRisk > 0 && (
        <span className="tabular-nums font-medium text-rose-600">· {atRisk}!</span>
      )}
    </span>
  );
}
