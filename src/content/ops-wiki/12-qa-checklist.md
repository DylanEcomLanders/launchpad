# Dev QA Checklist — Full Reference

*Every item must be checked before marking a project "Ready for QA" or sending to client.*
*Aligned to: Shopify Development Standards v1.0 (January 2026)*
*Informed by: Recurring issues from Slack channels and client feedback*
*Last updated: April 15, 2026*

---

> **Before checking any box on this list — open the page on a phone and a laptop as a customer would. Click every button. Scroll the whole page. Try to buy something. If anything looks off, feels off, or doesn't work — it needs fixing before the project moves forward.**

## 0. USE THE PAGE (Common Sense Checks)

Start here. Open the page. Use it like a customer. This is not about design decisions — it's about confirming the implementation hasn't introduced visual or functional issues.

### Visual — Does the Implementation Look Right?
- All images render sharp and crisp — nothing blurry, pixelated, or low-res
- No images stretched, squashed, or cropped incorrectly
- Text renders at correct sizes from Figma — no unexpected tiny or large text
- Font sizes consistent across the page — no sections pulling wrong sizes
- No visual glitches, flickering, or layout jumping on load (CLS)
- The page looks finished — nothing placeholder, half-built, or incomplete

### Scrolling & Navigation — Does It Flow?
- Scroll the entire page top to bottom on desktop AND mobile — no sections overlapping, disappearing, or out of order
- Product page images scroll and navigate properly — thumbnails clickable, arrows functional, swipe on mobile
- All carousels/sliders slide, swipe, and arrow-navigate correctly on both desktop and mobile
- Anchor links actually scroll to the correct section — not dead links
- Sticky elements don't cover or block important content while scrolling
- Sticky Add to Cart scrolls back to the bundle/variant selector — not adding a random default variant

### Interactions — Does Everything Function?
- Every button clicked and confirmed working — no dead buttons
- Hover states present — cursor changes to pointer on all clickable elements
- All transitions and animations run smoothly — no jank
- Accordions open AND close. Tabs switch. Modals open AND close (including X button)
- Dropdown menus and filters work on desktop and mobile
- Videos play — autoplay confirmed. Low Power Mode handled gracefully with play button or poster
- Review counts consistent between mobile and desktop

### Buying Flow — Can a Customer Complete a Purchase?
- Add a product to cart — correct product, variant, and price
- Open the cart — correct item with right image, name, price, quantity
- Change the quantity — price updates accordingly
- Remove the item — cart updates immediately
- Proceed to checkout — correct checkout page with right items
- Subscription option tested end to end (if applicable)
- Upsells from cart work correctly (if applicable)

### Edge Cases
- Special characters in product names (&, ', ", accents) display correctly
- Very long titles don't break layout
- Empty states don't show broken or blank areas
- Very long content doesn't overflow containers

### Client Editability
- Editable content uses Theme Editor — not hardcoded in Liquid/JS
- Product images use standard Shopify product media — not metafields unless agreed
- Custom functionality confirmed manageable by client without dev support

---

## 1. FILE NAMING & STRUCTURE

### Agency Prefix
- All custom section files start with `el-` prefix (e.g., `sections/el-hero-banner.liquid`)
- All custom snippet files start with `el-` prefix
- All custom asset files start with `el-` prefix
- No files without `el-` prefix that could be confused with theme/client/other agency files

### Naming Conventions
- Kebab-case filenames — no camelCase, PascalCase, or snake_case
- Names describe function, not content (e.g., `el-hero-banner` not `el-section1`)
- Full words, no abbreviations (except FAQ, CTA)
- No version numbers or dates in filenames
- Maximum 3 words after prefix
- Single responsibility per file

### Snippet Naming
- Cards: `el-card-[name]` | Icons: `el-icon-[name]` | Media: `el-media-[name]` | Forms: `el-form-[name]`

### Asset Organisation
- Section CSS: `el-section-[name].css` | Component CSS: `el-component-[name].css`
- JS functionality: `el-[name]-init.js` | Utility JS: `el-utils-[name].js`

---

## 2. SECTION FILE STRUCTURE

- Standard comment block at top: section name, purpose, last updated
- Correct order: (1) Styles → (2) Markup → (3) JavaScript → (4) Schema
- Markup wrapped in `<section>` with `class="[name] section-{{ section.id }}"` and `id="section-{{ section.id }}"`
- Content in `<div class="container">` inside section tag
- Section files under 400 lines — break into snippets if over
- Snippet files under 200 lines
- Repeated code extracted to shared snippets

---

## 3. SCHEMA SETTINGS

### Labels & Info
- Clear, human-readable labels — no abbreviations, jargon, or code terms
- `info` text for settings with constraints (character limits, dimensions, format)
- Image pickers include recommended dimensions and format in `info`
- Colour settings have defaults | Range settings have min, max, step, unit, default
- Select option labels are descriptive (e.g., `"Large (H1)"` not `"h1"`)
- Text and richtext settings have defaults so section looks good out of box

### Organisation
- Settings follow order: Content → Design → Layout → Mobile Settings → Advanced
- Related settings grouped under header dividers
- Most frequently changed settings first within each group

### Responsive
- Desktop and mobile spacing settings provided separately
- Mobile spacing defaults ~50% of desktop values
- Mobile image alternatives where relevant

### Performance & Advanced
- Image loading option (eager/lazy) with default lazy
- `custom_id` and `custom_class` fields in Advanced

### Client Experience
- All settings self-explanatory for non-developer client
- Settings preview correctly in Theme Editor
- Section works with all defaults
- Handles empty and very long content gracefully
- Presets defined with clear name in "Add section"

---

## 4. CODE QUALITY

### Liquid
- snake_case variables with descriptive names — no single-letter or cryptic names
- Early returns to avoid deep nesting
- No deprecated Liquid tags or filters
- Metafield references have fallbacks for empty values
- Complex logic commented
- No repeated code — extracted to snippets

### CSS
- BEM methodology: `.block__element--modifier`
- `el-` prefix on generic classes to avoid theme conflicts
- Scoped to `.section-{{ section.id }}` — no cross-section bleed
- Inline styles only for dynamic theme setting values — static in external CSS
- No overly broad selectors (no naked `h1 {}`, `p {}`, `.container {}`)
- No `!important` unless absolutely necessary and documented

### JavaScript
- No jQuery — vanilla JS or Shopify built-in utilities only
- No inline script blocks (except critical section-specific)
- Configuration via `data-` attributes, not hardcoded in JS
- Event delegation instead of per-element listeners
- Scoped — no conflicts with theme JS
- No duplicate scripts loading

---

## 5. IMAGE & MEDIA IMPLEMENTATION

### Shopify Image Tags
- Only ONE image per page has `fetchpriority="high"` (hero/above-fold)
- Hero: `loading: 'eager'` — all others: `loading: 'lazy'`
- All images include responsive `widths` parameter
- All images include `sizes` attribute
- No `width="auto" height="auto"` — proper dimensions always provided
- Shopify `image_url` and `image_tag` filters used — not raw `<img>` with hardcoded URLs

### Image Quality
- All images match latest Figma file
- Product images match Shopify admin
- No placeholder images | No stretched/pixelated images
- Images compressed before upload

### Alt Text
- Every image has `alt` attribute — never empty
- Decorative images use `alt=""` (empty string)

### Video & Embeds
- Videos load and play correctly | Don't block page load
- iframes responsive | Poster/fallback images display before load

---

## 6. DESIGN FIDELITY

### Figma Match
- Every section compared side-by-side against latest Figma
- Spacing, padding, margins match Figma dev mode
- Colour hex values match exactly
- Border radius, shadows, overlays match
- Section ordering matches intended page flow
- Client feedback changes updated in Figma before replicating in code

### Typography
- Correct font family loaded — no demo or placeholder fonts
- Font weights, sizes, line height, letter spacing match at every breakpoint
- Heading hierarchy semantic (H1 → H2 → H3)
- No visible font flash on load (FOUT)

### Colours & Visual
- Brand colours match guidelines
- Hover, active, focus states use correct colours
- No unstyled default blue links
- Icons match Figma (set, size, colour, hover)

---

## 7. RESPONSIVE & CROSS-BROWSER

### Desktop (1440px+)
- Layout matches Figma | Max-width containers prevent ultra-wide stretching | No unexpected whitespace

### Tablet (768px – 1024px)
- Grid layouts reflow correctly | Text readable | Images resize | Navigation works | No horizontal overflow

### Mobile (375px – 428px)
- Tested on actual mobile viewport — not just "looks ok shrunk down"
- Touch targets minimum 44x44px
- No horizontal scrolling | Text readable without zooming
- Sticky/fixed elements don't cover content
- All interactive elements work with touch
- Mobile menu opens, closes, navigates correctly
- Form inputs don't trigger iOS zoom (font-size ≥ 16px)

### Cross-Browser
- Chrome, Safari (critical for iOS), Firefox tested
- No unsupported CSS without fallbacks
- Flexbox/Grid renders correctly across all browsers

---

## 8. NAVIGATION & LINKS

- All nav links correct | No `#` placeholder links | No dead/broken links (404s)
- Anchor links scroll smoothly | External links open new tab with `rel="noopener"`
- Breadcrumbs correct (if present) | Logo links to homepage | Active page indicated in nav

---

## 9. PDP FUNCTIONALITY

- All variants display correctly and update price, image, availability, ATC button
- Sold-out variants visually indicated and non-purchasable
- Variant URLs update for shareable links
- Product title, description, price match Shopify admin
- Compare-at/sale price with strikethrough | Quantity selector works
- ATC works from every location (PDP, quick add, upsells, bundles)
- Success feedback shown | Button disables during submission

---

## 10. CART & CHECKOUT

- Cart drawer displays correctly | Correct product, variant, image, price, quantity
- Quantity update recalculates price | Item removal updates immediately
- Empty cart state handled | Upsells in cart add correctly
- Subtotal calculates correctly | Discount codes apply | Free shipping threshold updates
- Checkout button works | Cart data carries through | No errors or broken redirects

---

## 11. SUBSCRIPTIONS & SELLING PLANS

*(Skip if no subscriptions)*
- Subscription toggle works | Both subscribe and one-time purchase function
- Discount percentage accurate | Frequency text correct
- Backend selling plan actually configured — not just metafield
- Subscription adds to cart with correct selling plan | Price correct at checkout

---

## 12. MULTI-CURRENCY & LOCALISATION

*(Skip if single currency)*
- Active currencies confirmed | All custom JS handles every active currency
- Currency symbols not hardcoded | Price formatting matches conventions
- Tested with VPN + incognito for USD, EUR, GBP
- Currency selector updates all prices | Free shipping text updates
- Using Settings > Markets — not legacy Geolocation App | Cart prices update on switch

---

## 13. FORMS & INTERACTIVE ELEMENTS

- All form fields functional | Required field validation with clear errors
- Submission shows confirmation | Email validation | Button disables on submit
- Data reaches destination
- Accordions, tabs, sliders, modals all work correctly on all devices
- Scroll animations fire correctly | Sticky elements don't overlap interactive content

---

## 14. PERFORMANCE

- Google PageSpeed Insights run — score recorded
- Lighthouse audit run | LCP under 2.5s | CLS under 0.1 | INP acceptable
- No duplicate scripts | Custom JS minified | No unused CSS
- Third-party scripts documented | No render-blocking scripts
- Zero JavaScript errors in console | No 404s for assets | No mixed content warnings
- No Shopify API or Liquid deprecation warnings | Core theme files intact

---

## 15. SEO & META

- Page title set and descriptive | Meta description present
- Only one H1 per page | Heading hierarchy semantic
- All images have alt | URLs clean | Canonical tags correct
- Schema/structured data present where applicable
- No accidental noindex on pages that should be indexed

---

## 16. ACCESSIBILITY

- Semantic HTML used — not div for everything
- All interactive elements keyboard accessible (Tab, Enter, Escape)
- Focus states visible | Colour contrast WCAG AA
- Form inputs have associated labels | Icon-only buttons have aria-label
- No content relies solely on colour

---

## 17. CONTENT & COPY

- No placeholder text (lorem ipsum, TODO, CHANGE THIS, sample data)
- All copy matches client/PM content or Figma
- No spelling or grammar errors
- Legal/policy links correct | Social links correct | Copyright year current | Contact info correct

---

## 18. THEME & DEPLOYMENT

- Working on duplicate of live theme — never directly on live
- Theme settings not accidentally changed | No orphaned files
- Sections rearrangeable in Theme Editor | Blocks work when added/removed/reordered
- Final side-by-side comparison done | All QA feedback addressed
- Code moved section by section if needed — not full theme overwrite
- Live site verified immediately after publishing
- Cart flow tested on live | Other pages confirmed not broken

---

## 19. LOGGING & COMMUNICATION

- Daily update posted in #dev-updates
- Errors logged in #dev-error-log with problem AND solution
- Final status update posted when ready for QA
- Blockers clearly communicated
