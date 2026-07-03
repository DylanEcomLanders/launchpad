"use client";

/* ── Contracts admin list ──
 * /company/contracts. All agreements (NDA + Contract) across all people
 * in one flat data table, ordered by lifecycle status then recency. Each
 * row links into the detail page where Dylan counter-signs and copies the
 * signing URL to share with the team member.
 *
 * Header surfaces a "Templates" link (where the master clauses live)
 * and "New agreement" so this page is a standalone hub for the
 * agreement lifecycle.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DocumentTextIcon, PlusIcon } from "@heroicons/react/24/outline";
import { agreementStore } from "@/lib/agreements/data";
import { peopleStore } from "@/lib/company/data";
import type { Agreement, AgreementStatus } from "@/lib/agreements/types";
import { AGREEMENT_STATUS_META, AGREEMENT_KIND_LABEL } from "@/lib/agreements/types";
import type { Person } from "@/lib/company/types";
import { QuickAddAgreementModal } from "@/components/agreements/quick-add-modal";
import { Table, THead, TBody, TR, TH, TD, Num, Badge } from "@/components/ui";

const STATUS_ORDER: AgreementStatus[] = [
  "team_signed",
  "sent",
  "draft",
  "counter_signed",
  "active",
  "terminated",
];

/* Status = the only colour in the table body: a quiet Badge (subtle bg,
 * muted text, one leading dot). Tones map to the MUTED status palette,
 * never the loud danger/warning/success on the value. The label copy
 * stays sourced from AGREEMENT_STATUS_META so it remains canonical. */
type StatusTone = "success" | "warning" | "danger" | "neutral";
const STATUS_TONE: Record<AgreementStatus, StatusTone> = {
  draft: "neutral",
  sent: "warning",
  team_signed: "warning",
  counter_signed: "neutral",
  active: "success",
  terminated: "danger",
};

export default function ContractsPanel() {
  const router = useRouter();
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | AgreementStatus>("all");

  useEffect(() => {
    Promise.all([agreementStore.getAll(), peopleStore.getAll()]).then(([a, p]) => {
      setAgreements(a);
      setPeople(p);
      setLoading(false);
    });
  }, []);

  function onQuickAddCreated(created: Agreement[]) {
    setQuickAddOpen(false);
    /* Optimistic: merge the new agreements into local state so the
     * list reflects the change without waiting for a refetch. */
    setAgreements((prev) => [...created, ...prev]);
    /* If we created exactly one agreement, deep-link straight to its
     * detail page (the user is most likely about to copy the signing
     * URL). If we created two (typical NDA + contract case), stay on
     * the list so they can copy both URLs at their own pace. */
    if (created.length === 1) {
      router.push(`/company/contracts/${created[0].id}`);
    }
  }

  const peopleById = useMemo(() => {
    const m = new Map<string, Person>();
    for (const p of people) m.set(p.id, p);
    return m;
  }, [people]);

  const grouped = useMemo(() => {
    const m: Record<AgreementStatus, Agreement[]> = {
      draft: [],
      sent: [],
      team_signed: [],
      counter_signed: [],
      active: [],
      terminated: [],
    };
    for (const a of agreements) m[a.status].push(a);
    /* Within a status, sort by most recently updated so the freshest
     * rows surface first. */
    for (const k of Object.keys(m) as AgreementStatus[]) {
      m[k].sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));
    }
    return m;
  }, [agreements]);

  /* Flatten into one ordered list: lifecycle order first (STATUS_ORDER),
   * recency within each status. The table replaces the per-status card
   * grids so all agreements read as one dense, ordered surface. */
  const rows = useMemo(() => {
    const flat: Agreement[] = [];
    for (const status of STATUS_ORDER) flat.push(...grouped[status]);
    if (statusFilter === "all") return flat;
    return flat.filter((a) => a.status === statusFilter);
  }, [grouped, statusFilter]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-56 bg-surface rounded animate-pulse" />
        <div className="h-48 bg-surface rounded border border-border-faint animate-pulse" />
      </div>
    );
  }

  const total = agreements.length;
  const awaitingCounter = grouped.team_signed.length;
  const awaitingTeam = grouped.sent.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            Contracts & NDAs
          </h1>
          <p className="text-2xs text-subtle mt-0.5">
            {total} total · {awaitingCounter} awaiting your counter-sign ·{" "}
            {awaitingTeam} awaiting team member
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/company/contracts/templates"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded border border-border bg-surface text-xs text-muted hover:bg-surface-raised hover:text-foreground transition-colors"
          >
            <DocumentTextIcon className="size-3.5" />
            Templates
          </Link>
          <button
            onClick={() => setQuickAddOpen(true)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded border border-border bg-surface text-xs text-muted hover:bg-surface-raised hover:text-foreground transition-colors"
          >
            <PlusIcon className="size-3.5" />
            New agreement
          </button>
        </div>
      </div>

      {total === 0 ? (
        <div className="bg-surface border border-border-faint rounded py-16 text-center">
          <p className="text-sm text-subtle">No agreements yet.</p>
          <button
            onClick={() => setQuickAddOpen(true)}
            className="mt-3 inline-flex items-center gap-1.5 h-8 px-3 rounded border border-border bg-surface text-xs text-muted hover:bg-surface-raised hover:text-foreground transition-colors"
          >
            <PlusIcon className="size-3.5" />
            New agreement
          </button>
        </div>
      ) : (
        <>
          {/* Toolbar: count + status filter left, no search (small dataset). */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-subtle tabular-nums mr-1">
                {rows.length} of {total}
              </span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | AgreementStatus)}
                className="h-8 px-2.5 rounded border border-border bg-surface text-xs text-muted appearance-none focus:outline-none focus:border-foreground max-w-[200px]"
              >
                <option value="all">All statuses</option>
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {AGREEMENT_STATUS_META[s].label} ({grouped[s].length})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="bg-surface border border-border-faint rounded py-16 text-center">
              <p className="text-sm text-subtle">No agreements match this filter.</p>
            </div>
          ) : (
            <div className="bg-surface border border-border-faint rounded overflow-x-auto">
              <Table>
                <THead>
                  <TR hover={false}>
                    <TH>Agreement</TH>
                    <TH>For</TH>
                    <TH>Kind</TH>
                    <TH>Status</TH>
                    <TH align="right">Updated</TH>
                  </TR>
                </THead>
                <TBody>
                  {rows.map((a) => {
                    const person = peopleById.get(a.person_id);
                    return (
                      <TR key={a.id}>
                        <TD className="max-w-[280px]">
                          <Link
                            href={`/company/contracts/${a.id}`}
                            className="text-foreground hover:underline truncate block"
                          >
                            {a.template_body.title}
                          </Link>
                        </TD>
                        <TD className="text-muted truncate max-w-[200px]">
                          {a.person_full_name}
                          <span className="ml-1.5 text-2xs text-subtle">
                            {a.person_job_title || person?.job_title || "-"}
                          </span>
                        </TD>
                        <TD className="text-muted">{AGREEMENT_KIND_LABEL[a.kind]}</TD>
                        <TD>
                          <Badge tone={STATUS_TONE[a.status]}>
                            {AGREEMENT_STATUS_META[a.status].label}
                          </Badge>
                        </TD>
                        <TD align="right" className="text-muted">
                          <Num>{fmtRel(a.updated_at)}</Num>
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </div>
          )}
        </>
      )}

      <QuickAddAgreementModal
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        existingPeople={people}
        existingAgreements={agreements}
        onCreated={onQuickAddCreated}
      />
    </div>
  );
}

function fmtRel(iso: string): string {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "-";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return "today";
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
