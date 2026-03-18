import { createStore } from "@/lib/supabase-store";
import type { PortfolioTab } from "./types";

/* ── Store instance ── */
const store = createStore<PortfolioTab>({
  table: "portfolio_tabs",
  lsKey: "portfolio-tabs",
});

// ── Read ────────────────────────────────────────────────────────

export async function getTabs(): Promise<PortfolioTab[]> {
  return store.getAll();
}

// ── Save ────────────────────────────────────────────────────────

export async function saveTabs(tabs: PortfolioTab[]): Promise<void> {
  await store.saveAll(tabs);
}

// ── Helpers ─────────────────────────────────────────────────────

export function createTab(label: string = "", figma_url: string = "", order: number = 0): PortfolioTab {
  return { id: Math.random().toString(36).slice(2, 10), label, figma_url, order };
}
