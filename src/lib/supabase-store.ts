/* ── Generic Supabase + localStorage store ──
 * For tables using the { id, data (jsonb), created_at } pattern.
 * Each record is stored as a JSON blob in the `data` column.
 */

import { supabase, isSupabaseConfigured } from "@/lib/supabase";

interface StoreOptions {
  table: string;       // Supabase table name
  lsKey: string;       // localStorage key
}

function lsLoad<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function lsSave<T>(key: string, items: T[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch { /* storage full */ }
}

export function createStore<T extends { id: string }>(opts: StoreOptions) {
  const { table, lsKey } = opts;

  async function getAll(): Promise<T[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (data) {
          const mapped = data.map((row: Record<string, unknown>) => ({
            ...(row.data as object),
            id: row.id as string,
          })) as T[];
          // Sync to localStorage
          lsSave(lsKey, mapped);
          return mapped;
        }
      } catch {
        // fall through
      }
    }
    return lsLoad<T>(lsKey);
  }

  async function getById(id: string): Promise<T | null> {
    const all = await getAll();
    return all.find((item) => item.id === id) || null;
  }

  async function create(item: T): Promise<T> {
    if (isSupabaseConfigured()) {
      try {
        const { id, ...rest } = item;
        const { error } = await supabase.from(table).insert({
          id,
          data: rest,
          created_at: new Date().toISOString(),
        });
        if (error) throw error;
      } catch {
        // fall through to localStorage
      }
    }
    const all = lsLoad<T>(lsKey);
    all.unshift(item);
    lsSave(lsKey, all);
    return item;
  }

  async function update(id: string, updates: Partial<T>): Promise<T | null> {
    // Update localStorage first
    const all = lsLoad<T>(lsKey);
    const idx = all.findIndex((item) => item.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...updates };
    lsSave(lsKey, all);

    // Sync to Supabase
    if (isSupabaseConfigured()) {
      try {
        const { id: _id, ...rest } = all[idx];
        await supabase.from(table).update({ data: rest }).eq("id", id);
      } catch {
        // localStorage is still updated
      }
    }
    return all[idx];
  }

  async function remove(id: string): Promise<boolean> {
    if (isSupabaseConfigured()) {
      try {
        await supabase.from(table).delete().eq("id", id);
      } catch {
        // fall through
      }
    }
    const all = lsLoad<T>(lsKey);
    const filtered = all.filter((item) => item.id !== id);
    if (filtered.length === all.length) return false;
    lsSave(lsKey, filtered);
    return true;
  }

  async function saveAll(items: T[]): Promise<void> {
    lsSave(lsKey, items);
    if (isSupabaseConfigured()) {
      try {
        const keepIds = new Set(items.map(i => i.id));
        // Delete rows no longer in the set
        const { data: existing } = await supabase.from(table).select("id");
        if (existing) {
          const toDelete = existing.map(r => r.id as string).filter(id => !keepIds.has(id));
          if (toDelete.length > 0) {
            await supabase.from(table).delete().in("id", toDelete);
          }
        }
        // Upsert remaining items
        const rows = items.map((item) => {
          const { id, ...rest } = item;
          return { id, data: rest, created_at: new Date().toISOString() };
        });
        if (rows.length > 0) {
          await supabase.from(table).upsert(rows);
        }
      } catch {
        // localStorage is still saved
      }
    }
  }

  return { getAll, getById, create, update, remove, saveAll };
}
