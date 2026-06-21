"use client";

/* ── /me/invoices - team member invoice submission ──
 *
 * Self-service form for team members to submit their own invoices.
 * Resolves the signed-in user to their Person via app_users link,
 * then sets linked_person_id automatically when the invoice is
 * created. Past submitted invoices appear below the form so the user
 * can see what they've sent + their status.
 *
 * Access: any signed-in role. Team members who aren't linked to a
 * Person get a friendly "ask an admin to link your account" message.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import { useCurrentUser } from "@/components/auth-gate";
import {
  invoicesStore,
  peopleStore,
  uid,
  nowISO,
  fmtDateUK,
  fmtMoney,
} from "@/lib/company/data";
import type { Invoice, Person } from "@/lib/company/types";
import { INVOICE_STATUS_BADGE } from "@/lib/company/ui";

export default function MyInvoicesPage() {
  const me = useCurrentUser();
  const [person, setPerson] = useState<Person | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [hydrated, setHydrated] = useState(false);

  /* Form state */
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [issueDate, setIssueDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [dueDate, setDueDate] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("GBP");
  const [notes, setNotes] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([peopleStore.getAll(), invoicesStore.getAll()]).then(
      ([allPeople, allInvoices]) => {
        const meEmail = me?.email?.trim().toLowerCase();
        const matched =
          allPeople.find((p) => p.pod_member_id === me?.pod_member_id) ||
          (meEmail
            ? allPeople.find(
                (p) => p.email?.trim().toLowerCase() === meEmail,
              )
            : null) ||
          null;
        setPerson(matched);
        setInvoices(
          matched
            ? allInvoices.filter((i) => i.linked_person_id === matched.id)
            : [],
        );
        setHydrated(true);
      },
    );
  }, [me]);

  const totals = useMemo(() => {
    let billed = 0,
      paid = 0,
      outstanding = 0;
    for (const i of invoices) {
      if (i.currency !== "GBP") continue;
      billed += i.amount;
      if (i.status === "paid") paid += i.amount;
      else outstanding += i.amount;
    }
    return { billed, paid, outstanding };
  }, [invoices]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!person) {
      setError("Your account isn't linked to a team record yet.");
      return;
    }
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Amount must be a positive number.");
      return;
    }
    if (!issueDate) {
      setError("Issue date is required.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const now = nowISO();
      const inv: Invoice = {
        id: uid(),
        invoice_number: invoiceNumber.trim() || undefined,
        supplier_name: person.full_name,
        linked_person_id: person.id,
        issue_date: issueDate,
        due_date: dueDate || undefined,
        amount: amt,
        currency,
        category: "contractor",
        status: "pending",
        file_url: fileUrl.trim() || undefined,
        file_name: fileName.trim() || undefined,
        notes: notes.trim() || undefined,
        status_history: [],
        created_at: now,
        updated_at: now,
      };
      await invoicesStore.create(inv);
      setInvoices((rows) => [inv, ...rows]);
      setSubmitted(inv.id);
      /* Clear form for the next one. */
      setInvoiceNumber("");
      setDueDate("");
      setAmount("");
      setNotes("");
      setFileUrl("");
      setFileName("");
      setTimeout(() => setSubmitted(null), 4000);
    } catch (err) {
      console.error("[me/invoices] submit failed:", err);
      setError("Submission failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    );
  }

  if (!person) {
    return (
      <div className="min-h-screen bg-[#080808] text-[#E5E5EA]">
        <div className="mx-auto max-w-2xl px-6 py-12 text-center">
          <p className="text-sm text-[#71757D]">
            Your account isn&apos;t linked to a team record yet. Ask an admin
            to link your email so submitted invoices route to you.
          </p>
          <Link
            href="/me"
            className="inline-block mt-4 text-xs text-[#E5E5EA] hover:underline"
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] text-[#E5E5EA]">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link
          href="/me"
          className="inline-flex items-center gap-1.5 text-xs text-[#71757D] hover:text-[#E5E5EA] mb-6"
        >
          <ArrowLeftIcon className="size-3.5" />
          Back
        </Link>

        <h1 className="text-2xl font-bold mb-1">Submit an invoice</h1>
        <p className="text-sm text-[#71757D] mb-8">
          Invoices submitted here auto-link to your account. Admin sees them
          immediately and pays in the next cycle (28th).
        </p>

        {/* Totals - skipped if nothing yet so first-timers see a clean form */}
        {invoices.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <Summary label="Billed (GBP)" value={fmtMoney(totals.billed, "GBP")} />
            <Summary label="Paid" value={fmtMoney(totals.paid, "GBP")} tone="positive" />
            <Summary
              label="Outstanding"
              value={fmtMoney(totals.outstanding, "GBP")}
              tone={totals.outstanding > 0 ? "warn" : "muted"}
            />
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={submit}
          className="bg-[#181818] border border-[#2A2A2A] rounded-xl p-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FieldL label="Invoice number">
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="INV-2026-001"
                className="w-full text-sm bg-[#0C0C0C] text-[#E5E5EA] border border-[#2A2A2A] rounded-md px-3 py-2"
              />
            </FieldL>
            <FieldL label="Issue date">
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full text-sm bg-[#0C0C0C] text-[#E5E5EA] border border-[#2A2A2A] rounded-md px-3 py-2"
              />
            </FieldL>
            <FieldL label="Due date (optional)">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full text-sm bg-[#0C0C0C] text-[#E5E5EA] border border-[#2A2A2A] rounded-md px-3 py-2"
              />
            </FieldL>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-3">
            <FieldL label="Amount">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.01"
                placeholder="0.00"
                className="w-full text-sm bg-[#0C0C0C] text-[#E5E5EA] border border-[#2A2A2A] rounded-md px-3 py-2 tabular-nums"
              />
            </FieldL>
            <FieldL label="Currency">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full text-sm bg-[#0C0C0C] text-[#E5E5EA] border border-[#2A2A2A] rounded-md px-3 py-2"
              >
                <option value="GBP">GBP</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </FieldL>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-3">
            <FieldL label="File link (Google Drive / Dropbox / Notion / etc.)">
              <input
                type="url"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                placeholder="https://..."
                className="w-full text-sm bg-[#0C0C0C] text-[#E5E5EA] border border-[#2A2A2A] rounded-md px-3 py-2"
              />
            </FieldL>
            <FieldL label="File name (optional)">
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="invoice.pdf"
                className="w-full text-sm bg-[#0C0C0C] text-[#E5E5EA] border border-[#2A2A2A] rounded-md px-3 py-2"
              />
            </FieldL>
          </div>

          <FieldL label="Notes (optional)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Anything admin should know about this invoice"
              className="w-full text-sm bg-[#0C0C0C] text-[#E5E5EA] border border-[#2A2A2A] rounded-md px-3 py-2"
            />
          </FieldL>

          {error && <p className="text-xs text-red-300">{error}</p>}
          {submitted && (
            <p className="text-xs text-emerald-300">
              Submitted. Admin will see it on the next refresh.
            </p>
          )}

          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-white text-[#0C0C0C] hover:bg-[#E5E5EA] disabled:opacity-60"
            >
              <ArrowUpTrayIcon className="size-3.5" />
              {submitting ? "Submitting..." : "Submit invoice"}
            </button>
          </div>
        </form>

        {/* History */}
        {invoices.length > 0 && (
          <div className="mt-8">
            <h2 className="text-[11px] uppercase tracking-wider text-[#71757D] font-semibold mb-3">
              Your invoices
            </h2>
            <div className="bg-[#181818] border border-[#2A2A2A] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[#0C0C0C] text-[10px] uppercase tracking-wider text-[#71757D]">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Invoice</th>
                    <th className="text-left px-4 py-3 font-semibold">Issued</th>
                    <th className="text-left px-4 py-3 font-semibold">Amount</th>
                    <th className="text-left px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((i) => {
                    const badge = INVOICE_STATUS_BADGE[i.status];
                    return (
                      <tr
                        key={i.id}
                        className="border-t border-[#2A2A2A]"
                      >
                        <td className="px-4 py-3 text-[#E5E5EA]">
                          {i.invoice_number || "(no number)"}
                        </td>
                        <td className="px-4 py-3 text-[#71757D] tabular-nums">
                          {fmtDateUK(i.issue_date)}
                        </td>
                        <td className="px-4 py-3 font-medium text-[#E5E5EA]">
                          {fmtMoney(i.amount, i.currency)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded"
                            style={{ background: badge.bg, color: badge.text }}
                          >
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FieldL({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-[#71757D] block mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

function Summary({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "warn" | "muted";
}) {
  const valueColor =
    tone === "positive"
      ? "text-emerald-300"
      : tone === "warn"
      ? "text-amber-300"
      : tone === "muted"
      ? "text-[#71757D]"
      : "text-[#E5E5EA]";
  return (
    <div className="bg-[#181818] border border-[#2A2A2A] rounded-xl p-4">
      <div className="text-[10px] uppercase tracking-wider text-[#71757D] mb-1">
        {label}
      </div>
      <div className={`text-xl font-semibold ${valueColor}`}>{value}</div>
    </div>
  );
}
