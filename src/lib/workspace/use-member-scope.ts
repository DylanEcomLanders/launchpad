"use client";

// Member scoping for Workspace. Team members are scoped to their own pod —
// they don't get the all-pods Overview / Pods list / Clients list. Calling
// this hook on those pages redirects a member to their pod board (or My Work
// if their account isn't linked to a pod member yet). Admins/CRO are
// unaffected (returns false, render normally).

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Pod } from "@/lib/pods-v2/types";
import { useCurrentUser } from "@/components/auth-gate";
import { podIdForMember } from "./derive";

/** Returns true while a member should NOT see the all-pods view (loading or
 * mid-redirect), so the caller can render a skeleton instead of flashing it. */
export function useMemberScopeRedirect(pods: Pod[], loading: boolean): boolean {
  const me = useCurrentUser();
  const router = useRouter();
  const isMember = me?.role === "team";

  const myPodId = useMemo(
    () => (isMember ? podIdForMember(pods, me?.pod_member_id ?? null) : null),
    [isMember, pods, me],
  );

  useEffect(() => {
    if (loading || !isMember) return;
    router.replace(myPodId ? `/workspace/pods/${myPodId}` : "/my-work");
  }, [loading, isMember, myPodId, router]);

  return isMember;
}
