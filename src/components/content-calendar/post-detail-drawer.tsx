"use client";

/* ── Post Detail Drawer ──
 * Right-side slide-in for editing a single content post.
 * Owns a local draft, debounce-saves to the parent every 3 seconds
 * of inactivity (and forces a final save on close). Esc closes.
 *
 * Drawer pattern matches src/components/task-board/task-detail-drawer.tsx
 * (fixed inset-0 z-50, backdrop blur, ml-auto right panel).
 */

import { useEffect, useRef, useState } from "react";
import {
  XMarkIcon,
  TrashIcon,
  PhotoIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ArrowDownTrayIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import {
  inputClass,
  selectClass,
  textareaClass,
  labelClass,
} from "@/lib/form-styles";
import {
  ALL_PLATFORMS,
  PLATFORM_LABELS,
  PLATFORM_LIMITS,
  PIPELINE_COLUMNS,
  STATUS_META,
  type ContentPillar,
  type ContentPost,
  type Platform,
  type PostStatus,
} from "@/lib/content-calendar/types";
import { toPostMedia, uploadPostMedia } from "@/lib/content-calendar/data";

const AUTO_SAVE_MS = 3000;

interface Props {
  post: ContentPost | null;
  pillars: ContentPillar[];
  onClose: () => void;
  onSave: (post: ContentPost) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
}

export function PostDetailDrawer({
  post,
  pillars,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const [draft, setDraft] = useState<ContentPost | null>(post);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  /* Holds the last serialised draft we sent up so the auto-save
   * effect skips no-op saves (avoids hammering Supabase on every
   * keystroke that didn't actually change a value). */
  const lastSavedJson = useRef<string>("");

  /* Sync the local draft when the parent swaps in a different post. */
  useEffect(() => {
    setDraft(post);
    setConfirmDelete(false);
    setUploadError(null);
    lastSavedJson.current = post ? JSON.stringify(post) : "";
  }, [post]);

  /* Esc to close. Forces a final save on the way out. */
  useEffect(() => {
    if (!post) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") flushAndClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post, draft]);

  /* Debounced auto-save, 3s after the last edit. */
  useEffect(() => {
    if (!draft) return;
    const json = JSON.stringify(draft);
    if (json === lastSavedJson.current) return;
    const id = setTimeout(() => {
      void persist();
    }, AUTO_SAVE_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  if (!post || !draft) return null;

  function set<K extends keyof ContentPost>(key: K, value: ContentPost[K]) {
    setDraft((prev) =>
      prev
        ? { ...prev, [key]: value, updated_at: new Date().toISOString() }
        : prev,
    );
  }

  async function persist() {
    if (!draft) return;
    const json = JSON.stringify(draft);
    if (json === lastSavedJson.current) return;
    await onSave(draft);
    lastSavedJson.current = json;
    setSavedAt(Date.now());
  }

  async function flushAndClose() {
    await persist();
    onClose();
  }

  function togglePlatform(platform: Platform) {
    if (!draft) return;
    const has = draft.platforms.includes(platform);
    const next = has
      ? draft.platforms.filter((p) => p !== platform)
      : [...draft.platforms, platform];
    set("platforms", next);
  }

  function copyBetween(from: Platform, to: Platform) {
    if (!draft) return;
    const text = from === "twitter" ? draft.twitter_copy : draft.linkedin_copy;
    if (to === "twitter") set("twitter_copy", text);
    else set("linkedin_copy", text);
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0 || !draft) return;
    setUploading(true);
    setUploadError(null);
    try {
      const startSort = draft.media.length;
      const uploads = await Promise.all(
        Array.from(fileList).map(async (file, idx) => {
          const upload = await uploadPostMedia(file);
          return toPostMedia(upload, startSort + idx);
        }),
      );
      set("media", [...draft.media, ...uploads]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function moveMedia(idx: number, direction: -1 | 1) {
    if (!draft) return;
    const next = draft.media.slice();
    const target = idx + direction;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    /* Re-stamp sort_order to match new array index so a future
     * read from a different surface (calendar grid, kanban card)
     * picks up the same ordering. */
    next.forEach((m, i) => (m.sort_order = i));
    set("media", next);
  }

  function deleteMedia(idx: number) {
    if (!draft) return;
    const next = draft.media.filter((_, i) => i !== idx);
    next.forEach((m, i) => (m.sort_order = i));
    set("media", next);
  }

  async function handleDelete() {
    if (!draft) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await onDelete(draft.id);
    onClose();
  }

  /* Status switching to "posted" auto-stamps posted_at if empty,
   * so the URL/metrics block becomes meaningful immediately. */
  function setStatus(status: PostStatus) {
    if (!draft) return;
    if (status === "posted" && !draft.posted_at) {
      setDraft({
        ...draft,
        status,
        posted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      return;
    }
    set("status", status);
  }

  const showTwitter = draft.platforms.includes("twitter");
  const showLinkedin = draft.platforms.includes("linkedin");
  const isPosted = draft.status === "posted";

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
        onClick={flushAndClose}
      />
      <div className="relative ml-auto w-full max-w-[560px] h-full bg-surface shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border sticky top-0 bg-surface z-10">
          <div className="min-w-0 pr-3">
            <h2 className="text-base font-semibold text-foreground">
              {draft.status === "idea" && (draft.notes || draft.twitter_copy || draft.linkedin_copy)
                ? truncate(
                    draft.notes || draft.twitter_copy || draft.linkedin_copy,
                    60,
                  )
                : "Post"}
            </h2>
            <p className="text-xs text-muted mt-1 flex items-center gap-2">
              <span
                className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{
                  background: STATUS_META[draft.status].bg,
                  color: STATUS_META[draft.status].color,
                }}
              >
                {STATUS_META[draft.status].label}
              </span>
              {savedAt && (
                <span className="text-subtle inline-flex items-center gap-1">
                  <CheckIcon className="size-3" />
                  Saved
                </span>
              )}
            </p>
          </div>
          <button
            onClick={flushAndClose}
            className="shrink-0 p-1.5 rounded-lg text-subtle hover:text-foreground hover:bg-surface-raised"
            aria-label="Close"
          >
            <XMarkIcon className="size-4" />
          </button>
        </div>

        {/* Pillar + Status */}
        <section className="px-6 py-5 border-b border-border grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Pillar</label>
            <div className="relative">
              <select
                value={draft.pillar_id || ""}
                onChange={(e) => set("pillar_id", e.target.value || null)}
                className={selectClass}
              >
                <option value="">Unassigned</option>
                {pillars.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {draft.pillar_id && (
                <span
                  className="absolute right-9 top-1/2 -translate-y-1/2 size-2.5 rounded-full pointer-events-none"
                  style={{
                    background:
                      pillars.find((p) => p.id === draft.pillar_id)
                        ?.color_hex || "#CCC",
                  }}
                />
              )}
            </div>
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select
              value={draft.status}
              onChange={(e) => setStatus(e.target.value as PostStatus)}
              className={selectClass}
            >
              {[...PIPELINE_COLUMNS, "archived" as PostStatus].map((s) => (
                <option key={s} value={s}>
                  {STATUS_META[s].label}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Platforms */}
        <section className="px-6 py-5 border-b border-border">
          <label className={labelClass}>Platforms</label>
          <div className="flex items-center gap-2">
            {ALL_PLATFORMS.map((p) => {
              const active = draft.platforms.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePlatform(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    active
                      ? "bg-accent text-accent-foreground border-surface"
                      : "bg-surface text-subtle border-border hover:border-surface"
                  }`}
                >
                  {PLATFORM_LABELS[p]}
                </button>
              );
            })}
          </div>
        </section>

        {/* Copy editors */}
        {(showTwitter || showLinkedin) && (
          <section className="px-6 py-5 border-b border-border space-y-4">
            {showTwitter && (
              <CopyBlock
                label="Twitter"
                value={draft.twitter_copy}
                limit={PLATFORM_LIMITS.twitter}
                onChange={(v) => set("twitter_copy", v)}
                onCopyFromOther={
                  showLinkedin && draft.linkedin_copy
                    ? () => copyBetween("linkedin", "twitter")
                    : undefined
                }
                copyFromLabel="Copy from LinkedIn"
              />
            )}
            {showLinkedin && (
              <CopyBlock
                label="LinkedIn"
                value={draft.linkedin_copy}
                limit={PLATFORM_LIMITS.linkedin}
                onChange={(v) => set("linkedin_copy", v)}
                onCopyFromOther={
                  showTwitter && draft.twitter_copy
                    ? () => copyBetween("twitter", "linkedin")
                    : undefined
                }
                copyFromLabel="Copy from Twitter"
              />
            )}
          </section>
        )}

        {/* Media */}
        <section className="px-6 py-5 border-b border-border">
          <label className={labelClass}>Media</label>
          <div
            onDrop={(e) => {
              e.preventDefault();
              void handleFiles(e.dataTransfer.files);
            }}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border border-dashed border-border rounded-lg px-4 py-6 text-center cursor-pointer hover:border-surface hover:bg-background transition-colors"
          >
            <PhotoIcon className="size-5 text-muted mx-auto mb-1.5" />
            <p className="text-xs text-subtle">
              {uploading ? "Uploading..." : "Drop or click to add images / video"}
            </p>
            <p className="text-[10px] text-muted mt-1">
              PNG, JPG, WebP, GIF, MP4, MOV up to 100MB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/quicktime"
              onChange={(e) => void handleFiles(e.target.files)}
              className="hidden"
            />
          </div>
          {uploadError && (
            <p className="mt-2 text-xs text-danger">{uploadError}</p>
          )}
          {draft.media.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              {draft.media.map((m, idx) => (
                <div
                  key={m.id}
                  className="relative group aspect-square rounded-lg border border-border overflow-hidden bg-background"
                >
                  {m.file_type === "video" ? (
                    <video
                      src={m.file_url}
                      className="w-full h-full object-cover"
                      muted
                    />
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={m.thumbnail_url || m.file_url}
                      alt={m.alt_text || ""}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => deleteMedia(idx)}
                        className="p-1 rounded bg-surface/90 hover:bg-surface text-danger"
                        aria-label="Delete"
                      >
                        <TrashIcon className="size-3" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => moveMedia(idx, -1)}
                        disabled={idx === 0}
                        className="p-1 rounded bg-surface/90 hover:bg-surface text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="Move up"
                      >
                        <ChevronUpIcon className="size-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveMedia(idx, 1)}
                        disabled={idx === draft.media.length - 1}
                        className="p-1 rounded bg-surface/90 hover:bg-surface text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="Move down"
                      >
                        <ChevronDownIcon className="size-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Schedule + Notes + Evergreen */}
        <section className="px-6 py-5 border-b border-border space-y-4">
          <div>
            <label className={labelClass}>Scheduled for</label>
            <input
              type="datetime-local"
              value={toLocalDatetime(draft.scheduled_for)}
              onChange={(e) =>
                set(
                  "scheduled_for",
                  e.target.value
                    ? new Date(e.target.value).toISOString()
                    : null,
                )
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              rows={3}
              placeholder="Hooks, source links, context..."
              value={draft.notes}
              onChange={(e) => set("notes", e.target.value)}
              className={textareaClass}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={draft.is_evergreen}
              onChange={(e) => set("is_evergreen", e.target.checked)}
              className="size-4 rounded border-border text-foreground focus:ring-surface"
            />
            Evergreen (repurpose later)
          </label>
        </section>

        {/* Performance — only shown once posted */}
        {isPosted && (
          <section className="px-6 py-5 border-b border-border space-y-3">
            <h3 className="text-[9px] font-semibold uppercase tracking-wider text-muted">
              Performance
            </h3>
            {showTwitter && (
              <div>
                <label className={labelClass}>Twitter URL</label>
                <input
                  type="url"
                  placeholder="https://twitter.com/..."
                  value={draft.twitter_url || ""}
                  onChange={(e) => set("twitter_url", e.target.value || null)}
                  className={inputClass}
                />
              </div>
            )}
            {showLinkedin && (
              <div>
                <label className={labelClass}>LinkedIn URL</label>
                <input
                  type="url"
                  placeholder="https://linkedin.com/..."
                  value={draft.linkedin_url || ""}
                  onChange={(e) => set("linkedin_url", e.target.value || null)}
                  className={inputClass}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Impressions</label>
                <input
                  type="number"
                  min={0}
                  value={draft.impressions ?? ""}
                  onChange={(e) =>
                    set(
                      "impressions",
                      e.target.value === "" ? null : Number(e.target.value),
                    )
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Engagement</label>
                <input
                  type="number"
                  min={0}
                  value={draft.engagement ?? ""}
                  onChange={(e) =>
                    set(
                      "engagement",
                      e.target.value === "" ? null : Number(e.target.value),
                    )
                  }
                  className={inputClass}
                />
              </div>
            </div>
          </section>
        )}

        {/* Footer actions */}
        <section className="px-6 py-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleDelete}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
              confirmDelete
                ? "bg-danger text-white hover:bg-danger"
                : "text-danger hover:bg-danger/10"
            }`}
          >
            <TrashIcon className="size-3.5" />
            {confirmDelete ? "Click again to confirm" : "Delete"}
          </button>
          <button
            type="button"
            onClick={() => void persist()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-accent text-accent-foreground rounded-lg hover:opacity-90"
          >
            <ArrowDownTrayIcon className="size-3.5" />
            Save now
          </button>
        </section>
      </div>
    </div>
  );
}

/* ── Inline subcomponents ───────────────────────────────────────── */

function CopyBlock({
  label,
  value,
  limit,
  onChange,
  onCopyFromOther,
  copyFromLabel,
}: {
  label: string;
  value: string;
  limit: number;
  onChange: (v: string) => void;
  onCopyFromOther?: () => void;
  copyFromLabel: string;
}) {
  const over = value.length > limit;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-subtle">
          {label}
        </span>
        <div className="flex items-center gap-2">
          {onCopyFromOther && (
            <button
              type="button"
              onClick={onCopyFromOther}
              className="text-[10px] font-medium text-subtle hover:text-foreground underline-offset-2 hover:underline"
            >
              {copyFromLabel}
            </button>
          )}
          <span
            className={`text-[10px] tabular-nums ${
              over ? "text-danger font-semibold" : "text-muted"
            }`}
          >
            {value.length} / {limit}
          </span>
        </div>
      </div>
      <textarea
        rows={label === "Twitter" ? 4 : 8}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Write your ${label} post...`}
        className={textareaClass}
      />
    </div>
  );
}

/* ── Helpers ────────────────────────────────────────────────────── */

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

/* Convert ISO to the value format <input type="datetime-local"> wants
 * (YYYY-MM-DDTHH:mm), in the user's local zone. Returns "" for null. */
function toLocalDatetime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear() +
    "-" +
    pad(d.getMonth() + 1) +
    "-" +
    pad(d.getDate()) +
    "T" +
    pad(d.getHours()) +
    ":" +
    pad(d.getMinutes())
  );
}
