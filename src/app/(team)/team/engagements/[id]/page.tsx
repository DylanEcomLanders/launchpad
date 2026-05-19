import EngagementDetailPage from "@/app/(dashboard)/engagements/[id]/page";

export const metadata = {
  title: "Engagement · Team · Launchpad",
};

/* Team-scoped engagement detail. Mounts the same client as
 * /engagements/[id] but inside the (team) layout so the team
 * sidebar/chrome stays consistent. Admin-only actions (delete,
 * purgatory nudge) are hidden via pathname detection inside the
 * detail client. */
export default function TeamEngagementDetailPage() {
  return <EngagementDetailPage />;
}
