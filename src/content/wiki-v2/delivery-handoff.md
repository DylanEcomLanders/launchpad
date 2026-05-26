---
title: Handoff to dev
section: Delivery
subsection: Design
order: 613
---

A design is ready for dev when a developer can build it without asking the designer a single question. That's the bar. If the dev has to guess, the handoff was incomplete.

> **Rule of thumb: if a developer messages with a question within the first hour of receiving the handoff, the handoff was incomplete. Track those questions, they reveal gaps in the process.**

## A design is NOT ready if

- Mobile designs are missing or incomplete
- Copy has placeholder text
- Hover or interaction states are undocumented
- Assets haven't been exported
- Spacing is inconsistent or not annotated
- The client hasn't approved it

## Handoff checklist

### Layout & responsive

- [ ] Desktop complete (1440px viewport, 1200px max-content)
- [ ] Mobile complete (375px viewport)
- [ ] Tablet noted if layout shifts significantly (768px)
- [ ] Section padding and spacing documented
- [ ] Max-widths specified for content containers
- [ ] Grid columns and gaps specified per breakpoint

### Copy & content

- [ ] All copy final and client-approved
- [ ] Heading hierarchy correct (H1 once, H2 sections, H3 sub)
- [ ] CTA button text final
- [ ] Legal / disclaimer text included where needed
- [ ] Alt text written for all images

### Visual specs

- [ ] Colour values reference the design system (hex codes in notes)
- [ ] Font families, weights, sizes documented
- [ ] Line heights and letter spacing specified
- [ ] Border radius values noted
- [ ] Shadow values noted
- [ ] Opacity values noted

### Interactions & states

- [ ] Button hover states designed
- [ ] Link hover styles specified
- [ ] Form field states: default, focus, error, success
- [ ] Loading states (if applicable)
- [ ] Scroll-triggered animations described (what, direction, timing)
- [ ] Mobile menu behaviour documented

### Assets

- [ ] All images exported (WebP preferred, PNG fallback)
- [ ] Icons exported as SVG
- [ ] Logo files (SVG + PNG)
- [ ] Favicon (32x32 PNG + SVG)
- [ ] OG image (1200x630)

## Annotation format

Use consistent annotation in the Figma handoff page.

**Interactions** — sticky notes or comment blocks:

```
INTERACTION: [Element Name]
Trigger: Hover / Click / Scroll
Behaviour: [What happens]
Duration: [Timing in ms]
Easing: [ease, ease-in-out, etc.]
```

**Responsive** — for sections that change between breakpoints:

```
RESPONSIVE: Feature Grid
Desktop (>1024px): 3 columns, 24px gap
Tablet (768-1024px): 2 columns, 20px gap
Mobile (<768px): 1 column, 16px gap, stack vertically
```

## Asset export rules

| Asset | Format | Size | Naming |
| --- | --- | --- | --- |
| Photos / product | WebP | 2x retina | `section-description.webp` |
| Icons | SVG | 1x | `icon-name.svg` |
| Logos | SVG + PNG | SVG native, PNG 2x | `logo-primary.svg`, `logo-white.svg` |
| Backgrounds | WebP | Match section width at 2x | `bg-section-name.webp` |
| Favicon | PNG + SVG | 32x32, 180x180 | `favicon.png`, `favicon.svg` |
| OG image | PNG | 1200x630 | `og-image.png` |

**Naming**: lowercase, hyphen-separated, descriptive. `hero-product-shot.webp` not `image1.webp`. No spaces, no special characters.

## Common mistakes

1. **"It's the same but stacked"** — that's not a mobile design.
2. **Inconsistent spacing** — 17px here, 23px there. Stick to the 8px grid.
3. **No hover states** — every interactive element needs one designed.
4. **Placeholder copy** — Lorem ipsum is an instant rejection. Send it back.
5. **"The images are in the Figma file"** — that's not a handoff. Export and share them.
6. **Undocumented animations** — "this should animate in" is useless without direction, duration, easing, trigger.
