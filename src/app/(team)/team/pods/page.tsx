import PodsIndexClient from "@/app/(dashboard)/pods-v2/client";

export const metadata = {
  title: "Pods · Team · Launchpad",
};

/* Team-scoped Pods route. Mounts the same client as /pods-v2 but inside
 * the (team) layout so the team sidebar + chrome stays consistent.
 * Admin-only buttons stay hidden via the pathname-based team-view
 * detection inside the client. */
export default function TeamPodsPage() {
  return <PodsIndexClient />;
}
