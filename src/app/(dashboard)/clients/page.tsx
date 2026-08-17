"use client";

/* ── Pod Projects ──
 * A Google-Docs-style workspace for pod delivery. Three columns:
 *   pods → docs  |  sections (tabs)  |  the isolated section editor.
 * Sections isolate — clicking "Week 1" shows just that section's body — so the
 * doc reads as navigable tabs, not one long scroll. Each doc seeds from the
 * retainer / one-time template so the spine is always there.
 *
 * Persistence: Supabase `pod_docs` is the source of truth (see
 * lib/pod-projects/data.ts). localStorage is a cache. Saves refuse to
 * overwrite a newer cloud revision with a stale tab's section tree.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRole } from "@/components/auth-gate";
import { TrashIcon, ArrowDownTrayIcon, CheckCircleIcon, XMarkIcon, ViewColumnsIcon, PlusIcon } from "@heroicons/react/24/outline";
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
  loadPodsCloud,
  loadTemplatesCloud,
  saveTemplate,
  addPod,
  savePods,
  saveDoc,
  removeDoc,
  restoreDoc,
  purgeDoc,
  loadDeletedDocs,
  POD_DOCS_SYNC_ERROR,
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
import { mergePodDocs } from "@/lib/pod-projects/sync";
import { flattenSections, firstLeaf, BRIEF_BLOCK } from "@/lib/pod-projects/templates";
import type { Pod, PodDoc, DocSection, DocType, RetainerTier } from "@/lib/pod-projects/types";
import { loadCards, saveCard, removeCard, newCard, cardsForClient } from "@/lib/cx/data";
import { stageLabel } from "@/lib/cx/stages";
import type { CxCard } from "@/lib/cx/types";

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
  const [showTrash, setShowTrash] = useState(false);
  const [deletedDocs, setDeletedDocs] = useState<PodDoc[]>([]);
  const [showDeliverables, setShowDeliverables] = useState(false);
  const [clientCards, setClientCards] = useState<CxCard[]>([]);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const docsRef = useRef<PodDoc[]>([]);

  const applyDocs = useCallback((updater: (prev: PodDoc[]) => PodDoc[]) => {
    setDocs((prev) => {
      const next = updater(prev);
      docsRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    (async () => {
      // Cloud-first so pods, templates and docs are all shared across the team.
      const [d, cloudPods, templates] = await Promise.all([loadDocs(), loadPodsCloud(), loadTemplatesCloud()]);
      setPods(cloudPods);
      setDeletedDocs(loadDeletedDocs());
      // Templates live in the same docs state (flagged isTemplate) so every
      // editor handler works on them uniformly; they're grouped separately in
      // the rail and persist to their own store.
      const initial = [...d, ...templates];
      docsRef.current = initial;
      setDocs(initial);
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

  /* Route persistence: templates save to their own store, clients to theirs.
   * After a client save, stamp `updated_at` so the next write is compared
   * against the revision we just persisted. On a stale-tab conflict, take the
   * merged cloud tree (filled briefs survive) without clobbering keystrokes
   * that landed after this save started.
   *
   * Mutations always patch from `prev` (via applyDocs) and the debounced
   * flush reads `docsRef` — never a captured `active` snapshot — so editing
   * Overview cannot overwrite an in-flight Strategy Brief edit. */
  const persistDoc = useCallback(async (doc: PodDoc) => {
    if (doc.isTemplate) {
      saveTemplate(doc);
      return;
    }
    const { doc: saved, conflicted } = await saveDoc(doc);
    applyDocs((prev) =>
      prev.map((d) => {
        if (d.id !== saved.id) return d;
        if (conflicted) return { ...mergePodDocs(d, saved), updated_at: saved.updated_at };
        return { ...d, updated_at: saved.updated_at };
      }),
    );
  }, [applyDocs]);

  const persistNow = useCallback(
    (id: string) => {
      const doc = docsRef.current.find((d) => d.id === id);
      if (doc) void persistDoc(doc);
    },
    [persistDoc],
  );

  const persist = useCallback(
    (id: string) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => persistNow(id), 700);
    },
    [persistNow],
  );

  // Switch a client between retainer and one-time after creation. Sections are
  // kept as-is; only the type (and default tier) change.
  function changeType(type: DocType) {
    if (!activeId) return;
    applyDocs((prev) => {
      const current = prev.find((d) => d.id === activeId);
      if (!current || current.isTemplate || current.type === type) return prev;
      return prev.map((d) =>
        d.id === activeId
          ? { ...current, type, tier: type === "retainer" ? current.tier ?? "core" : current.tier }
          : d,
      );
    });
    persistNow(activeId);
  }

  // Delete a pod (only when empty, so no client is orphaned).
  function deletePod(podId: string) {
    if (docs.some((d) => !d.isTemplate && d.podId === podId)) {
      alert("Move this pod's clients to another pod first (drag them), then you can delete it.");
      return;
    }
    if (!confirm("Delete this pod?")) return;
    const next = pods.filter((p) => p.id !== podId);
    setPods(next);
    savePods(next);
  }

  // Move a client doc to another pod (drag-drop in the rail).
  function moveDocToPod(docId: string, podId: string) {
    applyDocs((prev) => {
      const current = prev.find((d) => d.id === docId);
      if (!current || current.isTemplate || current.podId === podId) return prev;
      return prev.map((d) => (d.id === docId ? { ...current, podId } : d));
    });
    persistNow(docId);
  }

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
    if (!activeId) return;
    let createdId: string | null = null;
    applyDocs((prev) => {
      const current = prev.find((d) => d.id === activeId);
      if (!current) return prev;
      const { doc, section } = addSection(current, parentId);
      createdId = section.id;
      return prev.map((d) => (d.id === activeId ? doc : d));
    });
    if (!createdId) return;
    setSectionId(createdId);
    setAutoEditId(createdId);
    persistNow(activeId);
  }

  function handleRenameSection(id: string, title: string) {
    if (!activeId) return;
    setAutoEditId(null);
    applyDocs((prev) => {
      const current = prev.find((d) => d.id === activeId);
      if (!current) return prev;
      return prev.map((d) => (d.id === activeId ? renameSection(current, id, title) : d));
    });
    persist(activeId);
  }

  function handleToggleDone() {
    if (!activeId || !sectionId) return;
    applyDocs((prev) => {
      const current = prev.find((d) => d.id === activeId);
      if (!current) return prev;
      return prev.map((d) => (d.id === activeId ? toggleSectionDone(current, sectionId) : d));
    });
    persist(activeId);
  }

  function handleDeleteSection(id: string) {
    if (!activeId) return;
    let nextLeaf: string | null | undefined;
    applyDocs((prev) => {
      const current = prev.find((d) => d.id === activeId);
      if (!current) return prev;
      const flat = flattenSections(current.sections);
      const target = flat.find((s) => s.id === id);
      const childIds = target?.children?.map((c) => c.id) ?? [];
      const doc = deleteSection(current, id);
      if (sectionId === id || childIds.includes(sectionId ?? "")) {
        nextLeaf = firstLeaf(doc.sections)?.id ?? null;
      }
      return prev.map((d) => (d.id === activeId ? doc : d));
    });
    if (nextLeaf !== undefined) setSectionId(nextLeaf);
    persistNow(activeId);
  }

  const handleBodyChange = useCallback(
    (html: string) => {
      if (!activeId || !sectionId) return;
      let changed = false;
      applyDocs((prev) => {
        const current = prev.find((d) => d.id === activeId);
        if (!current) return prev;
        const currentSection = flattenSections(current.sections).find((s) => s.id === sectionId);
        if (!currentSection || html === currentSection.body) return prev;
        changed = true;
        return prev.map((d) => (d.id === activeId ? setSectionBody(current, sectionId, html) : d));
      });
      if (changed) persist(activeId);
    },
    [activeId, sectionId, applyDocs, persist],
  );

  const handleRowsChange = useCallback(
    (rows: Parameters<typeof setSectionRows>[2]) => {
      if (!activeId || !sectionId) return;
      applyDocs((prev) => {
        const current = prev.find((d) => d.id === activeId);
        if (!current) return prev;
        return prev.map((d) => (d.id === activeId ? setSectionRows(current, sectionId, rows) : d));
      });
      persist(activeId);
    },
    [activeId, sectionId, applyDocs, persist],
  );

  const handleEntriesChange = useCallback(
    (entries: Parameters<typeof setSectionEntries>[2]) => {
      if (!activeId || !sectionId) return;
      applyDocs((prev) => {
        const current = prev.find((d) => d.id === activeId);
        if (!current) return prev;
        return prev.map((d) => (d.id === activeId ? setSectionEntries(current, sectionId, entries) : d));
      });
      persist(activeId);
    },
    [activeId, sectionId, applyDocs, persist],
  );

  function createDoc(podId: string, title: string, type: DocType, tier?: RetainerTier) {
    const doc = newDoc(podId, title, type, tier);
    applyDocs((prev) => [...prev, doc]);
    setActiveId(doc.id);
    setSectionId(firstLeaf(doc.sections)?.id ?? null);
    persistNow(doc.id);
    setNewFor(null);
  }

  function deleteActive() {
    if (!active || active.isTemplate) return;
    if (!confirm(`Delete "${active.title}"? You can restore it from Recently deleted.`)) return;
    const removed = active;
    applyDocs((prev) => prev.filter((d) => d.id !== removed.id));
    selectDoc(docsRef.current.find((d) => !d.isTemplate)?.id ?? "");
    void removeDoc(removed.id).then(() => setDeletedDocs(loadDeletedDocs()));
  }

  function openTrash() {
    setDeletedDocs(loadDeletedDocs());
    setShowTrash(true);
  }
  async function restoreFromTrash(id: string) {
    const doc = deletedDocs.find((d) => d.id === id);
    await restoreDoc(id);
    if (doc) {
      const revived = { ...doc };
      delete revived.deleted_at;
      applyDocs((prev) => (prev.some((d) => d.id === id) ? prev : [...prev, revived]));
    }
    setDeletedDocs(loadDeletedDocs());
  }
  async function purgeFromTrash(id: string) {
    if (!confirm("Permanently delete this client? This cannot be undone.")) return;
    await purgeDoc(id);
    setDeletedDocs(loadDeletedDocs());
  }

  /* Deliverables: this client's cards on the Delivery board. Opening the panel
   * loads them; adding one creates a card on the board (linked by the doc id). */
  async function openDeliverables() {
    if (!active) return;
    const all = await loadCards();
    setClientCards(cardsForClient(all, active.id));
    setShowDeliverables(true);
  }
  async function addDeliverable(title: string) {
    if (!active) return;
    const card = newCard(active.id, active.title, title);
    await saveCard(card);
    setClientCards((prev) => [...prev, card]);
  }
  async function removeDeliverable(id: string) {
    await removeCard(id);
    setClientCards((prev) => prev.filter((c) => c.id !== id));
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
        onMoveDoc={moveDocToPod}
        onDeletePod={deletePod}
        onOpenTrash={openTrash}
        trashCount={deletedDocs.length}
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
                    const title = e.target.value;
                    applyDocs((prev) => prev.map((d) => (d.id === active.id ? { ...d, title } : d)));
                    persist(active.id);
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
                        {canEdit ? (
                          <select
                            value={active.type}
                            onChange={(e) => changeType(e.target.value as DocType)}
                            title="Switch engagement type"
                            className="-ml-0.5 cursor-pointer rounded bg-transparent text-2xs text-subtle outline-none hover:text-foreground focus:text-foreground"
                          >
                            <option value="retainer" className="bg-surface-raised text-foreground">
                              {active.tier ? `${TIER_LABEL[active.tier]} retainer` : "Retainer"}
                            </option>
                            <option value="project" className="bg-surface-raised text-foreground">
                              One-time project
                            </option>
                          </select>
                        ) : active.type === "retainer" ? (
                          `${active.tier ? TIER_LABEL[active.tier] : "Core"} retainer`
                        ) : (
                          "One-time project"
                        )}
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
                {canEdit && !active.isTemplate && (
                  <button
                    onClick={openDeliverables}
                    title="This client's cards on the Delivery board"
                    className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-2xs font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                  >
                    <ViewColumnsIcon className="size-4" /> Deliverables
                  </button>
                )}
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

      {showTrash && (
        <TrashModal
          docs={deletedDocs}
          onRestore={restoreFromTrash}
          onPurge={purgeFromTrash}
          onClose={() => setShowTrash(false)}
        />
      )}

      {showDeliverables && active && (
        <DeliverablesModal
          clientName={active.title}
          cards={clientCards}
          onAdd={addDeliverable}
          onRemove={removeDeliverable}
          onClose={() => setShowDeliverables(false)}
        />
      )}

      <PodDocsSyncErrorToast />
    </div>
  );
}

function PodDocsSyncErrorToast() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent<{ message: string }>).detail;
      if (detail?.message) {
        setError(detail.message);
        window.setTimeout(() => setError(null), 10000);
      }
    }
    window.addEventListener(POD_DOCS_SYNC_ERROR, handler);
    return () => window.removeEventListener(POD_DOCS_SYNC_ERROR, handler);
  }, []);

  if (!error) return null;
  return (
    <div className="fixed bottom-6 left-1/2 z-50 max-w-md -translate-x-1/2 rounded bg-status-late/[0.95] px-5 py-3 text-xs font-medium text-white">
      <div className="mb-0.5 font-semibold">Cloud save failed</div>
      <div className="break-all text-2xs opacity-90">{error}</div>
    </div>
  );
}

/* This client's cards on the Delivery board: view them, and add deliverables
 * that become cards on the board (linked to this client). */
function DeliverablesModal({
  clientName,
  cards,
  onAdd,
  onRemove,
  onClose,
}: {
  clientName: string;
  cards: CxCard[];
  onAdd: (title: string) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState("");
  const submit = () => {
    const t = draft.trim();
    if (!t) return;
    onAdd(t);
    setDraft("");
  };
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[10vh]" onClick={onClose}>
      <div className="w-full max-w-md overflow-hidden rounded border border-border bg-surface" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border-faint px-4 py-3">
          <div>
            <span className="text-2xs font-semibold uppercase tracking-wide text-subtle">Deliverables</span>
            <p className="text-2xs text-subtle">On the Delivery board for {clientName}</p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-subtle hover:bg-surface-raised hover:text-foreground">
            <XMarkIcon className="size-4" />
          </button>
        </div>

        <div className="max-h-[50vh] space-y-1 overflow-y-auto scrollbar-thin px-2 py-2">
          {cards.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-subtle">No cards yet. Add a deliverable to put it on the board.</p>
          ) : (
            cards.map((c) => (
              <div key={c.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-surface-hover">
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">{c.title}</span>
                <span className="shrink-0 text-2xs text-subtle">{stageLabel(c.stage)}</span>
                <button
                  onClick={() => onRemove(c.id)}
                  title="Remove from board"
                  className="shrink-0 rounded p-1.5 text-subtle hover:bg-status-late/10 hover:text-status-late"
                >
                  <TrashIcon className="size-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-border-faint px-3 py-3">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Add a deliverable…"
            className="flex-1 rounded border border-border bg-surface-raised px-2.5 py-1.5 text-sm text-foreground outline-none placeholder:text-subtle/60 focus:border-ring"
          />
          <button
            onClick={submit}
            disabled={!draft.trim()}
            className="inline-flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:opacity-90 disabled:opacity-40"
          >
            <PlusIcon className="size-4" /> Add
          </button>
        </div>
        <div className="border-t border-border-faint px-4 py-2 text-2xs text-subtle">
          New cards land in Setup on the Delivery board. Manage stages, assignees and dates there.
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* Recently deleted: restore a soft-deleted client, or remove it for good. */
function TrashModal({
  docs,
  onRestore,
  onPurge,
  onClose,
}: {
  docs: PodDoc[];
  onRestore: (id: string) => void;
  onPurge: (id: string) => void;
  onClose: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[10vh]" onClick={onClose}>
      <div className="w-full max-w-md overflow-hidden rounded border border-border bg-surface" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border-faint px-4 py-3">
          <span className="text-2xs font-semibold uppercase tracking-wide text-subtle">Recently deleted</span>
          <button onClick={onClose} className="rounded p-1 text-subtle hover:bg-surface-raised hover:text-foreground">
            <XMarkIcon className="size-4" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto scrollbar-thin px-2 py-2">
          {docs.length === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-subtle">Nothing here. Deleted clients show up for recovery.</p>
          ) : (
            docs.map((d) => (
              <div key={d.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-surface-hover">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-foreground">{d.title}</div>
                  <div className="text-2xs text-subtle">
                    Deleted {d.deleted_at ? new Date(d.deleted_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""}
                  </div>
                </div>
                <button
                  onClick={() => onRestore(d.id)}
                  className="shrink-0 rounded border border-border px-2 py-1 text-2xs font-medium text-foreground hover:bg-surface-raised"
                >
                  Restore
                </button>
                <button
                  onClick={() => onPurge(d.id)}
                  title="Delete forever"
                  className="shrink-0 rounded p-1.5 text-subtle hover:bg-status-late/10 hover:text-status-late"
                >
                  <TrashIcon className="size-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
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
