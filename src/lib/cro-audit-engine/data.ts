import { createStore } from "@/lib/supabase-store";
import type { AuditReport } from "./types";

const store = createStore<AuditReport>({
  table: "cro_audits",
  lsKey: "cro-audits",
});

export async function getAudits(): Promise<AuditReport[]> {
  return store.getAll();
}

export async function getAuditById(id: string): Promise<AuditReport | null> {
  const all = await store.getAll();
  return all.find((a) => a.id === id) || null;
}

export async function getAuditByToken(token: string): Promise<AuditReport | null> {
  // Try Supabase first for server-side
  try {
    const { isSupabaseConfigured, supabase } = await import("@/lib/supabase");
    if (isSupabaseConfigured()) {
      const { data } = await supabase.from("cro_audits").select("*");
      const match = (data || []).find((row: { data: AuditReport }) => row.data?.token === token);
      if (match) return match.data as AuditReport;
    }
  } catch { /* fallback */ }
  const all = await store.getAll();
  return all.find((a) => a.token === token) || null;
}

export async function saveAudit(audit: AuditReport): Promise<void> {
  try {
    const { isSupabaseConfigured, supabase } = await import("@/lib/supabase");
    if (isSupabaseConfigured()) {
      const { id, ...rest } = audit;
      await supabase.from("cro_audits").upsert({
        id,
        data: rest,
        created_at: audit.created_at || new Date().toISOString(),
      });
    }
  } catch { /* fallback to localStorage */ }
  // Update localStorage
  const all = await store.getAll();
  const idx = all.findIndex((a) => a.id === audit.id);
  if (idx >= 0) all[idx] = audit;
  else all.push(audit);
  if (typeof window !== "undefined") {
    localStorage.setItem("cro-audits", JSON.stringify(all));
  }
}

export async function deleteAudit(id: string): Promise<void> {
  try {
    const { isSupabaseConfigured, supabase } = await import("@/lib/supabase");
    if (isSupabaseConfigured()) {
      await supabase.from("cro_audits").delete().eq("id", id);
    }
  } catch { /* fallback */ }
  const all = await store.getAll();
  const filtered = all.filter((a) => a.id !== id);
  if (typeof window !== "undefined") {
    localStorage.setItem("cro-audits", JSON.stringify(filtered));
  }
}

export async function incrementViewCount(token: string): Promise<void> {
  try {
    const { isSupabaseConfigured, supabase } = await import("@/lib/supabase");
    if (isSupabaseConfigured()) {
      const { data } = await supabase.from("cro_audits").select("*");
      const match = (data || []).find((row: { id: string; data: AuditReport }) => row.data?.token === token);
      if (match) {
        const audit = match.data as AuditReport;
        const updated = {
          ...audit,
          view_count: (audit.view_count || 0) + 1,
          opened_at: audit.opened_at || new Date().toISOString(),
        };
        await supabase.from("cro_audits").update({ data: updated }).eq("id", match.id);
      }
    }
  } catch { /* silent */ }
}
