/* ── CX Delivery: data layer ──
 *
 * Same prototype-grade pattern as the Clients workspace: localStorage is the
 * source of truth so it works with no migration applied; every write also
 * best-efforts to Supabase (cx_cards / cx_people / cx_activity), wrapped so a
 * missing table degrades silently. Writes are per-row upsert (additive,
 * multi-device-safe) - never a destructive saveAll diff.
 *
 * Isolated by table namespace: the cx_* tables share nothing with the legacy
 * kanban. Productionising = paste supabase/migrations/060_cx_cards.sql,
 * 061_cx_people.sql, 062_cx_activity.sql.
 */

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { CxCard, CxStage, CxPerson, PersonRole, CxActivity } from "./types";

const CARDS_KEY = "cx-delivery-cards";
const PEOPLE_KEY = "cx-delivery-people";
const ACTIVITY_KEY = "cx-delivery-activity";
const PEOPLE_SEED_KEY = "cx-delivery-people-seeded";

/* ── generic localStorage helpers ── */
function lsLoad<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}
function lsSave<T>(key: string, items: T[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    /* storage full */
  }
}

/* ── generic best-effort cloud store ({ id, data jsonb }) ── */
async function cloudLoad<T extends { id: string }>(table: string): Promise<T[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase.from(table).select("*").order("created_at", { ascending: true });
    if (error || !data) return null;
    return data.map((row: Record<string, unknown>) => ({ ...(row.data as object), id: row.id as string })) as T[];
  } catch {
    return null;
  }
}
async function cloudUpsert(table: string, row: { id: string }): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const { id, ...rest } = row;
    await supabase.from(table).upsert({ id, data: rest, updated_at: new Date().toISOString() }, { onConflict: "id" });
  } catch {
    /* table not migrated yet - LS already holds it */
  }
}
async function cloudDelete(table: string, id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    await supabase.from(table).delete().eq("id", id);
  } catch {
    /* LS already updated */
  }
}

/* ── Cards ── */
export async function loadCards(): Promise<CxCard[]> {
  const cloud = await cloudLoad<CxCard>("cx_cards");
  if (cloud && cloud.length) {
    lsSave(CARDS_KEY, cloud);
    return cloud;
  }
  return lsLoad<CxCard>(CARDS_KEY);
}

export async function saveCard(card: CxCard): Promise<void> {
  const all = lsLoad<CxCard>(CARDS_KEY);
  const idx = all.findIndex((c) => c.id === card.id);
  const next = { ...card, updated_at: new Date().toISOString() };
  if (idx >= 0) all[idx] = next;
  else all.push(next);
  lsSave(CARDS_KEY, all);
  await cloudUpsert("cx_cards", next);
}

export async function removeCard(id: string): Promise<void> {
  lsSave(CARDS_KEY, lsLoad<CxCard>(CARDS_KEY).filter((c) => c.id !== id));
  await cloudDelete("cx_cards", id);
}

let seq = 0;
export function newCard(clientId: string, clientName: string, title: string, stage: CxStage = "setup"): CxCard {
  const now = new Date().toISOString();
  seq += 1;
  return {
    id: `cx-${Date.now().toString(36)}-${seq}`,
    title: title.trim() || "Untitled",
    clientId,
    clientName,
    stage,
    dueByStage: {},
    created_at: now,
    updated_at: now,
  };
}

/** Cards for one client - used by the Clients Delivery reflection. */
export function cardsForClient(cards: CxCard[], clientId: string): CxCard[] {
  return cards.filter((c) => c.clientId === clientId);
}

export function withStage(card: CxCard, stage: CxStage): CxCard {
  return { ...card, stage };
}

/* ── People (roster) ──
 * Seeded once with a small example team so the assignee dropdowns aren't empty.
 * Edit / replace them in the board's "People" manager. */
const SEED_PEOPLE: CxPerson[] = [
  { id: "cxp-strat", name: "Strategist (edit me)", role: "strategist" },
  { id: "cxp-des1", name: "Primary designer (edit me)", role: "designer" },
  { id: "cxp-des2", name: "Secondary designer (edit me)", role: "designer" },
  { id: "cxp-dev1", name: "Primary developer (edit me)", role: "developer" },
  { id: "cxp-dev2", name: "Dev lead (edit me)", role: "developer" },
];

export async function loadPeople(): Promise<CxPerson[]> {
  const cloud = await cloudLoad<CxPerson>("cx_people");
  if (cloud && cloud.length) {
    lsSave(PEOPLE_KEY, cloud);
    return cloud;
  }
  const stored = lsLoad<CxPerson>(PEOPLE_KEY);
  if (stored.length) return stored;
  // First run: seed example roster once.
  if (typeof window !== "undefined" && !localStorage.getItem(PEOPLE_SEED_KEY)) {
    lsSave(PEOPLE_KEY, SEED_PEOPLE);
    try {
      localStorage.setItem(PEOPLE_SEED_KEY, "1");
    } catch {
      /* storage full */
    }
    return SEED_PEOPLE;
  }
  return stored;
}

let pseq = 0;
export function newPerson(name: string, role: PersonRole): CxPerson {
  pseq += 1;
  return { id: `cxp-${Date.now().toString(36)}-${pseq}`, name: name.trim() || "Unnamed", role };
}

export async function savePerson(person: CxPerson): Promise<void> {
  const all = lsLoad<CxPerson>(PEOPLE_KEY);
  const idx = all.findIndex((p) => p.id === person.id);
  if (idx >= 0) all[idx] = person;
  else all.push(person);
  lsSave(PEOPLE_KEY, all);
  await cloudUpsert("cx_people", person);
}

export async function removePerson(id: string): Promise<void> {
  lsSave(PEOPLE_KEY, lsLoad<CxPerson>(PEOPLE_KEY).filter((p) => p.id !== id));
  await cloudDelete("cx_people", id);
}

/* ── Activity log ── keep the latest N moves. */
const ACTIVITY_CAP = 200;

export async function loadActivity(): Promise<CxActivity[]> {
  const cloud = await cloudLoad<CxActivity>("cx_activity");
  const rows = cloud && cloud.length ? cloud : lsLoad<CxActivity>(ACTIVITY_KEY);
  return [...rows].sort((a, b) => (a.at < b.at ? 1 : -1)); // newest first
}

let aseq = 0;
export async function logMove(
  card: CxCard,
  from: CxStage,
  to: CxStage,
  who?: string,
): Promise<void> {
  aseq += 1;
  const entry: CxActivity = {
    id: `cxa-${Date.now().toString(36)}-${aseq}`,
    at: new Date().toISOString(),
    who,
    cardId: card.id,
    cardTitle: card.title,
    from,
    to,
  };
  const all = [...lsLoad<CxActivity>(ACTIVITY_KEY), entry].slice(-ACTIVITY_CAP);
  lsSave(ACTIVITY_KEY, all);
  await cloudUpsert("cx_activity", entry);
}
