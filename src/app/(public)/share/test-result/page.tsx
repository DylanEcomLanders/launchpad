import type { Metadata } from "next";
import ShareCard from "./client";

export const metadata: Metadata = {
  title: "Test result · Ecomlanders",
  robots: { index: false },
};

/* Public share-card page for a winning conversion test. Driven by URL
 * params (no DB lookup) so the page is fully shareable without
 * dragging client data through Supabase. The pod-detail screen
 * generates the link with the relevant params filled in.
 *
 * Rendered as a square card optimised for screenshot / social. The
 * client component handles the "Save as PNG" path. */
export default async function TestResultSharePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  return <ShareCard params={params} />;
}
