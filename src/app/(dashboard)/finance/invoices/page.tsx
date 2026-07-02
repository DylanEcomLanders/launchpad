"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import {
  invoicesIssuedStore,
  fmtMoney,
  fmtDateUK,
  deriveInvoiceStatus,
} from "@/lib/finance/data";
import {
  INVOICE_STATUS_BADGE,
  INVOICE_STATUS_LABELS,
  type InvoiceIssued,
  type InvoiceStatus,
} from "@/lib/finance/types";
import { calculateVatBreakdown } from "@/lib/finance/vat";
import { inputClass, selectClass } from "@/lib/form-styles";

type SortKey = "invoice_date" | "due_date" | "client_name" | "total" | "status";

interface EnrichedInvoice extends InvoiceIssued {
  total: number;
}

/* "uk" = client_country === "GB" (or blank, since GB is the default for
 * legacy rows). "intl" = anything else. "all" = no filter. Plus per-country
 * codes (USD invoices to "US", etc) for finer slicing. */
type CountryFilter = "all" | "uk" | "intl" | string;

export default function ReceivablesListPage() {
  const [invoices, setInvoices] = useState<InvoiceIssued[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | InvoiceStatus>("all");
  const [vatFilter, setVatFilter] = useState<"all" | "vat" | "no_vat">("all");
  const [countryFilter, setCountryFilter] = useState<CountryFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("invoice_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    invoicesIssuedStore.getAll().then((rows) => {
      setInvoices(rows);
      setHydrated(true);
    });
  }, []);

  const enriched: EnrichedInvoice[] = useMemo(
    () =>
      invoices.map((i) => {
        const b = calculateVatBreakdown(i.items, i.vat_treatment, i.vat_amount_override);
        return { ...i, status: deriveInvoiceStatus(i), total: b.total };
      }),
    [invoices],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = enriched.filter((i) => {
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      const treatmentHasVat =
        i.vat_treatment === "standard_20" ||
        i.vat_treatment === "inclusive_20" ||
        i.vat_treatment === "manual";
      if (vatFilter === "vat" && !treatmentHasVat) return false;
      if (vatFilter === "no_vat" && treatmentHasVat) return false;
      const country = (i.client_country || "GB").toUpperCase();
      if (countryFilter === "uk" && country !== "GB") return false;
      if (countryFilter === "intl" && country === "GB") return false;
      if (
        countryFilter !== "all" &&
        countryFilter !== "uk" &&
        countryFilter !== "intl" &&
        country !== countryFilter
      )
        return false;
      if (!q) return true;
      const hay = `${i.invoice_number} ${i.client_name}`.toLowerCase();
      return hay.includes(q);
    });
    rows = [...rows].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
    return rows;
  }, [enriched, statusFilter, vatFilter, query, sortKey, sortDir]);

  const summary = useMemo(() => {
    // Always sum in GBP using the stored gbp_equivalent (snapshot from
    // source statement). Mixing native currencies would be meaningless.
    const sumGbp = (rows: typeof enriched) =>
      rows.reduce((s, i) => s + (i.gbp_equivalent ?? i.total), 0);
    const outstanding = sumGbp(
      enriched.filter((i) => i.status === "sent" || i.status === "overdue"),
    );
    const overdue = sumGbp(enriched.filter((i) => i.status === "overdue"));
    // Use UTC throughout so "first of month" doesn't roll back a day
    // in non-UTC timezones (e.g. local midnight May 1 in BST = April 30
    // 23:00 UTC, which would silently include April 30 invoices).
    const now = new Date();
    const monthStartISO = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
    const paidThisMonth = sumGbp(
      enriched.filter(
        (i) => i.status === "paid" && i.paid_date && i.paid_date >= monthStartISO,
      ),
    );
    return { outstanding, overdue, paidThisMonth };
  }, [enriched]);

  /* Build the country pill bar: All, UK, International, then one pill
   * per non-UK country code present in the dataset (ordered by count
   * desc). UK includes anything with country="GB" OR blank (default). */
  const countryPills = useMemo(() => {
    const counts: Record<string, number> = {};
    let ukCount = 0;
    let intlCount = 0;
    for (const i of enriched) {
      const c = (i.client_country || "GB").toUpperCase();
      counts[c] = (counts[c] ?? 0) + 1;
      if (c === "GB") ukCount++;
      else intlCount++;
    }
    const perCountry = Object.entries(counts)
      .filter(([c]) => c !== "GB")
      .sort((a, b) => b[1] - a[1])
      .map(([code, count]) => ({ key: code, label: code, count }));
    return [
      { key: "all", label: "All", count: enriched.length },
      { key: "uk", label: "UK", count: ukCount },
      { key: "intl", label: "International", count: intlCount },
      ...perCountry,
    ];
  }, [enriched]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function exportCSV() {
    const rows = [
      [
        "Invoice #",
        "Client",
        "Issued",
        "Due",
        "Status",
        "Subtotal",
        "VAT",
        "Total",
        "VAT treatment",
      ],
      ...filtered.map((i) => {
        const b = calculateVatBreakdown(i.items, i.vat_treatment, i.vat_amount_override);
        return [
          i.invoice_number,
          i.client_name,
          i.invoice_date,
          i.due_date,
          INVOICE_STATUS_LABELS[i.status],
          b.subtotal.toFixed(2),
          b.vatAmount.toFixed(2),
          b.total.toFixed(2),
          i.vat_treatment,
        ];
      }),
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
    a.download = `invoices-issued-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <SummaryCard label="Outstanding" amount={summary.outstanding} />
        <SummaryCard label="Overdue" amount={summary.overdue} accent="red" />
        <SummaryCard label="Paid this month" amount={summary.paidThisMonth} accent="green" />
      </div>

      {/* Country pill bar - All / UK / International / per-country */}
      {hydrated && countryPills.length > 1 && (
        <div className="mb-3 -mx-1 overflow-x-auto">
          <div className="flex items-center gap-1.5 px-1 py-1 min-w-max">
            {countryPills.map((p) => {
              const active = countryFilter === p.key;
              return (
                <button
                  key={p.key}
                  onClick={() => setCountryFilter(p.key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                    active
                      ? "bg-foreground text-background border-border"
                      : "bg-surface text-foreground border-border hover:bg-background"
                  }`}
                >
                  {p.label}
                  <span
                    className={`text-[10px] tabular-nums font-semibold px-1.5 py-0.5 rounded-full ${
                      active ? "bg-surface-raised text-foreground" : "bg-surface-raised text-subtle"
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
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-subtle z-10" />
            <input
              placeholder="Search invoice # or client..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={`${inputClass} pl-8`}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | InvoiceStatus)}
            className={`${selectClass} w-36`}
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Due</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="disputed">Disputed</option>
          </select>
          <select
            value={vatFilter}
            onChange={(e) => setVatFilter(e.target.value as "all" | "vat" | "no_vat")}
            className={`${selectClass} w-36`}
          >
            <option value="all">All VAT</option>
            <option value="vat">VAT charged</option>
            <option value="no_vat">No VAT</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface border border-border text-foreground text-sm rounded-lg hover:bg-background disabled:opacity-40 transition-colors"
          >
            <ArrowDownTrayIcon className="size-4" /> CSV
          </button>
          <Link
            href="/finance/invoices/new"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-foreground text-background text-sm rounded-lg hover:opacity-90"
          >
            <PlusIcon className="size-4" /> New invoice
          </Link>
        </div>
      </div>

      {!hydrated ? (
        <div className="h-48 bg-background rounded-xl animate-pulse" />
      ) : filtered.length === 0 ? (
        <div className="bg-surface border border-dashed border-border rounded-xl p-12 text-center">
          <div className="text-sm text-subtle mb-3">
            {invoices.length === 0
              ? "No invoices yet - create your first one."
              : "No invoices match these filters."}
          </div>
          {invoices.length === 0 && (
            <Link
              href="/finance/invoices/new"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-foreground text-background text-sm rounded-lg hover:opacity-90"
            >
              <PlusIcon className="size-4" /> New invoice
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-x-auto shadow-[var(--shadow-soft)]">
          <table className="w-full text-sm">
            <thead className="bg-background text-[11px] uppercase tracking-wider text-subtle">
              <tr>
                <Th onClick={() => toggleSort("invoice_date")}>Invoice #</Th>
                <Th onClick={() => toggleSort("client_name")}>Client</Th>
                <Th onClick={() => toggleSort("invoice_date")}>Issued</Th>
                <Th onClick={() => toggleSort("due_date")}>Due</Th>
                <Th onClick={() => toggleSort("status")}>Status</Th>
                <th className="text-right px-4 py-3 font-semibold cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("total")}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => {
                const badge = INVOICE_STATUS_BADGE[i.status];
                return (
                  <tr key={i.id} className="border-t border-border hover:bg-background">
                    <td className="px-4 py-3">
                      <Link
                        href={`/finance/invoices/${i.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {i.invoice_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-foreground">{i.client_name}</td>
                    <td className="px-4 py-3 text-subtle">{fmtDateUK(i.invoice_date)}</td>
                    <td className="px-4 py-3 text-subtle">{fmtDateUK(i.due_date)}</td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded"
                        style={{ background: badge.bg, color: badge.text }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: badge.dot }} />
                        {INVOICE_STATUS_LABELS[i.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-foreground tabular-nums">
                      {fmtMoney(i.total, i.currency)}
                      {i.currency !== "GBP" && i.gbp_equivalent !== i.total && (
                        <div className="text-[10px] font-normal text-subtle mt-0.5">
                          ≈ {fmtMoney(i.gbp_equivalent, "GBP")}
                        </div>
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

function Th({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <th
      className="text-left px-4 py-3 font-semibold cursor-pointer select-none hover:text-foreground"
      onClick={onClick}
    >
      {children}
    </th>
  );
}

function SummaryCard({
  label,
  amount,
  accent,
}: {
  label: string;
  amount: number;
  accent?: "red" | "green";
}) {
  const color =
    accent === "red"
      ? "text-danger"
      : accent === "green"
        ? "text-success"
        : "text-foreground";
  return (
    <div className="bg-surface border border-border rounded-xl p-4 shadow-[var(--shadow-soft)]">
      <div className="text-[11px] uppercase tracking-wider text-subtle mb-1">{label}</div>
      <div className={`text-2xl font-semibold tabular-nums ${color}`}>{fmtMoney(amount)}</div>
    </div>
  );
}
