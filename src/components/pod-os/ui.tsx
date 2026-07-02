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
      className={`rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-soft)] ${className}`}
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
      <h2 className="text-sm font-semibold text-foreground">{children}</h2>
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
      ? "text-warning"
      : tone === "rose"
        ? "text-danger"
        : tone === "emerald"
          ? "text-success"
          : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3 shadow-[var(--shadow-soft)]">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-subtle">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${toneCls}`}>{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-subtle">{hint}</div>}
    </div>
  );
}

const PILL_TONES: Record<string, string> = {
  default: "bg-surface-raised text-subtle border-border",
  blue: "bg-info/10 text-info border-info/20",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  emerald: "bg-success/10 text-success border-success/20",
  rose: "bg-danger/10 text-danger border-danger/20",
  amber: "bg-warning/10 text-warning border-warning/20",
  muted: "bg-surface-raised text-subtle border-border",
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
      ? "bg-success"
      : tone === "amber"
        ? "bg-warning"
        : tone === "rose"
          ? "bg-danger"
          : tone === "blue"
            ? "bg-info"
            : "bg-surface";
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-surface-raised ${className}`}>
      <div className={`h-full ${fill}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="py-6 text-center text-[12px] text-muted">{children}</p>
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
