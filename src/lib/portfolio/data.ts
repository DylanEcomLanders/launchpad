import { supabase } from "@/lib/supabase";
import type { PortfolioClient, PortfolioClientInsert } from "./types";

const LS_KEY = "portfolio-clients";

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ── Read ────────────────────────────────────────────────────────

export async function getClients(): Promise<PortfolioClient[]> {
  try {
    const { data, error } = await supabase
      .from("portfolio_clients")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  } catch {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(LS_KEY);
    return stored ? JSON.parse(stored) : [];
  }
}

export async function getClientBySlug(slug: string): Promise<PortfolioClient | null> {
  try {
    const { data, error } = await supabase
      .from("portfolio_clients")
      .select("*")
      .eq("slug", slug)
      .single();
    if (error) throw error;
    return data;
  } catch {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem(LS_KEY);
    const clients: PortfolioClient[] = stored ? JSON.parse(stored) : [];
    return clients.find((c) => c.slug === slug) || null;
  }
}

// ── Create ──────────────────────────────────────────────────────

export async function addClient(p: PortfolioClientInsert): Promise<PortfolioClient> {
  const now = new Date().toISOString();
  const slug = p.slug || slugify(p.client_name);
  const client: PortfolioClient = { ...p, slug, id: uid(), created_at: now, updated_at: now };

  try {
    const { data, error } = await supabase
      .from("portfolio_clients")
      .insert({ ...p, slug })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch {
    const existing = await getClients();
    existing.unshift(client);
    localStorage.setItem(LS_KEY, JSON.stringify(existing));
    return client;
  }
}

// ── Update ──────────────────────────────────────────────────────

export async function updateClient(
  id: string,
  updates: Partial<PortfolioClientInsert>
): Promise<void> {
  try {
    const { error } = await supabase
      .from("portfolio_clients")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  } catch {
    const existing = await getClients();
    const updated = existing.map((c) =>
      c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c
    );
    localStorage.setItem(LS_KEY, JSON.stringify(updated));
  }
}

// ── Delete ──────────────────────────────────────────────────────

export async function deleteClient(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from("portfolio_clients")
      .delete()
      .eq("id", id);
    if (error) throw error;
  } catch {
    const existing = await getClients();
    const filtered = existing.filter((c) => c.id !== id);
    localStorage.setItem(LS_KEY, JSON.stringify(filtered));
  }
}

// ── Helpers ─────────────────────────────────────────────────────

export { slugify };
