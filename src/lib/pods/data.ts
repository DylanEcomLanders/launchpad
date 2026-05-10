import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { getPortals, updatePortal } from "@/lib/portal/data";
import type { PortalData } from "@/lib/portal/types";
import type { Pod, PodInsert } from "./types";

const LS_PODS = "launchpad-pods";

function uid(): string {
  return crypto.randomUUID();
}

const SEED_PODS: PodInsert[] = [
  {
    name: "Pod 1 — Premium",
    description: "Conversion partnerships, retainer-led delivery",
    tier: "premium",
    am_name: "Alister",
    designer_name: "TBD",
    dev_name: "TBD",
  },
  {
    name: "Pod 2 — Standard",
    description: "Project-based page builds and one-off engagements",
    tier: "standard",
    am_name: "Alister",
    designer_name: "TBD",
    dev_name: "TBD",
  },
];

function mapRow(row: Record<string, unknown>): Pod {
  return {
    id: row.id as string,
    name: (row.name as string) || "",
    description: (row.description as string) || "",
    tier: ((row.tier as string) || "standard") as Pod["tier"],
    am_name: (row.am_name as string) || "",
    designer_name: (row.designer_name as string) || "",
    dev_name: (row.dev_name as string) || "",
    created_at: (row.created_at as string) || "",
    updated_at: (row.updated_at as string) || "",
  };
}

export async function getPods(): Promise<Pod[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("pods")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(mapRow);
    } catch {
      // fall through to localStorage
    }
  }
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(LS_PODS);
  return stored ? JSON.parse(stored) : [];
}

export async function getPodById(id: string): Promise<Pod | null> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from("pods").select("*").eq("id", id).single();
      if (error) throw error;
      return data ? mapRow(data) : null;
    } catch {
      // fall through
    }
  }
  if (typeof window === "undefined") return null;
  const all = await getPods();
  return all.find((p) => p.id === id) ?? null;
}

export async function createPod(input: PodInsert): Promise<Pod> {
  const now = new Date().toISOString();
  const id = uid();
  const row: Pod = { ...input, id, created_at: now, updated_at: now };

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from("pods").insert(row).select().single();
      if (error) throw error;
      return mapRow(data);
    } catch {
      // fall through
    }
  }
  if (typeof window !== "undefined") {
    const all = await getPods();
    all.push(row);
    localStorage.setItem(LS_PODS, JSON.stringify(all));
  }
  return row;
}

export async function updatePod(id: string, updates: Partial<PodInsert>): Promise<void> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from("pods")
        .update({ ...updates, updated_at: now })
        .eq("id", id);
      if (error) throw error;
    } catch (err) {
      console.error("updatePod Supabase write failed:", err);
    }
  }
  if (typeof window !== "undefined") {
    const all = await getPods();
    const next = all.map((p) => (p.id === id ? { ...p, ...updates, updated_at: now } : p));
    localStorage.setItem(LS_PODS, JSON.stringify(next));
  }
}

export async function deletePod(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from("pods").delete().eq("id", id);
      if (error) throw error;
    } catch {
      // fall through
    }
  }
  if (typeof window !== "undefined") {
    const all = await getPods();
    localStorage.setItem(LS_PODS, JSON.stringify(all.filter((p) => p.id !== id)));
  }
  // Unassign clients pointing at this pod
  const portals = await getPortals();
  for (const p of portals) {
    if (p.pod_id === id) await assignClientToPod(p.id, null);
  }
}

let seedInflight: Promise<Pod[]> | null = null;

/** Seed starter pods if missing. Race-safe (dedupes concurrent calls) and dedupes by name. */
export async function ensureSeedPods(): Promise<Pod[]> {
  if (seedInflight) return seedInflight;
  seedInflight = (async () => {
    const existing = await getPods();
    const existingNames = new Set(existing.map((p) => p.name));
    const next: Pod[] = [...existing];
    for (const seed of SEED_PODS) {
      if (existingNames.has(seed.name)) continue;
      next.push(await createPod(seed));
    }
    return next;
  })();
  try {
    return await seedInflight;
  } finally {
    seedInflight = null;
  }
}

// ─── Pod ↔ Client assignment ───────────────────────────────────────

export async function assignClientToPod(portalId: string, podId: string | null): Promise<void> {
  await updatePortal(portalId, { pod_id: podId });
}

export async function getClientsForPod(podId: string): Promise<PortalData[]> {
  const portals = await getPortals();
  return portals.filter((p) => p.pod_id === podId);
}

export async function getUnassignedClients(): Promise<PortalData[]> {
  const portals = await getPortals();
  return portals.filter((p) => !p.pod_id);
}
