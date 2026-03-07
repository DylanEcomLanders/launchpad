"use client";

import { useState, useMemo } from "react";
import {
  PlusIcon,
  TrashIcon,
  ChevronDownIcon,
  RocketLaunchIcon,
  ClipboardDocumentIcon,
  CheckIcon,
} from "@heroicons/react/24/solid";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { DecorativeBlocks } from "@/components/decorative-blocks";
import {
  projectTypes,
  deliverableTypes,
  paymentStructures,
  paymentTerms,
  type GeneratorFormData,
  type Deliverable,
  type AgreementDetails,
  type Milestone,
  type RoadmapFormData,
} from "@/lib/config";
import { ScopePdfDocument } from "@/components/scope-pdf-document";
import { AgreementPdfDocument } from "@/components/agreement-pdf-document";
import { RoadmapPdfDocument } from "@/components/roadmap-pdf-document";
import { PdfPreview } from "@/components/pdf-preview";
import { SignaturePad } from "@/components/signature-pad";
import { computeAllPhases } from "@/lib/roadmap-defaults";
import { pdf, type DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";

/* ── Helpers ── */

const emptyDeliverable = (): Deliverable => ({ description: "", type: "" });
const emptyMilestone = (): Milestone => ({ description: "", amount: "" });

const emptyAgreement = (): AgreementDetails => ({
  clientLegalName: "",
  clientContactName: "",
  clientContactEmail: "",
  clientAddress: "",
  agreementStartDate: "",
  agreementEndDate: "",
  paymentStructure: "",
  totalFee: "",
  deposit: "",
  monthlyFee: "",
  milestones: [emptyMilestone()],
  paymentTerm: "",
  noticePeriod: "7 days",
  additionalTerms: "",
  signature: "",
  signerName: "",
  signerTitle: "",
  signerDate: "",
});

function formatFilenameDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function clientSlug(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, "-").replace(/-+/g, "-").toLowerCase();
}

function formatShortDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatLongDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/* ── Shared CSS classes ── */
const inputClass =
  "w-full px-3 py-2.5 bg-white border border-[#E5E5E5] rounded-md text-sm focus:outline-none focus:border-[#0A0A0A] transition-colors placeholder:text-[#CCCCCC]";
const selectClass =
  "w-full px-3 py-2.5 bg-white border border-[#E5E5E5] rounded-md text-sm focus:outline-none focus:border-[#0A0A0A] transition-colors appearance-none";
const textareaClass =
  "w-full px-3 py-2.5 bg-white border border-[#E5E5E5] rounded-md text-sm focus:outline-none focus:border-[#0A0A0A] transition-colors resize-none placeholder:text-[#CCCCCC]";
const labelClass =
  "block text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] mb-2";
const sectionHeadingClass =
  "text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]";

/* ── Main Component ── */

export default function ProjectKickoffPage() {
  /* ── Form state ── */
  const [clientName, setClientName] = useState("");
  const [projectType, setProjectType] = useState<GeneratorFormData["projectType"]>("");
  const [projectOverview, setProjectOverview] = useState("");
  const [deliverables, setDeliverables] = useState<Deliverable[]>([
    emptyDeliverable(),
    emptyDeliverable(),
    emptyDeliverable(),
  ]);
  const [additionalNotes, setAdditionalNotes] = useState("");

  /* Timeline */
  const [kickoffDate, setKickoffDate] = useState("");
  const [designEndDate, setDesignEndDate] = useState("");
  const [devEndDate, setDevEndDate] = useState("");

  /* Agreement (optional) */
  const [showAgreement, setShowAgreement] = useState(false);
  const [agreement, setAgreement] = useState<AgreementDetails>(emptyAgreement());

  /* Generation state */
  const [generating, setGenerating] = useState(false);
  const [showOutputs, setShowOutputs] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedSlack, setCopiedSlack] = useState(false);

  /* ── Computed phases ── */
  const phases = useMemo(() => {
    if (!kickoffDate || !designEndDate || !devEndDate) return [];
    return computeAllPhases(kickoffDate, designEndDate, devEndDate);
  }, [kickoffDate, designEndDate, devEndDate]);

  /* ── Derived data shapes for PDF components ── */
  const scopeFormData: GeneratorFormData = useMemo(
    () => ({
      clientName,
      projectType,
      projectOverview,
      startDate: kickoffDate,
      endDate: devEndDate,
      deliverables,
      additionalNotes,
      showAgreement,
      agreement: {
        ...agreement,
        agreementStartDate: agreement.agreementStartDate || kickoffDate,
        agreementEndDate: agreement.agreementEndDate || devEndDate,
      },
    }),
    [clientName, projectType, projectOverview, kickoffDate, devEndDate, deliverables, additionalNotes, showAgreement, agreement]
  );

  const roadmapFormData: RoadmapFormData = useMemo(
    () => ({
      clientName,
      projectType,
      kickoffDate,
      designEndDate,
      devEndDate,
      phases,
    }),
    [clientName, projectType, kickoffDate, designEndDate, devEndDate, phases]
  );

  /* ── Field helpers ── */
  const updateDeliverable = (index: number, key: keyof Deliverable, value: string) => {
    const updated = [...deliverables];
    updated[index] = { ...updated[index], [key]: value };
    setDeliverables(updated);
    setShowOutputs(false);
  };

  const addDeliverable = () => {
    setDeliverables([...deliverables, emptyDeliverable()]);
    setShowOutputs(false);
  };

  const removeDeliverable = (index: number) => {
    if (deliverables.length <= 1) return;
    setDeliverables(deliverables.filter((_, i) => i !== index));
    setShowOutputs(false);
  };

  const updateAgreementField = <K extends keyof AgreementDetails>(
    key: K,
    value: AgreementDetails[K]
  ) => {
    setAgreement((prev) => ({ ...prev, [key]: value }));
    setShowOutputs(false);
  };

  const updateMilestone = (index: number, key: keyof Milestone, value: string) => {
    const updated = [...agreement.milestones];
    updated[index] = { ...updated[index], [key]: value };
    updateAgreementField("milestones", updated);
  };

  const addMilestone = () => {
    updateAgreementField("milestones", [...agreement.milestones, emptyMilestone()]);
  };

  const removeMilestone = (index: number) => {
    if (agreement.milestones.length <= 1) return;
    updateAgreementField("milestones", agreement.milestones.filter((_, i) => i !== index));
  };

  /* ── Validation ── */
  const validDeliverables = deliverables.filter((d) => d.description.trim());
  const isFormValid =
    clientName.trim() &&
    projectType &&
    projectOverview.trim() &&
    kickoffDate &&
    designEndDate &&
    devEndDate &&
    validDeliverables.length > 0;

  const isAgreementValid =
    isFormValid &&
    agreement.clientLegalName &&
    agreement.clientContactName &&
    agreement.clientContactEmail &&
    agreement.clientAddress &&
    agreement.paymentStructure &&
    agreement.paymentTerm &&
    (agreement.paymentStructure !== "Fixed Project Fee" || agreement.totalFee) &&
    (agreement.paymentStructure !== "Monthly Retainer" || agreement.monthlyFee) &&
    (agreement.paymentStructure !== "Milestone-Based" ||
      agreement.milestones.some((m) => m.description.trim() && m.amount.trim()));

  /* ── Generate kickoff pack ── */
  const handleGenerate = async () => {
    if (!isFormValid) return;
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 600));
    setShowOutputs(true);
    setGenerating(false);
  };

  /* ── Download all PDFs ── */
  const handleDownloadAll = async () => {
    setDownloadingAll(true);
    try {
      const slug = clientSlug(clientName);
      const date = formatFilenameDate();

      const downloads: { doc: ReactElement<DocumentProps>; name: string }[] = [
        { doc: <ScopePdfDocument data={scopeFormData} />, name: `${slug}-scope-${date}.pdf` },
        { doc: <RoadmapPdfDocument data={roadmapFormData} />, name: `${slug}-roadmap-${date}.pdf` },
      ];

      if (showAgreement && isAgreementValid) {
        downloads.push({
          doc: <AgreementPdfDocument data={scopeFormData} />,
          name: `${slug}-agreement-${date}.pdf`,
        });
      }

      for (const { doc, name } of downloads) {
        const blob = await pdf(doc).toBlob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        await new Promise((r) => setTimeout(r, 400));
      }
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setDownloadingAll(false);
    }
  };

  /* ── Kickoff email text ── */
  const kickoffEmail = useMemo(() => {
    if (!isFormValid) return "";
    const deliverablesText = validDeliverables
      .map((d, i) => `  ${i + 1}. ${d.description}${d.type ? ` (${d.type})` : ""}`)
      .join("\n");

    const feeText =
      showAgreement && agreement.paymentStructure === "Fixed Project Fee" && agreement.totalFee
        ? `\nProject Investment: ${agreement.totalFee}`
        : showAgreement && agreement.paymentStructure === "Monthly Retainer" && agreement.monthlyFee
          ? `\nMonthly Retainer: ${agreement.monthlyFee}`
          : "";

    return `Hi ${agreement.clientContactName || clientName} team,

Thanks for choosing Ecomlanders — we're excited to get started on your ${projectType} project!

Here's a quick summary of what we've agreed:

Project Overview
${projectOverview}

Deliverables
${deliverablesText}

Key Dates
  Kickoff: ${formatLongDate(kickoffDate)}
  Design Complete: ${formatLongDate(designEndDate)}
  Development Complete: ${formatLongDate(devEndDate)}
  Estimated Launch: ${formatLongDate(devEndDate ? new Date(new Date(devEndDate + "T00:00:00").getTime() + 86400000).toISOString().split("T")[0] : "")}${feeText}

We'll be in touch shortly with your project documents. In the meantime, if you have any questions at all, just reply to this email.

Speak soon,
${agreement.signerName || "The Ecomlanders Team"}`;
  }, [isFormValid, clientName, projectType, projectOverview, validDeliverables, kickoffDate, designEndDate, devEndDate, showAgreement, agreement]);

  /* ── Slack brief text ── */
  const slackBrief = useMemo(() => {
    if (!isFormValid) return "";
    const deliverablesText = validDeliverables
      .map((d) => `• ${d.description}${d.type ? ` (${d.type})` : ""}`)
      .join("\n");

    return `*New Project Kickoff* :rocket:

*Client:* ${clientName}
*Type:* ${projectType}
*Kickoff:* ${formatShortDate(kickoffDate)}
*Design End:* ${formatShortDate(designEndDate)}
*Dev End:* ${formatShortDate(devEndDate)}

*Overview:* ${projectOverview}

*Deliverables:*
${deliverablesText}${additionalNotes ? `\n\n*Notes:* ${additionalNotes}` : ""}`;
  }, [isFormValid, clientName, projectType, projectOverview, validDeliverables, kickoffDate, designEndDate, devEndDate, additionalNotes]);

  /* ── Copy helpers ── */
  const copyToClipboard = async (text: string, setter: (v: boolean) => void) => {
    await navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  /* ── Computed display values ── */
  const slug = clientSlug(clientName);
  const date = formatFilenameDate();

  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-12 py-16 md:py-24">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            Project Kickoff
          </h1>
          <p className="text-[#6B6B6B]">
            Fill in the details once, get your scope doc, roadmap, agreement, kickoff email, and Slack brief
          </p>
        </div>

        <div className="space-y-8">
          {/* ── Section 1: Client & Project ── */}
          <div>
            <p className={`${sectionHeadingClass} mb-4`}>Client & Project</p>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>Client</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => { setClientName(e.target.value); setShowOutputs(false); }}
                    placeholder="Client name..."
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Project Type</label>
                  <select
                    value={projectType}
                    onChange={(e) => { setProjectType(e.target.value as GeneratorFormData["projectType"]); setShowOutputs(false); }}
                    className={selectClass}
                  >
                    <option value="">Select type...</option>
                    {projectTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Project Overview</label>
                <textarea
                  value={projectOverview}
                  onChange={(e) => { setProjectOverview(e.target.value); setShowOutputs(false); }}
                  placeholder="A 2-3 sentence summary of the project scope and objectives..."
                  rows={3}
                  className={textareaClass}
                />
              </div>
            </div>
          </div>

          {/* ── Section 2: Deliverables ── */}
          <div className="pt-6 border-t border-[#E5E5E5]">
            <div className="flex items-center justify-between mb-4">
              <p className={sectionHeadingClass}>Deliverables</p>
              <button
                onClick={addDeliverable}
                className="flex items-center gap-1.5 text-xs font-medium text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors"
              >
                <PlusIcon className="size-3.5" />
                Add row
              </button>
            </div>
            <div className="space-y-3">
              {deliverables.map((d, i) => (
                <div key={i} className="grid grid-cols-[1fr_160px_36px] gap-3 items-start">
                  <input
                    type="text"
                    value={d.description}
                    onChange={(e) => updateDeliverable(i, "description", e.target.value)}
                    placeholder="Deliverable description..."
                    className={inputClass}
                  />
                  <select
                    value={d.type}
                    onChange={(e) => updateDeliverable(i, "type", e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Type...</option>
                    {deliverableTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeDeliverable(i)}
                    disabled={deliverables.length <= 1}
                    className="p-2.5 text-[#AAAAAA] hover:text-[#0A0A0A] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <TrashIcon className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Additional Notes */}
            <div className="mt-6">
              <label className={labelClass}>Additional Notes</label>
              <textarea
                value={additionalNotes}
                onChange={(e) => { setAdditionalNotes(e.target.value); setShowOutputs(false); }}
                placeholder="Any additional notes, assumptions, or exclusions..."
                rows={2}
                className={textareaClass}
              />
            </div>
          </div>

          {/* ── Section 3: Timeline ── */}
          <div className="pt-6 border-t border-[#E5E5E5]">
            <p className={`${sectionHeadingClass} mb-4`}>Timeline</p>
            <div className="bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg p-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Kickoff Date</label>
                  <input
                    type="date"
                    value={kickoffDate}
                    onChange={(e) => { setKickoffDate(e.target.value); setShowOutputs(false); }}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Design End</label>
                  <input
                    type="date"
                    value={designEndDate}
                    onChange={(e) => { setDesignEndDate(e.target.value); setShowOutputs(false); }}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Dev End</label>
                  <input
                    type="date"
                    value={devEndDate}
                    onChange={(e) => { setDevEndDate(e.target.value); setShowOutputs(false); }}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Quick timeline summary */}
              {phases.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[#E5E5E5]">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA] mb-2">
                    Auto-computed Roadmap
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {phases.map((phase) => {
                      const isPoint = phase.startDate === phase.endDate;
                      return (
                        <span key={phase.name} className="text-[11px] text-[#6B6B6B]">
                          <span className="font-semibold text-[#0A0A0A]">{phase.name}</span>{" "}
                          {isPoint
                            ? formatShortDate(phase.startDate)
                            : `${formatShortDate(phase.startDate)} → ${formatShortDate(phase.endDate)}`}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Section 4: Agreement (collapsible) ── */}
          <div className="pt-6 border-t border-[#E5E5E5]">
            <button
              type="button"
              onClick={() => { setShowAgreement(!showAgreement); setShowOutputs(false); }}
              className="flex items-center justify-between w-full text-left"
            >
              <div>
                <span className={sectionHeadingClass}>Agreement Details</span>
                <span className="ml-2 text-[10px] text-[#AAAAAA]">Optional</span>
              </div>
              <ChevronDownIcon
                className={`size-4 text-[#6B6B6B] transition-transform ${showAgreement ? "rotate-180" : ""}`}
              />
            </button>

            {showAgreement && (
              <div className="mt-6 space-y-6">
                <div>
                  <label className={labelClass}>Client Legal Name</label>
                  <input
                    type="text"
                    value={agreement.clientLegalName}
                    onChange={(e) => updateAgreementField("clientLegalName", e.target.value)}
                    placeholder="Full legal entity name..."
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClass}>Contact Name</label>
                    <input
                      type="text"
                      value={agreement.clientContactName}
                      onChange={(e) => updateAgreementField("clientContactName", e.target.value)}
                      placeholder="Primary contact..."
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Contact Email</label>
                    <input
                      type="email"
                      value={agreement.clientContactEmail}
                      onChange={(e) => updateAgreementField("clientContactEmail", e.target.value)}
                      placeholder="contact@company.com"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Client Address</label>
                  <textarea
                    value={agreement.clientAddress}
                    onChange={(e) => updateAgreementField("clientAddress", e.target.value)}
                    placeholder="Full business address..."
                    rows={2}
                    className={textareaClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Payment Structure</label>
                  <select
                    value={agreement.paymentStructure}
                    onChange={(e) => updateAgreementField("paymentStructure", e.target.value as AgreementDetails["paymentStructure"])}
                    className={selectClass}
                  >
                    <option value="">Select structure...</option>
                    {paymentStructures.map((ps) => (
                      <option key={ps} value={ps}>{ps}</option>
                    ))}
                  </select>
                </div>

                {agreement.paymentStructure === "Fixed Project Fee" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className={labelClass}>Total Fee</label>
                      <input
                        type="text"
                        value={agreement.totalFee}
                        onChange={(e) => updateAgreementField("totalFee", e.target.value)}
                        placeholder="e.g. £5,000"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Deposit</label>
                      <input
                        type="text"
                        value={agreement.deposit}
                        onChange={(e) => updateAgreementField("deposit", e.target.value)}
                        placeholder="e.g. £2,500"
                        className={inputClass}
                      />
                    </div>
                  </div>
                )}

                {agreement.paymentStructure === "Monthly Retainer" && (
                  <div>
                    <label className={labelClass}>Monthly Fee</label>
                    <input
                      type="text"
                      value={agreement.monthlyFee}
                      onChange={(e) => updateAgreementField("monthlyFee", e.target.value)}
                      placeholder="e.g. £2,500/month"
                      className={inputClass}
                    />
                  </div>
                )}

                {agreement.paymentStructure === "Milestone-Based" && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <label className={sectionHeadingClass}>Milestones</label>
                      <button
                        onClick={addMilestone}
                        className="flex items-center gap-1.5 text-xs font-medium text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors"
                      >
                        <PlusIcon className="size-3.5" />
                        Add milestone
                      </button>
                    </div>
                    <div className="space-y-3">
                      {agreement.milestones.map((m, i) => (
                        <div key={i} className="grid grid-cols-[1fr_120px_36px] gap-3 items-start">
                          <input
                            type="text"
                            value={m.description}
                            onChange={(e) => updateMilestone(i, "description", e.target.value)}
                            placeholder="Milestone description..."
                            className={inputClass}
                          />
                          <input
                            type="text"
                            value={m.amount}
                            onChange={(e) => updateMilestone(i, "amount", e.target.value)}
                            placeholder="Amount..."
                            className={inputClass}
                          />
                          <button
                            onClick={() => removeMilestone(i)}
                            disabled={agreement.milestones.length <= 1}
                            className="p-2.5 text-[#AAAAAA] hover:text-[#0A0A0A] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <TrashIcon className="size-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className={labelClass}>Payment Terms</label>
                  <select
                    value={agreement.paymentTerm}
                    onChange={(e) => updateAgreementField("paymentTerm", e.target.value as AgreementDetails["paymentTerm"])}
                    className={selectClass}
                  >
                    <option value="">Select terms...</option>
                    {paymentTerms.map((pt) => (
                      <option key={pt} value={pt}>{pt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Notice Period</label>
                  <input
                    type="text"
                    value={agreement.noticePeriod}
                    onChange={(e) => updateAgreementField("noticePeriod", e.target.value)}
                    placeholder="e.g. 30 days"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Additional Terms</label>
                  <textarea
                    value={agreement.additionalTerms}
                    onChange={(e) => updateAgreementField("additionalTerms", e.target.value)}
                    placeholder="Any custom terms or conditions..."
                    rows={3}
                    className={textareaClass}
                  />
                </div>

                <SignaturePad
                  value={agreement.signature}
                  onChange={(dataUrl) => updateAgreementField("signature", dataUrl)}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className={labelClass}>Your Name</label>
                    <input
                      type="text"
                      value={agreement.signerName}
                      onChange={(e) => updateAgreementField("signerName", e.target.value)}
                      placeholder="Printed name..."
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Title</label>
                    <input
                      type="text"
                      value={agreement.signerTitle}
                      onChange={(e) => updateAgreementField("signerTitle", e.target.value)}
                      placeholder="e.g. Director"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Date Signed</label>
                    <input
                      type="date"
                      value={agreement.signerDate}
                      onChange={(e) => updateAgreementField("signerDate", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Generate Button ── */}
          <div className="pt-4">
            <button
              onClick={handleGenerate}
              disabled={!isFormValid || generating}
              className="flex items-center gap-2 px-6 py-3 bg-[#0A0A0A] text-white text-sm font-medium rounded-md hover:bg-[#2A2A2A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <ArrowPathIcon className="size-4 animate-spin" />
                  Generating Kickoff Pack...
                </>
              ) : (
                <>
                  <RocketLaunchIcon className="size-4" />
                  Generate Kickoff Pack
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Outputs ── */}
        {showOutputs && (
          <div className="mt-12 pt-12 border-t border-[#E5E5E5] space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Kickoff Pack</h2>
              <button
                onClick={handleDownloadAll}
                disabled={downloadingAll}
                className="flex items-center gap-2 px-4 py-2 bg-[#0A0A0A] text-white text-xs font-medium rounded-md hover:bg-[#2A2A2A] transition-colors disabled:opacity-40"
              >
                {downloadingAll ? (
                  <>
                    <ArrowPathIcon className="size-3.5 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <RocketLaunchIcon className="size-3.5" />
                    Download All PDFs
                  </>
                )}
              </button>
            </div>

            {/* PDFs */}
            <PdfPreview
              document={<ScopePdfDocument data={scopeFormData} />}
              filename={`${slug}-scope-${date}.pdf`}
              label="Scope Document"
              description={`Scope document for ${clientName} — ${projectType}`}
              details={`${validDeliverables.length} deliverable${validDeliverables.length !== 1 ? "s" : ""} · ${formatShortDate(kickoffDate)} → ${formatShortDate(devEndDate)}`}
            />

            <PdfPreview
              document={<RoadmapPdfDocument data={roadmapFormData} />}
              filename={`${slug}-roadmap-${date}.pdf`}
              label="Project Roadmap"
              description={`Project roadmap for ${clientName} — ${projectType}`}
              details={`${phases.length} phases · ${formatShortDate(kickoffDate)} → ${formatShortDate(devEndDate)}`}
            />

            {showAgreement && isAgreementValid && (
              <PdfPreview
                document={<AgreementPdfDocument data={scopeFormData} />}
                filename={`${slug}-agreement-${date}.pdf`}
                label="Service Agreement"
                description={`Service agreement for ${clientName} — ${agreement.clientLegalName}`}
                details={`${agreement.paymentStructure} · ${formatShortDate(kickoffDate)} → ${formatShortDate(devEndDate)}`}
              />
            )}

            {/* Kickoff Email */}
            <div className="bg-[#F0F0F0] border border-[#E5E5E5] rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Client Kickoff Email</h3>
                <button
                  onClick={() => copyToClipboard(kickoffEmail, setCopiedEmail)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-[#E5E5E5] rounded-md hover:bg-[#F5F5F5] transition-colors"
                >
                  {copiedEmail ? (
                    <><CheckIcon className="size-3" /> Copied</>
                  ) : (
                    <><ClipboardDocumentIcon className="size-3" /> Copy Email</>
                  )}
                </button>
              </div>
              <pre className="text-xs text-[#3A3A3A] whitespace-pre-wrap font-sans leading-relaxed bg-white border border-[#E5E5E5] rounded-md p-4 max-h-60 overflow-y-auto">
                {kickoffEmail}
              </pre>
            </div>

            {/* Slack Brief */}
            <div className="bg-[#F0F0F0] border border-[#E5E5E5] rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Slack Brief</h3>
                <button
                  onClick={() => copyToClipboard(slackBrief, setCopiedSlack)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-[#E5E5E5] rounded-md hover:bg-[#F5F5F5] transition-colors"
                >
                  {copiedSlack ? (
                    <><CheckIcon className="size-3" /> Copied</>
                  ) : (
                    <><ClipboardDocumentIcon className="size-3" /> Copy for Slack</>
                  )}
                </button>
              </div>
              <pre className="text-xs text-[#3A3A3A] whitespace-pre-wrap font-sans leading-relaxed bg-white border border-[#E5E5E5] rounded-md p-4 max-h-60 overflow-y-auto">
                {slackBrief}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
