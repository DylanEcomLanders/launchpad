"use client";

// Lead detail — opened from a pipeline card. Fully controlled: every field
// edit calls onChange(patch) so the parent's lead state stays the source of
// truth (the kanban card updates live behind the modal). Edit name, company,
// owner, stage, warmth, expected value, and notes for context.

import { XMarkIcon } from "@heroicons/react/24/outline";
import { ModalPortal } from "@/components/modal-portal";
import { inputClass, labelClass, selectClass, textareaClass } from "@/lib/form-styles";
import type { Lead, PipelineStage, Temperature } from "@/lib/sales-dashboard/types";
import type { Owner } from "@/lib/sales-dashboard/mock-data";

const TEMPS: Temperature[] = ["hot", "warm", "cold", "nurture"];
const TEMP_COLOR: Record<Temperature, string> = {
  hot: "#F97066",
  warm: "#F5A623",
  cold: "#5B8DEF",
  nurture: "#9CA3AF",
};

export function LeadDetailModal({
  lead,
  owners,
  stages,
  onClose,
  onChange,
}: {
  lead: Lead;
  owners: Owner[];
  stages: PipelineStage[];
  onClose: () => void;
  onChange: (patch: Partial<Lead>) => void;
}) {
  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="bg-[#181818] border border-[#2A2A2A] rounded-2xl shadow-[var(--shadow-elevated)] w-full max-w-lg mx-4 p-5 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-[#E5E5EA]">{lead.company || "Untitled"}</h3>
              <p className="text-[12px] text-[#71757D] mt-0.5">
                Source: {lead.source.replace("_", " ")} · {lead.revenue_band || "—"}
              </p>
            </div>
            <button onClick={onClose} className="text-[#71757D] hover:text-[#E5E5EA]">
              <XMarkIcon className="size-5" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Contact name</label>
                <input
                  value={lead.name}
                  onChange={(e) => onChange({ name: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Company</label>
                <input
                  value={lead.company}
                  onChange={(e) => onChange({ company: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Email</label>
                <input
                  value={lead.email}
                  onChange={(e) => onChange({ email: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input
                  value={lead.phone}
                  onChange={(e) => onChange({ phone: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Owner</label>
                <select
                  value={lead.owner_id}
                  onChange={(e) => onChange({ owner_id: e.target.value })}
                  className={selectClass}
                >
                  {owners.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Stage</label>
                <select
                  value={lead.stage_id}
                  onChange={(e) => onChange({ stage_id: e.target.value })}
                  className={selectClass}
                >
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Expected MRR (£)</label>
                <input
                  type="number"
                  value={lead.expected_mrr}
                  onChange={(e) => onChange({ expected_mrr: Number(e.target.value) })}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Warmth</label>
              <div className="flex flex-wrap gap-1.5">
                {TEMPS.map((t) => (
                  <button
                    key={t}
                    onClick={() => onChange({ temperature: t })}
                    className={`inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-full border transition-colors ${
                      lead.temperature === t ? "font-semibold" : "border-[#2A2A2A] text-[#9CA3AF] hover:border-[#3A3A3A]"
                    }`}
                    style={
                      lead.temperature === t
                        ? { borderColor: TEMP_COLOR[t], color: TEMP_COLOR[t], background: `${TEMP_COLOR[t]}1A` }
                        : undefined
                    }
                  >
                    <span className="size-1.5 rounded-full" style={{ background: TEMP_COLOR[t] }} />
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelClass}>Notes</label>
              <textarea
                value={lead.notes}
                onChange={(e) => onChange({ notes: e.target.value })}
                className={textareaClass + " min-h-[90px] text-[13px]"}
                placeholder="Context, next steps, objections…"
              />
            </div>
          </div>

          <div className="flex justify-end mt-5">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#E5E5EA] text-[#0C0C0C] text-xs font-semibold rounded-lg hover:bg-white transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
