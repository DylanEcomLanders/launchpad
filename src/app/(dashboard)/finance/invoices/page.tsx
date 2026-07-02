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
  INVOICE_STATUS_LABELS,
  type InvoiceIssued,
  type InvoiceStatus,
} from "@/lib/finance/types";
import { calculateVatBreakdown } from "@/lib/finance/vat";
import { Table, THead, TBody, TR, TH, TD, Num, Badge } from "@/components/ui";

/* Status = the only colour in the table body: a quiet Badge (subtle bg,
 * muted text, one leading dot). All statuses share the pill shape. */
type StatusTone = "success" | "warning" | "danger" | "neutral";
const STATUS_TONE: Record<InvoiceStatus, StatusTone> = {
  draft: "neutral",
  sent: "warning",
  paid: "success",
  overdue: "danger",
  disputed: "warning",
  void: "neutral",
};

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
  // Default sort: newest issued first. Header sort controls were removed in the
  // decluttered toolbar pass; the list keeps this stable ordering.
  const sortKey: SortKey = "invoice_date";

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
      const dir = -1; // newest first
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
    return rows;
  }, [enriched, statusFilter, vatFilter, query, sortKey]);

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
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <SummaryCard label="Outstanding" amount={summary.outstanding} />
        <SummaryCard label="Overdue" amount={summary.overdue} accent="red" />
        <SummaryCard label="Paid this month" amount={summary.paidThisMonth} />
      </div>

      {/* Toolbar: count + filters left, search right. One quiet row. */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-subtle tabular-nums mr-1">
            {filtered.length} of {enriched.length}
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | InvoiceStatus)}
            className="h-8 px-2.5 rounded border border-border bg-surface text-xs text-muted appearance-none focus:outline-none focus:border-foreground"
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
            className="h-8 px-2.5 rounded border border-border bg-surface text-xs text-muted appearance-none focus:outline-none focus:border-foreground"
          >
            <option value="all">All VAT</option>
            <option value="vat">VAT charged</option>
            <option value="no_vat">No VAT</option>
          </select>
          {countryPills.length > 1 && (
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="h-8 px-2.5 rounded border border-border bg-surface text-xs text-muted appearance-none focus:outline-none focus:border-foreground max-w-[180px]"
            >
              {countryPills.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.key === "all" ? "All countries" : p.label} ({p.count})
                </option>
              ))}
            </select>
          )}
          <button
            onClick={exportCSV}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded border border-border bg-surface text-xs text-muted hover:bg-surface-raised hover:text-foreground disabled:opacity-40 transition-colors"
          >
            <ArrowDownTrayIcon className="size-3.5" /> CSV
          </button>
          <Link
            href="/finance/invoices/new"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded border border-border bg-surface text-xs text-muted hover:bg-surface-raised hover:text-foreground transition-colors"
          >
            <PlusIcon className="size-3.5" /> New invoice
          </Link>
        </div>
        <div className="relative w-full md:w-64">
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-subtle z-10" />
          <input
            placeholder="Search invoice # or client"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 w-full pl-8 pr-3 rounded border border-border bg-surface text-xs text-muted placeholder:text-subtle focus:outline-none focus:border-foreground"
          />
        </div>
      </div>

      {!hydrated ? (
        <div className="h-48 bg-surface rounded border border-border-faint animate-pulse" />
      ) : filtered.length === 0 ? (
        <div className="bg-surface border border-border-faint rounded py-16 text-center">
          <p className="text-sm text-subtle">
            {invoices.length === 0
              ? "No invoices yet."
              : "No invoices match these filters."}
          </p>
          {invoices.length === 0 && (
            <Link
              href="/finance/invoices/new"
              className="mt-3 inline-flex items-center gap-1.5 h-8 px-3 rounded border border-border bg-surface text-xs text-muted hover:bg-surface-raised hover:text-foreground transition-colors"
            >
              <PlusIcon className="size-3.5" /> New invoice
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-surface border border-border-faint rounded overflow-x-auto">
          <Table>
            <THead>
              <TR hover={false}>
                <TH>Invoice #</TH>
                <TH>Client</TH>
                <TH>Issued</TH>
                <TH>Due</TH>
                <TH>Status</TH>
                <TH align="right">Total</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.map((i) => (
                <TR key={i.id}>
                  <TD>
                    <Link
                      href={`/finance/invoices/${i.id}`}
                      className="text-foreground hover:underline"
                    >
                      {i.invoice_number}
                    </Link>
                  </TD>
                  <TD className="text-muted truncate max-w-[240px]">{i.client_name}</TD>
                  <TD className="text-muted"><Num>{fmtDateUK(i.invoice_date)}</Num></TD>
                  <TD className="text-muted"><Num>{fmtDateUK(i.due_date)}</Num></TD>
                  <TD>
                    <Badge tone={STATUS_TONE[i.status]}>{INVOICE_STATUS_LABELS[i.status]}</Badge>
                  </TD>
                  <TD align="right" className="text-muted">
                    <Num>{fmtMoney(i.total, i.currency)}</Num>
                    {i.currency !== "GBP" && i.gbp_equivalent !== i.total && (
                      <div className="text-2xs text-subtle">
                        <Num>{fmtMoney(i.gbp_equivalent, "GBP")}</Num>
                      </div>
                    )}
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
    <div className="bg-surface border border-border-faint rounded p-5">
      <div className="text-2xs uppercase tracking-wider text-subtle font-medium">{label}</div>
      <div className={`mt-2 text-xl font-semibold tabular-nums tracking-tight ${color}`}>{fmtMoney(amount)}</div>
    </div>
  );
}
