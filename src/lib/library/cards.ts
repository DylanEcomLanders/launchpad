/* ── Work library cards ──
 * View-model over portfolio-v2 projects. Frames only — no case-study
 * copy, no invented clients, no win metrics. Angusway is skipped.
 */

import {
  PORTFOLIO_CATEGORIES,
  type PortfolioCategory,
  type PortfolioProject,
  type PortfolioSlice,
} from "@/lib/portfolio-v2/types";

export type LibraryCard = {
  id: string;
  name: string;
  category: string;
  niche: string | null;
  tags: string[];
  preview: PortfolioSlice | null;
  coverSlices: PortfolioSlice[];
  slices: PortfolioSlice[];
  empty: boolean;
  cluster: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotate: number;
};

export type LibraryCluster = {
  id: string;
  label: string;
  x: number;
  y: number;
};

export type LibraryBoard = {
  cards: LibraryCard[];
  clusters: LibraryCluster[];
  niches: string[];
};

const SKIP = /angusway/i;

const CARD_W = 188;
const CARD_RATIO = 2.46;
const GAP_X = 7;
const GAP_Y = 7;
const MIN_UNIT_CARDS = 32;

/* Obvious brand → niche only. Do not invent clients or win stories. */
const KNOWN_BRANDS: { match: RegExp; niche: string }[] = [
  { match: /\bekon\b/i, niche: "Travel" },
];

const NICHE_KEYWORDS: { niche: string; match: RegExp }[] = [
  { niche: "Travel", match: /\b(travel|luggage|suitcase|trip|flight|hotel|vacation|holiday)\b/i },
  { niche: "Supplements", match: /\b(supplement|vitamin|nutrition|nootropic|protein|collagen)\b/i },
  { niche: "Beauty", match: /\b(beauty|skincare|skin[- ]care|cosmetic|serum|makeup|fragrance)\b/i },
  { niche: "Pet", match: /\b(pet|dog|cat|puppy|kitten)\b/i },
  { niche: "Fashion", match: /\b(fashion|apparel|clothing|streetwear|footwear|sneaker)\b/i },
  { niche: "Food", match: /\b(food|snack|coffee|tea|grocery|beverage)\b/i },
  { niche: "Home", match: /\b(homeware|home[- ]goods|furniture|decor)\b/i },
  { niche: "Tech", match: /\b(tech|gadget|electronics)\b/i },
  { niche: "Wellness", match: /\b(wellness|fitness|yoga)\b/i },
  { niche: "Kids", match: /\b(kids|baby|toddler|children)\b/i },
  { niche: "Outdoor", match: /\b(outdoor|camping|hiking)\b/i },
];

const PAGE_TYPES = new Set<string>(PORTFOLIO_CATEGORIES.map((c) => c.toLowerCase()));

function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function unit(seed: string, salt: number): number {
  return (hash32(`${seed}:${salt}`) % 10000) / 10000;
}

function isSkipped(project: PortfolioProject): boolean {
  const hay = `${project.name} ${project.slug} ${project.client ?? ""}`;
  return SKIP.test(hay);
}

function titleCase(s: string): string {
  return s
    .split(/[\s/_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function inferNiche(project: {
  name: string;
  client?: string;
  tags?: string[];
  notes?: string;
  category?: string;
}): string | null {
  for (const tag of project.tags ?? []) {
    const t = tag.trim();
    if (!t || PAGE_TYPES.has(t.toLowerCase())) continue;
    const fromTag = NICHE_KEYWORDS.find((n) => n.match.test(t) || n.niche.toLowerCase() === t.toLowerCase());
    if (fromTag) return fromTag.niche;
    if (t.length <= 24 && !/\d/.test(t)) return titleCase(t);
  }

  const hay = [project.name, project.client ?? "", project.notes ?? ""].join(" ");
  for (const brand of KNOWN_BRANDS) {
    if (brand.match.test(hay)) return brand.niche;
  }
  for (const row of NICHE_KEYWORDS) {
    if (row.match.test(hay)) return row.niche;
  }
  return null;
}

function framesFor(project: PortfolioProject): {
  preview: PortfolioSlice | null;
  coverSlices: PortfolioSlice[];
  slices: PortfolioSlice[];
} {
  const mobile = project.mobile_slices ?? [];
  const desktop = project.desktop_slices ?? [];
  const primary = mobile.length ? mobile : desktop;
  const other = mobile.length ? desktop : [];
  const coverSlices = primary.slice(0, 2);
  const slices = other.length ? [...primary, ...other] : primary;
  return { preview: coverSlices[0] ?? null, coverSlices, slices };
}

function cardSize(): { w: number; h: number } {
  return { w: CARD_W, h: Math.round(CARD_W * CARD_RATIO) };
}

export function buildLibraryBoard(projects: PortfolioProject[]): LibraryBoard {
  const real: LibraryCard[] = [];
  const present = new Set<string>();
  const nicheSet = new Set<string>();

  for (const project of projects) {
    if (isSkipped(project)) continue;
    const { preview, coverSlices, slices } = framesFor(project);
    const category = project.category?.trim() || "Product Pages";
    if (PORTFOLIO_CATEGORIES.includes(category as PortfolioCategory)) {
      present.add(category);
    }
    const niche = inferNiche(project);
    if (niche) nicheSet.add(niche);
    const { w, h } = cardSize();
    real.push({
      id: project.id,
      name: project.name,
      category,
      niche,
      tags: project.tags ?? [],
      preview,
      coverSlices,
      slices,
      empty: coverSlices.length === 0,
      cluster: niche ?? category,
      x: 0,
      y: 0,
      w,
      h,
      rotate: 0,
    });
  }

  const blanks: LibraryCard[] = [];
  for (const category of PORTFOLIO_CATEGORIES) {
    if (present.has(category)) continue;
    blanks.push(blankCard(`empty:${category}`, category));
  }
  let i = 0;
  while (real.length + blanks.length < MIN_UNIT_CARDS) {
    blanks.push(blankCard(`blank:${i}`, ""));
    i += 1;
  }

  const packed = layoutDense([...real, ...blanks]);
  return {
    cards: packed,
    clusters: [],
    niches: collectFilterPills(real, packed, nicheSet),
  };
}

function blankCard(id: string, category: string): LibraryCard {
  const { w, h } = cardSize();
  return {
    id,
    name: "",
    category,
    niche: null,
    tags: category ? [category] : [],
    preview: null,
    coverSlices: [],
    slices: [],
    empty: true,
    cluster: category || "blank",
    x: 0,
    y: 0,
    w,
    h,
    rotate: 0,
  };
}

function collectFilterPills(
  real: LibraryCard[],
  all: LibraryCard[],
  nicheSet: Set<string>
): string[] {
  const pills: string[] = [];
  const add = (raw: string | null | undefined) => {
    const s = raw?.trim();
    if (!s) return;
    if (pills.some((p) => p.toLowerCase() === s.toLowerCase())) return;
    pills.push(s);
  };

  [...nicheSet].sort((a, b) => a.localeCompare(b)).forEach(add);

  for (const card of real) {
    for (const tag of card.tags) {
      if (PAGE_TYPES.has(tag.toLowerCase())) continue;
      if (tag.length > 24 || /\d{3,}/.test(tag)) continue;
      add(titleCase(tag));
    }
  }

  for (const card of real) add(card.category);

  if (pills.length < 4) {
    for (const card of all) add(card.category);
  }

  return pills;
}

function layoutDense(cards: LibraryCard[]): LibraryCard[] {
  if (cards.length === 0) return cards;
  const cols = Math.min(6, Math.max(4, Math.round(Math.sqrt(cards.length * 0.7))));
  const colH = Array.from({ length: cols }, () => 0);
  return cards.map((card) => {
    let col = 0;
    for (let i = 1; i < cols; i++) {
      if (colH[i] < colH[col]) col = i;
    }
    const jitterX = (unit(card.id, 1) - 0.5) * 4;
    const jitterY = (unit(card.id, 2) - 0.5) * 5;
    const rotate = (unit(card.id, 4) - 0.5) * 0.9;
    const x = col * (CARD_W + GAP_X) + jitterX;
    const y = colH[col] + jitterY;
    colH[col] += card.h + GAP_Y;
    return { ...card, x, y, rotate };
  });
}

export function unitPeriod(cards: LibraryCard[]): { x: number; y: number } {
  const b = cardBounds(cards);
  return {
    x: Math.max(1, b.maxX - b.minX + GAP_X),
    y: Math.max(1, b.maxY - b.minY + GAP_Y),
  };
}

export function cardBounds(cards: LibraryCard[]): { minX: number; minY: number; maxX: number; maxY: number } {
  if (cards.length === 0) return { minX: 0, minY: 0, maxX: 800, maxY: 600 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const c of cards) {
    minX = Math.min(minX, c.x);
    minY = Math.min(minY, c.y);
    maxX = Math.max(maxX, c.x + c.w);
    maxY = Math.max(maxY, c.y + c.h);
  }
  return { minX, minY, maxX, maxY };
}

export function cardMatchesQuery(card: LibraryCard, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [card.name, card.category, card.niche ?? "", ...card.tags].join(" ").toLowerCase();
  return hay.includes(q);
}

export function cardIsVisible(card: LibraryCard, query: string, niche: string | null): boolean {
  if (niche) {
    const keys = [card.niche, card.category, card.cluster, ...card.tags]
      .filter(Boolean)
      .map((s) => s!.toLowerCase());
    if (!keys.includes(niche.toLowerCase())) return false;
  }
  return cardMatchesQuery(card, query);
}
