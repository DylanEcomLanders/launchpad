# Figma Workflow & File Structure

## File Structure

All projects live in the **Ecom Landers** Figma team workspace. Never work in personal drafts — everything must be in the shared space from day one.

```
Ecom Landers (Team)
├── Active Projects/
│   ├── [ClientName] — [ProjectType] — [Version]
│   └── ...
├── Completed/
│   └── [ClientName] — [ProjectType] — FINAL
├── Templates/
│   ├── Landing Page Template
│   ├── Homepage Template
│   └── Collection Page Template
└── Component Library (published)
```

### Project File Internal Structure

Each project file should contain these pages (tabs):

```
Page 1: Cover (project name, client, status, date)
Page 2: Brief & References (embedded brief, moodboard, competitor screenshots)
Page 3: Wireframes — Desktop
Page 4: Wireframes — Mobile
Page 5: Design — Desktop
Page 6: Design — Mobile
Page 7: Dev Handoff (annotated, exported assets, specs)
```

> **Do not** put desktop and mobile on the same page. Scrolling sideways to compare wastes time and causes confusion during review.

## Naming Conventions

### Pages
Use clear, scannable names. Prefix with the phase:
- `Wireframes — Desktop`
- `Design — Mobile`
- `Dev Handoff`

### Frames
Name every frame descriptively. Never leave default names like `Frame 847`.

```
Section / Hero — Desktop
Section / Social Proof — Desktop
Section / Feature Grid — Mobile
Component / CTA Button — Primary
```

Use `/` as a separator for grouping in the layers panel.

### Components
Follow this pattern:
```
[Category] / [Component] / [Variant]
```
Examples:
- `Button / Primary / Default`
- `Button / Primary / Hover`
- `Card / Testimonial / With Photo`
- `Section / Hero / Centered`
- `Section / Hero / Split`

## Component Usage

### Rules
1. **Always use library components.** If the component exists in the shared library, use it. Do not detach and modify locally unless you have a genuine reason
2. **If you need a new component**, build it properly with variants and auto-layout, then propose it for the library
3. **Never detach a component to make a "quick fix."** Override the instance properties instead. Detached components break updates across all projects
4. **Colour and text styles must come from the library.** No hardcoded hex values. No manually set font sizes. Use the defined styles

### When to Create a New Component
- You've used the same pattern in 3+ projects
- It has clear variants (e.g., with/without image, light/dark)
- It's been reviewed and approved by the design lead

## Auto-Layout Rules

Every frame should use auto-layout. This is non-negotiable for handoff quality.

### Standards
- **Sections:** Vertical auto-layout, padding `60px` top/bottom (desktop), `40px` (mobile)
- **Content containers:** Max width `1200px`, centred, horizontal padding `24px` (mobile), `40px` (tablet), `80px` (desktop)
- **Card grids:** Use auto-layout with wrap for responsive behaviour
- **Spacing between elements:** Use gap, not manual spacing. Consistent gaps: `8px`, `16px`, `24px`, `32px`, `48px`, `64px`
- **Text blocks:** Set to fill container width, not fixed width

### Common Mistakes
- Fixed-width frames that break when content changes
- Manual spacing between elements instead of gap
- Nested frames without auto-layout (makes responsive specs impossible)
- Using absolute positioning when auto-layout would work

## Handoff Prep

Before marking a design as ready for dev, complete these steps in Figma:

- [ ] All layers are named properly (no `Frame 123`, `Group 4`, `Rectangle 82`)
- [ ] Auto-layout is applied to all sections
- [ ] Colours reference the shared style library
- [ ] Text uses defined text styles
- [ ] Spacing values are clean (no `17px` — round to the nearest `8px` increment)
- [ ] Component overrides are clean (no broken instances)
- [ ] Create a dedicated `Dev Handoff` page with:
  - Annotated spacing and layout specs
  - Interaction notes (hover states, animations, scroll behaviour)
  - Asset export slices (images, icons, SVGs)
  - A section-by-section breakdown with notes for the developer
- [ ] All exportable assets are marked with export settings (SVG for icons, WebP/PNG for images)

## Version Control

### Rules
1. **Never overwrite a version.** When making significant changes, duplicate the page and rename with the new version number
2. Use the format: `Design — Desktop — v1`, `Design — Desktop — v2`
3. **Keep old versions** in the file. Move them to the end of the page list and prefix with `[OLD]`
4. Add a version note on the Cover page listing what changed in each version
5. **Before a client call**, always duplicate the current state so you have a clean rollback point

### Version Log Example (on Cover page)

```
v1 — 2026-03-10 — Initial design
v2 — 2026-03-12 — Client feedback round 1 (updated hero, swapped testimonial layout)
v3 — 2026-03-14 — Final approved version
```

> **The only "final" is the one the client signed off on.** Label it clearly and lock the page.
