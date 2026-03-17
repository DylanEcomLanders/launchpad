"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  PlusIcon,
  CheckIcon,
  XMarkIcon,
  ClipboardDocumentIcon,
  ArrowTopRightOnSquareIcon,
  TrashIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { inputClass, textareaClass, labelClass } from "@/lib/form-styles";
import {
  getPortalById,
  updatePortal,
  getUpdates,
  addUpdate,
  getApprovals,
} from "@/lib/portal/data";
import { isLoomUrl, toLoomEmbed } from "@/lib/portal/loom";
import {
  getReviews,
  createReview,
  addVersion,
  getVersions,
  getFeedback,
  deleteReview,
} from "@/lib/portal/reviews";
import { isFigmaUrl, toFigmaEmbed } from "@/lib/portal/review-types";
import type {
  PortalData,
  PortalUpdate,
  PortalApproval,
  PortalPhase,
  PortalWin,
  AdHocRequest,
} from "@/lib/portal/types";
import type {
  DesignReview,
  DesignReviewVersion,
  DesignReviewFeedback,
} from "@/lib/portal/review-types";

type DashTab = "overview" | "updates" | "designs" | "development" | "testing";

export default function PortalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const portalId = params.id as string;

  const [portal, setPortal] = useState<PortalData | null>(null);
  const [updates, setUpdates] = useState<PortalUpdate[]>([]);
  const [approvals, setApprovals] = useState<PortalApproval[]>([]);
  const [reviews, setReviews] = useState<DesignReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DashTab>("overview");
  const [copied, setCopied] = useState(false);

  // Update form
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [updateTitle, setUpdateTitle] = useState("");
  const [updateDescription, setUpdateDescription] = useState("");
  const [updateLoomUrl, setUpdateLoomUrl] = useState("");
  const [saving, setSaving] = useState(false);

  // Phase/deliverable forms
  const [showPhaseForm, setShowPhaseForm] = useState(false);
  const [phaseName, setPhaseName] = useState("");
  const [phaseDates, setPhaseDates] = useState("");
  const [phaseDescription, setPhaseDescription] = useState("");

  const [phaseDeadline, setPhaseDeadline] = useState("");


  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, u, a, r] = await Promise.all([
        getPortalById(portalId),
        getUpdates(portalId),
        getApprovals(portalId),
        getReviews(portalId),
      ]);
      setPortal(p);
      setUpdates(u);
      setApprovals(a);
      setReviews(r);
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }, [portalId]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Handlers ──

  const handleAddUpdate = async () => {
    if (!updateTitle.trim() || !updateLoomUrl.trim() || !portal) return;
    setSaving(true);
    try {
      await addUpdate({
        portal_id: portal.id,
        title: updateTitle.trim(),
        description: updateDescription.trim(),
        loom_url: updateLoomUrl.trim(),
        posted_by: "Team",
      });

      // Optionally send notification
      if (portal.client_email) {
        fetch("/api/portal/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientEmail: portal.client_email,
            clientName: portal.client_name,
            portalToken: portal.token,
            type: "update",
            title: updateTitle.trim(),
          }),
        }).catch(() => {});
      }

      setUpdateTitle("");
      setUpdateDescription("");
      setUpdateLoomUrl("");
      setShowUpdateForm(false);
      const fresh = await getUpdates(portalId);
      setUpdates(fresh);
    } finally {
      setSaving(false);
    }
  };

  const handleAddPhase = async () => {
    if (!phaseName.trim() || !portal) return;
    const newPhase: PortalPhase = {
      id: crypto.randomUUID(),
      name: phaseName.trim(),
      status: "upcoming",
      dates: phaseDates.trim(),
      description: phaseDescription.trim(),
      tasks: 0,
      completed: 0,
      deadline: phaseDeadline || undefined,
    };
    const updatedPhases = [...portal.phases, newPhase];
    await updatePortal(portal.id, { phases: updatedPhases });
    setPortal({ ...portal, phases: updatedPhases });
    setPhaseName("");
    setPhaseDates("");
    setPhaseDescription("");
    setPhaseDeadline("");
    setShowPhaseForm(false);
  };

  const handleRemovePhase = async (phaseId: string) => {
    if (!portal) return;
    const updatedPhases = portal.phases.filter((p) => p.id !== phaseId);
    await updatePortal(portal.id, { phases: updatedPhases });
    setPortal({ ...portal, phases: updatedPhases });
  };

  const handleUpdateField = async (field: string, value: string | number | boolean) => {
    if (!portal) return;
    await updatePortal(portal.id, { [field]: value });
    setPortal({ ...portal, [field]: value } as PortalData);
  };

  const handleCyclePhaseStatus = async (phaseId: string) => {
    if (!portal) return;
    const order: PortalPhase["status"][] = ["upcoming", "in-progress", "complete"];
    const updatedPhases = portal.phases.map((p) => {
      if (p.id !== phaseId) return p;
      const nextStatus = order[(order.indexOf(p.status) + 1) % order.length];
      return { ...p, status: nextStatus };
    });
    // Optimistic update
    setPortal({ ...portal, phases: updatedPhases });
    await updatePortal(portal.id, { phases: updatedPhases });
  };

  const handleUpdateTouchpoint = async (field: "date" | "description", value: string) => {
    if (!portal) return;
    const updated = { ...portal.next_touchpoint, [field]: value };
    setPortal({ ...portal, next_touchpoint: updated });
    await updatePortal(portal.id, { next_touchpoint: updated });
  };

  const handleAddScope = async (item: string) => {
    if (!portal || !item.trim()) return;
    const updatedScope = [...portal.scope, item.trim()];
    setPortal({ ...portal, scope: updatedScope });
    await updatePortal(portal.id, { scope: updatedScope });
  };

  const handleRemoveScope = async (index: number) => {
    if (!portal) return;
    const updatedScope = portal.scope.filter((_, i) => i !== index);
    setPortal({ ...portal, scope: updatedScope });
    await updatePortal(portal.id, { scope: updatedScope });
  };

  const copyLink = () => {
    if (!portal) return;
    const url = `${window.location.origin}/portal/${portal.token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Render ──

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="max-w-3xl mx-auto px-6 md:px-12 py-16 md:py-24">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-[#EDEDEF] rounded w-1/3" />
            <div className="h-4 bg-[#EDEDEF] rounded w-2/3" />
            <div className="h-32 bg-[#EDEDEF] rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!portal) {
    return (
      <div className="min-h-screen">
        <div className="max-w-3xl mx-auto px-6 md:px-12 py-16 md:py-24 text-center">
          <h1 className="text-2xl font-bold mb-2">Portal Not Found</h1>
          <p className="text-[#7A7A7A] text-sm mb-6">
            This portal may have been deleted.
          </p>
          <button
            onClick={() => router.push("/tools/client-portal")}
            className="text-xs font-medium text-[#7A7A7A] hover:text-[#1B1B1B]"
          >
            Back to Portals
          </button>
        </div>
      </div>
    );
  }

  const openRequests = (portal.ad_hoc_requests || []).filter(r => r.status !== "done").length;

  const dashTabs: { key: DashTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "updates", label: "Updates" },
    { key: "designs", label: "Designs" },
    { key: "development", label: "Development" },
    { key: "testing", label: "Testing" },
  ];

  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-6 md:px-12 py-16 md:py-24">
        {/* Back + Header */}
        <div className="mb-8">
          <Link
            href="/tools/client-portal"
            className="inline-flex items-center gap-1 text-xs font-medium text-[#A0A0A0] hover:text-[#1B1B1B] transition-colors mb-4"
          >
            <ArrowLeftIcon className="size-3" />
            All Portals
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                {portal.client_name}
              </h1>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={copyLink}
                className="flex items-center gap-1 text-[11px] font-medium text-[#A0A0A0] hover:text-[#1B1B1B] transition-colors"
              >
                <ClipboardDocumentIcon className="size-3.5" />
                {copied ? "Copied!" : "Copy Link"}
              </button>
              <a
                href={`/portal/${portal.token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] font-medium text-[#A0A0A0] hover:text-[#1B1B1B] transition-colors"
              >
                <ArrowTopRightOnSquareIcon className="size-3.5" />
                Preview
              </a>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-0.5 bg-[#F3F3F5] rounded-md p-1 mb-8">
          {dashTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded transition-all ${
                activeTab === tab.key
                  ? "bg-white text-[#1B1B1B] shadow-sm"
                  : "text-[#7A7A7A] hover:text-[#1B1B1B]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "overview" && (
          <OverviewSection
            portal={portal}
            onUpdateField={handleUpdateField}
            onAddPhase={() => setShowPhaseForm(true)}
            onRemovePhase={handleRemovePhase}
            onCyclePhaseStatus={handleCyclePhaseStatus}
            onUpdateTouchpoint={handleUpdateTouchpoint}
            onAddScope={handleAddScope}
            onRemoveScope={handleRemoveScope}
          />
        )}

        {activeTab === "updates" && (
          <UpdatesSection
            updates={updates}
            showForm={showUpdateForm}
            onShowForm={() => setShowUpdateForm(true)}
            onHideForm={() => setShowUpdateForm(false)}
            title={updateTitle}
            description={updateDescription}
            loomUrl={updateLoomUrl}
            onTitleChange={setUpdateTitle}
            onDescriptionChange={setUpdateDescription}
            onLoomUrlChange={setUpdateLoomUrl}
            onSubmit={handleAddUpdate}
            saving={saving}
          />
        )}

        {activeTab === "designs" && portal && (
          <DesignsSection
            portal={portal}
            reviews={reviews}
            onReviewsChange={setReviews}
          />
        )}

        {activeTab === "development" && (
          <div className="bg-white border border-dashed border-[#E5E5EA] rounded-lg p-8 text-center">
            <p className="text-sm text-[#7A7A7A] mb-1">Development</p>
            <p className="text-xs text-[#A0A0A0]">Track development progress, staging links, and build status here.</p>
          </div>
        )}

        {activeTab === "testing" && (
          <div className="bg-white border border-dashed border-[#E5E5EA] rounded-lg p-8 text-center">
            <p className="text-sm text-[#7A7A7A] mb-1">Testing</p>
            <p className="text-xs text-[#A0A0A0]">QA checklists, browser testing, and client UAT sign-off.</p>
          </div>
        )}

        {/* Phase form modal */}
        {showPhaseForm && (
          <FormModal
            title="Add Phase"
            onClose={() => setShowPhaseForm(false)}
            onSubmit={handleAddPhase}
            disabled={!phaseName.trim()}
          >
            <div>
              <label className={labelClass}>Phase Name *</label>
              <input
                type="text"
                value={phaseName}
                onChange={(e) => setPhaseName(e.target.value)}
                placeholder="e.g., Design"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Dates</label>
              <input
                type="text"
                value={phaseDates}
                onChange={(e) => setPhaseDates(e.target.value)}
                placeholder="e.g., 10 Mar – 20 Mar"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <input
                type="text"
                value={phaseDescription}
                onChange={(e) => setPhaseDescription(e.target.value)}
                placeholder="What happens in this phase"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Deadline</label>
              <input
                type="date"
                value={phaseDeadline}
                onChange={(e) => setPhaseDeadline(e.target.value)}
                className={inputClass}
              />
            </div>
          </FormModal>
        )}

      </div>
    </div>
  );
}

/* ── Overview Section ── */

function OverviewSection({
  portal,
  onUpdateField,
  onAddPhase,
  onRemovePhase,
  onCyclePhaseStatus,
  onUpdateTouchpoint,
  onAddScope,
  onRemoveScope,
}: {
  portal: PortalData;
  onUpdateField: (field: string, value: string | number | boolean) => void;
  onAddPhase: () => void;
  onRemovePhase: (id: string) => void;
  onCyclePhaseStatus: (id: string) => void;
  onUpdateTouchpoint: (field: "date" | "description", value: string) => void;
  onAddScope: (item: string) => void;
  onRemoveScope: (index: number) => void;
}) {
  const [scopeInput, setScopeInput] = useState("");
  return (
    <div className="space-y-8">
      {/* Next Touchpoint */}
      {(() => {
        const tp = portal.next_touchpoint;
        const inProgress = portal.phases.find((p) => p.status === "in-progress");
        const description = tp?.description || inProgress?.name;
        const date = tp?.date || inProgress?.dates;
        if (!description) return null;
        return (
          <div className="bg-[#1B1B1B] text-white rounded-lg p-4 flex items-center gap-3">
            <div className="size-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <ClockIcon className="size-4 text-white/70" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-white/50 mb-0.5">Next Touchpoint</p>
              <p className="text-sm font-medium truncate">{description}</p>
              {date && <p className="text-[11px] text-white/50 mt-0.5">{date}</p>}
            </div>
          </div>
        );
      })()}

      {/* Project info */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A] mb-3">
          Project Info
        </h3>
        <div className="bg-white border border-[#E5E5EA] shadow-[var(--shadow-soft)] rounded-lg p-4 space-y-3">
          <EditableField
            label="Current Phase"
            value={portal.current_phase}
            onSave={(v) => onUpdateField("current_phase", v)}
          />
          <EditableField
            label="Next Touchpoint"
            value={portal.next_touchpoint?.description || ""}
            onSave={(v) => onUpdateTouchpoint("description", v)}
            placeholder="e.g., Design review call"
          />
          <EditableField
            label="Touchpoint Date"
            value={portal.next_touchpoint?.date || ""}
            onSave={(v) => onUpdateTouchpoint("date", v)}
            type="date"
          />
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-[11px] font-medium text-[#7A7A7A]">Show Results Tab</p>
              <p className="text-[10px] text-[#A0A0A0]">Enable for retainer clients with active testing</p>
            </div>
            <button
              onClick={() => onUpdateField("show_results", !portal.show_results)}
              className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
                portal.show_results ? "bg-emerald-400" : "bg-[#D4D4D4]"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 size-4 bg-white rounded-full shadow transition-transform duration-200 ${
                  portal.show_results ? "translate-x-4" : ""
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Phases */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A]">
            Phases ({portal.phases.length})
          </h3>
          <button
            onClick={onAddPhase}
            className="flex items-center gap-1 text-xs font-medium text-[#7A7A7A] hover:text-[#1B1B1B] transition-colors"
          >
            <PlusIcon className="size-3" />
            Add
          </button>
        </div>
        {portal.phases.length === 0 ? (
          <p className="text-xs text-[#A0A0A0] bg-[#F7F8FA] border border-dashed border-[#E5E5EA] rounded-lg p-4 text-center">
            No phases yet — add your first phase
          </p>
        ) : (
          <div className="border border-[#E5E5EA] shadow-[var(--shadow-soft)] rounded-lg divide-y divide-[#EDEDEF]">
            {portal.phases.map((phase) => (
              <div key={phase.id} className="flex items-center gap-3 p-3">
                <span
                  className={`size-2 rounded-full shrink-0 ${
                    phase.status === "complete"
                      ? "bg-emerald-400"
                      : phase.status === "in-progress"
                      ? "bg-[#1B1B1B]"
                      : "bg-[#D4D4D4]"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{phase.name}</p>
                  {phase.dates && (
                    <p className="text-[11px] text-[#A0A0A0]">{phase.dates}</p>
                  )}
                </div>
                <button
                  onClick={() => onCyclePhaseStatus(phase.id)}
                  className="text-[10px] font-medium uppercase tracking-wider text-[#A0A0A0] hover:text-[#1B1B1B] transition-colors cursor-pointer"
                  title="Click to cycle status"
                >
                  {phase.status}
                </button>
                <button
                  onClick={() => onRemovePhase(phase.id)}
                  className="p-1 text-[#A0A0A0] hover:text-red-400 transition-colors"
                >
                  <TrashIcon className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scope / Deliverables */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A]">
            Scope / Deliverables ({portal.scope?.length || 0})
          </h3>
        </div>
        <div className="border border-[#E5E5EA] shadow-[var(--shadow-soft)] rounded-lg divide-y divide-[#EDEDEF]">
          {(portal.scope || []).map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <p className="text-sm font-medium flex-1 min-w-0 truncate">{item}</p>
              <button
                onClick={() => onRemoveScope(i)}
                className="p-1 text-[#A0A0A0] hover:text-red-400 transition-colors"
              >
                <TrashIcon className="size-3" />
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2 p-3">
            <input
              type="text"
              value={scopeInput}
              onChange={(e) => setScopeInput(e.target.value)}
              placeholder="Add scope item..."
              className="flex-1 px-2 py-1 text-sm border border-[#E5E5EA] rounded"
              onKeyDown={(e) => {
                if (e.key === "Enter" && scopeInput.trim()) {
                  onAddScope(scopeInput);
                  setScopeInput("");
                }
              }}
            />
            <button
              onClick={() => {
                if (scopeInput.trim()) {
                  onAddScope(scopeInput);
                  setScopeInput("");
                }
              }}
              disabled={!scopeInput.trim()}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-[#1B1B1B] text-white rounded hover:bg-[#2D2D2D] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <PlusIcon className="size-3" />
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Updates Section ── */

function UpdatesSection({
  updates,
  showForm,
  onShowForm,
  onHideForm,
  title,
  description,
  loomUrl,
  onTitleChange,
  onDescriptionChange,
  onLoomUrlChange,
  onSubmit,
  saving,
}: {
  updates: PortalUpdate[];
  showForm: boolean;
  onShowForm: () => void;
  onHideForm: () => void;
  title: string;
  description: string;
  loomUrl: string;
  onTitleChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onLoomUrlChange: (v: string) => void;
  onSubmit: () => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A]">
          Video Updates
        </h3>
        <button
          onClick={onShowForm}
          className="flex items-center gap-1 text-xs font-medium text-[#7A7A7A] hover:text-[#1B1B1B] transition-colors"
        >
          <PlusIcon className="size-3.5" />
          Post Update
        </button>
      </div>

      {/* Add update form */}
      {showForm && (
        <div className="bg-[#F7F8FA] border border-[#E5E5EA] shadow-[var(--shadow-soft)] rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Post Video Update</h3>
            <button
              onClick={onHideForm}
              className="text-[#A0A0A0] hover:text-[#1B1B1B]"
            >
              <XMarkIcon className="size-4" />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="e.g., Design progress update"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Loom URL *</label>
              <input
                type="text"
                value={loomUrl}
                onChange={(e) => onLoomUrlChange(e.target.value)}
                placeholder="https://www.loom.com/share/..."
                className={inputClass}
              />
              {loomUrl && !isLoomUrl(loomUrl) && (
                <p className="text-[11px] text-red-400 mt-1">
                  Please paste a valid Loom URL
                </p>
              )}
              {loomUrl && isLoomUrl(loomUrl) && (
                <div className="mt-3 rounded-lg overflow-hidden border border-[#E5E5EA]">
                  <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                    <iframe
                      src={toLoomEmbed(loomUrl) || ""}
                      className="absolute inset-0 w-full h-full"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <textarea
                value={description}
                onChange={(e) => onDescriptionChange(e.target.value)}
                placeholder="Brief summary of what's covered..."
                rows={2}
                className={textareaClass}
              />
            </div>
            <button
              onClick={onSubmit}
              disabled={!title.trim() || !loomUrl.trim() || !isLoomUrl(loomUrl) || saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#1B1B1B] text-white text-xs font-medium rounded-lg hover:bg-[#2D2D2D] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckIcon className="size-3.5" />
              {saving ? "Posting..." : "Post Update"}
            </button>
          </div>
        </div>
      )}

      {/* Updates list */}
      {updates.length === 0 && !showForm ? (
        <div className="bg-white border border-dashed border-[#E5E5EA] rounded-lg p-8 text-center">
          <p className="text-xs text-[#A0A0A0] mb-2">No updates posted yet</p>
          <button
            onClick={onShowForm}
            className="text-xs font-medium text-[#7A7A7A] hover:text-[#1B1B1B] transition-colors"
          >
            + Post your first video update
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {updates.map((update) => (
            <div
              key={update.id}
              className="bg-white border border-[#E5E5EA] shadow-[var(--shadow-soft)] rounded-lg p-4"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <h4 className="text-sm font-semibold">{update.title}</h4>
                  {update.description && (
                    <p className="text-xs text-[#7A7A7A] mt-0.5">
                      {update.description}
                    </p>
                  )}
                </div>
                <p className="text-[10px] text-[#A0A0A0] shrink-0">
                  {new Date(update.created_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}
                </p>
              </div>
              {isLoomUrl(update.loom_url) && (
                <div className="rounded-lg overflow-hidden border border-[#E5E5EA]">
                  <div
                    className="relative w-full"
                    style={{ paddingBottom: "56.25%" }}
                  >
                    <iframe
                      src={toLoomEmbed(update.loom_url) || ""}
                      className="absolute inset-0 w-full h-full"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Wins Section ── */

function WinsSection({
  wins,
  onUpdate,
}: {
  wins: PortalWin[];
  onUpdate: (wins: PortalWin[]) => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [metric, setMetric] = useState("");
  const [before, setBefore] = useState("");
  const [after, setAfter] = useState("");
  const [lift, setLift] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");

  const resetForm = () => {
    setTitle("");
    setMetric("");
    setBefore("");
    setAfter("");
    setLift("");
    setDate("");
    setDescription("");
    setShowForm(false);
  };

  const handleAdd = async () => {
    if (!title.trim()) return;
    const newWin: PortalWin = {
      id: crypto.randomUUID(),
      title: title.trim(),
      metric: metric.trim(),
      before: before.trim(),
      after: after.trim(),
      lift: lift.trim(),
      date: date.trim(),
      description: description.trim(),
    };
    await onUpdate([newWin, ...wins]);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    await onUpdate(wins.filter((w) => w.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A]">
          Wins &amp; Results
        </h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1 text-xs font-medium text-[#7A7A7A] hover:text-[#1B1B1B] transition-colors"
        >
          <PlusIcon className="size-3.5" />
          Add Win
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-[#F7F8FA] border border-[#E5E5EA] shadow-[var(--shadow-soft)] rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Add Win</h3>
            <button onClick={resetForm} className="text-[#A0A0A0] hover:text-[#1B1B1B]">
              <XMarkIcon className="size-4" />
            </button>
          </div>
          <div>
            <label className={labelClass}>Title *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Homepage hero CTA uplift" className={inputClass} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Metric</label>
              <input type="text" value={metric} onChange={(e) => setMetric(e.target.value)} placeholder="e.g. Click-through rate" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Date</label>
              <input type="text" value={date} onChange={(e) => setDate(e.target.value)} placeholder="e.g. 8 Mar" className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Before</label>
              <input type="text" value={before} onChange={(e) => setBefore(e.target.value)} placeholder="e.g. 2.1%" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>After</label>
              <input type="text" value={after} onChange={(e) => setAfter(e.target.value)} placeholder="e.g. 3.9%" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Lift</label>
              <input type="text" value={lift} onChange={(e) => setLift(e.target.value)} placeholder="e.g. +85.7%" className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="What drove this result?" className={textareaClass} />
          </div>
          <button onClick={handleAdd} disabled={!title.trim()} className="flex items-center gap-1.5 px-4 py-2 bg-[#1B1B1B] text-white text-xs font-medium rounded-lg hover:bg-[#2D2D2D] transition-colors disabled:opacity-40">
            <CheckIcon className="size-3.5" />
            Add Win
          </button>
        </div>
      )}

      {/* Win list */}
      {wins.length === 0 && !showForm && (
        <div className="text-center py-12 bg-white border border-dashed border-[#E5E5EA] rounded-lg">
          <p className="text-xs text-[#A0A0A0] mb-2">No wins recorded yet</p>
          <button onClick={() => setShowForm(true)} className="text-xs font-medium text-[#7A7A7A] hover:text-[#1B1B1B]">
            + Record your first win
          </button>
        </div>
      )}

      {wins.map((win) => (
        <div key={win.id} className="bg-white border border-[#E5E5EA] shadow-[var(--shadow-soft)] rounded-lg p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold">{win.title}</h3>
              <p className="text-xs text-[#A0A0A0] mt-0.5">
                {[win.metric, win.date].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {win.lift && (
                <span className="px-2 py-0.5 text-xs font-bold text-emerald-600 bg-emerald-50 rounded-full">
                  {win.lift}
                </span>
              )}
              <button onClick={() => handleDelete(win.id)} className="p-1 text-[#A0A0A0] hover:text-red-400 transition-colors">
                <TrashIcon className="size-3.5" />
              </button>
            </div>
          </div>
          {(win.before || win.after) && (
            <div className="flex items-center gap-2 mt-3 text-xs">
              <span className="text-[#999999]">{win.before}</span>
              <span className="text-[#C5C5C5]">→</span>
              <span className="font-semibold text-emerald-600">{win.after}</span>
            </div>
          )}
          {win.description && (
            <p className="text-xs text-[#999999] mt-2">{win.description}</p>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Approvals Section ── */

/* ── Requests Section ── */

function RequestsSection({
  requests,
  onUpdate,
}: {
  requests: AdHocRequest[];
  onUpdate: (requests: AdHocRequest[]) => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const newRequest: AdHocRequest = {
      id: crypto.randomUUID(),
      title: title.trim(),
      description: description.trim(),
      requested_at: new Date().toISOString(),
      status: "open",
      created_by: "Team",
    };
    await onUpdate([newRequest, ...requests]);
    setTitle("");
    setDescription("");
    setShowForm(false);
    setSaving(false);
  };

  const handleStatusChange = async (id: string, status: AdHocRequest["status"]) => {
    const updated = requests.map(r => r.id === id ? { ...r, status } : r);
    await onUpdate(updated);
  };

  const handleDelete = async (id: string) => {
    await onUpdate(requests.filter(r => r.id !== id));
  };

  const statusColors: Record<string, string> = {
    open: "text-amber-600 bg-amber-50",
    "in-progress": "text-blue-600 bg-blue-50",
    done: "text-emerald-600 bg-emerald-50",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A]">
          Ad-hoc Requests
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 text-xs font-medium text-[#7A7A7A] hover:text-[#1B1B1B] transition-colors"
        >
          <PlusIcon className="size-3" />
          Add Request
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-[#E5E5EA] shadow-[var(--shadow-soft)] rounded-lg p-4 space-y-3">
          <div>
            <label className={labelClass}>Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Add testimonial section to homepage"
              className={inputClass}
              autoFocus
            />
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Any details about the request..."
              className={textareaClass}
              rows={2}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!title.trim() || saving}
              className="px-3 py-1.5 text-xs font-semibold bg-[#1B1B1B] text-white rounded-lg hover:bg-[#2D2D2D] transition-colors disabled:opacity-50"
            >
              {saving ? "Adding..." : "Add"}
            </button>
            <button
              onClick={() => { setShowForm(false); setTitle(""); setDescription(""); }}
              className="px-3 py-1.5 text-xs font-medium text-[#7A7A7A] hover:text-[#1B1B1B] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {requests.length === 0 ? (
        <div className="bg-white border border-dashed border-[#E5E5EA] rounded-lg p-8 text-center">
          <p className="text-xs text-[#A0A0A0]">
            No requests yet — track client ad-hoc requests here
          </p>
        </div>
      ) : (
        <div className="border border-[#E5E5EA] shadow-[var(--shadow-soft)] rounded-lg divide-y divide-[#EDEDEF]">
          {requests.map((req) => (
            <div key={req.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium">{req.title}</p>
                    <select
                      value={req.status}
                      onChange={(e) => handleStatusChange(req.id, e.target.value as AdHocRequest["status"])}
                      className={`text-[10px] font-semibold uppercase tracking-wider rounded-full px-2 py-0.5 border-0 cursor-pointer ${statusColors[req.status]}`}
                    >
                      <option value="open">Open</option>
                      <option value="in-progress">In Progress</option>
                      <option value="done">Done</option>
                    </select>
                  </div>
                  {req.description && (
                    <p className="text-xs text-[#7A7A7A] leading-relaxed mb-1">{req.description}</p>
                  )}
                  <p className="text-[10px] text-[#A0A0A0]">
                    {req.created_by} &middot; {new Date(req.requested_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(req.id)}
                  className="p-1 text-[#A0A0A0] hover:text-red-400 transition-colors shrink-0"
                >
                  <TrashIcon className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ApprovalsSection({
  approvals,
  portal,
}: {
  approvals: PortalApproval[];
  portal: PortalData;
}) {
  if (approvals.length === 0) {
    return (
      <div className="bg-white border border-dashed border-[#E5E5EA] rounded-lg p-8 text-center">
        <p className="text-xs text-[#A0A0A0]">
          No approvals yet — clients approve deliverables from their portal view
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A]">
        Client Approvals
      </h3>
      <div className="border border-[#E5E5EA] shadow-[var(--shadow-soft)] rounded-lg divide-y divide-[#EDEDEF]">
        {approvals.map((approval) => {
          const refName =
            approval.approval_type === "phase"
              ? portal.phases.find((p) => p.id === approval.reference_id)?.name
              : portal.deliverables.find(
                  (d) => d.id === approval.reference_id
                )?.name;
          return (
            <div key={approval.id} className="flex items-center gap-3 p-4">
              <span className="size-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <CheckIcon className="size-3 text-emerald-600" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {refName || approval.reference_id}
                </p>
                <p className="text-[11px] text-[#A0A0A0]">
                  {approval.approval_type === "phase"
                    ? "Phase sign-off"
                    : "Deliverable approved"}
                  {approval.approved_by && ` by ${approval.approved_by}`}
                </p>
                {approval.comment && (
                  <p className="text-xs text-[#7A7A7A] mt-1 italic">
                    &ldquo;{approval.comment}&rdquo;
                  </p>
                )}
              </div>
              <p className="text-[10px] text-[#A0A0A0] shrink-0">
                {new Date(approval.approved_at).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Designs Section ── */

function DesignsSection({
  portal,
  reviews,
  onReviewsChange,
}: {
  portal: PortalData;
  reviews: DesignReview[];
  onReviewsChange: (reviews: DesignReview[]) => void;
}) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [figmaUrl, setFigmaUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Expanded review state for adding versions / viewing feedback
  const [expandedReview, setExpandedReview] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [versions, setVersions] = useState<DesignReviewVersion[]>([]);
  const [feedbackList, setFeedbackList] = useState<DesignReviewFeedback[]>([]);
  const [newVersionUrl, setNewVersionUrl] = useState("");
  const [newVersionNotes, setNewVersionNotes] = useState("");
  const [addingVersion, setAddingVersion] = useState(false);

  const handleCreate = async () => {
    if (!title.trim() || !figmaUrl.trim()) return;
    setSaving(true);
    try {
      const review = await createReview({
        portal_id: portal.id,
        title: title.trim(),
        description: description.trim(),
      });
      await addVersion({
        review_id: review.id,
        version_number: 1,
        figma_url: figmaUrl.trim(),
        notes: "",
      });
      onReviewsChange([review, ...reviews]);
      setTitle("");
      setDescription("");
      setFigmaUrl("");
      setShowCreateForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteReview(id);
    onReviewsChange(reviews.filter((r) => r.id !== id));
    if (expandedReview === id) setExpandedReview(null);
  };

  const loadReview = useCallback(async (reviewId: string) => {
    if (expandedReview === reviewId) return;
    setExpandedReview(reviewId);
    setSelectedVersionId(null);
    const [v, f] = await Promise.all([
      getVersions(reviewId),
      getFeedback(reviewId),
    ]);
    setVersions(v);
    setFeedbackList(f);
    if (v.length > 0) {
      const sorted = [...v].sort((a, b) => b.version_number - a.version_number);
      setSelectedVersionId(sorted[0].id);
    }
  }, [expandedReview]);

  // Auto-load first review
  useEffect(() => {
    if (reviews.length > 0 && !expandedReview) {
      loadReview(reviews[0].id);
    }
  }, [reviews.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep toggleExpand as alias for the selector buttons
  const toggleExpand = loadReview;

  const handleAddVersion = async (reviewId: string) => {
    if (!newVersionUrl.trim()) return;
    setAddingVersion(true);
    try {
      const nextNum = versions.length + 1;
      const v = await addVersion({
        review_id: reviewId,
        version_number: nextNum,
        figma_url: newVersionUrl.trim(),
        notes: newVersionNotes.trim(),
      });
      setVersions([...versions, v]);
      setSelectedVersionId(v.id);
      setNewVersionUrl("");
      setNewVersionNotes("");
    } finally {
      setAddingVersion(false);
    }
  };

  const copyReviewLink = (reviewId: string) => {
    const url = `${window.location.origin}/portal/${portal.token}/review/${reviewId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(reviewId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-emerald-500";
      case "changes_requested": return "bg-amber-500";
      default: return "bg-blue-500";
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "approved": return "Approved";
      case "changes_requested": return "Amends";
      default: return "Pending";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A]">
          Design Reviews
        </h3>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-1 text-xs font-medium text-[#7A7A7A] hover:text-[#1B1B1B] transition-colors"
        >
          <PlusIcon className="size-3.5" />
          New Review
        </button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="bg-[#F7F8FA] border border-[#E5E5EA] shadow-[var(--shadow-soft)] rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Create Design Review</h3>
            <button
              onClick={() => setShowCreateForm(false)}
              className="text-[#A0A0A0] hover:text-[#1B1B1B]"
            >
              <XMarkIcon className="size-4" />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Page Name *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Homepage, Collection Page, PDP"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Figma URL *</label>
              <input
                type="text"
                value={figmaUrl}
                onChange={(e) => setFigmaUrl(e.target.value)}
                placeholder="https://www.figma.com/design/..."
                className={inputClass}
              />
              {figmaUrl && !isFigmaUrl(figmaUrl) && (
                <p className="text-[11px] text-red-400 mt-1">
                  Please paste a valid Figma URL
                </p>
              )}
            </div>
            <button
              onClick={handleCreate}
              disabled={!title.trim() || !figmaUrl.trim() || !isFigmaUrl(figmaUrl) || saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#1B1B1B] text-white text-xs font-medium rounded-lg hover:bg-[#2D2D2D] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckIcon className="size-3.5" />
              {saving ? "Creating..." : "Add Design"}
            </button>
          </div>
        </div>
      )}

      {/* Reviews */}
      {reviews.length === 0 && !showCreateForm ? (
        <div className="bg-white border border-dashed border-[#E5E5EA] rounded-lg p-8 text-center">
          <p className="text-xs text-[#A0A0A0] mb-2">No designs yet</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="text-xs font-medium text-[#7A7A7A] hover:text-[#1B1B1B] transition-colors"
          >
            + Add your first design
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Design selector tabs — horizontal pills when multiple */}
          {reviews.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              {reviews.map((review) => (
                <button
                  key={review.id}
                  onClick={() => toggleExpand(review.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                    expandedReview === review.id
                      ? "bg-[#1B1B1B] text-white border-[#1B1B1B]"
                      : "bg-white text-[#7A7A7A] border-[#E5E5EA] hover:border-[#1B1B1B] hover:text-[#1B1B1B]"
                  }`}
                >
                  {review.title}
                </button>
              ))}
            </div>
          )}

          {/* Active design — split panel view */}
          {(() => {
            const activeReviewId = expandedReview || reviews[0]?.id;
            const review = reviews.find(r => r.id === activeReviewId);
            if (!review) return null;

            const sorted = [...versions].sort((a, b) => b.version_number - a.version_number);
            const activeVersion = sorted.find(v => v.id === selectedVersionId) || sorted[0];

            return (
              <div className="bg-white border border-[#E5E5EA] shadow-[var(--shadow-soft)] rounded-lg overflow-hidden">
                {/* Review header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-[#EDEDEF]">
                  <h4 className="text-sm font-semibold flex-1 min-w-0 truncate">{review.title}</h4>
                  <span className={`px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider rounded-full shrink-0 ${
                    review.status === "approved" ? "bg-emerald-50 text-emerald-600" :
                    review.status === "changes_requested" ? "bg-amber-50 text-amber-600" :
                    "bg-[#EDEDEF] text-[#999]"
                  }`}>
                    {review.status === "approved" ? "Approved" : review.status === "changes_requested" ? "Amends Needed" : "Pending"}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => copyReviewLink(review.id)}
                      className="flex items-center gap-1 text-[10px] font-medium text-[#A0A0A0] hover:text-[#1B1B1B] transition-colors"
                    >
                      <ClipboardDocumentIcon className="size-3" />
                      {copiedId === review.id ? "Copied!" : "Link"}
                    </button>
                    <a
                      href={`/portal/${portal.token}/review/${review.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] font-medium text-[#A0A0A0] hover:text-[#1B1B1B] transition-colors"
                    >
                      <ArrowTopRightOnSquareIcon className="size-3" />
                    </a>
                    <button
                      onClick={() => handleDelete(review.id)}
                      className="p-0.5 text-[#A0A0A0] hover:text-red-400 transition-colors"
                    >
                      <TrashIcon className="size-3" />
                    </button>
                  </div>
                </div>

                {/* Split panel: vertical version tabs + preview */}
                <div className="flex min-h-[420px]">
                  {/* Left: vertical version tabs */}
                  <div className="w-44 shrink-0 border-r border-[#EDEDEF] bg-[#F7F8FA] flex flex-col">
                    {sorted.map((v, i) => {
                      const isCurrent = i === 0;
                      const isSelected = v.id === selectedVersionId || (!selectedVersionId && i === 0);
                      // Check feedback status for this version
                      const vFeedback = feedbackList.filter(f => f.version_id === v.id);
                      const lastAction = vFeedback.length > 0 ? vFeedback[vFeedback.length - 1].action : null;
                      return (
                        <button
                          key={v.id}
                          onClick={() => setSelectedVersionId(v.id)}
                          className={`text-left px-3 py-2.5 border-b border-[#EDEDEF] transition-colors ${
                            isSelected
                              ? "bg-white"
                              : "hover:bg-[#F3F3F5]"
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                              isCurrent ? "bg-[#1B1B1B] text-white" : "bg-[#E5E5EA] text-[#999]"
                            }`}>
                              v{v.version_number}
                            </span>
                            {isCurrent && (
                              <span className="text-[9px] font-semibold text-emerald-600 uppercase tracking-wider">Current</span>
                            )}
                          </div>
                          <p className="text-[10px] text-[#A0A0A0] mt-1">
                            {new Date(v.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </p>
                          {lastAction && (
                            <span className={`inline-block mt-1 px-1.5 py-0.5 text-[9px] font-semibold rounded ${
                              lastAction === "approved"
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-amber-50 text-amber-600"
                            }`}>
                              {lastAction === "approved" ? "Approved" : "Amends Needed"}
                            </span>
                          )}
                        </button>
                      );
                    })}

                    {/* Add version button */}
                    <button
                      onClick={() => setSelectedVersionId("__new__")}
                      className={`text-left px-3 py-2.5 transition-colors mt-auto border-t border-[#EDEDEF] ${
                        selectedVersionId === "__new__" ? "bg-white" : "hover:bg-[#F3F3F5]"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <PlusIcon className="size-3 text-[#A0A0A0]" />
                        <span className="text-[11px] font-medium text-[#7A7A7A]">New Version</span>
                      </div>
                    </button>
                  </div>

                  {/* Right: preview / details */}
                  <div className="flex-1 min-w-0 p-4">
                    {selectedVersionId === "__new__" ? (
                      <div className="space-y-3">
                        <h5 className="text-xs font-semibold text-[#7A7A7A]">Upload New Version</h5>
                        <input
                          type="text"
                          value={newVersionUrl}
                          onChange={(e) => setNewVersionUrl(e.target.value)}
                          placeholder="Paste Figma URL..."
                          className={inputClass}
                        />
                        <button
                          onClick={() => handleAddVersion(review.id)}
                          disabled={!newVersionUrl.trim() || !isFigmaUrl(newVersionUrl) || addingVersion}
                          className="px-4 py-2 bg-[#1B1B1B] text-white text-xs font-medium rounded-lg hover:bg-[#2D2D2D] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {addingVersion ? "Uploading..." : `Upload v${versions.length + 1}`}
                        </button>
                      </div>
                    ) : activeVersion ? (
                      <div className="space-y-3 h-full flex flex-col">
                        {/* Version info */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                              activeVersion.id === sorted[0]?.id ? "bg-[#1B1B1B] text-white" : "bg-[#E5E5EA] text-[#999]"
                            }`}>
                              v{activeVersion.version_number}
                            </span>
                            <span className="text-xs text-[#A0A0A0]">
                              {new Date(activeVersion.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          </div>
                          <a
                            href={activeVersion.figma_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[11px] font-medium text-[#1B1B1B] hover:text-[#333] transition-colors"
                          >
                            Open Figma
                            <ArrowTopRightOnSquareIcon className="size-3" />
                          </a>
                        </div>

                        {/* Figma embed */}
                        {toFigmaEmbed(activeVersion.figma_url) && (
                          <div className="relative w-full rounded-lg overflow-hidden border border-[#E5E5EA] flex-1 min-h-[340px]">
                            <iframe
                              src={toFigmaEmbed(activeVersion.figma_url) || ""}
                              className="absolute inset-0 w-full h-full"
                              allowFullScreen
                            />
                          </div>
                        )}

                        {/* Feedback for this version */}
                        {(() => {
                          const vFeedback = feedbackList.filter(f => f.version_id === activeVersion.id);
                          if (vFeedback.length === 0) return null;
                          return (
                            <div className="space-y-1.5 pt-2">
                              {vFeedback.map((entry) => {
                                const isApproval = entry.action === "approved";
                                return (
                                  <div key={entry.id} className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-md ${isApproval ? "bg-emerald-50" : "bg-amber-50"}`}>
                                    <span className={`size-1.5 rounded-full shrink-0 ${isApproval ? "bg-emerald-500" : "bg-amber-500"}`} />
                                    <span className="font-medium">{entry.submitted_by}</span>
                                    <span className="text-[#7A7A7A]">{isApproval ? "approved" : "requested changes"}</span>
                                    {entry.comment && <span className="text-[#999] truncate">&mdash; {entry.comment}</span>}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-xs text-[#A0A0A0]">
                        No versions yet — add one to get started
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

/* ── Inline editable field ── */

function EditableField({
  label,
  value,
  onSave,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs font-medium text-[#7A7A7A]">{label}</span>
      {editing ? (
        <div className="flex items-center gap-1.5">
          <input
            type={type}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            className="px-2 py-1 text-sm border border-[#E5E5EA] rounded w-40"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSave(draft);
                setEditing(false);
              }
              if (e.key === "Escape") setEditing(false);
            }}
          />
          <button
            onClick={() => {
              onSave(draft);
              setEditing(false);
            }}
            className="p-1 text-emerald-500 hover:text-emerald-600"
          >
            <CheckIcon className="size-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => {
            setDraft(value);
            setEditing(true);
          }}
          className="text-sm text-[#1B1B1B] hover:underline"
        >
          {value || "—"}
        </button>
      )}
    </div>
  );
}

/* ── Form modal ── */

function FormModal({
  title,
  onClose,
  onSubmit,
  disabled,
  children,
}: {
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-lg shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 text-[#A0A0A0] hover:text-[#1B1B1B]"
          >
            <XMarkIcon className="size-5" />
          </button>
        </div>
        <div className="space-y-4">
          {children}
          <button
            onClick={onSubmit}
            disabled={disabled}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#1B1B1B] text-white text-xs font-medium rounded-lg hover:bg-[#2D2D2D] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CheckIcon className="size-3.5" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
