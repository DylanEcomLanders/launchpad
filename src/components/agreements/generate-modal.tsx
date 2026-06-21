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
import type { Agreement, AgreementKind } from "@/lib/agreements/types";
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
  const hasNda = existing.some((a) => a.kind === "nda");
  const hasContract = existing.some((a) => a.kind === "contract");

  const [genNda, setGenNda] = useState(!hasNda);
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
      setGenNda(!hasNda);
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
  }, [open, person, hasNda, hasContract]);

  async function submit() {
    if (submitting) return;
    if (!genNda && !genContract) {
      setError("Pick at least one agreement to generate.");
      return;
    }
    if (genContract) {
      if (!role.trim()) return setError("Role is required for the contract.");
      const amt = Number(compAmount);
      if (!Number.isFinite(amt) || amt <= 0) {
        return setError("Compensation amount must be a positive number.");
      }
      if (!startDate) return setError("Start date is required for the contract.");
    }
    setSubmitting(true);
    setError("");
    try {
      const created: Agreement[] = [];
      const kinds: AgreementKind[] = [];
      if (genNda && !hasNda) kinds.push("nda");
      if (genContract && !hasContract) kinds.push("contract");

      for (const kind of kinds) {
        const tpl = await ensureTemplate(kind);
        const now = nowISO();
        const agreement: Agreement = {
          id: uid(),
          kind,
          person_id: person.id,
          person_full_name: person.full_name,
          person_email: person.email,
          person_employment_type: employmentType,
          person_job_title: kind === "contract" ? role.trim() : person.job_title,
          /* Comp + start_date only persist on contracts; NDAs don't use
           * those fields when rendering. */
          comp_type: kind === "contract" ? person.compensation_type : undefined,
          comp_amount: kind === "contract" ? Number(compAmount) : undefined,
          comp_currency: kind === "contract" ? compCurrency : undefined,
          comp_frequency: kind === "contract" ? compFrequency : undefined,
          start_date: kind === "contract" ? startDate : undefined,
          template_revision: tpl.revision,
          template_body: structuredClone(tpl.body),
          status: "draft",
          created_at: now,
          updated_at: now,
        };
        await agreementStore.create(agreement);
        created.push(agreement);
      }
      onCreated(created);
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
            {/* Pick which agreements to generate */}
            <div>
              <label className={labelClass}>Generate</label>
              <div className="space-y-2">
                <label className={`flex items-center gap-2 ${hasNda ? "opacity-50" : ""}`}>
                  <input
                    type="checkbox"
                    checked={genNda && !hasNda}
                    disabled={hasNda}
                    onChange={(e) => setGenNda(e.target.checked)}
                    className="accent-[#1B1B1B]"
                  />
                  <span className="text-[14px] text-[#E5E5EA]">
                    NDA{hasNda && " (already exists)"}
                  </span>
                </label>
                <label className={`flex items-center gap-2 ${hasContract ? "opacity-50" : ""}`}>
                  <input
                    type="checkbox"
                    checked={genContract && !hasContract}
                    disabled={hasContract}
                    onChange={(e) => setGenContract(e.target.checked)}
                    className="accent-[#1B1B1B]"
                  />
                  <span className="text-[14px] text-[#E5E5EA]">
                    Contract{hasContract && " (already exists)"}
                  </span>
                </label>
              </div>
            </div>

            {/* Contract-specific fields, only when generating a contract */}
            {genContract && !hasContract && (
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
                disabled={submitting || (!genNda && !genContract) || (hasNda && hasContract)}
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
