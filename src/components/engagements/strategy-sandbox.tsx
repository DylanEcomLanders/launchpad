"use client";

/* Per-client strategy sandbox.
 *
 * Lives on the engagement page between BriefIntakePanel and the
 * cycle/project sections. The strategist's localised space for one
 * client.
 *
 * Two things:
 *   1. Resources - paste Google Doc / Loom / link URLs, or upload
 *      files. Uploaded files get a "Generate branded version" button.
 *   2. Notes - dated entries (Cmd+Enter to save), append-only-ish with
 *      delete per entry.
 *
 * Reads + writes go through src/lib/strategy/data.ts (Supabase). No
 * localStorage. Multi-device safe: additive only + explicit delete.
 *
 * File uploads route through POST /api/strategy-resources/upload, the
 * returned storage path is persisted on the resource row.
 */

import { useEffect, useRef, useState } from "react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentTextIcon,
  EllipsisHorizontalIcon,
  LinkIcon,
  PaperClipIcon,
  PlayCircleIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import {
  createNote,
  createResource,
  listNotesForClient,
  listResourcesForClient,
  removeNote,
  removeResource,
  signedUrlForResource,
} from "@/lib/strategy/data";
import type {
  ResourceKind,
  StrategyNote,
  StrategyResource,
} from "@/lib/strategy/types";

function detectKind(url: string): ResourceKind {
  const u = url.toLowerCase();
  if (u.includes("docs.google.com")) return "doc";
  if (u.includes("loom.com")) return "loom";
  return "link";
}

function inferTitleFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, "");
    const last = path.split("/").filter(Boolean).pop();
    return `${u.hostname}${last ? ` · ${last}` : ""}`;
  } catch {
    return url;
  }
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

const RESOURCE_TONE: Record<ResourceKind, string> = {
  doc: "border-blue-200 bg-blue-50 text-blue-700",
  loom: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
  link: "border-emerald-200 bg-emerald-50 text-emerald-700",
  file: "border-[#E5E5EA] bg-[#F3F3F5] text-[#4A4A4A]",
};

const RESOURCE_ICON: Record<ResourceKind, React.ReactNode> = {
  doc: <DocumentTextIcon className="h-4 w-4" />,
  loom: <PlayCircleIcon className="h-4 w-4" />,
  link: <LinkIcon className="h-4 w-4" />,
  file: <PaperClipIcon className="h-4 w-4" />,
};

export function StrategySandbox({
  clientId,
  clientName,
}: {
  clientId: string;
  clientName: string;
}) {
  const [open, setOpen] = useState(true);
  const [resources, setResources] = useState<StrategyResource[]>([]);
  const [notes, setNotes] = useState<StrategyNote[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [savedLabel, setSavedLabel] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hydrate from Supabase on mount + on client change.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [r, n] = await Promise.all([
        listResourcesForClient(clientId),
        listNotesForClient(clientId),
      ]);
      if (!cancelled) {
        setResources(r);
        setNotes(n);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const flashSaved = () => {
    setSavedLabel("Saved");
    window.setTimeout(() => setSavedLabel(null), 1500);
  };

  const addUrl = async () => {
    const url = urlInput.trim();
    if (!url) return;
    const kind = detectKind(url);
    const created = await createResource({
      client_id: clientId,
      title: inferTitleFromUrl(url),
      kind,
      url,
    });
    if (created) {
      setResources((rs) => [created, ...rs]);
      setUrlInput("");
      flashSaved();
    }
  };

  const onFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("client_id", clientId);
      const res = await fetch("/api/strategy-resources/upload", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok || !json.file_path) {
        alert(json.error || "Upload failed");
        return;
      }
      const created = await createResource({
        client_id: clientId,
        title: file.name,
        kind: "file",
        file_path: json.file_path,
        brandable: true,
      });
      if (created) {
        setResources((rs) => [created, ...rs]);
        flashSaved();
      }
    } finally {
      setUploading(false);
    }
  };

  const onRemoveResource = async (id: string) => {
    const ok = await removeResource(id);
    if (ok) {
      setResources((rs) => rs.filter((r) => r.id !== id));
    }
  };

  const onAddNote = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;
    const created = await createNote({ client_id: clientId, content: trimmed });
    if (created) {
      setNotes((ns) => [created, ...ns]);
      flashSaved();
    }
  };

  const onRemoveNote = async (id: string) => {
    const ok = await removeNote(id);
    if (ok) setNotes((ns) => ns.filter((n) => n.id !== id));
  };

  return (
    <section className="mb-5 rounded-lg border border-[#E5E5EA] bg-white">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-baseline justify-between px-4 py-3 text-left hover:bg-[#FAFAFB]"
      >
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-700">
            Strategy
          </span>
          <span className="text-[13px] font-semibold text-[#1B1B1B]">Sandbox</span>
          <span className="text-[10px] text-[#A0A0A0]">
            · {resources.length} resource{resources.length === 1 ? "" : "s"} for {clientName}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {savedLabel && (
            <span className="text-[10px] text-emerald-700">{savedLabel}</span>
          )}
          {open ? (
            <ChevronUpIcon className="h-4 w-4 text-[#A0A0A0]" />
          ) : (
            <ChevronDownIcon className="h-4 w-4 text-[#A0A0A0]" />
          )}
        </div>
      </button>

      {open && (
        <div className="grid gap-4 border-t border-[#F0F0F0] p-4 md:grid-cols-5">
          {/* Resources */}
          <div className="md:col-span-3">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#999]">
                Resources
              </span>
              <span className="text-[10px] tabular-nums text-[#A0A0A0]">
                {resources.length}
              </span>
            </div>

            {/* Add row */}
            <div className="mb-3 flex items-center gap-2 rounded-md border border-dashed border-[#C5C5C5] bg-[#FAFAFB] px-2.5 py-2">
              <LinkIcon className="h-3.5 w-3.5 text-[#7A7A7A] shrink-0" />
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addUrl();
                }}
                placeholder="Paste a Google Doc, Loom, or any link"
                className="flex-1 bg-transparent text-[12px] text-[#1B1B1B] placeholder-[#A0A0A0] focus:outline-none"
              />
              <button
                onClick={addUrl}
                disabled={!urlInput.trim()}
                className="inline-flex items-center gap-1 rounded-md bg-[#1B1B1B] px-2 py-1 text-[11px] font-medium text-white hover:bg-black disabled:bg-[#D5D5D8]"
              >
                <PlusIcon className="h-3 w-3" />
                Add
              </button>
              <span className="text-[10px] text-[#A0A0A0]">or</span>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-1 rounded-md border border-[#E5E5EA] bg-white px-2 py-1 text-[11px] font-medium text-[#1B1B1B] hover:border-[#1B1B1B] disabled:opacity-50"
              >
                <PaperClipIcon className="h-3 w-3" />
                {uploading ? "Uploading…" : "Upload"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={onFileChosen}
              />
            </div>

            {/* List */}
            {resources.length === 0 ? (
              <div className="rounded-md border border-dashed border-[#E5E5EA] bg-white px-3 py-4 text-center text-[11px] italic text-[#A0A0A0]">
                Nothing here yet. Drop a brief, paste a Loom, link a Google Doc.
              </div>
            ) : (
              <div className="space-y-1.5">
                {resources.map((r) => (
                  <ResourceRowView
                    key={r.id}
                    r={r}
                    onRemove={() => onRemoveResource(r.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="md:col-span-2">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#999]">
                Notes
              </span>
              <span className="text-[10px] tabular-nums text-[#A0A0A0]">
                {notes.length}
              </span>
            </div>
            <NotesEntries
              entries={notes}
              clientName={clientName}
              onAdd={onAddNote}
              onRemove={onRemoveNote}
            />
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Notes entries ───────────────────────────────────────────────────

function formatEntryDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();
  const time = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (sameDay) return `Today · ${time}`;
  if (isYesterday) return `Yesterday · ${time}`;
  const date = d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
  return `${date} · ${time}`;
}

function NotesEntries({
  entries,
  clientName,
  onAdd,
  onRemove,
}: {
  entries: StrategyNote[];
  clientName: string;
  onAdd: (content: string) => void;
  onRemove: (id: string) => void;
}) {
  const [draft, setDraft] = useState("");

  const submit = () => {
    if (!draft.trim()) return;
    onAdd(draft);
    setDraft("");
  };

  return (
    <div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={`New note for ${clientName}. Cmd+Enter to save.`}
        className="h-[78px] w-full resize-none rounded-md border border-[#E5E5EA] bg-[#FAFAFB] px-3 py-2 text-[12px] leading-relaxed text-[#1B1B1B] focus:border-[#1B1B1B] focus:outline-none"
      />
      <div className="mt-1 flex items-center justify-between">
        <span className="text-[10px] text-[#A0A0A0]">Cmd+Enter to save</span>
        <button
          onClick={submit}
          disabled={!draft.trim()}
          className="inline-flex items-center gap-1 rounded-md bg-[#1B1B1B] px-2.5 py-1 text-[11px] font-medium text-white hover:bg-black disabled:bg-[#D5D5D8]"
        >
          <PlusIcon className="h-3 w-3" />
          Add note
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="mt-3 rounded-md border border-dashed border-[#E5E5EA] bg-white px-3 py-3 text-center text-[11px] italic text-[#A0A0A0]">
          No notes yet.
        </div>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {entries.map((e) => (
            <li
              key={e.id}
              className="group rounded-md border border-[#EDEDEF] bg-white px-2.5 py-2"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0]">
                  {formatEntryDate(e.created_at)}
                </span>
                <button
                  onClick={() => onRemove(e.id)}
                  title="Delete"
                  className="rounded p-1 text-[#A0A0A0] opacity-0 transition-opacity hover:bg-[#F3F3F5] hover:text-rose-700 group-hover:opacity-100"
                >
                  <TrashIcon className="h-3 w-3" />
                </button>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed text-[#1B1B1B]">
                {e.content}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Resource row ────────────────────────────────────────────────────

function ResourceRowView({
  r,
  onRemove,
}: {
  r: StrategyResource;
  onRemove: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const openResource = async () => {
    if (r.url) {
      window.open(r.url, "_blank", "noopener");
      return;
    }
    if (r.file_path) {
      const signed = await signedUrlForResource(r.file_path);
      if (signed) window.open(signed, "_blank", "noopener");
    }
  };

  return (
    <div className="group flex items-center gap-2.5 rounded-md border border-[#EDEDEF] bg-white px-2.5 py-2">
      <div
        className={`grid h-7 w-7 shrink-0 place-items-center rounded border ${RESOURCE_TONE[r.kind]}`}
      >
        {RESOURCE_ICON[r.kind]}
      </div>
      <div className="min-w-0 flex-1">
        <button
          onClick={openResource}
          className="block w-full truncate text-left text-[12px] font-medium text-[#1B1B1B] hover:text-violet-700 hover:underline"
        >
          {r.title}
        </button>
        <div className="text-[10px] text-[#A0A0A0]">
          {r.kind === "doc"
            ? "Google Doc"
            : r.kind === "loom"
              ? "Loom"
              : r.kind === "link"
                ? "Link"
                : "File"}
          {" · "}
          {formatRelative(r.added_at)}
          {r.added_by ? ` · by ${r.added_by}` : ""}
        </div>
      </div>
      {r.brandable && (
        <button
          onClick={() => alert("Branded version would generate here. v1 plan: serve a branded HTML wrapper at /share/strategy/{token}.")}
          className="inline-flex items-center gap-1 rounded-md border border-[#E5E5EA] bg-white px-2 py-1 text-[10px] font-medium text-[#1B1B1B] hover:border-[#1B1B1B]"
        >
          <SparklesIcon className="h-3 w-3" />
          Generate branded version
        </button>
      )}
      <div ref={ref} className="relative">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className={`rounded p-1 text-[#A0A0A0] transition-opacity hover:bg-[#F3F3F5] hover:text-[#1B1B1B] ${menuOpen ? "opacity-100 bg-[#F3F3F5] text-[#1B1B1B]" : "opacity-0 group-hover:opacity-100"}`}
          title="Edit or remove"
        >
          <EllipsisHorizontalIcon className="h-4 w-4" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-7 z-10 min-w-[120px] overflow-hidden rounded-md border border-[#E5E5EA] bg-white shadow-lg">
            <button
              onClick={() => {
                onRemove();
                setMenuOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-rose-700 hover:bg-rose-50"
            >
              <TrashIcon className="h-3 w-3" />
              Remove
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
