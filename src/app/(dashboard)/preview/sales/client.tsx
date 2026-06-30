"use client";

/* PREVIEW PAGE — Sales Dashboard (Ajay's command centre).
 *
 * One screen: KPI strip + alerts -> conversion funnel + pipeline kanban ->
 * unified inbox (conversation list + thread + lead context).
 *
 * Mock data only (src/lib/sales-dashboard/mock-data.ts). Nothing hits
 * Supabase; channel "sends" are mock adapters. Final home is /sales — this
 * lives at /preview/sales until wire-up. KPIs/funnel/alerts are computed off
 * the frozen MOCK_TODAY so the baseline is deterministic; interactive edits
 * use the real clock.
 */

import { useMemo, useState } from "react";
import {
  BellAlertIcon,
  FireIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
} from "@heroicons/react/24/outline";
import { Kanban } from "./Kanban";
import { Inbox } from "./Inbox";
import { DealModal, type DealInput } from "./DealModal";
import { LeadDetailModal } from "./LeadDetailModal";
import {
  STAGES,
  LEADS,
  MESSAGES,
  TASKS,
  DEALS,
  CLIENTS,
  OWNERS,
} from "@/lib/sales-dashboard/mock-data";
import { MOCK_TODAY } from "@/lib/sales-dashboard/config";
import {
  weightedPipelineValue,
  mrrClosingThisMonth,
  dealsInNegotiation,
  followUpsDueToday,
  conversionFunnel,
  computeAlerts,
  type Alert,
} from "@/lib/sales-dashboard/metrics";
import type {
  Channel,
  Client,
  Deal,
  Lead,
  LeadMessage,
  LeadTask,
  Temperature,
} from "@/lib/sales-dashboard/types";

type TabKey = "dashboard" | "pipeline" | "communications";

const uid = () => `id-${Math.random().toString(36).slice(2, 10)}`;
const nowIso = () => new Date().toISOString();
const fmtMoney = (n: number) =>
  n >= 1000 ? `£${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `£${Math.round(n)}`;

const ALERT_STYLE: Record<Alert["kind"], { color: string; label: string }> = {
  follow_up_due: { color: "#F5A623", label: "Follow-up" },
  lead_cold: { color: "#5B8DEF", label: "Cold" },
  deal_stale: { color: "#F97066", label: "Stale" },
};

export default function SalesDashboardClient() {
  const [leads, setLeads] = useState<Lead[]>(LEADS);
  const [messages, setMessages] = useState<LeadMessage[]>(MESSAGES);
  const [tasks, setTasks] = useState<LeadTask[]>(TASKS);
  const [deals, setDeals] = useState<Deal[]>(DEALS);
  const [clients, setClients] = useState<Client[]>(CLIENTS);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>("lead-pupford");
  const [dealLead, setDealLead] = useState<Lead | null>(null);
  const [detailLeadId, setDetailLeadId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("dashboard");

  const stages = STAGES;

  // --- Metrics (deterministic off MOCK_TODAY) ------------------------------
  const metrics = useMemo(
    () => ({
      weighted: weightedPipelineValue(leads, stages),
      mrrThisMonth: mrrClosingThisMonth(deals, MOCK_TODAY),
      negotiation: dealsInNegotiation(leads, stages),
      followUps: followUpsDueToday(tasks, MOCK_TODAY).length,
      funnel: conversionFunnel(leads, stages),
      alerts: computeAlerts(leads, tasks, stages, MOCK_TODAY),
    }),
    [leads, deals, tasks, stages],
  );

  // --- Pipeline ------------------------------------------------------------
  function handleMove(leadId: string, stageId: string) {
    const stage = stages.find((s) => s.id === stageId);
    const lead = leads.find((l) => l.id === leadId);
    if (!stage || !lead || lead.stage_id === stageId) return;
    if (stage.is_won) {
      setDealLead(lead); // capture deal first; modal confirm does the move
      return;
    }
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, stage_id: stageId, updated_at: nowIso() } : l)),
    );
  }

  // Won-deal -> write deal + client handoff (the shared spine).
  function recordDeal(input: DealInput) {
    if (!dealLead) return;
    const lead = dealLead;
    const closedAt = nowIso();
    const wonStage = stages.find((s) => s.is_won)!;

    const renewal = new Date(closedAt);
    renewal.setMonth(renewal.getMonth() + input.contract_months);

    const deal: Deal = {
      id: uid(),
      lead_id: lead.id,
      plan: input.plan,
      mrr: input.mrr,
      setup_fee: input.setup_fee,
      contract_months: input.contract_months,
      closed_at: closedAt,
      created_at: closedAt,
    };
    const client: Client = {
      id: uid(),
      name: lead.company,
      company: lead.company,
      lead_id: lead.id,
      pod_id: null, // ops assigns
      owner_id: null, // CSM assigned by ops
      plan: input.plan,
      mrr: input.mrr,
      status: "active",
      onboarded_at: closedAt,
      renewal_date: renewal.toISOString(),
      created_at: closedAt,
    };

    setDeals((prev) => [...prev, deal]);
    setClients((prev) => [...prev, client]);
    setLeads((prev) =>
      prev.map((l) => (l.id === lead.id ? { ...l, stage_id: wonStage.id, updated_at: closedAt } : l)),
    );
    setDealLead(null);
    setFlash(`Deal recorded — ${lead.company} handed off as a client (${clients.length + 1} total).`);
    window.setTimeout(() => setFlash(null), 4000);
  }

  // --- Inbox / lead edits --------------------------------------------------
  function selectLead(id: string) {
    setSelectedLeadId(id);
    setMessages((prev) =>
      prev.map((m) => (m.lead_id === id && m.direction === "inbound" ? { ...m, is_read: true } : m)),
    );
  }

  function send(leadId: string, channel: Channel, body: string) {
    const now = nowIso();
    const msg: LeadMessage = {
      id: uid(),
      lead_id: leadId,
      channel,
      direction: "outbound",
      subject: "",
      body,
      external_id: channel === "linkedin" ? null : `mock-${channel}-${uid()}`,
      is_read: true,
      created_at: now,
    };
    setMessages((prev) => [...prev, msg]);
    // last_contact_at updates on any message logged/sent.
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, last_contact_at: now, updated_at: now } : l)));
    // SLACK_HOOK: outbound logged — no Slack today (see brief). Hook later.
  }

  function updateLead(leadId: string, patch: Partial<Lead>) {
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, ...patch, updated_at: nowIso() } : l)));
  }

  // Merge: combine a source conversation/lead into a target (same person who
  // reached out on two channels). Source's messages + tasks reassign to the
  // target; the source lead is removed from the pipeline.
  function mergeConversations(targetId: string, sourceId: string) {
    if (targetId === sourceId) return;
    setMessages((prev) => prev.map((m) => (m.lead_id === sourceId ? { ...m, lead_id: targetId } : m)));
    setTasks((prev) => prev.map((t) => (t.lead_id === sourceId ? { ...t, lead_id: targetId } : t)));
    setLeads((prev) => prev.filter((l) => l.id !== sourceId));
    setSelectedLeadId(targetId);
    const src = leads.find((l) => l.id === sourceId);
    setFlash(`Merged ${src?.company ?? "conversation"} in — threads now share one contact.`);
    window.setTimeout(() => setFlash(null), 4000);
  }

  function setTemperature(leadId: string, t: Temperature) {
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, temperature: t, updated_at: nowIso() } : l)));
  }
  function updateNotes(leadId: string, notes: string) {
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, notes, updated_at: nowIso() } : l)));
  }
  function toggleTask(taskId: string) {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed_at: t.completed_at ? null : nowIso() } : t)),
    );
  }
  function addTask(leadId: string, title: string) {
    const now = nowIso();
    setTasks((prev) => [
      ...prev,
      { id: uid(), lead_id: leadId, title, due_at: now, completed_at: null, created_at: now },
    ]);
  }

  const unreadTotal = messages.filter((m) => m.direction === "inbound" && !m.is_read).length;

  // Clicking an alert jumps to that lead's conversation.
  const openAlert = (leadId: string) => {
    selectLead(leadId);
    setTab("communications");
  };

  const TABS: { key: TabKey; label: string; badge?: number }[] = [
    { key: "dashboard", label: "Dashboard" },
    { key: "pipeline", label: "Pipeline" },
    { key: "communications", label: "Communications", badge: unreadTotal },
  ];

  return (
    <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-6">
      {/* Header */}
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Sales</h1>
          <p className="text-xs text-subtle mt-0.5">
            Preview · mock data · final home <span className="font-mono">/sales</span>
          </p>
        </div>
        <span className="text-[10px] text-subtle">As of {MOCK_TODAY}</span>
      </div>

      {/* Pill tabs */}
      <div className="inline-flex items-center gap-1 bg-background border border-surface-raised rounded-full p-1 mb-5">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                active ? "bg-foreground text-background" : "text-muted hover:text-foreground"
              }`}
            >
              {t.label}
              {t.badge ? (
                <span
                  className={`min-w-4 h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center ${
                    active ? "bg-background/15 text-background" : "bg-foreground text-background"
                  }`}
                >
                  {t.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Tab content — constant min-height so switching pills never reflows
          the page (no scrollbar appearing/disappearing = no jolt). */}
      <div className="min-h-[calc(100vh-190px)]">
      {/* ── DASHBOARD ────────────────────────────────────────────── */}
      {tab === "dashboard" && (
        <div className="space-y-3">
          {/* KPI strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi
              icon={<ArrowTrendingUpIcon className="size-4" />}
              label="Weighted pipeline"
              value={fmtMoney(metrics.weighted)}
              sub="open leads × probability"
            />
            <Kpi
              icon={<BanknotesIcon className="size-4" />}
              label="MRR closing this month"
              value={fmtMoney(metrics.mrrThisMonth)}
              sub={`${deals.length} deals`}
            />
            <Kpi
              icon={<FireIcon className="size-4" />}
              label="In negotiation"
              value={String(metrics.negotiation)}
              sub="deals"
            />
            <Kpi
              icon={<ClockIcon className="size-4" />}
              label="Follow-ups due"
              value={String(metrics.followUps)}
              sub="today / overdue"
            />
          </div>

          {/* Funnel — full width, single restrained colour (height + rate carry
              the story, not a rainbow). The final "won" bar gets the accent. */}
          <div className="bg-background border border-surface-raised rounded-lg p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle mb-4">
              Conversion funnel
            </p>
            <div className="flex items-end gap-4">
              {metrics.funnel.map((step, i) => {
                const max = metrics.funnel[0]?.count || 1;
                const pct = Math.max(6, (step.count / max) * 100);
                const isWon = i === metrics.funnel.length - 1;
                const color = isWon ? "#22C55E" : "#3E4759";
                return (
                  <div key={step.name} className="flex-1 flex flex-col items-center">
                    <span className="text-xl font-semibold tabular-nums text-foreground">{step.count}</span>
                    <div className="w-full h-40 flex items-end mt-1">
                      <div
                        className="w-full rounded-md transition-[height] duration-300"
                        style={{ height: `${pct}%`, background: color }}
                      />
                    </div>
                    <span className="text-[12px] text-foreground mt-2 text-center leading-tight">{step.name}</span>
                    <span className="text-[11px] text-subtle tabular-nums mt-0.5">
                      {step.rateFromPrev === null ? "—" : `${step.rateFromPrev}%`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Alerts — individual type-shaded boxes, under the funnel */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <BellAlertIcon className="size-4 text-warning" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-subtle">Alerts</span>
              <span className="text-[12px] font-semibold text-foreground tabular-nums">{metrics.alerts.length}</span>
            </div>
            {metrics.alerts.length === 0 ? (
              <p className="text-[13px] text-subtle bg-background border border-surface-raised rounded-lg p-4">
                All clear — nothing needs chasing.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {metrics.alerts.map((a, i) => {
                  const s = ALERT_STYLE[a.kind];
                  return (
                    <button
                      key={i}
                      onClick={() => openAlert(a.leadId)}
                      className="text-left rounded-lg border p-3 transition-all hover:brightness-125"
                      style={{ background: `${s.color}0D`, borderColor: `${s.color}2E` }}
                    >
                      <span className="inline-flex items-center gap-1.5 mb-1.5">
                        <span className="size-1.5 rounded-full" style={{ background: s.color }} />
                        <span
                          className="text-[10px] font-semibold uppercase tracking-wider"
                          style={{ color: s.color }}
                        >
                          {s.label}
                        </span>
                      </span>
                      <span className="block text-sm font-medium text-foreground truncate">{a.leadName}</span>
                      <span className="block text-[12px] text-muted mt-0.5">{a.detail}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PIPELINE ─────────────────────────────────────────────── */}
      {tab === "pipeline" && (
        <Kanban
          leads={leads}
          stages={stages}
          owners={OWNERS}
          onMove={handleMove}
          onSelect={setDetailLeadId}
          selectedId={selectedLeadId}
        />
      )}

      {/* ── COMMUNICATIONS ───────────────────────────────────────── */}
      {tab === "communications" && (
        <Inbox
          leads={leads}
          messages={messages}
          tasks={tasks}
          selectedLeadId={selectedLeadId}
          onSelectLead={selectLead}
          onSend={send}
          onSetTemperature={setTemperature}
          onUpdateNotes={updateNotes}
          onToggleTask={toggleTask}
          onAddTask={addTask}
          onMerge={mergeConversations}
        />
      )}
      </div>

      {detailLeadId && leads.find((l) => l.id === detailLeadId) && (
        <LeadDetailModal
          lead={leads.find((l) => l.id === detailLeadId)!}
          owners={OWNERS}
          stages={stages}
          onClose={() => setDetailLeadId(null)}
          onChange={(patch) => updateLead(detailLeadId, patch)}
        />
      )}

      {flash && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 bg-foreground text-background text-xs font-medium px-4 py-2.5 rounded-lg shadow-[var(--shadow-elevated)]">
          {flash}
        </div>
      )}

      {dealLead && (
        <DealModal lead={dealLead} onClose={() => setDealLead(null)} onConfirm={recordDeal} />
      )}
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-1.5 text-subtle mb-2">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-[28px] leading-none font-bold text-foreground tabular-nums">{value}</p>
      <p className="text-[10px] text-subtle mt-1.5">{sub}</p>
    </div>
  );
}
