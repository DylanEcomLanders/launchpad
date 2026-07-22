/* ── Pod Projects: data layer ──
 *
 * Prototype-grade persistence. localStorage is the source of truth so the
 * feature works with no migration applied; every write also best-efforts to
 * Supabase's `pod_docs` table ({ id, data jsonb, created_at }) when it exists,
 * wrapped so a missing table degrades silently instead of throwing (createStore
 * .create/.upsert throw by design — see supabase-store.ts).
 *
 * Productionising = paste supabase/migrations/059_pod_docs.sql, then swap the
 * hand-rolled read/write below for createStore<PodDoc>({ table:"pod_docs" }).
 * Writes are per-doc upsert (additive, multi-device-safe) — never a destructive
 * saveAll diff (see the sync-patterns incident).
 */

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { Pod, PodDoc, DocSection, DocType, TestRow, NoteEntry } from "./types";
import { templateSections, resultsRowsToHtml } from "./templates";

const DOCS_KEY = "pod-projects-docs";
const PODS_KEY = "pod-projects-pods";
const TEMPLATES_KEY = "pod-projects-templates";
const SEED_VER_KEY = "pod-projects-seed-version";
/* Bump when the seed templates change so the two demo docs refresh on next load
 * (user-created docs are left untouched). Prototype convenience only. */
const SEED_VERSION = 11;
const DEMO_IDS = new Set(["doc-lumen", "doc-fairweather"]);
const TEMPLATE_ID: Record<DocType, string> = { retainer: "template-retainer", project: "template-project" };
export const TEMPLATE_POD_ID = "__templates__";
const TEMPLATE_VER_KEY = "pod-projects-template-version";
/* Own version (independent of SEED_VERSION) — bump when the DEFAULT template
 * skeleton changes during dev. Stop bumping once live so team edits survive. */
const TEMPLATE_VERSION = 5;

/* ── localStorage helpers ── */
function lsLoad<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}
function lsSave<T>(key: string, items: T[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    /* storage full */
  }
}

/* ── Seed: Pod 1 with a retainer + a one-time project so the rail isn't empty
 *    on first load. Only seeds when nothing has been saved yet. ── */
const SEED_PODS: Pod[] = [
  { id: "pod-1", name: "Pod 1" },
  { id: "pod-2", name: "Pod 2" },
  { id: "pod-3", name: "Pod 3" },
];

/* No demo/test data — the workspace starts as a clean skeleton. New clients
 * clone from the editable templates. */
function seedDocs(): PodDoc[] {
  return [];
}

/** A doc from before the section-tree model (had `body`, no `sections`). Such
 *  rows can't render in the tabbed UI, so drop them and re-seed. Only matters
 *  for the localStorage prototype. */
function isLegacy(doc: unknown): boolean {
  return !doc || !Array.isArray((doc as PodDoc).sections);
}

/** On a seed-version bump, purge the old demo docs (Lumen/Fairweather) so the
 *  workspace resets to a clean skeleton, leaving any real client docs. */
function refreshDemoSections(docs: PodDoc[]): PodDoc[] {
  if (typeof window === "undefined") return docs;
  const ver = Number(localStorage.getItem(SEED_VER_KEY) ?? "0");
  if (ver >= SEED_VERSION) return docs;
  const next = docs.filter((d) => !DEMO_IDS.has(d.id));
  lsSave(DOCS_KEY, next);
  try {
    localStorage.setItem(SEED_VER_KEY, String(SEED_VERSION));
  } catch {
    /* storage full */
  }
  return next;
}

/* ── Templates ── the two editable docs new clients clone from. The team edits
 *  these like any doc; changes only affect FUTURE clients (never existing ones).
 *  On a seed-version bump they rebuild from code defaults (dev convenience —
 *  once live, stop bumping so team edits survive). ── */
function defaultTemplateDoc(type: DocType): PodDoc {
  const now = new Date().toISOString();
  return {
    id: TEMPLATE_ID[type],
    podId: TEMPLATE_POD_ID,
    title: type === "retainer" ? "Retainer template" : "One-time project template",
    type,
    tier: type === "retainer" ? "core" : undefined,
    isTemplate: true,
    sections: templateSections(type),
    created_at: now,
    updated_at: now,
  };
}

export function loadTemplates(): PodDoc[] {
  const ver = typeof window !== "undefined" ? Number(localStorage.getItem(TEMPLATE_VER_KEY) ?? "0") : TEMPLATE_VERSION;
  const stored = lsLoad<PodDoc>(TEMPLATES_KEY).filter((d) => d.isTemplate && Array.isArray(d.sections));
  const fresh = ver < TEMPLATE_VERSION;
  const pick = (t: DocType) => (fresh ? undefined : stored.find((d) => d.type === t)) ?? defaultTemplateDoc(t);
  const result = [pick("retainer"), pick("project")];
  if (stored.length < 2 || fresh) {
    lsSave(TEMPLATES_KEY, result);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(TEMPLATE_VER_KEY, String(TEMPLATE_VERSION));
      } catch {
        /* storage full */
      }
    }
  }
  return result;
}

export function saveTemplate(doc: PodDoc): void {
  const next = loadTemplates().map((t) => (t.type === doc.type ? { ...doc, updated_at: new Date().toISOString() } : t));
  lsSave(TEMPLATES_KEY, next);
}

/* ── Pods ── */
export function loadPods(): Pod[] {
  const stored = lsLoad<Pod>(PODS_KEY);
  if (!stored.length) {
    lsSave(PODS_KEY, SEED_PODS);
    return SEED_PODS;
  }
  // Additively reconcile any seed pods missing from an older stored list
  // (e.g. Pod 3 added after Pod 1/2 were already seeded). Never removes.
  const missing = SEED_PODS.filter((sp) => !stored.some((p) => p.id === sp.id));
  if (missing.length) {
    const merged = [...stored, ...missing];
    lsSave(PODS_KEY, merged);
    return merged;
  }
  return stored;
}

export function savePods(pods: Pod[]): void {
  lsSave(PODS_KEY, pods);
}

let podSeq = 0;
export function addPod(name: string, pods: Pod[]): Pod[] {
  podSeq += 1;
  const pod: Pod = { id: `pod-${Date.now().toString(36)}-${podSeq}`, name: name.trim() || `Pod ${pods.length + 1}` };
  const next = [...pods, pod];
  savePods(next);
  return next;
}

/* ── Docs ── */
export async function loadDocs(): Promise<PodDoc[]> {
  // Best-effort cloud read; falls straight through to LS on any error.
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("pod_docs")
        .select("*")
        .order("created_at", { ascending: true });
      if (!error && data) {
        const mapped = data.map((row: Record<string, unknown>) => ({
          ...(row.data as object),
          id: row.id as string,
        })) as PodDoc[];
        const fresh = mapped.filter((d) => !isLegacy(d));
        if (fresh.length) {
          const refreshed = refreshDemoSections(fresh);
          lsSave(DOCS_KEY, refreshed);
          return refreshed;
        }
      }
    } catch {
      /* table missing / offline — use LS */
    }
  }
  const stored = lsLoad<PodDoc>(DOCS_KEY).filter((d) => !isLegacy(d));
  if (stored.length) {
    const refreshed = refreshDemoSections(stored);
    lsSave(DOCS_KEY, refreshed);
    return refreshed;
  }
  const seeded = seedDocs();
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(SEED_VER_KEY, String(SEED_VERSION));
    } catch {
      /* storage full */
    }
  }
  lsSave(DOCS_KEY, seeded);
  return seeded;
}

async function cloudUpsert(doc: PodDoc): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const { id, ...rest } = doc;
    await supabase
      .from("pod_docs")
      .upsert({ id, data: rest, updated_at: new Date().toISOString() }, { onConflict: "id" });
  } catch {
    /* table not migrated yet — LS already holds it */
  }
}

export async function saveDoc(doc: PodDoc): Promise<void> {
  const all = lsLoad<PodDoc>(DOCS_KEY);
  const idx = all.findIndex((d) => d.id === doc.id);
  const next = { ...doc, updated_at: new Date().toISOString() };
  if (idx >= 0) all[idx] = next;
  else all.push(next);
  lsSave(DOCS_KEY, all);
  await cloudUpsert(next); // additive — never a destructive diff
}

export async function removeDoc(id: string): Promise<void> {
  const all = lsLoad<PodDoc>(DOCS_KEY).filter((d) => d.id !== id);
  lsSave(DOCS_KEY, all);
  if (isSupabaseConfigured()) {
    try {
      await supabase.from("pod_docs").delete().eq("id", id);
    } catch {
      /* LS already updated */
    }
  }
}

let seq = 0;
export function newDoc(podId: string, title: string, type: PodDoc["type"], tier?: PodDoc["tier"]): PodDoc {
  const now = new Date().toISOString();
  seq += 1;
  // Clone from the team-editable template so their changes flow into new clients.
  const template = loadTemplates().find((t) => t.type === type);
  const sections: DocSection[] = template
    ? (JSON.parse(JSON.stringify(template.sections)) as DocSection[])
    : templateSections(type);
  return {
    id: `doc-${Date.now().toString(36)}-${seq}`,
    podId,
    title: title.trim() || "Untitled",
    type,
    tier: type === "retainer" ? tier ?? "core" : undefined,
    sections,
    startDate: now.slice(0, 10),
    created_at: now,
    updated_at: now,
  };
}

let rowSeq = 0;
export function newTestRow(): TestRow {
  rowSeq += 1;
  return { id: `row-${Date.now().toString(36)}-${rowSeq}`, test: "", hypothesis: "", metric: "", uplift: "", status: "backlog" };
}

/** Set the structured rows of a "results" section; keeps `body` as an HTML
 *  mirror so the Client PDF renders without knowing the structured model. */
export function setSectionRows(doc: PodDoc, sectionId: string, rows: TestRow[]): PodDoc {
  const body = resultsRowsToHtml(rows);
  const walk = (sections: DocSection[]): DocSection[] =>
    sections.map((s) => {
      if (s.id === sectionId) return { ...s, rows, body };
      if (s.children) return { ...s, children: walk(s.children) };
      return s;
    });
  return { ...doc, sections: walk(doc.sections) };
}

let entrySeq = 0;
export function newNoteEntry(): NoteEntry {
  entrySeq += 1;
  return { id: `note-${Date.now().toString(36)}-${entrySeq}`, at: new Date().toISOString(), text: "", upsell: false };
}

/** Set the journal entries of a "journal" (Notes) section. */
export function setSectionEntries(doc: PodDoc, sectionId: string, entries: NoteEntry[]): PodDoc {
  const walk = (sections: DocSection[]): DocSection[] =>
    sections.map((s) => {
      if (s.id === sectionId) return { ...s, entries };
      if (s.children) return { ...s, children: walk(s.children) };
      return s;
    });
  return { ...doc, sections: walk(doc.sections) };
}

/** Replace one section's body within a doc's tree, returning a new doc. */
export function setSectionBody(doc: PodDoc, sectionId: string, body: string): PodDoc {
  const walk = (sections: DocSection[]): DocSection[] =>
    sections.map((s) => {
      if (s.id === sectionId) return { ...s, body };
      if (s.children) return { ...s, children: walk(s.children) };
      return s;
    });
  return { ...doc, sections: walk(doc.sections) };
}

let sectionSeq = 0;
function newSectionId(): string {
  sectionSeq += 1;
  return `sec-${Date.now().toString(36)}-${sectionSeq}`;
}

/** Add a section. `parentId` null → top-level; otherwise a child of that group.
 *  Returns the new doc + the created section (so the caller can select + rename). */
export function addSection(
  doc: PodDoc,
  parentId: string | null,
  title = "New section",
): { doc: PodDoc; section: DocSection } {
  const section: DocSection = { id: newSectionId(), title: title.trim() || "New section", body: "<p></p>" };
  if (!parentId) {
    return { doc: { ...doc, sections: [...doc.sections, section] }, section };
  }
  const walk = (sections: DocSection[]): DocSection[] =>
    sections.map((s) => {
      if (s.id === parentId) return { ...s, children: [...(s.children ?? []), section] };
      if (s.children) return { ...s, children: walk(s.children) };
      return s;
    });
  return { doc: { ...doc, sections: walk(doc.sections) }, section };
}

/** Flip a section's completion. Groups derive their state from children, so
 *  toggling a group cascades to its children (all done / all open). */
export function toggleSectionDone(doc: PodDoc, sectionId: string): PodDoc {
  const walk = (sections: DocSection[]): DocSection[] =>
    sections.map((s) => {
      if (s.id === sectionId) {
        const next = !(s.children?.length ? s.children.every((c) => c.done) : s.done);
        return s.children?.length
          ? { ...s, done: next, children: s.children.map((c) => ({ ...c, done: next })) }
          : { ...s, done: next };
      }
      return s.children ? { ...s, children: walk(s.children) } : s;
    });
  return { ...doc, sections: walk(doc.sections) };
}

export function renameSection(doc: PodDoc, sectionId: string, title: string): PodDoc {
  const walk = (sections: DocSection[]): DocSection[] =>
    sections.map((s) => {
      const next = s.id === sectionId ? { ...s, title } : s;
      return next.children ? { ...next, children: walk(next.children) } : next;
    });
  return { ...doc, sections: walk(doc.sections) };
}

/** Remove a section (and its children) anywhere in the tree. */
export function deleteSection(doc: PodDoc, sectionId: string): PodDoc {
  const walk = (sections: DocSection[]): DocSection[] =>
    sections
      .filter((s) => s.id !== sectionId)
      .map((s) => (s.children ? { ...s, children: walk(s.children) } : s));
  return { ...doc, sections: walk(doc.sections) };
}
