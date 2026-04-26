// Priority matrix — pure data config.
// Maps (trafficSource × painPoint) to 3 ranked priorities. {vertical} placeholder
// is interpolated at render time so we don't repeat the matrix per-vertical.
//
// Edit this file as we see real submissions — the rendering layer is purely
// data-driven and won't need code changes when matrix entries are tuned.

import type { TrafficSource, PainPoint, Vertical } from "./types";

export interface PriorityEntry {
  rank: 1 | 2 | 3;
  label: string;
}

export interface PriorityMapping {
  trafficSource: TrafficSource | "*"; // "*" matches any
  painPoint: PainPoint | "*";
  priorities: PriorityEntry[];
}

export const PRIORITY_MATRIX: PriorityMapping[] = [
  // ── Meta ads + email/SMS × low add-to-cart ──────────────────────────────
  {
    trafficSource: "meta_paid_email",
    painPoint: "low_atc",
    priorities: [
      { rank: 1, label: "Landing page → PDP handoff is killing add-to-cart rate" },
      { rank: 2, label: "PDP missing trust + education for {vertical} buyers" },
      { rank: 3, label: "No AOV mechanism (bundles, threshold rewards, cart upsell)" },
    ],
  },
  // ── Meta cold × ads not converting ──────────────────────────────────────
  {
    trafficSource: "meta_cold",
    painPoint: "ads_not_converting",
    priorities: [
      { rank: 1, label: "Cold ad → landing page message-match is weak — visitors land confused" },
      { rank: 2, label: "Above-the-fold for {vertical} doesn't qualify the buyer fast enough" },
      { rank: 3, label: "Missing social proof density before the first CTA" },
    ],
  },
  // ── Meta cold × low ATC ─────────────────────────────────────────────────
  {
    trafficSource: "meta_cold",
    painPoint: "low_atc",
    priorities: [
      { rank: 1, label: "Landing page is converting interest but PDP isn't closing the buyer" },
      { rank: 2, label: "{vertical} objections aren't answered before the ATC button" },
      { rank: 3, label: "Sticky ATC + price reinforcement missing on mobile" },
    ],
  },
  // ── Meta + email × cart abandonment ─────────────────────────────────────
  {
    trafficSource: "meta_paid_email",
    painPoint: "cart_abandonment",
    priorities: [
      { rank: 1, label: "Cart drawer / checkout has friction — shipping + trust signals missing" },
      { rank: 2, label: "No urgency or anchor at the cart stage for {vertical} buyers" },
      { rank: 3, label: "Email/SMS abandonment flow timing or copy is off" },
    ],
  },
  // ── Any traffic × low AOV ───────────────────────────────────────────────
  {
    trafficSource: "*",
    painPoint: "low_aov",
    priorities: [
      { rank: 1, label: "No threshold reward or progress bar — buyers add 1 unit and leave" },
      { rank: 2, label: "{vertical} bundle architecture missing (single SKU vs subscribe + bundle)" },
      { rank: 3, label: "Cart drawer upsells aren't merchandised — wrong product, wrong moment" },
    ],
  },
  // ── Influencers × ads not converting ────────────────────────────────────
  {
    trafficSource: "influencers",
    painPoint: "ads_not_converting",
    priorities: [
      { rank: 1, label: "Influencer traffic is warm but the page treats them like cold buyers" },
      { rank: 2, label: "Creator-specific landing page would lift CVR for {vertical} drops" },
      { rank: 3, label: "Trust signals are doubled-up — UGC + clinical/standards proof unclear" },
    ],
  },
  // ── Organic / SEO × any pain ─ default-ish ──────────────────────────────
  {
    trafficSource: "organic",
    painPoint: "*",
    priorities: [
      { rank: 1, label: "Organic visitors are research-mode — buyer education is thin for {vertical}" },
      { rank: 2, label: "Internal links between blog → PDP aren't engineered for purchase intent" },
      { rank: 3, label: "Long-tail PDPs are missing schema + structured comparison content" },
    ],
  },
  // ── Mixed × all of it ───────────────────────────────────────────────────
  {
    trafficSource: "mixed",
    painPoint: "all_of_it",
    priorities: [
      { rank: 1, label: "Funnel doesn't have a clean shape — every traffic source converts at the same rate (which is the tell)" },
      { rank: 2, label: "PDP is doing too much — needs to be split for cold vs warm {vertical} buyers" },
      { rank: 3, label: "AOV mechanism is the easiest unlock once funnel split is in place" },
    ],
  },
  // ── Any × all of it (catch-all for omnibus pain) ────────────────────────
  {
    trafficSource: "*",
    painPoint: "all_of_it",
    priorities: [
      { rank: 1, label: "Diagnostic before action — too many signals to chase, need to find the actual leak" },
      { rank: 2, label: "{vertical} PDP is the highest-leverage page — fix it first" },
      { rank: 3, label: "Build a 30-day test cadence so improvements compound instead of one-shot" },
    ],
  },
  // ── DEFAULT (always last) ───────────────────────────────────────────────
  {
    trafficSource: "*",
    painPoint: "*",
    priorities: [
      { rank: 1, label: "PDP is the highest-leverage page on a {vertical} store — start there" },
      { rank: 2, label: "Cart drawer + threshold reward typically lift AOV 8–14%" },
      { rank: 3, label: "Test cadence matters more than any single change — set up the system" },
    ],
  },
];

const VERTICAL_TEXT: Record<Vertical, string> = {
  beauty: "beauty",
  supplements: "supplements",
  apparel: "apparel",
  food: "food & beverage",
  other: "your category",
};

export function getPriorities(
  trafficSource: TrafficSource,
  painPoint: PainPoint,
  vertical: Vertical,
): PriorityEntry[] {
  // Find the most specific match first, fall back through wildcards to default
  const candidates = [
    PRIORITY_MATRIX.find((m) => m.trafficSource === trafficSource && m.painPoint === painPoint),
    PRIORITY_MATRIX.find((m) => m.trafficSource === trafficSource && m.painPoint === "*"),
    PRIORITY_MATRIX.find((m) => m.trafficSource === "*" && m.painPoint === painPoint),
    PRIORITY_MATRIX.find((m) => m.trafficSource === "*" && m.painPoint === "*"),
  ];
  const match = candidates.find(Boolean)!;
  const verticalText = VERTICAL_TEXT[vertical];
  return match.priorities.map((p) => ({
    rank: p.rank,
    label: p.label.replaceAll("{vertical}", verticalText),
  }));
}
