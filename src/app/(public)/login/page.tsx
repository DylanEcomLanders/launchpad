import { redirect } from "next/navigation";

/* /login is the canonical sign-in URL we share in invite messages
 * (Slack DMs, etc.). It just redirects to the dashboard root, where
 * the AuthGate wrapper renders the email + password sign-in form
 * for unauthed users and the role-appropriate home (admin → /company,
 * team → /me) for authed ones. Putting the route here under (public)
 * means it resolves cleanly even before sign-in, with no 404. */
export default function LoginRoute() {
  redirect("/");
}
