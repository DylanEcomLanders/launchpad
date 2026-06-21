"use client";

import { useState, useMemo } from "react";
import { EyeIcon } from "@heroicons/react/24/solid";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { DecorativeBlocks } from "@/components/decorative-blocks";
import {
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/solid";
import {
  projectTypes,
  deliverableTypes,
  type RoadmapFormData,
  type DeliverableType,
} from "@/lib/config";
import {
  computeAllPhases,
  computeDesignDevDays,
  computePhaseTouchpoints,
  phaseDuration,
} from "@/lib/roadmap-defaults";
import { RoadmapPdfDocument } from "@/components/roadmap-pdf-document";
import { PdfPreview } from "@/components/pdf-preview";
import { inputClass, selectClass, labelClass, textareaClass } from "@/lib/form-styles";

import { formatFilenameDate, formatDayMonth as formatShortDate } from "@/lib/dates";

function clientSlug(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

export default function ProjectRoadmapPage() {
  /* ── Core form state ── */
  const [clientName, setClientName] = useState("");
  const [projectType, setProjectType] = useState<
    RoadmapFormData["projectType"]
  >("");
  const [kickoffDate, setKickoffDate] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<(DeliverableType | "")[]>([""]);

  /* ── Per-phase notes ── */
  const [phaseNotes, setPhaseNotes] = useState<Record<string, string>>({});

  const [generating, setGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  /* ── Auto-compute design/dev days from deliverables ── */
  const { designDays, devDays } = useMemo(
    () => computeDesignDevDays(selectedTypes),
    [selectedTypes]
  );

  /* ── Compute phases ── */
  const phases = useMemo(() => {
    if (!kickoffDate || designDays === 0) return [];
    return computeAllPhases(kickoffDate, designDays, devDays);
  }, [kickoffDate, designDays, devDays]);

  /* ── Derived dates from phases ── */
  const designEndDate =
    phases.find((p) => p.name === "Design")?.endDate || "";
  const devEndDate =
    phases.find((p) => p.name === "Development")?.endDate || "";
  const launchDate = phases.find((p) => p.name === "Launch")?.startDate || "";

  /* ── Merge phases with user notes ── */
  const mergedPhases = useMemo(() => {
    return phases.map((phase) => {
      const notes = phaseNotes[phase.name];
      if (!notes) return phase;
      return { ...phase, notes };
    });
  }, [phases, phaseNotes]);

  /* ── Deliverable helpers ── */
  const updateType = (index: number, value: string) => {
    const updated = [...selectedTypes];
    updated[index] = value as DeliverableType | "";
    setSelectedTypes(updated);
    setShowPreview(false);
  };

  const addType = () => {
    setSelectedTypes([...selectedTypes, ""]);
    setShowPreview(false);
  };

  const removeType = (index: number) => {
    if (selectedTypes.length <= 1) return;
    setSelectedTypes(selectedTypes.filter((_, i) => i !== index));
    setShowPreview(false);
  };

  /* ── Validation ── */
  const hasDeliverables = selectedTypes.some((t) => t !== "");
  const isFormValid =
    clientName.trim() && projectType && kickoffDate && hasDeliverables;

  /* ── Generation ── */
  const handleGenerate = async () => {
    if (!isFormValid) return;
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 500));
    setShowPreview(true);
    setGenerating(false);
  };

  const updateNotes = (phaseName: string, value: string) => {
    setPhaseNotes((prev) => ({ ...prev, [phaseName]: value }));
    setShowPreview(false);
  };

  /* ── Computed ── */
  const slug = clientSlug(clientName);
  const date = formatFilenameDate();

  /* ── Build form data for PDF ── */
  const formData: RoadmapFormData = {
    clientName,
    projectType,
    kickoffDate,
    designEndDate,
    devEndDate,
    phases: mergedPhases,
  };

  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-12 py-16 md:py-24">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-[28px] font-bold mb-2">
            Project Roadmap
          </h1>
          <p className="text-[#71757D]">
            Generate branded project timeline PDFs so clients know what to
            expect and when
          </p>
        </div>

        {/* Form */}
        <div className="space-y-8">
          {/* Client & Project Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Client</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => {
                  setClientName(e.target.value);
                  setShowPreview(false);
                }}
                placeholder="Client name..."
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Project Type</label>
              <select
                value={projectType}
                onChange={(e) => {
                  setProjectType(
                    e.target.value as RoadmapFormData["projectType"]
                  );
                  setShowPreview(false);
                }}
                className={selectClass}
              >
                <option value="">Select type...</option>
                {projectTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Deliverables */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#71757D]">
                Deliverables
              </label>
              <button
                onClick={addType}
                className="flex items-center gap-1.5 text-xs font-medium text-[#71757D] hover:text-[#E5E5EA] transition-colors"
              >
                <PlusIcon className="size-3.5" />
                Add row
              </button>
            </div>
            <div className="space-y-3">
              {selectedTypes.map((t, i) => (
                <div key={i} className="grid grid-cols-[1fr_36px] gap-3 items-start">
                  <select
                    value={t}
                    onChange={(e) => updateType(i, e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Select deliverable...</option>
                    {deliverableTypes.map((dt) => (
                      <option key={dt} value={dt}>{dt}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeType(i)}
                    disabled={selectedTypes.length <= 1}
                    className="p-2.5 text-[#71757D] hover:text-[#E5E5EA] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <TrashIcon className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#71757D] mb-4">
              Timeline
            </label>
            <div className="bg-[#222222] border border-[#2A2A2A] rounded-lg p-5 space-y-5">
              <div>
                <label className={labelClass}>Kickoff Date</label>
                <input
                  type="date"
                  value={kickoffDate}
                  onChange={(e) => {
                    setKickoffDate(e.target.value);
                    setShowPreview(false);
                  }}
                  className={`${inputClass} max-w-xs`}
                />
              </div>

              {/* Auto-computed summary */}
              {hasDeliverables && (
                <div className="pt-4 border-t border-[#2A2A2A]">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#71757D] mb-2">
                    Computed from deliverables
                  </p>
                  <p className="text-xs text-[#71757D]">
                    Design: <span className="font-semibold text-[#E5E5EA]">{designDays}d</span>
                    <span className="mx-2 text-[#C5C5C5]">·</span>
                    Development: <span className="font-semibold text-[#E5E5EA]">{devDays}d</span>
                  </p>
                </div>
              )}

              {/* Auto-computed timeline summary */}
              {phases.length > 0 && (
                <div className="pt-4 border-t border-[#2A2A2A]">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#71757D] mb-3">
                    Computed Timeline (business days only)
                  </p>
                  <div className="space-y-2">
                    {phases.map((phase, i) => {
                      const isPoint = phase.startDate === phase.endDate;
                      const touchpoints = computePhaseTouchpoints(phase);
                      const dur = phaseDuration(phase);
                      return (
                        <div
                          key={phase.name}
                          className="flex items-center gap-3 text-xs"
                        >
                          <span className="text-[#71757D] font-bold tabular-nums w-5">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className="font-semibold text-[#E5E5EA] w-28">
                            {phase.name}
                          </span>
                          <span className="text-[#71757D]">
                            {isPoint
                              ? formatShortDate(phase.startDate)
                              : `${formatShortDate(phase.startDate)} → ${formatShortDate(phase.endDate)}`}
                            {dur > 0 && (
                              <span className="text-[#71757D] ml-1">
                                ({dur}d)
                              </span>
                            )}
                          </span>
                          {touchpoints.length > 0 && (
                            <span className="text-[#71757D]">
                              ◆{" "}
                              {touchpoints
                                .map(
                                  (tp) =>
                                    `${tp.label} ${formatShortDate(tp.date)}`
                                )
                                .join(", ")}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Phase Detail Cards */}
          {phases.length > 0 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#71757D] mb-4">
                Phase Details
              </label>
              <div className="space-y-4">
                {phases.map((phase, i) => {
                  const isPoint = phase.startDate === phase.endDate;
                  const dur = phaseDuration(phase);

                  return (
                    <div
                      key={phase.name}
                      className="bg-[#222222] border border-[#2A2A2A] rounded-lg p-5"
                    >
                      {/* Phase header */}
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xs font-bold text-[#71757D] tabular-nums">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="text-sm font-semibold text-[#E5E5EA]">
                          {phase.name}
                        </span>
                        <span className="text-xs text-[#71757D]">
                          {isPoint
                            ? formatShortDate(phase.startDate)
                            : `${formatShortDate(phase.startDate)} → ${formatShortDate(phase.endDate)}`}
                          {dur > 0 && (
                            <span className="text-[#71757D] ml-1">
                              ({dur}d)
                            </span>
                          )}
                        </span>
                        {isPoint && (
                          <span className="text-[10px] font-medium uppercase tracking-wider text-[#71757D] bg-[#181818] px-1.5 py-0.5 rounded border border-[#2A2A2A]">
                            Milestone
                          </span>
                        )}
                      </div>

                      {/* Description (evergreen) */}
                      <p className="text-sm text-[#71757D] leading-relaxed mb-3">
                        {phase.description}
                      </p>

                      {/* Notes */}
                      <div>
                        <label className={labelClass}>
                          Notes{" "}
                          <span className="font-normal text-[#71757D]">
                            (optional)
                          </span>
                        </label>
                        <textarea
                          value={phaseNotes[phase.name] || ""}
                          onChange={(e) =>
                            updateNotes(phase.name, e.target.value)
                          }
                          placeholder="Any additional notes for this phase..."
                          rows={2}
                          className={textareaClass}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Generate Button */}
          <div className="pt-4">
            <button
              onClick={handleGenerate}
              disabled={!isFormValid || generating}
              className="flex items-center gap-2 px-6 py-3 bg-white text-[#0C0C0C] text-sm font-medium rounded-md hover:bg-[#F3F4F6] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <ArrowPathIcon className="size-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <EyeIcon className="size-4" />
                  Generate Roadmap PDF
                </>
              )}
            </button>
          </div>
        </div>

        {/* PDF Preview */}
        {showPreview && (
          <div className="mt-12 pt-12 border-t border-[#2A2A2A]">
            <PdfPreview
              document={<RoadmapPdfDocument data={formData} />}
              filename={`${slug}-roadmap-${date}.pdf`}
              label="Project Roadmap"
              description={`Project roadmap for ${clientName} — ${projectType}`}
              details={`${phases.length} phases · ${formatShortDate(kickoffDate)} → ${launchDate ? formatShortDate(launchDate) : "—"}`}
            />
          </div>
        )}
      </div>
    </div>
  );
}
