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
  PortalBlocker,
  PortalTestResult,
  MetricSnapshot,
  TestingTier,
  AdHocRequest,
  ScopeItem,
} from "@/lib/portal/types";
import { deliverableTypes } from "@/lib/config";
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
      return {
        ...p,
        status: nextStatus,
        completedDate: nextStatus === "complete" ? new Date().toISOString().slice(0, 10) : undefined,
      };
    });
    // Auto-sync current_phase to the in-progress phase
    const inProgress = updatedPhases.find((p) => p.status === "in-progress");
    const currentPhase = inProgress?.name || updatedPhases.filter((p) => p.status === "complete").pop()?.name || portal.current_phase;
    // Optimistic update
    setPortal({ ...portal, phases: updatedPhases, current_phase: currentPhase });
    await updatePortal(portal.id, { phases: updatedPhases, current_phase: currentPhase });
  };

  const handleUpdateTouchpoint = async (field: "date" | "description", value: string) => {
    if (!portal) return;
    const updated = { ...portal.next_touchpoint, [field]: value };
    setPortal({ ...portal, next_touchpoint: updated });
    await updatePortal(portal.id, { next_touchpoint: updated });
  };

  const handleAddScope = async (item: string, type?: string) => {
    if (!portal || !item.trim()) return;
    const newItem = type ? { description: item.trim(), type } : item.trim();
    const updatedScope = [...portal.scope, newItem];
    setPortal({ ...portal, scope: updatedScope });
    await updatePortal(portal.id, { scope: updatedScope });
  };

  const handleRemoveScope = async (index: number) => {
    if (!portal) return;
    const updatedScope = portal.scope.filter((_, i) => i !== index);
    setPortal({ ...portal, scope: updatedScope });
    await updatePortal(portal.id, { scope: updatedScope });
  };

  const handleUpdateDocUrl = async (index: number, url: string) => {
    if (!portal) return;
    const updatedDocs = portal.documents.map((d, i) => i === index ? { ...d, url } : d);
    setPortal({ ...portal, documents: updatedDocs });
    await updatePortal(portal.id, { documents: updatedDocs });
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
            onSetBlocker={async (blocker) => {
              await updatePortal(portal.id, { blocker } as Partial<PortalData>);
              setPortal({ ...portal, blocker } as PortalData);
            }}
            onAddPhase={() => setShowPhaseForm(true)}
            onRemovePhase={handleRemovePhase}
            onCyclePhaseStatus={handleCyclePhaseStatus}
            onUpdateTouchpoint={handleUpdateTouchpoint}
            onAddScope={handleAddScope}
            onRemoveScope={handleRemoveScope}
            onUpdateDocUrl={handleUpdateDocUrl}
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

        {activeTab === "testing" && portal && (
          <TestingSection
            portal={portal}
            onUpdateResults={async (results) => {
              await updatePortal(portal.id, { results } as Partial<PortalData>);
              setPortal({ ...portal, results } as PortalData);
            }}
            onUpdateField={handleUpdateField}
          />
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
  onSetBlocker,
  onAddPhase,
  onRemovePhase,
  onCyclePhaseStatus,
  onUpdateTouchpoint,
  onAddScope,
  onRemoveScope,
  onUpdateDocUrl,
}: {
  portal: PortalData;
  onUpdateField: (field: string, value: string | number | boolean) => void;
  onSetBlocker: (blocker: PortalBlocker | null) => void;
  onAddPhase: () => void;
  onRemovePhase: (id: string) => void;
  onCyclePhaseStatus: (id: string) => void;
  onUpdateTouchpoint: (field: "date" | "description", value: string) => void;
  onAddScope: (item: string, type?: string) => void;
  onRemoveScope: (index: number) => void;
  onUpdateDocUrl: (index: number, url: string) => void;
}) {
  const [scopeInput, setScopeInput] = useState("");
  const [scopeType, setScopeType] = useState("");
  const [showBlockerForm, setShowBlockerForm] = useState(false);
  const [blockerType, setBlockerType] = useState<"client" | "internal" | "external">("client");
  const [blockerReason, setBlockerReason] = useState("");

  const blocker = portal.blocker;
  const daysBlocked = blocker?.since
    ? Math.max(0, Math.floor((Date.now() - new Date(blocker.since).getTime()) / 86400000))
    : 0;

  return (
    <div className="space-y-8">
      {/* Blocker banner */}
      {blocker && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-red-500 animate-pulse shrink-0" />
              <span className="text-xs font-semibold text-red-600 uppercase tracking-wider">
                Blocked — {blocker.type === "client" ? "Client" : blocker.type === "internal" ? "Internal" : "External"}
              </span>
              <span className="text-[10px] font-medium text-red-500 bg-red-100 px-2 py-0.5 rounded-full">
                Since {new Date(blocker.since).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                {daysBlocked > 0 && ` (${daysBlocked}d)`}
              </span>
            </div>
            <button
              onClick={() => onSetBlocker(null)}
              className="text-[11px] font-medium text-red-400 hover:text-red-600 transition-colors"
            >
              Clear
            </button>
          </div>
          <p className="text-sm text-red-600 mt-1.5">{blocker.reason}</p>
        </div>
      )}

      {/* Flag blocker button */}
      {!blocker && !showBlockerForm && (
        <button
          onClick={() => setShowBlockerForm(true)}
          className="flex items-center gap-1.5 text-[11px] font-medium text-[#A0A0A0] hover:text-red-500 transition-colors"
        >
          <svg className="size-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M3.5 2.75a.75.75 0 00-1.5 0v14.5a.75.75 0 001.5 0v-4.392l1.657-.348a6.449 6.449 0 014.271.572 7.948 7.948 0 005.965.524l2.078-.64A.75.75 0 0018 11.75V3.885a.75.75 0 00-.962-.72l-2.367.728a6.449 6.449 0 01-4.846-.425 7.948 7.948 0 00-5.262-.703L3.5 2.98V2.75z" />
          </svg>
          Flag as blocked
        </button>
      )}

      {/* Blocker form */}
      {!blocker && showBlockerForm && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-red-600">Flag Blocker</p>
            <button onClick={() => setShowBlockerForm(false)} className="text-red-300 hover:text-red-500">
              <XMarkIcon className="size-4" />
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            {(["client", "internal", "external"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setBlockerType(t)}
                className={`px-3 py-1 text-[11px] font-medium rounded-full transition-colors ${
                  blockerType === t
                    ? "bg-red-500 text-white"
                    : "bg-white text-red-400 border border-red-200 hover:bg-red-100"
                }`}
              >
                {t === "client" ? "Client" : t === "internal" ? "Internal" : "External"}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={blockerReason}
            onChange={(e) => setBlockerReason(e.target.value)}
            placeholder="e.g., Waiting on brand assets from client"
            className="w-full px-3 py-2 text-sm border border-red-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-red-300"
            autoFocus
          />
          <button
            onClick={() => {
              if (!blockerReason.trim()) return;
              onSetBlocker({ type: blockerType, reason: blockerReason.trim(), since: new Date().toISOString() });
              setShowBlockerForm(false);
              setBlockerReason("");
            }}
            disabled={!blockerReason.trim()}
            className="px-4 py-2 text-xs font-semibold bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-40"
          >
            Flag Blocker
          </button>
        </div>
      )}

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
          <div className="flex items-center justify-between py-1">
            <p className="text-[11px] font-medium text-[#7A7A7A]">Current Phase</p>
            <select
              value={portal.current_phase}
              onChange={(e) => onUpdateField("current_phase", e.target.value)}
              className="text-sm text-right bg-transparent border border-[#E5E5EA] rounded px-2 py-1 text-[#1B1B1B] focus:outline-none focus:ring-1 focus:ring-[#1B1B1B]"
            >
              {portal.phases.length === 0 && (
                <option value={portal.current_phase}>{portal.current_phase}</option>
              )}
              {portal.phases.map((p) => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>
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
                  <p className="text-[11px] text-[#A0A0A0]">
                    {phase.dates}
                    {phase.status === "complete" && phase.completedDate && phase.deadline && new Date(phase.completedDate) < new Date(phase.deadline) && (
                      <span className="ml-1.5 text-green-600 font-medium">
                        &middot; Completed early ({new Date(phase.completedDate + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })})
                      </span>
                    )}
                    {phase.status === "complete" && phase.completedDate && (!phase.deadline || new Date(phase.completedDate) >= new Date(phase.deadline)) && (
                      <span className="ml-1.5 text-[#999]">
                        &middot; Completed {new Date(phase.completedDate + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </span>
                    )}
                  </p>
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
          {(portal.scope || []).map((item, i) => {
            const desc = typeof item === "string" ? item : item.description;
            const typ = typeof item === "string" ? "" : item.type;
            return (
              <div key={i} className="flex items-center gap-3 p-3">
                <p className="text-sm font-medium flex-1 min-w-0 truncate">{desc}</p>
                {typ && (
                  <span className="shrink-0 px-2 py-0.5 text-[10px] font-medium text-[#777] bg-[#F0F0F0] rounded-full">{typ}</span>
                )}
                <button
                  onClick={() => onRemoveScope(i)}
                  className="p-1 text-[#A0A0A0] hover:text-red-400 transition-colors"
                >
                  <TrashIcon className="size-3" />
                </button>
              </div>
            );
          })}
          <div className="flex items-center gap-2 p-3">
            <input
              type="text"
              value={scopeInput}
              onChange={(e) => setScopeInput(e.target.value)}
              placeholder="Add scope item..."
              className="flex-1 px-2 py-1 text-sm border border-[#E5E5EA] rounded"
              onKeyDown={(e) => {
                if (e.key === "Enter" && scopeInput.trim()) {
                  onAddScope(scopeInput, scopeType || undefined);
                  setScopeInput("");
                  setScopeType("");
                }
              }}
            />
            <select
              value={scopeType}
              onChange={(e) => setScopeType(e.target.value)}
              className="px-2 py-1 text-sm border border-[#E5E5EA] rounded text-[#777]"
            >
              <option value="">Type</option>
              {deliverableTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <button
              onClick={() => {
                if (scopeInput.trim()) {
                  onAddScope(scopeInput, scopeType || undefined);
                  setScopeInput("");
                  setScopeType("");
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

      {/* Documents */}
      {(portal.documents || []).length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A] mb-3">
            Documents ({portal.documents.length})
          </h3>
          <div className="border border-[#E5E5EA] shadow-[var(--shadow-soft)] rounded-lg divide-y divide-[#EDEDEF]">
            {portal.documents.map((doc, i) => (
              <div key={i} className="p-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium flex-1 min-w-0 truncate">{doc.name}</p>
                  <span className="shrink-0 px-2 py-0.5 text-[10px] font-medium text-[#777] bg-[#F0F0F0] rounded-full">{doc.type}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="Paste document URL..."
                    defaultValue={doc.url || ""}
                    onBlur={(e) => {
                      const val = e.target.value.trim();
                      if (val !== (doc.url || "")) onUpdateDocUrl(i, val);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    }}
                    className="flex-1 px-2 py-1 text-xs border border-[#E5E5EA] rounded text-[#777] placeholder:text-[#CCC]"
                  />
                  {doc.url && (
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-medium text-[#777] hover:text-[#1B1B1B] transition-colors">
                      Open
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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

/* ── Testing Section ── */

function TestingSection({
  portal,
  onUpdateResults,
  onUpdateField,
}: {
  portal: PortalData;
  onUpdateResults: (results: PortalTestResult[]) => Promise<void>;
  onUpdateField: (field: string, value: string | number | boolean) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [metric, setMetric] = useState("");
  const [status, setStatus] = useState<"scheduled" | "live" | "complete">("scheduled");
  const [result, setResult] = useState<"winner" | "loser" | "inconclusive">("winner");
  const [cvrA, setCvrA] = useState("");
  const [cvrB, setCvrB] = useState("");
  const [aovA, setAovA] = useState("");
  const [aovB, setAovB] = useState("");
  const [rpvA, setRpvA] = useState("");
  const [rpvB, setRpvB] = useState("");
  const [figmaUrl, setFigmaUrl] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [week, setWeek] = useState("");
  const tests = portal.results || [];
  const tierCount: Record<string, number> = { T1: 1, T2: 2, T3: 4 };
  const slotsPerWeek = tierCount[portal.testing_tier || ""] || 0;

  // Group tests by week, most recent first
  const weekGroups = tests.reduce<Record<string, PortalTestResult[]>>((acc, test) => {
    const w = test.week || "Unassigned";
    if (!acc[w]) acc[w] = [];
    acc[w].push(test);
    return acc;
  }, {});

  // Add current week if tier is set and it doesn't exist yet
  if (slotsPerWeek > 0) {
    const now = new Date();
    const weekNum = Math.ceil((Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000) + new Date(now.getFullYear(), 0, 1).getDay() + 1) / 7);
    const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const currentWeekLabel = `W${weekNum} — ${mon.getDate()} ${mon.toLocaleString("en-GB", { month: "short" })}`;
    if (!weekGroups[currentWeekLabel]) weekGroups[currentWeekLabel] = [];
  }

  const sortedWeeks = Object.keys(weekGroups).sort((a, b) => {
    if (a === "Unassigned") return 1;
    if (b === "Unassigned") return -1;
    const numA = parseInt(a.replace(/\D/g, "")) || 0;
    const numB = parseInt(b.replace(/\D/g, "")) || 0;
    return numB - numA; // W12 before W11 etc
  });

  const resetForm = () => {
    setName(""); setMetric(""); setStatus("scheduled"); setResult("winner");
    setCvrA(""); setCvrB(""); setAovA(""); setAovB("");
    setRpvA(""); setRpvB(""); setWeek("");
    setFigmaUrl(""); setStartDate(""); setEndDate("");
    setEditId(null); setShowForm(false);
  };

  const handleEdit = (test: PortalTestResult) => {
    setEditId(test.id);
    setName(test.name);
    setMetric(test.metric);
    setStatus(test.status);
    setResult(test.result || "winner");
    setCvrA(test.cvr?.a || ""); setCvrB(test.cvr?.b || "");
    setAovA(test.aov?.a || ""); setAovB(test.aov?.b || "");
    setRpvA(test.rpv?.a || ""); setRpvB(test.rpv?.b || "");
    setWeek(test.week || "");
    setFigmaUrl(test.figma_url || "");
    setStartDate(test.startDate);
    setEndDate(test.endDate || "");
    setShowForm(true);
  };

  const buildSnapshot = (a: string, b: string): MetricSnapshot | undefined => {
    if (!a.trim() && !b.trim()) return undefined;
    return { a: a.trim() || undefined, b: b.trim() || undefined };
  };

  const handleSave = async () => {
    if (!name.trim() || !metric.trim() || !week.trim()) return;
    const test: PortalTestResult = {
      id: editId || crypto.randomUUID(),
      name: name.trim(),
      metric: metric.trim(),
      status,
      ...(status === "complete" ? { result } : {}),
      cvr: buildSnapshot(cvrA, cvrB),
      aov: buildSnapshot(aovA, aovB),
      rpv: buildSnapshot(rpvA, rpvB),
      figma_url: figmaUrl.trim() || undefined,
      week: week.trim(),
      startDate: startDate.trim(),
      endDate: endDate.trim() || undefined,
    };
    const updated = editId
      ? tests.map((t) => (t.id === editId ? test : t))
      : [...tests, test];
    await onUpdateResults(updated);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    await onUpdateResults(tests.filter((t) => t.id !== id));
  };

  const tierLabels: Record<string, string> = { T1: "1 test/week", T2: "2 tests/week", T3: "4 tests/week" };

  // Calculate % change between two metric strings (e.g. "2.1%" and "2.8%", or "$84" and "$86")
  const calcLift = (a?: string, b?: string): { value: string; positive: boolean } | null => {
    if (!a || !b) return null;
    const numA = parseFloat(a.replace(/[^0-9.\-]/g, ""));
    const numB = parseFloat(b.replace(/[^0-9.\-]/g, ""));
    if (isNaN(numA) || isNaN(numB) || numA === 0) return null;
    const pct = ((numB - numA) / numA) * 100;
    return { value: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`, positive: pct >= 0 };
  };

  return (
    <div className="space-y-6">
      {/* Testing Tier */}
      <div className="bg-white border border-[#E5E5EA] rounded-lg p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A] mb-3">Testing Tier</p>
        <div className="flex items-center gap-1.5">
          {(["T1", "T2", "T3"] as const).map((tier) => (
            <button
              key={tier}
              onClick={() => onUpdateField("testing_tier", portal.testing_tier === tier ? "" : tier)}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
                portal.testing_tier === tier
                  ? "bg-[#1B1B1B] text-white"
                  : "bg-[#F3F3F5] text-[#7A7A7A] hover:bg-[#E5E5EA]"
              }`}
            >
              {tier} <span className="text-[10px] opacity-60 ml-1">{tierLabels[tier]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Add Test */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A]">
          Tests ({tests.length})
        </h3>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-[#7A7A7A] hover:text-[#1B1B1B] transition-colors"
        >
          <PlusIcon className="size-3.5" /> Add Test
        </button>
      </div>

      {/* Test Form */}
      {showForm && (
        <div className="bg-[#F7F8FA] border border-[#E5E5EA] rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{editId ? "Edit Test" : "Add Test"}</h3>
            <button onClick={resetForm} className="text-[#A0A0A0] hover:text-[#1B1B1B]">
              <XMarkIcon className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Test Name *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Homepage hero CTA test" className={inputClass} autoFocus />
            </div>
            <div>
              <label className={labelClass}>Metric *</label>
              <input type="text" value={metric} onChange={(e) => setMetric(e.target.value)} placeholder="e.g., Conversion rate" className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <div className="flex items-center gap-1.5 mt-1">
              {(["scheduled", "live", "complete"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`px-3 py-1.5 text-[11px] font-medium rounded-lg transition-colors ${
                    status === s ? "bg-[#1B1B1B] text-white" : "bg-white text-[#7A7A7A] border border-[#E5E5EA] hover:bg-[#F3F3F5]"
                  }`}
                >
                  {s === "scheduled" ? "Scheduled" : s === "live" ? "Live" : "Complete"}
                </button>
              ))}
            </div>
          </div>
          {status === "complete" && (
            <div>
              <label className={labelClass}>Result</label>
              <div className="flex items-center gap-1.5 mt-1">
                {(["winner", "loser", "inconclusive"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setResult(r)}
                    className={`px-3 py-1.5 text-[11px] font-medium rounded-lg transition-colors ${
                      result === r
                        ? r === "winner" ? "bg-emerald-500 text-white" : r === "loser" ? "bg-red-500 text-white" : "bg-amber-500 text-white"
                        : "bg-white text-[#7A7A7A] border border-[#E5E5EA] hover:bg-[#F3F3F5]"
                    }`}
                  >
                    {r === "winner" ? "Winner" : r === "loser" ? "Loser" : "Inconclusive"}
                  </button>
                ))}
              </div>
            </div>
          )}
          {status !== "scheduled" && (
            <div>
              <label className={labelClass}>Metrics Snapshot</label>
              <div className="grid grid-cols-3 gap-3 mt-1">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-[#999] uppercase tracking-wider">CVR</p>
                  <input type="text" value={cvrA} onChange={(e) => setCvrA(e.target.value)} placeholder="Var A" className={inputClass} />
                  <input type="text" value={cvrB} onChange={(e) => setCvrB(e.target.value)} placeholder="Var B" className={inputClass} />
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-[#999] uppercase tracking-wider">AOV</p>
                  <input type="text" value={aovA} onChange={(e) => setAovA(e.target.value)} placeholder="Var A" className={inputClass} />
                  <input type="text" value={aovB} onChange={(e) => setAovB(e.target.value)} placeholder="Var B" className={inputClass} />
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-[#999] uppercase tracking-wider">RPV</p>
                  <input type="text" value={rpvA} onChange={(e) => setRpvA(e.target.value)} placeholder="Var A" className={inputClass} />
                  <input type="text" value={rpvB} onChange={(e) => setRpvB(e.target.value)} placeholder="Var B" className={inputClass} />
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className={labelClass}>Week *</label>
              <input type="text" value={week} onChange={(e) => setWeek(e.target.value)} placeholder="e.g., W12 — 17 Mar" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Start Date</label>
              <input type="text" value={startDate} onChange={(e) => setStartDate(e.target.value)} placeholder="e.g., 5 Mar" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>End Date</label>
              <input type="text" value={endDate} onChange={(e) => setEndDate(e.target.value)} placeholder="e.g., 12 Mar" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Figma URL</label>
              <input type="text" value={figmaUrl} onChange={(e) => setFigmaUrl(e.target.value)} placeholder="https://figma.com/..." className={inputClass} />
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={!name.trim() || !metric.trim() || !week.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#1B1B1B] text-white text-xs font-medium rounded-lg hover:bg-[#2D2D2D] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CheckIcon className="size-3.5" />
            {editId ? "Update Test" : "Add Test"}
          </button>
        </div>
      )}

      {/* Tests grouped by week */}
      {sortedWeeks.map((weekLabel) => (
        <div key={weekLabel}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#7A7A7A] mb-3">{weekLabel}</p>
          <div className="space-y-2">
            {weekGroups[weekLabel].map((test) => {
              const statusStyles = {
                live: "bg-emerald-50 text-emerald-600 border-emerald-200",
                scheduled: "bg-[#F3F3F5] text-[#7A7A7A] border-[#E5E5EA]",
                complete: "bg-[#F3F3F5] text-[#1B1B1B] border-[#E5E5EA]",
              };
              const nextStatus = { scheduled: "live" as const, live: "complete" as const, complete: "scheduled" as const };
              const handleStatusCycle = async () => {
                const newStatus = nextStatus[test.status];
                const updated = tests.map((t) => t.id === test.id ? { ...t, status: newStatus, ...(newStatus !== "complete" ? { result: undefined } : {}) } : t);
                await onUpdateResults(updated);
              };
              const hasMetrics = test.cvr || test.aov || test.rpv;
              return (
                <div key={test.id} className="bg-white border border-[#E5E5EA] rounded-lg group/card overflow-hidden">
                  {/* Header row */}
                  <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="text-[13px] font-semibold text-[#1B1B1B] truncate">{test.name}</p>
                      {test.status === "complete" && test.result && (
                        <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full shrink-0 ${
                          test.result === "winner" ? "bg-emerald-50 text-emerald-600" :
                          test.result === "loser" ? "bg-red-50 text-red-500" :
                          "bg-amber-50 text-amber-600"
                        }`}>
                          {test.result}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={handleStatusCycle}
                        className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-full border transition-colors ${statusStyles[test.status]}`}
                        title="Click to cycle status"
                      >
                        {test.status === "live" && <span className="inline-block size-1.5 rounded-full bg-emerald-500 mr-1 align-middle" />}
                        {test.status}
                      </button>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(test)} className="p-1 text-[#B0B0B0] hover:text-[#1B1B1B]" title="Edit">
                          <svg className="size-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" /></svg>
                        </button>
                        <button onClick={() => handleDelete(test.id)} className="p-1 text-[#B0B0B0] hover:text-red-400" title="Delete">
                          <TrashIcon className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* Meta line */}
                  <div className="px-4 pb-3">
                    <p className="text-[11px] text-[#999]">
                      {test.metric}
                      <span className="text-[#D0D0D0] mx-1.5">·</span>
                      {test.startDate}{test.endDate ? ` – ${test.endDate}` : ""}
                    </p>
                  </div>
                  {/* Metrics row — inline A vs B */}
                  {hasMetrics && (
                    <div className="border-t border-[#F0F0F0] px-4 py-3 grid grid-cols-3 gap-4">
                      {[
                        { label: "CVR", data: test.cvr },
                        { label: "AOV", data: test.aov },
                        { label: "RPV", data: test.rpv },
                      ].map(({ label: metricLabel, data }) => {
                        const lift = data ? calcLift(data.a, data.b) : null;
                        return (
                          <div key={metricLabel}>
                            <p className="text-[9px] font-semibold uppercase tracking-wider text-[#BBB] mb-1.5">{metricLabel}</p>
                            {data ? (
                              <div className="flex items-baseline gap-1.5 flex-wrap">
                                <span className="text-[11px] text-[#999]">{data.a}</span>
                                <svg className="size-2.5 text-[#CCC] shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" /></svg>
                                <span className="text-[12px] font-semibold text-[#1B1B1B]">{data.b}</span>
                                {lift && (
                                  <span className={`text-[10px] font-semibold ${lift.positive ? "text-emerald-500" : "text-red-400"}`}>
                                    {lift.value}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] text-[#DDD]">—</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {/* Figma link */}
                  {test.figma_url && (
                    <div className="border-t border-[#F0F0F0] px-4 py-2.5">
                      <a href={test.figma_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#999] hover:text-[#1B1B1B] transition-colors">
                        <svg className="size-3" viewBox="0 0 24 24" fill="none"><path d="M5 5.5A3.5 3.5 0 018.5 2H12v7H8.5A3.5 3.5 0 015 5.5z" fill="#F24E1E"/><path d="M12 2h3.5a3.5 3.5 0 010 7H12V2z" fill="#FF7262"/><path d="M12 9.5h3.5a3.5 3.5 0 010 7H12V9.5z" fill="#1ABCFE"/><path d="M5 19.5A3.5 3.5 0 018.5 16H12v3.5a3.5 3.5 0 11-7 0z" fill="#0ACF83"/><path d="M5 12.5A3.5 3.5 0 018.5 9H12v7H8.5A3.5 3.5 0 015 12.5z" fill="#A259FF"/></svg>
                        View Design
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
            {/* Empty slots for unfilled tier capacity */}
            {slotsPerWeek > 0 && Array.from({ length: Math.max(0, slotsPerWeek - weekGroups[weekLabel].length) }).map((_, i) => (
              <button
                key={`empty-${i}`}
                onClick={() => { resetForm(); setWeek(weekLabel); setShowForm(true); }}
                className="w-full border-2 border-dashed border-[#E0E0E0] rounded-lg p-4 text-center hover:border-[#999] hover:bg-[#FAFAFA] transition-colors cursor-pointer"
              >
                <p className="text-xs text-[#BBB]">+ Add test</p>
              </button>
            ))}
          </div>
        </div>
      ))}

      {tests.length === 0 && !showForm && slotsPerWeek === 0 && (
        <div className="border border-dashed border-[#E5E5EA] rounded-lg p-8 text-center">
          <p className="text-sm text-[#7A7A7A] mb-1">No tests yet</p>
          <p className="text-xs text-[#A0A0A0]">Select a testing tier and add your first test</p>
        </div>
      )}
    </div>
  );
}
