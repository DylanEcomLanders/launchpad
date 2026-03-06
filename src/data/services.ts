// ── Service catalog ─────────────────────────────────────────────
// Single source of truth — mirrors the public Pricing & Packages page.
// Pricing is tiered (Tier 1 / Tier 2) based on client classification.
// Tier is selected when generating a proposal link.
// Shopify Draft Orders are created dynamically from this data.

export type ServiceMode = "one-off" | "retainer";
export type ClientTier = 1 | 2;

export interface TierPricing {
  amount: number; // pence (GBP)
  label: string; // display string e.g. "£1,499/mo"
}

export interface ServicePricing {
  tier1: TierPricing;
  tier2: TierPricing;
  interval?: string; // "month" for retainers
}

export interface ServiceOption {
  id: string;
  name: string;
  category: "builds" | "cro" | "additional";
  description: string;
  features: string[];
  modes: ServiceMode[];
  recommended?: boolean;
  isAddOn?: boolean;
  maxQuantity?: number; // for quantity-selectable services (if needed)
  pricing: Partial<Record<ServiceMode, ServicePricing>>;
}

// ── Category labels (display order) ────────────────────────────

export const serviceCategories: Record<string, string> = {
  builds: "Page Builds",
  cro: "CRO Retainer",
  additional: "Additional Services",
};

// ── Services ───────────────────────────────────────────────────
// Pricing matches the public Pricing & Packages page exactly.

export const services: ServiceOption[] = [
  // ━━ PAGE BUILDS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    id: "page-build-1",
    name: "1 Page Build",
    category: "builds",
    description:
      "Maximise performance on a single page build.",
    features: [
      "Custom coded, performance first page",
      "Copywriting, design, development & support",
      "Mobile-first responsive build",
    ],
    modes: ["one-off"],
    pricing: {
      "one-off": {
        tier1: { amount: 299900, label: "£2,999" },
        tier2: { amount: 399900, label: "£3,999" },
      },
    },
  },
  {
    id: "page-build-2",
    name: "2 Page Build",
    category: "builds",
    description:
      "Double page focus to enhance your site's user experience.",
    features: [
      "Two custom coded pages",
      "Copywriting, design, development & support",
      "10% volume saving",
    ],
    modes: ["one-off"],
    recommended: true,
    pricing: {
      "one-off": {
        tier1: { amount: 549900, label: "£5,499" },
        tier2: { amount: 699900, label: "£6,999" },
      },
    },
  },
  {
    id: "page-build-3",
    name: "3 Page Build",
    category: "builds",
    description:
      "Full funnel reinforcement for all essential pages.",
    features: [
      "Three custom coded pages",
      "Copywriting, design, development & support",
      "15% volume saving",
    ],
    modes: ["one-off"],
    pricing: {
      "one-off": {
        tier1: { amount: 799900, label: "£7,999" },
        tier2: { amount: 1049900, label: "£10,499" },
      },
    },
  },
  {
    id: "page-build-4",
    name: "4 Page Build",
    category: "builds",
    description:
      "Give your store an overhaul to maximise profitability.",
    features: [
      "Four custom coded pages",
      "Copywriting, design, development & support",
      "15% volume saving",
    ],
    modes: ["one-off"],
    pricing: {
      "one-off": {
        tier1: { amount: 999900, label: "£9,999" },
        tier2: { amount: 1249900, label: "£12,499" },
      },
    },
  },
  {
    id: "advertorial-single",
    name: "Single Advertorial / Listicle",
    category: "builds",
    description:
      "Long-form content page that warms cold traffic before hitting your PDP.",
    features: [
      "Conversion-optimised long-form page",
      "Test paired with a new page build",
      "Copywriting & design included",
    ],
    modes: ["one-off"],
    pricing: {
      "one-off": {
        tier1: { amount: 200000, label: "£2,000" },
        tier2: { amount: 269900, label: "£2,699" },
      },
    },
  },
  {
    id: "advertorial-bundle",
    name: "Advertorial / Listicle Bundle ×2",
    category: "builds",
    description:
      "Two advertorials for split testing different angles — identify which narrative drives the highest quality traffic.",
    features: [
      "Two conversion-optimised long-form pages",
      "Split test different angles",
      "10% bundle saving",
    ],
    modes: ["one-off"],
    pricing: {
      "one-off": {
        tier1: { amount: 350000, label: "£3,500" },
        tier2: { amount: 469900, label: "£4,699" },
      },
    },
  },

  // ━━ CRO RETAINER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    id: "cro-foundation",
    name: "Foundation — 1 Test / Week",
    category: "cro",
    description:
      "Ongoing testing to compound growth. 60 day commitment.",
    features: [
      "4 A/B tests per month",
      "Weekly A/B test — setup, deployment & monitoring",
      "Protect your revenue baseline with ongoing Shopify support",
      "Regular reporting on test results and learnings",
      "Eliminates friction keeping your funnel healthy & efficient",
    ],
    modes: ["retainer"],
    recommended: true,
    pricing: {
      retainer: {
        tier1: { amount: 149900, label: "£1,499/mo" },
        tier2: { amount: 299900, label: "£2,999/mo" },
        interval: "month",
      },
    },
  },
  {
    id: "cro-growth",
    name: "Growth — 2 Tests / Week",
    category: "cro",
    description:
      "The more we test, the faster you win. 60 day commitment.",
    features: [
      "8 A/B tests per month",
      "Double the testing velocity — find winners faster",
      "Scale your output based on the data your brand generates",
      "Priority test scheduling and implementation",
      "Monthly strategy session to review results and plan next cycle",
    ],
    modes: ["retainer"],
    pricing: {
      retainer: {
        tier1: { amount: 249900, label: "£2,499/mo" },
        tier2: { amount: 399900, label: "£3,999/mo" },
        interval: "month",
      },
    },
  },
  {
    id: "cro-scale",
    name: "Scale — 4 Tests / Week",
    category: "cro",
    description:
      "Maximum testing cadence for brands serious about CRO. 60 day commitment.",
    features: [
      "16 A/B tests per month",
      "Broad coverage across your entire funnel simultaneously",
      "Full test documentation and conversion rate tracking",
      "Dedicated CRO roadmap updated weekly based on live data",
    ],
    modes: ["retainer"],
    pricing: {
      retainer: {
        tier1: { amount: 349900, label: "£3,499/mo" },
        tier2: { amount: 499900, label: "£4,999/mo" },
        interval: "month",
      },
    },
  },

  // ━━ ADDITIONAL SERVICES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Bolt onto any project or retainer to extend output.

  {
    id: "static-ads-5",
    name: "5 Static Ads",
    category: "additional",
    description: "Five custom-designed static ad creatives.",
    features: [],
    modes: ["one-off"],
    isAddOn: true,
    pricing: {
      "one-off": {
        tier1: { amount: 50000, label: "£500" },
        tier2: { amount: 62500, label: "£625" },
      },
    },
  },
  {
    id: "static-ads-10",
    name: "10 Static Ads",
    category: "additional",
    description: "Ten custom-designed static ad creatives.",
    features: [],
    modes: ["one-off"],
    isAddOn: true,
    pricing: {
      "one-off": {
        tier1: { amount: 85000, label: "£850" },
        tier2: { amount: 105000, label: "£1,050" },
      },
    },
  },
  {
    id: "email-designs-10",
    name: "10 Email Designs",
    category: "additional",
    description: "Ten branded email templates designed to convert.",
    features: [],
    modes: ["one-off"],
    isAddOn: true,
    pricing: {
      "one-off": {
        tier1: { amount: 75000, label: "£750" },
        tier2: { amount: 99900, label: "£999" },
      },
    },
  },
  {
    id: "email-designs-20",
    name: "20 Email Designs",
    category: "additional",
    description: "Twenty branded email templates designed to convert.",
    features: [],
    modes: ["one-off"],
    isAddOn: true,
    pricing: {
      "one-off": {
        tier1: { amount: 150000, label: "£1,500" },
        tier2: { amount: 179900, label: "£1,799" },
      },
    },
  },
  {
    id: "extended-support-30",
    name: "Extended 30 Day Support",
    category: "additional",
    description: "30 days of post-launch development support.",
    features: [],
    modes: ["one-off"],
    isAddOn: true,
    pricing: {
      "one-off": {
        tier1: { amount: 100000, label: "£1,000" },
        tier2: { amount: 125000, label: "£1,250" },
      },
    },
  },
  {
    id: "extended-support-14",
    name: "Extended 14 Day Support",
    category: "additional",
    description: "14 days of post-launch development support.",
    features: [],
    modes: ["one-off"],
    isAddOn: true,
    pricing: {
      "one-off": {
        tier1: { amount: 50000, label: "£500" },
        tier2: { amount: 62500, label: "£625" },
      },
    },
  },
  {
    id: "email-flow-design",
    name: "Full Email Flow Design",
    category: "additional",
    description: "Fully designed automated email flows — cart recovery, welcome, win-back & more.",
    features: [],
    modes: ["one-off"],
    isAddOn: true,
    pricing: {
      "one-off": {
        tier1: { amount: 250000, label: "£2,500" },
        tier2: { amount: 299900, label: "£2,999" },
      },
    },
  },
  {
    id: "brand-refresh",
    name: "Brand Refresh",
    category: "additional",
    description: "Light brand refresh to modernise your visual identity.",
    features: [],
    modes: ["one-off"],
    isAddOn: true,
    pricing: {
      "one-off": {
        tier1: { amount: 50000, label: "£500" },
        tier2: { amount: 62500, label: "£625" },
      },
    },
  },
  {
    id: "turnaround-24h",
    name: "24hr Turnaround",
    category: "additional",
    description: "Priority 24-hour turnaround. Design only.",
    features: [],
    modes: ["one-off"],
    isAddOn: true,
    pricing: {
      "one-off": {
        tier1: { amount: 200000, label: "£2,000" },
        tier2: { amount: 250000, label: "£2,500" },
      },
    },
  },
  {
    id: "turnaround-48h",
    name: "48hr Turnaround",
    category: "additional",
    description: "Priority 48-hour turnaround. Design only.",
    features: [],
    modes: ["one-off"],
    isAddOn: true,
    pricing: {
      "one-off": {
        tier1: { amount: 100000, label: "£1,000" },
        tier2: { amount: 125000, label: "£1,250" },
      },
    },
  },
  {
    id: "ab-test-setup",
    name: "A/B Test Setup + Monitor",
    category: "additional",
    description: "One-off A/B test setup, deployment, and monitoring.",
    features: [],
    modes: ["one-off"],
    isAddOn: true,
    pricing: {
      "one-off": {
        tier1: { amount: 50000, label: "£500" },
        tier2: { amount: 62500, label: "£625" },
      },
    },
  },
  {
    id: "page-variant",
    name: "Page Variant / Reskin",
    category: "additional",
    description: "Variant or reskin of an existing page for testing.",
    features: [],
    modes: ["one-off"],
    isAddOn: true,
    pricing: {
      "one-off": {
        tier1: { amount: 100000, label: "£1,000" },
        tier2: { amount: 100000, label: "£1,000" },
      },
    },
  },
  {
    id: "cart-post-purchase",
    name: "Cart / Post Purchase",
    category: "additional",
    description: "Custom cart page or post-purchase upsell experience.",
    features: [],
    modes: ["one-off"],
    isAddOn: true,
    pricing: {
      "one-off": {
        tier1: { amount: 50000, label: "£500" },
        tier2: { amount: 62500, label: "£625" },
      },
    },
  },
  {
    id: "full-brand-refresh",
    name: "Full Brand Refresh",
    category: "additional",
    description: "Comprehensive brand overhaul — logo, typography, colour system & guidelines.",
    features: [],
    modes: ["one-off"],
    isAddOn: true,
    pricing: {
      "one-off": {
        tier1: { amount: 250000, label: "£2,500" },
        tier2: { amount: 299900, label: "£2,999" },
      },
    },
  },

  // ━━ TEST ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Remove before going live
  {
    id: "test-checkout",
    name: "Test Checkout (50p)",
    category: "additional",
    description: "50p test item to verify the full checkout → webhook → Slack flow. Remove before launch.",
    features: [],
    modes: ["one-off"],
    isAddOn: true,
    pricing: {
      "one-off": {
        tier1: { amount: 50, label: "£0.50" },
        tier2: { amount: 50, label: "£0.50" },
      },
    },
  },
];

// ── Retainer × Build discount ───────────────────────────────────
// When a CRO retainer is selected alongside page builds, the build
// prices are discounted. Matches the public pricing page.

export const retainerBuildDiscount: Record<string, number> = {
  "cro-foundation": 0.10, // 10 % off builds
  "cro-growth": 0.15, // 15 % off builds
  "cro-scale": 0.20, // 20 % off builds
};

// ── Helpers ─────────────────────────────────────────────────────

export function getServiceById(id: string): ServiceOption | undefined {
  return services.find((s) => s.id === id);
}

export function getServicesByCategory(
  svcs: ServiceOption[]
): Record<string, ServiceOption[]> {
  const cats: Record<string, ServiceOption[]> = {};
  for (const s of svcs) {
    if (!cats[s.category]) cats[s.category] = [];
    cats[s.category].push(s);
  }
  return cats;
}

/** Resolve tier-specific pricing from a ServicePricing object */
export function getPrice(
  pricing: ServicePricing,
  tier: ClientTier
): TierPricing {
  return tier === 1 ? pricing.tier1 : pricing.tier2;
}

export function formatGBP(pence: number): string {
  const pounds = pence / 100;
  const hasPennies = pence % 100 !== 0;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: hasPennies ? 2 : 0,
    maximumFractionDigits: hasPennies ? 2 : 0,
  }).format(pounds);
}
