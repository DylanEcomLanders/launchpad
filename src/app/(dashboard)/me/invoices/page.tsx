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

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ArrowUpTrayIcon,
  DocumentArrowUpIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useCurrentUser } from "@/components/auth-gate";
import {
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
  /* Real PDF upload: the file lives in the finance-documents storage
   * bucket via /api/team-invoice/upload. We store the signed URL +
   * storage path on the invoice so finance can re-sign on demand. */
  const [file, setFile] = useState<{ url: string; path: string; filename: string; size: number; type: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [error, setError] = useState("");
  /* Diagnostic dump from the server resolver. Surfaced on the
   * unlinked screen so we can see exactly what the matcher looked at
   * vs what it looked for. Only set when the lookup failed. */
  const [diagnostic, setDiagnostic] = useState<string>("");
  /* Per-row deleting state so the right button shows the spinner
   * label while the request is in flight. */
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    /* Resolve the Person + load past invoices via service-role
     * endpoints. Team-role users can't read company_people or
     * company_invoices through the anon key under the current RLS
     * posture, so client-side getAll() returns 0 rows. The
     * /api/me/* endpoints bypass RLS with the service role. */
    async function load() {
      let matched: Person | null = null;
      let mine: Invoice[] = [];
      if (me) {
        try {
          const res = await fetch("/api/me/resolve-person", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: me.email,
              name: me.name,
              pod_member_id: me.pod_member_id,
            }),
          });
          const json = await res.json().catch(() => ({}));
          if (res.ok) {
            matched = (json as { person: Person | null }).person ?? null;
            if (!matched) {
              setDiagnostic(JSON.stringify((json as { diagnostic?: unknown }).diagnostic ?? {}, null, 2));
            }
          } else {
            console.warn("[me/invoices] resolve-person failed", res.status, json);
            setDiagnostic(`HTTP ${res.status}: ${JSON.stringify(json, null, 2)}`);
          }
        } catch (err) {
          console.warn("[me/invoices] resolve-person threw", err);
          setDiagnostic(`Network: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      if (matched) {
        try {
          const res = await fetch("/api/me/my-invoices", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ person_id: matched.id }),
          });
          if (res.ok) {
            const json = (await res.json()) as { invoices: Invoice[] };
            mine = json.invoices ?? [];
          } else {
            console.warn("[me/invoices] my-invoices failed", res.status);
          }
        } catch (err) {
          console.warn("[me/invoices] my-invoices threw", err);
        }
      }
      if (!matched && me) {
        console.warn(
          "[me/invoices] unlinked",
          { email: me.email, name: me.name, pod: me.pod_member_id ?? null },
        );
      }
      setPerson(matched);
      setInvoices(mine);
      setHydrated(true);
    }
    load();
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

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/team-invoice/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Upload failed");
      }
      const data = await res.json();
      setFile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function removeFile() {
    setFile(null);
  }

  async function deleteInvoice(invoiceId: string) {
    if (!person) return;
    if (!confirm("Delete this invoice? It also removes from finance.")) return;
    setDeletingId(invoiceId);
    try {
      const res = await fetch("/api/me/delete-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice_id: invoiceId, person_id: person.id }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || `Delete failed (${res.status})`);
      }
      setInvoices((rows) => rows.filter((r) => r.id !== invoiceId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

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
    if (!file) {
      setError("Attach your invoice PDF before submitting.");
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
        file_url: file.url,
        file_name: file.filename,
        notes: notes.trim() || undefined,
        status_history: [],
        created_at: now,
        updated_at: now,
      };
      /* Route the write through the service-role endpoint so RLS on
       * company_invoices doesn't reject the insert from a team-role
       * session. The endpoint validates linked_person_id against
       * company_people before writing. */
      const res = await fetch("/api/me/submit-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice: inv }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || `submit failed (${res.status})`);
      }
      setInvoices((rows) => [inv, ...rows]);
      setSubmitted(inv.id);
      /* Clear form for the next one. */
      setInvoiceNumber("");
      setDueDate("");
      setAmount("");
      setNotes("");
      setFile(null);
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
            We couldn&apos;t link your account to a team record yet. Try a hard refresh (Cmd+Shift+R). If it persists, ask an admin to check your name + email match on /company/people.
          </p>
          {me && (
            <p className="text-[11px] text-[#4A4A4A] mt-3">
              Signed in as: {me.name || "(no name)"} · {me.email || "(no email)"}
            </p>
          )}
          {diagnostic && (
            <details className="mt-6 text-left max-w-xl mx-auto">
              <summary className="text-[11px] text-[#71757D] cursor-pointer hover:text-[#E5E5EA]">
                Diagnostic (share with admin)
              </summary>
              <pre className="mt-2 text-[10px] text-[#9CA3AF] bg-[#0C0C0C] border border-[#2A2A2A] rounded-md p-3 overflow-auto whitespace-pre-wrap break-all">
                {diagnostic}
              </pre>
            </details>
          )}
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

          <FieldL label="Invoice PDF">
            {file ? (
              <div className="flex items-center justify-between gap-3 px-3 py-2.5 bg-[#0C0C0C] border border-[#2A2A2A] rounded-md">
                <div className="flex items-center gap-2 min-w-0">
                  <DocumentArrowUpIcon className="size-4 text-[#71757D] shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm text-[#E5E5EA] truncate">{file.filename}</div>
                    <div className="text-[11px] text-[#71757D]">
                      {fmtSize(file.size)} · uploaded
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  className="text-[#71757D] hover:text-rose-400 p-1"
                  aria-label="Remove file"
                >
                  <XMarkIcon className="size-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed border-[#2A2A2A] rounded-md cursor-pointer hover:border-[#999] bg-[#0C0C0C] transition-colors">
                {uploading ? (
                  <div className="flex items-center gap-2 text-[#71757D] text-sm">
                    <div className="size-4 border-2 border-[#2A2A2A] border-t-[#E5E5EA] rounded-full animate-spin" />
                    Uploading...
                  </div>
                ) : (
                  <>
                    <DocumentArrowUpIcon className="size-5 text-[#71757D]" />
                    <span className="text-sm text-[#71757D]">Click to upload or drop your invoice</span>
                    <span className="text-[11px] text-[#71757D]">PDF, PNG, JPG, or WebP · up to 25 MB</span>
                  </>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                  onChange={handleFile}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            )}
          </FieldL>

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
              disabled={submitting || uploading || !file}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-white text-[#0C0C0C] hover:bg-[#E5E5EA] disabled:opacity-40 disabled:cursor-not-allowed"
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
                    <th className="text-right px-4 py-3 font-semibold w-[1%]"></th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((i) => {
                    const badge = INVOICE_STATUS_BADGE[i.status];
                    /* Delete is blocked once an invoice has been paid
                     * (or moved past pending) - protects the audit
                     * trail in /finance. Pending submissions are still
                     * the user's to mistake-correct. */
                    const canDelete = i.status === "pending";
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
                        <td className="px-4 py-3 text-right">
                          {canDelete && person && (
                            <button
                              onClick={() => deleteInvoice(i.id)}
                              disabled={deletingId === i.id}
                              className="text-[11px] text-[#71757D] hover:text-rose-400 disabled:opacity-50"
                              title="Delete invoice"
                            >
                              {deletingId === i.id ? "Deleting..." : "Delete"}
                            </button>
                          )}
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

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
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
