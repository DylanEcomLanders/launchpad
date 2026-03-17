import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { LaunchpadIssue, LaunchpadIssueInsert, IssueStatus } from "./types";

const LS_KEY = "launchpad-issues";

function uid(): string {
  return crypto.randomUUID();
}

function loadLocal(): LaunchpadIssue[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(LS_KEY);
  return stored ? JSON.parse(stored) : [];
}

function saveLocal(issues: LaunchpadIssue[]): void {
  localStorage.setItem(LS_KEY, JSON.stringify(issues));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): LaunchpadIssue {
  return {
    id: row.id,
    title: row.title || "",
    description: row.description || "",
    type: row.type || "bug",
    page: row.page || "",
    reported_by: row.reported_by || "",
    status: row.status || "open",
    created_at: row.created_at || "",
  };
}

// ═══════════════════════════════════════════════════════════════════
// Read
// ═══════════════════════════════════════════════════════════════════

export async function getIssues(): Promise<LaunchpadIssue[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("issues")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapRow);
    } catch {
      /* fall through to localStorage */
    }
  }
  return loadLocal().sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

// ═══════════════════════════════════════════════════════════════════
// Create
// ═══════════════════════════════════════════════════════════════════

export async function createIssue(input: LaunchpadIssueInsert): Promise<LaunchpadIssue> {
  const now = new Date().toISOString();
  const id = uid();

  const row = {
    id,
    title: input.title,
    description: input.description,
    type: input.type,
    page: input.page,
    reported_by: input.reported_by,
    status: "open" as IssueStatus,
    created_at: now,
  };

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("issues")
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      return mapRow(data);
    } catch {
      /* fall through */
    }
  }
  const issue = row as LaunchpadIssue;
  const all = loadLocal();
  all.unshift(issue);
  saveLocal(all);
  return issue;
}

// ═══════════════════════════════════════════════════════════════════
// Update status
// ═══════════════════════════════════════════════════════════════════

export async function updateIssueStatus(id: string, status: IssueStatus): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from("issues")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
      return;
    } catch {
      /* fall through */
    }
  }
  const all = loadLocal();
  const updated = all.map((i) => (i.id === id ? { ...i, status } : i));
  saveLocal(updated);
}

// ═══════════════════════════════════════════════════════════════════
// Delete
// ═══════════════════════════════════════════════════════════════════

export async function deleteIssue(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from("issues")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return;
    } catch {
      /* fall through */
    }
  }
  const all = loadLocal();
  saveLocal(all.filter((i) => i.id !== id));
}
