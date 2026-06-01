// ── Quote tool data layer ───────────────────────────────────────────
// Supabase-first (the quotes table from migration 025). Unlike the pods-v2
// localStorage-cached layer, quotes are admin-authored + client-viewed across
// devices, so we read/write Supabase directly with a localStorage-free path.

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { Quote, QuoteData } from "./types";

/* The quotes table (migration 025) is pasted into Supabase manually. Until
 * then a missing-relation error (Postgres 42P01 / PostgREST PGRST205) is an
 * expected, non-error state — log it quietly so the console isn't spammed
 * with red before the one-time migration runs. */
function isMissingTable(err: unknown): boolean {
  const e = err as { code?: string; message?: string };
  return (
    e?.code === "42P01" ||
    e?.code === "PGRST205" ||
    /schema cache|does not exist|find the table/i.test(e?.message ?? "")
  );
}
function logQuoteErr(where: string, err: unknown) {
  if (isMissingTable(err)) {
    console.info("[quotes] quotes table not migrated yet — paste migration 025.");
  } else {
    console.error(`[quotes] ${where}:`, err);
  }
}

function newToken(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `q-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** List quotes for the admin builder (newest first). */
export async function listQuotes(): Promise<Quote[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase
      .from("quotes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Quote[];
  } catch (err) {
    logQuoteErr("listQuotes", err);
    return [];
  }
}

/** Fetch a single quote by its public token (used by the client view). */
export async function getQuoteByToken(token: string): Promise<Quote | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from("quotes")
      .select("*")
      .eq("token", token)
      .maybeSingle();
    if (error) throw error;
    return (data as Quote) ?? null;
  } catch (err) {
    logQuoteErr("getQuoteByToken", err);
    return null;
  }
}

/** Create a new quote, returns it (incl. token) so the caller can build the
 *  shareable link. */
export async function createQuote(quoteData: QuoteData): Promise<Quote | null> {
  if (!isSupabaseConfigured()) return null;
  const token = newToken();
  try {
    const { data, error } = await supabase
      .from("quotes")
      .insert({ token, data: quoteData })
      .select()
      .single();
    if (error) throw error;
    return data as Quote;
  } catch (err) {
    logQuoteErr("createQuote", err);
    return null;
  }
}

/** Patch a quote's data (edit flow). */
export async function updateQuote(id: string, quoteData: QuoteData): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const { error } = await supabase.from("quotes").update({ data: quoteData }).eq("id", id);
    if (error) throw error;
    return true;
  } catch (err) {
    logQuoteErr("updateQuote", err);
    return false;
  }
}

/** Stamp viewed_at the first time the client opens the page. Fire-and-forget. */
export async function markQuoteViewed(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    await supabase.from("quotes").update({ viewed_at: new Date().toISOString() }).eq("id", id);
  } catch {
    /* non-blocking */
  }
}

export async function trashQuote(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    await supabase.from("quotes").update({ trashed_at: new Date().toISOString() }).eq("id", id);
  } catch (err) {
    console.error("[quotes] trashQuote:", err);
  }
}

export async function restoreQuote(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    await supabase.from("quotes").update({ trashed_at: null }).eq("id", id);
  } catch (err) {
    console.error("[quotes] restoreQuote:", err);
  }
}

export async function deleteQuote(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    await supabase.from("quotes").delete().eq("id", id);
  } catch (err) {
    console.error("[quotes] deleteQuote:", err);
  }
}
