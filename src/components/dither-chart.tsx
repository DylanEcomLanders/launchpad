/* ── Dither chart ──
 * A dot-matrix bar chart in the house style: each column is a stack of small
 * square dots, a faint full-height "track" with the value lit on top in a
 * restrained accent. Same 1-bit language as the dither icons. Pure SVG, token
 * colours only, scales to its container. Feed it a number[] (one per bar).
 */

type Props = {
  /** One value per bar. `null` = no data (bare track, no lit dots); any number
   *  (including 0) lights at least one dot so a real low reads as a low, not a
   *  gap. */
  data: (number | null)[];
  className?: string;
  rows?: number;
  /** Value that maps to a full-height bar. Defaults to the data max. Pass a
   *  fixed value (e.g. 100) when charting a rate so height reads as a %. */
  max?: number;
  /** CSS colour for lit dots. Defaults to the on-track status token. */
  accent?: string;
  /** Per-bar lit colour, aligned to data. Overrides `accent` where present. */
  accents?: string[];
  /** Dots across per bar. Widen (e.g. 5) for a few fat bars; keep 3 for a
   *  dense time series. */
  barDots?: number;
  /** Gap between bars, in dot-grid units. */
  colGap?: number;
  /** Fade lit dots from dim at the base to full at the tip, for depth. */
  gradient?: boolean;
  /** Native hover tooltip per bar (e.g. "12 May: 88%"), aligned to data. */
  titles?: string[];
};

const DOT = 2; // dot size
const GAP_Y = 1; // vertical gap — matches horizontal for an even square lattice
const DOT_X = 2;
const GAP_X = 1;

const CELL_Y = DOT + GAP_Y; // 3

export function DitherBars({
  data,
  className,
  rows = 10,
  max,
  accent = "var(--color-status-ontrack)",
  accents,
  barDots = 3,
  colGap = 6,
  gradient = true,
  titles,
}: Props) {
  const barW = barDots * DOT_X + (barDots - 1) * GAP_X;
  const colStep = barW + colGap;
  const denom = max ?? Math.max(...data.map((v) => v ?? 0), 1);
  const H = rows * CELL_Y - GAP_Y;
  const W = Math.max(1, data.length) * colStep - colGap;

  const cols: React.ReactElement[] = [];
  data.forEach((value, c) => {
    // null → bare track. A real value floors to 1 lit dot so 0 ≠ no-data.
    const lit =
      value === null ? 0 : Math.max(1, Math.min(rows, Math.round((value / denom) * rows)));
    const litColor = accents?.[c] ?? accent;
    const colX = c * colStep;
    const dots: React.ReactElement[] = [];
    for (let r = 0; r < rows; r++) {
      const y = H - r * CELL_Y - DOT;
      const on = r < lit;
      // Near-uniform bright, with just a hint more glow toward the tip.
      const op = on ? (gradient && lit > 1 ? 0.82 + 0.18 * (r / (lit - 1)) : 1) : 0.2;
      for (let b = 0; b < barDots; b++) {
        const x = colX + b * (DOT_X + GAP_X);
        dots.push(
          <rect key={`${r}-${b}`} x={x} y={y} width={DOT} height={DOT} fill={on ? litColor : "var(--subtle)"} fillOpacity={op} />,
        );
      }
    }
    cols.push(
      <g key={c}>
        {dots}
        {/* transparent hit area for the native tooltip */}
        {titles?.[c] && (
          <rect x={colX} y={0} width={barW} height={H} fill="transparent">
            <title>{titles[c]}</title>
          </rect>
        )}
      </g>,
    );
  });

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      shapeRendering="crispEdges"
    >
      {cols}
    </svg>
  );
}

/* ── Dither meter ──
 * A single horizontal row of dots, lit left-to-right in proportion to value.
 * For component breakdowns (e.g. the client-health sub-scores). Scales to its
 * container width; dots stay square. */
export function DitherMeter({
  value,
  max = 100,
  accent = "var(--color-status-ontrack)",
  className,
  dots = 40,
}: {
  value: number | null;
  max?: number;
  accent?: string;
  className?: string;
  dots?: number;
}) {
  const step = DOT_X + GAP_X;
  const W = dots * step - GAP_X;
  const lit = value === null ? 0 : Math.max(1, Math.min(dots, Math.round((value / max) * dots)));
  const cells: React.ReactElement[] = [];
  for (let i = 0; i < dots; i++) {
    const on = i < lit;
    // Depth: ramp up toward the level so the leading edge reads brightest.
    const op = on ? (lit > 1 ? 0.5 + 0.5 * (i / (lit - 1)) : 1) : 0.22;
    cells.push(
      <rect key={i} x={i * step} y={0} width={DOT} height={DOT} fill={on ? accent : "var(--subtle)"} fillOpacity={op} />,
    );
  }
  return (
    <svg
      viewBox={`0 0 ${W} ${DOT}`}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {cells}
    </svg>
  );
}
