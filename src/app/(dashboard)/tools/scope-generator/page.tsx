"use client";

import { useState } from "react";
import {
  PlusIcon,
  TrashIcon,
  EyeIcon,
  ChevronDownIcon,
  ArrowDownTrayIcon,
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
} from "@/lib/config";
import { ScopePdfDocument } from "@/components/scope-pdf-document";
import { AgreementPdfDocument } from "@/components/agreement-pdf-document";
import { PdfPreview } from "@/components/pdf-preview";
import { SignaturePad } from "@/components/signature-pad";
import { pdf } from "@react-pdf/renderer";
import { inputClass, selectClass, labelClass, textareaClass } from "@/lib/form-styles";

const emptyDeliverable = (): Deliverable => ({
  description: "",
  type: "",
});

const emptyMilestone = (): Milestone => ({
  description: "",
  amount: "",
});

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
  return name
    .replace(/[^a-zA-Z0-9]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

export default function ScopeGeneratorPage() {
  const [formData, setFormData] = useState<GeneratorFormData>({
    clientName: "",
    projectType: "",
    projectOverview: "",
    startDate: "",
    endDate: "",
    deliverables: [emptyDeliverable(), emptyDeliverable(), emptyDeliverable()],
    additionalNotes: "",
    showAgreement: false,
    agreement: emptyAgreement(),
  });

  const [generatingScope, setGeneratingScope] = useState(false);
  const [generatingAgreement, setGeneratingAgreement] = useState(false);
  const [showScopePreview, setShowScopePreview] = useState(false);
  const [showAgreementPreview, setShowAgreementPreview] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);

  /* ── field update helpers ── */
  const resetPreviews = () => {
    setShowScopePreview(false);
    setShowAgreementPreview(false);
  };

  const updateField = <K extends keyof GeneratorFormData>(
    key: K,
    value: GeneratorFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    resetPreviews();
  };

  const updateDeliverable = (
    index: number,
    key: keyof Deliverable,
    value: string
  ) => {
    const updated = [...formData.deliverables];
    updated[index] = { ...updated[index], [key]: value };
    updateField("deliverables", updated);
  };

  const addDeliverable = () => {
    updateField("deliverables", [...formData.deliverables, emptyDeliverable()]);
  };

  const removeDeliverable = (index: number) => {
    if (formData.deliverables.length <= 1) return;
    updateField(
      "deliverables",
      formData.deliverables.filter((_, i) => i !== index)
    );
  };

  const updateAgreementField = <K extends keyof AgreementDetails>(
    key: K,
    value: AgreementDetails[K]
  ) => {
    setFormData((prev) => ({
      ...prev,
      agreement: { ...prev.agreement, [key]: value },
    }));
    resetPreviews();
  };

  const updateMilestone = (
    index: number,
    key: keyof Milestone,
    value: string
  ) => {
    const updated = [...formData.agreement.milestones];
    updated[index] = { ...updated[index], [key]: value };
    updateAgreementField("milestones", updated);
  };

  const addMilestone = () => {
    updateAgreementField("milestones", [
      ...formData.agreement.milestones,
      emptyMilestone(),
    ]);
  };

  const removeMilestone = (index: number) => {
    if (formData.agreement.milestones.length <= 1) return;
    updateAgreementField(
      "milestones",
      formData.agreement.milestones.filter((_, i) => i !== index)
    );
  };

  /* ── validation ── */
  const isFormValid =
    formData.clientName &&
    formData.projectType &&
    formData.projectOverview &&
    formData.startDate &&
    formData.endDate &&
    formData.deliverables.some((d) => d.description.trim());

  const ag = formData.agreement;
  const isAgreementValid =
    isFormValid &&
    ag.clientLegalName &&
    ag.clientContactName &&
    ag.clientContactEmail &&
    ag.clientAddress &&
    ag.agreementStartDate &&
    ag.agreementEndDate &&
    ag.paymentStructure &&
    ag.paymentTerm &&
    (ag.paymentStructure !== "Fixed Project Fee" || ag.totalFee) &&
    (ag.paymentStructure !== "Monthly Retainer" || ag.monthlyFee) &&
    (ag.paymentStructure !== "Milestone-Based" ||
      ag.milestones.some((m) => m.description.trim() && m.amount.trim()));

  /* ── generation handlers ── */
  const handleGenerateScope = async () => {
    if (!isFormValid) return;
    setGeneratingScope(true);
    await new Promise((r) => setTimeout(r, 500));
    setShowScopePreview(true);
    setGeneratingScope(false);
  };

  const handleGenerateAgreement = async () => {
    if (!isAgreementValid) return;
    setGeneratingAgreement(true);
    await new Promise((r) => setTimeout(r, 500));
    setShowAgreementPreview(true);
    setGeneratingAgreement(false);
  };

  const handleGenerateBoth = async () => {
    if (!isAgreementValid) return;
    setGeneratingScope(true);
    setGeneratingAgreement(true);
    await new Promise((r) => setTimeout(r, 500));
    setShowScopePreview(true);
    setShowAgreementPreview(true);
    setGeneratingScope(false);
    setGeneratingAgreement(false);
  };

  const handleDownloadAll = async () => {
    setDownloadingAll(true);
    try {
      const slug = clientSlug(formData.clientName);
      const date = formatFilenameDate();

      // Generate scope PDF
      const scopeBlob = await pdf(
        <ScopePdfDocument data={formData} />
      ).toBlob();
      const scopeUrl = URL.createObjectURL(scopeBlob);
      const scopeA = document.createElement("a");
      scopeA.href = scopeUrl;
      scopeA.download = `${slug}-scope-${date}.pdf`;
      document.body.appendChild(scopeA);
      scopeA.click();
      document.body.removeChild(scopeA);
      URL.revokeObjectURL(scopeUrl);

      // Small delay between downloads
      await new Promise((r) => setTimeout(r, 500));

      // Generate agreement PDF
      const agreementBlob = await pdf(
        <AgreementPdfDocument data={formData} />
      ).toBlob();
      const agreementUrl = URL.createObjectURL(agreementBlob);
      const agreementA = document.createElement("a");
      agreementA.href = agreementUrl;
      agreementA.download = `${slug}-agreement-${date}.pdf`;
      document.body.appendChild(agreementA);
      agreementA.click();
      document.body.removeChild(agreementA);
      URL.revokeObjectURL(agreementUrl);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setDownloadingAll(false);
    }
  };

  /* ── computed values for preview ── */
  const slug = clientSlug(formData.clientName);
  const date = formatFilenameDate();
  const validCount = formData.deliverables.filter(
    (d) => d.description.trim()
  ).length;

  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-12 py-16 md:py-24">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            Project Doc Creation
          </h1>
          <p className="text-[#6B6B6B]">
            Generate branded scope documents and service agreements for client projects
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
                value={formData.clientName}
                onChange={(e) => updateField("clientName", e.target.value)}
                placeholder="Client name..."
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Project Type</label>
              <select
                value={formData.projectType}
                onChange={(e) =>
                  updateField(
                    "projectType",
                    e.target.value as GeneratorFormData["projectType"]
                  )
                }
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

          {/* Project Overview */}
          <div>
            <label className={labelClass}>Project Overview</label>
            <textarea
              value={formData.projectOverview}
              onChange={(e) => updateField("projectOverview", e.target.value)}
              placeholder="A 2-3 sentence summary of the project scope and objectives..."
              rows={3}
              className={textareaClass}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => updateField("startDate", e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Estimated End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => updateField("endDate", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Deliverables */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">
                Deliverables
              </label>
              <button
                onClick={addDeliverable}
                className="flex items-center gap-1.5 text-xs font-medium text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors"
              >
                <PlusIcon className="size-3.5" />
                Add row
              </button>
            </div>

            <div className="space-y-3">
              {formData.deliverables.map((d, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_160px_36px] gap-3 items-start"
                >
                  <input
                    type="text"
                    value={d.description}
                    onChange={(e) =>
                      updateDeliverable(i, "description", e.target.value)
                    }
                    placeholder="Deliverable description..."
                    className={inputClass}
                  />
                  <select
                    value={d.type}
                    onChange={(e) =>
                      updateDeliverable(i, "type", e.target.value)
                    }
                    className={selectClass}
                  >
                    <option value="">Type...</option>
                    {deliverableTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeDeliverable(i)}
                    disabled={formData.deliverables.length <= 1}
                    className="p-2.5 text-[#AAAAAA] hover:text-[#0A0A0A] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <TrashIcon className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <label className={labelClass}>Additional Notes</label>
            <textarea
              value={formData.additionalNotes}
              onChange={(e) => updateField("additionalNotes", e.target.value)}
              placeholder="Any additional notes, assumptions, or exclusions..."
              rows={3}
              className={textareaClass}
            />
          </div>

          {/* ── Agreement Details (collapsible) ── */}
          <div className="pt-4 border-t border-[#E5E5E5]">
            <button
              type="button"
              onClick={() =>
                updateField("showAgreement", !formData.showAgreement)
              }
              className="flex items-center justify-between w-full text-left"
            >
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">
                  Agreement Details
                </span>
                <span className="ml-2 text-[10px] text-[#AAAAAA]">
                  Optional
                </span>
              </div>
              <ChevronDownIcon
                className={`size-4 text-[#6B6B6B] transition-transform ${
                  formData.showAgreement ? "rotate-180" : ""
                }`}
              />
            </button>

            {formData.showAgreement && (
              <div className="mt-6 space-y-6">
                {/* Client legal name */}
                <div>
                  <label className={labelClass}>Client Legal Name</label>
                  <input
                    type="text"
                    value={ag.clientLegalName}
                    onChange={(e) =>
                      updateAgreementField("clientLegalName", e.target.value)
                    }
                    placeholder="Full legal entity name..."
                    className={inputClass}
                  />
                </div>

                {/* Contact name & email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClass}>Contact Name</label>
                    <input
                      type="text"
                      value={ag.clientContactName}
                      onChange={(e) =>
                        updateAgreementField(
                          "clientContactName",
                          e.target.value
                        )
                      }
                      placeholder="Primary contact..."
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Contact Email</label>
                    <input
                      type="email"
                      value={ag.clientContactEmail}
                      onChange={(e) =>
                        updateAgreementField(
                          "clientContactEmail",
                          e.target.value
                        )
                      }
                      placeholder="contact@company.com"
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className={labelClass}>Client Address</label>
                  <textarea
                    value={ag.clientAddress}
                    onChange={(e) =>
                      updateAgreementField("clientAddress", e.target.value)
                    }
                    placeholder="Full business address..."
                    rows={2}
                    className={textareaClass}
                  />
                </div>

                {/* Agreement dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClass}>Agreement Start Date</label>
                    <input
                      type="date"
                      value={ag.agreementStartDate}
                      onChange={(e) =>
                        updateAgreementField(
                          "agreementStartDate",
                          e.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Agreement End Date</label>
                    <input
                      type="date"
                      value={ag.agreementEndDate}
                      onChange={(e) =>
                        updateAgreementField(
                          "agreementEndDate",
                          e.target.value
                        )
                      }
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* Payment structure */}
                <div>
                  <label className={labelClass}>Payment Structure</label>
                  <select
                    value={ag.paymentStructure}
                    onChange={(e) =>
                      updateAgreementField(
                        "paymentStructure",
                        e.target.value as AgreementDetails["paymentStructure"]
                      )
                    }
                    className={selectClass}
                  >
                    <option value="">Select structure...</option>
                    {paymentStructures.map((ps) => (
                      <option key={ps} value={ps}>
                        {ps}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Conditional payment fields */}
                {ag.paymentStructure === "Fixed Project Fee" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className={labelClass}>Total Fee</label>
                      <input
                        type="text"
                        value={ag.totalFee}
                        onChange={(e) =>
                          updateAgreementField("totalFee", e.target.value)
                        }
                        placeholder="e.g. £5,000"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Deposit</label>
                      <input
                        type="text"
                        value={ag.deposit ?? ""}
                        onChange={(e) =>
                          updateAgreementField("deposit", e.target.value)
                        }
                        placeholder="e.g. £5,000"
                        className={inputClass}
                      />
                    </div>
                  </div>
                )}

                {ag.paymentStructure === "Monthly Retainer" && (
                  <div>
                    <label className={labelClass}>Monthly Fee</label>
                    <input
                      type="text"
                      value={ag.monthlyFee}
                      onChange={(e) =>
                        updateAgreementField("monthlyFee", e.target.value)
                      }
                      placeholder="e.g. £2,500/month"
                      className={inputClass}
                    />
                  </div>
                )}

                {ag.paymentStructure === "Milestone-Based" && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">
                        Milestones
                      </label>
                      <button
                        onClick={addMilestone}
                        className="flex items-center gap-1.5 text-xs font-medium text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors"
                      >
                        <PlusIcon className="size-3.5" />
                        Add milestone
                      </button>
                    </div>

                    <div className="space-y-3">
                      {ag.milestones.map((m, i) => (
                        <div
                          key={i}
                          className="grid grid-cols-[1fr_120px_36px] gap-3 items-start"
                        >
                          <input
                            type="text"
                            value={m.description}
                            onChange={(e) =>
                              updateMilestone(i, "description", e.target.value)
                            }
                            placeholder="Milestone description..."
                            className={inputClass}
                          />
                          <input
                            type="text"
                            value={m.amount}
                            onChange={(e) =>
                              updateMilestone(i, "amount", e.target.value)
                            }
                            placeholder="Amount..."
                            className={inputClass}
                          />
                          <button
                            onClick={() => removeMilestone(i)}
                            disabled={ag.milestones.length <= 1}
                            className="p-2.5 text-[#AAAAAA] hover:text-[#0A0A0A] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <TrashIcon className="size-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Payment terms */}
                <div>
                  <label className={labelClass}>Payment Terms</label>
                  <select
                    value={ag.paymentTerm}
                    onChange={(e) =>
                      updateAgreementField(
                        "paymentTerm",
                        e.target.value as AgreementDetails["paymentTerm"]
                      )
                    }
                    className={selectClass}
                  >
                    <option value="">Select terms...</option>
                    {paymentTerms.map((pt) => (
                      <option key={pt} value={pt}>
                        {pt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notice period */}
                <div>
                  <label className={labelClass}>Notice Period</label>
                  <input
                    type="text"
                    value={ag.noticePeriod}
                    onChange={(e) =>
                      updateAgreementField("noticePeriod", e.target.value)
                    }
                    placeholder="e.g. 30 days"
                    className={inputClass}
                  />
                </div>

                {/* Additional terms */}
                <div>
                  <label className={labelClass}>Additional Terms</label>
                  <textarea
                    value={ag.additionalTerms}
                    onChange={(e) =>
                      updateAgreementField("additionalTerms", e.target.value)
                    }
                    placeholder="Any custom terms or conditions for this agreement..."
                    rows={3}
                    className={textareaClass}
                  />
                </div>

                {/* Signature pad */}
                <SignaturePad
                  value={ag.signature}
                  onChange={(dataUrl) =>
                    updateAgreementField("signature", dataUrl)
                  }
                />

                {/* Signer name, title & date */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className={labelClass}>Your Name</label>
                    <input
                      type="text"
                      value={ag.signerName ?? ""}
                      onChange={(e) =>
                        updateAgreementField("signerName", e.target.value)
                      }
                      placeholder="Printed name..."
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Title</label>
                    <input
                      type="text"
                      value={ag.signerTitle ?? ""}
                      onChange={(e) =>
                        updateAgreementField("signerTitle", e.target.value)
                      }
                      placeholder="e.g. Director"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Date Signed</label>
                    <input
                      type="date"
                      value={ag.signerDate ?? ""}
                      onChange={(e) =>
                        updateAgreementField("signerDate", e.target.value)
                      }
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Generate Buttons ── */}
          <div className="pt-4 flex flex-wrap gap-3">
            <button
              onClick={handleGenerateScope}
              disabled={!isFormValid || generatingScope}
              className="flex items-center gap-2 px-6 py-3 bg-[#0A0A0A] text-white text-sm font-medium rounded-md hover:bg-accent hover:text-[#0A0A0A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {generatingScope ? (
                <>
                  <ArrowPathIcon className="size-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <EyeIcon className="size-4" />
                  Generate Scope PDF
                </>
              )}
            </button>

            {formData.showAgreement && (
              <button
                onClick={handleGenerateAgreement}
                disabled={!isAgreementValid || generatingAgreement}
                className="flex items-center gap-2 px-6 py-3 bg-[#0A0A0A] text-white text-sm font-medium rounded-md hover:bg-accent hover:text-[#0A0A0A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {generatingAgreement ? (
                  <>
                    <ArrowPathIcon className="size-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <EyeIcon className="size-4" />
                    Generate Agreement PDF
                  </>
                )}
              </button>
            )}

            {formData.showAgreement && (
              <button
                onClick={handleGenerateBoth}
                disabled={
                  !isAgreementValid || generatingScope || generatingAgreement
                }
                className="flex items-center gap-2 px-6 py-3 border border-[#E5E5E5] bg-white text-[#0A0A0A] text-sm font-medium rounded-md hover:bg-[#F5F5F5] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {generatingScope && generatingAgreement ? (
                  <>
                    <ArrowPathIcon className="size-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <EyeIcon className="size-4" />
                    Generate Both
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* ── PDF Previews ── */}
        {(showScopePreview || showAgreementPreview) && (
          <div className="mt-12 pt-12 border-t border-[#E5E5E5] space-y-6">
            {showScopePreview && (
              <PdfPreview
                document={<ScopePdfDocument data={formData} />}
                filename={`${slug}-scope-${date}.pdf`}
                label="Scope Document"
                description={`Scope document for ${formData.clientName} — ${formData.projectType}`}
                details={`${validCount} deliverable${validCount !== 1 ? "s" : ""} · ${formData.startDate} → ${formData.endDate}`}
              />
            )}

            {showAgreementPreview && (
              <PdfPreview
                document={<AgreementPdfDocument data={formData} />}
                filename={`${slug}-agreement-${date}.pdf`}
                label="Service Agreement"
                description={`Service agreement for ${formData.clientName} — ${ag.clientLegalName}`}
                details={`${ag.paymentStructure} · ${ag.agreementStartDate} → ${ag.agreementEndDate}`}
              />
            )}

            {showScopePreview && showAgreementPreview && (
              <button
                onClick={handleDownloadAll}
                disabled={downloadingAll}
                className="flex items-center gap-2 px-5 py-2.5 border border-[#E5E5E5] bg-white text-[#0A0A0A] text-sm font-medium rounded-md hover:bg-[#F5F5F5] transition-colors disabled:opacity-40"
              >
                {downloadingAll ? (
                  <>
                    <ArrowPathIcon className="size-3.5 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <ArrowDownTrayIcon className="size-3.5" />
                    Download All PDFs
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
