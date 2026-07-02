"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { ArrowPathIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import { paymentTerms, type PaymentTerm } from "@/lib/config";
import { inputClass, selectClass, textareaClass } from "@/lib/form-styles";
import { fmtMoney } from "@/lib/finance/data";
import {
  calculateVatBreakdown,
  deriveVatTreatment,
  type VatMode,
} from "@/lib/finance/vat";
import {
  invoiceDeliverables,
  deliverableCategories,
} from "@/lib/finance/deliverables";
import {
  invoicesIssuedStore,
  reserveInvoiceNumber,
  todayISO,
  addDays,
  nowISO,
  uid,
} from "@/lib/finance/data";
import { VatModePicker } from "@/components/finance/vat-mode-picker";
import { ClientPicker } from "@/components/finance/client-picker";
import type { Client } from "@/lib/finance/types";
import { loadCompanyProfile } from "@/lib/finance/profile";
import type {
  InvoiceLineItem,
  InvoiceIssued,
  InvoicePaymentMethod,
  CompanyProfile,
} from "@/lib/finance/types";

/* Field label matching the DESIGN spec: text-2xs uppercase tracking-wider
 * text-subtle font-medium. Used for every form field label on this page. */
const fieldLabel = "block text-2xs uppercase tracking-wider text-subtle font-medium mb-1.5";

/* Card-wrapped form section. Title whispers (token label), fields grouped
 * inside one p-5 surface card. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface border border-border-faint rounded-md p-5">
      <h3 className="text-2xs uppercase tracking-wider text-subtle font-medium mb-4">
        {title}
      </h3>
      {children}
    </section>
  );
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceNumberOverride, setInvoiceNumberOverride] = useState(false);
  const [invoiceDate, setInvoiceDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState(addDays(todayISO(), 14));
  const [paymentTerm, setPaymentTerm] = useState<PaymentTerm | "">(
    "100% Upfront - Due Upon Receipt",
  );

  // Client selection - snapshots into the invoice on save so historical
  // PDFs render correctly even if the client's details change later.
  const [clientId, setClientId] = useState<string | undefined>(undefined);
  const [clientName, setClientName] = useState("");
  const [contactName, setContactName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientCountry, setClientCountry] = useState("GB");

  const [items, setItems] = useState<InvoiceLineItem[]>([]);
  const [selectedDeliverable, setSelectedDeliverable] = useState("");

  const [vatMode, setVatMode] = useState<VatMode>("off");
  const [vatTouched, setVatTouched] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<InvoicePaymentMethod>("online");
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [sortCode, setSortCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [notes, setNotes] = useState("");

  /* Load profile on mount. Invoice number is NOT reserved here - that
   * happens on save, so abandoned drafts don't burn sequence numbers. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const p = await loadCompanyProfile();
      if (cancelled) return;
      setProfile(p);
      // Default VAT mode: inclusive when company is VAT registered and
      // client is UK (matches Ecomlanders' "for now, prices include VAT"
      // transition strategy). User can flip to off / exclusive manually.
      const isUK = clientCountry === "GB" || clientCountry === "UK";
      setVatMode(p.vat_registered && isUK ? "inclusive" : "off");
      setPaymentMethod(p.default_payment_method || "online");
      setBankName(p.default_bank_name || "");
      setAccountName(p.default_account_name || "");
      setSortCode(p.default_sort_code || "");
      setAccountNumber(p.default_account_number || "");
      if (p.default_payment_term && paymentTerms.includes(p.default_payment_term as PaymentTerm)) {
        setPaymentTerm(p.default_payment_term as PaymentTerm);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* Auto-flip VAT mode when country changes. UK + VAT-registered =
   * inclusive (default), otherwise off. User overrides win. */
  useEffect(() => {
    if (vatTouched || !profile) return;
    const isUK = clientCountry === "GB" || clientCountry === "UK";
    setVatMode(profile.vat_registered && isUK ? "inclusive" : "off");
  }, [clientCountry, profile, vatTouched]);

  const addDeliverable = () => {
    if (!selectedDeliverable) return;
    const d = invoiceDeliverables.find((x) => x.name === selectedDeliverable);
    if (!d) return;
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "deliverable",
        name: d.name,
        quantity: 1,
        unitPrice: d.price,
      },
    ]);
    setSelectedDeliverable("");
  };

  const addCustomItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "custom",
        name: "",
        quantity: 1,
        unitPrice: 0,
      },
    ]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, updates: Partial<InvoiceLineItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
  };

  const vatTreatment = useMemo(
    () => deriveVatTreatment(vatMode, clientCountry),
    [vatMode, clientCountry],
  );

  const breakdown = useMemo(
    () => calculateVatBreakdown(items, vatTreatment),
    [items, vatTreatment],
  );

  const canSave = clientName.trim() && items.length > 0;

  async function save(status: "draft" | "sent") {
    if (!canSave) return;
    setSaving(true);
    setError("");
    try {
      // Reserve a number now if the user hasn't manually overridden one.
      const finalNumber =
        invoiceNumberOverride && invoiceNumber.trim()
          ? invoiceNumber.trim()
          : await reserveInvoiceNumber();
      setInvoiceNumber(finalNumber);
      const now = nowISO();
      const invoice: InvoiceIssued = {
        id: uid(),
        invoice_number: finalNumber,
        client_id: clientId,
        client_name: clientName.trim(),
        contact_name: contactName.trim() || undefined,
        client_email: clientEmail.trim() || undefined,
        client_address: clientAddress.trim() || undefined,
        client_country: clientCountry,
        invoice_date: invoiceDate,
        due_date: dueDate,
        payment_term: paymentTerm || undefined,
        items,
        currency: "GBP",
        gross_amount: breakdown.total,
        vat_amount: breakdown.vatAmount,
        net_amount: breakdown.subtotal,
        gbp_equivalent: breakdown.total, // GBP-native
        vat_treatment: vatTreatment,
        payment_method: paymentMethod,
        source_system: "direct",
        bank_account_received_into:
          paymentMethod === "online" ? "whop_balance" : "tide",
        // Only persist bank fields when method is bank_transfer; keeps
        // the data shape clean and ensures the PDF never shows stale
        // bank details on a Whop-only invoice.
        bank_name:
          paymentMethod === "bank_transfer" ? bankName.trim() || undefined : undefined,
        account_name:
          paymentMethod === "bank_transfer" ? accountName.trim() || undefined : undefined,
        sort_code:
          paymentMethod === "bank_transfer" ? sortCode.trim() || undefined : undefined,
        account_number:
          paymentMethod === "bank_transfer" ? accountNumber.trim() || undefined : undefined,
        notes: notes.trim() || undefined,
        status,
        sent_date: status === "sent" ? now : undefined,
        created_at: now,
        updated_at: now,
      };
      await invoicesIssuedStore.create(invoice);
      router.push(`/finance/invoices/${invoice.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save invoice");
      setSaving(false);
    }
  }

  return (
    <div>
      <Link
        href="/finance/invoices"
        className="inline-flex items-center gap-1.5 text-sm text-subtle hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeftIcon className="size-4" /> Back to invoices
      </Link>

      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-1">New invoice</h2>
        <p className="text-sm text-muted">
          Invoice number is auto-assigned on save (or override below)
        </p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-danger/10 border border-danger/20 rounded-md text-sm text-danger">
          {error}
        </div>
      )}

      <div className="space-y-6 max-w-3xl">
        <Section title="Invoice details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={fieldLabel}>Invoice number (optional override)</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => {
                  setInvoiceNumber(e.target.value);
                  setInvoiceNumberOverride(true);
                }}
                placeholder="Leave blank for auto"
                className={inputClass}
              />
            </div>
            <div>
              <label className={fieldLabel}>Payment terms</label>
              <select
                value={paymentTerm}
                onChange={(e) => setPaymentTerm(e.target.value as PaymentTerm | "")}
                className={selectClass}
              >
                <option value="">Select terms...</option>
                {paymentTerms.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={fieldLabel}>Invoice date</label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={fieldLabel}>Due date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </Section>

        <Section title="Client">
          <ClientPicker
            clientId={clientId}
            onSelect={(c: Client | null) => {
              setClientId(c?.id);
              setClientName(c?.name || "");
              setContactName(c?.contact_name || "");
              setClientEmail(c?.email || "");
              setClientAddress(c?.address || "");
              setClientCountry(c?.country || "GB");
            }}
          />
          {clientId && (
            <div className="mt-3 px-4 py-3 bg-surface-raised border border-border rounded-md text-xs text-muted">
              <div className="text-sm font-medium text-foreground">{clientName}</div>
              {contactName && <div>{contactName}</div>}
              {clientEmail && <div>{clientEmail}</div>}
              {clientAddress && (
                <div className="whitespace-pre-wrap mt-1">{clientAddress}</div>
              )}
              <div className="mt-1 text-2xs text-subtle">
                Country {clientCountry}. Snapshot will be written to the invoice on save.
              </div>
            </div>
          )}
        </Section>

        <Section title="Line items">
          <div className="flex gap-2 mb-4">
            <select
              value={selectedDeliverable}
              onChange={(e) => setSelectedDeliverable(e.target.value)}
              className={`${selectClass} flex-1`}
            >
              <option value="">Add a deliverable from the catalogue...</option>
              {deliverableCategories.map((cat) => (
                <optgroup key={cat} label={cat}>
                  {invoiceDeliverables
                    .filter((d) => d.category === cat)
                    .map((d) => (
                      <option key={d.name} value={d.name}>
                        {d.name} - {fmtMoney(d.price)}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
            <button
              onClick={addDeliverable}
              disabled={!selectedDeliverable}
              className="px-4 py-2.5 bg-foreground text-background text-sm font-medium rounded-md hover:opacity-90 transition-colors disabled:opacity-30"
            >
              <PlusIcon className="size-4" />
            </button>
          </div>

          {items.length > 0 && (
            <div className="border border-border rounded-md overflow-hidden mb-4">
              <div className="hidden md:grid grid-cols-[1fr_70px_120px_120px_36px] gap-2 px-4 py-2.5 bg-surface-raised text-2xs font-medium uppercase tracking-wider text-subtle">
                <span>Description</span>
                <span className="text-center">Qty</span>
                <span className="text-right">Unit price</span>
                <span className="text-right">Amount</span>
                <span />
              </div>

              {items.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-1 md:grid-cols-[1fr_70px_120px_120px_36px] gap-2 px-4 py-3 border-t border-dashed border-border items-center"
                >
                  {item.type === "deliverable" ? (
                    <span className="text-sm">{item.name}</span>
                  ) : (
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateItem(item.id, { name: e.target.value })}
                      placeholder="Custom item description"
                      className={`${inputClass} text-sm`}
                    />
                  )}

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

                  {item.type === "custom" ? (
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.unitPrice || ""}
                      onChange={(e) =>
                        updateItem(item.id, {
                          unitPrice: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="0.00"
                      className={`${inputClass} text-right text-sm`}
                    />
                  ) : (
                    <span className="text-sm text-right text-subtle px-3">
                      {fmtMoney(item.unitPrice)}
                    </span>
                  )}

                  <span className="text-sm font-medium text-right px-3">
                    {fmtMoney(item.quantity * item.unitPrice)}
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
            className="flex items-center gap-1.5 text-sm text-subtle hover:text-foreground transition-colors"
          >
            <PlusIcon className="size-3.5" />
            Add custom line item
          </button>
        </Section>

        <Section title="VAT">
          <VatModePicker
            mode={vatMode}
            onChange={(next) => {
              setVatMode(next);
              setVatTouched(true);
            }}
            clientCountry={clientCountry}
          />
          {vatMode !== "off" && profile && !profile.vat_registered && (
            <p className="text-2xs text-warning mt-2">
              Heads-up: profile is marked as not VAT registered. Update in Settings before sending.
            </p>
          )}
        </Section>

        {items.length > 0 && (
          <Section title="Totals">
            <div className="bg-surface-raised border border-border rounded-md p-5 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Subtotal</span>
                <span className="font-medium tabular-nums">{fmtMoney(breakdown.subtotal)}</span>
              </div>
              {breakdown.vatAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted">
                    VAT ({Math.round(breakdown.vatRate * 100)}%)
                  </span>
                  <span className="font-medium tabular-nums">{fmtMoney(breakdown.vatAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm pt-2 border-t border-dashed border-border">
                <span className="font-semibold text-foreground">Total</span>
                <span className="font-semibold tabular-nums">{fmtMoney(breakdown.total)}</span>
              </div>
              {breakdown.noteForInvoice && (
                <p className="text-2xs text-subtle mt-3 pt-3 border-t border-dashed border-border">
                  Will be printed on invoice: {breakdown.noteForInvoice}
                </p>
              )}
            </div>
          </Section>
        )}

        <Section title="Payment method">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className={fieldLabel}>How does this client pay?</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as InvoicePaymentMethod)}
                className={selectClass}
              >
                <option value="online">Whop (online)</option>
                <option value="bank_transfer">Bank transfer (Tide)</option>
              </select>
              <p className="text-2xs text-subtle mt-1">
                {paymentMethod === "online"
                  ? "PDF will say payment is processed via Whop. The Whop invoice is handled separately."
                  : "Bank details below print on the invoice PDF."}
              </p>
            </div>
            {paymentMethod === "bank_transfer" && (
              <>
                <div>
                  <label className={fieldLabel}>Bank name</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. Tide"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={fieldLabel}>Account name</label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="e.g. Ecomlanders Ltd"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={fieldLabel}>Sort code</label>
                  <input
                    type="text"
                    value={sortCode}
                    onChange={(e) => setSortCode(e.target.value)}
                    placeholder="XX-XX-XX"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={fieldLabel}>Account number</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="XXXXXXXX"
                    className={inputClass}
                  />
                </div>
              </>
            )}
          </div>
          <div className="mt-4">
            <label className={fieldLabel}>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Please use invoice number as payment reference"
              rows={2}
              className={textareaClass}
            />
          </div>
        </Section>

        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <button
            onClick={() => save("draft")}
            disabled={!canSave || saving}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-surface border border-border text-foreground text-sm font-medium rounded-md hover:bg-surface-raised transition-colors disabled:opacity-30"
          >
            {saving ? <ArrowPathIcon className="size-4 animate-spin" /> : null}
            Save as draft
          </button>
          <button
            onClick={() => save("sent")}
            disabled={!canSave || saving}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-foreground text-background text-sm font-medium rounded-md hover:opacity-90 transition-colors disabled:opacity-30"
          >
            {saving ? <ArrowPathIcon className="size-4 animate-spin" /> : null}
            Save & mark as sent
          </button>
        </div>
      </div>
    </div>
  );
}
