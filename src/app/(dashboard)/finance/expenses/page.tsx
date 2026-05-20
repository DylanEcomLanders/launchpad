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

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-64">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-[#7A7A7A] z-10" />
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
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as "all" | ExpenseCategory)}
            className={`${selectClass} w-44`}
          >
            <option value="all">All categories</option>
            {Object.entries(EXPENSE_CATEGORY_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E5E5EA] text-[#1B1B1B] text-sm rounded-lg hover:bg-[#F7F8FA] disabled:opacity-40 transition-colors"
          >
            <ArrowDownTrayIcon className="size-4" /> CSV
          </button>
          <Link
            href="/finance/expenses/new"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#1B1B1B] text-white text-sm rounded-lg hover:opacity-90"
          >
            <PlusIcon className="size-4" /> New expense
          </Link>
        </div>
      </div>

      {!hydrated ? (
        <div className="h-48 bg-[#F7F8FA] rounded-xl animate-pulse" />
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-[#E5E5EA] rounded-xl p-12 text-center">
          <p className="text-sm text-[#7A7A7A] mb-3">
            {expenses.length === 0
              ? "No expenses yet — log your first one."
              : "No expenses match these filters."}
          </p>
          {expenses.length === 0 && (
            <Link
              href="/finance/expenses/new"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#1B1B1B] text-white text-sm rounded-lg hover:opacity-90"
            >
              <PlusIcon className="size-4" /> New expense
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white border border-[#E5E5EA] rounded-xl overflow-x-auto shadow-[var(--shadow-soft)]">
          <table className="w-full text-sm">
            <thead className="bg-[#F7F8FA] text-[11px] uppercase tracking-wider text-[#7A7A7A]">
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
                  <tr key={e.id} className="border-t border-[#E5E5EA] hover:bg-[#F7F8FA]">
                    <td className="px-4 py-3">
                      <Link
                        href={`/finance/expenses/${e.id}`}
                        className="font-medium text-[#1B1B1B] hover:underline"
                      >
                        {e.supplier_name}
                      </Link>
                      {e.recurring && (
                        <span className="ml-2 text-[10px] uppercase tracking-wider text-[#7A7A7A]">
                          {e.recurring}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#7A7A7A]">
                      {EXPENSE_CATEGORY_LABELS[e.category]}
                    </td>
                    <td className="px-4 py-3 text-[#7A7A7A]">{fmtDateUK(e.date_due)}</td>
                    <td className="px-4 py-3">
                      <span
                        className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded"
                        style={{ background: badge.bg, color: badge.text }}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[#1B1B1B] tabular-nums">
                      {fmtMoney(e.amount)}
                      {e.vat_included && (
                        <div className="text-[10px] text-[#A0A0A0]">incl VAT</div>
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
  const color = accent === "red" ? "text-[#B91C1C]" : "text-[#1B1B1B]";
  return (
    <div className="bg-white border border-[#E5E5EA] rounded-xl p-4 shadow-[var(--shadow-soft)]">
      <div className="text-[11px] uppercase tracking-wider text-[#7A7A7A] mb-1">{label}</div>
      <div className={`text-2xl font-semibold tabular-nums ${color}`}>{fmtMoney(amount)}</div>
    </div>
  );
}
