"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { pdf } from "@react-pdf/renderer";
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  TrashIcon,
  CheckIcon,
  PaperAirplaneIcon,
  PencilSquareIcon,
  XMarkIcon,
  PlusIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";
import {
  invoicesIssuedStore,
  fmtMoney,
  fmtDateUK,
  nowISO,
  todayISO,
  deriveInvoiceStatus,
} from "@/lib/finance/data";
import { calculateVatBreakdown } from "@/lib/finance/vat";
import { loadCompanyProfile } from "@/lib/finance/profile";
import { FinanceInvoicePdf } from "@/components/finance/finance-invoice-pdf";
import {
  INVOICE_STATUS_BADGE,
  INVOICE_STATUS_LABELS,
  VAT_TREATMENT_LABELS,
  type InvoiceIssued,
  type InvoiceStatus,
  type InvoiceLineItem,
  type VatTreatment,
  type CompanyProfile,
} from "@/lib/finance/types";
import { inputClass, selectClass, labelClass, textareaClass } from "@/lib/form-styles";

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceIssued | null>(null);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendSuccess, setSendSuccess] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<InvoiceIssued | null>(null);
  const [saving, setSaving] = useState(false);
  const previewBlobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [inv, p] = await Promise.all([
        invoicesIssuedStore.getById(params.id),
        loadCompanyProfile(),
      ]);
      if (cancelled) return;
      setInvoice(inv);
      setProfile(p);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  // Revoke object URLs on unmount.
  useEffect(() => {
    return () => {
      if (previewBlobUrlRef.current) {
        URL.revokeObjectURL(previewBlobUrlRef.current);
      }
    };
  }, []);

  async function updateStatus(status: InvoiceStatus) {
    if (!invoice) return;
    const updates: Partial<InvoiceIssued> = {
      status,
      updated_at: nowISO(),
    };
    if (status === "sent" && !invoice.sent_date) updates.sent_date = nowISO();
    if (status === "paid" && !invoice.paid_date) updates.paid_date = todayISO();
    const updated = await invoicesIssuedStore.update(invoice.id, updates);
    if (updated) setInvoice(updated);
  }

  async function downloadPdf() {
    if (!invoice || !profile) return;
    setDownloading(true);
    try {
      const blob = await pdf(<FinanceInvoicePdf invoice={invoice} profile={profile} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoice.invoice_number}-${invoice.client_name.replace(/\s+/g, "-")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF generation failed");
    } finally {
      setDownloading(false);
    }
  }

  async function generatePreview() {
    if (!invoice || !profile || previewUrl) return;
    setPreviewing(true);
    try {
      const blob = await pdf(<FinanceInvoicePdf invoice={invoice} profile={profile} />).toBlob();
      const url = URL.createObjectURL(blob);
      if (previewBlobUrlRef.current) URL.revokeObjectURL(previewBlobUrlRef.current);
      previewBlobUrlRef.current = url;
      setPreviewUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview generation failed");
    } finally {
      setPreviewing(false);
    }
  }

  async function sendToClient() {
    if (!invoice || !profile) return;
    if (!invoice.client_email) {
      setSendError("No client email on this invoice. Edit it first to add one.");
      return;
    }
    if (!confirm(`Email this invoice to ${invoice.client_email}?`)) return;
    setSending(true);
    setSendError("");
    setSendSuccess(false);
    try {
      const blob = await pdf(<FinanceInvoicePdf invoice={invoice} profile={profile} />).toBlob();
      const buf = await blob.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      const res = await fetch("/api/finance/send-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_id: invoice.id,
          pdf_base64: base64,
          filename: `${invoice.invoice_number}.pdf`,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setSendSuccess(true);
      // Mark as sent if it was draft
      if (invoice.status === "draft") await updateStatus("sent");
      setTimeout(() => setSendSuccess(false), 4000);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  async function handleDelete() {
    if (!invoice) return;
    if (!confirm(`Delete invoice ${invoice.invoice_number}? This cannot be undone.`))
      return;
    await invoicesIssuedStore.remove(invoice.id);
    router.push("/finance/invoices");
  }

  function startEdit() {
    if (!invoice) return;
    setDraft({ ...invoice, items: invoice.items.map((i) => ({ ...i })) });
    setEditing(true);
    setError("");
  }

  function cancelEdit() {
    setDraft(null);
    setEditing(false);
  }

  async function saveEdit() {
    if (!draft) return;
    setSaving(true);
    setError("");
    try {
      const updates: Partial<InvoiceIssued> = {
        ...draft,
        updated_at: nowISO(),
      };
      const updated = await invoicesIssuedStore.update(draft.id, updates);
      if (updated) {
        setInvoice(updated);
        // Invalidate any cached preview since data changed.
        if (previewBlobUrlRef.current) {
          URL.revokeObjectURL(previewBlobUrlRef.current);
          previewBlobUrlRef.current = null;
        }
        setPreviewUrl(null);
      }
      setEditing(false);
      setDraft(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="h-48 bg-[#F7F8FA] rounded-xl animate-pulse" />;
  }

  if (!invoice) {
    return (
      <div className="bg-white border border-dashed border-[#E5E5EA] rounded-xl p-12 text-center">
        <p className="text-sm text-[#7A7A7A] mb-3">Invoice not found</p>
        <Link href="/finance/invoices" className="text-sm text-[#1B1B1B] underline">
          Back to invoices
        </Link>
      </div>
    );
  }

  const derivedStatus = deriveInvoiceStatus(invoice);
  const badge = INVOICE_STATUS_BADGE[derivedStatus];
  const breakdown = calculateVatBreakdown(
    invoice.items,
    invoice.vat_treatment,
    invoice.vat_amount_override,
  );

  return (
    <div>
      <Link
        href="/finance/invoices"
        className="inline-flex items-center gap-1.5 text-sm text-[#7A7A7A] hover:text-[#1B1B1B] mb-6 transition-colors"
      >
        <ArrowLeftIcon className="size-4" /> Back to invoices
      </Link>

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-xl font-semibold text-[#1B1B1B]">
              {invoice.invoice_number}
            </h2>
            <span
              className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded"
              style={{ background: badge.bg, color: badge.text }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: badge.dot }} />
              {INVOICE_STATUS_LABELS[derivedStatus]}
            </span>
          </div>
          <p className="text-sm text-[#7A7A7A]">
            {invoice.client_name} · Issued {fmtDateUK(invoice.invoice_date)} · Due{" "}
            {fmtDateUK(invoice.due_date)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!editing && (
            <button
              onClick={startEdit}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E5E5EA] text-[#1B1B1B] text-sm rounded-lg hover:bg-[#F7F8FA]"
            >
              <PencilSquareIcon className="size-4" /> Edit
            </button>
          )}
          {!editing && derivedStatus === "draft" && (
            <button
              onClick={() => updateStatus("sent")}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#6366F1] text-white text-sm rounded-lg hover:opacity-90"
            >
              <PaperAirplaneIcon className="size-4" /> Mark sent
            </button>
          )}
          {!editing && (derivedStatus === "sent" || derivedStatus === "overdue") && (
            <button
              onClick={() => updateStatus("paid")}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#047857] text-white text-sm rounded-lg hover:opacity-90"
            >
              <CheckIcon className="size-4" /> Mark paid
            </button>
          )}
          {!editing && (
            <button
              onClick={sendToClient}
              disabled={sending}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E5E5EA] text-[#1B1B1B] text-sm rounded-lg hover:bg-[#F7F8FA] disabled:opacity-40"
            >
              <EnvelopeIcon className="size-4" /> {sending ? "Sending..." : "Email client"}
            </button>
          )}
          {!editing && (
            <button
              onClick={downloadPdf}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#1B1B1B] text-white text-sm rounded-lg hover:opacity-90 disabled:opacity-40"
            >
              <ArrowDownTrayIcon className="size-4" />{" "}
              {downloading ? "Generating..." : "Download PDF"}
            </button>
          )}
          {!editing && (
            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E5E5EA] text-red-600 text-sm rounded-lg hover:bg-red-50"
            >
              <TrashIcon className="size-4" />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}
      {sendError && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {sendError}
        </div>
      )}
      {sendSuccess && (
        <div className="mb-6 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
          Invoice emailed successfully.
        </div>
      )}

      {editing && draft ? (
        <EditInvoiceForm
          draft={draft}
          setDraft={setDraft}
          onSave={saveEdit}
          onCancel={cancelEdit}
          saving={saving}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <Card title="Client">
                <KV label="Name" value={invoice.client_name} />
                {invoice.contact_name && <KV label="Contact" value={invoice.contact_name} />}
                {invoice.client_email && <KV label="Email" value={invoice.client_email} />}
                {invoice.client_address && (
                  <KV label="Address" value={invoice.client_address} multiline />
                )}
                <KV label="Country" value={invoice.client_country} />
              </Card>

              <Card title="Line items">
                <div className="overflow-x-auto -mx-4">
                  <table className="w-full text-sm">
                    <thead className="text-[10px] uppercase tracking-wider text-[#7A7A7A] border-b border-[#E5E5EA]">
                      <tr>
                        <th className="text-left px-4 py-2 font-semibold">Description</th>
                        <th className="text-center px-4 py-2 font-semibold">Qty</th>
                        <th className="text-right px-4 py-2 font-semibold">Unit price</th>
                        <th className="text-right px-4 py-2 font-semibold">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.items.map((item) => (
                        <tr key={item.id} className="border-b border-[#F0F0F0]">
                          <td className="px-4 py-3">{item.name}</td>
                          <td className="px-4 py-3 text-center text-[#7A7A7A]">{item.quantity}</td>
                          <td className="px-4 py-3 text-right text-[#7A7A7A] tabular-nums">
                            {fmtMoney(item.unitPrice)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {fmtMoney(item.quantity * item.unitPrice)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 space-y-2 max-w-xs ml-auto">
                  <Row label="Subtotal" value={fmtMoney(breakdown.subtotal)} />
                  {breakdown.vatAmount > 0 && (
                    <Row
                      label={`VAT (${Math.round(breakdown.vatRate * 100)}%)`}
                      value={fmtMoney(breakdown.vatAmount)}
                    />
                  )}
                  <Row label="Total" value={fmtMoney(breakdown.total)} bold />
                </div>

                {breakdown.noteForInvoice && (
                  <p className="mt-4 pt-4 border-t border-[#E5E5EA] text-[11px] text-[#7A7A7A]">
                    {breakdown.noteForInvoice}
                  </p>
                )}
              </Card>

              {invoice.notes && (
                <Card title="Notes">
                  <p className="text-sm text-[#1B1B1B] whitespace-pre-wrap">{invoice.notes}</p>
                </Card>
              )}

              <Card title="PDF preview">
                {!previewUrl ? (
                  <button
                    onClick={generatePreview}
                    disabled={previewing}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E5E5EA] text-[#1B1B1B] text-sm rounded-lg hover:bg-[#F7F8FA] disabled:opacity-40"
                  >
                    {previewing ? "Rendering..." : "Generate preview"}
                  </button>
                ) : (
                  <iframe
                    src={previewUrl}
                    className="w-full h-[640px] border border-[#E5E5EA] rounded-lg bg-white"
                    title="Invoice PDF preview"
                  />
                )}
              </Card>
            </div>

            <div className="space-y-6">
              <Card title="Status">
                <KV label="Current" value={INVOICE_STATUS_LABELS[derivedStatus]} />
                {invoice.sent_date && <KV label="Sent" value={fmtDateUK(invoice.sent_date)} />}
                {invoice.paid_date && <KV label="Paid" value={fmtDateUK(invoice.paid_date)} />}
                {derivedStatus !== "draft" && derivedStatus !== "paid" && (
                  <button
                    onClick={() => updateStatus("draft")}
                    className="text-xs text-[#7A7A7A] hover:text-[#1B1B1B] underline mt-2"
                  >
                    Revert to draft
                  </button>
                )}
              </Card>

              <Card title="VAT">
                <KV label="Treatment" value={VAT_TREATMENT_LABELS[invoice.vat_treatment]} />
                <KV label="VAT charged" value={fmtMoney(breakdown.vatAmount)} />
              </Card>

              {(invoice.bank_name || invoice.account_number) && (
                <Card title="Payment">
                  {invoice.bank_name && <KV label="Bank" value={invoice.bank_name} />}
                  {invoice.account_name && (
                    <KV label="Account name" value={invoice.account_name} />
                  )}
                  {invoice.sort_code && <KV label="Sort code" value={invoice.sort_code} />}
                  {invoice.account_number && (
                    <KV label="Account #" value={invoice.account_number} />
                  )}
                  {invoice.payment_term && <KV label="Terms" value={invoice.payment_term} />}
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function EditInvoiceForm({
  draft,
  setDraft,
  onSave,
  onCancel,
  saving,
}: {
  draft: InvoiceIssued;
  setDraft: (d: InvoiceIssued) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const breakdown = useMemo(
    () =>
      calculateVatBreakdown(draft.items, draft.vat_treatment, draft.vat_amount_override),
    [draft.items, draft.vat_treatment, draft.vat_amount_override],
  );

  function update<K extends keyof InvoiceIssued>(key: K, value: InvoiceIssued[K]) {
    setDraft({ ...draft, [key]: value });
  }

  function updateItem(id: string, patch: Partial<InvoiceLineItem>) {
    setDraft({
      ...draft,
      items: draft.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    });
  }

  function addCustomItem() {
    setDraft({
      ...draft,
      items: [
        ...draft.items,
        { id: crypto.randomUUID(), type: "custom", name: "", quantity: 1, unitPrice: 0 },
      ],
    });
  }

  function removeItem(id: string) {
    setDraft({ ...draft, items: draft.items.filter((i) => i.id !== id) });
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[#7A7A7A] mb-4">
          Edit invoice
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Invoice number</label>
            <input
              type="text"
              value={draft.invoice_number}
              onChange={(e) => update("invoice_number", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Client name</label>
            <input
              type="text"
              value={draft.client_name}
              onChange={(e) => update("client_name", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Contact name</label>
            <input
              type="text"
              value={draft.contact_name || ""}
              onChange={(e) => update("contact_name", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Client email</label>
            <input
              type="email"
              value={draft.client_email || ""}
              onChange={(e) => update("client_email", e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Client address</label>
            <textarea
              value={draft.client_address || ""}
              onChange={(e) => update("client_address", e.target.value)}
              rows={2}
              className={textareaClass}
            />
          </div>
          <div>
            <label className={labelClass}>Country (ISO2)</label>
            <input
              type="text"
              value={draft.client_country}
              onChange={(e) => update("client_country", e.target.value.toUpperCase())}
              maxLength={2}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Payment terms</label>
            <input
              type="text"
              value={draft.payment_term || ""}
              onChange={(e) => update("payment_term", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Invoice date</label>
            <input
              type="date"
              value={draft.invoice_date}
              onChange={(e) => update("invoice_date", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Due date</label>
            <input
              type="date"
              value={draft.due_date}
              onChange={(e) => update("due_date", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[#7A7A7A] mb-4">
          Line items
        </h3>
        {draft.items.length > 0 && (
          <div className="border border-[#E5E5EA] rounded-lg overflow-hidden mb-4">
            <div className="hidden md:grid grid-cols-[1fr_70px_120px_120px_36px] gap-2 px-4 py-2.5 bg-[#F3F3F5] text-[10px] font-semibold uppercase tracking-wider text-[#7A7A7A]">
              <span>Description</span>
              <span className="text-center">Qty</span>
              <span className="text-right">Unit price</span>
              <span className="text-right">Amount</span>
              <span />
            </div>
            {draft.items.map((item, idx) => (
              <div
                key={item.id}
                className={`grid grid-cols-1 md:grid-cols-[1fr_70px_120px_120px_36px] gap-2 px-4 py-3 border-t border-[#EDEDEF] items-center ${
                  idx % 2 === 1 ? "bg-[#F7F8FA]" : ""
                }`}
              >
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => updateItem(item.id, { name: e.target.value })}
                  className={`${inputClass} text-sm`}
                />
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) =>
                    updateItem(item.id, {
                      quantity: Math.max(1, parseInt(e.target.value) || 1),
                    })
                  }
                  className={`${inputClass} text-center text-sm`}
                />
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={item.unitPrice || ""}
                  onChange={(e) =>
                    updateItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })
                  }
                  className={`${inputClass} text-right text-sm`}
                />
                <span className="text-sm font-medium text-right px-3 tabular-nums">
                  {fmtMoney(item.quantity * item.unitPrice)}
                </span>
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-1 text-[#A0A0A0] hover:text-red-500 transition-colors justify-self-center"
                >
                  <XMarkIcon className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        <button
          onClick={addCustomItem}
          className="flex items-center gap-1.5 text-sm text-[#7A7A7A] hover:text-[#1B1B1B] transition-colors"
        >
          <PlusIcon className="size-3.5" /> Add line item
        </button>
      </section>

      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[#7A7A7A] mb-4">
          VAT
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>VAT treatment</label>
            <select
              value={draft.vat_treatment}
              onChange={(e) => update("vat_treatment", e.target.value as VatTreatment)}
              className={selectClass}
            >
              {Object.entries(VAT_TREATMENT_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          {draft.vat_treatment === "manual" && (
            <div>
              <label className={labelClass}>Manual VAT (£)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={draft.vat_amount_override ?? 0}
                onChange={(e) => update("vat_amount_override", parseFloat(e.target.value) || 0)}
                className={inputClass}
              />
            </div>
          )}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[#7A7A7A] mb-4">
          Totals (live)
        </h3>
        <div className="bg-[#F7F8FA] border border-[#E5E5EA] rounded-lg p-5 space-y-2 max-w-xs ml-auto">
          <div className="flex justify-between text-sm">
            <span className="text-[#7A7A7A]">Subtotal</span>
            <span className="font-medium tabular-nums">{fmtMoney(breakdown.subtotal)}</span>
          </div>
          {breakdown.vatAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-[#7A7A7A]">
                VAT ({Math.round(breakdown.vatRate * 100)}%)
              </span>
              <span className="font-medium tabular-nums">
                {fmtMoney(breakdown.vatAmount)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-base pt-2 border-t border-[#E5E5EA]">
            <span className="font-semibold">Total</span>
            <span className="font-bold tabular-nums">{fmtMoney(breakdown.total)}</span>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[#7A7A7A] mb-4">
          Payment details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Bank name</label>
            <input
              type="text"
              value={draft.bank_name || ""}
              onChange={(e) => update("bank_name", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Account name</label>
            <input
              type="text"
              value={draft.account_name || ""}
              onChange={(e) => update("account_name", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Sort code</label>
            <input
              type="text"
              value={draft.sort_code || ""}
              onChange={(e) => update("sort_code", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Account number</label>
            <input
              type="text"
              value={draft.account_number || ""}
              onChange={(e) => update("account_number", e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Notes</label>
            <textarea
              value={draft.notes || ""}
              onChange={(e) => update("notes", e.target.value)}
              rows={2}
              className={textareaClass}
            />
          </div>
        </div>
      </section>

      <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E5EA]">
        <button
          onClick={onCancel}
          className="px-5 py-3 text-sm text-[#7A7A7A] hover:text-[#1B1B1B]"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="px-6 py-3 bg-[#1B1B1B] text-white text-sm font-medium rounded-md hover:opacity-90 disabled:opacity-40"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#E5E5EA] rounded-xl p-5 shadow-[var(--shadow-soft)]">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A] mb-3">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function KV({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-[#A0A0A0] mb-0.5">{label}</div>
      <div className={`text-sm text-[#1B1B1B] ${multiline ? "whitespace-pre-wrap" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div
      className={`flex justify-between text-sm ${bold ? "font-bold pt-2 border-t border-[#E5E5EA]" : ""}`}
    >
      <span className={bold ? "" : "text-[#7A7A7A]"}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
