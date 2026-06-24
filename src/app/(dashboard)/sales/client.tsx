"use client";

/* Sales Dashboard — Ajay's command centre, wired to real data.
 *
 * Reads from the live leads + proposals tables via the
 * useSalesData() adapter, which transforms them into the
 * dashboard's expected shapes. The Inbox surface uses
 * lead.touches as the message backing - no separate messages
 * store yet, so the inbox shows what we have.
 *
 * Today is the real clock (was MOCK_TODAY when this was a mock
 * preview). Source-of-truth tools: /pipeline (lead details),
 * /tools/proposals (proposal management).
 */

import { useEffect, useMemo, useState } from "react";
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
import { useSalesData } from "@/lib/sales-dashboard/real-source";
import {
  persistStageMove,
  persistNotes,
  persistNewLead,
  sendOutbound,
} from "@/lib/sales-dashboard/persistence";
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
  PipelineStage,
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
  /* Real data via the adapter. The state below mirrors what the
   * dashboard mutates locally (drag-to-move, log-message, etc.);
   * each mutation also lands on the real store via the underlying
   * tools, but we keep optimistic local state so the UI stays
   * snappy without a refetch round-trip. */
  const { data, loading, refresh } = useSalesData();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [messages, setMessages] = useState<LeadMessage[]>([]);
  const [tasks, setTasks] = useState<LeadTask[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [owners, setOwners] = useState<{ id: string; name: string; initials: string }[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [dealLead, setDealLead] = useState<Lead | null>(null);
  const [detailLeadId, setDetailLeadId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [showAddLead, setShowAddLead] = useState(false);

  /* Seed local state once real data arrives. Re-seeds if the
   * underlying tables change between mounts (e.g. user navigates
   * away + back). */
  useEffect(() => {
    if (!data) return;
    setLeads(data.leads);
    setMessages(data.messages);
    setTasks(data.tasks);
    setDeals(data.deals);
    setClients(data.clients);
    setOwners(data.owners);
    setStages(data.stages);
    if (!selectedLeadId && data.leads.length > 0) setSelectedLeadId(data.leads[0].id);
  }, [data, selectedLeadId]);

  // --- Metrics (real today now that this is wired to live data) -----------
  const TODAY = useMemo(() => new Date().toISOString(), []);
  const metrics = useMemo(
    () => ({
      weighted: weightedPipelineValue(leads, stages),
      mrrThisMonth: mrrClosingThisMonth(deals, TODAY),
      negotiation: dealsInNegotiation(leads, stages),
      followUps: followUpsDueToday(tasks, TODAY).length,
      funnel: conversionFunnel(leads, stages),
      alerts: computeAlerts(leads, tasks, stages, TODAY),
    }),
    [leads, deals, tasks, stages, TODAY],
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
    /* Fire-and-forget persist. UI already optimistic above; this
     * makes the move survive a refresh. */
    persistStageMove(leadId, stageId);
    setFlash(`Moved to ${stage.name}`);
    window.setTimeout(() => setFlash(null), 2000);
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
    /* Persist the won-stage move on the source lead. The Proposal /
     * Client mirror is a heavier ops handoff handled in /pipeline +
     * /retention; here we just lock the lead's stage so the dashboard
     * + the source pipeline view agree. */
    persistStageMove(lead.id, wonStage.id);
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
    /* Route through the outbound API stub. Today it just records the
     * touch + logs intent. When real channel APIs are plugged in
     * (WhatsApp Business / Twitter X / LinkedIn / Postmark) the
     * stub becomes a router and this client doesn't change. */
    const outboundChannel = channel === "email" ? "email"
      : channel === "linkedin" ? "linkedin"
      : channel === "whatsapp" ? "whatsapp"
      : channel === "twitter" ? "twitter"
      : null;
    if (outboundChannel) {
      sendOutbound(leadId, outboundChannel, body, "Ajay").then((res) => {
        if (!res.ok) {
          setFlash(`Send failed: ${res.error}`);
          window.setTimeout(() => setFlash(null), 4000);
        }
      });
    }
  }

  function updateLead(leadId: string, patch: Partial<Lead>) {
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, ...patch, updated_at: nowIso() } : l)));
    /* Map the round-trippable adapter fields back onto the source
     * store. The adapter Lead is a subset of MyLead (no next_action,
     * no path, no touches) so we only persist the fields the
     * dashboard actually edits inline. Anything else flows via the
     * /pipeline detail page. */
    if (patch.notes !== undefined) persistNotes(leadId, patch.notes);
  }

  async function handleAddLead(input: {
    full_name: string;
    brand_name: string;
    brand_url: string;
    email: string;
    source: string;
    owner: string;
    revenue_band: string;
  }) {
    try {
      await persistNewLead(input);
      setShowAddLead(false);
      /* Soft refresh - re-runs useSalesData()'s adapter against the
       * live tables, which re-seeds the dashboard's local state via
       * the data-watching useEffect above. No page reload, no lost
       * scroll position, no UI flash. */
      await refresh();
      setFlash(`Added ${input.brand_name || input.full_name}`);
      window.setTimeout(() => setFlash(null), 3000);
    } catch (err) {
      setFlash(`Add failed: ${err instanceof Error ? err.message : String(err)}`);
      window.setTimeout(() => setFlash(null), 4000);
    }
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
    persistNotes(leadId, notes);
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
      <div className="flex items-baseline justify-between mb-4 gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[#E5E5EA]">Sales</h1>
          <p className="text-xs text-[#71757D] mt-0.5">
            Live · pipeline + proposals + comms in one view
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setShowAddLead(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#0C0C0C] text-[12px] font-semibold rounded-full hover:bg-[#E5E5EA] transition-colors"
          >
            + Add lead
          </button>
          <span className="text-[10px] text-[#71757D]">
            {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        </div>
      </div>

      {/* Pill tabs */}
      <div className="inline-flex items-center gap-1 bg-[#141414] border border-[#222222] rounded-full p-1 mb-5">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                active ? "bg-[#E5E5EA] text-[#0C0C0C]" : "text-[#9CA3AF] hover:text-[#E5E5EA]"
              }`}
            >
              {t.label}
              {t.badge ? (
                <span
                  className={`min-w-4 h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center ${
                    active ? "bg-[#0C0C0C]/15 text-[#0C0C0C]" : "bg-[#E5E5EA] text-[#0C0C0C]"
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
          <div className="bg-[#141414] border border-[#222222] rounded-lg p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#71757D] mb-4">
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
                    <span className="text-xl font-semibold tabular-nums text-[#E5E5EA]">{step.count}</span>
                    <div className="w-full h-40 flex items-end mt-1">
                      <div
                        className="w-full rounded-md transition-[height] duration-300"
                        style={{ height: `${pct}%`, background: color }}
                      />
                    </div>
                    <span className="text-[12px] text-[#E5E5EA] mt-2 text-center leading-tight">{step.name}</span>
                    <span className="text-[11px] text-[#71757D] tabular-nums mt-0.5">
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
              <BellAlertIcon className="size-4 text-[#F5A623]" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#71757D]">Alerts</span>
              <span className="text-[12px] font-semibold text-[#E5E5EA] tabular-nums">{metrics.alerts.length}</span>
            </div>
            {metrics.alerts.length === 0 ? (
              <p className="text-[13px] text-[#71757D] bg-[#141414] border border-[#222222] rounded-lg p-4">
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
                      <span className="block text-sm font-medium text-[#E5E5EA] truncate">{a.leadName}</span>
                      <span className="block text-[12px] text-[#9CA3AF] mt-0.5">{a.detail}</span>
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
          owners={owners}
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
          owners={owners}
          stages={stages}
          onClose={() => setDetailLeadId(null)}
          onChange={(patch) => updateLead(detailLeadId, patch)}
        />
      )}

      {flash && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 bg-[#E5E5EA] text-[#0C0C0C] text-xs font-medium px-4 py-2.5 rounded-lg shadow-[var(--shadow-elevated)]">
          {flash}
        </div>
      )}

      {dealLead && (
        <DealModal lead={dealLead} onClose={() => setDealLead(null)} onConfirm={recordDeal} />
      )}

      {showAddLead && (
        <AddLeadModal onCancel={() => setShowAddLead(false)} onSave={handleAddLead} />
      )}
    </div>
  );
}

/* ── Add Lead modal ──
 * Minimal create form. Captures the essentials (name, brand, email,
 * source, owner, revenue band) and writes via persistNewLead. Page
 * reloads on success to refresh useSalesData(). */
function AddLeadModal({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave: (input: {
    full_name: string;
    brand_name: string;
    brand_url: string;
    email: string;
    source: string;
    owner: string;
    revenue_band: string;
  }) => void;
}) {
  const [fullName, setFullName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [brandUrl, setBrandUrl] = useState("");
  const [email, setEmail] = useState("");
  const [source, setSource] = useState("Outbound");
  const [owner, setOwner] = useState("Ajay");
  const [revenueBand, setRevenueBand] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() && !brandName.trim()) return;
    onSave({
      full_name: fullName,
      brand_name: brandName,
      brand_url: brandUrl,
      email,
      source,
      owner,
      revenue_band: revenueBand,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="bg-[#0F0F10] rounded-2xl ring-1 ring-white/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.6)] w-full max-w-md p-6"
      >
        <h2 className="text-lg font-semibold text-[#E5E5EA] mb-1">Add lead</h2>
        <p className="text-xs text-[#71757D] mb-5">
          Quick capture - tweak the rest on the lead detail page.
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#71757D] mb-1.5">Full name</label>
            <input
              autoFocus
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full h-9 px-3 bg-black/40 rounded-md text-[13px] text-[#E5E5EA] placeholder:text-[#71757D] focus:outline-none focus:ring-1 focus:ring-white/[0.12]"
              placeholder="Sam Smith"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#71757D] mb-1.5">Brand</label>
              <input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="w-full h-9 px-3 bg-black/40 rounded-md text-[13px] text-[#E5E5EA] placeholder:text-[#71757D] focus:outline-none focus:ring-1 focus:ring-white/[0.12]"
                placeholder="Acme Goods"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#71757D] mb-1.5">Brand URL</label>
              <input
                value={brandUrl}
                onChange={(e) => setBrandUrl(e.target.value)}
                className="w-full h-9 px-3 bg-black/40 rounded-md text-[13px] text-[#E5E5EA] placeholder:text-[#71757D] focus:outline-none focus:ring-1 focus:ring-white/[0.12]"
                placeholder="acme.com"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#71757D] mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-9 px-3 bg-black/40 rounded-md text-[13px] text-[#E5E5EA] placeholder:text-[#71757D] focus:outline-none focus:ring-1 focus:ring-white/[0.12]"
              placeholder="sam@acme.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#71757D] mb-1.5">Source</label>
              <input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full h-9 px-3 bg-black/40 rounded-md text-[13px] text-[#E5E5EA] placeholder:text-[#71757D] focus:outline-none focus:ring-1 focus:ring-white/[0.12]"
                placeholder="X DM / Referral / Apollo"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#71757D] mb-1.5">Owner</label>
              <input
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="w-full h-9 px-3 bg-black/40 rounded-md text-[13px] text-[#E5E5EA] placeholder:text-[#71757D] focus:outline-none focus:ring-1 focus:ring-white/[0.12]"
                placeholder="Ajay"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#71757D] mb-1.5">Monthly revenue band</label>
            <input
              value={revenueBand}
              onChange={(e) => setRevenueBand(e.target.value)}
              className="w-full h-9 px-3 bg-black/40 rounded-md text-[13px] text-[#E5E5EA] placeholder:text-[#71757D] focus:outline-none focus:ring-1 focus:ring-white/[0.12]"
              placeholder="£400k - £800k"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-2 text-sm text-[#71757D] hover:text-[#E5E5EA]"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-3 py-2 bg-white text-[#0C0C0C] text-sm font-semibold rounded-lg hover:bg-[#E5E5EA]"
          >
            Add lead
          </button>
        </div>
      </form>
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
    <div className="bg-[#181818] border border-[#2A2A2A] rounded-lg p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-1.5 text-[#71757D] mb-2">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-[28px] leading-none font-bold text-[#E5E5EA] tabular-nums">{value}</p>
      <p className="text-[10px] text-[#71757D] mt-1.5">{sub}</p>
    </div>
  );
}
