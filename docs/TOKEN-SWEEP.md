# Token sweep spec

Canonical rules for replacing literal colours + gradients/glows with the semantic
design tokens (globals.css) so every internal surface matches the kanban / Linear-clean
language. Applied across the app on the sandbox (staging branch). Exemplar:
`src/app/(dashboard)/tools/throughput/page.tsx` (before/after in git).

## Goal

Chrome (surfaces, borders, text) is fully tokenised and calm. Semantic state
(success/warning/danger) uses tokens, not raw emerald/amber/rose. Gradients, coloured
glows, and drop shadows are removed (flat surfaces only). Category/data-viz hues stay as
their sanctioned tokens. Do NOT restructure into primitives wholesale - this is a colour +
visual-language sweep, not a component refactor. Use a primitive only when it's a trivial
drop-in.

## Chrome mapping (neutral)

| Literal | Token |
| --- | --- |
| `text-white`, `text-gray-50/100/200` (primary text) | `text-foreground` |
| `text-gray-300/400` | `text-muted` |
| `text-gray-500/600` (labels, captions) | `text-subtle` |
| `bg-white`, `bg-gray-950/900`, `bg-black` (cards/panels) | `bg-surface` |
| `bg-gray-800/850` (raised: menus, chips, hover pop) | `bg-surface-raised` |
| page canvas | `bg-background` |
| `border-gray-700/800`, `border-white/[0.04..0.1]`, `ring-white/[0.04]` | `border border-border` |
| faint internal divider | `border-border` (or `border-border-faint` if it must read lighter) |
| `hover:bg-white/[0.02..0.05]`, `hover:bg-gray-800` | `hover:bg-surface-hover` |
| `divide-gray-*` | `divide-border` |
| focus/selected ring | `ring-ring` |

## Semantic mapping (state)

Map by MEANING, not hue. `red/rose` = danger, `green/emerald` = success,
`amber/yellow/orange` = warning, `sky/blue` = info (or `ring` for focus/selection).

| Pattern | Token pattern |
| --- | --- |
| `text-emerald-*` / `text-green-*` | `text-success` |
| `text-rose-*` / `text-red-*` | `text-danger` |
| `text-amber-*` / `text-yellow-*` / `text-orange-*` | `text-warning` |
| `bg-emerald-500/10..20` (soft fill) | `bg-success/10` |
| `bg-rose-500/10..20` | `bg-danger/10` |
| `bg-amber-500/10..20` | `bg-warning/10` |
| `border-emerald-500/30` etc | `border-success/20` (or `ring-success/20`) |
| solid status bar/dot `bg-emerald-500` | `bg-success` (solid) |
| info `text-sky-*` / `text-blue-*` | `text-info` |

## Gradients / glows / shadows -> flat

- `bg-gradient-to-* from-X to-Y` on an icon tile or button -> flat `bg-surface-raised border border-border`
  (neutral) or `bg-{role}/10 text-{role}` (semantic). Drop the gradient.
- Gradient-clip heading text (`bg-gradient-* bg-clip-text text-transparent`) -> plain `text-foreground`.
- Coloured drop shadows / glows (`shadow-[0_8px_24px_rgba(...)]`, `drop-shadow-*` on chrome) -> remove.
- Progress/meter fills that were `bg-gradient-to-r from-X to-Y` -> solid `bg-{role}`.

## KEEP as-is (do not flatten)

- **Category / data-viz hues** already on tokens: `bg-cat-dev`, `bg-cat-design`, status glyph
  colours, pod/phase colours defined in `src/lib/**` constants. Prefer the `Badge` /
  `StatusGlyph` / `Pill` primitives where they already exist.
- **Image/photo overlays**: `bg-black/50..70`, `text-white`, `border-white/20` layered OVER a
  screenshot/photo (e.g. kanban card thumbnails, tackboard). White/black on media is correct.
- **react-pdf documents** (`*-pdf-document.tsx`, `pdf-shared.tsx`) - EXEMPT (react-pdf can't read
  CSS vars).
- **Pitch decks / presentations** (`conversion-pack/presentation.tsx`, `hero-offer/slide-deck.tsx`) -
  EXEMPT (deliberate brand styling).

## Public marketing pages `(public)` + `(proposal)` - LIGHTER TOUCH

These carry the ecomlanders brand (light/airy, lime accent, Inter Tight), NOT the dark internal
mono look. Tokenise **structural neutrals only** (surface/border/text greys -> tokens so they
theme correctly) but **keep intentional brand accents** (lime, brand gradients used as brand, hero
art). Do not flatten a marketing page into the internal grey system. When unsure, leave the brand
accent and tokenise only the surrounding chrome.

## Per-file checklist

1. Replace chrome literals per the table above.
2. Replace semantic literals by meaning.
3. Remove gradients/glows/coloured shadows on chrome; flatten to tokens.
4. Leave category hues, media overlays, brand accents.
5. Keep structure/radii/spacing unchanged - colour + visual-language only.
6. File must still typecheck (`tsc`) and render.
