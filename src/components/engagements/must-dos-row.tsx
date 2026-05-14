"use client";

import type { MustDoGate } from "@/lib/pods-v2/types";
import {
  MUST_DO_CONFIG,
  MustDoModal,
  gateProgress,
  type MustDoGateKey,
} from "./must-do-modal";

const GATE_KEYS: MustDoGateKey[] = [
  "cro_brief",
  "design_handoff",
  "dev_handoff",
  "launch_prep",
];

type MustDosMap = Partial<Record<MustDoGateKey, MustDoGate>>;

/* Engagement-level Must dos row: 4 portal-shaped QA gates as pills.
 * Click a pill to open the modal; state lifted so the parent owns
 * persistence to pods_v2_clients.must_dos. */
export function MustDosRow({
  mustDos,
  openGate,
  onOpen,
  onClose,
  onSave,
}: {
  mustDos: MustDosMap;
  openGate: MustDoGateKey | null;
  onOpen: (key: MustDoGateKey) => void;
  onClose: () => void;
  onSave: (key: MustDoGateKey, patch: Partial<MustDoGate>) => void;
}) {
  const completedCount = GATE_KEYS.filter((k) => mustDos[k]?.completed_at).length;

  return (
    <>
      <section className="mb-5 rounded-lg border border-[#E5E5EA] bg-white px-4 py-3">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#999]">
            Must dos
          </span>
          <span className="text-[10px] text-[#999] tabular-nums">
            {completedCount}/4 complete
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {GATE_KEYS.map((key) => {
            const config = MUST_DO_CONFIG[key];
            const gate = mustDos[key];
            const { checked, total, complete } = gateProgress(config, gate);
            const isComplete = !!gate?.completed_at && complete;
            return (
              <button
                key={key}
                onClick={() => onOpen(key)}
                className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-full border transition-colors ${
                  isComplete
                    ? "border-[#1B5E20] bg-[#E8F5E9] text-[#1B5E20]"
                    : checked > 0
                      ? "border-[#FFB300] bg-[#FFF8E1] text-[#E65100]"
                      : "border-[#E5E5EA] bg-white text-[#666] hover:border-[#1B1B1B] hover:text-[#1B1B1B]"
                }`}
              >
                <span className="text-[10px]">
                  {isComplete ? "✓" : checked > 0 ? "●" : "○"}
                </span>
                {config.title}
                <span className="text-[10px] opacity-70 tabular-nums">
                  {isComplete ? "complete" : `${checked}/${total}`}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {openGate && (
        <MustDoModal
          gateKey={openGate}
          config={MUST_DO_CONFIG[openGate]}
          gate={mustDos[openGate]}
          onSave={(patch) => onSave(openGate, patch)}
          onClose={onClose}
        />
      )}
    </>
  );
}
