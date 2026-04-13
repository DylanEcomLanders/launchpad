# QA Checklist & Browser Testing

## Pre-QA Requirements

Before starting QA, confirm:

- [ ] Build is complete — the developer has marked all sections as done
- [ ] The build matches the approved design (developer has self-checked)
- [ ] All content is real and final (no placeholder text, no broken images)
- [ ] The page is accessible via a preview link or dev environment

> **QA is a separate step from building.** The developer who built it should not be the only person who QAs it. Fresh eyes catch things the builder has gone blind to.

## Visual QA

### Pixel Accuracy
- [ ] Layout matches the Figma design within 2-4px tolerance
- [ ] Typography matches spec (font family, weight, size, line height, colour)
- [ ] Colours match the design system exactly (check hex values, don't eyeball)
- [ ] Border radius values are correct
- [ ] Shadows and opacity match design

### Spacing & Alignment
- [ ] Section padding matches the handoff spec
- [ ] Element spacing is consistent throughout the page
- [ ] Content is properly centred where intended
- [ ] Grid columns are evenly spaced
- [ ] No unexpected overflow or content clipping

### Images & Media
- [ ] All images load correctly (no broken images)
- [ ] Images are sharp (not blurry or pixelated)
- [ ] Images are properly cropped and positioned
- [ ] Alt text is present on all images
- [ ] Video plays correctly (if applicable)
- [ ] Lazy loading works (images below fold load on scroll)

### Typography
- [ ] Heading hierarchy is correct (one H1 per page, H2 for sections, H3 for sub-sections)
- [ ] Font loading works (no flash of unstyled text or layout shift)
- [ ] Text is readable at all breakpoints (minimum 16px body text on mobile)
- [ ] Line lengths are comfortable (50-75 characters per line on desktop)
- [ ] No orphaned words on headings (single word on the last line)

## Functional QA

### Links & Navigation
- [ ] All links work and go to the correct destination
- [ ] No dead links or 404s
- [ ] External links open in a new tab
- [ ] Internal links use relative paths
- [ ] Anchor links scroll to the correct section smoothly
- [ ] Navigation menu works on all devices
- [ ] Back button behaviour is correct

### Forms
- [ ] All form fields accept input
- [ ] Required fields show validation errors when empty
- [ ] Email fields validate email format
- [ ] Form submits successfully
- [ ] Success/confirmation message displays after submission
- [ ] Error states are clear and helpful
- [ ] Form works with autofill
- [ ] Tab order is logical (fields in visual order)

### Interactive Elements
- [ ] All buttons have hover states
- [ ] Dropdown menus open and close correctly
- [ ] Accordion/FAQ items toggle properly (only one open at a time, or all — match the design)
- [ ] Carousels/sliders work with swipe (mobile) and arrows (desktop)
- [ ] Modal/popup opens, closes, and traps focus correctly
- [ ] Scroll-triggered animations fire at the right time
- [ ] Animations respect `prefers-reduced-motion`

### Ecommerce-Specific
- [ ] Add-to-cart works and updates the cart
- [ ] Variant selection works (size, colour, etc.)
- [ ] Price displays correctly
- [ ] Sale/compare-at prices show correctly
- [ ] Quantity selector works
- [ ] Cart drawer/page functions properly
- [ ] Checkout link works

## Responsive Testing

### Breakpoints to Test

| Breakpoint | Viewport | Device Reference |
|-----------|----------|-----------------|
| Mobile S | 320px | iPhone SE |
| Mobile M | 375px | iPhone 12/13/14 |
| Mobile L | 414px | iPhone Plus/Max |
| Tablet | 768px | iPad |
| Tablet L | 1024px | iPad Pro |
| Desktop | 1280px | Standard laptop |
| Desktop L | 1440px | Design reference |
| Desktop XL | 1920px | Large monitor |

### What to Check at Each Breakpoint
- [ ] No horizontal scrollbar appears
- [ ] Text is readable without zooming
- [ ] Images resize properly
- [ ] Grid layouts stack or reflow correctly
- [ ] CTAs are easily tappable on touch devices (minimum 44x44px)
- [ ] Navigation collapses to mobile menu at the right breakpoint
- [ ] No content is hidden or cut off
- [ ] Modals and overlays are usable on mobile

## Browser Testing

### Required Browsers

| Browser | Version | Priority |
|---------|---------|----------|
| Chrome | Latest | Critical |
| Safari | Latest | Critical |
| Firefox | Latest | High |
| Edge | Latest | Medium |
| Safari iOS | Latest | Critical |
| Chrome Android | Latest | High |

### What to Check Per Browser
- [ ] Page renders correctly (no layout breaks)
- [ ] Fonts load correctly
- [ ] Animations play smoothly
- [ ] JavaScript functionality works (no console errors)
- [ ] Forms work
- [ ] CSS custom properties / modern CSS features work

### Known Browser Quirks
- **Safari:** `position: sticky` can be flaky inside `overflow: hidden` containers
- **Safari iOS:** 100vh includes the URL bar — use `100dvh` or a JS fallback
- **Safari:** Smooth scrolling needs `-webkit-overflow-scrolling: touch`
- **Firefox:** Font rendering can look heavier — check font weights
- **Edge:** Generally follows Chrome behaviour (same engine) — test but rarely an issue

## Performance Check

### Core Web Vitals

| Metric | Target | Tool |
|--------|--------|------|
| LCP (Largest Contentful Paint) | Under 2.5s | PageSpeed Insights |
| CLS (Cumulative Layout Shift) | Under 0.1 | PageSpeed Insights |
| FID (First Input Delay) / INP | Under 100ms / 200ms | PageSpeed Insights |

### Performance Checklist
- [ ] Run PageSpeed Insights on mobile and desktop
- [ ] LCP element identified and optimised (usually the hero image)
- [ ] No layout shifts visible during page load
- [ ] Total page weight under 2MB (ideally under 1.5MB)
- [ ] No render-blocking JavaScript
- [ ] Images are in WebP format and appropriately sized
- [ ] Third-party scripts are loaded async/deferred

## Accessibility Basics

- [ ] All images have meaningful alt text (or `alt=""` for decorative images)
- [ ] Page can be navigated with keyboard only (Tab, Enter, Escape)
- [ ] Focus states are visible on all interactive elements
- [ ] Colour contrast passes WCAG AA (4.5:1 for text, 3:1 for large text)
- [ ] Form inputs have associated labels
- [ ] ARIA attributes used correctly (buttons, modals, dropdowns)
- [ ] Page has a logical heading structure
- [ ] Skip-to-content link present (if applicable)

## Sign-Off Process

### Internal QA Sign-Off
1. QA tester runs through the full checklist above
2. Issues logged as tasks with screenshots and device/browser info
3. Developer fixes all Critical and High issues
4. QA re-tests fixed items
5. QA lead marks the build as "QA Approved"

### Issue Severity Levels

| Severity | Definition | Action |
|----------|-----------|--------|
| Critical | Page broken, checkout broken, data loss | Fix immediately before any client review |
| High | Visible layout issue, broken interaction, accessibility failure | Fix before client review |
| Medium | Minor visual inconsistency, non-critical browser issue | Fix before go-live |
| Low | Cosmetic, nice-to-have polish | Fix if time allows |

> **Never send a build to a client that has Critical or High QA issues.** You only get one chance to make a first impression on a deliverable. A buggy preview undermines client confidence and makes everything harder.
