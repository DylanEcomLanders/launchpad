"use client";

import { useEffect, useState } from "react";
import { ArrowPathIcon, CheckIcon } from "@heroicons/react/24/outline";
import { loadCompanyProfile, saveCompanyProfile } from "@/lib/finance/profile";
import type { InvoicePaymentMethod } from "@/lib/finance/types";
import { inputClass, textareaClass } from "@/lib/form-styles";

const fieldLabelClass = "block text-2xs uppercase tracking-wider text-subtle font-medium mb-2";

interface MigrationResult {
  companyInvoicesImported: number;
  expensesImported: number;
  skipped: number;
  errors: string[];
}
import { paymentTerms, type PaymentTerm } from "@/lib/config";
import { selectClass } from "@/lib/form-styles";
import type { CompanyProfile } from "@/lib/finance/types";

export default function FinanceSettingsPage() {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [legalName, setLegalName] = useState("");
  const [addressLines, setAddressLines] = useState("");
  const [companyNumber, setCompanyNumber] = useState("");
  const [vatRegistered, setVatRegistered] = useState(false);
  const [vatNumber, setVatNumber] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<InvoicePaymentMethod>("online");
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [sortCode, setSortCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [paymentTerm, setPaymentTerm] = useState<PaymentTerm | "">("");

  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);

  useEffect(() => {
    loadCompanyProfile().then((p) => {
      setProfile(p);
      setLegalName(p.legal_name);
      setAddressLines(p.address_lines.join("\n"));
      setCompanyNumber(p.company_number);
      setVatRegistered(p.vat_registered);
      setVatNumber(p.vat_number || "");
      setEmail(p.email || "");
      setWebsite(p.website || "");
      setPaymentMethod(p.default_payment_method || "online");
      setBankName(p.default_bank_name || "");
      setAccountName(p.default_account_name || "");
      setSortCode(p.default_sort_code || "");
      setAccountNumber(p.default_account_number || "");
      setPaymentTerm((p.default_payment_term as PaymentTerm) || "");
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const next = await saveCompanyProfile({
        legal_name: legalName.trim(),
        address_lines: addressLines
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean),
        company_number: companyNumber.trim(),
        vat_registered: vatRegistered,
        vat_number: vatRegistered ? vatNumber.trim() || null : null,
        email: email.trim() || undefined,
        website: website.trim() || undefined,
        default_payment_method: paymentMethod,
        default_bank_name: bankName.trim() || undefined,
        default_account_name: accountName.trim() || undefined,
        default_sort_code: sortCode.trim() || undefined,
        default_account_number: accountNumber.trim() || undefined,
        default_payment_term: paymentTerm || undefined,
      });
      setProfile(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function runMigration() {
    if (!confirm("Import data from /company/invoices and /tools/expenses into Finance? Safe to run more than once (already-imported rows are skipped).")) return;
    setMigrating(true);
    setMigrationResult(null);
    try {
      const res = await fetch("/api/finance/migrate-legacy", { method: "POST" });
      const json = (await res.json()) as MigrationResult | { error: string };
      if (!res.ok || "error" in json) {
        throw new Error("error" in json ? json.error : `HTTP ${res.status}`);
      }
      setMigrationResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Migration failed");
    } finally {
      setMigrating(false);
    }
  }

  if (loading || !profile) {
    return <div className="h-48 bg-surface rounded-md border border-border-faint animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      <div className="bg-surface border border-border-faint rounded-md p-5">
        <h2 className="text-lg font-medium text-foreground mb-1">Company profile</h2>
        <p className="text-sm text-muted leading-relaxed max-w-2xl">
          These details appear on every invoice you generate and feed the dashboard tax logic.
        </p>
      </div>

      {error && (
        <div className="px-4 py-3 bg-surface-raised rounded-md text-sm text-status-late">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <section className="bg-surface border border-border-faint rounded-md p-5">
          <h3 className="text-2xs uppercase tracking-wider text-subtle font-medium mb-4">
            Legal
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className={fieldLabelClass}>Legal name</label>
              <input
                type="text"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="md:col-span-2">
              <label className={fieldLabelClass}>Registered address (one line per row)</label>
              <textarea
                value={addressLines}
                onChange={(e) => setAddressLines(e.target.value)}
                rows={4}
                className={textareaClass}
              />
            </div>
            <div>
              <label className={fieldLabelClass}>Company number</label>
              <input
                type="text"
                value={companyNumber}
                onChange={(e) => setCompanyNumber(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={fieldLabelClass}>Public email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="md:col-span-2">
              <label className={fieldLabelClass}>Website</label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </section>

        <section className="bg-surface border border-border-faint rounded-md p-5">
          <h3 className="text-2xs uppercase tracking-wider text-subtle font-medium mb-4">
            VAT
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={fieldLabelClass}>VAT registered?</label>
              <label className="inline-flex items-center gap-2 px-3 py-2.5 bg-surface-raised border border-border rounded-md cursor-pointer">
                <input
                  type="checkbox"
                  checked={vatRegistered}
                  onChange={(e) => setVatRegistered(e.target.checked)}
                  className="rounded border-border accent-foreground"
                />
                <span className="text-sm">
                  Charge VAT on UK invoices and reclaim input VAT on expenses
                </span>
              </label>
            </div>
            {vatRegistered && (
              <div>
                <label className={fieldLabelClass}>VAT number</label>
                <input
                  type="text"
                  value={vatNumber}
                  onChange={(e) => setVatNumber(e.target.value)}
                  placeholder="GB123456789"
                  className={inputClass}
                />
              </div>
            )}
          </div>
        </section>

        <section className="bg-surface border border-border-faint rounded-md p-5">
          <h3 className="text-2xs uppercase tracking-wider text-subtle font-medium mb-4">
            Default payment method (pre-fill on new invoices)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className={fieldLabelClass}>Default method</label>
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
                  ? "PDF will say payment is processed via Whop; you handle the Whop invoice separately."
                  : "Bank details below will print on every invoice."}
              </p>
            </div>
            {paymentMethod === "bank_transfer" && (
              <>
                <div>
                  <label className={fieldLabelClass}>Bank name</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={fieldLabelClass}>Account name</label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={fieldLabelClass}>Sort code</label>
                  <input
                    type="text"
                    value={sortCode}
                    onChange={(e) => setSortCode(e.target.value)}
                    placeholder="XX-XX-XX"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={fieldLabelClass}>Account number</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </>
            )}
            <div className="md:col-span-2">
              <label className={fieldLabelClass}>Default payment terms</label>
              <select
                value={paymentTerm}
                onChange={(e) => setPaymentTerm(e.target.value as PaymentTerm | "")}
                className={selectClass}
              >
                <option value="">No default</option>
                {paymentTerms.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-sm text-status-ontrack">
              <CheckIcon className="size-4" /> Saved
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-foreground text-background text-xs font-medium rounded-md hover:opacity-90 disabled:opacity-40"
          >
            {saving && <ArrowPathIcon className="size-4 animate-spin" />}
            Save profile
          </button>
        </div>

        <section className="bg-surface border border-border-faint rounded-md p-5">
          <h3 className="text-2xs uppercase tracking-wider text-subtle font-medium mb-2">
            Legacy data
          </h3>
          <p className="text-sm text-muted leading-relaxed mb-4 max-w-2xl">
            Import receivable invoices from <code className="text-foreground">/company/invoices</code> and expenses from <code className="text-foreground">/tools/expenses</code> into the Finance module. Idempotent, safe to re-run.
          </p>
          <button
            onClick={runMigration}
            disabled={migrating}
            className="inline-flex items-center gap-2 px-3 py-2 bg-surface-raised border border-border text-foreground text-xs font-medium rounded-md hover:bg-surface-raised disabled:opacity-40 transition-colors"
          >
            {migrating && <ArrowPathIcon className="size-4 animate-spin" />}
            {migrating ? "Importing..." : "Import legacy data"}
          </button>
          {migrationResult && (
            <div className="mt-4 p-3 bg-surface-raised rounded-md text-sm text-status-ontrack">
              Imported {migrationResult.companyInvoicesImported} from company_invoices,{" "}
              {migrationResult.expensesImported} from expenses.{" "}
              {migrationResult.skipped > 0 && `Skipped ${migrationResult.skipped} already-imported.`}
              {migrationResult.errors.length > 0 && (
                <div className="mt-2 text-status-late">
                  Errors: {migrationResult.errors.join("; ")}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
