import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export type NoteColor = "yellow" | "pink" | "blue" | "green" | "orange" | "purple";

export const NOTE_COLORS: NoteColor[] = ["yellow", "pink", "blue", "green", "orange", "purple"];

export interface TackboardNote {
  id: string;
  content: string;
  author: string;
  color: NoteColor;
  x: number;
  y: number;
  rotation: number;
  created_at: string;
  updated_at: string;
}

export type NoteInsert = Omit<TackboardNote, "id" | "created_at" | "updated_at">;
export type NotePatch = Partial<Omit<TackboardNote, "id" | "created_at" | "updated_at">>;

const TABLE = "tackboard_notes";

export async function getNotes(): Promise<TackboardNote[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase.from(TABLE).select("*").order("created_at", { ascending: true });
  if (error) {
    console.error("tackboard getNotes:", error);
    return [];
  }
  return (data || []) as TackboardNote[];
}

export async function createNote(note: NoteInsert): Promise<TackboardNote | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase.from(TABLE).insert(note).select().single();
  if (error) {
    console.error("tackboard createNote:", error);
    return null;
  }
  return data as TackboardNote;
}

export async function updateNote(id: string, patch: NotePatch): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const { error } = await supabase.from(TABLE).update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) console.error("tackboard updateNote:", error);
}

export async function deleteNote(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) console.error("tackboard deleteNote:", error);
}
