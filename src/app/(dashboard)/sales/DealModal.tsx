"use client";

// Won-deal capture. Opens when a lead is dropped into "Closed Won". On
// confirm the parent writes a Deal AND runs the client handoff (creates a
// linked Client row). Mock-only here — see client.tsx recordDeal().

import { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { ModalPortal } from "@/components/modal-portal";
import { inputClass, labelClass, selectClass } from "@/lib/form-styles";
import type { DealPlan, Lead } from "@/lib/sales-dashboard/types";

export interface DealInput {
  plan: DealPlan;
  mrr: number;
  setup_fee: number;
  contract_months: number;
}

export function DealModal({
  lead,
  onClose,
  onConfirm,
}: {
  lead: Lead;
  onClose: () => void;
  onConfirm: (input: DealInput) => void;
}) {
  const [plan, setPlan] = useState<DealPlan>(lead.expected_mrr >= 12000 ? "pro" : "core");
  const [mrr, setMrr] = useState(lead.expected_mrr || 8000);
  const [setupFee, setSetupFee] = useState(0);
  const [months, setMonths] = useState(6);

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="bg-surface border border-border rounded-2xl shadow-[var(--shadow-elevated)] w-full max-w-md mx-4 p-5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-foreground">Close won — {lead.company}</h3>
            <button onClick={onClose} className="text-subtle hover:text-foreground">
              <XMarkIcon className="size-4" />
            </button>
          </div>
          <p className="text-[11px] text-subtle mb-4">
            Records the deal and hands {lead.company} off as a new client (CSM + pod left for ops).
          </p>

          <div className="space-y-3">
            <div>
              <label className={labelClass}>Plan</label>
              <select value={plan} onChange={(e) => setPlan(e.target.value as DealPlan)} className={selectClass}>
                <option value="core">Core</option>
                <option value="pro">Pro</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>MRR (£)</label>
                <input
                  type="number"
                  value={mrr}
                  onChange={(e) => setMrr(Number(e.target.value))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Setup fee (£)</label>
                <input
                  type="number"
                  value={setupFee}
                  onChange={(e) => setSetupFee(Number(e.target.value))}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Contract length (months)</label>
              <input
                type="number"
                value={months}
                onChange={(e) => setMonths(Number(e.target.value))}
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-5">
            <button
              onClick={() => onConfirm({ plan, mrr, setup_fee: setupFee, contract_months: months })}
              className="flex-1 py-2 bg-foreground text-background text-xs font-semibold rounded-lg hover:bg-white transition-colors"
            >
              Record deal + create client
            </button>
            <button onClick={onClose} className="px-3 py-2 text-xs text-subtle hover:text-foreground">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
