/* ── Image upload to Supabase Storage ──
 *
 * Uploads a pasted / dropped image to a PUBLIC Storage bucket and returns its
 * permanent URL, so docs and test results reference a URL instead of carrying a
 * multi-MB base64 blob in the row + every browser's localStorage.
 *
 * Setup (one-time, in the Supabase dashboard): Storage → New bucket named
 * `cx-images`, marked Public. Until it exists, uploadImage returns null and the
 * callers fall back to inline base64, so nothing breaks in the meantime.
 */

import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const BUCKET = "cx-images";

export async function uploadImage(file: File): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type || "image/png",
      upsert: false,
    });
    if (error) return null; // bucket missing / offline -> caller falls back to base64
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data?.publicUrl || null;
  } catch {
    return null;
  }
}

/** Base64 fallback used when Storage is unavailable. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
