/* ── Deck data layer ── */

import { createStore } from "@/lib/supabase-store";

export interface DeckData {
  id: string;
  brand_name: string;
  brand_url: string;
  logo_url?: string;
  // Traffic & conversion
  monthly_traffic: number;
  current_cvr: number;
  benchmark_cvr: number;
  aov: number;
  // Conversion matrix scores (1-10)
  scores: {
    traffic: number;
    ad_alignment: number;
    landing_page: number;
    pdp: number;
    cart: number;
    checkout: number;
    post_purchase: number;
    retention: number;
  };
  // Top 3 priorities
  priorities: string[];
  // Offer
  retainer_price: number;
  anchor_price: number;
  // Meta
  created_by: string;
  created_at: string;
  updated_at: string;
}

const store = createStore<DeckData>({
  table: "decks",
  lsKey: "se-decks",
});

export async function getDeck(id: string): Promise<DeckData | null> {
  return store.getById(id);
}

export async function getDecks(): Promise<DeckData[]> {
  return store.getAll();
}

export async function saveDeck(deck: DeckData): Promise<DeckData> {
  return store.create(deck);
}
