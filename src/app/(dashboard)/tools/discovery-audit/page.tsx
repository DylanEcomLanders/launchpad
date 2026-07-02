"use client";

/* ── Discovery Audits ──
 *
 * The strategist's workbench for the £1k pre-signup audit. List view
 * shows every audit ever started, with status pills + the shareable
 * /audit-output/[slug] link once it's ready.
 *
 * Closes the playbook's "Discovery Audit must be systemised in
 * Launchpad" call - the deck spine lives in one structured form
 * here, output renders consistently per the playbook standard.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PlusIcon,
  ArrowTopRightOnSquareIcon,
  DocumentMagnifyingGlassIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { useRole } from "@/components/auth-gate";
import {
  discoveryAuditsStore,
  emptyAudit,
  STATUS_LABEL,
  STATUS_TINT,
} from "@/lib/discovery-audits/data";
import type { DiscoveryAudit, AuditStatus } from "@/lib/discovery-audits/types";

const STATUS_FILTERS: { value: AuditStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "ready", label: "Ready" },
  { value: "sent", label: "Sent" },
  { value: "credited", label: "Credited" },
  { value: "passed", label: "Passed" },
];

export default function DiscoveryAuditsListPage() {
  const role = useRole();
  const isAdmin = role === "admin" || role === "cro";
  const router = useRouter();

  const [audits, setAudits] = useState<DiscoveryAudit[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [statusFilter, setStatusFilter] = useState<AuditStatus | "all">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await discoveryAuditsStore.getAll();
      if (cancelled) return;
      setAudits(rows.sort((a, b) => b.created_at.localeCompare(a.created_at)));
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return audits.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (!q) return true;
      return (
        a.brand_name.toLowerCase().includes(q) ||
        a.brand_url.toLowerCase().includes(q) ||
        a.contact_name.toLowerCase().includes(q) ||
        a.ran_by.toLowerCase().includes(q)
      );
    });
  }, [audits, statusFilter, search]);

  async function createNew() {
    const a = emptyAudit();
    await discoveryAuditsStore.create(a);
    router.push(`/tools/discovery-audit/${a.id}`);
  }

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="bg-surface rounded-2xl p-8 text-center border border-border">
          <p className="text-sm text-subtle">
            Discovery audits are a strategist tool. Speak to an admin if you
            need access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="size-9 rounded-xl bg-surface-raised border border-border flex items-center justify-center">
              <DocumentMagnifyingGlassIcon className="size-5 text-foreground" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground">
              Discovery Audits
            </h1>
          </div>
          <p className="text-sm text-muted max-w-2xl">
            The £1,000 pre-signup audit, systemised. Strategist fills in
            findings + plan; output renders as a consistent branded deck at
            /audit-output. Fee credits against the retainer when the client
            signs.
          </p>
        </div>
        <button
          onClick={createNew}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-[12px] font-semibold uppercase tracking-wider bg-white text-background hover:bg-foreground shrink-0"
        >
          <PlusIcon className="size-4" />
          New audit
        </button>
      </header>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-subtle" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search brand, contact, strategist"
            className="w-full pl-9 pr-3 py-2 rounded-md bg-surface border border-border text-[13px] text-foreground placeholder:text-subtle focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                statusFilter === f.value
                  ? "bg-white text-background"
                  : "bg-surface text-muted hover:bg-surface-raised"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {!hydrated ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-surface rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface rounded-2xl p-12 text-center border border-border">
          <p className="text-sm text-subtle mb-4">
            {audits.length === 0
              ? "No audits yet. Start your first one to wow a warm lead."
              : "No audits match the current filter."}
          </p>
          {audits.length === 0 && (
            <button
              onClick={createNew}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-[12px] font-semibold uppercase tracking-wider bg-white text-background hover:bg-foreground"
            >
              <PlusIcon className="size-4" />
              New audit
            </button>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((a) => (
            <AuditRow key={a.id} audit={a} />
          ))}
        </ul>
      )}
    </div>
  );
}

function AuditRow({ audit }: { audit: DiscoveryAudit }) {
  const shareUrl = `/audit-output/${audit.output_slug}`;
  const findingsCount = audit.findings.length;

  return (
    <li>
      <Link
        href={`/tools/discovery-audit/${audit.id}`}
        className="block bg-surface rounded-xl p-4 border border-border hover:bg-surface-hover transition-all"
      >
        <div className="flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-foreground truncate">
                {audit.brand_name || "Untitled audit"}
              </span>
              <span
                className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold ${STATUS_TINT[audit.status]}`}
              >
                {STATUS_LABEL[audit.status]}
              </span>
            </div>
            <div className="text-[12px] text-subtle flex items-center gap-3 flex-wrap">
              {audit.brand_url && <span className="truncate">{audit.brand_url}</span>}
              {audit.revenue_band && <span>· {audit.revenue_band}</span>}
              {audit.ran_by && <span>· {audit.ran_by}</span>}
              <span>· {findingsCount} {findingsCount === 1 ? "finding" : "findings"}</span>
            </div>
          </div>
          {audit.status !== "draft" && (
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-subtle hover:text-foreground shrink-0"
            >
              View deck
              <ArrowTopRightOnSquareIcon className="size-3.5" />
            </a>
          )}
        </div>
      </Link>
    </li>
  );
}
