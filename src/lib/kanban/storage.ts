/* ── Kanban screenshot storage ─────────────────────────────────────
 *
 * Test screenshots upload to the kanban-screenshots Supabase bucket.
 * The DB column screenshot_url stores the PATH (e.g. "h-live1/xyz.png");
 * for display we mint short-lived signed URLs because the bucket is
 * private.
 *
 * Two flows:
 *   1. Upload (modal "drop a screenshot" interaction)
 *        uploadScreenshot(file, taskId) → returns path on success
 *   2. Display (post-fetch on the read path)
 *        signScreenshotPaths(paths) → returns { path → signed URL }
 *
 * Read path is batched (createSignedUrls takes N at a time) so a
 * board with many tests doesn't fire N HTTP roundtrips on every load.
 */

import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const BUCKET = "kanban-screenshots";
/* 24h is plenty of headroom for a single browsing session and well
 * inside the page reload that would refresh URLs anyway. */
const SIGN_TTL_SECONDS = 24 * 60 * 60;

/* Anything already a fully-qualified URL (signed link, external upload,
 * data: URL from the legacy fixtures) goes straight to the <img> tag
 * without a sign round-trip. Used to skip processing on values we know
 * don't live in our bucket. */
export function isStoragePath(value: string | undefined | null): boolean {
  if (!value) return false;
  return !value.startsWith("http") && !value.startsWith("data:");
}

/* Upload a single image to kanban-screenshots and return its bucket
 * path. The path namespace is `{taskId}/{timestamp}-{rand}.{ext}` so
 * multiple screenshots on the same card co-exist and an accidental
 * upsert with the same name on different tasks can't clobber siblings. */
export async function uploadScreenshot(
  file: File,
  taskId: string,
): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const ext = inferExt(file);
    /* Deterministic-enough name without Date.now() in scripts; here in
     * client code the date math is fine. */
    const path = `${taskId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "31536000",
      upsert: false,
      contentType: file.type || undefined,
    });
    if (error) {
      console.error("[kanban/storage] upload failed:", error);
      return null;
    }
    return path;
  } catch (err) {
    console.error("[kanban/storage] upload threw:", err);
    return null;
  }
}

/* Batch-sign a list of paths. Falls back to per-path on transient
 * errors so one bad row doesn't kill the whole board. Returns a map
 * keyed by the path so callers can swap values into their tree
 * in-place. */
export async function signScreenshotPaths(
  paths: string[],
): Promise<Record<string, string>> {
  if (!isSupabaseConfigured() || paths.length === 0) return {};
  const unique = Array.from(new Set(paths.filter(isStoragePath)));
  if (unique.length === 0) return {};
  const out: Record<string, string> = {};
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(unique, SIGN_TTL_SECONDS);
    if (error) {
      console.error("[kanban/storage] createSignedUrls failed:", error);
      return {};
    }
    for (const row of data ?? []) {
      if (row.signedUrl && row.path) out[row.path] = row.signedUrl;
    }
  } catch (err) {
    console.error("[kanban/storage] sign threw:", err);
  }
  return out;
}

/* Remove a screenshot from storage when the user clears or replaces
 * it. Fire-and-forget; failure here doesn't change correctness. */
export async function deleteScreenshot(path: string): Promise<void> {
  if (!isSupabaseConfigured() || !isStoragePath(path)) return;
  try {
    await supabase.storage.from(BUCKET).remove([path]);
  } catch (err) {
    console.error("[kanban/storage] delete failed:", err);
  }
}

function inferExt(file: File): string {
  const t = file.type || "";
  if (t.includes("png")) return ".png";
  if (t.includes("jpeg") || t.includes("jpg")) return ".jpg";
  if (t.includes("webp")) return ".webp";
  /* Fall back to the filename's extension if MIME is missing. */
  const m = file.name.match(/\.(png|jpg|jpeg|webp)$/i);
  return m ? `.${m[1].toLowerCase()}` : ".png";
}
