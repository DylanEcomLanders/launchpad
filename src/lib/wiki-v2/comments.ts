/* ── Wiki v2 inline comments — data layer ──
 * Supabase-first, localStorage fallback per the launchpad project
 * pattern. Each comment is a row in wiki_comments anchored by a text
 * triple (before / selection / after) so we can re-locate it on the
 * rendered page even after content edits.
 */

"use client";

import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const TABLE = "wiki_comments";
const LS_KEY = "launchpad-wiki-v2-comments";

export interface WikiComment {
  id: string;
  page_slug: string;
  /** The actual highlighted text. */
  anchor_text: string;
  /** ~80 chars immediately before the selection (for fuzzy re-locate). */
  anchor_before: string;
  /** ~80 chars immediately after the selection. */
  anchor_after: string;
  body: string;
  author_name: string;
  /** Comment id this reply belongs to. Null = root comment. */
  parent_id: string | null;
  resolved_at: string | null;
  created_at: string;
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `wc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function lsLoad(): WikiComment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function lsSave(items: WikiComment[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(items));
  } catch {
    /* storage full */
  }
}

export async function getCommentsForPage(pageSlug: string): Promise<WikiComment[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select("*")
        .eq("data->>page_slug", pageSlug)
        .order("created_at", { ascending: true });
      if (error) throw error;
      if (data) {
        const mapped: WikiComment[] = data.map((row: Record<string, unknown>) => ({
          ...(row.data as Omit<WikiComment, "id" | "created_at">),
          id: row.id as string,
          created_at: row.created_at as string,
        }));
        // Keep localStorage in sync as a cache mirror for this page.
        const others = lsLoad().filter((c) => c.page_slug !== pageSlug);
        lsSave([...others, ...mapped]);
        return mapped;
      }
    } catch {
      // fall through to localStorage
    }
  }
  return lsLoad().filter((c) => c.page_slug === pageSlug);
}

export interface NewComment {
  page_slug: string;
  anchor_text: string;
  anchor_before: string;
  anchor_after: string;
  body: string;
  author_name: string;
  parent_id?: string | null;
}

export async function createComment(input: NewComment): Promise<WikiComment> {
  const comment: WikiComment = {
    id: uid(),
    page_slug: input.page_slug,
    anchor_text: input.anchor_text,
    anchor_before: input.anchor_before,
    anchor_after: input.anchor_after,
    body: input.body,
    author_name: input.author_name,
    parent_id: input.parent_id ?? null,
    resolved_at: null,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const { id, created_at, ...rest } = comment;
      const { error } = await supabase.from(TABLE).insert({
        id,
        data: rest,
        created_at,
      });
      if (error) throw error;
    } catch {
      /* fall through to localStorage-only */
    }
  }

  const all = lsLoad();
  all.push(comment);
  lsSave(all);
  return comment;
}

export async function setResolved(id: string, resolved: boolean): Promise<void> {
  const all = lsLoad();
  const idx = all.findIndex((c) => c.id === id);
  if (idx === -1) return;
  const resolved_at = resolved ? new Date().toISOString() : null;
  all[idx] = { ...all[idx], resolved_at };
  lsSave(all);

  if (isSupabaseConfigured()) {
    try {
      const { id: _id, created_at, ...rest } = all[idx];
      await supabase
        .from(TABLE)
        .update({ data: rest })
        .eq("id", id);
    } catch {
      /* localStorage already updated */
    }
  }
}

/* Author name — stored in localStorage so the user only types it once
 * across the whole wiki. Internal team tool, no auth needed. */
const AUTHOR_KEY = "launchpad-wiki-v2-author";

export function getAuthorName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(AUTHOR_KEY) ?? "";
}

export function setAuthorName(name: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTHOR_KEY, name);
}
