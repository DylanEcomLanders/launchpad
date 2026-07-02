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

const STATUS_BADGE: Record<ExpenseStatus, { cls: string; label: string }> = {
  due: { cls: "bg-warning/10 text-warning", label: "Due" },
  paid: { cls: "bg-success/10 text-success", label: "Paid" },
  overdue: { cls: "bg-danger/10 text-danger", label: "Overdue" },
  disputed: { cls: "bg-warning/10 text-warning", label: "Disputed" },
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
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <SummaryCard label="Due" amount={summary.due} accent="red" />
        <SummaryCard label="Paid this month" amount={summary.paidThisMonth} />
        <SummaryCard label="Monthly recurring" amount={summary.recurringMonthly} />
      </div>

      {/* Category filter - quiet chips, count beside each */}
      {hydrated && categoryPills.length > 1 && (
        <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex items-center gap-0.5 min-w-max">
            {categoryPills.map((p) => {
              const active = categoryFilter === p.key;
              return (
                <button
                  key={p.key}
                  onClick={() => setCategoryFilter(p.key as "all" | ExpenseCategory)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-2xs font-medium transition-colors ${
                    active ? "bg-surface-raised text-foreground" : "text-muted hover:text-foreground hover:bg-surface-raised"
                  }`}
                >
                  {p.label}
                  <span className="tabular-nums text-subtle">{p.count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-64">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-subtle z-10" />
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
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface border border-border text-foreground text-xs rounded-md hover:bg-surface-raised disabled:opacity-40 transition-colors"
          >
            <ArrowDownTrayIcon className="size-4" /> CSV
          </button>
          <Link
            href="/finance/expenses/new"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-foreground text-background text-xs font-medium rounded-md hover:opacity-90"
          >
            <PlusIcon className="size-4" /> New expense
          </Link>
        </div>
      </div>

      {!hydrated ? (
        <div className="h-48 bg-surface rounded-lg border border-border animate-pulse" />
      ) : filtered.length === 0 ? (
        <div className="bg-surface border border-border rounded-lg p-12 text-center">
          <p className="text-sm text-subtle mb-3">
            {expenses.length === 0
              ? "No expenses yet. Log your first one."
              : "No expenses match these filters."}
          </p>
          {expenses.length === 0 && (
            <Link
              href="/finance/expenses/new"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-foreground text-background text-xs font-medium rounded-md hover:opacity-90"
            >
              <PlusIcon className="size-4" /> New expense
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-lg overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dashed border-border">
                <th className="text-left px-5 py-3 text-2xs uppercase tracking-wider font-medium text-subtle">Supplier</th>
                <th className="text-left px-5 py-3 text-2xs uppercase tracking-wider font-medium text-subtle">Category</th>
                <th className="text-left px-5 py-3 text-2xs uppercase tracking-wider font-medium text-subtle">Due</th>
                <th className="text-left px-5 py-3 text-2xs uppercase tracking-wider font-medium text-subtle">Status</th>
                <th className="text-right px-5 py-3 text-2xs uppercase tracking-wider font-medium text-subtle">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => {
                const badge = STATUS_BADGE[e.status];
                return (
                  <tr key={e.id} className="border-b border-dashed border-border last:border-0 hover:bg-surface-hover transition-colors">
                    <td className="px-5 py-3">
                      <Link
                        href={`/finance/expenses/${e.id}`}
                        className="text-sm text-foreground hover:underline"
                      >
                        {e.supplier_name}
                      </Link>
                      {e.recurring && (
                        <span className="ml-2 text-2xs uppercase tracking-wider text-subtle">{e.recurring}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted">{EXPENSE_CATEGORY_LABELS[e.category]}</td>
                    <td className="px-5 py-3 text-xs text-muted tabular-nums">{fmtDateUK(e.date_due)}</td>
                    <td className="px-5 py-3">
                      <span className={`text-2xs uppercase tracking-wider font-medium px-2 py-0.5 rounded ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-sm text-foreground tabular-nums">
                      {fmtMoney(e.amount)}
                      {e.vat_included && <div className="text-2xs text-subtle">incl VAT</div>}
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
  const color = accent === "red" ? "text-danger" : "text-foreground";
  return (
    <div className="bg-surface border border-border rounded-lg p-5">
      <div className="text-2xs uppercase tracking-wider text-subtle font-medium">{label}</div>
      <div className={`mt-2 text-xl font-semibold tabular-nums tracking-tight ${color}`}>{fmtMoney(amount)}</div>
    </div>
  );
}
