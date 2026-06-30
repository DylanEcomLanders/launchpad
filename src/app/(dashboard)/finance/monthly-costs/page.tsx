"use client";

import { useEffect, useMemo, useState } from "react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { monthlyCostsStore, fmtMoney, fmtMoneyShort, uid, nowISO } from "@/lib/finance/data";
import {
  EXPENSE_CATEGORY_LABELS,
  type MonthlyCost,
  type ExpenseCategory,
  type RecurringFrequency,
} from "@/lib/finance/types";
import { inputClass, selectClass } from "@/lib/form-styles";

const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  annual: "Annual",
};

/* Normalise any frequency to a per-month figure. */
function toMonthly(amount: number, frequency: RecurringFrequency): number {
  if (frequency === "quarterly") return amount / 3;
  if (frequency === "annual") return amount / 12;
  return amount;
}

const CATEGORY_OPTIONS = Object.entries(EXPENSE_CATEGORY_LABELS) as [
  ExpenseCategory,
  string,
][];

export default function MonthlyCostsPage() {
  const [items, setItems] = useState<MonthlyCost[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const [draftName, setDraftName] = useState("");
  const [draftAmount, setDraftAmount] = useState("");
  const [draftFreq, setDraftFreq] = useState<RecurringFrequency>("monthly");
  const [draftCategory, setDraftCategory] = useState<ExpenseCategory>("software");

  useEffect(() => {
    monthlyCostsStore
      .getAll()
      .then((rows) => setItems(rows))
      .catch(() => setLoadError(true))
      .finally(() => setHydrated(true));
  }, []);

  /* ── Mutations (optimistic local + background persist) ── */

  function patchLocal(id: string, changes: Partial<MonthlyCost>) {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...changes } : it)),
    );
  }

  function persist(id: string, changes: Partial<MonthlyCost>) {
    monthlyCostsStore
      .update(id, { ...changes, updated_at: nowISO() })
      .catch((e) => console.error("monthly-costs update failed", e));
  }

  function addCost() {
    const name = draftName.trim();
    if (!name) return;
    const item: MonthlyCost = {
      id: uid(),
      name,
      category: draftCategory,
      amount: Number(draftAmount) || 0,
      frequency: draftFreq,
      active: true,
      created_at: nowISO(),
    };
    setItems((prev) => [item, ...prev]);
    monthlyCostsStore
      .create(item)
      .catch((e) => console.error("monthly-costs create failed", e));
    setDraftName("");
    setDraftAmount("");
  }

  function removeCost(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
    monthlyCostsStore
      .remove(id)
      .catch((e) => console.error("monthly-costs remove failed", e));
  }

  /* ── Totals ── */

  const active = useMemo(() => items.filter((i) => i.active), [items]);

  const monthlyTotal = useMemo(
    () => active.reduce((sum, i) => sum + toMonthly(i.amount, i.frequency), 0),
    [active],
  );
  const annualTotal = monthlyTotal * 12;

  const byCategory = useMemo(() => {
    const map: Partial<Record<ExpenseCategory, number>> = {};
    for (const i of active) {
      map[i.category] = (map[i.category] || 0) + toMonthly(i.amount, i.frequency);
    }
    return (Object.entries(map) as [ExpenseCategory, number][]).sort(
      (a, b) => b[1] - a[1],
    );
  }, [active]);

  return (
    <div className="space-y-6">
      {/* Page intro */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Monthly costs</h2>
        <p className="text-sm text-subtle mt-0.5">
          Your fixed recurring outgoings, normalised to a monthly figure. A
          quick read on burn, separate from the invoice ledger.
        </p>
      </div>

      {loadError && (
        <div className="rounded-lg border border-[#92400E] bg-amber-500/10 px-4 py-3 text-xs text-[#92400E]">
          Couldn&apos;t load saved costs. The{" "}
          <code className="font-mono">finance_monthly_costs</code> table may need
          migration 026 applied. You can still calculate below, but changes
          won&apos;t persist until then.
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-surface text-foreground p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1">
            Total per month
          </p>
          <p className="text-3xl font-bold tabular-nums">
            {fmtMoneyShort(monthlyTotal)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-subtle mb-1">
            Per year
          </p>
          <p className="text-3xl font-bold tabular-nums text-foreground">
            {fmtMoneyShort(annualTotal)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-subtle mb-1">
            Active lines
          </p>
          <p className="text-3xl font-bold tabular-nums text-foreground">
            {active.length}
          </p>
        </div>
      </div>

      {/* Category breakdown */}
      {byCategory.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-subtle mb-3">
            By category, per month
          </p>
          <div className="space-y-2.5">
            {byCategory.map(([cat, total]) => (
              <div key={cat} className="flex items-center gap-3">
                <span className="text-xs text-foreground w-40 shrink-0 truncate">
                  {EXPENSE_CATEGORY_LABELS[cat]}
                </span>
                <div className="flex-1 h-2 bg-surface-raised rounded-full overflow-hidden">
                  <div
                    className="h-full bg-surface rounded-full"
                    style={{
                      width: `${monthlyTotal > 0 ? (total / monthlyTotal) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="text-xs font-semibold tabular-nums text-foreground w-20 text-right shrink-0">
                  {fmtMoney(total)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add a cost */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="flex flex-col md:flex-row gap-2 md:items-end">
          <div className="flex-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-subtle mb-1.5">
              Cost
            </label>
            <input
              className={inputClass}
              placeholder="e.g. Figma, office rent, Dan salary"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCost()}
            />
          </div>
          <div className="w-full md:w-44">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-subtle mb-1.5">
              Category
            </label>
            <select
              className={selectClass}
              value={draftCategory}
              onChange={(e) => setDraftCategory(e.target.value as ExpenseCategory)}
            >
              {CATEGORY_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full md:w-32">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-subtle mb-1.5">
              Amount
            </label>
            <input
              className={inputClass}
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={draftAmount}
              onChange={(e) => setDraftAmount(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCost()}
            />
          </div>
          <div className="w-full md:w-36">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-subtle mb-1.5">
              Frequency
            </label>
            <select
              className={selectClass}
              value={draftFreq}
              onChange={(e) => setDraftFreq(e.target.value as RecurringFrequency)}
            >
              {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={addCost}
            disabled={!draftName.trim()}
            className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white text-background text-sm font-semibold rounded-lg hover:bg-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <PlusIcon className="size-4" />
            Add
          </button>
        </div>
      </div>

      {/* List */}
      {hydrated && items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
          <p className="text-sm text-subtle">
            No costs yet. Add your recurring outgoings above to see your monthly
            burn.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          {/* Header (desktop) */}
          <div className="hidden md:grid grid-cols-[1fr_160px_120px_140px_110px_44px] gap-3 px-4 py-2.5 border-b border-border bg-background">
            {["Cost", "Category", "Amount", "Frequency", "Per month", ""].map(
              (h, i) => (
                <span
                  key={i}
                  className={`text-[10px] font-bold uppercase tracking-wider text-subtle ${i === 4 ? "text-right" : ""}`}
                >
                  {h}
                </span>
              ),
            )}
          </div>

          <div className="divide-y divide-border">
            {items.map((it) => (
              <div
                key={it.id}
                className={`grid grid-cols-2 md:grid-cols-[1fr_160px_120px_140px_110px_44px] gap-2 md:gap-3 px-4 py-3 md:items-center ${it.active ? "" : "opacity-50"}`}
              >
                {/* Name */}
                <input
                  className="col-span-2 md:col-span-1 w-full bg-transparent text-sm font-medium text-foreground focus:outline-none focus:bg-background rounded px-1 py-1 -mx-1"
                  value={it.name}
                  onChange={(e) => patchLocal(it.id, { name: e.target.value })}
                  onBlur={(e) => persist(it.id, { name: e.target.value.trim() })}
                />
                {/* Category */}
                <select
                  className="w-full bg-transparent text-xs text-subtle focus:outline-none rounded px-1 py-1 cursor-pointer hover:bg-background"
                  value={it.category}
                  onChange={(e) => {
                    const category = e.target.value as ExpenseCategory;
                    patchLocal(it.id, { category });
                    persist(it.id, { category });
                  }}
                >
                  {CATEGORY_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                {/* Amount */}
                <div className="flex items-center gap-1">
                  <span className="text-xs text-subtle">£</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    className="w-full bg-transparent text-sm tabular-nums text-foreground focus:outline-none focus:bg-background rounded px-1 py-1"
                    value={it.amount}
                    onChange={(e) =>
                      patchLocal(it.id, { amount: Number(e.target.value) || 0 })
                    }
                    onBlur={(e) =>
                      persist(it.id, { amount: Number(e.target.value) || 0 })
                    }
                  />
                </div>
                {/* Frequency */}
                <select
                  className="w-full bg-transparent text-xs text-subtle focus:outline-none rounded px-1 py-1 cursor-pointer hover:bg-background"
                  value={it.frequency}
                  onChange={(e) => {
                    const frequency = e.target.value as RecurringFrequency;
                    patchLocal(it.id, { frequency });
                    persist(it.id, { frequency });
                  }}
                >
                  {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                {/* Per month */}
                <span className="text-sm font-semibold tabular-nums text-foreground md:text-right">
                  {fmtMoney(toMonthly(it.amount, it.frequency))}
                  <span className="md:hidden text-[10px] font-normal text-subtle">
                    {" "}
                    / mo
                  </span>
                </span>
                {/* Actions */}
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => {
                      patchLocal(it.id, { active: !it.active });
                      persist(it.id, { active: !it.active });
                    }}
                    title={it.active ? "Pause (exclude from totals)" : "Activate"}
                    className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded transition-colors ${
                      it.active
                        ? "text-subtle hover:bg-surface-raised"
                        : "text-warning bg-amber-500/15"
                    }`}
                  >
                    {it.active ? "On" : "Off"}
                  </button>
                  <button
                    onClick={() => removeCost(it.id)}
                    title="Remove"
                    className="text-muted hover:text-danger transition-colors"
                  >
                    <TrashIcon className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
