import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { FeedbackSubmission } from "./types";

const LS_KEY = "feedback-submissions";

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ── Read ────────────────────────────────────────────────────────

export async function getSubmissions(): Promise<FeedbackSubmission[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("feedback")
        .select("*")
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return (data as FeedbackSubmission[]) || [];
    } catch {
      /* fall through to localStorage */
    }
  }
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(LS_KEY);
  return stored ? JSON.parse(stored) : [];
}

// ── Submit ──────────────────────────────────────────────────────

export async function submitFeedback(
  submission: Omit<FeedbackSubmission, "id" | "submitted_at">
): Promise<void> {
  const row: FeedbackSubmission = {
    ...submission,
    id: uid(),
    submitted_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from("feedback").insert(row);
      if (error) throw error;
      return;
    } catch {
      /* fall through to localStorage */
    }
  }
  const existing = localStorage.getItem(LS_KEY);
  const list: FeedbackSubmission[] = existing ? JSON.parse(existing) : [];
  list.unshift(row);
  localStorage.setItem(LS_KEY, JSON.stringify(list));
}

// ── Delete ──────────────────────────────────────────────────────

export async function deleteSubmission(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from("feedback").delete().eq("id", id);
      if (error) throw error;
      return;
    } catch {
      /* fall through to localStorage */
    }
  }
  const existing = localStorage.getItem(LS_KEY);
  const list: FeedbackSubmission[] = existing ? JSON.parse(existing) : [];
  const updated = list.filter((s) => s.id !== id);
  localStorage.setItem(LS_KEY, JSON.stringify(updated));
}
