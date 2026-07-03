"use client";

/* ── Contracts & NDAs: per-person compliance ──
 * /company/contracts. One row PER PERSON (not per agreement) so it's
 * instantly clear who has and hasn't signed. The NDA lives as a clause
 * inside the contract, so a single signature covers both: one "Agreement"
 * column per person. The cell links into the agreement detail page (view /
 * counter-sign / copy signing URL). "Missing" flags a person with no
 * agreement on file.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DocumentTextIcon, PlusIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { agreementStore } from "@/lib/agreements/data";
import { peopleStore } from "@/lib/company/data";
import { deptColor, initials } from "@/lib/company/ui";
import type { Agreement, AgreementStatus } from "@/lib/agreements/types";
import type { Person } from "@/lib/company/types";
import { QuickAddAgreementModal } from "@/components/agreements/quick-add-modal";
import { Table, THead, TBody, TR, TH, TD, Badge } from "@/components/ui";

type Tone = "success" | "warning" | "danger" | "neutral";
type Compliance = { label: string; tone: Tone; viewId: string | null; signed: boolean };

/* Higher rank = further along, so the "best" agreement wins when a person
 * has more than one on file (e.g. an old draft plus a live contract). NDAs
 * are folded into the contract now, but any legacy standalone NDA still
 * counts toward "signed" so nobody reads as a false gap. */
const STATUS_RANK: Record<AgreementStatus, number> = {
  terminated: 0,
  draft: 1,
  sent: 2,
  team_signed: 3,
  counter_signed: 4,
  active: 5,
};

/* "Signed" = the person has put pen to paper (team_signed or beyond). */
function compliance(a: Agreement | null): Compliance {
  if (!a) return { label: "Missing", tone: "danger", viewId: null, signed: false };
  switch (a.status) {
    case "active":
    case "counter_signed":
    case "team_signed":
      return { label: "Signed", tone: "success", viewId: a.id, signed: true };
    case "sent":
      return { label: "Awaiting signature", tone: "warning", viewId: a.id, signed: false };
    case "draft":
      return { label: "Draft", tone: "neutral", viewId: a.id, signed: false };
    case "terminated":
      return { label: "Terminated", tone: "danger", viewId: a.id, signed: false };
    default:
      return { label: "Missing", tone: "danger", viewId: null, signed: false };
  }
}

export default function ContractsPanel() {
  const router = useRouter();
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [gapFilter, setGapFilter] = useState<"all" | "outstanding">("all");

  useEffect(() => {
    Promise.all([agreementStore.getAll(), peopleStore.getAll()]).then(([a, p]) => {
      setAgreements(a);
      setPeople(p);
      setLoading(false);
    });
  }, []);

  function onQuickAddCreated(created: Agreement[]) {
    setQuickAddOpen(false);
    setAgreements((prev) => [...created, ...prev]);
    if (created.length === 1) router.push(`/company/contracts/${created[0].id}`);
  }

  /* One compliance row per current person: their best agreement of any kind
   * (the combined contract+NDA doc, or a legacy standalone if that's all
   * they have). */
  const rows = useMemo(() => {
    const best = new Map<string, Agreement | null>();
    for (const p of people) best.set(p.id, null);
    for (const a of agreements) {
      if (!best.has(a.person_id)) continue;
      const cur = best.get(a.person_id) ?? null;
      if (!cur || STATUS_RANK[a.status] > STATUS_RANK[cur.status]) best.set(a.person_id, a);
    }
    return people
      .filter((p) => p.status !== "left")
      .map((p) => ({ person: p, agreement: compliance(best.get(p.id) ?? null) }));
  }, [people, agreements]);

  const stats = useMemo(() => {
    const signed = rows.filter((r) => r.agreement.signed).length;
    return { total: rows.length, signed, outstanding: rows.length - signed };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (gapFilter === "outstanding" && r.agreement.signed) return false;
      if (!q) return true;
      return `${r.person.full_name} ${r.person.preferred_name || ""} ${r.person.job_title || ""}`
        .toLowerCase()
        .includes(q);
    });
  }, [rows, query, gapFilter]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-56 bg-surface rounded animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-24 bg-surface rounded border border-border-faint animate-pulse" />
          <div className="h-24 bg-surface rounded border border-border-faint animate-pulse" />
        </div>
        <div className="h-64 bg-surface rounded border border-border-faint animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Contracts &amp; NDAs</h1>
          <p className="text-2xs text-subtle mt-0.5">
            Signing status for everyone on the team. One agreement covers contract and NDA.
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

      {/* Compliance stat tiles */}
      <div className="grid grid-cols-2 gap-3">
        <StatTile
          label="Agreements signed"
          value={`${stats.signed}`}
          total={stats.total}
          alert={stats.signed < stats.total}
        />
        <StatTile label="Outstanding" value={`${stats.outstanding}`} alert={stats.outstanding > 0} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-subtle tabular-nums mr-1">
            {filtered.length} of {rows.length}
          </span>
          <select
            value={gapFilter}
            onChange={(e) => setGapFilter(e.target.value as typeof gapFilter)}
            className="h-8 px-2.5 rounded border border-border bg-surface text-xs text-muted appearance-none focus:outline-none focus:border-foreground"
          >
            <option value="all">Everyone</option>
            <option value="outstanding">Outstanding only</option>
          </select>
        </div>
        <div className="relative w-full md:w-64">
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-subtle z-10" />
          <input
            placeholder="Search name or title"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 w-full pl-8 pr-3 rounded border border-border bg-surface text-xs text-muted placeholder:text-subtle focus:outline-none focus:border-foreground"
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="bg-surface border border-border-faint rounded py-16 text-center">
          <p className="text-sm text-subtle">No team members yet.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface border border-border-faint rounded py-16 text-center">
          <p className="text-sm text-subtle">No one matches this filter.</p>
        </div>
      ) : (
        <div className="bg-surface border border-border-faint rounded overflow-x-auto">
          <Table>
            <THead>
              <TR hover={false}>
                <TH>Person</TH>
                <TH>Title</TH>
                <TH>Agreement</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.map((r) => (
                <TR key={r.person.id}>
                  <TD className="max-w-[240px]">
                    <Link
                      href={`/company/people/${r.person.id}`}
                      className="flex items-center gap-2.5 text-foreground hover:underline truncate"
                    >
                      <span
                        className="inline-flex items-center justify-center size-5 rounded-full text-4xs font-medium text-white shrink-0"
                        style={{ background: deptColor(r.person.department) }}
                      >
                        {initials(r.person.full_name)}
                      </span>
                      <span className="truncate">{r.person.preferred_name || r.person.full_name}</span>
                    </Link>
                  </TD>
                  <TD className="text-muted truncate max-w-[200px]">{r.person.job_title || "Not set"}</TD>
                  <TD>
                    <ComplianceCell c={r.agreement} />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
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

/* Signed/sent cells are clickable to view the document; "Missing" is inert. */
function ComplianceCell({ c }: { c: Compliance }) {
  const badge = <Badge tone={c.tone}>{c.label}</Badge>;
  if (!c.viewId) return badge;
  return (
    <Link href={`/company/contracts/${c.viewId}`} className="inline-flex hover:opacity-80 transition-opacity">
      {badge}
    </Link>
  );
}

function StatTile({
  label,
  value,
  total,
  alert,
}: {
  label: string;
  value: string;
  total?: number;
  alert?: boolean;
}) {
  return (
    <div className="bg-surface border border-border-faint rounded p-5">
      <div className="text-2xs uppercase tracking-wider text-subtle font-medium">{label}</div>
      <div className={`mt-2 text-xl font-semibold tabular-nums ${alert ? "text-status-late" : "text-foreground"}`}>
        {value}
        {total !== undefined && <span className="text-subtle font-normal"> / {total}</span>}
      </div>
    </div>
  );
}
