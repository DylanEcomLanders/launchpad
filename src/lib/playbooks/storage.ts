import type { AllProgress } from "./types";

// ── localStorage helpers ─────────────────────────────────────────

const STORAGE_KEY = "launchpad-playbook-progress";

export function loadProgress(): AllProgress {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveProgress(progress: AllProgress) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}
