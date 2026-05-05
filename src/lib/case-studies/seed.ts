/* ── Case Studies — Example seed data ──
 * Used by /api/case-studies/seed to populate one fully-formed case study
 * so the layout can be visually pressure-tested.
 */

import type { CaseStudy } from "./types";
import { genId } from "./template";

export function makeExampleCaseStudy(): CaseStudy {
  const now = new Date().toISOString();
  return {
    id: "example-suppsx",
    slug: "suppsx",
    meta: {
      brandName: "SuppsX",
      industry: "Supplements",
      verticalTag: "DTC",
      projectType: "full-funnel",
      timeframe: "12 Months",
      surfacesShipped: 19,
      services: "Conversion Engine",
    },
    hero: {
      headline: "Supplement brand increased MRR by 146% in 6 months",
      subhead:
        "A foundational rebuild of their entire funnel structure saw compounding tests, a fresh Shopify build and complete 360-degree strategy sustain monthly growth.",
      mediaKind: "image",
      collageImages: [],
    },
    headlineStats: [
      { id: genId(), value: "+146%", label: "Increase in monthly recurring revenue" },
      { id: genId(), value: "+39%", label: "Increased conversion rate" },
      { id: genId(), value: "-62%", label: "Page load speed (lower is better)" },
      { id: genId(), value: "$145,654", label: "Extra generated monthly" },
    ],
    challenge: {
      headline: "Increased ad spend only led to increased CAC and reduced ability to scale profitably.",
      prose:
        "SuppsX was pouring 6-figures a month into Meta but their landing page was built for branded organic traffic. Cold paid visitors hit a hero that assumed they already trusted the brand — bounce rates climbed past 70% on top campaigns and CAC was creeping up every quarter.\n\nOn the technical side, the legacy theme had accumulated 4 years of feature debt. First contentful paint sat at 4.2s on mobile, Core Web Vitals were failing. They needed both the funnel and the foundation rebuilt.",
      pullQuotes: [],
    },
    approach: {
      headline: "Strip the funnel back to first principles, then build forward.",
      intro: "",
      cards: [
        {
          id: genId(),
          title: "Strategic Roadmap",
          description:
            "Mined 200+ post-purchase surveys, 40 reviews, and 12 user interviews to map the real buying motivations, not the ones the brand assumed.",
        },
        {
          id: genId(),
          title: "Full Funnel Rebuild",
          description:
            "New paid landing page architecture: cold-traffic hero, problem-aware messaging, social proof above the fold, sticky ATC, exit-intent capture.",
        },
        {
          id: genId(),
          title: "Theme Refactor + Tests",
          description:
            "Rebuilt the Shopify theme on a performance-first foundation. Shipped 19 A/B tests across PDP, cart, and checkout — kept the 14 that won.",
        },
      ],
    },
    results: {
      tests: [
        {
          id: genId(),
          name: "PDP hero — variant matrix",
          variantALabel: "Original",
          variantBLabel: "Cold-traffic hero",
          primaryMetric: "Conversion rate",
          liftPercent: 23.4,
          confidencePercent: 97,
          testDurationDays: 14,
          sampleSize: 84200,
          trafficSplit: "50/50",
        },
        {
          id: genId(),
          name: "Cart drawer — bundle nudge",
          variantALabel: "No nudge",
          variantBLabel: "Bundle + savings",
          primaryMetric: "Average order value",
          liftPercent: 18.1,
          confidencePercent: 96,
          testDurationDays: 10,
          sampleSize: 31200,
          trafficSplit: "50/50",
        },
        {
          id: genId(),
          name: "Checkout — express buttons",
          variantALabel: "Stacked",
          variantBLabel: "Inline above email",
          primaryMetric: "Checkout completion",
          liftPercent: 9.6,
          confidencePercent: 95,
          testDurationDays: 12,
          sampleSize: 22800,
          trafficSplit: "50/50",
        },
      ],
      screenshots: [],
    },
    designs: {
      headline: "The same brand, but better.",
      figmaFrames: [],
      desktopSlices: [],
      mobileSlices: [],
    },
    compoundedResults: [
      {
        id: genId(),
        label: "Monthly recurring revenue",
        before: "£650K",
        after: "£1.23M",
        deltaPercent: 125,
        deltaDirection: "up",
      },
      {
        id: genId(),
        label: "Conversion rate",
        before: "1.7%",
        after: "3.1%",
        deltaPercent: 90,
        deltaDirection: "up",
      },
      {
        id: genId(),
        label: "Page load speed",
        before: "4.2s",
        after: "2.6s",
        deltaPercent: 61,
        deltaDirection: "down",
      },
      {
        id: genId(),
        label: "Average order value",
        before: "£62",
        after: "£73",
        deltaPercent: 26,
        deltaDirection: "up",
      },
    ],
    testimonial: {
      quote:
        "Ecomlanders didn't just redesign our pages, they rebuilt how we think about paid traffic. Six months in, ROAS is up nearly 2x.",
      name: "Joe Bloggs",
      role: "Chief Marketing Officer, SuppsX",
    },
    techStack: ["Shopify Plus", "Intelligems", "Klaviyo", "GA4", "Hotjar"],
    relatedCaseStudyIds: [],
    cta: {
      headline: "Looking to scale your brand profitably?",
      subhead: "",
      buttonLabel: "Book a call",
      buttonHref: "/audit",
      secondaryLabel: "WhatsApp us",
      secondaryHref: "https://wa.me/447000000000",
    },
    settings: {
      published: true,
      brandColor: "#E04A2F",
      publishedAt: now,
    },
    created_at: now,
    updated_at: now,
  };
}
