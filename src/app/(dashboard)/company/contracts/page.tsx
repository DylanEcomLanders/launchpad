"use client";

/* ── Contracts admin list ──
 * /company/contracts. All agreements (NDA + Contract) across all people,
 * grouped by status. Each row links into the detail page where Dylan
 * counter-signs and copies the signing URL to share with the team member.
 *
 * Header surfaces a "Templates" link (where the master clauses live)
 * and "Manage people" (back to /company/people) so this page is a
 * standalone hub for the agreement lifecycle.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DocumentTextIcon, ShieldCheckIcon, PlusIcon } from "@heroicons/react/24/outline";
import { agreementStore } from "@/lib/agreements/data";
import { peopleStore } from "@/lib/company/data";
import type { Agreement, AgreementStatus } from "@/lib/agreements/types";
import { AGREEMENT_STATUS_META, AGREEMENT_KIND_LABEL } from "@/lib/agreements/types";
import type { Person } from "@/lib/company/types";
import { QuickAddAgreementModal } from "@/components/agreements/quick-add-modal";

const STATUS_ORDER: AgreementStatus[] = [
  "team_signed",
  "sent",
  "draft",
  "counter_signed",
  "active",
  "terminated",
];

export default function ContractsListPage() {
  const router = useRouter();
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

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

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 md:px-10 py-12">
        <div className="text-sm text-[#7A7A7A]">Loading agreements...</div>
      </div>
    );
  }

  const total = agreements.length;
  const awaitingCounter = grouped.team_signed.length;
  const awaitingTeam = grouped.sent.length;

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-10 py-10 pb-24">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[#1B1B1B] tracking-tight">
            Contracts &amp; NDAs
          </h1>
          <p className="text-[13px] text-[#7A7A7A] mt-1">
            {total} total · {awaitingCounter} awaiting your counter-sign ·{" "}
            {awaitingTeam} awaiting team member
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/company/contracts/templates"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E5E5EA] text-[#1B1B1B] text-[13px] font-medium rounded-lg hover:border-[#1B1B1B] transition-colors"
          >
            <DocumentTextIcon className="size-4" />
            Templates
          </Link>
          <button
            onClick={() => setQuickAddOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#1B1B1B] text-white text-[13px] font-medium rounded-lg hover:bg-[#2D2D2D] transition-colors"
          >
            <PlusIcon className="size-4" />
            New agreement
          </button>
        </div>
      </div>

      {total === 0 ? (
        <div className="bg-[#F7F8FA] border border-dashed border-[#E5E5EA] rounded-2xl p-10 text-center">
          <ShieldCheckIcon className="size-7 text-[#A0A0A0] mx-auto mb-3" />
          <div className="text-[15px] font-medium text-[#1B1B1B] mb-1">
            No agreements yet
          </div>
          <div className="text-[13px] text-[#7A7A7A] mb-5 max-w-md mx-auto">
            Click <strong>New agreement</strong> above to spin up an NDA and contract
            from just name, role, and compensation. Or convert a candidate at{" "}
            <Link href="/company/hiring" className="underline">/company/hiring</Link>{" "}
            for the full hiring flow.
          </div>
          <button
            onClick={() => setQuickAddOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#1B1B1B] text-white text-[13px] font-medium rounded-lg hover:bg-[#2D2D2D] transition-colors"
          >
            <PlusIcon className="size-4" />
            New agreement
          </button>
        </div>
      ) : (
        STATUS_ORDER.map((status) => {
          const list = grouped[status];
          if (list.length === 0) return null;
          const meta = AGREEMENT_STATUS_META[status];
          return (
            <section key={status} className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded"
                  style={{ background: meta.bg, color: meta.fg }}
                >
                  {meta.label}
                </span>
                <span className="text-[11px] text-[#A0A0A0]">{list.length}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {list.map((a) => {
                  const person = peopleById.get(a.person_id);
                  return (
                    <Link
                      key={a.id}
                      href={`/company/contracts/${a.id}`}
                      className="block bg-white border border-[#EDEDEF] rounded-xl p-4 hover:border-[#1B1B1B]/30 hover:shadow-[var(--shadow-soft)] transition-all"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-[14px] font-medium text-[#1B1B1B] truncate">
                            {a.person_full_name}
                          </div>
                          <div className="text-[11px] text-[#7A7A7A] mt-0.5">
                            {a.person_job_title || person?.job_title || "—"}
                          </div>
                        </div>
                        <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-[#F3F3F5] text-[#1B1B1B]">
                          {AGREEMENT_KIND_LABEL[a.kind]}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#A0A0A0]">
                        Updated {fmtRel(a.updated_at)}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })
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
  if (Number.isNaN(ts)) return "—";
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
