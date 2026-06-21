"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import {
  expensesStore,
  fmtMoney,
  fmtDateUK,
  deriveExpenseStatus,
} from "@/lib/finance/data";
import {
  EXPENSE_CATEGORY_LABELS,
  type Expense,
  type ExpenseCategory,
  type ExpenseStatus,
} from "@/lib/finance/types";
import { inputClass, selectClass } from "@/lib/form-styles";

const STATUS_BADGE: Record<ExpenseStatus, { bg: string; text: string; label: string }> = {
  due: { bg: "#FEF3C7", text: "#B45309", label: "Due" },
  paid: { bg: "#D1FAE5", text: "#047857", label: "Paid" },
  overdue: { bg: "#FEE2E2", text: "#B91C1C", label: "Overdue" },
  disputed: { bg: "#FEF3C7", text: "#92400E", label: "Disputed" },
};

export default function ExpensesListPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ExpenseStatus>("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | ExpenseCategory>("all");

  useEffect(() => {
    expensesStore.getAll().then((rows) => {
      setExpenses(rows);
      setHydrated(true);
    });
  }, []);

  const enriched = useMemo(
    () => expenses.map((e) => ({ ...e, status: deriveExpenseStatus(e) })),
    [expenses],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return enriched
      .filter((e) => {
        if (statusFilter !== "all" && e.status !== statusFilter) return false;
        if (categoryFilter !== "all" && e.category !== categoryFilter) return false;
        if (!q) return true;
        const hay = `${e.supplier_name} ${e.description || ""}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => (a.date_due > b.date_due ? -1 : 1));
  }, [enriched, statusFilter, categoryFilter, query]);

  /* Build the category pill bar: one pill per category that has rows in
   * the current dataset, ordered by descending count. "All" is always
   * first. Count badge updates as the underlying dataset changes (but
   * is computed before status / search filters apply, so it represents
   * the total available in that category rather than current-view). */
  const categoryPills = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of enriched) {
      counts[e.category] = (counts[e.category] ?? 0) + 1;
    }
    const present = (Object.entries(counts) as [ExpenseCategory, number][])
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1]);
    return [
      { key: "all" as const, label: "All", count: enriched.length },
      ...present.map(([cat, count]) => ({
        key: cat,
        label: EXPENSE_CATEGORY_LABELS[cat],
        count,
      })),
    ];
  }, [enriched]);

  const summary = useMemo(() => {
    // Use UTC throughout so "first of month" doesn't roll back a day
    // in non-UTC timezones (e.g. local midnight May 1 in BST = April 30
    // 23:00 UTC, which would silently include April 30 expenses).
    const now = new Date();
    const monthStartISO = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
    const paidThisMonth = enriched
      .filter((e) => e.status === "paid" && e.date_paid && e.date_paid >= monthStartISO)
      .reduce((s, e) => s + e.amount, 0);
    const due = enriched
      .filter((e) => e.status === "due" || e.status === "overdue")
      .reduce((s, e) => s + e.amount, 0);
    const recurringMonthly = enriched
      .filter((e) => e.recurring === "monthly")
      .reduce((s, e) => s + e.amount, 0);
    return { paidThisMonth, due, recurringMonthly };
  }, [enriched]);

  function exportCSV() {
    const rows = [
      [
        "Supplier",
        "Description",
        "Category",
        "Amount",
        "VAT incl",
        "VAT amount",
        "Due",
        "Paid",
        "Status",
        "Recurring",
      ],
      ...filtered.map((e) => [
        e.supplier_name,
        e.description || "",
        EXPENSE_CATEGORY_LABELS[e.category],
        e.amount.toFixed(2),
        e.vat_included ? "yes" : "no",
        e.vat_amount?.toFixed(2) || "",
        e.date_due,
        e.date_paid || "",
        STATUS_BADGE[e.status].label,
        e.recurring || "",
      ]),
    ];
    const csv = rows
      .map((r) =>
        r
          .map((cell) => {
            const s = String(cell);
            return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <SummaryCard label="Due" amount={summary.due} accent="red" />
        <SummaryCard label="Paid this month" amount={summary.paidThisMonth} />
        <SummaryCard label="Monthly recurring" amount={summary.recurringMonthly} />
      </div>

      {/* Category pill bar - horizontal scroll on narrow viewports, sorted by row count desc */}
      {hydrated && categoryPills.length > 1 && (
        <div className="mb-3 -mx-1 overflow-x-auto">
          <div className="flex items-center gap-1.5 px-1 py-1 min-w-max">
            {categoryPills.map((p) => {
              const active = categoryFilter === p.key;
              return (
                <button
                  key={p.key}
                  onClick={() =>
                    setCategoryFilter(p.key as "all" | ExpenseCategory)
                  }
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                    active
                      ? "bg-white text-[#0C0C0C] border-white"
                      : "bg-[#181818] text-[#E5E5EA] border-[#2A2A2A] hover:bg-[#0C0C0C]"
                  }`}
                >
                  {p.label}
                  <span
                    className={`text-[10px] tabular-nums font-semibold px-1.5 py-0.5 rounded-full ${
                      active ? "bg-[#181818]/20 text-white" : "bg-[#222222] text-[#71757D]"
                    }`}
                  >
                    {p.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-64">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-[#71757D] z-10" />
            <input
              placeholder="Search supplier or description..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={`${inputClass} pl-8`}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | ExpenseStatus)}
            className={`${selectClass} w-36`}
          >
            <option value="all">All statuses</option>
            <option value="due">Due</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="disputed">Disputed</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#181818] border border-[#2A2A2A] text-[#E5E5EA] text-sm rounded-lg hover:bg-[#0C0C0C] disabled:opacity-40 transition-colors"
          >
            <ArrowDownTrayIcon className="size-4" /> CSV
          </button>
          <Link
            href="/finance/expenses/new"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white text-[#0C0C0C] text-sm rounded-lg hover:opacity-90"
          >
            <PlusIcon className="size-4" /> New expense
          </Link>
        </div>
      </div>

      {!hydrated ? (
        <div className="h-48 bg-[#0C0C0C] rounded-xl animate-pulse" />
      ) : filtered.length === 0 ? (
        <div className="bg-[#181818] border border-dashed border-[#2A2A2A] rounded-xl p-12 text-center">
          <p className="text-sm text-[#71757D] mb-3">
            {expenses.length === 0
              ? "No expenses yet - log your first one."
              : "No expenses match these filters."}
          </p>
          {expenses.length === 0 && (
            <Link
              href="/finance/expenses/new"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white text-[#0C0C0C] text-sm rounded-lg hover:opacity-90"
            >
              <PlusIcon className="size-4" /> New expense
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-[#181818] border border-[#2A2A2A] rounded-xl overflow-x-auto shadow-[var(--shadow-soft)]">
          <table className="w-full text-sm">
            <thead className="bg-[#0C0C0C] text-[11px] uppercase tracking-wider text-[#71757D]">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Supplier</th>
                <th className="text-left px-4 py-3 font-semibold">Category</th>
                <th className="text-left px-4 py-3 font-semibold">Due</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-right px-4 py-3 font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => {
                const badge = STATUS_BADGE[e.status];
                return (
                  <tr key={e.id} className="border-t border-[#2A2A2A] hover:bg-[#0C0C0C]">
                    <td className="px-4 py-3">
                      <Link
                        href={`/finance/expenses/${e.id}`}
                        className="font-medium text-[#E5E5EA] hover:underline"
                      >
                        {e.supplier_name}
                      </Link>
                      {e.recurring && (
                        <span className="ml-2 text-[10px] uppercase tracking-wider text-[#71757D]">
                          {e.recurring}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#71757D]">
                      {EXPENSE_CATEGORY_LABELS[e.category]}
                    </td>
                    <td className="px-4 py-3 text-[#71757D]">{fmtDateUK(e.date_due)}</td>
                    <td className="px-4 py-3">
                      <span
                        className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded"
                        style={{ background: badge.bg, color: badge.text }}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[#E5E5EA] tabular-nums">
                      {fmtMoney(e.amount)}
                      {e.vat_included && (
                        <div className="text-[10px] text-[#71757D]">incl VAT</div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  amount,
  accent,
}: {
  label: string;
  amount: number;
  accent?: "red";
}) {
  const color = accent === "red" ? "text-[#B91C1C]" : "text-[#E5E5EA]";
  return (
    <div className="bg-[#181818] border border-[#2A2A2A] rounded-xl p-4 shadow-[var(--shadow-soft)]">
      <div className="text-[11px] uppercase tracking-wider text-[#71757D] mb-1">{label}</div>
      <div className={`text-2xl font-semibold tabular-nums ${color}`}>{fmtMoney(amount)}</div>
    </div>
  );
}
