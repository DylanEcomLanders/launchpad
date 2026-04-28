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

// ── Parse a Google-Fonts-style filename ────────────────────────────────────
// Examples:
//   "Inter-Regular.ttf"                  → { family: "Inter",       weight: 400, style: "normal" }
//   "Inter-Bold.ttf"                     → { family: "Inter",       weight: 700, style: "normal" }
//   "Inter-BoldItalic.ttf"               → { family: "Inter",       weight: 700, style: "italic" }
//   "Inter-Italic.ttf"                   → { family: "Inter",       weight: 400, style: "italic" }
//   "Inter-VariableFont_wght.ttf"        → { family: "Inter",       weight: 400, style: "normal" }
//   "Inter-Italic-VariableFont_wght.ttf" → { family: "Inter",       weight: 400, style: "italic" }
//   "OpenSans-Bold.ttf"                  → { family: "Open Sans",   weight: 700, style: "normal" }
//   "PlayfairDisplay-MediumItalic.ttf"   → { family: "Playfair Display", weight: 500, style: "italic" }

export function prettifyFamily(raw: string): string {
  return raw
    // Strip optical-size suffixes like "_18pt", "_24pt", "_36pt" — these are
    // different sizes of the same family (DM Sans, Roboto Flex, etc.), not
    // separate fonts, so they should all collapse to one group.
    .replace(/_\d+pt\b/gi, "")
    .replace(/[-_]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2") // split CamelCase: "OpenSans" → "Open Sans"
    .replace(/\s+/g, " ")
    .trim();
}

const WEIGHT_NAME_MAP: Record<string, number> = {
  thin: 100,
  hairline: 100,
  extralight: 200,
  ultralight: 200,
  light: 300,
  regular: 400,
  normal: 400,
  book: 400,
  medium: 500,
  semibold: 600,
  demibold: 600,
  bold: 700,
  extrabold: 800,
  ultrabold: 800,
  black: 900,
  heavy: 900,
};

export interface ParsedFontName {
  family: string;
  weight: number;
  style: "normal" | "italic";
}

export function parseFontFilename(filename: string): ParsedFontName {
  const base = filename.replace(/\.(woff2|woff|ttf|otf)$/i, "");

  // Variable fonts: "Family-VariableFont_wght" or "Family-Italic-VariableFont_wght"
  const varMatch = base.match(/^(.+?)-(?:([A-Za-z]+)-)?VariableFont/i);
  if (varMatch) {
    const family = prettifyFamily(varMatch[1]);
    const styleSpec = (varMatch[2] || "").toLowerCase();
    return {
      family,
      weight: 400,
      style: styleSpec.includes("italic") ? "italic" : "normal",
    };
  }

  // "Family-WeightItalic" / "Family-Weight" / "Family-Italic" / "Family"
  const m = base.match(/^(.+?)-([A-Za-z]+)$/);
  if (m) {
    const family = prettifyFamily(m[1]);
    const styleSpec = m[2].toLowerCase();
    const isItalic = styleSpec.endsWith("italic");
    const weightName = isItalic ? styleSpec.replace(/italic$/, "") : styleSpec;
    if (!weightName) {
      // "Family-Italic"
      return { family, weight: 400, style: "italic" };
    }
    const weight = WEIGHT_NAME_MAP[weightName] ?? 400;
    return { family, weight, style: isItalic ? "italic" : "normal" };
  }

  // Fallback: bare filename
  return { family: prettifyFamily(base), weight: 400, style: "normal" };
}

// Pick the most likely shared family name across a batch of files. Falls back
// to whatever individual files report if there's no consistent prefix.
export function inferFamilyFromBatch(files: { name: string }[]): string {
  if (!files.length) return "";
  const parsed = files.map((f) => parseFontFilename(f.name));
  const counts = new Map<string, number>();
  parsed.forEach((p) => counts.set(p.family, (counts.get(p.family) || 0) + 1));
  let best = parsed[0].family;
  let max = 0;
  counts.forEach((c, fam) => {
    if (c > max) {
      max = c;
      best = fam;
    }
  });
  return best;
}
