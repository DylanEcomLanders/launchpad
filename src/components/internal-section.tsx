"use client";

import { useState } from "react";
import { CheckIcon, PlusIcon, TrashIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import type { PortalProject, QAGate, QAGates, ContextEntry, WeeklyDeliverable } from "@/lib/portal/types";
import {
  CRO_BRIEF_ITEMS, DESIGN_HANDOFF_ITEMS, DEV_HANDOFF_ITEMS,
  createDefaultGate, getGateProgress, isGateComplete, arePrerequisitesMet, GATE_CONFIG,
} from "@/lib/portal/qa-gates";
import { getCurrentWeekStart, getWeekLabel, ensureCurrentWeek, isMissionStatementDue, isWeeklyReportDue } from "@/lib/portal/weekly-loop";

interface Props {
  project: PortalProject;
  onUpdateProject: (patch: Partial<PortalProject>) => Promise<void>;
  readOnly?: boolean; // team view = mostly read-only
  teamRole?: string; // "Designer" | "Developer" | "CRO Strategist" — enables their gate
}

/* ── QA Gate Card ── */
function GateCard({
  gateKey,
  gate,
  onUpdate,
  locked,
  lockReason,
  canSubmit,
  readOnly,
}: {
  gateKey: string;
  gate: QAGate;
  onUpdate: (updated: QAGate) => void;
  locked: boolean;
  lockReason?: string;
  canSubmit: boolean;
  readOnly?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const config = GATE_CONFIG[gateKey];
  const progress = getGateProgress(gate);
  const complete = isGateComplete(gate);
  const isSubmitted = gate.status === "submitted";

  return (
    <div className={`border rounded-xl overflow-hidden ${locked ? "opacity-50" : ""} ${isSubmitted ? "border-emerald-200 bg-emerald-50/20" : "border-[#E5E5EA]"}`}>
      <button
        onClick={() => !locked && setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        disabled={locked}
      >
        <div className="flex items-center gap-3">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: config.color }} />
          <div>
            <p className="text-sm font-semibold text-[#1A1A1A]">{config.title}</p>
            <p className="text-[10px] text-[#AAA]">{config.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isSubmitted ? (
            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Submitted</span>
          ) : (
            <span className="text-[10px] text-[#AAA]">{progress.checked}/{progress.total}</span>
          )}
          <ChevronDownIcon className={`size-4 text-[#CCC] transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
      </button>

      {locked && lockReason && (
        <p className="px-4 pb-2 text-[10px] text-amber-600">{lockReason}</p>
      )}

      {expanded && !locked && (
        <div className="px-4 pb-4 border-t border-[#F0F0F0]">
          {/* Progress bar */}
          <div className="h-1 bg-[#F0F0F0] rounded-full overflow-hidden my-3">
            <div className="h-full rounded-full transition-all" style={{ width: `${(progress.checked / progress.total) * 100}%`, backgroundColor: config.color }} />
          </div>

          {/* Checklist */}
          <div className="space-y-1.5 mb-3">
            {gate.items.map((item, i) => (
              <label key={i} className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={item.checked}
                  disabled={isSubmitted || (readOnly && !canSubmit)}
                  onChange={() => {
                    if (isSubmitted || (readOnly && !canSubmit)) return;
                    const updated = { ...gate, items: gate.items.map((it, idx) => idx === i ? { ...it, checked: !it.checked } : it) };
                    onUpdate(updated);
                  }}
                  className="size-3.5 rounded border-[#CCC] text-[#1B1B1B] focus:ring-0"
                />
                <span className={`text-xs ${item.checked ? "text-[#1A1A1A]" : "text-[#999]"}`}>{item.label}</span>
              </label>
            ))}
          </div>

          {/* Notes */}
          <textarea
            value={gate.notes}
            onChange={(e) => { if (!isSubmitted && (!readOnly || canSubmit)) onUpdate({ ...gate, notes: e.target.value }); }}
            disabled={isSubmitted || (readOnly && !canSubmit)}
            placeholder="Notes or additional context..."
            className="w-full text-xs px-3 py-2 border border-[#E5E5EA] rounded-lg min-h-[60px] resize-y focus:outline-none focus:border-[#999] placeholder:text-[#CCC] disabled:opacity-50"
          />

          {/* Submit */}
          {!isSubmitted && canSubmit && (
            <button
              onClick={() => {
                if (!complete) return;
                onUpdate({ ...gate, status: "submitted", submitted_at: new Date().toISOString(), submitted_by: "team" });
              }}
              disabled={!complete}
              className="mt-3 px-4 py-2 text-xs font-medium bg-[#1B1B1B] text-white rounded-lg hover:bg-[#2D2D2D] disabled:opacity-30"
            >
              Submit Gate
            </button>
          )}

          {isSubmitted && gate.submitted_at && (
            <p className="mt-2 text-[10px] text-emerald-600">
              Submitted {new Date(gate.submitted_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main Component ── */
export function InternalSection({ project, onUpdateProject, readOnly = false, teamRole }: Props) {
  const [showContextForm, setShowContextForm] = useState(false);
  const [contextSource, setContextSource] = useState("");
  const [contextDate, setContextDate] = useState(new Date().toISOString().split("T")[0]);
  const [rawTranscript, setRawTranscript] = useState("");
  const [cleanVersion, setCleanVersion] = useState("");
  const [cleaning, setCleaning] = useState(false);

  const gates = project.qa_gates || {};
  const isRetainer = project.type === "retainer";

  /* ── Gate updates ── */
  const updateGate = async (gateKey: string, updated: QAGate) => {
    await onUpdateProject({
      qa_gates: { ...gates, [gateKey]: updated },
    });
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

  return (
    <div className="space-y-8">
      {/* ── QA Gates ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#AAA]">QA Gates</h3>
        </div>

        {/* CRO Brief Toggle */}
        {!readOnly && (
          <div className="flex items-center justify-between mb-3 px-4 py-2.5 bg-[#FAFAFA] border border-[#E5E5EA] rounded-lg">
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

        <div className="space-y-2">
          {/* CRO Brief Gate */}
          {gates.cro_brief_enabled && gates.cro_brief && (
            <GateCard
              gateKey="cro_brief"
              gate={gates.cro_brief}
              onUpdate={(g) => updateGate("cro_brief", g)}
              locked={false}
              canSubmit={!readOnly || teamRole === "CRO Strategist"}
              readOnly={readOnly}
            />
          )}

          {/* Design Handoff Gate */}
          <GateCard
            gateKey="design_handoff"
            gate={gates.design_handoff || createDefaultGate(DESIGN_HANDOFF_ITEMS)}
            onUpdate={(g) => updateGate("design_handoff", g)}
            locked={!arePrerequisitesMet(project, "design_handoff")}
            lockReason="Complete CRO Pre-Design Brief first"
            canSubmit={!readOnly || teamRole === "Designer"}
            readOnly={readOnly}
          />

          {/* Dev Handoff Gate */}
          <GateCard
            gateKey="dev_handoff"
            gate={gates.dev_handoff || createDefaultGate(DEV_HANDOFF_ITEMS)}
            onUpdate={(g) => updateGate("dev_handoff", g)}
            locked={!arePrerequisitesMet(project, "dev_handoff")}
            lockReason="Complete Design → Dev Handoff first"
            canSubmit={!readOnly || teamRole === "Developer"}
            readOnly={readOnly}
          />
        </div>
      </div>

      {/* ── Project Context ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#AAA]">Project Context</h3>
          {!readOnly && (
            <button onClick={() => setShowContextForm(!showContextForm)} className="text-[11px] text-[#777] hover:text-[#1A1A1A]">
              {showContextForm ? "Cancel" : "+ Add Context"}
            </button>
          )}
        </div>

        {showContextForm && (
          <div className="border border-[#E5E5EA] rounded-xl p-4 mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-[#777] block mb-1">Source</label>
                <input type="text" value={contextSource} onChange={(e) => setContextSource(e.target.value)} placeholder="e.g. AJ voice note" className="w-full text-xs px-2 py-1.5 border border-[#E5E5EA] rounded" />
              </div>
              <div>
                <label className="text-[10px] text-[#777] block mb-1">Date</label>
                <input type="date" value={contextDate} onChange={(e) => setContextDate(e.target.value)} className="w-full text-xs px-2 py-1.5 border border-[#E5E5EA] rounded" />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-[#777] block mb-1">Raw Transcript</label>
              <textarea value={rawTranscript} onChange={(e) => setRawTranscript(e.target.value)} placeholder="Paste the voice note transcript here..." className="w-full text-xs px-3 py-2 border border-[#E5E5EA] rounded-lg min-h-[120px] resize-y" />
            </div>
            <button
              onClick={handleCleanTranscript}
              disabled={!rawTranscript.trim() || cleaning}
              className="px-3 py-1.5 text-[11px] font-medium text-[#777] border border-[#E5E5EA] rounded-lg hover:bg-[#F5F5F5] disabled:opacity-30"
            >
              {cleaning ? "Cleaning..." : "Clean with AI"}
            </button>
            {cleanVersion && (
              <div>
                <label className="text-[10px] text-[#777] block mb-1">Clean Version (editable)</label>
                <textarea value={cleanVersion} onChange={(e) => setCleanVersion(e.target.value)} className="w-full text-xs px-3 py-2 border border-[#E5E5EA] rounded-lg min-h-[120px] resize-y" />
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
          <div key={entry.id} className="border border-[#E5E5EA] rounded-lg p-4 mb-2">
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
      </div>

      {/* ── Weekly Loop (retainer only) ── */}
      {isRetainer && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#AAA] mb-4">Weekly Deliverables</h3>

          {/* Current week */}
          {currentWeek && (
            <div className="border border-[#E5E5EA] rounded-xl p-4 mb-4">
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
                      className="w-full text-xs px-3 py-2 border border-[#E5E5EA] rounded-lg min-h-[80px] resize-y"
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
                  <div key={w.weekStart} className="flex items-center justify-between px-3 py-2 border border-[#EDEDEF] rounded-lg">
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
