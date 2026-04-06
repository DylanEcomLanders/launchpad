/* ── Funnel Event Tracking ──
 * Tracks page views and form submissions per funnel
 * for conversion analytics.
 */

import { createStore } from "@/lib/supabase-store";

export interface FunnelEvent {
  id: string;
  funnel: string;
  event_type: "view" | "submission";
  source: string;
  referrer?: string;
  created_at: string;
}

const store = createStore<FunnelEvent>({
  table: "funnel_events",
  lsKey: "lp_funnel_events",
});

export async function trackEvent(
  event: Omit<FunnelEvent, "id" | "created_at">
): Promise<FunnelEvent> {
  const full: FunnelEvent = {
    ...event,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  return store.create(full);
}

export async function getEvents(): Promise<FunnelEvent[]> {
  return store.getAll();
}

export async function getEventsByFunnel(
  funnel: string
): Promise<FunnelEvent[]> {
  const all = await store.getAll();
  return all.filter((e) => e.funnel === funnel);
}
