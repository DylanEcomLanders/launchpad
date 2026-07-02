# Design Craft Rules — Non-Negotiable

Every visual decision here is a rule, not a suggestion. If a value isn't specified here
or in the token system (`src/app/globals.css`), DO NOT invent one — reuse the nearest
existing pattern. Never introduce a new spacing value, radius, opacity, border treatment,
or shadow. Reference surface: `src/app/(dashboard)/finance/page.tsx` (the calibrated bar).

## 1. Hierarchy is built with weight and opacity, NOT size or colour
- Max 3 text sizes per card: value (large), title (medium), label/caption (small). Never a 4th.
- Muted text = the `text-muted` / `text-subtle` tokens, never a new grey.
- Big numbers are semibold, labels are regular + muted. The value is ALWAYS visually
  dominant over its label. If a label competes with its value, it's wrong.
- Nav section labels: smaller than items, muted, generous top margin. They whisper.

## 2. Elevation logic
- Exactly 3 surface steps: page (`bg-background`) → card (`bg-surface`) → sub-card
  (`bg-surface-raised`). Each step is ONE token lighter.
- Every card: 1px border (`border-border`) + radius from the scale (`rounded-lg`). No shadows
  as the primary elevation cue on dark surfaces — borders + background steps do the work.
- Sub-cards (stat rows, mini-cards) sit on `bg-surface-raised` with a tighter radius than
  the parent. Never the same background as the parent card.
- NEVER: gradients on surfaces, glassmorphism, blur, glow on containers, double borders.

## 3. Spacing is rhythmic, not eyeballed
- ONE padding value for all card interiors: `p-5`. ONE gap value for all grid gutters: `gap-3`.
  These never vary per-card.
- Related items (label + value) sit tight (4–8px). Unrelated blocks separate wide (20–24px,
  `gap-5`/`gap-6`). The contrast between tight and wide IS the design.
- Everything aligns to the card's internal padding edge. No half-indented element, no
  negative-margin tweaks, no optical centring, no per-component margin hacks.

## 4. Charts: restraint is the style (recharts)
- NO plot borders. NO axis lines (`axisLine={false} tickLine={false}`). NO vertical gridlines.
- Horizontal gridlines only: `<CartesianGrid vertical={false} strokeDasharray="3 3"
  stroke="var(--color-border)" />` at y-ticks.
- Axis labels float, muted, small: `tick={{ fontSize: 12, fill: "var(--color-subtle)" }}`.
- Max 2 data colours + semantic green/red per chart. A third series colour is a violation.
  Series colours come from `--color-chart-1..8`; revenue/positive = `--color-success`,
  neutral = `--color-subtle`.
- Lines: `type="monotone"`, `strokeWidth={2}`, `dot={false}` (one terminal/active dot only).
- Legends: dot + muted label, top-right of the card header. Never the recharts default legend.
- Tooltips styled as sub-cards (`bg-surface-raised border border-border`, no shadow).
- Kill every recharts default: `isAnimationActive={false}`, custom tooltip, styled ticks.

## 5. Repeating atoms are IDENTICAL everywhere
- One component per atom (delta badge, stat row, key-value row, legend). Never re-implemented
  per card.
- Dividers: always dashed, always full-width of the content area, always low opacity
  (`border-dashed border-border` / `divide-dashed divide-border`).
- Icons: ONE set (heroicons outline), one size per context (nav / chip / card header).
  Mixing sets or sizes reads instantly as broken.

## 6. Density calibration
- DENSE but ordered: lots of data per screen via small muted labels + tight label-value pairs,
  not by shrinking everything uniformly.
- Cards fill their grid cell. No orphan cards in empty space, no stretched single-column
  layouts. If a row has leftover width, a card spans it (`lg:col-span-2`).
- Views fill the full container width. The outer page/area wrapper uses horizontal padding
  only (`px-6 md:px-10`) — NO `max-w-*` + `mx-auto` narrow centred column. Empty left/right
  gutters are a violation.

## 7. Forbidden (instant rejection)
- Any hex/rgb/hsl literal in a component. Tokens only. (Fixed data-viz palettes live in
  globals.css as `--color-chart-*` / `--color-cat-*`.)
- New spacing/radius/opacity values not already in the system.
- Emoji as icons. Default HTML form styling. Centre-aligned body text.
- Drop shadows for emphasis, coloured card backgrounds, borders thicker than 1px.
- Chart library defaults surviving to render.
- More than one accent colour doing UI "highlight" work in a single view (data-viz series
  colours are exempt — they're data, not chrome).

## Type scale (globals.css — use these, invent none)
`text-2xs` 12 · `text-xs` 13 · `text-sm` 14 (body) · `text-base` 15 · `text-lg` 17 (card title)
· `text-xl` 22 · `text-2xl` 28 (hero value). Micro tier: `text-3xs` 11 · `text-4xs` 10.

## Self-check before completing ANY UI task
1. Did I introduce any literal value? → replace with token.
2. Do all cards share identical padding (`p-5`), radius (`rounded-lg`), border (`border-border`)?
3. Squint test: value loudest, label quietest, one accent.
4. Are all repeated atoms the same component?
5. Did the chart library leak any default styling?
