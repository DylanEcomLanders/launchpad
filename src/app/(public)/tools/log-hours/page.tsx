"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { PlusIcon, CheckCircleIcon } from "@heroicons/react/24/solid";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { DecorativeBlocks } from "@/components/decorative-blocks";
import { Logo } from "@/components/logo";
import { supabase } from "@/lib/supabase";
import { DEV_NAMES } from "@/lib/constants";
import type { TimeEntry, TimeEntryInsert } from "@/lib/types";

const inputClass =
  "w-full px-3 py-2.5 bg-white border border-[#E5E5E5] rounded-md text-sm focus:outline-none focus:border-[#0A0A0A] transition-colors placeholder:text-[#CCCCCC]";
const selectClass =
  "w-full px-3 py-2.5 bg-white border border-[#E5E5E5] rounded-md text-sm focus:outline-none focus:border-[#0A0A0A] transition-colors appearance-none";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function formatDisplayDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(ym: string) {
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function uid() {
  return "temp-" + Math.random().toString(36).slice(2, 9);
}

export default function LogHoursPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState<TimeEntryInsert>({
    dev_name: "",
    client_name: "",
    project_name: "",
    hours: 1,
    date: todayStr(),
    description: "",
  });
  const [context, setContext] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  /* Unique client values for autocomplete */
  const uniqueClients = useMemo(
    () => Array.from(new Set(entries.map((e) => e.client_name))).sort(),
    [entries]
  );

  const [month] = useState(currentMonth);

  /* This month's entries for the selected dev */
  const myEntries = useMemo(() => {
    if (!form.dev_name) return [];
    return entries.filter(
      (e) => e.dev_name === form.dev_name && e.date.startsWith(month)
    );
  }, [entries, form.dev_name, month]);

  const myTotalHours = useMemo(
    () => myEntries.reduce((sum, e) => sum + Number(e.hours), 0),
    [myEntries]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (
      !form.dev_name ||
      !form.client_name.trim() ||
      form.hours <= 0 ||
      !context.trim()
    )
      return;

    setSubmitting(true);
    setSuccess(false);

    // Combine context into the description field: "description | Context: context"
    const fullDescription = form.description.trim()
      ? `${form.description.trim()} | Context: ${context.trim()}`
      : context.trim();

    const tempEntry: TimeEntry = {
      id: uid(),
      ...form,
      description: fullDescription,
      invoiced: false,
      dev_rate: 14,
      client_rate: 50,
      created_at: new Date().toISOString(),
    };
    setEntries((prev) => [tempEntry, ...prev]);

    const { data, error: err } = await supabase
      .from("time_entries")
      .insert({
        dev_name: form.dev_name,
        client_name: form.client_name.trim(),
        project_name: form.project_name.trim(),
        hours: form.hours,
        date: form.date,
        description: fullDescription,
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
      setContext("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
    setSubmitting(false);
  }

  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 max-w-xl mx-auto px-6 py-16 md:py-24">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Logo height={18} className="text-[#0A0A0A]" />
        </div>

        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
            Log Hours
          </h1>
          <p className="text-[#6B6B6B] text-sm">
            Log your out-of-scope development hours
          </p>
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

        {/* Success banner */}
        {success && (
          <div className="mb-6 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700 flex items-center gap-2">
            <CheckCircleIcon className="size-4" />
            Hours logged successfully
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg p-5 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#6B6B6B] mb-1">
                Your Name *
              </label>
              <select
                value={form.dev_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, dev_name: e.target.value }))
                }
                className={selectClass}
                required
              >
                <option value="">Select your name</option>
                {DEV_NAMES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#6B6B6B] mb-1">
                Client *
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

          <div className="grid grid-cols-2 gap-4">
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
          </div>

          <div>
            <label className="block text-xs text-[#6B6B6B] mb-1">
              What did you work on?
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Brief description of the work"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs text-[#6B6B6B] mb-1">
              Why is this out of scope? *
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="e.g. Client requested additional carousel on homepage that wasn't in the original SOW"
              className={`${inputClass} min-h-[80px] resize-y`}
              required
            />
            <p className="text-[10px] text-[#AAAAAA] mt-1">
              Include what the client asked for and why it falls outside the
              agreed scope
            </p>
          </div>

          <button
            type="submit"
            disabled={
              submitting ||
              !form.dev_name ||
              !form.client_name.trim() ||
              form.hours <= 0 ||
              !context.trim()
            }
            className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#0A0A0A] text-white text-sm font-medium rounded-md hover:bg-[#2A2A2A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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

        {/* This month's entries for dev */}
        {form.dev_name && (
          <div className="mt-10">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">
                {formatMonthLabel(month)}
              </h2>
              <span className="text-sm font-semibold tabular-nums">
                {myTotalHours.toFixed(1)}h total
              </span>
            </div>
            {myEntries.length === 0 ? (
              <p className="text-sm text-[#AAAAAA] py-4 text-center">
                No hours logged this month yet
              </p>
            ) : (
              <div className="space-y-2">
                {myEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-white border border-[#E5E5E5] rounded-md px-4 py-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-[#AAAAAA] tabular-nums shrink-0">
                          {formatDisplayDate(entry.date)}
                        </span>
                        <span className="text-sm text-[#0A0A0A] truncate">
                          {entry.client_name}
                          {entry.project_name && ` — ${entry.project_name}`}
                        </span>
                      </div>
                      <span className="text-sm font-semibold tabular-nums text-[#0A0A0A] shrink-0 ml-3">
                        {Number(entry.hours).toFixed(1)}h
                      </span>
                    </div>
                    {entry.description && (
                      <p className="text-xs text-[#AAAAAA] mt-1">
                        {entry.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
