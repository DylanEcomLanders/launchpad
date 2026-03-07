import { supabase } from "@/lib/supabase";
import type { ActiveProject, ActiveProjectInsert } from "./types";

const LS_KEY = "pulse-active-projects";

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ── Read ────────────────────────────────────────────────────────

export async function getProjects(): Promise<ActiveProject[]> {
  try {
    const { data, error } = await supabase
      .from("active_projects")
      .select("*")
      .order("deadline", { ascending: true })
      .limit(10);
    if (error) throw error;
    return data || [];
  } catch {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(LS_KEY);
    return stored ? JSON.parse(stored) : [];
  }
}

// ── Create ──────────────────────────────────────────────────────

export async function addProject(p: ActiveProjectInsert): Promise<ActiveProject> {
  const now = new Date().toISOString();
  const project: ActiveProject = { ...p, id: uid(), created_at: now, updated_at: now };

  try {
    const { data, error } = await supabase
      .from("active_projects")
      .insert(p)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch {
    // localStorage fallback
    const existing = await getProjects();
    existing.push(project);
    localStorage.setItem(LS_KEY, JSON.stringify(existing));
    return project;
  }
}

// ── Update ──────────────────────────────────────────────────────

export async function updateProject(
  id: string,
  updates: Partial<ActiveProjectInsert>
): Promise<void> {
  try {
    const { error } = await supabase
      .from("active_projects")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  } catch {
    const existing = await getProjects();
    const updated = existing.map((p) =>
      p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p
    );
    localStorage.setItem(LS_KEY, JSON.stringify(updated));
  }
}

// ── Delete ──────────────────────────────────────────────────────

export async function deleteProject(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from("active_projects")
      .delete()
      .eq("id", id);
    if (error) throw error;
  } catch {
    const existing = await getProjects();
    const filtered = existing.filter((p) => p.id !== id);
    localStorage.setItem(LS_KEY, JSON.stringify(filtered));
  }
}
