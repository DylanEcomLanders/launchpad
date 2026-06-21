"use client";

import { useState, useMemo } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { DecorativeBlocks } from "@/components/decorative-blocks";
import { PdfPreview } from "@/components/pdf-preview";
import { InvoicePdfDocument } from "@/components/invoice-pdf-document";
import { paymentTerms, type PaymentTerm } from "@/lib/config";
import { inputClass, selectClass, labelClass } from "@/lib/form-styles";
import { formatGBP } from "@/lib/formatters";

/* ── Pricing data (client-facing) ── */

interface InvoiceDeliverable {
  name: string;
  category: string;
  price: number;
}

const invoiceDeliverables: InvoiceDeliverable[] = [
  /* Page Builds */
  { name: "1 Page Build", category: "Page Builds", price: 2999 },
  { name: "2 Page Build", category: "Page Builds", price: 5499 },
  { name: "3 Page Build", category: "Page Builds", price: 7999 },
  { name: "4 Page Build", category: "Page Builds", price: 9999 },
  { name: "Single Advertorial / Listicle", category: "Page Builds", price: 2000 },
  { name: "Advertorial / Listicle Bundle ×2", category: "Page Builds", price: 3500 },
  /* Secondary Pages */
  { name: "Collection Page", category: "Secondary Pages", price: 750 },
  { name: "Account Page", category: "Secondary Pages", price: 750 },
  { name: "About Us Page", category: "Secondary Pages", price: 750 },
  /* Tertiary Pages */
  { name: "FAQ Page", category: "Tertiary Pages", price: 500 },
  { name: "Contact Page", category: "Tertiary Pages", price: 500 },
  { name: "Cart Page", category: "Tertiary Pages", price: 500 },
  { name: "Navigation", category: "Tertiary Pages", price: 500 },
  { name: "Policy Pages (All)", category: "Tertiary Pages", price: 500 },
  /* Additional Services */
  { name: "5 Static Ads", category: "Additional Services", price: 500 },
  { name: "10 Static Ads", category: "Additional Services", price: 850 },
  { name: "10 Email Designs", category: "Additional Services", price: 750 },
  { name: "20 Email Designs", category: "Additional Services", price: 1500 },
  { name: "Extended 30 Day Support", category: "Additional Services", price: 1000 },
  { name: "Extended 14 Day Support", category: "Additional Services", price: 500 },
  { name: "Full Email Flow Design", category: "Additional Services", price: 2500 },
  { name: "Brand Refresh", category: "Additional Services", price: 500 },
  { name: "24hr Turnaround", category: "Additional Services", price: 2000 },
  { name: "48hr Turnaround", category: "Additional Services", price: 1000 },
  { name: "A/B Test Setup + Monitor", category: "Additional Services", price: 500 },
  { name: "Page Variant / Reskin", category: "Additional Services", price: 1000 },
  { name: "Cart / Post Purchase", category: "Additional Services", price: 500 },
  { name: "Full Brand Refresh", category: "Additional Services", price: 2500 },
];

const deliverableCategories = [
  "Page Builds",
  "Secondary Pages",
  "Tertiary Pages",
  "Additional Services",
] as const;

/* ── Types ── */
interface InvoiceLineItem {
  id: string;
  type: "deliverable" | "custom";
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  paymentTerm: string;
  clientName: string;
  contactName: string;
  clientEmail: string;
  clientAddress: string;
  items: InvoiceLineItem[];
  includeVat: boolean;
  bankName: string;
  accountName: string;
  sortCode: string;
  accountNumber: string;
  notes: string;
}

/* ── Helpers ── */
function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export default function InvoiceGeneratorPage() {
  const [showPreview, setShowPreview] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [invoiceNumber, setInvoiceNumber] = useState("INV-001");
  const [invoiceDate, setInvoiceDate] = useState(todayStr());
  const [dueDate, setDueDate] = useState(todayStr());
  const [paymentTerm, setPaymentTerm] = useState<PaymentTerm | "">("100% Upfront - Due Upon Receipt");
  const [clientName, setClientName] = useState("");
  const [contactName, setContactName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [includeVat, setIncludeVat] = useState(false);
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [sortCode, setSortCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [notes, setNotes] = useState("");

  const [items, setItems] = useState<InvoiceLineItem[]>([]);

  /* ── Deliverable selector state ── */
  const [selectedDeliverable, setSelectedDeliverable] = useState("");

  const resetPreview = () => setShowPreview(false);

  /* ── Add deliverable from dropdown ── */
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
    resetPreview();
  };

  /* ── Add custom line item ── */
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
    resetPreview();
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    resetPreview();
  };

  const updateItem = (id: string, updates: Partial<InvoiceLineItem>) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...updates } : i))
    );
    resetPreview();
  };

  /* ── Totals ── */
  const { subtotal, vat, total } = useMemo(() => {
    const sub = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const v = includeVat ? sub * 0.2 : 0;
    return { subtotal: sub, vat: v, total: sub + v };
  }, [items, includeVat]);

  /* ── Generate ── */
  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setShowPreview(true);
      setGenerating(false);
    }, 300);
  };

  const invoiceData: InvoiceData = {
    invoiceNumber,
    invoiceDate,
    dueDate,
    paymentTerm: paymentTerm || "",
    clientName,
    contactName,
    clientEmail,
    clientAddress,
    items,
    includeVat,
    bankName,
    accountName,
    sortCode,
    accountNumber,
    notes,
  };

  const canGenerate = clientName.trim() && items.length > 0;

  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-12 py-16 md:py-24">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-[28px] font-bold mb-2">
            Invoice Generator
          </h1>
          <p className="text-[#71757D]">
            Generate branded PDF invoices for client projects
          </p>
        </div>

        <div className="space-y-10">
          {/* ── Invoice Details ── */}
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#71757D] mb-4">
              Invoice Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Invoice Number</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => { setInvoiceNumber(e.target.value); resetPreview(); }}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Invoice Date</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => { setInvoiceDate(e.target.value); resetPreview(); }}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => { setDueDate(e.target.value); resetPreview(); }}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Payment Terms</label>
                <select
                  value={paymentTerm}
                  onChange={(e) => { setPaymentTerm(e.target.value as PaymentTerm); resetPreview(); }}
                  className={selectClass}
                >
                  <option value="">Select terms...</option>
                  {paymentTerms.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* ── Client Details ── */}
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#71757D] mb-4">
              Client Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Client / Company Name</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => { setClientName(e.target.value); resetPreview(); }}
                  placeholder="Ecomlanders"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Contact Name</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => { setContactName(e.target.value); resetPreview(); }}
                  placeholder="Sarah Jones"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => { setClientEmail(e.target.value); resetPreview(); }}
                  placeholder="sarah@ecomlanders.app"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Address</label>
                <textarea
                  value={clientAddress}
                  onChange={(e) => { setClientAddress(e.target.value); resetPreview(); }}
                  placeholder="123 Main St&#10;London, UK"
                  rows={2}
                  className={`${inputClass} resize-none`}
                />
              </div>
            </div>
          </section>

          {/* ── Line Items ── */}
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#71757D] mb-4">
              Line Items
            </h2>

            {/* Add deliverable */}
            <div className="flex gap-2 mb-4">
              <select
                value={selectedDeliverable}
                onChange={(e) => setSelectedDeliverable(e.target.value)}
                className={`${selectClass} flex-1`}
              >
                <option value="">Add a deliverable...</option>
                {deliverableCategories.map((cat) => (
                  <optgroup key={cat} label={cat}>
                    {invoiceDeliverables
                      .filter((d) => d.category === cat)
                      .map((d) => (
                        <option key={d.name} value={d.name}>
                          {d.name} — {formatGBP(d.price)}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
              <button
                onClick={addDeliverable}
                disabled={!selectedDeliverable}
                className="px-4 py-2.5 bg-white text-[#0C0C0C] text-sm font-medium rounded-md hover:bg-[#F3F4F6] transition-colors disabled:opacity-30"
              >
                <PlusIcon className="size-4" />
              </button>
            </div>

            {/* Items list */}
            {items.length > 0 && (
              <div className="border border-[#2A2A2A] rounded-lg overflow-hidden mb-4">
                {/* Header */}
                <div className="hidden md:grid grid-cols-[1fr_70px_100px_100px_36px] gap-2 px-4 py-2.5 bg-[#222222] text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">
                  <span>Description</span>
                  <span className="text-center">Qty</span>
                  <span className="text-right">Unit Price</span>
                  <span className="text-right">Amount</span>
                  <span />
                </div>

                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`grid grid-cols-1 md:grid-cols-[1fr_70px_100px_100px_36px] gap-2 px-4 py-3 border-t border-[#2A2A2A] items-center ${
                      idx % 2 === 1 ? "bg-[#0C0C0C]" : ""
                    }`}
                  >
                    {/* Description */}
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

                    {/* Quantity */}
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(item.id, { quantity: Math.max(1, parseInt(e.target.value) || 1) })
                      }
                      className={`${inputClass} text-center text-sm`}
                    />

                    {/* Unit price */}
                    {item.type === "custom" ? (
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.unitPrice || ""}
                        onChange={(e) =>
                          updateItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })
                        }
                        placeholder="0.00"
                        className={`${inputClass} text-right text-sm`}
                      />
                    ) : (
                      <span className="text-sm text-right text-[#71757D]">
                        {formatGBP(item.unitPrice)}
                      </span>
                    )}

                    {/* Amount */}
                    <span className="text-sm font-medium text-right">
                      {formatGBP(item.quantity * item.unitPrice)}
                    </span>

                    {/* Remove */}
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1 text-[#71757D] hover:text-red-500 transition-colors justify-self-center"
                    >
                      <XMarkIcon className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add custom item */}
            <button
              onClick={addCustomItem}
              className="flex items-center gap-1.5 text-sm text-[#71757D] hover:text-[#E5E5EA] transition-colors"
            >
              <PlusIcon className="size-3.5" />
              Add custom line item
            </button>

            {/* Totals */}
            {items.length > 0 && (
              <div className="mt-6 border-t border-[#2A2A2A] pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#71757D]">Subtotal</span>
                  <span className="font-medium">{formatGBP(subtotal)}</span>
                </div>

                {/* VAT toggle */}
                <div className="flex justify-between items-center text-sm">
                  <label className="flex items-center gap-2 text-[#71757D] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeVat}
                      onChange={(e) => { setIncludeVat(e.target.checked); resetPreview(); }}
                      className="rounded border-[#2A2A2A]"
                    />
                    VAT (20%)
                  </label>
                  <span className="font-medium">{formatGBP(vat)}</span>
                </div>

                <div className="flex justify-between text-sm pt-2 border-t border-[#2A2A2A]">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-base">{formatGBP(total)}</span>
                </div>
              </div>
            )}
          </section>

          {/* ── Payment Details ── */}
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#71757D] mb-4">
              Payment Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Bank Name</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => { setBankName(e.target.value); resetPreview(); }}
                  placeholder="e.g. Barclays"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Account Name</label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => { setAccountName(e.target.value); resetPreview(); }}
                  placeholder="e.g. Ecomlanders Ltd"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Sort Code</label>
                <input
                  type="text"
                  value={sortCode}
                  onChange={(e) => { setSortCode(e.target.value); resetPreview(); }}
                  placeholder="XX-XX-XX"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Account Number</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => { setAccountNumber(e.target.value); resetPreview(); }}
                  placeholder="XXXXXXXX"
                  className={inputClass}
                />
              </div>
            </div>
            <div className="mt-4">
              <label className={labelClass}>Notes</label>
              <textarea
                value={notes}
                onChange={(e) => { setNotes(e.target.value); resetPreview(); }}
                placeholder="e.g. Please use invoice number as payment reference"
                rows={2}
                className={`${inputClass} resize-none`}
              />
            </div>
          </section>

          {/* ── Generate Button ── */}
          <button
            onClick={handleGenerate}
            disabled={!canGenerate || generating}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white text-[#0C0C0C] text-sm font-medium rounded-md hover:bg-[#F3F4F6] transition-colors disabled:opacity-30"
          >
            {generating ? (
              <>
                <ArrowPathIcon className="size-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Invoice PDF"
            )}
          </button>

          {/* ── Preview ── */}
          {showPreview && (
            <div className="mt-4">
              <PdfPreview
                document={<InvoicePdfDocument data={invoiceData} />}
                filename={`${invoiceNumber}-${clientName.replace(/\s+/g, "-") || "Invoice"}.pdf`}
                label="Invoice"
                description={`Invoice ${invoiceNumber} for ${clientName || "client"}`}
                details={`${items.length} line item${items.length !== 1 ? "s" : ""} · Total: ${formatGBP(total)}`}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
