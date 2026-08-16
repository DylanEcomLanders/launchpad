/* ── Work library cards ──
 * Dense 9:16 field over portfolio-v2 slices. Repeat real work to fill
 * the wall. No invented brands, no win copy. Angusway is skipped.
 */

import type { PortfolioProject, PortfolioSlice } from "@/lib/portfolio-v2/types";

export type LibraryCard = {
  id: string;
  sourceId: string;
  name: string;
  category: string;
  tags: string[];
  coverSlices: PortfolioSlice[];
  slices: PortfolioSlice[];
  col: number;
  row: number;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type LibraryBoard = {
  cards: LibraryCard[];
};

const SKIP = /angusway/i;

/** Uniform 9:16 portrait, tight gutters — the stnkvcs wall. */
export const CARD_W = 72;
export const CARD_H = Math.round((CARD_W * 16) / 9);
export const GAP = 6;
const COLS = 28;
const MIN_CELLS = 28 * 16;

function isSkipped(project: PortfolioProject): boolean {
  const hay = `${project.name} ${project.slug} ${project.client ?? ""}`;
  return SKIP.test(hay);
}

function framesFor(project: PortfolioProject): {
  coverSlices: PortfolioSlice[];
  slices: PortfolioSlice[];
} {
  const mobile = project.mobile_slices ?? [];
  const desktop = project.desktop_slices ?? [];
  const primary = mobile.length ? mobile : desktop;
  const other = mobile.length ? desktop : [];
  const coverSlices = primary.slice(0, 2);
  const slices = other.length ? [...primary, ...other] : primary;
  return { coverSlices, slices };
}

export function buildLibraryBoard(projects: PortfolioProject[]): LibraryBoard {
  const real: Omit<LibraryCard, "id" | "col" | "row" | "x" | "y" | "w" | "h">[] = [];

  for (const project of projects) {
    if (isSkipped(project)) continue;
    const { coverSlices, slices } = framesFor(project);
    if (coverSlices.length === 0) continue;
    real.push({
      sourceId: project.id,
      name: project.name,
      category: project.category?.trim() || "",
      tags: project.tags ?? [],
      coverSlices,
      slices,
    });
  }

  if (real.length === 0) {
    return { cards: [] };
  }

  const count = Math.max(MIN_CELLS, Math.ceil(real.length / COLS) * COLS);
  const cards: LibraryCard[] = [];
  for (let i = 0; i < count; i++) {
    const src = real[i % real.length];
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    cards.push({
      ...src,
      id: `${src.sourceId}~${i}`,
      col,
      row,
      x: col * (CARD_W + GAP),
      y: row * (CARD_H + GAP),
      w: CARD_W,
      h: CARD_H,
    });
  }

  return { cards };
}

export function unitPeriod(cards: LibraryCard[]): { w: number; h: number } {
  if (cards.length === 0) return { w: 800, h: 600 };
  let maxX = 0;
  let maxY = 0;
  for (const c of cards) {
    maxX = Math.max(maxX, c.x + c.w);
    maxY = Math.max(maxY, c.y + c.h);
  }
  return { w: maxX + GAP, h: maxY + GAP };
}

export function cardBounds(
  card: LibraryCard,
  copyCol: number,
  copyRow: number,
  periodW: number,
  periodH: number,
) {
  return {
    x: card.x + copyCol * periodW,
    y: card.y + copyRow * periodH,
    w: card.w,
    h: card.h,
  };
}

export function cardMatchesQuery(card: LibraryCard, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [card.name, card.category, ...card.tags].join(" ").toLowerCase();
  return hay.includes(q);
}
