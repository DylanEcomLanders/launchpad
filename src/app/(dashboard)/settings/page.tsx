import { redirect } from "next/navigation";

/* Company Settings moved into the Company area (/company/settings). This
 * legacy route redirects so old links and bookmarks keep working. */
export default function SettingsRedirect() {
  redirect("/company/settings");
}
