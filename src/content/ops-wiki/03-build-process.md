# Build Process & Standards

## Overview

Every build follows the same phased approach. This keeps quality consistent and ensures nothing gets missed. We build mobile-first, test as we go, and never ship without QA.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Platform | Shopify (Online Store 2.0) |
| Templating | Liquid |
| Styling | CSS (vanilla, scoped per section) |
| Interactions | Vanilla JavaScript (no jQuery unless theme requires it) |
| Build Tools | Shopify CLI, Theme Kit (legacy projects) |
| Version Control | Git (GitHub) |
| Hosting | Shopify CDN |

### What We Don't Use
- CSS frameworks (Bootstrap, Tailwind) in client themes — keep it native
- Heavy JS libraries — no React, no Vue in theme code
- CSS preprocessors unless the existing theme uses them

## Code Standards

### CSS
- **BEM naming convention** for all custom CSS classes
  ```css
  .hero {}
  .hero__title {}
  .hero__cta {}
  .hero__cta--secondary {}
  ```
- **Mobile-first media queries** — base styles are mobile, layer up with `min-width`
  ```css
  .feature-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
  }

  @media (min-width: 768px) {
    .feature-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 24px;
    }
  }

  @media (min-width: 1024px) {
    .feature-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }
  ```
- **No `!important`** unless overriding third-party app styles (and document why)
- **CSS custom properties** for colours and spacing that repeat across sections
- **No inline styles** in Liquid templates

### JavaScript
- Vanilla JS only. No jQuery for new code
- Use `defer` on all script tags
- Keep JS scoped to the section — don't pollute the global namespace
- Use event delegation where possible
- All interactive elements must be keyboard-accessible

### Liquid
- Use section schemas for all merchant-editable content
- Never hardcode text — use schema settings or translation keys
- Use `{% comment %}` blocks to explain non-obvious logic
- Keep Liquid logic simple. If it's getting complex, move logic to JS

### Performance
- Lazy load all images below the fold
- Use `loading="lazy"` and `fetchpriority="high"` appropriately
- Keep section CSS and JS inlined in the section file (avoids extra HTTP requests)
- Compress all images before uploading to Shopify

## Build Phases

### Phase 1: Setup (Day 1)
- [ ] Create development store or duplicate live theme
- [ ] Set up local development with Shopify CLI
- [ ] Create a new Git branch: `feature/[client]-[project]`
- [ ] Review the handoff document thoroughly
- [ ] List all sections to build and estimate hours
- [ ] Flag any handoff gaps to the designer immediately

### Phase 2: Section Build (Days 2–4)
- [ ] Build sections top-to-bottom (hero first, footer last)
- [ ] Build mobile layout first, then layer on tablet and desktop
- [ ] Use schema settings for all editable content
- [ ] Apply proper heading hierarchy (H1 → H2 → H3)
- [ ] Add section padding controls to schema (top/bottom padding)
- [ ] Test each section individually before moving to the next

### Phase 3: Responsive Polish (Day 5)
- [ ] Test full page flow on mobile (375px)
- [ ] Test full page flow on tablet (768px)
- [ ] Test full page flow on desktop (1440px)
- [ ] Fix any spacing inconsistencies
- [ ] Verify typography scales correctly
- [ ] Check image sizing and cropping at all breakpoints

### Phase 4: Interactions & Animation (Day 5–6)
- [ ] Add hover states to all interactive elements
- [ ] Implement scroll-triggered animations (keep it subtle)
- [ ] Add any custom interactions from the handoff doc
- [ ] Test animations on low-powered devices
- [ ] Ensure all animations respect `prefers-reduced-motion`

### Phase 5: QA & Handoff (Day 6–7)
- [ ] Run full QA checklist (see `12-qa-checklist.md`)
- [ ] Fix all issues found in QA
- [ ] Get internal sign-off
- [ ] Prepare preview link for client
- [ ] Record a Loom walkthrough if needed

## File Organisation

### Section Files
```
sections/
├── el-hero.liquid
├── el-features.liquid
├── el-testimonials.liquid
├── el-faq.liquid
└── el-cta-banner.liquid
```

Prefix all custom sections with `el-` (Ecom Landers) to distinguish from theme defaults.

### Snippet Files
```
snippets/
├── el-icon.liquid
├── el-responsive-image.liquid
└── el-star-rating.liquid
```

### Asset Files
```
assets/
├── el-sections.css (shared styles if needed)
├── el-animations.js
└── images uploaded via Shopify admin
```

## Git Workflow

### Branch Naming
```
feature/[client-name]-[project-type]
```
Examples:
- `feature/hydra-landing-page`
- `feature/glow-homepage-redesign`

### Commit Messages
Use clear, descriptive commit messages:
```
Add hero section with video background
Fix testimonial card spacing on mobile
Update CTA colours per client feedback round 2
```

Not:
```
fix stuff
updates
wip
```

### Pull Request Process
1. Create PR against the project branch (not main)
2. Add description of what was built
3. Include a screenshot or Loom of the build
4. Request review from another developer
5. Merge after approval

## Naming Conventions

### CSS Classes
```
.el-[section]__[element]--[modifier]
```
Examples:
- `.el-hero__title`
- `.el-hero__cta--secondary`
- `.el-testimonials__card`
- `.el-testimonials__card--featured`

### Schema Settings
```
[section]_[setting_name]
```
Examples:
- `hero_heading`
- `hero_subheading`
- `hero_cta_text`
- `hero_background_image`

### Section Block Types
```
[descriptive_name]
```
Examples:
- `feature_card`
- `testimonial`
- `faq_item`
