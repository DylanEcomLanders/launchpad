"use client";

import { useState } from "react";
import { CheckIcon, PlusIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { PortalProject, QAGate, QAGates, ContextEntry, WeeklyDeliverable } from "@/lib/portal/types";
import {
  CRO_BRIEF_ITEMS, DESIGN_HANDOFF_ITEMS, DEV_HANDOFF_ITEMS,
  createDefaultGate, getGateProgress, isGateComplete, isDesignHandoffComplete, arePrerequisitesMet, GATE_CONFIG,
} from "@/lib/portal/qa-gates";
import { getCurrentWeekStart, getWeekLabel, ensureCurrentWeek, isMissionStatementDue, isWeeklyReportDue } from "@/lib/portal/weekly-loop";

interface Props {
  project: PortalProject;
  onUpdateProject: (patch: Partial<PortalProject>) => Promise<void>;
  readOnly?: boolean;
  teamRole?: string;
  /** When true, only render the QA gate cards (no context / weekly loop) */
  gatesOnly?: boolean;
  /** When true, hide the QA gate cards (show context / weekly loop only) */
  hideGates?: boolean;
  // For Slack notifications
  slackInternalChannelId?: string;
  clientName?: string;
  portalId?: string;
}

/* ── Gate Status Pill (for overview) ── */
export function GateStatusPills({ project }: { project: PortalProject }) {
  const gates = project.qa_gates || {};
  const gateKeys: Array<{ key: string; label: string; items: string[] }> = [];

  if (gates.cro_brief_enabled) {
    gateKeys.push({ key: "cro_brief", label: "CRO", items: CRO_BRIEF_ITEMS });
  }
  gateKeys.push({ key: "design_handoff", label: "Design", items: DESIGN_HANDOFF_ITEMS });
  gateKeys.push({ key: "dev_handoff", label: "Dev QA", items: DEV_HANDOFF_ITEMS });

  return (
    <div className="flex items-center gap-1.5">
      {gateKeys.map(({ key, label }) => {
        const gate = gates[key as keyof QAGates] as QAGate | undefined;
        const isSubmitted = gate?.status === "submitted";
        return (
          <span
            key={key}
            className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${
              isSubmitted
                ? "bg-emerald-50 text-emerald-600"
                : "bg-[#F3F3F5] text-[#AAA]"
            }`}
          >
            {label} {isSubmitted ? "✓" : "—"}
          </span>
        );
      })}
    </div>
  );
}

/* ── Shared Modal Shell ── */
function ModalShell({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ gateKey, onClose }: { gateKey: string; onClose: () => void }) {
  const config = GATE_CONFIG[gateKey];
  return (
    <div className="sticky top-0 bg-white rounded-t-2xl border-b border-[#F0F0F0] px-6 py-4 flex items-center justify-between z-10">
      <div className="flex items-center gap-3">
        <span className="size-3 rounded-full" style={{ backgroundColor: config.color }} />
        <div>
          <h2 className="text-sm font-bold text-[#1A1A1A]">{config.title}</h2>
          <p className="text-[10px] text-[#AAA]">{config.role}</p>
        </div>
      </div>
      <button onClick={onClose} className="text-[#CCC] hover:text-[#777]">
        <XMarkIcon className="size-5" />
      </button>
    </div>
  );
}

function SubmittedBanner({ gate }: { gate: QAGate }) {
  return (
    <div className="flex items-center gap-2 text-emerald-600">
      <CheckIcon className="size-4" />
      <span className="text-sm font-medium">
        Submitted {gate.submitted_at ? new Date(gate.submitted_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
      </span>
    </div>
  );
}

/* ── Checklist Gate Modal (CRO Brief, Dev QA) ── */
function ChecklistGateModal({
  gateKey,
  gate,
  onSubmit,
  onClose,
  onUpdate,
}: {
  gateKey: string;
  gate: QAGate;
  onSubmit: (gate: QAGate) => void;
  onClose: () => void;
  onUpdate: (gate: QAGate) => void;
}) {
  const config = GATE_CONFIG[gateKey];
  const progress = getGateProgress(gate);
  const complete = isGateComplete(gate);
  const isSubmitted = gate.status === "submitted";

  return (
    <ModalShell onClose={onClose}>
      <ModalHeader gateKey={gateKey} onClose={onClose} />

      {/* Progress bar */}
      <div className="px-6 pt-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-[#AAA]">Progress</span>
          <span className="text-[10px] font-medium text-[#777]">{progress.checked}/{progress.total}</span>
        </div>
        <div className="h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(progress.checked / progress.total) * 100}%`, backgroundColor: config.color }} />
        </div>
      </div>

      {/* Checklist */}
      <div className="px-6 py-4 space-y-2">
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
              onChange={() => {
                if (isSubmitted) return;
                onUpdate({ ...gate, items: gate.items.map((it, idx) => idx === i ? { ...it, checked: !it.checked } : it) });
              }}
              className="size-4 mt-0.5 rounded border-[#CCC] text-emerald-600 focus:ring-0 focus:ring-offset-0"
            />
            <span className={`text-sm ${item.checked ? "text-[#1A1A1A]" : "text-[#777]"}`}>{item.label}</span>
          </label>
        ))}
      </div>

      {/* Notes */}
      <div className="px-6 pb-4">
        <label className="text-[10px] text-[#777] block mb-1.5">Notes / Additional Context</label>
        <textarea
          value={gate.notes}
          onChange={(e) => { if (!isSubmitted) onUpdate({ ...gate, notes: e.target.value }); }}
          disabled={isSubmitted}
          placeholder="Add links, context, or notes for the next person..."
          className="w-full text-sm px-3 py-2.5 border border-[#E8E8E8] rounded-lg min-h-[80px] resize-y focus:outline-none focus:border-[#999] placeholder:text-[#CCC] disabled:opacity-50"
        />
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 bg-white rounded-b-2xl border-t border-[#F0F0F0] px-6 py-4">
        {isSubmitted ? (
          <SubmittedBanner gate={gate} />
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-[#AAA]">
              {complete ? "All items checked — ready to submit" : `${progress.total - progress.checked} items remaining`}
            </p>
            <button
              onClick={() => {
                if (!complete) return;
                onSubmit({ ...gate, status: "submitted", submitted_at: new Date().toISOString(), submitted_by: "team" });
              }}
              disabled={!complete}
              className="px-5 py-2.5 text-sm font-semibold bg-[#1B1B1B] text-white rounded-lg hover:bg-[#2D2D2D] disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            >
              Submit Handoff
            </button>
          </div>
        )}
      </div>
    </ModalShell>
  );
}

/* ── Design Handoff Form Modal ── */
function DesignHandoffFormModal({
  gate,
  onSubmit,
  onClose,
  onUpdate,
}: {
  gate: QAGate;
  onSubmit: (gate: QAGate) => void;
  onClose: () => void;
  onUpdate: (gate: QAGate) => void;
}) {
  const isSubmitted = gate.status === "submitted";
  const ready = isDesignHandoffComplete(gate);

  const fieldClass = "w-full text-sm px-3 py-2.5 border border-[#E8E8E8] rounded-lg focus:outline-none focus:border-[#999] placeholder:text-[#CCC] disabled:opacity-50 disabled:bg-[#FAFAFA]";
  const labelClass = "text-[11px] font-medium text-[#555] block mb-1.5";
  const requiredDot = <span className="text-red-400 ml-0.5">*</span>;

  // Count how many fields are filled for progress
  const totalFields = 3 + gate.items.length; // figma + loom + checklist items (extras/fonts optional)
  const filledFields =
    (gate.figma_url?.trim() ? 1 : 0) +
    (gate.loom_url?.trim() ? 1 : 0) +
    gate.items.filter((i) => i.checked).length +
    (gate.extra_assets?.trim() ? 1 : 0);
  const progressPct = Math.round((Math.min(filledFields, totalFields) / totalFields) * 100);

  return (
    <ModalShell onClose={onClose}>
      <ModalHeader gateKey="design_handoff" onClose={onClose} />

      {/* Progress */}
      <div className="px-6 pt-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-[#AAA]">Completion</span>
          <span className="text-[10px] font-medium text-[#777]">{progressPct}%</span>
        </div>
        <div className="h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-300 bg-[#7C3AED]" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <div className="px-6 py-4 space-y-5">
        {/* Figma Link */}
        <div>
          <label className={labelClass}>Figma Link {requiredDot}</label>
          <input
            type="url"
            value={gate.figma_url || ""}
            onChange={(e) => { if (!isSubmitted) onUpdate({ ...gate, figma_url: e.target.value }); }}
            disabled={isSubmitted}
            placeholder="https://www.figma.com/file/..."
            className={fieldClass}
          />
          <p className="text-[10px] text-[#BBB] mt-1">Link to the final design file</p>
        </div>

        {/* Loom Video */}
        <div>
          <label className={labelClass}>Loom Walkthrough {requiredDot}</label>
          <input
            type="url"
            value={gate.loom_url || ""}
            onChange={(e) => { if (!isSubmitted) onUpdate({ ...gate, loom_url: e.target.value }); }}
            disabled={isSubmitted}
            placeholder="https://www.loom.com/share/..."
            className={fieldClass}
          />
          <p className="text-[10px] text-[#BBB] mt-1">Walk the developer through the design</p>
        </div>

        {/* Extra Assets */}
        <div>
          <label className={labelClass}>Extra Assets</label>
          <textarea
            value={gate.extra_assets || ""}
            onChange={(e) => { if (!isSubmitted) onUpdate({ ...gate, extra_assets: e.target.value }); }}
            disabled={isSubmitted}
            placeholder="Drop links to any assets that can't be pulled from Figma (videos, images, icons, etc.)"
            className={`${fieldClass} min-h-[70px] resize-y`}
          />
        </div>

        {/* Font Files */}
        <div>
          <label className={labelClass}>Font Files</label>
          <textarea
            value={gate.font_files || ""}
            onChange={(e) => { if (!isSubmitted) onUpdate({ ...gate, font_files: e.target.value }); }}
            disabled={isSubmitted}
            placeholder="Links to font files or Google Fonts URLs"
            className={`${fieldClass} min-h-[50px] resize-y`}
          />
        </div>

        {/* Checklist items */}
        <div>
          <label className={`${labelClass} mb-2`}>Confirm before submitting</label>
          <div className="space-y-2">
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
                  onChange={() => {
                    if (isSubmitted) return;
                    onUpdate({ ...gate, items: gate.items.map((it, idx) => idx === i ? { ...it, checked: !it.checked } : it) });
                  }}
                  className="size-4 mt-0.5 rounded border-[#CCC] text-emerald-600 focus:ring-0 focus:ring-offset-0"
                />
                <span className={`text-sm ${item.checked ? "text-[#1A1A1A]" : "text-[#777]"}`}>{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className={labelClass}>Notes for the developer</label>
          <textarea
            value={gate.notes}
            onChange={(e) => { if (!isSubmitted) onUpdate({ ...gate, notes: e.target.value }); }}
            disabled={isSubmitted}
            placeholder="Anything else the dev should know..."
            className={`${fieldClass} min-h-[70px] resize-y`}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 bg-white rounded-b-2xl border-t border-[#F0F0F0] px-6 py-4">
        {isSubmitted ? (
          <SubmittedBanner gate={gate} />
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-[#AAA]">
              {ready ? "Ready to submit" : !gate.figma_url?.trim() ? "Figma link required" : !gate.loom_url?.trim() ? "Loom video required" : "Complete all checkboxes"}
            </p>
            <button
              onClick={() => {
                if (!ready) return;
                onSubmit({ ...gate, status: "submitted", submitted_at: new Date().toISOString(), submitted_by: "team" });
              }}
              disabled={!ready}
              className="px-5 py-2.5 text-sm font-semibold bg-[#1B1B1B] text-white rounded-lg hover:bg-[#2D2D2D] disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            >
              Submit Handoff
            </button>
          </div>
        )}
      </div>
    </ModalShell>
  );
}

/* ── Gate Overview Card (three-column display) ── */
function GateOverviewCard({
  gateKey,
  gate,
  locked,
  lockReason,
  canOpen,
  onOpen,
}: {
  gateKey: string;
  gate: QAGate;
  locked: boolean;
  lockReason?: string;
  canOpen: boolean;
  onOpen: () => void;
}) {
  const config = GATE_CONFIG[gateKey];
  const progress = getGateProgress(gate);
  const isSubmitted = gate.status === "submitted";

  return (
    <button
      onClick={() => { if (!locked && canOpen) onOpen(); }}
      disabled={locked}
      className={`flex-1 min-w-0 border rounded-xl p-4 text-left transition-all ${
        locked
          ? "opacity-40 cursor-not-allowed border-[#E8E8E8]"
          : isSubmitted
            ? "border-emerald-200 bg-emerald-50/30 hover:border-emerald-300"
            : "border-[#E8E8E8] hover:border-[#CCC] cursor-pointer"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="size-2.5 rounded-full" style={{ backgroundColor: isSubmitted ? "#059669" : config.color }} />
        <span className="text-[10px] font-semibold text-[#1A1A1A] truncate">{config.title}</span>
      </div>

      {isSubmitted ? (
        <>
          <div className="flex items-center gap-1.5 mb-1">
            <CheckIcon className="size-3.5 text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-600">Submitted</span>
          </div>
          <p className="text-[9px] text-[#AAA]">
            {gate.submitted_at && new Date(gate.submitted_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </p>
        </>
      ) : (
        <>
          <div className="h-1 bg-[#F0F0F0] rounded-full overflow-hidden mb-1.5">
            <div className="h-full rounded-full transition-all" style={{ width: `${(progress.checked / progress.total) * 100}%`, backgroundColor: config.color }} />
          </div>
          <p className="text-[10px] text-[#AAA]">{progress.checked}/{progress.total} items</p>
        </>
      )}

      {locked && lockReason && (
        <p className="text-[9px] text-amber-500 mt-1.5">🔒 {lockReason}</p>
      )}
    </button>
  );
}

/* ── Main Component ── */
export function InternalSection({ project, onUpdateProject, readOnly = false, teamRole, gatesOnly = false, hideGates = false, slackInternalChannelId, clientName, portalId }: Props) {
  const [showContextForm, setShowContextForm] = useState(false);
  const [contextSource, setContextSource] = useState("");
  const [contextDate, setContextDate] = useState(new Date().toISOString().split("T")[0]);
  const [rawTranscript, setRawTranscript] = useState("");
  const [cleanVersion, setCleanVersion] = useState("");
  const [cleaning, setCleaning] = useState(false);
  const [openGateModal, setOpenGateModal] = useState<string | null>(null);

  const gates = project.qa_gates || {};
  const isRetainer = project.type === "retainer";

  /* ── Gate updates ── */
  const updateGateInPlace = async (gateKey: string, updated: QAGate) => {
    await onUpdateProject({
      qa_gates: { ...gates, [gateKey]: updated },
    });
  };

  const submitGate = async (gateKey: string, submittedGate: QAGate) => {
    await onUpdateProject({
      qa_gates: { ...gates, [gateKey]: submittedGate },
    });
    setOpenGateModal(null);

    // Send Slack notification (fire-and-forget)
    if (slackInternalChannelId) {
      const config = GATE_CONFIG[gateKey];
      const nextRole =
        gateKey === "cro_brief" ? "Designer"
        : gateKey === "design_handoff" ? "Developer"
        : "Senior Developer";

      fetch("/api/slack/gate-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: slackInternalChannelId,
          gateTitle: config.title,
          clientName: clientName || "Client",
          projectName: project.name,
          submittedBy: submittedGate.submitted_by || teamRole || "Team member",
          nextRole,
          portalId,
        }),
      }).catch(() => {});
    }
  };

  const toggleCroBrief = async () => {
    const enabled = !gates.cro_brief_enabled;
    const newGates = { ...gates, cro_brief_enabled: enabled };
    if (enabled && !gates.cro_brief) {
      newGates.cro_brief = createDefaultGate(CRO_BRIEF_ITEMS);
    }
    await onUpdateProject({ qa_gates: newGates });
  };

  /* ── Context ── */
  const handleCleanTranscript = async () => {
    if (!rawTranscript.trim()) return;
    setCleaning(true);
    try {
      const res = await fetch("/api/context-clean", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawTranscript }),
      });
      if (res.ok) {
        const data = await res.json();
        setCleanVersion(data.cleanVersion);
      }
    } catch { /* silent */ }
    setCleaning(false);
  };

  const saveContext = async () => {
    if (!cleanVersion.trim()) return;
    const entry: ContextEntry = {
      id: crypto.randomUUID(),
      date: contextDate,
      source: contextSource.trim() || "Voice note",
      rawTranscript: rawTranscript.trim(),
      cleanVersion: cleanVersion.trim(),
      created_at: new Date().toISOString(),
    };
    await onUpdateProject({
      context_entries: [entry, ...(project.context_entries || [])],
    });
    setShowContextForm(false);
    setContextSource("");
    setRawTranscript("");
    setCleanVersion("");
  };

  const deleteContext = async (id: string) => {
    await onUpdateProject({
      context_entries: (project.context_entries || []).filter((c) => c.id !== id),
    });
  };

  /* ── Weekly Loop ── */
  const weeklyDeliverables = ensureCurrentWeek(project.weekly_deliverables || []);
  const currentWeek = weeklyDeliverables[0];

  const updateWeekly = async (weekStart: string, patch: Partial<WeeklyDeliverable>) => {
    const updated = weeklyDeliverables.map((w) =>
      w.weekStart === weekStart ? { ...w, ...patch } : w
    );
    await onUpdateProject({ weekly_deliverables: updated });
  };

  /* ── Determine which gates to show ── */
  // Always show all three gates — CRO can be toggled on/off but design + dev are always there
  const gateEntries: Array<{ key: string; gate: QAGate; items: string[] }> = [];
  if (gates.cro_brief_enabled) {
    gateEntries.push({ key: "cro_brief", gate: gates.cro_brief || createDefaultGate(CRO_BRIEF_ITEMS), items: CRO_BRIEF_ITEMS });
  }
  gateEntries.push({ key: "design_handoff", gate: gates.design_handoff || createDefaultGate(DESIGN_HANDOFF_ITEMS), items: DESIGN_HANDOFF_ITEMS });
  gateEntries.push({ key: "dev_handoff", gate: gates.dev_handoff || createDefaultGate(DEV_HANDOFF_ITEMS), items: DEV_HANDOFF_ITEMS });

  /* ── Can the current user open this gate? Always yes now ── */
  const canOpenGate = () => true;

  return (
    <div className="space-y-8">
      {/* ── QA Gates ── */}
      {!hideGates && <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-[#1A1A1A]">QA Gates</h3>
        </div>

        {/* CRO Brief Toggle */}
        {!readOnly && (
          <div className="flex items-center justify-between mb-3 px-4 py-2.5 bg-[#FAFAFA] border border-[#E8E8E8] rounded-lg">
            <div>
              <p className="text-xs font-medium text-[#1A1A1A]">CRO Pre-Design Brief</p>
              <p className="text-[10px] text-[#AAA]">Toggle on when Dan is involved in the project</p>
            </div>
            <button
              onClick={toggleCroBrief}
              className={`relative w-10 h-5 rounded-full transition-colors ${gates.cro_brief_enabled ? "bg-emerald-400" : "bg-[#D4D4D4]"}`}
            >
              <span className={`absolute top-0.5 left-0.5 size-4 bg-white rounded-full shadow transition-transform ${gates.cro_brief_enabled ? "translate-x-5" : ""}`} />
            </button>
          </div>
        )}

        {/* Three-column gate overview cards — all always accessible */}
        <div className="flex gap-2">
          {gateEntries.map(({ key, gate }) => (
            <GateOverviewCard
              key={key}
              gateKey={key}
              gate={gate}
              locked={false}
              canOpen={true}
              onOpen={() => setOpenGateModal(key)}
            />
          ))}
        </div>

        {/* ── Gate Form Modal ── */}
        {openGateModal && (() => {
          const entry = gateEntries.find((e) => e.key === openGateModal);
          if (!entry) return null;

          if (entry.key === "design_handoff") {
            return (
              <DesignHandoffFormModal
                gate={entry.gate}
                onClose={() => setOpenGateModal(null)}
                onUpdate={(g) => updateGateInPlace(entry.key, g)}
                onSubmit={(g) => submitGate(entry.key, g)}
              />
            );
          }

          return (
            <ChecklistGateModal
              gateKey={entry.key}
              gate={entry.gate}
              onClose={() => setOpenGateModal(null)}
              onUpdate={(g) => updateGateInPlace(entry.key, g)}
              onSubmit={(g) => submitGate(entry.key, g)}
            />
          );
        })()}
      </div>}

      {/* ── Project Context ── */}
      {!gatesOnly && <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-[#1A1A1A]">Project Context</h3>
          {!readOnly && (
            <button onClick={() => setShowContextForm(!showContextForm)} className="text-[11px] text-[#777] hover:text-[#1A1A1A]">
              {showContextForm ? "Cancel" : "+ Add Context"}
            </button>
          )}
        </div>

        {showContextForm && (
          <div className="border border-[#E8E8E8] rounded-xl p-4 mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-[#777] block mb-1">Source</label>
                <input type="text" value={contextSource} onChange={(e) => setContextSource(e.target.value)} placeholder="e.g. AJ voice note" className="w-full text-xs px-2 py-1.5 border border-[#E8E8E8] rounded" />
              </div>
              <div>
                <label className="text-[10px] text-[#777] block mb-1">Date</label>
                <input type="date" value={contextDate} onChange={(e) => setContextDate(e.target.value)} className="w-full text-xs px-2 py-1.5 border border-[#E8E8E8] rounded" />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-[#777] block mb-1">Raw Transcript</label>
              <textarea value={rawTranscript} onChange={(e) => setRawTranscript(e.target.value)} placeholder="Paste the voice note transcript here..." className="w-full text-xs px-3 py-2 border border-[#E8E8E8] rounded-lg min-h-[120px] resize-y" />
            </div>
            <button
              onClick={handleCleanTranscript}
              disabled={!rawTranscript.trim() || cleaning}
              className="px-3 py-1.5 text-[11px] font-medium text-[#777] border border-[#E8E8E8] rounded-lg hover:bg-[#F5F5F5] disabled:opacity-30"
            >
              {cleaning ? "Cleaning..." : "Clean with AI"}
            </button>
            {cleanVersion && (
              <div>
                <label className="text-[10px] text-[#777] block mb-1">Clean Version (editable)</label>
                <textarea value={cleanVersion} onChange={(e) => setCleanVersion(e.target.value)} className="w-full text-xs px-3 py-2 border border-[#E8E8E8] rounded-lg min-h-[120px] resize-y" />
                <button onClick={saveContext} className="mt-2 px-4 py-2 text-xs font-medium bg-[#1B1B1B] text-white rounded-lg hover:bg-[#2D2D2D]">
                  Save Context
                </button>
              </div>
            )}
          </div>
        )}

        {(project.context_entries || []).length === 0 && !showContextForm && (
          <p className="text-xs text-[#CCC]">No context entries yet</p>
        )}

        {(project.context_entries || []).map((entry) => (
          <div key={entry.id} className="border border-[#E8E8E8] rounded-lg p-4 mb-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium text-[#1A1A1A]">{entry.source}</span>
                <span className="text-[10px] text-[#AAA]">{new Date(entry.date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
              </div>
              {!readOnly && (
                <button onClick={() => deleteContext(entry.id)} className="text-[#CCC] hover:text-red-400">
                  <TrashIcon className="size-3" />
                </button>
              )}
            </div>
            <div className="text-xs text-[#555] leading-relaxed whitespace-pre-wrap">{entry.cleanVersion}</div>
            <details className="mt-2">
              <summary className="text-[10px] text-[#CCC] cursor-pointer hover:text-[#999]">Raw transcript</summary>
              <p className="text-[10px] text-[#AAA] mt-1 whitespace-pre-wrap">{entry.rawTranscript}</p>
            </details>
          </div>
        ))}
      </div>}

      {/* ── Weekly Loop (retainer only) ── */}
      {!gatesOnly && isRetainer && (
        <div>
          <h3 className="text-xs font-semibold text-[#1A1A1A] mb-4">Weekly Deliverables</h3>

          {/* Current week */}
          {currentWeek && (
            <div className="border border-[#E8E8E8] rounded-xl p-4 mb-4">
              <p className="text-sm font-semibold text-[#1A1A1A] mb-3">{getWeekLabel(currentWeek.weekStart)}</p>

              {/* Mission Statement */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`size-2 rounded-full ${currentWeek.missionStatement ? "bg-emerald-500" : isMissionStatementDue(currentWeek) ? "bg-red-500 animate-pulse" : "bg-[#DDD]"}`} />
                  <span className="text-xs font-medium text-[#1A1A1A]">Mission Statement</span>
                  {isMissionStatementDue(currentWeek) && <span className="text-[9px] text-red-500 font-medium">Due today</span>}
                </div>
                {currentWeek.missionStatement ? (
                  <div className="bg-[#FAFAFA] rounded-lg p-3">
                    <p className="text-xs text-[#555] whitespace-pre-wrap">{currentWeek.missionStatement}</p>
                    <p className="text-[9px] text-[#CCC] mt-1">Uploaded {currentWeek.missionStatementDate}</p>
                  </div>
                ) : !readOnly ? (
                  <div>
                    <textarea
                      placeholder="Paste or type mission statement..."
                      className="w-full text-xs px-3 py-2 border border-[#E8E8E8] rounded-lg min-h-[80px] resize-y"
                      onBlur={(e) => {
                        if (e.target.value.trim()) {
                          updateWeekly(currentWeek.weekStart, {
                            missionStatement: e.target.value.trim(),
                            missionStatementDate: new Date().toISOString().split("T")[0],
                          });
                        }
                      }}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-[#CCC]">Not uploaded yet</p>
                )}
              </div>

              {/* Weekly Report */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`size-2 rounded-full ${currentWeek.weeklyReport ? "bg-emerald-500" : isWeeklyReportDue(currentWeek) ? "bg-red-500 animate-pulse" : "bg-[#DDD]"}`} />
                  <span className="text-xs font-medium text-[#1A1A1A]">Weekly Report</span>
                  {isWeeklyReportDue(currentWeek) && <span className="text-[9px] text-red-500 font-medium">Due today</span>}
                </div>
                {currentWeek.weeklyReport ? (
                  <div className="bg-[#FAFAFA] rounded-lg p-3">
                    <p className="text-xs font-medium text-[#1A1A1A]">{currentWeek.weeklyReport.title}</p>
                    <p className="text-[9px] text-[#CCC] mt-1">Uploaded {currentWeek.weeklyReportDate}</p>
                  </div>
                ) : (
                  <p className="text-xs text-[#CCC]">Not uploaded yet — use Reports tab to upload</p>
                )}
              </div>
            </div>
          )}

          {/* History */}
          {weeklyDeliverables.length > 1 && (
            <details>
              <summary className="text-[10px] text-[#CCC] cursor-pointer hover:text-[#999] mb-2">
                Previous weeks ({weeklyDeliverables.length - 1})
              </summary>
              <div className="space-y-2">
                {weeklyDeliverables.slice(1).map((w) => (
                  <div key={w.weekStart} className="flex items-center justify-between px-3 py-2 border border-[#E8E8E8] rounded-lg">
                    <span className="text-xs text-[#777]">{getWeekLabel(w.weekStart)}</span>
                    <div className="flex items-center gap-3">
                      <span className={`size-1.5 rounded-full ${w.missionStatement ? "bg-emerald-500" : "bg-[#DDD]"}`} title="Mission statement" />
                      <span className={`size-1.5 rounded-full ${w.weeklyReport ? "bg-emerald-500" : "bg-[#DDD]"}`} title="Weekly report" />
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
