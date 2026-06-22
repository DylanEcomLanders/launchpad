"use client";

import { useEffect, useMemo, useState } from "react";
import type { HealthBand } from "@/lib/retention/types";
import {
  loadRetention, buildRows, summarize, buildAlerts,
  type RetentionData, type ClientRow, type AlertType,
} from "@/lib/retention/data";
import { notifyAlertHook } from "@/lib/retention/alert-hook";
import { BAND_META, HealthPill, PillarDots, UpsellBadge, StatCard, renewalLabel, fmtDate, fmtAgo, fmtMoney } from "./ui";
import { ClientDetail } from "./client-detail";
import { LiveOpsTab } from "./live-ops-tab";

type Tab = "health" | "alerts" | "renewals" | "live";
type SortKey = "health" | "renewal" | "mrr" | "name";
const BAND_RANK: Record<HealthBand, number> = { red: 0, amber: 1, green: 2 };

const ALERT_LABEL: Record<AlertType, string> = {
  renewal: "Renewal",
  deliverable_late: "Delivery",
  review_overdue: "Review",
  gone_quiet: "Quiet",
  tests_behind: "KPI",
};

export default function RetentionPage() {
  const [data, setData] = useState<RetentionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("health");
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<HealthBand | "all">("all");
  const [sort, setSort] = useState<SortKey>("health");

  async function refresh() {
    const d = await loadRetention();
    setData(d);
    setLoading(false);
  }
  useEffect(() => { refresh(); }, []);

  const rows = useMemo<ClientRow[]>(() => (data ? buildRows(data) : []), [data]);
  const summary = useMemo(() => summarize(rows), [rows]);
  const alerts = useMemo(() => buildAlerts(rows), [rows]);

  useEffect(() => { if (alerts.length) notifyAlertHook(alerts); }, [alerts]);

  const visible = useMemo(() => {
    let r = filter === "all" ? rows : rows.filter((x) => x.health.band === filter);
    r = [...r].sort((a, b) => {
      switch (sort) {
        case "renewal": return a.daysToRenewal - b.daysToRenewal;
        case "mrr": return b.client.mrr - a.client.mrr;
        case "name": return a.client.name.localeCompare(b.client.name);
        default: return BAND_RANK[a.health.band] - BAND_RANK[b.health.band] || a.daysToRenewal - b.daysToRenewal;
      }
    });
    return r;
  }, [rows, filter, sort]);

  const renewalPipeline = useMemo(
    () => [...rows].filter((r) => r.daysToRenewal >= -7).sort((a, b) => a.daysToRenewal - b.daysToRenewal),
    [rows],
  );

  const openRow = openId ? rows.find((r) => r.client.id === openId) ?? null : null;

  if (loading) {
    return <div className="max-w-7xl mx-auto px-6 md:px-12 py-12 text-[#71757D]">Loading retention…</div>;
  }

  const TABS: { key: Tab; label: string; badge?: number }[] = [
    { key: "health", label: "Health" },
    { key: "alerts", label: "Alerts", badge: alerts.length },
    { key: "renewals", label: "Renewals & upsell" },
    { key: "live", label: "Live ops" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-12 py-8">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#E5E5EA]">Retention</h1>
          <p className="mt-1 text-sm text-[#71757D]">Client health, churn risk, and the renewal pipeline. CSM home.</p>
        </div>
        {data?.usingMock && (
          <span className="text-xs px-2.5 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400">
            Demo data — Sales handoff not wired yet
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="mt-6 flex items-center gap-6 border-b border-[#2A2A2A]">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`relative pb-3 -mb-px text-sm font-medium transition-all flex items-center gap-2 ${
              tab === t.key ? "text-[#E5E5EA] border-b-2 border-[#E5E5EA]" : "text-[#71757D] hover:text-[#E5E5EA] border-b-2 border-transparent"
            }`}
          >
            {t.label}
            {t.badge ? (
              <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400">{t.badge}</span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === "health" && (
        <HealthTab
          summary={summary}
          rows={visible}
          filter={filter}
          setFilter={setFilter}
          sort={sort}
          setSort={setSort}
          onOpen={setOpenId}
        />
      )}
      {tab === "alerts" && <AlertsTab alerts={alerts} onOpen={setOpenId} />}
      {tab === "renewals" && <RenewalsTab rows={renewalPipeline} onOpen={setOpenId} />}
      {tab === "live" && <LiveOpsTab />}

      {openRow && data && (
        <ClientDetail
          row={openRow}
          reviews={data.reviews.filter((x) => x.client_id === openRow.client.id)}
          results={data.results.filter((x) => x.client_id === openRow.client.id)}
          tasks={data.tasks.filter((x) => x.client_id === openRow.client.id)}
          onClose={() => setOpenId(null)}
          onChanged={refresh}
        />
      )}
    </div>
  );
}

// ── Health tab ──────────────────────────────────────────────────────────────
function HealthTab({
  summary, rows, filter, setFilter, sort, setSort, onOpen,
}: {
  summary: ReturnType<typeof summarize>;
  rows: ClientRow[];
  filter: HealthBand | "all";
  setFilter: (f: HealthBand | "all") => void;
  sort: SortKey;
  setSort: (s: SortKey) => void;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="mt-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Active clients" value={String(summary.activeClients)} />
        <StatCard label="MRR at risk" value={fmtMoney(summary.mrrAtRisk)} accent={summary.mrrAtRisk > 0 ? "text-amber-400" : undefined} sub="amber + red clients" />
        <StatCard label="Renewals ≤ 30d" value={String(summary.renewalsNext30)} />
        <StatCard label="Reviews overdue" value={String(summary.reviewsOverdue)} accent={summary.reviewsOverdue > 0 ? "text-amber-400" : undefined} />
      </div>

      <div className="mt-6 flex items-center justify-between flex-wrap gap-3">
        <div className="text-xs text-[#71757D]">Health is a rollup of five delivery KPIs — hover a pillar for the why</div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {(["all", "red", "amber", "green"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-all ${filter === f ? "bg-[#E5E5EA] text-[#0F0F0F]" : "bg-[#181818] border border-[#2A2A2A] text-[#71757D] hover:text-[#E5E5EA]"}`}>
                {f}
              </button>
            ))}
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}
            className="px-2.5 py-1 rounded-lg text-xs bg-[#181818] border border-[#2A2A2A] text-[#71757D] appearance-none">
            <option value="health">Sort: Health</option>
            <option value="renewal">Sort: Renewal</option>
            <option value="mrr">Sort: MRR</option>
            <option value="name">Sort: Name</option>
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {rows.length === 0 && <div className="text-sm text-[#71757D]">No clients match this filter.</div>}
        {rows.map((r) => {
          const renewal = renewalLabel(r.daysToRenewal);
          return (
            <button key={r.client.id} onClick={() => onOpen(r.client.id)}
              className="text-left bg-[#181818] border border-[#2A2A2A] rounded-xl p-4 hover:border-[#3A3A3A] transition-all"
              style={{ borderLeft: `3px solid ${BAND_META[r.health.band].dot}` }}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[#E5E5EA]">{r.client.name}</span>
                  <span className="text-[11px] uppercase text-[#71757D]">{r.client.plan}</span>
                </div>
                <HealthPill band={r.health.band} overridden={r.health.overridden} title={r.health.reasons.join(" · ")} />
              </div>
              <div className="mt-2 flex items-center gap-4 text-xs text-[#71757D] flex-wrap">
                <span>{fmtMoney(r.client.mrr)}/mo</span>
                <span className={renewal.tone}>Renews {renewal.text}</span>
                <span>{r.client.pod_id ?? "—"} · {r.client.owner_id ?? "unassigned"}</span>
                <span>Tests {r.testsShipped == null ? "n/a" : `${r.testsShipped}/${r.testsCommitted}`}</span>
                <span>Review {fmtAgo(r.daysSinceLastReview)}</span>
              </div>
              <div className="mt-3 pt-3 border-t border-[#242424]">
                <PillarDots pillars={r.health.pillars} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Alerts tab ──────────────────────────────────────────────────────────────
function AlertsTab({ alerts, onOpen }: { alerts: ReturnType<typeof buildAlerts>; onOpen: (id: string) => void }) {
  if (alerts.length === 0) {
    return <div className="mt-8 text-sm text-[#71757D]">No alerts. Everything's in good shape.</div>;
  }
  return (
    <div className="mt-6 flex flex-col gap-2">
      <div className="text-xs text-[#71757D] mb-1">Delivery, KPI, renewal and engagement alerts — most urgent first</div>
      {alerts.map((a, i) => (
        <button key={i} onClick={() => onOpen(a.clientId)}
          className="flex items-center gap-3 text-left bg-[#181818] border border-[#2A2A2A] rounded-lg px-4 py-3 hover:border-[#3A3A3A] transition-all">
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: BAND_META[a.severity].dot }} />
          <span className="text-[11px] uppercase tracking-wider w-16 shrink-0" style={{ color: BAND_META[a.severity].dot }}>{ALERT_LABEL[a.type]}</span>
          <span className="text-sm text-[#E5E5EA] font-medium w-40 shrink-0 truncate">{a.clientName}</span>
          <span className="text-sm text-[#71757D]">{a.message}</span>
        </button>
      ))}
    </div>
  );
}

// ── Renewals & upsell tab ─────────────────────────────────────────────────
function RenewalsTab({ rows, onOpen }: { rows: ClientRow[]; onOpen: (id: string) => void }) {
  return (
    <div className="mt-6">
      <div className="text-xs font-semibold uppercase tracking-wider text-[#71757D] mb-3">
        Renewal pipeline <span className="text-[#4B4D52] normal-case tracking-normal font-normal">· every renewal has a named owner</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {rows.map((r) => {
          const renewal = renewalLabel(r.daysToRenewal);
          return (
            <button key={r.client.id} onClick={() => onOpen(r.client.id)}
              className="text-left bg-[#181818] border border-[#2A2A2A] rounded-xl p-4 hover:border-[#3A3A3A] transition-all">
              <div className="flex items-center justify-between">
                <span className="font-medium text-[#E5E5EA]">{r.client.name}</span>
                <HealthPill band={r.health.band} overridden={r.health.overridden} />
              </div>
              <div className={`mt-2 text-sm ${renewal.tone}`}>Renews {renewal.text} · {fmtDate(r.client.renewal_date)}</div>
              <div className="mt-2 flex items-center justify-between text-xs text-[#71757D]">
                <span>{fmtMoney(r.client.mrr)}/mo</span>
                <span>Owner: {r.client.owner_id ?? "⚠ unassigned"}</span>
              </div>
            </button>
          );
        })}
        {rows.length === 0 && <div className="text-sm text-[#71757D]">No upcoming renewals.</div>}
      </div>

      <div className="mt-8 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#71757D] mb-3">
        What to sell next
        <span className="text-[#4B4D52] normal-case tracking-normal font-normal">· Project → Core → Pro → Custom</span>
      </div>
      <div className="flex flex-col gap-3">
        {rows.map((r) => (
          <button key={r.client.id} onClick={() => onOpen(r.client.id)}
            className="text-left bg-[#181818] border border-[#2A2A2A] rounded-xl p-4 hover:border-[#3A3A3A] transition-all">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="font-medium text-[#E5E5EA]">{r.client.name}</span>
                <span className="text-[11px] uppercase text-[#71757D]">{r.client.plan} · {fmtMoney(r.client.mrr)}</span>
              </div>
              <UpsellBadge move={r.upsell.move} label={r.upsell.label} />
            </div>
            <div className="mt-1.5 text-xs text-[#71757D]">{r.upsell.reason}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
