"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  ListBulletIcon,
  UsersIcon,
  TagIcon,
} from "@heroicons/react/24/outline";
import { peopleStore, uid, nowISO, todayISO } from "@/lib/company/data";
import {
  type Person,
  type EmploymentType,
  type PersonStatus,
  DEPARTMENTS,
} from "@/lib/company/types";
import { getPods } from "@/lib/pods-v2/data";
import type { Pod } from "@/lib/pods-v2/types";
import { personByPodMemberId } from "@/lib/people/resolver";
import { inputClass, labelClass, selectClass } from "@/lib/form-styles";
import { initials, deptColor, STATUS_BADGE } from "@/lib/company/ui";

type View = "grid" | "table" | "byPod" | "byStatus";

export default function PeoplePanel() {
  const [people, setPeople] = useState<Person[]>([]);
  const [pods, setPods] = useState<Pod[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<View>("grid");
  const [query, setQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | EmploymentType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | PersonStatus>("all");
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    peopleStore.getAll().then((rows) => {
      setPeople(rows);
      setHydrated(true);
    });
    setPods(getPods());
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people.filter((p) => {
      if (deptFilter !== "all" && p.department !== deptFilter) return false;
      if (typeFilter !== "all" && p.employment_type !== typeFilter) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (!q) return true;
      const hay = `${p.full_name} ${p.preferred_name || ""} ${p.job_title || ""} ${p.email || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [people, query, deptFilter, typeFilter, statusFilter]);

  async function handleAdd(
    person: Person,
    options: { sendInvite: boolean },
  ) {
    await peopleStore.create(person);
    setPeople((rows) => [person, ...rows]);
    setShowAdd(false);
    /* Fire-and-forget invite. The button on the Person profile is
     * still there for retries or for people who joined before this
     * one-step flow existed. */
    if (options.sendInvite && person.email) {
      try {
        const res = await fetch("/api/admin/invite-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: person.email,
            name: person.full_name,
            podMemberId: person.pod_member_id ?? null,
          }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          console.error(
            "[people] invite during add failed:",
            body.error || res.status,
          );
        }
      } catch (err) {
        console.error("[people] invite during add failed:", err);
      }
    }
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-56">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-[#71757D] z-10" />
            <input
              type="text"
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={`${inputClass} pl-8`}
            />
          </div>
          <div className="w-44">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className={selectClass}
            >
              <option value="all">All departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="w-36">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as "all" | EmploymentType)}
              className={selectClass}
            >
              <option value="all">All types</option>
              <option value="employee">Employee</option>
              <option value="contractor">Contractor</option>
            </select>
          </div>
          <div className="w-36">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | PersonStatus)}
              className={selectClass}
            >
              <option value="all">All statuses</option>
              <option value="onboarding">Onboarding</option>
              <option value="active">Active</option>
              <option value="on_leave">On leave</option>
              <option value="notice">Notice</option>
              <option value="offboarding">Offboarding</option>
              <option value="left">Left</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-[#2A2A2A] overflow-hidden">
            <button
              onClick={() => setView("grid")}
              className={`p-2 ${view === "grid" ? "bg-white text-[#0C0C0C]" : "bg-[#181818] text-[#71757D]"}`}
              title="Grid view"
            >
              <Squares2X2Icon className="size-4" />
            </button>
            <button
              onClick={() => setView("table")}
              className={`p-2 ${view === "table" ? "bg-white text-[#0C0C0C]" : "bg-[#181818] text-[#71757D]"}`}
              title="Table view"
            >
              <ListBulletIcon className="size-4" />
            </button>
            <button
              onClick={() => setView("byPod")}
              className={`p-2 ${view === "byPod" ? "bg-white text-[#0C0C0C]" : "bg-[#181818] text-[#71757D]"}`}
              title="By pod"
            >
              <UsersIcon className="size-4" />
            </button>
            <button
              onClick={() => setView("byStatus")}
              className={`p-2 ${view === "byStatus" ? "bg-white text-[#0C0C0C]" : "bg-[#181818] text-[#71757D]"}`}
              title="By status"
            >
              <TagIcon className="size-4" />
            </button>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white text-[#0C0C0C] text-sm rounded-lg hover:opacity-90"
          >
            <PlusIcon className="size-4" />
            Add person
          </button>
        </div>
      </div>

      {!hydrated ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 bg-[#0C0C0C] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState onAdd={() => setShowAdd(true)} hasFilter={!!query || deptFilter !== "all" || typeFilter !== "all" || statusFilter !== "all"} />
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((p) => (
            <PersonCard key={p.id} person={p} />
          ))}
        </div>
      ) : view === "byPod" ? (
        <ByPodView people={filtered} pods={pods} />
      ) : view === "byStatus" ? (
        <ByStatusView people={filtered} />
      ) : (
        <PeopleTable rows={filtered} />
      )}

      {showAdd && <AddPersonModal onCancel={() => setShowAdd(false)} onSave={handleAdd} />}
    </div>
  );
}

function PersonCard({ person }: { person: Person }) {
  const status = STATUS_BADGE[person.status];
  return (
    <Link
      href={`/company/people/${person.id}`}
      className="block bg-[#181818] border border-[#2A2A2A] rounded-xl p-4 hover:border-white transition-colors shadow-[var(--shadow-soft)]"
    >
      <div className="flex items-start gap-3">
        {person.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={person.avatar_url} alt={person.full_name} className="size-12 rounded-full object-cover" />
        ) : (
          <div
            className="size-12 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
            style={{ background: deptColor(person.department) }}
          >
            {initials(person.full_name)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="font-medium text-[#E5E5EA] truncate">{person.preferred_name || person.full_name}</div>
          <div className="text-xs text-[#71757D] truncate">{person.job_title || "—"}</div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span
          className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded"
          style={{ background: status.bg, color: status.text }}
        >
          {status.label}
        </span>
        <span className="text-[11px] text-[#71757D]">
          {person.employment_type === "employee" ? "Employee" : "Contractor"}
        </span>
      </div>
      {person.department && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#71757D]">
          <span className="size-2 rounded-full" style={{ background: deptColor(person.department) }} />
          {person.department}
        </div>
      )}
    </Link>
  );
}

function PeopleTable({ rows }: { rows: Person[] }) {
  return (
    <div className="bg-[#181818] border border-[#2A2A2A] rounded-xl overflow-hidden shadow-[var(--shadow-soft)]">
      <table className="w-full text-sm">
        <thead className="bg-[#0C0C0C] text-[11px] uppercase tracking-wider text-[#71757D]">
          <tr>
            <th className="text-left px-4 py-3 font-semibold">Name</th>
            <th className="text-left px-4 py-3 font-semibold">Title</th>
            <th className="text-left px-4 py-3 font-semibold">Department</th>
            <th className="text-left px-4 py-3 font-semibold">Type</th>
            <th className="text-left px-4 py-3 font-semibold">Status</th>
            <th className="text-left px-4 py-3 font-semibold">Email</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const status = STATUS_BADGE[p.status];
            return (
              <tr key={p.id} className="border-t border-[#2A2A2A] hover:bg-[#0C0C0C]">
                <td className="px-4 py-3">
                  <Link href={`/company/people/${p.id}`} className="font-medium text-[#E5E5EA] hover:underline">
                    {p.preferred_name || p.full_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[#71757D]">{p.job_title || "—"}</td>
                <td className="px-4 py-3 text-[#71757D]">{p.department || "—"}</td>
                <td className="px-4 py-3 text-[#71757D] capitalize">{p.employment_type}</td>
                <td className="px-4 py-3">
                  <span
                    className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded"
                    style={{ background: status.bg, color: status.text }}
                  >
                    {status.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#71757D]">{p.email || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ onAdd, hasFilter }: { onAdd: () => void; hasFilter: boolean }) {
  return (
    <div className="bg-[#181818] border border-dashed border-[#2A2A2A] rounded-xl p-12 text-center">
      <div className="text-sm text-[#71757D] mb-3">
        {hasFilter ? "No people match these filters." : "No people yet - add your first team member."}
      </div>
      {!hasFilter && (
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white text-[#0C0C0C] text-sm rounded-lg hover:opacity-90"
        >
          <PlusIcon className="size-4" />
          Add person
        </button>
      )}
    </div>
  );
}

function AddPersonModal({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave: (p: Person, options: { sendInvite: boolean }) => void;
}) {
  const [name, setName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState<string>(DEPARTMENTS[0]);
  const [employmentType, setEmploymentType] = useState<EmploymentType>("employee");
  const [email, setEmail] = useState("");
  /* Invite default: on when email is set. The user explicitly asked
   * for the "set up new person + send invite" flow to be a single
   * step, so we lean into it - just uncheck to skip. */
  const [sendInvite, setSendInvite] = useState(true);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const now = nowISO();
    const trimmedEmail = email.trim();
    const person: Person = {
      id: uid(),
      full_name: name.trim(),
      job_title: jobTitle.trim() || undefined,
      department,
      employment_type: employmentType,
      status: "active",
      start_date: todayISO(),
      email: trimmedEmail || undefined,
      created_at: now,
      updated_at: now,
    };
    /* Only fire the invite if we actually have an email AND the box
     * is ticked. Saves a useless API roundtrip + avoids "invite sent"
     * confusion when there's nothing to invite. */
    onSave(person, { sendInvite: sendInvite && !!trimmedEmail });
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <form
        onSubmit={submit}
        className="bg-[#181818] rounded-xl shadow-xl w-full max-w-md p-6"
      >
        <h2 className="text-lg font-semibold text-[#E5E5EA] mb-4">Add person</h2>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Full name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="Alex Smith"
            />
          </div>
          <div>
            <label className={labelClass}>Job title</label>
            <input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className={inputClass}
              placeholder="Senior Designer"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className={selectClass}
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Type</label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                className={selectClass}
              >
                <option value="employee">Employee</option>
                <option value="contractor">Contractor</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="alex@ecomlanders.com"
            />
          </div>
          {/* One-step invite: ticked by default so admin doesnt have to
              hop to the Person profile after saving. Greys out until an
              email is entered. */}
          <label
            className={`flex items-start gap-2 text-xs ${email.trim() ? "text-[#E5E5EA]" : "text-[#71757D]"}`}
          >
            <input
              type="checkbox"
              checked={sendInvite && !!email.trim()}
              disabled={!email.trim()}
              onChange={(e) => setSendInvite(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium">Send invite to launchpad</span>
              <span className="block text-[#71757D] text-[11px] mt-0.5">
                They&apos;ll get an email to set their password, then sign in with email + password.
              </span>
            </span>
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-2 text-sm text-[#71757D] hover:text-[#E5E5EA]"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-3 py-2 bg-white text-[#0C0C0C] text-sm rounded-lg hover:opacity-90"
          >
            Add
          </button>
        </div>
      </form>
    </div>
  );
}

/* ─── By Pod view ─────────────────────────────────────────────────
 *
 * Replaces the old Structure flowchart. Each pod renders as a card
 * with its 4 role slots (designer / sec designer / dev / sec dev).
 * Each slot resolves the PodMember → Person via pod_member_id; if no
 * match, shows the PodMember name as a placeholder with "link in HR"
 * helper text. People with no pod_member_id are bucketed into a
 * trailing "Unassigned" card so they're not invisible.
 */
function ByPodView({ people, pods }: { people: Person[]; pods: Pod[] }) {
  const personByPMId = useMemo(() => {
    const m = new Map<string, Person>();
    for (const p of people) {
      if (p.pod_member_id) m.set(p.pod_member_id, p);
    }
    return m;
  }, [people]);

  const linkedPodMemberIds = new Set<string>();
  for (const pod of pods) {
    for (const m of pod.members) {
      if (personByPodMemberId(m.id, people)) linkedPodMemberIds.add(m.id);
    }
  }
  const unassigned = people.filter(
    (p) => !p.pod_member_id || !linkedPodMemberIds.has(p.pod_member_id),
  );

  if (pods.length === 0) {
    return (
      <div className="bg-[#181818] border border-[#2A2A2A] rounded-xl p-8 text-center">
        <p className="text-sm text-[#71757D]">
          No pods configured. Set up pods in /workspace, then link each
          Person to their pod member on their Overview tab.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {pods.map((pod) => (
        <div
          key={pod.id}
          className="bg-[#181818] border border-[#2A2A2A] rounded-xl overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-[#2A2A2A] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#E5E5EA]">{pod.name}</h3>
            <span className="text-[11px] uppercase tracking-wider text-[#71757D] tabular-nums">
              {pod.members.filter((m) => !m.is_placeholder).length} members
            </span>
          </div>
          <ul className="divide-y divide-[#2A2A2A]">
            {pod.members
              .filter((m) => !m.is_placeholder)
              .map((m) => {
                const linked = personByPMId.get(m.id);
                return (
                  <li
                    key={m.id}
                    className="px-5 py-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-[#E5E5EA] truncate">
                        {linked ? (
                          <Link
                            href={`/company/people/${linked.id}`}
                            className="hover:underline font-medium"
                          >
                            {linked.preferred_name || linked.full_name}
                          </Link>
                        ) : (
                          <span className="text-[#71757D]">
                            {m.name} (no HR record)
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#71757D] mt-0.5 capitalize">
                        {m.role.replace(/_/g, " ")}
                      </div>
                    </div>
                    {linked ? (
                      <PersonStatusPill person={linked} />
                    ) : (
                      <span className="text-[10px] text-[#71757D] uppercase tracking-wider">
                        Unlinked
                      </span>
                    )}
                  </li>
                );
              })}
          </ul>
        </div>
      ))}

      {unassigned.length > 0 && (
        <div className="bg-[#181818] border border-[#2A2A2A] rounded-xl overflow-hidden md:col-span-2">
          <div className="px-5 py-4 border-b border-[#2A2A2A] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#E5E5EA]">Not on a pod</h3>
            <span className="text-[11px] uppercase tracking-wider text-[#71757D] tabular-nums">
              {unassigned.length}
            </span>
          </div>
          <ul className="divide-y divide-[#2A2A2A]">
            {unassigned.map((p) => (
              <li
                key={p.id}
                className="px-5 py-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/company/people/${p.id}`}
                    className="text-sm font-medium text-[#E5E5EA] hover:underline truncate"
                  >
                    {p.preferred_name || p.full_name}
                  </Link>
                  <div className="text-[11px] text-[#71757D] mt-0.5">
                    {p.job_title || "(no title)"}
                  </div>
                </div>
                <PersonStatusPill person={p} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ─── By Status view ──────────────────────────────────────────────
 *
 * Groups people by status (onboarding / active / on_leave / notice /
 * offboarding / left) - the natural "who's where in the lifecycle"
 * cut. Status groups with zero members hide so the page stays tight.
 */
function ByStatusView({ people }: { people: Person[] }) {
  const STATUS_ORDER: PersonStatus[] = [
    "onboarding",
    "active",
    "on_leave",
    "notice",
    "offboarding",
    "left",
  ];

  return (
    <div className="space-y-4">
      {STATUS_ORDER.map((s) => {
        const bucket = people.filter((p) => p.status === s);
        if (bucket.length === 0) return null;
        const badge = STATUS_BADGE[s];
        return (
          <div
            key={s}
            className="bg-[#181818] border border-[#2A2A2A] rounded-xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-[#2A2A2A] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded"
                  style={{ background: badge.bg, color: badge.text }}
                >
                  {badge.label}
                </span>
              </div>
              <span className="text-[11px] uppercase tracking-wider text-[#71757D] tabular-nums">
                {bucket.length}
              </span>
            </div>
            <ul className="divide-y divide-[#2A2A2A]">
              {bucket.map((p) => (
                <li
                  key={p.id}
                  className="px-5 py-3 flex items-center gap-3"
                >
                  {p.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.avatar_url}
                      alt={p.full_name}
                      className="size-9 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="size-9 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                      style={{ background: deptColor(p.department) }}
                    >
                      {initials(p.full_name)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/company/people/${p.id}`}
                      className="text-sm font-medium text-[#E5E5EA] hover:underline truncate"
                    >
                      {p.preferred_name || p.full_name}
                    </Link>
                    <div className="text-[11px] text-[#71757D] mt-0.5">
                      {p.job_title || "(no title)"} ·{" "}
                      {p.employment_type === "employee" ? "Employee" : "Contractor"}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function PersonStatusPill({ person }: { person: Person }) {
  const s = STATUS_BADGE[person.status];
  return (
    <span
      className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded shrink-0"
      style={{ background: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  );
}
