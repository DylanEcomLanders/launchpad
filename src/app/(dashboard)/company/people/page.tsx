"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  ListBulletIcon,
} from "@heroicons/react/24/outline";
import { peopleStore, uid, nowISO, todayISO } from "@/lib/company/data";
import {
  type Person,
  type EmploymentType,
  type PersonStatus,
  DEPARTMENTS,
} from "@/lib/company/types";
import { inputClass, labelClass, selectClass } from "@/lib/form-styles";
import { initials, deptColor, STATUS_BADGE } from "@/lib/company/ui";

type View = "grid" | "table";

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
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

  async function handleAdd(person: Person) {
    await peopleStore.create(person);
    setPeople((rows) => [person, ...rows]);
    setShowAdd(false);
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-56">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-[#7A7A7A] z-10" />
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
              <option value="active">Active</option>
              <option value="on_leave">On leave</option>
              <option value="notice">Notice</option>
              <option value="left">Left</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-[#E5E5EA] overflow-hidden">
            <button
              onClick={() => setView("grid")}
              className={`p-2 ${view === "grid" ? "bg-[#1B1B1B] text-white" : "bg-white text-[#7A7A7A]"}`}
              title="Grid view"
            >
              <Squares2X2Icon className="size-4" />
            </button>
            <button
              onClick={() => setView("table")}
              className={`p-2 ${view === "table" ? "bg-[#1B1B1B] text-white" : "bg-white text-[#7A7A7A]"}`}
              title="Table view"
            >
              <ListBulletIcon className="size-4" />
            </button>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#1B1B1B] text-white text-sm rounded-lg hover:opacity-90"
          >
            <PlusIcon className="size-4" />
            Add person
          </button>
        </div>
      </div>

      {!hydrated ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 bg-[#F7F8FA] rounded-xl animate-pulse" />
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
      className="block bg-white border border-[#E5E5EA] rounded-xl p-4 hover:border-[#1B1B1B] transition-colors shadow-[var(--shadow-soft)]"
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
          <div className="font-medium text-[#1B1B1B] truncate">{person.preferred_name || person.full_name}</div>
          <div className="text-xs text-[#7A7A7A] truncate">{person.job_title || "—"}</div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span
          className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded"
          style={{ background: status.bg, color: status.text }}
        >
          {status.label}
        </span>
        <span className="text-[11px] text-[#7A7A7A]">
          {person.employment_type === "employee" ? "Employee" : "Contractor"}
        </span>
      </div>
      {person.department && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#7A7A7A]">
          <span className="size-2 rounded-full" style={{ background: deptColor(person.department) }} />
          {person.department}
        </div>
      )}
    </Link>
  );
}

function PeopleTable({ rows }: { rows: Person[] }) {
  return (
    <div className="bg-white border border-[#E5E5EA] rounded-xl overflow-hidden shadow-[var(--shadow-soft)]">
      <table className="w-full text-sm">
        <thead className="bg-[#F7F8FA] text-[11px] uppercase tracking-wider text-[#7A7A7A]">
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
              <tr key={p.id} className="border-t border-[#E5E5EA] hover:bg-[#F7F8FA]">
                <td className="px-4 py-3">
                  <Link href={`/company/people/${p.id}`} className="font-medium text-[#1B1B1B] hover:underline">
                    {p.preferred_name || p.full_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[#7A7A7A]">{p.job_title || "—"}</td>
                <td className="px-4 py-3 text-[#7A7A7A]">{p.department || "—"}</td>
                <td className="px-4 py-3 text-[#7A7A7A] capitalize">{p.employment_type}</td>
                <td className="px-4 py-3">
                  <span
                    className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded"
                    style={{ background: status.bg, color: status.text }}
                  >
                    {status.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#7A7A7A]">{p.email || "—"}</td>
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
    <div className="bg-white border border-dashed border-[#E5E5EA] rounded-xl p-12 text-center">
      <div className="text-sm text-[#7A7A7A] mb-3">
        {hasFilter ? "No people match these filters." : "No people yet — add your first team member."}
      </div>
      {!hasFilter && (
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#1B1B1B] text-white text-sm rounded-lg hover:opacity-90"
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
  onSave: (p: Person) => void;
}) {
  const [name, setName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState<string>(DEPARTMENTS[0]);
  const [employmentType, setEmploymentType] = useState<EmploymentType>("employee");
  const [email, setEmail] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const now = nowISO();
    const person: Person = {
      id: uid(),
      full_name: name.trim(),
      job_title: jobTitle.trim() || undefined,
      department,
      employment_type: employmentType,
      status: "active",
      start_date: todayISO(),
      email: email.trim() || undefined,
      created_at: now,
      updated_at: now,
    };
    onSave(person);
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <form
        onSubmit={submit}
        className="bg-white rounded-xl shadow-xl w-full max-w-md p-6"
      >
        <h2 className="text-lg font-semibold text-[#1B1B1B] mb-4">Add person</h2>
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
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-2 text-sm text-[#7A7A7A] hover:text-[#1B1B1B]"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-3 py-2 bg-[#1B1B1B] text-white text-sm rounded-lg hover:opacity-90"
          >
            Add
          </button>
        </div>
      </form>
    </div>
  );
}
