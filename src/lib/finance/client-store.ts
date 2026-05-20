/* ── Client-side wrapper for the finance store API ──
 *
 * Mirrors the createStore<T>() interface so existing finance pages can
 * swap data sources by changing the import. Goes through /api/finance/store
 * which validates the FinanceGate passcode cookie and uses the service
 * role to query Supabase.
 *
 * No localStorage fallback: founder + accountant share this data and we
 * want a canonical source of truth. If the API is down, surface the
 * error rather than diverge locally.
 */

interface Identified {
  id: string;
}

export interface FinanceStore<T extends Identified> {
  getAll(): Promise<T[]>;
  getById(id: string): Promise<T | null>;
  create(item: T): Promise<T>;
  update(id: string, updates: Partial<T>): Promise<T | null>;
  remove(id: string): Promise<boolean>;
}

export function createFinanceStore<T extends Identified>(table: string): FinanceStore<T> {
  const base = `/api/finance/store/${table}`;

  async function getAll(): Promise<T[]> {
    const res = await fetch(base, { cache: "no-store" });
    if (!res.ok) throw await asError(res, `getAll(${table})`);
    const json = (await res.json()) as { items: T[] };
    return json.items;
  }

  async function getById(id: string): Promise<T | null> {
    const res = await fetch(`${base}/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (!res.ok) throw await asError(res, `getById(${table}, ${id})`);
    const json = (await res.json()) as { item: T | null };
    return json.item;
  }

  async function create(item: T): Promise<T> {
    const res = await fetch(base, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    if (!res.ok) throw await asError(res, `create(${table})`);
    return item;
  }

  async function update(id: string, updates: Partial<T>): Promise<T | null> {
    // Convert `undefined` values to `null` in the wire payload so the
    // server can interpret them as explicit field deletions. Plain
    // JSON.stringify strips undefined, which would otherwise leave the
    // old value in place after a "clear" intent.
    const wire: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(updates as Record<string, unknown>)) {
      wire[k] = v === undefined ? null : v;
    }
    const res = await fetch(`${base}/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(wire),
    });
    if (res.status === 404) return null;
    if (!res.ok) throw await asError(res, `update(${table}, ${id})`);
    const json = (await res.json()) as { item: T };
    return json.item;
  }

  async function remove(id: string): Promise<boolean> {
    const res = await fetch(`${base}/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) throw await asError(res, `remove(${table}, ${id})`);
    return true;
  }

  return { getAll, getById, create, update, remove };
}

async function asError(res: Response, op: string): Promise<Error> {
  let detail = res.statusText;
  try {
    const body = await res.json();
    if (body?.error) detail = body.error;
  } catch {
    /* response isn't JSON */
  }
  return new Error(`${op}: ${res.status} ${detail}`);
}
