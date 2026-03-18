/* ── Funnel Builder Data Layer ── */
/* Supabase-first with localStorage fallback (same pattern as portal/data.ts) */

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { FunnelData } from "./types";

const LS_KEY = "funnel-builder-funnels";

function generateId(): string {
  return `fnl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/* ── localStorage helpers ── */

function lsLoad(): FunnelData[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function lsSave(funnels: FunnelData[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(funnels));
  } catch { /* storage full */ }
}

/* ── Map Supabase row → FunnelData ── */

function mapRow(row: Record<string, unknown>): FunnelData {
  return {
    id: row.id as string,
    name: (row.name as string) || "",
    clientId: (row.client_id as string) || undefined,
    clientName: (row.client_name as string) || "",
    mode: (row.mode as FunnelData["mode"]) || "strategy",
    nodes: (row.nodes as FunnelData["nodes"]) || [],
    edges: (row.edges as FunnelData["edges"]) || [],
    created_at: (row.created_at as string) || new Date().toISOString(),
    updated_at: (row.updated_at as string) || new Date().toISOString(),
  };
}

/* ── CRUD ── */

export async function getFunnels(): Promise<FunnelData[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("funnels")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (data) return data.map(mapRow);
    } catch {
      // fall through to localStorage
    }
  }
  return lsLoad();
}

export async function getFunnelById(id: string): Promise<FunnelData | null> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("funnels")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      if (data) return mapRow(data);
    } catch {
      // fall through
    }
  }
  return lsLoad().find((f) => f.id === id) || null;
}

export async function getFunnelsByClientId(clientId: string): Promise<FunnelData[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("funnels")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (data) return data.map(mapRow);
    } catch {
      // fall through
    }
  }
  return lsLoad().filter((f) => f.clientId === clientId);
}

export async function createFunnel(
  input: Omit<FunnelData, "id" | "created_at" | "updated_at">
): Promise<FunnelData> {
  const now = new Date().toISOString();
  const id = generateId();

  const row = {
    id,
    name: input.name,
    client_id: input.clientId || null,
    client_name: input.clientName,
    mode: input.mode,
    nodes: input.nodes,
    edges: input.edges,
    created_at: now,
    updated_at: now,
  };

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("funnels")
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      if (data) return mapRow(data);
    } catch {
      // fall through to localStorage
    }
  }

  const funnel: FunnelData = {
    ...input,
    id,
    created_at: now,
    updated_at: now,
  };
  const all = lsLoad();
  all.unshift(funnel);
  lsSave(all);
  return funnel;
}

export async function updateFunnel(
  id: string,
  updates: Partial<FunnelData>
): Promise<FunnelData | null> {
  const now = new Date().toISOString();

  // Map JS field names to DB column names
  const dbUpdates: Record<string, unknown> = { updated_at: now };
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.clientId !== undefined) dbUpdates.client_id = updates.clientId;
  if (updates.clientName !== undefined) dbUpdates.client_name = updates.clientName;
  if (updates.mode !== undefined) dbUpdates.mode = updates.mode;
  if (updates.nodes !== undefined) dbUpdates.nodes = updates.nodes;
  if (updates.edges !== undefined) dbUpdates.edges = updates.edges;

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from("funnels")
        .update(dbUpdates)
        .eq("id", id);
      if (error) throw error;
    } catch {
      // Supabase failed — localStorage below will handle it
    }
  }

  // Always update localStorage to keep in sync
  const all = lsLoad();
  const idx = all.findIndex((f) => f.id === id);
  if (idx === -1) {
    // Not in localStorage — try to fetch from Supabase result
    const fetched = await getFunnelById(id);
    return fetched;
  }
  all[idx] = { ...all[idx], ...updates, updated_at: now };
  lsSave(all);
  return all[idx];
}

export async function deleteFunnel(id: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from("funnels")
        .delete()
        .eq("id", id);
      if (error) throw error;
    } catch {
      // fall through
    }
  }

  const all = lsLoad();
  const filtered = all.filter((f) => f.id !== id);
  if (filtered.length === all.length) return false;
  lsSave(filtered);
  return true;
}
