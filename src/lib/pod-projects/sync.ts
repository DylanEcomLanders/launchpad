/* ── Pod Projects: cloud-safe merge ──
 *
 * Client docs are one JSON blob per row. A stale tab that upserts the whole
 * tree last-write-wins newer section bodies (Strategy Brief, report children,
 * custom pages). These helpers compare revisions and merge trees so a save
 * never replaces richer cloud content with an older snapshot.
 */

import type { DocSection, NoteEntry, PodDoc, TestRow } from "./types";

export function parseTimestamp(iso?: string): number {
  if (!iso) return 0;
  const n = Date.parse(iso);
  return Number.isNaN(n) ? 0 : n;
}

/** True when the cloud revision is strictly newer than the snapshot this tab last loaded/saved. */
export function isCloudNewer(cloudUpdatedAt: string | undefined, knownUpdatedAt: string | undefined): boolean {
  return parseTimestamp(cloudUpdatedAt) > parseTimestamp(knownUpdatedAt);
}

/** Visible text with tags stripped — used only to score which body has real copy. */
export function visibleText(html: string | undefined): string {
  return (html ?? "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Template skeletons wrap prompts in <em>. Score the body by the text that
 * remains after those placeholders — a filled brief scores in the thousands,
 * two empty "Page: e.g. Homepage" blocks score near zero.
 */
export function bodyScore(html: string | undefined): number {
  const withoutPlaceholders = (html ?? "").replace(/<em\b[^>]*>[\s\S]*?<\/em>/gi, " ");
  return visibleText(withoutPlaceholders).length;
}

export function pickRicherBody(local: string | undefined, cloud: string | undefined): string {
  const a = local ?? "";
  const b = cloud ?? "";
  if (a === b) return a;
  const sa = bodyScore(a);
  const sb = bodyScore(b);
  if (sa !== sb) return sa > sb ? a : b;
  // Same score (both template-like, or both equally filled): keep the longer
  // HTML so extra "Add page brief" blocks are not dropped.
  return a.length >= b.length ? a : b;
}

function rowFill(row: TestRow): number {
  return [row.test, row.hypothesis, row.metric, row.uplift].reduce((n, v) => n + (v?.trim() ? 1 : 0), 0) + (row.images?.length ?? 0) + (row.image ? 1 : 0);
}

function pickRicherRow(local: TestRow, cloud: TestRow): TestRow {
  return rowFill(local) >= rowFill(cloud) ? local : cloud;
}

function mergeRows(local?: TestRow[], cloud?: TestRow[]): TestRow[] | undefined {
  if (!local && !cloud) return undefined;
  const l = local ?? [];
  const c = cloud ?? [];
  if (!l.length) return c.length ? c : local;
  if (!c.length) return l;
  const localById = new Map(l.map((r) => [r.id, r]));
  const seen = new Set<string>();
  const out: TestRow[] = [];
  for (const row of c) {
    seen.add(row.id);
    const lr = localById.get(row.id);
    out.push(lr ? pickRicherRow(lr, row) : row);
  }
  for (const row of l) {
    if (!seen.has(row.id)) out.push(row);
  }
  return out;
}

function entryFill(e: NoteEntry): number {
  return (e.text ?? "").trim().length;
}

function pickRicherEntry(local: NoteEntry, cloud: NoteEntry): NoteEntry {
  return entryFill(local) >= entryFill(cloud) ? local : cloud;
}

function mergeEntries(local?: NoteEntry[], cloud?: NoteEntry[]): NoteEntry[] | undefined {
  if (!local && !cloud) return undefined;
  const l = local ?? [];
  const c = cloud ?? [];
  if (!l.length) return c.length ? c : local;
  if (!c.length) return l;
  const localById = new Map(l.map((e) => [e.id, e]));
  const seen = new Set<string>();
  const out: NoteEntry[] = [];
  for (const entry of c) {
    seen.add(entry.id);
    const le = localById.get(entry.id);
    out.push(le ? pickRicherEntry(le, entry) : entry);
  }
  for (const entry of l) {
    if (!seen.has(entry.id)) out.push(entry);
  }
  return out;
}

export function mergeSection(local: DocSection, cloud: DocSection): DocSection {
  const children =
    local.children || cloud.children
      ? mergeSectionLists(local.children ?? [], cloud.children ?? [])
      : undefined;
  return {
    ...cloud,
    ...local,
    id: local.id || cloud.id,
    body: pickRicherBody(local.body, cloud.body),
    rows: mergeRows(local.rows, cloud.rows),
    entries: mergeEntries(local.entries, cloud.entries),
    children,
  };
}

/** Union by id: cloud order first (shared spine), then local-only custom pages. */
export function mergeSectionLists(local: DocSection[], cloud: DocSection[]): DocSection[] {
  const localById = new Map(local.map((s) => [s.id, s]));
  const seen = new Set<string>();
  const out: DocSection[] = [];
  for (const c of cloud) {
    seen.add(c.id);
    const l = localById.get(c.id);
    out.push(l ? mergeSection(l, c) : c);
  }
  for (const l of local) {
    if (!seen.has(l.id)) out.push(l);
  }
  return out;
}

/**
 * Merge a local (possibly stale) snapshot with the cloud row. Section bodies
 * prefer real copy over the template skeleton. Top-level fields from `local`
 * win so the in-flight save keeps its title / pod / delete intent.
 */
export function mergePodDocs(local: PodDoc, cloud: PodDoc): PodDoc {
  const next: PodDoc = {
    ...cloud,
    ...local,
    id: local.id,
    created_at: cloud.created_at || local.created_at,
    sections: mergeSectionLists(local.sections ?? [], cloud.sections ?? []),
  };
  if (local.deleted_at) next.deleted_at = local.deleted_at;
  else delete next.deleted_at;
  return next;
}
