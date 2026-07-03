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
} from "@/lib/company/types";
import { getPods } from "@/lib/pods-v2/data";
import type { Pod } from "@/lib/pods-v2/types";
import { personByPodMemberId } from "@/lib/people/resolver";
import { inputClass, labelClass, selectClass } from "@/lib/form-styles";
import { initials, deptColor, STATUS_BADGE } from "@/lib/company/ui";
import { createContractDraftFromPerson } from "@/lib/agreements/data";
import { useRouter } from "next/navigation";
import { Table, THead, TBody, TR, TH, TD, Badge } from "@/components/ui";
import { setAppUserRole, type AppUser, type AppUserRole } from "@/lib/auth/app-users";

type View = "grid" | "table" | "byPod" | "byStatus";

/* Status → Badge tone. Statuses run through the shared Badge primitive
 * (quiet dot + muted text) exactly like the finance status badges. The
 * tone maps onto the MUTED status palette inside Badge - never a loud
 * alarm hue. The label still comes from STATUS_BADGE so copy stays in
 * one place. */
type StatusTone = "success" | "warning" | "danger" | "neutral";
const STATUS_TONE: Record<PersonStatus, StatusTone> = {
  onboarding: "warning",
  active: "success",
  on_leave: "warning",
  notice: "danger",
  offboarding: "neutral",
  left: "neutral",
};

/* One status-pill atom, used identically in every view (card, pod row,
 * status group, table). Repeating atoms must be one component - the
 * shared Badge primitive carries the calm dot + muted text. */
function StatusPill({ status }: { status: PersonStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_BADGE[status].label}</Badge>;
}

/* Resolve the pod a person belongs to via pod_member_id. Returns null
 * for humans not on a delivery pod. One implementation reused by the
 * table, the card grid and the pod filter. */
function podForPerson(person: Person, pods: Pod[]): Pod | null {
  if (!person.pod_member_id) return null;
  return (
    pods.find((pd) => pd.members?.some((m) => m.id === person.pod_member_id)) ??
    null
  );
}

/* Department dot - the one dept colour atom. Department colour is
 * data-viz (colour-coded by dept), so it keeps the existing
 * DEPARTMENT_COLORS constant via deptColor(). */
function DeptDot({ dept }: { dept?: string }) {
  return (
    <span
      className="size-1.5 rounded-full shrink-0"
      style={{ background: deptColor(dept) }}
    />
  );
}

export default function PeoplePanel() {
  const [people, setPeople] = useState<Person[]>([]);
  const [pods, setPods] = useState<Pod[]>([]);
  const [invitedEmails, setInvitedEmails] = useState<Set<string>>(new Set());
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<View>("table");
  const [query, setQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | EmploymentType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | PersonStatus>("all");
  const [podFilter, setPodFilter] = useState<string>("all");
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
        setAppUsers(users);
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
      if (podFilter !== "all") {
        const pod = podForPerson(p, pods);
        if (podFilter === "none") {
          if (pod) return false;
        } else if (pod?.id !== podFilter) {
          return false;
        }
      }
      if (!q) return true;
      const hay = `${p.full_name} ${p.preferred_name || ""} ${p.job_title || ""} ${p.email || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [people, pods, query, deptFilter, typeFilter, statusFilter, podFilter]);

  /* Access role is stored on the app_users account (matched to a person by
   * email). setAppUserRole routes through the service-role endpoint; the
   * person picks up the new role on their next sign-in. */
  const appUserByEmail = useMemo(
    () => new Map(appUsers.map((u) => [u.email.toLowerCase(), u])),
    [appUsers],
  );

  async function handleRoleChange(id: string, role: AppUserRole) {
    const ok = await setAppUserRole(id, role);
    if (ok) setAppUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
  }

  async function handleAdd(
    person: Person,
    options: { generateContract: boolean },
  ) {
    await peopleStore.create(person);
    setPeople((rows) => [person, ...rows]);
    setShowAdd(false);
    /* Login credentials are set manually by admin on the Person
     * detail page (Set credentials button). The invite-by-email
     * flow was removed - admin controls who gets access + when. */
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
    <div className="space-y-6">
      {/* Team stats strip - one-glance signal on the team's shape +
       * who still needs inviting. Sits above the toolbar so admin sees
       * the picture before drilling in. Finance summary-card look. */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Team total" value={stats.total} />
        <StatTile label="Active" value={stats.active} />
        <StatTile label="Onboarding" value={stats.onboarding} attention={stats.onboarding > 0} />
        <StatTile label="Awaiting invite" value={stats.awaitingInvite} attention={stats.awaitingInvite > 0} />
      </div>

      {/* Toolbar: count + filters + view toggle + add on the left, one
       * quiet row; search on the right. Matches the finance exemplar. */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-subtle tabular-nums mr-1">
            {filtered.length} of {people.length}
          </span>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="h-8 px-2.5 rounded border border-border bg-surface text-xs text-muted appearance-none focus:outline-none focus:border-foreground"
          >
            <option value="all">All departments</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as "all" | EmploymentType)}
            className="h-8 px-2.5 rounded border border-border bg-surface text-xs text-muted appearance-none focus:outline-none focus:border-foreground"
          >
            <option value="all">All types</option>
            <option value="employee">Employee</option>
            <option value="contractor">Contractor</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | PersonStatus)}
            className="h-8 px-2.5 rounded border border-border bg-surface text-xs text-muted appearance-none focus:outline-none focus:border-foreground"
          >
            <option value="all">All statuses</option>
            <option value="onboarding">Onboarding</option>
            <option value="active">Active</option>
            <option value="on_leave">On leave</option>
            <option value="notice">Notice</option>
            <option value="offboarding">Offboarding</option>
            <option value="left">Left</option>
          </select>
          <select
            value={podFilter}
            onChange={(e) => setPodFilter(e.target.value)}
            className="h-8 px-2.5 rounded border border-border bg-surface text-xs text-muted appearance-none focus:outline-none focus:border-foreground max-w-[180px]"
          >
            <option value="all">All pods</option>
            {pods.map((pd) => (
              <option key={pd.id} value={pd.id}>
                {pd.name}
              </option>
            ))}
            <option value="none">Not on a pod</option>
          </select>
          <div className="inline-flex items-center gap-0.5 h-8 p-0.5 bg-surface rounded border border-border">
            {([
              { key: "table", title: "Table view", icon: ListBulletIcon },
              { key: "grid", title: "Grid view", icon: Squares2X2Icon },
              { key: "byPod", title: "By pod", icon: UsersIcon },
              { key: "byStatus", title: "By status", icon: TagIcon },
            ] as { key: View; title: string; icon: typeof Squares2X2Icon }[]).map((v) => {
              const active = view === v.key;
              const Icon = v.icon;
              return (
                <button
                  key={v.key}
                  onClick={() => setView(v.key)}
                  className={`p-1.5 rounded-sm transition-colors ${active ? "bg-surface-raised text-foreground" : "text-muted hover:text-foreground"}`}
                  title={v.title}
                >
                  <Icon className="size-3.5" />
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded border border-border bg-surface text-xs text-muted hover:bg-surface-raised hover:text-foreground transition-colors"
          >
            <PlusIcon className="size-3.5" /> Add person
          </button>
        </div>
        <div className="relative w-full md:w-64">
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-subtle z-10" />
          <input
            type="text"
            placeholder="Search name, title or email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 w-full pl-8 pr-3 rounded border border-border bg-surface text-xs text-muted placeholder:text-subtle focus:outline-none focus:border-foreground"
          />
        </div>
      </div>

      {!hydrated ? (
        <div className="h-48 bg-surface rounded border border-border-faint animate-pulse" />
      ) : filtered.length === 0 ? (
        <EmptyState onAdd={() => setShowAdd(true)} hasFilter={!!query || deptFilter !== "all" || typeFilter !== "all" || statusFilter !== "all" || podFilter !== "all"} />
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
        <PeopleTable rows={filtered} pods={pods} appUserByEmail={appUserByEmail} onRoleChange={handleRoleChange} />
      )}

      {showAdd && <AddPersonModal onCancel={() => setShowAdd(false)} onSave={handleAdd} />}
    </div>
  );
}

/* StatTile - one of the 4 tiles at the top of the People panel.
 * Finance summary-card look: card surface + faint border, no ring /
 * shadow / gradient / icon chrome. An attention value (onboarding in
 * flight, invites owed) uses the MUTED status palette, never a loud hue. */
function StatTile({
  label,
  value,
  attention,
}: {
  label: string;
  value: number;
  attention?: boolean;
}) {
  const color = attention ? "text-status-approaching" : "text-foreground";
  return (
    <div className="bg-surface border border-border-faint rounded p-5">
      <div className="text-2xs uppercase tracking-wider text-subtle font-medium">{label}</div>
      <div className={`mt-2 text-xl font-semibold tabular-nums tracking-tight ${color}`}>{value}</div>
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

function PersonCard({
  person,
  pods,
  isInvited,
}: {
  person: Person;
  pods: Pod[];
  isInvited: boolean;
}) {
  const dept = person.department;
  const tenure = tenureLabel(person);

  /* Find the pod this person is linked to via pod_member_id. */
  const pod = useMemo(() => podForPerson(person, pods), [person, pods]);

  const isLeadership = dept === "Leadership";
  const needsInvite = !!person.email && !isInvited && person.status !== "left";

  return (
    <Link
      href={`/company/people/${person.id}`}
      className="group block bg-surface border border-border-faint rounded p-5 hover:bg-surface-raised transition-colors"
    >
      <div className="flex items-start gap-3">
        {/* Avatar tile - photo if available, else dept-coloured initials.
         * Department colour is data-viz (deptColor / DEPARTMENT_COLORS),
         * kept as a flat fill - no gradient / glow. */}
        <PersonAvatar person={person} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold text-foreground truncate">
              {person.preferred_name || person.full_name}
            </span>
            {isLeadership && (
              <SparklesIcon className="size-3 text-subtle shrink-0" title="Leadership" />
            )}
          </div>
          <div className="text-xs text-subtle truncate">{person.job_title || "No role set"}</div>
          {/* Meta row: department + pod + tenure. Compact, comma-sep style. */}
          <div className="mt-1.5 flex items-center gap-2 flex-wrap text-2xs text-subtle">
            {dept && (
              <span className="inline-flex items-center gap-1">
                <DeptDot dept={dept} />
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
        <ArrowTopRightOnSquareIcon className="size-3.5 text-subtle opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
      </div>

      {/* Status row + invite chip. */}
      <div className="mt-4 pt-4 border-t border-dashed border-border flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <StatusPill status={person.status} />
          <span className="text-2xs uppercase tracking-wider text-subtle">
            {person.employment_type === "employee" ? "Employee" : "Contractor"}
          </span>
        </div>
        {/* Invite signal. Muted throughout - "Invited" reads as a quiet
         * confirmation, "Invite" as a calm nudge (status-approaching),
         * never a loud success/warning fill. Only shows for staff with
         * an email + not already left. */}
        {person.email ? (
          isInvited ? (
            <span className="inline-flex items-center gap-1 text-2xs uppercase tracking-wider font-medium text-subtle">
              <CheckBadgeIcon className="size-3" />
              Invited
            </span>
          ) : needsInvite ? (
            <span className="inline-flex items-center gap-1 text-2xs uppercase tracking-wider font-medium text-status-approaching">
              <EnvelopeIcon className="size-3" />
              Invite
            </span>
          ) : null
        ) : (
          <span className="inline-flex items-center gap-1 text-2xs uppercase tracking-wider text-subtle">
            <UserCircleIcon className="size-3" />
            No email
          </span>
        )}
      </div>
    </Link>
  );
}

/* Avatar atom - photo or dept-coloured initials. One implementation
 * reused across every view. Department colour is data-viz, applied as
 * a flat fill via the existing deptColor() constant (no gradient/glow).
 * size / radius vary by context via the `size` prop. */
function PersonAvatar({
  person,
  size = "lg",
}: {
  person: Person;
  size?: "lg" | "sm" | "xs";
}) {
  const box =
    size === "lg"
      ? "size-12 text-sm"
      : size === "sm"
        ? "size-9 text-xs"
        : "size-7 text-2xs";
  if (person.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={person.avatar_url}
        alt={person.full_name}
        className={`${box} rounded-full object-cover shrink-0 border border-border`}
      />
    );
  }
  return (
    <div
      className={`${box} rounded-full flex items-center justify-center text-white font-semibold shrink-0`}
      style={{ background: deptColor(person.department) }}
    >
      {initials(person.full_name)}
    </div>
  );
}

/* The People table - the hero surface. Built on the shared Table
 * primitive (never a bespoke <table>). Person is the one identity
 * column (text-foreground, avatar + name); every other cell is muted.
 * Status is the only colour, via the Badge primitive. Pod is folded in
 * as a muted column with a tiny data-viz dept dot. */
const ROLE_LABEL: Record<AppUserRole, string> = { admin: "Admin", cro: "CRO", team: "Member" };

/* Inline access-role selector. Only people with an app_users account can have
 * a role; the rest show a muted dash (invite them first). */
function AccessCell({
  appUser,
  onChange,
}: {
  appUser: AppUser | undefined;
  onChange: (id: string, role: AppUserRole) => void;
}) {
  if (!appUser) return <span className="text-subtle">-</span>;
  return (
    <select
      value={appUser.role}
      onChange={(e) => onChange(appUser.id, e.target.value as AppUserRole)}
      className="h-7 px-2 rounded border border-border bg-surface text-xs text-muted appearance-none focus:outline-none focus:border-foreground"
    >
      {(Object.keys(ROLE_LABEL) as AppUserRole[]).map((r) => (
        <option key={r} value={r}>
          {ROLE_LABEL[r]}
        </option>
      ))}
    </select>
  );
}

function PeopleTable({
  rows,
  pods,
  appUserByEmail,
  onRoleChange,
}: {
  rows: Person[];
  pods: Pod[];
  appUserByEmail: Map<string, AppUser>;
  onRoleChange: (id: string, role: AppUserRole) => void;
}) {
  return (
    <div className="bg-surface border border-border-faint rounded overflow-x-auto">
      <Table>
        <THead>
          <TR hover={false}>
            <TH>Person</TH>
            <TH>Title</TH>
            <TH>Department</TH>
            <TH>Pod</TH>
            <TH>Type</TH>
            <TH>Status</TH>
            <TH>Access</TH>
          </TR>
        </THead>
        <TBody>
          {rows.map((p) => {
            const pod = podForPerson(p, pods);
            const appUser = p.email ? appUserByEmail.get(p.email.toLowerCase()) : undefined;
            return (
              <TR key={p.id}>
                <TD className="max-w-[240px]">
                  <Link
                    href={`/company/people/${p.id}`}
                    className="flex items-center gap-2.5 text-foreground hover:underline truncate"
                  >
                    <PersonAvatar person={p} size="xs" />
                    <span className="truncate">{p.preferred_name || p.full_name}</span>
                  </Link>
                </TD>
                <TD className="text-muted truncate max-w-[180px]">
                  {p.job_title || "Not set"}
                </TD>
                <TD className="text-muted">
                  {p.department ? (
                    <span className="inline-flex items-center gap-1.5">
                      <DeptDot dept={p.department} />
                      {p.department}
                    </span>
                  ) : (
                    "Not set"
                  )}
                </TD>
                <TD className="text-muted">{pod ? pod.name : "Not on a pod"}</TD>
                <TD className="text-muted capitalize">{p.employment_type}</TD>
                <TD>
                  <StatusPill status={p.status} />
                </TD>
                <TD>
                  <AccessCell appUser={appUser} onChange={onRoleChange} />
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
    </div>
  );
}

function EmptyState({ onAdd, hasFilter }: { onAdd: () => void; hasFilter: boolean }) {
  return (
    <div className="bg-surface border border-border-faint rounded py-16 text-center">
      <p className="text-sm text-subtle">
        {hasFilter ? "No people match these filters." : "No people yet - add your first team member."}
      </p>
      {!hasFilter && (
        <button
          onClick={onAdd}
          className="mt-3 inline-flex items-center gap-1.5 h-8 px-3 rounded border border-border bg-surface text-xs text-muted hover:bg-surface-raised hover:text-foreground transition-colors"
        >
          <PlusIcon className="size-3.5" /> Add person
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
    options: { generateContract: boolean },
  ) => void;
}) {
  const [name, setName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState<string>(DEPARTMENTS[0]);
  /* Contractor by default - the agency runs on contractors, not
   * employees. Saves a click on every add. Switch to employee if
   * onboarding a founder / full-time hire. */
  const [employmentType, setEmploymentType] = useState<EmploymentType>("contractor");
  const [email, setEmail] = useState("");
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
    onSave(person, { generateContract });
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <form
        onSubmit={submit}
        className="bg-surface border border-border rounded w-full max-w-md p-5"
      >
        <h2 className="text-lg font-semibold text-foreground mb-4">Add person</h2>
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
          {/* Auto-generate contract: snapshots the active contract
              template (clauses + placeholders) into a draft Agreement
              row tied to this Person, then pops the comp/role review
              modal so admin can fill the missing fields before sending
              the signing link. */}
          <label className="flex items-start gap-2 text-xs text-foreground">
            <input
              type="checkbox"
              checked={generateContract}
              onChange={(e) => setGenerateContract(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium">Generate contract draft</span>
              <span className="block text-subtle text-2xs mt-0.5">
                Opens a contract review form pre-filled with role + employment type. You confirm comp + start date, then share the signing link.
              </span>
            </span>
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-2 text-xs font-medium text-subtle hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-3 py-2 bg-foreground text-background text-xs font-medium rounded hover:opacity-90"
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
      <div className="bg-surface border border-border-faint rounded p-8 text-center">
        <p className="text-sm text-subtle">
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
          className="bg-surface border border-border-faint rounded overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-dashed border-border flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">{pod.name}</h3>
            <span className="text-2xs uppercase tracking-wider text-subtle tabular-nums">
              {pod.members.filter((m) => !m.is_placeholder).length} members
            </span>
          </div>
          <ul>
            {pod.members
              .filter((m) => !m.is_placeholder)
              .map((m) => {
                const linked = personByPMId.get(m.id);
                return (
                  <li
                    key={m.id}
                    className="px-5 py-3 flex items-center justify-between gap-3 border-b border-dashed border-border last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-foreground truncate">
                        {linked ? (
                          <Link
                            href={`/company/people/${linked.id}`}
                            className="hover:underline font-medium"
                          >
                            {linked.preferred_name || linked.full_name}
                          </Link>
                        ) : (
                          <span className="text-subtle">
                            {m.name} (no HR record)
                          </span>
                        )}
                      </div>
                      <div className="text-2xs text-subtle mt-0.5 capitalize">
                        {m.role.replace(/_/g, " ")}
                      </div>
                    </div>
                    {linked ? (
                      <StatusPill status={linked.status} />
                    ) : (
                      <span className="text-2xs text-subtle uppercase tracking-wider">
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
        <div className="bg-surface border border-border-faint rounded overflow-hidden md:col-span-2">
          <div className="px-5 py-4 border-b border-dashed border-border flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">Not on a pod</h3>
            <span className="text-2xs uppercase tracking-wider text-subtle tabular-nums">
              {unassigned.length}
            </span>
          </div>
          <ul>
            {unassigned.map((p) => (
              <li
                key={p.id}
                className="px-5 py-3 flex items-center justify-between gap-3 border-b border-dashed border-border last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/company/people/${p.id}`}
                    className="text-sm font-medium text-foreground hover:underline truncate"
                  >
                    {p.preferred_name || p.full_name}
                  </Link>
                  <div className="text-2xs text-subtle mt-0.5">
                    {p.job_title || "(no title)"}
                  </div>
                </div>
                <StatusPill status={p.status} />
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
    <div className="space-y-6">
      {STATUS_ORDER.map((s) => {
        const bucket = people.filter((p) => p.status === s);
        if (bucket.length === 0) return null;
        return (
          <div
            key={s}
            className="bg-surface border border-border-faint rounded overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-dashed border-border flex items-center justify-between">
              <StatusPill status={s} />
              <span className="text-2xs uppercase tracking-wider text-subtle tabular-nums">
                {bucket.length}
              </span>
            </div>
            <ul>
              {bucket.map((p) => (
                <li
                  key={p.id}
                  className="px-5 py-3 flex items-center gap-3 border-b border-dashed border-border last:border-0"
                >
                  <PersonAvatar person={p} size="sm" />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/company/people/${p.id}`}
                      className="text-sm font-medium text-foreground hover:underline truncate"
                    >
                      {p.preferred_name || p.full_name}
                    </Link>
                    <div className="text-2xs text-subtle mt-0.5">
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
