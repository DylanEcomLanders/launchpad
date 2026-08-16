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
  tags: string[];
  preview: PortfolioSlice | null;
  slices: PortfolioSlice[];
  empty: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  rotate: number;
};

const SKIP = /angusway/i;

const CARD_W = 236;
const GAP_X = 32;
const GAP_Y = 28;
const MIN_RATIO = 1.28;
const MAX_RATIO = 1.82;

function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function unit(seed: string, salt: number): number {
  return ((hash32(`${seed}:${salt}`) % 10000) / 10000);
}

function isSkipped(project: PortfolioProject): boolean {
  const hay = `${project.name} ${project.slug} ${project.client ?? ""}`;
  return SKIP.test(hay);
}

function framesFor(project: PortfolioProject): {
  preview: PortfolioSlice | null;
  slices: PortfolioSlice[];
} {
  const mobile = project.mobile_slices ?? [];
  const desktop = project.desktop_slices ?? [];
  // Preview viewport first so expand starts on the card face; the other
  // viewport follows so cursor-scrub can walk the long page and desktop/mobile.
  const slices = mobile.length
    ? desktop.length
      ? [...mobile, ...desktop]
      : mobile
    : desktop;
  return { preview: slices[0] ?? null, slices };
}

function cardSize(id: string, preview: PortfolioSlice | null, empty: boolean): { w: number; h: number } {
  const w = CARD_W;
  if (preview && preview.width > 0) {
    const ratio = Math.min(MAX_RATIO, Math.max(MIN_RATIO, preview.height / preview.width));
    return { w, h: Math.round(w * ratio) };
  }
  const varied = empty ? MIN_RATIO + unit(id, 3) * (MAX_RATIO - MIN_RATIO) : 1.55;
  return { w, h: Math.round(w * varied) };
}

function columnCount(n: number): number {
  if (n <= 4) return 2;
  if (n <= 9) return 3;
  if (n <= 16) return 4;
  return 5;
}

export function buildLibraryCards(projects: PortfolioProject[]): LibraryCard[] {
  const real: LibraryCard[] = [];
  const present = new Set<string>();

  for (const project of projects) {
    if (isSkipped(project)) continue;
    const { preview, slices } = framesFor(project);
    const category = project.category?.trim() || "Product Pages";
    if (PORTFOLIO_CATEGORIES.includes(category as PortfolioCategory)) {
      present.add(category);
    }
    const { w, h } = cardSize(project.id, preview, preview == null);
    real.push({
      id: project.id,
      name: project.name,
      category,
      tags: project.tags ?? [],
      preview,
      slices,
      empty: preview == null,
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
    const { w, h } = cardSize(id, null, true);
    empties.push({
      id,
      name: "",
      category,
      tags: [category],
      preview: null,
      slices: [],
      empty: true,
      x: 0,
      y: 0,
      w,
      h,
      rotate: 0,
    });
  }

  return layoutCards([...real, ...empties]);
}

function layoutCards(cards: LibraryCard[]): LibraryCard[] {
  if (cards.length === 0) return cards;
  const cols = columnCount(cards.length);
  const colH = Array.from({ length: cols }, () => 0);

  return cards.map((card) => {
    let col = 0;
    for (let i = 1; i < cols; i++) {
      if (colH[i] < colH[col]) col = i;
    }
    const jitterX = (unit(card.id, 1) - 0.5) * 22;
    const jitterY = (unit(card.id, 2) - 0.5) * 26;
    const rotate = (unit(card.id, 4) - 0.5) * 4.2;
    const x = col * (CARD_W + GAP_X) + jitterX;
    const y = colH[col] + jitterY;
    colH[col] += card.h + GAP_Y;
    return { ...card, x, y, rotate };
  });
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
  const hay = [card.name, card.category, ...card.tags].join(" ").toLowerCase();
  return hay.includes(q);
}
