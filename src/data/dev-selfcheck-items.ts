/* ── Dev Self-Check Items ── */
/* Pre-QA developer checklist — complete before handing off to QA */

export const selfCheckCategories = [
  "Code Quality",
  "Responsive",
  "Performance",
  "Accessibility",
  "Shopify-Specific",
  "Client Requirements",
] as const;

export type SelfCheckCategory = (typeof selfCheckCategories)[number];
export type SelfCheckResult = "pass" | "fail" | "na" | "";

export interface SelfCheckItem {
  id: string;
  category: SelfCheckCategory;
  description: string;
  result: SelfCheckResult;
  notes: string;
}

export const defaultSelfCheckItems: Record<SelfCheckCategory, string[]> = {
  "Code Quality": [
    "No console.log or debugger statements left in code",
    "No hardcoded values — all configs use theme settings or metafields",
    "Liquid code uses proper indentation and consistent formatting",
    "No duplicated code blocks — extracted into snippets where reusable",
    "All custom CSS is scoped and doesn't leak to other sections",
    "JavaScript errors checked in browser console (no red errors)",
    "Section schema settings have sensible defaults",
  ],
  Responsive: [
    "Tested on mobile (375px) — layout doesn't break",
    "Tested on tablet (768px) — layout adapts correctly",
    "Tested on desktop (1440px) — no oversized gaps or stretching",
    "Text is readable at all breakpoints (no overflow or truncation)",
    "Images scale correctly and maintain aspect ratio",
    "Touch targets are at least 44x44px on mobile",
    "Horizontal scroll checked — no overflow at any breakpoint",
    "Navigation and menus work on mobile (hamburger, dropdowns)",
  ],
  Performance: [
    "Images optimised (WebP/AVIF, correct dimensions, lazy loaded)",
    "No render-blocking scripts in the head",
    "Custom fonts preloaded or using font-display: swap",
    "Unused CSS/JS removed or deferred",
    "Checked Lighthouse score (target: 70+ mobile)",
    "No excessive DOM nesting (keep sections under 1500 nodes)",
  ],
  Accessibility: [
    "All images have alt text (descriptive, not just filename)",
    "Form inputs have associated labels",
    "Colour contrast meets WCAG AA (4.5:1 for text)",
    "Focus states visible on interactive elements",
    "Page can be navigated with keyboard (Tab, Enter, Escape)",
    "Headings follow correct hierarchy (h1 → h2 → h3)",
    "Skip to content link present",
  ],
  "Shopify-Specific": [
    "Section renders correctly in the theme editor",
    "All schema settings update the preview in real-time",
    "Section works when added to multiple pages",
    "Dynamic sources (metafields) fall back gracefully when empty",
    "Product/collection handles resolve correctly",
    "App blocks render without errors",
    "Cart drawer/page updates correctly after add-to-cart",
    "Discount codes and automatic discounts display correctly",
  ],
  "Client Requirements": [
    "Matches approved design mockups (desktop + mobile)",
    "All client-requested copy changes are implemented",
    "Brand colours, fonts, and assets match style guide",
    "All links point to correct destinations",
    "Forms send to correct email/endpoint",
    "Third-party integrations tested (Klaviyo, Yotpo, etc.)",
  ],
};
