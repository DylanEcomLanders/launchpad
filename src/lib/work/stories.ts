import {
  PORTFOLIO_CATEGORIES,
  type PortfolioCategory,
  type PortfolioProject,
} from "@/lib/portfolio-v2/types";
import type { WorkStory } from "./types";

/** The only public case we narrate. Everything else is a work frame. */
export const HOUND_SLUG = "hound-nutrition";

export const HOUND_STORY: WorkStory = {
  slug: HOUND_SLUG,
  name: "Hound Nutrition",
  category: "Product Pages",
  eyebrow: "Public case · Calm Organ Blend",
  lead: "The dog wouldn’t stop scratching. The page still read like a catalog.",
  beats: [
    {
      label: "Problem",
      body: "Loving owners in their 40s, watching a dog itch, lick paws, shake its head. Ads and advertorials named that night. The product page listed a blend.",
    },
    {
      label: "Shipped",
      body: "A Calm Organ Blend page built to hold the trust the advertorial earned: what it is, why the organs, how to dose, a clear offer, sticky add-to-cart. Then a tighter top fold and price framing, live against the original.",
    },
    {
      label: "Happened",
      body: "The first test is still running. Traffic is thin. The page is finally picking up momentum — an early trend, not a locked scoreboard.",
    },
    {
      label: "Next",
      body: "Stay on this page. Extra URLs would starve a test that already has limited volume. Subscriptions when the one-time offer is stable.",
    },
  ],
};

const SKIP = ["angusway"];

/** Same six bodies of work as the /portfolio Figma files — never invented clients. */
export const WORK_REELS: {
  category: PortfolioCategory;
  slug: string;
  index: string;
  blurb: string;
}[] = [
  {
    category: "Product Pages",
    slug: "product-pages",
    index: "01",
    blurb: "The buy page. Offer, proof, add to cart — readable at a glance.",
  },
  {
    category: "Highlight Pages",
    slug: "highlight-pages",
    index: "02",
    blurb: "One product, one job. No nav, no wander.",
  },
  {
    category: "Advertorials / Listicles",
    slug: "advertorials-listicles",
    index: "03",
    blurb: "The prelander. Story before the store.",
  },
  {
    category: "Carts",
    slug: "carts",
    index: "04",
    blurb: "The last three inches before pay.",
  },
  {
    category: "Homepages",
    slug: "homepages",
    index: "05",
    blurb: "The brand, then the path in.",
  },
  {
    category: "Webflow Pages",
    slug: "webflow-pages",
    index: "06",
    blurb: "Built pages. Not a theme with the logo swapped.",
  },
];

export function categorySlug(category: string): string {
  const known = WORK_REELS.find((reel) => reel.category === category);
  if (known) return known.slug;
  return category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function resolveCategory(project: PortfolioProject): PortfolioCategory | null {
  if (project.category && (PORTFOLIO_CATEGORIES as readonly string[]).includes(project.category)) {
    return project.category as PortfolioCategory;
  }
  const hay = `${project.category ?? ""} ${project.slug} ${project.name}`.toLowerCase();
  if (hay.includes("advertorial") || hay.includes("listicle")) return "Advertorials / Listicles";
  if (hay.includes("highlight")) return "Highlight Pages";
  if (hay.includes("webflow")) return "Webflow Pages";
  if (hay.includes("homepage") || hay.includes("home page")) return "Homepages";
  if (/\bcart/.test(hay)) return "Carts";
  if (hay.includes("product page") || hay.includes("pdp")) return "Product Pages";
  return null;
}

export function haystack(project: Pick<PortfolioProject, "slug" | "name" | "client">): string {
  return `${project.slug} ${project.name} ${project.client ?? ""}`.toLowerCase();
}

export function isSkippedProject(project: PortfolioProject): boolean {
  const hay = haystack(project);
  return SKIP.some((token) => hay.includes(token));
}

export function isHoundProject(project: PortfolioProject): boolean {
  return haystack(project).includes("hound");
}

export function isBeforeNamed(project: PortfolioProject): boolean {
  return /\b(before|original|control)\b/i.test(`${project.slug} ${project.name}`);
}

export function isAfterNamed(project: PortfolioProject): boolean {
  return /\b(after|redesign|revised|new)\b/i.test(`${project.slug} ${project.name}`);
}

export function pickHoundPair(hounds: PortfolioProject[]): {
  featured: PortfolioProject | null;
  before: PortfolioProject | null;
} {
  if (hounds.length === 0) return { featured: null, before: null };
  const before = hounds.find(isBeforeNamed) ?? null;
  const after =
    hounds.find((p) => p.id !== before?.id && isAfterNamed(p)) ??
    hounds.find((p) => p.id !== before?.id) ??
    hounds[0];
  return {
    featured: after,
    before: before && before.id !== after.id ? before : null,
  };
}
