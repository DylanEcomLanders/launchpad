"use client";

/* ── Pipeline (lead kanban) ──
 *
 * Lite CRM for the 3 paths in. Kanban columns mirror the LeadStage
 * order from the playbook (Acquisition / Sales motion). Each lead
 * card shows owner, age, risk badges + next-action chip.
 *
 * Drag-and-drop deferred to v2 - manual stage transitions via the
 * detail page keep state changes intentional.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  SignalIcon,
  ChartBarSquareIcon,
} from "@heroicons/react/24/outline";
import { useRole } from "@/components/auth-gate";
import {
  emptyLead,
  leadsStore,
  risksFor,
} from "@/lib/leads/data";
import {
  PATH_LABEL,
  STAGE_ACCENT,
  STAGE_LABEL,
  STAGE_ORDER,
  type Lead,
  type LeadPath,
} from "@/lib/leads/types";

const PATH_FILTERS: { value: LeadPath | "all"; label: string }[] = [
  { value: "all", label: "All paths" },
  { value: "upsell", label: "Upsell" },
  { value: "warm", label: "Warm" },
  { value: "cold_audit_first", label: "Cold (audit)" },
  { value: "cold_direct", label: "Cold (direct)" },
];

export default function PipelinePage() {
  const role = useRole();
  const isAdmin = role === "admin" || role === "cro";
  const router = useRouter();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [search, setSearch] = useState("");
  const [pathFilter, setPathFilter] = useState<LeadPath | "all">("all");
  const [showNurture, setShowNurture] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await leadsStore.getAll();
      if (cancelled) return;
      setLeads(rows.sort((a, b) => b.updated_at.localeCompare(a.updated_at)));
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (pathFilter !== "all" && l.path !== pathFilter) return false;
      if (!showNurture && l.stage === "nurture") return false;
      if (!q) return true;
      return (
        l.full_name.toLowerCase().includes(q) ||
        l.brand_name.toLowerCase().includes(q) ||
        l.brand_url.toLowerCase().includes(q) ||
        l.owner.toLowerCase().includes(q) ||
        l.source.toLowerCase().includes(q)
      );
    });
  }, [leads, search, pathFilter, showNurture]);

  /* Health stats - quick top-of-page signal on pipeline state. */
  const stats = useMemo(() => {
    const active = leads.filter(
      (l) => l.stage !== "closed_won" && l.stage !== "closed_lost" && l.stage !== "nurture",
    );
    const atRisk = active.filter((l) => risksFor(l).some((r) => r.severity === "danger"));
    const wonThisMonth = leads.filter((l) => {
      if (l.stage !== "closed_won" || !l.closed_at) return false;
      const closed = new Date(l.closed_at);
      const now = new Date();
      return (
        closed.getFullYear() === now.getFullYear() &&
        closed.getMonth() === now.getMonth()
      );
    }).length;
    return { active: active.length, atRisk: atRisk.length, wonThisMonth };
  }, [leads]);

  async function createNew() {
    const lead = emptyLead();
    await leadsStore.create(lead);
    router.push(`/pipeline/${lead.id}`);
  }

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="bg-surface rounded-2xl p-8 text-center border border-border">
          <p className="text-sm text-subtle">
            Pipeline is for admin / CRO. Closers don&apos;t see other closers&apos;
            leads (yet - per-owner views coming in a later phase).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 max-w-[1600px] mx-auto w-full">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="size-9 rounded-xl bg-surface-raised border border-border flex items-center justify-center">
              <SignalIcon className="size-5 text-foreground" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground">
              Pipeline
            </h1>
          </div>
          <p className="text-sm text-muted max-w-2xl">
            The three paths in (upsell, warm, cold via audit). Every lead carries a stage, next action, and a date. Anything without those three is a leak.
          </p>
        </div>
        <button
          onClick={createNew}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-[12px] font-semibold uppercase tracking-wider bg-white text-background hover:bg-foreground shrink-0"
        >
          <PlusIcon className="size-4" />
          New lead
        </button>
      </header>

      {/* Health strip */}
      <div className="grid grid-cols-3 gap-3 max-w-[1600px] mx-auto w-full">
        <StatTile label="Active" value={stats.active} accent="success" />
        <StatTile label="At risk" value={stats.atRisk} accent="danger" />
        <StatTile label="Won this month" value={stats.wonThisMonth} accent="info" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 max-w-[1600px] mx-auto w-full">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-subtle" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search lead, brand, owner, source"
            className="w-full pl-9 pr-3 py-2 rounded-md bg-surface border border-border text-[13px] text-foreground placeholder:text-subtle focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {PATH_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setPathFilter(f.value)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                pathFilter === f.value
                  ? "bg-white text-background"
                  : "bg-surface text-muted hover:bg-surface-raised"
              }`}
            >
              {f.label}
            </button>
          ))}
          <button
            onClick={() => setShowNurture((v) => !v)}
            className={`px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-colors ${
              showNurture
                ? "bg-surface-raised text-foreground ring-1 ring-border"
                : "bg-surface text-muted hover:bg-surface-raised"
            }`}
          >
            {showNurture ? "Hide" : "Show"} nurture
          </button>
        </div>
      </div>

      {/* Kanban */}
      {!hydrated ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 max-w-[1600px] mx-auto w-full">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-96 bg-surface rounded-xl animate-pulse" />
          ))}
        </div>
      ) : visibleLeads.length === 0 ? (
        <div className="bg-surface rounded-2xl p-12 text-center border border-border max-w-[1600px] mx-auto">
          <p className="text-sm text-subtle mb-4">
            {leads.length === 0
              ? "No leads yet. Spin one up to start the pipeline."
              : "No leads match the current filter."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 max-w-[1600px] mx-auto w-full">
          {STAGE_ORDER.map((stage) => {
            const stageLeads = visibleLeads.filter((l) => l.stage === stage);
            return (
              <div key={stage} className="flex flex-col min-h-0">
                <div
                  className={`bg-gradient-to-br ${STAGE_ACCENT[stage]} rounded-xl ring-1 px-3 py-2 mb-2 flex items-center justify-between`}
                >
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-foreground">
                    {STAGE_LABEL[stage]}
                  </span>
                  <span className="text-[10px] text-muted font-mono">
                    {stageLeads.length}
                  </span>
                </div>
                <div className="space-y-2 flex-1">
                  {stageLeads.length === 0 ? (
                    <div className="bg-surface rounded-xl p-3 border border-border">
                      <p className="text-[10px] italic text-subtle text-center">
                        Empty
                      </p>
                    </div>
                  ) : (
                    stageLeads.map((l) => <LeadCard key={l.id} lead={l} />)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "success" | "danger" | "info";
}) {
  const colour: Record<typeof accent, string> = {
    success: "bg-success/10 text-success",
    danger: "bg-danger/10 text-danger",
    info: "bg-info/10 text-info",
  };
  return (
    <div className="bg-surface rounded-xl p-4 border border-border flex items-center gap-3">
      <div
        className={`size-9 rounded-lg ${colour[accent]} flex items-center justify-center shrink-0`}
      >
        <ChartBarSquareIcon className="size-4" />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-subtle font-semibold">
          {label}
        </div>
        <div className="text-2xl font-semibold text-foreground">{value}</div>
      </div>
    </div>
  );
}

function LeadCard({ lead }: { lead: Lead }) {
  const risks = risksFor(lead);
  const topRisk = risks[0];

  return (
    <Link
      href={`/pipeline/${lead.id}`}
      className="block bg-surface rounded-xl p-3 border border-border hover:border-border transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-[13px] font-semibold text-foreground truncate">
          {lead.brand_name || lead.full_name || "Untitled"}
        </span>
        {topRisk && (
          <span
            className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold shrink-0 ${
              topRisk.severity === "danger"
                ? "bg-danger/10 text-danger ring-1 ring-danger/20"
                : "bg-warning/10 text-warning ring-1 ring-warning/20"
            }`}
            title={risks.map((r) => r.label).join(" · ")}
          >
            {risks.length > 1 ? `${risks.length} risks` : topRisk.label}
          </span>
        )}
      </div>
      <div className="text-[11px] text-subtle truncate">
        {lead.full_name && lead.brand_name ? lead.full_name : ""}
        {lead.revenue_band && (
          <span> {lead.full_name && lead.brand_name ? "· " : ""}{lead.revenue_band}</span>
        )}
      </div>
      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
        <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface text-muted">
          {PATH_LABEL[lead.path]}
        </span>
        {lead.owner && (
          <span className="text-[9px] uppercase tracking-wider text-subtle">
            {lead.owner}
          </span>
        )}
      </div>
      {lead.next_action && (
        <div className="mt-2 pt-2 border-t border-border">
          <div className="text-[10px] uppercase tracking-wider text-subtle mb-0.5">
            Next
          </div>
          <div className="text-[11px] text-foreground line-clamp-2">
            {lead.next_action}
            {lead.next_action_date && (
              <span className="text-subtle"> · {new Date(lead.next_action_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
            )}
          </div>
        </div>
      )}
    </Link>
  );
}
