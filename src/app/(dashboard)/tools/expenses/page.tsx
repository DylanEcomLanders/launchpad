"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/solid";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { DecorativeBlocks } from "@/components/decorative-blocks";
import { supabase } from "@/lib/supabase";
import type { Expense, ExpenseInsert } from "@/lib/types";
import { inputClass } from "@/lib/form-styles";
import { formatGBP } from "@/lib/formatters";
import { uid } from "@/lib/utils";

const frequencies = ["monthly", "yearly", "one-off"] as const;
const statuses = ["needed", "review", "cut"] as const;

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  needed: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  review: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  cut: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
};

function monthlyEquivalent(amount: number, frequency: string): number {
  if (frequency === "monthly") return amount;
  if (frequency === "yearly") return amount / 12;
  return 0; // one-off excluded from recurring totals
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<ExpenseInsert>({
    name: "",
    category: "",
    amount: 0,
    frequency: "monthly",
    status: "needed",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const [filterStatus, setFilterStatus] = useState<"all" | "needed" | "review" | "cut">("all");
  const [filterCategory, setFilterCategory] = useState("");

  const fetchExpenses = useCallback(async () => {
    const { data, error: err } = await supabase
      .from("expenses")
      .select("*")
      .order("created_at", { ascending: false });

    if (err) {
      setError(err.message);
    } else {
      setExpenses(data as Expense[]);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  /* Unique categories for autocomplete + filter */
  const uniqueCategories = useMemo(
    () => Array.from(new Set(expenses.map((e) => e.category).filter(Boolean))).sort(),
    [expenses]
  );

  /* Filtered expenses */
  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      if (filterStatus !== "all" && e.status !== filterStatus) return false;
      if (filterCategory && e.category !== filterCategory) return false;
      return true;
    });
  }, [expenses, filterStatus, filterCategory]);

  /* Summary metrics (over ALL expenses, not filtered) */
  const summary = useMemo(() => {
    const active = expenses.filter((e) => e.status !== "cut");
    const monthlyTotal = active.reduce(
      (sum, e) => sum + monthlyEquivalent(Number(e.amount), e.frequency),
      0
    );
    const yearlyTotal = active.reduce((sum, e) => {
      if (e.frequency === "monthly") return sum + Number(e.amount) * 12;
      if (e.frequency === "yearly") return sum + Number(e.amount);
      return sum; // one-off excluded
    }, 0);
    const neededCount = expenses.filter((e) => e.status === "needed").length;
    const reviewCount = expenses.filter((e) => e.status === "review").length;
    return { monthlyTotal, yearlyTotal, neededCount, reviewCount };
  }, [expenses]);

  /* Add expense */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || form.amount <= 0) return;

    setSubmitting(true);

    const tempEntry: Expense = {
      id: uid(),
      ...form,
      name: form.name.trim(),
      category: form.category.trim(),
      notes: form.notes.trim(),
      created_at: new Date().toISOString(),
    };
    setExpenses((prev) => [tempEntry, ...prev]);

    const { data, error: err } = await supabase
      .from("expenses")
      .insert({
        name: form.name.trim(),
        category: form.category.trim(),
        amount: form.amount,
        frequency: form.frequency,
        status: form.status,
        notes: form.notes.trim(),
      })
      .select()
      .single();

    if (err) {
      setExpenses((prev) => prev.filter((x) => x.id !== tempEntry.id));
      setError(err.message);
    } else {
      setExpenses((prev) =>
        prev.map((x) => (x.id === tempEntry.id ? (data as Expense) : x))
      );
      setForm({
        name: "",
        category: form.category,
        amount: 0,
        frequency: "monthly",
        status: "needed",
        notes: "",
      });
    }
    setSubmitting(false);
  }

  /* Update status inline */
  async function cycleStatus(id: string) {
    const entry = expenses.find((e) => e.id === id);
    if (!entry) return;

    const order: Array<"needed" | "review" | "cut"> = ["needed", "review", "cut"];
    const nextStatus = order[(order.indexOf(entry.status) + 1) % order.length];

    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: nextStatus } : e))
    );

    const { error: err } = await supabase
      .from("expenses")
      .update({ status: nextStatus })
      .eq("id", id);

    if (err) {
      setExpenses((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: entry.status } : e))
      );
      setError(err.message);
    }
  }

  /* Delete expense */
  async function handleDelete(id: string) {
    const prev = expenses;
    setExpenses((p) => p.filter((e) => e.id !== id));

    const { error: err } = await supabase.from("expenses").delete().eq("id", id);

    if (err) {
      setExpenses(prev);
      setError(err.message);
    }
  }

  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-12 py-16 md:py-24">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            Expenses
          </h1>
          <p className="text-[#7A7A7A] text-sm">
            Track business expenses and flag what&apos;s needed
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

        <div className="space-y-10">
          {/* Summary Dashboard */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A] mb-3">
              Summary
            </h2>
            <div className="bg-[#F3F3F5] border border-[#E5E5EA] rounded-lg p-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1">
                    Monthly Total
                  </p>
                  <p className="text-lg font-semibold tabular-nums">
                    {formatGBP(summary.monthlyTotal)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1">
                    Yearly Total
                  </p>
                  <p className="text-lg font-semibold tabular-nums">
                    {formatGBP(summary.yearlyTotal)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1">
                    Needed
                  </p>
                  <p className="text-lg font-semibold tabular-nums text-emerald-700">
                    {summary.neededCount}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0] mb-1">
                    To Review
                  </p>
                  <p className={`text-lg font-semibold tabular-nums ${summary.reviewCount > 0 ? "text-[#B45309]" : ""}`}>
                    {summary.reviewCount}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Add Expense Form */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A] mb-3">
              Add Expense
            </h2>
            <form
              onSubmit={handleSubmit}
              className="bg-[#F3F3F5] border border-[#E5E5EA] rounded-lg p-5 space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#7A7A7A] mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Figma, Vercel Pro"
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#7A7A7A] mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    list="expense-categories"
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    placeholder="e.g. Software, Hosting"
                    className={inputClass}
                  />
                  <datalist id="expense-categories">
                    {uniqueCategories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#7A7A7A] mb-1">
                    Amount *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#A0A0A0]">
                      &pound;
                    </span>
                    <input
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={form.amount || ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          amount: parseFloat(e.target.value) || 0,
                        }))
                      }
                      placeholder="0.00"
                      className={`${inputClass} pl-7`}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-[#7A7A7A] mb-1">
                    Frequency
                  </label>
                  <div className="inline-flex rounded-md border border-[#E5E5EA] overflow-hidden w-full">
                    {frequencies.map((freq) => (
                      <button
                        key={freq}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, frequency: freq }))}
                        className={`flex-1 px-3 py-2.5 text-xs font-medium capitalize transition-colors ${
                          form.frequency === freq
                            ? "bg-[#1B1B1B] text-white"
                            : "bg-white text-[#7A7A7A] hover:bg-[#F3F3F5]"
                        }`}
                      >
                        {freq === "one-off" ? "One-off" : freq.charAt(0).toUpperCase() + freq.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#7A7A7A] mb-1">
                    Status
                  </label>
                  <div className="inline-flex rounded-md border border-[#E5E5EA] overflow-hidden w-full">
                    {statuses.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, status: s }))}
                        className={`flex-1 px-3 py-2.5 text-xs font-medium capitalize transition-colors ${
                          form.status === s
                            ? `${statusColors[s].bg} ${statusColors[s].text}`
                            : "bg-white text-[#7A7A7A] hover:bg-[#F3F3F5]"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-[#7A7A7A] mb-1">
                    Notes
                  </label>
                  <input
                    type="text"
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Optional notes"
                    className={inputClass}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !form.name.trim() || form.amount <= 0}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#1B1B1B] text-white text-sm font-medium rounded-md hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <ArrowPathIcon className="size-3.5 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <PlusIcon className="size-3.5" />
                    Add Expense
                  </>
                )}
              </button>
            </form>
          </section>

          {/* Filters */}
          <section>
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex rounded-md border border-[#E5E5EA] overflow-hidden">
                {(["all", ...statuses] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`px-3 py-2 text-xs font-medium capitalize transition-colors ${
                      filterStatus === s
                        ? "bg-[#1B1B1B] text-white"
                        : "bg-white text-[#7A7A7A] hover:bg-[#F3F3F5]"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {uniqueCategories.length > 0 && (
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-2 bg-white border border-[#E5E5EA] rounded-md text-xs focus:outline-none focus:border-[#1B1B1B] transition-colors"
                >
                  <option value="">All categories</option>
                  {uniqueCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
              {(filterStatus !== "all" || filterCategory) && (
                <button
                  onClick={() => {
                    setFilterStatus("all");
                    setFilterCategory("");
                  }}
                  className="text-xs text-[#A0A0A0] hover:text-[#1B1B1B] transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>
          </section>

          {/* Expenses List */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A] mb-3">
              Expenses ({filtered.length})
            </h2>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <ArrowPathIcon className="size-5 animate-spin text-[#A0A0A0]" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-[#F3F3F5] border border-[#E5E5EA] rounded-lg p-8">
                <p className="text-xs text-[#A0A0A0] text-center">
                  {expenses.length === 0
                    ? "No expenses yet — add one above"
                    : "No expenses match filters"}
                </p>
              </div>
            ) : (
              <div className="bg-[#F3F3F5] border border-[#E5E5EA] rounded-lg overflow-hidden">
                {/* Desktop header */}
                <div className="hidden md:grid grid-cols-[1fr_100px_90px_80px_80px_32px] gap-3 px-4 py-2.5 border-b border-[#E5E5EA] bg-[#EDEDEF]">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0]">
                    Name
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0]">
                    Category
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0] text-right">
                    Amount
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0] text-center">
                    Freq
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0] text-center">
                    Status
                  </span>
                  <span />
                </div>

                {/* Rows */}
                <div className="divide-y divide-[#E5E5EA]">
                  {filtered.map((expense) => {
                    const isCut = expense.status === "cut";
                    const sc = statusColors[expense.status];

                    return (
                      <div
                        key={expense.id}
                        className={`px-4 py-3 transition-colors hover:bg-white ${
                          isCut ? "opacity-50" : ""
                        }`}
                      >
                        {/* Desktop row */}
                        <div className="hidden md:grid grid-cols-[1fr_100px_90px_80px_80px_32px] gap-3 items-center">
                          <div className="min-w-0">
                            <p className={`text-sm font-medium truncate ${isCut ? "line-through" : ""}`}>
                              {expense.name}
                            </p>
                            {expense.notes && (
                              <p className="text-[10px] text-[#A0A0A0] truncate">
                                {expense.notes}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-[#7A7A7A] truncate">
                            {expense.category || "—"}
                          </span>
                          <div className="text-right">
                            <span className={`text-sm font-semibold tabular-nums ${isCut ? "line-through" : ""}`}>
                              {formatGBP(Number(expense.amount))}
                            </span>
                            {expense.frequency === "yearly" && (
                              <p className="text-[10px] text-[#A0A0A0] tabular-nums">
                                {formatGBP(Number(expense.amount) / 12)}/mo
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-[#7A7A7A] text-center capitalize">
                            {expense.frequency}
                          </span>
                          <button
                            onClick={() => cycleStatus(expense.id)}
                            className={`inline-flex items-center justify-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${sc.bg} ${sc.text} hover:opacity-80 transition-opacity`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                            {expense.status}
                          </button>
                          <button
                            onClick={() => handleDelete(expense.id)}
                            className="p-1 text-[#A0A0A0] hover:text-red-500 transition-colors"
                            title="Delete"
                          >
                            <TrashIcon className="size-3.5" />
                          </button>
                        </div>

                        {/* Mobile card */}
                        <div className="md:hidden space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className={`text-sm font-medium ${isCut ? "line-through" : ""}`}>
                                {expense.name}
                              </p>
                              {expense.category && (
                                <p className="text-xs text-[#7A7A7A]">
                                  {expense.category}
                                </p>
                              )}
                            </div>
                            <span className={`text-sm font-semibold tabular-nums shrink-0 ${isCut ? "line-through" : ""}`}>
                              {formatGBP(Number(expense.amount))}
                              <span className="text-[10px] text-[#A0A0A0] font-normal">
                                /{expense.frequency === "yearly" ? "yr" : expense.frequency === "monthly" ? "mo" : ""}
                              </span>
                            </span>
                          </div>
                          {expense.notes && (
                            <p className="text-[10px] text-[#A0A0A0]">
                              {expense.notes}
                            </p>
                          )}
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => cycleStatus(expense.id)}
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${sc.bg} ${sc.text}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                              {expense.status}
                            </button>
                            <button
                              onClick={() => handleDelete(expense.id)}
                              className="p-1 text-[#A0A0A0] hover:text-red-500 transition-colors"
                            >
                              <TrashIcon className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
