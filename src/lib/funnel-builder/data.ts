/* ── Funnel Builder Data Layer ── */

import type { FunnelData } from "./types";

const LS_KEY = "funnel-builder-funnels";

function generateId(): string {
  return `fnl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function generateToken(): string {
  return Array.from({ length: 32 }, () =>
    "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]
  ).join("");
}

function loadAll(): FunnelData[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAll(funnels: FunnelData[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(funnels));
  } catch { /* storage full */ }
}

export function getFunnels(): FunnelData[] {
  return loadAll();
}

export function getFunnelById(id: string): FunnelData | null {
  return loadAll().find((f) => f.id === id) || null;
}

export function getFunnelsByClientId(clientId: string): FunnelData[] {
  return loadAll().filter((f) => f.clientId === clientId);
}

export function createFunnel(
  input: Omit<FunnelData, "id" | "created_at" | "updated_at">
): FunnelData {
  const now = new Date().toISOString();
  const funnel: FunnelData = {
    ...input,
    id: generateId(),
    created_at: now,
    updated_at: now,
  };
  const all = loadAll();
  all.push(funnel);
  saveAll(all);
  return funnel;
}

export function updateFunnel(id: string, updates: Partial<FunnelData>): FunnelData | null {
  const all = loadAll();
  const idx = all.findIndex((f) => f.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...updates, updated_at: new Date().toISOString() };
  saveAll(all);
  return all[idx];
}

export function deleteFunnel(id: string): boolean {
  const all = loadAll();
  const filtered = all.filter((f) => f.id !== id);
  if (filtered.length === all.length) return false;
  saveAll(filtered);
  return true;
}
