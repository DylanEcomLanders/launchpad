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

/* Semantic token classes per risk level - the ONE place risk maps to colour. */
const RISK_META: Record<
  RiskLevel,
  { label: string; pill: string; soft: string; solid: string; icon: typeof CheckCircleIcon }
> = {
  on_track: { label: "On track", pill: "bg-success/10 text-success ring-1 ring-success/20", soft: "bg-success/10 text-success", solid: "bg-success", icon: CheckCircleIcon },
  behind: { label: "Behind", pill: "bg-warning/10 text-warning ring-1 ring-warning/20", soft: "bg-warning/10 text-warning", solid: "bg-warning", icon: ExclamationTriangleIcon },
  critical: { label: "Critical", pill: "bg-danger/10 text-danger ring-1 ring-danger/20", soft: "bg-danger/10 text-danger", solid: "bg-danger", icon: ShieldExclamationIcon },
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

  if (!isAdmin) return (<div className="p-6"><div className="bg-surface rounded-2xl p-8 text-center border border-border"><p className="text-sm text-subtle">Admin / CRO only.</p></div></div>);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <header>
        <div className="flex items-center gap-3 mb-2">
          <div className="size-9 rounded-xl bg-surface-raised border border-border flex items-center justify-center">
            <ChartBarSquareIcon className="size-5 text-foreground" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Throughput
          </h1>
        </div>
        <p className="text-sm text-muted max-w-2xl">
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
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-surface rounded-xl animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        <div className="bg-surface rounded-2xl p-12 text-center border border-border">
          <p className="text-sm text-subtle">
            No active clients yet (no signed proposals). Sign a proposal first to start tracking throughput.
          </p>
        </div>
      ) : (
        <div className="bg-surface rounded-2xl border border-border overflow-hidden">
          <div className="grid grid-cols-[1fr_80px_160px_160px_100px] gap-3 px-5 py-3 border-b border-border text-[10px] uppercase tracking-wider font-semibold text-subtle">
            <div>Client</div>
            <div>Tier</div>
            <div>Pages this month</div>
            <div>Tests this month</div>
            <div>Status</div>
          </div>
          <ul>
            {rows.map((r) => (
              <li key={r.client_name} className="grid grid-cols-[1fr_80px_160px_160px_100px] gap-3 px-5 py-3 border-b border-border last:border-0 items-center text-[13px] hover:bg-surface-hover transition-colors">
                <div className="text-foreground font-medium truncate">{r.client_name}</div>
                <div className="text-muted">{r.tier}</div>
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
  return (
    <div className="bg-surface rounded-xl p-4 border border-border flex items-center gap-3">
      <div className={`size-9 rounded-lg ${meta.soft} flex items-center justify-center shrink-0`}>
        <Icon className="size-4" />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-subtle font-semibold">{label}</div>
        <div className="text-2xl font-semibold text-foreground tabular-nums">{value}</div>
      </div>
    </div>
  );
}

function ProgressCell({ actual, target, risk }: { actual: number; target: number; risk: RiskLevel }) {
  const pct = target === 0 ? 0 : Math.min(100, (actual / target) * 100);
  const meta = RISK_META[risk];
  return (
    <div>
      <div className="text-[11px] text-muted mb-1">
        <span className="font-mono">{actual}</span>
        <span className="text-subtle"> / {target}</span>
      </div>
      <div className="h-1.5 bg-surface-raised rounded-full overflow-hidden">
        <div className={`h-full ${meta.solid} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function RiskPill({ risk }: { risk: RiskLevel }) {
  const meta = RISK_META[risk];
  return (
    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold inline-block ${meta.pill}`}>
      {meta.label}
    </span>
  );
}
