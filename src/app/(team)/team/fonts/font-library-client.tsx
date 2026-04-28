"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import {
  PlusIcon,
  XMarkIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  ArrowUpOnSquareIcon,
  PencilIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import {
  FONT_CATEGORIES,
  FONT_CATEGORY_LABELS,
  FONT_USAGE_OPTIONS,
  FONT_USAGE_LABELS,
  FONT_NICHES,
  FONT_FILE_FORMATS,
  FONT_FILE_EXT_RE,
  FORMAT_FONTFACE_TOKEN,
  formatBytes,
  parseFontFilename,
  type FontEntry,
  type FontCategory,
  type FontUsage,
  type FontFile,
  type FontFileFormat,
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

  // ── Aggregate niche options ───────────────────────────────────────────────
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

  const refresh = async () => {
    const res = await fetch("/api/font-library");
    const data = await res.json();
    if (Array.isArray(data)) setFonts(data);
  };

  const onPatch = async (id: string, payload: Partial<FontEntry>) => {
    const res = await fetch(`/api/font-library/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error || "Update failed");
      return null;
    }
    setFonts((prev) => prev.map((f) => (f.id === data.id ? data : f)));
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
            Approved fonts only. Drop a Google Fonts download, the library handles the rest.
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

      {creatingNew && (
        <AddFontModal
          onClose={() => setCreatingNew(false)}
          onCreated={async (ids) => {
            setCreatingNew(false);
            await refresh();
            // If they only added one font, jump straight into it. For bulk
            // imports (e.g. dropped 7 zips), drop them back to the grid so
            // they can scan the whole batch.
            if (ids.length === 1) setEditingFontId(ids[0]);
          }}
          onError={(msg) => setError(msg)}
        />
      )}

      {editingFont && (
        <FontDetailModal
          font={editingFont}
          onClose={() => setEditingFontId(null)}
          onPatch={(payload) => onPatch(editingFont.id, payload)}
          onDelete={() => onDelete(editingFont.id)}
          onFilesChanged={refresh}
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
          : "Drop a Google Fonts download to start the library."}
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

// ── Zip + download all files in a font family ──────────────────────────────
async function downloadFontAsZip(font: FontEntry) {
  if (font.files.length === 0) return;

  // Single-file shortcut — just pull the file directly
  if (font.files.length === 1) {
    const f = font.files[0];
    const a = document.createElement("a");
    a.href = f.publicUrl;
    a.download = f.fileName;
    a.click();
    return;
  }

  const zip = new JSZip();
  await Promise.all(
    font.files.map(async (file) => {
      try {
        const res = await fetch(file.publicUrl);
        if (!res.ok) throw new Error(`Failed: ${file.fileName}`);
        const blob = await res.blob();
        zip.file(file.fileName, blob);
      } catch (err) {
        console.error(err);
      }
    }),
  );
  const blob = await zip.generateAsync({ type: "blob" });
  const slug = font.name.replace(/[^a-zA-Z0-9._-]+/g, "-").toLowerCase() || "font";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug}.zip`;
  a.click();
  URL.revokeObjectURL(url);
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
  const hasFiles = font.files.length > 0;

  // Sort files by (weight asc, normal before italic) and de-dupe by (weight, style)
  const variants = useMemo(() => {
    const seen = new Set<string>();
    return font.files
      .slice()
      .sort((a, b) => a.weight - b.weight || a.style.localeCompare(b.style))
      .filter((f) => {
        const k = `${f.weight}-${f.style}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
  }, [font.files]);

  // Preview state — default to closest-to-400 normal weight
  const defaultIdx = useMemo(() => {
    if (!variants.length) return 0;
    const normals = variants
      .map((v, i) => ({ i, dist: Math.abs(v.weight - 400), italic: v.style === "italic" }))
      .filter((v) => !v.italic);
    if (normals.length) {
      normals.sort((a, b) => a.dist - b.dist);
      return normals[0].i;
    }
    return 0;
  }, [variants]);
  const [activeIdx, setActiveIdx] = useState(defaultIdx);
  // Re-sync when files change (after upload/delete)
  useEffect(() => setActiveIdx(defaultIdx), [defaultIdx]);

  const active = variants[activeIdx];
  const [downloading, setDownloading] = useState(false);

  const onDownloadAll = async () => {
    setDownloading(true);
    try {
      await downloadFontAsZip(font);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <article className="bg-white border border-[#E5E5EA] rounded-xl overflow-hidden hover:border-[#1B1B1B] transition-colors group">
      {/* Preview */}
      <div
        className="px-5 md:px-6 py-7 md:py-9 border-b border-[#EDEDEF] min-h-[120px] flex items-center"
        style={{
          fontFamily: hasFiles ? `"${font.family}", system-ui, sans-serif` : "system-ui, sans-serif",
          fontSize: `${previewSize}px`,
          fontWeight: active?.weight || 400,
          fontStyle: active?.style || "normal",
          lineHeight: 1.05,
          color: "#1B1B1B",
          letterSpacing: "-0.02em",
        }}
      >
        <span className="break-words">
          {hasFiles ? previewText : "Add files to preview"}
        </span>
      </div>

      {/* Weight switcher */}
      {variants.length > 1 && (
        <div className="px-5 md:px-6 py-2.5 border-b border-[#EDEDEF] flex flex-wrap gap-1.5 bg-[#FAFAFB]">
          {variants.map((v, i) => {
            const isActive = i === activeIdx;
            return (
              <button
                key={`${v.weight}-${v.style}`}
                onClick={() => setActiveIdx(i)}
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full border tabular-nums transition-colors ${
                  isActive
                    ? "bg-[#1B1B1B] text-white border-[#1B1B1B]"
                    : "bg-white text-[#7A7A7A] border-[#E5E5EA] hover:border-[#1B1B1B] hover:text-[#1B1B1B]"
                }`}
                title={`${v.weight} ${v.style}`}
              >
                {v.weight}
                {v.style === "italic" && <em className="ml-0.5 not-italic">i</em>}
              </button>
            );
          })}
        </div>
      )}

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

        {hasFiles && (
          <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-[#EDEDEF]">
            <span className="text-[11px] text-[#7A7A7A]">
              {font.files.length === 1
                ? `${font.files[0].format.toUpperCase()} · ${formatBytes(font.files[0].fileSizeBytes)}`
                : `${font.files.length} weights · ${formatBytes(
                    font.files.reduce((sum, f) => sum + f.fileSizeBytes, 0),
                  )} total`}
            </span>
            <button
              onClick={onDownloadAll}
              disabled={downloading}
              className="text-[11px] font-medium text-[#1B1B1B] hover:underline inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-wait"
            >
              <ArrowDownTrayIcon className="size-3" />
              {downloading
                ? "Zipping…"
                : font.files.length === 1
                  ? "Download"
                  : "Download all"}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

// ── Add font modal: drop zone → group by family → metadata per group → submit
interface PendingFile {
  file: File;
  weight: number;
  style: "normal" | "italic";
  format: FontFileFormat;
}

interface PendingGroup {
  id: string;
  name: string;
  category: FontCategory;
  usage: FontUsage[];
  niches: string[];
  nicheInput: string;
  notes: string;
  files: PendingFile[];
}

function AddFontModal({
  onClose,
  onCreated,
  onError,
}: {
  onClose: () => void;
  onCreated: (createdIds: string[]) => void;
  onError: (msg: string) => void;
}) {
  const [groups, setGroups] = useState<PendingGroup[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState({
    groupDone: 0,
    groupTotal: 0,
    fileDone: 0,
    fileTotal: 0,
    currentName: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Walk a dropped DataTransferItemList recursively to handle folders
  const collectFilesFromItems = async (items: DataTransferItemList): Promise<File[]> => {
    const files: File[] = [];
    const walk = async (entry: FileSystemEntry): Promise<void> => {
      if (entry.isFile) {
        const fileEntry = entry as FileSystemFileEntry;
        await new Promise<void>((resolve) => {
          fileEntry.file((f) => {
            files.push(f);
            resolve();
          });
        });
      } else if (entry.isDirectory) {
        const dir = entry as FileSystemDirectoryEntry;
        const reader = dir.createReader();
        await new Promise<void>((resolve) => {
          const readBatch = () => {
            reader.readEntries(async (entries) => {
              if (!entries.length) return resolve();
              for (const e of entries) await walk(e);
              readBatch();
            });
          };
          readBatch();
        });
      }
    };
    const entries: FileSystemEntry[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const entry = item.webkitGetAsEntry?.();
      if (entry) entries.push(entry);
    }
    for (const entry of entries) await walk(entry);
    return files;
  };

  // Expand any .zip files in the dropped/picked list into their contained
  // fonts so the user can drop the Google Fonts download directly.
  const expandZips = async (files: File[]): Promise<File[]> => {
    const out: File[] = [];
    for (const f of files) {
      if (/\.zip$/i.test(f.name)) {
        try {
          const zip = await JSZip.loadAsync(await f.arrayBuffer());
          const entries = Object.values(zip.files).filter(
            (e) => !e.dir && FONT_FILE_EXT_RE.test(e.name),
          );
          for (const e of entries) {
            const blob = await e.async("blob");
            // Strip any path prefix Google Fonts adds inside the zip
            const baseName = e.name.split("/").pop() || e.name;
            out.push(new File([blob], baseName, { type: blob.type || "font/ttf" }));
          }
        } catch (err) {
          onError(`Couldn't read zip ${f.name}: ${err instanceof Error ? err.message : "unknown error"}`);
        }
      } else {
        out.push(f);
      }
    }
    return out;
  };

  const ingestFiles = async (rawFiles: File[]) => {
    const files = await expandZips(rawFiles);
    const fonts = files.filter((f) => FONT_FILE_EXT_RE.test(f.name));
    if (!fonts.length) {
      onError("No font files found. Drop a .zip or .woff2/.woff/.ttf/.otf");
      return;
    }

    // Group each file by its parsed family name
    const buckets = new Map<string, PendingFile[]>();
    for (const f of fonts) {
      const parsed = parseFontFilename(f.name);
      const ext = (f.name.match(FONT_FILE_EXT_RE)?.[1] || "ttf").toLowerCase() as FontFileFormat;
      const format = (FONT_FILE_FORMATS as readonly string[]).includes(ext)
        ? (ext as FontFileFormat)
        : "ttf";
      const pf: PendingFile = { file: f, weight: parsed.weight, style: parsed.style, format };
      const key = parsed.family;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(pf);
    }

    setGroups((prev) => {
      const next = [...prev];
      for (const [family, files] of buckets) {
        const existing = next.find((g) => g.name.toLowerCase() === family.toLowerCase());
        if (existing) {
          existing.files = [...existing.files, ...files];
        } else {
          next.push({
            id: crypto.randomUUID(),
            name: family,
            category: "sans",
            usage: [],
            niches: [],
            nicheInput: "",
            notes: "",
            files,
          });
        }
      }
      return next;
    });
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.items?.length) {
      const files = await collectFilesFromItems(e.dataTransfer.items);
      await ingestFiles(files);
    } else if (e.dataTransfer.files?.length) {
      await ingestFiles(Array.from(e.dataTransfer.files));
    }
  };

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    await ingestFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const updateGroup = (id: string, patch: Partial<PendingGroup>) =>
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));

  const removeGroup = (id: string) =>
    setGroups((prev) => prev.filter((g) => g.id !== id));

  const updateFile = (groupId: string, fileIdx: number, patch: Partial<PendingFile>) =>
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        return { ...g, files: g.files.map((f, i) => (i === fileIdx ? { ...f, ...patch } : f)) };
      }),
    );

  const removeFile = (groupId: string, fileIdx: number) =>
    setGroups((prev) =>
      prev.flatMap((g) => {
        if (g.id !== groupId) return [g];
        const files = g.files.filter((_, i) => i !== fileIdx);
        if (files.length === 0) return [];
        return [{ ...g, files }];
      }),
    );

  const submit = async () => {
    if (!groups.length || submitting) return;
    if (groups.some((g) => !g.name.trim())) {
      onError("Every font needs a name before you can submit.");
      return;
    }
    setSubmitting(true);
    const totalFiles = groups.reduce((s, g) => s + g.files.length, 0);
    setProgress({
      groupDone: 0,
      groupTotal: groups.length,
      fileDone: 0,
      fileTotal: totalFiles,
      currentName: groups[0].name,
    });

    const createdIds: string[] = [];
    let fileDone = 0;
    try {
      for (let gi = 0; gi < groups.length; gi++) {
        const g = groups[gi];
        setProgress((p) => ({ ...p, currentName: g.name }));

        const createRes = await fetch("/api/font-library", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: g.name.trim(),
            family: g.name.trim(),
            category: g.category,
            usage: g.usage,
            niches: g.niches,
            notes: g.notes,
          }),
        });
        const created = await createRes.json();
        if (!createRes.ok) {
          onError(`Create ${g.name} failed: ${created?.error || createRes.status}`);
          continue;
        }
        createdIds.push(created.id);

        // Upload this group's files sequentially. The /[id]/files endpoint
        // does a read-modify-write on the row's files JSONB array, so parallel
        // requests to the same font row race and clobber each other — only
        // the last write survives. Serializing here keeps every file in the
        // final array. Cross-group is still parallel-safe (different rows).
        for (const p of g.files) {
          const fd = new FormData();
          fd.append("file", p.file);
          fd.append("weight", String(p.weight));
          fd.append("style", p.style);
          const r = await fetch(`/api/font-library/${created.id}/files`, {
            method: "POST",
            body: fd,
          });
          if (!r.ok) {
            const err = await r.json().catch(() => ({}));
            onError(`Upload of ${p.file.name} failed: ${err?.error || r.status}`);
          }
          fileDone += 1;
          setProgress((prev) => ({ ...prev, fileDone }));
        }

        setProgress((p) => ({ ...p, groupDone: gi + 1 }));
      }
      onCreated(createdIds);
    } finally {
      setSubmitting(false);
    }
  };

  const empty = groups.length === 0;

  return (
    <ModalShell title="Add a font" onClose={onClose}>
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`relative rounded-xl border-2 border-dashed transition-colors ${
          dragOver
            ? "border-[#1B1B1B] bg-[#F3F3F5]"
            : empty
              ? "border-[#E5E5EA] bg-[#FAFAFB]"
              : "border-[#EDEDEF] bg-white"
        } px-5 py-8 text-center`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".zip,.woff2,.woff,.ttf,.otf"
          onChange={onPick}
          className="hidden"
          id="font-files-input"
        />
        <ArrowUpOnSquareIcon className="size-7 mx-auto text-[#7A7A7A] mb-2" />
        <p className="text-sm font-medium text-[#1B1B1B]">
          Drop the Google Fonts download here
        </p>
        <p className="text-xs text-[#7A7A7A] mt-1">
          .zip, .woff2, .woff, .ttf, or .otf — or{" "}
          <label
            htmlFor="font-files-input"
            className="font-medium text-[#1B1B1B] underline cursor-pointer"
          >
            pick a file
          </label>
        </p>
        <p className="text-[10px] text-[#A0A0A0] mt-2">
          Zips are unpacked client-side. Weight + style auto-detected from filenames.
        </p>
      </div>

      {/* Per-group sections */}
      {!empty && (
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7A7A7A]">
              {groups.length} font{groups.length === 1 ? "" : "s"} detected
              {" · "}
              {groups.reduce((s, g) => s + g.files.length, 0)} files
            </span>
            <button
              onClick={() => setGroups([])}
              className="text-[11px] text-[#7A7A7A] hover:text-[#1B1B1B] underline"
            >
              Clear all
            </button>
          </div>
          <div className="space-y-3">
            {groups.map((group) => (
              <PendingGroupCard
                key={group.id}
                group={group}
                onChange={(patch) => updateGroup(group.id, patch)}
                onFileChange={(fileIdx, patch) => updateFile(group.id, fileIdx, patch)}
                onFileRemove={(fileIdx) => removeFile(group.id, fileIdx)}
                onRemove={() => removeGroup(group.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 mt-6">
        {submitting && progress.fileTotal > 0 && (
          <span className="text-xs text-[#7A7A7A] mr-auto truncate">
            {progress.currentName
              ? `Adding ${progress.currentName} (${progress.groupDone + 1}/${progress.groupTotal}) — `
              : ""}
            {progress.fileDone}/{progress.fileTotal} files
          </span>
        )}
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-xs font-medium text-[#7A7A7A] hover:text-[#1B1B1B]"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={!groups.length || submitting}
          className="px-4 py-1.5 text-xs font-medium bg-[#1B1B1B] text-white rounded-lg hover:bg-[#2D2D2D] disabled:opacity-40"
        >
          {submitting
            ? "Uploading…"
            : groups.length === 1
              ? "Add to library"
              : `Add ${groups.length} fonts to library`}
        </button>
      </div>
    </ModalShell>
  );
}

// ── Pending group card — one detected font family in the Add modal ────────
function PendingGroupCard({
  group,
  onChange,
  onFileChange,
  onFileRemove,
  onRemove,
}: {
  group: PendingGroup;
  onChange: (patch: Partial<PendingGroup>) => void;
  onFileChange: (fileIdx: number, patch: Partial<PendingFile>) => void;
  onFileRemove: (fileIdx: number) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(true);

  const toggleUsage = (u: FontUsage) => {
    const next = group.usage.includes(u)
      ? group.usage.filter((x) => x !== u)
      : [...group.usage, u];
    onChange({ usage: next });
  };

  const addNiche = (n: string) => {
    const v = n.trim().toLowerCase();
    if (!v || group.niches.includes(v)) return;
    onChange({ niches: [...group.niches, v], nicheInput: "" });
  };

  return (
    <div className="rounded-lg border border-[#E5E5EA] bg-white">
      {/* Header — always visible */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#EDEDEF]">
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-[#7A7A7A] hover:text-[#1B1B1B] text-xs shrink-0"
          title={open ? "Collapse" : "Expand"}
        >
          {open ? "▾" : "▸"}
        </button>
        <input
          type="text"
          value={group.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Font name"
          className="flex-1 text-sm font-semibold px-2 py-1 border border-transparent hover:border-[#E5E5EA] focus:border-[#1B1B1B] focus:outline-none rounded bg-transparent"
        />
        <span className="text-[11px] text-[#A0A0A0] shrink-0">
          {group.files.length} file{group.files.length === 1 ? "" : "s"}
        </span>
        <button
          onClick={onRemove}
          className="text-[#A0A0A0] hover:text-red-600 shrink-0"
          title="Remove this font"
        >
          <XMarkIcon className="size-4" />
        </button>
      </div>

      {open && (
        <div className="px-3 py-3 space-y-3">
          {/* Files */}
          <ul className="rounded border border-[#EDEDEF] divide-y divide-[#EDEDEF]">
            {group.files.map((p, i) => (
              <li key={i} className="flex items-center gap-2 px-2 py-1.5 text-[11px]">
                <CheckCircleIcon className="size-3.5 text-emerald-500 shrink-0" />
                <span className="flex-1 truncate text-[#1B1B1B]">{p.file.name}</span>
                <select
                  value={p.weight}
                  onChange={(e) => onFileChange(i, { weight: parseInt(e.target.value, 10) })}
                  className="text-[11px] px-1.5 py-0.5 border border-[#E5E5EA] rounded"
                >
                  {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
                <select
                  value={p.style}
                  onChange={(e) =>
                    onFileChange(i, { style: e.target.value as "normal" | "italic" })
                  }
                  className="text-[11px] px-1.5 py-0.5 border border-[#E5E5EA] rounded"
                >
                  <option value="normal">Normal</option>
                  <option value="italic">Italic</option>
                </select>
                <button
                  onClick={() => onFileRemove(i)}
                  className="text-[#A0A0A0] hover:text-red-600"
                  title="Remove this file"
                >
                  <XMarkIcon className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>

          {/* Inline metadata */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7A7A7A] mr-1">
              Category
            </span>
            {FONT_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onChange({ category: c })}
                className={`text-[11px] px-2.5 py-0.5 rounded-full border ${
                  group.category === c
                    ? "bg-[#1B1B1B] text-white border-[#1B1B1B]"
                    : "bg-white text-[#1B1B1B] border-[#E5E5EA] hover:border-[#1B1B1B]"
                }`}
              >
                {FONT_CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7A7A7A] mr-1">
              Use for
            </span>
            {FONT_USAGE_OPTIONS.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => toggleUsage(u)}
                className={`text-[11px] px-2.5 py-0.5 rounded-full border ${
                  group.usage.includes(u)
                    ? "bg-[#1B1B1B] text-white border-[#1B1B1B]"
                    : "bg-white text-[#1B1B1B] border-[#E5E5EA] hover:border-[#1B1B1B]"
                }`}
              >
                {FONT_USAGE_LABELS[u]}
              </button>
            ))}
          </div>

          <NicheInput
            niches={group.niches}
            setNiches={(v) => onChange({ niches: v })}
            niche={group.nicheInput}
            setNiche={(v) => onChange({ nicheInput: v })}
            addNiche={addNiche}
          />

          <textarea
            value={group.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            rows={1}
            placeholder="Notes (optional) — pairing tips, license caveats…"
            className="w-full text-[12px] px-2 py-1.5 border border-[#E5E5EA] rounded focus:outline-none focus:border-[#1B1B1B] resize-y"
          />
        </div>
      )}
    </div>
  );
}

// ── Niche chip-input shared by Add + Edit modals ──────────────────────────
function NicheInput({
  niches,
  setNiches,
  niche,
  setNiche,
  addNiche,
}: {
  niches: string[];
  setNiches: (v: string[]) => void;
  niche: string;
  setNiche: (v: string) => void;
  addNiche: (n: string) => void;
}) {
  return (
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
  );
}

// ── Detail modal: edit metadata + manage files ────────────────────────────
function FontDetailModal({
  font,
  onClose,
  onPatch,
  onDelete,
  onFilesChanged,
}: {
  font: FontEntry;
  onClose: () => void;
  onPatch: (payload: Partial<FontEntry>) => Promise<FontEntry | null>;
  onDelete: () => void | Promise<void>;
  onFilesChanged: () => void | Promise<void>;
}) {
  const [name, setName] = useState(font.name);
  const [category, setCategory] = useState<FontCategory>(font.category);
  const [usage, setUsage] = useState<FontUsage[]>(font.usage);
  const [niches, setNiches] = useState<string[]>(font.niches);
  const [niche, setNiche] = useState("");
  const [notes, setNotes] = useState(font.notes);
  const [savingMeta, setSavingMeta] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [pendingWeight, setPendingWeight] = useState(400);
  const [pendingStyle, setPendingStyle] = useState<"normal" | "italic">("normal");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dirty =
    name !== font.name ||
    category !== font.category ||
    JSON.stringify(usage) !== JSON.stringify(font.usage) ||
    JSON.stringify(niches) !== JSON.stringify(font.niches) ||
    notes !== font.notes;

  const toggleUsage = (u: FontUsage) =>
    setUsage((prev) => (prev.includes(u) ? prev.filter((x) => x !== u) : [...prev, u]));

  const addNiche = (n: string) => {
    const v = n.trim().toLowerCase();
    if (!v || niches.includes(v)) return;
    setNiches([...niches, v]);
    setNiche("");
  };

  const saveMeta = async () => {
    setSavingMeta(true);
    try {
      await onPatch({ name: name.trim(), family: name.trim(), category, usage, niches, notes });
    } finally {
      setSavingMeta(false);
    }
  };

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

  return (
    <ModalShell title={font.name} onClose={onClose}>
      <div className="space-y-5">
        {/* Metadata */}
        <div className="space-y-3">
          <Field label="Name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
          <Field label="Niches">
            <NicheInput
              niches={niches}
              setNiches={setNiches}
              niche={niche}
              setNiche={setNiche}
              addNiche={addNiche}
            />
          </Field>
          <Field label="Notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full text-sm px-3 py-2 border border-[#E5E5EA] rounded-lg focus:outline-none focus:border-[#1B1B1B] resize-none"
            />
          </Field>
          {dirty && (
            <button
              onClick={saveMeta}
              disabled={savingMeta || !name.trim()}
              className="text-xs font-medium px-3 py-1.5 bg-[#1B1B1B] text-white rounded-lg hover:bg-[#2D2D2D] disabled:opacity-40"
            >
              {savingMeta ? "Saving…" : "Save changes"}
            </button>
          )}
        </div>

        {/* Add another file */}
        <div className="border-t border-[#EDEDEF] pt-5">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[#7A7A7A] mb-3">
            Add another file
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
                    {w}
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
              id="font-extra-file"
            />
            <label
              htmlFor="font-extra-file"
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer ${
                uploading
                  ? "bg-[#EDEDEF] text-[#7A7A7A] cursor-wait"
                  : "bg-[#1B1B1B] text-white hover:bg-[#2D2D2D]"
              }`}
            >
              <ArrowUpOnSquareIcon className="size-4" />
              {uploading ? "Uploading…" : "Pick file"}
            </label>
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
                .sort((a, b) => a.weight - b.weight || a.style.localeCompare(b.style))
                .map((file) => (
                  <li key={file.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#1B1B1B] truncate">{file.fileName}</p>
                      <p className="text-[10px] text-[#7A7A7A] mt-0.5">
                        {file.weight} · {file.style} · {file.format} ·{" "}
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
