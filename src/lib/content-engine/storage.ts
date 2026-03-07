import type { ContentPiece, GeneratedHook } from "./types";

const FUNNEL_KEY = "launchpad-funnel-planner";
const HOOKS_KEY = "launchpad-saved-hooks";

export function loadFunnelPieces(): ContentPiece[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FUNNEL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveFunnelPieces(pieces: ContentPiece[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FUNNEL_KEY, JSON.stringify(pieces));
  } catch {
    // storage full — silently fail
  }
}

export function loadSavedHooks(): GeneratedHook[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HOOKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSavedHooks(hooks: GeneratedHook[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HOOKS_KEY, JSON.stringify(hooks));
  } catch {
    // storage full — silently fail
  }
}
