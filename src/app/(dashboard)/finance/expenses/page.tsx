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
import { Table, THead, TBody, TR, TH, TD, Num, Badge } from "@/components/ui";

/* Status = the only colour in the table body: a quiet Badge (subtle bg,
 * muted text, one leading dot). All statuses share the pill shape. */
type StatusTone = "success" | "warning" | "danger" | "neutral";
const STATUS_TONE: Record<ExpenseStatus, StatusTone> = {
  due: "warning",
  paid: "success",
  overdue: "danger",
  disputed: "neutral",
};
const STATUS_LABEL: Record<ExpenseStatus, string> = {
  due: "Due",
  paid: "Paid",
  overdue: "Overdue",
  disputed: "Disputed",
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
        STATUS_LABEL[e.status],
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
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <SummaryCard label="Due" amount={summary.due} accent="red" />
        <SummaryCard label="Paid this month" amount={summary.paidThisMonth} />
        <SummaryCard label="Monthly recurring" amount={summary.recurringMonthly} />
      </div>

      {/* Toolbar: count + filters left, search right. One quiet row. */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-subtle tabular-nums mr-1">
            {filtered.length} of {enriched.length}
          </span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as "all" | ExpenseCategory)}
            className="h-8 px-2.5 rounded-md border border-border bg-surface text-xs text-muted appearance-none focus:outline-none focus:border-foreground max-w-[180px]"
          >
            {categoryPills.map((p) => (
              <option key={p.key} value={p.key}>
                {p.key === "all" ? "All categories" : p.label} ({p.count})
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | ExpenseStatus)}
            className="h-8 px-2.5 rounded-md border border-border bg-surface text-xs text-muted appearance-none focus:outline-none focus:border-foreground"
          >
            <option value="all">All statuses</option>
            <option value="due">Due</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="disputed">Disputed</option>
          </select>
          <button
            onClick={exportCSV}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-surface text-xs text-muted hover:bg-surface-raised hover:text-foreground disabled:opacity-40 transition-colors"
          >
            <ArrowDownTrayIcon className="size-3.5" /> CSV
          </button>
          <Link
            href="/finance/expenses/new"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-surface text-xs text-muted hover:bg-surface-raised hover:text-foreground transition-colors"
          >
            <PlusIcon className="size-3.5" /> New expense
          </Link>
        </div>
        <div className="relative w-full md:w-64">
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-subtle z-10" />
          <input
            placeholder="Search supplier or description"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 w-full pl-8 pr-3 rounded-md border border-border bg-surface text-xs text-muted placeholder:text-subtle focus:outline-none focus:border-foreground"
          />
        </div>
      </div>

      {!hydrated ? (
        <div className="h-48 bg-surface rounded-md border border-border-faint animate-pulse" />
      ) : filtered.length === 0 ? (
        <div className="bg-surface border border-border-faint rounded-md py-16 text-center">
          <p className="text-sm text-subtle">
            {expenses.length === 0 ? "No expenses yet." : "No expenses match these filters."}
          </p>
          {expenses.length === 0 && (
            <Link
              href="/finance/expenses/new"
              className="mt-3 inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-surface text-xs text-muted hover:bg-surface-raised hover:text-foreground transition-colors"
            >
              <PlusIcon className="size-3.5" /> New expense
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-surface border border-border-faint rounded-md overflow-x-auto">
          <Table>
            <THead>
              <TR hover={false}>
                <TH>Supplier</TH>
                <TH>Category</TH>
                <TH>Due</TH>
                <TH>Status</TH>
                <TH align="right">Amount</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.map((e) => (
                <TR key={e.id}>
                  <TD className="max-w-[240px]">
                    <Link
                      href={`/finance/expenses/${e.id}`}
                      className="text-foreground hover:underline truncate block"
                    >
                      {e.supplier_name}
                      {e.recurring && (
                        <span className="ml-2 text-2xs text-subtle">{e.recurring}</span>
                      )}
                    </Link>
                  </TD>
                  <TD className="text-muted truncate max-w-[160px]">
                    {EXPENSE_CATEGORY_LABELS[e.category]}
                  </TD>
                  <TD className="text-muted"><Num>{fmtDateUK(e.date_due)}</Num></TD>
                  <TD>
                    <Badge tone={STATUS_TONE[e.status]}>{STATUS_LABEL[e.status]}</Badge>
                  </TD>
                  <TD align="right" className="text-muted">
                    <Num>{fmtMoney(e.amount)}</Num>
                    {e.vat_included && <span className="ml-1.5 text-2xs text-subtle">inc VAT</span>}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
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
  const color = accent === "red" ? "text-status-late" : "text-foreground";
  return (
    <div className="bg-surface border border-border-faint rounded-md p-5">
      <div className="text-2xs uppercase tracking-wider text-subtle font-medium">{label}</div>
      <div className={`mt-2 text-xl font-semibold tabular-nums tracking-tight ${color}`}>{fmtMoney(amount)}</div>
    </div>
  );
}
