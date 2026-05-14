import StandupClient from "@/app/(dashboard)/pods-v2/standup/client";

export const metadata = {
  title: "Standup · Pods · Team · Launchpad",
};

/* Team-scoped Standup. Same client as /pods-v2/standup but rendered
 * inside the (team) layout so the team sidebar + chrome stay
 * consistent — fixes the "Standup button bounces to admin dashboard"
 * bug for team users clicking from /team/pods. */
export default function TeamStandupPage() {
  return <StandupClient />;
}
