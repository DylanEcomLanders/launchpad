"use client";

/* ── AttachmentsPanel ──
 *
 * Universal "attach an artefact" component. Drop into any record
 * (kanban card, lead, client, milestone) with a parent_type +
 * parent_id and it handles the rest:
 *   - lists attached artefacts (live link to the source)
 *   - "+ Attach" opens a picker (every artefact, searchable)
 *   - external URL option for things outside Launchpad
 *
 * No file copying. Attachments are pointers; clicking opens the
 * source artefact in its home tool.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowTopRightOnSquareIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  PaperClipIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  attachmentsStore,
  emptyAttachment,
  nowISO,
  uid,
} from "./data";
import { artefactLabel, loadAllArtefacts, type ArtefactRow } from "./registry";
import type {
  Attachment,
  AttachmentParentType,
  AttachmentTargetType,
} from "./types";
import { inputClass } from "@/lib/form-styles";

const TYPE_TINT: Record<AttachmentTargetType, string> = {
  audit: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30",
  proposal: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30",
  report: "bg-sky-500/15 text-sky-200 ring-1 ring-sky-500/30",
  brief: "bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-500/30",
  roadmap: "bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-500/30",
  ab_test: "bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-500/30",
  test_win: "bg-emerald-500/25 text-emerald-100 ring-1 ring-emerald-500/40",
  case_study: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30",
  external: "bg-[#222222] text-[#9CA3AF] ring-1 ring-white/[0.08]",
};

const TYPE_LABEL_SHORT: Record<AttachmentTargetType, string> = {
  audit: "Audit",
  proposal: "Proposal",
  report: "Report",
  brief: "Brief",
  roadmap: "Roadmap",
  ab_test: "Test",
  test_win: "Win",
  case_study: "Case study",
  external: "Link",
};

interface Resolved extends Attachment {
  resolved?: ArtefactRow | null;
}

export function AttachmentsPanel({
  parentType,
  parentId,
  attachedBy,
  className,
}: {
  parentType: AttachmentParentType;
  parentId: string;
  /* Name to stamp on new attachments. */
  attachedBy?: string;
  className?: string;
}) {
  const [rows, setRows] = useState<Resolved[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  /* Load attachments + look each up in the artefact registry. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all = await attachmentsStore.getAll();
      const mine = all.filter((a) => a.parent_type === parentType && a.parent_id === parentId);
      if (cancelled) return;
      const allArtefacts = await loadAllArtefacts();
      const byKey = new Map<string, ArtefactRow>();
      allArtefacts.forEach((a) => byKey.set(`${a.type}:${a.id}`, a));
      const resolved: Resolved[] = mine
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map((a) => ({
          ...a,
          resolved: a.target_id ? byKey.get(`${a.target_type}:${a.target_id}`) ?? null : null,
        }));
      if (cancelled) return;
      setRows(resolved);
      setHydrated(true);
    })();
    return () => { cancelled = true; };
  }, [parentType, parentId]);

  async function attachInternal(item: ArtefactRow) {
    const a = emptyAttachment(parentType, parentId, item.type, item.title);
    a.target_id = item.id;
    a.attached_by = attachedBy || "";
    setRows((prev) => [{ ...a, resolved: item }, ...prev]);
    await attachmentsStore.create(a);
    setPickerOpen(false);
  }

  async function attachExternal(url: string, title: string) {
    const a = emptyAttachment(parentType, parentId, "external", title || url);
    a.external_url = url;
    a.attached_by = attachedBy || "";
    setRows((prev) => [{ ...a, resolved: null }, ...prev]);
    await attachmentsStore.create(a);
    setPickerOpen(false);
  }

  async function removeAttachment(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
    await attachmentsStore.remove(id);
  }

  async function updateNote(id: string, note: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, note, updated_at: nowISO() } : r)));
    await attachmentsStore.update(id, { note, updated_at: nowISO() });
  }

  return (
    <div className={`${className ?? ""}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-[#71757D] font-semibold">
          <PaperClipIcon className="size-3.5" />
          Attachments ({rows.length})
        </div>
        <button
          onClick={() => setPickerOpen(true)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wider bg-[#1A1A1A] text-[#9CA3AF] hover:text-[#E5E5EA] hover:bg-[#222222]"
        >
          <PlusIcon className="size-3" />
          Attach
        </button>
      </div>

      {!hydrated ? (
        <div className="space-y-1.5">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-10 bg-[#0C0C0C] rounded-md animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        <p className="text-[11px] italic text-[#71757D]">No attachments yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r) => (
            <AttachmentRow key={r.id} attachment={r} onRemove={() => removeAttachment(r.id)} onNoteChange={(note) => updateNote(r.id, note)} />
          ))}
        </ul>
      )}

      {pickerOpen && (
        <AttachmentPicker
          onClose={() => setPickerOpen(false)}
          onPickInternal={attachInternal}
          onPickExternal={attachExternal}
        />
      )}
    </div>
  );
}

function AttachmentRow({
  attachment,
  onRemove,
  onNoteChange,
}: {
  attachment: Resolved;
  onRemove: () => void;
  onNoteChange: (note: string) => void;
}) {
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(attachment.note ?? "");

  const href = attachment.resolved?.href ?? attachment.external_url ?? "#";
  const title = attachment.resolved?.title ?? attachment.target_title;
  const subtitle = attachment.resolved?.subtitle;

  return (
    <li className="bg-black/30 rounded-md p-2 ring-1 ring-white/[0.04] group">
      <div className="flex items-center gap-2">
        <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold shrink-0 ${TYPE_TINT[attachment.target_type]}`}>
          {TYPE_LABEL_SHORT[attachment.target_type]}
        </span>
        {attachment.target_type === "external" ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0 text-[12px] text-[#E5E5EA] hover:text-emerald-300 truncate inline-flex items-center gap-1">
            <LinkIcon className="size-3 text-[#71757D] shrink-0" />
            {title}
          </a>
        ) : (
          <Link href={href} className="flex-1 min-w-0 text-[12px] text-[#E5E5EA] hover:text-emerald-300 truncate">
            {title}
          </Link>
        )}
        {subtitle && <span className="hidden md:inline text-[11px] text-[#71757D] truncate max-w-[150px]">{subtitle}</span>}
        <a
          href={href}
          target={attachment.target_type === "external" ? "_blank" : undefined}
          rel={attachment.target_type === "external" ? "noopener noreferrer" : undefined}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-[#71757D] hover:text-[#E5E5EA] shrink-0"
          title="Open"
        >
          <ArrowTopRightOnSquareIcon className="size-3.5" />
        </a>
        <button
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-[#71757D] hover:text-rose-400 shrink-0"
          title="Remove attachment"
        >
          <TrashIcon className="size-3.5" />
        </button>
      </div>
      {editingNote ? (
        <div className="mt-1.5 flex gap-1.5">
          <input
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="Note (optional)"
            className={`${inputClass} h-7 text-[11px]`}
            autoFocus
            onBlur={() => {
              onNoteChange(noteDraft);
              setEditingNote(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onNoteChange(noteDraft);
                setEditingNote(false);
              }
              if (e.key === "Escape") {
                setNoteDraft(attachment.note ?? "");
                setEditingNote(false);
              }
            }}
          />
        </div>
      ) : attachment.note ? (
        <button onClick={() => setEditingNote(true)} className="block w-full text-left mt-1 text-[11px] text-[#9CA3AF] hover:text-[#E5E5EA]">
          {attachment.note}
        </button>
      ) : (
        <button onClick={() => setEditingNote(true)} className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] italic text-[#71757D] hover:text-[#9CA3AF] mt-1">
          + add note
        </button>
      )}
    </li>
  );
}

function AttachmentPicker({
  onClose,
  onPickInternal,
  onPickExternal,
}: {
  onClose: () => void;
  onPickInternal: (item: ArtefactRow) => void;
  onPickExternal: (url: string, title: string) => void;
}) {
  const [artefacts, setArtefacts] = useState<ArtefactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<AttachmentTargetType | "all">("all");
  const [extMode, setExtMode] = useState(false);
  const [extUrl, setExtUrl] = useState("");
  const [extTitle, setExtTitle] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all = await loadAllArtefacts();
      if (cancelled) return;
      setArtefacts(all);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return artefacts.filter((a) => {
      if (typeFilter !== "all" && a.type !== typeFilter) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        (a.subtitle ?? "").toLowerCase().includes(q)
      );
    });
  }, [artefacts, search, typeFilter]);

  const allTypes: AttachmentTargetType[] = ["audit", "proposal", "report", "brief", "roadmap", "ab_test", "test_win"];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-[#0F0F10] rounded-2xl ring-1 ring-white/[0.08] w-full max-w-2xl mt-16 max-h-[80vh] flex flex-col overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between p-4 border-b border-white/[0.04]">
          <div className="text-sm font-semibold text-[#E5E5EA]">Attach artefact</div>
          <button onClick={onClose} className="text-[#71757D] hover:text-[#E5E5EA]"><XMarkIcon className="size-5" /></button>
        </div>

        {/* Mode toggle */}
        <div className="px-4 pt-3 flex items-center gap-1.5">
          <button onClick={() => setExtMode(false)} className={`px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider ${!extMode ? "bg-white text-[#0C0C0C]" : "bg-[#1A1A1A] text-[#9CA3AF] hover:bg-[#222222]"}`}>Launchpad artefact</button>
          <button onClick={() => setExtMode(true)} className={`px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider ${extMode ? "bg-white text-[#0C0C0C]" : "bg-[#1A1A1A] text-[#9CA3AF] hover:bg-[#222222]"}`}>External link</button>
        </div>

        {extMode ? (
          <div className="p-4 space-y-3">
            <p className="text-[12px] text-[#9CA3AF]">For URLs outside Launchpad (Figma, Notion, Google Docs, anything).</p>
            <input
              value={extUrl}
              onChange={(e) => setExtUrl(e.target.value)}
              placeholder="https://..."
              className={inputClass}
              autoFocus
            />
            <input
              value={extTitle}
              onChange={(e) => setExtTitle(e.target.value)}
              placeholder="Title (optional - URL used as fallback)"
              className={inputClass}
            />
            <div className="flex justify-end">
              <button
                onClick={() => {
                  const u = extUrl.trim();
                  if (!u) return;
                  onPickExternal(u, extTitle.trim());
                }}
                disabled={!extUrl.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-white text-[#0C0C0C] hover:bg-[#E5E5EA] disabled:opacity-40"
              >
                Attach link
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 space-y-3 border-b border-white/[0.04]">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#71757D]" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search every artefact…" className="w-full pl-9 pr-3 py-2 rounded-md bg-black/40 ring-1 ring-white/[0.06] text-[13px] text-[#E5E5EA] placeholder:text-[#71757D] focus:outline-none focus:ring-emerald-500/40" autoFocus />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button onClick={() => setTypeFilter("all")} className={`px-2.5 py-1 rounded text-[10px] uppercase tracking-wider ${typeFilter === "all" ? "bg-white text-[#0C0C0C]" : "bg-[#1A1A1A] text-[#9CA3AF] hover:bg-[#222222]"}`}>All</button>
                {allTypes.map((t) => (
                  <button key={t} onClick={() => setTypeFilter(t)} className={`px-2.5 py-1 rounded text-[10px] uppercase tracking-wider ${typeFilter === t ? "bg-white text-[#0C0C0C]" : "bg-[#1A1A1A] text-[#9CA3AF] hover:bg-[#222222]"}`}>{artefactLabel(t)}</button>
                ))}
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-2">
              {loading ? (
                <div className="space-y-1.5 p-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 bg-[#0C0C0C] rounded-md animate-pulse" />)}</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-[12px] text-[#71757D]">No artefacts match.</div>
              ) : (
                <ul>
                  {filtered.map((a) => (
                    <li key={`${a.type}:${a.id}`}>
                      <button onClick={() => onPickInternal(a)} className="w-full text-left flex items-center gap-3 p-3 rounded-md hover:bg-white/[0.04] transition-colors">
                        <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold shrink-0 ${TYPE_TINT[a.type]}`}>{TYPE_LABEL_SHORT[a.type]}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] text-[#E5E5EA] truncate">{a.title}</div>
                          {a.subtitle && <div className="text-[11px] text-[#71757D] truncate">{a.subtitle}</div>}
                        </div>
                        <span className="text-[10px] text-[#71757D] shrink-0">{new Date(a.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* Hide attachments-panel chrome in print mode - external outputs don't
 * need the internal attachment UI. Inline import so callers don't have
 * to wire CSS. */
declare global { interface Window { __attachmentsPrintCss?: boolean } }
if (typeof window !== "undefined" && !window.__attachmentsPrintCss) {
  const style = document.createElement("style");
  style.textContent = "@media print { .attachments-panel { display: none !important; } }";
  document.head.appendChild(style);
  window.__attachmentsPrintCss = true;
}
