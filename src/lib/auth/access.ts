/* ── Who can see what: the single answer ──
 *
 * Access used to be defined in three places that didn't know about each other:
 *   1. isTeamAllowedPath()  (auth-gate)  - which ROUTES a member may load
 *   2. navSections          (sidebar)    - which ITEMS appear in the nav
 *   3. paletteItems         (sidebar)    - which items appear in ⌘K
 *
 * They drifted, in both directions, silently:
 *   - Hero Offer was gated out of the sidebar but left on the route list and
 *     in the palette, so it was one keystroke away from every member.
 *   - SOPs was in the member sidebar but never on the route list, so clicking
 *     it bounced them straight back out.
 *   - /workspace and /pods-v2 were reachable by typing the URL long after they
 *     stopped appearing in anyone's nav.
 *
 * Nobody catches those by reading three lists. So there is one list now, here,
 * and all three read from it. "What can a member see" has a single answer you
 * can check in ten seconds.
 *
 * The rule: a member sees the WORK, not the BUSINESS. Anything answering "what
 * is this client worth", "how is this person performing", or "what do we
 * charge" is admin/CRO. Anything answering "what am I building, and where does
 * it sit" is everyone's.
 */

export type Role = "admin" | "cro" | "team";

/** Route prefixes a MEMBER (team role) may load. Everything else redirects
 *  them to /my-work. Admin + CRO are unrestricted.
 *
 *  Matching is by prefix on a path SEGMENT: "/me" matches "/me" and "/me/x"
 *  but never "/members". Prefix-matching without the boundary check is how you
 *  accidentally open a route that merely starts with the same letters. */
export const TEAM_ROUTES: readonly string[] = [
  "/my-work", // their tasks; also their landing after login
  "/kanban", // Delivery - the board, read-only (canManage gates the edits)
  "/tools/onboarding-inbox", // members handle new-client intake
  "/tools/sop-library", // SOPs
  "/wiki-v2", // Training
  "/team", // Team Tools (the tool pages; /team itself redirects)
  "/me", // profile, password, and Submit Invoice (/me/invoices)
  "/portal", // client portal (token-scoped; not an internal surface)
  "/rd", // R&D tracker - the team contributes ideas
  "/changelog", // what shipped
] as const;

/* Deliberately NOT on the list, so the next person doesn't wonder:
 *   /hero-offer  commercial - how the offer is positioned + priced
 *   /clients     client health, renewal, MRR
 *   /results-engine, /kpi   performance reporting
 *   /sales, /outbound, /finance, /company, /admin
 *   /workspace, /pods-v2, /tasks   legacy, superseded by Delivery + My Tasks
 */

/** Can this role load this path? */
export function canAccessPath(role: Role, pathname: string): boolean {
  if (role !== "team") return true; // admin + cro: unrestricted
  return TEAM_ROUTES.some(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  );
}

/** Can this role see a nav item / palette entry pointing at `href`?
 *  Same source as the route gate, so the nav can't offer a member something
 *  the router will bounce, and can't hide something they can still reach. */
export function canSeeHref(role: Role, href: string): boolean {
  return canAccessPath(role, href);
}
