"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import {
  invoicesStore,
  peopleStore,
  uid,
  nowISO,
  fmtDateUK,
  fmtMoney,
  todayISO,
  deriveInvoiceStatus,
} from "@/lib/company/data";
import {
  type Invoice,
  type InvoiceStatus,
  type InvoiceStatusChange,
  type Person,
  type InvoiceCategory,
} from "@/lib/company/types";
import { inputClass, labelClass, selectClass, textareaClass } from "@/lib/form-styles";
import { INVOICE_STATUS_BADGE } from "@/lib/company/ui";

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    Promise.all([invoicesStore.getById(id), peopleStore.getAll()]).then(([inv, ppl]) => {
      setInvoice(inv);
      setPeople(ppl);
      setHydrated(true);
    });
  }, [id]);

  async function patch(updates: Partial<Invoice>) {
    if (!invoice) return;
    const next = { ...invoice, ...updates, updated_at: nowISO() };
    setInvoice(next);
    await invoicesStore.update(id, next);
  }

  async function changeStatus(newStatus: InvoiceStatus) {
    if (!invoice) return;
    const change: InvoiceStatusChange = {
      id: uid(),
      old_status: invoice.status,
      new_status: newStatus,
      changed_at: nowISO(),
    };
    const updates: Partial<Invoice> = {
      status: newStatus,
      status_history: [change, ...(invoice.status_history || [])],
    };
    if (newStatus === "paid") updates.paid_date = todayISO();
    await patch(updates);
  }

  async function handleDelete() {
    if (!confirm("Delete this invoice? This cannot be undone.")) return;
    await invoicesStore.remove(id);
    router.push("/company/invoices");
  }

  if (!hydrated) {
    return <div className="h-32 bg-background rounded-xl animate-pulse" />;
  }
  if (!invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-subtle mb-3">Invoice not found.</p>
        <Link href="/company/invoices" className="text-sm text-foreground hover:underline">
          Back to invoices
        </Link>
      </div>
    );
  }

  const effectiveStatus = deriveInvoiceStatus(invoice);
  const badge = INVOICE_STATUS_BADGE[effectiveStatus];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/company/invoices"
          className="inline-flex items-center gap-1 text-sm text-subtle hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" /> Back
        </Link>
        <div className="flex items-center gap-2">
          {invoice.file_url && (
            <a
              href={invoice.file_url}
              target="_blank"
              rel="noopener noreferrer"
              download={invoice.file_name}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-foreground hover:bg-background rounded-md"
            >
              <ArrowDownTrayIcon className="size-3.5" /> Download
            </a>
          )}
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-danger hover:bg-danger/15 rounded-md"
          >
            <TrashIcon className="size-3.5" /> Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-background border border-border rounded-xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
          {invoice.file_url ? (
            invoice.file_url.endsWith(".pdf") || invoice.file_name?.toLowerCase().endsWith(".pdf") ? (
              <iframe src={invoice.file_url} className="w-full h-[700px]" title="Invoice preview" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={invoice.file_url} alt="Invoice" className="w-full" />
            )
          ) : (
            <div className="h-[400px] flex items-center justify-center text-subtle text-sm">
              No file attached.
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-background border border-border rounded-xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-subtle">Status</h3>
              <span
                className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded"
                style={{ background: badge.bg, color: badge.text }}
              >
                {badge.label}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => changeStatus("paid")}
                disabled={invoice.status === "paid"}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-success/10 text-success rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                <CheckCircleIcon className="size-3.5" /> Mark paid
              </button>
              <button
                onClick={() => changeStatus("pending")}
                disabled={invoice.status === "pending"}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-warning/15 text-warning rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                Mark pending
              </button>
              <button
                onClick={() => changeStatus("disputed")}
                disabled={invoice.status === "disputed"}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-border text-subtle rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                <ExclamationCircleIcon className="size-3.5" /> Mark disputed
              </button>
            </div>
          </div>

          <div className="bg-background border border-border rounded-xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.35)] space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-subtle">Details</h3>
            <Field
              label="Supplier"
              value={invoice.supplier_name}
              onChange={(v) => patch({ supplier_name: v })}
            />
            <Field
              label="Invoice number"
              value={invoice.invoice_number || ""}
              onChange={(v) => patch({ invoice_number: v || undefined })}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Issue</label>
                <input
                  type="date"
                  value={invoice.issue_date || ""}
                  onChange={(e) => patch({ issue_date: e.target.value || undefined })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Due</label>
                <input
                  type="date"
                  value={invoice.due_date || ""}
                  onChange={(e) => patch({ due_date: e.target.value || undefined })}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={invoice.amount}
                  onChange={(e) => patch({ amount: parseFloat(e.target.value) || 0 })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Currency</label>
                <input
                  value={invoice.currency}
                  onChange={(e) => patch({ currency: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Category</label>
              <select
                value={invoice.category || "other"}
                onChange={(e) => patch({ category: e.target.value as InvoiceCategory })}
                className={selectClass}
              >
                <option value="software">Software</option>
                <option value="contractor">Contractor</option>
                <option value="service">Service</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Linked person</label>
              <select
                value={invoice.linked_person_id || ""}
                onChange={(e) => patch({ linked_person_id: e.target.value || undefined })}
                className={selectClass}
              >
                <option value="">— None —</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Notes</label>
              <textarea
                value={invoice.notes || ""}
                onChange={(e) => patch({ notes: e.target.value || undefined })}
                rows={2}
                className={textareaClass}
              />
            </div>
            <div className="text-xs text-subtle pt-2 border-t border-border">
              Total: <span className="font-medium text-foreground">{fmtMoney(invoice.amount, invoice.currency)}</span>
              {invoice.paid_date && <> · Paid {fmtDateUK(invoice.paid_date)}</>}
            </div>
          </div>

          {invoice.status_history && invoice.status_history.length > 0 && (
            <div className="bg-background border border-border rounded-xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-subtle mb-3">
                Status history
              </h3>
              <ul className="space-y-1.5 text-xs text-subtle">
                {invoice.status_history.map((h) => (
                  <li key={h.id}>
                    {fmtDateUK(h.changed_at)} · {h.old_status || "—"} → <span className="text-foreground">{h.new_status}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
    </div>
  );
}
