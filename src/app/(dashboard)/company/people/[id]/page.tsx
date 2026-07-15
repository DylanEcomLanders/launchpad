"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftIcon,
  TrashIcon,
  PlusIcon,
  PhotoIcon,
  CheckCircleIcon,
  XCircleIcon,
  LockClosedIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { peopleStore, invoicesStore, uid, nowISO, fmtDateUK, fmtMoney } from "@/lib/company/data";
import { getPods } from "@/lib/pods-v2/data";
import type { Pod, PodMember } from "@/lib/pods-v2/types";
import { agreementStore } from "@/lib/agreements/data";
import type { Agreement } from "@/lib/agreements/types";
import { AGREEMENT_STATUS_META, AGREEMENT_KIND_LABEL } from "@/lib/agreements/types";
import { GenerateAgreementsModal } from "@/components/agreements/generate-modal";
import {
  type Person,
  type BonusKind,
  type BonusPayment,
  type CompensationChange,
  type Invoice,
  type OnboardingTask,
  type Review,
  type Goal,
  type PersonNote,
  type ScoringEntry,
  type ScoringPeriod,
  DEPARTMENTS,
} from "@/lib/company/types";
import {
  defaultOnboardingChecklist,
  ONBOARDING_PERIOD_DAYS,
} from "@/lib/company/onboarding";
import {
  applyCaps,
  draftPeriodForDeliverable,
  draftPeriodForMonth,
  subtotals,
} from "@/lib/company/scoring";
import { useKanbanData } from "@/lib/kanban/use-kanban-data";
import { personByKanbanName } from "@/lib/people/resolver";
import { isDeliveredPhase } from "@/lib/projects/preview-phases";
import { inputClass, selectClass, textareaClass } from "@/lib/form-styles";
import { initials, deptColor } from "@/lib/company/ui";
import { Table, THead, TBody, TR, TH, TD, Num, Badge } from "@/components/ui";
import { useRole } from "@/components/auth-gate";

/* Field label + status-tone helpers used throughout this surface.
 * Status values map to the MUTED status palette via the Badge primitive,
 * never the loud danger/warning/success tokens. */
const fieldLabel = "block text-2xs uppercase tracking-wider text-subtle font-medium mb-2";

type BadgeTone = "neutral" | "success" | "warning" | "danger";

const PERSON_STATUS_TONE: Record<string, BadgeTone> = {
  onboarding: "neutral",
  active: "success",
  on_leave: "warning",
  notice: "danger",
  offboarding: "warning",
  left: "neutral",
};
const PERSON_STATUS_LABEL: Record<string, string> = {
  onboarding: "Onboarding",
  active: "Active",
  on_leave: "On leave",
  notice: "Notice",
  offboarding: "Offboarding",
  left: "Left",
};

const INVOICE_STATUS_TONE: Record<string, BadgeTone> = {
  pending: "warning",
  paid: "success",
  overdue: "danger",
  disputed: "neutral",
};
const INVOICE_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
  overdue: "Overdue",
  disputed: "Disputed",
};

const AGREEMENT_STATUS_TONE: Record<string, BadgeTone> = {
  draft: "neutral",
  sent: "warning",
  team_signed: "warning",
  counter_signed: "success",
  active: "success",
  terminated: "danger",
};

type Tab =
  | "overview"
  | "onboarding"
  | "financial"
  | "invoices"
  | "bonuses"
  | "scoring"
  | "kpis"
  | "performance"
  | "agreements";

export default function PersonProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const role = useRole();

  const [person, setPerson] = useState<Person | null>(null);
  const [allPeople, setAllPeople] = useState<Person[]>([]);
  const [pods, setPods] = useState<Pod[]>([]);
  const [tab, setTab] = useState<Tab>("overview");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    Promise.all([peopleStore.getById(id), peopleStore.getAll()]).then(([p, all]) => {
      setPerson(p);
      setAllPeople(all);
      setPods(getPods());
      setHydrated(true);
    });
  }, [id]);

  async function patch(updates: Partial<Person>) {
    if (!person) return;
    const next = { ...person, ...updates, updated_at: nowISO() };
    const renamedFrom =
      updates.full_name && updates.full_name !== person.full_name
        ? person.full_name
        : null;
    /* Detect transition into / out of "left" so we can flip the
     * app_users.active flag accordingly. Without this, a leaver keeps
     * their launchpad sign-in alive. */
    const becameLeft =
      updates.status === "left" && person.status !== "left";
    const cameBackFromLeft =
      person.status === "left" && updates.status && updates.status !== "left";

    setPerson(next);
    await peopleStore.update(id, next);
    /* On full_name change, propagate the new name into kanban_pods +
     * kanban_tasks + pods-v2 so renames in Admin flow through the rest
     * of the app without admin chasing them. Fire-and-forget. */
    if (renamedFrom && updates.full_name) {
      const { propagatePersonRename } = await import(
        "@/lib/people/propagate-rename"
      );
      propagatePersonRename(id, renamedFrom, updates.full_name).catch((err) =>
        console.error("[person] rename propagation failed:", err),
      );
    }
    if ((becameLeft || cameBackFromLeft) && next.email) {
      const { findAppUserByEmail, setAppUserActive } = await import(
        "@/lib/auth/app-users"
      );
      const user = await findAppUserByEmail(next.email);
      if (user) {
        setAppUserActive(user.id, !becameLeft).catch((err) =>
          console.error("[person] app_users active toggle failed:", err),
        );
      }
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this person? This cannot be undone.")) return;
    await peopleStore.remove(id);
    router.push("/company/people");
  }

  if (!hydrated) {
    return <div className="h-32 bg-surface rounded border border-border-faint animate-pulse" />;
  }
  if (!person) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-subtle mb-3">Person not found.</p>
        <Link href="/company/people" className="text-sm text-foreground hover:underline">
          Back to People
        </Link>
      </div>
    );
  }

  const isAdmin = role === "admin";
  const isOnboardingNow =
    person.status === "onboarding" || !!person.onboarding_started_at;
  const isContractor =
    person.engagement_type === "contractor_retainer" ||
    person.engagement_type === "contractor_per_page";
  const tabs: { id: Tab; label: string; visible: boolean }[] = [
    { id: "overview", label: "Overview", visible: true },
    { id: "onboarding", label: "Onboarding", visible: isAdmin && isOnboardingNow },
    { id: "agreements", label: "Agreements", visible: isAdmin },
    { id: "financial", label: "Financial", visible: isAdmin },
    { id: "invoices", label: "Invoices", visible: isAdmin },
    { id: "bonuses", label: "Bonuses", visible: isAdmin },
    { id: "scoring", label: "Scoring", visible: isAdmin && isContractor },
    { id: "kpis", label: "KPIs", visible: isAdmin },
    { id: "performance", label: "Performance", visible: isAdmin },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/company/people"
          className="inline-flex items-center gap-1 text-sm text-subtle hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          Back to People
        </Link>
        <button
          onClick={handleDelete}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-danger hover:bg-surface-raised rounded transition-colors"
        >
          <TrashIcon className="size-3.5" />
          Delete
        </button>
      </div>

      <div className="bg-surface border border-border-faint rounded p-5 mb-6">
        <div className="flex items-start gap-4">
          <AvatarWithUpload person={person} onUpdate={patch} />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-baseline gap-2 mb-1">
              <h2 className="text-xl font-semibold text-foreground">{person.full_name}</h2>
              {person.preferred_name && person.preferred_name !== person.full_name && (
                <span className="text-sm text-subtle">"{person.preferred_name}"</span>
              )}
              <Badge tone={PERSON_STATUS_TONE[person.status]}>
                {PERSON_STATUS_LABEL[person.status]}
              </Badge>
            </div>
            <div className="text-sm text-subtle">
              {person.job_title || "-"}
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

      <div className="border-b border-border mb-6">
        <div className="flex gap-1">
          {tabs
            .filter((t) => t.visible)
            .map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2.5 text-sm border-b-2 transition-colors ${
                  tab === t.id
                    ? "border-border text-foreground font-medium"
                    : "border-transparent text-subtle hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
        </div>
      </div>

      {tab === "overview" && (
        <OverviewTab person={person} allPeople={allPeople} pods={pods} onPatch={patch} />
      )}
      {tab === "agreements" && isAdmin && (
        <AgreementsTab person={person} />
      )}
      {tab === "financial" && isAdmin && (
        <FinancialTab person={person} onPatch={patch} />
      )}
      {tab === "invoices" && isAdmin && <InvoicesTab person={person} />}
      {tab === "bonuses" && isAdmin && (
        <BonusesTab person={person} onPatch={patch} />
      )}
      {tab === "onboarding" && isAdmin && (
        <OnboardingTab person={person} onPatch={patch} />
      )}
      {tab === "scoring" && isAdmin && isContractor && (
        <ScoringTab person={person} onPatch={patch} />
      )}
      {tab === "kpis" && isAdmin && <KpisTab person={person} />}
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
  pods,
  onPatch,
}: {
  person: Person;
  allPeople: Person[];
  pods: Pod[];
  onPatch: (u: Partial<Person>) => void;
}) {
  const others = allPeople.filter((p) => p.id !== person.id);
  /* Flatten { member, pod } pairs so the picker can show "Name - Pod 1
   * (Primary designer)" for each option. Filters out placeholder
   * members so the dropdown stays clean. */
  const podMemberOptions = useMemo<
    Array<{ id: string; label: string; alreadyLinkedTo?: string }>
  >(() => {
    const linkedByMember = new Map<string, string>(); // pod_member_id → full_name of person already using it
    for (const p of allPeople) {
      if (p.pod_member_id) linkedByMember.set(p.pod_member_id, p.full_name);
    }
    const out: Array<{ id: string; label: string; alreadyLinkedTo?: string }> =
      [];
    for (const pod of pods) {
      for (const m of pod.members) {
        if (m.is_placeholder) continue;
        const linkedName = linkedByMember.get(m.id);
        const taken = linkedName && m.id !== person.pod_member_id;
        const role = m.role.replace(/_/g, " ");
        out.push({
          id: m.id,
          label: `${m.name} - ${pod.name} (${role})${
            taken ? ` - linked to ${linkedName}` : ""
          }`,
          alreadyLinkedTo: taken ? linkedName : undefined,
        });
      }
    }
    out.sort((a, b) => a.label.localeCompare(b.label));
    return out;
  }, [pods, allPeople, person.pod_member_id]);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
            v === "" ? "None" : others.find((p) => p.id === v)?.full_name || v
          }
          onChange={(v) => onPatch({ reports_to: v || undefined })}
        />
        <FieldSelect
          label="Linked pod member"
          value={person.pod_member_id || ""}
          options={["", ...podMemberOptions.map((o) => o.id)] as string[]}
          renderOption={(v) =>
            v === "" ? "Not on a pod" : podMemberOptions.find((o) => o.id === v)?.label || v
          }
          onChange={(v) => onPatch({ pod_member_id: v || undefined })}
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
          options={["onboarding", "active", "on_leave", "notice", "offboarding", "left"]}
          renderOption={(v) =>
            v === "on_leave"
              ? "On leave"
              : v === "left"
              ? "Left"
              : v.charAt(0).toUpperCase() + v.slice(1)
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
        <InviteButton person={person} />
        <AccessLevelControl person={person} />
      </Section>

      <Section title="Notes" className="md:col-span-2">
        <div>
          <label className={fieldLabel}>Notes</label>
          <textarea
            value={person.notes || ""}
            onChange={(e) => onPatch({ notes: e.target.value })}
            rows={4}
            className={textareaClass}
            placeholder="Free-form notes - markdown supported."
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Section title="Compensation">
        <FieldSelect
          label="Type"
          value={person.compensation_type || ""}
          options={["", "salary", "day_rate", "hourly", "monthly_retainer"]}
          renderOption={(v) =>
            !v
              ? "Select"
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
            !v ? "Select" : v === "per_invoice" ? "Per invoice" : v.charAt(0).toUpperCase() + v.slice(1)
          }
          onChange={(v) => onPatch({ payment_frequency: (v || undefined) as Person["payment_frequency"] })}
        />
        <FieldSelect
          label="Method"
          value={person.payment_method || ""}
          options={["", "bank_transfer", "wise", "other"]}
          renderOption={(v) =>
            !v ? "Select" : v === "bank_transfer" ? "Bank transfer" : v === "wise" ? "Wise" : "Other"
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
            !v ? "Select" : v === "self_employed" ? "Self-employed" : v === "ltd_company" ? "Ltd company" : "PAYE"
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
          <label className={fieldLabel}>Bank details</label>
          <textarea
            value={person.bank_details || ""}
            onChange={(e) => onPatch({ bank_details: e.target.value })}
            rows={3}
            className={textareaClass}
            placeholder="Sort code, account number, or IBAN. Stored in plaintext - admin only."
          />
        </div>
      </Section>

      {/* Engagement type + bonus structure - sits in the Financial tab
          because it's the other half of "what do we pay this person".
          The bonus UI flips: core_retainer shows revenue-tier inputs,
          contractor types show a Scoring tab pointer. */}
      <Section title="Engagement & bonuses" className="md:col-span-2">
        <FieldSelect
          label="Engagement type"
          value={person.engagement_type || ""}
          options={["", "core_retainer", "contractor_retainer", "contractor_per_page"]}
          renderOption={(v) =>
            !v
              ? "Select an engagement type"
              : v === "core_retainer"
              ? "Core retainer (revenue-tier bonus)"
              : v === "contractor_retainer"
              ? "Contractor on retainer (scheme bonuses)"
              : "Contractor per-page (scheme bonuses)"
          }
          onChange={(v) => onPatch({ engagement_type: (v || undefined) as Person["engagement_type"] })}
        />

        {person.engagement_type === "core_retainer" && (
          <div className="mt-4 pt-4 border-t border-dashed border-border">
            <div className="text-2xs uppercase tracking-wider text-subtle font-medium mb-3">
              Revenue-tier bonuses ({person.compensation_currency || "GBP"})
            </div>
            <p className="text-xs text-subtle mb-3">
              Paid when monthly revenue first crosses each milestone.
              Currency follows the compensation currency above.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field
                label="At 100k / month"
                type="number"
                value={person.bonus_tier_100k?.toString() || ""}
                onChange={(v) => onPatch({ bonus_tier_100k: v ? parseFloat(v) : undefined })}
              />
              <Field
                label="At 150k / month"
                type="number"
                value={person.bonus_tier_150k?.toString() || ""}
                onChange={(v) => onPatch({ bonus_tier_150k: v ? parseFloat(v) : undefined })}
              />
              <Field
                label="At 200k / month"
                type="number"
                value={person.bonus_tier_200k?.toString() || ""}
                onChange={(v) => onPatch({ bonus_tier_200k: v ? parseFloat(v) : undefined })}
              />
            </div>
          </div>
        )}

        {(person.engagement_type === "contractor_retainer" ||
          person.engagement_type === "contractor_per_page") && (
          <div className="mt-4 pt-4 border-t border-dashed border-border">
            <p className="text-xs text-subtle">
              Bonuses + deductions for this contractor are auto-computed
              from kanban delivery data under the{" "}
              {person.engagement_type === "contractor_retainer"
                ? "retainer scheme (max +33% / -30% per month)"
                : "per-page scheme (max +25% / -30% per build)"}
              . PM reviews + locks per invoice. See the{" "}
              <strong className="text-foreground">Scoring</strong> tab.
            </p>
          </div>
        )}
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
            className="inline-flex items-center gap-1 text-xs text-foreground hover:underline"
          >
            <PlusIcon className="size-3.5" /> Log change
          </button>
        </div>
        {history.length === 0 ? (
          <div className="text-xs text-subtle py-3">No history yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR hover={false}>
                  <TH className="!px-0">Date</TH>
                  <TH className="!px-0">Old</TH>
                  <TH className="!px-0">New</TH>
                  <TH className="!px-0">Reason</TH>
                </TR>
              </THead>
              <TBody>
                {history.map((h) => (
                  <TR key={h.id}>
                    <TD className="!px-0 text-muted"><Num>{fmtDateUK(h.changed_at)}</Num></TD>
                    <TD className="!px-0 text-muted">
                      {h.old_amount != null ? (
                        <Num>{fmtMoney(h.old_amount, person.compensation_currency || "GBP")}</Num>
                      ) : (
                        "-"
                      )}
                    </TD>
                    <TD className="!px-0 text-foreground">
                      <Num>{fmtMoney(h.new_amount, person.compensation_currency || "GBP")}</Num>
                    </TD>
                    <TD className="!px-0 text-muted">{h.reason || "-"}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
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
          <button onClick={addReview} className="text-xs text-foreground hover:underline inline-flex items-center gap-1">
            <PlusIcon className="size-3.5" /> Add review
          </button>
        }
      >
        {reviews.length === 0 ? (
          <div className="text-xs text-subtle py-2">No reviews yet.</div>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="bg-surface-raised border border-border rounded p-5">
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
                    placeholder="Rating (1-5 or grade)"
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
                  <button onClick={() => removeReview(r.id)} className="text-xs text-danger hover:underline">
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
          <button onClick={addGoal} className="text-xs text-foreground hover:underline inline-flex items-center gap-1">
            <PlusIcon className="size-3.5" /> Add goal
          </button>
        }
      >
        {goals.length === 0 ? (
          <div className="text-xs text-subtle py-2">No goals yet.</div>
        ) : (
          <div className="space-y-3">
            {goals.map((g) => (
              <div key={g.id} className="bg-surface-raised border border-border rounded p-5">
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
                  <button onClick={() => removeGoal(g.id)} className="text-xs text-danger hover:underline">
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
          <button onClick={addNote} className="text-xs text-foreground hover:underline inline-flex items-center gap-1">
            <PlusIcon className="size-3.5" /> Add note
          </button>
        }
      >
        {notes.length === 0 ? (
          <div className="text-xs text-subtle py-2">No notes yet.</div>
        ) : (
          <div className="space-y-3">
            {notes.map((n) => (
              <div key={n.id} className="bg-surface-raised border border-border rounded p-5">
                <div className="text-2xs text-subtle mb-2">{fmtDateUK(n.created_at)}</div>
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
                  <button onClick={() => removeNote(n.id)} className="text-xs text-danger hover:underline">
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

/* ─────────────── Invoices tab ─────────────── */

/* Pulls the slice of company_invoices linked to this Person via
 * linked_person_id. Read-only here - admins still create + edit
 * invoices in /company/invoices; this view is the per-person rollup
 * so we can see at a glance what we pay each human. */
function InvoicesTab({ person }: { person: Person }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    invoicesStore.getAll().then((all) => {
      setInvoices(
        all
          .filter((i) => i.linked_person_id === person.id)
          .sort((a, b) =>
            (b.issue_date || "").localeCompare(a.issue_date || ""),
          ),
      );
      setHydrated(true);
    });
  }, [person.id]);

  /* GBP totals only - mixing currencies would mislead. Anything not
   * GBP is shown in the row but skipped in the totals header. */
  const totals = useMemo(() => {
    let billed = 0,
      paid = 0,
      outstanding = 0;
    for (const i of invoices) {
      if (i.currency !== "GBP") continue;
      billed += i.amount;
      if (i.status === "paid") paid += i.amount;
      else outstanding += i.amount;
    }
    return { billed, paid, outstanding };
  }, [invoices]);

  if (!hydrated) {
    return <div className="h-32 bg-surface rounded border border-border-faint animate-pulse" />;
  }

  if (invoices.length === 0) {
    return (
      <div className="bg-surface border border-border-faint rounded py-16 text-center">
        <p className="text-sm text-subtle mb-2">
          No invoices linked to {person.preferred_name || person.full_name} yet.
        </p>
        <Link
          href="/company/invoices"
          className="text-xs text-foreground hover:underline"
        >
          Log one in Invoices
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Totals header - same three-cell summary as Financial tab */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <SummaryCard label="Total billed (GBP)" value={fmtMoney(totals.billed, "GBP")} />
        <SummaryCard label="Paid" value={fmtMoney(totals.paid, "GBP")} tone="positive" />
        <SummaryCard
          label="Outstanding"
          value={fmtMoney(totals.outstanding, "GBP")}
          tone={totals.outstanding > 0 ? "warn" : "muted"}
        />
      </div>

      {/* Invoice table - same shape as /company/invoices but scoped to
          this person + cleaner (no supplier name column since theyre
          all this person). Each row links out to the invoice detail. */}
      <div className="bg-surface border border-border-faint rounded overflow-x-auto">
        <Table>
          <THead>
            <TR hover={false}>
              <TH>Invoice</TH>
              <TH>Issued</TH>
              <TH>Due</TH>
              <TH align="right">Amount</TH>
              <TH>Status</TH>
              <TH>File</TH>
            </TR>
          </THead>
          <TBody>
            {invoices.map((i) => (
              <TR key={i.id}>
                <TD>
                  <Link
                    href={`/company/invoices/${i.id}`}
                    className="text-foreground hover:underline"
                  >
                    {i.invoice_number || "(no number)"}
                  </Link>
                </TD>
                <TD className="text-muted"><Num>{fmtDateUK(i.issue_date)}</Num></TD>
                <TD className="text-muted"><Num>{fmtDateUK(i.due_date)}</Num></TD>
                <TD align="right" className="text-muted">
                  <Num>{fmtMoney(i.amount, i.currency)}</Num>
                </TD>
                <TD>
                  <Badge tone={INVOICE_STATUS_TONE[i.status] ?? "neutral"}>
                    {INVOICE_STATUS_LABEL[i.status] ?? i.status}
                  </Badge>
                </TD>
                <TD className="text-muted">
                  {i.file_url ? (
                    <a
                      href={i.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-muted hover:text-foreground hover:underline text-xs"
                    >
                      {i.file_name || "Open"}
                    </a>
                  ) : (
                    <span className="text-subtle text-xs">No file</span>
                  )}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>

      <div className="text-right">
        <Link
          href="/company/invoices"
          className="text-2xs uppercase tracking-wider text-subtle hover:text-foreground"
        >
          Manage all invoices
        </Link>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "warn" | "muted";
}) {
  const valueColor =
    tone === "positive"
      ? "text-status-ontrack"
      : tone === "warn"
      ? "text-status-approaching"
      : tone === "muted"
      ? "text-subtle"
      : "text-foreground";
  return (
    <div className="bg-surface border border-border-faint rounded p-5">
      <div className="text-2xs uppercase tracking-wider text-subtle font-medium">
        {label}
      </div>
      <div className={`mt-2 text-xl font-semibold tabular-nums tracking-tight ${valueColor}`}>{value}</div>
    </div>
  );
}

/* ─────────────── Onboarding tab ─────────────── */

/* 30-day clock + default checklist. Seeded the first time someone
 * lands on this tab without a checklist (status === 'onboarding' OR
 * onboarding_started_at set). Auto-completes the period when the
 * last task ticks, but doesn't auto-flip status to active - that's
 * a deliberate PM call after the 30-day review. */
function OnboardingTab({
  person,
  onPatch,
}: {
  person: Person;
  onPatch: (u: Partial<Person>) => void;
}) {
  /* Seed checklist + started_at on first visit. */
  useEffect(() => {
    if (person.onboarding_checklist && person.onboarding_checklist.length > 0) {
      return;
    }
    onPatch({
      onboarding_checklist: defaultOnboardingChecklist(uid),
      onboarding_started_at:
        person.onboarding_started_at ||
        person.start_date ||
        new Date().toISOString().slice(0, 10),
    });
    /* one-shot seed, intentional empty deps */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checklist = person.onboarding_checklist || [];
  const startedAt =
    person.onboarding_started_at || person.start_date || new Date().toISOString().slice(0, 10);

  const totalDays = ONBOARDING_PERIOD_DAYS;
  const daysIn = Math.max(
    0,
    Math.floor(
      (Date.now() - new Date(startedAt + "T00:00:00Z").getTime()) /
        (1000 * 60 * 60 * 24),
    ),
  );
  const daysRemaining = Math.max(0, totalDays - daysIn);
  const pctElapsed = Math.min(100, Math.round((daysIn / totalDays) * 100));

  const doneCount = checklist.filter((t) => !!t.done_at).length;
  const allDone = checklist.length > 0 && doneCount === checklist.length;

  function toggleTask(taskId: string) {
    const next = checklist.map((t) =>
      t.id !== taskId
        ? t
        : {
            ...t,
            done_at: t.done_at
              ? undefined
              : new Date().toISOString().slice(0, 10),
          },
    );
    const completed = next.every((t) => !!t.done_at);
    onPatch({
      onboarding_checklist: next,
      onboarding_completed_at: completed
        ? new Date().toISOString().slice(0, 10)
        : undefined,
    });
  }

  function dueDateFor(offset: number): string {
    const d = new Date(startedAt + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + offset);
    return d.toISOString().slice(0, 10);
  }

  function isOverdue(t: OnboardingTask): boolean {
    if (t.done_at) return false;
    return new Date(dueDateFor(t.due_offset_days) + "T00:00:00Z").getTime() < Date.now();
  }

  return (
    <div className="space-y-6">
      {/* Clock + progress */}
      <div className="bg-surface border border-border-faint rounded p-5">
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <div className="text-2xs uppercase tracking-wider text-subtle font-medium">
              30-day clock
            </div>
            <div className="text-2xl font-semibold text-foreground mt-1">
              {allDone ? (
                <span className="text-status-ontrack">Onboarding complete</span>
              ) : daysRemaining === 0 ? (
                <span className="text-status-approaching">Day 30 reached</span>
              ) : (
                <>
                  Day {Math.min(daysIn, totalDays)} of {totalDays}{" "}
                  <span className="text-sm text-subtle font-normal">
                    ({daysRemaining} day{daysRemaining === 1 ? "" : "s"} left)
                  </span>
                </>
              )}
            </div>
            <div className="text-xs text-subtle mt-1">
              Started {fmtDateUK(startedAt)}
              {person.onboarding_completed_at &&
                ` · completed ${fmtDateUK(person.onboarding_completed_at)}`}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xs uppercase tracking-wider text-subtle font-medium">
              Checklist
            </div>
            <div className="text-2xl font-semibold text-foreground mt-1 tabular-nums">
              {doneCount} / {checklist.length}
            </div>
          </div>
        </div>
        <div className="h-2 bg-surface-raised rounded-full overflow-hidden">
          <div
            className="h-full bg-status-ontrack transition-all"
            style={{ width: `${pctElapsed}%` }}
          />
        </div>
      </div>

      {/* Status flip prompt - only show when all done + still in onboarding */}
      {allDone && person.status === "onboarding" && (
        <div className="bg-surface-raised border border-border rounded p-5 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-foreground">
              All tasks complete. Ready to flip to active?
            </div>
            <div className="text-xs text-subtle mt-0.5">
              Status: <strong>onboarding</strong> to <strong>active</strong>.
              The Onboarding tab will hide afterwards.
            </div>
          </div>
          <button
            onClick={() => onPatch({ status: "active" })}
            className="px-3 py-2 rounded text-xs font-medium bg-foreground text-background hover:opacity-90 transition-opacity"
          >
            Mark active
          </button>
        </div>
      )}

      {/* Checklist */}
      <div className="bg-surface border border-border-faint rounded overflow-x-auto">
        <Table>
          <THead>
            <TR hover={false}>
              <TH className="w-12">Done</TH>
              <TH>Task</TH>
              <TH>Due</TH>
              <TH>Completed</TH>
            </TR>
          </THead>
          <TBody>
            {checklist
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((t) => (
                <TR key={t.id} className={t.done_at ? "opacity-60" : ""}>
                  <TD>
                    <button
                      onClick={() => toggleTask(t.id)}
                      className="size-5 rounded border border-border hover:bg-surface-raised flex items-center justify-center transition-colors"
                      title={t.done_at ? "Mark not done" : "Mark done"}
                    >
                      {t.done_at && (
                        <CheckCircleIcon className="size-4 text-status-ontrack" />
                      )}
                    </button>
                  </TD>
                  <TD>
                    <div className={t.done_at ? "text-foreground line-through" : "text-foreground"}>
                      {t.title}
                    </div>
                    {t.description && (
                      <div className="text-xs text-subtle mt-0.5">
                        {t.description}
                      </div>
                    )}
                  </TD>
                  <TD>
                    <span className={isOverdue(t) ? "text-status-late" : "text-muted"}>
                      <Num>{fmtDateUK(dueDateFor(t.due_offset_days))}</Num>
                    </span>
                    {isOverdue(t) && (
                      <div className="text-2xs uppercase tracking-wider text-status-late mt-0.5">
                        Overdue
                      </div>
                    )}
                  </TD>
                  <TD className="text-muted">
                    {t.done_at ? <Num>{fmtDateUK(t.done_at)}</Num> : "-"}
                  </TD>
                </TR>
              ))}
          </TBody>
        </Table>
      </div>
    </div>
  );
}

/* ─────────────── Scoring tab (contractor scheme) ─────────────── */

/* Per-period scoring. PM picks a kanban deliverable (per-page) or a
 * month (retainer), gets an auto-suggested breakdown from kanban
 * data, can edit/add manual entries, then locks at invoice time. */
function ScoringTab({
  person,
  onPatch,
}: {
  person: Person;
  onPatch: (u: Partial<Person>) => void;
}) {
  const { clients, pods } = useKanbanData();
  const periods = person.scoring_periods || [];
  const isPerPage = person.engagement_type === "contractor_per_page";
  const scheme: "per_page" | "retainer" = isPerPage ? "per_page" : "retainer";

  /* Available period candidates = kanban tasks (for per-page) or
   * months in their kanban history (for retainer) not yet scored. */
  const candidatePeriods = useMemo(() => {
    const scored = new Set(periods.map((p) => p.period_key));
    if (isPerPage) {
      const tasks: { id: string; label: string }[] = [];
      const allPods = pods;
      for (const c of clients) {
        for (const p of c.projects) {
          for (const d of p.deliverables) {
            const launch = (d.phaseHistory || []).find(
              (e) => isDeliveredPhase(e.phase),
            );
            if (!launch) continue;
            /* Is this person on the card? */
            const candidates = [
              d.designer,
              d.secondaryDesigner,
              d.developer,
              d.secondaryDeveloper,
            ];
            const matches = candidates.some(
              (n) => personByKanbanName(n, [person], allPods)?.id === person.id,
            );
            if (!matches) continue;
            if (scored.has(d.id)) continue;
            tasks.push({
              id: d.id,
              label: `${d.title} - ${c.name} (launched ${fmtDateUK(launch.enteredAt)})`,
            });
          }
        }
      }
      return tasks;
    } else {
      /* Retainer: last 6 months with kanban activity for this person. */
      const months = new Set<string>();
      for (const c of clients) {
        for (const p of c.projects) {
          for (const d of p.deliverables) {
            const candidates = [
              d.designer,
              d.secondaryDesigner,
              d.developer,
              d.secondaryDeveloper,
            ];
            if (
              !candidates.some(
                (n) => personByKanbanName(n, [person], pods)?.id === person.id,
              )
            )
              continue;
            for (const e of d.phaseHistory || []) {
              months.add(e.enteredAt.slice(0, 7));
            }
          }
        }
      }
      return Array.from(months)
        .sort((a, b) => b.localeCompare(a))
        .filter((m) => !scored.has(m))
        .slice(0, 6)
        .map((m) => ({ id: m, label: m }));
    }
  }, [clients, pods, person, periods, isPerPage]);

  function addPeriod(key: string) {
    if (isPerPage) {
      const deliverable = clients
        .flatMap((c) => c.projects.flatMap((p) => p.deliverables))
        .find((d) => d.id === key);
      if (!deliverable) return;
      const draft = draftPeriodForDeliverable(deliverable, uid);
      onPatch({ scoring_periods: [draft, ...periods] });
    } else {
      const draft = draftPeriodForMonth(person, clients, key, uid);
      onPatch({ scoring_periods: [draft, ...periods] });
    }
  }

  function patchPeriod(periodId: string, patch: Partial<ScoringPeriod>) {
    onPatch({
      scoring_periods: periods.map((p) =>
        p.id === periodId
          ? { ...p, ...patch, updated_at: new Date().toISOString() }
          : p,
      ),
    });
  }

  function addManualEntry(periodId: string, entry: Omit<ScoringEntry, "id" | "added_at">) {
    const period = periods.find((p) => p.id === periodId);
    if (!period) return;
    const newEntry: ScoringEntry = {
      ...entry,
      id: uid(),
      added_at: new Date().toISOString(),
    };
    patchPeriod(periodId, { entries: [...period.entries, newEntry] });
  }

  function removeEntry(periodId: string, entryId: string) {
    const period = periods.find((p) => p.id === periodId);
    if (!period) return;
    patchPeriod(periodId, {
      entries: period.entries.filter((e) => e.id !== entryId),
    });
  }

  function lockPeriod(periodId: string) {
    const period = periods.find((p) => p.id === periodId);
    if (!period) return;
    const final = applyCaps(period.entries, period.scheme);
    patchPeriod(periodId, {
      status: "locked",
      locked_at: new Date().toISOString(),
      final_delta_pct: final,
    });
  }

  function reopenPeriod(periodId: string) {
    patchPeriod(periodId, {
      status: "draft",
      locked_at: undefined,
      final_delta_pct: undefined,
    });
  }

  return (
    <div className="space-y-6">
      <div className="bg-surface border border-border-faint rounded p-5 flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-foreground">
            {isPerPage
              ? "Per-page contractor scheme"
              : "Retainer contractor scheme"}
          </div>
          <div className="text-xs text-subtle mt-1">
            {isPerPage
              ? "Score per build (max +25%, max -30%). Bonuses stack: early + zero revs + test win = +25%."
              : "Score per month (max +33%, max -30%). Retention lever carries the largest bonus (+10% renewals)."}
          </div>
        </div>
        {candidatePeriods.length > 0 && (
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) addPeriod(e.target.value);
              e.target.value = "";
            }}
            className="h-8 px-2.5 rounded border border-border bg-surface text-xs text-muted appearance-none focus:outline-none focus:border-foreground"
          >
            <option value="">+ Score new {isPerPage ? "build" : "month"}</option>
            {candidatePeriods.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {periods.length === 0 ? (
        <div className="bg-surface border border-border-faint rounded py-16 text-center">
          <p className="text-sm text-subtle mb-2">
            No scoring periods yet.
          </p>
          <p className="text-xs text-subtle">
            {candidatePeriods.length === 0
              ? "Once this person ships kanban work, they'll show up here for scoring."
              : `Pick a ${isPerPage ? "build" : "month"} above to draft a score from the kanban + retention data.`}
          </p>
        </div>
      ) : (
        periods.map((period) => (
          <ScoringPeriodCard
            key={period.id}
            period={period}
            scheme={scheme}
            onPatch={(patch) => patchPeriod(period.id, patch)}
            onAddManual={(entry) => addManualEntry(period.id, entry)}
            onRemoveEntry={(entryId) => removeEntry(period.id, entryId)}
            onLock={() => lockPeriod(period.id)}
            onReopen={() => reopenPeriod(period.id)}
          />
        ))
      )}
    </div>
  );
}

function ScoringPeriodCard({
  period,
  scheme,
  onPatch,
  onAddManual,
  onRemoveEntry,
  onLock,
  onReopen,
}: {
  period: ScoringPeriod;
  scheme: "per_page" | "retainer";
  onPatch: (p: Partial<ScoringPeriod>) => void;
  onAddManual: (entry: Omit<ScoringEntry, "id" | "added_at">) => void;
  onRemoveEntry: (entryId: string) => void;
  onLock: () => void;
  onReopen: () => void;
}) {
  const sub = subtotals(period.entries);
  const projected = applyCaps(period.entries, period.scheme);
  const capped = projected !== sub.net;
  const isLocked = period.status === "locked";
  const displayDelta = isLocked ? (period.final_delta_pct ?? 0) : projected;

  return (
    <div className="bg-surface border border-border-faint rounded overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-dashed border-border flex items-center justify-between">
        <div>
          <div className="text-2xs uppercase tracking-wider text-subtle font-medium">
            {scheme === "per_page" ? "Build" : "Month"}
          </div>
          <div className="text-base font-semibold text-foreground">
            {period.period_key}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xs uppercase tracking-wider text-subtle font-medium">
            {isLocked ? "Locked" : "Projected"}
          </div>
          <div
            className={`text-2xl font-semibold tabular-nums tracking-tight ${
              displayDelta > 0
                ? "text-status-ontrack"
                : displayDelta < 0
                ? "text-status-late"
                : "text-foreground"
            }`}
          >
            {displayDelta > 0 ? "+" : ""}
            {displayDelta}%
          </div>
          {capped && !isLocked && (
            <div className="text-2xs uppercase tracking-wider text-status-approaching mt-0.5">
              Capped (raw {sub.net > 0 ? "+" : ""}
              {sub.net}%)
            </div>
          )}
        </div>
      </div>

      {/* Entries */}
      <div>
        {period.entries.length === 0 ? (
          <div className="px-5 py-6 text-center text-xs text-subtle">
            No entries detected. Add a manual entry below to capture
            anything kanban can't see (renewal, no-show, complaint).
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR hover={false}>
                  <TH>Lever</TH>
                  <TH>Reason</TH>
                  <TH>Source</TH>
                  <TH align="right">Δ%</TH>
                  <TH align="right" className="w-12"></TH>
                </TR>
              </THead>
              <TBody>
                {period.entries.map((e) => (
                  <TR key={e.id}>
                    <TD className="text-muted capitalize">{e.lever}</TD>
                    <TD className="text-foreground">
                      {e.label}
                      {e.reason && (
                        <div className="text-xs text-subtle mt-0.5">{e.reason}</div>
                      )}
                    </TD>
                    <TD className="text-muted text-xs">
                      {e.source === "manual"
                        ? "PM manual"
                        : e.source === "auto_kanban"
                        ? "Auto - kanban"
                        : "Auto - retention"}
                    </TD>
                    <TD
                      align="right"
                      className={e.delta_pct > 0 ? "text-status-ontrack" : "text-status-late"}
                    >
                      <Num>
                        {e.delta_pct > 0 ? "+" : ""}
                        {e.delta_pct}%
                      </Num>
                    </TD>
                    <TD align="right">
                      {!isLocked && (
                        <button
                          onClick={() => onRemoveEntry(e.id)}
                          className="text-subtle hover:text-status-late transition-colors"
                          title="Remove entry"
                        >
                          <XCircleIcon className="size-4" />
                        </button>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        )}
      </div>

      {/* Add manual + lock */}
      {!isLocked && (
        <div className="px-5 py-4 border-t border-dashed border-border bg-surface-raised">
          <ManualEntryForm onAdd={onAddManual} />
        </div>
      )}

      {/* Footer actions */}
      <div className="px-5 py-3 border-t border-dashed border-border flex items-center justify-between">
        <div className="text-xs text-subtle">
          {isLocked
            ? `Locked ${period.locked_at ? fmtDateUK(period.locked_at.slice(0, 10)) : ""}. 5-day dispute window from lock date.`
            : `Status: draft. Sum +${sub.bonus}% bonus / ${sub.deduction}% deduction. Lock when ready to attach to an invoice.`}
        </div>
        {isLocked ? (
          <button
            onClick={onReopen}
            className="inline-flex items-center gap-1.5 text-xs text-subtle hover:text-foreground"
          >
            Reopen
          </button>
        ) : (
          <button
            onClick={onLock}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded text-xs font-medium bg-foreground text-background hover:opacity-90 transition-opacity"
          >
            <LockClosedIcon className="size-3.5" />
            Lock at invoice
          </button>
        )}
      </div>
    </div>
  );
}

function ManualEntryForm({
  onAdd,
}: {
  onAdd: (entry: Omit<ScoringEntry, "id" | "added_at">) => void;
}) {
  const [lever, setLever] = useState<"speed" | "quality" | "retention">("retention");
  const [label, setLabel] = useState("");
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");

  function submit() {
    const n = parseFloat(delta);
    if (!label.trim() || isNaN(n)) return;
    onAdd({
      lever,
      label: label.trim(),
      delta_pct: n,
      source: "manual",
      reason: reason.trim() || undefined,
    });
    setLabel("");
    setDelta("");
    setReason("");
  }

  return (
    <div className="flex items-end gap-2 flex-wrap">
      <div className="grow min-w-[180px]">
        <label className={fieldLabel}>Reason (what happened)</label>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Client renewed, contractor went dark, complaint received"
          className={inputClass}
        />
      </div>
      <div className="w-32">
        <label className={fieldLabel}>Lever</label>
        <select
          value={lever}
          onChange={(e) =>
            setLever(e.target.value as "speed" | "quality" | "retention")
          }
          className={selectClass}
        >
          <option value="speed">Speed</option>
          <option value="quality">Quality</option>
          <option value="retention">Retention</option>
        </select>
      </div>
      <div className="w-24">
        <label className={fieldLabel}>Δ %</label>
        <input
          type="number"
          value={delta}
          onChange={(e) => setDelta(e.target.value)}
          placeholder="+10"
          className={`${inputClass} tabular-nums`}
        />
      </div>
      <button
        onClick={submit}
        disabled={!label.trim() || !delta}
        className="h-[42px] px-3 rounded border border-border bg-surface text-xs text-muted hover:bg-surface-raised hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Add
      </button>
    </div>
  );
}

/* ─────────────── KPIs tab (read-only summary) ─────────────── */

/* Per-person delivery summary pulled from kanban + scoring history.
 * Read-only by design - it's the at-a-glance "how is this person
 * doing" view. Numbers come from the same data the Scoring tab uses
 * so there's no source-of-truth drift. */
function KpisTab({ person }: { person: Person }) {
  const { clients, pods } = useKanbanData();

  const stats = useMemo(() => {
    const people = [person];
    let delivered = 0,
      onTime = 0,
      late = 0,
      stuckInRev = 0,
      testsWon = 0,
      testsRun = 0,
      currentlyOverdue = 0;
    const today = new Date().toISOString().slice(0, 10);

    for (const c of clients) {
      for (const p of c.projects) {
        for (const d of p.deliverables) {
          const candidates = [
            d.designer,
            d.secondaryDesigner,
            d.developer,
            d.secondaryDeveloper,
          ];
          if (
            !candidates.some(
              (n) => personByKanbanName(n, people, pods)?.id === person.id,
            )
          ) {
            continue;
          }
          const launch = (d.phaseHistory || []).find(
            (e) => isDeliveredPhase(e.phase),
          );
          if (launch) {
            delivered += 1;
            if (d.dueDate) {
              if (launch.enteredAt <= d.dueDate) onTime += 1;
              else late += 1;
            }
          } else {
            /* Still in flight - is it overdue right now? */
            if (d.dueDate && d.dueDate < today) currentlyOverdue += 1;
          }
          const revs = (d.phaseHistory || []).filter(
            (e) =>
              e.phase === "internal-revisions" ||
              e.phase === "external-revisions",
          ).length;
          if (revs >= 3) stuckInRev += 1;
          if (d.testResult) {
            testsRun += 1;
            if (d.testResult.outcome === "winner") testsWon += 1;
          }
        }
      }
    }

    const onTimeRate = onTime + late === 0 ? null : Math.round((onTime / (onTime + late)) * 100);
    const winRate = testsRun === 0 ? null : Math.round((testsWon / testsRun) * 100);
    return {
      delivered,
      onTime,
      late,
      onTimeRate,
      stuckInRev,
      testsRun,
      testsWon,
      winRate,
      currentlyOverdue,
    };
  }, [clients, pods, person]);

  /* Scoring history rollup. */
  const scoringRollup = useMemo(() => {
    const periods = (person.scoring_periods || []).filter(
      (p) => p.status === "locked",
    );
    if (periods.length === 0) return null;
    const totalBonus = periods.reduce(
      (s, p) => s + (p.final_delta_pct ?? 0),
      0,
    );
    const avg = totalBonus / periods.length;
    return { count: periods.length, total: totalBonus, avg };
  }, [person.scoring_periods]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          label="Delivered"
          value={String(stats.delivered)}
        />
        <SummaryCard
          label="On-time rate"
          value={stats.onTimeRate == null ? "-" : `${stats.onTimeRate}%`}
          tone={
            stats.onTimeRate == null
              ? "neutral"
              : stats.onTimeRate >= 80
              ? "positive"
              : stats.onTimeRate >= 60
              ? "neutral"
              : "warn"
          }
        />
        <SummaryCard
          label="Currently overdue"
          value={String(stats.currentlyOverdue)}
          tone={stats.currentlyOverdue > 0 ? "warn" : "muted"}
        />
        <SummaryCard
          label="3+ rev rounds"
          value={String(stats.stuckInRev)}
          tone={stats.stuckInRev > 0 ? "warn" : "muted"}
        />
        <SummaryCard
          label="Tests run"
          value={String(stats.testsRun)}
        />
        <SummaryCard
          label="Tests won"
          value={String(stats.testsWon)}
          tone="positive"
        />
        <SummaryCard
          label="Win rate"
          value={stats.winRate == null ? "-" : `${stats.winRate}%`}
          tone={stats.winRate != null && stats.winRate >= 30 ? "positive" : "neutral"}
        />
        <SummaryCard
          label="Late deliveries"
          value={String(stats.late)}
          tone={stats.late > 0 ? "warn" : "muted"}
        />
      </div>

      {scoringRollup && (
        <div className="bg-surface border border-border-faint rounded p-5">
          <div className="flex items-center gap-2 text-2xs uppercase tracking-wider text-subtle font-medium mb-4">
            <SparklesIcon className="size-4" />
            Contractor scheme rollup
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-subtle">Periods locked</div>
              <div className="mt-1 text-xl font-semibold text-foreground tabular-nums tracking-tight">
                {scoringRollup.count}
              </div>
            </div>
            <div>
              <div className="text-xs text-subtle">Total Δ% applied</div>
              <div
                className={`mt-1 text-xl font-semibold tabular-nums tracking-tight ${
                  scoringRollup.total > 0
                    ? "text-status-ontrack"
                    : scoringRollup.total < 0
                    ? "text-status-late"
                    : "text-foreground"
                }`}
              >
                {scoringRollup.total > 0 ? "+" : ""}
                {scoringRollup.total.toFixed(0)}%
              </div>
            </div>
            <div>
              <div className="text-xs text-subtle">Average per period</div>
              <div
                className={`mt-1 text-xl font-semibold tabular-nums tracking-tight ${
                  scoringRollup.avg > 0
                    ? "text-status-ontrack"
                    : scoringRollup.avg < 0
                    ? "text-status-late"
                    : "text-foreground"
                }`}
              >
                {scoringRollup.avg > 0 ? "+" : ""}
                {scoringRollup.avg.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────── Bonuses tab (audit log) ─────────────── */

/* Append-only log of every bonus paid to this human. Three kinds:
 *   - contractor_scheme: auto-created when a Scoring period is marked
 *     paid from Inbox (links back via scoring_period_id)
 *   - revenue_tier: 100k / 150k / 200k milestone hits for core_retainer
 *   - adhoc: founder discretion / project bonus / holiday
 *
 * Past entries can't be edited - that would muddy the audit trail. To
 * fix a mistake, delete the row + log a corrected one (delete is
 * intentionally light-touch, no confirm modal, since the audit gets
 * rebuilt next time the action runs). */
function BonusesTab({
  person,
  onPatch,
}: {
  person: Person;
  onPatch: (u: Partial<Person>) => void;
}) {
  const payments = person.bonus_payments || [];
  const sorted = [...payments].sort((a, b) =>
    b.paid_at.localeCompare(a.paid_at),
  );

  const totals = useMemo(() => {
    const byCurrency = new Map<string, number>();
    for (const p of payments) {
      byCurrency.set(p.currency, (byCurrency.get(p.currency) ?? 0) + p.amount);
    }
    return Array.from(byCurrency.entries());
  }, [payments]);

  function logBonus(input: Omit<BonusPayment, "id" | "created_at">) {
    const entry: BonusPayment = {
      ...input,
      id: uid(),
      created_at: new Date().toISOString(),
    };
    onPatch({ bonus_payments: [entry, ...payments] });
  }

  function removeBonus(id: string) {
    onPatch({ bonus_payments: payments.filter((b) => b.id !== id) });
  }

  return (
    <div className="space-y-6">
      {/* Totals header */}
      {totals.length === 0 ? (
        <div className="bg-surface border border-border-faint rounded p-5 text-xs text-subtle">
          No bonuses logged for {person.preferred_name || person.full_name} yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {totals.map(([cur, total]) => (
            <SummaryCard
              key={cur}
              label={`Total paid (${cur})`}
              value={fmtMoney(total, cur)}
              tone="positive"
            />
          ))}
          <SummaryCard
            label="Payments logged"
            value={String(payments.length)}
          />
        </div>
      )}

      {/* Log entry form */}
      <LogBonusForm currency={person.compensation_currency || "GBP"} onSubmit={logBonus} />

      {/* History */}
      {sorted.length > 0 && (
        <div className="bg-surface border border-border-faint rounded overflow-hidden">
          <div className="px-4 py-3 border-b border-border-faint">
            <h3 className="text-2xs uppercase tracking-wider text-subtle font-medium">
              History
            </h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR hover={false}>
                  <TH>Paid</TH>
                  <TH>Kind</TH>
                  <TH>Reason</TH>
                  <TH align="right">Amount</TH>
                  <TH>By</TH>
                  <TH align="right" className="w-12"></TH>
                </TR>
              </THead>
              <TBody>
                {sorted.map((b) => {
                  const today = new Date().toISOString().slice(0, 10);
                  const scheduled = b.paid_at > today;
                  return (
                    <TR key={b.id}>
                      <TD className="text-muted whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Num>{fmtDateUK(b.paid_at)}</Num>
                          <Badge tone={scheduled ? "warning" : "success"}>
                            {scheduled ? "Scheduled" : "Paid"}
                          </Badge>
                        </div>
                      </TD>
                      <TD className="text-muted text-xs uppercase tracking-wider">
                        {b.kind === "contractor_scheme"
                          ? "Scheme"
                          : b.kind === "revenue_tier"
                          ? `Tier${b.tier ? ` ${b.tier}k` : ""}`
                          : "Ad-hoc"}
                      </TD>
                      <TD className="text-foreground">
                        {b.scoring_period_id ? (
                          <Link
                            href={`/company/people/${person.id}?tab=scoring`}
                            className="hover:underline"
                          >
                            {b.reason}
                          </Link>
                        ) : (
                          b.reason
                        )}
                      </TD>
                      <TD align="right" className="text-muted whitespace-nowrap">
                        <Num>{fmtMoney(b.amount, b.currency)}</Num>
                      </TD>
                      <TD className="text-muted text-xs">{b.paid_by}</TD>
                      <TD align="right">
                        <button
                          onClick={() => removeBonus(b.id)}
                          className="text-subtle hover:text-status-late transition-colors"
                          title="Remove entry"
                        >
                          <XCircleIcon className="size-4" />
                        </button>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

function LogBonusForm({
  currency,
  onSubmit,
}: {
  currency: string;
  onSubmit: (b: Omit<BonusPayment, "id" | "created_at">) => void;
}) {
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [kind, setKind] = useState<BonusKind>("adhoc");
  const [tier, setTier] = useState<100 | 150 | 200>(100);
  const [reason, setReason] = useState("");
  const [paidBy, setPaidBy] = useState("Dylan");

  function submit() {
    const n = parseFloat(amount);
    if (isNaN(n) || n <= 0 || !reason.trim()) return;
    onSubmit({
      kind,
      amount: n,
      currency,
      paid_at: paidAt,
      reason: reason.trim(),
      tier: kind === "revenue_tier" ? tier : undefined,
      paid_by: paidBy.trim() || "admin",
    });
    setAmount("");
    setReason("");
  }

  return (
    <div className="bg-surface border border-border-faint rounded p-5">
      <h3 className="text-2xs uppercase tracking-wider text-subtle font-medium mb-4">
        Log a bonus payment
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        <div className="md:col-span-1">
          <label className={fieldLabel}>Paid on</label>
          <input
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="md:col-span-1">
          <label className={fieldLabel}>Kind</label>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as BonusKind)}
            className={selectClass}
          >
            <option value="adhoc">Ad-hoc</option>
            <option value="revenue_tier">Revenue tier</option>
            <option value="contractor_scheme">Contractor scheme</option>
          </select>
        </div>
        {kind === "revenue_tier" && (
          <div className="md:col-span-1">
            <label className={fieldLabel}>Tier</label>
            <select
              value={tier}
              onChange={(e) => setTier(parseInt(e.target.value) as 100 | 150 | 200)}
              className={selectClass}
            >
              <option value={100}>100k</option>
              <option value={150}>150k</option>
              <option value={200}>200k</option>
            </select>
          </div>
        )}
        <div className={kind === "revenue_tier" ? "md:col-span-2" : "md:col-span-3"}>
          <label className={fieldLabel}>Reason</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="What's it for?"
            className={inputClass}
          />
        </div>
        <div className="md:col-span-1">
          <label className={fieldLabel}>Amount ({currency})</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className={`${inputClass} tabular-nums`}
          />
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 gap-3">
        <input
          type="text"
          value={paidBy}
          onChange={(e) => setPaidBy(e.target.value)}
          placeholder="Logged by"
          className="h-8 px-2.5 rounded border border-border bg-surface text-xs text-muted placeholder:text-subtle focus:outline-none focus:border-foreground w-32"
        />
        <button
          onClick={submit}
          disabled={!amount || !reason.trim()}
          className="px-4 py-2 rounded text-xs font-medium bg-foreground text-background hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          Log payment
        </button>
      </div>
    </div>
  );
}

/* ─────────────── Set login credentials button ─────────────── */

/* Admin-direct login provisioning. One button on the Overview tab
 * Contact section opens a modal where admin sets email + password
 * for the team member. Hits /api/admin/set-user-credentials which
 * creates the Supabase Auth user with email_confirm=true (no
 * verification email) + adds them to the app_users allowlist. Admin
 * hands credentials over via Slack DM.
 *
 * The previous invite-by-email flow was removed - SMTP / Supabase
 * deliverability was unreliable + Dylan wanted full control over
 * who gets access + when.
 *
 * Access control: only emails on app_users can sign in afterwards
 * (every sign-in path pre-checks). */
function InviteButton({ person }: { person: Person }) {
  const [showCredentials, setShowCredentials] = useState(false);
  const [alreadyHasLogin, setAlreadyHasLogin] = useState<boolean>(false);
  const [checking, setChecking] = useState(true);

  const canSet = !!person.email?.trim();

  /* Show whether this email already has a login on Launchpad so
   * admin knows they're updating an existing password vs creating
   * a fresh one. The set-credentials endpoint handles both cases. */
  useEffect(() => {
    let cancelled = false;
    const email = person.email?.trim();
    if (!email) {
      setChecking(false);
      return;
    }
    import("@/lib/auth/app-users").then(({ findAppUserByEmail }) => {
      findAppUserByEmail(email)
        .then((u) => {
          if (cancelled) return;
          setAlreadyHasLogin(!!u);
        })
        .finally(() => {
          if (!cancelled) setChecking(false);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [person.email]);

  return (
    <div className="pt-2">
      <button
        onClick={() => setShowCredentials(true)}
        disabled={!canSet || checking}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded border border-border bg-surface text-xs text-muted hover:bg-surface-raised hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {alreadyHasLogin ? "Reset login credentials" : "Set login credentials"}
      </button>
      {!person.email?.trim() && (
        <p className="text-2xs text-subtle mt-1">
          Add an email above to enable login setup.
        </p>
      )}
      {alreadyHasLogin && (
        <p className="text-2xs text-subtle mt-1">
          {person.full_name} already has a login. Click above to reset their password.
        </p>
      )}
      {showCredentials && (
        <SetCredentialsModal
          person={person}
          onClose={() => setShowCredentials(false)}
        />
      )}
    </div>
  );
}

/* ─────────────── Access level control ───────────────
 * Standalone Member / Admin toggle, independent of credential resets.
 * Reads the person's app_users row by email, shows the current level,
 * and flips it via /api/admin/set-user-role - no password reset
 * needed. Only renders once a login exists (you set credentials first,
 * then promote/demote freely). */
function AccessLevelControl({ person }: { person: Person }) {
  const [user, setUser] = useState<{ id: string; role: string } | null | "loading">("loading");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const email = person.email?.trim();

  useEffect(() => {
    let cancelled = false;
    if (!email) {
      setUser(null);
      return;
    }
    setUser("loading");
    import("@/lib/auth/app-users").then(({ findAppUserByEmail }) => {
      findAppUserByEmail(email).then((u) => {
        if (!cancelled) setUser(u ? { id: u.id, role: u.role } : null);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [email]);

  async function change(role: "team" | "admin") {
    if (user === "loading" || !user) return;
    const currentBucket = user.role === "team" ? "team" : "admin";
    if (role === currentBucket) return;
    setBusy(true);
    setNote(null);
    const { setAppUserRole } = await import("@/lib/auth/app-users");
    const ok = await setAppUserRole(user.id, role);
    setBusy(false);
    if (ok) {
      setUser({ ...user, role });
      setNote(
        `Now ${role === "admin" ? "Admin" : "Member"}. Takes effect on their next sign-in.`,
      );
    } else {
      setNote("Couldn't change access level - try again.");
    }
  }

  if (user === "loading") return null;
  /* No email or no login yet - InviteButton already prompts to set
   * credentials, so stay quiet rather than double up the hint. */
  if (!email || !user) return null;

  const bucket = user.role === "team" ? "team" : "admin";

  return (
    <div className="pt-3 mt-3 border-t border-dashed border-border">
      <div className="text-2xs uppercase tracking-wider text-subtle font-medium mb-1.5">
        Access level
      </div>
      <div className="grid grid-cols-2 gap-1.5 max-w-[260px]">
        <button
          type="button"
          onClick={() => change("team")}
          disabled={busy}
          className={`px-3 py-2 rounded border text-xs font-medium transition-colors disabled:opacity-50 ${
            bucket === "team"
              ? "border-border bg-surface-raised text-foreground"
              : "border-border bg-surface text-muted hover:text-foreground hover:bg-surface-raised"
          }`}
        >
          Member
        </button>
        <button
          type="button"
          onClick={() => change("admin")}
          disabled={busy}
          className={`px-3 py-2 rounded border text-xs font-medium transition-colors disabled:opacity-50 ${
            bucket === "admin"
              ? "border-border bg-surface-raised text-foreground"
              : "border-border bg-surface text-muted hover:text-foreground hover:bg-surface-raised"
          }`}
        >
          Admin
        </button>
      </div>
      <p className="text-2xs text-subtle mt-1.5 leading-relaxed">
        {bucket === "team"
          ? "Member: My Tasks, Delivery, Hero Offer, Training, tools. No finance/admin."
          : "Admin: full access to every surface (finance + admin still need their own passcode)."}
      </p>
      {note && <p className="text-2xs text-status-ontrack mt-1">{note}</p>}
    </div>
  );
}

/* ── Set Credentials Modal ──
 * Admin-direct provisioning. Hits /api/admin/set-user-credentials
 * which creates the Supabase Auth user with email + password +
 * email_confirm=true (no verification email). On success the modal
 * shows the credentials back to admin to copy + share with the
 * team member via Slack/email/whatever. */
function SetCredentialsModal({
  person,
  onClose,
}: {
  person: Person;
  onClose: () => void;
}) {
  const [email, setEmail] = useState(person.email || "");
  const [password, setPassword] = useState(generatePassword());
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [copiedField, setCopiedField] = useState<"email" | "password" | "both" | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/set-user-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          name: person.full_name,
          podMemberId: person.pod_member_id ?? null,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        mode?: "created" | "updated";
        error?: string;
      };
      if (!res.ok || !body.ok) {
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      setResult({
        ok: true,
        msg:
          body.mode === "updated"
            ? "Password updated. Share the new credentials with them."
            : "Login created. Share these credentials with them.",
      });
    } catch (err) {
      setResult({
        ok: false,
        msg: err instanceof Error ? err.message : "Set credentials failed",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function copy(field: "email" | "password" | "both") {
    let text = "";
    if (field === "email") text = email;
    else if (field === "password") text = password;
    else text = `Email: ${email}\nPassword: ${password}\nSign in at: ${typeof window !== "undefined" ? window.location.origin : ""}/login`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 1500);
    } catch {
      /* silent - older browser */
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="bg-surface rounded border border-border w-full max-w-md p-6"
      >
        <h2 className="text-lg font-semibold text-foreground mb-1">
          Set login credentials
        </h2>
        <p className="text-xs text-subtle mb-5 leading-relaxed">
          Creates the login for <span className="text-foreground">{person.full_name}</span> directly. They can sign in immediately - no verification email needed.
        </p>
        <div className="space-y-3">
          <div>
            <label className={fieldLabel}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className={fieldLabel}>Password</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputClass} font-mono`}
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setPassword(generatePassword())}
                className="px-3 rounded border border-border bg-surface text-xs text-subtle hover:text-foreground hover:bg-surface-raised transition-colors"
                title="Generate new password"
              >
                ↻
              </button>
            </div>
            <p className="text-2xs text-subtle mt-1">Min 8 chars. Auto-generated; edit if you prefer.</p>
          </div>
        </div>
        {result && (
          <div
            className={`mt-4 p-3 rounded border text-xs ${
              result.ok
                ? "bg-surface-raised border-border text-status-ontrack"
                : "bg-surface-raised border-border text-status-late"
            }`}
          >
            {result.msg}
            {result.ok && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => copy("email")}
                  className="px-2 py-1 text-2xs rounded border border-border bg-surface hover:bg-surface-raised text-muted hover:text-foreground transition-colors"
                >
                  {copiedField === "email" ? "Copied" : "Copy email"}
                </button>
                <button
                  type="button"
                  onClick={() => copy("password")}
                  className="px-2 py-1 text-2xs rounded border border-border bg-surface hover:bg-surface-raised text-muted hover:text-foreground transition-colors"
                >
                  {copiedField === "password" ? "Copied" : "Copy password"}
                </button>
                <button
                  type="button"
                  onClick={() => copy("both")}
                  className="px-2 py-1 text-2xs rounded border border-border bg-surface hover:bg-surface-raised text-muted hover:text-foreground transition-colors"
                >
                  {copiedField === "both" ? "Copied" : "Copy both + link"}
                </button>
              </div>
            )}
          </div>
        )}
        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-sm text-subtle hover:text-foreground"
          >
            {result?.ok ? "Done" : "Cancel"}
          </button>
          {!result?.ok && (
            <button
              type="submit"
              disabled={submitting}
              className="px-3 py-2 bg-foreground text-background text-sm font-medium rounded hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {submitting ? "Setting..." : "Set credentials"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

/* Strong random password: 12 chars, mix of upper/lower/digits +
 * 2 safe symbols. Avoids look-alike chars (0/O, 1/l) so admin can
 * read it aloud without confusion if needed. */
function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!#";
  let out = "";
  const arr = new Uint32Array(12);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
    for (let i = 0; i < 12; i++) out += chars[arr[i] % chars.length];
  } else {
    for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
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
    <div className={`bg-surface border border-border-faint rounded p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-2xs uppercase tracking-wider text-subtle font-medium">{title}</h3>
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
      <label className={fieldLabel}>{label}</label>
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
      <label className={fieldLabel}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={selectClass}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {renderOption ? renderOption(opt) : opt || "Select"}
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

  function onCreated(created: Agreement[]) {
    setAgreements((prev) => [...created, ...prev]);
    setModalOpen(false);
    if (created.length === 1) {
      router.push(`/company/contracts/${created[0].id}`);
    }
  }

  async function deleteAgreement(a: Agreement) {
    if (!window.confirm(`Delete this ${AGREEMENT_KIND_LABEL[a.kind].toLowerCase()} permanently? This can't be undone.`)) return;
    try {
      await agreementStore.remove(a.id);
      setAgreements((prev) => prev.filter((x) => x.id !== a.id));
    } catch (err) {
      console.error("[agreements] delete failed:", err);
      window.alert("Delete failed - check console.");
    }
  }

  async function archiveAgreement(a: Agreement) {
    /* "Archive" = terminate without a destructive delete. Status
     * flips to terminated; the row stays on the timeline so the
     * audit trail is preserved. */
    if (!window.confirm(`Archive this ${AGREEMENT_KIND_LABEL[a.kind].toLowerCase()}? It'll be moved to Terminated status.`)) return;
    const now = new Date().toISOString();
    try {
      await agreementStore.update(a.id, {
        status: "terminated",
        terminated_at: now,
        terminated_reason: "Archived from Person profile",
        updated_at: now,
      });
      setAgreements((prev) =>
        prev.map((x) =>
          x.id === a.id
            ? { ...x, status: "terminated" as const, terminated_at: now }
            : x,
        ),
      );
    } catch (err) {
      console.error("[agreements] archive failed:", err);
      window.alert("Archive failed - check console.");
    }
  }

  if (loading) {
    return <div className="h-24 bg-surface rounded border border-border-faint animate-pulse" />;
  }

  return (
    <div>
      {/* Header row: always-visible + New agreement button.
       * Dylan can issue multiple contracts per person now (e.g. a
       * second contract after a role change, a separate NDA, etc.). */}
      <div className="flex items-center justify-between mb-6 gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Agreements ({agreements.length})
          </h3>
          <p className="text-2xs text-subtle mt-0.5">
            Every contract, NDA + status for {person.full_name}. New one picks
            from Leadership / Designer / Developer / Custom template.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded border border-border bg-surface text-xs text-muted hover:bg-surface-raised hover:text-foreground transition-colors"
        >
          <PlusIcon className="size-3.5" /> New agreement
        </button>
      </div>

      {agreements.length === 0 ? (
        <div className="bg-surface border border-border-faint rounded py-16 text-center">
          <p className="text-sm text-foreground font-medium mb-1">
            No agreements yet for {person.full_name}.
          </p>
          <p className="text-xs text-subtle max-w-md mx-auto">
            Click <span className="text-foreground font-medium">New agreement</span> above to generate a contract. Pick the template that fits the role - the master clauses get snapshotted onto this person&apos;s contract so future template edits don&apos;t rewrite it.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {agreements.map((a) => {
            const meta = AGREEMENT_STATUS_META[a.status];
            return (
              <div
                key={a.id}
                className="flex items-center justify-between gap-3 bg-surface border border-border-faint rounded p-5 hover:bg-surface-raised transition-colors group"
              >
                <Link
                  href={`/company/contracts/${a.id}`}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  <span className="inline-flex items-center px-2 py-0.5 text-2xs font-medium uppercase tracking-wider rounded-sm border border-border bg-surface-raised text-muted shrink-0">
                    {AGREEMENT_KIND_LABEL[a.kind]}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {a.template_body.title}
                    </div>
                    <div className="text-2xs text-subtle mt-0.5 truncate">
                      {a.template_revision}
                    </div>
                  </div>
                </Link>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge tone={AGREEMENT_STATUS_TONE[a.status] ?? "neutral"}>
                    {meta.label}
                  </Badge>
                  {/* Per-agreement actions. Archive flips to
                   * terminated (audit-safe). Delete is destructive
                   * and confirms inline. Hidden until row hover so
                   * the list stays clean. */}
                  <div className="hidden group-hover:flex items-center gap-1">
                    {a.status !== "terminated" && (
                      <button
                        onClick={() => archiveAgreement(a)}
                        title="Archive (flips to terminated, kept for audit)"
                        className="px-2 py-0.5 text-2xs font-medium uppercase tracking-wider text-subtle hover:text-foreground hover:bg-surface rounded transition-colors"
                      >
                        Archive
                      </button>
                    )}
                    <button
                      onClick={() => deleteAgreement(a)}
                      title="Delete permanently"
                      className="px-2 py-0.5 text-2xs font-medium uppercase tracking-wider text-subtle hover:text-danger rounded transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
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

