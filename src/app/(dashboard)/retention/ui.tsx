"use client";

import type { HealthBand } from "@/lib/retention/types";
import type { Pillar, PillarStatus } from "@/lib/retention/health";
import type { UpsellMove } from "@/lib/retention/upsell";

// Shared presentational bits for the Retention dashboard. Dark theme tokens
// match form-styles.ts / the rest of the app.

export const BAND_META: Record<HealthBand, { label: string; text: string; dot: string; chip: string }> = {
  green: { label: "Healthy", text: "text-success", dot: "var(--success)", chip: "bg-success/10 border-success/20 text-success" },
  amber: { label: "At risk", text: "text-warning", dot: "var(--warning)", chip: "bg-warning/10 border-warning/20 text-warning" },
  red: { label: "Critical", text: "text-danger", dot: "var(--danger)", chip: "bg-danger/10 border-danger/20 text-danger" },
};

export function HealthPill({ band, overridden, title }: { band: HealthBand; overridden?: boolean; title?: string }) {
  const m = BAND_META[band];
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${m.chip}`}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.dot }} />
      {m.label}
      {overridden && <span className="opacity-60 font-normal">· manual</span>}
    </span>
  );
}

export function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="bg-surface border border-border rounded-xl px-5 py-4 shadow-[var(--shadow-soft)]">
      <div className="text-xs font-semibold uppercase tracking-wider text-subtle">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${accent ?? "text-foreground"}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-subtle">{sub}</div>}
    </div>
  );
}

export function renewalLabel(days: number): { text: string; tone: string } {
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, tone: "text-danger" };
  if (days === 0) return { text: "Today", tone: "text-danger" };
  if (days <= 14) return { text: `${days}d`, tone: "text-danger" };
  if (days <= 30) return { text: `${days}d`, tone: "text-warning" };
  return { text: `${days}d`, tone: "text-subtle" };
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? iso + "T00:00:00" : iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function fmtAgo(days: number | null): string {
  if (days == null) return "—";
  if (days === 0) return "today";
  return `${days}d ago`;
}

export function fmtMoney(n: number): string {
  return "£" + Math.round(n).toLocaleString("en-GB");
}

// ── Pillars ──────────────────────────────────────────────────────────────
const PILLAR_DOT: Record<PillarStatus, string> = {
  good: "var(--success)",
  warn: "var(--warning)",
  bad: "var(--danger)",
  na: "var(--subtle)",
};

/** Inline row of the five health pillars: dot + label. The dot encodes the
 *  pillar's status; hover gives the detail. This is the "why" behind the band. */
export function PillarDots({ pillars, showDetail }: { pillars: Pillar[]; showDetail?: boolean }) {
  return (
    <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-[11px] text-subtle">
      {pillars.map((p) => (
        <span key={p.key} title={p.detail} className="inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: PILLAR_DOT[p.status] }} />
          {p.label}
          {showDetail && <span className="text-muted">· {p.detail}</span>}
        </span>
      ))}
    </div>
  );
}

// ── Upsell move badge ──────────────────────────────────────────────────────
export const UPSELL_META: Record<UpsellMove, { chip: string }> = {
  upsell: { chip: "bg-info/10 border-info/20 text-info" },
  expand: { chip: "bg-violet-500/10 border-violet-500/30 text-violet-400" },
  steady: { chip: "bg-surface-raised border-border text-muted" },
  hold: { chip: "bg-warning/10 border-warning/20 text-warning" },
};

export function UpsellBadge({ move, label }: { move: UpsellMove; label: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-medium ${UPSELL_META[move].chip}`}>
      {label}
    </span>
  );
}
