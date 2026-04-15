"use client";

import { useState, useCallback } from "react";
import { CheckIcon } from "@heroicons/react/24/outline";
import type { QAGate, QAGateItem, PortalProject, GateKey } from "@/lib/portal/types";
import type { PortalData } from "@/lib/portal/types";
import {
  CRO_BRIEF_ITEMS, DESIGN_HANDOFF_ITEMS, DEV_HANDOFF_ITEMS,
  createDefaultGate, getGateProgress, isGateComplete, isDesignHandoffComplete,
} from "@/lib/portal/qa-gates";

/* ── Launch prep items (new gate) ── */
const LAUNCH_PREP_ITEMS = [
  "Client has approved the staging/preview version (written confirmation)",
  "Go-live date and time confirmed with client",
  "Redirects set up (if replacing an existing page)",
  "Analytics tracking confirmed (GA4 events, UTMs)",
  "Meta pixel / tracking pixels verified",
  "Backup of existing page taken (if replacing)",
  "Test method confirmed (A/B, before/after, or direct launch)",
  "Baseline metrics recorded (if testing)",
  "Team available post-launch for immediate fixes",
];

/* ── Gate mapping: new gate keys → old qa_gates keys ── */
const gateMapping: Record<GateKey, {
  qaGateKey: "cro_brief" | "design_handoff" | "dev_handoff" | "launch_prep";
  title: string;
  subtitle: string;
  color: string;
  items: string[];
  type: "checklist" | "design-handoff" | "launch-prep";
}> = {
  "design-brief": {
    qaGateKey: "cro_brief",
    title: "Design Brief",
    subtitle: "Confirm the brief is complete before design starts",
    color: "#DC2626",
    items: CRO_BRIEF_ITEMS,
    type: "checklist",
  },
  "dev-handover": {
    qaGateKey: "design_handoff",
    title: "Dev Handover",
    subtitle: "Everything the developer needs to build without asking questions",
    color: "#7C3AED",
    items: DESIGN_HANDOFF_ITEMS,
    type: "design-handoff",
  },
  "dev-qa": {
    qaGateKey: "dev_handoff",
    title: "Dev QA",
    subtitle: "Self-QA before submitting for internal review",
    color: "#059669",
    items: DEV_HANDOFF_ITEMS,
    type: "checklist",
  },
  "handoff-testing": {
    qaGateKey: "launch_prep",
    title: "Handoff / Testing",
    subtitle: "Launch method and testing setup must be confirmed before go-live",
    color: "#2563EB",
    items: LAUNCH_PREP_ITEMS,
    type: "launch-prep",
  },
};

interface GateChecklistFormProps {
  gateKey: GateKey;
  project: PortalProject;
  portal: PortalData;
  onUpdate: (patch: Partial<PortalProject>) => Promise<void>;
}

export function GateChecklistForm({ gateKey, project, portal, onUpdate }: GateChecklistFormProps) {
  const config = gateMapping[gateKey];
  const gates = project.qa_gates || {};

  // Get or create the gate data using the old qa_gates keys
  const [gate, setGateLocal] = useState<QAGate>(() => {
    const existing = gates[config.qaGateKey as keyof typeof gates] as QAGate | undefined;
    if (existing) return existing;
    return createDefaultGate(config.items);
  });
  const [saving, setSaving] = useState(false);

  const progress = getGateProgress(gate);
  const isSubmitted = gate.status === "submitted";

  // Save gate back to project.qa_gates
  const saveGate = useCallback(async (updatedGate: QAGate) => {
    setSaving(true);
    setGateLocal(updatedGate);
    const newGates = { ...gates, [config.qaGateKey]: updatedGate };
    await onUpdate({ qa_gates: newGates });
    setSaving(false);
  }, [gates, config.qaGateKey, onUpdate]);

  // Toggle a checklist item
  const toggleItem = (idx: number) => {
    if (isSubmitted) return;
    const updated = { ...gate, items: gate.items.map((item, i) => i === idx ? { ...item, checked: !item.checked } : item) };
    setGateLocal(updated);
    // Auto-save on toggle
    saveGate(updated);
  };

  // Submit the gate
  const handleSubmit = async () => {
    const submitted = { ...gate, status: "submitted" as const, submitted_at: new Date().toISOString(), submitted_by: "team" };
    await saveGate(submitted);
  };

  // Reopen / reset
  const handleReopen = async () => {
    const reopened = { ...gate, status: "pending" as const, submitted_at: undefined, submitted_by: "" };
    await saveGate(reopened);
  };

  // Check if design handoff form is ready (needs figma + loom + all items)
  const isReady = config.type === "design-handoff"
    ? isDesignHandoffComplete(gate)
    : isGateComplete(gate);

  const fieldClass = "w-full text-sm px-3 py-2.5 border border-[#E8E8E8] rounded-lg focus:outline-none focus:border-[#999] placeholder:text-[#CCC] disabled:opacity-50 disabled:bg-[#FAFAFA]";

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="size-3 rounded-full shrink-0" style={{ backgroundColor: config.color }} />
          <div>
            <h2 className="text-lg font-bold text-[#1A1A1A]">{config.title}</h2>
            <p className="text-xs text-[#777]">{config.subtitle}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xl font-bold text-[#1A1A1A] tabular-nums">{progress.checked}/{progress.total}</p>
          {saving && <p className="text-[9px] text-[#CCC]">Saving...</p>}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-[#F0F0F0] rounded-full mb-8 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${(progress.checked / progress.total) * 100}%`,
            backgroundColor: config.color,
          }}
        />
      </div>

      {/* Submitted banner */}
      {isSubmitted && (
        <div className="flex items-center justify-between mb-6 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckIcon className="size-4" />
            <span className="text-sm font-medium">
              Submitted {gate.submitted_at ? new Date(gate.submitted_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
            </span>
          </div>
          <button onClick={handleReopen} className="text-xs text-emerald-600 hover:text-emerald-800 font-medium">
            Reopen
          </button>
        </div>
      )}

      {/* ── Design Handoff form fields (Figma, Loom, Assets, Fonts) ── */}
      {config.type === "design-handoff" && (
        <div className="space-y-5 mb-8">
          <div>
            <label className="text-[11px] font-medium text-[#555] block mb-1.5">
              Figma Link <span className="text-red-400">*</span>
            </label>
            <input
              type="url"
              value={gate.figma_url || ""}
              onChange={(e) => {
                if (isSubmitted) return;
                const updated = { ...gate, figma_url: e.target.value };
                setGateLocal(updated);
              }}
              onBlur={() => saveGate(gate)}
              disabled={isSubmitted}
              placeholder="https://www.figma.com/file/..."
              className={fieldClass}
            />
            <p className="text-[10px] text-[#BBB] mt-1">Link to the final design file</p>
          </div>

          <div>
            <label className="text-[11px] font-medium text-[#555] block mb-1.5">
              Loom Walkthrough <span className="text-red-400">*</span>
            </label>
            <input
              type="url"
              value={gate.loom_url || ""}
              onChange={(e) => {
                if (isSubmitted) return;
                const updated = { ...gate, loom_url: e.target.value };
                setGateLocal(updated);
              }}
              onBlur={() => saveGate(gate)}
              disabled={isSubmitted}
              placeholder="https://www.loom.com/share/..."
              className={fieldClass}
            />
            <p className="text-[10px] text-[#BBB] mt-1">Walk the developer through the design</p>
          </div>

          <div>
            <label className="text-[11px] font-medium text-[#555] block mb-1.5">Extra Assets</label>
            <textarea
              value={gate.extra_assets || ""}
              onChange={(e) => {
                if (isSubmitted) return;
                const updated = { ...gate, extra_assets: e.target.value };
                setGateLocal(updated);
              }}
              onBlur={() => saveGate(gate)}
              disabled={isSubmitted}
              placeholder="Drop links to any assets that can't be pulled from Figma (videos, images, icons, etc.)"
              className={`${fieldClass} min-h-[70px] resize-y`}
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-[#555] block mb-1.5">Font Files</label>
            <textarea
              value={gate.font_files || ""}
              onChange={(e) => {
                if (isSubmitted) return;
                const updated = { ...gate, font_files: e.target.value };
                setGateLocal(updated);
              }}
              onBlur={() => saveGate(gate)}
              disabled={isSubmitted}
              placeholder="Links to font files or Google Fonts URLs"
              className={`${fieldClass} min-h-[50px] resize-y`}
            />
          </div>

          <div className="border-t border-[#F0F0F0] pt-4">
            <p className="text-[11px] font-medium text-[#555] mb-3">Confirm before submitting</p>
          </div>
        </div>
      )}

      {/* ── Checklist items ── */}
      <div className="space-y-2 mb-6">
        {gate.items.map((item, i) => (
          <label
            key={i}
            className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
              item.checked ? "border-emerald-200 bg-emerald-50/30" : "border-[#E8E8E8] hover:border-[#CCC]"
            } ${isSubmitted ? "pointer-events-none opacity-60" : ""}`}
          >
            <input
              type="checkbox"
              checked={item.checked}
              disabled={isSubmitted}
              onChange={() => toggleItem(i)}
              className="size-4 mt-0.5 rounded border-[#CCC] text-emerald-600 focus:ring-0 focus:ring-offset-0"
            />
            <span className={`text-sm ${item.checked ? "text-[#1A1A1A]" : "text-[#777]"}`}>{item.label}</span>
          </label>
        ))}
      </div>

      {/* Notes */}
      <div className="mb-6">
        <label className="text-[11px] font-medium text-[#555] block mb-1.5">
          {config.type === "design-handoff" ? "Notes for the developer" : "Notes / Additional Context"}
        </label>
        <textarea
          value={gate.notes}
          onChange={(e) => {
            if (isSubmitted) return;
            setGateLocal({ ...gate, notes: e.target.value });
          }}
          onBlur={() => saveGate(gate)}
          disabled={isSubmitted}
          placeholder={config.type === "design-handoff" ? "Anything else the dev should know..." : "Add links, context, or notes..."}
          className={`${fieldClass} min-h-[80px] resize-y`}
        />
      </div>

      {/* Submit */}
      {!isSubmitted && (
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-[#AAA]">
            {isReady
              ? "All items checked — ready to submit"
              : config.type === "design-handoff" && !gate.figma_url?.trim()
                ? "Figma link required"
                : config.type === "design-handoff" && !gate.loom_url?.trim()
                  ? "Loom video required"
                  : `${progress.total - progress.checked} items remaining`
            }
          </p>
          <button
            onClick={handleSubmit}
            disabled={!isReady}
            className="px-5 py-2.5 text-sm font-semibold bg-[#1B1B1B] text-white rounded-lg hover:bg-[#2D2D2D] disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
          >
            Submit
          </button>
        </div>
      )}
    </div>
  );
}
