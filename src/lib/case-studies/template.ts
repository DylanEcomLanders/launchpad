/* ── Case Studies — Empty template + duplicate helpers ── */

import type { CaseStudy } from "./types";

export function genId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function makeEmptyCaseStudy(slug: string): CaseStudy {
  const now = new Date().toISOString();
  return {
    id: genId(),
    slug,
    meta: {
      brandName: "",
      projectType: "single-funnel",
      surfacesShipped: 0,
    },
    hero: {
      headline: "",
      subhead: "",
      mediaKind: "image",
      collageImages: [],
    },
    headlineStats: [],
    challenge: {
      prose: "",
      pullQuotes: [],
    },
    approach: {
      cards: [],
    },
    results: {
      tests: [],
      screenshots: [],
    },
    designs: {
      figmaFrames: [],
    },
    compoundedResults: [],
    techStack: [],
    relatedCaseStudyIds: [],
    cta: {
      headline: "Looking to scale your brand profitably?",
      subhead: "",
      buttonLabel: "Book a call",
      buttonHref: "/audit",
      secondaryLabel: "WhatsApp us",
      secondaryHref: "",
    },
    settings: {
      published: false,
      brandColor: "#E04A2F",     // default coral accent
    },
    created_at: now,
    updated_at: now,
  };
}

/* Clone an existing case study as a new draft. Strips IDs, regenerates slug,
 * unpublishes, resets timestamps. Image URLs preserved (point at same Storage
 * objects) — duplicating doesn't copy storage. */
export function duplicateCaseStudy(source: CaseStudy, newSlug: string): CaseStudy {
  const now = new Date().toISOString();
  return {
    ...source,
    id: genId(),
    slug: newSlug,
    headlineStats: source.headlineStats.map((s) => ({ ...s, id: genId() })),
    challenge: {
      ...source.challenge,
      pullQuotes: source.challenge.pullQuotes.map((q) => ({ ...q, id: genId() })),
    },
    approach: {
      ...source.approach,
      cards: source.approach.cards.map((c) => ({ ...c, id: genId() })),
    },
    results: {
      ...source.results,
      tests: source.results.tests.map((t) => ({ ...t, id: genId() })),
    },
    designs: {
      ...source.designs,
      figmaFrames: source.designs.figmaFrames.map((f) => ({ ...f, id: genId() })),
    },
    compoundedResults: source.compoundedResults.map((c) => ({ ...c, id: genId() })),
    settings: {
      ...source.settings,
      published: false,
      publishedAt: undefined,
    },
    created_at: now,
    updated_at: now,
  };
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
