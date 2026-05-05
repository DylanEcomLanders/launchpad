/* ── Roadmap data layer ──
 * Supabase-first with localStorage fallback. Stores in the `roadmaps`
 * table (see migration 007). Public-share lookups use shareToken.
 */

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { RoadmapData } from "./roadmap-types";

const LS_KEY = "funnel-roadmaps";
const TABLE = "roadmaps";

function lsLoad(): RoadmapData[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as RoadmapData[]) : [];
  } catch {
    return [];
  }
}

function lsSave(list: RoadmapData[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  } catch {
    /* storage full — ignore */
  }
}

/* Translate DB row (snake_case) → JS shape. */
function mapRow(row: Record<string, unknown>): RoadmapData {
  return {
    id: row.id as string,
    shareToken: row.share_token as string,
    name: (row.name as string) || "",
    clientId: (row.client_id as string) || undefined,
    clientName: (row.client_name as string) || "",
    trafficSources: (row.traffic_sources as RoadmapData["trafficSources"]) || [],
    pages: (row.pages as RoadmapData["pages"]) || [],
    leadGen: (row.lead_gen as RoadmapData["leadGen"]) || undefined,
    created_at: (row.created_at as string) || new Date().toISOString(),
    updated_at: (row.updated_at as string) || new Date().toISOString(),
  };
}

function toRow(r: RoadmapData) {
  return {
    id: r.id,
    share_token: r.shareToken,
    name: r.name,
    client_id: r.clientId || null,
    client_name: r.clientName,
    traffic_sources: r.trafficSources,
    pages: r.pages,
    lead_gen: r.leadGen || null,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

/* ── CRUD ────────────────────────────────────────────────────────── */

export async function getRoadmaps(): Promise<RoadmapData[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      if (data) return data.map(mapRow);
    } catch {
      /* fall through to LS */
    }
  }
  return lsLoad();
}

export async function getRoadmapById(id: string): Promise<RoadmapData | null> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      if (data) return mapRow(data);
    } catch {
      /* fall through */
    }
  }
  return lsLoad().find((r) => r.id === id) || null;
}

export async function getRoadmapByShareToken(
  token: string,
): Promise<RoadmapData | null> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select("*")
        .eq("share_token", token)
        .single();
      if (error) throw error;
      if (data) return mapRow(data);
    } catch {
      /* fall through */
    }
  }
  return lsLoad().find((r) => r.shareToken === token) || null;
}

export async function saveRoadmap(roadmap: RoadmapData): Promise<RoadmapData> {
  const next = { ...roadmap, updated_at: new Date().toISOString() };
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from(TABLE).upsert(toRow(next));
      if (error) throw error;
    } catch {
      /* fall through */
    }
  }
  // Mirror to LS for offline + speed
  const all = lsLoad();
  const idx = all.findIndex((r) => r.id === next.id);
  if (idx >= 0) all[idx] = next;
  else all.unshift(next);
  lsSave(all);
  return next;
}

export async function deleteRoadmap(id: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      await supabase.from(TABLE).delete().eq("id", id);
    } catch {
      /* swallow */
    }
  }
  const all = lsLoad();
  const filtered = all.filter((r) => r.id !== id);
  if (filtered.length === all.length) return false;
  lsSave(filtered);
  return true;
}
