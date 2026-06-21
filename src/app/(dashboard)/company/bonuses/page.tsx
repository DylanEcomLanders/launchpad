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
      <div className="px-4 sm:px-6 py-8">
        <div className="h-96 animate-pulse rounded-2xl bg-[#181818]" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link
        href="/company"
        className="inline-flex items-center gap-1.5 text-xs text-[#71757D] hover:text-[#E5E5EA]"
      >
        <ArrowLeftIcon className="size-3.5" />
        Back to Admin
      </Link>

      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-[#E5E5EA]">All bonuses</h2>
          <p className="text-xs text-[#71757D] mt-1">
            Every bonus logged across every Person. Scheduled = paid_at in the future, paid = paid_at today or earlier.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value as "all" | BonusKind)}
            className="text-sm bg-[#0C0C0C] text-[#E5E5EA] border border-[#2A2A2A] rounded-md px-3 py-2"
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
            className="text-sm bg-[#0C0C0C] text-[#E5E5EA] border border-[#2A2A2A] rounded-md px-3 py-2"
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
              className="bg-[#181818] border border-[#2A2A2A] rounded-xl p-5"
            >
              <div className="text-[10px] uppercase tracking-wider text-[#71757D] mb-2">
                {cur}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-[#71757D]">Paid</div>
                  <div className="text-lg font-semibold text-emerald-300 tabular-nums">
                    {fmtMoney(t.paid, cur)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#71757D]">Scheduled</div>
                  <div className="text-lg font-semibold text-amber-300 tabular-nums">
                    {fmtMoney(t.scheduled, cur)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-[#181818] border border-[#2A2A2A] rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-5 py-8 text-center text-xs text-[#71757D]">
            No bonuses match the current filters.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#0C0C0C] text-[10px] uppercase tracking-wider text-[#71757D]">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Paid</th>
                <th className="text-left px-4 py-3 font-semibold">Who</th>
                <th className="text-left px-4 py-3 font-semibold">Kind</th>
                <th className="text-left px-4 py-3 font-semibold">Reason</th>
                <th className="text-right px-4 py-3 font-semibold">Amount</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => {
                const scheduled = b.paid_at > today;
                return (
                  <tr
                    key={b.id}
                    className="border-t border-[#2A2A2A] hover:bg-[#0C0C0C]"
                  >
                    <td className="px-4 py-2.5 text-[#71757D] tabular-nums whitespace-nowrap">
                      {fmtDateUK(b.paid_at)}
                    </td>
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/company/people/${b.person_id}?tab=bonuses`}
                        className="text-[#E5E5EA] hover:underline"
                      >
                        {b.person_name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-[#71757D]">
                      {b.kind === "contractor_scheme"
                        ? "Scheme"
                        : b.kind === "revenue_tier"
                        ? `Tier${b.tier ? ` ${b.tier}k` : ""}`
                        : "Ad-hoc"}
                    </td>
                    <td className="px-4 py-2.5 text-[#E5E5EA] truncate max-w-md">
                      {b.reason}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-emerald-300 tabular-nums whitespace-nowrap">
                      {fmtMoney(b.amount, b.currency)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          scheduled
                            ? "bg-amber-500/15 text-amber-300"
                            : "bg-emerald-500/15 text-emerald-300"
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
        )}
      </div>
    </div>
  );
}
