/**
 * Pricing — single source of truth.
 *
 * Every priced offer the agency sells lives here. Two consumers:
 *   1. The Price Calculator at /tools/price-calculator — uses items that have
 *      `roleCosts` and a `price` to model project costs and margins.
 *   2. The Internal Price List at /internal/pricing — surfaces every item, grouped
 *      by `internalCategory`, with quote-line copy and last-updated dates.
 *
 * To update a price: edit the item below. Both surfaces re-render automatically.
 * To add a new offer: append a new entry. If it should appear in the calculator,
 * include `roleCosts` and `price` (and optionally `pageCount`). If it's only on the
 * internal price list (e.g. the Conversion Partnership retainer), set `price` and
 * skip `roleCosts`. Use `priceNote` to override display (e.g. "from £8,000").
 */

// ── Types ──────────────────────────────────────────────────────────────────

export type Role = "dev" | "designer" | "juniorDesigner";

export type InternalCategory =
  | "retainer"
  | "funnel-build"
  | "one-off"
  | "add-on";

export type CalcCategory =
  | "Page Builds"
  | "Secondary Pages"
  | "Tertiary Pages"
  | "Additional Services";

export type Unit =
  | "per month"
  | "per project"
  | "per page"
  | "per surface"
  | "per asset"
  | "per audit"
  | "per hour"
  | "per cycle";

export interface RoleCosts {
  dev: number;
  designer: number;
  juniorDesigner: number;
}

export interface PriceItem {
  /** Stable slug, used as React key + URL param */
  id: string;
  name: string;
  internalCategory: InternalCategory;
  /** Calculator grouping. Only set on items the calculator surfaces. */
  calcCategory?: CalcCategory;
  unit: Unit;
  /** Canonical price in GBP. Required. */
  price: number;
  /** Optional display override, e.g. "from £8,000" or "£150/hr · billed at quote". */
  priceNote?: string;
  /** Internal cost breakdown (calculator only). */
  roleCosts?: RoleCosts;
  /** How many "pages" this counts for volume-discount calc. */
  pageCount?: number;
  /** 1-line scope, what the price covers. */
  included: string;
  /** 1-line exclusion, what's deliberately out of scope. */
  excluded: string;
  /** ISO date (YYYY-MM-DD) when this row was last reviewed. */
  lastUpdated: string;
}

// ── Items ──────────────────────────────────────────────────────────────────

export const PRICE_ITEMS: PriceItem[] = [
  // ── Retainers ────────────────────────────────────────────────────────────
  {
    id: "conversion-partnership",
    name: "Conversion Partnership",
    internalCategory: "retainer",
    unit: "per month",
    price: 8000,
    priceNote: "from £8,000",
    included:
      "Roadmap, page builds, A/B testing, AOV/LTV optimisation, monthly readout — full conversion ownership",
    excluded:
      "Ad spend, headless rebuilds, bespoke app dev, integrations beyond Shopify-native",
    lastUpdated: "2026-04-29",
  },
  // ── Funnel builds ────────────────────────────────────────────────────────
  {
    id: "page-build-1",
    name: "1 Page Build",
    internalCategory: "funnel-build",
    calcCategory: "Page Builds",
    unit: "per project",
    price: 3000,
    roleCosts: { dev: 300, designer: 300, juniorDesigner: 250 },
    pageCount: 1,
    included:
      "Research, copy direction, full design, dev, QA, launch — single landing page or PDP",
    excluded:
      "Ongoing testing, content writing, additional revisions beyond two rounds",
    lastUpdated: "2026-03-12",
  },
  {
    id: "page-build-2",
    name: "2 Page Build",
    internalCategory: "funnel-build",
    calcCategory: "Page Builds",
    unit: "per project",
    price: 5500,
    roleCosts: { dev: 600, designer: 600, juniorDesigner: 500 },
    pageCount: 2,
    included:
      "Two connected pages — PDP + cart, lander + advertorial, etc. Full research, design, dev, launch",
    excluded:
      "Ongoing testing, content writing, additional revisions beyond two rounds",
    lastUpdated: "2026-03-12",
  },
  {
    id: "page-build-3",
    name: "3 Page Build",
    internalCategory: "funnel-build",
    calcCategory: "Page Builds",
    unit: "per project",
    price: 8000,
    roleCosts: { dev: 900, designer: 900, juniorDesigner: 750 },
    pageCount: 3,
    included:
      "Three connected pages — full funnel build (lander → PDP → cart) with 10% volume discount applied",
    excluded:
      "Ongoing testing, content writing, additional revisions beyond two rounds",
    lastUpdated: "2026-03-12",
  },
  {
    id: "page-build-4",
    name: "4 Page Build",
    internalCategory: "funnel-build",
    calcCategory: "Page Builds",
    unit: "per project",
    price: 10000,
    roleCosts: { dev: 1200, designer: 1200, juniorDesigner: 1000 },
    pageCount: 4,
    included:
      "Four connected pages — extended funnel with 15% volume discount applied to internal cost",
    excluded:
      "Ongoing testing, content writing, additional revisions beyond two rounds",
    lastUpdated: "2026-03-12",
  },
  {
    id: "advertorial-single",
    name: "Single Advertorial / Listicle",
    internalCategory: "funnel-build",
    calcCategory: "Page Builds",
    unit: "per project",
    price: 2000,
    roleCosts: { dev: 300, designer: 300, juniorDesigner: 250 },
    pageCount: 1,
    included:
      "One advertorial or listicle page — design, dev, launch with copy provided",
    excluded:
      "Copywriting, ad creative, ongoing optimisation",
    lastUpdated: "2026-03-12",
  },
  {
    id: "advertorial-bundle-2",
    name: "Advertorial / Listicle Bundle ×2",
    internalCategory: "funnel-build",
    calcCategory: "Page Builds",
    unit: "per project",
    price: 3500,
    roleCosts: { dev: 600, designer: 600, juniorDesigner: 500 },
    pageCount: 2,
    included:
      "Two advertorials/listicles — bundled discount, design, dev, launch",
    excluded:
      "Copywriting, ad creative, ongoing optimisation",
    lastUpdated: "2026-03-12",
  },

  // ── One-offs ─────────────────────────────────────────────────────────────
  {
    id: "site-audit",
    name: "Conversion Audit",
    internalCategory: "one-off",
    unit: "per audit",
    price: 1500,
    included:
      "8-layer scored audit (traffic → retention), revenue gap projection, prioritised 90-day roadmap draft",
    excluded:
      "Implementation, custom integrations, designer time on remediation",
    lastUpdated: "2026-04-29",
  },
  {
    id: "discovery-sprint",
    name: "Discovery Sprint",
    internalCategory: "one-off",
    unit: "per project",
    price: 2500,
    included:
      "1-week deep-dive — analytics review, customer voice, heuristic audit, scoped recommendations",
    excluded:
      "Implementation, design output, ongoing strategy support",
    lastUpdated: "2026-04-29",
  },
  {
    id: "design-system",
    name: "Design System Setup",
    internalCategory: "one-off",
    unit: "per project",
    price: 3500,
    priceNote: "from £3,500",
    included:
      "Tokens, type scale, component library (buttons, inputs, cards, sections), Figma + dev handoff",
    excluded:
      "Brand identity work, custom illustration, marketing assets",
    lastUpdated: "2026-04-29",
  },
  {
    id: "secondary-collection",
    name: "Collection Page",
    internalCategory: "one-off",
    calcCategory: "Secondary Pages",
    unit: "per page",
    price: 750,
    roleCosts: { dev: 200, designer: 200, juniorDesigner: 150 },
    pageCount: 1,
    included:
      "Custom collection template — filters, sorts, hero block, product grid",
    excluded:
      "Bespoke filtering logic, app integrations, multi-collection variants",
    lastUpdated: "2026-03-12",
  },
  {
    id: "secondary-account",
    name: "Account Page",
    internalCategory: "one-off",
    calcCategory: "Secondary Pages",
    unit: "per page",
    price: 750,
    roleCosts: { dev: 200, designer: 200, juniorDesigner: 150 },
    pageCount: 1,
    included:
      "Customer account page — orders, addresses, subscriptions surface, custom layout",
    excluded:
      "Subscription app integrations beyond standard, custom auth flows",
    lastUpdated: "2026-03-12",
  },
  {
    id: "secondary-about",
    name: "About Us Page",
    internalCategory: "one-off",
    calcCategory: "Secondary Pages",
    unit: "per page",
    price: 750,
    roleCosts: { dev: 200, designer: 200, juniorDesigner: 150 },
    pageCount: 1,
    included:
      "About / brand story page — copy provided, full design + dev to launch",
    excluded:
      "Copywriting, original photography, video production",
    lastUpdated: "2026-03-12",
  },
  {
    id: "tertiary-faq",
    name: "FAQ Page",
    internalCategory: "one-off",
    calcCategory: "Tertiary Pages",
    unit: "per page",
    price: 500,
    roleCosts: { dev: 100, designer: 100, juniorDesigner: 75 },
    pageCount: 1,
    included:
      "Searchable FAQ template — accordion, categories, content provided by client",
    excluded: "Copywriting, AI-driven search, helpdesk integrations",
    lastUpdated: "2026-03-12",
  },
  {
    id: "tertiary-contact",
    name: "Contact Page",
    internalCategory: "one-off",
    calcCategory: "Tertiary Pages",
    unit: "per page",
    price: 500,
    roleCosts: { dev: 100, designer: 100, juniorDesigner: 75 },
    pageCount: 1,
    included:
      "Contact page — form, location, support hours, basic spam protection",
    excluded:
      "CRM integrations, helpdesk routing, custom form workflows",
    lastUpdated: "2026-03-12",
  },
  {
    id: "tertiary-cart",
    name: "Cart Page",
    internalCategory: "one-off",
    calcCategory: "Tertiary Pages",
    unit: "per page",
    price: 500,
    roleCosts: { dev: 100, designer: 100, juniorDesigner: 75 },
    pageCount: 1,
    included:
      "Custom cart template — line items, upsells, trust badges, checkout link",
    excluded:
      "Checkout edits (Plus only), bespoke discount logic, subscription edits",
    lastUpdated: "2026-03-12",
  },
  {
    id: "tertiary-nav",
    name: "Navigation",
    internalCategory: "one-off",
    calcCategory: "Tertiary Pages",
    unit: "per surface",
    price: 500,
    roleCosts: { dev: 100, designer: 100, juniorDesigner: 75 },
    pageCount: 1,
    included:
      "Header + mobile drawer — mega-menu support, search, account, cart",
    excluded:
      "Custom mega-menu CMS, multi-language routing, app menu integrations",
    lastUpdated: "2026-03-12",
  },
  {
    id: "tertiary-policy",
    name: "Policy Pages (All)",
    internalCategory: "one-off",
    calcCategory: "Tertiary Pages",
    unit: "per project",
    price: 500,
    roleCosts: { dev: 100, designer: 100, juniorDesigner: 75 },
    pageCount: 1,
    included:
      "Privacy, T&Cs, returns, shipping — templated layouts, content provided by client",
    excluded: "Legal copywriting, jurisdiction-specific compliance review",
    lastUpdated: "2026-03-12",
  },
  {
    id: "ad-hoc-dev",
    name: "Ad-hoc Dev Hour",
    internalCategory: "one-off",
    unit: "per hour",
    price: 125,
    priceNote: "£125/hr · 4hr minimum",
    included:
      "Bug fixes, small tweaks, app installs, theme edits — billed in 1hr increments",
    excluded:
      "Net new builds, ongoing optimisation, work beyond a single sitting",
    lastUpdated: "2026-04-29",
  },

  // ── Add-ons ──────────────────────────────────────────────────────────────
  {
    id: "addon-static-ads-5",
    name: "5 Static Ads",
    internalCategory: "add-on",
    calcCategory: "Additional Services",
    unit: "per asset",
    price: 500,
    roleCosts: { dev: 0, designer: 125, juniorDesigner: 100 },
    included:
      "5 static ad creatives — sized for Meta (1:1, 4:5, 9:16), copy provided",
    excluded:
      "Copywriting, motion/video, performance management, paid spend",
    lastUpdated: "2026-03-12",
  },
  {
    id: "addon-static-ads-10",
    name: "10 Static Ads",
    internalCategory: "add-on",
    calcCategory: "Additional Services",
    unit: "per asset",
    price: 850,
    roleCosts: { dev: 0, designer: 250, juniorDesigner: 200 },
    included:
      "10 static ad creatives — sized for Meta (1:1, 4:5, 9:16), copy provided",
    excluded:
      "Copywriting, motion/video, performance management, paid spend",
    lastUpdated: "2026-03-12",
  },
  {
    id: "addon-emails-10",
    name: "10 Email Designs",
    internalCategory: "add-on",
    calcCategory: "Additional Services",
    unit: "per asset",
    price: 750,
    roleCosts: { dev: 0, designer: 400, juniorDesigner: 350 },
    included:
      "10 email designs — campaign or flow, ready for ESP build, copy provided",
    excluded:
      "Copywriting, ESP build/QA, flow logic setup, ongoing campaign management",
    lastUpdated: "2026-03-12",
  },
  {
    id: "addon-emails-20",
    name: "20 Email Designs",
    internalCategory: "add-on",
    calcCategory: "Additional Services",
    unit: "per asset",
    price: 1500,
    roleCosts: { dev: 0, designer: 800, juniorDesigner: 700 },
    included:
      "20 email designs — campaign or flow, ready for ESP build, copy provided",
    excluded:
      "Copywriting, ESP build/QA, flow logic setup, ongoing campaign management",
    lastUpdated: "2026-03-12",
  },
  {
    id: "addon-support-30",
    name: "Extended 30 Day Support",
    internalCategory: "add-on",
    calcCategory: "Additional Services",
    unit: "per project",
    price: 1000,
    roleCosts: { dev: 250, designer: 0, juniorDesigner: 0 },
    included:
      "30 days post-launch — bug fixes, small tweaks, monitoring, edge-case patches",
    excluded:
      "Net new features, additional revisions, scope changes, performance work",
    lastUpdated: "2026-03-12",
  },
  {
    id: "addon-support-14",
    name: "Extended 14 Day Support",
    internalCategory: "add-on",
    calcCategory: "Additional Services",
    unit: "per project",
    price: 500,
    roleCosts: { dev: 150, designer: 0, juniorDesigner: 0 },
    included:
      "14 days post-launch — bug fixes, small tweaks, monitoring",
    excluded:
      "Net new features, additional revisions, scope changes",
    lastUpdated: "2026-03-12",
  },
  {
    id: "addon-email-flow",
    name: "Full Email Flow Design",
    internalCategory: "add-on",
    calcCategory: "Additional Services",
    unit: "per project",
    price: 2500,
    roleCosts: { dev: 0, designer: 750, juniorDesigner: 0 },
    included:
      "Welcome / abandon / post-purchase / win-back — full flow design from scratch",
    excluded: "Copywriting, ESP build, list management, deliverability work",
    lastUpdated: "2026-03-12",
  },
  {
    id: "addon-brand-refresh",
    name: "Brand Refresh",
    internalCategory: "add-on",
    calcCategory: "Additional Services",
    unit: "per project",
    price: 500,
    roleCosts: { dev: 0, designer: 200, juniorDesigner: 0 },
    included:
      "Light refresh — palette, type, single-page application of new look",
    excluded:
      "Logo redesign, identity work, full brand book, photography",
    lastUpdated: "2026-03-12",
  },
  {
    id: "addon-brand-full",
    name: "Full Brand Refresh",
    internalCategory: "add-on",
    calcCategory: "Additional Services",
    unit: "per project",
    price: 2500,
    roleCosts: { dev: 0, designer: 1000, juniorDesigner: 750 },
    included:
      "Identity refresh — palette, type, components, applied across hero + key pages",
    excluded:
      "Logo redesign from scratch, naming work, full identity bible",
    lastUpdated: "2026-03-12",
  },
  {
    id: "addon-rush-24",
    name: "24hr Turnaround",
    internalCategory: "add-on",
    calcCategory: "Additional Services",
    unit: "per project",
    price: 2000,
    roleCosts: { dev: 0, designer: 400, juniorDesigner: 0 },
    priceNote: "rush fee",
    included:
      "Designer prioritises this work — 24hr first-draft turnaround on standard scope",
    excluded:
      "Anything outside the original scope, multiple revision rounds at speed",
    lastUpdated: "2026-03-12",
  },
  {
    id: "addon-rush-48",
    name: "48hr Turnaround",
    internalCategory: "add-on",
    calcCategory: "Additional Services",
    unit: "per project",
    price: 1000,
    roleCosts: { dev: 0, designer: 200, juniorDesigner: 0 },
    priceNote: "rush fee",
    included:
      "Designer prioritises this work — 48hr first-draft turnaround on standard scope",
    excluded:
      "Anything outside the original scope, multiple revision rounds at speed",
    lastUpdated: "2026-03-12",
  },
  {
    id: "addon-ab-test-setup",
    name: "A/B Test Setup + Monitor",
    internalCategory: "add-on",
    calcCategory: "Additional Services",
    unit: "per cycle",
    price: 500,
    roleCosts: { dev: 100, designer: 0, juniorDesigner: 0 },
    included:
      "Test setup in Intelligems / GrowthBook, QA, 14-day monitoring, results readout",
    excluded:
      "Variant design/dev (priced as separate page variant), ongoing iteration",
    lastUpdated: "2026-03-12",
  },
  {
    id: "addon-page-variant",
    name: "Page Variant / Reskin",
    internalCategory: "add-on",
    calcCategory: "Additional Services",
    unit: "per project",
    price: 1000,
    roleCosts: { dev: 200, designer: 200, juniorDesigner: 0 },
    included:
      "Alt version of an existing page — design tweak + dev variant, ready to A/B test",
    excluded:
      "Net new page architecture, copy rewrite, multi-variant builds",
    lastUpdated: "2026-03-12",
  },
  {
    id: "addon-cart-postpurchase",
    name: "Cart / Post Purchase",
    internalCategory: "add-on",
    calcCategory: "Additional Services",
    unit: "per surface",
    price: 500,
    roleCosts: { dev: 100, designer: 100, juniorDesigner: 75 },
    included:
      "Cart drawer or post-purchase upsell surface — design + dev, app-agnostic",
    excluded:
      "Bespoke app integrations, multi-currency variant logic",
    lastUpdated: "2026-03-12",
  },
  {
    id: "addon-extra-revision",
    name: "Additional Revision Round",
    internalCategory: "add-on",
    unit: "per project",
    price: 350,
    priceNote: "£350 per round",
    included:
      "One additional revision pass beyond the two included rounds — design tweaks, copy edits, layout adjustments",
    excluded:
      "Scope expansion, new sections/pages, major redirection",
    lastUpdated: "2026-04-29",
  },
  {
    id: "addon-scope-expansion",
    name: "Scope Expansion",
    internalCategory: "add-on",
    unit: "per hour",
    price: 150,
    priceNote: "£150/hr · billed at quote",
    included:
      "Adding sections/features beyond the original brief — re-quoted at point of request",
    excluded: "Anything that would constitute a new project on its own",
    lastUpdated: "2026-04-29",
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

const fmtGBP = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Currency-format helper — exported for consumers that need it. */
export function formatGBP(n: number): string {
  return fmtGBP.format(n);
}

export const INTERNAL_CATEGORY_LABELS: Record<InternalCategory, string> = {
  retainer: "Retainers",
  "funnel-build": "Funnel Builds",
  "one-off": "One-offs",
  "add-on": "Add-ons",
};

export const INTERNAL_CATEGORY_ORDER: InternalCategory[] = [
  "retainer",
  "funnel-build",
  "one-off",
  "add-on",
];

export const CALC_CATEGORY_ORDER: CalcCategory[] = [
  "Page Builds",
  "Secondary Pages",
  "Tertiary Pages",
  "Additional Services",
];

/** All items that the price-calculator can model (have role costs). */
export function calculatorItems(): PriceItem[] {
  return PRICE_ITEMS.filter((i) => i.roleCosts && i.calcCategory);
}

/** Group items by internal category, preserving canonical order. */
export function byInternalCategory(): Record<InternalCategory, PriceItem[]> {
  const out: Record<InternalCategory, PriceItem[]> = {
    retainer: [],
    "funnel-build": [],
    "one-off": [],
    "add-on": [],
  };
  for (const item of PRICE_ITEMS) {
    out[item.internalCategory].push(item);
  }
  return out;
}

/**
 * Format an item's price for the price-list table.
 * `priceNote` (e.g. "from £8,000") overrides the auto-formatted currency.
 */
export function formatPrice(item: PriceItem): string {
  if (item.priceNote) return item.priceNote;
  return fmtGBP.format(item.price);
}

/**
 * Build a clean text quote line ready to paste into Slack or email.
 * Single line, plain text, no markdown.
 *
 * @example
 *   quoteLineFor(itemFor("page-build-2"))
 *   // → "2 Page Build — £5,500 per project. Two connected pages…"
 */
export function quoteLineFor(item: PriceItem): string {
  return `${item.name} — ${formatPrice(item)} ${item.unit}. ${item.included}.`;
}

/** Convenience accessor by id. Throws if missing. */
export function itemFor(id: string): PriceItem {
  const found = PRICE_ITEMS.find((i) => i.id === id);
  if (!found) throw new Error(`Pricing item not found: ${id}`);
  return found;
}
