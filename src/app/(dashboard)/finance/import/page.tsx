"use client";

import { useState } from "react";
import {
  DocumentArrowUpIcon,
  ArrowPathIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

interface ImportResult {
  imported: number;
  skipped: number;
  clientsCreated: number;
  errors: string[];
}

const SAMPLE_HEADER =
  "invoice_number,client_name,client_email,client_contact_name,client_address,client_country,issue_date,due_date,payment_date,currency,gross_amount,vat_amount,net_amount,gbp_equivalent,vat_treatment,source_system,source_transaction_id,bank_account_received_into,tide_transaction_id,status,notes";

export default function ImportInvoicesPage() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    setError("");
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/finance/import-invoices", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setResult(json as ImportResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-[#1B1B1B] mb-1">Bulk import invoices</h2>
        <p className="text-sm text-[#7A7A7A]">
          Upload a CSV of historical invoices. Each row creates one invoice and (if needed) a new client record. Idempotent on invoice_number — re-running the import skips rows already in the database.
        </p>
      </div>

      <div className="bg-white border border-[#E5E5EA] rounded-xl p-6 space-y-5 shadow-[var(--shadow-soft)]">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A7A7A] mb-2">
            CSV file
          </label>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setResult(null);
            }}
            className="block w-full text-sm text-[#1B1B1B] file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#1B1B1B] file:text-white hover:file:opacity-90"
          />
          {file && (
            <p className="text-xs text-[#7A7A7A] mt-1.5">
              Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>

        <button
          onClick={handleImport}
          disabled={!file || importing}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1B1B1B] text-white text-sm font-medium rounded-md hover:opacity-90 disabled:opacity-40"
        >
          {importing ? <ArrowPathIcon className="size-4 animate-spin" /> : (
            <DocumentArrowUpIcon className="size-4" />
          )}
          {importing ? "Importing..." : "Run import"}
        </button>

        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {result && (
          <div className="px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm">
            <div className="flex items-center gap-2 text-emerald-800 font-medium mb-1">
              <CheckCircleIcon className="size-4" />
              Import complete
            </div>
            <ul className="text-emerald-900 text-[13px] space-y-0.5 mb-2 ml-6 list-disc">
              <li>{result.imported} invoice{result.imported === 1 ? "" : "s"} created</li>
              <li>{result.clientsCreated} new client{result.clientsCreated === 1 ? "" : "s"}</li>
              <li>{result.skipped} skipped (already imported)</li>
            </ul>
            {result.errors.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-amber-800 text-[13px] font-medium">
                  {result.errors.length} row error{result.errors.length === 1 ? "" : "s"}
                </summary>
                <ul className="mt-2 text-[12px] text-amber-900 space-y-1 max-h-64 overflow-y-auto ml-4 list-disc">
                  {result.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>

      <details className="mt-6 bg-white border border-[#E5E5EA] rounded-xl p-5 shadow-[var(--shadow-soft)]">
        <summary className="cursor-pointer text-sm font-semibold text-[#1B1B1B]">
          CSV format reference
        </summary>
        <div className="mt-4 text-xs text-[#7A7A7A] space-y-3">
          <p>
            Headers are case-insensitive. <strong className="text-[#1B1B1B]">Required:</strong>{" "}
            invoice_number, client_name, issue_date, due_date, gross_amount, vat_amount, net_amount, vat_treatment, source_system, status. Everything else is optional.
          </p>
          <div>
            <p className="font-semibold text-[#1B1B1B] mb-1">vat_treatment values:</p>
            <code className="block bg-[#F7F8FA] px-3 py-2 rounded text-[11px]">
              standard_20 | inclusive_20 | outside_scope | reverse_charge | zero_rated | exempt | pre_vat_registration | manual
            </code>
          </div>
          <div>
            <p className="font-semibold text-[#1B1B1B] mb-1">source_system values:</p>
            <code className="block bg-[#F7F8FA] px-3 py-2 rounded text-[11px]">
              stripe | wise | whop | direct | manual
            </code>
          </div>
          <div>
            <p className="font-semibold text-[#1B1B1B] mb-1">bank_account_received_into values:</p>
            <code className="block bg-[#F7F8FA] px-3 py-2 rounded text-[11px]">
              tide | wise_gbp | wise_usd | wise_eur | whop_balance | other
            </code>
          </div>
          <div>
            <p className="font-semibold text-[#1B1B1B] mb-1">status values:</p>
            <code className="block bg-[#F7F8FA] px-3 py-2 rounded text-[11px]">
              draft | sent | paid | void
            </code>
          </div>
          <div>
            <p className="font-semibold text-[#1B1B1B] mb-1">Full header row:</p>
            <code className="block bg-[#F7F8FA] px-3 py-2 rounded text-[11px] overflow-x-auto">
              {SAMPLE_HEADER}
            </code>
          </div>
        </div>
      </details>
    </div>
  );
}
