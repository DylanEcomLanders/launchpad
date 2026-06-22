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
  ArrowTopRightOnSquareIcon,
  EnvelopeIcon,
  CheckBadgeIcon,
  UserGroupIcon,
  SparklesIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { peopleStore, uid, nowISO, todayISO } from "@/lib/company/data";
import {
  type Person,
  type EmploymentType,
  type PersonStatus,
  DEPARTMENTS,
  DEPARTMENT_COLORS,
} from "@/lib/company/types";
import { getPods } from "@/lib/pods-v2/data";
import type { Pod } from "@/lib/pods-v2/types";
import { personByPodMemberId } from "@/lib/people/resolver";
import { inputClass, labelClass, selectClass } from "@/lib/form-styles";
import { initials, deptColor, STATUS_BADGE } from "@/lib/company/ui";
import { createContractDraftFromPerson } from "@/lib/agreements/data";
import { useRouter } from "next/navigation";

type View = "grid" | "table" | "byPod" | "byStatus";

export default function PeoplePanel() {
  const [people, setPeople] = useState<Person[]>([]);
  const [pods, setPods] = useState<Pod[]>([]);
  const [invitedEmails, setInvitedEmails] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<View>("grid");
  const [query, setQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | EmploymentType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | PersonStatus>("all");
  const [showAdd, setShowAdd] = useState(false);
  const router = useRouter();

  useEffect(() => {
    peopleStore.getAll().then((rows) => {
      setPeople(rows);
      setHydrated(true);
    });
    setPods(getPods());
    /* Pull every invited email once so each card can show an
     * "Invited" / "Not invited yet" chip without a per-card query. */
    import("@/lib/auth/app-users")
      .then(({ listAppUsers }) => listAppUsers())
      .then((users) => {
        setInvitedEmails(new Set(users.map((u) => u.email.toLowerCase())));
      })
      .catch((err) => console.error("[people] failed to load app_users:", err));
  }, []);

  /* Stats strip - computed once per hydration of the underlying data. */
  const stats = useMemo(() => {
    const total = people.length;
    const active = people.filter((p) => p.status === "active").length;
    const onboarding = people.filter((p) => p.status === "onboarding").length;
    const awaitingInvite = people.filter(
      (p) => p.email && !invitedEmails.has(p.email.toLowerCase()) && p.status !== "left",
    ).length;
    return { total, active, onboarding, awaitingInvite };
  }, [people, invitedEmails]);

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
    options: { sendInvite: boolean; generateContract: boolean },
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
    /* Auto-create the contract draft inline (no modal) and route
     * straight to the detail page. The detail page IS the preview
     * + inline-edit surface, so an intermediate form would be
     * redundant. Missing comp/address/etc render as readable
     * placeholders the admin fills in via the Engagement Details
     * panel. */
    if (options.generateContract) {
      try {
        const agreement = await createContractDraftFromPerson(person);
        router.push(`/company/contracts/${agreement.id}`);
      } catch (err) {
        console.error("[people] contract draft create failed:", err);
      }
    }
  }

  return (
    <div>
      {/* Team stats strip - one-glance signal on the team's shape +
       * who still needs inviting. Sits above the filters so admin
       * sees the picture before drilling in. */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatTile label="Team total" value={stats.total} icon={<UserGroupIcon className="size-4 text-white" />} gradient="from-emerald-500 to-teal-600 shadow-[0_8px_24px_rgba(16,185,129,0.3)]" />
        <StatTile label="Active" value={stats.active} icon={<CheckBadgeIcon className="size-4 text-white" />} gradient="from-cyan-500 to-teal-600 shadow-[0_8px_24px_rgba(6,182,212,0.3)]" />
        <StatTile label="Onboarding" value={stats.onboarding} icon={<SparklesIcon className="size-4 text-white" />} gradient="from-sky-500 to-blue-600 shadow-[0_8px_24px_rgba(14,165,233,0.3)]" />
        <StatTile label="Awaiting invite" value={stats.awaitingInvite} icon={<EnvelopeIcon className="size-4 text-white" />} gradient={stats.awaitingInvite > 0 ? "from-amber-500 to-orange-600 shadow-[0_8px_24px_rgba(245,158,11,0.3)]" : "from-zinc-500 to-zinc-600"} muted={stats.awaitingInvite === 0} />
      </div>

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
          <div className="inline-flex rounded-lg border border-white/[0.04] overflow-hidden">
            <button
              onClick={() => setView("grid")}
              className={`p-2 ${view === "grid" ? "bg-white text-[#0C0C0C]" : "bg-[#0F0F10] text-[#71757D]"}`}
              title="Grid view"
            >
              <Squares2X2Icon className="size-4" />
            </button>
            <button
              onClick={() => setView("table")}
              className={`p-2 ${view === "table" ? "bg-white text-[#0C0C0C]" : "bg-[#0F0F10] text-[#71757D]"}`}
              title="Table view"
            >
              <ListBulletIcon className="size-4" />
            </button>
            <button
              onClick={() => setView("byPod")}
              className={`p-2 ${view === "byPod" ? "bg-white text-[#0C0C0C]" : "bg-[#0F0F10] text-[#71757D]"}`}
              title="By pod"
            >
              <UsersIcon className="size-4" />
            </button>
            <button
              onClick={() => setView("byStatus")}
              className={`p-2 ${view === "byStatus" ? "bg-white text-[#0C0C0C]" : "bg-[#0F0F10] text-[#71757D]"}`}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((p) => (
            <PersonCard
              key={p.id}
              person={p}
              pods={pods}
              isInvited={!!p.email && invitedEmails.has(p.email.toLowerCase())}
            />
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

/* StatTile - one of the 4 tiles at the top of the People panel.
 * Mirrors the Hero Offer / Operations tile aesthetic. */
function StatTile({
  label,
  value,
  icon,
  gradient,
  muted,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  gradient: string;
  muted?: boolean;
}) {
  return (
    <div className="bg-[#0F0F10] rounded-xl p-4 ring-1 ring-white/[0.04] flex items-center gap-3">
      <div className={`size-9 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-[#71757D] font-semibold">{label}</div>
        <div className={`text-2xl font-semibold ${muted ? "text-[#71757D]" : "text-[#E5E5EA]"}`}>{value}</div>
      </div>
    </div>
  );
}

/* Compute tenure label - "Day 14" for onboarding, "5 mo" / "Yr 2" for
 * established staff. Empty string if we don't have enough info. */
function tenureLabel(person: Person): string {
  if (person.status === "onboarding" && person.onboarding_started_at) {
    const days = Math.max(1, Math.floor((Date.now() - new Date(person.onboarding_started_at).getTime()) / 86_400_000) + 1);
    return `Day ${days}`;
  }
  if (person.start_date) {
    const days = Math.floor((Date.now() - new Date(person.start_date).getTime()) / 86_400_000);
    if (days < 0) return `Starts ${new Date(person.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
    if (days < 60) return `${days}d`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} mo`;
    const years = Math.floor(months / 12);
    const remMonths = months % 12;
    return remMonths > 0 ? `${years}yr ${remMonths}mo` : `${years} yr`;
  }
  return "";
}

/* Map STATUS_BADGE light tints to dark-mode palette (the source
 * STATUS_BADGE uses pastel backgrounds designed for light cards). */
const DARK_STATUS_TINT: Record<string, string> = {
  onboarding: "bg-sky-500/15 text-sky-200 ring-1 ring-sky-500/30",
  active: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30",
  on_leave: "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30",
  notice: "bg-rose-500/15 text-rose-200 ring-1 ring-rose-500/30",
  offboarding: "bg-orange-500/15 text-orange-200 ring-1 ring-orange-500/30",
  left: "bg-zinc-500/15 text-zinc-300 ring-1 ring-zinc-500/30",
};

function PersonCard({
  person,
  pods,
  isInvited,
}: {
  person: Person;
  pods: Pod[];
  isInvited: boolean;
}) {
  const status = STATUS_BADGE[person.status];
  const dept = person.department;
  const deptHex = deptColor(dept);
  const tenure = tenureLabel(person);

  /* Find the pod this person is linked to via pod_member_id. */
  const pod = useMemo(() => {
    if (!person.pod_member_id) return null;
    return pods.find((pd) => pd.members?.some((m) => m.id === person.pod_member_id)) ?? null;
  }, [person.pod_member_id, pods]);

  const isLeadership = dept === "Leadership";
  const needsInvite = !!person.email && !isInvited && person.status !== "left";

  return (
    <Link
      href={`/company/people/${person.id}`}
      className={`group block bg-[#0F0F10] rounded-2xl p-5 ring-1 ring-white/[0.04] hover:ring-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.35)] transition-all ${isLeadership ? "ring-emerald-500/20 hover:ring-emerald-500/40" : ""}`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar tile - photo if available, else gradient initials.
         * Department drives the colour so the team reads visually. */}
        {person.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={person.avatar_url}
            alt={person.full_name}
            className="size-12 rounded-xl object-cover shrink-0 ring-1 ring-white/[0.08]"
          />
        ) : (
          <div
            className="size-12 rounded-xl flex items-center justify-center text-white text-sm font-semibold shrink-0 shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
            style={{
              background: `linear-gradient(135deg, ${deptHex} 0%, ${deptHex}99 100%)`,
              boxShadow: `0 8px 24px ${deptHex}55`,
            }}
          >
            {initials(person.full_name)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold text-[#E5E5EA] truncate">
              {person.preferred_name || person.full_name}
            </span>
            {isLeadership && (
              <SparklesIcon className="size-3 text-emerald-400 shrink-0" title="Leadership" />
            )}
          </div>
          <div className="text-[12px] text-[#71757D] truncate">{person.job_title || "No role set"}</div>
          {/* Meta row: department + pod + tenure. Compact, comma-sep style. */}
          <div className="mt-1.5 flex items-center gap-2 flex-wrap text-[11px] text-[#71757D]">
            {dept && (
              <span className="inline-flex items-center gap-1">
                <span className="size-1.5 rounded-full" style={{ background: deptHex }} />
                {dept}
              </span>
            )}
            {pod && (
              <span className="inline-flex items-center gap-1" title={`Pod: ${pod.name}`}>
                <UserGroupIcon className="size-3" />
                {pod.name}
              </span>
            )}
            {tenure && <span>· {tenure}</span>}
          </div>
        </div>
        {/* Hover-reveal "open" arrow. */}
        <ArrowTopRightOnSquareIcon className="size-3.5 text-[#71757D] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
      </div>

      {/* Status row + invite chip. */}
      <div className="mt-4 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${DARK_STATUS_TINT[person.status] ?? "bg-[#222] text-[#9CA3AF]"}`}>
            {status.label}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-[#71757D]">
            {person.employment_type === "employee" ? "Employee" : "Contractor"}
          </span>
        </div>
        {/* Invite signal: green check if invited, amber "Invite" if not.
         * Only shows for staff with an email + not already left. */}
        {person.email ? (
          isInvited ? (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30">
              <CheckBadgeIcon className="size-3" />
              Invited
            </span>
          ) : needsInvite ? (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30">
              <EnvelopeIcon className="size-3" />
              Invite
            </span>
          ) : null
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-[#71757D]">
            <UserCircleIcon className="size-3" />
            No email
          </span>
        )}
      </div>
    </Link>
  );
}

function PeopleTable({ rows }: { rows: Person[] }) {
  return (
    <div className="bg-[#0F0F10] border border-white/[0.04] rounded-xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
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
              <tr key={p.id} className="border-t border-white/[0.04] hover:bg-[#0C0C0C]">
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
    <div className="bg-[#0F0F10] border border-dashed border-white/[0.04] rounded-xl p-12 text-center">
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
  onSave: (
    p: Person,
    options: { sendInvite: boolean; generateContract: boolean },
  ) => void;
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
  /* Contract default: on. Dylan's flow is "create person → generate
   * contract draft → review + send for signature". Skipping is rare. */
  const [generateContract, setGenerateContract] = useState(true);

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
    onSave(person, {
      sendInvite: sendInvite && !!trimmedEmail,
      generateContract,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <form
        onSubmit={submit}
        className="bg-[#0F0F10] rounded-xl shadow-xl w-full max-w-md p-6"
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
          {/* Auto-generate contract: snapshots the active contract
              template (clauses + placeholders) into a draft Agreement
              row tied to this Person, then pops the comp/role review
              modal so admin can fill the missing fields before sending
              the signing link. */}
          <label className="flex items-start gap-2 text-xs text-[#E5E5EA]">
            <input
              type="checkbox"
              checked={generateContract}
              onChange={(e) => setGenerateContract(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium">Generate contract draft</span>
              <span className="block text-[#71757D] text-[11px] mt-0.5">
                Opens a contract review form pre-filled with role + employment type. You confirm comp + start date, then share the signing link.
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
      <div className="bg-[#0F0F10] border border-white/[0.04] rounded-xl p-8 text-center">
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
          className="bg-[#0F0F10] border border-white/[0.04] rounded-xl overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#E5E5EA]">{pod.name}</h3>
            <span className="text-[11px] uppercase tracking-wider text-[#71757D] tabular-nums">
              {pod.members.filter((m) => !m.is_placeholder).length} members
            </span>
          </div>
          <ul className="divide-y divide-white/[0.04]">
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
        <div className="bg-[#0F0F10] border border-white/[0.04] rounded-xl overflow-hidden md:col-span-2">
          <div className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#E5E5EA]">Not on a pod</h3>
            <span className="text-[11px] uppercase tracking-wider text-[#71757D] tabular-nums">
              {unassigned.length}
            </span>
          </div>
          <ul className="divide-y divide-white/[0.04]">
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
            className="bg-[#0F0F10] border border-white/[0.04] rounded-xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between">
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
            <ul className="divide-y divide-white/[0.04]">
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
