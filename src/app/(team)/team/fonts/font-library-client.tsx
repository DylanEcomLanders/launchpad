"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  PlusIcon,
  XMarkIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  ArrowUpOnSquareIcon,
  ArrowTopRightOnSquareIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";
import {
  FONT_CATEGORIES,
  FONT_CATEGORY_LABELS,
  FONT_USAGE_OPTIONS,
  FONT_USAGE_LABELS,
  FONT_NICHES,
  FORMAT_FONTFACE_TOKEN,
  pickPreviewFile,
  formatBytes,
  type FontEntry,
  type FontCategory,
  type FontUsage,
  type FontFile,
} from "@/lib/font-library";

const DEFAULT_PREVIEW = "The quick brown fox jumps over the lazy dog";

export function FontLibraryClient() {
  const [fonts, setFonts] = useState<FontEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ── Filter state ───────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<FontCategory | "all">("all");
  const [activeUsage, setActiveUsage] = useState<FontUsage | "all">("all");
  const [activeNiche, setActiveNiche] = useState<string>("");

  // ── Preview state ──────────────────────────────────────────────────────────
  const [previewText, setPreviewText] = useState(DEFAULT_PREVIEW);
  const [previewSize, setPreviewSize] = useState(48);

  // ── Modal state ────────────────────────────────────────────────────────────
  const [editingFontId, setEditingFontId] = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);

  useEffect(() => {
    fetch("/api/font-library")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setFonts(data);
        else setError(data?.error || "Failed to load fonts");
      })
      .catch((e) => setError(e?.message || "Failed to load fonts"))
      .finally(() => setLoading(false));
  }, []);

  // ── Inject @font-face declarations for every font with files ──────────────
  useEffect(() => {
    if (typeof document === "undefined") return;
    const STYLE_ID = "font-library-faces";
    let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }
    const css = fonts
      .flatMap((f) =>
        f.files.map(
          (file) => `@font-face {
  font-family: "${cssEscape(f.family)}";
  src: url("${file.publicUrl}") format("${FORMAT_FONTFACE_TOKEN[file.format]}");
  font-weight: ${file.weight};
  font-style: ${file.style};
  font-display: swap;
}`,
        ),
      )
      .join("\n");
    style.textContent = css;
  }, [fonts]);

  // ── Aggregate niche options (preset + everything actually in use) ─────────
  const allNiches = useMemo(() => {
    const used = new Set<string>();
    fonts.forEach((f) => f.niches.forEach((n) => used.add(n)));
    FONT_NICHES.forEach((n) => used.add(n));
    return Array.from(used).sort();
  }, [fonts]);

  // ── Filter + search ───────────────────────────────────────────────────────
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return fonts.filter((f) => {
      if (activeCategory !== "all" && f.category !== activeCategory) return false;
      if (activeUsage !== "all" && !f.usage.includes(activeUsage)) return false;
      if (activeNiche && !f.niches.includes(activeNiche)) return false;
      if (q && !f.name.toLowerCase().includes(q) && !f.family.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [fonts, search, activeCategory, activeUsage, activeNiche]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const refresh = async () => {
    const res = await fetch("/api/font-library");
    const data = await res.json();
    if (Array.isArray(data)) setFonts(data);
  };

  const onCreateOrUpdate = async (
    payload: Partial<FontEntry> & { id?: string },
  ): Promise<FontEntry | null> => {
    const isUpdate = !!payload.id;
    const url = isUpdate ? `/api/font-library/${payload.id}` : "/api/font-library";
    const method = isUpdate ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error || `${method} failed`);
      return null;
    }
    setFonts((prev) => {
      if (isUpdate) return prev.map((f) => (f.id === data.id ? data : f));
      return [...prev, data].sort((a, b) => a.name.localeCompare(b.name));
    });
    return data as FontEntry;
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this font and all uploaded files? This cannot be undone.")) return;
    const res = await fetch(`/api/font-library/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error || "Delete failed");
      return;
    }
    setFonts((prev) => prev.filter((f) => f.id !== id));
    setEditingFontId(null);
  };

  const editingFont = editingFontId ? fonts.find((f) => f.id === editingFontId) ?? null : null;

  return (
    <>
      {/* Header */}
      <div className="flex items-end justify-between gap-4 mb-8 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">Font Library</h1>
          <p className="text-sm text-[#7A7A7A]">
            Approved fonts only. Browse, preview, download — and tag what fits which niche.
          </p>
        </div>
        <button
          onClick={() => setCreatingNew(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#1B1B1B] text-white rounded-full hover:bg-[#2D2D2D] transition-colors"
        >
          <PlusIcon className="size-4" />
          Add font
        </button>
      </div>

      {/* Hero preview controls */}
      <section className="bg-white border border-[#E5E5EA] rounded-xl p-5 md:p-6 mb-6">
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7A7A7A]">
            Type to preview every card
          </span>
          <input
            type="text"
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            placeholder={DEFAULT_PREVIEW}
            className="mt-2 w-full text-base px-3 py-2 border border-[#E5E5EA] rounded-lg focus:outline-none focus:border-[#1B1B1B]"
          />
        </label>
        <div className="flex items-center gap-4 mt-4">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7A7A7A] shrink-0">
            Size
          </span>
          <input
            type="range"
            min={16}
            max={120}
            value={previewSize}
            onChange={(e) => setPreviewSize(parseInt(e.target.value, 10))}
            className="flex-1"
          />
          <span className="text-xs tabular-nums text-[#1B1B1B] w-12 text-right">{previewSize}px</span>
        </div>
      </section>

      {/* Filters */}
      <section className="flex flex-col gap-3 mb-6">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search fonts by name…"
          className="w-full text-sm px-3.5 py-2.5 border border-[#E5E5EA] rounded-lg focus:outline-none focus:border-[#1B1B1B]"
        />
        <FilterChips
          label="Category"
          options={[
            { value: "all", label: "All" },
            ...FONT_CATEGORIES.map((c) => ({ value: c, label: FONT_CATEGORY_LABELS[c] })),
          ]}
          active={activeCategory}
          onChange={(v) => setActiveCategory(v as FontCategory | "all")}
        />
        <FilterChips
          label="Use for"
          options={[
            { value: "all", label: "Any" },
            ...FONT_USAGE_OPTIONS.map((u) => ({ value: u, label: FONT_USAGE_LABELS[u] })),
          ]}
          active={activeUsage}
          onChange={(v) => setActiveUsage(v as FontUsage | "all")}
        />
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7A7A7A] shrink-0">
            Niche
          </span>
          <select
            value={activeNiche}
            onChange={(e) => setActiveNiche(e.target.value)}
            className="text-xs px-3 py-1.5 border border-[#E5E5EA] rounded-full bg-white focus:outline-none focus:border-[#1B1B1B] min-w-[140px]"
          >
            <option value="">All niches</option>
            {allNiches.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          {(activeCategory !== "all" || activeUsage !== "all" || activeNiche || search) && (
            <button
              onClick={() => {
                setSearch("");
                setActiveCategory("all");
                setActiveUsage("all");
                setActiveNiche("");
              }}
              className="text-xs text-[#7A7A7A] hover:text-[#1B1B1B] underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </section>

      {/* Error banner */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")}>
            <XMarkIcon className="size-4" />
          </button>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="text-sm text-[#7A7A7A] py-12 text-center">Loading…</div>
      ) : visible.length === 0 ? (
        <EmptyState onAdd={() => setCreatingNew(true)} hasFonts={fonts.length > 0} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visible.map((font) => (
            <FontCard
              key={font.id}
              font={font}
              previewText={previewText || DEFAULT_PREVIEW}
              previewSize={previewSize}
              onEdit={() => setEditingFontId(font.id)}
            />
          ))}
        </div>
      )}

      {/* Add modal */}
      {creatingNew && (
        <FontFormModal
          mode="create"
          onClose={() => setCreatingNew(false)}
          onSave={async (payload) => {
            const created = await onCreateOrUpdate(payload);
            if (created) {
              setCreatingNew(false);
              setEditingFontId(created.id);
            }
          }}
        />
      )}

      {/* Edit / files modal */}
      {editingFont && (
        <FontDetailModal
          font={editingFont}
          onClose={() => setEditingFontId(null)}
          onSave={async (payload) => {
            await onCreateOrUpdate({ ...payload, id: editingFont.id });
          }}
          onDelete={() => onDelete(editingFont.id)}
          onFilesChanged={async () => {
            await refresh();
          }}
        />
      )}
    </>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────
function cssEscape(s: string): string {
  return s.replace(/"/g, '\\"');
}

// ── Filter chip strip ──────────────────────────────────────────────────────
function FilterChips({
  label,
  options,
  active,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  active: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7A7A7A] shrink-0">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const isActive = active === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                isActive
                  ? "bg-[#1B1B1B] text-white border-[#1B1B1B]"
                  : "bg-white text-[#1B1B1B] border-[#E5E5EA] hover:border-[#1B1B1B]"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────
function EmptyState({ onAdd, hasFonts }: { onAdd: () => void; hasFonts: boolean }) {
  return (
    <div className="bg-white border border-dashed border-[#E5E5EA] rounded-xl p-12 text-center">
      <h3 className="text-base font-semibold text-[#1B1B1B] mb-1">
        {hasFonts ? "Nothing matches those filters" : "No fonts yet"}
      </h3>
      <p className="text-sm text-[#7A7A7A] mb-4">
        {hasFonts
          ? "Try clearing some filters."
          : "Upload your first approved font to start the library."}
      </p>
      {!hasFonts && (
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#1B1B1B] text-white rounded-full hover:bg-[#2D2D2D]"
        >
          <PlusIcon className="size-4" /> Add a font
        </button>
      )}
    </div>
  );
}

// ── Font card ──────────────────────────────────────────────────────────────
function FontCard({
  font,
  previewText,
  previewSize,
  onEdit,
}: {
  font: FontEntry;
  previewText: string;
  previewSize: number;
  onEdit: () => void;
}) {
  const previewFile = pickPreviewFile(font.files);
  const hasFiles = font.files.length > 0;

  return (
    <article className="bg-white border border-[#E5E5EA] rounded-xl overflow-hidden hover:border-[#1B1B1B] transition-colors group">
      {/* Preview */}
      <div
        className="px-5 md:px-6 py-7 md:py-9 border-b border-[#EDEDEF] min-h-[120px] flex items-center"
        style={{
          fontFamily: hasFiles ? `"${font.family}", system-ui, sans-serif` : "system-ui, sans-serif",
          fontSize: `${previewSize}px`,
          lineHeight: 1.05,
          color: "#1B1B1B",
          letterSpacing: "-0.02em",
        }}
      >
        <span className="break-words">
          {hasFiles ? previewText : "Add files to preview"}
        </span>
      </div>

      {/* Meta */}
      <div className="px-5 md:px-6 py-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <h3 className="text-sm font-semibold text-[#1B1B1B]">{font.name}</h3>
            <p className="text-[11px] text-[#7A7A7A] mt-0.5">
              {FONT_CATEGORY_LABELS[font.category]}
              {font.usage.length > 0 && (
                <> · {font.usage.map((u) => FONT_USAGE_LABELS[u]).join(", ")}</>
              )}
              {font.files.length > 0 && (
                <> · {font.files.length} file{font.files.length === 1 ? "" : "s"}</>
              )}
            </p>
          </div>
          <button
            onClick={onEdit}
            className="text-[11px] font-medium text-[#7A7A7A] hover:text-[#1B1B1B] inline-flex items-center gap-1"
          >
            <PencilIcon className="size-3" /> Manage
          </button>
        </div>

        {font.niches.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {font.niches.map((n) => (
              <span
                key={n}
                className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-[#F3F3F5] text-[#7A7A7A] rounded-full"
              >
                {n}
              </span>
            ))}
          </div>
        )}

        {hasFiles && previewFile && (
          <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-[#EDEDEF]">
            <span className="text-[11px] text-[#7A7A7A]">
              Latest: {previewFile.weight} {previewFile.style === "italic" ? "italic " : ""}·{" "}
              {previewFile.format} · {formatBytes(previewFile.fileSizeBytes)}
            </span>
            <a
              href={previewFile.publicUrl}
              download={previewFile.fileName}
              className="text-[11px] font-medium text-[#1B1B1B] hover:underline inline-flex items-center gap-1"
            >
              <ArrowDownTrayIcon className="size-3" /> Download
            </a>
          </div>
        )}

        {font.googleFontsUrl && (
          <a
            href={font.googleFontsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-[#7A7A7A] hover:text-[#1B1B1B] inline-flex items-center gap-1 mt-2"
          >
            Source <ArrowTopRightOnSquareIcon className="size-3" />
          </a>
        )}
      </div>
    </article>
  );
}

// ── Create modal: just the metadata form ──────────────────────────────────
function FontFormModal({
  mode,
  initial,
  onClose,
  onSave,
}: {
  mode: "create" | "edit";
  initial?: Partial<FontEntry>;
  onClose: () => void;
  onSave: (payload: Partial<FontEntry>) => void | Promise<void>;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [family, setFamily] = useState(initial?.family || "");
  const [category, setCategory] = useState<FontCategory>(initial?.category || "sans");
  const [usage, setUsage] = useState<FontUsage[]>(initial?.usage || []);
  const [niches, setNiches] = useState<string[]>(initial?.niches || []);
  const [niche, setNiche] = useState("");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [googleFontsUrl, setGoogleFontsUrl] = useState(initial?.googleFontsUrl || "");
  const [saving, setSaving] = useState(false);

  const toggleUsage = (u: FontUsage) =>
    setUsage((prev) => (prev.includes(u) ? prev.filter((x) => x !== u) : [...prev, u]));

  const addNiche = (n: string) => {
    const v = n.trim().toLowerCase();
    if (!v || niches.includes(v)) return;
    setNiches([...niches, v]);
    setNiche("");
  };

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        family: family.trim() || name.trim(),
        category,
        usage,
        niches,
        notes,
        googleFontsUrl,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title={mode === "create" ? "Add a font" : "Edit font details"} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Name" required>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Inter"
            className="w-full text-sm px-3 py-2 border border-[#E5E5EA] rounded-lg focus:outline-none focus:border-[#1B1B1B]"
          />
        </Field>
        <Field label="CSS family name" hint="Defaults to the name above. Set this if your font files declare a different family.">
          <input
            type="text"
            value={family}
            onChange={(e) => setFamily(e.target.value)}
            placeholder={name || "e.g. Inter"}
            className="w-full text-sm px-3 py-2 border border-[#E5E5EA] rounded-lg focus:outline-none focus:border-[#1B1B1B]"
          />
        </Field>
        <Field label="Category">
          <div className="flex flex-wrap gap-1.5">
            {FONT_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`text-xs px-3 py-1 rounded-full border ${
                  category === c
                    ? "bg-[#1B1B1B] text-white border-[#1B1B1B]"
                    : "bg-white text-[#1B1B1B] border-[#E5E5EA] hover:border-[#1B1B1B]"
                }`}
              >
                {FONT_CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Use for">
          <div className="flex flex-wrap gap-1.5">
            {FONT_USAGE_OPTIONS.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => toggleUsage(u)}
                className={`text-xs px-3 py-1 rounded-full border ${
                  usage.includes(u)
                    ? "bg-[#1B1B1B] text-white border-[#1B1B1B]"
                    : "bg-white text-[#1B1B1B] border-[#E5E5EA] hover:border-[#1B1B1B]"
                }`}
              >
                {FONT_USAGE_LABELS[u]}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Niches" hint="Type a niche and press Enter. Add as many as you like.">
          <div className="flex flex-wrap items-center gap-1.5 px-2 py-1.5 border border-[#E5E5EA] rounded-lg focus-within:border-[#1B1B1B]">
            {niches.map((n) => (
              <span
                key={n}
                className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 bg-[#F3F3F5] text-[#1B1B1B] rounded-full"
              >
                {n}
                <button
                  type="button"
                  onClick={() => setNiches(niches.filter((x) => x !== n))}
                  className="text-[#A0A0A0] hover:text-[#1B1B1B]"
                >
                  <XMarkIcon className="size-3" />
                </button>
              </span>
            ))}
            <input
              type="text"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addNiche(niche);
                }
                if (e.key === "Backspace" && !niche && niches.length > 0) {
                  setNiches(niches.slice(0, -1));
                }
              }}
              list="font-niche-options"
              placeholder={niches.length === 0 ? "beauty, premium, minimal…" : ""}
              className="flex-1 min-w-[120px] text-xs px-1 py-0.5 outline-none bg-transparent"
            />
            <datalist id="font-niche-options">
              {FONT_NICHES.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </div>
        </Field>
        <Field label="Google Fonts URL" hint="Optional — link back to source for license / weights.">
          <input
            type="url"
            value={googleFontsUrl}
            onChange={(e) => setGoogleFontsUrl(e.target.value)}
            placeholder="https://fonts.google.com/specimen/Inter"
            className="w-full text-sm px-3 py-2 border border-[#E5E5EA] rounded-lg focus:outline-none focus:border-[#1B1B1B]"
          />
        </Field>
        <Field label="Notes">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Pairing tips, usage notes, license caveats…"
            className="w-full text-sm px-3 py-2 border border-[#E5E5EA] rounded-lg focus:outline-none focus:border-[#1B1B1B] resize-none"
          />
        </Field>
      </div>

      <div className="flex items-center justify-end gap-2 mt-6">
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-xs font-medium text-[#7A7A7A] hover:text-[#1B1B1B]"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={!name.trim() || saving}
          className="px-4 py-1.5 text-xs font-medium bg-[#1B1B1B] text-white rounded-lg hover:bg-[#2D2D2D] disabled:opacity-40"
        >
          {saving ? "Saving…" : mode === "create" ? "Create & add files" : "Save"}
        </button>
      </div>
    </ModalShell>
  );
}

// ── Detail modal: edit metadata + manage files ────────────────────────────
function FontDetailModal({
  font,
  onClose,
  onSave,
  onDelete,
  onFilesChanged,
}: {
  font: FontEntry;
  onClose: () => void;
  onSave: (payload: Partial<FontEntry>) => void | Promise<void>;
  onDelete: () => void | Promise<void>;
  onFilesChanged: () => void | Promise<void>;
}) {
  const [editingMeta, setEditingMeta] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingWeight, setPendingWeight] = useState(400);
  const [pendingStyle, setPendingStyle] = useState<"normal" | "italic">("normal");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("weight", String(pendingWeight));
      fd.append("style", pendingStyle);
      const res = await fetch(`/api/font-library/${font.id}/files`, { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data?.error || "Upload failed");
        return;
      }
      await onFilesChanged();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onDeleteFile = async (file: FontFile) => {
    if (!confirm(`Delete ${file.fileName}?`)) return;
    const res = await fetch(`/api/font-library/${font.id}/files?fileId=${file.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data?.error || "Delete failed");
      return;
    }
    await onFilesChanged();
  };

  if (editingMeta) {
    return (
      <FontFormModal
        mode="edit"
        initial={font}
        onClose={() => setEditingMeta(false)}
        onSave={async (payload) => {
          await onSave(payload);
          setEditingMeta(false);
        }}
      />
    );
  }

  return (
    <ModalShell title={font.name} onClose={onClose}>
      <div className="space-y-5">
        {/* Metadata summary */}
        <div className="text-xs text-[#7A7A7A] leading-relaxed">
          <p>
            <strong className="text-[#1B1B1B]">Family:</strong> {font.family}
          </p>
          <p>
            <strong className="text-[#1B1B1B]">Category:</strong>{" "}
            {FONT_CATEGORY_LABELS[font.category]}
          </p>
          {font.usage.length > 0 && (
            <p>
              <strong className="text-[#1B1B1B]">Use for:</strong>{" "}
              {font.usage.map((u) => FONT_USAGE_LABELS[u]).join(", ")}
            </p>
          )}
          {font.niches.length > 0 && (
            <p>
              <strong className="text-[#1B1B1B]">Niches:</strong> {font.niches.join(", ")}
            </p>
          )}
          {font.notes && <p className="mt-2 italic">{font.notes}</p>}
          <button
            onClick={() => setEditingMeta(true)}
            className="mt-3 text-[#1B1B1B] hover:underline text-xs font-medium inline-flex items-center gap-1"
          >
            <PencilIcon className="size-3" /> Edit details
          </button>
        </div>

        {/* Upload section */}
        <div className="border-t border-[#EDEDEF] pt-5">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[#7A7A7A] mb-3">
            Upload font file
          </h4>
          <div className="flex items-end gap-3 flex-wrap">
            <Field label="Weight">
              <select
                value={pendingWeight}
                onChange={(e) => setPendingWeight(parseInt(e.target.value, 10))}
                className="text-sm px-3 py-2 border border-[#E5E5EA] rounded-lg focus:outline-none focus:border-[#1B1B1B]"
              >
                {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((w) => (
                  <option key={w} value={w}>
                    {w} {weightLabel(w)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Style">
              <select
                value={pendingStyle}
                onChange={(e) => setPendingStyle(e.target.value as "normal" | "italic")}
                className="text-sm px-3 py-2 border border-[#E5E5EA] rounded-lg focus:outline-none focus:border-[#1B1B1B]"
              >
                <option value="normal">Normal</option>
                <option value="italic">Italic</option>
              </select>
            </Field>
            <div className="flex-1 min-w-[200px]">
              <input
                ref={fileInputRef}
                type="file"
                accept=".woff2,.woff,.ttf,.otf"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUpload(f);
                }}
                className="hidden"
                id="font-upload-input"
              />
              <label
                htmlFor="font-upload-input"
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer ${
                  uploading
                    ? "bg-[#EDEDEF] text-[#7A7A7A] cursor-wait"
                    : "bg-[#1B1B1B] text-white hover:bg-[#2D2D2D]"
                }`}
              >
                <ArrowUpOnSquareIcon className="size-4" />
                {uploading ? "Uploading…" : "Pick a file"}
              </label>
              <p className="text-[10px] text-[#A0A0A0] mt-1.5">
                .woff2, .woff, .ttf, or .otf
              </p>
            </div>
          </div>
        </div>

        {/* Files list */}
        <div className="border-t border-[#EDEDEF] pt-5">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[#7A7A7A] mb-3">
            Files ({font.files.length})
          </h4>
          {font.files.length === 0 ? (
            <p className="text-xs text-[#A0A0A0] italic">No files uploaded yet.</p>
          ) : (
            <ul className="divide-y divide-[#EDEDEF]">
              {font.files
                .slice()
                .sort((a, b) => a.weight - b.weight)
                .map((file) => (
                  <li key={file.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#1B1B1B] truncate">{file.fileName}</p>
                      <p className="text-[10px] text-[#7A7A7A] mt-0.5">
                        {file.weight} {weightLabel(file.weight)} · {file.style} · {file.format} ·{" "}
                        {formatBytes(file.fileSizeBytes)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={file.publicUrl}
                        download={file.fileName}
                        className="text-[11px] font-medium text-[#1B1B1B] hover:underline inline-flex items-center gap-1"
                      >
                        <ArrowDownTrayIcon className="size-3" /> Download
                      </a>
                      <button
                        onClick={() => onDeleteFile(file)}
                        className="text-[11px] text-[#7A7A7A] hover:text-red-600 inline-flex items-center gap-1"
                      >
                        <TrashIcon className="size-3" />
                      </button>
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </div>

        {/* Danger zone */}
        <div className="border-t border-[#EDEDEF] pt-5">
          <button
            onClick={onDelete}
            className="text-xs font-medium text-red-600 hover:text-red-700 inline-flex items-center gap-1"
          >
            <TrashIcon className="size-3" /> Delete font
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function weightLabel(w: number): string {
  return (
    {
      100: "Thin",
      200: "Extra Light",
      300: "Light",
      400: "Regular",
      500: "Medium",
      600: "Semibold",
      700: "Bold",
      800: "Extra Bold",
      900: "Black",
    } as Record<number, string>
  )[w] || "";
}

// ── Modal shell ────────────────────────────────────────────────────────────
function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 md:p-10 overflow-y-auto bg-black/30 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white rounded-xl shadow-2xl my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EDEDEF]">
          <h2 className="text-base font-semibold text-[#1B1B1B]">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#7A7A7A] hover:text-[#1B1B1B] hover:bg-[#F3F3F5]"
          >
            <XMarkIcon className="size-5" />
          </button>
        </div>
        <div className="px-5 py-5 md:px-6 md:py-6">{children}</div>
      </div>
    </div>
  );
}

// ── Field wrapper ──────────────────────────────────────────────────────────
function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7A7A7A] block mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {children}
      {hint && <p className="text-[10px] text-[#A0A0A0] mt-1">{hint}</p>}
    </div>
  );
}
