import { createStore } from "@/lib/supabase-store";
import type { GrowthEngineData, GrowthItem, GrowthChannel } from "./types";

const LS_KEY = "growth-engine-data";
const SINGLETON_ID = "growth-engine-singleton";

const store = createStore<GrowthEngineData>({ table: "growth_engines", lsKey: LS_KEY });

const DEFAULT_CHANNELS: GrowthChannel[] = ["twitter", "linkedin", "tiktok", "instagram", "email", "paid-media", "outbound"];

function defaultEngine(): GrowthEngineData {
  return {
    id: SINGLETON_ID,
    name: "Ecomlanders Growth Engine",
    channels: DEFAULT_CHANNELS,
    items: [],
    channelFlows: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function getGrowthEngine(): Promise<GrowthEngineData> {
  const all = await store.getAll();
  const existing = all.find((e) => e.id === SINGLETON_ID);
  if (existing) return { ...defaultEngine(), ...existing };
  // Create default
  const engine = defaultEngine();
  await store.save(engine);
  return engine;
}

export async function saveGrowthEngine(engine: GrowthEngineData): Promise<void> {
  await store.save({ ...engine, updated_at: new Date().toISOString() });
}

export async function addItem(item: GrowthItem): Promise<GrowthEngineData> {
  const engine = await getGrowthEngine();
  engine.items.push(item);
  await saveGrowthEngine(engine);
  return engine;
}

export async function updateItem(itemId: string, patch: Partial<GrowthItem>): Promise<GrowthEngineData> {
  const engine = await getGrowthEngine();
  engine.items = engine.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i));
  await saveGrowthEngine(engine);
  return engine;
}

export async function removeItem(itemId: string): Promise<GrowthEngineData> {
  const engine = await getGrowthEngine();
  engine.items = engine.items.filter((i) => i.id !== itemId);
  await saveGrowthEngine(engine);
  return engine;
}
