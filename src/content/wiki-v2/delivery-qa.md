---
title: QA checklist
section: Delivery
subsection: Testing & QA
order: 641
---

Every project gets QA'd before it ships. Not optional. The bar isn't "the code runs," it's "a customer wouldn't notice the seam between this and the rest of the site."

> **Before checking any box on this list, open the page on a phone and a laptop as a customer would. Click every button. Scroll the whole page. Try to buy something. If anything looks off, feels off, or doesn't work, fix it before the project moves forward.**

## Common sense first

Use the page like a customer. This isn't about second-guessing design decisions, it's confirming the build hasn't introduced visual or functional issues.

### Visual

- [ ] All images sharp, no blur, pixelation, or stretching
- [ ] Text renders at correct sizes from Figma
- [ ] No layout jumping on load (CLS)
- [ ] The page looks finished, nothing placeholder or half-built

### Scroll & navigation

- [ ] Scroll the entire page on desktop AND mobile, nothing overlapping or out of order
- [ ] Carousels slide, swipe, and arrow-navigate on both devices
- [ ] Anchor links scroll to the right section
- [ ] Sticky elements don't cover important content

### Interactions

- [ ] Every button clicked and confirmed working, no dead buttons
- [ ] Hover states on all clickable elements
- [ ] Accordions, tabs, modals open AND close (including X button)
- [ ] Videos play, autoplay confirmed, Low Power Mode handled gracefully

### Buying flow

- [ ] Add to cart, correct product / variant / price
- [ ] Cart updates on quantity change and item removal
- [ ] Proceed to checkout, correct page with right items
- [ ] Subscription option tested end to end if applicable

## File naming & structure

- [ ] All custom files prefixed `el-` (sections, snippets, assets)
- [ ] Kebab-case filenames, no camelCase / snake_case
- [ ] Names describe function, not content (`el-hero-banner` not `el-section1`)
- [ ] Section files under 400 lines, snippet files under 200
- [ ] Repeated code extracted to shared snippets

## Schema settings

- [ ] Clear, human-readable labels, no jargon or code terms
- [ ] `info` text on settings with constraints (dimensions, character limits)
- [ ] Image pickers note recommended dimensions
- [ ] Settings order: Content → Design → Layout → Mobile → Advanced
- [ ] Desktop and mobile spacing settings provided separately
- [ ] `custom_id` and `custom_class` fields in Advanced
- [ ] All settings self-explanatory to a non-developer client
- [ ] Section works with all defaults out of the box

## Code quality

### Liquid

- [ ] snake_case variables with descriptive names
- [ ] Early returns to avoid deep nesting
- [ ] No deprecated tags or filters
- [ ] Metafield references have fallbacks for empty values

### CSS

- [ ] BEM methodology (`.block__element--modifier`)
- [ ] `el-` prefix on generic classes to avoid theme conflicts
- [ ] Scoped to `.section-{{ section.id }}`
- [ ] No overly broad selectors (no naked `h1 {}`, `p {}`)
- [ ] No `!important` unless documented

### JavaScript

- [ ] No jQuery, vanilla JS or Shopify built-ins only
- [ ] Configuration via `data-` attributes, not hardcoded
- [ ] Event delegation instead of per-element listeners
- [ ] No duplicate scripts loading

## Images & media

- [ ] Only ONE image per page has `fetchpriority="high"` (hero / above-fold)
- [ ] Hero: `loading: 'eager'`. All others: `loading: 'lazy'`
- [ ] Responsive `widths` and `sizes` attributes on all images
- [ ] Shopify `image_url` and `image_tag` filters used, no raw `<img>` with hardcoded URLs
- [ ] Every image has `alt` attribute (decorative = `alt=""`)
- [ ] Images compressed before upload
- [ ] Videos load and play correctly, don't block page load

## Design fidelity

- [ ] Every section compared side-by-side against latest Figma
- [ ] Spacing, padding, margins match Figma dev mode
- [ ] Colour hex values match exactly
- [ ] Correct fonts loaded, no demo or fallback fonts visible
- [ ] Heading hierarchy semantic (H1 → H2 → H3)
- [ ] Hover, active, focus states use correct colours

## Responsive & cross-browser

| Breakpoint | What to check |
| --- | --- |
| **Desktop** (1440px+) | Layout matches Figma, max-width prevents ultra-wide stretching |
| **Tablet** (768-1024px) | Grid reflows, navigation works, no horizontal overflow |
| **Mobile** (375-428px) | Tested on actual viewport, touch targets ≥44x44px, no horizontal scroll, form inputs ≥16px font-size to avoid iOS zoom |

- [ ] Tested in Chrome, Safari (critical for iOS), Firefox
- [ ] Flexbox and Grid render correctly across browsers

## PDP

- [ ] Variants display correctly, update price / image / availability / ATC
- [ ] Sold-out variants visually indicated and non-purchasable
- [ ] Variant URLs update (shareable)
- [ ] Title, description, price match Shopify admin
- [ ] ATC works from every location (PDP, quick add, upsells, bundles)
- [ ] Success feedback shown, button disables during submission

## Cart & checkout

- [ ] Cart drawer correct product, variant, image, price, quantity
- [ ] Quantity update recalculates price
- [ ] Subtotal correct, discount codes apply, free shipping threshold updates
- [ ] Checkout button works, cart data carries through, no broken redirects

## Performance

- [ ] PageSpeed Insights run, score recorded
- [ ] LCP under 2.5s, CLS under 0.1
- [ ] No duplicate scripts, custom JS minified, no unused CSS
- [ ] No render-blocking third-party scripts
- [ ] Zero JavaScript errors in console
- [ ] No 404s for assets, no mixed-content warnings

## Accessibility

- [ ] Semantic HTML (not `div` for everything)
- [ ] All interactive elements keyboard accessible (Tab, Enter, Escape)
- [ ] Focus states visible
- [ ] Colour contrast WCAG AA
- [ ] Form inputs have associated labels
- [ ] Icon-only buttons have `aria-label`

## Content & copy

- [ ] No placeholder text (lorem ipsum, TODO, sample data)
- [ ] All copy matches client / PM content or Figma
- [ ] No spelling or grammar errors
- [ ] Legal / policy links correct
- [ ] Copyright year current
- [ ] Contact info correct

## Theme & deployment

- [ ] Working on a duplicate of the live theme, never directly on live
- [ ] Theme settings not accidentally changed
- [ ] Sections rearrangeable in Theme Editor, blocks work when added / removed / reordered
- [ ] Final side-by-side comparison done, all QA feedback addressed
- [ ] Live site verified immediately after publishing
- [ ] Cart flow tested on live, other pages confirmed not broken

## Logging

- [ ] Daily update posted in `#dev` channel
- [ ] Errors logged with problem AND solution
- [ ] Final status posted when ready for QA
- [ ] Blockers clearly communicated
