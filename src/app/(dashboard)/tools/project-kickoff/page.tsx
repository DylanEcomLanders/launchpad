"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  PlusIcon,
  TrashIcon,
  RocketLaunchIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

/* ── Lazy-loaded standalone generators for modal popups ── */
const ScopeGeneratorPage = dynamic(() => import("../scope-generator/page"), { ssr: false });
const ProjectRoadmapPage = dynamic(() => import("../project-roadmap/page"), { ssr: false });
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
import { computeAllPhases, computeDesignDevDays } from "@/lib/roadmap-defaults";
import { pdf, type DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import { inputClass, selectClass, labelClass, textareaClass } from "@/lib/form-styles";
import { createPortal } from "@/lib/portal/data";
import type { PortalInsert, PortalPhase as PPhase, PortalDeliverable as PDel, PortalDocument as PDoc } from "@/lib/portal/types";
import { useRouter } from "next/navigation";

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

import { formatShortDate, formatLongDate, formatFilenameDate } from "@/lib/dates";

function clientSlug(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, "-").replace(/-+/g, "-").toLowerCase();
}

/* ── Shared CSS classes ── */
const sectionHeadingClass =
  "text-xs font-semibold uppercase tracking-wider text-[#7A7A7A]";

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

  /* Agreement */
  const [agreement, setAgreement] = useState<AgreementDetails>(emptyAgreement());

  /* Modal state for quick-link popups */
  const [activeModal, setActiveModal] = useState<"scope" | "roadmap" | "agreement" | null>(null);

  /* Generation state */
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [showOutputs, setShowOutputs] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedSlack, setCopiedSlack] = useState(false);
  const [creatingPortal, setCreatingPortal] = useState(false);
  const [portalCreated, setPortalCreated] = useState(false);
  const [existingPortals, setExistingPortals] = useState<{ id: string; client_name: string }[]>([]);
  const [selectedPortalId, setSelectedPortalId] = useState<string>("new"); // "new" or portal ID

  /* ── Fetch existing portals for "assign to" ── */
  useEffect(() => {
    import("@/lib/portal/data").then(({ getPortals }) => {
      getPortals().then((portals) => {
        setExistingPortals(portals.map((p) => ({ id: p.id, client_name: p.client_name })));
      });
    });
  }, []);

  /* ── Close modal on Escape ── */
  const closeModal = useCallback(() => setActiveModal(null), []);
  useEffect(() => {
    if (!activeModal) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeModal(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [activeModal, closeModal]);

  /* ── Auto-compute design/dev days from deliverable types ── */
  const deliverableTypesList = useMemo(
    () => deliverables.map((d) => d.type),
    [deliverables]
  );
  const { designDays, devDays } = useMemo(
    () => computeDesignDevDays(deliverableTypesList),
    [deliverableTypesList]
  );

  /* ── Computed phases ── */
  const phases = useMemo(() => {
    if (!kickoffDate || designDays === 0) return [];
    return computeAllPhases(kickoffDate, designDays, devDays);
  }, [kickoffDate, designDays, devDays]);

  /* ── Derived dates from phases ── */
  const designEndDate =
    phases.find((p) => p.name === "Design")?.endDate || "";
  const devEndDate =
    phases.find((p) => p.name === "Development")?.endDate || "";

  /* ── Validation ── */
  const validDeliverables = deliverables.filter((d) => d.description.trim());
  const hasDeliverableTypes = deliverables.some((d) => d.type !== "");
  const isFormValid =
    clientName.trim() &&
    projectType &&
    projectOverview.trim() &&
    kickoffDate &&
    hasDeliverableTypes &&
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
      showAgreement: !!isAgreementValid,
      agreement: {
        ...agreement,
        agreementStartDate: agreement.agreementStartDate || kickoffDate,
        agreementEndDate: agreement.agreementEndDate || devEndDate,
      },
    }),
    [clientName, projectType, projectOverview, kickoffDate, devEndDate, deliverables, additionalNotes, isAgreementValid, agreement]
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

      if (isAgreementValid) {
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

  /* ── Create Client Portal from form data ── */
  const handleCreatePortal = async () => {
    if (!isFormValid || creatingPortal) return;
    setCreatingPortal(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const fmtDate = (d: string) => {
        if (!d) return "";
        const dt = new Date(d + "T00:00:00");
        return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
      };

      // Map computed phases → PortalPhases (first = in-progress, rest = upcoming)
      const portalPhases: PPhase[] = phases.map((p, i) => ({
        id: `phase-${i}`,
        name: p.name,
        status: i === 0 ? ("in-progress" as const) : ("upcoming" as const),
        dates: `${fmtDate(p.startDate)} – ${fmtDate(p.endDate)}`,
        description: p.description,
        tasks: 0,
        completed: 0,
        deadline: p.endDate,
      }));

      // Map deliverables
      const portalDeliverables: PDel[] = validDeliverables.map((d, i) => ({
        id: `d-${i + 1}`,
        name: d.description,
        phase: "Design",
        status: "not-started" as const,
        assignee: "",
      }));

      // Generate PDFs and convert to data URLs for client download
      const toDataUrl = async (doc: ReactElement<DocumentProps>): Promise<string> => {
        const blob = await pdf(doc).toBlob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      };

      const [scopeUrl, roadmapUrl] = await Promise.all([
        toDataUrl(<ScopePdfDocument data={scopeFormData} />),
        toDataUrl(<RoadmapPdfDocument data={roadmapFormData} />),
      ]);

      const portalDocs: PDoc[] = [
        { name: `${clientName} – Project Roadmap`, type: "Roadmap" as const, date: today, url: roadmapUrl },
        { name: `${clientName} – Scope of Work`, type: "Scope" as const, date: today, url: scopeUrl },
      ];
      if (isAgreementValid) {
        const agreementUrl = await toDataUrl(<AgreementPdfDocument data={scopeFormData} />);
        portalDocs.push({ name: `${clientName} – Service Agreement`, type: "Agreement" as const, date: today, url: agreementUrl });
      }

      const isRetainerType = projectType.toLowerCase().includes("retainer");

      // Build project object for both new and existing portal paths
      const newProject: import("@/lib/portal/types").PortalProject = {
        id: crypto.randomUUID(),
        name: projectType || "Page Build",
        type: isRetainerType ? "retainer" : "page-build",
        status: "active",
        created_at: new Date().toISOString(),
        phases: portalPhases,
        deliverables: portalDeliverables,
        current_phase: portalPhases[0]?.name || "Kickoff",
        progress: 0,
        scope: validDeliverables.map((d) => ({ description: d.description, type: d.type || "" })),
        documents: portalDocs,
      };

      if (selectedPortalId !== "new") {
        // Add as project to existing portal
        const { getPortalById, updatePortal } = await import("@/lib/portal/data");
        const existing = await getPortalById(selectedPortalId);
        if (!existing) throw new Error("Portal not found");
        const updatedProjects = [...(existing.projects || []), newProject];
        await updatePortal(selectedPortalId, { projects: updatedProjects });
        setPortalCreated(true);
        router.push(`/tools/client-portal/${selectedPortalId}`);
      } else {
        // Create new portal
        const input: PortalInsert = {
          client_name: clientName,
          client_email: agreement.clientContactEmail || "",
          client_type: isRetainerType ? "retainer" : "regular",
          project_type: projectType,
          current_phase: portalPhases[0]?.name || "Kickoff",
          progress: 0,
          next_touchpoint: { date: kickoffDate, description: "Project kickoff call" },
          phases: portalPhases,
          scope: validDeliverables.map((d) => ({ description: d.description, type: d.type || "" })),
          deliverables: portalDeliverables,
          documents: portalDocs,
          results: [],
          wins: [],
          show_results: false,
          slack_channel_url: "",
          ad_hoc_requests: [],
          projects: [newProject],
        };

        const portal = await createPortal(input);
        setPortalCreated(true);
        router.push(`/tools/client-portal/${portal.id}`);
      }
    } catch (err) {
      console.error("Portal creation failed:", err);
      alert("Failed to create portal. Check the console for details.");
    } finally {
      setCreatingPortal(false);
    }
  };

  /* ── Kickoff email text ── */
  const kickoffEmail = useMemo(() => {
    if (!isFormValid) return "";
    const deliverablesText = validDeliverables
      .map((d, i) => `  ${i + 1}. ${d.description}${d.type ? ` (${d.type})` : ""}`)
      .join("\n");

    const feeText =
      agreement.paymentStructure === "Fixed Project Fee" && agreement.totalFee
        ? `\nProject Investment: ${agreement.totalFee}`
        : agreement.paymentStructure === "Monthly Retainer" && agreement.monthlyFee
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
  }, [isFormValid, clientName, projectType, projectOverview, validDeliverables, kickoffDate, designEndDate, devEndDate, agreement]);

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
            Project Setup
          </h1>
          <p className="text-[#7A7A7A] mb-4">
            Fill in the details once, get your scope doc, roadmap, agreement, kickoff email, and Slack brief
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveModal("scope")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#7A7A7A] bg-[#F3F3F5] border border-[#E5E5EA] rounded-md hover:border-[#1B1B1B] hover:text-[#1B1B1B] transition-colors"
            >
              Scope Doc Only
              <svg className="size-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={() => setActiveModal("roadmap")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#7A7A7A] bg-[#F3F3F5] border border-[#E5E5EA] rounded-md hover:border-[#1B1B1B] hover:text-[#1B1B1B] transition-colors"
            >
              Roadmap Only
              <svg className="size-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={() => setActiveModal("agreement")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#7A7A7A] bg-[#F3F3F5] border border-[#E5E5EA] rounded-md hover:border-[#1B1B1B] hover:text-[#1B1B1B] transition-colors"
            >
              Agreement Only
              <svg className="size-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
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
          <div className="pt-6 border-t border-[#E5E5EA]">
            <div className="flex items-center justify-between mb-4">
              <p className={sectionHeadingClass}>Deliverables</p>
              <button
                onClick={addDeliverable}
                className="flex items-center gap-1.5 text-xs font-medium text-[#7A7A7A] hover:text-[#1B1B1B] transition-colors"
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
                    className="p-2.5 text-[#A0A0A0] hover:text-[#1B1B1B] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
          <div className="pt-6 border-t border-[#E5E5EA]">
            <p className={`${sectionHeadingClass} mb-4`}>Timeline</p>
            <div className="bg-[#F3F3F5] border border-[#E5E5EA] shadow-[var(--shadow-soft)] rounded-lg p-5">
              <div>
                <label className={labelClass}>Kickoff Date</label>
                <input
                  type="date"
                  value={kickoffDate}
                  onChange={(e) => { setKickoffDate(e.target.value); setShowOutputs(false); }}
                  className={`${inputClass} max-w-xs`}
                />
              </div>

              {/* Auto-computed summary */}
              {hasDeliverableTypes && (
                <div className="mt-4 pt-4 border-t border-[#E5E5EA]">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0] mb-2">
                    Computed from deliverables
                  </p>
                  <p className="text-xs text-[#7A7A7A] mb-3">
                    Design: <span className="font-semibold text-[#1B1B1B]">{designDays}d</span>
                    <span className="mx-2 text-[#C5C5C5]">·</span>
                    Development: <span className="font-semibold text-[#1B1B1B]">{devDays}d</span>
                  </p>
                  {phases.length > 0 && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {phases.map((phase) => {
                        const isPoint = phase.startDate === phase.endDate;
                        return (
                          <span key={phase.name} className="text-[11px] text-[#7A7A7A]">
                            <span className="font-semibold text-[#1B1B1B]">{phase.name}</span>{" "}
                            {isPoint
                              ? formatShortDate(phase.startDate)
                              : `${formatShortDate(phase.startDate)} → ${formatShortDate(phase.endDate)}`}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Section 4: Agreement ── */}
          <div className="pt-6 border-t border-[#E5E5EA]">
            <p className={`${sectionHeadingClass} mb-6`}>Agreement Details</p>
            <div className="space-y-6">
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
                      className="flex items-center gap-1.5 text-xs font-medium text-[#7A7A7A] hover:text-[#1B1B1B] transition-colors"
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
                          className="p-2.5 text-[#A0A0A0] hover:text-[#1B1B1B] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
          </div>

          {/* ── Generate Button ── */}
          <div className="pt-4">
            <button
              onClick={handleGenerate}
              disabled={!isFormValid || generating}
              className="flex items-center gap-2 px-6 py-3 bg-[#1B1B1B] text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
          <div className="mt-12 pt-12 border-t border-[#E5E5EA] space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Kickoff Pack</h2>
              <div className="flex items-center gap-2">
                {existingPortals.length > 0 && !portalCreated && (
                  <select
                    value={selectedPortalId}
                    onChange={(e) => setSelectedPortalId(e.target.value)}
                    className="text-xs px-2 py-2 border border-[#E5E5EA] rounded-lg bg-white"
                  >
                    <option value="new">New Portal</option>
                    {existingPortals.map((p) => (
                      <option key={p.id} value={p.id}>{p.client_name}</option>
                    ))}
                  </select>
                )}
                <button
                  onClick={handleCreatePortal}
                  disabled={creatingPortal || portalCreated}
                  className="flex items-center gap-2 px-4 py-2 bg-[#1B1B1B] text-white text-xs font-medium rounded-lg hover:bg-[#2D2D2D] transition-colors disabled:opacity-40"
                >
                  {portalCreated ? (
                    <>
                      <CheckIcon className="size-3.5 text-emerald-400" />
                      Redirecting to portal...
                    </>
                  ) : creatingPortal ? (
                    <>
                      <ArrowPathIcon className="size-3.5 animate-spin" />
                      {selectedPortalId !== "new" ? "Adding..." : "Creating Portal..."}
                    </>
                  ) : (
                    <>
                      <RocketLaunchIcon className="size-3.5" />
                      {selectedPortalId !== "new" ? "Add to Portal" : "Create Client Portal"}
                    </>
                  )}
                </button>
                {!portalCreated && (
                  <button
                    onClick={handleDownloadAll}
                    disabled={downloadingAll}
                    className="flex items-center gap-2 px-4 py-2 text-[#777] border border-[#E5E5EA] text-xs font-medium rounded-lg hover:bg-[#F5F5F5] transition-colors disabled:opacity-40"
                  >
                    {downloadingAll ? (
                      <>
                        <ArrowPathIcon className="size-3.5 animate-spin" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <PlusIcon className="size-3.5" />
                        Download PDFs
                      </>
                    )}
                  </button>
                )}
              </div>
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

            {isAgreementValid && (
              <PdfPreview
                document={<AgreementPdfDocument data={scopeFormData} />}
                filename={`${slug}-agreement-${date}.pdf`}
                label="Service Agreement"
                description={`Service agreement for ${clientName} — ${agreement.clientLegalName}`}
                details={`${agreement.paymentStructure} · ${formatShortDate(kickoffDate)} → ${formatShortDate(devEndDate)}`}
              />
            )}

            {/* Kickoff Email */}
            <div className="bg-[#EDEDEF] border border-[#E5E5EA] shadow-[var(--shadow-soft)] rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Client Kickoff Email</h3>
                <button
                  onClick={() => copyToClipboard(kickoffEmail, setCopiedEmail)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-[#E5E5EA] rounded-md hover:bg-[#F3F3F5] transition-colors"
                >
                  {copiedEmail ? (
                    <><CheckIcon className="size-3" /> Copied</>
                  ) : (
                    <><ClipboardDocumentIcon className="size-3" /> Copy Email</>
                  )}
                </button>
              </div>
              <pre className="text-xs text-[#3A3A3A] whitespace-pre-wrap font-sans leading-relaxed bg-white border border-[#E5E5EA] rounded-md p-4 max-h-60 overflow-y-auto">
                {kickoffEmail}
              </pre>
            </div>

            {/* Slack Brief */}
            <div className="bg-[#EDEDEF] border border-[#E5E5EA] shadow-[var(--shadow-soft)] rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Slack Brief</h3>
                <button
                  onClick={() => copyToClipboard(slackBrief, setCopiedSlack)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-[#E5E5EA] rounded-md hover:bg-[#F3F3F5] transition-colors"
                >
                  {copiedSlack ? (
                    <><CheckIcon className="size-3" /> Copied</>
                  ) : (
                    <><ClipboardDocumentIcon className="size-3" /> Copy for Slack</>
                  )}
                </button>
              </div>
              <pre className="text-xs text-[#3A3A3A] whitespace-pre-wrap font-sans leading-relaxed bg-white border border-[#E5E5EA] rounded-md p-4 max-h-60 overflow-y-auto">
                {slackBrief}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* ── Quick-link Modal Overlay ── */}
      {activeModal && (
        <div
          className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm overflow-y-auto"
          onClick={closeModal}
        >
          <div className="min-h-full flex justify-center py-6 px-4">
            <div
              className="w-full max-w-4xl bg-white rounded-lg shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={closeModal}
                className="sticky top-4 float-right mr-4 mt-4 z-20 p-2 rounded-full bg-white border border-[#E5E5EA] shadow-sm hover:bg-[#F3F3F5] transition-colors"
                aria-label="Close"
              >
                <XMarkIcon className="size-4" />
              </button>
              {/* Modal header matching the doc type */}
              <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-12 pt-12">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
                  {activeModal === "scope" && "Scope Document"}
                  {activeModal === "roadmap" && "Project Roadmap"}
                  {activeModal === "agreement" && "Service Agreement"}
                </h1>
                <p className="text-[#7A7A7A]">
                  {activeModal === "scope" && "Generate a branded scope document for your client project"}
                  {activeModal === "roadmap" && "Generate a branded project timeline PDF for your client"}
                  {activeModal === "agreement" && "Generate a service agreement for your client project"}
                </p>
              </div>
              {/* Embedded page with its header + decorative blocks hidden, top padding reduced */}
              <div className="[&_.mb-12]:hidden [&_.pointer-events-none]:hidden [&>div>div:nth-child(2)]:!pt-4 [&>div]:min-h-0 [&>div]:rounded-lg overflow-hidden">
                {activeModal === "scope" && <ScopeGeneratorPage />}
                {activeModal === "agreement" && <ScopeGeneratorPage agreementAlwaysOpen />}
                {activeModal === "roadmap" && <ProjectRoadmapPage />}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
