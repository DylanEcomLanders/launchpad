/* ── Loom URL helpers ── */

/**
 * Extract the Loom video ID from various URL formats:
 * - https://www.loom.com/share/abc123
 * - https://loom.com/share/abc123
 * - https://www.loom.com/embed/abc123
 * - https://www.loom.com/share/abc123?sid=xyz
 */
export function extractLoomId(url: string): string | null {
  const match = url.match(
    /loom\.com\/(?:share|embed)\/([a-f0-9]+)/i
  );
  return match?.[1] ?? null;
}

/**
 * Convert any Loom URL to an embeddable iframe src.
 * Returns null if the URL isn't a valid Loom link.
 */
export function toLoomEmbed(url: string): string | null {
  const id = extractLoomId(url);
  if (!id) return null;
  return `https://www.loom.com/embed/${id}`;
}

/**
 * Quick check if a URL looks like a Loom link.
 */
export function isLoomUrl(url: string): boolean {
  return /loom\.com\/(?:share|embed)\//i.test(url);
}
