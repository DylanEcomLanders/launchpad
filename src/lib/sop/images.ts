/* ── SOP step images ──
 * Upload a step's visual to the public `sop-images` Supabase bucket and return
 * a directly-usable URL (public bucket = no signing). Falls back to an inline
 * data URL when Supabase isn't configured or the bucket is missing, so it still
 * works locally. Keep uploads small - data URLs live inside the SOP row.
 */

import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const BUCKET = "sop-images";

function inferExt(file: File): string {
  const m = file.name.match(/\.([a-z0-9]{1,5})$/i);
  if (m) return `.${m[1].toLowerCase()}`;
  if ((file.type || "").includes("png")) return ".png";
  if ((file.type || "").includes("webp")) return ".webp";
  return ".jpg";
}

function toDataUrl(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    } catch {
      resolve(null);
    }
  });
}

/** Upload a step image; returns a usable URL (public bucket URL, or a data URL
 *  fallback). Returns null only if everything fails. */
export async function uploadSopImage(
  file: File,
  sopId: string,
): Promise<string | null> {
  if (isSupabaseConfigured()) {
    try {
      const path = `${sopId}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}${inferExt(file)}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: "31536000",
        upsert: false,
        contentType: file.type || undefined,
      });
      if (!error) {
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
        if (data?.publicUrl) return data.publicUrl;
      } else {
        console.error("[sop/images] upload failed:", error);
      }
    } catch (err) {
      console.error("[sop/images] upload threw:", err);
    }
  }
  // Fallback: inline data URL (works offline / without the bucket).
  return toDataUrl(file);
}
