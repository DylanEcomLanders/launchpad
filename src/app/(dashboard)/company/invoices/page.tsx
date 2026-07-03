"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  DocumentArrowUpIcon,
  DocumentIcon,
} from "@heroicons/react/24/outline";
import {
  invoicesStore,
  peopleStore,
  uid,
  nowISO,
  todayISO,
  fmtDateUK,
  fmtMoney,
  deriveInvoiceStatus,
} from "@/lib/company/data";
import {
  type Invoice,
  type InvoiceStatus,
  type InvoiceCategory,
  type Person,
} from "@/lib/company/types";
import { inputClass, labelClass, selectClass, textareaClass } from "@/lib/form-styles";
import { Table, THead, TBody, TR, TH, TD, Num, Badge } from "@/components/ui";

/* Status = the only colour in the table body: a quiet Badge (subtle bg,
 * muted text, one leading dot). All statuses share the pill shape. */
type StatusTone = "success" | "warning" | "danger" | "neutral";
const STATUS_TONE: Record<InvoiceStatus, StatusTone> = {
  pending: "warning",
  paid: "success",
  overdue: "danger",
  disputed: "neutral",
};
const STATUS_LABEL: Record<InvoiceStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  overdue: "Overdue",
  disputed: "Disputed",
};

type SortKey = "due_date" | "supplier_name" | "amount" | "status";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | InvoiceStatus>("all");
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  // Default sort: soonest due first. Header sort controls were removed in the
  // decluttered toolbar pass; the list keeps this stable ordering.
  const sortKey: SortKey = "due_date";
  const sortDir: "asc" | "desc" = "asc";

  useEffect(() => {
    Promise.all([invoicesStore.getAll(), peopleStore.getAll()]).then(([inv, ppl]) => {
      setInvoices(inv);
      setPeople(ppl);
      setHydrated(true);
    });
  }, []);

  const enriched = useMemo(
    () => invoices.map((i) => ({ ...i, status: deriveInvoiceStatus(i) })),
    [invoices],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = enriched.filter((i) => {
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (!q) return true;
      const hay = `${i.invoice_number || ""} ${i.supplier_name}`.toLowerCase();
      return hay.includes(q);
    });
    rows = [...rows].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const av = a[sortKey] || "";
      const bv = b[sortKey] || "";
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
    return rows;
  }, [enriched, statusFilter, query, sortKey, sortDir]);

  const summary = useMemo(() => {
    const outstanding = enriched
      .filter((i) => i.status === "pending" || i.status === "overdue")
      .reduce((s, i) => s + i.amount, 0);
    const overdue = enriched
      .filter((i) => i.status === "overdue")
      .reduce((s, i) => s + i.amount, 0);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const paidThisMonth = enriched
      .filter((i) => i.status === "paid" && i.paid_date && new Date(i.paid_date) >= monthStart)
      .reduce((s, i) => s + i.amount, 0);
    return { outstanding, overdue, paidThisMonth };
  }, [enriched]);

  async function handleAdd(invoice: Invoice) {
    await invoicesStore.create(invoice);
    setInvoices((rows) => [invoice, ...rows]);
    setShowAdd(false);
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
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="disputed">Disputed</option>
          </select>
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded border border-border bg-surface text-xs text-muted hover:bg-surface-raised hover:text-foreground transition-colors"
          >
            <PlusIcon className="size-3.5" /> Upload invoice
          </button>
        </div>
        <div className="relative w-full md:w-64">
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-subtle z-10" />
          <input
            placeholder="Search supplier or invoice #"
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
            <button
              onClick={() => setShowAdd(true)}
              className="mt-3 inline-flex items-center gap-1.5 h-8 px-3 rounded border border-border bg-surface text-xs text-muted hover:bg-surface-raised hover:text-foreground transition-colors"
            >
              <DocumentArrowUpIcon className="size-3.5" /> Upload invoice
            </button>
          )}
        </div>
      ) : (
        <div className="bg-surface border border-border-faint rounded overflow-x-auto">
          <Table>
            <THead>
              <TR hover={false}>
                <TH>Supplier</TH>
                <TH>Invoice #</TH>
                <TH>Issue</TH>
                <TH>Due</TH>
                <TH>Status</TH>
                <TH align="right">Amount</TH>
                <TH>File</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.map((i) => (
                <TR key={i.id}>
                  <TD className="max-w-[240px]">
                    <Link
                      href={`/company/invoices/${i.id}`}
                      className="text-foreground hover:underline truncate block"
                    >
                      {i.supplier_name}
                    </Link>
                  </TD>
                  <TD className="text-muted">{i.invoice_number || "-"}</TD>
                  <TD className="text-muted"><Num>{fmtDateUK(i.issue_date)}</Num></TD>
                  <TD className="text-muted"><Num>{fmtDateUK(i.due_date)}</Num></TD>
                  <TD>
                    <Badge tone={STATUS_TONE[i.status]}>{STATUS_LABEL[i.status]}</Badge>
                  </TD>
                  <TD align="right" className="text-muted">
                    <Num>{fmtMoney(i.amount, i.currency)}</Num>
                  </TD>
                  <TD className="text-muted">
                    {i.file_url ? (
                      <a
                        href={i.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-foreground hover:text-foreground inline-flex items-center gap-1"
                      >
                        <DocumentIcon className="size-4" />
                      </a>
                    ) : (
                      <span className="text-subtle">-</span>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}

      {showAdd && (
        <UploadInvoiceModal
          people={people}
          onCancel={() => setShowAdd(false)}
          onSave={handleAdd}
        />
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

function UploadInvoiceModal({
  people,
  onCancel,
  onSave,
}: {
  people: Person[];
  onCancel: () => void;
  onSave: (i: Invoice) => void;
}) {
  const [supplier, setSupplier] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [issueDate, setIssueDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("GBP");
  const [category, setCategory] = useState<InvoiceCategory>("software");
  const [linkedPersonId, setLinkedPersonId] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const supplierSuggestions = useMemo(() => {
    const fromPeople = people.filter((p) => p.employment_type === "contractor").map((p) => p.full_name);
    return Array.from(new Set(fromPeople));
  }, [people]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supplier.trim() || !amount) {
      setError("Supplier and amount required.");
      return;
    }
    setUploading(true);
    setError("");

    let fileUrl: string | undefined;
    let fileName: string | undefined;
    if (file) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("bucket", "company-invoices");
      try {
        const res = await fetch("/api/company/upload", { method: "POST", body: fd });
        const json = await res.json();
        if (json.url) {
          fileUrl = json.url;
          fileName = json.original;
        } else if (json.error) {
          setError(json.error);
          setUploading(false);
          return;
        }
      } catch {
        setError("Upload failed");
        setUploading(false);
        return;
      }
    }

    const now = nowISO();
    const inv: Invoice = {
      id: uid(),
      supplier_name: supplier.trim(),
      invoice_number: invoiceNumber.trim() || undefined,
      issue_date: issueDate || undefined,
      due_date: dueDate || undefined,
      amount: parseFloat(amount),
      currency,
      category,
      status: "pending",
      linked_person_id: linkedPersonId || undefined,
      file_url: fileUrl,
      file_name: fileName,
      notes: notes.trim() || undefined,
      created_at: now,
      updated_at: now,
    };
    onSave(inv);
  }

  return (
    <div className="fixed inset-0 bg-background/70 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <form onSubmit={submit} className="bg-surface-raised border border-border rounded w-full max-w-2xl p-5 my-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">Upload invoice</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Supplier name</label>
            <input
              autoFocus
              list="supplier-suggestions"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className={inputClass}
            />
            <datalist id="supplier-suggestions">
              {supplierSuggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <div>
            <label className={labelClass}>Invoice number</label>
            <input
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Issue date</label>
            <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Due date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Amount</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Currency</label>
            <input value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as InvoiceCategory)}
              className={selectClass}
            >
              <option value="software">Software</option>
              <option value="contractor">Contractor</option>
              <option value="service">Service</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Linked person (optional)</label>
            <select
              value={linkedPersonId}
              onChange={(e) => setLinkedPersonId(e.target.value)}
              className={selectClass}
            >
              <option value="">- None -</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className={labelClass}>PDF file (optional)</label>
          <input
            type="file"
            accept="application/pdf,image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-sm"
          />
        </div>

        <div className="mt-4">
          <label className={labelClass}>Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={textareaClass} />
        </div>

        {error && <div className="mt-3 text-sm text-danger">{error}</div>}

        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onCancel} className="px-3 py-2 text-sm text-subtle hover:text-foreground">
            Cancel
          </button>
          <button
            type="submit"
            disabled={uploading}
            className="px-3 py-2 bg-foreground text-background text-sm rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {uploading ? "Saving…" : "Save invoice"}
          </button>
        </div>
      </form>
    </div>
  );
}
