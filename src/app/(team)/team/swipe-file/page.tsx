"use client";

import { useState, useEffect, useMemo } from "react";
import { ArrowTopRightOnSquareIcon, TrashIcon, XMarkIcon, PlusIcon } from "@heroicons/react/24/outline";
import { DecorativeBlocks } from "@/components/decorative-blocks";
import { hostnameFromUrl, type SwipeEntry } from "@/lib/swipe-file";

export default function SwipeFilePage() {
  const [entries, setEntries] = useState<SwipeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [urlInput, setUrlInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState("");

  useEffect(() => {
    fetch("/api/swipe-file")
      .then((r) => r.json())
      .then((data) => setEntries(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  const allTags = useMemo(
    () => [...new Set(entries.flatMap((e) => e.tags))].sort((a, b) => a.localeCompare(b)),
    [entries],
  );

  const visible = tagFilter ? entries.filter((e) => e.tags.includes(tagFilter)) : entries;
  const openEntry = openId ? entries.find((e) => e.id === openId) ?? null : null;

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim() || submitting) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/swipe-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setEntries((prev) => [data, ...prev]);
      setUrlInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Capture failed");
    } finally {
      setSubmitting(false);
    }
  };

  const onUpdate = async (id: string, patch: Partial<Pick<SwipeEntry, "title" | "tags" | "notes">>) => {
    try {
      const res = await fetch(`/api/swipe-file/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = (await res.json()) as SwipeEntry;
      setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
    } catch {
      // best-effort; UI already optimistic-updated by callers when needed
    }
  };

  const onDelete = async (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setOpenId(null);
    try {
      await fetch(`/api/swipe-file/${id}`, { method: "DELETE" });
    } catch {
      /* swallow — entry already removed from view */
    }
  };

  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-12 py-12 md:py-20">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">Swipe File</h1>
          <p className="text-sm text-[#7A7A7A]">
            Drop a URL, we capture mobile + desktop. Reference library for great pages.
          </p>
        </div>

        {/* Add form */}
        <form
          onSubmit={onAdd}
          className="bg-white border border-[#E5E5EA] rounded-lg p-4 mb-8 flex flex-wrap items-center gap-3"
        >
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com/great-page"
            required
            disabled={submitting}
            className="flex-1 min-w-[260px] text-sm px-3 py-2 border border-[#E5E5EA] rounded-md focus:outline-none focus:border-[#999] disabled:bg-[#F7F7F8]"
          />
          <button
            type="submit"
            disabled={submitting || !urlInput.trim()}
            className="px-4 py-2 bg-[#1B1B1B] text-white text-xs font-medium rounded-md hover:bg-[#2D2D2D] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <PlusIcon className="size-3.5" />
            {submitting ? "Capturing…" : "Add to swipe file"}
          </button>
          {error && <p className="basis-full text-xs text-red-600 mt-1">{error}</p>}
        </form>

        {/* Tag filter */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            <button
              onClick={() => setTagFilter("")}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                !tagFilter
                  ? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
                  : "bg-white text-[#777] border-[#E5E5EA] hover:border-[#999]"
              }`}
            >
              All ({entries.length})
            </button>
            {allTags.map((t) => (
              <button
                key={t}
                onClick={() => setTagFilter(tagFilter === t ? "" : t)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                  tagFilter === t
                    ? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
                    : "bg-white text-[#777] border-[#E5E5EA] hover:border-[#999]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin size-6 border-2 border-[#E5E5EA] border-t-[#1A1A1A] rounded-full" />
          </div>
        ) : visible.length === 0 ? (
          <div className="bg-white border border-[#E5E5EA] rounded-lg py-14 text-center">
            <p className="text-sm text-[#777]">
              {entries.length === 0 ? "Empty swipe file. Drop your first URL above." : "No entries match this tag."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map((entry) => (
              <SwipeCard key={entry.id} entry={entry} onClick={() => setOpenId(entry.id)} />
            ))}
          </div>
        )}
      </div>

      {openEntry && (
        <SwipeDetail
          entry={openEntry}
          onClose={() => setOpenId(null)}
          onUpdate={(patch) => onUpdate(openEntry.id, patch)}
          onDelete={() => onDelete(openEntry.id)}
        />
      )}
    </div>
  );
}

function SwipeCard({ entry, onClick }: { entry: SwipeEntry; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group bg-white border border-[#E5E5EA] rounded-lg overflow-hidden hover:border-[#1B1B1B] hover:shadow-sm transition-all text-left flex flex-col"
    >
      <div className="aspect-[16/10] bg-[#F7F7F8] overflow-hidden">
        {entry.desktopUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={entry.desktopUrl}
            alt={entry.title || hostnameFromUrl(entry.url)}
            className="w-full h-full object-cover object-top group-hover:scale-[1.02] transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px] text-[#BBB] uppercase tracking-wider">No screenshot</div>
        )}
      </div>
      <div className="px-3.5 py-2.5">
        <p className="text-sm font-medium text-[#1A1A1A] truncate">{entry.title || hostnameFromUrl(entry.url)}</p>
        <p className="text-[10px] text-[#AAA] truncate mt-0.5">{hostnameFromUrl(entry.url)}</p>
        {entry.tags.length > 0 && (
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            {entry.tags.slice(0, 3).map((t) => (
              <span key={t} className="text-[9px] uppercase tracking-wider text-[#777] bg-[#F3F3F5] px-1.5 py-0.5 rounded-full">
                {t}
              </span>
            ))}
            {entry.tags.length > 3 && <span className="text-[9px] text-[#BBB]">+{entry.tags.length - 3}</span>}
          </div>
        )}
      </div>
    </button>
  );
}

function SwipeDetail({
  entry,
  onClose,
  onUpdate,
  onDelete,
}: {
  entry: SwipeEntry;
  onClose: () => void;
  onUpdate: (patch: Partial<Pick<SwipeEntry, "title" | "tags" | "notes">>) => void;
  onDelete: () => void;
}) {
  const [view, setView] = useState<"desktop" | "mobile">("desktop");
  const [title, setTitle] = useState(entry.title);
  const [notes, setNotes] = useState(entry.notes);
  const [tagsInput, setTagsInput] = useState(entry.tags.join(", "));
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Sync local state when entry changes (e.g. another modal close/open)
  useEffect(() => {
    setTitle(entry.title);
    setNotes(entry.notes);
    setTagsInput(entry.tags.join(", "));
  }, [entry]);

  // Esc to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const saveTitle = () => {
    if (title.trim() && title !== entry.title) onUpdate({ title: title.trim() });
  };
  const saveNotes = () => {
    if (notes !== entry.notes) onUpdate({ notes });
  };
  const saveTags = () => {
    const next = tagsInput
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    const same = next.length === entry.tags.length && next.every((t, i) => t === entry.tags[i]);
    if (!same) onUpdate({ tags: next });
  };

  const activeImage = view === "desktop" ? entry.desktopUrl : entry.mobileUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 md:p-8">
      <div className="relative w-full max-w-6xl max-h-[92vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-white/90 text-[#777] hover:text-[#1A1A1A] hover:bg-white shadow-sm"
          aria-label="Close"
        >
          <XMarkIcon className="size-4" />
        </button>

        {/* Screenshot pane */}
        <div className="flex-1 bg-[#F7F7F8] flex flex-col min-h-0">
          <div className="flex items-center justify-center gap-1 p-3 border-b border-[#E5E5EA] bg-white">
            <div className="inline-flex items-center p-0.5 bg-[#EFEFF1] rounded-md">
              {(["desktop", "mobile"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1 text-[10px] font-semibold uppercase tracking-wider rounded transition-colors ${
                    view === v ? "bg-white text-[#1A1A1A] shadow-sm" : "text-[#777] hover:text-[#1A1A1A]"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-auto flex items-start justify-center p-4">
            {activeImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activeImage}
                alt={`${entry.title} ${view}`}
                className={view === "mobile" ? "max-w-[375px] w-full h-auto rounded-md shadow-lg" : "max-w-full h-auto rounded-md shadow-lg"}
              />
            ) : (
              <p className="text-xs text-[#AAA] mt-10">No {view} screenshot</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-[#E5E5EA] flex flex-col">
          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={saveTitle}
                placeholder="Title"
                className="w-full text-sm font-semibold text-[#1A1A1A] bg-transparent border-0 px-0 py-0 focus:outline-none focus:ring-0"
              />
              <a
                href={entry.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] text-[#777] hover:text-[#1A1A1A] mt-1 truncate max-w-full"
              >
                {hostnameFromUrl(entry.url)}
                <ArrowTopRightOnSquareIcon className="size-2.5 shrink-0" />
              </a>
            </div>

            <div>
              <label className="text-[9px] font-semibold uppercase tracking-wider text-[#AAA]">Tags</label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                onBlur={saveTags}
                placeholder="pdp, advertorial, supplements…"
                className="mt-1 w-full text-xs px-2.5 py-1.5 border border-[#E5E5EA] rounded-md focus:outline-none focus:border-[#999]"
              />
              <p className="text-[10px] text-[#BBB] mt-1">Comma-separated</p>
            </div>

            <div>
              <label className="text-[9px] font-semibold uppercase tracking-wider text-[#AAA]">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={saveNotes}
                rows={5}
                placeholder="What stood out — hook, layout, copy angle…"
                className="mt-1 w-full text-xs px-2.5 py-2 border border-[#E5E5EA] rounded-md focus:outline-none focus:border-[#999] resize-none"
              />
            </div>
          </div>
          <div className="p-4 border-t border-[#E5E5EA]">
            <button
              onClick={() => {
                if (confirmDelete) onDelete();
                else {
                  setConfirmDelete(true);
                  setTimeout(() => setConfirmDelete(false), 3000);
                }
              }}
              className={`w-full flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 rounded-md transition-colors ${
                confirmDelete
                  ? "bg-red-50 text-red-600 ring-1 ring-red-400"
                  : "text-[#777] hover:text-red-500 hover:bg-red-50"
              }`}
            >
              <TrashIcon className="size-3.5" />
              {confirmDelete ? "Click again to confirm" : "Delete from swipe file"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
