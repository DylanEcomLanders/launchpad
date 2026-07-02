"use client";

/* ── Admin / Pods ──
 *
 * THE source of truth for team composition. Replaces /pods-v2/admin
 * (which redirects here). Define a pod, slot Persons into roles,
 * and every other surface in Launchpad (kanban project assignment,
 * KPIs, retention attribution) reads from this.
 *
 * Each pod card lists role-grouped slots. Each slot is a
 * PersonPicker that writes Person.id → PodMember.person_id. The
 * pod data layer hydration step then stamps the slot's name +
 * avatar from the linked Person, so renames in /company/people
 * propagate everywhere automatically.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PlusIcon,
  UserGroupIcon,
  TrashIcon,
  PencilSquareIcon,
  CheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { PersonPicker } from "@/components/person-picker";
import {
  getPods,
  createPod,
  deletePod,
  updatePodIdentity,
  addPodMember,
  removePodMember,
  linkPersonToPodMember,
  updateMemberRole,
} from "@/lib/pods-v2/data";
import { ROLE_LABEL, type Pod, type PodMember, type PodMemberRole } from "@/lib/pods-v2/types";
import { peopleStore } from "@/lib/company/data";
import type { Person } from "@/lib/company/types";
import { inputClass } from "@/lib/form-styles";

/* Role ordering for display - keep leads first so the pod's identity
 * reads top-down (strategist → designers → devs). */
const ROLE_ORDER: PodMemberRole[] = [
  "cro_lead",
  "primary_designer",
  "secondary_designer",
  "primary_dev",
  "secondary_dev",
];

export default function PodsPanel() {
  const [pods, setPods] = useState<Pod[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [hydrated, setHydrated] = useState(false);

  function refresh() {
    setPods(getPods());
  }

  useEffect(() => {
    refresh();
    peopleStore.getAll().then((rows) => {
      setPeople(rows);
      setHydrated(true);
    });
  }, []);

  function handleCreate() {
    const name = window.prompt("Pod name (e.g. 'Pod 1', 'Spine pod')");
    if (!name) return;
    createPod({ name });
    refresh();
  }

  function handleDelete(pod: Pod) {
    if (!window.confirm(`Delete "${pod.name}"? Its members will be unassigned.`)) return;
    deletePod(pod.id);
    refresh();
  }

  if (!hydrated) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-64 bg-background rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  /* Unlinked Persons - team members not slotted into any pod yet.
   * Useful prompt at the top of the panel so admin knows who needs
   * placement. Excludes 'left' status (they shouldn't be in a pod). */
  const linkedPersonIds = new Set(
    pods.flatMap((p) => p.members.map((m) => m.person_id).filter(Boolean) as string[]),
  );
  const unlinked = people.filter(
    (p) => p.status !== "left" && !linkedPersonIds.has(p.id),
  );

  return (
    <div className="space-y-5">
      {/* Top callout: unlinked Persons. Only shows if there are some -
       * silent when everyone's slotted. */}
      {unlinked.length > 0 && (
        <div className="bg-amber-500/[0.06] rounded-xl ring-1 ring-amber-500/20 p-4 flex items-start gap-3">
          <UserGroupIcon className="size-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-amber-100 mb-0.5">
              {unlinked.length} {unlinked.length === 1 ? "person isn't" : "people aren't"} on a pod yet
            </div>
            <div className="text-[12px] text-amber-200/80">
              {unlinked
                .slice(0, 6)
                .map((p) => p.preferred_name || p.full_name)
                .join(" · ")}
              {unlinked.length > 6 && ` · +${unlinked.length - 6} more`}
            </div>
            <div className="text-[11px] text-amber-200/60 mt-1">
              Slot them into a pod below, or leave unassigned if they don't deliver work (founders, ops, etc.).
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wider text-subtle font-semibold">
          {pods.length} pod{pods.length === 1 ? "" : "s"}
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold uppercase tracking-wider bg-white text-background hover:bg-foreground"
        >
          <PlusIcon className="size-3.5" />
          New pod
        </button>
      </div>

      {pods.length === 0 ? (
        <div className="bg-background rounded-2xl ring-1 ring-white/[0.04] p-12 text-center">
          <UserGroupIcon className="size-8 text-subtle mx-auto mb-3" />
          <p className="text-sm text-foreground mb-1">No pods yet.</p>
          <p className="text-[12px] text-subtle">
            Create your first pod above. Slot Persons from /company/people into Strategist / Designer / Developer / Copy roles. Kanban + KPIs read from here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {pods.map((pod) => (
            <PodCard
              key={pod.id}
              pod={pod}
              onChange={refresh}
              onDelete={() => handleDelete(pod)}
            />
          ))}
        </div>
      )}

      <p className="text-[11px] text-subtle italic">
        Pods defined here are the canonical roster. Kanban project assignment + KPI attribution + retention CSM all read from this. Renames in <Link href="/company/people" className="text-foreground hover:underline">/company/people</Link> propagate to every slot below.
      </p>
    </div>
  );
}

function PodCard({
  pod,
  onChange,
  onDelete,
}: {
  pod: Pod;
  onChange: () => void;
  onDelete: () => void;
}) {
  const [editingIdentity, setEditingIdentity] = useState(false);
  const [nameDraft, setNameDraft] = useState(pod.name);
  const [taglineDraft, setTaglineDraft] = useState(pod.tagline);

  /* Sort members by ROLE_ORDER so the slot list reads top-down. */
  const sortedMembers = [...pod.members].sort(
    (a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role),
  );

  function saveIdentity() {
    updatePodIdentity(pod.id, nameDraft, taglineDraft);
    onChange();
    setEditingIdentity(false);
  }

  function handleAddSlot(role: PodMemberRole) {
    addPodMember(pod.id, role);
    onChange();
  }

  return (
    <div className="bg-background rounded-2xl ring-1 ring-white/[0.04] shadow-[0_8px_32px_rgba(0,0,0,0.35)] overflow-hidden">
      {/* Header */}
      <div className="p-5 pb-3 border-b border-white/[0.04]">
        {editingIdentity ? (
          <div className="space-y-2">
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="Pod name"
              className={`${inputClass} h-8 text-[14px] font-semibold`}
            />
            <input
              value={taglineDraft}
              onChange={(e) => setTaglineDraft(e.target.value)}
              placeholder="Tagline (e.g. Barnaby's pod)"
              className={`${inputClass} h-7 text-[12px]`}
            />
            <div className="flex items-center justify-end gap-1">
              <button
                onClick={() => {
                  setNameDraft(pod.name);
                  setTaglineDraft(pod.tagline);
                  setEditingIdentity(false);
                }}
                className="p-1 rounded text-subtle hover:text-foreground"
              >
                <XMarkIcon className="size-3.5" />
              </button>
              <button
                onClick={saveIdentity}
                className="p-1 rounded text-emerald-300 hover:text-emerald-200"
              >
                <CheckIcon className="size-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2 group">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <UserGroupIcon className="size-4 text-subtle shrink-0" />
                <h3 className="text-base font-semibold text-foreground truncate">{pod.name}</h3>
              </div>
              {pod.tagline && (
                <p className="text-[12px] text-subtle mt-0.5 truncate">{pod.tagline}</p>
              )}
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setEditingIdentity(true)}
                className="p-1 rounded text-subtle hover:text-foreground"
                title="Rename"
              >
                <PencilSquareIcon className="size-3.5" />
              </button>
              <button
                onClick={onDelete}
                className="p-1 rounded text-subtle hover:text-rose-400"
                title="Delete pod"
              >
                <TrashIcon className="size-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Slots */}
      <div className="p-5 space-y-2">
        {sortedMembers.length === 0 ? (
          <p className="text-[12px] italic text-subtle">No slots yet.</p>
        ) : (
          sortedMembers.map((member) => (
            <SlotRow key={member.id} member={member} onChange={onChange} />
          ))
        )}

        {/* Add-slot row */}
        <details className="pt-2">
          <summary className="text-[10px] uppercase tracking-wider text-subtle hover:text-foreground cursor-pointer inline-flex items-center gap-1">
            <PlusIcon className="size-3" />
            Add slot
          </summary>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ROLE_ORDER.map((role) => (
              <button
                key={role}
                onClick={() => handleAddSlot(role)}
                className="px-2 py-1 rounded text-[10px] uppercase tracking-wider bg-surface text-muted hover:bg-surface-raised hover:text-foreground"
              >
                + {ROLE_LABEL[role]}
              </button>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}

function SlotRow({
  member,
  onChange,
}: {
  member: PodMember;
  onChange: () => void;
}) {
  function handleLink(personId: string | undefined) {
    /* Bidirectional bridge. PodMember.person_id is set by
     * linkPersonToPodMember (forward ref). Person.pod_member_id is
     * set here on the Person row (reverse ref). Both sides need to
     * agree so /me can resolve a logged-in team member to their
     * Person record (and so kanban / KPI surfaces can resolve the
     * other way). Without the reverse ref, /me showed the "your
     * account isn't linked to a team member record" error. */
    if (personId) {
      peopleStore.getAll().then((rows) => {
        const p = rows.find((x) => x.id === personId);
        const displayName = p?.preferred_name || p?.full_name || "Unassigned";
        linkPersonToPodMember(member.id, personId, displayName);
        if (p) {
          peopleStore
            .update(p.id, { pod_member_id: member.id })
            .catch((err) =>
              console.error("[pods] failed to set Person.pod_member_id:", err),
            );
        }
        onChange();
      });
    } else {
      /* Unlinking: clear BOTH sides so a future re-link doesn't
       * inherit a stale Person.pod_member_id pointing at this slot. */
      const stalePersonId = member.person_id;
      linkPersonToPodMember(member.id, undefined, "Unassigned");
      if (stalePersonId) {
        peopleStore
          .update(stalePersonId, { pod_member_id: undefined })
          .catch((err) =>
            console.error("[pods] failed to clear Person.pod_member_id:", err),
          );
      }
      onChange();
    }
  }

  function handleRoleChange(role: PodMemberRole) {
    updateMemberRole(member.id, role);
    onChange();
  }

  function handleRemove() {
    if (!window.confirm("Remove this slot from the pod?")) return;
    removePodMember(member.id);
    onChange();
  }

  return (
    <div className="flex items-center gap-2 group">
      <select
        value={member.role}
        onChange={(e) => handleRoleChange(e.target.value as PodMemberRole)}
        className="h-8 px-2 pr-7 rounded-md bg-background ring-1 ring-white/[0.04] text-[11px] uppercase tracking-wider text-muted focus:outline-none focus:ring-white/[0.12] w-32 shrink-0 cursor-pointer"
      >
        {ROLE_ORDER.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABEL[r]}
          </option>
        ))}
      </select>
      <div className="flex-1 min-w-0">
        <PersonPicker
          value={member.person_id}
          onChange={handleLink}
          placeholder="Unassigned"
          compact
        />
      </div>
      <button
        onClick={handleRemove}
        className="p-1 text-subtle hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Remove slot"
      >
        <TrashIcon className="size-3.5" />
      </button>
    </div>
  );
}
