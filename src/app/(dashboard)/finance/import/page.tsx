"use client";

import { useState } from "react";
import {
  DocumentArrowUpIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  UsersIcon,
  DocumentTextIcon,
  BuildingStorefrontIcon,
  BanknotesIcon,
} from "@heroicons/react/24/outline";

interface InvoiceImportResult {
  imported: number;
  skipped: number;
  clientsCreated: number;
  errors: string[];
}

interface ClientImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

interface SupplierImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

interface ExpenseImportResult {
  imported: number;
  skipped: number;
  suppliersCreated: number;
  errors: string[];
}

const INVOICE_HEADER =
  "invoice_number,client_name,client_email,client_contact_name,client_address,client_country,issue_date,due_date,payment_date,currency,gross_amount,vat_amount,net_amount,gbp_equivalent,vat_treatment,source_system,source_transaction_id,bank_account_received_into,tide_transaction_id,status,notes";

const CLIENT_HEADER =
  "customer,inferred_country,first_payment,last_payment,payment_count,total_gbp,sources_used,notes";

const SUPPLIER_HEADER =
  "supplier,first_transaction,last_transaction,transaction_count,total_spent,avg_per_transaction,default_category,default_vat_treatment,country,is_vat_registered,is_recurring,notes";

const EXPENSE_HEADER =
  "temp_id,expense_number,issue_date,payment_date,supplier,description,category,currency,amount_gbp,vat_amount_gbp,net_amount_gbp,vat_treatment,source_system,paid_from,status,tax_year";

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <div className="bg-surface border border-border-faint rounded-md p-5">
        <h2 className="text-lg font-medium text-foreground mb-1">Bulk import</h2>
        <p className="text-sm text-muted leading-relaxed max-w-2xl">
          Four-stage CSV import. Run masters first (clients, suppliers) so the transactional imports (invoices, expenses) can match by name. All four endpoints are idempotent on the natural key.
        </p>
      </div>

      <ImportSection
        title="Stage 1: Clients"
        subtitle="Upload clients_master.csv. Skipped on duplicate name."
        icon={<UsersIcon className="size-5 text-subtle" />}
        endpoint="/api/finance/import-clients"
        headerReference={CLIENT_HEADER}
        ResultRenderer={ClientResult}
      />

      <ImportSection
        title="Stage 2: Invoices"
        subtitle="Upload invoices_master.csv. Blank invoice_numbers are auto-assigned (EL-YYYY-NNN, counter resets per UK tax year). Skipped on duplicate invoice_number."
        icon={<DocumentTextIcon className="size-5 text-subtle" />}
        endpoint="/api/finance/import-invoices"
        headerReference={INVOICE_HEADER}
        ResultRenderer={InvoiceResult}
      />

      <ImportSection
        title="Stage 3: Suppliers"
        subtitle="Upload suppliers_master.csv. Skipped on duplicate name. Run this before expenses so the expense import can match suppliers by name."
        icon={<BuildingStorefrontIcon className="size-5 text-subtle" />}
        endpoint="/api/finance/import-suppliers"
        headerReference={SUPPLIER_HEADER}
        ResultRenderer={SupplierResult}
      />

      <ImportSection
        title="Stage 4: Expenses"
        subtitle="Upload expenses_master_clean.csv. Blank expense_numbers are auto-assigned (EXP-YYYY-NNN, counter resets per UK tax year). Skipped on duplicate expense_number."
        icon={<BanknotesIcon className="size-5 text-subtle" />}
        endpoint="/api/finance/import-expenses"
        headerReference={EXPENSE_HEADER}
        ResultRenderer={ExpenseResult}
      />
    </div>
  );
}

function ImportSection<R extends { errors: string[] }>({
  title,
  subtitle,
  icon,
  endpoint,
  headerReference,
  ResultRenderer,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  endpoint: string;
  headerReference: string;
  ResultRenderer: React.ComponentType<{ result: R }>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<R | null>(null);
  const [error, setError] = useState("");

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    setError("");
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(endpoint, { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setResult(json as R);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="bg-surface border border-border-faint rounded-md p-5">
      <div className="flex items-start gap-3 mb-4">
        {icon}
        <div>
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          <p className="text-2xs text-subtle mt-0.5 leading-relaxed">{subtitle}</p>
        </div>
      </div>

      <div className="space-y-4">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            setFile(e.target.files?.[0] || null);
            setResult(null);
          }}
          className="block w-full text-sm text-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-border file:text-xs file:font-medium file:bg-surface-raised file:text-foreground hover:file:bg-surface-raised"
        />
        {file && (
          <p className="text-xs text-subtle">
            {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </p>
        )}

        <button
          onClick={handleImport}
          disabled={!file || importing}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-foreground text-background text-xs font-medium rounded-md hover:opacity-90 disabled:opacity-40"
        >
          {importing ? (
            <ArrowPathIcon className="size-4 animate-spin" />
          ) : (
            <DocumentArrowUpIcon className="size-4" />
          )}
          {importing ? "Importing..." : "Run import"}
        </button>

        {error && (
          <div className="px-3 py-2 bg-surface-raised rounded-md text-xs text-status-late">
            {error}
          </div>
        )}
        {result && <ResultRenderer result={result} />}

        <details className="text-xs text-subtle">
          <summary className="cursor-pointer">CSV header reference</summary>
          <code className="block bg-surface-raised px-3 py-2 rounded-md text-4xs mt-2 overflow-x-auto">
            {headerReference}
          </code>
        </details>
      </div>
    </div>
  );
}

function ClientResult({ result }: { result: ClientImportResult }) {
  return (
    <div className="px-3 py-2 bg-surface-raised rounded-md text-xs text-status-ontrack">
      <div className="flex items-center gap-1.5 font-medium mb-1">
        <CheckCircleIcon className="size-4" />
        Import complete
      </div>
      <ul className="ml-5 list-disc space-y-0.5">
        <li>{result.imported} client{result.imported === 1 ? "" : "s"} created</li>
        <li>{result.skipped} skipped (name already exists)</li>
      </ul>
      {result.errors.length > 0 && <ErrorDetails errors={result.errors} />}
    </div>
  );
}

function InvoiceResult({ result }: { result: InvoiceImportResult }) {
  return (
    <div className="px-3 py-2 bg-surface-raised rounded-md text-xs text-status-ontrack">
      <div className="flex items-center gap-1.5 font-medium mb-1">
        <CheckCircleIcon className="size-4" />
        Import complete
      </div>
      <ul className="ml-5 list-disc space-y-0.5">
        <li>{result.imported} invoice{result.imported === 1 ? "" : "s"} created</li>
        <li>{result.clientsCreated} new client{result.clientsCreated === 1 ? "" : "s"}</li>
        <li>{result.skipped} skipped (invoice_number already exists)</li>
      </ul>
      {result.errors.length > 0 && <ErrorDetails errors={result.errors} />}
    </div>
  );
}

function SupplierResult({ result }: { result: SupplierImportResult }) {
  return (
    <div className="px-3 py-2 bg-surface-raised rounded-md text-xs text-status-ontrack">
      <div className="flex items-center gap-1.5 font-medium mb-1">
        <CheckCircleIcon className="size-4" />
        Import complete
      </div>
      <ul className="ml-5 list-disc space-y-0.5">
        <li>{result.imported} supplier{result.imported === 1 ? "" : "s"} created</li>
        <li>{result.skipped} skipped (name already exists)</li>
      </ul>
      {result.errors.length > 0 && <ErrorDetails errors={result.errors} />}
    </div>
  );
}

function ExpenseResult({ result }: { result: ExpenseImportResult }) {
  return (
    <div className="px-3 py-2 bg-surface-raised rounded-md text-xs text-status-ontrack">
      <div className="flex items-center gap-1.5 font-medium mb-1">
        <CheckCircleIcon className="size-4" />
        Import complete
      </div>
      <ul className="ml-5 list-disc space-y-0.5">
        <li>{result.imported} expense{result.imported === 1 ? "" : "s"} created</li>
        <li>{result.suppliersCreated} new supplier{result.suppliersCreated === 1 ? "" : "s"}</li>
        <li>{result.skipped} skipped (expense_number already exists)</li>
      </ul>
      {result.errors.length > 0 && <ErrorDetails errors={result.errors} />}
    </div>
  );
}

function ErrorDetails({ errors }: { errors: string[] }) {
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-status-approaching font-medium">
        {errors.length} row error{errors.length === 1 ? "" : "s"}
      </summary>
      <ul className="mt-1 text-2xs text-status-approaching space-y-0.5 max-h-56 overflow-y-auto ml-4 list-disc">
        {errors.map((e, i) => (
          <li key={i}>{e}</li>
        ))}
      </ul>
    </details>
  );
}
