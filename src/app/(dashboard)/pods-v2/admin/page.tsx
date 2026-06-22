import { redirect } from "next/navigation";

/* /pods-v2/admin was deprecated 2026-06-22. Pod assignment is now
 * managed canonically from /company/pods (the Admin → Pods tab) so
 * the team has one place to slot Persons into pod roles. This
 * redirect preserves any existing bookmarks. */
export default function PodsAdminPage() {
  redirect("/company/pods");
}
