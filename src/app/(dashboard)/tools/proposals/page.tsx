"use client";

/* ── Proposals (list) ── */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PlusIcon,
  ArrowTopRightOnSquareIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { useRole } from "@/components/auth-gate";
import {
  emptyProposal,
  formatMoney,
  proposalsStore,
  quotedTotal,
  renewalFrom,
} from "@/lib/proposals/data";
import {
  STATUS_LABEL,
  STATUS_TINT,
  type Proposal,
  type ProposalStatus,
} from "@/lib/proposals/types";

const FILTERS: { value: ProposalStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "sent", label: "Sent" },
  { value: "signed", label: "Signed" },
  { value: "paid", label: "Paid" },
  { value: "kicked_off", label: "Kicked off" },
  { value: "declined", label: "Declined" },
];

export default function ProposalsListPage() {
  const role = useRole();
  const isAdmin = role === "admin" || role === "cro";
  const router = useRouter();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [filter, setFilter] = useState<ProposalStatus | "all">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await proposalsStore.getAll();
      if (cancelled) return;
      setProposals(rows.sort((a, b) => b.created_at.localeCompare(a.created_at)));
      setHydrated(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return proposals.filter((p) => {
      if (filter !== "all" && p.status !== filter) return false;
      if (!q) return true;
      return (
        p.brand_name.toLowerCase().includes(q) ||
        p.contact_name.toLowerCase().includes(q) ||
        p.tier.toLowerCase().includes(q)
      );
    });
  }, [proposals, filter, search]);

  async function createNew() {
    const p = emptyProposal();
    await proposalsStore.create(p);
    router.push(`/tools/proposals/${p.id}`);
  }

  async function createRenewal(prior: Proposal) {
    const renewal = renewalFrom(prior);
    await proposalsStore.create(renewal);
    router.push(`/tools/proposals/${renewal.id}`);
  }

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="bg-surface rounded-2xl p-8 text-center border border-border">
          <p className="text-sm text-subtle">Proposals are admin / CRO only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="size-9 rounded-xl bg-surface-raised border border-border flex items-center justify-center">
              <DocumentTextIcon className="size-5 text-foreground" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Proposals
            </h1>
          </div>
          <p className="text-sm text-muted max-w-2xl">
            After the verbal yes - tier, terms, guarantee, prepay. Sent as a
            branded link the lead opens without auth.
          </p>
        </div>
        <button
          onClick={createNew}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-[12px] font-semibold uppercase tracking-wider bg-white text-background hover:bg-foreground shrink-0"
        >
          <PlusIcon className="size-4" />
          New proposal
        </button>
      </header>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-subtle" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search brand, contact, tier"
            className="w-full pl-9 pr-3 py-2 rounded-md bg-surface border border-border text-[13px] text-foreground placeholder:text-subtle focus:outline-none focus:ring-ring"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                filter === f.value
                  ? "bg-white text-background"
                  : "bg-surface text-muted hover:bg-surface-raised"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {!hydrated ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-surface rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface rounded-2xl p-12 text-center border border-border">
          <p className="text-sm text-subtle mb-4">
            {proposals.length === 0
              ? "No proposals yet. Start one after a verbal yes."
              : "No proposals match the current filter."}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((p) => (
            <li key={p.id}>
              <Link
                href={`/tools/proposals/${p.id}`}
                className="block bg-surface rounded-xl p-4 border border-border hover:border-border transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {p.brand_name || "Untitled proposal"}
                      </span>
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold ${STATUS_TINT[p.status]}`}>
                        {STATUS_LABEL[p.status]}
                      </span>
                    </div>
                    <div className="text-[12px] text-subtle flex items-center gap-2 flex-wrap">
                      <span>{p.tier}</span>
                      <span>· {formatMoney(p.monthly_fee, p.fee_currency)}/mo</span>
                      <span>· {p.term_months}-mo term</span>
                      {p.prepay && <span>· prepay {p.prepay_discount_pct}% off</span>}
                      <span className="text-success/80">· {formatMoney(quotedTotal(p), p.fee_currency)} quoted</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(p.status === "signed" || p.status === "paid" || p.status === "kicked_off") && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          createRenewal(p);
                        }}
                        className="px-2 py-1 rounded text-[10px] uppercase tracking-wider font-semibold bg-info/10 text-info ring-1 ring-info/20 hover:bg-info/20"
                        title="Generate renewal proposal from this one"
                      >
                        + Renewal
                      </button>
                    )}
                    {p.status !== "draft" && (
                      <a
                        href={`/proposal-output/${p.output_slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-subtle hover:text-success"
                      >
                        View
                        <ArrowTopRightOnSquareIcon className="size-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
