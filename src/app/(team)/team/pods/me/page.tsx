import MeClient from "@/app/(dashboard)/pods-v2/me/client";

export const metadata = {
  title: "Today · Pods · Team · Launchpad",
};

/* Team-scoped Today (per-member focused view). Same client as
 * /pods-v2/me but rendered inside the (team) layout. */
export default function TeamMePage() {
  return <MeClient />;
}
