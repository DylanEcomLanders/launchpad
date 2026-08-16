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

const CARD_W = 228;
const CARD_RATIO = 2.52;
const GAP_X = 26;
const GAP_Y = 22;
const ISLAND_GAP_X = 260;
const ISLAND_GAP_Y = 220;
const LABEL_H = 36;

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

  const empties: LibraryCard[] = [];
  for (const category of PORTFOLIO_CATEGORIES) {
    if (present.has(category)) continue;
    const id = `empty:${category}`;
    const { w, h } = cardSize();
    empties.push({
      id,
      name: "",
      category,
      niche: null,
      tags: [category],
      preview: null,
      coverSlices: [],
      slices: [],
      empty: true,
      cluster: category,
      x: 0,
      y: 0,
      w,
      h,
      rotate: 0,
    });
  }

  const { cards, clusters } = layoutIslands([...real, ...empties]);
  return {
    cards,
    clusters,
    niches: [...nicheSet].sort((a, b) => a.localeCompare(b)),
  };
}

function islandCols(n: number): number {
  if (n <= 2) return 1;
  if (n <= 7) return 2;
  return 3;
}

function masonry(cards: LibraryCard[], cols: number): LibraryCard[] {
  const colH = Array.from({ length: cols }, () => 0);
  return cards.map((card) => {
    let col = 0;
    for (let i = 1; i < cols; i++) {
      if (colH[i] < colH[col]) col = i;
    }
    const jitterX = (unit(card.id, 1) - 0.5) * 18;
    const jitterY = (unit(card.id, 2) - 0.5) * 20;
    const rotate = (unit(card.id, 4) - 0.5) * 3.6;
    const x = col * (CARD_W + GAP_X) + jitterX;
    const y = colH[col] + jitterY;
    colH[col] += card.h + GAP_Y;
    return { ...card, x, y, rotate };
  });
}

function layoutIslands(cards: LibraryCard[]): { cards: LibraryCard[]; clusters: LibraryCluster[] } {
  if (cards.length === 0) return { cards, clusters: [] };

  const groups = new Map<string, LibraryCard[]>();
  for (const card of cards) {
    const list = groups.get(card.cluster) ?? [];
    list.push(card);
    groups.set(card.cluster, list);
  }

  const names = [...groups.keys()].sort((a, b) => {
    const aNiche = groups.get(a)!.some((c) => c.niche === a);
    const bNiche = groups.get(b)!.some((c) => c.niche === b);
    if (aNiche !== bNiche) return aNiche ? -1 : 1;
    return a.localeCompare(b);
  });

  const islandColsCount = names.length <= 3 ? 2 : 3;
  const colBottom = Array.from({ length: islandColsCount }, () => 0);
  const placed: LibraryCard[] = [];
  const clusters: LibraryCluster[] = [];

  names.forEach((name, i) => {
    const local = masonry(groups.get(name)!, islandCols(groups.get(name)!.length));
    let maxX = 0;
    let maxY = 0;
    for (const c of local) {
      maxX = Math.max(maxX, c.x + c.w);
      maxY = Math.max(maxY, c.y + c.h);
    }

    let col = i % islandColsCount;
    for (let c = 1; c < islandColsCount; c++) {
      if (colBottom[c] < colBottom[col]) col = c;
    }

    const islandW = Math.max(maxX, CARD_W);
    const ox = col * (islandW + ISLAND_GAP_X + CARD_W) + (unit(name, 5) - 0.5) * 70;
    const oy = colBottom[col] + (col % 2) * 90 + (unit(name, 6) - 0.5) * 50;

    clusters.push({ id: name, label: name, x: ox, y: oy });
    for (const c of local) {
      placed.push({ ...c, x: c.x + ox, y: c.y + oy + LABEL_H });
    }
    colBottom[col] = oy + LABEL_H + maxY + ISLAND_GAP_Y;
  });

  return { cards: placed, clusters };
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
  if (niche && card.niche !== niche) return false;
  return cardMatchesQuery(card, query);
}
