---
title: Build process
section: Delivery
subsection: Development
order: 620
---

Every build follows the same phased approach. Mobile-first, test as we go, no shipping without QA. Standards owned by the Head Developer.

## Tech stack

| Layer | Technology |
| --- | --- |
| Platform | Shopify (Online Store 2.0) |
| Templating | Liquid |
| Styling | CSS, vanilla, scoped per section |
| Interactions | Vanilla JavaScript (no jQuery in new code) |
| Build tools | Shopify CLI |
| Version control | Git (GitHub) |
| Hosting | Shopify CDN |

**Not used**: CSS frameworks (Bootstrap, Tailwind) in client themes, heavy JS libraries (React, Vue) in theme code, CSS preprocessors unless the existing theme uses them.

## Code standards

### CSS

- **BEM convention** for all custom classes: `.block__element--modifier`
- **Mobile-first media queries** — base styles are mobile, layer up with `min-width`
- **No `!important`** unless overriding third-party app styles (document why)
- **CSS custom properties** for colours and spacing that repeat
- **No inline styles** in Liquid templates

```css
.hero {}
.hero__title {}
.hero__cta {}
.hero__cta--secondary {}
```

### JavaScript

- Vanilla JS only, no jQuery
- Use `defer` on all script tags
- Keep JS scoped to the section, don't pollute global namespace
- Event delegation where possible
- All interactive elements keyboard-accessible

### Liquid

- Section schemas for all merchant-editable content
- Never hardcode text — schema settings or translation keys
- `{% comment %}` blocks to explain non-obvious logic
- Keep Liquid logic simple. Complex logic moves to JS.

## Build phases

| Phase | Days | Output |
| --- | --- | --- |
| 1. Setup | Day 1 | Dev store, CLI configured, branch created, handoff reviewed, sections estimated, gaps flagged |
| 2. Section build | Days 2-4 | Sections built top-to-bottom (hero first, footer last). Mobile layout first. Schema for all editable content. Each section tested individually. |
| 3. Responsive polish | Day 5 | Full page tested at 375px / 768px / 1440px. Spacing, typography, image cropping verified. |
| 4. Interactions & animation | Day 5-6 | Hover states, scroll-triggered animations (subtle), respect `prefers-reduced-motion`. |
| 5. QA & handoff | Day 6-7 | Full QA checklist, internal sign-off, preview link, Loom walkthrough if needed. |

## File organisation

All custom sections prefixed `el-` (Ecomlanders) to distinguish from theme defaults.

```
sections/
├── el-hero.liquid
├── el-features.liquid
└── el-cta-banner.liquid

snippets/
├── el-icon.liquid
└── el-responsive-image.liquid

assets/
├── el-sections.css
└── el-animations.js
```

## Git workflow

**Branch naming**: `feature/[client-name]-[project-type]`

```
feature/hydra-landing-page
feature/glow-homepage-redesign
```

**Commit messages** — clear and descriptive:

```
Add hero section with video background
Fix testimonial card spacing on mobile
Update CTA colours per client feedback round 2
```

Not `fix stuff`, `updates`, `wip`.

**PR process**: PR against the project branch (not main). Description + screenshot or Loom. Request review from another developer. Merge after approval.

## Naming conventions

**CSS classes**: `.el-[section]__[element]--[modifier]`

```
.el-hero__title
.el-hero__cta--secondary
.el-testimonials__card--featured
```

**Schema settings**: `[section]_[setting_name]`

```
hero_heading
hero_subheading
hero_background_image
```
