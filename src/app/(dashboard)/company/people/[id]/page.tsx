"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftIcon,
  TrashIcon,
  PlusIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import { peopleStore, uid, nowISO, fmtDateUK, fmtMoney } from "@/lib/company/data";
import { agreementStore } from "@/lib/agreements/data";
import type { Agreement } from "@/lib/agreements/types";
import { AGREEMENT_STATUS_META, AGREEMENT_KIND_LABEL } from "@/lib/agreements/types";
import { GenerateAgreementsModal } from "@/components/agreements/generate-modal";
import {
  type Person,
  type CompensationChange,
  type Review,
  type Goal,
  type PersonNote,
  DEPARTMENTS,
} from "@/lib/company/types";
import { inputClass, labelClass, selectClass, textareaClass } from "@/lib/form-styles";
import { initials, deptColor, STATUS_BADGE } from "@/lib/company/ui";
import { useRole } from "@/components/auth-gate";

type Tab = "overview" | "financial" | "performance" | "agreements";

export default function PersonProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const role = useRole();

  const [person, setPerson] = useState<Person | null>(null);
  const [allPeople, setAllPeople] = useState<Person[]>([]);
  const [tab, setTab] = useState<Tab>("overview");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    Promise.all([peopleStore.getById(id), peopleStore.getAll()]).then(([p, all]) => {
      setPerson(p);
      setAllPeople(all);
      setHydrated(true);
    });
  }, [id]);

  async function patch(updates: Partial<Person>) {
    if (!person) return;
    const next = { ...person, ...updates, updated_at: nowISO() };
    setPerson(next);
    await peopleStore.update(id, next);
  }

  async function handleDelete() {
    if (!confirm("Delete this person? This cannot be undone.")) return;
    await peopleStore.remove(id);
    router.push("/company/people");
  }

  if (!hydrated) {
    return <div className="h-32 bg-[#F7F8FA] rounded-xl animate-pulse" />;
  }
  if (!person) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-[#7A7A7A] mb-3">Person not found.</p>
        <Link href="/company/people" className="text-sm text-[#1B1B1B] hover:underline">
          Back to People
        </Link>
      </div>
    );
  }

  const status = STATUS_BADGE[person.status];
  const isAdmin = role === "admin";
  const tabs: { id: Tab; label: string; visible: boolean }[] = [
    { id: "overview", label: "Overview", visible: true },
    { id: "agreements", label: "Agreements", visible: isAdmin },
    { id: "financial", label: "Financial", visible: isAdmin },
    { id: "performance", label: "Performance", visible: isAdmin },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/company/people"
          className="inline-flex items-center gap-1 text-sm text-[#7A7A7A] hover:text-[#1B1B1B]"
        >
          <ArrowLeftIcon className="size-4" />
          Back to People
        </Link>
        <button
          onClick={handleDelete}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-[#B91C1C] hover:bg-[#FEE2E2] rounded-md"
        >
          <TrashIcon className="size-3.5" />
          Delete
        </button>
      </div>

      <div className="bg-white border border-[#E5E5EA] rounded-xl p-6 mb-4 shadow-[var(--shadow-soft)]">
        <div className="flex items-start gap-4">
          <AvatarWithUpload person={person} onUpdate={patch} />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-baseline gap-2 mb-1">
              <h2 className="text-xl font-semibold text-[#1B1B1B]">{person.full_name}</h2>
              {person.preferred_name && person.preferred_name !== person.full_name && (
                <span className="text-sm text-[#7A7A7A]">"{person.preferred_name}"</span>
              )}
              <span
                className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded"
                style={{ background: status.bg, color: status.text }}
              >
                {status.label}
              </span>
            </div>
            <div className="text-sm text-[#7A7A7A]">
              {person.job_title || "—"}
              {person.department && (
                <>
                  {" · "}
                  <span className="inline-flex items-center gap-1">
                    <span className="size-2 rounded-full" style={{ background: deptColor(person.department) }} />
                    {person.department}
                  </span>
                </>
              )}
              {" · "}
              {person.employment_type === "employee" ? "Employee" : "Contractor"}
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-[#E5E5EA] mb-6">
        <div className="flex gap-1">
          {tabs
            .filter((t) => t.visible)
            .map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2.5 text-sm border-b-2 transition-colors ${
                  tab === t.id
                    ? "border-[#1B1B1B] text-[#1B1B1B] font-medium"
                    : "border-transparent text-[#7A7A7A] hover:text-[#1B1B1B]"
                }`}
              >
                {t.label}
              </button>
            ))}
        </div>
      </div>

      {tab === "overview" && (
        <OverviewTab person={person} allPeople={allPeople} onPatch={patch} />
      )}
      {tab === "agreements" && isAdmin && (
        <AgreementsTab person={person} />
      )}
      {tab === "financial" && isAdmin && (
        <FinancialTab person={person} onPatch={patch} />
      )}
      {tab === "performance" && isAdmin && (
        <PerformanceTab person={person} onPatch={patch} />
      )}
    </div>
  );
}

/* ─────────────── Avatar w/ upload ─────────────── */

function AvatarWithUpload({
  person,
  onUpdate,
}: {
  person: Person;
  onUpdate: (u: Partial<Person>) => void;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("bucket", "company-avatars");
    try {
      const res = await fetch("/api/company/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (json.url) onUpdate({ avatar_url: json.url });
    } finally {
      setUploading(false);
    }
  }

  return (
    <label className="relative cursor-pointer group flex-shrink-0">
      {person.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={person.avatar_url}
          alt={person.full_name}
          className="size-16 rounded-full object-cover"
        />
      ) : (
        <div
          className="size-16 rounded-full flex items-center justify-center text-white text-lg font-semibold"
          style={{ background: deptColor(person.department) }}
        >
          {initials(person.full_name)}
        </div>
      )}
      <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
        <PhotoIcon className="size-5 text-white" />
      </div>
      <input
        type="file"
        accept="image/*"
        onChange={handleFile}
        disabled={uploading}
        className="hidden"
      />
    </label>
  );
}

/* ─────────────── Overview tab ─────────────── */

function OverviewTab({
  person,
  allPeople,
  onPatch,
}: {
  person: Person;
  allPeople: Person[];
  onPatch: (u: Partial<Person>) => void;
}) {
  const others = allPeople.filter((p) => p.id !== person.id);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Section title="Personal">
        <Field label="Full name" value={person.full_name} onChange={(v) => onPatch({ full_name: v })} />
        <Field
          label="Preferred name"
          value={person.preferred_name || ""}
          onChange={(v) => onPatch({ preferred_name: v || undefined })}
        />
        <Field
          label="Date of birth"
          type="date"
          value={person.date_of_birth || ""}
          onChange={(v) => onPatch({ date_of_birth: v || undefined })}
        />
        <Field
          label="Location"
          value={person.location || ""}
          onChange={(v) => onPatch({ location: v || undefined })}
        />
      </Section>

      <Section title="Role">
        <Field
          label="Job title"
          value={person.job_title || ""}
          onChange={(v) => onPatch({ job_title: v || undefined })}
        />
        <FieldSelect
          label="Department"
          value={person.department || ""}
          options={["", ...DEPARTMENTS] as readonly string[]}
          onChange={(v) => onPatch({ department: v || undefined })}
        />
        <FieldSelect
          label="Reports to"
          value={person.reports_to || ""}
          options={["", ...others.map((p) => p.id)] as string[]}
          renderOption={(v) =>
            v === "" ? "— None —" : others.find((p) => p.id === v)?.full_name || v
          }
          onChange={(v) => onPatch({ reports_to: v || undefined })}
        />
        <FieldSelect
          label="Type"
          value={person.employment_type}
          options={["employee", "contractor"]}
          renderOption={(v) => (v === "employee" ? "Employee" : "Contractor")}
          onChange={(v) => onPatch({ employment_type: v as Person["employment_type"] })}
        />
        <FieldSelect
          label="Status"
          value={person.status}
          options={["active", "on_leave", "notice", "left"]}
          renderOption={(v) =>
            v === "on_leave" ? "On leave" : v === "left" ? "Left" : v.charAt(0).toUpperCase() + v.slice(1)
          }
          onChange={(v) => onPatch({ status: v as Person["status"] })}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Start date"
            type="date"
            value={person.start_date || ""}
            onChange={(v) => onPatch({ start_date: v || undefined })}
          />
          <Field
            label="End date"
            type="date"
            value={person.end_date || ""}
            onChange={(v) => onPatch({ end_date: v || undefined })}
          />
        </div>
      </Section>

      <Section title="Contact">
        <Field
          label="Email"
          type="email"
          value={person.email || ""}
          onChange={(v) => onPatch({ email: v || undefined })}
        />
        <Field
          label="Phone"
          value={person.phone || ""}
          onChange={(v) => onPatch({ phone: v || undefined })}
        />
      </Section>

      <Section title="Emergency contact">
        <Field
          label="Name"
          value={person.emergency_contact_name || ""}
          onChange={(v) => onPatch({ emergency_contact_name: v || undefined })}
        />
        <Field
          label="Relationship"
          value={person.emergency_contact_relationship || ""}
          onChange={(v) => onPatch({ emergency_contact_relationship: v || undefined })}
        />
        <Field
          label="Phone"
          value={person.emergency_contact_phone || ""}
          onChange={(v) => onPatch({ emergency_contact_phone: v || undefined })}
        />
      </Section>

      <Section title="Notes" className="md:col-span-2">
        <div>
          <label className={labelClass}>Notes</label>
          <textarea
            value={person.notes || ""}
            onChange={(e) => onPatch({ notes: e.target.value })}
            rows={4}
            className={textareaClass}
            placeholder="Free-form notes — markdown supported."
          />
        </div>
      </Section>
    </div>
  );
}

/* ─────────────── Financial tab ─────────────── */

function FinancialTab({
  person,
  onPatch,
}: {
  person: Person;
  onPatch: (u: Partial<Person>) => void;
}) {
  const history = person.compensation_history || [];

  function logChange(newAmount: number, reason: string) {
    const change: CompensationChange = {
      id: uid(),
      changed_at: new Date().toISOString().slice(0, 10),
      old_amount: person.compensation_amount ?? null,
      new_amount: newAmount,
      reason,
    };
    onPatch({
      compensation_amount: newAmount,
      compensation_history: [change, ...history],
    });
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Section title="Compensation">
        <FieldSelect
          label="Type"
          value={person.compensation_type || ""}
          options={["", "salary", "day_rate", "hourly", "monthly_retainer"]}
          renderOption={(v) =>
            !v
              ? "— Select —"
              : v === "day_rate"
              ? "Day rate"
              : v === "monthly_retainer"
              ? "Monthly retainer"
              : v.charAt(0).toUpperCase() + v.slice(1)
          }
          onChange={(v) => onPatch({ compensation_type: (v || undefined) as Person["compensation_type"] })}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Amount"
            type="number"
            value={person.compensation_amount?.toString() || ""}
            onChange={(v) => onPatch({ compensation_amount: v ? parseFloat(v) : undefined })}
          />
          <Field
            label="Currency"
            value={person.compensation_currency || "GBP"}
            onChange={(v) => onPatch({ compensation_currency: v })}
          />
        </div>
        <FieldSelect
          label="Frequency"
          value={person.payment_frequency || ""}
          options={["", "monthly", "weekly", "per_invoice"]}
          renderOption={(v) =>
            !v ? "— Select —" : v === "per_invoice" ? "Per invoice" : v.charAt(0).toUpperCase() + v.slice(1)
          }
          onChange={(v) => onPatch({ payment_frequency: (v || undefined) as Person["payment_frequency"] })}
        />
        <FieldSelect
          label="Method"
          value={person.payment_method || ""}
          options={["", "bank_transfer", "wise", "other"]}
          renderOption={(v) =>
            !v ? "— Select —" : v === "bank_transfer" ? "Bank transfer" : v === "wise" ? "Wise" : "Other"
          }
          onChange={(v) => onPatch({ payment_method: (v || undefined) as Person["payment_method"] })}
        />
      </Section>

      <Section title="Tax & banking">
        <FieldSelect
          label="Tax status"
          value={person.tax_status || ""}
          options={["", "PAYE", "self_employed", "ltd_company"]}
          renderOption={(v) =>
            !v ? "— Select —" : v === "self_employed" ? "Self-employed" : v === "ltd_company" ? "Ltd company" : "PAYE"
          }
          onChange={(v) => onPatch({ tax_status: (v || undefined) as Person["tax_status"] })}
        />
        <Field
          label="Company name"
          value={person.company_name || ""}
          onChange={(v) => onPatch({ company_name: v || undefined })}
        />
        <Field
          label="UTR / Company #"
          value={person.utr_or_company_number || ""}
          onChange={(v) => onPatch({ utr_or_company_number: v || undefined })}
        />
        <div>
          <label className={labelClass}>Bank details</label>
          <textarea
            value={person.bank_details || ""}
            onChange={(e) => onPatch({ bank_details: e.target.value })}
            rows={3}
            className={textareaClass}
            placeholder="Sort code, account number, or IBAN. Stored in plaintext — admin only."
          />
        </div>
      </Section>

      <Section title="Compensation history" className="md:col-span-2">
        <div className="flex items-center justify-end mb-2">
          <button
            onClick={() => {
              const amount = prompt("New amount?");
              if (!amount) return;
              const reason = prompt("Reason?") || "";
              logChange(parseFloat(amount), reason);
            }}
            className="inline-flex items-center gap-1 text-xs text-[#1B1B1B] hover:underline"
          >
            <PlusIcon className="size-3.5" /> Log change
          </button>
        </div>
        {history.length === 0 ? (
          <div className="text-xs text-[#7A7A7A] py-3">No history yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-[#7A7A7A]">
              <tr>
                <th className="text-left py-2 font-semibold">Date</th>
                <th className="text-left py-2 font-semibold">Old</th>
                <th className="text-left py-2 font-semibold">New</th>
                <th className="text-left py-2 font-semibold">Reason</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} className="border-t border-[#E5E5EA]">
                  <td className="py-2 text-[#7A7A7A]">{fmtDateUK(h.changed_at)}</td>
                  <td className="py-2 text-[#7A7A7A]">
                    {h.old_amount != null
                      ? fmtMoney(h.old_amount, person.compensation_currency || "GBP")
                      : "—"}
                  </td>
                  <td className="py-2 text-[#1B1B1B] font-medium">
                    {fmtMoney(h.new_amount, person.compensation_currency || "GBP")}
                  </td>
                  <td className="py-2 text-[#7A7A7A]">{h.reason || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}

/* ─────────────── Performance tab ─────────────── */

function PerformanceTab({
  person,
  onPatch,
}: {
  person: Person;
  onPatch: (u: Partial<Person>) => void;
}) {
  const reviews = person.reviews || [];
  const goals = person.goals || [];
  const notes = person.performance_notes || [];

  function addReview() {
    const review: Review = {
      id: uid(),
      reviewer: "",
      review_date: new Date().toISOString().slice(0, 10),
      rating: "",
      summary: "",
      notes: "",
      created_at: nowISO(),
    };
    onPatch({ reviews: [review, ...reviews] });
  }
  function updateReview(rid: string, u: Partial<Review>) {
    onPatch({ reviews: reviews.map((r) => (r.id === rid ? { ...r, ...u } : r)) });
  }
  function removeReview(rid: string) {
    if (!confirm("Delete review?")) return;
    onPatch({ reviews: reviews.filter((r) => r.id !== rid) });
  }

  function addGoal() {
    const goal: Goal = {
      id: uid(),
      title: "",
      description: "",
      target_date: "",
      status: "not_started",
      created_at: nowISO(),
    };
    onPatch({ goals: [goal, ...goals] });
  }
  function updateGoal(gid: string, u: Partial<Goal>) {
    onPatch({ goals: goals.map((g) => (g.id === gid ? { ...g, ...u } : g)) });
  }
  function removeGoal(gid: string) {
    if (!confirm("Delete goal?")) return;
    onPatch({ goals: goals.filter((g) => g.id !== gid) });
  }

  function addNote() {
    const note: PersonNote = {
      id: uid(),
      author: "",
      content: "",
      tags: [],
      created_at: nowISO(),
    };
    onPatch({ performance_notes: [note, ...notes] });
  }
  function updateNote(nid: string, u: Partial<PersonNote>) {
    onPatch({ performance_notes: notes.map((n) => (n.id === nid ? { ...n, ...u } : n)) });
  }
  function removeNote(nid: string) {
    if (!confirm("Delete note?")) return;
    onPatch({ performance_notes: notes.filter((n) => n.id !== nid) });
  }

  return (
    <div className="space-y-6">
      <Section
        title="Reviews"
        action={
          <button onClick={addReview} className="text-xs text-[#1B1B1B] hover:underline inline-flex items-center gap-1">
            <PlusIcon className="size-3.5" /> Add review
          </button>
        }
      >
        {reviews.length === 0 ? (
          <div className="text-xs text-[#7A7A7A] py-2">No reviews yet.</div>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="p-3 border border-[#E5E5EA] rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                  <input
                    type="date"
                    value={r.review_date}
                    onChange={(e) => updateReview(r.id, { review_date: e.target.value })}
                    className={inputClass}
                  />
                  <input
                    placeholder="Reviewer"
                    value={r.reviewer}
                    onChange={(e) => updateReview(r.id, { reviewer: e.target.value })}
                    className={inputClass}
                  />
                  <input
                    placeholder="Rating (1–5 or grade)"
                    value={r.rating}
                    onChange={(e) => updateReview(r.id, { rating: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <input
                  placeholder="Summary"
                  value={r.summary}
                  onChange={(e) => updateReview(r.id, { summary: e.target.value })}
                  className={`${inputClass} mb-2`}
                />
                <textarea
                  placeholder="Notes (markdown)"
                  value={r.notes}
                  onChange={(e) => updateReview(r.id, { notes: e.target.value })}
                  rows={3}
                  className={textareaClass}
                />
                <div className="flex justify-end mt-1">
                  <button onClick={() => removeReview(r.id)} className="text-xs text-[#B91C1C] hover:underline">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Goals"
        action={
          <button onClick={addGoal} className="text-xs text-[#1B1B1B] hover:underline inline-flex items-center gap-1">
            <PlusIcon className="size-3.5" /> Add goal
          </button>
        }
      >
        {goals.length === 0 ? (
          <div className="text-xs text-[#7A7A7A] py-2">No goals yet.</div>
        ) : (
          <div className="space-y-3">
            {goals.map((g) => (
              <div key={g.id} className="p-3 border border-[#E5E5EA] rounded-lg">
                <input
                  placeholder="Title"
                  value={g.title}
                  onChange={(e) => updateGoal(g.id, { title: e.target.value })}
                  className={`${inputClass} mb-2`}
                />
                <textarea
                  placeholder="Description"
                  value={g.description}
                  onChange={(e) => updateGoal(g.id, { description: e.target.value })}
                  rows={2}
                  className={`${textareaClass} mb-2`}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={g.target_date}
                    onChange={(e) => updateGoal(g.id, { target_date: e.target.value })}
                    className={inputClass}
                  />
                  <select
                    value={g.status}
                    onChange={(e) => updateGoal(g.id, { status: e.target.value as Goal["status"] })}
                    className={selectClass}
                  >
                    <option value="not_started">Not started</option>
                    <option value="in_progress">In progress</option>
                    <option value="done">Done</option>
                    <option value="dropped">Dropped</option>
                  </select>
                </div>
                <div className="flex justify-end mt-1">
                  <button onClick={() => removeGoal(g.id)} className="text-xs text-[#B91C1C] hover:underline">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section
        title="1:1 / performance notes"
        action={
          <button onClick={addNote} className="text-xs text-[#1B1B1B] hover:underline inline-flex items-center gap-1">
            <PlusIcon className="size-3.5" /> Add note
          </button>
        }
      >
        {notes.length === 0 ? (
          <div className="text-xs text-[#7A7A7A] py-2">No notes yet.</div>
        ) : (
          <div className="space-y-3">
            {notes.map((n) => (
              <div key={n.id} className="p-3 border border-[#E5E5EA] rounded-lg">
                <div className="text-[11px] text-[#7A7A7A] mb-2">{fmtDateUK(n.created_at)}</div>
                <input
                  placeholder="Author"
                  value={n.author}
                  onChange={(e) => updateNote(n.id, { author: e.target.value })}
                  className={`${inputClass} mb-2`}
                />
                <textarea
                  placeholder="Content (markdown)"
                  value={n.content}
                  onChange={(e) => updateNote(n.id, { content: e.target.value })}
                  rows={3}
                  className={textareaClass}
                />
                <input
                  placeholder="Tags (comma-separated)"
                  value={n.tags.join(", ")}
                  onChange={(e) =>
                    updateNote(n.id, {
                      tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
                    })
                  }
                  className={`${inputClass} mt-2`}
                />
                <div className="flex justify-end mt-1">
                  <button onClick={() => removeNote(n.id)} className="text-xs text-[#B91C1C] hover:underline">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

/* ─────────────── Shared field primitives ─────────────── */

function Section({
  title,
  children,
  className = "",
  action,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={`bg-white border border-[#E5E5EA] rounded-xl p-5 shadow-[var(--shadow-soft)] ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[#7A7A7A]">{title}</h3>
        {action}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </div>
  );
}

function FieldSelect({
  label,
  value,
  options,
  onChange,
  renderOption,
}: {
  label: string;
  value: string;
  options: string[] | readonly string[];
  onChange: (v: string) => void;
  renderOption?: (v: string) => string;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={selectClass}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {renderOption ? renderOption(opt) : opt || "— Select —"}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ─────────────── Agreements tab ─────────────── */

function AgreementsTab({ person }: { person: Person }) {
  const router = useRouter();
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    agreementStore.getAll().then((all) => {
      setAgreements(all.filter((a) => a.person_id === person.id));
      setLoading(false);
    });
  }, [person.id]);

  const hasNda = agreements.some((a) => a.kind === "nda");
  const hasContract = agreements.some((a) => a.kind === "contract");
  const canGenerateMore = !hasNda || !hasContract;

  function onCreated(created: Agreement[]) {
    setAgreements((prev) => [...created, ...prev]);
    setModalOpen(false);
    if (created.length === 1) {
      router.push(`/company/contracts/${created[0].id}`);
    }
  }

  if (loading) {
    return <div className="h-24 bg-[#F7F8FA] rounded-xl animate-pulse" />;
  }

  return (
    <div>
      {agreements.length === 0 ? (
        <div className="bg-[#F7F8FA] border border-dashed border-[#E5E5EA] rounded-xl p-8 text-center">
          <p className="text-sm text-[#1B1B1B] font-medium mb-1">
            No agreements yet for {person.full_name}.
          </p>
          <p className="text-xs text-[#7A7A7A] mb-5 max-w-md mx-auto">
            Generate an NDA, a contract, or both. Each captures a snapshot of
            the current master template so future edits don&apos;t rewrite it.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="px-3.5 py-2 bg-[#1B1B1B] text-white text-sm font-medium rounded-lg hover:bg-[#2D2D2D] transition-colors"
          >
            Generate agreements
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {agreements.map((a) => {
            const meta = AGREEMENT_STATUS_META[a.status];
            return (
              <Link
                key={a.id}
                href={`/company/contracts/${a.id}`}
                className="flex items-center justify-between gap-3 bg-white border border-[#E5E5EA] rounded-xl p-4 hover:border-[#1B1B1B]/30 hover:shadow-[var(--shadow-soft)] transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-[#F3F3F5] text-[#1B1B1B]">
                    {AGREEMENT_KIND_LABEL[a.kind]}
                  </span>
                  <div>
                    <div className="text-[14px] font-medium text-[#1B1B1B]">
                      {a.template_body.title}
                    </div>
                    <div className="text-[11px] text-[#7A7A7A] mt-0.5">
                      {a.template_revision}
                    </div>
                  </div>
                </div>
                <span
                  className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded shrink-0"
                  style={{ background: meta.bg, color: meta.fg }}
                >
                  {meta.label}
                </span>
              </Link>
            );
          })}
          {canGenerateMore && (
            <button
              onClick={() => setModalOpen(true)}
              className="w-full py-3 border border-dashed border-[#E5E5EA] rounded-xl text-[13px] text-[#7A7A7A] hover:border-[#1B1B1B] hover:text-[#1B1B1B] transition-colors"
            >
              + Generate {!hasNda && !hasContract ? "agreements" : !hasNda ? "NDA" : "contract"}
            </button>
          )}
        </div>
      )}

      <GenerateAgreementsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        person={person}
        existing={agreements}
        onCreated={onCreated}
      />
    </div>
  );
}

