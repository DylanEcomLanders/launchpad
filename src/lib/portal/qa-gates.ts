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
  // ── 0.1 Visual (4) ──
  "All images render sharp and crisp — nothing blurry, pixelated, stretched, or cropped incorrectly",
  "Text and font sizes render at the correct sizes from Figma — consistent across the entire page",
  "No visual glitches, flickering, or layout jumping on page load",
  "The page looks finished — nothing feels placeholder, half-built, or incomplete",
  // ── 0.2 Scrolling & Navigation (4) ──
  "Scroll the entire page top to bottom on desktop AND mobile — no sections overlapping, disappearing, or out of order",
  "Product page images scroll and navigate properly — thumbnails, arrows, and swipe all functional",
  "All carousels/sliders work correctly on both desktop and mobile",
  "Sticky elements (header, sticky ATC) don't cover or block content — sticky ATC scrolls back to variant selector when clicked",
  // ── 0.3 Interactions (5) ──
  "Every button clicked and confirmed working — hover states present (cursor: pointer) on all clickable elements",
  "All transitions and animations run smoothly — no buggy, janky, or broken motion",
  "Accordions, tabs, modals, dropdowns, and filters all open, close, and switch correctly on desktop and mobile",
  "Videos play — autoplay working, with a play button or poster image fallback for mobile Low Power Mode",
  "Content (e.g., review counts) is consistent between mobile and desktop viewports",
  // ── 0.4 Buying Flow (4) ──
  "Add to Cart → Open Cart → Change Quantity → Remove Item → Checkout — full flow tested, correct data at every step",
  "If subscriptions exist — both subscribe and one-time purchase flows tested end to end",
  "If upsells exist — adding one from the cart works correctly",
  "Stock-out states handled — out-of-stock products display correctly, and bundles clearly show when an option is unavailable",
  // ── 0.5 Edge Cases (2) ──
  "Special characters (&, ', \", accents) and very long titles display correctly without breaking layout",
  "Empty states and missing data handled gracefully — no broken or blank areas",
  // ── 0.6 Client Editability (3) ──
  "Content the client will need to update is editable from the Theme Editor — not hardcoded in Liquid/JS",
  "Product images use standard Shopify product media — not metafields, unless specifically agreed with PM",
  "Any custom-built functionality has been confirmed as manageable by the client without developer support",
  // ── 1.1 Agency Prefix (3) ──
  "All custom sections, snippets, and assets start with el- prefix — no files without it",
  "All filenames use kebab-case, descriptive names, full words (no abbreviations except FAQ/CTA), max 3 words after prefix",
  "No version numbers or dates in filenames — single responsibility per file",
  // ── 1.2 Snippet & Asset Naming (3) ──
  "Snippets use correct prefix: el-card-, el-icon-, el-media-, el-form-",
  "CSS files: el-section-[name].css (section-specific) or el-component-[name].css (reusable)",
  "JS files: el-[section-or-function].js — name just has to reflect the section it relates to or the function it performs",
  // ── 2.1 File Template (4) ──
  "Every section starts with the standard comment block: section name, purpose, last updated date",
  "File follows the correct order: (1) Styles → (2) Section Markup → (3) JavaScript → (4) Schema",
  "Section markup wrapped in a <section> tag with class and id using section.id",
  "Content wrapped in a <div class=\"container\"> inside the section tag",
  // ── 2.2 File Length (3) ──
  "Section files are under 400 lines — if over, break into snippets",
  "Snippet files are under 200 lines",
  "Any repeated code across sections has been extracted into a shared snippet",
  // ── 3.1 Setting Labels & Info (4) ──
  "Every setting has a clear, human-readable label — no abbreviations, jargon, or code terms",
  "info text provided for any setting with constraints — image_picker includes recommended dimensions/format",
  "All colour, range, text, and richtext settings have sensible defaults — section looks good out of the box",
  "All select option labels are descriptive (e.g., \"Large (H1)\" not \"h1\")",
  // ── 3.2 Setting Organisation (5) ──
  "Settings follow the required order: Content → Design → Layout → Mobile Settings → Advanced with header dividers",
  "Desktop and mobile spacing matches the provided design — defer to Figma rather than a fixed ratio",
  "Mobile image alternatives provided where relevant",
  "Image loading option included (default lazy, eager only for above-fold)",
  "custom_id and custom_class fields provided in Advanced",
  // ── 3.3 Client Experience (3) ──
  "All settings self-explanatory — a non-developer client could understand every label",
  "Settings preview correctly in the Theme Editor (changes show immediately)",
  "Presets defined so the section appears in \"Add section\" with a clear name",
  // ── 4.1 Liquid (4) ──
  "Variables use snake_case with descriptive names — no single-letter or cryptic names",
  "Early returns used to avoid deep nesting — no 200+ line blocks wrapped in a single if/endif",
  "No deprecated Liquid tags or filters — metafield references have fallbacks for empty values",
  "Complex logic commented — duplicated code extracted to snippets via {% render %}",
  // ── 4.2 CSS (4) ──
  "Class names follow BEM methodology — the el- prefix isn't required on class names when the file itself is already el- prefixed",
  "Section-specific styles scoped to .section-{{ section.id }} — no broad selectors (h1 {}, .container {})",
  "Inline <style> tags used only for dynamic theme settings values — static styles in external CSS files",
  "No !important unless absolutely necessary and documented",
  // ── 4.3 JavaScript (3) ──
  "No jQuery — vanilla JS only, scripts in external asset files",
  "Configuration via data- attributes — event delegation instead of per-element listeners",
  "JS is scoped — no conflicts with theme JS, no duplicate scripts loading",
  // ── 5.1 Shopify Image Tags (6) ──
  "Only ONE image per page has fetchpriority=\"high\" (the hero/above-fold image)",
  "Hero image uses loading: eager — all other images use loading: lazy",
  "All images include responsive widths parameter",
  "All images include a sizes attribute",
  "No width=\"auto\" height=\"auto\" — proper dimensions always provided",
  "Images use Shopify's image_url and image_tag filters — not raw <img> with hardcoded URLs",
  // ── 5.2 Image Quality (3) ──
  "All images match the latest Figma file and Shopify product admin",
  "No placeholder images left in any section",
  "Images compressed before upload — not oversized files displayed at small dimensions",
  // ── 5.3 Alt Text (2) ──
  "Every image has an alt attribute with a sensible fallback",
  "Decorative images use alt=\"\" (empty string, not missing)",
  // ── 5.4 Video & Embeds (3) ──
  "Videos load and play correctly (autoplay, loop, muted as designed) with poster/fallback image",
  "Video doesn't block page load",
  "iframes are responsive and don't overflow containers",
  // ── 6.1 Figma Match (5) ──
  "Every section compared side-by-side against the latest Figma file (not an outdated version)",
  "Spacing, padding, margins, border radius, shadows, and overlays match Figma dev mode measurements",
  "Colour hex values match exactly — no unstyled default blue links",
  "Section ordering matches intended page flow",
  "Client feedback design changes have been updated in Figma by the designer before replicating in code",
  // ── 6.2 Typography (3) ──
  "Correct font family loaded — no demo or placeholder fonts, no visible font flash (FOUT)",
  "Font weights, sizes, line height, and letter spacing match Figma at every breakpoint",
  "Heading hierarchy is semantic (H1 → H2 → H3) — not just visually styled",
  // ── 6.3 Colours & Visual (4) ──
  "Brand colours match Figma tokens / client guidelines",
  "Hover, active, and focus states use correct colours",
  "Background colours, gradients, and section transitions are clean",
  "Icons match Figma (correct set, size, colour, and hover behaviour)",
  // ── 7.1 Desktop (2) ──
  "Layout matches Figma at standard desktop width",
  "Content doesn't stretch awkwardly on ultra-wide (1920px+) — max-width containers in place",
  // ── 7.2 Tablet (4) ──
  "Grid layouts reflow correctly (e.g., 3-col → 2-col)",
  "No horizontal overflow or scrollbars",
  "Navigation works correctly (hamburger if applicable)",
  "If no tablet design was provided, layouts remain functional between the mobile and desktop versions — no broken breakpoints or half-built states",
  // ── 7.3 Mobile (5) ──
  "Full page tested on actual mobile viewport — not just \"looks ok shrunk down\"",
  "Touch targets are minimum 44x44px",
  "No horizontal scrolling anywhere",
  "Mobile menu opens, closes, navigates correctly",
  "Form inputs don't trigger iOS zoom on focus (font-size ≥ 16px)",
  // ── 7.4 Cross-Browser (2) ──
  "Tested in Chrome, Safari (critical for iOS), and Firefox",
  "No unsupported CSS features used without fallbacks",
  // ── 8 Navigation & Links (3) ──
  "All navigation links work — no # placeholders, no 404s, anchor links scroll correctly",
  "External links open in new tab (target=\"_blank\" with rel=\"noopener\")",
  "Logo links to homepage, breadcrumbs correct (if present), active page state indicated in nav",
  // ── 9 PDP Functionality (5) ──
  "Selecting a variant updates price, image, availability, and Add to Cart button — sold-out variants visually indicated",
  "Variant URL parameters update for shareable links",
  "Product title, description, price match Shopify admin — compare-at/sale price displays correctly",
  "Quantity selector, product metafields, and reviews/ratings all functional (where applicable)",
  "Add to Cart works from every location (PDP, quick add, upsells, bundles) — button disables during submission",
  // ── 10 Cart & Checkout (4) ──
  "Cart drawer/page displays correct product, variant, image, price, quantity — empty cart state handled",
  "Upsells/cross-sells in cart add correctly with correct pricing",
  "Subtotal calculates correctly — discount codes, free shipping threshold, and tax display all working",
  "Checkout button lands on correct page with correct cart data — no errors or broken redirects",
  // ── 11 Subscriptions (4) ──
  "Subscription toggle works — \"Subscribe & Save\" and \"One-time purchase\" both functional with correct discount and frequency text",
  "Backend selling plan actually configured for the product — not just the metafield",
  "Subscription adds to cart with correct selling plan, price correct through to checkout",
  "Custom subscription boxes fetch plans via product.json — not hardcoded",
  // ── 12 Multi-Currency (5) ──
  "Currency symbols not hardcoded — use localization.currency or cart.currency.iso_code",
  "All custom JS price calculations handle every active currency — formatting matches conventions",
  "Currency selector switches all prices on page and cart drawer correctly — free shipping threshold updates too",
  "Tested with VPN + incognito for at least USD, EUR, GBP",
  "Using Settings > Markets — not legacy Geolocation App code",
  // ── 13 Forms (6) ──
  "All fields functional (input, select, textarea, checkbox, radio)",
  "Required field validation with clear error messages",
  "Successful submission shows confirmation state",
  "Email validation prevents invalid entries",
  "Button disables on submit to prevent double-send",
  "Data actually reaches destination (email, app, Shopify)",
  // ── 14.1 Performance Benchmarks (4) ──
  "Google PageSpeed score green (90+) on desktop, 80+ on mobile",
  "LCP under 2.5s",
  "CLS under 0.1 — no layout shift on load",
  "INP under 200ms",
  // ── 14.2 Scripts & Assets (3) ──
  "No duplicate or unused scripts/stylesheets loading",
  "Custom JS minified where possible, no render-blocking scripts in <head> that could be deferred",
  "Third-party scripts documented — noted which are client-installed vs ours",
  // ── 14.3 Console (3) ──
  "Zero JavaScript errors in browser console on every page",
  "No 404s for missing assets, no mixed content warnings, no Shopify deprecation warnings",
  "Core theme files intact — never deleted or replaced with custom code",
  // ── 15 Accessibility (6) ──
  "Semantic HTML used (<section>, <nav>, <main>, <article>, <ul>/<li>) — not <div> for everything",
  "All interactive elements keyboard accessible (Tab, Enter, Escape) with visible focus states",
  "Colour contrast meets WCAG AA (4.5:1 body text, 3:1 large text)",
  "Form inputs have associated <label> elements",
  "Buttons without visible text have aria-label (e.g., close buttons, icon-only buttons)",
  "No content relies solely on colour to convey meaning",
  // ── 16 Content & Copy (3) ──
  "No placeholder text left in (lorem ipsum, \"TODO\", \"CHANGE THIS\", sample data)",
  "All copy matches client/PM-provided content or Figma — no spelling or grammar errors",
  "Legal/policy links, social media links, contact info, and copyright year all correct",
  // ── 17.1 Theme Safety (4) ──
  "Working on a duplicate of the live theme — never directly on live",
  "Theme settings (colours, fonts, global options) not accidentally changed — no orphaned code/files",
  "Sections rearrangeable in Theme Editor, block-level settings work when added/removed/reordered",
  "Theme Editor preview matches actual frontend render",
  // ── 17.2 Migration to Live (4) ──
  "All QA feedback addressed — final side-by-side comparison: dev theme vs Figma",
  "Confirmed no teammates have made recent live theme changes that could be overwritten",
  "Code moved section by section if needed — not a full theme overwrite",
  "Live site verified immediately after publishing — cart flow tested, existing pages confirmed not broken",
];

export interface GateCategory {
  label: string;
  startIndex: number;
  count: number;
}

export const DEV_HANDOFF_CATEGORIES: GateCategory[] = [
  { label: "1. Visual", startIndex: 0, count: 4 },
  { label: "2. Scrolling & Navigation", startIndex: 4, count: 4 },
  { label: "3. Interactions", startIndex: 8, count: 5 },
  { label: "4. Buying Flow", startIndex: 13, count: 4 },
  { label: "5. Edge Cases", startIndex: 17, count: 2 },
  { label: "6. Client Editability", startIndex: 19, count: 3 },
  { label: "7. Agency Prefix & Naming", startIndex: 22, count: 3 },
  { label: "8. Snippet & Asset Naming", startIndex: 25, count: 3 },
  { label: "9. File Template", startIndex: 28, count: 4 },
  { label: "10. File Length", startIndex: 32, count: 3 },
  { label: "11. Setting Labels & Info", startIndex: 35, count: 4 },
  { label: "12. Setting Organisation", startIndex: 39, count: 5 },
  { label: "13. Client Experience", startIndex: 44, count: 3 },
  { label: "14. Liquid", startIndex: 47, count: 4 },
  { label: "15. CSS", startIndex: 51, count: 4 },
  { label: "16. JavaScript", startIndex: 55, count: 3 },
  { label: "17. Shopify Image Tags", startIndex: 58, count: 6 },
  { label: "18. Image Quality", startIndex: 64, count: 3 },
  { label: "19. Alt Text", startIndex: 67, count: 2 },
  { label: "20. Video & Embeds", startIndex: 69, count: 3 },
  { label: "21. Figma Match", startIndex: 72, count: 5 },
  { label: "22. Typography", startIndex: 77, count: 3 },
  { label: "23. Colours & Visual", startIndex: 80, count: 4 },
  { label: "24. Desktop", startIndex: 84, count: 2 },
  { label: "25. Tablet", startIndex: 86, count: 4 },
  { label: "26. Mobile", startIndex: 90, count: 5 },
  { label: "27. Cross-Browser", startIndex: 95, count: 2 },
  { label: "28. Navigation & Links", startIndex: 97, count: 3 },
  { label: "29. PDP Functionality", startIndex: 100, count: 5 },
  { label: "30. Cart & Checkout", startIndex: 105, count: 4 },
  { label: "31. Subscriptions", startIndex: 109, count: 4 },
  { label: "32. Multi-Currency", startIndex: 113, count: 5 },
  { label: "33. Forms", startIndex: 118, count: 6 },
  { label: "34. Performance Benchmarks", startIndex: 124, count: 4 },
  { label: "35. Scripts & Assets", startIndex: 128, count: 3 },
  { label: "36. Console", startIndex: 131, count: 3 },
  { label: "37. Accessibility", startIndex: 134, count: 6 },
  { label: "38. Content & Copy", startIndex: 140, count: 3 },
  { label: "39. Theme Safety", startIndex: 143, count: 4 },
  { label: "40. Migration to Live", startIndex: 147, count: 4 },
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

export const LAUNCH_PREP_ITEMS = [
  "All Dev QA feedback addressed — nothing outstanding",
  "Redirects configured (if replacing an existing page)",
  "GA4 tracking verified — events firing, UTMs set",
  "Meta pixel / third-party tracking pixels confirmed working",
  "Backup of current live page taken (screenshot + theme duplicate)",
  "Theme changes haven't broken other pages on the site",
  "Go-live time confirmed — team available for 2 hours post-launch",
];

/** Gate display config */
export const GATE_CONFIG: Record<string, { title: string; color: string; role: string }> = {
  cro_brief: { title: "CRO Design", color: "#DC2626", role: "CRO Strategist" },
  design_handoff: { title: "Design Handoff", color: "#7C3AED", role: "Designer" },
  dev_handoff: { title: "Dev to Senior Dev QA", color: "#059669", role: "Developer" },
  launch_prep: { title: "Handoff / Testing", color: "#2563EB", role: "Senior Developer" },
};
