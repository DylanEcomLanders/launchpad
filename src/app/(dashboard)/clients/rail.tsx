"use client";

/* ── Pod Projects: brand rail (left) ──
 * Shallow, single purpose: pick which brand you're in. Pods group their client
 * docs; that's it — the doc's PAGES live in the top tab bar, not here, so the
 * two navigations stay separate and each stays legible.
 */

import { useEffect, useRef, useState } from "react";
import {
  ChevronRightIcon,
  PlusIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
} from "@heroicons/react/24/outline";
import type { Pod, PodDoc } from "@/lib/pod-projects/types";

export function Rail({
  pods,
  docs,
  activeDocId,
  onSelectDoc,
  onNewDoc,
  onAddPod,
  onMoveDoc,
  canEdit = true,
}: {
  pods: Pod[];
  docs: PodDoc[];
  activeDocId: string | null;
  onSelectDoc: (id: string) => void;
  onNewDoc: (podId: string) => void;
  onAddPod: (name: string) => void;
  onMoveDoc?: (docId: string, podId: string) => void;
  canEdit?: boolean;
}) {
  const [podClosed, setPodClosed] = useState<Record<string, boolean>>({});
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [draggedDocId, setDraggedDocId] = useState<string | null>(null);
  const [dragOverPod, setDragOverPod] = useState<string | null>(null);
  const [addingPod, setAddingPod] = useState(false);
  const [podDraft, setPodDraft] = useState("");
  const podInputRef = useRef<HTMLInputElement>(null);
  const templates = docs.filter((d) => d.isTemplate);

  useEffect(() => {
    if (addingPod) podInputRef.current?.focus();
  }, [addingPod]);

  function commitPod() {
    if (podDraft.trim()) onAddPod(podDraft.trim());
    setPodDraft("");
    setAddingPod(false);
  }

  if (railCollapsed) {
    return (
      <aside className="flex h-full w-10 shrink-0 flex-col items-center border-r border-border bg-surface pt-4">
        <button
          onClick={() => setRailCollapsed(false)}
          title="Show brands"
          className="flex size-7 items-center justify-center rounded-md text-subtle transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          <ChevronDoubleRightIcon className="size-4" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center justify-between px-3 pb-2 pt-4">
        <span className="pl-1 font-mono text-4xs font-medium uppercase tracking-widest text-subtle">Pods</span>
        <button
          onClick={() => setRailCollapsed(true)}
          title="Hide panel"
          className="flex size-5 items-center justify-center rounded text-subtle transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          <ChevronDoubleLeftIcon className="size-3.5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-4">
        {pods.map((pod) => {
          const podDocs = docs.filter((d) => !d.isTemplate && d.podId === pod.id);
          const closed = podClosed[pod.id];
          return (
            <div
              key={pod.id}
              className={`mb-0.5 rounded-md ${dragOverPod === pod.id ? "bg-ring/10 ring-1 ring-ring/40" : ""}`}
              onDragOver={(e) => {
                if (!draggedDocId) return;
                e.preventDefault();
                if (dragOverPod !== pod.id) setDragOverPod(pod.id);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverPod((cur) => (cur === pod.id ? null : cur));
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedDocId && onMoveDoc) onMoveDoc(draggedDocId, pod.id);
                setDraggedDocId(null);
                setDragOverPod(null);
              }}
            >
              {/* Pod row */}
              <div className="group/pod flex items-center rounded-md pl-1.5 pr-1 hover:bg-surface-hover">
                <button
                  onClick={() => setPodClosed((c) => ({ ...c, [pod.id]: !c[pod.id] }))}
                  className="flex min-w-0 flex-1 items-center gap-1.5 py-1 text-left"
                >
                  <ChevronRightIcon className={`size-3 shrink-0 text-subtle transition-transform ${closed ? "" : "rotate-90"}`} />
                  <span className="truncate text-xs font-medium text-foreground">{pod.name}</span>
                </button>
                <span className="px-1 text-3xs tabular-nums text-subtle group-hover/pod:hidden">{podDocs.length}</span>
                {canEdit && (
                  <button
                    onClick={() => onNewDoc(pod.id)}
                    title={`New doc in ${pod.name}`}
                    className="flex size-5 shrink-0 items-center justify-center rounded text-subtle opacity-0 transition-opacity hover:text-foreground group-hover/pod:opacity-100"
                  >
                    <PlusIcon className="size-3.5" />
                  </button>
                )}
              </div>

              {!closed && (
                <div className="mt-0.5">
                  {podDocs.length === 0 && canEdit && (
                    <button
                      onClick={() => onNewDoc(pod.id)}
                      className="flex w-full items-center gap-1.5 rounded-md py-1 pl-6 text-left text-3xs text-subtle hover:text-foreground"
                    >
                      <PlusIcon className="size-3" /> Add doc
                    </button>
                  )}
                  {podDocs.length === 0 && !canEdit && (
                    <p className="py-1 pl-6 text-3xs text-subtle/60">No docs</p>
                  )}
                  {podDocs.map((doc) => {
                    const active = doc.id === activeDocId;
                    return (
                      <button
                        key={doc.id}
                        draggable={canEdit && !!onMoveDoc}
                        onDragStart={() => setDraggedDocId(doc.id)}
                        onDragEnd={() => {
                          setDraggedDocId(null);
                          setDragOverPod(null);
                        }}
                        onClick={() => onSelectDoc(doc.id)}
                        className={`flex w-full items-center gap-2 rounded-md py-1 pl-6 pr-2 text-left text-[13px] transition-colors ${
                          draggedDocId === doc.id ? "opacity-40" : ""
                        } ${
                          active ? "bg-surface-raised font-medium text-foreground" : "text-muted hover:bg-surface-hover hover:text-foreground"
                        } ${canEdit && onMoveDoc ? "cursor-grab active:cursor-grabbing" : ""}`}
                      >
                        <span
                          className={`size-1.5 shrink-0 rounded-full ${doc.type === "retainer" ? "bg-status-ontrack" : "bg-subtle"}`}
                          title={doc.type === "retainer" ? "Retainer" : "One-time project"}
                        />
                        <span className="min-w-0 flex-1 truncate">{doc.title}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Add pod */}
        {canEdit && (
        <div className="mt-1.5 px-1">
          {addingPod ? (
            <input
              ref={podInputRef}
              value={podDraft}
              onChange={(e) => setPodDraft(e.target.value)}
              onBlur={commitPod}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitPod();
                if (e.key === "Escape") {
                  setPodDraft("");
                  setAddingPod(false);
                }
              }}
              placeholder={`Pod ${pods.length + 1}`}
              className="w-full rounded-md bg-surface-raised px-2 py-1 text-xs text-foreground placeholder:text-subtle focus:outline-none focus:ring-1 focus:ring-ring/50"
            />
          ) : (
            <button
              onClick={() => setAddingPod(true)}
              className="flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-xs text-subtle transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              <PlusIcon className="size-3.5" /> New pod
            </button>
          )}
        </div>
        )}

        {/* Templates (admin/cro only): the editable docs new clients clone from. */}
        {canEdit && templates.length > 0 && (
          <div className="mt-4">
            <div className="px-2.5 pb-1 font-mono text-4xs font-medium uppercase tracking-widest text-subtle">
              Templates
            </div>
            {templates.map((t) => {
              const active = t.id === activeDocId;
              return (
                <button
                  key={t.id}
                  onClick={() => onSelectDoc(t.id)}
                  className={`flex w-full items-center gap-2 rounded-md py-1 pl-2.5 pr-2 text-left text-[13px] transition-colors ${
                    active ? "bg-surface-raised font-medium text-foreground" : "text-muted hover:bg-surface-hover hover:text-foreground"
                  }`}
                >
                  <span className="size-1.5 shrink-0 rounded-full bg-ring" />
                  <span className="min-w-0 flex-1 truncate">{t.type === "retainer" ? "Retainer" : "One-time project"}</span>
                </button>
              );
            })}
          </div>
        )}
      </nav>

      <div className="flex items-center gap-3 border-t border-border-faint px-4 py-2 text-3xs text-subtle">
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-status-ontrack" /> Retainer
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-subtle" /> Project
        </span>
      </div>
    </aside>
  );
}
