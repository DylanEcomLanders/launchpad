import { useId } from "react";
import { cn } from "./cn";

/* ── StatCard ──
 * A headline metric: big value, a delta vs a comparison period, and a filled
 * area sparkline of the recent trajectory. Tokens only; the delta + sparkline
 * turn green when the move is good, red when it isn't (lowerIsBetter flips it,
 * for metrics like turnaround or overdue where down is good). Reusable across
 * KPI surfaces — feed it whatever real series the page already computes.
 */

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const gid = useId();
  if (!data || data.length < 2) return null;
  const W = 100;
  const H = 36;
  const pad = 3;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const x = (i: number) => (i / (data.length - 1)) * W;
  const y = (v: number) => pad + (1 - (v - min) / span) * (H - pad * 2);
  const line = data
    .map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(2)} ${y(v).toFixed(2)}`)
    .join(" ");
  const area = `${line} L${W} ${H} L0 ${H} Z`;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="block h-10 w-full"
      aria-hidden
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.26" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  /** Signed change vs the comparison period. Omit / null to hide the delta. */
  delta?: number | null;
  /** Unit appended to the delta, e.g. "%", "pts", "d". */
  deltaUnit?: string;
  /** Symbol before the delta number, e.g. "£", "$". */
  deltaPrefix?: string;
  /** Text after the delta, e.g. "vs yesterday", "vs last month". */
  deltaCaption?: string;
  /** For metrics where a smaller number is better (turnaround, overdue): flips
   *  the good/bad colour without changing the arrow direction. */
  lowerIsBetter?: boolean;
  /** Recent trajectory for the sparkline (non-null points, oldest → newest). */
  series?: number[];
  /** Colour the value itself when there's no delta to carry the signal
   *  (e.g. an alert count). Leave unset for the default foreground value. */
  tone?: "warn" | "bad";
  className?: string;
}

export function StatCard({
  label,
  value,
  delta,
  deltaUnit = "",
  deltaPrefix = "",
  deltaCaption,
  lowerIsBetter,
  series,
  tone,
  className,
}: StatCardProps) {
  const valueColor =
    tone === "bad"
      ? "text-status-late"
      : tone === "warn"
        ? "text-status-approaching"
        : "text-foreground";
  const hasDelta = delta !== null && delta !== undefined;
  const up = hasDelta && delta >= 0;
  const good = hasDelta ? (lowerIsBetter ? delta <= 0 : delta >= 0) : true;
  const accent = good
    ? "var(--color-status-ontrack)"
    : "var(--color-status-late)";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-border-faint bg-surface",
        className,
      )}
    >
      <div className="px-5 pb-3 pt-4">
        <p className="text-2xs font-medium uppercase tracking-wider text-subtle">
          {label}
        </p>
        <p className={cn("mt-2 text-[26px] font-semibold leading-none tabular-nums", valueColor)}>
          {value}
        </p>
        {hasDelta ? (
          <p className="mt-2 flex items-center gap-1.5 text-2xs">
            <span
              className="font-medium tabular-nums"
              style={{ color: accent }}
            >
              {up ? "↗" : "↘"} {delta > 0 ? "+" : delta < 0 ? "-" : ""}
              {deltaPrefix}
              {Math.abs(delta).toLocaleString()}
              {deltaUnit}
            </span>
            {deltaCaption && <span className="text-subtle">{deltaCaption}</span>}
          </p>
        ) : (
          deltaCaption && (
            <p className="mt-2 text-2xs text-subtle">{deltaCaption}</p>
          )
        )}
      </div>
      {series && series.length >= 2 && (
        <Sparkline data={series} color={accent} />
      )}
    </div>
  );
}
