"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { pdf } from "@react-pdf/renderer";
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  TrashIcon,
  PencilSquareIcon,
  XMarkIcon,
  PlusIcon,
  EnvelopeIcon,
  DocumentIcon,
  ArrowPathIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import { InvoicePdfModal } from "@/components/finance/invoice-pdf-modal";
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
  INVOICE_STATUS_LABELS,
  VAT_TREATMENT_LABELS,
  type InvoiceIssued,
  type InvoiceStatus,
  type InvoiceLineItem,
  type InvoicePaymentMethod,
  type CompanyProfile,
} from "@/lib/finance/types";
import { deriveVatTreatment, vatTreatmentToMode } from "@/lib/finance/vat";
import { VatModePicker } from "@/components/finance/vat-mode-picker";
import { selectClass } from "@/lib/form-styles";
import { Table, THead, TBody, TR, TH, TD, Num, Badge } from "@/components/ui";

/* Status = a quiet Badge (subtle bg, muted text, one leading dot). Matches the
 * invoices list + expenses table treatment. */
type StatusTone = "success" | "warning" | "danger" | "neutral";
const STATUS_TONE: Record<InvoiceStatus, StatusTone> = {
  draft: "neutral",
  sent: "warning",
  paid: "success",
  overdue: "danger",
  disputed: "warning",
  void: "neutral",
};

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceIssued | null>(null);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendSuccess, setSendSuccess] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<InvoiceIssued | null>(null);
  const [saving, setSaving] = useState(false);

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

  async function updateStatus(status: InvoiceStatus, reason?: string) {
    if (!invoice) return;
    const updates: Partial<InvoiceIssued> = {
      status,
      updated_at: nowISO(),
    };
    if (status === "sent" && !invoice.sent_date) updates.sent_date = nowISO();
    if (status === "paid" && !invoice.paid_date) updates.paid_date = todayISO();
    if (status === "disputed") {
      updates.disputed_at = nowISO();
      if (reason !== undefined) updates.disputed_reason = reason;
    } else {
      // Clear dispute metadata when moving back out of disputed state.
      updates.disputed_at = undefined;
      updates.disputed_reason = undefined;
    }
    const updated = await invoicesIssuedStore.update(invoice.id, updates);
    if (updated) setInvoice(updated);
  }

  async function markDisputed() {
    if (!invoice) return;
    const reason = window.prompt(
      "Reason for dispute (optional, shown on the invoice detail):",
      invoice.disputed_reason || "",
    );
    if (reason === null) return; // user cancelled
    await updateStatus("disputed", reason);
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
      }
      setEditing(false);
      setDraft(null);
      // Auto-open the preview modal so the founder can immediately
      // grab the freshly-rendered PDF with the updated details.
      setPreviewOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="h-48 bg-surface rounded border border-border-faint animate-pulse" />;
  }

  if (!invoice) {
    return (
      <div className="bg-surface border border-border-faint rounded p-12 text-center">
        <p className="text-sm text-subtle mb-3">Invoice not found</p>
        <Link href="/finance/invoices" className="text-sm text-foreground underline">
          Back to invoices
        </Link>
      </div>
    );
  }

  const derivedStatus = deriveInvoiceStatus(invoice);
  const breakdown = calculateVatBreakdown(
    invoice.items,
    invoice.vat_treatment,
    invoice.vat_amount_override,
  );

  return (
    <div>
      <Link
        href="/finance/invoices"
        className="inline-flex items-center gap-1.5 text-sm text-subtle hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeftIcon className="size-4" /> Back to invoices
      </Link>

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-lg font-semibold text-foreground">
              {invoice.invoice_number}
            </h2>
            <Badge tone={STATUS_TONE[derivedStatus]}>
              {INVOICE_STATUS_LABELS[derivedStatus]}
            </Badge>
          </div>
          <p className="text-sm text-muted">
            {invoice.client_name} · Issued {fmtDateUK(invoice.invoice_date)} · Due{" "}
            {fmtDateUK(invoice.due_date)}
          </p>
        </div>

        {!editing && (
          <div className="inline-flex items-center divide-x divide-dashed divide-border border border-border rounded bg-surface overflow-hidden">
            <ToolbarButton onClick={startEdit} icon={<PencilSquareIcon className="size-4" />}>
              Edit
            </ToolbarButton>
            <ToolbarButton
              onClick={() => setPreviewOpen(true)}
              icon={<EyeIcon className="size-4" />}
            >
              Preview
            </ToolbarButton>
            <ToolbarButton
              onClick={sendToClient}
              icon={<EnvelopeIcon className="size-4" />}
              disabled={sending}
            >
              {sending ? "Sending..." : "Email"}
            </ToolbarButton>
            <ToolbarButton
              onClick={downloadPdf}
              icon={<ArrowDownTrayIcon className="size-4" />}
              disabled={downloading}
            >
              {downloading ? "..." : "PDF"}
            </ToolbarButton>
            <ToolbarButton
              onClick={handleDelete}
              icon={<TrashIcon className="size-4" />}
              danger
              title="Delete invoice"
            />
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-danger/10 border border-danger/20 rounded text-sm text-danger">
          {error}
        </div>
      )}
      {sendError && (
        <div className="mb-4 px-4 py-3 bg-danger/10 border border-danger/20 rounded text-sm text-danger">
          {sendError}
        </div>
      )}
      {sendSuccess && (
        <div className="mb-4 px-4 py-3 bg-success/10 border border-success/20 rounded text-sm text-success">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 space-y-3">
              <Card title="Client">
                <div className="text-sm text-foreground">
                  <div className="font-medium">{invoice.client_name}</div>
                  {invoice.contact_name && (
                    <div className="text-muted">{invoice.contact_name}</div>
                  )}
                  {invoice.client_email && (
                    <div className="text-muted">{invoice.client_email}</div>
                  )}
                  {invoice.client_address && (
                    <div className="text-muted whitespace-pre-wrap leading-snug mt-1.5">
                      {invoice.client_address}
                    </div>
                  )}
                  <div className="text-2xs text-subtle mt-1.5">{invoice.client_country}</div>
                </div>
              </Card>

              <Card title="Line items">
                <div className="overflow-x-auto -mx-5">
                  <Table>
                    <THead>
                      <TR hover={false}>
                        <TH className="px-5">Description</TH>
                        <TH align="center">Qty</TH>
                        <TH align="right">Unit price</TH>
                        <TH align="right" className="px-5">Amount</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {invoice.items.map((item) => (
                        <TR key={item.id} hover={false}>
                          <TD className="px-5">{item.name}</TD>
                          <TD align="center" className="text-muted"><Num>{item.quantity}</Num></TD>
                          <TD align="right" className="text-muted">
                            <Num>{fmtMoney(item.unitPrice, invoice.currency)}</Num>
                          </TD>
                          <TD align="right" className="px-5 text-muted">
                            <Num>{fmtMoney(item.quantity * item.unitPrice, invoice.currency)}</Num>
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </div>

                <div className="mt-3 space-y-1 max-w-[220px] ml-auto">
                  <Row
                    label="Subtotal"
                    value={fmtMoney(breakdown.subtotal, invoice.currency)}
                  />
                  {breakdown.vatAmount > 0 && (
                    <Row
                      label={`VAT (${Math.round(breakdown.vatRate * 100)}%)`}
                      value={fmtMoney(breakdown.vatAmount, invoice.currency)}
                    />
                  )}
                  <Row
                    label="Total"
                    value={fmtMoney(breakdown.total, invoice.currency)}
                    bold
                  />
                  {invoice.currency !== "GBP" && (
                    <div className="flex justify-between text-2xs text-subtle pt-1">
                      <span>GBP equivalent</span>
                      <span className="tabular-nums">
                        {fmtMoney(invoice.gbp_equivalent, "GBP")}
                      </span>
                    </div>
                  )}
                </div>

                {invoice.currency !== "GBP" && (
                  <p className="mt-3 pt-3 border-t border-dashed border-border text-2xs text-subtle">
                    Amounts billed in {invoice.currency}. GBP equivalent recorded from{" "}
                    {invoice.source_system || "the source"} statement at the time of the
                    transaction; no live FX conversion applied.
                  </p>
                )}
                {breakdown.noteForInvoice && (
                  <p className="mt-3 pt-3 border-t border-dashed border-border text-2xs text-subtle">
                    {breakdown.noteForInvoice}
                  </p>
                )}
              </Card>

              {invoice.notes && (
                <Card title="Notes">
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {invoice.notes}
                  </p>
                </Card>
              )}

            </div>

            <div className="space-y-3">
              <Card title="Status">
                <select
                  value={derivedStatus}
                  onChange={(e) => {
                    const next = e.target.value as InvoiceStatus;
                    if (next === "disputed") {
                      markDisputed();
                    } else {
                      updateStatus(next);
                    }
                  }}
                  className={selectClass}
                >
                  <option value="draft">Draft</option>
                  <option value="sent">Due</option>
                  <option value="paid">Paid</option>
                  {derivedStatus === "overdue" && (
                    <option value="overdue">Overdue (auto)</option>
                  )}
                  <option value="disputed">Disputed</option>
                  <option value="void">Void</option>
                </select>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs mt-2.5">
                  {invoice.sent_date && (
                    <>
                      <dt className="text-subtle">Sent</dt>
                      <dd className="text-foreground text-right tabular-nums">{fmtDateUK(invoice.sent_date)}</dd>
                    </>
                  )}
                  {invoice.paid_date && (
                    <>
                      <dt className="text-subtle">Paid</dt>
                      <dd className="text-foreground text-right tabular-nums">{fmtDateUK(invoice.paid_date)}</dd>
                    </>
                  )}
                  {invoice.disputed_at && (
                    <>
                      <dt className="text-subtle">Disputed</dt>
                      <dd className="text-foreground text-right tabular-nums">{fmtDateUK(invoice.disputed_at)}</dd>
                    </>
                  )}
                </dl>
                {invoice.disputed_reason && (
                  <p className="text-xs text-foreground whitespace-pre-wrap mt-2.5 pt-2.5 border-t border-dashed border-border">
                    <span className="text-subtle">Reason:</span> {invoice.disputed_reason}
                  </p>
                )}
              </Card>

              <Card title="VAT & Payment">
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
                  <dt className="text-subtle">Treatment</dt>
                  <dd className="text-foreground text-right">
                    {VAT_TREATMENT_LABELS[invoice.vat_treatment]}
                  </dd>
                  {breakdown.vatAmount > 0 && (
                    <>
                      <dt className="text-subtle">VAT charged</dt>
                      <dd className="text-foreground text-right tabular-nums">
                        {fmtMoney(breakdown.vatAmount, invoice.currency)}
                      </dd>
                    </>
                  )}
                  <dt className="text-subtle">Method</dt>
                  <dd className="text-foreground text-right">
                    {invoice.payment_method === "bank_transfer" ? "Bank transfer" : "Whop (online)"}
                  </dd>
                  {invoice.bank_name && (
                    <>
                      <dt className="text-subtle">Bank</dt>
                      <dd className="text-foreground text-right">{invoice.bank_name}</dd>
                    </>
                  )}
                  {invoice.account_name && (
                    <>
                      <dt className="text-subtle">Account</dt>
                      <dd className="text-foreground text-right">{invoice.account_name}</dd>
                    </>
                  )}
                  {invoice.sort_code && (
                    <>
                      <dt className="text-subtle">Sort code</dt>
                      <dd className="text-foreground text-right tabular-nums">{invoice.sort_code}</dd>
                    </>
                  )}
                  {invoice.account_number && (
                    <>
                      <dt className="text-subtle">Account #</dt>
                      <dd className="text-foreground text-right tabular-nums">{invoice.account_number}</dd>
                    </>
                  )}
                  {invoice.payment_term && (
                    <>
                      <dt className="text-subtle">Terms</dt>
                      <dd className="text-foreground text-right">{invoice.payment_term}</dd>
                    </>
                  )}
                </dl>
              </Card>

              <InvoiceAttachmentCard
                invoice={invoice}
                onUpdated={(updated) => setInvoice(updated)}
              />
            </div>
          </div>
        </>
      )}

      <InvoicePdfModal
        open={previewOpen && !!profile}
        onClose={() => setPreviewOpen(false)}
        document={
          invoice && profile ? (
            <FinanceInvoicePdf invoice={invoice} profile={profile} />
          ) : null
        }
        filename={`${invoice.invoice_number}-${invoice.client_name.replace(/\s+/g, "-")}.pdf`}
        title={`Invoice ${invoice.invoice_number}`}
      />
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
    <div className="space-y-6 max-w-3xl">
      <FormSection title="Details">
        <FormGrid>
          <FormField label="Invoice number" full>
            <input
              type="text"
              value={draft.invoice_number}
              onChange={(e) => update("invoice_number", e.target.value)}
              className={compactInput}
            />
          </FormField>
          <FormField label="Client name">
            <input
              type="text"
              value={draft.client_name}
              onChange={(e) => update("client_name", e.target.value)}
              className={compactInput}
            />
          </FormField>
          <FormField label="Contact name">
            <input
              type="text"
              value={draft.contact_name || ""}
              onChange={(e) => update("contact_name", e.target.value)}
              className={compactInput}
            />
          </FormField>
          <FormField label="Client email">
            <input
              type="email"
              value={draft.client_email || ""}
              onChange={(e) => update("client_email", e.target.value)}
              className={compactInput}
            />
          </FormField>
          <FormField label="Country (ISO2)">
            <input
              type="text"
              value={draft.client_country}
              onChange={(e) => {
                const country = e.target.value.toUpperCase();
                const currentMode = vatTreatmentToMode(draft.vat_treatment);
                setDraft({
                  ...draft,
                  client_country: country,
                  vat_treatment: deriveVatTreatment(currentMode, country),
                });
              }}
              maxLength={2}
              className={compactInput}
            />
          </FormField>
          <FormField label="Client address" full>
            <textarea
              value={draft.client_address || ""}
              onChange={(e) => update("client_address", e.target.value)}
              rows={2}
              className={compactTextarea}
            />
          </FormField>
          <FormField label="Invoice date">
            <input
              type="date"
              value={draft.invoice_date}
              onChange={(e) => update("invoice_date", e.target.value)}
              className={compactInput}
            />
          </FormField>
          <FormField label="Due date">
            <input
              type="date"
              value={draft.due_date}
              onChange={(e) => update("due_date", e.target.value)}
              className={compactInput}
            />
          </FormField>
          <FormField label="Payment terms" full>
            <input
              type="text"
              value={draft.payment_term || ""}
              onChange={(e) => update("payment_term", e.target.value)}
              className={compactInput}
            />
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection title="Line items">
        {draft.items.length > 0 && (
          <div className="border border-border rounded overflow-hidden mb-3">
            <div className="hidden md:grid grid-cols-[1fr_60px_100px_100px_28px] gap-2 px-3 py-2 bg-surface-raised text-2xs font-medium uppercase tracking-wider text-subtle">
              <span>Description</span>
              <span className="text-center">Qty</span>
              <span className="text-right">Unit price</span>
              <span className="text-right">Amount</span>
              <span />
            </div>
            {draft.items.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-1 md:grid-cols-[1fr_60px_100px_100px_28px] gap-2 px-3 py-2 border-t border-dashed border-border items-center"
              >
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => updateItem(item.id, { name: e.target.value })}
                  className={compactInput}
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
                  className={`${compactInput} text-center`}
                />
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={item.unitPrice || ""}
                  onChange={(e) =>
                    updateItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })
                  }
                  className={`${compactInput} text-right`}
                />
                <span className="text-sm text-right px-2 tabular-nums">
                  {fmtMoney(item.quantity * item.unitPrice, draft.currency)}
                </span>
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-1 text-subtle hover:text-danger transition-colors justify-self-center"
                >
                  <XMarkIcon className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        <button
          onClick={addCustomItem}
          className="inline-flex items-center gap-1.5 text-xs text-subtle hover:text-foreground transition-colors"
        >
          <PlusIcon className="size-3.5" /> Add line item
        </button>
      </FormSection>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormSection title="VAT">
          <VatModePicker
            mode={vatTreatmentToMode(draft.vat_treatment)}
            onChange={(next) =>
              update("vat_treatment", deriveVatTreatment(next, draft.client_country))
            }
            clientCountry={draft.client_country}
          />
        </FormSection>

        <FormSection title={`Totals (live, ${draft.currency})`}>
          <div className="bg-surface-raised border border-border rounded p-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Subtotal</span>
              <span className="tabular-nums">
                {fmtMoney(breakdown.subtotal, draft.currency)}
              </span>
            </div>
            {breakdown.vatAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted">
                  VAT ({Math.round(breakdown.vatRate * 100)}%)
                </span>
                <span className="tabular-nums">
                  {fmtMoney(breakdown.vatAmount, draft.currency)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm pt-1.5 border-t border-dashed border-border">
              <span className="font-semibold text-foreground">Total</span>
              <span className="font-semibold tabular-nums">
                {fmtMoney(breakdown.total, draft.currency)}
              </span>
            </div>
          </div>
        </FormSection>
      </div>

      <FormSection title="Payment & notes">
        <FormGrid>
          <FormField label="Method" full>
            <select
              value={draft.payment_method ?? "online"}
              onChange={(e) =>
                update("payment_method", e.target.value as InvoicePaymentMethod)
              }
              className={compactInput}
            >
              <option value="online">Whop (online)</option>
              <option value="bank_transfer">Bank transfer (Tide)</option>
            </select>
          </FormField>
          {(draft.payment_method ?? "online") === "bank_transfer" && (
            <>
              <FormField label="Bank name">
                <input
                  type="text"
                  value={draft.bank_name || ""}
                  onChange={(e) => update("bank_name", e.target.value)}
                  className={compactInput}
                />
              </FormField>
              <FormField label="Account name">
                <input
                  type="text"
                  value={draft.account_name || ""}
                  onChange={(e) => update("account_name", e.target.value)}
                  className={compactInput}
                />
              </FormField>
              <FormField label="Sort code">
                <input
                  type="text"
                  value={draft.sort_code || ""}
                  onChange={(e) => update("sort_code", e.target.value)}
                  className={compactInput}
                />
              </FormField>
              <FormField label="Account number">
                <input
                  type="text"
                  value={draft.account_number || ""}
                  onChange={(e) => update("account_number", e.target.value)}
                  className={compactInput}
                />
              </FormField>
            </>
          )}
          <FormField label="Notes" full>
            <textarea
              value={draft.notes || ""}
              onChange={(e) => update("notes", e.target.value)}
              rows={2}
              className={compactTextarea}
            />
          </FormField>
        </FormGrid>
      </FormSection>

      <div className="flex justify-end gap-2 pt-4 border-t border-dashed border-border">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-subtle hover:text-foreground"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="px-5 py-2 bg-foreground text-background text-sm font-medium rounded hover:opacity-90 disabled:opacity-40"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </div>
  );
}

function InvoiceAttachmentCard({
  invoice,
  onUpdated,
}: {
  invoice: InvoiceIssued;
  onUpdated: (next: InvoiceIssued) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "invoices");
      const res = await fetch("/api/finance/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      const updated = await invoicesIssuedStore.update(invoice.id, {
        attachment_url: json.url,
        attachment_path: json.path,
        attachment_name: file.name,
        updated_at: nowISO(),
      });
      if (updated) onUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function openAttachment() {
    if (!invoice.attachment_path) return;
    setOpening(true);
    try {
      const res = await fetch("/api/finance/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: invoice.attachment_path }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      window.open(json.url, "_blank", "noopener");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open attachment");
    } finally {
      setOpening(false);
    }
  }

  async function removeAttachment() {
    if (!invoice.attachment_path) return;
    if (!confirm(`Remove attachment "${invoice.attachment_name}"?`)) return;
    const updated = await invoicesIssuedStore.update(invoice.id, {
      attachment_url: undefined,
      attachment_path: undefined,
      attachment_name: undefined,
      updated_at: nowISO(),
    });
    if (updated) onUpdated(updated);
  }

  return (
    <Card title="Attachment">
      {invoice.attachment_name ? (
        <div className="space-y-2">
          <button
            onClick={openAttachment}
            disabled={opening}
            className="inline-flex items-center gap-2 text-sm text-foreground underline hover:opacity-80 disabled:opacity-40"
          >
            {opening ? (
              <ArrowPathIcon className="size-4 animate-spin" />
            ) : (
              <DocumentIcon className="size-4" />
            )}
            {invoice.attachment_name}
          </button>
          <p className="text-2xs text-subtle">
            Signed on click, expires 15min
          </p>
          <button
            onClick={removeAttachment}
            className="text-xs text-subtle hover:text-danger underline"
          >
            Remove
          </button>
        </div>
      ) : (
        <div>
          <p className="text-2xs text-subtle mb-2">
            Signed PO, payment confirmation, contract reference, etc.
          </p>
          <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-raised border border-border text-foreground text-xs rounded hover:bg-surface cursor-pointer">
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={handleFile}
              className="hidden"
              disabled={uploading}
            />
            {uploading ? (
              <>
                <ArrowPathIcon className="size-4 animate-spin" /> Uploading...
              </>
            ) : (
              <>Attach file</>
            )}
          </label>
        </div>
      )}
      {error && <p className="text-xs text-danger mt-2">{error}</p>}
    </Card>
  );
}

function ToolbarButton({
  onClick,
  icon,
  children,
  disabled,
  danger,
  title,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  children?: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs transition-colors disabled:opacity-40 ${
        danger
          ? "text-danger hover:bg-surface-raised"
          : "text-foreground hover:bg-surface-raised"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border-faint rounded p-5">
      <h3 className="text-2xs uppercase tracking-wider text-subtle font-medium mb-3">
        {title}
      </h3>
      <div>{children}</div>
    </div>
  );
}

/* Compact form primitives used in EditInvoiceForm. Smaller inputs +
 * tighter inline labels than the global form-styles, so admin forms
 * feel less bulky. */
const compactInput =
  "w-full px-3 py-2 bg-surface-raised border border-border rounded text-sm focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground/10 transition-all placeholder:text-subtle";
const compactTextarea =
  "w-full px-3 py-2 bg-surface-raised border border-border rounded text-sm focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground/10 transition-all resize-none placeholder:text-subtle";

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="text-2xs uppercase tracking-wider text-subtle font-medium mb-3">
        {title}
      </h3>
      {children}
    </section>
  );
}

function FormGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>;
}

function FormField({
  label,
  full,
  children,
}: {
  label: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <label className="block text-2xs uppercase tracking-wider text-subtle font-medium mb-1.5">{label}</label>
      {children}
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
      <div className="text-2xs uppercase tracking-wider text-subtle mb-0.5">{label}</div>
      <div className={`text-sm text-foreground ${multiline ? "whitespace-pre-wrap" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div
      className={`flex justify-between text-sm ${bold ? "font-semibold pt-2 border-t border-dashed border-border text-foreground" : ""}`}
    >
      <span className={bold ? "" : "text-muted"}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
