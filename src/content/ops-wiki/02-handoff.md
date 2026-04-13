# Design to Dev Handoff

## What "Ready for Dev" Means

A design is ready for dev when a developer can build it without asking the designer a single question. That is the standard. If the dev has to guess, the handoff was incomplete.

**A design is NOT ready for dev if:**
- Mobile designs are missing or incomplete
- Copy has placeholder text
- Hover/interaction states are undocumented
- Assets haven't been exported
- Spacing is inconsistent or not annotated
- The client hasn't approved it

## Handoff Checklist

Run through this list before moving any design to the dev queue.

### Layout & Responsive
- [ ] Desktop design complete (1440px viewport, 1200px max-content)
- [ ] Mobile design complete (375px viewport)
- [ ] Tablet breakpoint noted if layout changes significantly (768px)
- [ ] Section padding and spacing documented
- [ ] Max-widths for content containers specified
- [ ] Grid column counts and gaps specified for each breakpoint

### Copy & Content
- [ ] All copy is final and client-approved
- [ ] Heading hierarchy is correct (H1 once, H2 for sections, H3 for sub-sections)
- [ ] CTA button text is final
- [ ] Legal/disclaimer text included where needed
- [ ] Alt text written for all images

### Visual Specs
- [ ] Colour values reference the design system (list hex codes in handoff notes)
- [ ] Font families, weights, and sizes documented
- [ ] Line heights and letter spacing specified
- [ ] Border radius values noted
- [ ] Shadow values noted (if any)
- [ ] Opacity values noted (if any)

### Interactions & States
- [ ] Button hover states designed
- [ ] Link hover styles specified
- [ ] Form field states: default, focus, error, success
- [ ] Loading states (if applicable)
- [ ] Scroll-triggered animations described (what animates, direction, timing)
- [ ] Mobile menu behaviour documented

### Assets
- [ ] All images exported (WebP preferred, PNG fallback)
- [ ] Icons exported as SVG
- [ ] Logo files provided (SVG + PNG)
- [ ] Favicon provided (32x32 PNG + SVG)
- [ ] OG image provided (1200x630)

## Annotation Standards

Use a consistent annotation style in the Figma handoff page:

### Spacing Annotations
- Red lines with pixel values for padding and margins
- Use the Figma "Measure" plugin or built-in spacing indicators
- Call out any non-standard spacing explicitly

### Interaction Annotations
Use sticky notes or comment blocks with this format:

```
INTERACTION: [Element Name]
Trigger: Hover / Click / Scroll
Behaviour: [What happens]
Duration: [Timing in ms]
Easing: [ease, ease-in-out, etc.]
```

Example:
```
INTERACTION: Hero CTA Button
Trigger: Hover
Behaviour: Background shifts from #1A1A1A to #2D2D2D, scale 1.02
Duration: 200ms
Easing: ease-in-out
```

### Responsive Annotations
For sections that change layout between breakpoints, add a note:

```
RESPONSIVE: Feature Grid
Desktop (>1024px): 3 columns, 24px gap
Tablet (768-1024px): 2 columns, 20px gap
Mobile (<768px): 1 column, 16px gap, stack vertically
```

## Asset Export Settings

| Asset Type | Format | Size | Naming |
|-----------|--------|------|--------|
| Photos/Product Images | WebP | 2x (retina) | `section-description.webp` e.g., `hero-lifestyle.webp` |
| Icons | SVG | 1x | `icon-name.svg` e.g., `icon-shipping.svg` |
| Logos | SVG + PNG | SVG at native, PNG at 2x | `logo-primary.svg`, `logo-white.svg` |
| Backgrounds | WebP | Match section width at 2x | `bg-section-name.webp` |
| Favicon | PNG + SVG | 32x32, 180x180 (apple-touch) | `favicon.png`, `favicon.svg` |
| OG Image | PNG | 1200x630 | `og-image.png` |

### Naming Rules
- Lowercase, hyphen-separated
- Descriptive: `hero-product-shot.webp` not `image1.webp`
- Include section context: `testimonials-avatar-sarah.webp`
- No spaces, no special characters

## Common Handoff Mistakes

### 1. Missing Mobile Design
"It's the same but stacked" is not a mobile design. The developer needs to see exactly how sections reorder, what copy gets truncated, how images resize, and where CTAs land on mobile.

### 2. Inconsistent Spacing
Using `17px` here, `23px` there, `31px` somewhere else. Stick to the 8px grid. If a developer sees inconsistent values, they'll either guess or ask — both waste time.

### 3. No Hover States
Every interactive element needs a hover state. Buttons, links, cards, navigation items. If you didn't design it, the developer will either skip it or make something up.

### 4. Placeholder Copy
"Lorem ipsum" in a handoff is an instant rejection. Send it back to the designer. Copy must be final and approved.

### 5. Unexported Assets
"The images are in the Figma file" is not a handoff. Export them, name them properly, and put them in the shared assets folder or attach them to the task.

### 6. Undocumented Animations
Saying "this should animate in" without specifying direction, duration, easing, and trigger is useless. Document every animation.

> **Rule of thumb:** If you hand off a design and the developer messages you with a question within the first hour, the handoff was incomplete. Track these questions — they reveal gaps in your process.
