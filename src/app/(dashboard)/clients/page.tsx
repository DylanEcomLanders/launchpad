"use client";

/* ── Pod Projects ──
 * A Google-Docs-style workspace for pod delivery. Three columns:
 *   pods → docs  |  sections (tabs)  |  the isolated section editor.
 * Sections isolate — clicking "Week 1" shows just that section's body — so the
 * doc reads as navigable tabs, not one long scroll. Each doc seeds from the
 * retainer / one-time template so the spine is always there.
 *
 * Prototype: localStorage-backed (see lib/pod-projects/data.ts), seeded with
 * Pod 1 + two example docs. Migration 059 wires the shared Supabase table.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRole } from "@/components/auth-gate";
import { TrashIcon, ArrowDownTrayIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";
import { Rail } from "./rail";
import { PageNav } from "./page-nav";
import { DocEditor } from "./editor";
import { ResultsTable } from "./results-table";
import { JournalNotes } from "./journal-notes";
import { WipReflection } from "./wip-reflection";
import { ReportExport } from "./report-export";
import {
  loadDocs,
  loadPods,
  loadTemplates,
  saveTemplate,
  addPod,
  saveDoc,
  removeDoc,
  newDoc,
  setSectionBody,
  setSectionRows,
  newTestRow,
  setSectionEntries,
  newNoteEntry,
  addSection,
  renameSection,
  deleteSection,
  toggleSectionDone,
} from "@/lib/pod-projects/data";
import { flattenSections, firstLeaf, BRIEF_BLOCK } from "@/lib/pod-projects/templates";
import type { Pod, PodDoc, DocSection, DocType, RetainerTier } from "@/lib/pod-projects/types";

const TIER_LABEL: Record<RetainerTier, string> = {
  lite: "Lite",
  core: "Core",
  growth: "Growth",
  scale: "Scale",
};

/** "Started 9 Jul 2026 · 2 weeks in" — the start date + a hint at how long
 *  we've been working together. */
function relationship(startDate?: string): string | null {
  if (!startDate) return null;
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return null;
  const days = Math.max(0, Math.floor((Date.now() - start.getTime()) / 864e5));
  const since =
    days < 1 ? "today" : days < 14 ? `${days} day${days === 1 ? "" : "s"} in` : days < 60 ? `${Math.round(days / 7)} weeks in` : `${Math.round(days / 30)} months in`;
  const label = start.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return `Started ${label} · ${since}`;
}

export default function PodProjectsPage() {
  const role = useRole();
  const canEdit = role === "admin" || role === "cro"; // members get a read-only view
  const [pods, setPods] = useState<Pod[]>([]);
  const [docs, setDocs] = useState<PodDoc[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newFor, setNewFor] = useState<string | null>(null);
  const [autoEditId, setAutoEditId] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      setPods(loadPods());
      const d = await loadDocs();
      // Templates live in the same docs state (flagged isTemplate) so every
      // editor handler works on them uniformly; they're grouped separately in
      // the rail and persist to their own store.
      const templates = loadTemplates();
      setDocs([...d, ...templates]);
      const first = d[0] ?? null;
      setActiveId(first?.id ?? null);
      setSectionId(first ? firstLeaf(first.sections)?.id ?? null : null);
      setLoading(false);
    })();
  }, []);

  const active = useMemo(() => docs.find((d) => d.id === activeId) ?? null, [docs, activeId]);
  const section = useMemo(
    () => (active ? flattenSections(active.sections).find((s) => s.id === sectionId) ?? null : null),
    [active, sectionId],
  );

  /* Route persistence: templates save to their own store, clients to theirs. */
  const persistDoc = useCallback((doc: PodDoc) => {
    if (doc.isTemplate) saveTemplate(doc);
    else void saveDoc(doc);
  }, []);

  const persist = useCallback(
    (doc: PodDoc) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => persistDoc(doc), 700);
    },
    [persistDoc],
  );

  // Selecting a doc lands on its first content-bearing section.
  function selectDoc(id: string) {
    setActiveId(id);
    const doc = docs.find((d) => d.id === id);
    setSectionId(doc ? firstLeaf(doc.sections)?.id ?? null : null);
  }

  function selectSection(s: DocSection) {
    setSectionId(s.id);
  }

  function handleAddSection(parentId: string | null) {
    if (!active) return;
    const { doc, section } = addSection(active, parentId);
    setDocs((prev) => prev.map((d) => (d.id === active.id ? doc : d)));
    setSectionId(section.id);
    setAutoEditId(section.id);
    void persistDoc(doc);
  }

  function handleRenameSection(id: string, title: string) {
    if (!active) return;
    setAutoEditId(null);
    const doc = renameSection(active, id, title);
    setDocs((prev) => prev.map((d) => (d.id === active.id ? doc : d)));
    persist(doc);
  }

  function handleToggleDone() {
    if (!active || !section) return;
    const doc = toggleSectionDone(active, section.id);
    setDocs((prev) => prev.map((d) => (d.id === active.id ? doc : d)));
    persist(doc);
  }


  function handleDeleteSection(id: string) {
    if (!active) return;
    const flat = flattenSections(active.sections);
    const target = flat.find((s) => s.id === id);
    const childIds = target?.children?.map((c) => c.id) ?? [];
    const doc = deleteSection(active, id);
    setDocs((prev) => prev.map((d) => (d.id === active.id ? doc : d)));
    // If the open section was deleted (or was a child of a deleted group), land
    // on the doc's first section again.
    if (sectionId === id || childIds.includes(sectionId ?? "")) {
      setSectionId(firstLeaf(doc.sections)?.id ?? null);
    }
    void persistDoc(doc);
  }

  const handleBodyChange = useCallback(
    (html: string) => {
      if (!active || !section) return;
      const updated = setSectionBody(active, section.id, html);
      setDocs((prev) => prev.map((d) => (d.id === active.id ? updated : d)));
      persist(updated);
    },
    [active, section, persist],
  );

  const handleRowsChange = useCallback(
    (rows: Parameters<typeof setSectionRows>[2]) => {
      if (!active || !section) return;
      const updated = setSectionRows(active, section.id, rows);
      setDocs((prev) => prev.map((d) => (d.id === active.id ? updated : d)));
      persist(updated);
    },
    [active, section, persist],
  );

  const handleEntriesChange = useCallback(
    (entries: Parameters<typeof setSectionEntries>[2]) => {
      if (!active || !section) return;
      const updated = setSectionEntries(active, section.id, entries);
      setDocs((prev) => prev.map((d) => (d.id === active.id ? updated : d)));
      persist(updated);
    },
    [active, section, persist],
  );

  function createDoc(podId: string, title: string, type: DocType, tier?: RetainerTier) {
    const doc = newDoc(podId, title, type, tier);
    setDocs((prev) => [...prev, doc]);
    setActiveId(doc.id);
    setSectionId(firstLeaf(doc.sections)?.id ?? null);
    void saveDoc(doc);
    setNewFor(null);
  }

  function deleteActive() {
    if (!active || active.isTemplate) return;
    if (!confirm(`Delete "${active.title}"? This cannot be undone.`)) return;
    const remaining = docs.filter((d) => d.id !== active.id);
    setDocs(remaining);
    selectDoc(remaining.find((d) => !d.isTemplate)?.id ?? "");
    void removeDoc(active.id);
  }

  const relationshipLabel = relationship(active?.startDate);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      <Rail
        pods={pods}
        docs={docs}
        activeDocId={activeId}
        onSelectDoc={selectDoc}
        onNewDoc={(podId) => setNewFor(podId)}
        onAddPod={(name) => setPods(addPod(name, pods))}
        canEdit={canEdit}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {loading ? (
          <div className="grid flex-1 place-items-center text-sm text-subtle">Loading…</div>
        ) : !active ? (
          <div className="grid flex-1 place-items-center px-6 text-center">
            <div>
              <p className="text-sm text-muted">No document selected.</p>
              <p className="mt-1 text-xs text-subtle">
                Pick one from a pod, or hover a pod and hit + to start a new one.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Doc header — title with inline meta (type · relationship) on the
                left, the page actions on the right. */}
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-border-faint px-6 py-3">
              <div className="min-w-[12rem] flex-1">
                <input
                  value={active.title}
                  readOnly={!canEdit}
                  onChange={(e) => {
                    const updated = { ...active, title: e.target.value };
                    setDocs((prev) => prev.map((d) => (d.id === active.id ? updated : d)));
                    persist(updated);
                  }}
                  className="w-full min-w-0 truncate bg-transparent font-heading text-xl font-medium tracking-tight text-foreground focus:outline-none"
                />
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-2xs text-subtle">
                  {active.isTemplate ? (
                    <span className="inline-flex items-center gap-1.5 text-ring">
                      <span className="size-1.5 rounded-full bg-ring" />
                      Template · edits apply to new {active.type === "retainer" ? "retainer" : "one-time"} clients
                    </span>
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`size-1.5 rounded-full ${active.type === "retainer" ? "bg-status-ontrack" : "bg-subtle"}`} />
                        {active.type === "retainer"
                          ? `${active.tier ? TIER_LABEL[active.tier] : "Core"} retainer`
                          : "One-time project"}
                      </span>
                      {relationshipLabel && (
                        <>
                          <span aria-hidden>·</span>
                          <span className="tabular-nums">{relationshipLabel}</span>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                {canEdit && !active.isTemplate && section && section.kind !== "wip" && (
                  <button
                    onClick={handleToggleDone}
                    title={section.done ? "Mark page as not done" : "Mark page complete"}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-2xs font-medium transition-colors ${
                      section.done
                        ? "text-status-ontrack hover:bg-surface-hover"
                        : "text-muted hover:bg-surface-hover hover:text-foreground"
                    }`}
                  >
                    {section.done ? <CheckCircleSolid className="size-4" /> : <CheckCircleIcon className="size-4" />}
                    {section.done ? "Completed" : "Mark complete"}
                  </button>
                )}
                {!active.isTemplate && section?.kind !== "journal" && section?.kind !== "wip" && (
                  <button
                    onClick={() => setPrinting(true)}
                    title="Export a client PDF"
                    className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-2xs font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                  >
                    <ArrowDownTrayIcon className="size-4" /> Export
                  </button>
                )}
                {canEdit && !active.isTemplate && (
                  <button
                    onClick={deleteActive}
                    title="Delete document"
                    className="flex size-8 items-center justify-center rounded-md text-subtle transition-colors hover:bg-surface-hover hover:text-danger"
                  >
                    <TrashIcon className="size-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="min-h-0 flex-1">
              {!section ? (
                <div className="grid h-full place-items-center text-sm text-subtle">
                  Pick a page above.
                </div>
              ) : section.kind === "results" ? (
                <ResultsTable
                  rows={section.rows ?? []}
                  onChange={handleRowsChange}
                  onAddRow={() => handleRowsChange([...(section.rows ?? []), newTestRow()])}
                  canEdit={canEdit}
                />
              ) : section.kind === "journal" ? (
                <JournalNotes
                  entries={section.entries ?? []}
                  onChange={handleEntriesChange}
                  onAdd={() => handleEntriesChange([newNoteEntry(), ...(section.entries ?? [])])}
                  canEdit={canEdit}
                />
              ) : section.kind === "wip" ? (
                <WipReflection clientId={active.id} />
              ) : (
                <DocEditor
                  contentKey={`${active.id}::${section.id}`}
                  initialBody={section.body}
                  onChange={handleBodyChange}
                  editable={canEdit}
                  appendAction={
                    section.id === "first-week-wins/strategy-brief"
                      ? { label: "Add page brief", html: BRIEF_BLOCK }
                      : undefined
                  }
                />
              )}
            </div>
          </>
        )}
      </div>

      {active && (
        <PageNav
          sections={active.sections}
          activeId={sectionId}
          autoEditId={autoEditId}
          onSelect={selectSection}
          onAddSection={handleAddSection}
          onRename={handleRenameSection}
          onDelete={handleDeleteSection}
          canEdit={canEdit}
        />
      )}

      {printing && active && section && (
        <ReportExport doc={active} section={section} onClose={() => setPrinting(false)} />
      )}

      {newFor && (
        <NewDocModal
          podName={pods.find((p) => p.id === newFor)?.name ?? "pod"}
          onCancel={() => setNewFor(null)}
          onCreate={(title, type, tier) => createDoc(newFor, title, type, tier)}
        />
      )}
    </div>
  );
}

/* ── New-doc modal ── */
function NewDocModal({
  podName,
  onCancel,
  onCreate,
}: {
  podName: string;
  onCancel: () => void;
  onCreate: (title: string, type: DocType, tier?: RetainerTier) => void;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<DocType>("retainer");
  const [tier, setTier] = useState<RetainerTier>("core");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/60 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-sm rounded-lg border border-panel-line bg-surface-raised p-5">
        <h2 className="font-heading text-base font-medium text-foreground">New doc in {podName}</h2>
        <p className="mt-0.5 text-xs text-subtle">Spins up from the matching template.</p>

        <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-subtle">
          Client / project
        </label>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && title.trim() && onCreate(title, type, type === "retainer" ? tier : undefined)}
          placeholder="e.g. Lumen Skincare"
          className="mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-subtle focus:border-foreground focus:outline-none focus:ring-1 focus:ring-ring/40"
        />

        <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-subtle">Type</label>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          {(["retainer", "project"] as DocType[]).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`rounded-md border px-3 py-2 text-xs transition-colors ${
                type === t
                  ? "border-foreground/30 bg-surface text-foreground"
                  : "border-border text-muted hover:text-foreground"
              }`}
            >
              {t === "retainer" ? "Retainer" : "One-time project"}
            </button>
          ))}
        </div>

        {type === "retainer" && (
          <>
            <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-subtle">Tier</label>
            <div className="mt-1.5 grid grid-cols-4 gap-1.5">
              {(Object.keys(TIER_LABEL) as RetainerTier[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTier(t)}
                  className={`rounded-md border px-2 py-1.5 text-2xs transition-colors ${
                    tier === t
                      ? "border-foreground/30 bg-surface text-foreground"
                      : "border-border text-muted hover:text-foreground"
                  }`}
                >
                  {TIER_LABEL[t]}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-md px-3 py-1.5 text-xs text-muted hover:text-foreground">
            Cancel
          </button>
          <button
            disabled={!title.trim()}
            onClick={() => onCreate(title, type, type === "retainer" ? tier : undefined)}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground transition-opacity disabled:opacity-40"
          >
            Create doc
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
