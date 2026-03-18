import { createStore } from "@/lib/supabase-store";
import type { ActiveProject, ActiveProjectInsert } from "./types";

/* ── Store instance ── */
const store = createStore<ActiveProject>({
  table: "pulse_projects",
  lsKey: "pulse-active-projects",
});

// ── Read ────────────────────────────────────────────────────────

export async function getProjects(): Promise<ActiveProject[]> {
  return store.getAll();
}

// ── Create ──────────────────────────────────────────────────────

export async function addProject(p: ActiveProjectInsert): Promise<ActiveProject> {
  const now = new Date().toISOString();
  const project: ActiveProject = {
    ...p,
    id: Math.random().toString(36).slice(2, 10),
    created_at: now,
    updated_at: now,
  };
  return store.create(project);
}

// ── Update ──────────────────────────────────────────────────────

export async function updateProject(
  id: string,
  updates: Partial<ActiveProjectInsert>
): Promise<void> {
  await store.update(id, { ...updates, updated_at: new Date().toISOString() } as Partial<ActiveProject>);
}

// ── Delete ──────────────────────────────────────────────────────

export async function deleteProject(id: string): Promise<void> {
  await store.remove(id);
}
