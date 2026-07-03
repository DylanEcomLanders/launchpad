# Design Craft Rules — Non-Negotiable

Every visual decision here is a rule, not a suggestion. If a value isn't specified here
or in the token system (`src/app/globals.css`), DO NOT invent one — reuse the nearest
existing pattern. Never introduce a new spacing value, radius, opacity, border treatment,
or shadow. Reference surface: `src/app/(dashboard)/finance/page.tsx` (the calibrated bar).

## 1. Hierarchy is built with weight and opacity, NOT size or colour
- Max 3 text sizes per card: value (large), title (medium), label/caption (small). Never a 4th.
- Muted text = the `text-muted` / `text-subtle` tokens, never a new grey.
- Semantic emphasis (an attention value like an amount owed, a status dot) uses the MUTED status
  palette — `text-status-late` / `-approaching` / `-ontrack`, `bg-status-*` — NOT the loud
  `danger` / `warning` / `success` tokens. Those alarm hues jar in a calm UI; reserve them for
  genuine errors and destructive actions.
- Big numbers are semibold, labels are regular + muted. The value is ALWAYS visually
  dominant over its label. If a label competes with its value, it's wrong.
- Nav section labels: smaller than items, muted, generous top margin. They whisper.

## 2. Elevation logic
- Exactly 3 surface steps: page (`bg-background`) → card (`bg-surface`) → sub-card
  (`bg-surface-raised`). Each step is ONE token lighter.
- Every card: `rounded` (4px — tight/precise reads more premium; NOT rounded-md/lg) + a SUBTLE 1px border
  `border-border-faint` (the quiet 0.04 hairline), NOT the stronger `border-border` (that one
  is for controls + table row/header dividers only). Obvious card outlines read as cheap.
  No shadows as the primary elevation cue on dark surfaces — borders + background steps do the work.
- Sub-cards (stat rows, mini-cards) sit on `bg-surface-raised` with a tighter radius than
  the parent. Never the same background as the parent card.
- Modals/dialogs: floating panel = `bg-surface-raised border border-border rounded` + `p-5`, NO heavy
  shadow (`shadow-xl` etc.). Scrim = `bg-background/70` (or `bg-black/40..50`), never a hard black.
- NEVER: gradients on surfaces, glassmorphism, blur, glow on containers, double borders.

## 3. Spacing is rhythmic, not eyeballed
- ONE padding value for all card interiors: `p-5`. ONE gap value for all grid gutters: `gap-3`.
  These never vary per-card.
- Related items (label + value) sit tight (4–8px). Unrelated blocks separate wide (20–24px,
  `gap-5`/`gap-6`). The contrast between tight and wide IS the design.
- Page-level section stacks (stat row → toolbar → table → …) use `space-y-6` (24px) so the
  bands breathe — NOT `space-y-3`, which crams unrelated sections together. Grid gutters
  *within* a row stay `gap-3`.
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
  (`border-dashed border-border` / `divide-dashed divide-border`). EXCEPTION: data
  tables use solid 1px hairlines via the Table primitive (see "Data tables" below).
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

## Data tables — use the shared primitive (never a bespoke `<table>`)

Exemplar: `src/app/(dashboard)/finance/expenses/page.tsx`. Primitive:
`src/components/ui/Table` (`Table/THead/TBody/TR/TH/TD/Num`). Status pill = the `Badge`
primitive (quiet dot, muted text, subtle bg).

- **Structure**: toolbar → header → body rows → (footer). Table sits flush in a
  `bg-surface border border-border-faint rounded overflow-x-auto` container — NO inner padding,
  NO card-within-table framing, NO title bar inside the table.
- **Toolbar**: left = result count (`text-xs text-subtle`) + filters + bulk actions; right =
  search. All controls same height (`h-8`), quiet/bordered, small leading icon. NO filled/primary
  buttons in the toolbar (create/export are quiet bordered too).
- **Header row**: the QUIETEST text — sentence case, regular weight, `text-subtle`. Never
  bold/uppercase/accent. One 1px solid bottom border (`THead` handles it). No sort arrows unless active.
- **Body rows**: one generous height (~52px, `TD` handles it), solid 1px low-opacity bottom
  border, NO zebra. Hover = one elevation step (`hover:bg-surface-raised`), full row. Middle-aligned,
  single-line, truncate — never wrap.
- **Cells**: ONE identity column gets `text-foreground`; every other column `text-muted`.
  Money/dates/categories = plain muted text (NO colour, NO badges, NO leading icons, NO coloured
  money). Status = the ONLY colour: a `Badge` pill (all statuses same shape, dot carries the colour).
  Person = small circular avatar + muted name.
- **Forbidden**: zebra, vertical column borders, bold cells, coloured money, category badges,
  sparklines/progress/charts in cells, mixed row heights, wrapped cells, illustration empty states
  (muted line + one quiet action only).

## Self-check before completing ANY UI task
1. Did I introduce any literal value? → replace with token.
2. Do all cards share identical padding (`p-5`), radius (`rounded-lg`), border (`border-border`)?
3. Squint test: value loudest, label quietest, one accent.
4. Are all repeated atoms the same component?
5. Did the chart library leak any default styling?
