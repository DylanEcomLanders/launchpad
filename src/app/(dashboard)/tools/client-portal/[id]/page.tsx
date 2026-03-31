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
import { IntelligemsTestCards } from "@/components/intelligems-tests";
import { getFunnelsByClientId } from "@/lib/funnel-builder/data";
import { loadSettings, getNextTouchpointDate, type TeamMember } from "@/lib/settings";
import { getTickets, type Ticket } from "@/lib/slack-tickets";
import type { FunnelData } from "@/lib/funnel-builder/types";
import {
  getReviews,
  getPageReviews,
  createReview,
  addVersion,
  getVersions,
  getFeedback,
  deleteReview,
  updateReviewStatus,
  updateFeedbackResolved,
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
  TestStatus,
  AdHocRequest,
  ScopeItem,
  PortalProject,
  ProjectType,
  PortalReport,
} from "@/lib/portal/types";
import { deliverableTypes } from "@/lib/config";
import { BrandedReport } from "@/components/branded-report";
import type {
  DesignReview,
  DesignReviewVersion,
  DesignReviewFeedback,
} from "@/lib/portal/review-types";

type DashTab = "overview" | "updates" | "designs" | "development" | "testing" | "funnels" | "reports";

export default function PortalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const portalId = params.id as string;

  const [portal, setPortal] = useState<PortalData | null>(null);
  const [updates, setUpdates] = useState<PortalUpdate[]>([]);
  const [approvals, setApprovals] = useState<PortalApproval[]>([]);
  const [reviews, setReviews] = useState<DesignReview[]>([]);
  const [pageReviews, setPageReviews] = useState<DesignReview[]>([]);
  const [pageReviewVersions, setPageReviewVersions] = useState<Record<string, DesignReviewVersion[]>>({});
  const [pageReviewFeedback, setPageReviewFeedback] = useState<Record<string, DesignReviewFeedback[]>>({});
  const [funnels, setFunnels] = useState<FunnelData[]>([]);
  const [portalTickets, setPortalTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [activeTab, setActiveTab] = useState<DashTab>("overview");
  const [defaultTabSet, setDefaultTabSet] = useState(false);
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

  // Multi-project state
  const [selectedProjectIdx, setSelectedProjectIdx] = useState(-1); // -1 = show projects list
  const [confirmDeleteProjectId, setConfirmDeleteProjectId] = useState<string | null>(null);
  const [showProjectTrash, setShowProjectTrash] = useState(false);
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectType, setNewProjectType] = useState<ProjectType>("page-build");
  const [newProjectScope, setNewProjectScope] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, u, a, r, pr, fnls] = await Promise.all([
        getPortalById(portalId),
        getUpdates(portalId),
        getApprovals(portalId),
        getReviews(portalId),
        getPageReviews(portalId),
        getFunnelsByClientId(portalId),
      ]);
      setPortal(p);
      // Fetch tickets matching this portal's slack channel
      if (p?.slack_channel_url) {
        const allTickets = await getTickets();
        setPortalTickets(allTickets.filter(t => t.channel_id === p.slack_channel_url && !t.deleted_at));
      }
      // Set default tab based on client type (only on first load)
      if (!defaultTabSet && p) {
        if (p.client_type === "retainer") setActiveTab("testing");
        setDefaultTabSet(true);
      }
      setUpdates(u);
      setApprovals(a);
      setFunnels(fnls);
      setReviews(r.filter((rev) => !rev.review_type || rev.review_type === "design"));
      setPageReviews(pr);
      // Load versions + feedback for each page review
      if (pr.length > 0) {
        const versionMap: Record<string, DesignReviewVersion[]> = {};
        const feedbackMap: Record<string, DesignReviewFeedback[]> = {};
        await Promise.all(pr.map(async (rev) => {
          const [v, f] = await Promise.all([getVersions(rev.id), getFeedback(rev.id)]);
          versionMap[rev.id] = v;
          feedbackMap[rev.id] = f;
        }));
        setPageReviewVersions(versionMap);
        setPageReviewFeedback(feedbackMap);
      }
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }, [portalId]);

  useEffect(() => {
    load();
    loadSettings().then((s) => setTeam(s.team || []));
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

  const handleUpdateField = async (field: string, value: unknown) => {
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

  // ── Multi-project handlers ──

  const selectedProject: PortalProject | null =
    portal?.projects?.[selectedProjectIdx] ?? null;

  const handleAddProject = async () => {
    if (!portal || !newProjectName.trim()) return;
    const newProject: PortalProject = {
      id: crypto.randomUUID(),
      name: newProjectName.trim(),
      type: newProjectType,
      status: "active",
      created_at: new Date().toISOString(),
      phases: [],
      deliverables: [],
      scope: newProjectScope.trim()
        ? newProjectScope.split("\n").filter(Boolean).map((s) => s.trim())
        : [],
      documents: [],
      progress: 0,
    };
    const updatedProjects = [...(portal.projects || []), newProject];
    setPortal({ ...portal, projects: updatedProjects });
    await updatePortal(portal.id, { projects: updatedProjects });
    setSelectedProjectIdx(updatedProjects.length - 1);
    setNewProjectName("");
    setNewProjectType("page-build");
    setNewProjectScope("");
    setShowAddProjectModal(false);
  };

  // Delete project (soft delete)
  const handleDeleteProject = async (projectId: string) => {
    if (!portal) return;
    if (confirmDeleteProjectId !== projectId) {
      setConfirmDeleteProjectId(projectId);
      return;
    }
    const updatedProjects = portal.projects.map(p =>
      p.id === projectId ? { ...p, deleted_at: new Date().toISOString() } : p
    );
    setPortal({ ...portal, projects: updatedProjects } as PortalData);
    await updatePortal(portal.id, { projects: updatedProjects } as Partial<PortalData>);
    setConfirmDeleteProjectId(null);
  };

  // Restore project
  const handleRestoreProject = async (projectId: string) => {
    if (!portal) return;
    const updatedProjects = portal.projects.map(p =>
      p.id === projectId ? { ...p, deleted_at: undefined } : p
    );
    setPortal({ ...portal, projects: updatedProjects } as PortalData);
    await updatePortal(portal.id, { projects: updatedProjects } as Partial<PortalData>);
  };

  // Permanent delete project
  const handlePermanentDeleteProject = async (projectId: string) => {
    if (!portal) return;
    const updatedProjects = portal.projects.filter(p => p.id !== projectId);
    setPortal({ ...portal, projects: updatedProjects } as PortalData);
    await updatePortal(portal.id, { projects: updatedProjects } as Partial<PortalData>);
  };

  const activeProjects = (portal?.projects || []).filter(p => !(p as any).deleted_at);
  const trashedProjects = (portal?.projects || []).filter(p => !!(p as any).deleted_at);

  const updateSelectedProject = async (patch: Partial<PortalProject>) => {
    if (!portal || !selectedProject) return;
    const updatedProjects = portal.projects.map((p, i) =>
      i === selectedProjectIdx ? { ...p, ...patch } : p
    );
    setPortal({ ...portal, projects: updatedProjects });
    await updatePortal(portal.id, { projects: updatedProjects });
  };

  const handleProjectAddPhase = async () => {
    if (!phaseName.trim() || !selectedProject) return;
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
    await updateSelectedProject({ phases: [...(selectedProject.phases || []), newPhase] });
    setPhaseName("");
    setPhaseDates("");
    setPhaseDescription("");
    setPhaseDeadline("");
    setShowPhaseForm(false);
  };

  const handleProjectRemovePhase = async (phaseId: string) => {
    if (!selectedProject) return;
    await updateSelectedProject({
      phases: (selectedProject.phases || []).filter((p) => p.id !== phaseId),
    });
  };

  const handleProjectCyclePhaseStatus = async (phaseId: string) => {
    if (!selectedProject) return;
    const order: PortalPhase["status"][] = ["upcoming", "in-progress", "complete"];
    const updatedPhases = (selectedProject.phases || []).map((p) => {
      if (p.id !== phaseId) return p;
      const nextStatus = order[(order.indexOf(p.status) + 1) % order.length];
      return {
        ...p,
        status: nextStatus,
        completedDate: nextStatus === "complete" ? new Date().toISOString().slice(0, 10) : undefined,
      };
    });
    const inProgress = updatedPhases.find((p) => p.status === "in-progress");
    const currentPhase = inProgress?.name || updatedPhases.filter((p) => p.status === "complete").pop()?.name || selectedProject.current_phase || "";
    await updateSelectedProject({ phases: updatedPhases, current_phase: currentPhase });
  };

  const handleProjectAddScope = async (item: string, type?: string) => {
    if (!selectedProject || !item.trim()) return;
    const newItem = type ? { description: item.trim(), type } : item.trim();
    await updateSelectedProject({ scope: [...(selectedProject.scope || []), newItem] });
  };

  const handleProjectRemoveScope = async (index: number) => {
    if (!selectedProject) return;
    await updateSelectedProject({
      scope: (selectedProject.scope || []).filter((_, i) => i !== index),
    });
  };

  const handleProjectUpdateField = async (field: string, value: unknown) => {
    if (!selectedProject) return;
    await updateSelectedProject({ [field]: value } as Partial<PortalProject>);
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

  const isRetainerPortal = portal.client_type === "retainer";

  // Tabs driven by selected project type, not client type
  const isSelectedRetainer = selectedProject?.type === "retainer";
  const dashTabs: { key: DashTab; label: string }[] = isSelectedRetainer
    ? [
        { key: "overview", label: "Overview" },
        { key: "testing", label: "Testing" },
        { key: "updates", label: "Updates" },
        { key: "reports", label: "Reports" },
      ]
    : [
        { key: "overview", label: "Overview" },
        { key: "updates", label: "Updates" },
        { key: "designs", label: "Designs" },
        { key: "development", label: "Development" },
        { key: "testing", label: "Testing" },
        { key: "funnels", label: "Funnels" },
        { key: "reports", label: "Reports" },
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
              <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                  {portal.client_name}
                </h1>
                <span className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-full ${
                  isRetainerPortal ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                }`}>
                  {isRetainerPortal ? "Retainer" : "Project"}
                </span>
              </div>
              {portal.client_email && <p className="text-xs text-[#AAA] mt-1">{portal.client_email}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={copyLink}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium border border-[#E5E5EA] rounded-lg text-[#7A7A7A] hover:text-[#1B1B1B] hover:border-[#999] transition-colors"
              >
                <ClipboardDocumentIcon className="size-3.5" />
                {copied ? "Copied!" : "Copy Link"}
              </button>
              <a
                href={`/portal/${portal.token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium border border-[#E5E5EA] rounded-lg text-[#7A7A7A] hover:text-[#1B1B1B] hover:border-[#999] transition-colors"
              >
                <ArrowTopRightOnSquareIcon className="size-3.5" />
                Preview
              </a>
              <button
                onClick={() => { load(); }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1B1B1B] text-white text-[11px] font-medium rounded-lg hover:bg-[#2D2D2D] transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>

        {/* ── Client Details (editable) ── */}
        <ClientDetailsPanel portal={portal} team={team} onUpdateField={handleUpdateField} />

        {/* ── Tickets Snapshot (client level) ── */}
        {portalTickets.length > 0 && !selectedProject && (() => {
          const openTickets = portalTickets.filter(t => t.status !== "resolved" && !t.deleted_at);
          if (openTickets.length === 0) return null;
          const typeColors: Record<string, string> = { design: "#7C3AED", dev: "#2563EB", cro: "#059669", qa: "#D97706" };
          const statusColors: Record<string, string> = { open: "#EF4444", in_progress: "#F59E0B", quoted: "#8B5CF6", resolved: "#10B981" };
          return (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#AAA]">Open Tickets ({openTickets.length})</h3>
              </div>
              <div className="border border-[#E5E5EA] rounded-xl bg-white divide-y divide-[#F0F0F0] overflow-hidden">
                {openTickets.slice(0, 5).map(t => (
                  <div key={t.id} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: statusColors[t.status] || "#CCC" }} />
                      <span className="text-xs font-medium text-[#1A1A1A] truncate">{t.title}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {t.ticket_type && t.ticket_type !== "unassigned" && (
                        <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-full" style={{ backgroundColor: (typeColors[t.ticket_type] || "#999") + "15", color: typeColors[t.ticket_type] || "#999" }}>
                          {t.ticket_type}
                        </span>
                      )}
                      <span className="text-[9px] text-[#BBB]">{t.status.replace("_", " ")}</span>
                    </div>
                  </div>
                ))}
                {openTickets.length > 5 && (
                  <div className="px-4 py-2 text-center">
                    <span className="text-[10px] text-[#AAA]">+ {openTickets.length - 5} more</span>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── Blocker (client level) ── */}
        {!selectedProject && (() => {
          const blocker = portal.blocker;
          const daysBlocked = blocker?.since ? Math.max(0, Math.floor((Date.now() - new Date(blocker.since).getTime()) / 86400000)) : 0;
          return (
            <div className="mb-6">
              {blocker ? (
                <div className="border border-red-200 bg-red-50/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-red-500 animate-pulse" />
                      <p className="text-xs font-semibold text-red-600">Blocked {daysBlocked > 0 ? `${daysBlocked}d` : ""}</p>
                      <span className="text-[10px] px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-medium">{blocker.type}</span>
                    </div>
                    <button
                      onClick={async () => {
                        await updatePortal(portal.id, { blocker: null } as Partial<PortalData>);
                        setPortal({ ...portal, blocker: null } as PortalData);
                      }}
                      className="text-[10px] text-red-400 hover:text-red-600"
                    >
                      Clear
                    </button>
                  </div>
                  <p className="text-xs text-red-700">{blocker.reason}</p>
                </div>
              ) : (
                <button
                  onClick={async () => {
                    const reason = prompt("Reason for blocking:");
                    if (!reason) return;
                    const type = prompt("Type (client / internal / external):", "client") as "client" | "internal" | "external" || "client";
                    const newBlocker = { type, reason, since: new Date().toISOString() };
                    await updatePortal(portal.id, { blocker: newBlocker } as Partial<PortalData>);
                    setPortal({ ...portal, blocker: newBlocker } as PortalData);
                  }}
                  className="flex items-center gap-1.5 text-[11px] text-[#CCC] hover:text-red-500 transition-colors"
                >
                  🚩 Flag as blocked
                </button>
              )}
            </div>
          );
        })()}

        {/* ── Funnels (client level) ── */}
        {!selectedProject && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#AAA]">Funnels</h3>
              <Link
                href={`/tools/funnel-builder?clientId=${portal.id}&clientName=${encodeURIComponent(portal.client_name)}`}
                className="text-[11px] font-medium text-[#999] hover:text-[#1A1A1A]"
              >
                + New Funnel
              </Link>
            </div>
            {funnels.length > 0 ? (
              <div className="divide-y divide-[#F0F0F0]">
                {funnels.map((funnel) => (
                  <Link
                    key={funnel.id}
                    href={`/tools/funnel-builder?id=${funnel.id}`}
                    className="flex items-center justify-between py-3 hover:bg-[#F7F8FA] transition-colors rounded-lg px-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-[#1A1A1A]">{funnel.name || "Untitled Funnel"}</p>
                      <p className="text-[10px] text-[#AAA]">{funnel.nodes.length} nodes</p>
                    </div>
                    <svg className="size-4 text-[#DDD]" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#CCC] py-2">No funnels linked yet</p>
            )}
          </div>
        )}

        {/* ── Retainer Health Summary ── */}
        {!selectedProject && isRetainerPortal && (() => {
          const tests = (portal.results || []).filter(t => !(t as any).deleted_at);
          const tierMonthlyMap: Record<string, number> = { T1: 4, T2: 8, T3: 16 };
          const capacity = tierMonthlyMap[portal.testing_tier || ""] || 0;
          const n = new Date();
          const mStart = new Date(n.getFullYear(), n.getMonth(), 1);
          const mEnd = new Date(n.getFullYear(), n.getMonth() + 1, 0);
          // Use all active non-deleted tests for this month's count
          const allActive = tests.filter(t => !(t as any).deleted_at);
          const delivered = allActive.filter(t => t.status === "live" || t.status === "complete").length;
          const scheduled = allActive.filter(t => t.status === "scheduled").length;
          const ideation = allActive.filter(t => t.status === "ideation").length;
          const totalFilled = delivered + scheduled + ideation;
          const empty = Math.max(0, capacity - totalFilled);
          const attention = allActive.filter(t => t.status === "ideation" || t.status === "scheduled");
          const monthName = n.toLocaleString("en-GB", { month: "long", year: "numeric" });

          if (capacity === 0) return null;

          return (
            <div className="mb-6">
              <div className="border border-[#E5E5EA] rounded-lg p-4 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-[#1A1A1A]">Retainer — {monthName}</p>
                  <span className="text-[10px] text-[#AAA]">{portal.testing_tier} · {delivered}/{capacity} delivered</span>
                </div>
                <div className="relative h-2 bg-[#F0F0F0] rounded-full overflow-hidden mb-2">
                  {totalFilled > 0 && <div className="absolute left-0 top-0 h-full bg-purple-300 rounded-full" style={{ width: `${(totalFilled / capacity) * 100}%` }} />}
                  {(delivered + scheduled) > 0 && <div className="absolute left-0 top-0 h-full bg-blue-400 rounded-full" style={{ width: `${((delivered + scheduled) / capacity) * 100}%` }} />}
                  {delivered > 0 && <div className="absolute left-0 top-0 h-full bg-emerald-500 rounded-full" style={{ width: `${(delivered / capacity) * 100}%` }} />}
                </div>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1 text-[10px] text-[#777]"><span className="size-2 rounded-full bg-emerald-500" /> {delivered} delivered</span>
                  <span className="flex items-center gap-1 text-[10px] text-[#777]"><span className="size-2 rounded-full bg-blue-400" /> {scheduled} scheduled</span>
                  <span className="flex items-center gap-1 text-[10px] text-[#777]"><span className="size-2 rounded-full bg-purple-300" /> {ideation} ideation</span>
                  <span className="flex items-center gap-1 text-[10px] text-[#777]"><span className="size-2 rounded-full bg-[#F0F0F0]" /> {empty} empty</span>
                </div>
                {attention.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#F0F0F0]">
                    <p className="text-[10px] font-semibold text-amber-600 mb-1">⚠ {attention.length} test{attention.length !== 1 ? "s" : ""} need attention</p>
                    {attention.map(t => (
                      <p key={t.id} className="text-[10px] text-[#777]">• {t.name} — scheduled, not live</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── Projects List ── */}
        {!selectedProject && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#AAA]">Projects</h3>
              <button
                onClick={() => setShowAddProjectModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium bg-[#1B1B1B] text-white rounded-lg hover:bg-[#2D2D2D] whitespace-nowrap"
              >
                + Add Project
              </button>
            </div>
            <div className="divide-y divide-[#F0F0F0]">
              {activeProjects.map((proj) => {
                const idx = (portal.projects || []).findIndex(p => p.id === proj.id);
                const startDate = proj.created_at ? new Date(proj.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
                return (
                  <div key={proj.id} className="flex items-center justify-between px-3.5 py-3.5 hover:bg-[#F7F8FA] transition-colors rounded-lg group/proj">
                    <button onClick={() => setSelectedProjectIdx(idx)} className="flex-1 text-left min-w-0">
                      <p className="text-sm font-semibold text-[#1A1A1A]">{proj.name}</p>
                      <p className="text-[10px] text-[#AAA]">
                        {proj.type === "retainer" ? "Retainer" : "Page Build"}
                        {startDate ? ` · Started ${startDate}` : ""}
                        {proj.current_phase ? ` · ${proj.current_phase}` : ""}
                      </p>
                    </button>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteProject(proj.id); }}
                        className={`p-1 transition-colors opacity-0 group-hover/proj:opacity-100 ${confirmDeleteProjectId === proj.id ? "text-red-500" : "text-[#CCC] hover:text-red-400"}`}
                        title={confirmDeleteProjectId === proj.id ? "Click again to confirm" : "Delete project"}
                      >
                        <TrashIcon className="size-3.5" />
                      </button>
                      <span className={`size-1.5 rounded-full ${proj.status === "active" ? "bg-emerald-500" : proj.status === "paused" ? "bg-amber-500" : "bg-[#CCC]"}`} />
                      <svg className="size-4 text-[#DDD]" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
                    </div>
                  </div>
                );
              })}
              {activeProjects.length === 0 && (
                <p className="text-xs text-[#CCC] py-4">No projects yet — add one above</p>
              )}
            </div>
            {/* Project Trash */}
            {trashedProjects.length > 0 && (
              <div className="mt-3 border border-[#E5E5EA] rounded-lg p-3 bg-[#FAFAFA]">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-2">Trash ({trashedProjects.length})</p>
                <div className="space-y-1.5">
                  {trashedProjects.map(proj => (
                    <div key={proj.id} className="flex items-center justify-between px-3 py-2 bg-white rounded border border-[#E5E5EA]">
                      <p className="text-xs text-[#777]">{proj.name}</p>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleRestoreProject(proj.id)} className="text-[10px] text-emerald-600 hover:text-emerald-700">Restore</button>
                        <button onClick={() => handlePermanentDeleteProject(proj.id)} className="text-[10px] text-red-400 hover:text-red-600">Delete Forever</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Back to projects when drilled in */}
        {selectedProject && (
          <button
            onClick={() => setSelectedProjectIdx(-1)}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#A0A0A0] hover:text-[#1B1B1B] transition-colors mb-4"
          >
            <ArrowLeftIcon className="size-3" />
            Back to projects
          </button>
        )}


        {/* Tab bar — only when drilled into a project */}
        {selectedProject && (
          <div className="flex items-center gap-1 mb-6 border-b border-[#E8E8E8]">
            {dashTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-xs font-semibold transition-colors relative ${
                  activeTab === tab.key
                    ? "text-[#1A1A1A]"
                    : "text-[#AAA] hover:text-[#777]"
                }`}
              >
                {tab.label}
                {activeTab === tab.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1A1A1A] rounded-full" />}
              </button>
            ))}
          </div>
        )}

        {/* Tab content — only when drilled into a project */}
        {selectedProject && activeTab === "overview" && (
          <OverviewSection
            portal={portal}
            selectedProject={selectedProject}
            tickets={portalTickets}
            onUpdateField={selectedProject ? handleProjectUpdateField : handleUpdateField}
            onUpdatePortal={handleUpdateField}
            onSetBlocker={async (blocker) => {
              await updatePortal(portal.id, { blocker } as Partial<PortalData>);
              setPortal({ ...portal, blocker } as PortalData);
            }}
            onAddPhase={() => setShowPhaseForm(true)}
            onRemovePhase={selectedProject ? handleProjectRemovePhase : handleRemovePhase}
            onCyclePhaseStatus={selectedProject ? handleProjectCyclePhaseStatus : handleCyclePhaseStatus}
            onUpdateTouchpoint={handleUpdateTouchpoint}
            onAddScope={selectedProject ? handleProjectAddScope : handleAddScope}
            onRemoveScope={selectedProject ? handleProjectRemoveScope : handleRemoveScope}
            onUpdateSelectedProject={selectedProject ? updateSelectedProject : undefined}
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

        {activeTab === "development" && portal && (
          <DevelopmentSection
            portal={portal}
            pageReviews={pageReviews}
            pageReviewVersions={pageReviewVersions}
            pageReviewFeedback={pageReviewFeedback}
            onReload={load}
          />
        )}

        {selectedProject && activeTab === "testing" && portal && (
          <TestingSection
            portal={portal}
            projectType={selectedProject?.type || "page-build"}
            onUpdateResults={async (results) => {
              await updatePortal(portal.id, { results } as Partial<PortalData>);
              setPortal({ ...portal, results } as PortalData);
            }}
            onUpdateField={handleUpdateField}
          />
        )}

        {activeTab === "funnels" && portal && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold tracking-tight">Funnels</h2>
              <Link
                href={`/tools/funnel-builder?clientId=${portal.id}&clientName=${encodeURIComponent(portal.client_name)}`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#1B1B1B] text-white rounded-lg hover:bg-[#333] transition-colors"
              >
                <PlusIcon className="size-3.5" />
                Create Funnel
              </Link>
            </div>
            {funnels.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-[#E5E5EA] rounded-xl">
                <p className="text-sm text-[#7A7A7A] mb-1">No funnels linked to this client yet</p>
                <p className="text-xs text-[#A0A0A0]">Create a funnel to map out the customer journey</p>
              </div>
            ) : (
              <div className="space-y-2">
                {funnels.map((funnel) => (
                  <Link
                    key={funnel.id}
                    href={`/tools/funnel-builder?id=${funnel.id}`}
                    className="flex items-center justify-between p-4 border border-[#E5E5EA] rounded-xl hover:border-[#1B1B1B] transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#1B1B1B] group-hover:underline truncate">
                        {funnel.name || "Untitled Funnel"}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full border ${
                          funnel.mode === "performance"
                            ? "bg-[#F0F0F0] text-[#555] border-[#E0E0E0]"
                            : "bg-white text-[#999] border-[#E5E5EA]"
                        }`}>
                          {funnel.mode}
                        </span>
                        <span className="text-[11px] text-[#A0A0A0]">
                          {funnel.nodes.length} node{funnel.nodes.length !== 1 ? "s" : ""}
                        </span>
                        {funnel.created_at && (
                          <span className="text-[11px] text-[#A0A0A0]">
                            {new Date(funnel.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowTopRightOnSquareIcon className="size-4 text-[#CCC] group-hover:text-[#1B1B1B] transition-colors shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "reports" && portal && (
          <ReportsSection
            reports={portal.reports || []}
            onUpdate={async (reports) => {
              await updatePortal(portal.id, { reports } as any);
              setPortal({ ...portal, reports });
            }}
          />
        )}

        {/* Phase form modal */}
        {showPhaseForm && (
          <FormModal
            title="Add Phase"
            onClose={() => setShowPhaseForm(false)}
            onSubmit={selectedProject ? handleProjectAddPhase : handleAddPhase}
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

        {/* Add Project modal */}
        {showAddProjectModal && (
          <FormModal
            title="Add Project"
            onClose={() => setShowAddProjectModal(false)}
            onSubmit={handleAddProject}
            disabled={!newProjectName.trim()}
          >
            <div>
              <label className={labelClass}>Project Name *</label>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="e.g., PDP Build — March 2026"
                className={inputClass}
                autoFocus
              />
            </div>
            <div>
              <label className={labelClass}>Type</label>
              <select
                value={newProjectType}
                onChange={(e) => setNewProjectType(e.target.value as ProjectType)}
                className={inputClass}
              >
                <option value="page-build">Page Build</option>
                <option value="retainer">Retainer</option>
                <option value="landing-page">Landing Page</option>
                <option value="cro-audit">CRO Audit</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Scope Items</label>
              <textarea
                value={newProjectScope}
                onChange={(e) => setNewProjectScope(e.target.value)}
                placeholder="One item per line, e.g.&#10;Homepage redesign&#10;PDP template&#10;Collection page"
                rows={4}
                className={textareaClass}
              />
              <p className="text-[10px] text-[#AAA] mt-1">One item per line (optional)</p>
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
  selectedProject,
  tickets,
  onUpdateField,
  onUpdatePortal,
  onSetBlocker,
  onAddPhase,
  onRemovePhase,
  onCyclePhaseStatus,
  onUpdateTouchpoint,
  onAddScope,
  onRemoveScope,
  onUpdateSelectedProject,
}: {
  portal: PortalData;
  selectedProject: PortalProject | null;
  tickets: Ticket[];
  onUpdateField: (field: string, value: unknown) => void;
  onUpdatePortal: (field: string, value: unknown) => void;
  onSetBlocker: (blocker: PortalBlocker | null) => void;
  onAddPhase: () => void;
  onRemovePhase: (id: string) => void;
  onCyclePhaseStatus: (id: string) => void;
  onUpdateTouchpoint: (field: "date" | "description", value: string) => void;
  onAddScope: (item: string, type?: string) => void;
  onRemoveScope: (index: number) => void;
  onUpdateSelectedProject?: (patch: Partial<PortalProject>) => Promise<void>;
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

  // Resolve data source: selected project or portal-level fallback
  const phases = (selectedProject?.phases?.length ? selectedProject.phases : null) ?? portal.phases;
  const scope = (selectedProject?.scope?.length ? selectedProject.scope : null) ?? portal.scope;
  const documents = (selectedProject?.documents?.length ? selectedProject.documents : null) ?? portal.documents;
  const currentPhase = selectedProject?.current_phase || portal.current_phase;
  const isRetainer = selectedProject?.type === "retainer";

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
        const inProgress = phases.find((p) => p.status === "in-progress");
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
          {!isRetainer && (
            <div className="flex items-center justify-between py-1">
              <p className="text-[11px] font-medium text-[#7A7A7A]">Current Phase</p>
              <select
                value={currentPhase}
                onChange={(e) => onUpdateField("current_phase", e.target.value)}
                className="text-sm text-right bg-transparent border border-[#E5E5EA] rounded px-2 py-1 text-[#1B1B1B] focus:outline-none focus:ring-1 focus:ring-[#1B1B1B]"
              >
                {phases.length === 0 && (
                  <option value={currentPhase}>{currentPhase}</option>
                )}
                {phases.map((p) => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
          )}
          {selectedProject && (
            <div className="flex items-center justify-between py-1">
              <p className="text-[11px] font-medium text-[#7A7A7A]">Project Type</p>
              <span className="px-2 py-0.5 text-[10px] font-medium text-[#777] bg-[#F0F0F0] rounded-full capitalize">
                {selectedProject.type.replace("-", " ")}
              </span>
            </div>
          )}
          {selectedProject && (
            <div className="flex items-center justify-between py-1">
              <p className="text-[11px] font-medium text-[#7A7A7A]">Status</p>
              <select
                value={selectedProject.status}
                onChange={(e) => onUpdateSelectedProject?.({ status: e.target.value as PortalProject["status"] })}
                className="text-sm text-right bg-transparent border border-[#E5E5EA] rounded px-2 py-1 text-[#1B1B1B] focus:outline-none focus:ring-1 focus:ring-[#1B1B1B]"
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="complete">Complete</option>
              </select>
            </div>
          )}
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
          {portal.client_type !== "retainer" && (
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-[11px] font-medium text-[#7A7A7A]">Show Results Tab</p>
                <p className="text-[10px] text-[#A0A0A0]">Enable for clients with active testing</p>
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
          )}
        </div>
      </div>

      {/* Retainer view — tier is managed in Testing tab */}

      {/* Phases (non-retainer) */}
      {!isRetainer && (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A]">
            Phases ({phases.length})
          </h3>
          <button
            onClick={onAddPhase}
            className="flex items-center gap-1 text-xs font-medium text-[#7A7A7A] hover:text-[#1B1B1B] transition-colors"
          >
            <PlusIcon className="size-3" />
            Add
          </button>
        </div>
        {phases.length === 0 ? (
          <p className="text-xs text-[#A0A0A0] bg-[#F7F8FA] border border-dashed border-[#E5E5EA] rounded-lg p-4 text-center">
            No phases yet — add your first phase
          </p>
        ) : (
          <div className="border border-[#E5E5EA] shadow-[var(--shadow-soft)] rounded-lg divide-y divide-[#EDEDEF]">
            {phases.map((phase) => (
              <div key={phase.id} className="p-3">
                <div className="flex items-center gap-3">
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
                {/* Editable dates */}
                <div className="flex items-center gap-2 mt-1.5 ml-5">
                  <input
                    type="date"
                    value={phase.startDate || ""}
                    onChange={(e) => {
                      const updated = phases.map((p) =>
                        p.id === phase.id
                          ? {
                              ...p,
                              startDate: e.target.value,
                              dates: `${e.target.value ? new Date(e.target.value + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "?"} — ${p.endDate ? new Date(p.endDate + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "?"}`,
                            }
                          : p
                      );
                      onUpdateField("phases", updated);
                    }}
                    className="text-[11px] text-[#777] bg-transparent border border-[#E5E5EA] rounded px-1.5 py-0.5 w-[120px]"
                  />
                  <span className="text-[10px] text-[#CCC]">—</span>
                  <input
                    type="date"
                    value={phase.endDate || ""}
                    onChange={(e) => {
                      const updated = phases.map((p) =>
                        p.id === phase.id
                          ? {
                              ...p,
                              endDate: e.target.value,
                              deadline: e.target.value,
                              dates: `${p.startDate ? new Date(p.startDate + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "?"} — ${e.target.value ? new Date(e.target.value + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "?"}`,
                            }
                          : p
                      );
                      onUpdateField("phases", updated);
                    }}
                    className="text-[11px] text-[#777] bg-transparent border border-[#E5E5EA] rounded px-1.5 py-0.5 w-[120px]"
                  />
                  {phase.status === "complete" && phase.completedDate && phase.deadline && new Date(phase.completedDate) < new Date(phase.deadline) && (
                    <span className="text-[10px] text-green-600 font-medium">
                      Completed early ({new Date(phase.completedDate + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {/* Scope / Deliverables */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A]">
            Scope / Deliverables ({scope?.length || 0})
          </h3>
        </div>
        <div className="border border-[#E5E5EA] shadow-[var(--shadow-soft)] rounded-lg divide-y divide-[#EDEDEF]">
          {(scope || []).map((item, i) => {
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
      {(documents || []).length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A] mb-3">
            Documents ({documents.length})
          </h3>
          <div className="border border-[#E5E5EA] shadow-[var(--shadow-soft)] rounded-lg divide-y divide-[#EDEDEF]">
            {documents.map((doc, i) => (
              <div key={i} className="flex items-center gap-2 p-3">
                <p className="text-sm font-medium flex-1 min-w-0 truncate">{doc.name}</p>
                <span className="shrink-0 px-2 py-0.5 text-[10px] font-medium text-[#777] bg-[#F0F0F0] rounded-full">{doc.type}</span>
                {doc.url ? (
                  <span className="shrink-0 px-2 py-0.5 text-[10px] font-medium text-green-600 bg-green-50 rounded-full">Linked</span>
                ) : (
                  <span className="shrink-0 px-2 py-0.5 text-[10px] font-medium text-[#AAA] bg-[#F8F8F8] rounded-full">Pending</span>
                )}
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
      const v1 = await addVersion({
        review_id: review.id,
        version_number: 1,
        figma_url: figmaUrl.trim(),
        notes: "",
      });
      onReviewsChange([review, ...reviews]);
      // Auto-select the new review and load its V1
      setExpandedReview(review.id);
      setVersions([v1]);
      setSelectedVersionId(v1.id);
      setFeedbackList([]);
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

/* ── Intelligems API Key Input with Save Button ── */

function IntelligemsKeyInput({ currentKey, onSave }: { currentKey: string; onSave: (key: string) => void }) {
  const [key, setKey] = useState(currentKey);
  const [saved, setSaved] = useState(false);
  const isDirty = key !== currentKey;

  useEffect(() => { setKey(currentKey); }, [currentKey]);

  const handleSave = () => {
    onSave(key.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="bg-white border border-[#E5E5EA] rounded-lg p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A] mb-3">Intelligems API</p>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="ig_live_..."
          className={`${inputClass} flex-1 font-mono text-xs`}
        />
        {isDirty ? (
          <button
            onClick={handleSave}
            className="px-3 py-1.5 text-[11px] font-medium bg-[#1B1B1B] text-white rounded-lg hover:bg-[#2D2D2D] whitespace-nowrap"
          >
            Save
          </button>
        ) : saved ? (
          <span className="text-[10px] text-emerald-600 font-medium whitespace-nowrap">Saved ✓</span>
        ) : currentKey ? (
          <span className="text-[10px] text-emerald-600 font-medium whitespace-nowrap">Connected</span>
        ) : null}
      </div>
      <p className="text-[10px] text-[#AAA] mt-1.5">Paste the client&apos;s Intelligems API key to auto-pull A/B test results</p>
    </div>
  );
}

/* ── Testing Section ── */

function TestingSection({
  portal,
  projectType,
  onUpdateResults,
  onUpdateField,
}: {
  portal: PortalData;
  projectType: string;
  onUpdateResults: (results: PortalTestResult[]) => Promise<void>;
  onUpdateField: (field: string, value: unknown) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [metric, setMetric] = useState("");
  const [status, setStatus] = useState<"ideation" | "scheduled" | "live" | "complete">("ideation");
  const [result, setResult] = useState<"winner" | "loser" | "inconclusive">("winner");
  const [cvrA, setCvrA] = useState("");
  const [cvrB, setCvrB] = useState("");
  const [aovA, setAovA] = useState("");
  const [aovB, setAovB] = useState("");
  const [rpvA, setRpvA] = useState("");
  const [rpvB, setRpvB] = useState("");
  const [figmaUrl, setFigmaUrl] = useState("");
  const [igTestId, setIgTestId] = useState("");
  const [igFetching, setIgFetching] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [week, setWeek] = useState("");
  const tests = portal.results || [];
  const tierCount: Record<string, number> = { T1: 1, T2: 2, T3: 4 };
  const slotsPerWeek = tierCount[portal.testing_tier || ""] || 0;
  const now = new Date();
  const activeTests = tests.filter(t => !(t as any).deleted_at);
  const trashedTests = tests.filter(t => !!(t as any).deleted_at);

  // Generate 4 weeks for the current month using simple "Week 1-4" labels
  const monthName = now.toLocaleString("en-GB", { month: "short" });
  const generateMonthWeeks = () => {
    const weeks: { label: string; startDate: Date }[] = [];
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    // Find first Monday on or after the 1st
    while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
    for (let i = 0; i < 4; i++) {
      const endD = new Date(d); endD.setDate(endD.getDate() + 6);
      weeks.push({
        label: `Week ${i + 1} — ${d.getDate()} ${monthName}`,
        startDate: new Date(d),
      });
      d.setDate(d.getDate() + 7);
    }
    return weeks;
  };

  const monthWeeks = slotsPerWeek > 0 ? generateMonthWeeks() : [];

  // Assign tests to week slots by date proximity or exact label match
  const weekGroups: Record<string, PortalTestResult[]> = {};
  monthWeeks.forEach(w => { weekGroups[w.label] = []; });

  const unassigned: PortalTestResult[] = [];
  activeTests.forEach(test => {
    // Try exact label match first
    if (weekGroups[test.week]) {
      weekGroups[test.week].push(test);
      return;
    }
    // Try date-based assignment
    if (test.startDate && monthWeeks.length > 0) {
      const testDate = new Date(test.startDate);
      for (let i = 0; i < monthWeeks.length; i++) {
        const wStart = monthWeeks[i].startDate;
        const wEnd = new Date(wStart); wEnd.setDate(wEnd.getDate() + 6);
        if (testDate >= wStart && testDate <= wEnd) {
          weekGroups[monthWeeks[i].label].push(test);
          return;
        }
      }
    }
    // Try week number match (W10 matches if it falls in our month)
    const weekNumMatch = test.week?.match(/W(\d+)/);
    if (weekNumMatch) {
      const testWeekNum = parseInt(weekNumMatch[1]);
      for (let i = 0; i < monthWeeks.length; i++) {
        const wStart = monthWeeks[i].startDate;
        const genWeekNum = Math.ceil((Math.floor((wStart.getTime() - new Date(wStart.getFullYear(), 0, 1).getTime()) / 86400000) + new Date(wStart.getFullYear(), 0, 1).getDay() + 1) / 7);
        if (testWeekNum === genWeekNum) {
          weekGroups[monthWeeks[i].label].push(test);
          return;
        }
      }
    }
    unassigned.push(test);
  });

  if (unassigned.length > 0) weekGroups["Other"] = unassigned;

  const sortedWeeks = [
    ...monthWeeks.map(w => w.label),
    ...(unassigned.length > 0 ? ["Other"] : []),
  ];

  const resetForm = () => {
    setName(""); setMetric(""); setStatus("scheduled"); setResult("winner");
    setCvrA(""); setCvrB(""); setAovA(""); setAovB("");
    setRpvA(""); setRpvB(""); setWeek("");
    setFigmaUrl(""); setIgTestId(""); setStartDate(""); setEndDate("");
    setEditId(null); setShowForm(false);
  };

  // Fetch metrics from Intelligems by test ID
  const fetchIgMetrics = async () => {
    if (!igTestId.trim() || !portal.intelligems_key) return;
    setIgFetching(true);
    try {
      const res = await fetch("/api/intelligems/test-metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: portal.intelligems_key, testId: igTestId.trim() }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      if (data.metrics) {
        if (data.metrics.cvr) { setCvrA(data.metrics.cvr.a || ""); setCvrB(data.metrics.cvr.b || ""); }
        if (data.metrics.aov) { setAovA(data.metrics.aov.a || ""); setAovB(data.metrics.aov.b || ""); }
        if (data.metrics.rpv) { setRpvA(data.metrics.rpv.a || ""); setRpvB(data.metrics.rpv.b || ""); }
      }
      if (data.test?.name && !name.trim()) setName(data.test.name);
      if (data.test?.status === "started") setStatus("live");
      else if (data.test?.status === "ended") setStatus("complete");
    } catch { /* silent */ }
    setIgFetching(false);
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
    setIgTestId(test.intelligems_test_id || "");
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
      intelligems_test_id: igTestId.trim() || undefined,
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

  const tierLabels: Record<string, string> = { T1: "1 test/week (4/mo)", T2: "2 tests/week (8/mo)", T3: "4 tests/week (16/mo)" };
  const tierMonthly: Record<string, number> = { T1: 4, T2: 8, T3: 16 };
  const monthlyCapacity = tierMonthly[portal.testing_tier || ""] || 0;
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showTrash, setShowTrash] = useState(false);

  // Get current month's tests
  const currentMonth = now.toLocaleString("en-GB", { month: "long", year: "numeric" });
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Month's tests (by week label or startDate within current month)
  const monthTests = activeTests.filter(t => {
    if (t.startDate) {
      const d = new Date(t.startDate);
      return d >= currentMonthStart && d <= currentMonthEnd;
    }
    return true; // Include tests without dates
  });

  // Delivery tracking: only live + complete count as delivered
  const deliveredCount = monthTests.filter(t => t.status === "live" || t.status === "complete").length;
  const scheduledCount = monthTests.filter(t => t.status === "scheduled").length;
  const ideationCount = monthTests.filter(t => t.status === "ideation").length;

  // Smart attention logic: check if we're behind schedule
  // Current week index (0-3) in the month
  const currentWeekIdx = monthWeeks.findIndex(w => {
    const wStart = w.startDate;
    const wEnd = new Date(wStart); wEnd.setDate(wEnd.getDate() + 6);
    return now >= wStart && now <= wEnd;
  });
  const needsAttention: { test?: PortalTestResult; message: string }[] = [];
  // Check: tests in current week still in ideation = behind
  monthWeeks.forEach((w, idx) => {
    const weekTests = (weekGroups[w.label] || []);
    if (idx <= currentWeekIdx) {
      weekTests.filter(t => t.status === "ideation").forEach(t => {
        needsAttention.push({ test: t, message: `"${t.name}" is still in ideation — should be live by now` });
      });
    }
    // Next week's tests should be at least scheduled
    if (idx === currentWeekIdx + 1) {
      weekTests.filter(t => t.status === "ideation").forEach(t => {
        needsAttention.push({ test: t, message: `"${t.name}" (next week) still in ideation — should be scheduled` });
      });
      const emptySlots = Math.max(0, slotsPerWeek - weekTests.length);
      if (emptySlots > 0) {
        needsAttention.push({ message: `Next week has ${emptySlots} empty slot${emptySlots > 1 ? "s" : ""} — needs ideation` });
      }
    }
  });

  // Delete with trash
  const handleDeleteTest = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    // Soft delete — mark with deleted_at
    const updated = tests.map(t => t.id === id ? { ...t, deleted_at: new Date().toISOString() } as any : t);
    await onUpdateResults(updated);
    setConfirmDeleteId(null);
  };

  // Restore from trash
  const handleRestore = async (id: string) => {
    const updated = tests.map(t => t.id === id ? { ...t, deleted_at: undefined } as any : t);
    await onUpdateResults(updated);
  };

  // Permanent delete
  const handlePermanentDelete = async (id: string) => {
    await onUpdateResults(tests.filter(t => t.id !== id));
  };

  // Calculate % change between two metric strings (e.g. "2.1%" and "2.8%", or "$84" and "$86")
  const calcLift = (a?: string, b?: string): { value: string; positive: boolean } | null => {
    if (!a || !b) return null;
    const numA = parseFloat(a.replace(/[^0-9.\-]/g, ""));
    const numB = parseFloat(b.replace(/[^0-9.\-]/g, ""));
    if (isNaN(numA) || isNaN(numB) || numA === 0) return null;
    const pct = ((numB - numA) / numA) * 100;
    return { value: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`, positive: pct >= 0 };
  };

  const isRetainerProject = projectType === "retainer";

  // ── Project Testing View (simple numbered list) ──
  if (!isRetainerProject) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A]">
            Tests ({activeTests.length})
          </h3>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium bg-[#1B1B1B] text-white rounded-lg hover:bg-[#2D2D2D]"
          >
            <PlusIcon className="size-3.5" /> Add Test
          </button>
        </div>

        {showForm && (
          <div className="bg-[#F7F8FA] border border-[#E5E5EA] rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{editId ? "Edit Test" : `Test ${activeTests.length + 1}`}</h3>
              <button onClick={resetForm} className="text-[#A0A0A0] hover:text-[#1B1B1B]"><XMarkIcon className="size-4" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Test Name *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Hero headline test" className={inputClass} autoFocus />
              </div>
              <div>
                <label className={labelClass}>Metric *</label>
                <input type="text" value={metric} onChange={(e) => setMetric(e.target.value)} placeholder="e.g., Conversion rate" className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <div className="flex items-center gap-1.5 mt-1">
                {(["ideation", "scheduled", "live", "complete"] as const).map((s) => (
                  <button key={s} onClick={() => setStatus(s)} className={`px-3 py-1.5 text-[11px] font-medium rounded-lg transition-colors ${status === s ? "bg-[#1B1B1B] text-white" : "bg-white text-[#7A7A7A] border border-[#E5E5EA]"}`}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            {status === "complete" && (
              <div>
                <label className={labelClass}>Result</label>
                <div className="flex items-center gap-1.5 mt-1">
                  {(["winner", "loser", "inconclusive"] as const).map((r) => (
                    <button key={r} onClick={() => setResult(r)} className={`px-3 py-1.5 text-[11px] font-medium rounded-lg transition-colors ${result === r ? r === "winner" ? "bg-emerald-500 text-white" : r === "loser" ? "bg-red-500 text-white" : "bg-amber-500 text-white" : "bg-white text-[#7A7A7A] border border-[#E5E5EA]"}`}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {status !== "ideation" && (
              <div>
                <label className={labelClass}>Metrics Snapshot</label>
                <div className="grid grid-cols-3 gap-3 mt-1">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold text-[#999] uppercase">CVR</p>
                    <input type="text" value={cvrA} onChange={(e) => setCvrA(e.target.value)} placeholder="Var A" className={inputClass} />
                    <input type="text" value={cvrB} onChange={(e) => setCvrB(e.target.value)} placeholder="Var B" className={inputClass} />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold text-[#999] uppercase">AOV</p>
                    <input type="text" value={aovA} onChange={(e) => setAovA(e.target.value)} placeholder="Var A" className={inputClass} />
                    <input type="text" value={aovB} onChange={(e) => setAovB(e.target.value)} placeholder="Var B" className={inputClass} />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold text-[#999] uppercase">RPV</p>
                    <input type="text" value={rpvA} onChange={(e) => setRpvA(e.target.value)} placeholder="Var A" className={inputClass} />
                    <input type="text" value={rpvB} onChange={(e) => setRpvB(e.target.value)} placeholder="Var B" className={inputClass} />
                  </div>
                </div>
              </div>
            )}
            {portal.intelligems_key && (
              <div>
                <label className={labelClass}>Intelligems Test ID</label>
                <div className="flex items-center gap-2">
                  <input type="text" value={igTestId} onChange={(e) => setIgTestId(e.target.value)} placeholder="Paste test ID" className={inputClass + " flex-1"} />
                  <button onClick={fetchIgMetrics} disabled={!igTestId.trim() || igFetching} className="px-3 py-2 text-[11px] font-medium bg-[#F3F3F5] text-[#555] rounded-lg hover:bg-[#E5E5EA] disabled:opacity-30 whitespace-nowrap">
                    {igFetching ? "Pulling..." : "Pull Metrics"}
                  </button>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Figma URL</label>
                <input type="text" value={figmaUrl} onChange={(e) => setFigmaUrl(e.target.value)} placeholder="https://figma.com/..." className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Start Date</label>
                <input type="text" value={startDate} onChange={(e) => setStartDate(e.target.value)} placeholder="e.g., 5 Mar" className={inputClass} />
              </div>
            </div>
            <button onClick={() => { if (!name.trim() || !metric.trim()) return; handleSave(); }} disabled={!name.trim() || !metric.trim()} className="flex items-center gap-1.5 px-4 py-2 bg-[#1B1B1B] text-white text-xs font-medium rounded-lg disabled:opacity-40">
              <CheckIcon className="size-3.5" /> {editId ? "Update" : "Add Test"}
            </button>
          </div>
        )}

        {/* Test list — numbered */}
        <div className="space-y-2">
          {activeTests.map((test, idx) => {
            const statusStyles: Record<string, string> = {
              ideation: "bg-purple-50 text-purple-600 border-purple-200",
              scheduled: "bg-blue-50 text-blue-600 border-blue-200",
              live: "bg-emerald-50 text-emerald-600 border-emerald-200",
              complete: "bg-[#F3F3F5] text-[#1B1B1B] border-[#E5E5EA]",
            };
            const nextStatus: Record<string, TestStatus> = { ideation: "scheduled", scheduled: "live", live: "complete", complete: "ideation" };
            const handleStatusCycle = async () => {
              const newStatus = nextStatus[test.status];
              const updated = tests.map(t => t.id === test.id ? { ...t, status: newStatus, ...(newStatus !== "complete" ? { result: undefined } : {}) } : t);
              await onUpdateResults(updated);
            };
            const hasMetrics = test.cvr || test.aov || test.rpv;
            return (
              <div key={test.id} className="bg-white border border-[#E5E5EA] rounded-lg group/card overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-bold text-[#CCC]">#{idx + 1}</span>
                    <p className="text-[13px] font-semibold text-[#1B1B1B] truncate">{test.name}</p>
                    {test.status === "complete" && test.result && (
                      <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full shrink-0 ${
                        test.result === "winner" ? "bg-emerald-50 text-emerald-600" : test.result === "loser" ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-600"
                      }`}>{test.result}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={handleStatusCycle} className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-full border transition-colors ${statusStyles[test.status] || ""}`}>
                      {test.status === "live" && <span className="inline-block size-1.5 rounded-full bg-emerald-500 mr-1 align-middle" />}
                      {test.status}
                    </button>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(test)} className="p-1 text-[#B0B0B0] hover:text-[#1B1B1B]"><svg className="size-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" /></svg></button>
                      <button onClick={() => handleDeleteTest(test.id)} className={`p-1 transition-colors ${confirmDeleteId === test.id ? "text-red-500" : "text-[#B0B0B0] hover:text-red-400"}`}><TrashIcon className="size-3.5" /></button>
                    </div>
                  </div>
                </div>
                <div className="px-4 pb-3">
                  <p className="text-[11px] text-[#999]">{test.metric}{test.startDate ? ` · ${test.startDate}` : ""}</p>
                </div>
                {hasMetrics && (
                  <div className="border-t border-[#F0F0F0] px-4 py-3 grid grid-cols-3 gap-4">
                    {[{ label: "CVR", data: test.cvr }, { label: "AOV", data: test.aov }, { label: "RPV", data: test.rpv }].map(({ label: ml, data }) => {
                      const lift = data ? calcLift(data.a, data.b) : null;
                      return (
                        <div key={ml}>
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-[#BBB] mb-1.5">{ml}</p>
                          {data ? (
                            <div className="flex items-baseline gap-1.5 flex-wrap">
                              <span className="text-[11px] text-[#999]">{data.a}</span>
                              <span className="text-[10px] text-[#CCC]">→</span>
                              <span className="text-[12px] font-semibold text-[#1B1B1B]">{data.b}</span>
                              {lift && <span className={`text-[10px] font-semibold ${lift.positive ? "text-emerald-500" : "text-red-400"}`}>{lift.value}</span>}
                            </div>
                          ) : <span className="text-[11px] text-[#DDD]">—</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
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
        </div>

        {activeTests.length === 0 && !showForm && (
          <div className="border border-dashed border-[#E5E5EA] rounded-lg p-8 text-center">
            <p className="text-sm text-[#7A7A7A] mb-1">No tests yet</p>
            <p className="text-xs text-[#A0A0A0]">Add your first test to start iterating</p>
          </div>
        )}

        {trashedTests.length > 0 && (
          <div className="border border-[#E5E5EA] rounded-lg p-4 bg-[#FAFAFA]">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-3">Trash</p>
            <div className="space-y-2">
              {trashedTests.map(t => (
                <div key={t.id} className="flex items-center justify-between px-3 py-2 bg-white rounded border border-[#E5E5EA]">
                  <p className="text-xs text-[#777]">{t.name}</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleRestore(t.id)} className="text-[10px] text-emerald-600 hover:text-emerald-700">Restore</button>
                    <button onClick={() => handlePermanentDelete(t.id)} className="text-[10px] text-red-400 hover:text-red-600">Delete Forever</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Retainer Testing View (monthly shell with weekly slots) ──
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

      {/* Tests Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A]">
          Tests ({activeTests.length})
        </h3>
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
              {(["ideation", "scheduled", "live", "complete"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`px-3 py-1.5 text-[11px] font-medium rounded-lg transition-colors ${
                    status === s ? "bg-[#1B1B1B] text-white" : "bg-white text-[#7A7A7A] border border-[#E5E5EA] hover:bg-[#F3F3F5]"
                  }`}
                >
                  {s === "ideation" ? "Ideation" : s === "scheduled" ? "Scheduled" : s === "live" ? "Live" : "Complete"}
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
          {/* Intelligems Link */}
          {portal.intelligems_key && (
            <div>
              <label className={labelClass}>Intelligems Test ID</label>
              <div className="flex items-center gap-2">
                <input type="text" value={igTestId} onChange={(e) => setIgTestId(e.target.value)} placeholder="Paste test ID from Intelligems" className={inputClass + " flex-1"} />
                <button
                  onClick={fetchIgMetrics}
                  disabled={!igTestId.trim() || igFetching}
                  className="px-3 py-2 text-[11px] font-medium bg-[#F3F3F5] text-[#555] rounded-lg hover:bg-[#E5E5EA] disabled:opacity-30 whitespace-nowrap"
                >
                  {igFetching ? "Pulling..." : "Pull Metrics"}
                </button>
              </div>
              <p className="text-[9px] text-[#CCC] mt-1">Paste the test ID to auto-pull CVR, AOV, RPV from Intelligems</p>
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

      {/* Monthly Progress */}
      {monthlyCapacity > 0 && (
        <div className="bg-white border border-[#E5E5EA] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-[#1A1A1A]">{currentMonth}</p>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-[#AAA]">
                {deliveredCount} delivered · {scheduledCount} scheduled · {ideationCount} ideation · {Math.max(0, monthlyCapacity - monthTests.length)} empty
              </span>
              {trashedTests.length > 0 && (
                <button onClick={() => setShowTrash(!showTrash)} className="text-[10px] text-[#CCC] hover:text-[#777]">
                  Trash ({trashedTests.length})
                </button>
              )}
            </div>
          </div>
          <div className="relative h-2 bg-[#F0F0F0] rounded-full overflow-hidden">
            {(deliveredCount + scheduledCount + ideationCount) > 0 && <div className="absolute left-0 top-0 h-full bg-purple-300 rounded-full" style={{ width: `${((deliveredCount + scheduledCount + ideationCount) / monthlyCapacity) * 100}%` }} />}
            {(deliveredCount + scheduledCount) > 0 && <div className="absolute left-0 top-0 h-full bg-blue-400 rounded-full" style={{ width: `${((deliveredCount + scheduledCount) / monthlyCapacity) * 100}%` }} />}
            {deliveredCount > 0 && <div className="absolute left-0 top-0 h-full bg-emerald-500 rounded-full" style={{ width: `${(deliveredCount / monthlyCapacity) * 100}%` }} />}
          </div>
          <div className="flex items-center gap-4 mt-2">
            <span className="flex items-center gap-1 text-[10px] text-[#777]"><span className="size-2 rounded-full bg-emerald-500" /> Delivered</span>
            <span className="flex items-center gap-1 text-[10px] text-[#777]"><span className="size-2 rounded-full bg-blue-400" /> Scheduled</span>
            <span className="flex items-center gap-1 text-[10px] text-[#777]"><span className="size-2 rounded-full bg-purple-300" /> Ideation</span>
            <span className="flex items-center gap-1 text-[10px] text-[#777]"><span className="size-2 rounded-full bg-[#F0F0F0]" /> Empty</span>
          </div>
        </div>
      )}

      {/* Needs Attention */}
      {needsAttention.length > 0 && (
        <div className="bg-amber-50/50 border border-amber-200 rounded-lg px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 mb-1.5">
            {needsAttention.length} item{needsAttention.length !== 1 ? "s" : ""} need attention
          </p>
          <div className="space-y-1">
            {needsAttention.map((item, i) => (
              <p key={i} className="text-xs text-amber-700">• {item.message}</p>
            ))}
          </div>
        </div>
      )}

      {/* Tests grouped by week */}
      {sortedWeeks.map((weekLabel) => {
        const weekTests = weekGroups[weekLabel].filter(t => !(t as any).deleted_at);
        if (weekTests.length === 0 && slotsPerWeek === 0) return null;
        return (
          <div key={weekLabel}>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#7A7A7A] mb-3">{weekLabel}</p>
            <div className="space-y-2">
              {weekTests.map((test) => {
                const statusStyles: Record<string, string> = {
                  ideation: "bg-purple-50 text-purple-600 border-purple-200",
                  scheduled: "bg-blue-50 text-blue-600 border-blue-200",
                  live: "bg-emerald-50 text-emerald-600 border-emerald-200",
                  complete: "bg-[#F3F3F5] text-[#1B1B1B] border-[#E5E5EA]",
                };
                const nextStatus: Record<string, TestStatus> = { ideation: "scheduled", scheduled: "live", live: "complete", complete: "ideation" };
                const handleStatusCycle = async () => {
                  const newStatus = nextStatus[test.status];
                  const updated = tests.map((t) => t.id === test.id ? { ...t, status: newStatus, ...(newStatus !== "complete" ? { result: undefined } : {}) } : t);
                  await onUpdateResults(updated);
                };
                const hasMetrics = test.cvr || test.aov || test.rpv;
                return (
                  <div key={test.id} className="bg-white border border-[#E5E5EA] rounded-lg group/card overflow-hidden">
                    <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-[13px] font-semibold text-[#1B1B1B] truncate">{test.name}</p>
                        {test.status === "complete" && test.result && (
                          <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full shrink-0 ${
                            test.result === "winner" ? "bg-emerald-50 text-emerald-600" :
                            test.result === "loser" ? "bg-red-50 text-red-500" :
                            "bg-amber-50 text-amber-600"
                          }`}>{test.result}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={handleStatusCycle} className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-full border transition-colors ${statusStyles[test.status]}`}>
                          {test.status === "live" && <span className="inline-block size-1.5 rounded-full bg-emerald-500 mr-1 align-middle" />}
                          {test.status}
                        </button>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity">
                          <button onClick={() => handleEdit(test)} className="p-1 text-[#B0B0B0] hover:text-[#1B1B1B]" title="Edit">
                            <svg className="size-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" /></svg>
                          </button>
                          <button
                            onClick={() => handleDeleteTest(test.id)}
                            className={`p-1 transition-colors ${confirmDeleteId === test.id ? "text-red-500" : "text-[#B0B0B0] hover:text-red-400"}`}
                            title={confirmDeleteId === test.id ? "Click again to confirm" : "Delete"}
                          >
                            <TrashIcon className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="px-4 pb-3">
                      <p className="text-[11px] text-[#999]">
                        {test.metric}
                        <span className="text-[#D0D0D0] mx-1.5">·</span>
                        {test.startDate}{test.endDate ? ` – ${test.endDate}` : ""}
                      </p>
                    </div>
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
                                  {lift && <span className={`text-[10px] font-semibold ${lift.positive ? "text-emerald-500" : "text-red-400"}`}>{lift.value}</span>}
                                </div>
                              ) : <span className="text-[11px] text-[#DDD]">—</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}
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
              {/* Empty slots */}
              {slotsPerWeek > 0 && Array.from({ length: Math.max(0, slotsPerWeek - weekTests.length) }).map((_, i) => (
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
        );
      })}

      {/* Trash bin */}
      {trashedTests.length > 0 && (
        <div className="border border-[#E5E5EA] rounded-lg p-4 bg-[#FAFAFA]">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-3">Trash</p>
          <div className="space-y-2">
            {trashedTests.map(t => (
              <div key={t.id} className="flex items-center justify-between px-3 py-2 bg-white rounded border border-[#E5E5EA]">
                <p className="text-xs text-[#777]">{t.name}</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleRestore(t.id)} className="text-[10px] text-emerald-600 hover:text-emerald-700">Restore</button>
                  <button onClick={() => handlePermanentDelete(t.id)} className="text-[10px] text-red-400 hover:text-red-600">Delete Forever</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTests.length === 0 && !showForm && slotsPerWeek === 0 && (
        <div className="border border-dashed border-[#E5E5EA] rounded-lg p-8 text-center">
          <p className="text-sm text-[#7A7A7A] mb-1">No tests yet</p>
          <p className="text-xs text-[#A0A0A0]">Select a testing tier and add your first test</p>
        </div>
      )}
    </div>
  );
}

/* ── Development Section (Page Reviews) ── */

function DevelopmentSection({
  portal,
  pageReviews,
  pageReviewVersions,
  pageReviewFeedback,
  onReload,
}: {
  portal: PortalData;
  pageReviews: DesignReview[];
  pageReviewVersions: Record<string, DesignReviewVersion[]>;
  pageReviewFeedback: Record<string, DesignReviewFeedback[]>;
  onReload: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [pageName, setPageName] = useState("");
  const [stagingUrl, setStagingUrl] = useState("");
  const [pageDesc, setPageDesc] = useState("");
  const [activeReviewId, setActiveReviewId] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Sync activeReviewId when pageReviews change
  useEffect(() => {
    if (pageReviews.length > 0 && (!activeReviewId || !pageReviews.find((r) => r.id === activeReviewId))) {
      setActiveReviewId(pageReviews[0].id);
    }
  }, [pageReviews, activeReviewId]);

  const handleCreatePageReview = async () => {
    if (!pageName.trim() || !stagingUrl.trim()) return;
    const review = await createReview({
      portal_id: portal.id,
      title: pageName.trim(),
      description: pageDesc.trim(),
      review_type: "page",
    });
    // Add first version with staging URL
    await addVersion({
      review_id: review.id,
      version_number: 1,
      figma_url: "",
      staging_url: stagingUrl.trim(),
      notes: "",
    });
    setPageName("");
    setStagingUrl("");
    setPageDesc("");
    setShowForm(false);
    onReload();
  };

  const handleDeletePageReview = async (id: string) => {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      return;
    }
    await deleteReview(id);
    setConfirmDelete(null);
    onReload();
  };

  const handleAddVersion = async (reviewId: string, url: string) => {
    const versions = pageReviewVersions[reviewId] || [];
    await addVersion({
      review_id: reviewId,
      version_number: versions.length + 1,
      figma_url: "",
      staging_url: url.trim(),
      notes: "",
    });
    onReload();
  };

  const activeReview = pageReviews.find((r) => r.id === activeReviewId);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#1B1B1B]">Page Reviews</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium bg-[#1B1B1B] text-white rounded-lg hover:bg-[#2D2D2D]"
        >
          + New Page Review
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="border border-[#E5E5EA] rounded-lg p-4 bg-white space-y-3">
          <div>
            <label className={labelClass}>Page Name</label>
            <input
              type="text"
              value={pageName}
              onChange={(e) => setPageName(e.target.value)}
              className={inputClass}
              placeholder="e.g. Homepage, PDP, Collection..."
            />
          </div>
          <div>
            <label className={labelClass}>Staging URL</label>
            <input
              type="url"
              value={stagingUrl}
              onChange={(e) => setStagingUrl(e.target.value)}
              className={inputClass}
              placeholder="https://staging.mystore.com/..."
            />
          </div>
          <div>
            <label className={labelClass}>Description (optional)</label>
            <input
              type="text"
              value={pageDesc}
              onChange={(e) => setPageDesc(e.target.value)}
              className={inputClass}
              placeholder="What to review..."
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreatePageReview}
              disabled={!pageName.trim() || !stagingUrl.trim()}
              className="px-4 py-2 text-xs font-medium bg-[#1B1B1B] text-white rounded-lg disabled:opacity-30"
            >
              Create
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-xs text-[#7A7A7A]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Review selector pills */}
      {pageReviews.length > 1 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {pageReviews.map((r) => (
            <button
              key={r.id}
              onClick={() => setActiveReviewId(r.id)}
              className={`px-3 py-1.5 text-[11px] font-medium rounded-full transition-colors ${
                activeReviewId === r.id
                  ? "bg-[#1B1B1B] text-white"
                  : "bg-[#F3F3F5] text-[#7A7A7A] hover:bg-[#E5E5EA]"
              }`}
            >
              {r.title}
              {r.status === "approved" && " ✓"}
              {r.status === "changes_requested" && " !"}
            </button>
          ))}
        </div>
      )}

      {/* Active review — version control */}
      {activeReview && (() => {
        const versions = pageReviewVersions[activeReview.id] || [];
        const feedback = pageReviewFeedback[activeReview.id] || [];
        const latestVersion = versions[versions.length - 1];

        return (
          <div className="border border-[#E8E8E8] rounded-xl bg-white overflow-hidden">
            {/* Page Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#F0F0F0]">
              <div>
                <p className="text-sm font-semibold text-[#1A1A1A]">{activeReview.title}</p>
                {activeReview.description && (
                  <p className="text-xs text-[#7A7A7A] mt-0.5">{activeReview.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={activeReview.status}
                  onChange={async (e) => {
                    await updateReviewStatus(activeReview.id, e.target.value as "pending" | "approved" | "changes_requested");
                    onReload();
                  }}
                  className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full border bg-white cursor-pointer"
                >
                  <option value="pending">In Review</option>
                  <option value="approved">Approved</option>
                  <option value="changes_requested">Changes Requested</option>
                </select>
                <button
                  onClick={() => handleDeletePageReview(activeReview.id)}
                  className={`px-2.5 py-1 text-[10px] font-medium rounded-lg transition-colors ${
                    confirmDelete === activeReview.id
                      ? "bg-red-500 text-white"
                      : "text-[#CCC] hover:text-red-500"
                  }`}
                >
                  {confirmDelete === activeReview.id ? "Confirm" : "Delete"}
                </button>
              </div>
            </div>

            {/* Version History */}
            <div className="px-5 py-3">
              {versions.length > 0 ? (
                <div className="space-y-2">
                  {[...versions].reverse().map((v) => {
                    const isLatest = v.id === latestVersion?.id;
                    const vDate = new Date(v.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
                    return (
                      <div key={v.id} className={`flex items-center justify-between p-3 rounded-lg ${isLatest ? "bg-[#F7F8FA] border border-[#E5E5EA]" : "bg-white"}`}>
                        <div className="flex items-center gap-3">
                          <span className={`inline-flex items-center justify-center size-7 rounded-full text-[11px] font-bold ${isLatest ? "bg-[#1A1A1A] text-white" : "bg-[#F0F0F0] text-[#777]"}`}>
                            V{v.version_number}
                          </span>
                          <div>
                            <p className="text-xs font-medium text-[#1A1A1A]">
                              Version {v.version_number}
                              {isLatest && <span className="ml-2 text-[10px] text-emerald-600 font-semibold">Latest</span>}
                            </p>
                            <p className="text-[10px] text-[#AAA]">{vDate}{v.notes ? ` — ${v.notes}` : ""}</p>
                          </div>
                        </div>
                        {v.staging_url && (
                          <a
                            href={v.staging_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-[#777] border border-[#E5E5EA] rounded-lg hover:text-[#1A1A1A] hover:border-[#999] transition-colors"
                          >
                            <svg className="size-3" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5zm7.25-.75a.75.75 0 01.75-.75h3.5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0V6.31l-5.47 5.47a.75.75 0 01-1.06-1.06l5.47-5.47H12.25a.75.75 0 01-.75-.75z" clipRule="evenodd" />
                            </svg>
                            Open
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-[#AAA] text-center py-4">No versions yet</p>
              )}

              {/* Add new version inline */}
              <AddVersionForm onAdd={(url) => handleAddVersion(activeReview.id, url)} />
            </div>

            {/* Feedback */}
            {feedback.length > 0 && (
              <div className="px-5 py-3 border-t border-[#F0F0F0] bg-[#FAFAFA]">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-2">Client Feedback</p>
                <div className="space-y-2">
                  {feedback.map((item) => (
                    <div key={item.id} className="flex items-start gap-2">
                      <div className={`size-2 rounded-full mt-1.5 shrink-0 ${item.resolved ? "bg-emerald-400" : "bg-amber-400"}`} />
                      <div className="flex-1">
                        <p className="text-xs text-[#1A1A1A]">{item.comment}</p>
                        <p className="text-[10px] text-[#AAA]">
                          {item.submitted_by} · {new Date(item.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          await updateFeedbackResolved(item.id, !item.resolved);
                          onReload();
                        }}
                        className={`text-[10px] font-medium px-2 py-0.5 rounded transition-colors ${
                          item.resolved ? "text-emerald-600 hover:text-[#777]" : "text-[#AAA] hover:text-emerald-600"
                        }`}
                      >
                        {item.resolved ? "Resolved" : "Resolve"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Empty state */}
      {pageReviews.length === 0 && !showForm && (
        <div className="border border-dashed border-[#E5E5EA] rounded-lg p-8 text-center">
          <p className="text-sm text-[#7A7A7A] mb-1">No page reviews yet</p>
          <p className="text-xs text-[#A0A0A0]">Add a staging URL to start collecting feedback</p>
        </div>
      )}
    </div>
  );
}

function AddVersionForm({ onAdd }: { onAdd: (url: string) => void }) {
  const [show, setShow] = useState(false);
  const [url, setUrl] = useState("");

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        className="mt-3 text-[11px] text-[#7A7A7A] hover:text-[#1B1B1B] transition-colors"
      >
        + Add new version
      </button>
    );
  }

  return (
    <div className="mt-3 flex items-center gap-2">
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="New staging URL..."
        className="flex-1 px-2 py-1.5 text-xs border border-[#E5E5EA] rounded"
      />
      <button
        onClick={() => { onAdd(url); setUrl(""); setShow(false); }}
        disabled={!url.trim()}
        className="px-3 py-1.5 text-[10px] font-medium bg-[#1B1B1B] text-white rounded disabled:opacity-30"
      >
        Add
      </button>
      <button
        onClick={() => { setShow(false); setUrl(""); }}
        className="text-[10px] text-[#7A7A7A]"
      >
        Cancel
      </button>
    </div>
  );
}

/* ── Team Assignment ── */
function TeamAssignment({ portal, onUpdateField }: { portal: PortalData; onUpdateField: (field: string, value: unknown) => void }) {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const assigned = portal.team_member_ids || [];
  // Filter to only valid IDs
  const validAssigned = assigned.filter(id => team.some(m => m.id === id));

  useEffect(() => {
    loadSettings().then((s) => {
      setTeam(s.team || []);
      // Auto-clean orphaned IDs
      const validIds = new Set((s.team || []).map(m => m.id));
      const currentAssigned = portal.team_member_ids || [];
      const cleaned = currentAssigned.filter(id => validIds.has(id));
      if (cleaned.length !== currentAssigned.length) {
        onUpdateField("team_member_ids", cleaned);
      }
    });
  }, []);

  const addMember = (id: string) => {
    if (!id || validAssigned.includes(id)) return;
    onUpdateField("team_member_ids", [...validAssigned, id]);
  };

  const removeMember = (id: string) => {
    onUpdateField("team_member_ids", validAssigned.filter(m => m !== id));
  };

  if (team.length === 0) return null;

  const unassigned = team.filter(m => !validAssigned.includes(m.id));

  return (
    <div className="py-2">
      <p className="text-[11px] font-medium text-[#7A7A7A] mb-2">Team</p>

      {/* Assigned members */}
      {validAssigned.length > 0 && (
        <div className="space-y-1 mb-2">
          {validAssigned.map(id => {
            const m = team.find(t => t.id === id);
            if (!m) return null;
            return (
              <div key={m.id} className="flex items-center gap-2 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="size-1.5 rounded-full bg-emerald-500" />
                <span className="text-[11px] font-medium text-emerald-700">{m.name}</span>
                <span className="text-[9px] text-emerald-500 ml-auto">{m.role}</span>
                <button
                  onClick={() => removeMember(m.id)}
                  className="text-emerald-300 hover:text-red-400 transition-colors ml-1"
                >
                  <svg className="size-3" viewBox="0 0 20 20" fill="currentColor"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add dropdown */}
      {unassigned.length > 0 && (
        <select
          value=""
          onChange={(e) => addMember(e.target.value)}
          className="w-full text-[11px] text-[#777] px-2.5 py-1.5 border border-[#E5E5EA] rounded-lg bg-white cursor-pointer"
        >
          <option value="">+ Add team member...</option>
          {unassigned.map(m => (
            <option key={m.id} value={m.id}>{m.name} — {m.role}</option>
          ))}
        </select>
      )}
    </div>
  );
}

/* ── Client Details Panel (inline editable) ── */
function ClientDetailsPanel({ portal, team, onUpdateField }: { portal: PortalData; team: TeamMember[]; onUpdateField: (field: string, value: unknown) => void }) {
  const [editingSlack, setEditingSlack] = useState(false);
  const [slackVal, setSlackVal] = useState(portal.slack_channel_url || "");
  const [editingTp, setEditingTp] = useState(false);
  const [tpDate, setTpDate] = useState(portal.next_touchpoint?.date || "");
  const [tpDesc, setTpDesc] = useState(portal.next_touchpoint?.description || "");
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailVal, setEmailVal] = useState(portal.client_email || "");

  const assigned = (portal.team_member_ids || []).map(id => team.find(t => t.id === id)).filter(Boolean) as TeamMember[];
  const designers = assigned.filter(m => m.role.toLowerCase().includes("design"));
  const devs = assigned.filter(m => m.role.toLowerCase().includes("develop") || m.role.toLowerCase().includes("head of dev"));

  const allDesigners = team.filter(m => m.role.toLowerCase().includes("design"));
  const allDevs = team.filter(m => m.role.toLowerCase().includes("develop") || m.role.toLowerCase().includes("head of dev"));

  const addMember = (id: string) => {
    const current = portal.team_member_ids || [];
    if (current.includes(id)) return;
    onUpdateField("team_member_ids", [...current, id]);
  };
  const removeMember = (id: string) => {
    onUpdateField("team_member_ids", (portal.team_member_ids || []).filter(m => m !== id));
  };

  return (
    <div className="border border-[#E5E5EA] rounded-xl bg-white divide-y divide-[#F0F0F0] mb-6 overflow-hidden">
      {/* Designers */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-[#777]">Designers</p>
          <div className="flex flex-wrap gap-1.5 items-center justify-end">
            {designers.map(m => (
              <span key={m.id} className="inline-flex items-center gap-1 text-[10px] font-medium text-[#1A1A1A] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                {m.name}
                <button onClick={() => removeMember(m.id)} className="text-emerald-300 hover:text-red-400"><svg className="size-2.5" viewBox="0 0 20 20" fill="currentColor"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg></button>
              </span>
            ))}
            {allDesigners.filter(m => !designers.some(d => d.id === m.id)).length > 0 && (
              <select
                value=""
                onChange={(e) => { if (e.target.value) addMember(e.target.value); }}
                className="text-[10px] text-[#AAA] bg-transparent border-none cursor-pointer p-0 focus:outline-none"
              >
                <option value="">+ Add</option>
                {allDesigners.filter(m => !designers.some(d => d.id === m.id)).map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            )}
            {designers.length === 0 && allDesigners.length === 0 && <span className="text-[10px] text-[#CCC]">No designers in directory</span>}
          </div>
        </div>
      </div>

      {/* Developers */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-[#777]">Developers</p>
          <div className="flex flex-wrap gap-1.5 items-center justify-end">
            {devs.map(m => (
              <span key={m.id} className="inline-flex items-center gap-1 text-[10px] font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                {m.name}
                <button onClick={() => removeMember(m.id)} className="text-blue-300 hover:text-red-400"><svg className="size-2.5" viewBox="0 0 20 20" fill="currentColor"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg></button>
              </span>
            ))}
            {allDevs.filter(m => !devs.some(d => d.id === m.id)).length > 0 && (
              <select
                value=""
                onChange={(e) => { if (e.target.value) addMember(e.target.value); }}
                className="text-[10px] text-[#AAA] bg-transparent border-none cursor-pointer p-0 focus:outline-none"
              >
                <option value="">+ Add</option>
                {allDevs.filter(m => !devs.some(d => d.id === m.id)).map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            )}
            {devs.length === 0 && allDevs.length === 0 && <span className="text-[10px] text-[#CCC]">No developers in directory</span>}
          </div>
        </div>
      </div>

      {/* Slack Channel */}
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-xs font-medium text-[#777]">Slack Channel</p>
        {editingSlack ? (
          <div className="flex items-center gap-2">
            <input type="text" value={slackVal} onChange={(e) => setSlackVal(e.target.value)} className="text-xs font-mono px-2 py-1 border border-[#E5E5EA] rounded w-40" placeholder="C0XXXXXXX" autoFocus />
            <button onClick={() => { onUpdateField("slack_channel_url", slackVal); setEditingSlack(false); }} className="text-[10px] font-medium text-emerald-600">Save</button>
            <button onClick={() => { setSlackVal(portal.slack_channel_url || ""); setEditingSlack(false); }} className="text-[10px] text-[#AAA]">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setEditingSlack(true)} className="text-xs text-[#1A1A1A] font-mono hover:text-blue-600 transition-colors">
            {portal.slack_channel_url || <span className="text-[#CCC]">Click to set</span>}
          </button>
        )}
      </div>

      {/* Next Touchpoint (auto-calculated) */}
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-xs font-medium text-[#777]">Next Touchpoint</p>
        {(() => {
          const nextDate = getNextTouchpointDate();
          if (!nextDate) return <span className="text-[10px] text-[#CCC]">No touchpoint days set</span>;
          const days = Math.ceil((new Date(nextDate + "T00:00:00").getTime() - Date.now()) / 86400000);
          const dayName = new Date(nextDate + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
          return (
            <p className={`text-xs font-medium ${days === 0 ? "text-emerald-600" : days === 1 ? "text-amber-600" : "text-[#1A1A1A]"}`}>
              {dayName}
              <span className="ml-1.5 text-[10px] font-normal text-[#AAA]">{days === 0 ? "Today" : days === 1 ? "Tomorrow" : `in ${days}d`}</span>
            </p>
          );
        })()}
      </div>

    </div>
  );
}

/* ─── Reports Section ─── */
function ReportsSection({
  reports,
  onUpdate,
}: {
  reports: PortalReport[];
  onUpdate: (reports: PortalReport[]) => Promise<void>;
}) {
  const [showUpload, setShowUpload] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [extractedHtml, setExtractedHtml] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("File too large. Max 5MB.");
      return;
    }
    setUploading(true);
    setFileName(file.name);
    try {
      const mammoth = await import("mammoth");
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml(
        { arrayBuffer },
        {
          convertImage: mammoth.images.imgElement(function (image: any) {
            return image.read("base64").then(function (imageBuffer: string) {
              return { src: `data:${image.contentType};base64,${imageBuffer}` };
            });
          }),
        }
      );
      // Auto-replace author names with agency name
      // Handles both plain text and HTML-spanning cases
      let cleaned = result.value;
      // Plain text within a single element
      cleaned = cleaned.replace(
        /((?:prepared|written|authored|compiled|created)\s+by)\s+[^<\n]+/gi,
        "$1 Ecomlanders"
      );
      // Also handle cases where name might be in nested tags (e.g. <strong>)
      cleaned = cleaned.replace(
        /((?:Prepared|Written|Authored|Compiled|Created)\s+by)\s*(<[^>]+>)*\s*Dan\s+Redgewell[^<]*/gi,
        "$1 Ecomlanders"
      );
      setExtractedHtml(cleaned);
      if (!title) {
        const nameWithoutExt = file.name.replace(/\.docx?$/i, "").replace(/[-_]/g, " ");
        setTitle(nameWithoutExt);
      }
    } catch (err) {
      console.error("Failed to extract .docx:", err);
      alert("Failed to read .docx file. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(published: boolean) {
    if (!extractedHtml || !title) return;
    setSaving(true);
    const report: PortalReport = {
      id: crypto.randomUUID(),
      title,
      date,
      content: extractedHtml,
      published,
      created_at: new Date().toISOString(),
    };
    await onUpdate([report, ...reports]);
    setShowUpload(false);
    setTitle("");
    setDate(new Date().toISOString().slice(0, 10));
    setExtractedHtml("");
    setFileName("");
    setSaving(false);
  }

  async function togglePublish(id: string) {
    const updated = reports.map((r) =>
      r.id === id ? { ...r, published: !r.published } : r
    );
    await onUpdate(updated);
  }

  async function deleteReport(id: string) {
    if (!confirm("Delete this report?")) return;
    await onUpdate(reports.filter((r) => r.id !== id));
    if (previewId === id) setPreviewId(null);
  }

  const previewReport = previewId ? reports.find((r) => r.id === previewId) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold tracking-tight">Reports</h2>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#1B1B1B] text-white rounded-lg hover:bg-[#333] transition-colors"
        >
          <PlusIcon className="size-3.5" />
          Upload Report
        </button>
      </div>

      {showUpload && (
        <div className="border border-[#E5E5EA] rounded-xl p-5 space-y-4 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Report Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Week 13 CRO Report"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Upload .docx</label>
            <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-[#E5E5EA] rounded-lg cursor-pointer hover:border-[#1B1B1B] transition-colors">
              <input
                type="file"
                accept=".docx"
                onChange={handleFile}
                className="hidden"
              />
              {uploading ? (
                <span className="text-xs text-[#7A7A7A]">Extracting content...</span>
              ) : fileName ? (
                <span className="text-xs text-[#1B1B1B] font-medium">{fileName}</span>
              ) : (
                <span className="text-xs text-[#7A7A7A]">Click to select .docx file (max 5MB)</span>
              )}
            </label>
          </div>

          {extractedHtml && (
            <>
              <div>
                <label className={labelClass}>Preview</label>
                <BrandedReport title={title || "Untitled"} date={date} content={extractedHtml} />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSave(true)}
                  disabled={saving || !title}
                  className="px-4 py-2 text-xs font-medium bg-[#1B1B1B] text-white rounded-lg hover:bg-[#333] transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Publish"}
                </button>
                <button
                  onClick={() => handleSave(false)}
                  disabled={saving || !title}
                  className="px-4 py-2 text-xs font-medium bg-white border border-[#E5E5EA] text-[#1B1B1B] rounded-lg hover:bg-[#F7F8FA] transition-colors disabled:opacity-50"
                >
                  Save Draft
                </button>
                <button
                  onClick={() => {
                    setShowUpload(false);
                    setExtractedHtml("");
                    setFileName("");
                    setTitle("");
                  }}
                  className="px-4 py-2 text-xs font-medium text-[#7A7A7A] hover:text-[#1B1B1B] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {previewReport && (
        <div className="space-y-3">
          <button
            onClick={() => setPreviewId(null)}
            className="flex items-center gap-1 text-xs font-medium text-[#7A7A7A] hover:text-[#1B1B1B] transition-colors"
          >
            <ArrowLeftIcon className="size-3" /> Back to list
          </button>
          <BrandedReport
            title={previewReport.title}
            date={previewReport.date}
            content={previewReport.content}
          />
        </div>
      )}

      {!previewReport && reports.length === 0 && !showUpload && (
        <div className="text-center py-16 border border-dashed border-[#E5E5EA] rounded-xl">
          <p className="text-sm text-[#7A7A7A] mb-1">No reports yet</p>
          <p className="text-xs text-[#A0A0A0]">Upload a .docx to create a branded weekly report</p>
        </div>
      )}

      {!previewReport && reports.length > 0 && (
        <div className="space-y-2">
          {reports.map((report) => (
            <div
              key={report.id}
              className="flex items-center justify-between p-4 border border-[#E5E5EA] rounded-xl bg-white"
            >
              <div
                className="min-w-0 flex-1 cursor-pointer"
                onClick={() => setPreviewId(report.id)}
              >
                <p className="text-sm font-medium text-[#1B1B1B] truncate hover:underline">
                  {report.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-[#A0A0A0]">
                    {new Date(report.date + "T00:00:00").toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      report.published
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {report.published ? "Published" : "Draft"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-3">
                <button
                  onClick={() => togglePublish(report.id)}
                  className="px-2 py-1 text-[11px] font-medium text-[#7A7A7A] hover:text-[#1B1B1B] transition-colors"
                >
                  {report.published ? "Unpublish" : "Publish"}
                </button>
                <button
                  onClick={() => deleteReport(report.id)}
                  className="p-1 text-[#CCC] hover:text-red-500 transition-colors"
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
