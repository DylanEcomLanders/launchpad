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

export default function ReceivablesListPage() {
  const [invoices, setInvoices] = useState<InvoiceIssued[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | InvoiceStatus>("all");
  const [vatFilter, setVatFilter] = useState<"all" | "vat" | "no_vat">("all");
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
      if (vatFilter === "vat" && i.vat_treatment !== "uk_standard" && i.vat_treatment !== "manual") return false;
      if (vatFilter === "no_vat" && (i.vat_treatment === "uk_standard" || i.vat_treatment === "manual")) return false;
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
    const outstanding = enriched
      .filter((i) => i.status === "sent" || i.status === "overdue")
      .reduce((s, i) => s + i.total, 0);
    const overdue = enriched
      .filter((i) => i.status === "overdue")
      .reduce((s, i) => s + i.total, 0);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthStartISO = monthStart.toISOString().slice(0, 10);
    const paidThisMonth = enriched
      .filter((i) => i.status === "paid" && i.paid_date && i.paid_date >= monthStartISO)
      .reduce((s, i) => s + i.total, 0);
    return { outstanding, overdue, paidThisMonth };
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

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-64">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-[#7A7A7A] z-10" />
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
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E5E5EA] text-[#1B1B1B] text-sm rounded-lg hover:bg-[#F7F8FA] disabled:opacity-40 transition-colors"
          >
            <ArrowDownTrayIcon className="size-4" /> CSV
          </button>
          <Link
            href="/finance/invoices/new"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#1B1B1B] text-white text-sm rounded-lg hover:opacity-90"
          >
            <PlusIcon className="size-4" /> New invoice
          </Link>
        </div>
      </div>

      {!hydrated ? (
        <div className="h-48 bg-[#F7F8FA] rounded-xl animate-pulse" />
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-[#E5E5EA] rounded-xl p-12 text-center">
          <div className="text-sm text-[#7A7A7A] mb-3">
            {invoices.length === 0
              ? "No invoices yet — create your first one."
              : "No invoices match these filters."}
          </div>
          {invoices.length === 0 && (
            <Link
              href="/finance/invoices/new"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#1B1B1B] text-white text-sm rounded-lg hover:opacity-90"
            >
              <PlusIcon className="size-4" /> New invoice
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white border border-[#E5E5EA] rounded-xl overflow-x-auto shadow-[var(--shadow-soft)]">
          <table className="w-full text-sm">
            <thead className="bg-[#F7F8FA] text-[11px] uppercase tracking-wider text-[#7A7A7A]">
              <tr>
                <Th onClick={() => toggleSort("invoice_date")}>Invoice #</Th>
                <Th onClick={() => toggleSort("client_name")}>Client</Th>
                <Th onClick={() => toggleSort("invoice_date")}>Issued</Th>
                <Th onClick={() => toggleSort("due_date")}>Due</Th>
                <Th onClick={() => toggleSort("status")}>Status</Th>
                <th className="text-right px-4 py-3 font-semibold cursor-pointer select-none hover:text-[#1B1B1B]" onClick={() => toggleSort("total")}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => {
                const badge = INVOICE_STATUS_BADGE[i.status];
                return (
                  <tr key={i.id} className="border-t border-[#E5E5EA] hover:bg-[#F7F8FA]">
                    <td className="px-4 py-3">
                      <Link
                        href={`/finance/invoices/${i.id}`}
                        className="font-medium text-[#1B1B1B] hover:underline"
                      >
                        {i.invoice_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[#1B1B1B]">{i.client_name}</td>
                    <td className="px-4 py-3 text-[#7A7A7A]">{fmtDateUK(i.invoice_date)}</td>
                    <td className="px-4 py-3 text-[#7A7A7A]">{fmtDateUK(i.due_date)}</td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded"
                        style={{ background: badge.bg, color: badge.text }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: badge.dot }} />
                        {INVOICE_STATUS_LABELS[i.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[#1B1B1B] tabular-nums">
                      {fmtMoney(i.total)}
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
      className="text-left px-4 py-3 font-semibold cursor-pointer select-none hover:text-[#1B1B1B]"
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
      ? "text-[#B91C1C]"
      : accent === "green"
        ? "text-[#047857]"
        : "text-[#1B1B1B]";
  return (
    <div className="bg-white border border-[#E5E5EA] rounded-xl p-4 shadow-[var(--shadow-soft)]">
      <div className="text-[11px] uppercase tracking-wider text-[#7A7A7A] mb-1">{label}</div>
      <div className={`text-2xl font-semibold tabular-nums ${color}`}>{fmtMoney(amount)}</div>
    </div>
  );
}
