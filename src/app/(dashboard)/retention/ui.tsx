"use client";

import type { HealthBand } from "@/lib/retention/types";
import type { Pillar, PillarStatus } from "@/lib/retention/health";
import type { UpsellMove } from "@/lib/retention/upsell";

// Shared presentational bits for the Retention dashboard. Dark theme tokens
// match form-styles.ts / the rest of the app.

export const BAND_META: Record<HealthBand, { label: string; text: string; dot: string; chip: string }> = {
  green: { label: "Healthy", text: "text-emerald-400", dot: "#10B981", chip: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" },
  amber: { label: "At risk", text: "text-amber-400", dot: "#F59E0B", chip: "bg-amber-500/10 border-amber-500/30 text-amber-400" },
  red: { label: "Critical", text: "text-red-400", dot: "#EF4444", chip: "bg-red-500/10 border-red-500/30 text-red-400" },
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
    <div className="bg-[#181818] border border-[#2A2A2A] rounded-xl px-5 py-4 shadow-[var(--shadow-soft)]">
      <div className="text-xs font-semibold uppercase tracking-wider text-[#71757D]">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${accent ?? "text-[#E5E5EA]"}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-[#71757D]">{sub}</div>}
    </div>
  );
}

export function renewalLabel(days: number): { text: string; tone: string } {
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, tone: "text-red-400" };
  if (days === 0) return { text: "Today", tone: "text-red-400" };
  if (days <= 14) return { text: `${days}d`, tone: "text-red-400" };
  if (days <= 30) return { text: `${days}d`, tone: "text-amber-400" };
  return { text: `${days}d`, tone: "text-[#71757D]" };
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
  good: "#10B981",
  warn: "#F59E0B",
  bad: "#EF4444",
  na: "#4B4D52",
};

/** Inline row of the five health pillars: dot + label. The dot encodes the
 *  pillar's status; hover gives the detail. This is the "why" behind the band. */
export function PillarDots({ pillars, showDetail }: { pillars: Pillar[]; showDetail?: boolean }) {
  return (
    <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-[11px] text-[#71757D]">
      {pillars.map((p) => (
        <span key={p.key} title={p.detail} className="inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: PILLAR_DOT[p.status] }} />
          {p.label}
          {showDetail && <span className="text-[#4B4D52]">· {p.detail}</span>}
        </span>
      ))}
    </div>
  );
}

// ── Upsell move badge ──────────────────────────────────────────────────────
export const UPSELL_META: Record<UpsellMove, { chip: string }> = {
  upsell: { chip: "bg-blue-500/10 border-blue-500/30 text-blue-400" },
  expand: { chip: "bg-violet-500/10 border-violet-500/30 text-violet-400" },
  steady: { chip: "bg-[#222] border-[#333] text-[#9A9DA3]" },
  hold: { chip: "bg-amber-500/10 border-amber-500/30 text-amber-400" },
};

export function UpsellBadge({ move, label }: { move: UpsellMove; label: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-medium ${UPSELL_META[move].chip}`}>
      {label}
    </span>
  );
}
