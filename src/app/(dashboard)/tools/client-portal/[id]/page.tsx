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
  SparklesIcon,
  ChevronDownIcon,
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
// review-types used via reviews.ts
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
  BlockerHistory,
  ContextEntry,
  GateKey,
  FunnelDocument,
} from "@/lib/portal/types";
import { cyclePhaseStatus, canPhaseAdvance } from "@/lib/portal/phase-logic";
import { syncDeliverableToBoard } from "@/lib/portal/task-sync";
import { deliverableTypes } from "@/lib/config";
import { BrandedReport } from "@/components/branded-report";
import { InternalSection, GateStatusPills } from "@/components/internal-section";
import { GateChecklistForm } from "@/components/gate-checklist-form";
import { GATE_CONFIG } from "@/lib/portal/qa-gates";
import { RoadmapList } from "@/components/portal/roadmap-list";

// Mirror of GATE_KEY_TO_QA_KEY in portal-view.tsx — admin tab keys → qa_gates
// bucket keys, so Slack notifications for admin submissions carry the same
// gate key the team view uses.
const ADMIN_GATE_KEY_TO_QA_KEY: Record<string, string> = {
  "design-brief": "cro_brief",
  "dev-handover": "design_handoff",
  "dev-qa": "dev_handoff",
  "handoff-testing": "launch_prep",
};
import type {
  DesignReview,
  DesignReviewVersion,
  DesignReviewFeedback,
} from "@/lib/portal/review-types";

type DashTab = "overview" | "build" | "results" | "design-brief" | "dev-handover" | "dev-qa" | "handoff-testing";
type ClientTab = "projects" | "roadmap" | "context" | "tickets" | "funnels" | "settings";

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
  const [onboardingBrief, setOnboardingBrief] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [activeTab, setActiveTab] = useState<DashTab>("overview");
  const [defaultTabSet, setDefaultTabSet] = useState(false);
  const [copied, setCopied] = useState(false);
  const [clientTab, setClientTab] = useState<ClientTab>("projects");
  const [showBlockerModal, setShowBlockerModal] = useState(false);
  const [showResolveBlocker, setShowResolveBlocker] = useState(false);

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
        if (p.client_type === "retainer") {
          setActiveTab("results");
          setClientTab("roadmap");
        }
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
      // Load onboarding brief assigned to this portal
      try {
        const { onboardingStore } = await import("@/lib/onboarding");
        const allOnboarding = await onboardingStore.getAll();
        const brief = allOnboarding.find(s => s.assigned_portal_id === portalId && s.status === "approved");
        setOnboardingBrief(brief || null);
      } catch {}
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
    const result = cyclePhaseStatus(portal.phases, phaseId);
    if (!result.changed) return; // transition blocked by gating rules
    setPortal({ ...portal, phases: result.phases, current_phase: result.current_phase });
    await updatePortal(portal.id, { phases: result.phases, current_phase: result.current_phase });
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
    // Auto-sync typed scope items to task board as deliverables
    if (type) {
      syncDeliverableToBoard(portal.id, {
        id: `scope-${Date.now()}`,
        name: `${item.trim()} (${type})`,
        phase: type.toLowerCase().includes("design") ? "Design" : "Development",
        status: "not-started",
        assignee: "",
      }, portal.client_name);
    }
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
    const result = cyclePhaseStatus(selectedProject.phases || [], phaseId);
    if (!result.changed) return; // transition blocked by gating rules
    await updateSelectedProject({ phases: result.phases, current_phase: result.current_phase });
  };

  const handleProjectAddScope = async (item: string, type?: string) => {
    if (!selectedProject || !portal || !item.trim()) return;
    const newItem = type ? { description: item.trim(), type } : item.trim();
    await updateSelectedProject({ scope: [...(selectedProject.scope || []), newItem] });
    // Auto-sync typed scope items to task board
    if (type) {
      syncDeliverableToBoard(portal.id, {
        id: `scope-${Date.now()}`,
        name: `${item.trim()} (${type})`,
        phase: type.toLowerCase().includes("design") ? "Design" : "Development",
        status: "not-started",
        assignee: "",
      }, portal.client_name);
    }
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
            <div className="h-8 bg-surface-raised rounded w-1/3" />
            <div className="h-4 bg-surface-raised rounded w-2/3" />
            <div className="h-32 bg-surface-raised rounded" />
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
          <p className="text-subtle text-sm mb-6">
            This portal may have been deleted.
          </p>
          <button
            onClick={() => router.push("/tools/client-portal")}
            className="text-xs font-medium text-subtle hover:text-foreground"
          >
            Back to Portals
          </button>
        </div>
      </div>
    );
  }

  const openRequests = (portal.ad_hoc_requests || []).filter(r => r.status !== "done").length;

  const isRetainerPortal = portal.client_type === "retainer";

  // Project content tabs
  const dashTabs: { key: DashTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "build", label: "Build" },
    { key: "results", label: "Results" },
  ];

  // QA gate tabs — checklist forms the team completes at each stage
  const gateTabs: { key: DashTab; label: string }[] = [
    { key: "design-brief", label: "Design Brief" },
    { key: "dev-handover", label: "Dev Handover" },
    { key: "dev-qa", label: "Dev QA" },
    { key: "handoff-testing", label: "Handoff / Testing" },
  ];

  const allContextEntries = [
    ...(portal?.context_entries || []).map(e => ({ ...e, _project: "General" })),
    ...(portal?.projects || []).flatMap(p => (p.context_entries || []).map(e => ({ ...e, _project: p.name }))),
  ];
  const clientTabs: { key: ClientTab; label: string }[] = [
    ...(isRetainerPortal
      ? [{ key: "roadmap" as ClientTab, label: "Roadmap" }]
      : [{ key: "projects" as ClientTab, label: "Projects" }]),
    { key: "context", label: allContextEntries.length > 0 ? `Context (${allContextEntries.length})` : "Context" },
    ...(portalTickets.length > 0 ? [{ key: "tickets" as ClientTab, label: `Tickets (${portalTickets.filter(t => t.status !== "resolved" && !t.deleted_at).length})` }] : []),
    { key: "funnels", label: "Funnels" },
    { key: "settings", label: "Settings" },
  ];

  return (
    <div className="min-h-screen">
      <div className="mx-auto">

        {/* ═══ UNIFIED SIDEBAR LAYOUT ═══ */}
          <div className="flex min-h-screen">
            {/* Left sidebar */}
            <div className="w-52 shrink-0 border-r border-border sticky top-0 self-start h-screen flex flex-col">
              <div className="px-5 py-6 border-b border-border">
                <Link
                  href="/tools/client-portal"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-subtle hover:text-foreground transition-colors mb-3"
                >
                  <ArrowLeftIcon className="size-3" />
                  All Portals
                </Link>
                <h2 className="text-sm font-bold text-foreground truncate">{portal.client_name}</h2>
                <p className="text-[10px] text-muted mt-0.5">{isRetainerPortal ? "Retainer" : "Project"}</p>
              </div>
              <nav className="flex-1 px-3 py-4 overflow-y-auto">
                {/* Projects in sidebar */}
                <p className="text-[10px] font-semibold text-muted uppercase tracking-wider px-3 mb-2">Projects</p>
                {activeProjects.map((proj) => {
                  const idx = (portal.projects || []).findIndex(p => p.id === proj.id);
                  const isSelected = selectedProjectIdx === idx;
                  const isPendingDelete = confirmDeleteProjectId === proj.id;
                  return (
                    <div key={proj.id} className="group relative">
                      <button
                        onClick={() => {
                          if (isSelected) {
                            setSelectedProjectIdx(-1);
                            setClientTab("projects");
                          } else {
                            setSelectedProjectIdx(idx);
                            setActiveTab("overview");
                          }
                        }}
                        className={`w-full text-left px-3 py-2 text-[13px] font-medium rounded-lg transition-colors mb-0.5 ${
                          isSelected
                            ? "bg-white text-background"
                            : "text-muted hover:bg-background hover:text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2 pr-6">
                          <span className={`size-1.5 rounded-full shrink-0 ${proj.status === "active" ? "bg-success" : proj.status === "paused" ? "bg-warning" : "bg-muted"}`} />
                          <span className="truncate">{proj.name}</span>
                        </div>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteProject(proj.id); }}
                        onBlur={() => setConfirmDeleteProjectId(null)}
                        title={isPendingDelete ? "Click again to confirm" : "Archive project"}
                        className={`absolute right-1.5 top-1.5 p-1 rounded transition-all ${
                          isPendingDelete
                            ? "opacity-100 text-danger bg-danger/10"
                            : `opacity-0 group-hover:opacity-100 ${isSelected ? "text-white/50 hover:text-white hover:bg-surface/10" : "text-muted hover:text-danger hover:bg-danger/10"}`
                        }`}
                      >
                        <TrashIcon className="size-3" />
                      </button>
                      {isSelected && (
                        <div className="ml-5 pl-3 mb-2 border-l border-border">
                          {dashTabs.map((tab) => (
                            <button
                              key={tab.key}
                              onClick={() => setActiveTab(tab.key)}
                              className={`w-full text-left px-2.5 py-1.5 text-[12px] rounded-md transition-colors mb-0.5 ${
                                activeTab === tab.key
                                  ? "text-foreground font-medium bg-surface-raised"
                                  : "text-subtle hover:text-foreground hover:bg-background"
                              }`}
                            >
                              {tab.label}
                            </button>
                          ))}
                          {/* QA Gates */}
                          <p className="text-[9px] font-semibold text-muted uppercase tracking-wider px-2.5 mt-2 mb-1">Gates</p>
                          {gateTabs.map((tab) => {
                            const qaKeyMap: Record<string, string> = { "design-brief": "cro_brief", "dev-handover": "design_handoff", "dev-qa": "dev_handoff", "handoff-testing": "launch_prep" };
                            const qaKey = qaKeyMap[tab.key] as keyof typeof proj.qa_gates;
                            const gateData = proj.qa_gates?.[qaKey] as { status?: string } | undefined;
                            const gateStatus = gateData?.status === "submitted" ? "passed" : gateData ? "in-progress" : "not-started";
                            const dotColor = gateStatus === "passed" ? "bg-success" : gateStatus === "in-progress" ? "bg-warning" : "bg-muted";
                            return (
                              <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`w-full text-left px-2.5 py-1.5 text-[12px] rounded-md transition-colors mb-0.5 flex items-center gap-1.5 ${
                                  activeTab === tab.key
                                    ? "text-foreground font-medium bg-surface-raised"
                                    : "text-subtle hover:text-foreground hover:bg-background"
                                }`}
                              >
                                <span className={`size-1.5 rounded-full shrink-0 ${dotColor}`} />
                                {tab.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                <button
                  onClick={() => setShowAddProjectModal(true)}
                  className="w-full text-left px-3 py-1.5 text-[11px] text-muted hover:text-foreground transition-colors rounded-lg mb-2"
                >
                  + Add Project
                </button>

                {/* Divider */}
                <div className="border-t border-border my-3" />

                {/* Client-level tabs */}
                {clientTabs.filter(t => t.key !== "projects").map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => { setSelectedProjectIdx(-1); setClientTab(tab.key); }}
                    className={`w-full text-left px-3 py-2 text-[13px] font-medium rounded-lg transition-colors mb-0.5 ${
                      !selectedProject && clientTab === tab.key
                        ? "bg-white text-background"
                        : "text-muted hover:bg-background hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Right content */}
            <div className="flex-1 min-w-0">
              {/* Action bar */}
              <div className="flex items-center justify-end gap-2 px-6 md:px-12 py-4 border-b border-border">
                {portal.blocker ? (
                  <button
                    onClick={() => setShowResolveBlocker(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold bg-danger text-white rounded-lg hover:bg-danger/90 transition-colors"
                  >
                    <span className="size-1.5 rounded-full bg-surface animate-pulse" />
                    Blocked{(() => {
                      const d = Math.max(0, Math.floor((Date.now() - new Date(portal.blocker.since).getTime()) / 86400000));
                      return d > 0 ? ` · ${d}d` : "";
                    })()}
                  </button>
                ) : (
                  <button
                    onClick={() => setShowBlockerModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium bg-danger/10 text-danger rounded-lg hover:bg-danger/20 transition-colors"
                  >
                    <svg className="size-3" viewBox="0 0 20 20" fill="currentColor"><path d="M3.5 2.75a.75.75 0 00-1.5 0v14.5a.75.75 0 001.5 0v-4.392l1.657-.348a6.449 6.449 0 014.271.572 7.948 7.948 0 005.965.524l2.078-.64A.75.75 0 0018 11.75V3.885a.75.75 0 00-.962-.72l-2.367.728a6.449 6.449 0 01-4.846-.425 7.948 7.948 0 00-5.262-.703L3.5 2.98V2.75z" /></svg>
                    Flag
                  </button>
                )}
                <div className="w-px h-5 bg-border" />
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/portal/${portal.token}`;
                    navigator.clipboard.writeText(url);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium bg-white text-background rounded-lg hover:bg-border transition-colors"
                >
                  <ClipboardDocumentIcon className="size-3.5" />
                  {copied ? "Copied!" : "Client"}
                </button>
                <a
                  href={`/portal/${portal.token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium bg-white text-background rounded-lg hover:bg-border transition-colors"
                >
                  <ArrowTopRightOnSquareIcon className="size-3.5" />
                  Preview
                </a>
                <button
                  onClick={() => { load(); }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-success text-white text-[11px] font-semibold rounded-lg hover:bg-success transition-colors"
                >
                  <CheckIcon className="size-3.5" />
                  Save
                </button>
              </div>

              {/* Tab content */}
              <div className="max-w-3xl mx-auto px-6 md:px-12 py-10">

        {/* ── No project selected: show overview / retainer health ── */}
        {!selectedProject && clientTab === "projects" && (<>
          {/* Retainer Health Summary */}
          {isRetainerPortal && (() => {
            const tests = (portal.results || []).filter(t => !(t as any).deleted_at);
            const tierMonthlyMap: Record<string, number> = { T1: 4, T2: 8, T3: 16 };
            const capacity = tierMonthlyMap[portal.testing_tier || ""] || 0;
            const n = new Date();
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
                <div className="border border-border rounded-lg p-4 bg-surface">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-foreground">Retainer — {monthName}</p>
                    <span className="text-[10px] text-muted">{portal.testing_tier} · {delivered}/{capacity} delivered</span>
                  </div>
                  <div className="relative h-2 bg-surface-raised rounded-full overflow-hidden mb-2">
                    {totalFilled > 0 && <div className="absolute left-0 top-0 h-full bg-purple-300 rounded-full" style={{ width: `${(totalFilled / capacity) * 100}%` }} />}
                    {(delivered + scheduled) > 0 && <div className="absolute left-0 top-0 h-full bg-blue-400 rounded-full" style={{ width: `${((delivered + scheduled) / capacity) * 100}%` }} />}
                    {delivered > 0 && <div className="absolute left-0 top-0 h-full bg-emerald-500 rounded-full" style={{ width: `${(delivered / capacity) * 100}%` }} />}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1 text-[10px] text-muted"><span className="size-2 rounded-full bg-emerald-500" /> {delivered} delivered</span>
                    <span className="flex items-center gap-1 text-[10px] text-muted"><span className="size-2 rounded-full bg-blue-400" /> {scheduled} scheduled</span>
                    <span className="flex items-center gap-1 text-[10px] text-muted"><span className="size-2 rounded-full bg-purple-300" /> {ideation} ideation</span>
                    <span className="flex items-center gap-1 text-[10px] text-muted"><span className="size-2 rounded-full bg-surface-raised" /> {empty} empty</span>
                  </div>
                  {attention.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-[10px] font-semibold text-warning mb-1">⚠ {attention.length} test{attention.length !== 1 ? "s" : ""} need attention</p>
                      {attention.map(t => (
                        <p key={t.id} className="text-[10px] text-muted">• {t.name} — scheduled, not live</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Quick project overview cards */}
          <div className="space-y-3">
            {activeProjects.map((proj) => {
              const idx = (portal.projects || []).findIndex(p => p.id === proj.id);
              const startDate = proj.created_at ? new Date(proj.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
              return (
                <button
                  key={proj.id}
                  onClick={() => { setSelectedProjectIdx(idx); setActiveTab("overview"); }}
                  className="w-full text-left border border-border rounded-lg p-4 hover:bg-background transition-colors group/proj"
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-foreground">{proj.name}</p>
                    <span className={`size-2 rounded-full ${proj.status === "active" ? "bg-success" : proj.status === "paused" ? "bg-warning" : "bg-muted"}`} />
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] text-muted">
                      {proj.type === "retainer" ? "Retainer" : "Page Build"}
                      {startDate ? ` · Started ${startDate}` : ""}
                      {proj.current_phase ? ` · ${proj.current_phase}` : ""}
                    </p>
                    <GateStatusPills project={proj} />
                  </div>
                </button>
              );
            })}
            {activeProjects.length === 0 && (
              <div className="text-center py-12">
                {onboardingBrief ? (
                  <>
                    <div className="size-12 rounded-xl bg-white flex items-center justify-center mx-auto mb-4">
                      <svg className="size-6 text-background" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1">Onboarding brief ready</p>
                    <p className="text-xs text-subtle mb-4">Set up deliverables, dates, and team to get this project moving</p>
                    <Link
                      href={`/tools/project-kickoff?client=${encodeURIComponent(portal.client_name)}&portalId=${portal.id}`}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-background text-sm font-semibold rounded-lg hover:bg-foreground transition-colors"
                    >
                      <svg className="size-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
                      Quick Setup
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted mb-1">No projects yet</p>
                    <p className="text-xs text-muted mb-4">Add a project from the sidebar or set up via Project Kickoff</p>
                    <Link
                      href={`/tools/project-kickoff?client=${encodeURIComponent(portal.client_name)}&portalId=${portal.id}`}
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-muted border border-border rounded-lg hover:bg-background transition-colors"
                    >
                      Quick Setup
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Trash */}
          {trashedProjects.length > 0 && (
            <div className="mt-4 border border-border rounded-lg p-3 bg-background">
              <p className="text-[10px] font-semibold text-foreground mb-2">Trash ({trashedProjects.length})</p>
              <div className="space-y-1.5">
                {trashedProjects.map(proj => (
                  <div key={proj.id} className="flex items-center justify-between px-3 py-2 bg-surface rounded border border-border">
                    <p className="text-xs text-muted">{proj.name}</p>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleRestoreProject(proj.id)} className="text-[10px] text-success hover:text-success">Restore</button>
                      <button onClick={() => handlePermanentDeleteProject(proj.id)} className="text-[10px] text-danger hover:text-danger">Delete Forever</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>)}

        {/* ── Tickets tab ── */}
        {clientTab === "tickets" && portalTickets.length > 0 && (() => {
          const openTickets = portalTickets.filter(t => t.status !== "resolved" && !t.deleted_at);
          if (openTickets.length === 0) return null;
          const typeColors: Record<string, string> = { design: "#7C3AED", dev: "#2563EB", cro: "#059669", qa: "#D97706" };
          const statusColors: Record<string, string> = { open: "#EF4444", in_progress: "#F59E0B", quoted: "#8B5CF6", resolved: "#10B981" };
          return (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-foreground">Open Tickets ({openTickets.length})</h3>
              </div>
              <div className="border border-border rounded-xl bg-surface divide-y divide-border overflow-hidden">
                {openTickets.slice(0, 5).map(t => (
                  <div key={t.id} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: statusColors[t.status] || "#CCC" }} />
                      <span className="text-xs font-medium text-foreground truncate">{t.title}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {t.ticket_type && t.ticket_type !== "unassigned" && (
                        <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-full" style={{ backgroundColor: (typeColors[t.ticket_type] || "#999") + "15", color: typeColors[t.ticket_type] || "#999" }}>
                          {t.ticket_type}
                        </span>
                      )}
                      <span className="text-[9px] text-muted">{t.status.replace("_", " ")}</span>
                    </div>
                  </div>
                ))}
                {openTickets.length > 5 && (
                  <div className="px-4 py-2 text-center">
                    <span className="text-[10px] text-muted">+ {openTickets.length - 5} more</span>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── Funnels tab ── */}
        {!selectedProject && clientTab === "funnels" && (
          <FunnelsTab
            portal={portal}
            funnels={funnels}
            onUpdatePortal={async (patch) => {
              await updatePortal(portal.id, patch as Partial<PortalData>);
              setPortal({ ...portal, ...patch } as PortalData);
            }}
          />
        )}

        {/* ── Roadmap tab (retainer / Conversion Engine only) ── */}
        {!selectedProject && clientTab === "roadmap" && portal && isRetainerPortal && (
          <div className="max-w-4xl mx-auto px-6 md:px-12 py-10">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-foreground mb-1">Conversion Engine Roadmap</h2>
              <p className="text-sm text-muted">Team-led queue. Items flow through stages as we build, test, and ship.</p>
            </div>
            <RoadmapList portalId={portal.id} />
          </div>
        )}

        {/* ── Context tab ── */}
        {!selectedProject && clientTab === "context" && portal && (
          <ClientContextTab portal={portal} onUpdatePortal={async (patch) => {
            await updatePortal(portal.id, patch as Partial<PortalData>);
            setPortal({ ...portal, ...patch } as PortalData);
          }} onUpdateProject={async (projectId, patch) => {
            const updatedProjects = portal.projects.map(p => p.id === projectId ? { ...p, ...patch } : p);
            await updatePortal(portal.id, { projects: updatedProjects } as any);
            setPortal({ ...portal, projects: updatedProjects });
          }} />
        )}

        {/* ── Settings tab ── */}
        {!selectedProject && clientTab === "settings" && (
          <ClientDetailsPanel portal={portal} team={team} onUpdateField={handleUpdateField} />
        )}

        {/* ═══ PROJECT CONTENT (selected project) ═══ */}
        {/* ── OVERVIEW: QA gates + overview + context/weekly ── */}
        {selectedProject && activeTab === "overview" && (
          <div className="space-y-8">
            {/* Onboarding Brief */}
            {onboardingBrief && (
              <div className="border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => {
                    const el = document.getElementById("onboarding-brief-detail");
                    if (el) el.classList.toggle("hidden");
                  }}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-background transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-white flex items-center justify-center">
                      <svg className="size-4 text-background" viewBox="0 0 20 20" fill="currentColor"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-foreground">Onboarding Brief</p>
                      <p className="text-[10px] text-muted">Submitted {new Date(onboardingBrief.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
                    </div>
                  </div>
                  <ChevronDownIcon className="size-4 text-muted" />
                </button>
                <div id="onboarding-brief-detail" className="hidden border-t border-border px-5 py-4 space-y-4 max-h-[500px] overflow-y-auto">
                  {[
                    { title: "Brief", value: onboardingBrief.brief_description },
                    { title: "Target Customer", value: onboardingBrief.target_customer },
                    { title: "Competitors", value: onboardingBrief.top_competitors },
                    { title: "USPs", value: onboardingBrief.usps },
                    { title: "Main Products", value: onboardingBrief.main_products },
                    { title: "Metrics to Focus On", value: onboardingBrief.current_metrics },
                    { title: "Product URL(s)", value: onboardingBrief.product_url },
                    { title: "Page Type", value: onboardingBrief.page_type },
                    { title: "Traffic Source", value: onboardingBrief.traffic_source },
                    { title: "Amazon ASIN(s)", value: onboardingBrief.amazon_asins },
                    { title: "Meta Page Name", value: onboardingBrief.meta_page_name },
                    { title: "Specific Direction", value: onboardingBrief.specific_direction },
                    { title: "Brand Assets", value: onboardingBrief.brand_assets_link },
                    { title: "Value Props", value: onboardingBrief.core_value_props },
                    { title: "Tone of Voice", value: onboardingBrief.tone_of_voice },
                    { title: "Words to Avoid", value: onboardingBrief.words_to_avoid },
                    { title: "Store URL", value: onboardingBrief.myshopify_url },
                    { title: "Analytics", value: onboardingBrief.analytics_software },
                    { title: "Primary Goal", value: onboardingBrief.primary_goal },
                    { title: "Success Definition", value: onboardingBrief.success_definition },
                    { title: "Timeline", value: onboardingBrief.timeline_expectations },
                    { title: "Conversion Challenges", value: onboardingBrief.conversion_challenges },
                    { title: "Customer Objections", value: onboardingBrief.common_objections },
                    { title: "Compliance", value: onboardingBrief.compliance_restrictions },
                    { title: "Primary Contact", value: onboardingBrief.primary_contact },
                    { title: "Decision Maker", value: onboardingBrief.approval_decision_maker },
                    { title: "Timezone", value: onboardingBrief.timezone },
                  ].filter(f => f.value).map((field) => (
                    <div key={field.title}>
                      <p className="text-[10px] font-medium text-subtle mb-0.5">{field.title}</p>
                      <p className="text-xs text-muted whitespace-pre-wrap">{field.value}</p>
                    </div>
                  ))}
                  {onboardingBrief.additional_info && (
                    <div>
                      <p className="text-[10px] font-medium text-subtle mb-0.5">Additional Info</p>
                      <p className="text-xs text-muted whitespace-pre-wrap">{onboardingBrief.additional_info}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Project Info — documents (roadmap, scope, agreement PDFs) */}
            {(() => {
              const docs = selectedProject?.documents || portal.documents || [];
              if (docs.length === 0) return null;
              return (
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="px-5 py-4">
                    <p className="text-sm font-medium text-foreground">Project Info</p>
                    <p className="text-[10px] text-muted mt-0.5">Documents generated during kickoff</p>
                  </div>
                  <div className="border-t border-border divide-y divide-border">
                    {docs.map((doc, i) => (
                      <a
                        key={i}
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-5 py-3 hover:bg-background transition-colors"
                      >
                        <div className="size-8 rounded-lg bg-danger/10 flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-danger">PDF</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{doc.name}</p>
                          <p className="text-[10px] text-muted">{doc.type} — {doc.date ? new Date(doc.date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : ""}</p>
                        </div>
                        <ArrowTopRightOnSquareIcon className="size-3.5 text-muted shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              );
            })()}

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

          </div>
        )}


        {/* ── BUILD: Design Review + Development Review ── */}
        {selectedProject && activeTab === "build" && portal && (
          <div className="space-y-10">
            <DesignsSection
              portal={portal}
              reviews={reviews}
              onReviewsChange={setReviews}
            />
            <DevelopmentSection
              portal={portal}
              pageReviews={pageReviews}
              pageReviewVersions={pageReviewVersions}
              pageReviewFeedback={pageReviewFeedback}
              onReload={load}
            />
          </div>
        )}

        {/* ── QA GATE FORMS ── */}
        {selectedProject && (activeTab === "design-brief" || activeTab === "dev-handover" || activeTab === "dev-qa" || activeTab === "handoff-testing") && portal && (
          <GateChecklistForm
            key={`${selectedProject.id}-${activeTab}`}
            gateKey={activeTab as GateKey}
            project={selectedProject}
            portal={portal}
            onUpdate={async (patch) => {
              const updatedProjects = portal.projects.map((p) =>
                p.id === selectedProject.id ? { ...p, ...patch } : p
              );
              await updatePortal(portal.id, { projects: updatedProjects } as any);
              setPortal({ ...portal, projects: updatedProjects });
            }}
            onAfterSubmit={async () => {
              if (!portal.slack_internal_channel_id) return;
              const qaKey = ADMIN_GATE_KEY_TO_QA_KEY[activeTab];
              if (!qaKey) return;
              try {
                await fetch("/api/slack/gate-notify", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    channelId: portal.slack_internal_channel_id,
                    gateTitle: GATE_CONFIG[qaKey]?.title ?? qaKey,
                    clientName: portal.client_name,
                    projectName: selectedProject.name,
                    portalId: portal.id,
                    portalToken: portal.token,
                    projectId: selectedProject.id,
                    gateKey: qaKey,
                  }),
                });
              } catch { /* fire-and-forget */ }
            }}
          />
        )}

        {/* ── RESULTS: Testing (+ Reports for retainers) ── */}
        {selectedProject && activeTab === "results" && portal && (
          <div className="space-y-10">
            <TestingSection
              portal={portal}
              projectType={selectedProject?.type || "page-build"}
              onUpdateResults={async (results) => {
                await updatePortal(portal.id, { results } as Partial<PortalData>);
                setPortal({ ...portal, results } as PortalData);
              }}
              onUpdateField={handleUpdateField}
            />
            {selectedProject?.type === "retainer" && (
              <ReportsSection
                reports={portal.reports || []}
                onUpdate={async (reports) => {
                  await updatePortal(portal.id, { reports } as any);
                  setPortal({ ...portal, reports });
                }}
              />
            )}
          </div>
        )}

              </div>
            </div>
          </div>

        {/* Blocker flag modal */}
        {showBlockerModal && (
          <BlockerFlagModal
            portal={portal}
            onClose={() => setShowBlockerModal(false)}
            onFlag={async (blocker) => {
              // Snapshot current phase dates before applying blocker
              const currentPhases = portal.phases || [];
              const snapshot = currentPhases.map(p => ({
                id: p.id,
                startDate: p.startDate,
                endDate: p.endDate,
              }));
              const newBlocker: PortalBlocker = {
                ...blocker,
                original_phases: snapshot,
              };
              await updatePortal(portal.id, { blocker: newBlocker } as Partial<PortalData>);
              setPortal({ ...portal, blocker: newBlocker } as PortalData);
              setShowBlockerModal(false);
            }}
          />
        )}

        {/* Resolve blocker modal */}
        {showResolveBlocker && portal.blocker && (
          <ResolveBlockerModal
            portal={portal}
            onClose={() => setShowResolveBlocker(false)}
            onResolve={async (shiftDays: number) => {
              const blocker = portal.blocker!;
              const resolvedBlocker: PortalBlocker = {
                ...blocker,
                resolved_at: new Date().toISOString(),
                days_lost: shiftDays,
              };
              const history: BlockerHistory[] = [
                ...(portal.blocker_history || []),
                { blocker: resolvedBlocker, shifted_days: shiftDays },
              ];

              // Shift all future phase dates
              let updatedPhases = [...(portal.phases || [])];
              if (shiftDays > 0) {
                updatedPhases = updatedPhases.map(phase => {
                  const start = phase.startDate ? new Date(phase.startDate + "T00:00:00") : null;
                  const end = phase.endDate ? new Date(phase.endDate + "T00:00:00") : null;
                  const now = new Date();
                  now.setHours(0, 0, 0, 0);

                  // Only shift phases that haven't completed and are current or future
                  if (phase.status === "complete") return phase;

                  const shiftDate = (d: Date) => {
                    let remaining = shiftDays;
                    const result = new Date(d);
                    while (remaining > 0) {
                      result.setDate(result.getDate() + 1);
                      const dow = result.getDay();
                      if (dow !== 0 && dow !== 6) remaining--;
                    }
                    return result.toISOString().split("T")[0];
                  };

                  const newStart = start ? shiftDate(start) : undefined;
                  const newEnd = end ? shiftDate(end) : undefined;
                  const fmtDate = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });

                  return {
                    ...phase,
                    startDate: newStart,
                    endDate: newEnd,
                    deadline: newEnd,
                    dates: `${newStart ? fmtDate(newStart) : "?"} — ${newEnd ? fmtDate(newEnd) : "?"}`,
                  };
                });
              }

              await updatePortal(portal.id, {
                blocker: null,
                blocker_history: history,
                phases: updatedPhases,
              } as Partial<PortalData>);
              setPortal({
                ...portal,
                blocker: null,
                blocker_history: history,
                phases: updatedPhases,
              } as PortalData);
              setShowResolveBlocker(false);
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
              <p className="text-[10px] text-muted mt-1">One item per line (optional)</p>
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

  const toggleScopeFlag = async (index: number, field: "design_approved" | "dev_live") => {
    const source = (selectedProject?.scope?.length ? selectedProject.scope : portal.scope) || [];
    const updated = source.map((item, i) => {
      if (i !== index) return item;
      if (typeof item === "string") {
        return { description: item, type: "", [field]: true };
      }
      return { ...item, [field]: !item[field] };
    });
    if (selectedProject?.scope?.length && onUpdateSelectedProject) {
      await onUpdateSelectedProject({ scope: updated });
    } else {
      onUpdateField("scope", updated);
    }
  };

  // Build original dates map from first blocker history snapshot
  const totalShiftedDays = (portal.blocker_history || []).reduce((sum, h) => sum + h.shifted_days, 0);
  const firstHistory = (portal.blocker_history || [])[0];
  const originalDatesMap = new Map<string, { startDate?: string; endDate?: string }>();
  if (firstHistory?.blocker?.original_phases) {
    for (const op of firstHistory.blocker.original_phases) {
      originalDatesMap.set(op.id, { startDate: op.startDate, endDate: op.endDate });
    }
  }

  const fmtShort = (iso?: string) => {
    if (!iso) return "?";
    return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  return (
    <div className="space-y-6">
      {/* Blocker banner */}
      {blocker && (
        <div className="bg-danger/10 border border-danger/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-danger animate-pulse shrink-0" />
              <span className="text-xs font-semibold text-danger">
                Blocked — {blocker.type}
              </span>
              {daysBlocked > 0 && <span className="text-[10px] font-medium text-danger bg-danger/10 px-2 py-0.5 rounded-full">{daysBlocked}d</span>}
            </div>
            <button onClick={() => onSetBlocker(null)} className="text-[11px] font-medium text-danger hover:text-danger transition-colors">Clear</button>
          </div>
          <p className="text-sm text-danger mt-1.5">{blocker.reason}</p>
        </div>
      )}

      {/* Touchpoint + Status row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Next Touchpoint — editable */}
        <div className="bg-white text-background rounded-xl p-4">
          <p className="text-xs font-semibold text-white/50 mb-2">Next Touchpoint</p>
          <EditableField
            label=""
            value={portal.next_touchpoint?.description || ""}
            onSave={(v) => onUpdateTouchpoint("description", v)}
            placeholder="e.g., Design review call"
            dark
          />
          <div className="mt-2">
            <EditableField
              label=""
              value={portal.next_touchpoint?.date || ""}
              onSave={(v) => onUpdateTouchpoint("date", v)}
              type="date"
              dark
            />
          </div>
        </div>

        {/* Project status card */}
        <div className="bg-background border border-border rounded-xl p-4 space-y-3">
          {selectedProject && (
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted">Status</p>
              <select
                value={selectedProject.status}
                onChange={(e) => onUpdateSelectedProject?.({ status: e.target.value as PortalProject["status"] })}
                className="text-xs font-medium text-right bg-transparent border-none text-foreground focus:outline-none cursor-pointer"
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="complete">Complete</option>
              </select>
            </div>
          )}
          {!isRetainer && (
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted">Current Phase</p>
              <select
                value={currentPhase}
                onChange={(e) => onUpdateField("current_phase", e.target.value)}
                className="text-xs font-medium text-right bg-transparent border-none text-foreground focus:outline-none cursor-pointer"
              >
                {phases.length === 0 && <option value={currentPhase}>{currentPhase}</option>}
                {phases.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
          )}
          {portal.client_type !== "retainer" && (
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted">Show Results</p>
              <button
                onClick={() => onUpdateField("show_results", !portal.show_results)}
                className={`relative w-8 h-[18px] rounded-full transition-colors duration-200 ${portal.show_results ? "bg-success" : "bg-muted"}`}
              >
                <span className={`absolute top-[2px] left-[2px] size-[14px] bg-surface rounded-full shadow transition-transform duration-200 ${portal.show_results ? "translate-x-[14px]" : ""}`} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Phases timeline (non-retainer) */}
      {!isRetainer && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <h3 className="text-xs font-semibold text-foreground">Timeline</h3>
              {totalShiftedDays > 0 && (
                <span className="text-[10px] font-medium text-warning bg-warning/10 px-2 py-0.5 rounded-full">
                  +{totalShiftedDays}d adjusted
                </span>
              )}
            </div>
            <button onClick={onAddPhase} className="text-[11px] font-medium text-subtle hover:text-foreground transition-colors">+ Add Phase</button>
          </div>
          {phases.length === 0 ? (
            <p className="text-xs text-muted bg-background border border-dashed border-border rounded-xl p-6 text-center">
              No phases yet — add your first phase
            </p>
          ) : (
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-[7px] top-3 bottom-3 w-px bg-border" />
              <div className="space-y-0">
                {phases.map((phase, idx) => (
                  <div key={phase.id} className="relative flex gap-4 py-3 group">
                    {/* Status dot */}
                    <div className="relative z-10 mt-0.5">
                      {(() => {
                        const canAdvance = canPhaseAdvance(phases, phase.id);
                        const hint = phase.status === "upcoming" && !canAdvance
                          ? "Complete the previous phase first"
                          : phase.status === "complete" && !canAdvance
                          ? "Later phases have progressed — can't undo"
                          : phase.status === "upcoming"
                          ? "Click to start this phase"
                          : phase.status === "in-progress"
                          ? "Click to mark complete"
                          : "Click to reopen";
                        return (
                          <button
                            onClick={() => onCyclePhaseStatus(phase.id)}
                            disabled={!canAdvance}
                            className={`size-[15px] rounded-full border-2 transition-colors ${
                              phase.status === "complete"
                                ? "bg-success border-success"
                                : phase.status === "in-progress"
                                ? "bg-white border-background"
                                : canAdvance
                                ? "bg-surface border-muted hover:border-subtle"
                                : "bg-surface border-border opacity-40 cursor-not-allowed"
                            }`}
                            title={hint}
                          >
                            {phase.status === "complete" && (
                              <CheckIcon className="size-2.5 text-white mx-auto" />
                            )}
                          </button>
                        );
                      })()}
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-semibold ${phase.status === "complete" ? "text-muted line-through" : "text-foreground"}`}>{phase.name}</p>
                        {phase.status === "in-progress" && <span className="text-[9px] font-bold uppercase tracking-wider text-foreground bg-surface-raised px-1.5 py-0.5 rounded">Current</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="date"
                          value={phase.startDate || ""}
                          onChange={(e) => {
                            const updated = phases.map((p) =>
                              p.id === phase.id
                                ? { ...p, startDate: e.target.value, dates: `${e.target.value ? new Date(e.target.value + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "?"} — ${p.endDate ? new Date(p.endDate + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "?"}` }
                                : p
                            );
                            onUpdateField("phases", updated);
                          }}
                          className="text-[11px] text-muted bg-transparent border border-border rounded px-1.5 py-0.5 w-[110px] hover:border-border focus:border-subtle"
                        />
                        <span className="text-[10px] text-muted">→</span>
                        <input
                          type="date"
                          value={phase.endDate || ""}
                          onChange={(e) => {
                            const updated = phases.map((p) =>
                              p.id === phase.id
                                ? { ...p, endDate: e.target.value, deadline: e.target.value, dates: `${p.startDate ? new Date(p.startDate + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "?"} — ${e.target.value ? new Date(e.target.value + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "?"}` }
                                : p
                            );
                            onUpdateField("phases", updated);
                          }}
                          className="text-[11px] text-muted bg-transparent border border-border rounded px-1.5 py-0.5 w-[110px] hover:border-border focus:border-subtle"
                        />
                        {phase.status === "complete" && phase.completedDate && phase.deadline && new Date(phase.completedDate) < new Date(phase.deadline) && (
                          <span className="text-[10px] text-success font-medium">Early</span>
                        )}
                      </div>
                      {/* Show original dates if shifted */}
                      {(() => {
                        const orig = originalDatesMap.get(phase.id);
                        if (!orig || phase.status === "complete") return null;
                        const shifted = (orig.startDate && phase.startDate && orig.startDate !== phase.startDate) ||
                                        (orig.endDate && phase.endDate && orig.endDate !== phase.endDate);
                        if (!shifted) return null;
                        return (
                          <p className="text-[10px] text-muted mt-0.5">
                            Originally {fmtShort(orig.startDate)} → {fmtShort(orig.endDate)}
                          </p>
                        );
                      })()}
                    </div>
                    <button
                      onClick={() => onRemovePhase(phase.id)}
                      className="p-1 text-muted hover:text-danger transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <TrashIcon className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scope / Deliverables — for page-build, scope IS the deliverables list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-foreground">
            {isRetainer ? `Scope (${scope?.length || 0})` : `Deliverables (${scope?.length || 0})`}
          </h3>
          {!isRetainer && (scope?.length || 0) > 0 && (
            <p className="text-[10px] text-muted">Tick Design on approval, Dev when live</p>
          )}
        </div>
        {(scope || []).length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-4">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={scopeInput}
                onChange={(e) => setScopeInput(e.target.value)}
                placeholder="Add first scope item..."
                className="flex-1 px-3 py-2 text-sm border border-border rounded-lg"
                onKeyDown={(e) => { if (e.key === "Enter" && scopeInput.trim()) { onAddScope(scopeInput, scopeType || undefined); setScopeInput(""); setScopeType(""); } }}
              />
              <button
                onClick={() => { if (scopeInput.trim()) { onAddScope(scopeInput, scopeType || undefined); setScopeInput(""); setScopeType(""); } }}
                disabled={!scopeInput.trim()}
                className="px-3 py-2 text-xs font-medium bg-white text-background rounded-lg disabled:opacity-30"
              >
                Add
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {(scope || []).map((item, i) => {
              const desc = typeof item === "string" ? item : item.description;
              const typ = typeof item === "string" ? "" : item.type;
              const designApproved = typeof item === "string" ? false : !!item.design_approved;
              const devLive = typeof item === "string" ? false : !!item.dev_live;
              return (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-background border border-border rounded-lg group hover:border-muted transition-colors">
                  <div className="size-1.5 rounded-full bg-muted shrink-0" />
                  <p className="text-sm font-medium flex-1 min-w-0 truncate text-foreground">{desc}</p>
                  {typ && <span className="shrink-0 px-2 py-0.5 text-[10px] font-medium text-muted bg-surface border border-border rounded-full">{typ}</span>}
                  {!isRetainer && (
                    <>
                      <label className="flex items-center gap-1.5 text-[11px] text-muted cursor-pointer select-none shrink-0">
                        <input
                          type="checkbox"
                          checked={designApproved}
                          onChange={() => toggleScopeFlag(i, "design_approved")}
                          className="size-3.5 accent-surface cursor-pointer"
                        />
                        Design
                      </label>
                      <label className="flex items-center gap-1.5 text-[11px] text-muted cursor-pointer select-none shrink-0">
                        <input
                          type="checkbox"
                          checked={devLive}
                          onChange={() => toggleScopeFlag(i, "dev_live")}
                          className="size-3.5 accent-surface cursor-pointer"
                        />
                        Dev
                      </label>
                    </>
                  )}
                  <button onClick={() => onRemoveScope(i)} className="p-0.5 text-muted hover:text-danger transition-colors opacity-0 group-hover:opacity-100">
                    <TrashIcon className="size-3" />
                  </button>
                </div>
              );
            })}
            {/* Inline add */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={scopeInput}
                onChange={(e) => setScopeInput(e.target.value)}
                placeholder="Add scope item..."
                className="flex-1 px-3 py-1.5 text-sm border border-border rounded-lg bg-surface"
                onKeyDown={(e) => { if (e.key === "Enter" && scopeInput.trim()) { onAddScope(scopeInput, scopeType || undefined); setScopeInput(""); setScopeType(""); } }}
              />
              <select
                value={scopeType}
                onChange={(e) => setScopeType(e.target.value)}
                className="px-2 py-1.5 text-xs border border-border rounded-lg text-muted bg-surface"
              >
                <option value="">Type</option>
                {deliverableTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <button
                onClick={() => { if (scopeInput.trim()) { onAddScope(scopeInput, scopeType || undefined); setScopeInput(""); setScopeType(""); } }}
                disabled={!scopeInput.trim()}
                className="px-3 py-1.5 text-xs font-medium bg-white text-background rounded-lg disabled:opacity-30"
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Documents */}
      {(documents || []).length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-foreground mb-3">Documents ({documents.length})</h3>
          <div className="space-y-1.5">
            {documents.map((doc, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-background border border-border rounded-lg">
                <p className="text-sm font-medium flex-1 min-w-0 truncate">{doc.name}</p>
                <span className="shrink-0 px-2 py-0.5 text-[10px] font-medium text-muted bg-surface border border-border rounded-full">{doc.type}</span>
                {doc.url ? (
                  <a href={doc.url} target="_blank" rel="noopener noreferrer" className="shrink-0 px-2 py-0.5 text-[10px] font-medium text-success bg-success/10 rounded-full hover:bg-success/10">View</a>
                ) : (
                  <span className="shrink-0 px-2 py-0.5 text-[10px] font-medium text-muted bg-surface-raised rounded-full">Pending</span>
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
        <h3 className="text-xs font-semibold text-foreground">
          Video Updates
        </h3>
        <button
          onClick={onShowForm}
          className="flex items-center gap-1 text-xs font-medium text-subtle hover:text-foreground transition-colors"
        >
          <PlusIcon className="size-3.5" />
          Post Update
        </button>
      </div>

      {/* Add update form */}
      {showForm && (
        <div className="bg-background border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Post Video Update</h3>
            <button
              onClick={onHideForm}
              className="text-subtle hover:text-foreground"
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
                <p className="text-[11px] text-danger mt-1">
                  Please paste a valid Loom URL
                </p>
              )}
              {loomUrl && isLoomUrl(loomUrl) && (
                <div className="mt-3 rounded-lg overflow-hidden border border-border">
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
              className="flex items-center gap-1.5 px-4 py-2 bg-white text-background text-xs font-medium rounded-lg hover:bg-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckIcon className="size-3.5" />
              {saving ? "Posting..." : "Post Update"}
            </button>
          </div>
        </div>
      )}

      {/* Updates list */}
      {updates.length === 0 && !showForm ? (
        <div className="bg-surface border border-dashed border-border rounded-lg p-8 text-center">
          <p className="text-xs text-subtle mb-2">No updates posted yet</p>
          <button
            onClick={onShowForm}
            className="text-xs font-medium text-subtle hover:text-foreground transition-colors"
          >
            + Post your first video update
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {updates.map((update) => (
            <div
              key={update.id}
              className="bg-surface border border-border rounded-lg p-4"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <h4 className="text-sm font-semibold">{update.title}</h4>
                  {update.description && (
                    <p className="text-xs text-subtle mt-0.5">
                      {update.description}
                    </p>
                  )}
                </div>
                <p className="text-[10px] text-subtle shrink-0">
                  {new Date(update.created_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}
                </p>
              </div>
              {isLoomUrl(update.loom_url) && (
                <div className="rounded-lg overflow-hidden border border-border">
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
        <h2 className="text-xs font-semibold text-foreground">
          Wins &amp; Results
        </h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1 text-xs font-medium text-subtle hover:text-foreground transition-colors"
        >
          <PlusIcon className="size-3.5" />
          Add Win
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-background border border-border rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Add Win</h3>
            <button onClick={resetForm} className="text-subtle hover:text-foreground">
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
          <button onClick={handleAdd} disabled={!title.trim()} className="flex items-center gap-1.5 px-4 py-2 bg-white text-background text-xs font-medium rounded-lg hover:bg-foreground transition-colors disabled:opacity-40">
            <CheckIcon className="size-3.5" />
            Add Win
          </button>
        </div>
      )}

      {/* Win list */}
      {wins.length === 0 && !showForm && (
        <div className="text-center py-12 bg-surface border border-dashed border-border rounded-lg">
          <p className="text-xs text-subtle mb-2">No wins recorded yet</p>
          <button onClick={() => setShowForm(true)} className="text-xs font-medium text-subtle hover:text-foreground">
            + Record your first win
          </button>
        </div>
      )}

      {wins.map((win) => (
        <div key={win.id} className="bg-surface border border-border rounded-lg p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold">{win.title}</h3>
              <p className="text-xs text-subtle mt-0.5">
                {[win.metric, win.date].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {win.lift && (
                <span className="px-2 py-0.5 text-xs font-bold text-success bg-success/10 rounded-full">
                  {win.lift}
                </span>
              )}
              <button onClick={() => handleDelete(win.id)} className="p-1 text-subtle hover:text-danger transition-colors">
                <TrashIcon className="size-3.5" />
              </button>
            </div>
          </div>
          {(win.before || win.after) && (
            <div className="flex items-center gap-2 mt-3 text-xs">
              <span className="text-subtle">{win.before}</span>
              <span className="text-muted">→</span>
              <span className="font-semibold text-success">{win.after}</span>
            </div>
          )}
          {win.description && (
            <p className="text-xs text-subtle mt-2">{win.description}</p>
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
    open: "text-warning bg-warning/10",
    "in-progress": "text-info bg-info/10",
    done: "text-success bg-success/10",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-foreground">
          Ad-hoc Requests
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 text-xs font-medium text-subtle hover:text-foreground transition-colors"
        >
          <PlusIcon className="size-3" />
          Add Request
        </button>
      </div>

      {showForm && (
        <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
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
              className="px-3 py-1.5 text-xs font-semibold bg-white text-background rounded-lg hover:bg-foreground transition-colors disabled:opacity-50"
            >
              {saving ? "Adding..." : "Add"}
            </button>
            <button
              onClick={() => { setShowForm(false); setTitle(""); setDescription(""); }}
              className="px-3 py-1.5 text-xs font-medium text-subtle hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {requests.length === 0 ? (
        <div className="bg-surface border border-dashed border-border rounded-lg p-8 text-center">
          <p className="text-xs text-subtle">
            No requests yet — track client ad-hoc requests here
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-lg divide-y divide-border">
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
                    <p className="text-xs text-subtle leading-relaxed mb-1">{req.description}</p>
                  )}
                  <p className="text-[10px] text-subtle">
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
                  className="p-1 text-subtle hover:text-danger transition-colors shrink-0"
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
      <div className="bg-surface border border-dashed border-border rounded-lg p-8 text-center">
        <p className="text-xs text-subtle">
          No approvals yet — clients approve deliverables from their portal view
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold text-foreground">
        Client Approvals
      </h3>
      <div className="border border-border rounded-lg divide-y divide-border">
        {approvals.map((approval) => {
          const refName =
            approval.approval_type === "phase"
              ? portal.phases.find((p) => p.id === approval.reference_id)?.name
              : portal.deliverables.find(
                  (d) => d.id === approval.reference_id
                )?.name;
          return (
            <div key={approval.id} className="flex items-center gap-3 p-4">
              <span className="size-5 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                <CheckIcon className="size-3 text-success" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {refName || approval.reference_id}
                </p>
                <p className="text-[11px] text-subtle">
                  {approval.approval_type === "phase"
                    ? "Phase sign-off"
                    : "Deliverable approved"}
                  {approval.approved_by && ` by ${approval.approved_by}`}
                </p>
                {approval.comment && (
                  <p className="text-xs text-subtle mt-1 italic">
                    &ldquo;{approval.comment}&rdquo;
                  </p>
                )}
              </div>
              <p className="text-[10px] text-subtle shrink-0">
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

/* ── Designs Section (clean handoff — no embeds) ── */

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
  const [figmaUrl, setFigmaUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [expandedReview, setExpandedReview] = useState<string | null>(null);
  const [versions, setVersions] = useState<DesignReviewVersion[]>([]);
  const [feedbackList, setFeedbackList] = useState<DesignReviewFeedback[]>([]);
  const [newVersionUrl, setNewVersionUrl] = useState("");
  const [newVersionStagingUrl, setNewVersionStagingUrl] = useState("");
  const [newVersionNotes, setNewVersionNotes] = useState("");
  const [addingVersion, setAddingVersion] = useState(false);
  const [showAddVersion, setShowAddVersion] = useState(false);

  const handleCreate = async () => {
    if (!title.trim() || !figmaUrl.trim()) return;
    setSaving(true);
    try {
      const review = await createReview({
        portal_id: portal.id,
        title: title.trim(),
        description: "",
      });
      await addVersion({
        review_id: review.id,
        version_number: 1,
        figma_url: figmaUrl.trim(),
        notes: "",
      });
      onReviewsChange([review, ...reviews]);
      setExpandedReview(review.id);
      // Reload
      const [v, f] = await Promise.all([getVersions(review.id), getFeedback(review.id)]);
      setVersions(v);
      setFeedbackList(f);
      setTitle("");
      setFigmaUrl("");
      setShowCreateForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteReview(id);
    onReviewsChange(reviews.filter((r) => r.id !== id));
    if (expandedReview === id) { setExpandedReview(null); setVersions([]); setFeedbackList([]); }
  };

  const loadReview = useCallback(async (reviewId: string) => {
    if (expandedReview === reviewId) { setExpandedReview(null); return; }
    setExpandedReview(reviewId);
    const [v, f] = await Promise.all([getVersions(reviewId), getFeedback(reviewId)]);
    setVersions(v);
    setFeedbackList(f);
  }, [expandedReview]);

  useEffect(() => {
    if (reviews.length > 0 && !expandedReview) loadReview(reviews[0].id);
  }, [reviews.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddVersion = async (reviewId: string) => {
    if (!newVersionUrl.trim()) return;
    setAddingVersion(true);
    try {
      const nextNum = versions.length + 1;
      const v = await addVersion({
        review_id: reviewId,
        version_number: nextNum,
        figma_url: newVersionUrl.trim(),
        staging_url: newVersionStagingUrl.trim() || undefined,
        notes: newVersionNotes.trim(),
      });
      setVersions([...versions, v]);
      setNewVersionUrl("");
      setNewVersionStagingUrl("");
      setNewVersionNotes("");
      setShowAddVersion(false);
    } finally {
      setAddingVersion(false);
    }
  };

  const handleSetStatus = async (reviewId: string, status: "pending" | "changes_requested" | "approved") => {
    await updateReviewStatus(reviewId, status);
    onReviewsChange(reviews.map(r => r.id === reviewId ? { ...r, status } : r));
  };

  const copyReviewLink = (reviewId: string) => {
    const url = `${window.location.origin}/portal/${portal.token}/review/${reviewId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(reviewId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-foreground">Design Review</h3>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-1 text-xs font-medium text-subtle hover:text-foreground transition-colors"
        >
          <PlusIcon className="size-3.5" />
          New
        </button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="bg-background border border-border rounded-lg p-4 space-y-3 animate-fadeIn">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Page Name *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Homepage, PDP" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Figma URL *</label>
              <input type="text" value={figmaUrl} onChange={(e) => setFigmaUrl(e.target.value)} placeholder="https://figma.com/..." className={inputClass} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleCreate} disabled={!title.trim() || !figmaUrl.trim() || saving} className="px-3 py-1.5 bg-white text-background text-xs font-medium rounded-lg hover:bg-foreground transition-colors disabled:opacity-40">
              {saving ? "Creating..." : "Create"}
            </button>
            <button onClick={() => setShowCreateForm(false)} className="px-3 py-1.5 text-xs text-subtle hover:text-foreground">Cancel</button>
          </div>
        </div>
      )}

      {/* Review list */}
      {reviews.length === 0 && !showCreateForm ? (
        <div className="border border-dashed border-border rounded-lg p-8 text-center">
          <p className="text-xs text-subtle mb-2">No handoffs yet</p>
          <button onClick={() => setShowCreateForm(true)} className="text-xs font-medium text-subtle hover:text-foreground">+ Add first handoff</button>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => {
            const isExpanded = expandedReview === review.id;
            const sorted = isExpanded ? [...versions].sort((a, b) => b.version_number - a.version_number) : [];
            const latestVersion = sorted[0];

            return (
              <div key={review.id} className="border border-border rounded-lg overflow-hidden">
                {/* Review row */}
                <button
                  onClick={() => loadReview(review.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${isExpanded ? "bg-background" : "hover:bg-background"}`}
                >
                  <h4 className="text-sm font-semibold flex-1 min-w-0 truncate">{review.title}</h4>
                  <span className={`px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider rounded-full shrink-0 ${
                    review.status === "approved" ? "bg-success/10 text-success" :
                    review.status === "changes_requested" ? "bg-warning/10 text-warning" :
                    "bg-surface-raised text-subtle"
                  }`}>
                    {review.status === "approved" ? "Approved" : review.status === "changes_requested" ? "Amends" : "Pending"}
                  </span>
                  {isExpanded && versions.length > 0 && (
                    <span className="text-[10px] text-subtle">v{latestVersion?.version_number}</span>
                  )}
                </button>

                {/* Expanded: version timeline */}
                {isExpanded && (
                  <div className="border-t border-border animate-fadeIn">
                    {/* Actions bar */}
                    <div className="flex items-center gap-2 px-4 py-2 border-b border-surface-raised bg-surface">
                      <div className="flex items-center gap-1">
                        {(["pending", "changes_requested", "approved"] as const).map((s) => (
                          <button
                            key={s}
                            onClick={() => handleSetStatus(review.id, s)}
                            className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${
                              review.status === s
                                ? s === "approved" ? "bg-success text-white" : s === "changes_requested" ? "bg-warning text-white" : "bg-white text-background"
                                : "text-subtle hover:text-foreground hover:bg-surface-raised"
                            }`}
                          >
                            {s === "approved" ? "Approved" : s === "changes_requested" ? "Amends" : "Pending"}
                          </button>
                        ))}
                      </div>
                      <div className="flex-1" />
                      <button onClick={() => copyReviewLink(review.id)} className="text-[10px] text-subtle hover:text-foreground">
                        {copiedId === review.id ? "Copied!" : "Copy Link"}
                      </button>
                      <button onClick={() => handleDelete(review.id)} className="text-[10px] text-subtle hover:text-danger">Delete</button>
                    </div>

                    {/* Version list */}
                    <div className="divide-y divide-border">
                      {sorted.map((v) => {
                        const vFeedback = feedbackList.filter(f => f.version_id === v.id);
                        const isCurrent = v.id === latestVersion?.id;
                        return (
                          <div key={v.id} className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${isCurrent ? "bg-white text-background" : "bg-border text-subtle"}`}>
                                v{v.version_number}
                              </span>
                              <span className="text-[11px] text-subtle">
                                {new Date(v.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                              {isCurrent && <span className="text-[9px] font-semibold text-success uppercase tracking-wider">Latest</span>}
                              <div className="flex-1" />
                              {/* Links */}
                              <a href={v.figma_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-foreground bg-surface-raised rounded hover:bg-border transition-colors">
                                Figma <ArrowTopRightOnSquareIcon className="size-2.5" />
                              </a>
                              {v.staging_url && (
                                <a href={v.staging_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-foreground bg-surface-raised rounded hover:bg-border transition-colors">
                                  Staging <ArrowTopRightOnSquareIcon className="size-2.5" />
                                </a>
                              )}
                            </div>
                            {v.notes && <p className="text-xs text-subtle mt-1.5 ml-8">{v.notes}</p>}
                            {/* Feedback for this version */}
                            {vFeedback.length > 0 && (
                              <div className="ml-8 mt-2 space-y-1">
                                {vFeedback.map((entry) => {
                                  const isApproval = entry.action === "approved";
                                  return (
                                    <div key={entry.id} className={`flex items-start gap-2 text-xs px-2.5 py-1.5 rounded-md ${isApproval ? "bg-success/10" : entry.action === "changes_requested" ? "bg-warning/10" : "bg-background"}`}>
                                      <span className={`size-1.5 rounded-full shrink-0 mt-1 ${isApproval ? "bg-success" : entry.action === "changes_requested" ? "bg-warning" : "bg-muted"}`} />
                                      <div className="min-w-0">
                                        <span className="font-medium">{entry.submitted_by}</span>
                                        <span className="text-subtle ml-1">{isApproval ? "approved" : entry.action === "changes_requested" ? "requested changes" : "commented"}</span>
                                        {entry.comment && <p className="text-muted mt-0.5">{entry.comment}</p>}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Add version form */}
                    {showAddVersion ? (
                      <div className="px-4 py-3 border-t border-border bg-background space-y-2 animate-fadeIn">
                        <div className="grid grid-cols-2 gap-2">
                          <input type="text" value={newVersionUrl} onChange={(e) => setNewVersionUrl(e.target.value)} placeholder="Figma URL *" className={inputClass} />
                          <input type="text" value={newVersionStagingUrl} onChange={(e) => setNewVersionStagingUrl(e.target.value)} placeholder="Staging URL (optional)" className={inputClass} />
                        </div>
                        <input type="text" value={newVersionNotes} onChange={(e) => setNewVersionNotes(e.target.value)} placeholder="Notes — what changed in this version?" className={inputClass} />
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleAddVersion(review.id)} disabled={!newVersionUrl.trim() || addingVersion} className="px-3 py-1.5 bg-white text-background text-xs font-medium rounded-lg hover:bg-foreground disabled:opacity-40">
                            {addingVersion ? "Adding..." : `Add v${versions.length + 1}`}
                          </button>
                          <button onClick={() => setShowAddVersion(false)} className="px-3 py-1.5 text-xs text-subtle">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setShowAddVersion(true)} className="w-full px-4 py-2.5 border-t border-border text-left flex items-center gap-1.5 text-[11px] font-medium text-subtle hover:text-foreground hover:bg-background transition-colors">
                        <PlusIcon className="size-3" />
                        New Version
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
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
  dark = false,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
  type?: string;
  placeholder?: string;
  dark?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  return (
    <div className={`flex items-center justify-between gap-4 ${label ? "" : ""}`}>
      {label && <span className={`text-xs font-medium ${dark ? "text-white/50" : "text-subtle"}`}>{label}</span>}
      {editing ? (
        <div className={`flex items-center gap-1.5 ${label ? "" : "w-full"}`}>
          <input
            type={type}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            className={`px-2 py-1 text-sm rounded ${label ? "w-40" : "w-full"} ${dark ? "bg-surface/10 border border-white/20 text-white placeholder-white/30" : "border border-border"}`}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") { onSave(draft); setEditing(false); }
              if (e.key === "Escape") setEditing(false);
            }}
          />
          <button onClick={() => { onSave(draft); setEditing(false); }} className={`p-1 ${dark ? "text-success/70 hover:text-success" : "text-success hover:text-success"}`}>
            <CheckIcon className="size-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => { setDraft(value); setEditing(true); }}
          className={`text-sm hover:underline ${label ? "" : "w-full text-left"} ${dark ? "text-white" : "text-foreground"}`}
        >
          {value || (dark ? <span className="text-white/30">{placeholder || "Click to set"}</span> : "—")}
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
      <div className="relative w-full max-w-md bg-surface rounded-lg shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 text-subtle hover:text-foreground"
          >
            <XMarkIcon className="size-5" />
          </button>
        </div>
        <div className="space-y-4">
          {children}
          <button
            onClick={onSubmit}
            disabled={disabled}
            className="flex items-center gap-1.5 px-4 py-2 bg-white text-background text-xs font-medium rounded-lg hover:bg-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
    <div className="bg-surface border border-border rounded-lg p-4">
      <p className="text-xs font-semibold text-foreground mb-3">Intelligems API</p>
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
            className="px-3 py-1.5 text-[11px] font-medium bg-white text-background rounded-lg hover:bg-foreground whitespace-nowrap"
          >
            Save
          </button>
        ) : saved ? (
          <span className="text-[10px] text-success font-medium whitespace-nowrap">Saved ✓</span>
        ) : currentKey ? (
          <span className="text-[10px] text-success font-medium whitespace-nowrap">Connected</span>
        ) : null}
      </div>
      <p className="text-[10px] text-muted mt-1.5">Paste the client&apos;s Intelligems API key to auto-pull A/B test results</p>
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
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [notes, setNotes] = useState("");
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
    setFigmaUrl(""); setScreenshotUrl(""); setNotes("");
    setIgTestId(""); setStartDate(""); setEndDate("");
    setEditId(null); setShowForm(false);
  };

  const handleScreenshotUpload = async (file: File) => {
    setUploadingScreenshot(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/design-brief/upload?bucket=design-briefs", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      if (data.url) setScreenshotUrl(data.url);
    } catch { /* silent */ }
    setUploadingScreenshot(false);
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
    setScreenshotUrl(test.screenshot_url || "");
    setNotes(test.notes || "");
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
      screenshot_url: screenshotUrl.trim() || undefined,
      notes: notes.trim() || undefined,
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
          <h3 className="text-xs font-semibold text-foreground">
            Tests ({activeTests.length})
          </h3>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium bg-white text-background rounded-lg hover:bg-foreground"
          >
            <PlusIcon className="size-3.5" /> Add Test
          </button>
        </div>

        {showForm && (
          <div className="bg-background border border-border rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{editId ? "Edit Test" : `Test ${activeTests.length + 1}`}</h3>
              <button onClick={resetForm} className="text-subtle hover:text-foreground"><XMarkIcon className="size-4" /></button>
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
                  <button key={s} onClick={() => setStatus(s)} className={`px-3 py-1.5 text-[11px] font-medium rounded-lg transition-colors ${status === s ? "bg-white text-background" : "bg-surface text-subtle border border-border"}`}>
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
                    <button key={r} onClick={() => setResult(r)} className={`px-3 py-1.5 text-[11px] font-medium rounded-lg transition-colors ${result === r ? r === "winner" ? "bg-success text-white" : r === "loser" ? "bg-danger text-white" : "bg-warning text-white" : "bg-surface text-subtle border border-border"}`}>
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
                    <p className="text-[10px] font-semibold text-subtle uppercase">CVR</p>
                    <input type="text" value={cvrA} onChange={(e) => setCvrA(e.target.value)} placeholder="Var A" className={inputClass} />
                    <input type="text" value={cvrB} onChange={(e) => setCvrB(e.target.value)} placeholder="Var B" className={inputClass} />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold text-subtle uppercase">AOV</p>
                    <input type="text" value={aovA} onChange={(e) => setAovA(e.target.value)} placeholder="Var A" className={inputClass} />
                    <input type="text" value={aovB} onChange={(e) => setAovB(e.target.value)} placeholder="Var B" className={inputClass} />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold text-subtle uppercase">RPV</p>
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
                  <button onClick={fetchIgMetrics} disabled={!igTestId.trim() || igFetching} className="px-3 py-2 text-[11px] font-medium bg-surface-raised text-muted rounded-lg hover:bg-border disabled:opacity-30 whitespace-nowrap">
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
            <div>
              <label className={labelClass}>Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What changed, what to look at, any context…" className={inputClass + " min-h-[72px] resize-y"} />
            </div>
            <div>
              <label className={labelClass}>Screenshot</label>
              {screenshotUrl ? (
                <div className="relative inline-block">
                  <img src={screenshotUrl} alt="Test screenshot" className="max-h-48 rounded-lg border border-border" />
                  <button onClick={() => setScreenshotUrl("")} className="absolute top-1 right-1 p-1 bg-surface/90 hover:bg-surface rounded-md border border-border" title="Remove">
                    <XMarkIcon className="size-3.5 text-muted" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-1 py-6 border border-dashed border-border rounded-lg cursor-pointer hover:border-muted transition-colors bg-surface">
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleScreenshotUpload(f); }} />
                  <span className="text-[11px] font-medium text-subtle">{uploadingScreenshot ? "Uploading…" : "Click to upload screenshot"}</span>
                  <span className="text-[10px] text-[#B5B5B5]">PNG, JPG, up to 50MB</span>
                </label>
              )}
            </div>
            <button onClick={() => { if (!name.trim() || !metric.trim()) return; handleSave(); }} disabled={!name.trim() || !metric.trim()} className="flex items-center gap-1.5 px-4 py-2 bg-white text-background text-xs font-medium rounded-lg disabled:opacity-40">
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
              complete: "bg-surface-raised text-foreground border-border",
            };
            const nextStatus: Record<string, TestStatus> = { ideation: "scheduled", scheduled: "live", live: "complete", complete: "ideation" };
            const handleStatusCycle = async () => {
              const newStatus = nextStatus[test.status];
              const updated = tests.map(t => t.id === test.id ? { ...t, status: newStatus, ...(newStatus !== "complete" ? { result: undefined } : {}) } : t);
              await onUpdateResults(updated);
            };
            const hasMetrics = test.cvr || test.aov || test.rpv;
            return (
              <div key={test.id} className="bg-surface border border-border rounded-lg group/card overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-bold text-muted">#{idx + 1}</span>
                    <p className="text-[13px] font-semibold text-foreground truncate">{test.name}</p>
                    {test.status === "complete" && test.result && (
                      <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full shrink-0 ${
                        test.result === "winner" ? "bg-success/10 text-success" : test.result === "loser" ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning"
                      }`}>{test.result}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={handleStatusCycle} className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-full border transition-colors ${statusStyles[test.status] || ""}`}>
                      {test.status === "live" && <span className="inline-block size-1.5 rounded-full bg-success mr-1 align-middle" />}
                      {test.status}
                    </button>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(test)} className="p-1 text-[#B0B0B0] hover:text-foreground"><svg className="size-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" /></svg></button>
                      <button onClick={() => handleDeleteTest(test.id)} className={`p-1 transition-colors ${confirmDeleteId === test.id ? "text-danger" : "text-[#B0B0B0] hover:text-danger"}`}><TrashIcon className="size-3.5" /></button>
                    </div>
                  </div>
                </div>
                <div className="px-4 pb-3">
                  <p className="text-[11px] text-subtle">{test.metric}{test.startDate ? ` · ${test.startDate}` : ""}</p>
                </div>
                {hasMetrics && (
                  <div className="border-t border-border px-4 py-3 grid grid-cols-3 gap-4">
                    {[{ label: "CVR", data: test.cvr }, { label: "AOV", data: test.aov }, { label: "RPV", data: test.rpv }].map(({ label: ml, data }) => {
                      const lift = data ? calcLift(data.a, data.b) : null;
                      return (
                        <div key={ml}>
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted mb-1.5">{ml}</p>
                          {data ? (
                            <div className="flex items-baseline gap-1.5 flex-wrap">
                              <span className="text-[11px] text-subtle">{data.a}</span>
                              <span className="text-[10px] text-muted">→</span>
                              <span className="text-[12px] font-semibold text-foreground">{data.b}</span>
                              {lift && <span className={`text-[10px] font-semibold ${lift.positive ? "text-success" : "text-danger"}`}>{lift.value}</span>}
                            </div>
                          ) : <span className="text-[11px] text-muted">—</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
                {test.notes && (
                  <div className="border-t border-border px-4 py-2.5">
                    <p className="text-[11px] text-muted leading-relaxed whitespace-pre-wrap">{test.notes}</p>
                  </div>
                )}
                {test.screenshot_url && (
                  <div className="border-t border-border px-4 py-3">
                    <a href={test.screenshot_url} target="_blank" rel="noopener noreferrer">
                      <img src={test.screenshot_url} alt={test.name} className="max-h-64 rounded-md border border-border hover:border-muted transition-colors" />
                    </a>
                  </div>
                )}
                {test.figma_url && (
                  <div className="border-t border-border px-4 py-2.5">
                    <a href={test.figma_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[11px] font-medium text-subtle hover:text-foreground transition-colors">
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
          <div className="border border-dashed border-border rounded-lg p-8 text-center">
            <p className="text-sm text-subtle mb-1">No tests yet</p>
            <p className="text-xs text-subtle">Add your first test to start iterating</p>
          </div>
        )}

        {trashedTests.length > 0 && (
          <div className="border border-border rounded-lg p-4 bg-background">
            <p className="text-[10px] font-semibold text-foreground mb-3">Trash</p>
            <div className="space-y-2">
              {trashedTests.map(t => (
                <div key={t.id} className="flex items-center justify-between px-3 py-2 bg-surface rounded border border-border">
                  <p className="text-xs text-muted">{t.name}</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleRestore(t.id)} className="text-[10px] text-success hover:text-success">Restore</button>
                    <button onClick={() => handlePermanentDelete(t.id)} className="text-[10px] text-danger hover:text-danger">Delete Forever</button>
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
      {/* Tests Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-foreground">
          Tests ({activeTests.length})
        </h3>
      </div>

      {/* Test Form */}
      {showForm && (
        <div className="bg-background border border-border rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{editId ? "Edit Test" : "Add Test"}</h3>
            <button onClick={resetForm} className="text-subtle hover:text-foreground">
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
                    status === s ? "bg-white text-background" : "bg-surface text-subtle border border-border hover:bg-background"
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
                        ? r === "winner" ? "bg-success text-white" : r === "loser" ? "bg-danger text-white" : "bg-warning text-white"
                        : "bg-surface text-subtle border border-border hover:bg-background"
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
                  <p className="text-[10px] font-semibold text-subtle uppercase tracking-wider">CVR</p>
                  <input type="text" value={cvrA} onChange={(e) => setCvrA(e.target.value)} placeholder="Var A" className={inputClass} />
                  <input type="text" value={cvrB} onChange={(e) => setCvrB(e.target.value)} placeholder="Var B" className={inputClass} />
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-subtle uppercase tracking-wider">AOV</p>
                  <input type="text" value={aovA} onChange={(e) => setAovA(e.target.value)} placeholder="Var A" className={inputClass} />
                  <input type="text" value={aovB} onChange={(e) => setAovB(e.target.value)} placeholder="Var B" className={inputClass} />
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-subtle uppercase tracking-wider">RPV</p>
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
                  className="px-3 py-2 text-[11px] font-medium bg-surface-raised text-muted rounded-lg hover:bg-border disabled:opacity-30 whitespace-nowrap"
                >
                  {igFetching ? "Pulling..." : "Pull Metrics"}
                </button>
              </div>
              <p className="text-[9px] text-muted mt-1">Paste the test ID to auto-pull CVR, AOV, RPV from Intelligems</p>
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
            className="flex items-center gap-1.5 px-4 py-2 bg-white text-background text-xs font-medium rounded-lg hover:bg-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CheckIcon className="size-3.5" />
            {editId ? "Update Test" : "Add Test"}
          </button>
        </div>
      )}

      {/* Monthly Progress */}
      {monthlyCapacity > 0 && (
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-foreground">{currentMonth}</p>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-muted">
                {deliveredCount} delivered · {scheduledCount} scheduled · {ideationCount} ideation · {Math.max(0, monthlyCapacity - monthTests.length)} empty
              </span>
              {trashedTests.length > 0 && (
                <button onClick={() => setShowTrash(!showTrash)} className="text-[10px] text-muted hover:text-muted">
                  Trash ({trashedTests.length})
                </button>
              )}
            </div>
          </div>
          <div className="relative h-2 bg-surface-raised rounded-full overflow-hidden">
            {(deliveredCount + scheduledCount + ideationCount) > 0 && <div className="absolute left-0 top-0 h-full bg-purple-300 rounded-full" style={{ width: `${((deliveredCount + scheduledCount + ideationCount) / monthlyCapacity) * 100}%` }} />}
            {(deliveredCount + scheduledCount) > 0 && <div className="absolute left-0 top-0 h-full bg-blue-400 rounded-full" style={{ width: `${((deliveredCount + scheduledCount) / monthlyCapacity) * 100}%` }} />}
            {deliveredCount > 0 && <div className="absolute left-0 top-0 h-full bg-emerald-500 rounded-full" style={{ width: `${(deliveredCount / monthlyCapacity) * 100}%` }} />}
          </div>
          <div className="flex items-center gap-4 mt-2">
            <span className="flex items-center gap-1 text-[10px] text-muted"><span className="size-2 rounded-full bg-emerald-500" /> Delivered</span>
            <span className="flex items-center gap-1 text-[10px] text-muted"><span className="size-2 rounded-full bg-blue-400" /> Scheduled</span>
            <span className="flex items-center gap-1 text-[10px] text-muted"><span className="size-2 rounded-full bg-purple-300" /> Ideation</span>
            <span className="flex items-center gap-1 text-[10px] text-muted"><span className="size-2 rounded-full bg-surface-raised" /> Empty</span>
          </div>
        </div>
      )}

      {/* Needs Attention */}
      {needsAttention.length > 0 && (
        <div className="bg-warning/50 border border-warning/20 rounded-lg px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-warning mb-1.5">
            {needsAttention.length} item{needsAttention.length !== 1 ? "s" : ""} need attention
          </p>
          <div className="space-y-1">
            {needsAttention.map((item, i) => (
              <p key={i} className="text-xs text-warning">• {item.message}</p>
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
            <p className="text-[11px] font-semibold text-foreground mb-3">{weekLabel}</p>
            <div className="space-y-2">
              {weekTests.map((test) => {
                const statusStyles: Record<string, string> = {
                  ideation: "bg-purple-50 text-purple-600 border-purple-200",
                  scheduled: "bg-blue-50 text-blue-600 border-blue-200",
                  live: "bg-emerald-50 text-emerald-600 border-emerald-200",
                  complete: "bg-surface-raised text-foreground border-border",
                };
                const nextStatus: Record<string, TestStatus> = { ideation: "scheduled", scheduled: "live", live: "complete", complete: "ideation" };
                const handleStatusCycle = async () => {
                  const newStatus = nextStatus[test.status];
                  const updated = tests.map((t) => t.id === test.id ? { ...t, status: newStatus, ...(newStatus !== "complete" ? { result: undefined } : {}) } : t);
                  await onUpdateResults(updated);
                };
                const hasMetrics = test.cvr || test.aov || test.rpv;
                return (
                  <div key={test.id} className="bg-surface border border-border rounded-lg group/card overflow-hidden">
                    <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-[13px] font-semibold text-foreground truncate">{test.name}</p>
                        {test.status === "complete" && test.result && (
                          <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full shrink-0 ${
                            test.result === "winner" ? "bg-success/10 text-success" :
                            test.result === "loser" ? "bg-danger/10 text-danger" :
                            "bg-warning/10 text-warning"
                          }`}>{test.result}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={handleStatusCycle} className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-full border transition-colors ${statusStyles[test.status]}`}>
                          {test.status === "live" && <span className="inline-block size-1.5 rounded-full bg-success mr-1 align-middle" />}
                          {test.status}
                        </button>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity">
                          <button onClick={() => handleEdit(test)} className="p-1 text-[#B0B0B0] hover:text-foreground" title="Edit">
                            <svg className="size-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" /></svg>
                          </button>
                          <button
                            onClick={() => handleDeleteTest(test.id)}
                            className={`p-1 transition-colors ${confirmDeleteId === test.id ? "text-danger" : "text-[#B0B0B0] hover:text-danger"}`}
                            title={confirmDeleteId === test.id ? "Click again to confirm" : "Delete"}
                          >
                            <TrashIcon className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="px-4 pb-3">
                      <p className="text-[11px] text-subtle">
                        {test.metric}
                        <span className="text-[#D0D0D0] mx-1.5">·</span>
                        {test.startDate}{test.endDate ? ` – ${test.endDate}` : ""}
                      </p>
                    </div>
                    {hasMetrics && (
                      <div className="border-t border-border px-4 py-3 grid grid-cols-3 gap-4">
                        {[
                          { label: "CVR", data: test.cvr },
                          { label: "AOV", data: test.aov },
                          { label: "RPV", data: test.rpv },
                        ].map(({ label: metricLabel, data }) => {
                          const lift = data ? calcLift(data.a, data.b) : null;
                          return (
                            <div key={metricLabel}>
                              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted mb-1.5">{metricLabel}</p>
                              {data ? (
                                <div className="flex items-baseline gap-1.5 flex-wrap">
                                  <span className="text-[11px] text-subtle">{data.a}</span>
                                  <svg className="size-2.5 text-muted shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" /></svg>
                                  <span className="text-[12px] font-semibold text-foreground">{data.b}</span>
                                  {lift && <span className={`text-[10px] font-semibold ${lift.positive ? "text-success" : "text-danger"}`}>{lift.value}</span>}
                                </div>
                              ) : <span className="text-[11px] text-muted">—</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {test.figma_url && (
                      <div className="border-t border-border px-4 py-2.5">
                        <a href={test.figma_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[11px] font-medium text-subtle hover:text-foreground transition-colors">
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
                  className="w-full border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-subtle hover:bg-background transition-colors cursor-pointer"
                >
                  <p className="text-xs text-muted">+ Add test</p>
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {/* Trash bin */}
      {trashedTests.length > 0 && (
        <div className="border border-border rounded-lg p-4 bg-background">
          <p className="text-[10px] font-semibold text-foreground mb-3">Trash</p>
          <div className="space-y-2">
            {trashedTests.map(t => (
              <div key={t.id} className="flex items-center justify-between px-3 py-2 bg-surface rounded border border-border">
                <p className="text-xs text-muted">{t.name}</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleRestore(t.id)} className="text-[10px] text-success hover:text-success">Restore</button>
                  <button onClick={() => handlePermanentDelete(t.id)} className="text-[10px] text-danger hover:text-danger">Delete Forever</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTests.length === 0 && !showForm && slotsPerWeek === 0 && (
        <div className="border border-dashed border-border rounded-lg p-8 text-center">
          <p className="text-sm text-subtle mb-1">No tests yet</p>
          <p className="text-xs text-subtle">Select a testing tier and add your first test</p>
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
        <h3 className="text-xs font-semibold text-foreground">Development Review</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium bg-white text-background rounded-lg hover:bg-foreground"
        >
          + New Page Review
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="border border-border rounded-lg p-4 bg-surface space-y-3">
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
              className="px-4 py-2 text-xs font-medium bg-white text-background rounded-lg disabled:opacity-30"
            >
              Create
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-xs text-subtle"
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
                  ? "bg-white text-background"
                  : "bg-surface-raised text-subtle hover:bg-border"
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
          <div className="border border-border rounded-xl bg-surface overflow-hidden">
            {/* Page Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <div>
                <p className="text-sm font-semibold text-foreground">{activeReview.title}</p>
                {activeReview.description && (
                  <p className="text-xs text-subtle mt-0.5">{activeReview.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={activeReview.status}
                  onChange={async (e) => {
                    await updateReviewStatus(activeReview.id, e.target.value as "pending" | "approved" | "changes_requested");
                    onReload();
                  }}
                  className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full border bg-surface cursor-pointer"
                >
                  <option value="pending">In Review</option>
                  <option value="approved">Approved</option>
                  <option value="changes_requested">Changes Requested</option>
                </select>
                <button
                  onClick={() => handleDeletePageReview(activeReview.id)}
                  className={`px-2.5 py-1 text-[10px] font-medium rounded-lg transition-colors ${
                    confirmDelete === activeReview.id
                      ? "bg-danger text-white"
                      : "text-muted hover:text-danger"
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
                      <div key={v.id} className={`flex items-center justify-between p-3 rounded-lg ${isLatest ? "bg-background border border-border" : "bg-surface"}`}>
                        <div className="flex items-center gap-3">
                          <span className={`inline-flex items-center justify-center size-7 rounded-full text-[11px] font-bold ${isLatest ? "bg-white text-background" : "bg-surface-raised text-muted"}`}>
                            V{v.version_number}
                          </span>
                          <div>
                            <p className="text-xs font-medium text-foreground">
                              Version {v.version_number}
                              {isLatest && <span className="ml-2 text-[10px] text-success font-semibold">Latest</span>}
                            </p>
                            <p className="text-[10px] text-muted">{vDate}{v.notes ? ` — ${v.notes}` : ""}</p>
                          </div>
                        </div>
                        {v.staging_url && (
                          <a
                            href={v.staging_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-muted border border-border rounded-lg hover:text-foreground hover:border-subtle transition-colors"
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
                <p className="text-xs text-muted text-center py-4">No versions yet</p>
              )}

              {/* Add new version inline */}
              <AddVersionForm onAdd={(url) => handleAddVersion(activeReview.id, url)} />
            </div>

            {/* Feedback */}
            {feedback.length > 0 && (
              <div className="px-5 py-3 border-t border-border bg-background">
                <p className="text-[10px] font-semibold text-foreground mb-2">Client Feedback</p>
                <div className="space-y-2">
                  {feedback.map((item) => (
                    <div key={item.id} className="flex items-start gap-2">
                      <div className={`size-2 rounded-full mt-1.5 shrink-0 ${item.resolved ? "bg-success" : "bg-warning"}`} />
                      <div className="flex-1">
                        <p className="text-xs text-foreground">{item.comment}</p>
                        <p className="text-[10px] text-muted">
                          {item.submitted_by} · {new Date(item.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          await updateFeedbackResolved(item.id, !item.resolved);
                          onReload();
                        }}
                        className={`text-[10px] font-medium px-2 py-0.5 rounded transition-colors ${
                          item.resolved ? "text-success hover:text-muted" : "text-muted hover:text-success"
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
        <div className="border border-dashed border-border rounded-lg p-8 text-center">
          <p className="text-sm text-subtle mb-1">No page reviews yet</p>
          <p className="text-xs text-subtle">Add a staging URL to start collecting feedback</p>
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
        className="mt-3 text-[11px] text-subtle hover:text-foreground transition-colors"
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
        className="flex-1 px-2 py-1.5 text-xs border border-border rounded"
      />
      <button
        onClick={() => { onAdd(url); setUrl(""); setShow(false); }}
        disabled={!url.trim()}
        className="px-3 py-1.5 text-[10px] font-medium bg-white text-background rounded disabled:opacity-30"
      >
        Add
      </button>
      <button
        onClick={() => { setShow(false); setUrl(""); }}
        className="text-[10px] text-subtle"
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
      <p className="text-[11px] font-medium text-subtle mb-2">Team</p>

      {/* Assigned members */}
      {validAssigned.length > 0 && (
        <div className="space-y-1 mb-2">
          {validAssigned.map(id => {
            const m = team.find(t => t.id === id);
            if (!m) return null;
            return (
              <div key={m.id} className="flex items-center gap-2 px-2.5 py-1.5 bg-success/10 border border-success/20 rounded-lg">
                <div className="size-1.5 rounded-full bg-success" />
                <span className="text-[11px] font-medium text-success">{m.name}</span>
                <span className="text-[9px] text-success ml-auto">{m.role}</span>
                <button
                  onClick={() => removeMember(m.id)}
                  className="text-success/70 hover:text-danger transition-colors ml-1"
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
          className="w-full text-[11px] text-muted px-2.5 py-1.5 border border-border rounded-lg bg-surface cursor-pointer"
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
  const [editingInternalSlack, setEditingInternalSlack] = useState(false);
  const [internalSlackVal, setInternalSlackVal] = useState(portal.slack_internal_channel_id || "");

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

  const ROW = "flex items-center justify-between px-5 py-3.5";
  const LABEL = "text-[13px] font-medium text-muted";
  const EMPTY = "text-[13px] text-muted";

  return (
    <div className="border border-border rounded-xl bg-surface divide-y divide-border mb-6 overflow-hidden">
      {/* Designers */}
      <div className={ROW}>
        <p className={LABEL}>Designers</p>
        <div className="flex flex-wrap gap-1.5 items-center justify-end">
          {designers.map(m => (
            <span key={m.id} className="inline-flex items-center gap-1.5 text-xs font-medium bg-cat-design/10 text-cat-design px-2.5 py-1 rounded-lg">
              {m.name}
              <button onClick={() => removeMember(m.id)} className="text-cat-design/60 hover:text-danger transition-colors">
                <XMarkIcon className="size-3" />
              </button>
            </span>
          ))}
          {allDesigners.filter(m => !designers.some(d => d.id === m.id)).length > 0 && (
            <select
              value=""
              onChange={(e) => { if (e.target.value) addMember(e.target.value); }}
              className="text-[13px] text-subtle bg-background border border-border rounded-lg pl-3 pr-7 py-1.5 cursor-pointer hover:border-border transition-colors appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23999%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_8px_center]"
            >
              <option value="">+ Add</option>
              {allDesigners.filter(m => !designers.some(d => d.id === m.id)).map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          )}
          {designers.length === 0 && allDesigners.length === 0 && <span className={EMPTY}>No designers in team</span>}
        </div>
      </div>

      {/* Developers */}
      <div className={ROW}>
        <p className={LABEL}>Developers</p>
        <div className="flex flex-wrap gap-1.5 items-center justify-end">
          {devs.map(m => (
            <span key={m.id} className="inline-flex items-center gap-1.5 text-xs font-medium bg-cat-dev/10 text-cat-dev px-2.5 py-1 rounded-lg">
              {m.name}
              <button onClick={() => removeMember(m.id)} className="text-cat-dev/60 hover:text-danger transition-colors">
                <XMarkIcon className="size-3" />
              </button>
            </span>
          ))}
          {allDevs.filter(m => !devs.some(d => d.id === m.id)).length > 0 && (
            <select
              value=""
              onChange={(e) => { if (e.target.value) addMember(e.target.value); }}
              className="text-[13px] text-subtle bg-background border border-border rounded-lg pl-3 pr-7 py-1.5 cursor-pointer hover:border-border transition-colors appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23999%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_8px_center]"
            >
              <option value="">+ Add</option>
              {allDevs.filter(m => !devs.some(d => d.id === m.id)).map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          )}
          {devs.length === 0 && allDevs.length === 0 && <span className={EMPTY}>No developers in team</span>}
        </div>
      </div>

      {/* Slack (Client) */}
      <div className={ROW}>
        <p className={LABEL}>Slack (Client)</p>
        {editingSlack ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={slackVal}
              onChange={(e) => setSlackVal(e.target.value)}
              className="text-xs font-mono px-3 py-1.5 border border-border rounded-lg w-44 bg-background focus:bg-surface focus:border-muted outline-none transition-colors"
              placeholder="C0XXXXXXX"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") { onUpdateField("slack_channel_url", slackVal); setEditingSlack(false); } if (e.key === "Escape") { setSlackVal(portal.slack_channel_url || ""); setEditingSlack(false); } }}
            />
            <button onClick={() => { onUpdateField("slack_channel_url", slackVal); setEditingSlack(false); }} className="text-xs font-medium text-success hover:text-success">Save</button>
            <button onClick={() => { setSlackVal(portal.slack_channel_url || ""); setEditingSlack(false); }} className="text-xs text-subtle hover:text-muted">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setEditingSlack(true)} className={`text-[13px] font-mono px-3 py-1.5 rounded-lg border transition-colors ${portal.slack_channel_url ? "text-foreground bg-background border-border hover:border-border" : "text-muted bg-background border-border hover:border-border"}`}>
            {portal.slack_channel_url || "Click to set"}
          </button>
        )}
      </div>

      {/* Slack (Internal) */}
      <div className={ROW}>
        <p className={LABEL}>Slack (Internal)</p>
        {editingInternalSlack ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={internalSlackVal}
              onChange={(e) => setInternalSlackVal(e.target.value)}
              className="text-xs font-mono px-3 py-1.5 border border-border rounded-lg w-44 bg-background focus:bg-surface focus:border-muted outline-none transition-colors"
              placeholder="C0XXXXXXX"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") { onUpdateField("slack_internal_channel_id", internalSlackVal); setEditingInternalSlack(false); } if (e.key === "Escape") { setInternalSlackVal(portal.slack_internal_channel_id || ""); setEditingInternalSlack(false); } }}
            />
            <button onClick={() => { onUpdateField("slack_internal_channel_id", internalSlackVal); setEditingInternalSlack(false); }} className="text-xs font-medium text-success hover:text-success">Save</button>
            <button onClick={() => { setInternalSlackVal(portal.slack_internal_channel_id || ""); setEditingInternalSlack(false); }} className="text-xs text-subtle hover:text-muted">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setEditingInternalSlack(true)} className={`text-[13px] font-mono px-3 py-1.5 rounded-lg border transition-colors ${portal.slack_internal_channel_id ? "text-foreground bg-background border-border hover:border-border" : "text-muted bg-background border-border hover:border-border"}`}>
            {portal.slack_internal_channel_id || "Click to set"}
          </button>
        )}
      </div>

      {/* Next Touchpoint */}
      <div className={ROW}>
        <p className={LABEL}>Next Touchpoint</p>
        {(() => {
          const nextDate = getNextTouchpointDate();
          if (!nextDate) return <span className={EMPTY}>No touchpoint days set</span>;
          const days = Math.ceil((new Date(nextDate + "T00:00:00").getTime() - Date.now()) / 86400000);
          const dayName = new Date(nextDate + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
          return (
            <p className={`text-[13px] font-semibold ${days === 0 ? "text-success" : days === 1 ? "text-warning" : "text-foreground"}`}>
              {dayName}
              <span className="ml-2 text-xs font-normal text-subtle">{days === 0 ? "Today" : days === 1 ? "Tomorrow" : `in ${days}d`}</span>
            </p>
          );
        })()}
      </div>
    </div>
  );
}

/* ─── Sidebar Client Details (compact) ─── */
function SidebarClientDetails({ portal, team, onUpdateField }: { portal: PortalData; team: TeamMember[]; onUpdateField: (field: string, value: unknown) => void }) {
  const [editingSlack, setEditingSlack] = useState<"client" | "internal" | null>(null);
  const [slackVal, setSlackVal] = useState("");

  const assigned = (portal.team_member_ids || []).map(id => team.find(t => t.id === id)).filter(Boolean) as TeamMember[];
  const designers = assigned.filter(m => m.role.toLowerCase().includes("design"));
  const devs = assigned.filter(m => m.role.toLowerCase().includes("develop") || m.role.toLowerCase().includes("head of dev"));
  const allDesigners = team.filter(m => m.role.toLowerCase().includes("design"));
  const allDevs = team.filter(m => m.role.toLowerCase().includes("develop") || m.role.toLowerCase().includes("head of dev"));
  const unassigned = [...allDesigners, ...allDevs].filter(m => !assigned.some(a => a.id === m.id));

  const addMember = (id: string) => {
    const current = portal.team_member_ids || [];
    if (current.includes(id)) return;
    onUpdateField("team_member_ids", [...current, id]);
  };
  const removeMember = (id: string) => {
    onUpdateField("team_member_ids", (portal.team_member_ids || []).filter(m => m !== id));
  };

  const startEditSlack = (which: "client" | "internal") => {
    setEditingSlack(which);
    setSlackVal(which === "client" ? (portal.slack_channel_url || "") : (portal.slack_internal_channel_id || ""));
  };

  const saveSlack = () => {
    if (editingSlack === "client") onUpdateField("slack_channel_url", slackVal);
    else if (editingSlack === "internal") onUpdateField("slack_internal_channel_id", slackVal);
    setEditingSlack(null);
  };

  return (
    <>
      {/* Client Settings */}
      <div>
        <p className="text-[11px] font-semibold text-foreground mb-2">Client Settings</p>
        <div className="space-y-1">
          {designers.map(m => (
            <div key={m.id} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-cat-design/10 group">
              <div className="min-w-0">
                <span className="text-xs font-medium text-cat-design truncate block">{m.name}</span>
                <span className="text-[10px] text-cat-design/70">Designer</span>
              </div>
              <button onClick={() => removeMember(m.id)} className="text-cat-design/60 hover:text-danger p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="size-3" viewBox="0 0 20 20" fill="currentColor"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
              </button>
            </div>
          ))}
          {devs.map(m => (
            <div key={m.id} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-cat-dev/10 group">
              <div className="min-w-0">
                <span className="text-xs font-medium text-cat-dev truncate block">{m.name}</span>
                <span className="text-[10px] text-cat-dev/70">Developer</span>
              </div>
              <button onClick={() => removeMember(m.id)} className="text-cat-dev/60 hover:text-danger p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="size-3" viewBox="0 0 20 20" fill="currentColor"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
              </button>
            </div>
          ))}
          {unassigned.length > 0 && (
            <select
              value=""
              onChange={(e) => { if (e.target.value) addMember(e.target.value); }}
              className="w-full text-xs text-subtle px-2 py-1.5 border border-dashed border-border rounded-md bg-transparent cursor-pointer focus:outline-none hover:border-border"
            >
              <option value="">+ Add member</option>
              {unassigned.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          )}
          {assigned.length === 0 && unassigned.length === 0 && (
            <p className="text-xs text-muted">No team in directory</p>
          )}
        </div>
      </div>

      {/* Slack */}
      <div>
        <p className="text-[11px] font-semibold text-foreground mb-2">Slack</p>
        <div className="space-y-1.5">
          {/* Client channel */}
          <div>
            <p className="text-[10px] text-subtle mb-0.5">Client</p>
            {editingSlack === "client" ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={slackVal}
                  onChange={(e) => setSlackVal(e.target.value)}
                  className="flex-1 text-xs font-mono px-2 py-1 border border-border rounded w-full"
                  placeholder="C0XXXXXXX"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") saveSlack(); if (e.key === "Escape") setEditingSlack(null); }}
                />
                <button onClick={saveSlack} className="text-[10px] font-medium text-success shrink-0">Save</button>
              </div>
            ) : (
              <button onClick={() => startEditSlack("client")} className="text-xs font-mono text-foreground hover:text-info transition-colors truncate block w-full text-left">
                {portal.slack_channel_url || <span className="text-muted">Click to set</span>}
              </button>
            )}
          </div>
          {/* Internal channel */}
          <div>
            <p className="text-[10px] text-subtle mb-0.5">Internal</p>
            {editingSlack === "internal" ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={slackVal}
                  onChange={(e) => setSlackVal(e.target.value)}
                  className="flex-1 text-xs font-mono px-2 py-1 border border-border rounded w-full"
                  placeholder="C0XXXXXXX"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") saveSlack(); if (e.key === "Escape") setEditingSlack(null); }}
                />
                <button onClick={saveSlack} className="text-[10px] font-medium text-success shrink-0">Save</button>
              </div>
            ) : (
              <button onClick={() => startEditSlack("internal")} className="text-xs font-mono text-foreground hover:text-info transition-colors truncate block w-full text-left">
                {portal.slack_internal_channel_id || <span className="text-muted">Click to set</span>}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Next Touchpoint */}
      <div>
        <p className="text-[11px] font-semibold text-foreground mb-2">Touchpoint</p>
        {(() => {
          const nextDate = getNextTouchpointDate();
          if (!nextDate) return <p className="text-xs text-muted">Not set</p>;
          const days = Math.ceil((new Date(nextDate + "T00:00:00").getTime() - Date.now()) / 86400000);
          const dayName = new Date(nextDate + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
          return (
            <p className={`text-xs font-medium ${days === 0 ? "text-success" : days === 1 ? "text-warning" : "text-foreground"}`}>
              {dayName}
              <span className="ml-1 text-[11px] font-normal text-muted">{days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days}d`}</span>
            </p>
          );
        })()}
      </div>
    </>
  );
}

/* ─── Funnels Tab (Miro embed + linked funnels) ─── */
function FunnelsTab({
  portal,
  funnels,
  onUpdatePortal,
}: {
  portal: PortalData;
  funnels: FunnelData[];
  onUpdatePortal: (patch: Partial<PortalData>) => Promise<void>;
}) {
  const [miroDraft, setMiroDraft] = useState(portal.miro_board_url || "");
  const [editing, setEditing] = useState(!portal.miro_board_url);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const docs = portal.funnel_documents || [];

  const embedSrc = (url: string): string => {
    // Miro share link: https://miro.com/app/board/uXjVL_abc=/
    // Embed form:      https://miro.com/app/live-embed/uXjVL_abc=/
    if (!url) return "";
    if (url.includes("/app/live-embed/") || url.includes("/app/embed/")) return url;
    return url.replace("/app/board/", "/app/live-embed/");
  };

  const handleSave = async () => {
    await onUpdatePortal({ miro_board_url: miroDraft.trim() || undefined });
    setEditing(false);
  };

  const handleDocUpload = async (file: File) => {
    setUploadingDoc(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/design-brief/upload?bucket=design-briefs", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      if (data.url) {
        const doc: FunnelDocument = {
          id: crypto.randomUUID(),
          name: file.name,
          url: data.url,
          size: file.size,
          uploaded_at: new Date().toISOString(),
        };
        await onUpdatePortal({ funnel_documents: [...docs, doc] });
      }
    } catch { /* silent */ }
    setUploadingDoc(false);
  };

  const handleDocDelete = async (id: string) => {
    await onUpdatePortal({ funnel_documents: docs.filter(d => d.id !== id) });
  };

  const formatSize = (bytes?: number): string => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-8 mb-6">
      {/* Miro board */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-foreground">Miro Board</h3>
          {portal.miro_board_url && !editing && (
            <button onClick={() => setEditing(true)} className="text-[11px] font-medium text-subtle hover:text-foreground">
              Edit URL
            </button>
          )}
        </div>
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={miroDraft}
              onChange={(e) => setMiroDraft(e.target.value)}
              placeholder="Paste a Miro board share link"
              className={inputClass + " flex-1"}
            />
            <button
              onClick={handleSave}
              className="px-3 py-1.5 text-[11px] font-medium bg-white text-background rounded-lg hover:bg-foreground"
            >
              Save
            </button>
            {portal.miro_board_url && (
              <button
                onClick={() => { setMiroDraft(portal.miro_board_url || ""); setEditing(false); }}
                className="px-3 py-1.5 text-[11px] font-medium text-subtle hover:text-foreground"
              >
                Cancel
              </button>
            )}
          </div>
        ) : portal.miro_board_url ? (
          <div className="relative aspect-[16/10] rounded-xl overflow-hidden border border-border bg-background">
            <iframe
              src={embedSrc(portal.miro_board_url)}
              className="absolute inset-0 w-full h-full"
              frameBorder={0}
              scrolling="no"
              allow="fullscreen; clipboard-read; clipboard-write"
              allowFullScreen
            />
          </div>
        ) : (
          <p className="text-xs text-muted py-2">No Miro board linked yet.</p>
        )}
      </div>

      {/* Documents */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-foreground">Documents</h3>
          <label className="text-[11px] font-medium text-subtle hover:text-foreground cursor-pointer">
            <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleDocUpload(f); e.target.value = ""; }} />
            {uploadingDoc ? "Uploading…" : "+ Upload"}
          </label>
        </div>
        {docs.length > 0 ? (
          <div className="divide-y divide-border border border-border rounded-xl bg-surface">
            {docs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between px-4 py-3 group">
                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 min-w-0 flex-1 hover:text-foreground">
                  <svg className="size-4 text-muted shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  </svg>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                    <p className="text-[10px] text-muted">
                      {new Date(doc.uploaded_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      {doc.size ? ` · ${formatSize(doc.size)}` : ""}
                    </p>
                  </div>
                </a>
                <button
                  onClick={() => handleDocDelete(doc.id)}
                  className="ml-3 p-1.5 text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete"
                >
                  <TrashIcon className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted py-2">No documents uploaded yet.</p>
        )}
      </div>

      {/* Funnels list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-foreground">Funnels</h3>
          <Link
            href={`/tools/funnel-builder?clientId=${portal.id}&clientName=${encodeURIComponent(portal.client_name)}`}
            className="text-[11px] font-medium text-subtle hover:text-foreground"
          >
            + New Funnel
          </Link>
        </div>
        {funnels.length > 0 ? (
          <div className="divide-y divide-border">
            {funnels.map((funnel) => (
              <Link
                key={funnel.id}
                href={`/tools/funnel-builder?id=${funnel.id}`}
                className="flex items-center justify-between py-3 hover:bg-background transition-colors rounded-lg px-2"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{funnel.name || "Untitled Funnel"}</p>
                  <p className="text-[10px] text-muted">{funnel.nodes.length} nodes</p>
                </div>
                <svg className="size-4 text-muted" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted py-2">No funnels linked yet</p>
        )}
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
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-foreground">Reports</h3>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white text-background rounded-lg hover:bg-border transition-colors"
        >
          <PlusIcon className="size-3.5" />
          Upload Report
        </button>
      </div>

      {showUpload && (
        <div className="border border-border rounded-xl p-5 space-y-4 bg-surface">
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
            <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-foreground transition-colors">
              <input
                type="file"
                accept=".docx"
                onChange={handleFile}
                className="hidden"
              />
              {uploading ? (
                <span className="text-xs text-subtle">Extracting content...</span>
              ) : fileName ? (
                <span className="text-xs text-foreground font-medium">{fileName}</span>
              ) : (
                <span className="text-xs text-subtle">Click to select .docx file (max 5MB)</span>
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
                  className="px-4 py-2 text-xs font-medium bg-white text-background rounded-lg hover:bg-border transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Publish"}
                </button>
                <button
                  onClick={() => handleSave(false)}
                  disabled={saving || !title}
                  className="px-4 py-2 text-xs font-medium bg-surface border border-border text-foreground rounded-lg hover:bg-background transition-colors disabled:opacity-50"
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
                  className="px-4 py-2 text-xs font-medium text-subtle hover:text-foreground transition-colors"
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
            className="flex items-center gap-1 text-xs font-medium text-subtle hover:text-foreground transition-colors"
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
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <p className="text-sm text-subtle mb-1">No reports yet</p>
          <p className="text-xs text-subtle">Upload a .docx to create a branded weekly report</p>
        </div>
      )}

      {!previewReport && reports.length > 0 && (
        <div className="space-y-2">
          {reports.map((report) => (
            <div
              key={report.id}
              className="flex items-center justify-between p-4 border border-border rounded-xl bg-surface"
            >
              <div
                className="min-w-0 flex-1 cursor-pointer"
                onClick={() => setPreviewId(report.id)}
              >
                <p className="text-sm font-medium text-foreground truncate hover:underline">
                  {report.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-subtle">
                    {new Date(report.date + "T00:00:00").toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      report.published
                        ? "bg-success/10 text-success"
                        : "bg-warning/10 text-warning"
                    }`}
                  >
                    {report.published ? "Published" : "Draft"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-3">
                <button
                  onClick={() => togglePublish(report.id)}
                  className="px-2 py-1 text-[11px] font-medium text-subtle hover:text-foreground transition-colors"
                >
                  {report.published ? "Unpublish" : "Publish"}
                </button>
                <button
                  onClick={() => deleteReport(report.id)}
                  className="p-1 text-muted hover:text-danger transition-colors"
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

/* ─── Blocker Flag Modal ─── */
function BlockerFlagModal({
  portal,
  onClose,
  onFlag,
}: {
  portal: PortalData;
  onClose: () => void;
  onFlag: (blocker: PortalBlocker) => void;
}) {
  const [reason, setReason] = useState("");
  const [blockerType, setBlockerType] = useState<"client" | "internal" | "external">("client");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">Flag Blocker</h3>
          <button onClick={onClose} className="text-muted hover:text-subtle"><XMarkIcon className="size-5" /></button>
        </div>

        <div>
          <p className="text-[11px] font-medium text-muted mb-2">Type</p>
          <div className="flex items-center gap-1.5">
            {(["client", "internal", "external"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setBlockerType(t)}
                className={`px-3 py-1.5 text-[11px] font-medium rounded-lg transition-colors ${
                  blockerType === t
                    ? "bg-danger text-white"
                    : "bg-background text-muted hover:bg-surface-raised"
                }`}
              >
                {t === "client" ? "Client" : t === "internal" ? "Internal" : "External"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-medium text-muted mb-2">Internal reason (team only)</p>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Client hasn't replied to design review request"
            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-surface"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && reason.trim()) {
                onFlag({ type: blockerType, reason: reason.trim(), since: new Date().toISOString() });
              }
            }}
          />
        </div>

        <p className="text-[10px] text-muted">
          Timeline dates will be snapshotted. When resolved, you can shift all future phases by the days lost.
        </p>

        <button
          onClick={() => {
            if (!reason.trim()) return;
            onFlag({ type: blockerType, reason: reason.trim(), since: new Date().toISOString() });
          }}
          disabled={!reason.trim()}
          className="w-full py-2.5 text-sm font-semibold bg-danger text-white rounded-lg hover:bg-danger/90 transition-colors disabled:opacity-40"
        >
          Flag Blocker
        </button>
      </div>
    </div>
  );
}

/* ─── Resolve Blocker Modal ─── */
function ResolveBlockerModal({
  portal,
  onClose,
  onResolve,
}: {
  portal: PortalData;
  onClose: () => void;
  onResolve: (shiftDays: number) => void;
}) {
  const blocker = portal.blocker!;
  const daysSince = Math.max(0, Math.floor((Date.now() - new Date(blocker.since).getTime()) / 86400000));

  // Calculate business days
  const countBusinessDays = (start: Date, end: Date) => {
    let count = 0;
    const d = new Date(start);
    while (d < end) {
      d.setDate(d.getDate() + 1);
      const dow = d.getDay();
      if (dow !== 0 && dow !== 6) count++;
    }
    return count;
  };
  const businessDays = countBusinessDays(new Date(blocker.since), new Date());

  const [shiftDays, setShiftDays] = useState(businessDays);

  // Preview shifted dates
  const previewPhases = (portal.phases || []).map(phase => {
    if (phase.status === "complete" || shiftDays === 0) return { ...phase, newStart: phase.startDate, newEnd: phase.endDate };
    const shiftDate = (iso: string) => {
      let remaining = shiftDays;
      const d = new Date(iso + "T00:00:00");
      while (remaining > 0) {
        d.setDate(d.getDate() + 1);
        const dow = d.getDay();
        if (dow !== 0 && dow !== 6) remaining--;
      }
      return d.toISOString().split("T")[0];
    };
    return {
      ...phase,
      newStart: phase.startDate ? shiftDate(phase.startDate) : undefined,
      newEnd: phase.endDate ? shiftDate(phase.endDate) : undefined,
    };
  });

  const fmtShort = (iso?: string) => {
    if (!iso) return "?";
    return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-xl w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">Resolve Blocker</h3>
          <button onClick={onClose} className="text-muted hover:text-subtle"><XMarkIcon className="size-5" /></button>
        </div>

        {/* Blocker summary */}
        <div className="bg-danger/10 border border-danger/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="size-1.5 rounded-full bg-danger" />
            <span className="text-xs font-semibold text-danger capitalize">{blocker.type}</span>
            <span className="text-[10px] text-danger bg-danger/10 px-2 py-0.5 rounded-full">{daysSince}d ({businessDays} business days)</span>
          </div>
          <p className="text-xs text-danger">{blocker.reason}</p>
        </div>

        {/* Shift controls */}
        <div>
          <p className="text-[11px] font-medium text-muted mb-2">Shift timeline forward by</p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShiftDays(Math.max(0, shiftDays - 1))}
                className="size-7 flex items-center justify-center border border-border rounded-lg text-muted hover:bg-background text-sm"
              >
                −
              </button>
              <input
                type="number"
                value={shiftDays}
                onChange={(e) => setShiftDays(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-16 text-center text-sm font-semibold border border-border rounded-lg py-1.5"
              />
              <button
                onClick={() => setShiftDays(shiftDays + 1)}
                className="size-7 flex items-center justify-center border border-border rounded-lg text-muted hover:bg-background text-sm"
              >
                +
              </button>
            </div>
            <span className="text-xs text-subtle">business days</span>
            {shiftDays !== businessDays && (
              <button onClick={() => setShiftDays(businessDays)} className="text-[10px] text-info hover:underline">
                Reset to {businessDays}d
              </button>
            )}
          </div>
        </div>

        {/* Timeline preview */}
        {shiftDays > 0 && previewPhases.filter(p => p.status !== "complete").length > 0 && (
          <div>
            <p className="text-[11px] font-medium text-muted mb-2">Timeline preview</p>
            <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
              {previewPhases.map(phase => (
                <div key={phase.id} className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`size-1.5 rounded-full shrink-0 ${phase.status === "complete" ? "bg-success" : "bg-muted"}`} />
                    <span className={`text-xs font-medium truncate ${phase.status === "complete" ? "text-muted" : "text-foreground"}`}>{phase.name}</span>
                  </div>
                  {phase.status === "complete" ? (
                    <span className="text-[10px] text-muted">Complete</span>
                  ) : (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-muted line-through">{fmtShort(phase.startDate)} — {fmtShort(phase.endDate)}</span>
                      <span className="text-[10px] text-foreground font-medium">{fmtShort(phase.newStart)} — {fmtShort(phase.newEnd)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {shiftDays === 0 && (
          <p className="text-xs text-muted bg-background p-3 rounded-lg">
            No timeline shift — dates stay as they are. The blocker will still be logged in history.
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={() => onResolve(shiftDays)}
            className="flex-1 py-2.5 text-sm font-semibold bg-success text-white rounded-lg hover:bg-success transition-colors"
          >
            {shiftDays > 0 ? `Resolve & Shift +${shiftDays}d` : "Resolve (No Shift)"}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-muted hover:text-foreground transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Client-Level Context Tab ─── */
function ClientContextTab({
  portal,
  onUpdatePortal,
  onUpdateProject,
}: {
  portal: PortalData;
  onUpdatePortal: (patch: Partial<PortalData>) => Promise<void>;
  onUpdateProject: (projectId: string, patch: Partial<PortalProject>) => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [source, setSource] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [rawTranscript, setRawTranscript] = useState("");
  const [cleanVersion, setCleanVersion] = useState("");
  const [cleaning, setCleaning] = useState(false);
  const [targetProject, setTargetProject] = useState<string>("_client");

  const handleClean = async () => {
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

  const handleSave = async () => {
    if (!cleanVersion.trim()) return;
    const entry: ContextEntry = {
      id: crypto.randomUUID(),
      date,
      source: source.trim() || "Voice note",
      rawTranscript: rawTranscript.trim(),
      cleanVersion: cleanVersion.trim(),
      created_at: new Date().toISOString(),
    };

    if (targetProject === "_client") {
      await onUpdatePortal({ context_entries: [entry, ...(portal.context_entries || [])] });
    } else {
      const project = portal.projects.find(p => p.id === targetProject);
      if (project) {
        await onUpdateProject(targetProject, { context_entries: [entry, ...(project.context_entries || [])] });
      }
    }

    setShowForm(false);
    setSource("");
    setRawTranscript("");
    setCleanVersion("");
    setTargetProject("_client");
  };

  const handleDelete = async (entryId: string, projectId?: string) => {
    if (projectId) {
      const project = portal.projects.find(p => p.id === projectId);
      if (project) {
        await onUpdateProject(projectId, { context_entries: (project.context_entries || []).filter(e => e.id !== entryId) });
      }
    } else {
      await onUpdatePortal({ context_entries: (portal.context_entries || []).filter(e => e.id !== entryId) });
    }
  };

  // Aggregate all entries with source project info
  const allEntries: Array<ContextEntry & { _projectId?: string; _projectName: string }> = [
    ...(portal.context_entries || []).map(e => ({ ...e, _projectName: "General" })),
    ...portal.projects.flatMap(p =>
      (p.context_entries || []).map(e => ({ ...e, _projectId: p.id, _projectName: p.name }))
    ),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Context</h3>
          <p className="text-xs text-subtle mt-0.5">Drop in call transcripts, voice notes — AI strips pricing and organises for the team</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted border border-border rounded-lg hover:bg-background transition-colors"
        >
          <PlusIcon className="size-3" />
          Add Context
        </button>
      </div>

      {showForm && (
        <div className="border border-border rounded-xl p-5 mb-6 space-y-4 bg-background">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-medium text-muted block mb-1.5">Source</label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g. AJ voice note"
                className="w-full text-sm px-3 py-2 border border-border rounded-lg bg-surface focus:border-muted outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted block mb-1.5">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-border rounded-lg bg-surface focus:border-muted outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted block mb-1.5">Save to</label>
              <select
                value={targetProject}
                onChange={(e) => setTargetProject(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-border rounded-lg bg-surface focus:border-muted outline-none transition-colors"
              >
                <option value="_client">General (client-level)</option>
                {portal.projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted block mb-1.5">Raw Transcript</label>
            <textarea
              value={rawTranscript}
              onChange={(e) => setRawTranscript(e.target.value)}
              placeholder="Paste the voice note or call transcript here..."
              className="w-full text-sm px-3 py-2.5 border border-border rounded-lg bg-surface min-h-[140px] resize-y focus:border-muted outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClean}
              disabled={!rawTranscript.trim() || cleaning}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-white text-background rounded-lg hover:bg-foreground transition-colors disabled:opacity-40"
            >
              <SparklesIcon className="size-3.5" />
              {cleaning ? "Cleaning..." : "Clean with AI"}
            </button>
            <button
              onClick={() => { setShowForm(false); setRawTranscript(""); setCleanVersion(""); }}
              className="px-3 py-2 text-xs text-subtle hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>

          {cleanVersion && (
            <div className="border-t border-border pt-4 mt-2">
              <label className="text-[11px] font-medium text-muted block mb-1.5">Cleaned Version (editable)</label>
              <textarea
                value={cleanVersion}
                onChange={(e) => setCleanVersion(e.target.value)}
                className="w-full text-sm px-3 py-2.5 border border-border rounded-lg bg-surface min-h-[160px] resize-y focus:border-muted outline-none transition-colors"
              />
              <button
                onClick={handleSave}
                className="mt-3 px-5 py-2.5 text-sm font-medium bg-white text-background rounded-lg hover:bg-foreground transition-colors"
              >
                Save Context
              </button>
            </div>
          )}
        </div>
      )}

      {allEntries.length === 0 && !showForm && (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <p className="text-sm text-muted">No context entries yet</p>
          <p className="text-xs text-muted mt-1">Add a voice note or call transcript to get started</p>
        </div>
      )}

      <div className="space-y-3">
        {allEntries.map((entry) => (
          <div key={entry.id} className="border border-border rounded-xl p-5 bg-surface">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-medium text-foreground">{entry.source}</span>
                <span className="text-xs text-muted">
                  {new Date(entry.date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </span>
                <span className="text-[10px] font-medium text-muted bg-surface-raised px-2 py-0.5 rounded-md">{entry._projectName}</span>
              </div>
              <button
                onClick={() => handleDelete(entry.id, entry._projectId)}
                className="text-muted hover:text-danger transition-colors"
              >
                <TrashIcon className="size-3.5" />
              </button>
            </div>
            <div className="text-sm text-muted leading-relaxed whitespace-pre-wrap">{entry.cleanVersion}</div>
            <details className="mt-3">
              <summary className="text-[11px] text-muted cursor-pointer hover:text-subtle transition-colors">Raw transcript</summary>
              <p className="text-xs text-muted mt-2 whitespace-pre-wrap leading-relaxed">{entry.rawTranscript}</p>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
}
