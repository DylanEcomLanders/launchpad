"use client";

/* ── /company/bonuses - global bonus log ──
 *
 * Cross-person view of every BonusPayment.bonus_payments entry from
 * every Person. Aggregates totals per currency, splits scheduled vs
 * paid (per the bonus-month+1 model), filters by kind. Lives outside
 * the top-tab nav (reachable via Inbox + Person profile Bonuses
 * tabs), so finance can pull it when they need a quarterly view.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { peopleStore, fmtDateUK, fmtMoney } from "@/lib/company/data";
import type { BonusKind, BonusPayment, Person } from "@/lib/company/types";
import { selectClass } from "@/lib/form-styles";

interface BonusRow extends BonusPayment {
  person_name: string;
  person_id: string;
}

export default function GlobalBonusesPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [kindFilter, setKindFilter] = useState<"all" | BonusKind>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "scheduled" | "paid">(
    "all",
  );

  useEffect(() => {
    peopleStore.getAll().then((rows) => {
      setPeople(rows);
      setHydrated(true);
    });
  }, []);

  const rows = useMemo<BonusRow[]>(() => {
    const out: BonusRow[] = [];
    for (const p of people) {
      for (const b of p.bonus_payments || []) {
        out.push({ ...b, person_name: p.full_name, person_id: p.id });
      }
    }
    return out.sort((a, b) => b.paid_at.localeCompare(a.paid_at));
  }, [people]);

  const today = new Date().toISOString().slice(0, 10);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (kindFilter !== "all" && r.kind !== kindFilter) return false;
      if (statusFilter === "scheduled" && r.paid_at <= today) return false;
      if (statusFilter === "paid" && r.paid_at > today) return false;
      return true;
    });
  }, [rows, kindFilter, statusFilter, today]);

  const totals = useMemo(() => {
    const byCurrency = new Map<string, { scheduled: number; paid: number }>();
    for (const r of filtered) {
      const cur = byCurrency.get(r.currency) || { scheduled: 0, paid: 0 };
      if (r.paid_at > today) cur.scheduled += r.amount;
      else cur.paid += r.amount;
      byCurrency.set(r.currency, cur);
    }
    return Array.from(byCurrency.entries());
  }, [filtered, today]);

  if (!hydrated) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-56 bg-surface rounded-lg animate-pulse" />
        <div className="h-96 bg-surface rounded-lg border border-border animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Link
        href="/company"
        className="inline-flex items-center gap-1.5 text-xs text-subtle hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3.5" />
        Back to Admin
      </Link>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">All bonuses</h2>
          <p className="text-2xs text-subtle mt-0.5">
            Every bonus logged across every Person. Scheduled = paid_at in the future, paid = paid_at today or earlier.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value as "all" | BonusKind)}
            className={`${selectClass} w-40`}
          >
            <option value="all">All kinds</option>
            <option value="contractor_scheme">Contractor scheme</option>
            <option value="revenue_tier">Revenue tier</option>
            <option value="adhoc">Ad-hoc</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "all" | "scheduled" | "paid")
            }
            className={`${selectClass} w-36`}
          >
            <option value="all">All statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </div>

      {/* Totals per currency */}
      {totals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {totals.map(([cur, t]) => (
            <div
              key={cur}
              className="bg-surface border border-border rounded-lg p-5"
            >
              <div className="text-2xs uppercase tracking-wider text-subtle font-medium mb-3">
                {cur}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-raised rounded-md p-3">
                  <div className="text-2xs uppercase tracking-wider text-subtle font-medium">Paid</div>
                  <div className="mt-1.5 text-lg font-semibold text-success tabular-nums tracking-tight leading-none">
                    {fmtMoney(t.paid, cur)}
                  </div>
                </div>
                <div className="bg-surface-raised rounded-md p-3">
                  <div className="text-2xs uppercase tracking-wider text-subtle font-medium">Scheduled</div>
                  <div className="mt-1.5 text-lg font-semibold text-warning tabular-nums tracking-tight leading-none">
                    {fmtMoney(t.scheduled, cur)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-surface border border-border rounded-lg p-12 text-center">
          <p className="text-sm text-subtle">No bonuses match the current filters.</p>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-lg overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dashed border-border">
                <th className="text-left px-5 py-3 text-2xs uppercase tracking-wider font-medium text-subtle">Paid</th>
                <th className="text-left px-5 py-3 text-2xs uppercase tracking-wider font-medium text-subtle">Who</th>
                <th className="text-left px-5 py-3 text-2xs uppercase tracking-wider font-medium text-subtle">Kind</th>
                <th className="text-left px-5 py-3 text-2xs uppercase tracking-wider font-medium text-subtle">Reason</th>
                <th className="text-right px-5 py-3 text-2xs uppercase tracking-wider font-medium text-subtle">Amount</th>
                <th className="text-left px-5 py-3 text-2xs uppercase tracking-wider font-medium text-subtle">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => {
                const scheduled = b.paid_at > today;
                return (
                  <tr
                    key={b.id}
                    className="border-b border-dashed border-border last:border-0 hover:bg-surface-hover transition-colors"
                  >
                    <td className="px-5 py-3 text-xs text-muted tabular-nums whitespace-nowrap">
                      {fmtDateUK(b.paid_at)}
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/company/people/${b.person_id}?tab=bonuses`}
                        className="text-sm text-foreground hover:underline"
                      >
                        {b.person_name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-2xs uppercase tracking-wider text-subtle">
                      {b.kind === "contractor_scheme"
                        ? "Scheme"
                        : b.kind === "revenue_tier"
                        ? `Tier${b.tier ? ` ${b.tier}k` : ""}`
                        : "Ad-hoc"}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted truncate max-w-md">
                      {b.reason}
                    </td>
                    <td className="px-5 py-3 text-right text-sm font-medium text-success tabular-nums whitespace-nowrap">
                      {fmtMoney(b.amount, b.currency)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-2xs uppercase tracking-wider font-medium px-2 py-0.5 rounded ${
                          scheduled
                            ? "bg-warning/10 text-warning"
                            : "bg-success/10 text-success"
                        }`}
                      >
                        {scheduled ? "Scheduled" : "Paid"}
                      </span>
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
