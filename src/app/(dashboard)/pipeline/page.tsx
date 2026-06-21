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
        <div className="bg-[#0F0F10] rounded-2xl p-8 text-center ring-1 ring-white/[0.04]">
          <p className="text-sm text-[#71757D]">
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
            <div className="size-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-[0_8px_24px_rgba(16,185,129,0.3)]">
              <SignalIcon className="size-5 text-white" />
            </div>
            <h1 className="text-2xl font-semibold bg-gradient-to-br from-emerald-300 via-cyan-300 to-sky-300 bg-clip-text text-transparent">
              Pipeline
            </h1>
          </div>
          <p className="text-sm text-[#9CA3AF] max-w-2xl">
            The three paths in (upsell, warm, cold via audit). Every lead carries a stage, next action, and a date. Anything without those three is a leak.
          </p>
        </div>
        <button
          onClick={createNew}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-[12px] font-semibold uppercase tracking-wider bg-white text-[#0C0C0C] hover:bg-[#E5E5EA] shrink-0"
        >
          <PlusIcon className="size-4" />
          New lead
        </button>
      </header>

      {/* Health strip */}
      <div className="grid grid-cols-3 gap-3 max-w-[1600px] mx-auto w-full">
        <StatTile label="Active" value={stats.active} accent="emerald" />
        <StatTile label="At risk" value={stats.atRisk} accent="rose" />
        <StatTile label="Won this month" value={stats.wonThisMonth} accent="sky" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 max-w-[1600px] mx-auto w-full">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#71757D]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search lead, brand, owner, source"
            className="w-full pl-9 pr-3 py-2 rounded-md bg-[#0F0F10] ring-1 ring-white/[0.06] text-[13px] text-[#E5E5EA] placeholder:text-[#71757D] focus:outline-none focus:ring-emerald-500/40"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {PATH_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setPathFilter(f.value)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                pathFilter === f.value
                  ? "bg-white text-[#0C0C0C]"
                  : "bg-[#1A1A1A] text-[#9CA3AF] hover:bg-[#222222]"
              }`}
            >
              {f.label}
            </button>
          ))}
          <button
            onClick={() => setShowNurture((v) => !v)}
            className={`px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-colors ${
              showNurture
                ? "bg-zinc-500/30 text-zinc-100 ring-1 ring-zinc-400/40"
                : "bg-[#1A1A1A] text-[#9CA3AF] hover:bg-[#222222]"
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
            <div key={i} className="h-96 bg-[#0C0C0C] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : visibleLeads.length === 0 ? (
        <div className="bg-[#0F0F10] rounded-2xl p-12 text-center ring-1 ring-white/[0.04] max-w-[1600px] mx-auto">
          <p className="text-sm text-[#71757D] mb-4">
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
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-[#E5E5EA]">
                    {STAGE_LABEL[stage]}
                  </span>
                  <span className="text-[10px] text-[#9CA3AF] font-mono">
                    {stageLeads.length}
                  </span>
                </div>
                <div className="space-y-2 flex-1">
                  {stageLeads.length === 0 ? (
                    <div className="bg-[#0F0F10]/60 rounded-xl p-3 ring-1 ring-white/[0.03]">
                      <p className="text-[10px] italic text-[#71757D] text-center">
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
  accent: "emerald" | "rose" | "sky";
}) {
  const colour: Record<typeof accent, string> = {
    emerald: "from-emerald-500 to-teal-600 shadow-[0_8px_24px_rgba(16,185,129,0.3)]",
    rose: "from-rose-500 to-red-600 shadow-[0_8px_24px_rgba(244,63,94,0.3)]",
    sky: "from-sky-500 to-blue-600 shadow-[0_8px_24px_rgba(14,165,233,0.3)]",
  };
  return (
    <div className="bg-[#0F0F10] rounded-xl p-4 ring-1 ring-white/[0.04] flex items-center gap-3">
      <div
        className={`size-9 rounded-lg bg-gradient-to-br ${colour[accent]} flex items-center justify-center shrink-0`}
      >
        <ChartBarSquareIcon className="size-4 text-white" />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-[#71757D] font-semibold">
          {label}
        </div>
        <div className="text-2xl font-semibold text-[#E5E5EA]">{value}</div>
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
      className="block bg-[#0F0F10] rounded-xl p-3 ring-1 ring-white/[0.04] hover:ring-emerald-500/30 transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-[13px] font-semibold text-[#E5E5EA] truncate group-hover:text-emerald-200">
          {lead.brand_name || lead.full_name || "Untitled"}
        </span>
        {topRisk && (
          <span
            className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold shrink-0 ${
              topRisk.severity === "danger"
                ? "bg-rose-500/15 text-rose-200 ring-1 ring-rose-500/30"
                : "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30"
            }`}
            title={risks.map((r) => r.label).join(" · ")}
          >
            {risks.length > 1 ? `${risks.length} risks` : topRisk.label}
          </span>
        )}
      </div>
      <div className="text-[11px] text-[#71757D] truncate">
        {lead.full_name && lead.brand_name ? lead.full_name : ""}
        {lead.revenue_band && (
          <span> {lead.full_name && lead.brand_name ? "· " : ""}{lead.revenue_band}</span>
        )}
      </div>
      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
        <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#1A1A1A] text-[#9CA3AF]">
          {PATH_LABEL[lead.path]}
        </span>
        {lead.owner && (
          <span className="text-[9px] uppercase tracking-wider text-[#71757D]">
            {lead.owner}
          </span>
        )}
      </div>
      {lead.next_action && (
        <div className="mt-2 pt-2 border-t border-white/[0.04]">
          <div className="text-[10px] uppercase tracking-wider text-[#71757D] mb-0.5">
            Next
          </div>
          <div className="text-[11px] text-[#E5E5EA] line-clamp-2">
            {lead.next_action}
            {lead.next_action_date && (
              <span className="text-[#71757D]"> · {new Date(lead.next_action_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
            )}
          </div>
        </div>
      )}
    </Link>
  );
}
