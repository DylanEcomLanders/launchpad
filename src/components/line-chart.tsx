/* ── Line chart ──
 * A calm, minimal multi-series line chart: smooth curves, a faint area wash,
 * light gridlines, and axis labels. Token colours only, dark-surface friendly.
 * Geometry is drawn in a normalised 0-100 viewBox and stretched to fill the
 * container (preserveAspectRatio="none"); strokes stay crisp via
 * vector-effect="non-scaling-stroke", and all text is real HTML so nothing
 * distorts. Feed it a few series of equal-length number[] plus x labels.
 */

type Series = { key: string; color: string; points: number[] };

function niceMax(m: number): number {
  if (m <= 5) return 5;
  if (m <= 10) return 10;
  if (m <= 20) return 20;
  if (m <= 50) return Math.ceil(m / 10) * 10;
  return Math.ceil(m / 25) * 25;
}

/* Catmull-Rom → cubic bezier for a smooth curve through the points. */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return pts.length ? `M ${pts[0].x} ${pts[0].y}` : "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  const t = 0.16;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) * t;
    const c1y = p1.y + (p2.y - p0.y) * t;
    const c2x = p2.x - (p3.x - p1.x) * t;
    const c2y = p2.y - (p3.y - p1.y) * t;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export function LineChart({
  series,
  labels,
  className,
  yTicks = 4,
  showY = true,
  extendEnds = true,
}: {
  series: { key: string; color: string; points: (number | null)[]; faded?: boolean }[];
  labels: string[];
  className?: string;
  yTicks?: number;
  /** Show the y-axis scale + gutter. Off for compact sparkline-style cards. */
  showY?: boolean;
  /** Dotted-bridge leading/trailing gaps out to the chart edges. Off when a
   *  line should honestly stop at its last data point (e.g. month-to-date). */
  extendEnds?: boolean;
}) {
  const allVals = series.flatMap((s) => s.points).filter((v): v is number => v !== null);
  const yMax = niceMax(Math.max(1, ...allVals));
  // x is spaced across the DATA points, not the (sparser) axis tick labels.
  const n = Math.max(1, ...series.map((s) => s.points.length));
  const toXY = (v: number, i: number) => ({ x: n > 1 ? (i / (n - 1)) * 100 : 50, y: 100 - (v / yMax) * 100 });
  const ticks = showY ? Array.from({ length: yTicks + 1 }, (_, k) => (yMax / yTicks) * k) : [0, yMax];
  const plotLeft = showY ? "left-11" : "left-0";

  return (
    <div className={`relative ${className ?? ""}`}>
      {showY && (
        <div className="absolute bottom-5 left-0 top-0 w-8">
          {ticks.map((t, k) => (
            <span
              key={k}
              className="absolute right-0 -translate-y-1/2 text-2xs tabular-nums text-subtle"
              style={{ top: `${(1 - t / yMax) * 100}%` }}
            >
              {Math.round(t)}
            </span>
          ))}
        </div>
      )}

      {/* plot */}
      <div className={`absolute right-0 top-0 bottom-5 ${plotLeft}`}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible">
          <defs>
            {series.map((s, si) => (
              <linearGradient key={si} id={`line-fill-${si}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity="0.1" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>

          {ticks.map((t, k) => {
            const y = (1 - t / yMax) * 100;
            return <line key={k} x1="0" y1={y} x2="100" y2={y} stroke="var(--border)" strokeWidth="1" vectorEffect="non-scaling-stroke" />;
          })}

          {series.map((s, si) => {
            const defined = s.points
              .map((v, i) => (v === null ? null : { ...toXY(v, i), i }))
              .filter((p): p is { x: number; y: number; i: number } => p !== null);
            if (!defined.length) return null;

            // Solid over runs of consecutive months with data; dotted bridges
            // the gaps and extends to the chart edges where data is missing.
            const runs: { x: number; y: number; i: number }[][] = [[defined[0]]];
            for (let k = 1; k < defined.length; k++) {
              if (defined[k].i === defined[k - 1].i + 1) runs[runs.length - 1].push(defined[k]);
              else runs.push([defined[k]]);
            }
            const solid = runs.map((run) => smoothPath(run)).join(" ");
            const first = defined[0];
            const last = defined[defined.length - 1];
            let dotted = "";
            if (extendEnds && first.i > 0) dotted += ` M 0 ${first.y} L ${first.x} ${first.y}`;
            for (let r = 0; r < runs.length - 1; r++) {
              const a = runs[r][runs[r].length - 1];
              const b = runs[r + 1][0];
              dotted += ` M ${a.x} ${a.y} L ${b.x} ${b.y}`;
            }
            if (extendEnds && last.i < s.points.length - 1) dotted += ` M ${last.x} ${last.y} L 100 ${last.y}`;

            return (
              <g key={si} opacity={s.faded ? 0.32 : 1}>
                {!s.faded && <path d={`${smoothPath(defined)} L ${last.x} 100 L ${first.x} 100 Z`} fill={`url(#line-fill-${si})`} stroke="none" />}
                {dotted && (
                  <path d={dotted} fill="none" stroke={s.color} strokeWidth={s.faded ? 1.5 : 2} strokeLinecap="round" strokeDasharray="0.5 4" opacity="0.5" vectorEffect="non-scaling-stroke" />
                )}
                <path d={solid} fill="none" stroke={s.color} strokeWidth={s.faded ? 1.5 : 2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              </g>
            );
          })}
        </svg>
      </div>

      {/* x-axis labels */}
      <div className={`absolute inset-x-0 bottom-0 flex justify-between text-2xs tabular-nums text-subtle ${plotLeft}`}>
        {labels.map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>
    </div>
  );
}
