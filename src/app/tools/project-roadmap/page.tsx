"use client";

import { useState, useMemo } from "react";
import { Loader2, Eye } from "lucide-react";
import { DecorativeBlocks } from "@/components/decorative-blocks";
import { projectTypes, type RoadmapFormData } from "@/lib/config";
import {
  computeAllPhases,
  computePhaseTouchpoints,
  addDays,
} from "@/lib/roadmap-defaults";
import { RoadmapPdfDocument } from "@/components/roadmap-pdf-document";
import { PdfPreview } from "@/components/pdf-preview";

/* ── shared input classes ── */
const inputClass =
  "w-full px-3 py-2.5 bg-white border border-[#E5E5E5] rounded-md text-sm focus:outline-none focus:border-[#0A0A0A] transition-colors placeholder:text-[#CCCCCC]";
const selectClass =
  "w-full px-3 py-2.5 bg-white border border-[#E5E5E5] rounded-md text-sm focus:outline-none focus:border-[#0A0A0A] transition-colors appearance-none";
const textareaClass =
  "w-full px-3 py-2.5 bg-white border border-[#E5E5E5] rounded-md text-sm focus:outline-none focus:border-[#0A0A0A] transition-colors resize-none placeholder:text-[#CCCCCC]";
const labelClass =
  "block text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] mb-2";

function formatFilenameDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function clientSlug(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

function formatShortDate(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function daysBetween(start: string, end: string): number {
  const a = new Date(start + "T00:00:00").getTime();
  const b = new Date(end + "T00:00:00").getTime();
  return Math.max(1, Math.round((b - a) / (1000 * 60 * 60 * 24)));
}

export default function ProjectRoadmapPage() {
  /* ── Core form state (3 key dates + client info) ── */
  const [clientName, setClientName] = useState("");
  const [projectType, setProjectType] = useState<
    RoadmapFormData["projectType"]
  >("");
  const [kickoffDate, setKickoffDate] = useState("");
  const [designEndDate, setDesignEndDate] = useState("");
  const [devEndDate, setDevEndDate] = useState("");

  /* ── Per-phase notes ── */
  const [phaseNotes, setPhaseNotes] = useState<Record<string, string>>({});

  const [generating, setGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  /* ── Compute phases from the 3 dates ── */
  const phases = useMemo(() => {
    if (!kickoffDate || !designEndDate || !devEndDate) return [];
    return computeAllPhases(kickoffDate, designEndDate, devEndDate);
  }, [kickoffDate, designEndDate, devEndDate]);

  /* ── Launch date for display ── */
  const launchDate = useMemo(() => {
    if (!devEndDate) return null;
    return addDays(devEndDate, 1);
  }, [devEndDate]);

  /* ── Merge phases with user notes ── */
  const mergedPhases = useMemo(() => {
    return phases.map((phase) => {
      const notes = phaseNotes[phase.name];
      if (!notes) return phase;
      return { ...phase, notes };
    });
  }, [phases, phaseNotes]);

  /* ── Validation ── */
  const isFormValid =
    clientName.trim() &&
    projectType &&
    kickoffDate &&
    designEndDate &&
    devEndDate;

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
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            Project Roadmap
          </h1>
          <p className="text-[#6B6B6B]">
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

          {/* Key Dates — the 3 manual inputs */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] mb-4">
              Key Dates
            </label>
            <div className="bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg p-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Kickoff Date</label>
                  <input
                    type="date"
                    value={kickoffDate}
                    onChange={(e) => {
                      setKickoffDate(e.target.value);
                      setShowPreview(false);
                    }}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Design End Date</label>
                  <input
                    type="date"
                    value={designEndDate}
                    onChange={(e) => {
                      setDesignEndDate(e.target.value);
                      setShowPreview(false);
                    }}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Dev End Date</label>
                  <input
                    type="date"
                    value={devEndDate}
                    onChange={(e) => {
                      setDevEndDate(e.target.value);
                      setShowPreview(false);
                    }}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Auto-computed timeline summary */}
              {phases.length > 0 && (
                <div className="pt-4 border-t border-[#E5E5E5]">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA] mb-3">
                    Computed Timeline
                  </p>
                  <div className="space-y-2">
                    {phases.map((phase, i) => {
                      const isPoint = phase.startDate === phase.endDate;
                      const touchpoints = computePhaseTouchpoints(phase);
                      return (
                        <div
                          key={phase.name}
                          className="flex items-center gap-3 text-xs"
                        >
                          <span className="text-[#AAAAAA] font-bold tabular-nums w-5">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className="font-semibold text-[#0A0A0A] w-28">
                            {phase.name}
                          </span>
                          <span className="text-[#6B6B6B]">
                            {isPoint
                              ? formatShortDate(phase.startDate)
                              : `${formatShortDate(phase.startDate)} → ${formatShortDate(phase.endDate)}`}
                            {!isPoint && (
                              <span className="text-[#AAAAAA] ml-1">
                                ({daysBetween(phase.startDate, phase.endDate)}d)
                              </span>
                            )}
                          </span>
                          {touchpoints.length > 0 && (
                            <span className="text-[#AAAAAA]">
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
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] mb-4">
                Phase Details
              </label>
              <div className="space-y-4">
                {phases.map((phase, i) => {
                  const isPoint = phase.startDate === phase.endDate;

                  return (
                    <div
                      key={phase.name}
                      className="bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg p-5"
                    >
                      {/* Phase header */}
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xs font-bold text-[#AAAAAA] tabular-nums">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="text-sm font-semibold text-[#0A0A0A]">
                          {phase.name}
                        </span>
                        <span className="text-xs text-[#6B6B6B]">
                          {isPoint
                            ? formatShortDate(phase.startDate)
                            : `${formatShortDate(phase.startDate)} → ${formatShortDate(phase.endDate)}`}
                        </span>
                        {isPoint && (
                          <span className="text-[10px] font-medium uppercase tracking-wider text-[#AAAAAA] bg-white px-1.5 py-0.5 rounded border border-[#E5E5E5]">
                            Milestone
                          </span>
                        )}
                      </div>

                      {/* Description (evergreen) */}
                      <p className="text-sm text-[#6B6B6B] leading-relaxed mb-3">
                        {phase.description}
                      </p>

                      {/* Notes */}
                      <div>
                        <label className={labelClass}>
                          Notes{" "}
                          <span className="font-normal text-[#AAAAAA]">
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
              className="flex items-center gap-2 px-6 py-3 bg-[#0A0A0A] text-white text-sm font-medium rounded-md hover:bg-[#2A2A2A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Eye size={16} />
                  Generate Roadmap PDF
                </>
              )}
            </button>
          </div>
        </div>

        {/* PDF Preview */}
        {showPreview && (
          <div className="mt-12 pt-12 border-t border-[#E5E5E5]">
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
