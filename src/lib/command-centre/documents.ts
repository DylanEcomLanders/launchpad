/* ── Client documents storage ──────────────────────────────────────
 *
 * PDFs (invoices, agreements, anything) attached to a client engagement
 * upload to the `client-documents` Supabase bucket. The engagement (in the
 * command-centre store) holds only the file METADATA (name, path, size); the
 * bytes live in storage. The bucket is private, so display mints short-lived
 * signed URLs - same pattern as kanban screenshots.
 *
 * Billing itself lives in Xero; this is just a place to keep reference PDFs on
 * the client profile.
 *
 * Requires the `client-documents` bucket to exist (create from the Supabase
 * dashboard). Until it does, uploadClientDocument returns null and the caller
 * surfaces a friendly error - nothing crashes.
 */

import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const BUCKET = "client-documents";
const SIGN_TTL_SECONDS = 24 * 60 * 60;

export function isStoragePath(value: string | undefined | null): boolean {
  if (!value) return false;
  return !value.startsWith("http") && !value.startsWith("data:");
}

/* Upload one file to client-documents, namespaced by engagement id so an
 * accidental same-name upload on another engagement can't clobber it. Returns
 * the bucket path, or null on any failure (unconfigured / missing bucket). */
export async function uploadClientDocument(
  file: File,
  engagementId: string,
): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const ext = inferExt(file);
    const path = `${engagementId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "31536000",
      upsert: false,
      contentType: file.type || undefined,
    });
    if (error) {
      console.error("[cc/documents] upload failed:", error);
      return null;
    }
    return path;
  } catch (err) {
    console.error("[cc/documents] upload threw:", err);
    return null;
  }
}

/* Batch-sign paths for display. Returns a { path -> signed URL } map. */
export async function signDocumentPaths(
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
      console.error("[cc/documents] createSignedUrls failed:", error);
      return {};
    }
    for (const row of data ?? []) {
      if (row.signedUrl && row.path) out[row.path] = row.signedUrl;
    }
  } catch (err) {
    console.error("[cc/documents] sign threw:", err);
  }
  return out;
}

/* Remove a document from storage. Fire-and-forget - the metadata removal in the
 * store is what matters for correctness. */
export async function deleteClientDocument(path: string): Promise<void> {
  if (!isSupabaseConfigured() || !isStoragePath(path)) return;
  try {
    await supabase.storage.from(BUCKET).remove([path]);
  } catch (err) {
    console.error("[cc/documents] delete failed:", err);
  }
}

/* Keep the original file extension so PDFs stay PDFs and a doc/xlsx still opens
 * in the right app. Falls back to .pdf (the common case). */
function inferExt(file: File): string {
  const m = file.name.match(/\.([a-z0-9]{1,5})$/i);
  if (m) return `.${m[1].toLowerCase()}`;
  if ((file.type || "").includes("pdf")) return ".pdf";
  return ".pdf";
}
