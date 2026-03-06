"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  PlusIcon,
  XMarkIcon,
  ChevronDownIcon,
  PencilSquareIcon,
  CheckIcon,
  TrashIcon,
} from "@heroicons/react/24/solid";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { DecorativeBlocks } from "@/components/decorative-blocks";
import { supabase } from "@/lib/supabase";
import type { CroTest, CroTestInsert, CroTestStatus } from "@/lib/types";

/* ── Shared classes ─────────────────────────────────────────────── */

const inputClass =
  "w-full px-3 py-2.5 bg-white border border-[#E5E5E5] rounded-md text-sm focus:outline-none focus:border-[#0A0A0A] transition-colors placeholder:text-[#CCCCCC]";

const selectClass =
  "w-full px-3 py-2.5 bg-white border border-[#E5E5E5] rounded-md text-sm focus:outline-none focus:border-[#0A0A0A] transition-colors";

const labelClass =
  "block text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] mb-2";

const smallInputClass =
  "w-full px-2 py-1.5 bg-white border border-[#E5E5E5] rounded text-xs focus:outline-none focus:border-[#0A0A0A] transition-colors tabular-nums";

/* ── Status config ──────────────────────────────────────────────── */

const statusConfig: Record<CroTestStatus, { bg: string; text: string; dot: string; label: string }> = {
  live:         { bg: "bg-green-50",   text: "text-green-700",   dot: "bg-green-500",   label: "Live" },
  paused:       { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500",   label: "Paused" },
  winner:       { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Winner" },
  loser:        { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-500",     label: "Loser" },
  inconclusive: { bg: "bg-gray-50",    text: "text-gray-600",    dot: "bg-gray-400",    label: "Inconclusive" },
};

const ALL_STATUSES: CroTestStatus[] = ["live", "paused", "winner", "loser", "inconclusive"];

/* ── Weekly checklist items ─────────────────────────────────────── */

const MONDAY_CHECKS = [
  "Confirm all live tests are tracking correctly",
  "Check sample sizes are on pace",
  "Verify no test conflicts or overlap",
  "Next test queued and ready",
];

const FRIDAY_CHECKS = [
  "Pull latest metrics for all live tests",
  "Call winners/losers for tests at 95%+ sig",
  "Log results to CRO system",
  "Brief next test to team",
];

/* ── Helpers ─────────────────────────────────────────────────────── */

function uid() {
  return "temp-" + Math.random().toString(36).slice(2, 9);
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function daysBetween(startDate: string): number {
  const start = new Date(startDate + "T00:00:00");
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}

function calcDelta(control: number, variant: number): { value: number; positive: boolean } {
  if (control === 0) return { value: 0, positive: variant >= 0 };
  const delta = ((variant - control) / control) * 100;
  return { value: Math.abs(delta), positive: delta >= 0 };
}

function penceToPounds(pence: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
  }).format(pence / 100);
}

function getWeekKey(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

/* ── Sub-components ──────────────────────────────────────────────── */

function StatusBadge({ status }: { status: CroTestStatus }) {
  const sc = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${sc.bg} ${sc.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
      {sc.label}
    </span>
  );
}

function StatSigBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, Number(value) || 0));
  const color =
    pct >= 95 ? "bg-emerald-500" : pct >= 80 ? "bg-amber-500" : "bg-[#CCCCCC]";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-300 rounded-full`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] font-medium tabular-nums text-[#6B6B6B] w-8 text-right">
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

function MetricCell({
  control,
  variant,
  format,
}: {
  control: number;
  variant: number;
  format: "pct" | "currency";
}) {
  const delta = calcDelta(control, variant);
  const prefix = delta.positive ? "+" : "-";
  const color = delta.positive ? "text-emerald-600" : "text-red-500";

  if (format === "currency") {
    return (
      <div className="text-xs tabular-nums leading-tight">
        <span className="text-[#6B6B6B]">{penceToPounds(control)}</span>
        <span className="mx-0.5 text-[#CCCCCC]">/</span>
        <span className="text-[#0A0A0A]">{penceToPounds(variant)}</span>
        {control > 0 && (
          <span className={`ml-1 text-[10px] ${color}`}>
            {prefix}
            {delta.value.toFixed(1)}%
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="text-xs tabular-nums leading-tight">
      <span className="text-[#6B6B6B]">{Number(control).toFixed(2)}%</span>
      <span className="mx-0.5 text-[#CCCCCC]">/</span>
      <span className="text-[#0A0A0A]">{Number(variant).toFixed(2)}%</span>
      {control > 0 && (
        <span className={`ml-1 text-[10px] ${color}`}>
          {prefix}
          {delta.value.toFixed(1)}%
        </span>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════════ */

export default function CroMonitorPage() {
  /* ── Core data ─────────────────────────────────────────────────── */
  const [tests, setTests] = useState<CroTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ── Add form ──────────────────────────────────────────────────── */
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<CroTestInsert>({
    client_name: "",
    test_name: "",
    variant_name: "",
    hypothesis: "",
    start_date: todayStr(),
  });
  const [submitting, setSubmitting] = useState(false);

  /* ── Filter ────────────────────────────────────────────────────── */
  const [statusFilter, setStatusFilter] = useState<"all" | "live" | "completed">("all");

  /* ── Collapsible client sections ───────────────────────────────── */
  const [openClients, setOpenClients] = useState<Record<string, boolean>>({});

  /* ── Expanded test rows ────────────────────────────────────────── */
  const [expandedTests, setExpandedTests] = useState<Record<string, boolean>>({});
  const [editForms, setEditForms] = useState<Record<string, Partial<CroTest>>>({});

  /* ── Weekly checklist ──────────────────────────────────────────── */
  const [checklistTab, setChecklistTab] = useState<"monday" | "friday">("monday");
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  /* ── Data fetch ────────────────────────────────────────────────── */

  const fetchTests = useCallback(async () => {
    const { data, error: err } = await supabase
      .from("cro_tests")
      .select("*")
      .order("start_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (err) {
      setError(err.message);
    } else {
      setTests((data as CroTest[]) || []);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  /* ── Checklist persistence ─────────────────────────────────────── */

  useEffect(() => {
    const weekKey = getWeekKey();
    const stored = localStorage.getItem(`cro-checklist-${weekKey}`);
    if (stored) {
      try {
        setCheckedItems(JSON.parse(stored));
      } catch {
        /* ignore */
      }
    }
  }, []);

  function toggleCheck(key: string) {
    setCheckedItems((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(`cro-checklist-${getWeekKey()}`, JSON.stringify(next));
      return next;
    });
  }

  /* ── Default client sections open ──────────────────────────────── */

  const clientGroups = useMemo(() => {
    const filtered = tests.filter((t) => {
      if (statusFilter === "live") return t.status === "live" || t.status === "paused";
      if (statusFilter === "completed")
        return t.status === "winner" || t.status === "loser" || t.status === "inconclusive";
      return true;
    });

    const groups: Record<string, CroTest[]> = {};
    for (const test of filtered) {
      if (!groups[test.client_name]) groups[test.client_name] = [];
      groups[test.client_name].push(test);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [tests, statusFilter]);

  // Auto-open new clients
  useEffect(() => {
    setOpenClients((prev) => {
      const next = { ...prev };
      for (const [client] of clientGroups) {
        if (!(client in next)) next[client] = true;
      }
      return next;
    });
  }, [clientGroups]);

  /* ── Unique clients for autocomplete ───────────────────────────── */

  const uniqueClients = useMemo(
    () => Array.from(new Set(tests.map((t) => t.client_name))).sort(),
    [tests]
  );

  /* ── Summary stats ─────────────────────────────────────────────── */

  const summary = useMemo(() => {
    const live = tests.filter((t) => t.status === "live");
    const approaching = live.filter((t) => Number(t.stat_sig) >= 80 && Number(t.stat_sig) < 95);
    const avgDays =
      live.length > 0
        ? Math.round(live.reduce((s, t) => s + daysBetween(t.start_date), 0) / live.length)
        : 0;
    return { totalLive: live.length, approachingSig: approaching.length, avgDays };
  }, [tests]);

  /* ── CRUD: Add test ────────────────────────────────────────────── */

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client_name.trim() || !form.test_name.trim()) return;

    setSubmitting(true);
    const tempTest: CroTest = {
      id: uid(),
      ...form,
      client_name: form.client_name.trim(),
      test_name: form.test_name.trim(),
      variant_name: form.variant_name.trim(),
      hypothesis: form.hypothesis.trim(),
      status: "live",
      cvr_control: 0,
      cvr_variant: 0,
      rpv_control: 0,
      rpv_variant: 0,
      aov_control: 0,
      aov_variant: 0,
      stat_sig: 0,
      sample_size: 0,
      notes: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setTests((prev) => [tempTest, ...prev]);

    const { data, error: err } = await supabase
      .from("cro_tests")
      .insert({
        client_name: form.client_name.trim(),
        test_name: form.test_name.trim(),
        variant_name: form.variant_name.trim(),
        hypothesis: form.hypothesis.trim(),
        start_date: form.start_date,
      })
      .select()
      .single();

    if (err) {
      setTests((prev) => prev.filter((t) => t.id !== tempTest.id));
      setError(err.message);
    } else {
      setTests((prev) => prev.map((t) => (t.id === tempTest.id ? (data as CroTest) : t)));
      setForm({ client_name: "", test_name: "", variant_name: "", hypothesis: "", start_date: todayStr() });
      setShowAddForm(false);
    }
    setSubmitting(false);
  }

  /* ── CRUD: Update test ─────────────────────────────────────────── */

  function startEdit(test: CroTest) {
    setExpandedTests((prev) => ({ ...prev, [test.id]: true }));
    setEditForms((prev) => ({
      ...prev,
      [test.id]: {
        cvr_control: test.cvr_control,
        cvr_variant: test.cvr_variant,
        rpv_control: test.rpv_control,
        rpv_variant: test.rpv_variant,
        aov_control: test.aov_control,
        aov_variant: test.aov_variant,
        stat_sig: test.stat_sig,
        sample_size: test.sample_size,
        status: test.status,
        notes: test.notes,
      },
    }));
  }

  function cancelEdit(id: string) {
    setExpandedTests((prev) => ({ ...prev, [id]: false }));
    setEditForms((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function updateEditField(id: string, key: string, value: string | number) {
    setEditForms((prev) => ({
      ...prev,
      [id]: { ...prev[id], [key]: value },
    }));
  }

  async function handleSave(testId: string) {
    const updates = editForms[testId];
    if (!updates) return;

    setTests((prev) => prev.map((t) => (t.id === testId ? { ...t, ...updates } : t)));
    setExpandedTests((prev) => ({ ...prev, [testId]: false }));

    const { error: err } = await supabase.from("cro_tests").update(updates).eq("id", testId);

    if (err) {
      setError(err.message);
      fetchTests();
    }
    setEditForms((prev) => {
      const next = { ...prev };
      delete next[testId];
      return next;
    });
  }

  /* ── CRUD: Delete test ─────────────────────────────────────────── */

  async function handleDelete(testId: string) {
    const prev = tests;
    setTests((p) => p.filter((t) => t.id !== testId));
    cancelEdit(testId);

    const { error: err } = await supabase.from("cro_tests").delete().eq("id", testId);
    if (err) {
      setTests(prev);
      setError(err.message);
    }
  }

  /* ── Render ────────────────────────────────────────────────────── */

  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-12 py-16 md:py-24">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            CRO Test Monitor
          </h1>
          <p className="text-[#6B6B6B] text-sm">
            Monitor live A/B tests across all clients with weekly review cadence
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700 flex items-center justify-between">
            {error}
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-xs font-medium">
              Dismiss
            </button>
          </div>
        )}

        <div className="space-y-8">
          {/* ── Summary Stats ───────────────────────────────────── */}
          <section>
            <label className={labelClass}>Dashboard</label>
            <div className="bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg p-5">
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <div className="text-2xl font-bold tabular-nums">{summary.totalLive}</div>
                  <div className="text-[11px] text-[#6B6B6B] uppercase tracking-wider mt-1">
                    Live Tests
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold tabular-nums">{summary.approachingSig}</div>
                  <div className="text-[11px] text-[#6B6B6B] uppercase tracking-wider mt-1">
                    Approaching Sig
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold tabular-nums">
                    {summary.avgDays}
                    <span className="text-sm font-normal text-[#6B6B6B] ml-1">days</span>
                  </div>
                  <div className="text-[11px] text-[#6B6B6B] uppercase tracking-wider mt-1">
                    Avg Run Time
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── Filters + Add ───────────────────────────────────── */}
          <div className="flex items-center justify-between">
            <div className="inline-flex rounded-md border border-[#E5E5E5] bg-white p-0.5">
              {(["all", "live", "completed"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors capitalize ${
                    statusFilter === f
                      ? "bg-[#0A0A0A] text-white"
                      : "text-[#6B6B6B] hover:text-[#0A0A0A]"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#0A0A0A] text-white text-sm font-medium rounded-md hover:bg-[#2A2A2A] transition-colors"
            >
              {showAddForm ? <XMarkIcon className="size-4" /> : <PlusIcon className="size-4" />}
              {showAddForm ? "Cancel" : "Add Test"}
            </button>
          </div>

          {/* ── Add Form ────────────────────────────────────────── */}
          {showAddForm && (
            <form
              onSubmit={handleSubmit}
              className="bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg p-5 space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Client Name</label>
                  <input
                    type="text"
                    value={form.client_name}
                    onChange={(e) => setForm((p) => ({ ...p, client_name: e.target.value }))}
                    placeholder="e.g. Gymshark"
                    className={inputClass}
                    list="cro-clients"
                    required
                  />
                  <datalist id="cro-clients">
                    {uniqueClients.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className={labelClass}>Test Name</label>
                  <input
                    type="text"
                    value={form.test_name}
                    onChange={(e) => setForm((p) => ({ ...p, test_name: e.target.value }))}
                    placeholder="e.g. PDP Trust Badge Above Fold"
                    className={inputClass}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Variant Name</label>
                  <input
                    type="text"
                    value={form.variant_name}
                    onChange={(e) => setForm((p) => ({ ...p, variant_name: e.target.value }))}
                    placeholder="e.g. V1 — Badge + Reviews"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Start Date</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Hypothesis</label>
                  <input
                    type="text"
                    value={form.hypothesis}
                    onChange={(e) => setForm((p) => ({ ...p, hypothesis: e.target.value }))}
                    placeholder="e.g. Trust badges increase CVR by 5%"
                    className={inputClass}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting || !form.client_name.trim() || !form.test_name.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#0A0A0A] text-white text-sm font-medium rounded-md hover:bg-[#2A2A2A] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? <ArrowPathIcon className="size-4 animate-spin" /> : <PlusIcon className="size-4" />}
                Add Test
              </button>
            </form>
          )}

          {/* ── Client Sections ──────────────────────────────────── */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <ArrowPathIcon className="size-5 animate-spin text-[#AAAAAA]" />
            </div>
          ) : clientGroups.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-sm text-[#AAAAAA]">
                {tests.length === 0
                  ? "No tests yet. Add your first one above."
                  : "No tests match the current filter."}
              </p>
            </div>
          ) : (
            clientGroups.map(([clientName, clientTests]) => {
              const isOpen = openClients[clientName] !== false;

              return (
                <section key={clientName}>
                  {/* Client header */}
                  <button
                    onClick={() =>
                      setOpenClients((prev) => ({ ...prev, [clientName]: !isOpen }))
                    }
                    className="w-full flex items-center justify-between px-4 py-3 bg-white border border-[#E5E5E5] rounded-lg hover:bg-[#FAFAFA] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{clientName}</span>
                      <span className="px-2 py-0.5 rounded-full bg-[#F0F0F0] text-[10px] font-semibold text-[#6B6B6B]">
                        {clientTests.length} {clientTests.length === 1 ? "test" : "tests"}
                      </span>
                    </div>
                    <ChevronDownIcon
                      className={`size-4 text-[#AAAAAA] transition-transform duration-200 ${
                        isOpen ? "" : "-rotate-90"
                      }`}
                    />
                  </button>

                  {/* Tests within client */}
                  {isOpen && (
                    <div className="mt-1 border border-[#E5E5E5] rounded-lg overflow-hidden bg-white">
                      {/* Desktop table header */}
                      <div className="hidden md:grid grid-cols-[1fr_80px_50px_130px_130px_130px_100px_36px] gap-2 px-4 py-2.5 bg-[#F5F5F5] border-b border-[#E5E5E5] text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA]">
                        <div>Test</div>
                        <div className="text-center">Status</div>
                        <div className="text-center">Days</div>
                        <div>CVR</div>
                        <div>RPV</div>
                        <div>AOV</div>
                        <div>Stat Sig</div>
                        <div />
                      </div>

                      {clientTests.map((test) => (
                        <div key={test.id} className="border-b border-[#F0F0F0] last:border-b-0">
                          {/* Desktop row */}
                          <div className="hidden md:grid grid-cols-[1fr_80px_50px_130px_130px_130px_100px_36px] gap-2 items-center px-4 py-3 hover:bg-[#FAFAFA] transition-colors">
                            <div>
                              <div className="text-sm font-medium truncate">{test.test_name}</div>
                              {test.variant_name && (
                                <div className="text-[11px] text-[#AAAAAA] truncate">
                                  {test.variant_name}
                                </div>
                              )}
                            </div>
                            <div className="text-center">
                              <StatusBadge status={test.status} />
                            </div>
                            <div className="text-center text-xs tabular-nums text-[#6B6B6B]">
                              {daysBetween(test.start_date)}
                            </div>
                            <MetricCell control={test.cvr_control} variant={test.cvr_variant} format="pct" />
                            <MetricCell control={test.rpv_control} variant={test.rpv_variant} format="currency" />
                            <MetricCell control={test.aov_control} variant={test.aov_variant} format="currency" />
                            <StatSigBar value={Number(test.stat_sig)} />
                            <button
                              onClick={() =>
                                expandedTests[test.id] ? cancelEdit(test.id) : startEdit(test)
                              }
                              className="p-1.5 text-[#CCCCCC] hover:text-[#0A0A0A] transition-colors rounded hover:bg-[#F0F0F0]"
                            >
                              <PencilSquareIcon className="size-4" />
                            </button>
                          </div>

                          {/* Mobile card */}
                          <div className="md:hidden p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm font-medium">{test.test_name}</div>
                                {test.variant_name && (
                                  <div className="text-[11px] text-[#AAAAAA]">{test.variant_name}</div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <StatusBadge status={test.status} />
                                <button
                                  onClick={() =>
                                    expandedTests[test.id] ? cancelEdit(test.id) : startEdit(test)
                                  }
                                  className="p-1 text-[#CCCCCC] hover:text-[#0A0A0A]"
                                >
                                  <PencilSquareIcon className="size-4" />
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-[11px] text-[#AAAAAA]">
                              <span>{daysBetween(test.start_date)} days</span>
                              <span>Sample: {test.sample_size.toLocaleString()}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-3 text-[10px]">
                              <div>
                                <div className="text-[#AAAAAA] uppercase tracking-wider mb-0.5">CVR</div>
                                <MetricCell control={test.cvr_control} variant={test.cvr_variant} format="pct" />
                              </div>
                              <div>
                                <div className="text-[#AAAAAA] uppercase tracking-wider mb-0.5">RPV</div>
                                <MetricCell control={test.rpv_control} variant={test.rpv_variant} format="currency" />
                              </div>
                              <div>
                                <div className="text-[#AAAAAA] uppercase tracking-wider mb-0.5">AOV</div>
                                <MetricCell control={test.aov_control} variant={test.aov_variant} format="currency" />
                              </div>
                            </div>
                            <StatSigBar value={Number(test.stat_sig)} />
                          </div>

                          {/* Expanded edit panel */}
                          {expandedTests[test.id] && editForms[test.id] && (
                            <div className="px-4 pb-4 pt-3 border-t border-[#F0F0F0] bg-[#FAFAFA] space-y-4">
                              {/* Hypothesis */}
                              {test.hypothesis && (
                                <div className="text-xs text-[#6B6B6B]">
                                  <span className="font-semibold text-[#0A0A0A]">Hypothesis: </span>
                                  {test.hypothesis}
                                </div>
                              )}

                              {/* Metrics grid */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div>
                                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA] mb-1">
                                    CVR Control (%)
                                  </label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={editForms[test.id].cvr_control ?? ""}
                                    onChange={(e) => updateEditField(test.id, "cvr_control", Number(e.target.value))}
                                    className={smallInputClass}
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA] mb-1">
                                    CVR Variant (%)
                                  </label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={editForms[test.id].cvr_variant ?? ""}
                                    onChange={(e) => updateEditField(test.id, "cvr_variant", Number(e.target.value))}
                                    className={smallInputClass}
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA] mb-1">
                                    RPV Control (p)
                                  </label>
                                  <input
                                    type="number"
                                    step="1"
                                    value={editForms[test.id].rpv_control ?? ""}
                                    onChange={(e) => updateEditField(test.id, "rpv_control", Number(e.target.value))}
                                    className={smallInputClass}
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA] mb-1">
                                    RPV Variant (p)
                                  </label>
                                  <input
                                    type="number"
                                    step="1"
                                    value={editForms[test.id].rpv_variant ?? ""}
                                    onChange={(e) => updateEditField(test.id, "rpv_variant", Number(e.target.value))}
                                    className={smallInputClass}
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA] mb-1">
                                    AOV Control (p)
                                  </label>
                                  <input
                                    type="number"
                                    step="1"
                                    value={editForms[test.id].aov_control ?? ""}
                                    onChange={(e) => updateEditField(test.id, "aov_control", Number(e.target.value))}
                                    className={smallInputClass}
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA] mb-1">
                                    AOV Variant (p)
                                  </label>
                                  <input
                                    type="number"
                                    step="1"
                                    value={editForms[test.id].aov_variant ?? ""}
                                    onChange={(e) => updateEditField(test.id, "aov_variant", Number(e.target.value))}
                                    className={smallInputClass}
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA] mb-1">
                                    Stat Sig (%)
                                  </label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    value={editForms[test.id].stat_sig ?? ""}
                                    onChange={(e) => updateEditField(test.id, "stat_sig", Number(e.target.value))}
                                    className={smallInputClass}
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA] mb-1">
                                    Sample Size
                                  </label>
                                  <input
                                    type="number"
                                    step="1"
                                    value={editForms[test.id].sample_size ?? ""}
                                    onChange={(e) => updateEditField(test.id, "sample_size", Number(e.target.value))}
                                    className={smallInputClass}
                                  />
                                </div>
                              </div>

                              {/* Status + notes row */}
                              <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-3">
                                <div>
                                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA] mb-1">
                                    Status
                                  </label>
                                  <select
                                    value={editForms[test.id].status ?? test.status}
                                    onChange={(e) => updateEditField(test.id, "status", e.target.value)}
                                    className={selectClass}
                                  >
                                    {ALL_STATUSES.map((s) => (
                                      <option key={s} value={s}>
                                        {statusConfig[s].label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA] mb-1">
                                    Notes
                                  </label>
                                  <input
                                    type="text"
                                    value={editForms[test.id].notes ?? ""}
                                    onChange={(e) => updateEditField(test.id, "notes", e.target.value)}
                                    placeholder="Freeform notes..."
                                    className={smallInputClass}
                                  />
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleSave(test.id)}
                                  className="flex items-center gap-1.5 px-4 py-2 bg-[#0A0A0A] text-white text-xs font-medium rounded-md hover:bg-[#2A2A2A] transition-colors"
                                >
                                  <CheckIcon className="size-3.5" />
                                  Save
                                </button>
                                <button
                                  onClick={() => cancelEdit(test.id)}
                                  className="px-4 py-2 border border-[#E5E5E5] bg-white text-[#6B6B6B] text-xs font-medium rounded-md hover:bg-[#F5F5F5] transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleDelete(test.id)}
                                  className="ml-auto flex items-center gap-1 px-3 py-2 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                >
                                  <TrashIcon className="size-3.5" />
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              );
            })
          )}

          {/* ── Weekly Checklist ──────────────────────────────────── */}
          <section>
            <label className={labelClass}>Weekly Review</label>

            {/* Tabs */}
            <div className="inline-flex rounded-md border border-[#E5E5E5] bg-white p-0.5 mb-4">
              <button
                onClick={() => setChecklistTab("monday")}
                className={`px-4 py-1.5 text-xs font-medium rounded transition-colors ${
                  checklistTab === "monday"
                    ? "bg-[#0A0A0A] text-white"
                    : "text-[#6B6B6B] hover:text-[#0A0A0A]"
                }`}
              >
                Monday — Launch Check
              </button>
              <button
                onClick={() => setChecklistTab("friday")}
                className={`px-4 py-1.5 text-xs font-medium rounded transition-colors ${
                  checklistTab === "friday"
                    ? "bg-[#0A0A0A] text-white"
                    : "text-[#6B6B6B] hover:text-[#0A0A0A]"
                }`}
              >
                Friday — Results Review
              </button>
            </div>

            <div className="bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg p-5 space-y-3">
              {(checklistTab === "monday" ? MONDAY_CHECKS : FRIDAY_CHECKS).map(
                (item, i) => {
                  const key = `${checklistTab}-${i}`;
                  const isChecked = !!checkedItems[key];

                  return (
                    <label
                      key={key}
                      className="flex items-center gap-3 cursor-pointer group"
                    >
                      <button
                        type="button"
                        onClick={() => toggleCheck(key)}
                        className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${
                          isChecked
                            ? "bg-[#0A0A0A] border-[#0A0A0A]"
                            : "border-[#CCCCCC] bg-white group-hover:border-[#0A0A0A]"
                        }`}
                      >
                        {isChecked && <CheckIcon className="size-3 text-white" />}
                      </button>
                      <span
                        className={`text-sm transition-colors ${
                          isChecked ? "line-through text-[#AAAAAA]" : "text-[#0A0A0A]"
                        }`}
                      >
                        {item}
                      </span>
                    </label>
                  );
                }
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
