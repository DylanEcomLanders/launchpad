import { supabase } from "@/lib/supabase";
import type { OutreachSequence, OutreachSequenceInsert } from "./types";

/* ── Local-storage key ── */
const LS_SEQUENCES = "outreach-sequences";

function uid(): string {
  return crypto.randomUUID();
}

// ═══════════════════════════════════════════════════════════════════
// Read
// ═══════════════════════════════════════════════════════════════════

export async function getSequences(): Promise<OutreachSequence[]> {
  try {
    const { data, error } = await supabase
      .from("outreach_sequences")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapRow);
  } catch {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(LS_SEQUENCES);
    return stored ? JSON.parse(stored) : [];
  }
}

export async function getSequenceById(id: string): Promise<OutreachSequence | null> {
  try {
    const { data, error } = await supabase
      .from("outreach_sequences")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data ? mapRow(data) : null;
  } catch {
    if (typeof window === "undefined") return null;
    const all = await getSequences();
    return all.find((s) => s.id === id) ?? null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// Create
// ═══════════════════════════════════════════════════════════════════

export async function createSequence(input: OutreachSequenceInsert): Promise<OutreachSequence> {
  const now = new Date().toISOString();
  const id = uid();

  const row = {
    id,
    brand_name: input.brand_name,
    store_url: input.store_url || "",
    contact_name: input.contact_name || "",
    findings: input.findings,
    steps: input.steps,
    created_at: now,
    updated_at: now,
  };

  try {
    const { data, error } = await supabase
      .from("outreach_sequences")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return mapRow(data);
  } catch {
    const sequence = row as OutreachSequence;
    const existing = await getSequences();
    existing.unshift(sequence);
    localStorage.setItem(LS_SEQUENCES, JSON.stringify(existing));
    return sequence;
  }
}

// ═══════════════════════════════════════════════════════════════════
// Update
// ═══════════════════════════════════════════════════════════════════

export async function updateSequence(
  id: string,
  updates: Partial<Pick<OutreachSequence, "steps">>
): Promise<void> {
  const now = new Date().toISOString();
  try {
    const { error } = await supabase
      .from("outreach_sequences")
      .update({ ...updates, updated_at: now })
      .eq("id", id);
    if (error) throw error;
  } catch {
    const all = await getSequences();
    const updated = all.map((s) =>
      s.id === id ? { ...s, ...updates, updated_at: now } : s
    );
    localStorage.setItem(LS_SEQUENCES, JSON.stringify(updated));
  }
}

// ═══════════════════════════════════════════════════════════════════
// Delete
// ═══════════════════════════════════════════════════════════════════

export async function deleteSequence(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from("outreach_sequences")
      .delete()
      .eq("id", id);
    if (error) throw error;
  } catch {
    const all = await getSequences();
    localStorage.setItem(LS_SEQUENCES, JSON.stringify(all.filter((s) => s.id !== id)));
  }
}

// ═══════════════════════════════════════════════════════════════════
// Row mapper
// ═══════════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): OutreachSequence {
  return {
    id: row.id,
    brand_name: row.brand_name || "",
    store_url: row.store_url || "",
    contact_name: row.contact_name || "",
    findings: row.findings || "",
    steps: row.steps || [],
    created_at: row.created_at || "",
    updated_at: row.updated_at || "",
  };
}
