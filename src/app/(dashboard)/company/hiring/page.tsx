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
import { CANDIDATE_STATUS_BADGE } from "@/lib/company/ui";
import { GenerateAgreementsModal } from "@/components/agreements/generate-modal";
import type { Agreement } from "@/lib/agreements/types";

export default function HiringPage() {
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
    /* Open the agreements modal so NDA + contract can be generated in
     * the same beat. The modal can be cancelled if not needed yet - the
     * Person row is already created either way. */
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
    return <div className="h-96 bg-[#0C0C0C] rounded-xl animate-pulse" />;
  }

  return (
    <div>
      {/* Open roles strip */}
      <div className="bg-[#181818] border border-[#2A2A2A] rounded-xl p-4 mb-4 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#71757D]">
            Open roles
          </h2>
          <button
            onClick={() => setShowAddRole(true)}
            className="inline-flex items-center gap-1 text-xs text-[#E5E5EA] hover:underline"
          >
            <PlusIcon className="size-3.5" /> Add role
          </button>
        </div>
        {roles.filter((r) => r.status === "open").length === 0 ? (
          <p className="text-xs text-[#71757D]">No open roles. Add one to start collecting candidates.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {roles
              .filter((r) => r.status === "open")
              .map((r) => {
                const count = candidates.filter((c) => c.role_id === r.id && c.status !== "rejected" && c.status !== "hired").length;
                const active = roleFilter === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setRoleFilter(active ? "all" : r.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs border ${
                      active
                        ? "bg-white text-[#0C0C0C] border-white"
                        : "bg-[#181818] text-[#E5E5EA] border-[#2A2A2A] hover:border-white"
                    }`}
                  >
                    {r.title} <span className="opacity-70">· {count}</span>
                  </button>
                );
              })}
            {roleFilter !== "all" && (
              <button
                onClick={() => setRoleFilter("all")}
                className="px-3 py-1.5 rounded-lg text-xs text-[#71757D] hover:text-[#E5E5EA]"
              >
                Clear filter
              </button>
            )}
          </div>
        )}
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 overflow-x-auto pb-4">
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
      <div className="mt-4">
        <button
          onClick={() => setShowRejected((s) => !s)}
          className="flex items-center gap-1 text-sm text-[#71757D] hover:text-[#E5E5EA]"
        >
          {showRejected ? <ChevronDownIcon className="size-4" /> : <ChevronRightIcon className="size-4" />}
          Rejected ({byColumn.rejected.length})
        </button>
        {showRejected && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2">
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
      className={`bg-[#0C0C0C] rounded-xl p-3 min-h-[300px] transition-colors ${
        over ? "ring-2 ring-[#1B1B1B] ring-offset-2" : ""
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
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="text-[11px] uppercase tracking-wider font-semibold text-[#71757D]">
          {label} <span className="text-[#C5C5C5]">· {cards.length}</span>
        </div>
        <button
          onClick={onAddClick}
          className="text-[#71757D] hover:text-[#E5E5EA]"
          title="Add candidate"
        >
          <PlusIcon className="size-4" />
        </button>
      </div>
      <div className="space-y-2">
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
          <div className="text-xs text-[#C5C5C5] py-4 text-center">No candidates</div>
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
  const badge = CANDIDATE_STATUS_BADGE[candidate.status];
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", candidate.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={onClick}
      className="bg-[#181818] border border-[#2A2A2A] rounded-lg p-3 cursor-pointer hover:border-white transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="font-medium text-sm text-[#E5E5EA] truncate">{candidate.full_name}</div>
        {candidate.status === "rejected" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMove(candidate.id, "applied");
            }}
            className="text-[10px] text-[#71757D] hover:text-[#E5E5EA]"
            title="Restore"
          >
            ↺
          </button>
        )}
      </div>
      <div className="text-xs text-[#71757D] truncate">{role?.title || "No role"}</div>
      <div className="flex items-center gap-1.5 mt-2 text-[10px]">
        {candidate.source && (
          <span
            className="px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider"
            style={{ background: badge.bg, color: badge.text }}
          >
            {candidate.source}
          </span>
        )}
        <span className="text-[#C5C5C5]">{fmtDateUK(candidate.date_added)}</span>
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
      <form onSubmit={submit} className="bg-[#181818] rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-[#E5E5EA] mb-4">Add candidate</h2>
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
              <option value="">— None —</option>
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
        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onCancel} className="px-3 py-2 text-sm text-[#71757D] hover:text-[#E5E5EA]">
            Cancel
          </button>
          <button type="submit" className="px-3 py-2 bg-white text-[#0C0C0C] text-sm rounded-lg hover:opacity-90">
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
      <form onSubmit={submit} className="bg-[#181818] rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-[#E5E5EA] mb-4">Add open role</h2>
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
        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onCancel} className="px-3 py-2 text-sm text-[#71757D] hover:text-[#E5E5EA]">
            Cancel
          </button>
          <button type="submit" className="px-3 py-2 bg-white text-[#0C0C0C] text-sm rounded-lg hover:opacity-90">
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
        className="bg-[#181818] w-full max-w-lg h-full overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-[#181818] border-b border-[#2A2A2A] px-5 py-3 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-[#E5E5EA]">{candidate.full_name}</h2>
          <button onClick={onClose} className="text-[#71757D] hover:text-[#E5E5EA]">
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
                <option value="">— None —</option>
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
              <div className="flex items-center justify-between bg-[#0C0C0C] rounded-lg px-3 py-2 text-sm">
                <span className="truncate text-[#E5E5EA]">{candidate.cv_name || "CV"}</span>
                <div className="flex items-center gap-2">
                  <a
                    href={candidate.cv_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#E5E5EA] hover:underline inline-flex items-center gap-1 text-xs"
                  >
                    <ArrowDownTrayIcon className="size-3.5" /> View
                  </a>
                  <button
                    onClick={() => onPatch({ cv_url: undefined, cv_name: undefined })}
                    className="text-xs text-[#B91C1C] hover:underline"
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
          <div className="text-[11px] text-[#71757D] pt-2 border-t border-[#2A2A2A]">
            Added {fmtDateUK(candidate.date_added)} · Updated {fmtDateUK(candidate.updated_at)}
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {candidate.status === "hired" ? (
              <button
                onClick={onConvert}
                className="inline-flex items-center gap-1 px-3 py-2 bg-white text-[#0C0C0C] text-sm rounded-lg hover:opacity-90"
              >
                Convert to person
              </button>
            ) : null}
            <button
              onClick={onDelete}
              className="px-3 py-2 text-sm text-[#B91C1C] hover:bg-red-500/15 rounded-lg"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
