/* ── Ticket screenshot helpers ──
 * Single source for the upload + drop/paste behaviour. Anywhere a ticket
 * can accept screenshots (composer, card, triage), use these.
 */

/** Upload a single image file → public URL. Throws on failure. */
export async function uploadScreenshot(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/tickets/upload", {
    method: "POST",
    body: fd,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Upload failed (${res.status})`);
  }
  const data = await res.json();
  return data.url as string;
}

/** Filter a FileList / array of files to images only. */
export function filterImages(files: FileList | File[] | null | undefined): File[] {
  if (!files) return [];
  const arr = Array.from(files);
  return arr.filter((f) => f.type.startsWith("image/"));
}

/** Extract image files from a paste event. Returns [] if none. */
export function imagesFromPaste(e: ClipboardEvent | React.ClipboardEvent): File[] {
  const items = e.clipboardData?.items;
  if (!items) return [];
  const out: File[] = [];
  for (const item of Array.from(items)) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      const f = item.getAsFile();
      if (f) out.push(f);
    }
  }
  return out;
}

/** Upload a batch of files in parallel. Returns the URLs that succeeded;
 * silently drops any that failed (callers don't need to error-handle each). */
export async function uploadBatch(files: File[]): Promise<string[]> {
  const results = await Promise.allSettled(files.map(uploadScreenshot));
  return results
    .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
    .map((r) => r.value);
}
