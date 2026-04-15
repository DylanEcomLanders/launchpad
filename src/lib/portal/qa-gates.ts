/* ── QA Gate Helpers ── */

import type { QAGate, QAGateItem, PortalProject } from "./types";

export const CRO_BRIEF_ITEMS = [
  "Target audience defined",
  "Key angles/hooks identified",
  "Competitor pages reviewed",
  "Page structure/flow recommended",
  "Copy direction provided",
  "KPIs defined",
];

export const DESIGN_HANDOFF_ITEMS = [
  "Functionality comments left for all key functions",
  "All carousel, dropdown and extra off-screen content added",
  "6-8 optimised product page images included",
  "Copy finalised and no placeholders left",
];

export const DEV_HANDOFF_ITEMS = [
  // ── 0.1 Visual (6) ──
  "All images render sharp and crisp — nothing blurry, pixelated, or low-res due to incorrect sizing, wrong widths, or serving a small source image at a large container size",
  "No images are stretched, squashed, or cropped incorrectly due to missing aspect ratios or CSS issues",
  "Text renders at the correct sizes from Figma — no text appearing unexpectedly tiny or large due to a wrong variable, missing style, or CSS inheritance issue",
  "Font sizes are consistent across the page — no sections where the code is pulling in different sizes than what the design specifies",
  "No visual glitches, flickering, or layout jumping on page load (CLS issues caused by scripts or styles loading late)",
  "The page looks finished — nothing feels placeholder, half-built, or incomplete",
  // ── 0.2 Scrolling & Navigation (6) ──
  "Scroll the entire page top to bottom on desktop AND mobile — everything appears correctly with no sections overlapping, disappearing, or rendering out of order",
  "Product page images scroll and navigate properly — thumbnails clickable, arrows functional, swipe works on mobile",
  "All carousels/sliders slide, swipe, and arrow-navigate correctly on both desktop and mobile",
  "Anchor links (e.g., \"Read the full story below\") actually scroll to the correct section — not dead links left unwired",
  "Sticky elements (header, sticky ATC) don't cover or block important content while scrolling",
  "Sticky Add to Cart scrolls back to the bundle/variant selector when clicked — not adding a random default variant",
  // ── 0.3 Interactions (7) ──
  "Every button on the page has been clicked and confirmed working — no dead or non-functional buttons",
  "Hover states present — cursor changes to pointer/hand on all clickable elements (missing cursor: pointer is a common oversight)",
  "All transitions and animations run smoothly — no buggy, janky, or broken motion",
  "Accordions open AND close. Tabs switch content correctly. Modals open AND close (including the X button)",
  "Dropdown menus and filters work correctly on desktop and mobile",
  "Videos play — autoplay confirmed working. Mobile Low Power Mode handled gracefully with a play button or poster image",
  "Review counts and content are consistent between mobile and desktop — the same data should appear on all viewports",
  // ── 0.4 Buying Flow (7) ──
  "Add a product to cart — correct product, variant, and price are added",
  "Open the cart — correct item with right image, name, price, and quantity displayed",
  "Change the quantity in the cart — price updates accordingly",
  "Remove the item — cart updates immediately",
  "Proceed to checkout — lands on the correct checkout page with the right items",
  "If there's a subscription option — both subscribe and one-time purchase flows tested end to end",
  "If there are upsells — adding one from the cart works correctly",
  // ── 0.5 Edge Cases (4) ──
  "Product names with special characters (&, ', \", accents) display correctly everywhere",
  "Products with very long titles don't break the layout",
  "Sections with no content or empty states don't show broken or blank areas — missing data handled gracefully",
  "Sections with very long content don't overflow or break containers",
  // ── 0.6 Client Editability (3) ──
  "Content the client will need to update is editable from the Theme Editor — not hardcoded in Liquid/JS",
  "Product images use standard Shopify product media — not metafields, unless specifically agreed with PM",
  "Any custom-built functionality has been confirmed as manageable by the client without developer support",
  // ── 1.1 Agency Prefix (4) ──
  "All custom section files start with el- prefix (e.g., sections/el-hero-banner.liquid)",
  "All custom snippet files start with el- prefix",
  "All custom asset files start with el- prefix",
  "No files created without the el- prefix that could be confused with default theme, other agency, or client files",
  // ── 1.2 Naming Conventions (6) ──
  "All filenames use kebab-case (lowercase, hyphen-separated) — no camelCase, PascalCase, or snake_case",
  "Names describe what the section does, not what it contains (e.g., el-hero-banner not el-section1)",
  "Full words used — no abbreviations (except FAQ, CTA)",
  "No version numbers or dates in filenames (no el-hero-v2.liquid, no el-hero-jan2026.liquid)",
  "Maximum 3 words after prefix (e.g., el-featured-product-grid is the limit)",
  "Single responsibility per file — no combined sections like el-hero-banner-and-features",
  // ── 1.3 Snippet Naming (4) ──
  "Card components use el-card- prefix",
  "Icon snippets use el-icon- prefix",
  "Media snippets use el-media- prefix",
  "Form snippets use el-form- prefix",
  // ── 1.4 Asset Organisation (4) ──
  "Section-specific CSS files named el-section-[name].css",
  "Reusable component CSS named el-component-[name].css",
  "JS functionality files named el-[name]-init.js",
  "Utility JS files named el-utils-[name].js",
  // ── 2.1 File Template (4) ──
  "Every section starts with standard comment block: section name, purpose, last updated date",
  "File follows correct order: (1) Styles → (2) Section Markup → (3) JavaScript → (4) Schema",
  "Section markup wrapped in a <section> tag with class=\"[name] section-{{ section.id }}\" and id=\"section-{{ section.id }}\"",
  "Content wrapped in a <div class=\"container\"> inside the section tag",
  // ── 2.2 File Length (3) ──
  "Section files are under 400 lines — if over, break into snippets",
  "Snippet files are under 200 lines",
  "Any repeated code across sections has been extracted into a shared snippet",
  // ── 3.1 Setting Labels (8) ──
  "Every setting has a clear, human-readable label — no abbreviations, jargon, or code terms",
  "No labels like \"Txt\", \"Img\", \"h1\" — use \"Section heading\", \"Background image\", \"Large (H1)\"",
  "info text provided for any setting with constraints (character limits, dimensions, format)",
  "All image_picker settings include recommended dimensions and file format in info",
  "All colour settings include a default value",
  "All range settings include meaningful min, max, step, unit, and default",
  "All select option labels are descriptive — e.g., \"Large (H1)\" not \"h1\"",
  "All text and richtext settings have a default value so the section looks good out of the box",
  // ── 3.2 Setting Organisation (3) ──
  "Settings follow the required order: Content → Design → Layout → Mobile Settings → Advanced",
  "Related settings grouped under header dividers using standard labels",
  "Most frequently changed settings appear first within each group",
  // ── 3.3 Responsive Settings (3) ──
  "Desktop and mobile spacing settings provided separately (e.g., padding_top and padding_top_mobile)",
  "Mobile spacing defaults are roughly 50% of desktop values",
  "Mobile image alternatives provided where relevant",
  // ── 3.4 Performance Settings (2) ──
  "Image loading option included for all image settings (eager / lazy)",
  "Default image loading set to lazy (with info: \"Use Eager only for images at the top of the page\")",
  // ── 3.5 Advanced Settings (2) ──
  "custom_id field provided for anchor links",
  "custom_class field provided for additional styling",
  // ── 3.6 Client Experience (6) ──
  "All settings are self-explanatory — a non-developer client could understand every label and info text",
  "Settings preview correctly in the Theme Editor (changes show immediately)",
  "Section works correctly with all settings at their default values",
  "Section handles gracefully when content is empty/missing (no broken layout)",
  "Section handles gracefully when content is very long (no overflow or breakage)",
  "Presets defined so the section appears in \"Add section\" with a clear name",
  // ── 4.1 Liquid (8) ──
  "Variables use snake_case with descriptive names (e.g., featured_product not fp)",
  "No single-letter or cryptic variable names",
  "Early returns used to avoid deep nesting",
  "No 200+ line blocks wrapped in a single if/endif",
  "No deprecated Liquid tags or filters used",
  "Metafield references have fallbacks for empty values",
  "Code commented where logic is complex or non-obvious",
  "No repeated code blocks — duplicated code extracted to snippets",
  // ── 4.2 CSS (7) ──
  "Class names follow BEM methodology: .block__element--modifier",
  "Generic class names use el- prefix to avoid theme conflicts",
  "No mixed naming conventions in the same file",
  "Section-specific styles scoped to .section-{{ section.id }}",
  "Inline <style> tags used only for dynamic values from theme settings — static styles in external CSS",
  "No overly broad selectors that could affect other pages (no naked h1 {}, p {}, .container {})",
  "No !important unless absolutely necessary and documented",
  // ── 4.3 JavaScript (6) ──
  "No jQuery in new development — vanilla JS or Shopify built-in utilities only",
  "No inline <script> blocks (except critical section-specific functionality)",
  "Configuration passed via data- attributes, not hardcoded in JS",
  "Event delegation used instead of per-element listeners",
  "JS is scoped — does not conflict with theme JS or other sections",
  "No duplicate scripts loading",
  // ── 5.1 Shopify Image Tags (6) ──
  "Only ONE image per page has fetchpriority=\"high\" (the hero/above-fold image)",
  "Hero image uses loading: eager — all other images use loading: lazy",
  "All images include responsive widths parameter",
  "All images include a sizes attribute",
  "No width=\"auto\" height=\"auto\" — proper dimensions always provided",
  "Images use Shopify's image_url and image_tag filters — not raw <img> with hardcoded URLs",
  // ── 5.2 Image Quality (5) ──
  "All images match the latest Figma file",
  "Product images match Shopify product admin",
  "No placeholder images left in any section",
  "No stretched, squashed, or pixelated images",
  "Images compressed before upload — not oversized files displayed at small dimensions",
  // ── 5.3 Alt Text (3) ──
  "Every image has an alt attribute — never empty",
  "Alt text uses the image's Shopify alt with a sensible fallback",
  "Decorative images use alt=\"\" (empty string, not missing)",
  // ── 5.4 Video & Embeds (4) ──
  "Videos load and play correctly (autoplay, loop, muted as designed)",
  "Video doesn't block page load",
  "iframes are responsive and don't overflow containers",
  "Poster/fallback images display before video loads",
  // ── 6.1 Figma Match (6) ──
  "Every section compared side-by-side against the latest Figma file (not an outdated version)",
  "All spacing, padding, margins match Figma dev mode measurements",
  "Colour hex values match exactly",
  "Border radius, shadows, overlays match specs",
  "Section ordering matches intended page flow",
  "Client feedback design changes have been updated in Figma by the designer before replicating in code",
  // ── 6.2 Typography (6) ──
  "Correct font family loaded — no demo or placeholder fonts",
  "Font weights match Figma (regular, medium, semi-bold, bold)",
  "Font sizes match at every breakpoint",
  "Line height and letter spacing match",
  "Heading hierarchy is semantic (H1 → H2 → H3) — not just visually styled",
  "No visible font flash on load (FOUT)",
  // ── 6.3 Colours & Visual (5) ──
  "Brand colours match Figma tokens / client guidelines",
  "Hover, active, and focus states use correct colours",
  "No unstyled default blue links",
  "Background colours, gradients, and section transitions are clean",
  "Icons match Figma (correct set, size, colour, and hover behaviour)",
  // ── 7.1 Desktop (3) ──
  "Layout matches Figma at standard desktop width",
  "Content doesn't stretch awkwardly on ultra-wide (1920px+) — max-width containers in place",
  "No unexpected whitespace gaps",
  // ── 7.2 Tablet (5) ──
  "Grid layouts reflow correctly (e.g., 3-col → 2-col)",
  "Text remains readable",
  "Images resize proportionally",
  "Navigation works correctly (hamburger if applicable)",
  "No horizontal overflow or scrollbars",
  // ── 7.3 Mobile (8) ──
  "Full page tested on actual mobile viewport — not just \"looks ok shrunk down\"",
  "Touch targets are minimum 44x44px",
  "No horizontal scrolling anywhere",
  "Text readable without zooming",
  "Sticky/fixed elements don't cover content",
  "All interactive elements (accordions, sliders, tabs, modals) work with touch",
  "Mobile menu opens, closes, navigates correctly",
  "Form inputs don't trigger iOS zoom on focus (font-size ≥ 16px)",
  // ── 7.4 Cross-Browser (5) ──
  "Tested in Chrome",
  "Tested in Safari (critical for iOS)",
  "Tested in Firefox",
  "No unsupported CSS features used without fallbacks",
  "Flexbox/Grid renders correctly across all browsers",
  // ── 8. Navigation & Links (8) ──
  "All navigation links point to correct destinations",
  "No # placeholder links left in",
  "No dead/broken links (404s)",
  "Anchor links scroll to correct section smoothly",
  "External links open in new tab (target=\"_blank\" with rel=\"noopener\")",
  "Breadcrumbs show correct hierarchy (if present)",
  "Logo links to homepage",
  "Active/current page state indicated in nav",
  // ── 9.1 Variant Selection (4) ──
  "All product variants display correctly (size, colour, material)",
  "Selecting a variant updates: price, image, availability, and Add to Cart button",
  "Sold-out variants are visually indicated and non-purchasable",
  "Variant URL parameters update for shareable links",
  // ── 9.2 Product Information (5) ──
  "Product title, description, price match Shopify admin",
  "Compare-at / sale price displays correctly with strikethrough",
  "Quantity selector works (increment, decrement, manual input)",
  "Product metafields display correctly where used",
  "Reviews/ratings load and display (if applicable)",
  // ── 9.3 Add to Cart (4) ──
  "Add to Cart works from every location it appears (PDP, quick add, upsells, bundles)",
  "Correct product, variant, quantity, and price added",
  "Success feedback shown (cart drawer opens, notification, etc.)",
  "Button disables during submission to prevent double-click",
  // ── 10.1 Cart Drawer / Cart Page (6) ──
  "Cart drawer opens and displays correctly",
  "Correct product, variant, image, price, quantity shown per item",
  "Quantity update recalculates price correctly",
  "Item removal updates cart immediately",
  "Empty cart state handled (not blank page)",
  "Upsells/cross-sells in cart add correctly with correct pricing",
  // ── 10.2 Pricing & Discounts (4) ──
  "Subtotal calculates correctly with multiple items",
  "Discount codes apply correctly (if available from cart)",
  "Free shipping threshold messaging updates dynamically",
  "Tax display matches store settings",
  // ── 10.3 Checkout Flow (3) ──
  "Checkout button works and lands on correct checkout page",
  "Cart data carries through correctly",
  "No errors or broken redirects",
  // ── 11. Subscriptions (8) ──
  "Subscription toggle/selector works on PDP",
  "\"Subscribe & Save\" and \"One-time purchase\" both function",
  "Discount percentage displays accurately",
  "Frequency text correct (e.g., \"Every 30 days\")",
  "Backend selling plan actually configured for the product — not just the metafield",
  "Subscription adds to cart with correct selling plan attached",
  "Subscription price correct in cart and at checkout",
  "Custom subscription boxes fetch plans via product.json — not hardcoded",
  // ── 12. Multi-Currency (9) ──
  "Confirmed which currencies the store supports (Settings > Markets)",
  "All custom JS price calculations handle every active currency",
  "Currency symbols not hardcoded — use localization.currency or cart.currency.iso_code",
  "Price formatting matches currency conventions ($50.00 / €50,00 / £50.00)",
  "Tested with VPN + incognito for at least USD, EUR, GBP",
  "Currency selector switches all prices on page correctly",
  "Free shipping threshold text updates with correct symbol",
  "Using Settings > Markets — not legacy Geolocation App code",
  "Cart drawer prices update on currency change",
  // ── 13.1 Forms (6) ──
  "All fields functional (input, select, textarea, checkbox, radio)",
  "Required field validation with clear error messages",
  "Successful submission shows confirmation state",
  "Email validation prevents invalid entries",
  "Button disables on submit to prevent double-send",
  "Data actually reaches destination (email, app, Shopify)",
  // ── 13.2 Interactive Components (6) ──
  "Accordions open/close correctly (single or multi as designed)",
  "Tabs switch without content overlap or flash",
  "Sliders swipe on mobile, arrow-navigate on desktop",
  "Modals open, display, close correctly on all devices",
  "Scroll animations fire correctly without jank",
  "Sticky elements don't overlap interactive content",
  // ── 14.1 Speed Metrics (5) ──
  "Google PageSpeed Insights run — score recorded",
  "Lighthouse audit run (Performance, Accessibility, Best Practices, SEO)",
  "LCP under 2.5s",
  "CLS under 0.1 — no layout shift on load",
  "INP acceptable",
  // ── 14.2 Scripts & Assets (5) ──
  "No duplicate scripts loading",
  "Custom JS not bloated — minified where possible",
  "No unused CSS stylesheets loading",
  "Third-party scripts documented — noted which are client-installed vs ours",
  "No render-blocking scripts in <head> that could be deferred",
  // ── 14.3 Console (5) ──
  "Zero JavaScript errors in browser console on every page",
  "No 404s for missing assets (images, fonts, scripts)",
  "No mixed content warnings (HTTP on HTTPS)",
  "No Shopify API or Liquid deprecation warnings",
  "Core theme files intact — never deleted or replaced with custom code",
  // ── 15. SEO & Meta (9) ──
  "Page title set and descriptive (not \"Home\" or blank)",
  "Meta description present and relevant",
  "Only one <h1> per page",
  "Heading hierarchy semantic (H1 → H2 → H3, no skipped levels)",
  "All images have alt attributes",
  "URLs clean (no double slashes, unnecessary params)",
  "Canonical tags correct",
  "Schema/structured data present where applicable (product, breadcrumb, FAQ)",
  "No accidental noindex on pages that should be indexed",
  // ── 16. Accessibility (9) ──
  "Semantic HTML used (<section>, <nav>, <main>, <article>, etc.) — not <div> for everything",
  "All interactive elements keyboard accessible (Tab, Enter, Escape)",
  "Focus states visible on buttons, links, form fields",
  "Colour contrast meets WCAG AA (4.5:1 body text, 3:1 large text)",
  "All images have meaningful alt text",
  "Form inputs have associated <label> elements",
  "Buttons without visible text have aria-label (e.g., close buttons, icon-only buttons)",
  "ARIA attributes used correctly — not overused",
  "No content relies solely on colour to convey meaning",
  // ── 17. Content & Copy (7) ──
  "No placeholder text left in (lorem ipsum, \"TODO\", \"CHANGE THIS\", sample data)",
  "All copy matches client/PM-provided content or Figma",
  "No spelling or grammar errors",
  "Legal/policy links point to correct pages (Privacy, Terms, Refund)",
  "Social media links point to correct profiles (not template defaults)",
  "Copyright year is current",
  "Contact information correct (email, phone, address)",
  // ── 18.1 Theme Safety (6) ──
  "Working on a duplicate of the live theme — never directly on live",
  "Theme settings (colours, fonts, global options) not accidentally changed",
  "No orphaned or unused code/files left behind",
  "Sections rearrangeable in Theme Editor without breaking",
  "Block-level settings work correctly when added, removed, reordered",
  "Theme Editor preview matches actual frontend render",
  // ── 18.2 Migration to Live (7) ──
  "Final side-by-side comparison: dev theme vs Figma",
  "All QA feedback addressed",
  "Confirmed no teammates have made recent live theme changes that could be overwritten",
  "Code moved section by section if needed — not a full theme overwrite",
  "Live site verified immediately after publishing — don't assume it matches preview",
  "Cart flow tested on live after migration",
  "Other existing pages/sections confirmed not broken by migration",
  // ── 19. Logging (4) ──
  "Daily update posted in #dev-updates",
  "Any errors encountered during the build logged in #dev-error-log with the problem AND the solution",
  "Final status update posted when ready for QA",
  "Blockers clearly communicated (waiting on design changes, client assets, store access, etc.)",
];

export interface GateCategory {
  label: string;
  startIndex: number;
  count: number;
}

export const DEV_HANDOFF_CATEGORIES: GateCategory[] = [
  { label: "0.1 — Visual", startIndex: 0, count: 6 },
  { label: "0.2 — Scrolling & Navigation", startIndex: 6, count: 6 },
  { label: "0.3 — Interactions", startIndex: 12, count: 7 },
  { label: "0.4 — Buying Flow", startIndex: 19, count: 7 },
  { label: "0.5 — Edge Cases", startIndex: 26, count: 4 },
  { label: "0.6 — Client Editability", startIndex: 30, count: 3 },
  { label: "1.1 — Agency Prefix", startIndex: 33, count: 4 },
  { label: "1.2 — Naming Conventions", startIndex: 37, count: 6 },
  { label: "1.3 — Snippet Naming", startIndex: 43, count: 4 },
  { label: "1.4 — Asset Organisation", startIndex: 47, count: 4 },
  { label: "2.1 — File Template", startIndex: 51, count: 4 },
  { label: "2.2 — File Length", startIndex: 55, count: 3 },
  { label: "3.1 — Setting Labels & Info", startIndex: 58, count: 8 },
  { label: "3.2 — Setting Organisation", startIndex: 66, count: 3 },
  { label: "3.3 — Responsive Settings", startIndex: 69, count: 3 },
  { label: "3.4 — Performance Settings", startIndex: 72, count: 2 },
  { label: "3.5 — Advanced Settings", startIndex: 74, count: 2 },
  { label: "3.6 — Client Experience", startIndex: 76, count: 6 },
  { label: "4.1 — Liquid", startIndex: 82, count: 8 },
  { label: "4.2 — CSS", startIndex: 90, count: 7 },
  { label: "4.3 — JavaScript", startIndex: 97, count: 6 },
  { label: "5.1 — Shopify Image Tags", startIndex: 103, count: 6 },
  { label: "5.2 — Image Quality", startIndex: 109, count: 5 },
  { label: "5.3 — Alt Text", startIndex: 114, count: 3 },
  { label: "5.4 — Video & Embeds", startIndex: 117, count: 4 },
  { label: "6.1 — Figma Match", startIndex: 121, count: 6 },
  { label: "6.2 — Typography", startIndex: 127, count: 6 },
  { label: "6.3 — Colours & Visual", startIndex: 133, count: 5 },
  { label: "7.1 — Desktop", startIndex: 138, count: 3 },
  { label: "7.2 — Tablet", startIndex: 141, count: 5 },
  { label: "7.3 — Mobile", startIndex: 146, count: 8 },
  { label: "7.4 — Cross-Browser", startIndex: 154, count: 5 },
  { label: "8 — Navigation & Links", startIndex: 159, count: 8 },
  { label: "9.1 — Variant Selection", startIndex: 167, count: 4 },
  { label: "9.2 — Product Information", startIndex: 171, count: 5 },
  { label: "9.3 — Add to Cart", startIndex: 176, count: 4 },
  { label: "10.1 — Cart Drawer / Cart Page", startIndex: 180, count: 6 },
  { label: "10.2 — Pricing & Discounts", startIndex: 186, count: 4 },
  { label: "10.3 — Checkout Flow", startIndex: 190, count: 3 },
  { label: "11 — Subscriptions", startIndex: 193, count: 8 },
  { label: "12 — Multi-Currency", startIndex: 201, count: 9 },
  { label: "13.1 — Forms", startIndex: 210, count: 6 },
  { label: "13.2 — Interactive Components", startIndex: 216, count: 6 },
  { label: "14.1 — Speed Metrics", startIndex: 222, count: 5 },
  { label: "14.2 — Scripts & Assets", startIndex: 227, count: 5 },
  { label: "14.3 — Console", startIndex: 232, count: 5 },
  { label: "15 — SEO & Meta", startIndex: 237, count: 9 },
  { label: "16 — Accessibility", startIndex: 246, count: 9 },
  { label: "17 — Content & Copy", startIndex: 255, count: 7 },
  { label: "18.1 — Theme Safety", startIndex: 262, count: 6 },
  { label: "18.2 — Migration to Live", startIndex: 268, count: 7 },
  { label: "19 — Logging & Communication", startIndex: 275, count: 4 },
];

/** Create a fresh gate with all items unchecked */
export function createDefaultGate(labels: string[]): QAGate {
  return {
    items: labels.map((label) => ({ label, checked: false })),
    notes: "",
    submitted_by: "",
    status: "pending",
  };
}

/** Count checked items */
export function getGateProgress(gate: QAGate): { checked: number; total: number } {
  return {
    checked: gate.items.filter((i) => i.checked).length,
    total: gate.items.length,
  };
}

/** All items checked */
export function isGateComplete(gate: QAGate): boolean {
  return gate.items.every((i) => i.checked);
}

/** Design handoff requires form fields + checklist + font files */
export function isDesignHandoffComplete(gate: QAGate): boolean {
  return (
    isGateComplete(gate) &&
    !!gate.figma_url?.trim() &&
    !!gate.loom_url?.trim() &&
    (gate.font_files_uploads?.length ?? 0) > 0
  );
}

/** Check if prerequisites are met for a gate */
export function arePrerequisitesMet(project: PortalProject, gateKey: "cro_brief" | "design_handoff" | "dev_handoff"): boolean {
  const gates = project.qa_gates;
  if (!gates) return gateKey === "cro_brief"; // First gate always available

  switch (gateKey) {
    case "cro_brief":
      return true; // No prerequisites
    case "design_handoff":
      // CRO brief must be submitted OR disabled
      if (gates.cro_brief_enabled === false || !gates.cro_brief_enabled) return true;
      return gates.cro_brief?.status === "submitted";
    case "dev_handoff":
      // Design handoff must be submitted
      return gates.design_handoff?.status === "submitted";
    default:
      return false;
  }
}

/** Gate display config */
export const GATE_CONFIG: Record<string, { title: string; color: string; role: string }> = {
  cro_brief: { title: "CRO Design", color: "#DC2626", role: "CRO Strategist" },
  design_handoff: { title: "Design Handoff", color: "#7C3AED", role: "Designer" },
  dev_handoff: { title: "Dev to Senior Dev QA", color: "#059669", role: "Developer" },
};
