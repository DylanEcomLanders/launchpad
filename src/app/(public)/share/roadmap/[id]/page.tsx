import type { Metadata } from "next";
import RoadmapDeck from "./client";

export const metadata: Metadata = {
  title: "Project roadmap · Ecomlanders",
  robots: { index: false },
};

/* Public roadmap deck. Auto-generated from the engagement data for the
 * given client id. Same 3-tier lookup hierarchy as /engagements/[id]:
 *   localStorage-created → pods-v2 Supabase Client → MOCK_ENGAGEMENTS.
 *
 * Client-rendered so all three sources are reachable through a single
 * code path. No auth, designed to be shared with the client.
 */
export default async function RoadmapSharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RoadmapDeck engagementId={id} />;
}
