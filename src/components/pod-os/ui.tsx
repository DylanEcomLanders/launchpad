// Shared visual primitives for the Pod OS v2 role dashboards (Strategist,
// CSM). Kept here — not imported from the unrouted _pods-preview mock — so
// the real routes don't depend on uncommitted WIP (DECISIONS.md #2). Matches
// the app's design tokens (globals.css): white cards, #E5E5EA borders,
// var(--shadow-soft), #1B1B1B ink, #7A7A7A muted.

import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-[#2A2A2A] bg-[#181818] p-5 shadow-[var(--shadow-soft)] ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionHeader({
  children,
  right,
}: {
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-sm font-semibold text-[#E5E5EA]">{children}</h2>
      {right}
    </div>
  );
}

export function StatTile({
  label,
  value,
  tone = "default",
  hint,
}: {
  label: string;
  value: ReactNode;
  tone?: "default" | "amber" | "rose" | "emerald";
  hint?: string;
}) {
  const toneCls =
    tone === "amber"
      ? "text-amber-700"
      : tone === "rose"
        ? "text-rose-700"
        : tone === "emerald"
          ? "text-emerald-700"
          : "text-[#E5E5EA]";
  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#181818] px-4 py-3 shadow-[var(--shadow-soft)]">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-[#71757D]">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${toneCls}`}>{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-[#71757D]">{hint}</div>}
    </div>
  );
}

const PILL_TONES: Record<string, string> = {
  default: "bg-[#222222] text-[#71757D] border-[#2A2A2A]",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rose: "bg-rose-50 text-rose-700 border-rose-200",
  amber: "bg-amber-50 text-amber-800 border-amber-200",
  muted: "bg-[#222222] text-[#71757D] border-[#2A2A2A]",
};

export function Pill({
  children,
  tone = "default",
  className = "",
}: {
  children: ReactNode;
  tone?: keyof typeof PILL_TONES;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${PILL_TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** Thin progress bar with a tone-coloured fill. pct clamped 0-100. */
export function Meter({
  pct,
  tone = "ink",
  className = "",
}: {
  pct: number;
  tone?: "ink" | "emerald" | "amber" | "rose" | "blue";
  className?: string;
}) {
  const fill =
    tone === "emerald"
      ? "bg-emerald-500"
      : tone === "amber"
        ? "bg-amber-400"
        : tone === "rose"
          ? "bg-rose-400"
          : tone === "blue"
            ? "bg-blue-500"
            : "bg-[#1B1B1B]";
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-[#222222] ${className}`}>
      <div className={`h-full ${fill}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="py-6 text-center text-[12px] text-[#C5C5C5]">{children}</p>
  );
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "May 30" from YYYY-MM-DD. Returns "—" for empty input. */
export function fmtDayMonth(ymd?: string | null): string {
  if (!ymd) return "—";
  const [, m, d] = ymd.split("-").map(Number);
  if (!m || !d) return ymd;
  return `${MONTHS[m - 1]} ${d}`;
}
