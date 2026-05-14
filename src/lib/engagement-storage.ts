/* localStorage layer for engagements created via the UI before Supabase
 * is wired up. Coexists with MOCK_ENGAGEMENTS, combined views append
 * locally-created entries on top of the static mock set. */

import type { MockEngagement } from "./engagement-mocks";

const LS_KEY = "launchpad-engagements-local";

export function loadLocalEngagements(): MockEngagement[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MockEngagement[]) : [];
  } catch {
    return [];
  }
}

export function saveLocalEngagement(eng: MockEngagement): void {
  if (typeof window === "undefined") return;
  const current = loadLocalEngagements();
  const next = [eng, ...current.filter((e) => e.id !== eng.id)];
  localStorage.setItem(LS_KEY, JSON.stringify(next));
}

export function loadLocalEngagementById(id: string): MockEngagement | null {
  return loadLocalEngagements().find((e) => e.id === id) ?? null;
}

export function deleteLocalEngagement(id: string): void {
  if (typeof window === "undefined") return;
  const next = loadLocalEngagements().filter((e) => e.id !== id);
  localStorage.setItem(LS_KEY, JSON.stringify(next));
}
