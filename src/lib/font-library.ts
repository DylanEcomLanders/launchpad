// Font Library — curated team-approved fonts.
// Storage: Supabase `font_library` table + `font-library` storage bucket.

export const FONT_CATEGORIES = ["sans", "serif", "display", "script", "monospace"] as const;
export type FontCategory = (typeof FONT_CATEGORIES)[number];

export const FONT_CATEGORY_LABELS: Record<FontCategory, string> = {
  sans: "Sans-serif",
  serif: "Serif",
  display: "Display",
  script: "Script / Handwriting",
  monospace: "Monospace",
};

export const FONT_USAGE_OPTIONS = ["heading", "body"] as const;
export type FontUsage = (typeof FONT_USAGE_OPTIONS)[number];

export const FONT_USAGE_LABELS: Record<FontUsage, string> = {
  heading: "Heading",
  body: "Body",
};

// Niche tags — ecom verticals + brand vibes. Used for filtering. Free-form
// strings are also allowed at upload time so the team can add new ones, but
// these are surfaced as quick-pick chips in the UI.
export const FONT_NICHES = [
  // Verticals
  "beauty",
  "supplements",
  "apparel",
  "food",
  "pet",
  "homeware",
  "tech",
  "wellness",
  "outdoor",
  "kids",
  // Vibes
  "luxury",
  "premium",
  "minimal",
  "bold",
  "editorial",
  "playful",
  "masculine",
  "feminine",
  "streetwear",
  "vintage",
  "modern",
] as const;

export const FONT_FILE_FORMATS = ["woff2", "woff", "ttf", "otf"] as const;
export type FontFileFormat = (typeof FONT_FILE_FORMATS)[number];
export const FONT_FILE_EXT_RE = /\.(woff2|woff|ttf|otf)$/i;

export interface FontFile {
  id: string;
  weight: number;            // 100..900
  style: "normal" | "italic";
  format: FontFileFormat;
  storagePath: string;       // e.g. "<fontId>/inter-400.woff2"
  fileName: string;
  fileSizeBytes: number;
  publicUrl: string;
  uploadedAt: string;
}

export interface FontEntry {
  id: string;
  name: string;
  family: string;
  category: FontCategory;
  usage: FontUsage[];
  niches: string[];
  notes: string;
  googleFontsUrl: string;
  files: FontFile[];
  createdAt: string;
  updatedAt: string;
}

// DB row (snake_case) → app shape (camelCase)
export interface FontRow {
  id: string;
  name: string;
  family: string;
  category: string;
  usage: string[];
  niches: string[];
  notes: string;
  google_fonts_url: string;
  files: FontFile[]; // JSONB — already in our app shape
  created_at: string;
  updated_at: string;
}

export function fromRow(row: FontRow): FontEntry {
  const cat = (FONT_CATEGORIES as readonly string[]).includes(row.category)
    ? (row.category as FontCategory)
    : "sans";
  const usage = (row.usage || []).filter((u): u is FontUsage =>
    (FONT_USAGE_OPTIONS as readonly string[]).includes(u),
  );
  return {
    id: row.id,
    name: row.name,
    family: row.family,
    category: cat,
    usage,
    niches: row.niches || [],
    notes: row.notes || "",
    googleFontsUrl: row.google_fonts_url || "",
    files: Array.isArray(row.files) ? row.files : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Pick the best file to use for live previewing in-browser. Prefer woff2 → woff
// → ttf → otf. Within format, prefer regular (400/normal) → 500 → 600 → first.
export function pickPreviewFile(files: FontFile[]): FontFile | null {
  if (!files.length) return null;
  const normal = files.filter((f) => f.style === "normal");
  const pool = normal.length ? normal : files;
  const formatRank: Record<FontFileFormat, number> = { woff2: 0, woff: 1, ttf: 2, otf: 3 };
  const weightRank = (w: number) => Math.abs(w - 400);
  return [...pool].sort((a, b) => {
    const f = formatRank[a.format] - formatRank[b.format];
    if (f !== 0) return f;
    return weightRank(a.weight) - weightRank(b.weight);
  })[0];
}

// Format-token ↔ MIME map for upload + @font-face usage.
export const FORMAT_MIME: Record<FontFileFormat, string> = {
  woff2: "font/woff2",
  woff: "font/woff",
  ttf: "font/ttf",
  otf: "font/otf",
};

export const FORMAT_FONTFACE_TOKEN: Record<FontFileFormat, string> = {
  woff2: "woff2",
  woff: "woff",
  ttf: "truetype",
  otf: "opentype",
};

export function formatBytes(b: number): string {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}
