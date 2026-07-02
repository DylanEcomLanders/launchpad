"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  DocumentArrowUpIcon,
} from "@heroicons/react/24/outline";
import { inputClass, selectClass, labelClass, textareaClass } from "@/lib/form-styles";
import { expensesStore, todayISO, nowISO, uid } from "@/lib/finance/data";
import {
  EXPENSE_CATEGORY_LABELS,
  type Expense,
  type ExpenseCategory,
  type RecurringFrequency,
} from "@/lib/finance/types";

export default function NewExpensePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const [supplierName, setSupplierName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("software");
  const [amount, setAmount] = useState("");
  const [vatIncluded, setVatIncluded] = useState(false);
  const [vatAmount, setVatAmount] = useState("");
  const [dateDue, setDateDue] = useState(todayISO());
  const [datePaid, setDatePaid] = useState("");
  const [recurring, setRecurring] = useState<RecurringFrequency | "">("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileMeta, setFileMeta] = useState<{
    url: string;
    path: string;
    name: string;
  } | null>(null);

  async function uploadFile(f: File) {
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", f);
      fd.append("folder", "expenses");
      const res = await fetch("/api/finance/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      setFileMeta({ url: json.url, path: json.path, name: f.name });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setFile(null);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!supplierName.trim() || !amount) {
      setError("Supplier and amount required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const amt = parseFloat(amount);
      const now = nowISO();
      const expense: Expense = {
        id: uid(),
        supplier_name: supplierName.trim(),
        description: description.trim() || undefined,
        category,
        amount: amt,
        vat_included: vatIncluded,
        vat_amount: vatIncluded
          ? vatAmount
            ? parseFloat(vatAmount)
            : roundCents(amt - amt / 1.2)
          : undefined,
        date_due: dateDue,
        date_paid: datePaid || undefined,
        status: datePaid ? "paid" : "due",
        recurring: recurring || undefined,
        recurring_next_date: recurring ? nextOccurrence(dateDue, recurring) : undefined,
        file_url: fileMeta?.url,
        file_path: fileMeta?.path,
        file_name: fileMeta?.name,
        notes: notes.trim() || undefined,
        created_at: now,
        updated_at: now,
      };
      await expensesStore.create(expense);
      router.push(`/finance/expenses/${expense.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save expense");
      setSaving(false);
    }
  }

  return (
    <div>
      <Link
        href="/finance/expenses"
        className="inline-flex items-center gap-1.5 text-sm text-subtle hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeftIcon className="size-4" /> Back to expenses
      </Link>

      <div className="mb-8">
        <h2 className="text-xl font-semibold text-foreground">New expense</h2>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-danger/10 border border-danger text-danger rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">
        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-subtle mb-4">
            What & Who
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Supplier / payee</label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="e.g. Figma, Cursor, John Smith"
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className={selectClass}
              >
                {Object.entries(EXPENSE_CATEGORY_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Description (optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Q2 retainer, annual subscription"
                className={inputClass}
              />
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-subtle mb-4">
            Amount & VAT
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Amount (gross, £)</label>
              <input
                type="number"
                min={0.01}
                step={0.01}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={inputClass}
                required
              />
            </div>
            <div className="flex flex-col">
              <label className={labelClass}>VAT included?</label>
              <label className="inline-flex items-center gap-2 px-3 py-2.5 bg-surface border border-border rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={vatIncluded}
                  onChange={(e) => setVatIncluded(e.target.checked)}
                  className="rounded border-border"
                />
                <span className="text-sm">Amount includes UK VAT (20%)</span>
              </label>
              <p className="text-[11px] text-subtle mt-2">
                Required to track reclaimable input VAT once VAT registered
              </p>
            </div>
            {vatIncluded && (
              <div>
                <label className={labelClass}>VAT amount (£, optional)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={vatAmount}
                  onChange={(e) => setVatAmount(e.target.value)}
                  placeholder={amount ? roundCents(parseFloat(amount) - parseFloat(amount) / 1.2).toFixed(2) : "auto from gross"}
                  className={inputClass}
                />
              </div>
            )}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-subtle mb-4">
            Dates
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Date due</label>
              <input
                type="date"
                value={dateDue}
                onChange={(e) => setDateDue(e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Date paid (leave blank if unpaid)</label>
              <input
                type="date"
                value={datePaid}
                onChange={(e) => setDatePaid(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Recurring?</label>
              <select
                value={recurring}
                onChange={(e) => setRecurring(e.target.value as RecurringFrequency | "")}
                className={selectClass}
              >
                <option value="">One-off</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-subtle mb-4">
            Document & Notes
          </h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className={labelClass}>Receipt / invoice PDF (optional)</label>
              <input
                type="file"
                accept="application/pdf,image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  setFile(f);
                  if (f) uploadFile(f);
                }}
                className="text-sm"
              />
              {uploading && (
                <p className="text-[11px] text-subtle mt-1 inline-flex items-center gap-1.5">
                  <ArrowPathIcon className="size-3 animate-spin" /> Uploading...
                </p>
              )}
              {fileMeta && (
                <p className="text-[11px] text-success mt-1 inline-flex items-center gap-1.5">
                  <DocumentArrowUpIcon className="size-3" /> {fileMeta.name} uploaded
                </p>
              )}
            </div>
            <div>
              <label className={labelClass}>Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className={textareaClass}
              />
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Link
            href="/finance/expenses"
            className="px-5 py-3 text-sm text-subtle hover:text-foreground"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving || uploading}
            className="flex items-center gap-2 px-6 py-3 bg-foreground text-background text-sm font-medium rounded-md hover:opacity-90 disabled:opacity-40"
          >
            {saving && <ArrowPathIcon className="size-4 animate-spin" />}
            Save expense
          </button>
        </div>
      </form>
    </div>
  );
}

function roundCents(n: number): number {
  return Math.round(n * 100) / 100;
}

function nextOccurrence(date: string, freq: RecurringFrequency): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (freq === "monthly") d.setUTCMonth(d.getUTCMonth() + 1);
  if (freq === "quarterly") d.setUTCMonth(d.getUTCMonth() + 3);
  if (freq === "annual") d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString().slice(0, 10);
}
