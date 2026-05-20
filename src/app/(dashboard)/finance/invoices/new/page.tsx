"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { ArrowPathIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import { paymentTerms, type PaymentTerm } from "@/lib/config";
import { inputClass, selectClass, labelClass, textareaClass } from "@/lib/form-styles";
import { fmtMoney } from "@/lib/finance/data";
import { calculateVatBreakdown, suggestVatTreatment } from "@/lib/finance/vat";
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
import { loadCompanyProfile } from "@/lib/finance/profile";
import type {
  InvoiceLineItem,
  InvoiceIssued,
  VatTreatment,
  CompanyProfile,
} from "@/lib/finance/types";
import { VAT_TREATMENT_LABELS } from "@/lib/finance/types";

/* Common ISO2 country codes used by Ecomlanders clients. */
const COMMON_COUNTRIES: { code: string; label: string }[] = [
  { code: "GB", label: "United Kingdom" },
  { code: "US", label: "United States" },
  { code: "IE", label: "Ireland" },
  { code: "AU", label: "Australia" },
  { code: "CA", label: "Canada" },
  { code: "NZ", label: "New Zealand" },
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
  { code: "NL", label: "Netherlands" },
];

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
    "100% Upfront — Due Upon Receipt",
  );

  const [clientName, setClientName] = useState("");
  const [contactName, setContactName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientCountry, setClientCountry] = useState("GB");

  const [items, setItems] = useState<InvoiceLineItem[]>([]);
  const [selectedDeliverable, setSelectedDeliverable] = useState("");

  const [vatTreatment, setVatTreatment] = useState<VatTreatment>("not_registered");
  const [vatTouched, setVatTouched] = useState(false);
  const [vatOverride, setVatOverride] = useState<string>("0");

  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [sortCode, setSortCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [notes, setNotes] = useState("");

  /* Load profile on mount. Invoice number is NOT reserved here — that
   * happens on save, so abandoned drafts don't burn sequence numbers. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const p = await loadCompanyProfile();
      if (cancelled) return;
      setProfile(p);
      setVatTreatment(suggestVatTreatment("GB", p.vat_registered));
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

  /* Re-suggest VAT treatment when country or VAT registration changes,
   * unless the user has already overridden it manually. */
  useEffect(() => {
    if (vatTouched || !profile) return;
    setVatTreatment(suggestVatTreatment(clientCountry, profile.vat_registered));
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

  const breakdown = useMemo(
    () =>
      calculateVatBreakdown(
        items,
        vatTreatment,
        vatTreatment === "manual" ? Number(vatOverride) || 0 : undefined,
      ),
    [items, vatTreatment, vatOverride],
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
        client_name: clientName.trim(),
        contact_name: contactName.trim() || undefined,
        client_email: clientEmail.trim() || undefined,
        client_address: clientAddress.trim() || undefined,
        client_country: clientCountry,
        invoice_date: invoiceDate,
        due_date: dueDate,
        payment_term: paymentTerm || undefined,
        items,
        vat_treatment: vatTreatment,
        vat_amount_override:
          vatTreatment === "manual" ? Number(vatOverride) || 0 : undefined,
        bank_name: bankName.trim() || undefined,
        account_name: accountName.trim() || undefined,
        sort_code: sortCode.trim() || undefined,
        account_number: accountNumber.trim() || undefined,
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
        className="inline-flex items-center gap-1.5 text-sm text-[#7A7A7A] hover:text-[#1B1B1B] mb-6 transition-colors"
      >
        <ArrowLeftIcon className="size-4" /> Back to invoices
      </Link>

      <div className="mb-8">
        <h2 className="text-xl font-semibold text-[#1B1B1B] mb-1">New invoice</h2>
        <p className="text-sm text-[#7A7A7A]">
          Invoice number is auto-assigned on save (or override below)
        </p>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-10 max-w-3xl">
        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[#7A7A7A] mb-4">
            Invoice details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Invoice number (optional override)</label>
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
              <label className={labelClass}>Payment terms</label>
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
              <label className={labelClass}>Invoice date</label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Due date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[#7A7A7A] mb-4">
            Client
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Client / company name</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Nutribloom"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Contact name</label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="e.g. Sarah Jones"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="sarah@example.com"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Country</label>
              <select
                value={clientCountry}
                onChange={(e) => setClientCountry(e.target.value)}
                className={selectClass}
              >
                {COMMON_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Billing address</label>
              <textarea
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                placeholder="123 Main St&#10;London, UK"
                rows={2}
                className={textareaClass}
              />
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[#7A7A7A] mb-4">
            Line items
          </h3>

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
                        {d.name} — {fmtMoney(d.price)}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
            <button
              onClick={addDeliverable}
              disabled={!selectedDeliverable}
              className="px-4 py-2.5 bg-[#1B1B1B] text-white text-sm font-medium rounded-md hover:opacity-90 transition-colors disabled:opacity-30"
            >
              <PlusIcon className="size-4" />
            </button>
          </div>

          {items.length > 0 && (
            <div className="border border-[#E5E5EA] rounded-lg overflow-hidden mb-4">
              <div className="hidden md:grid grid-cols-[1fr_70px_120px_120px_36px] gap-2 px-4 py-2.5 bg-[#F3F3F5] text-[10px] font-semibold uppercase tracking-wider text-[#7A7A7A]">
                <span>Description</span>
                <span className="text-center">Qty</span>
                <span className="text-right">Unit price</span>
                <span className="text-right">Amount</span>
                <span />
              </div>

              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className={`grid grid-cols-1 md:grid-cols-[1fr_70px_120px_120px_36px] gap-2 px-4 py-3 border-t border-[#EDEDEF] items-center ${
                    idx % 2 === 1 ? "bg-[#F7F8FA]" : ""
                  }`}
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
                    <span className="text-sm text-right text-[#7A7A7A] px-3">
                      {fmtMoney(item.unitPrice)}
                    </span>
                  )}

                  <span className="text-sm font-medium text-right px-3">
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
            <PlusIcon className="size-3.5" />
            Add custom line item
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
                value={vatTreatment}
                onChange={(e) => {
                  setVatTreatment(e.target.value as VatTreatment);
                  setVatTouched(true);
                }}
                className={selectClass}
              >
                {Object.entries(VAT_TREATMENT_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
              {profile && !profile.vat_registered && vatTreatment === "uk_standard" && (
                <p className="text-[11px] text-amber-700 mt-2">
                  Profile is marked as not VAT registered. Update in /finance/settings before charging VAT.
                </p>
              )}
            </div>
            {vatTreatment === "manual" && (
              <div>
                <label className={labelClass}>Manual VAT amount (£)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={vatOverride}
                  onChange={(e) => setVatOverride(e.target.value)}
                  className={inputClass}
                />
              </div>
            )}
          </div>
        </section>

        {items.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#7A7A7A] mb-4">
              Totals
            </h3>
            <div className="bg-[#F7F8FA] border border-[#E5E5EA] rounded-lg p-5 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#7A7A7A]">Subtotal</span>
                <span className="font-medium tabular-nums">{fmtMoney(breakdown.subtotal)}</span>
              </div>
              {breakdown.vatAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-[#7A7A7A]">
                    VAT ({Math.round(breakdown.vatRate * 100)}%)
                  </span>
                  <span className="font-medium tabular-nums">{fmtMoney(breakdown.vatAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base pt-2 border-t border-[#E5E5EA]">
                <span className="font-semibold">Total</span>
                <span className="font-bold tabular-nums">{fmtMoney(breakdown.total)}</span>
              </div>
              {breakdown.noteForInvoice && (
                <p className="text-[11px] text-[#7A7A7A] mt-3 pt-3 border-t border-[#E5E5EA]">
                  Will be printed on invoice: {breakdown.noteForInvoice}
                </p>
              )}
            </div>
          </section>
        )}

        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[#7A7A7A] mb-4">
            Payment details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Bank name</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. Barclays"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Account name</label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="e.g. Ecomlanders Ltd"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Sort code</label>
              <input
                type="text"
                value={sortCode}
                onChange={(e) => setSortCode(e.target.value)}
                placeholder="XX-XX-XX"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Account number</label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="XXXXXXXX"
                className={inputClass}
              />
            </div>
          </div>
          <div className="mt-4">
            <label className={labelClass}>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Please use invoice number as payment reference"
              rows={2}
              className={textareaClass}
            />
          </div>
        </section>

        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[#E5E5EA]">
          <button
            onClick={() => save("draft")}
            disabled={!canSave || saving}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-white border border-[#E5E5EA] text-[#1B1B1B] text-sm font-medium rounded-md hover:bg-[#F7F8FA] transition-colors disabled:opacity-30"
          >
            {saving ? <ArrowPathIcon className="size-4 animate-spin" /> : null}
            Save as draft
          </button>
          <button
            onClick={() => save("sent")}
            disabled={!canSave || saving}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#1B1B1B] text-white text-sm font-medium rounded-md hover:opacity-90 transition-colors disabled:opacity-30"
          >
            {saving ? <ArrowPathIcon className="size-4 animate-spin" /> : null}
            Save & mark as sent
          </button>
        </div>
      </div>
    </div>
  );
}
