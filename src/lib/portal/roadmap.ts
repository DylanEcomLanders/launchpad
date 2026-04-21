// ── Roadmap data layer ──────────────────────────────────────────────
//
// Thin CRUD around the `roadmap_items` Supabase table.
// No localStorage fallback — Conversion Engine portals always live in Supabase.

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { RoadmapItem, RoadmapItemInsert, RoadmapItemPatch, RoadmapStage } from "./roadmap-types";

function mapRow(row: Record<string, unknown>): RoadmapItem {
  return {
    id: row.id as string,
    portal_id: row.portal_id as string,
    title: (row.title as string) || "",
    description: (row.description as string) || "",
    impact_hypothesis: (row.impact_hypothesis as string) || "",
    stage: (row.stage as RoadmapStage) || "backlog",
    priority: (row.priority as RoadmapItem["priority"]) || "medium",
    target_month: (row.target_month as string) || "",
    sort_index: (row.sort_index as number) ?? 0,
    figma_url: (row.figma_url as string) || "",
    staging_url: (row.staging_url as string) || "",
    live_url: (row.live_url as string) || "",
    outcome: (row.outcome as string) || "",
    started_at: (row.started_at as string | null) || null,
    shipped_at: (row.shipped_at as string | null) || null,
    created_at: (row.created_at as string) || "",
    updated_at: (row.updated_at as string) || "",
  };
}

export async function getRoadmapItems(portalId: string): Promise<RoadmapItem[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from("roadmap_items")
    .select("*")
    .eq("portal_id", portalId)
    .order("sort_index", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) {
    console.error("getRoadmapItems failed:", error);
    return [];
  }
  return (data || []).map(mapRow);
}

export async function createRoadmapItem(input: RoadmapItemInsert): Promise<RoadmapItem | null> {
  if (!isSupabaseConfigured()) return null;
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("roadmap_items")
    .insert({ ...input, created_at: now, updated_at: now })
    .select()
    .single();
  if (error) {
    console.error("createRoadmapItem failed:", error);
    return null;
  }
  return data ? mapRow(data) : null;
}

export async function updateRoadmapItem(id: string, patch: RoadmapItemPatch): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const { error } = await supabase
    .from("roadmap_items")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) console.error("updateRoadmapItem failed:", error);
}

export async function deleteRoadmapItem(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const { error } = await supabase.from("roadmap_items").delete().eq("id", id);
  if (error) console.error("deleteRoadmapItem failed:", error);
}

// Move an item between stages and set timestamps automatically.
export async function moveRoadmapItem(id: string, toStage: RoadmapStage): Promise<void> {
  const patch: RoadmapItemPatch = { stage: toStage };
  if (toStage === "in-progress") {
    patch.started_at = new Date().toISOString();
  } else if (toStage === "shipped") {
    patch.shipped_at = new Date().toISOString();
  } else if (toStage === "backlog" || toStage === "next-up") {
    // Re-queueing — clear shipped timestamp but keep started_at as historical record.
    patch.shipped_at = null;
  }
  await updateRoadmapItem(id, patch);
}

// Group a flat list of items into the four stages, preserving order.
export function groupByStage(items: RoadmapItem[]): Record<RoadmapStage, RoadmapItem[]> {
  const out: Record<RoadmapStage, RoadmapItem[]> = {
    "in-progress": [],
    "next-up": [],
    "shipped": [],
    "backlog": [],
  };
  for (const item of items) {
    out[item.stage].push(item);
  }
  return out;
}

export const STAGE_LABELS: Record<RoadmapStage, string> = {
  "in-progress": "In Progress",
  "next-up": "Next Up",
  "shipped": "Shipped",
  "backlog": "Backlog",
};

export const STAGE_ORDER: RoadmapStage[] = ["in-progress", "next-up", "shipped", "backlog"];
