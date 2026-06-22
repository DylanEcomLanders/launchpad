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
import type { Agreement } from "@/lib/agreements/types";
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
  /* Contract is the only kind we generate now - it absorbs the
   * confidentiality / NDA clauses inline. Legacy "nda" rows still
   * display via the read path; we just don't create new ones. */
  const hasContract = existing.some((a) => a.kind === "contract");
  const [genContract, setGenContract] = useState(!hasContract);

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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setGenContract(!hasContract);
      setRole(person.job_title || "");
      setEmploymentType(person.employment_type);
      setCompAmount(
        person.compensation_amount ? String(person.compensation_amount) : "",
      );
      setCompCurrency(person.compensation_currency || "GBP");
      setCompFrequency(person.payment_frequency || DEFAULT_FREQUENCY);
      setStartDate(person.start_date || todayISO());
      setError("");
      setSubmitting(false);
    }
  }, [open, person, hasContract]);

  async function submit() {
    if (submitting) return;
    if (!genContract || hasContract) {
      setError("This person already has a contract.");
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
      const tpl = await ensureTemplate("contract");
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
          className="bg-[#181818] rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-[#2A2A2A] px-6 py-4 flex items-center justify-between">
            <h2 className="font-semibold text-[#E5E5EA]">
              Generate agreements for {person.full_name}
            </h2>
            <button
              onClick={onClose}
              className="text-[#71757D] hover:text-[#E5E5EA] text-xl leading-none"
            >
              ×
            </button>
          </div>
          <div className="p-6 space-y-5">
            {hasContract && (
              <div className="text-sm text-[#71757D] bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg p-3">
                This person already has a contract. View or edit it from the Agreements tab.
              </div>
            )}

            {/* Contract details - the only kind we generate now */}
            {!hasContract && (
              <div className="pt-4 border-t border-[#2A2A2A] space-y-4">
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
              <div className="px-3 py-2 bg-[#FDECEA] border border-[#F5BFBA] rounded-lg text-[13px] text-[#B22B2B]">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-[13px] text-[#71757D] hover:text-[#E5E5EA] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={submitting || hasContract}
                className="px-3 py-1.5 bg-[#222222] text-[#E5E5EA] text-[13px] font-medium rounded-lg hover:bg-[#2A2A2A] transition-colors disabled:opacity-40"
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
