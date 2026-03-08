import { supabase } from "@/lib/supabase";
import type { PortfolioTab } from "./types";

const LS_KEY = "portfolio-tabs";
const SUPABASE_ID = "portfolio-singleton";

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ── Read ────────────────────────────────────────────────────────

export async function getTabs(): Promise<PortfolioTab[]> {
  try {
    const { data, error } = await supabase
      .from("portfolio")
      .select("tabs")
      .eq("id", SUPABASE_ID)
      .single();
    if (error) throw error;
    return (data?.tabs as PortfolioTab[]) || [];
  } catch {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(LS_KEY);
    return stored ? JSON.parse(stored) : [];
  }
}

// ── Save ────────────────────────────────────────────────────────

export async function saveTabs(tabs: PortfolioTab[]): Promise<void> {
  try {
    const { error } = await supabase
      .from("portfolio")
      .upsert({ id: SUPABASE_ID, tabs, updated_at: new Date().toISOString() });
    if (error) throw error;
  } catch {
    localStorage.setItem(LS_KEY, JSON.stringify(tabs));
  }
}

// ── Helpers ─────────────────────────────────────────────────────

export function createTab(label: string = "", figma_url: string = "", order: number = 0): PortfolioTab {
  return { id: uid(), label, figma_url, order };
}
