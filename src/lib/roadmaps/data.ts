/* ── Roadmaps data layer ── */

import { createStore } from "@/lib/supabase-store";
import type {
  Roadmap,
  RoadmapItem,
  RoadmapHorizon,
} from "./types";

export const roadmapsStore = createStore<Roadmap>({
  table: "roadmaps",
  lsKey: "launchpad-roadmaps",
});

export function uid(): string {
  return Math.random().toString(36).slice(2, 12);
}
export function nowISO(): string {
  return new Date().toISOString();
}

export function iceScore(item: Pick<RoadmapItem, "impact" | "confidence" | "ease">): number {
  const i = Math.max(1, Math.min(10, item.impact || 1));
  const c = Math.max(1, Math.min(10, item.confidence || 1));
  const e = Math.max(1, Math.min(10, item.ease || 1));
  return i * c * e;
}

export function emptyRoadmap(): Roadmap {
  return {
    id: uid(),
    client_name: "",
    strategist: "",
    quarter_label: "",
    items: [],
    created_at: nowISO(),
    updated_at: nowISO(),
  };
}

export function emptyItem(horizon: RoadmapHorizon = 30, order = 0): RoadmapItem {
  return {
    id: uid(),
    title: "",
    type: "test",
    horizon,
    impact: 7,
    confidence: 6,
    ease: 5,
    status: "planned",
    order,
  };
}
