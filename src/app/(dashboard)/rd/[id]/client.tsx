"use client";

/* ── R&D Tracker — initiative detail ──
 * /rd/[id]. Editable header (name + status + type + owner), north-star
 * single-liner, sortable + editable sub-point list, meta footer with a
 * link back to the originating idea if this initiative was promoted.
 *
 * Drag reorder is plain HTML5 DnD — no library. Position is rewritten
 * across affected siblings so the persisted order matches the visible
 * order. Local state mutates first, store sync happens in the
 * background so the UI feels instant.
 */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeftIcon,
  TrashIcon,
  ChevronRightIcon,
  Bars3Icon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import {
  initiativeStore,
  subpointStore,
  ideaStore,
  uid,
  nowISO,
  progressPct,
  lastTouchedISO,
  timeAgo,
  sortSubpoints,
  nextPosition,
} from "@/lib/rd/data";
import type {
  Initiative,
  InitiativeStatus,
  Subpoint,
  Idea,
  RdType,
} from "@/lib/rd/types";
import { INITIATIVE_STATUSES, RD_TYPE_META } from "@/lib/rd/types";
import { TypeBadge, ProgressBar, InitiativeStatusPill } from "../components";
import { inputClass, textareaClass } from "@/lib/form-styles";

export default function InitiativeDetailClient({ id }: { id: string }) {
  const [initiative, setInitiative] = useState<Initiative | null>(null);
  const [subpoints, setSubpoints] = useState<Subpoint[]>([]);
  const [sourceIdea, setSourceIdea] = useState<Idea | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // ── Hydrate ─────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    Promise.all([initiativeStore.getById(id), subpointStore.getAll()]).then(
      async ([i, allSubs]) => {
        if (!alive) return;
        if (!i) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setInitiative(i);
        setSubpoints(sortSubpoints(allSubs.filter((s) => s.initiative_id === id)));
        if (i.promoted_from_idea_id) {
          const idea = await ideaStore.getById(i.promoted_from_idea_id);
          if (alive) setSourceIdea(idea);
        }
        setLoading(false);
      },
    );
    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 md:px-10 py-16">
        <div className="text-[13px] text-[#71757D]">Loading initiative...</div>
      </div>
    );
  }
  if (notFound || !initiative) {
    return (
      <div className="max-w-3xl mx-auto px-6 md:px-10 py-16">
        <Link
          href="/rd"
          className="inline-flex items-center gap-1.5 text-[13px] text-[#71757D] hover:text-[#E5E5EA] transition-colors mb-6"
        >
          <ArrowLeftIcon className="size-4" />
          Back to R&amp;D
        </Link>
        <div className="text-[15px] text-[#E5E5EA]">Initiative not found.</div>
      </div>
    );
  }

  // ── Mutations on initiative ─────────────────────────────────────
  async function patchInitiative(updates: Partial<Initiative>) {
    if (!initiative) return;
    const next = { ...initiative, ...updates, updated_at: nowISO() };
    setInitiative(next);
    await initiativeStore.update(initiative.id, {
      ...updates,
      updated_at: next.updated_at,
    });
  }

  // ── Mutations on sub-points ─────────────────────────────────────
  async function addSubpoint(title: string) {
    if (!title.trim() || !initiative) return;
    const now = nowISO();
    const sp: Subpoint = {
      id: uid(),
      initiative_id: initiative.id,
      title: title.trim(),
      notes: "",
      done: false,
      position: nextPosition(subpoints),
      created_at: now,
      updated_at: now,
    };
    setSubpoints((prev) => sortSubpoints([...prev, sp]));
    await subpointStore.create(sp);
    bumpInitiativeUpdated();
  }
  async function patchSubpoint(spId: string, updates: Partial<Subpoint>) {
    const now = nowISO();
    setSubpoints((prev) =>
      sortSubpoints(
        prev.map((s) =>
          s.id === spId ? { ...s, ...updates, updated_at: now } : s,
        ),
      ),
    );
    await subpointStore.update(spId, { ...updates, updated_at: now });
    bumpInitiativeUpdated();
  }
  async function deleteSubpoint(spId: string) {
    setSubpoints((prev) => prev.filter((s) => s.id !== spId));
    await subpointStore.remove(spId);
    bumpInitiativeUpdated();
  }
  /* Update the parent's updated_at after any child write so the
   * dashboard's "last touched" relative-time stays accurate. */
  async function bumpInitiativeUpdated() {
    if (!initiative) return;
    const now = nowISO();
    setInitiative((prev) => (prev ? { ...prev, updated_at: now } : prev));
    await initiativeStore.update(initiative.id, { updated_at: now });
  }

  // ── Drag reorder ────────────────────────────────────────────────
  async function reorder(fromId: string, toId: string) {
    if (fromId === toId) return;
    const list = [...subpoints];
    const fromIdx = list.findIndex((s) => s.id === fromId);
    const toIdx = list.findIndex((s) => s.id === toId);
    if (fromIdx < 0 || toIdx < 0) return;
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);
    const now = nowISO();
    const repositioned = list.map((s, idx) => ({
      ...s,
      position: idx,
      updated_at: now,
    }));
    setSubpoints(repositioned);
    // Persist each row that moved. We could diff first, but the list
    // is small and update() is cheap.
    for (const s of repositioned) {
      await subpointStore.update(s.id, { position: s.position, updated_at: now });
    }
    bumpInitiativeUpdated();
  }

  const pct = progressPct(subpoints);
  const done = subpoints.filter((s) => s.done).length;
  const total = subpoints.length;
  const last = lastTouchedISO(initiative, subpoints);

  return (
    <div className="max-w-3xl mx-auto px-6 md:px-10 py-10 pb-24">
      {/* Back */}
      <Link
        href="/rd"
        className="inline-flex items-center gap-1.5 text-[13px] text-[#71757D] hover:text-[#E5E5EA] transition-colors mb-6"
      >
        <ArrowLeftIcon className="size-4" />
        Back to R&amp;D
      </Link>

      {/* Header */}
      <div className="mb-6">
        <InlineText
          value={initiative.name}
          onChange={(v) => patchInitiative({ name: v })}
          className="text-3xl font-semibold text-[#E5E5EA]"
          placeholder="Untitled initiative"
        />
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <StatusDropdown
            value={initiative.status}
            onChange={(s) => patchInitiative({ status: s })}
          />
          <TypeDropdown
            value={initiative.type}
            onChange={(t) => patchInitiative({ type: t })}
          />
          <span className="text-[12px] text-[#71757D]">·</span>
          <InlineText
            value={initiative.owner}
            onChange={(v) => patchInitiative({ owner: v })}
            className="text-[12px] text-[#71757D] hover:text-[#E5E5EA]"
            placeholder="Owner"
            singleLine
          />
        </div>
      </div>

      {/* North Star */}
      <div className="mb-8">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#71757D] mb-2">
          North star
        </div>
        <InlineText
          value={initiative.north_star || ""}
          onChange={(v) => patchInitiative({ north_star: v })}
          className="text-[14px] text-[#E5E5EA] leading-relaxed"
          placeholder="What does done look like?"
        />
      </div>

      {/* Sub-points */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#71757D]">
            Sub-points
          </div>
          <div className="text-[12px] text-[#71757D] tabular-nums">
            {done}/{total} · {pct}%
          </div>
        </div>
        <ProgressBar pct={pct} />
        <div className="mt-4 space-y-1">
          {subpoints.map((sp) => (
            <SubpointRow
              key={sp.id}
              subpoint={sp}
              onPatch={(updates) => patchSubpoint(sp.id, updates)}
              onDelete={() => deleteSubpoint(sp.id)}
              onReorderTo={(targetId) => reorder(sp.id, targetId)}
            />
          ))}
          <AddSubpointRow onAdd={addSubpoint} />
        </div>
      </div>

      {/* Meta */}
      <div className="mt-12 pt-6 border-t border-[#2A2A2A] text-[12px] text-[#71757D] space-y-1">
        <div>Created {timeAgo(initiative.created_at)}</div>
        <div>Last touched {timeAgo(last)}</div>
        {sourceIdea && (
          <div>
            Promoted from idea:{" "}
            <Link
              href={`/rd/ideas/${sourceIdea.id}`}
              className="text-[#E5E5EA] hover:underline"
            >
              {sourceIdea.title}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Inline editable text ────────────────────────────────────── */

function InlineText({
  value,
  onChange,
  className,
  placeholder,
  singleLine,
}: {
  value: string;
  onChange: (next: string) => void;
  className?: string;
  placeholder?: string;
  singleLine?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (editing) setTimeout(() => inputRef.current?.focus(), 0);
  }, [editing]);

  function commit() {
    setEditing(false);
    if (draft !== value) onChange(draft);
  }
  function cancel() {
    setDraft(value);
    setEditing(false);
  }
  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={`block w-full text-left rounded transition-colors hover:bg-[#0C0C0C] -mx-1 px-1 ${className || ""}`}
      >
        {value || (
          <span className="text-[#C5C5C5]">{placeholder || "Click to edit"}</span>
        )}
      </button>
    );
  }
  if (singleLine) {
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        className={`block w-full bg-[#181818] border border-[#2A2A2A] rounded px-1 -mx-1 focus:outline-none focus:border-white ${className || ""}`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            cancel();
          }
        }}
      />
    );
  }
  return (
    <textarea
      ref={inputRef as React.RefObject<HTMLTextAreaElement>}
      className={`block w-full bg-[#181818] border border-[#2A2A2A] rounded px-1 -mx-1 resize-none focus:outline-none focus:border-white ${className || ""}`}
      rows={2}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape") {
          cancel();
        }
      }}
    />
  );
}

/* ─── Status + type dropdowns ─────────────────────────────────── */

function StatusDropdown({
  value,
  onChange,
}: {
  value: InitiativeStatus;
  onChange: (s: InitiativeStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="hover:opacity-80 transition-opacity"
      >
        <InitiativeStatusPill status={value} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-[#181818] border border-[#2A2A2A] rounded-lg shadow-lg z-10 min-w-[140px] py-1">
          {INITIATIVE_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => {
                onChange(s);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-[#0C0C0C] transition-colors ${
                s === value ? "text-[#E5E5EA] font-medium" : "text-[#C7C9CD]"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TypeDropdown({
  value,
  onChange,
}: {
  value: RdType;
  onChange: (t: RdType) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);
  const types = Object.keys(RD_TYPE_META) as RdType[];
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="hover:opacity-80 transition-opacity"
      >
        <TypeBadge type={value} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-[#181818] border border-[#2A2A2A] rounded-lg shadow-lg z-10 min-w-[140px] py-1">
          {types.map((t) => (
            <button
              key={t}
              onClick={() => {
                onChange(t);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-[#0C0C0C] transition-colors ${
                t === value ? "text-[#E5E5EA] font-medium" : "text-[#C7C9CD]"
              }`}
            >
              {RD_TYPE_META[t].label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Sub-point row ───────────────────────────────────────────── */

function SubpointRow({
  subpoint,
  onPatch,
  onDelete,
  onReorderTo,
}: {
  subpoint: Subpoint;
  onPatch: (updates: Partial<Subpoint>) => void;
  onDelete: () => void;
  onReorderTo: (targetId: string) => void;
}) {
  const [notesOpen, setNotesOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(subpoint.title);
  const [draftNotes, setDraftNotes] = useState(subpoint.notes || "");
  const [dragOver, setDragOver] = useState(false);
  useEffect(() => setDraftTitle(subpoint.title), [subpoint.title]);
  useEffect(() => setDraftNotes(subpoint.notes || ""), [subpoint.notes]);

  function commitTitle() {
    setEditingTitle(false);
    if (draftTitle !== subpoint.title) onPatch({ title: draftTitle });
  }
  function commitNotes() {
    if (draftNotes !== (subpoint.notes || "")) onPatch({ notes: draftNotes });
  }
  function handleDelete() {
    if (confirm(`Delete sub-point "${subpoint.title}"?`)) onDelete();
  }

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", subpoint.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const fromId = e.dataTransfer.getData("text/plain");
        if (fromId && fromId !== subpoint.id) onReorderTo(subpoint.id);
      }}
      className={`group rounded-lg border transition-colors ${dragOver ? "border-white bg-[#0C0C0C]" : "border-transparent hover:bg-[#0C0C0C]"}`}
    >
      <div className="flex items-center gap-2 px-2 py-1.5">
        <span
          className="cursor-grab active:cursor-grabbing text-[#C5C5C5] hover:text-[#71757D] p-1"
          aria-label="Drag to reorder"
        >
          <Bars3Icon className="size-3.5" />
        </span>
        <button
          onClick={() => onPatch({ done: !subpoint.done })}
          className={`size-4 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${
            subpoint.done
              ? "bg-[#E5E5EA] border-[#181818]"
              : "border-[#C5C5C5] hover:border-white"
          }`}
          aria-label={subpoint.done ? "Mark not done" : "Mark done"}
        >
          {subpoint.done && (
            <svg
              className="size-2.5 text-white"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="2 6.5 5 9.5 10 3" />
            </svg>
          )}
        </button>
        {editingTitle ? (
          <input
            autoFocus
            className="flex-1 bg-[#181818] border border-[#2A2A2A] rounded px-2 py-0.5 text-[13px] focus:outline-none focus:border-white"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitTitle();
              } else if (e.key === "Escape") {
                setDraftTitle(subpoint.title);
                setEditingTitle(false);
              }
            }}
          />
        ) : (
          <button
            onClick={() => setEditingTitle(true)}
            className={`flex-1 text-left text-[13px] px-1 ${
              subpoint.done ? "line-through text-[#71757D]" : "text-[#E5E5EA]"
            }`}
          >
            {subpoint.title}
          </button>
        )}
        <button
          onClick={() => setNotesOpen((v) => !v)}
          className="p-1 text-[#C5C5C5] hover:text-[#E5E5EA] opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Toggle notes"
        >
          <ChevronRightIcon
            className={`size-3.5 transition-transform ${notesOpen ? "rotate-90" : ""}`}
          />
        </button>
        <button
          onClick={handleDelete}
          className="p-1 text-[#C5C5C5] hover:text-[#B22B2B] opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Delete sub-point"
        >
          <TrashIcon className="size-3.5" />
        </button>
      </div>
      {notesOpen && (
        <div className="px-9 pb-2">
          <textarea
            className={`${textareaClass} text-[12px]`}
            rows={2}
            value={draftNotes}
            onChange={(e) => setDraftNotes(e.target.value)}
            onBlur={commitNotes}
            placeholder="Notes, links, context..."
          />
        </div>
      )}
    </div>
  );
}

/* ─── Add sub-point inline row ────────────────────────────────── */

function AddSubpointRow({ onAdd }: { onAdd: (title: string) => void }) {
  const [value, setValue] = useState("");
  function submit() {
    if (!value.trim()) return;
    onAdd(value);
    setValue("");
  }
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 mt-1 rounded-lg border border-dashed border-[#2A2A2A]">
      <PlusIcon className="size-3.5 text-[#C5C5C5]" />
      <input
        className={`${inputClass} border-0 shadow-none px-1 py-0.5 text-[13px]`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Add a sub-point and press Enter"
      />
    </div>
  );
}
