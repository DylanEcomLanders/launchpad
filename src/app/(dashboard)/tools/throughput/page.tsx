"use client";

/* ── Throughput dashboard ──
 *
 * Per-client month-to-date pages shipped + tests live vs the
 * per-tier targets from the playbook. Reads existing proposals +
 * ab_tests + roadmaps - no new data.
 */

import { useEffect, useMemo, useState } from "react";
import {
  ChartBarSquareIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
} from "@heroicons/react/24/outline";
import { useRole } from "@/components/auth-gate";
import { proposalsStore } from "@/lib/proposals/data";
import { testsStore } from "@/lib/tests/data";
import { roadmapsStore } from "@/lib/roadmaps/data";
import {
  computeThroughput,
  type ClientThroughput,
  type RiskLevel,
} from "@/lib/throughput/calc";

const RISK_META: Record<RiskLevel, { label: string; tint: string; icon: typeof CheckCircleIcon }> = {
  on_track: { label: "On track", tint: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30", icon: CheckCircleIcon },
  behind: { label: "Behind", tint: "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30", icon: ExclamationTriangleIcon },
  critical: { label: "Critical", tint: "bg-rose-500/15 text-rose-200 ring-1 ring-rose-500/30", icon: ShieldExclamationIcon },
};

export default function ThroughputPage() {
  const role = useRole();
  const isAdmin = role === "admin" || role === "cro";
  const [rows, setRows] = useState<ClientThroughput[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [proposals, tests, roadmaps] = await Promise.all([
        proposalsStore.getAll(),
        testsStore.getAll(),
        roadmapsStore.getAll(),
      ]);
      if (cancelled) return;
      setRows(computeThroughput(proposals, tests, roadmaps));
      setHydrated(true);
    })();
    return () => { cancelled = true; };
  }, []);

  const summary = useMemo(() => {
    const counts = { on_track: 0, behind: 0, critical: 0 };
    for (const r of rows) counts[r.worst_risk]++;
    return counts;
  }, [rows]);

  if (!isAdmin) return (<div className="p-6"><div className="bg-[#0F0F10] rounded-2xl p-8 text-center ring-1 ring-white/[0.04]"><p className="text-sm text-[#71757D]">Admin / CRO only.</p></div></div>);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <header>
        <div className="flex items-center gap-3 mb-2">
          <div className="size-9 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-[0_8px_24px_rgba(6,182,212,0.3)]">
            <ChartBarSquareIcon className="size-5 text-white" />
          </div>
          <h1 className="text-2xl font-semibold bg-gradient-to-br from-emerald-300 via-cyan-300 to-sky-300 bg-clip-text text-transparent">
            Throughput
          </h1>
        </div>
        <p className="text-sm text-[#9CA3AF] max-w-2xl">
          Per-client month-to-date pages shipped + tests live vs tier targets (Entry 2/2, Core 4/4, VIP 6/12).
        </p>
      </header>

      {/* Summary tiles */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryTile label="On track" value={summary.on_track} risk="on_track" />
        <SummaryTile label="Behind" value={summary.behind} risk="behind" />
        <SummaryTile label="Critical" value={summary.critical} risk="critical" />
      </div>

      {!hydrated ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-[#0C0C0C] rounded-xl animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        <div className="bg-[#0F0F10] rounded-2xl p-12 text-center ring-1 ring-white/[0.04]">
          <p className="text-sm text-[#71757D]">
            No active clients yet (no signed proposals). Sign a proposal first to start tracking throughput.
          </p>
        </div>
      ) : (
        <div className="bg-[#0F0F10] rounded-2xl ring-1 ring-white/[0.04] overflow-hidden">
          <div className="grid grid-cols-[1fr_80px_160px_160px_100px] gap-3 px-5 py-3 border-b border-white/[0.04] text-[10px] uppercase tracking-wider font-semibold text-[#71757D]">
            <div>Client</div>
            <div>Tier</div>
            <div>Pages this month</div>
            <div>Tests this month</div>
            <div>Status</div>
          </div>
          <ul>
            {rows.map((r) => (
              <li key={r.client_name} className="grid grid-cols-[1fr_80px_160px_160px_100px] gap-3 px-5 py-3 border-b border-white/[0.04] items-center text-[13px] hover:bg-white/[0.02] transition-colors">
                <div className="text-[#E5E5EA] font-medium truncate">{r.client_name}</div>
                <div className="text-[#9CA3AF]">{r.tier}</div>
                <ProgressCell actual={r.pages_shipped} target={r.pages_target} risk={r.pages_risk} />
                <ProgressCell actual={r.tests_live} target={r.tests_target} risk={r.tests_risk} />
                <RiskPill risk={r.worst_risk} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SummaryTile({ label, value, risk }: { label: string; value: number; risk: RiskLevel }) {
  const meta = RISK_META[risk];
  const Icon = meta.icon;
  const gradient: Record<RiskLevel, string> = {
    on_track: "from-emerald-500 to-teal-600 shadow-[0_8px_24px_rgba(16,185,129,0.3)]",
    behind: "from-amber-500 to-orange-600 shadow-[0_8px_24px_rgba(245,158,11,0.3)]",
    critical: "from-rose-500 to-red-600 shadow-[0_8px_24px_rgba(244,63,94,0.3)]",
  };
  return (
    <div className="bg-[#0F0F10] rounded-xl p-4 ring-1 ring-white/[0.04] flex items-center gap-3">
      <div className={`size-9 rounded-lg bg-gradient-to-br ${gradient[risk]} flex items-center justify-center shrink-0`}>
        <Icon className="size-4 text-white" />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-[#71757D] font-semibold">{label}</div>
        <div className="text-2xl font-semibold text-[#E5E5EA]">{value}</div>
      </div>
    </div>
  );
}

function ProgressCell({ actual, target, risk }: { actual: number; target: number; risk: RiskLevel }) {
  const pct = target === 0 ? 0 : Math.min(100, (actual / target) * 100);
  const barTint: Record<RiskLevel, string> = {
    on_track: "from-emerald-500 to-teal-500",
    behind: "from-amber-500 to-orange-500",
    critical: "from-rose-500 to-red-500",
  };
  return (
    <div>
      <div className="text-[11px] text-[#9CA3AF] mb-1">
        <span className="font-mono">{actual}</span>
        <span className="text-[#71757D]"> / {target}</span>
      </div>
      <div className="h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${barTint[risk]} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function RiskPill({ risk }: { risk: RiskLevel }) {
  const meta = RISK_META[risk];
  return (
    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold inline-block ${meta.tint}`}>
      {meta.label}
    </span>
  );
}
