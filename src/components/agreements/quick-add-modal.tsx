"use client";

/* ── Quick add team agreement modal ──
 *
 * Three-field fast path for spinning up an NDA + contract:
 *   1. Name
 *   2. Role
 *   3. Compensation amount
 *
 * Everything else is defaulted:
 *   - employment_type = contractor (matches the payment-structure doc)
 *   - currency        = GBP
 *   - frequency       = monthly
 *   - start_date      = today
 *   - generate both   = NDA + Contract
 *
 * If a Person with the exact same full_name already exists, we reuse
 * that row (with a confirm so it's never silent). Otherwise we create
 * a fresh Person and link the agreements to it. Either way the caller
 * gets both new agreements back via onCreated().
 *
 * For more control over employment type / currency / frequency / start
 * date, use the GenerateAgreementsModal from the hiring flow or the
 * Agreements tab on a Person profile.
 */

import { useEffect, useRef, useState } from "react";
import { ModalPortal } from "@/components/modal-portal";
import { inputClass, labelClass, selectClass } from "@/lib/form-styles";
import {
  agreementStore,
  ensureTemplate,
  uid as agreementUid,
  nowISO,
  todayISO,
} from "@/lib/agreements/data";
import { peopleStore, uid as personUid } from "@/lib/company/data";
import type { Agreement, AgreementKind } from "@/lib/agreements/types";
import type { Person, PaymentFrequency } from "@/lib/company/types";

interface Props {
  open: boolean;
  onClose: () => void;
  /* All existing people, so we can match by name and reuse a row if
   * one already exists (avoids accidentally duplicating people). */
  existingPeople: Person[];
  /* All existing agreements, so we skip generating a duplicate kind
   * if the matched Person already has one. */
  existingAgreements: Agreement[];
  onCreated: (created: Agreement[]) => void;
}

const CURRENCIES = ["GBP", "USD", "EUR"] as const;
const FREQUENCIES: { value: PaymentFrequency; label: string }[] = [
  { value: "monthly", label: "month" },
  { value: "weekly", label: "week" },
  { value: "per_invoice", label: "invoice" },
];

export function QuickAddAgreementModal({
  open,
  onClose,
  existingPeople,
  existingAgreements,
  onCreated,
}: Props) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [compAmount, setCompAmount] = useState("");
  const [compCurrency, setCompCurrency] = useState<(typeof CURRENCIES)[number]>("GBP");
  const [compFrequency, setCompFrequency] = useState<PaymentFrequency>("monthly");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setRole("");
      setCompAmount("");
      setCompCurrency("GBP");
      setCompFrequency("monthly");
      setError("");
      setSubmitting(false);
      setTimeout(() => nameRef.current?.focus(), 50);
    }
  }, [open]);

  /* Live match by normalised name — used to surface a "this person
   * already exists" notice before submit so Dylan can intentionally
   * reuse vs spotting it after the fact. */
  const trimmedName = name.trim();
  const matchedPerson = trimmedName
    ? existingPeople.find(
        (p) => p.full_name.trim().toLowerCase() === trimmedName.toLowerCase(),
      )
    : null;
  const matchedAgreements = matchedPerson
    ? existingAgreements.filter((a) => a.person_id === matchedPerson.id)
    : [];
  const matchedHasNda = matchedAgreements.some((a) => a.kind === "nda");
  const matchedHasContract = matchedAgreements.some((a) => a.kind === "contract");

  async function submit() {
    if (submitting) return;
    if (!trimmedName) return setError("Name is required.");
    if (!role.trim()) return setError("Role is required.");
    const amt = Number(compAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return setError("Compensation must be a positive number.");
    }
    setSubmitting(true);
    setError("");

    try {
      const now = nowISO();

      /* Find or create the Person row. Matched people get a confirm
       * before we touch them, just in case Dylan typed a name that
       * collides with an existing team member by accident. */
      let person: Person;
      if (matchedPerson) {
        const ok = confirm(
          `A team member named "${matchedPerson.full_name}" already exists. Generate the missing agreements for them?`,
        );
        if (!ok) {
          setSubmitting(false);
          return;
        }
        person = matchedPerson;
      } else {
        person = {
          id: personUid(),
          full_name: trimmedName,
          job_title: role.trim(),
          employment_type: "contractor",
          status: "active",
          start_date: todayISO(),
          compensation_amount: amt,
          compensation_currency: compCurrency,
          payment_frequency: compFrequency,
          created_at: now,
          updated_at: now,
        };
        await peopleStore.create(person);
      }

      /* Generate whichever agreements don't already exist for this
       * person. Most commonly that's both, but if we reused an
       * existing person it might be one or zero. */
      const kinds: AgreementKind[] = [];
      if (!matchedHasNda) kinds.push("nda");
      if (!matchedHasContract) kinds.push("contract");
      if (kinds.length === 0) {
        setError("This person already has both an NDA and a contract.");
        setSubmitting(false);
        return;
      }

      const created: Agreement[] = [];
      for (const kind of kinds) {
        const tpl = await ensureTemplate(kind);
        const startDate = person.start_date || todayISO();
        const agreement: Agreement = {
          id: agreementUid(),
          kind,
          person_id: person.id,
          person_full_name: person.full_name,
          person_email: person.email,
          person_employment_type: person.employment_type,
          person_job_title: role.trim(),
          comp_amount: kind === "contract" ? amt : undefined,
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
          className="bg-white rounded-2xl w-full max-w-md shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-[#EDEDEF] px-6 py-4 flex items-center justify-between">
            <h2 className="font-semibold text-[#1B1B1B]">New team agreement</h2>
            <button
              onClick={onClose}
              className="text-[#7A7A7A] hover:text-[#1B1B1B] text-xl leading-none"
            >
              ×
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className={labelClass}>Full name</label>
              <input
                ref={nameRef}
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="First and last name"
              />
              {matchedPerson && (
                <p className="text-[11px] text-[#92591A] mt-1.5 leading-relaxed">
                  This name matches an existing team member ({matchedPerson.full_name}
                  ). We&apos;ll generate the missing{" "}
                  {!matchedHasNda && !matchedHasContract
                    ? "NDA + contract"
                    : !matchedHasNda
                    ? "NDA"
                    : !matchedHasContract
                    ? "contract"
                    : "nothing — both already exist"}{" "}
                  for them.
                </p>
              )}
            </div>

            <div>
              <label className={labelClass}>Role</label>
              <input
                className={inputClass}
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Senior Designer"
              />
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
                  onChange={(e) =>
                    setCompCurrency(e.target.value as (typeof CURRENCIES)[number])
                  }
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
                  onChange={(e) => setCompFrequency(e.target.value as PaymentFrequency)}
                >
                  {FREQUENCIES.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Defaults summary — what gets quietly applied behind the
                scenes, surfaced so Dylan never wonders why a row shows
                up with values he didn't pick. */}
            <div className="px-3 py-2.5 bg-[#F7F8FA] border border-[#EDEDEF] rounded-lg text-[11px] text-[#7A7A7A] leading-relaxed">
              <strong className="text-[#1B1B1B] font-medium">Defaults applied:</strong>{" "}
              contractor · start date today · generate both NDA and contract.{" "}
              {matchedPerson
                ? "Person row is reused."
                : "A new Person row is created in /company/people."}{" "}
              Edit any of these on the individual agreement detail page.
            </div>

            {error && (
              <div className="px-3 py-2 bg-[#FDECEA] border border-[#F5BFBA] rounded-lg text-[13px] text-[#B22B2B]">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-[13px] text-[#7A7A7A] hover:text-[#1B1B1B] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={
                  submitting ||
                  !trimmedName ||
                  !role.trim() ||
                  !compAmount ||
                  (matchedHasNda && matchedHasContract)
                }
                className="px-3 py-1.5 bg-[#1B1B1B] text-white text-[13px] font-medium rounded-lg hover:bg-[#2D2D2D] transition-colors disabled:opacity-40"
              >
                {submitting ? "Creating..." : "Create and draft"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
