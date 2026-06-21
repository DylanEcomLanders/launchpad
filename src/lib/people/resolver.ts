/* ── People resolver ─────────────────────────────────────────────
 *
 * The launchpad codebase has three overlapping "person" shapes that
 * grew up at different times and aren't FK-linked at the DB level:
 *
 *   - PodMember (pods_v2_pods.members)  drives kanban + workspace
 *   - TeamMember (business_settings.team) drives tools + sales-engine
 *   - Person (company_people)            drives HR / Admin
 *
 * Person is becoming the canonical HR record. Person.pod_member_id
 * bridges to PodMember so the per-person KPI tab can pull kanban
 * delivery data without anybody hand-mapping names. TeamMember stays
 * around as business config (NDA flags, slack ids) but resolves to
 * Person via name + email matching for now - we don't have an
 * explicit FK on TeamMember yet.
 *
 * Everything here is pure derivation - reads Person / PodMember /
 * TeamMember arrays passed by callers and returns matches. No
 * Supabase calls; callers own the fetch.
 */

import type { Person } from "@/lib/company/types";
import type { PodMember } from "@/lib/pods-v2/types";
import type { TeamMember } from "@/lib/settings";

/* PodMember → Person via the explicit pod_member_id link.
 * O(n) over people; the cohort is small (<50) so no indexing yet. */
export function personByPodMemberId(
  podMemberId: string | undefined,
  people: Person[],
): Person | null {
  if (!podMemberId) return null;
  return people.find((p) => p.pod_member_id === podMemberId) ?? null;
}

/* Person → PodMember via the explicit pod_member_id link. */
export function podMemberByPersonId(
  personId: string,
  people: Person[],
  podMembers: PodMember[],
): PodMember | null {
  const person = people.find((p) => p.id === personId);
  if (!person?.pod_member_id) return null;
  return podMembers.find((m) => m.id === person.pod_member_id) ?? null;
}

/* TeamMember (settings.team) → Person via name + email matching.
 * TeamMember has no pod_member_id today so we infer the link.
 * Email match wins (unique), name match falls back (case-insensitive
 * trim). When TeamMember gets its own pod_member_id field in a later
 * PR this can switch to an explicit FK lookup. */
export function personByTeamMember(
  teamMember: TeamMember,
  people: Person[],
): Person | null {
  const email = teamMember.email?.trim().toLowerCase();
  if (email) {
    const hit = people.find((p) => p.email?.trim().toLowerCase() === email);
    if (hit) return hit;
  }
  const name = teamMember.name.trim().toLowerCase();
  return (
    people.find((p) => p.full_name.trim().toLowerCase() === name) ?? null
  );
}

/* PodMember → TeamMember via Person. Useful when surfaces that
 * traditionally consumed TeamMember (tickets, lead magnets) want to
 * resolve through the canonical Person record. Returns null if the
 * PodMember isn't linked to any Person or the Person isn't in the
 * TeamMember directory. */
export function teamMemberByPodMemberId(
  podMemberId: string,
  people: Person[],
  team: TeamMember[],
): TeamMember | null {
  const person = personByPodMemberId(podMemberId, people);
  if (!person) return null;
  return (
    team.find(
      (tm) =>
        (tm.email?.trim().toLowerCase() ===
          person.email?.trim().toLowerCase() &&
          !!person.email) ||
        tm.name.trim().toLowerCase() === person.full_name.trim().toLowerCase(),
    ) ?? null
  );
}

/* Kanban assigns by NAME (designer / developer string fields). This
 * helper takes a kanban assignee name and returns the canonical
 * Person record, resolving via the linked PodMember when possible
 * and falling back to name matching against Person.full_name when
 * the kanban name doesn't correspond to a PodMember (e.g. a copy
 * contractor not in a pod). */
export function personByKanbanName(
  kanbanName: string | undefined,
  people: Person[],
  podMembers: PodMember[],
): Person | null {
  if (!kanbanName) return null;
  const needle = kanbanName.trim().toLowerCase();
  /* Pass 1: kanban name → PodMember.name → Person via pod_member_id. */
  const pm = podMembers.find((m) => m.name.trim().toLowerCase() === needle);
  if (pm) {
    const p = personByPodMemberId(pm.id, people);
    if (p) return p;
  }
  /* Pass 2: kanban name → Person.full_name directly. Catches non-pod
   * humans (founders, ops, copy contractors). */
  return (
    people.find((p) => p.full_name.trim().toLowerCase() === needle) ?? null
  );
}
