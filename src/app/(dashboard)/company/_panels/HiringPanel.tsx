"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PlusIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import {
  candidatesStore,
  openRolesStore,
  peopleStore,
  uid,
  nowISO,
  todayISO,
  fmtDateUK,
} from "@/lib/company/data";
import {
  type Candidate,
  type CandidateStatus,
  type OpenRole,
  type RoleStatus,
  type EmploymentType,
  type Person,
  CANDIDATE_COLUMNS,
  DEPARTMENTS,
} from "@/lib/company/types";
import { inputClass, labelClass, selectClass, textareaClass } from "@/lib/form-styles";
import { GenerateAgreementsModal } from "@/components/agreements/generate-modal";
import type { Agreement } from "@/lib/agreements/types";

/* Pipeline is a stage palette, so stage dots come from the sanctioned
 * chart tokens (globals.css --color-chart-N) - never per-stage hex. The
 * data-layer CANDIDATE_COLUMNS colour + CANDIDATE_STATUS_BADGE hex are
 * intentionally not consumed here; presentation maps stage by meaning. */
const STAGE_DOT: Record<CandidateStatus, string> = {
  applied: "--color-chart-6",
  screening: "--color-chart-1",
  interview: "--color-chart-3",
  offer: "--color-chart-8",
  hired: "--color-success",
  rejected: "--color-subtle",
};

export default function HiringPanel() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [roles, setRoles] = useState<OpenRole[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [showRejected, setShowRejected] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composeFor, setComposeFor] = useState<CandidateStatus | null>(null);
  const [showAddRole, setShowAddRole] = useState(false);
  /* Person we just promoted from a candidate; opens the agreements
   * modal pre-filled so Dylan generates NDA + contract in the same flow. */
  const [hiredPerson, setHiredPerson] = useState<Person | null>(null);

  useEffect(() => {
    Promise.all([candidatesStore.getAll(), openRolesStore.getAll()]).then(([c, r]) => {
      setCandidates(c);
      setRoles(r);
      setHydrated(true);
    });
  }, []);

  const visibleCandidates = useMemo(() => {
    return candidates.filter((c) => {
      if (roleFilter !== "all" && c.role_id !== roleFilter) return false;
      return true;
    });
  }, [candidates, roleFilter]);

  const byColumn = useMemo(() => {
    const map: Record<CandidateStatus, Candidate[]> = {
      applied: [],
      screening: [],
      interview: [],
      offer: [],
      hired: [],
      rejected: [],
    };
    visibleCandidates.forEach((c) => map[c.status].push(c));
    return map;
  }, [visibleCandidates]);

  async function moveCandidate(candidateId: string, newStatus: CandidateStatus) {
    const c = candidates.find((x) => x.id === candidateId);
    if (!c) return;
    const next = { ...c, status: newStatus, updated_at: nowISO() };
    setCandidates((rows) => rows.map((r) => (r.id === candidateId ? next : r)));
    await candidatesStore.update(candidateId, next);
  }

  async function addCandidate(c: Candidate) {
    await candidatesStore.create(c);
    setCandidates((rows) => [c, ...rows]);
    setComposeFor(null);
  }

  async function patchCandidate(id: string, updates: Partial<Candidate>) {
    const cur = candidates.find((c) => c.id === id);
    if (!cur) return;
    const next = { ...cur, ...updates, updated_at: nowISO() };
    setCandidates((rows) => rows.map((r) => (r.id === id ? next : r)));
    await candidatesStore.update(id, next);
  }

  async function removeCandidate(id: string) {
    if (!confirm("Delete candidate?")) return;
    await candidatesStore.remove(id);
    setCandidates((rows) => rows.filter((r) => r.id !== id));
    setSelectedId(null);
  }

  async function convertToPerson(c: Candidate) {
    const role = roles.find((r) => r.id === c.role_id);
    const now = nowISO();
    const person: Person = {
      id: uid(),
      full_name: c.full_name,
      email: c.email,
      phone: c.phone,
      job_title: role?.title,
      department: role?.department,
      employment_type: role?.employment_type || "employee",
      status: "active",
      start_date: todayISO(),
      created_at: now,
      updated_at: now,
    };
    await peopleStore.create(person);
    await patchCandidate(c.id, { status: "hired" });
    /* Login credentials are now set manually by admin on the Person
     * detail page (Set credentials button). The invite-by-email flow
     * was removed - admin controls who gets access + when. Open the
     * agreements modal so the contract can be generated in the same
     * beat. */
    setHiredPerson(person);
  }

  function onAgreementsCreated(created: Agreement[]) {
    setHiredPerson(null);
    if (created.length === 1) {
      window.location.href = `/company/contracts/${created[0].id}`;
    } else if (created.length > 1) {
      window.location.href = `/company/contracts`;
    }
  }

  async function addRole(r: OpenRole) {
    await openRolesStore.create(r);
    setRoles((rows) => [r, ...rows]);
    setShowAddRole(false);
  }

  async function patchRole(id: string, updates: Partial<OpenRole>) {
    const cur = roles.find((r) => r.id === id);
    if (!cur) return;
    const next = { ...cur, ...updates };
    setRoles((rows) => rows.map((r) => (r.id === id ? next : r)));
    await openRolesStore.update(id, next);
  }

  const selected = selectedId ? candidates.find((c) => c.id === selectedId) : null;

  if (!hydrated) {
    return <div className="h-96 bg-surface rounded-lg border border-border animate-pulse" />;
  }

  return (
    <div className="space-y-3">
      {/* Open roles strip */}
      <div className="bg-surface border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xs uppercase tracking-wider text-subtle font-medium">
            Open roles
          </h2>
          <button
            onClick={() => setShowAddRole(true)}
            className="inline-flex items-center gap-1.5 text-2xs font-medium text-muted hover:text-foreground transition-colors"
          >
            <PlusIcon className="size-4" /> Add role
          </button>
        </div>
        {roles.filter((r) => r.status === "open").length === 0 ? (
          <p className="text-sm text-subtle">No open roles. Add one to start collecting candidates.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-0.5">
            {roles
              .filter((r) => r.status === "open")
              .map((r) => {
                const count = candidates.filter((c) => c.role_id === r.id && c.status !== "rejected" && c.status !== "hired").length;
                const active = roleFilter === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setRoleFilter(active ? "all" : r.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-2xs font-medium transition-colors ${
                      active
                        ? "bg-surface-raised text-foreground"
                        : "text-muted hover:text-foreground hover:bg-surface-raised"
                    }`}
                  >
                    {r.title}
                    <span className="tabular-nums text-subtle">{count}</span>
                  </button>
                );
              })}
            {roleFilter !== "all" && (
              <button
                onClick={() => setRoleFilter("all")}
                className="px-3 py-1 rounded-md text-2xs font-medium text-subtle hover:text-foreground transition-colors"
              >
                Clear filter
              </button>
            )}
          </div>
        )}
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CANDIDATE_COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            label={col.label}
            cards={byColumn[col.id]}
            roles={roles}
            onAddClick={() => setComposeFor(col.id)}
            onCardClick={(id) => setSelectedId(id)}
            onMove={moveCandidate}
          />
        ))}
      </div>

      {/* Rejected archive */}
      <div>
        <button
          onClick={() => setShowRejected((s) => !s)}
          className="flex items-center gap-1.5 text-sm text-subtle hover:text-foreground transition-colors"
        >
          {showRejected ? <ChevronDownIcon className="size-4" /> : <ChevronRightIcon className="size-4" />}
          Rejected ({byColumn.rejected.length})
        </button>
        {showRejected && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {byColumn.rejected.map((c) => (
              <CandidateCard
                key={c.id}
                candidate={c}
                roles={roles}
                onClick={() => setSelectedId(c.id)}
                onMove={moveCandidate}
              />
            ))}
          </div>
        )}
      </div>

      {composeFor && (
        <ComposeCandidateModal
          status={composeFor}
          roles={roles}
          onCancel={() => setComposeFor(null)}
          onSave={addCandidate}
        />
      )}

      {showAddRole && (
        <AddRoleModal onCancel={() => setShowAddRole(false)} onSave={addRole} />
      )}

      {selected && (
        <CandidateSidePanel
          candidate={selected}
          roles={roles}
          onClose={() => setSelectedId(null)}
          onPatch={(u) => patchCandidate(selected.id, u)}
          onDelete={() => removeCandidate(selected.id)}
          onConvert={() => convertToPerson(selected)}
        />
      )}

      {/* Post-hire agreements modal - opens automatically after a candidate
          is converted to a Person so NDA + contract can be generated in
          the same beat. Skippable; the Person row exists either way. */}
      {hiredPerson && (
        <GenerateAgreementsModal
          open={!!hiredPerson}
          onClose={() => setHiredPerson(null)}
          person={hiredPerson}
          existing={[]}
          onCreated={onAgreementsCreated}
        />
      )}
    </div>
  );
}

function KanbanColumn({
  id,
  label,
  cards,
  roles,
  onAddClick,
  onCardClick,
  onMove,
}: {
  id: CandidateStatus;
  label: string;
  cards: Candidate[];
  roles: OpenRole[];
  onAddClick: () => void;
  onCardClick: (id: string) => void;
  onMove: (cid: string, status: CandidateStatus) => void;
}) {
  const [over, setOver] = useState(false);
  return (
    <div
      className={`rounded-lg flex flex-col border transition-colors ${
        over ? "bg-surface-raised border-dashed border-ring" : "bg-surface border-border"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const cid = e.dataTransfer.getData("text/plain");
        if (cid) onMove(cid, id);
      }}
    >
      <div className="px-3 py-3 border-b border-dashed border-border">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="shrink-0 size-2 rounded-full"
              style={{ background: `var(${STAGE_DOT[id]})` }}
            />
            <span className="text-2xs font-medium uppercase tracking-wider text-foreground truncate">
              {label}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-2xs font-medium text-subtle tabular-nums">
              {cards.length}
            </span>
            <button
              onClick={onAddClick}
              className="text-subtle hover:text-foreground transition-colors"
              title="Add candidate"
            >
              <PlusIcon className="size-4" />
            </button>
          </div>
        </div>
      </div>
      <div className="p-2 space-y-2 flex-1 min-h-[60vh]">
        {cards.map((c) => (
          <CandidateCard
            key={c.id}
            candidate={c}
            roles={roles}
            onClick={() => onCardClick(c.id)}
            onMove={onMove}
          />
        ))}
        {cards.length === 0 && (
          <div className="text-xs text-subtle py-4 text-center">No candidates</div>
        )}
      </div>
    </div>
  );
}

function CandidateCard({
  candidate,
  roles,
  onClick,
  onMove,
}: {
  candidate: Candidate;
  roles: OpenRole[];
  onClick: () => void;
  onMove: (cid: string, status: CandidateStatus) => void;
}) {
  const role = roles.find((r) => r.id === candidate.role_id);
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", candidate.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={onClick}
      className="bg-surface-raised border border-border rounded-lg p-3 cursor-pointer hover:border-ring transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="shrink-0 size-1.5 rounded-full"
            style={{ background: `var(${STAGE_DOT[candidate.status]})` }}
          />
          <div className="font-medium text-sm text-foreground truncate">{candidate.full_name}</div>
        </div>
        {candidate.status === "rejected" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMove(candidate.id, "applied");
            }}
            className="text-2xs text-subtle hover:text-foreground shrink-0"
            title="Restore"
          >
            ↺
          </button>
        )}
      </div>
      <div className="text-xs text-subtle truncate">{role?.title || "No role"}</div>
      <div className="flex items-center gap-1.5 mt-2 text-2xs">
        {candidate.source && (
          <span className="px-1.5 py-0.5 rounded bg-surface text-subtle font-medium uppercase tracking-wider">
            {candidate.source}
          </span>
        )}
        <span className="text-subtle">{fmtDateUK(candidate.date_added)}</span>
      </div>
    </div>
  );
}

function ComposeCandidateModal({
  status,
  roles,
  onCancel,
  onSave,
}: {
  status: CandidateStatus;
  roles: OpenRole[];
  onCancel: () => void;
  onSave: (c: Candidate) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState(roles.find((r) => r.status === "open")?.id || "");
  const [source, setSource] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const now = nowISO();
    const c: Candidate = {
      id: uid(),
      full_name: name.trim(),
      email: email.trim() || undefined,
      role_id: roleId || undefined,
      source: source.trim() || undefined,
      status,
      date_added: todayISO(),
      created_at: now,
      updated_at: now,
    };
    onSave(c);
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-surface-raised border border-border rounded-lg w-full max-w-md p-5">
        <h2 className="text-lg font-medium text-foreground mb-4">Add candidate</h2>
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Name</label>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Role</label>
            <select value={roleId} onChange={(e) => setRoleId(e.target.value)} className={selectClass}>
              <option value="">None</option>
              {roles
                .filter((r) => r.status === "open")
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Source</label>
            <input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="LinkedIn, referral, job board…"
              className={inputClass}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onCancel} className="px-3 py-2 text-xs font-medium text-subtle hover:text-foreground transition-colors">
            Cancel
          </button>
          <button type="submit" className="px-3 py-2 bg-foreground text-background text-xs font-medium rounded-md hover:opacity-90">
            Add
          </button>
        </div>
      </form>
    </div>
  );
}

function AddRoleModal({ onCancel, onSave }: { onCancel: () => void; onSave: (r: OpenRole) => void }) {
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState<string>(DEPARTMENTS[0]);
  const [type, setType] = useState<EmploymentType>("employee");
  const [description, setDescription] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const now = nowISO();
    onSave({
      id: uid(),
      title: title.trim(),
      department,
      employment_type: type,
      status: "open",
      description: description.trim() || undefined,
      date_opened: todayISO(),
      created_at: now,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-surface-raised border border-border rounded-lg w-full max-w-md p-5">
        <h2 className="text-lg font-medium text-foreground mb-4">Add open role</h2>
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Title</label>
            <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Department</label>
              <select value={department} onChange={(e) => setDepartment(e.target.value)} className={selectClass}>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Type</label>
              <select value={type} onChange={(e) => setType(e.target.value as EmploymentType)} className={selectClass}>
                <option value="employee">Employee</option>
                <option value="contractor">Contractor</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={textareaClass}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onCancel} className="px-3 py-2 text-xs font-medium text-subtle hover:text-foreground transition-colors">
            Cancel
          </button>
          <button type="submit" className="px-3 py-2 bg-foreground text-background text-xs font-medium rounded-md hover:opacity-90">
            Add
          </button>
        </div>
      </form>
    </div>
  );
}

function CandidateSidePanel({
  candidate,
  roles,
  onClose,
  onPatch,
  onDelete,
  onConvert,
}: {
  candidate: Candidate;
  roles: OpenRole[];
  onClose: () => void;
  onPatch: (u: Partial<Candidate>) => void;
  onDelete: () => void;
  onConvert: () => void;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleCV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("bucket", "company-cvs");
    try {
      const res = await fetch("/api/company/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (json.url) onPatch({ cv_url: json.url, cv_name: json.original });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex justify-end" onClick={onClose}>
      <div
        className="bg-surface-raised border-l border-border w-full max-w-lg h-full overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-surface-raised border-b border-dashed border-border px-5 py-3 flex items-center justify-between z-10">
          <h2 className="text-lg font-medium text-foreground">{candidate.full_name}</h2>
          <button onClick={onClose} className="text-subtle hover:text-foreground transition-colors">
            <XMarkIcon className="size-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className={labelClass}>Name</label>
            <input
              value={candidate.full_name}
              onChange={(e) => onPatch({ full_name: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={candidate.email || ""}
                onChange={(e) => onPatch({ email: e.target.value || undefined })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input
                value={candidate.phone || ""}
                onChange={(e) => onPatch({ phone: e.target.value || undefined })}
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Role</label>
              <select
                value={candidate.role_id || ""}
                onChange={(e) => onPatch({ role_id: e.target.value || undefined })}
                className={selectClass}
              >
                <option value="">None</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select
                value={candidate.status}
                onChange={(e) => onPatch({ status: e.target.value as CandidateStatus })}
                className={selectClass}
              >
                <option value="applied">Applied</option>
                <option value="screening">Screening</option>
                <option value="interview">Interview</option>
                <option value="offer">Offer</option>
                <option value="hired">Hired</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Source</label>
            <input
              value={candidate.source || ""}
              onChange={(e) => onPatch({ source: e.target.value || undefined })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>CV</label>
            {candidate.cv_url ? (
              <div className="flex items-center justify-between bg-surface border border-border rounded-lg px-3 py-2 text-sm">
                <span className="truncate text-foreground">{candidate.cv_name || "CV"}</span>
                <div className="flex items-center gap-2">
                  <a
                    href={candidate.cv_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground hover:underline inline-flex items-center gap-1 text-xs"
                  >
                    <ArrowDownTrayIcon className="size-3.5" /> View
                  </a>
                  <button
                    onClick={() => onPatch({ cv_url: undefined, cv_name: undefined })}
                    className="text-xs text-danger hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <input type="file" accept="application/pdf" onChange={handleCV} disabled={uploading} className="text-sm" />
            )}
          </div>
          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              value={candidate.notes || ""}
              onChange={(e) => onPatch({ notes: e.target.value || undefined })}
              rows={6}
              className={textareaClass}
              placeholder="Markdown supported."
            />
          </div>
          <div className="text-2xs text-subtle pt-2 border-t border-dashed border-border">
            Added {fmtDateUK(candidate.date_added)} · Updated {fmtDateUK(candidate.updated_at)}
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {candidate.status === "hired" ? (
              <button
                onClick={onConvert}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-foreground text-background text-xs font-medium rounded-md hover:opacity-90"
              >
                Convert to person
              </button>
            ) : null}
            <button
              onClick={onDelete}
              className="px-3 py-2 text-xs font-medium text-danger hover:bg-danger/10 rounded-md transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
