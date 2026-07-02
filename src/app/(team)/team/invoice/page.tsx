"use client";

/* ── Team invoice submission ──
 * Replaces the ClickUp form linked from /team/payments. Minimal four
 * fields plus optional notes; PDF uploads to finance-documents via
 * /api/team-invoice/upload, then the metadata submits via
 * /api/team-invoice/submit which writes a finance_expenses row and
 * pings Slack ops.
 *
 * Identity: free-text name field, remembered via launchpad-current-user-name
 * in localStorage (same pattern as R&D). The shared team password means
 * we can't reliably scope "your past invoices" yet, so this view is
 * write-only for now (the success state is the receipt).
 */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  DocumentArrowUpIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

interface UploadedFile {
  url: string;
  path: string;
  filename: string;
  size: number;
  type: string;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const CURRENT_USER_KEY = "launchpad-current-user-name";

export default function TeamInvoicePage() {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Remembered name ─────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(CURRENT_USER_KEY);
    if (saved) setName(saved);
  }, []);

  // ── Upload handler ──────────────────────────────────────────────
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
      const data = (await res.json()) as UploadedFile;
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

  // ── Submit ──────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Name is required.");
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return setError("Amount must be a positive number.");
    if (!date) return setError("Invoice date is required.");
    if (!file) return setError("Please attach your invoice PDF.");

    if (typeof window !== "undefined") {
      localStorage.setItem(CURRENT_USER_KEY, name.trim());
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/team-invoice/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          amount: amt,
          invoice_date: date,
          notes: notes.trim() || undefined,
          file_url: file.url,
          file_path: file.path,
          file_name: file.filename,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Submission failed");
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success ─────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full text-center">
          <CheckCircleIcon className="size-14 text-success mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-3">
            Invoice received.
          </h1>
          <p className="text-sm text-subtle leading-relaxed mb-6">
            Your invoice is with the finance team. Payment runs on the 28th if
            it was submitted by the 26th — anything later rolls to next month.
          </p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => {
                setSubmitted(false);
                setAmount("");
                setDate(todayISO());
                setNotes("");
                setFile(null);
              }}
              className="px-4 py-2 text-sm font-medium text-subtle hover:text-foreground transition-colors"
            >
              Submit another
            </button>
            <Link
              href="/team/payments"
              className="px-4 py-2 bg-surface-raised text-foreground hover:bg-border text-sm font-medium rounded-lg transition-colors"
            >
              Back to payments
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Form ────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-6 md:px-10 py-10 pb-24">
      {/* Back */}
      <Link
        href="/team/payments"
        className="inline-flex items-center gap-1.5 text-[13px] text-subtle hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeftIcon className="size-4" />
        Back to payments
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Submit an invoice
        </h1>
        <p className="text-sm text-subtle leading-relaxed max-w-lg">
          Total up the projects you shipped this cycle and attach your invoice
          PDF. Anything in by the 26th gets paid on the 28th.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Row 1: Name + Amount */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Your name" required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="First and last name"
              className={fieldClass}
              required
            />
          </Field>
          <Field label="Amount (£)" required>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className={fieldClass}
              required
              inputMode="decimal"
            />
          </Field>
        </div>

        {/* Row 2: Date */}
        <Field label="Invoice date" required>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`${fieldClass} max-w-[240px]`}
            required
          />
        </Field>

        {/* Row 3: PDF upload */}
        <Field label="Attach invoice (PDF or image)" required>
          {file ? (
            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-surface border border-border rounded-lg shadow-[var(--shadow-soft)]">
              <div className="flex items-center gap-2 min-w-0">
                <DocumentArrowUpIcon className="size-4 text-subtle shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">
                    {file.filename}
                  </div>
                  <div className="text-[11px] text-subtle">
                    {fmtSize(file.size)} · uploaded
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={removeFile}
                className="text-subtle hover:text-danger transition-colors p-1"
                aria-label="Remove file"
              >
                <XMarkIcon className="size-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 py-10 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-subtle transition-colors bg-surface">
              {uploading ? (
                <div className="flex items-center gap-2 text-subtle text-sm">
                  <div className="size-4 border-2 border-border border-t-foreground rounded-full animate-spin" />
                  Uploading...
                </div>
              ) : (
                <>
                  <DocumentArrowUpIcon className="size-6 text-subtle" />
                  <span className="text-sm text-subtle">
                    Click to upload or drop a file
                  </span>
                  <span className="text-[11px] text-subtle">
                    PDF, PNG, JPG, or WebP, up to 25 MB
                  </span>
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
        </Field>

        {/* Row 4: Notes */}
        <Field label="Notes (optional)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. 4 Heavy PDPs for Brand X, includes 10% volume rebate"
            className={`${fieldClass} min-h-[88px] resize-y`}
            rows={3}
          />
        </Field>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || uploading || !file}
          className="w-full py-3.5 bg-surface-raised text-foreground hover:bg-border text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? "Submitting..." : "Submit invoice"}
        </button>

        <p className="text-[11px] text-subtle text-center leading-relaxed">
          Submissions land with the finance team for review before payment runs.
        </p>
      </form>
    </div>
  );
}

const fieldClass =
  "w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-surface focus:ring-1 focus:ring-surface/10 transition-all shadow-[var(--shadow-soft)] placeholder:text-muted";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-foreground mb-1.5">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
