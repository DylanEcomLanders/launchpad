"use client";

/* ── Generate agreements modal ──
 * Shared between the hiring "convert to person" flow and the per-person
 * profile backfill button. Takes a Person + the agreements that already
 * exist for them, shows tickable boxes for NDA and Contract (each
 * disabled when one already exists), then on submit:
 *   - snapshots the active master template via ensureTemplate
 *   - copies the snapshot + person fields onto a new Agreement row
 *   - inserts via agreementStore.create
 *   - calls onCreated(ids) so the caller can navigate
 *
 * No persisting of the user's comp inputs back to the Person — the
 * caller decides whether to also save them on the Person row (the
 * hiring flow doesn't yet, person profile already has them edited
 * elsewhere). Agreements just snapshot what's submitted here.
 */

import { useEffect, useState } from "react";
import { ModalPortal } from "@/components/modal-portal";
import { inputClass, labelClass, selectClass } from "@/lib/form-styles";
import {
  agreementStore,
  ensureTemplate,
  uid,
  nowISO,
  todayISO,
} from "@/lib/agreements/data";
import type { Agreement, TemplateRole } from "@/lib/agreements/types";
import { TEMPLATE_ROLE_LABEL, TEMPLATE_ROLES_BY_KIND } from "@/lib/agreements/types";
import { templateRoleForDepartment } from "@/lib/agreements/data";
import type { Person, PaymentFrequency } from "@/lib/company/types";

interface Props {
  open: boolean;
  onClose: () => void;
  person: Person;
  existing: Agreement[];
  onCreated: (created: Agreement[]) => void;
}

const DEFAULT_FREQUENCY: PaymentFrequency = "monthly";
const CURRENCIES = ["GBP", "USD", "EUR"] as const;
const FREQUENCIES: { value: PaymentFrequency; label: string }[] = [
  { value: "monthly", label: "month" },
  { value: "weekly", label: "week" },
  { value: "per_invoice", label: "invoice" },
];

export function GenerateAgreementsModal({
  open,
  onClose,
  person,
  existing,
  onCreated,
}: Props) {
  /* Multiple contracts per person are allowed (a contractor may have
   * a fresh agreement on a role change, a new project, etc.). Admin
   * sees the existing-count hint below + can pick a fresh template
   * each time. */
  const [genContract, setGenContract] = useState(true);
  const existingContractCount = existing.filter((a) => a.kind === "contract").length;

  /* Contract details — defaulted from the Person row but overridable
   * here so the hiring flow can capture missing fields in one go. */
  const [role, setRole] = useState(person.job_title || "");
  const [employmentType, setEmploymentType] = useState(person.employment_type);
  const [compAmount, setCompAmount] = useState(
    person.compensation_amount ? String(person.compensation_amount) : "",
  );
  const [compCurrency, setCompCurrency] = useState(
    person.compensation_currency || "GBP",
  );
  const [compFrequency, setCompFrequency] = useState<PaymentFrequency>(
    person.payment_frequency || DEFAULT_FREQUENCY,
  );
  const [startDate, setStartDate] = useState(person.start_date || todayISO());
  /* Template defaults to the natural role for the Person's department
   * (Design → designer, Development → developer, otherwise Leadership).
   * Admin can override in the dropdown below. */
  const [templateRole, setTemplateRole] = useState<TemplateRole>(
    templateRoleForDepartment(person.department),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setGenContract(true);
      setRole(person.job_title || "");
      setEmploymentType(person.employment_type);
      setCompAmount(
        person.compensation_amount ? String(person.compensation_amount) : "",
      );
      setCompCurrency(person.compensation_currency || "GBP");
      setCompFrequency(person.payment_frequency || DEFAULT_FREQUENCY);
      setStartDate(person.start_date || todayISO());
      setTemplateRole(templateRoleForDepartment(person.department));
      setError("");
      setSubmitting(false);
    }
  }, [open, person]);

  async function submit() {
    if (submitting) return;
    if (!genContract) {
      setError("Tick Generate contract to continue.");
      return;
    }
    if (!role.trim()) return setError("Role is required for the contract.");
    const amt = Number(compAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return setError("Compensation amount must be a positive number.");
    }
    if (!startDate) return setError("Start date is required for the contract.");

    setSubmitting(true);
    setError("");
    try {
      const tpl = await ensureTemplate("contract", templateRole);
      const now = nowISO();
      const agreement: Agreement = {
        id: uid(),
        kind: "contract",
        person_id: person.id,
        person_full_name: person.full_name,
        person_email: person.email,
        person_employment_type: employmentType,
        person_job_title: role.trim(),
        comp_type: person.compensation_type,
        comp_amount: Number(compAmount),
        comp_currency: compCurrency,
        comp_frequency: compFrequency,
        start_date: startDate,
        template_revision: tpl.revision,
        template_body: structuredClone(tpl.body),
        status: "draft",
        created_at: now,
        updated_at: now,
      };
      await agreementStore.create(agreement);
      onCreated([agreement]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
      setSubmitting(false);
    }
  }

  if (!open) return null;
  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="bg-surface rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-border px-6 py-4 flex items-center justify-between">
            <h2 className="font-semibold text-foreground">
              Generate agreements for {person.full_name}
            </h2>
            <button
              onClick={onClose}
              className="text-subtle hover:text-foreground text-xl leading-none"
            >
              ×
            </button>
          </div>
          <div className="p-6 space-y-5">
            {existingContractCount > 0 && (
              <div className="text-[12px] text-subtle bg-background border border-border rounded-lg p-3">
                {person.full_name} already has {existingContractCount}{" "}
                {existingContractCount === 1 ? "contract" : "contracts"} on file. This will create a fresh one alongside the existing record(s).
              </div>
            )}

            {/* Contract details */}
            {true && (
              <div className="pt-4 border-t border-border space-y-4">
                <div>
                  <label className={labelClass}>Role / job title</label>
                  <input
                    className={inputClass}
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="e.g. Senior Designer"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Employment type</label>
                    <select
                      className={selectClass}
                      value={employmentType}
                      onChange={(e) =>
                        setEmploymentType(e.target.value as Person["employment_type"])
                      }
                    >
                      <option value="contractor">Contractor</option>
                      <option value="employee">Employee</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Start date</label>
                    <input
                      type="date"
                      className={inputClass}
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Contract template</label>
                  <select
                    className={selectClass}
                    value={templateRole}
                    onChange={(e) => setTemplateRole(e.target.value as TemplateRole)}
                  >
                    {TEMPLATE_ROLES_BY_KIND.contract.map((r) => {
                      const isTbc = r === "designer" || r === "developer";
                      return (
                        <option key={r} value={r}>
                          {TEMPLATE_ROLE_LABEL[r]}{isTbc ? " (TBC)" : ""}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-[10px] text-subtle mt-1 leading-relaxed">
                    Auto-picked from the Person&apos;s department - change if
                    you want a different master. Edit the master clauses at
                    /company/contracts/templates.
                  </p>
                </div>
                <div className="grid grid-cols-[1fr_auto_auto] gap-3">
                  <div>
                    <label className={labelClass}>Compensation</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      className={inputClass}
                      value={compAmount}
                      onChange={(e) => setCompAmount(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Currency</label>
                    <select
                      className={selectClass}
                      value={compCurrency}
                      onChange={(e) => setCompCurrency(e.target.value)}
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Per</label>
                    <select
                      className={selectClass}
                      value={compFrequency}
                      onChange={(e) =>
                        setCompFrequency(e.target.value as PaymentFrequency)
                      }
                    >
                      {FREQUENCIES.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="px-3 py-2 bg-danger/10 border border-danger/20 rounded-lg text-[13px] text-danger">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-[13px] text-subtle hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={submitting}
                className="px-3 py-1.5 bg-accent text-accent-foreground text-[13px] font-semibold rounded-lg hover:opacity-90 transition-colors disabled:opacity-40"
              >
                {submitting ? "Generating..." : "Generate"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
