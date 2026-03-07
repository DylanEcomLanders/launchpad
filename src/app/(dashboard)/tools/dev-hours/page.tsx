"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { PlusIcon, XMarkIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon, LinkIcon } from "@heroicons/react/24/solid";
import { ArrowPathIcon, ClipboardDocumentCheckIcon } from "@heroicons/react/24/outline";
import { DecorativeBlocks } from "@/components/decorative-blocks";
import { supabase } from "@/lib/supabase";
import { DEV_NAMES } from "@/lib/constants";
import type {
  TimeEntry,
  TimeEntryInsert,
  DashboardMetrics,
  Filters,
} from "@/lib/types";

/* ── Shared classes ── */
const inputClass =
  "w-full px-3 py-2.5 bg-white border border-[#E5E5E5] rounded-md text-sm focus:outline-none focus:border-[#0A0A0A] transition-colors placeholder:text-[#CCCCCC]";
const selectClass =
  "w-full px-3 py-2.5 bg-white border border-[#E5E5E5] rounded-md text-sm focus:outline-none focus:border-[#0A0A0A] transition-colors appearance-none";
const labelClass =
  "block text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] mb-2";

/* ── Currency formatter ── */
const fmt = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
});

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function currentMonth() {
  return todayStr().slice(0, 7); // "YYYY-MM"
}

function formatMonthLabel(ym: string) {
  const [y, m] = ym.split("-");
  const d = new Date(Number(y), Number(m) - 1);
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatDisplayDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function uid() {
  return "temp-" + Math.random().toString(36).slice(2, 9);
}

export default function DevHoursPage() {
  /* ── Core data ── */
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  /* ── Form state ── */
  const [form, setForm] = useState<TimeEntryInsert>({
    dev_name: "",
    client_name: "",
    project_name: "",
    hours: 1,
    date: todayStr(),
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);

  /* ── Filter state ── */
  const [filters, setFilters] = useState<Filters>({
    clientName: "",
    devName: "",
    invoicedStatus: "all",
    month: currentMonth(),
  });

  /* ── Fetch entries ── */
  const fetchEntries = useCallback(async () => {
    const { data, error: err } = await supabase
      .from("time_entries")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (err) {
      setError(err.message);
    } else {
      setEntries(data as TimeEntry[]);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  /* ── Unique values for autocomplete ── */
  const uniqueClients = useMemo(
    () => Array.from(new Set(entries.map((e) => e.client_name))).sort(),
    [entries]
  );

  /* ── Filtered entries ── */
  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (filters.clientName && e.client_name !== filters.clientName)
        return false;
      if (filters.devName && e.dev_name !== filters.devName) return false;
      if (filters.invoicedStatus === "invoiced" && !e.invoiced) return false;
      if (filters.invoicedStatus === "uninvoiced" && e.invoiced) return false;
      // Month filter
      if (filters.month && !e.date.startsWith(filters.month)) return false;
      return true;
    });
  }, [entries, filters]);

  /* ── Dashboard metrics ── */
  const metrics = useMemo<DashboardMetrics>(() => {
    const totalHours = filtered.reduce((sum, e) => sum + Number(e.hours), 0);
    const internalCost = filtered.reduce(
      (sum, e) => sum + Number(e.hours) * Number(e.dev_rate),
      0
    );
    const clientBillable = filtered.reduce(
      (sum, e) => sum + Number(e.hours) * Number(e.client_rate),
      0
    );
    const invoicedAmount = filtered
      .filter((e) => e.invoiced)
      .reduce((sum, e) => sum + Number(e.hours) * Number(e.client_rate), 0);
    const uninvoicedAmount = clientBillable - invoicedAmount;
    const margin = clientBillable - internalCost;
    return {
      totalHours,
      internalCost,
      clientBillable,
      invoicedAmount,
      uninvoicedAmount,
      margin,
    };
  }, [filtered]);

  const hasFilters =
    filters.clientName ||
    filters.devName ||
    filters.invoicedStatus !== "all";

  /* ── Create entry ── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.dev_name.trim() || !form.client_name.trim() || form.hours <= 0)
      return;

    setSubmitting(true);

    const tempEntry: TimeEntry = {
      id: uid(),
      ...form,
      invoiced: false,
      dev_rate: 14,
      client_rate: 50,
      created_at: new Date().toISOString(),
    };
    setEntries((prev) => [tempEntry, ...prev]);

    const { data, error: err } = await supabase
      .from("time_entries")
      .insert({
        dev_name: form.dev_name.trim(),
        client_name: form.client_name.trim(),
        project_name: form.project_name.trim(),
        hours: form.hours,
        date: form.date,
        description: form.description.trim(),
      })
      .select()
      .single();

    if (err) {
      setEntries((prev) => prev.filter((entry) => entry.id !== tempEntry.id));
      setError(err.message);
    } else {
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === tempEntry.id ? (data as TimeEntry) : entry
        )
      );
      setForm((prev) => ({
        ...prev,
        project_name: "",
        hours: 1,
        date: todayStr(),
        description: "",
      }));
    }
    setSubmitting(false);
  }

  /* ── Toggle invoiced ── */
  async function toggleInvoiced(id: string, current: boolean) {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, invoiced: !current } : e))
    );

    const { error: err } = await supabase
      .from("time_entries")
      .update({ invoiced: !current })
      .eq("id", id);

    if (err) {
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, invoiced: current } : e))
      );
      setError(err.message);
    }
  }

  /* ── Delete entry ── */
  async function deleteEntry(id: string) {
    const entry = entries.find((e) => e.id === id);
    setEntries((prev) => prev.filter((e) => e.id !== id));

    const { error: err } = await supabase
      .from("time_entries")
      .delete()
      .eq("id", id);

    if (err && entry) {
      setEntries((prev) => [...prev, entry]);
      setError(err.message);
    }
  }

  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-12 py-16 md:py-24">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
                Dev Hours
              </h1>
              <p className="text-[#6B6B6B]">
                Log out-of-scope dev hours and track invoicing against clients
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const url = `${window.location.origin}/tools/log-hours`;
                navigator.clipboard.writeText(url);
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2000);
              }}
              className={`shrink-0 flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-md border transition-all duration-200 ${
                linkCopied
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-white border-[#E5E5E5] text-[#6B6B6B] hover:border-[#CCCCCC] hover:text-[#0A0A0A]"
              }`}
            >
              {linkCopied ? (
                <>
                  <ClipboardDocumentCheckIcon className="size-4" />
                  Copied!
                </>
              ) : (
                <>
                  <LinkIcon className="size-4" />
                  Copy dev link
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-3 text-red-500 hover:text-red-700"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="space-y-10">
          {/* ── Month Picker + Filters ── */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
              {/* Month nav */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setFilters((f) => ({ ...f, month: shiftMonth(f.month, -1) }))
                  }
                  className="p-1.5 rounded-md border border-[#E5E5E5] hover:bg-[#F0F0F0] transition-colors"
                >
                  <ChevronLeftIcon className="size-4" />
                </button>
                <span className="text-sm font-semibold min-w-[160px] text-center">
                  {formatMonthLabel(filters.month)}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setFilters((f) => ({ ...f, month: shiftMonth(f.month, 1) }))
                  }
                  disabled={filters.month >= currentMonth()}
                  className="p-1.5 rounded-md border border-[#E5E5E5] hover:bg-[#F0F0F0] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRightIcon className="size-4" />
                </button>
              </div>

              {/* Inline filters */}
              <div className="flex flex-wrap items-center gap-3 flex-1">
                <select
                  className="px-3 py-2 bg-white border border-[#E5E5E5] rounded-md text-sm focus:outline-none focus:border-[#0A0A0A] transition-colors appearance-none"
                  value={filters.devName}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, devName: e.target.value }))
                  }
                >
                  <option value="">All devs</option>
                  {DEV_NAMES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <select
                  className="px-3 py-2 bg-white border border-[#E5E5E5] rounded-md text-sm focus:outline-none focus:border-[#0A0A0A] transition-colors appearance-none"
                  value={filters.clientName}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      clientName: e.target.value,
                    }))
                  }
                >
                  <option value="">All clients</option>
                  {uniqueClients.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <div className="inline-flex rounded-md border border-[#E5E5E5] bg-white p-0.5">
                  {(["all", "invoiced", "uninvoiced"] as const).map(
                    (status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() =>
                          setFilters((f) => ({
                            ...f,
                            invoicedStatus: status,
                          }))
                        }
                        className={`px-3 py-1.5 text-xs font-medium rounded transition-colors capitalize ${
                          filters.invoicedStatus === status
                            ? "bg-[#0A0A0A] text-white"
                            : "text-[#6B6B6B] hover:text-[#0A0A0A]"
                        }`}
                      >
                        {status}
                      </button>
                    )
                  )}
                </div>
                {hasFilters && (
                  <button
                    type="button"
                    onClick={() =>
                      setFilters((f) => ({
                        ...f,
                        clientName: "",
                        devName: "",
                        invoicedStatus: "all",
                      }))
                    }
                    className="px-3 py-2 text-xs text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Financial Dashboard ── */}
          <div>
            <label className={labelClass}>Dashboard</label>
            <div className="bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg p-5">
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <ArrowPathIcon className="size-5 animate-spin text-[#AAAAAA]" />
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA] mb-1">
                      Total Hours
                    </p>
                    <p className="text-lg font-semibold tabular-nums text-[#0A0A0A]">
                      {metrics.totalHours.toFixed(1)}h
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA] mb-1">
                      Internal Cost
                    </p>
                    <p className="text-lg font-semibold tabular-nums text-[#0A0A0A]">
                      {fmt.format(metrics.internalCost)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA] mb-1">
                      Client Billable
                    </p>
                    <p className="text-lg font-semibold tabular-nums text-[#0A0A0A]">
                      {fmt.format(metrics.clientBillable)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA] mb-1">
                      Invoiced
                    </p>
                    <p className="text-lg font-semibold tabular-nums text-[#15803D]">
                      {fmt.format(metrics.invoicedAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA] mb-1">
                      Uninvoiced
                    </p>
                    <p
                      className={`text-lg font-semibold tabular-nums ${
                        metrics.uninvoicedAmount > 0
                          ? "text-[#B45309]"
                          : "text-[#0A0A0A]"
                      }`}
                    >
                      {fmt.format(metrics.uninvoicedAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA] mb-1">
                      Margin
                    </p>
                    <p className="text-lg font-semibold tabular-nums text-[#0A0A0A]">
                      {fmt.format(metrics.margin)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Log Hours Form ── */}
          <div>
            <label className={labelClass}>Log Hours</label>
            <form
              onSubmit={handleSubmit}
              className="bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg p-5 space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-[#6B6B6B] mb-1">
                    Dev Name *
                  </label>
                  <select
                    value={form.dev_name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, dev_name: e.target.value }))
                    }
                    className={selectClass}
                    required
                  >
                    <option value="">Select dev</option>
                    {DEV_NAMES.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#6B6B6B] mb-1">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    list="client-names"
                    value={form.client_name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, client_name: e.target.value }))
                    }
                    placeholder="e.g. Acme Ltd"
                    className={inputClass}
                    required
                  />
                  <datalist id="client-names">
                    {uniqueClients.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs text-[#6B6B6B] mb-1">
                    Project
                  </label>
                  <input
                    type="text"
                    value={form.project_name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, project_name: e.target.value }))
                    }
                    placeholder="e.g. Homepage tweak"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-[#6B6B6B] mb-1">
                    Hours *
                  </label>
                  <input
                    type="number"
                    min={0.25}
                    step={0.25}
                    value={form.hours}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        hours: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#6B6B6B] mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, date: e.target.value }))
                    }
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#6B6B6B] mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                    placeholder="What was done"
                    className={inputClass}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={
                  submitting ||
                  !form.dev_name.trim() ||
                  !form.client_name.trim() ||
                  form.hours <= 0
                }
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#0A0A0A] text-white text-sm font-medium rounded-md hover:bg-accent hover:text-[#0A0A0A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <ArrowPathIcon className="size-3.5 animate-spin" />
                    Logging...
                  </>
                ) : (
                  <>
                    <PlusIcon className="size-3.5" />
                    Log Hours
                  </>
                )}
              </button>
            </form>
          </div>

          {/* ── Time Entries ── */}
          <div>
            <label className={labelClass}>
              Time Entries
              {filtered.length !== entries.length && (
                <span className="text-[#AAAAAA] font-normal normal-case tracking-normal ml-2">
                  ({filtered.length} of {entries.length})
                </span>
              )}
            </label>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <ArrowPathIcon className="size-6 animate-spin text-[#AAAAAA]" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg p-8">
                <p className="text-xs text-[#AAAAAA] text-center">
                  {entries.length === 0
                    ? "No hours logged yet — use the form above to log your first entry"
                    : "No entries for this month"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Desktop table header */}
                <div className="hidden md:grid md:grid-cols-[90px_100px_120px_1fr_60px_80px_80px_50px_32px] gap-3 px-4 py-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA]">
                    Date
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA]">
                    Dev
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA]">
                    Client
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA]">
                    Description
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA] text-right">
                    Hours
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA] text-right">
                    Billable
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA] text-right">
                    Cost
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA] text-center">
                    Inv
                  </span>
                  <span />
                </div>

                {filtered.map((entry) => (
                  <div key={entry.id}>
                    {/* Desktop row */}
                    <div
                      className={`hidden md:grid md:grid-cols-[90px_100px_120px_1fr_60px_80px_80px_50px_32px] gap-3 items-center bg-white border border-[#E5E5E5] rounded-md px-4 py-3 ${
                        entry.invoiced ? "opacity-60" : ""
                      }`}
                    >
                      <span className="text-xs text-[#6B6B6B] tabular-nums">
                        {formatDisplayDate(entry.date)}
                      </span>
                      <span className="text-sm text-[#0A0A0A] truncate">
                        {entry.dev_name}
                      </span>
                      <span className="text-sm text-[#0A0A0A] truncate">
                        {entry.client_name}
                      </span>
                      <span className="text-xs text-[#6B6B6B] truncate">
                        {entry.project_name
                          ? `${entry.project_name}${entry.description ? " — " + entry.description : ""}`
                          : entry.description || "—"}
                      </span>
                      <span className="text-sm font-medium tabular-nums text-right text-[#0A0A0A]">
                        {Number(entry.hours).toFixed(1)}
                      </span>
                      <span className="text-sm font-medium tabular-nums text-right text-[#0A0A0A]">
                        {fmt.format(
                          Number(entry.hours) * Number(entry.client_rate)
                        )}
                      </span>
                      <span className="text-xs tabular-nums text-right text-[#AAAAAA]">
                        {fmt.format(
                          Number(entry.hours) * Number(entry.dev_rate)
                        )}
                      </span>
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={() =>
                            toggleInvoiced(entry.id, entry.invoiced)
                          }
                          className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                            entry.invoiced
                              ? "bg-[#0A0A0A] border-[#0A0A0A]"
                              : "border-[#CCCCCC] hover:border-[#0A0A0A]"
                          }`}
                        >
                          {entry.invoiced && (
                            <CheckIcon className="size-3 text-white" />
                          )}
                        </button>
                      </div>
                      <button
                        onClick={() => deleteEntry(entry.id)}
                        className="p-1 text-[#CCCCCC] hover:text-[#0A0A0A] transition-colors"
                      >
                        <XMarkIcon className="size-3.5" />
                      </button>
                    </div>

                    {/* Mobile card */}
                    <div
                      className={`md:hidden bg-white border border-[#E5E5E5] rounded-md px-4 py-3 ${
                        entry.invoiced ? "opacity-60" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-[#0A0A0A]">
                            {entry.dev_name}
                          </span>
                          <span className="text-xs text-[#AAAAAA]">→</span>
                          <span className="text-sm text-[#0A0A0A]">
                            {entry.client_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              toggleInvoiced(entry.id, entry.invoiced)
                            }
                            className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                              entry.invoiced
                                ? "bg-[#0A0A0A] border-[#0A0A0A]"
                                : "border-[#CCCCCC] hover:border-[#0A0A0A]"
                            }`}
                          >
                            {entry.invoiced && (
                              <CheckIcon className="size-3 text-white" />
                            )}
                          </button>
                          <button
                            onClick={() => deleteEntry(entry.id)}
                            className="p-1 text-[#CCCCCC] hover:text-[#0A0A0A] transition-colors"
                          >
                            <XMarkIcon className="size-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#6B6B6B]">
                          {formatDisplayDate(entry.date)}
                          {entry.project_name && ` · ${entry.project_name}`}
                        </span>
                        <div className="text-right">
                          <span className="text-sm font-semibold tabular-nums text-[#0A0A0A]">
                            {Number(entry.hours).toFixed(1)}h
                          </span>
                          <span className="text-xs text-[#AAAAAA] ml-2">
                            {fmt.format(
                              Number(entry.hours) * Number(entry.client_rate)
                            )}
                          </span>
                        </div>
                      </div>
                      {entry.description && (
                        <p className="text-xs text-[#AAAAAA] mt-1">
                          {entry.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
