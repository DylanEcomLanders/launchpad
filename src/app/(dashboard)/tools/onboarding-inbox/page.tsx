"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { onboardingStore, type OnboardingSubmission } from "@/lib/onboarding";
import { getPortals, createPortal, updatePortal } from "@/lib/portal/data";
import type { PortalData, ScopeItem } from "@/lib/portal/types";
import { spawnEngagementFromOnboarding } from "@/lib/engagement-spawn";
import Link from "next/link";
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowTopRightOnSquareIcon,
  ChevronRightIcon,
  XMarkIcon,
  InformationCircleIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { PAGE_LABEL, type PageType } from "@/lib/pods-v2/types";

// Dark-mode chip palette — translucent accent bg so the badge reads as a hint,
// not a flood-coloured pill. Text is the saturated accent for legibility.
const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "#FBBF24", bg: "rgba(245, 158, 11, 0.15)" },
  "in-progress": { label: "In Progress", color: "#60A5FA", bg: "rgba(59, 130, 246, 0.15)" },
  approved: { label: "Approved", color: "#34D399", bg: "rgba(16, 185, 129, 0.15)" },
  rejected: { label: "Rejected", color: "#F87171", bg: "rgba(239, 68, 68, 0.15)" },
  archived: { label: "Archived", color: "#9CA3AF", bg: "rgba(156, 163, 175, 0.12)" },
};

/* Build portal-shaped scope items from a submission's PM-captured
 * deliverables. Falls back to parsing the legacy comma-separated
 * `page_type` field if no structured deliverables were captured. */
function deliverablesToScope(submission: OnboardingSubmission): ScopeItem[] {
  const list = submission.deliverables || [];
  if (list.length > 0) {
    return list.map((d) => {
      const typeLabel = (PAGE_LABEL[d.type as PageType] as string) || d.type;
      const description = d.label?.trim()
        ? `${typeLabel} — ${d.label.trim()}`
        : typeLabel;
      return {
        description,
        type: typeLabel,
        design_approved: false,
        dev_live: false,
      };
    });
  }
  // Legacy fallback — comma-separated string from public form
  const tokens = (submission.page_type || "")
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return tokens.map((token) => ({
    description: token,
    type: token,
    design_approved: false,
    dev_live: false,
  }));
}

/* Short summary for portal.project_type used as the description on the
 * team /clients view. Prefers the new deliverables list, falls back to
 * page_type. */
function summariseDeliverables(submission: OnboardingSubmission): string {
  const list = submission.deliverables || [];
  if (list.length > 0) {
    return list
      .map((d) => (PAGE_LABEL[d.type as PageType] as string) || d.type)
      .join(", ");
  }
  return submission.page_type?.trim() || "Page build";
}

export default function OnboardingInboxPage() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<OnboardingSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<OnboardingSubmission | null>(null);
  const [saving, setSaving] = useState(false);
  const [portals, setPortals] = useState<PortalData[]>([]);
  const [selectedPortalId, setSelectedPortalId] = useState("");
  const [showAccessInfo, setShowAccessInfo] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const all = await onboardingStore.getAll();
    // Sort newest first
    all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setSubmissions(all);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    getPortals().then(setPortals).catch(() => {});
  }, [load]);

  const updateSubmission = async (id: string, patch: Partial<OnboardingSubmission>) => {
    setSaving(true);
    const fullPatch = { ...patch, updated_at: new Date().toISOString() };
    /* Update local state optimistically — don't await load() which re-fetches
     * from Supabase and clobbers any in-flight edits. The store call still
     * persists to Supabase + localStorage in the background. */
    setSubmissions((prev) => prev.map((s) => (s.id === id ? { ...s, ...fullPatch } : s)));
    if (selected?.id === id) {
      setSelected((prev) => (prev ? { ...prev, ...fullPatch } : prev));
    }
    await onboardingStore.update(id, fullPatch);
    setSaving(false);
  };

  const toggleChecklist = async (id: string, key: keyof NonNullable<OnboardingSubmission["pm_checklist"]>) => {
    const sub = submissions.find((s) => s.id === id);
    if (!sub) return;
    const checklist = sub.pm_checklist || {
      shopify_access_requested: false,
      shopify_access_confirmed: false,
      info_verified: false,
      brand_assets_received: false,
      slack_channel_created: false,
    };
    const updated = { ...checklist, [key]: !checklist[key] };
    await updateSubmission(id, { pm_checklist: updated, status: "in-progress" });
  };

  const checklistItems: { key: keyof NonNullable<OnboardingSubmission["pm_checklist"]>; label: string; hasInfo?: boolean }[] = [
    { key: "shopify_access_requested", label: "Shopify collaborator access requested", hasInfo: true },
    { key: "shopify_access_confirmed", label: "Shopify access confirmed & working", hasInfo: true },
    { key: "info_verified", label: "Client info verified & complete" },
    { key: "brand_assets_received", label: "Brand assets received" },
    { key: "slack_channel_created", label: "Slack channel created" },
  ];

  const activeSubmissions = submissions.filter((s) => !s.deleted_at && (showArchived || s.status !== "archived"));
  const archivedCount = submissions.filter((s) => !s.deleted_at && s.status === "archived").length;
  const pendingCount = submissions.filter((s) => !s.deleted_at && (s.status === "pending" || s.status === "in-progress")).length;

  const handleArchive = async (id: string) => {
    await updateSubmission(id, { status: "archived" });
    if (selected?.id === id) setSelected(null);
  };

  const handleDelete = async (id: string) => {
    await updateSubmission(id, { deleted_at: new Date().toISOString() });
    setConfirmDelete(null);
    if (selected?.id === id) setSelected(null);
  };

  const handleUnarchive = async (id: string) => {
    await updateSubmission(id, { status: "approved" });
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* List */}
      <div className="w-80 shrink-0 border-r border-[#2A2A2A] flex flex-col">
        <div className="px-5 py-4 border-b border-[#2A2A2A]">
          <h1 className="text-sm font-bold text-[#E5E5EA]">Onboarding Inbox</h1>
          <p className="text-[10px] text-[#9CA3AF] mt-0.5">{pendingCount} awaiting action</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="size-5 border-2 border-[#2A2A2A] border-t-[#1B1B1B] rounded-full animate-spin" />
            </div>
          ) : activeSubmissions.length === 0 ? (
            <div className="text-center py-10 px-4">
              <p className="text-sm text-[#71757D]">No submissions yet</p>
              <p className="text-xs text-[#C7C9CD] mt-1">Share the onboarding form with new clients</p>
              <Link href="/onboard" target="_blank" className="inline-flex items-center gap-1.5 mt-3 text-xs text-blue-600 hover:underline">
                View form <ArrowTopRightOnSquareIcon className="size-3" />
              </Link>
            </div>
          ) : (
            activeSubmissions.map((sub) => {
              const config = statusConfig[sub.status];
              const checklist = sub.pm_checklist;
              const checkCount = checklist ? Object.values(checklist).filter(Boolean).length : 0;
              const isSelected = selected?.id === sub.id;

              return (
                <button
                  key={sub.id}
                  onClick={() => setSelected(sub)}
                  className={`w-full text-left px-5 py-3.5 border-b border-[#2A2A2A] transition-colors ${
                    isSelected ? "bg-[#222222]" : "hover:bg-[#0C0C0C]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#E5E5EA] truncate">{sub.company_name}</p>
                      <p className="text-[11px] text-[#71757D] truncate mt-0.5">{sub.website_url}</p>
                    </div>
                    <span
                      className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
                      style={{ color: config.color, backgroundColor: config.bg }}
                    >
                      {config.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] text-[#9CA3AF]">
                      {new Date(sub.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                    <span className="text-[10px] text-[#9CA3AF]">{checkCount}/5 checks</span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Archive toggle + form link */}
        <div className="px-5 py-3 border-t border-[#2A2A2A] space-y-2">
          {archivedCount > 0 && (
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="w-full text-[10px] text-[#9CA3AF] hover:text-[#E5E5EA] transition-colors"
            >
              {showArchived ? "Hide archived" : `Show archived (${archivedCount})`}
            </button>
          )}
          <Link
            href="/onboard"
            target="_blank"
            className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-medium text-[#9CA3AF] border border-[#2A2A2A] rounded-lg hover:bg-[#0C0C0C] transition-colors"
          >
            <ArrowTopRightOnSquareIcon className="size-3.5" />
            Open Onboarding Form
          </Link>
        </div>
      </div>

      {/* Detail */}
      <div className="flex-1 overflow-y-auto">
        {!selected ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <ClockIcon className="size-10 text-[#E8E8E8] mx-auto mb-3" />
              <p className="text-sm text-[#9CA3AF]">Select a submission to review</p>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-8 py-8">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-[#E5E5EA]">{selected.company_name}</h2>
                <a href={selected.website_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                  {selected.website_url}
                </a>
                <p className="text-[10px] text-[#9CA3AF] mt-1">
                  Submitted {new Date(selected.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {selected.status !== "archived" && (
                  <button
                    onClick={() => handleArchive(selected.id)}
                    className="px-2.5 py-1.5 text-[10px] font-medium text-[#71757D] hover:text-[#E5E5EA] hover:bg-[#222222] rounded-lg transition-colors"
                  >
                    Archive
                  </button>
                )}
                {selected.status === "archived" && (
                  <button
                    onClick={() => handleUnarchive(selected.id)}
                    className="px-2.5 py-1.5 text-[10px] font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    Unarchive
                  </button>
                )}
                {confirmDelete === selected.id ? (
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleDelete(selected.id)} className="px-2.5 py-1.5 text-[10px] font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                      Confirm
                    </button>
                    <button onClick={() => setConfirmDelete(null)} className="px-2.5 py-1.5 text-[10px] text-[#71757D] hover:text-[#E5E5EA] transition-colors">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(selected.id)}
                    className="px-2.5 py-1.5 text-[10px] font-medium text-[#C7C9CD] hover:text-red-500 rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                )}
                <button onClick={() => setSelected(null)} className="p-1 text-[#C7C9CD] hover:text-[#E5E5EA]">
                  <XMarkIcon className="size-5" />
                </button>
              </div>
            </div>

            {/* PM Checklist */}
            <div className="mb-8 p-5 bg-[#0C0C0C] border border-[#2A2A2A] rounded-xl">
              <p className="text-xs font-semibold text-[#E5E5EA] mb-3">PM Checklist</p>
              <div className="space-y-2">
                {checklistItems.map((item) => {
                  const checked = selected.pm_checklist?.[item.key] || false;
                  return (
                    <div key={item.key} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      checked ? "border-emerald-200 bg-emerald-50/50" : "border-[#2A2A2A] bg-[#181818] hover:border-[#383838]"
                    }`}>
                      <label className="flex items-center gap-3 flex-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleChecklist(selected.id, item.key)}
                          className="size-4 rounded border-[#383838] text-emerald-600 focus:ring-0"
                        />
                        <span className={`text-sm ${checked ? "text-emerald-700" : "text-[#C7C9CD]"}`}>{item.label}</span>
                      </label>
                      {item.hasInfo && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowAccessInfo(!showAccessInfo); }}
                          className="p-1 text-[#C7C9CD] hover:text-[#E5E5EA] transition-colors shrink-0"
                          title="View access requirements"
                        >
                          <InformationCircleIcon className="size-4" />
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* Access info popup */}
                {showAccessInfo && (
                  <div className="mt-2 p-4 bg-blue-50 border border-blue-200 rounded-xl relative">
                    <button onClick={() => setShowAccessInfo(false)} className="absolute top-2 right-2 text-blue-400 hover:text-blue-600">
                      <XMarkIcon className="size-4" />
                    </button>
                    <p className="text-xs font-semibold text-blue-800 mb-2">Access We Need to Request</p>
                    <div className="space-y-1.5 text-xs text-blue-700">
                      <p className="font-medium">Shopify</p>
                      <ul className="ml-3 space-y-1 list-disc text-blue-600">
                        <li>Collaborator request sent to their myshopify.com URL</li>
                        <li>Staff account with <strong>Themes</strong>, <strong>Products</strong>, <strong>Analytics</strong>, and <strong>Online Store</strong> permissions</li>
                        <li>Confirm which theme is live and whether it's customised</li>
                      </ul>
                      <p className="font-medium mt-3">Analytics</p>
                      <ul className="ml-3 space-y-1 list-disc text-blue-600">
                        <li>GA4 — Viewer access to team@ecomlanders.com</li>
                        <li>Microsoft Clarity / Hotjar — invite to team@ecomlanders.com</li>
                        <li>Intelligems — if they have it, request access</li>
                      </ul>
                      <p className="font-medium mt-3">Other</p>
                      <ul className="ml-3 space-y-1 list-disc text-blue-600">
                        <li>Meta Business Suite — if running paid social</li>
                        <li>Google Search Console — if SEO is in scope</li>
                        <li>Review app access (Judge.me, Loox, etc.) — if reviews are part of the build</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* PM Notes */}
              <div className="mt-4">
                <textarea
                  value={selected.pm_notes || ""}
                  onChange={(e) => setSelected((prev) => prev ? { ...prev, pm_notes: e.target.value } : prev)}
                  onBlur={() => {
                    if (selected) updateSubmission(selected.id, { pm_notes: selected.pm_notes });
                  }}
                  placeholder="Internal notes..."
                  className="w-full text-xs px-3 py-2.5 border border-[#2A2A2A] rounded-lg focus:outline-none focus:border-[#999] placeholder:text-[#C7C9CD] min-h-[60px] resize-y"
                />
              </div>

              {/* Deliverables scope — captured by the PM, confirmed at assign-to-pod */}
              <div className="mt-4 p-3 bg-[#181818] border border-[#2A2A2A] rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-[#E5E5EA]">Deliverables scope</p>
                  <span className="text-[10px] text-[#71757D]">
                    {(selected.deliverables?.length || 0)} {(selected.deliverables?.length || 0) === 1 ? "item" : "items"}
                  </span>
                </div>
                <p className="text-[10px] text-[#9CA3AF] mb-3">
                  Pages to spin up when this onboarding is assigned to a pod. Multiple of the same type are fine — give each a label.
                </p>
                <div className="space-y-1.5">
                  {(selected.deliverables || []).map((d) => (
                    <div key={d.id} className="flex items-center gap-1.5">
                      <select
                        value={d.type}
                        onChange={(e) => {
                          const newType = e.target.value;
                          setSelected((prev) => {
                            if (!prev) return prev;
                            const next = (prev.deliverables || []).map((x) => x.id === d.id ? { ...x, type: newType } : x);
                            updateSubmission(prev.id, { deliverables: next });
                            return { ...prev, deliverables: next };
                          });
                        }}
                        className="rounded-md border border-[#2A2A2A] bg-[#181818] px-2 py-1 text-[11px]"
                      >
                        {(Object.keys(PAGE_LABEL) as PageType[]).map((p) => (
                          <option key={p} value={p}>
                            {PAGE_LABEL[p]}
                          </option>
                        ))}
                      </select>
                      <input
                        value={d.label}
                        onChange={(e) => {
                          const newLabel = e.target.value;
                          setSelected((prev) => {
                            if (!prev) return prev;
                            const next = (prev.deliverables || []).map((x) => x.id === d.id ? { ...x, label: newLabel } : x);
                            return { ...prev, deliverables: next };
                          });
                        }}
                        onBlur={() => {
                          setSelected((prev) => {
                            if (prev) updateSubmission(prev.id, { deliverables: prev.deliverables });
                            return prev;
                          });
                        }}
                        placeholder="Variant label (e.g. Lavender oil)"
                        className="flex-1 rounded-md border border-[#2A2A2A] bg-[#181818] px-2 py-1 text-[11px] placeholder:text-[#C7C9CD]"
                      />
                      <button
                        onClick={() => {
                          setSelected((prev) => {
                            if (!prev) return prev;
                            const next = (prev.deliverables || []).filter((x) => x.id !== d.id);
                            updateSubmission(prev.id, { deliverables: next });
                            return { ...prev, deliverables: next };
                          });
                        }}
                        className="p-1 text-[#C7C9CD] hover:text-rose-600"
                        title="Remove"
                      >
                        <TrashIcon className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setSelected((prev) => {
                      if (!prev) return prev;
                      const next = [
                        ...(prev.deliverables || []),
                        { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, type: "pdp", label: "" },
                      ];
                      updateSubmission(prev.id, { deliverables: next });
                      return { ...prev, deliverables: next };
                    });
                  }}
                  className="mt-2 inline-flex items-center gap-1 rounded-md border border-dashed border-[#2A2A2A] px-2 py-1 text-[11px] text-[#9CA3AF] hover:border-[#1A1A1A] hover:text-[#E5E5EA]"
                >
                  <PlusIcon className="size-3" />
                  Add deliverable
                </button>
              </div>

              {/* Portal assignment + approve */}
              {selected.status !== "approved" && (() => {
                const allChecked = Object.values(selected.pm_checklist || {}).every(Boolean);

                const handleAssignExisting = async () => {
                  if (!selectedPortalId || selectedPortalId === "__new__") return;
                  /* Append the onboarding's deliverables onto the chosen
                   * portal's scope so the team sees them in the portal,
                   * not just the inbox. Skips items already present
                   * (matched by description) to avoid duplicate seeds
                   * if an onboarding gets re-attached. */
                  const portal = portals.find((p) => p.id === selectedPortalId);
                  if (portal) {
                    const incoming = deliverablesToScope(selected);
                    const existingDescriptions = new Set(
                      (portal.scope || []).map((s) =>
                        typeof s === "string" ? s : s.description,
                      ),
                    );
                    const newOnes = incoming.filter(
                      (s) => typeof s !== "string" && !existingDescriptions.has(s.description),
                    );
                    if (newOnes.length > 0) {
                      await updatePortal(portal.id, {
                        scope: [...(portal.scope || []), ...newOnes],
                      });
                    }
                  }
                  await updateSubmission(selected.id, {
                    status: "approved",
                    assigned_portal_id: selectedPortalId,
                    assigned_at: new Date().toISOString(),
                    assigned_by: "pm",
                  });
                };

                const handleCreateNewPortal = async () => {
                  setSaving(true);
                  try {
                    // Pull as much as we can from the onboarding submission so the portal isn't bare on Day 1.
                    const scopeItems = deliverablesToScope(selected);
                    const projectTypeSummary = summariseDeliverables(selected);
                    const projectName = `${selected.company_name} — full build`;

                    // Seed a project pre-loaded with the deliverables scope captured during PM intake.
                    const project = {
                      id: `proj-${Date.now()}`,
                      name: projectName,
                      type: "page-build" as const,
                      status: "active" as const,
                      created_at: new Date().toISOString(),
                      phases: [
                        { id: "ph-onb", name: "Onboarding", status: "complete" as const, date: "", description: "" },
                        { id: "ph-des", name: "Design", status: "in-progress" as const, date: "", description: "" },
                        { id: "ph-dev", name: "Development", status: "upcoming" as const, date: "", description: "" },
                        { id: "ph-qa", name: "QA & Launch", status: "upcoming" as const, date: "", description: "" },
                      ],
                      deliverables: [],
                      scope: scopeItems,
                      documents: (selected.uploaded_files || []).map((f, i) => ({
                        id: `doc-${i}`,
                        title: f.originalName,
                        url: f.url,
                        type: "brief" as const,
                      })),
                    };

                    // Seed a context entry with the onboarding brief so the team has it in the portal, not just in ClickUp.
                    const briefText = [
                      selected.brief_description && `Brief: ${selected.brief_description}`,
                      selected.primary_goal && `Primary goal: ${selected.primary_goal}`,
                      selected.target_customer && `Target customer: ${selected.target_customer}`,
                      selected.usps && `USPs: ${selected.usps}`,
                      selected.timeline_expectations && `Timeline: ${selected.timeline_expectations}`,
                    ].filter(Boolean).join("\n\n");

                    const contextEntries = briefText
                      ? [{
                          id: `ctx-${Date.now()}`,
                          source: "Onboarding Form",
                          date: new Date().toISOString().slice(0, 10),
                          content: briefText,
                          created_at: new Date().toISOString(),
                        }]
                      : [];

                    const portal = await createPortal({
                      client_name: selected.company_name,
                      client_email: "",
                      client_type: "regular",
                      project_type: projectTypeSummary,
                      current_phase: "Design",
                      progress: 0,
                      // next_touchpoint deliberately left blank — createPortal auto-fills with next Mon/Wed/Fri
                      next_touchpoint: { date: "", description: "" },
                      phases: [],
                      scope: scopeItems,
                      deliverables: [],
                      documents: [],
                      results: [],
                      wins: [],
                      show_results: false,
                      slack_channel_url: "",
                      ad_hoc_requests: [],
                      context_entries: contextEntries,
                      projects: [project],
                    } as any);

                    await updateSubmission(selected.id, {
                      status: "approved",
                      assigned_portal_id: portal.id,
                      assigned_at: new Date().toISOString(),
                      assigned_by: "pm",
                    });

                    router.push(`/tools/client-portal/${portal.id}`);
                  } catch (err) {
                    console.error("Failed to create portal:", err);
                  }
                  setSaving(false);
                };

                const hasDeliverables = (selected.deliverables?.length || 0) > 0;
                return (
                  <div className="mt-5 space-y-3">
                    {!allChecked && (
                      <p className="text-[10px] text-amber-600 text-center font-medium">Complete all checklist items to approve</p>
                    )}

                    {allChecked && (
                      <div className="space-y-2">
                        {!hasDeliverables && (
                          <p className="text-[10px] text-amber-600 text-center font-medium">
                            Scope at least one deliverable above before spinning up an engagement
                          </p>
                        )}
                        <button
                          onClick={async () => {
                            setSaving(true);
                            try {
                              const result = spawnEngagementFromOnboarding(selected);
                              await updateSubmission(selected.id, {
                                status: "approved",
                                assigned_at: new Date().toISOString(),
                                assigned_by: "pm",
                              });
                              router.push(`/workspace/clients/${result.clientId}`);
                            } catch (err) {
                              console.error("Failed to spawn engagement:", err);
                            }
                            setSaving(false);
                          }}
                          disabled={saving || !hasDeliverables}
                          className="w-full flex items-center gap-3 px-4 py-3 bg-white text-[#0C0C0C] rounded-lg hover:bg-[#F3F4F6] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          title={hasDeliverables ? "" : "Add at least one deliverable to the scope panel above"}
                        >
                          <svg className="size-4 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                          <div className="text-left">
                            <p className="text-sm font-semibold">{saving ? "Creating..." : "Create Client Engagement"}</p>
                            <p className="text-[10px] text-white/50">Creates a parked client (sits in purgatory). Assign to a pod from /pods-v2 to seed the build.</p>
                          </div>
                        </button>

                        <button
                          onClick={handleCreateNewPortal}
                          disabled={saving}
                          className="w-full flex items-center gap-3 px-4 py-3 bg-[#181818] border border-[#2A2A2A] text-[#E5E5EA] rounded-lg hover:bg-[#222222] transition-colors disabled:opacity-50"
                        >
                          <svg className="size-4 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                          <div className="text-left">
                            <p className="text-sm font-semibold">{saving ? "Creating..." : "Create Legacy Portal"}</p>
                            <p className="text-[10px] text-[#71757D]">Old client portal — kept while migration is in flight</p>
                          </div>
                        </button>

                        <div className="flex items-center gap-3 text-[10px] text-[#C7C9CD]">
                          <div className="flex-1 h-px bg-[#2A2A2A]" />
                          <span>or assign to existing</span>
                          <div className="flex-1 h-px bg-[#2A2A2A]" />
                        </div>

                        <div className="flex gap-2">
                          <select
                            value={selectedPortalId}
                            onChange={(e) => setSelectedPortalId(e.target.value)}
                            className="flex-1 px-3 py-2.5 bg-[#181818] border border-[#2A2A2A] rounded-lg text-xs focus:outline-none focus:border-[#C5C5C5] appearance-none"
                          >
                            <option value="">Select portal...</option>
                            {portals.map((p) => (
                              <option key={p.id} value={p.id}>{p.client_name}</option>
                            ))}
                          </select>
                          <button
                            onClick={handleAssignExisting}
                            disabled={saving || !selectedPortalId}
                            className="px-4 py-2.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                          >
                            Assign
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
              {selected.status === "approved" && (
                <div className="mt-4">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <CheckCircleIcon className="size-5" />
                      <span className="text-sm font-medium">Approved {selected.assigned_at ? new Date(selected.assigned_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""}</span>
                    </div>
                    <button
                      onClick={async () => {
                        if (!confirm("Send this submission back to pending? The linked engagement (if any) stays put, you can re-approve later.")) return;
                        await updateSubmission(selected.id, {
                          status: "pending",
                          assigned_at: undefined,
                          assigned_by: undefined,
                        });
                      }}
                      className="text-[11px] font-medium text-[#9CA3AF] hover:text-[#E5E5EA] hover:bg-[#222222] px-2 py-1 rounded"
                      title="Move back to pending"
                    >
                      ↩ Send back to pending
                    </button>
                  </div>
                  <ApprovedLinkRow submissionId={selected.id} />
                  {selected.assigned_portal_id && (
                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        href={`/tools/client-portal/${selected.assigned_portal_id}`}
                        className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
                      >
                        View Portal <ArrowTopRightOnSquareIcon className="size-3" />
                      </Link>
                      {(selected.deliverables?.length || 0) > 0 && (
                        <button
                          onClick={async () => {
                            const portal = portals.find((p) => p.id === selected.assigned_portal_id);
                            if (!portal) return;
                            const incoming = deliverablesToScope(selected);
                            const existingDescriptions = new Set(
                              (portal.scope || []).map((s) =>
                                typeof s === "string" ? s : s.description,
                              ),
                            );
                            const newOnes = incoming.filter(
                              (s) => typeof s !== "string" && !existingDescriptions.has(s.description),
                            );
                            if (newOnes.length === 0) {
                              alert("Portal scope is already up to date — nothing to add.");
                              return;
                            }
                            await updatePortal(portal.id, {
                              scope: [...(portal.scope || []), ...newOnes],
                              project_type: summariseDeliverables(selected),
                            });
                            await load();
                            getPortals().then(setPortals).catch(() => {});
                            alert(`Pushed ${newOnes.length} deliverable${newOnes.length === 1 ? "" : "s"} to the portal.`);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-md border border-[#2A2A2A] bg-[#181818] px-2 py-1 text-[11px] font-medium text-[#E5E5EA] hover:border-white"
                          title="Push current deliverables to the linked portal's scope"
                        >
                          ↻ Sync deliverables to portal
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Submission Data */}
            <div className="space-y-6">
              <DetailSection title="Brand & Business">
                <DetailField label="Brief Description" value={selected.brief_description} />
                <DetailField label="Target Customer" value={selected.target_customer} />
                <DetailField label="Top Competitors" value={selected.top_competitors} />
                <DetailField label="USPs" value={selected.usps} />
                <DetailField label="Main Products/Offers" value={selected.main_products} />
                <DetailField label="Current Metrics" value={selected.current_metrics} />
              </DetailSection>

              <DetailSection title="Project Specifics">
                <DetailField label="Product URL(s)" value={selected.product_url || ""} />
                <DetailField label="Page Type" value={selected.page_type || ""} />
                <DetailField label="Traffic Source" value={selected.traffic_source || ""} />
                <DetailField label="Amazon ASIN(s)" value={selected.amazon_asins || ""} />
                <DetailField label="Meta Page Name" value={selected.meta_page_name || ""} />
                <DetailField label="Specific Direction" value={selected.specific_direction || ""} />
              </DetailSection>

              <DetailSection title="Creative & Messaging">
                <DetailField label="Brand Assets Link" value={selected.brand_assets_link} link />
                <DetailField label="Core Value Props" value={selected.core_value_props} />
                <DetailField label="Reviews/Testimonials" value={selected.reviews_testimonials} />
                <DetailField label="Words to Avoid" value={selected.words_to_avoid} />
                <DetailField label="Tone of Voice" value={selected.tone_of_voice} />
              </DetailSection>

              <DetailSection title="Access & Data">
                <DetailField label="Shopify URL & Collaborator Code" value={selected.myshopify_url} />
                <DetailField label="Analytics Software" value={selected.analytics_software} />
                <DetailField label="Existing Landing Pages" value={selected.existing_landing_pages} />
                <DetailField label="Tracking Pixels" value={selected.tracking_pixels} />
                <DetailField label="Other Integrations" value={selected.other_integrations} />
              </DetailSection>

              <DetailSection title="Success Metrics & Priorities">
                <DetailField label="Primary Goal" value={selected.primary_goal} />
                <DetailField label="Success Definition" value={selected.success_definition} />
                <DetailField label="Timeline Expectations" value={selected.timeline_expectations} />
              </DetailSection>

              <DetailSection title="Risk & Bottlenecks">
                <DetailField label="Conversion Challenges" value={selected.conversion_challenges} />
                <DetailField label="Common Objections" value={selected.common_objections} />
                <DetailField label="Compliance/Restrictions" value={selected.compliance_restrictions} />
                <DetailField label="Previous Agencies" value={selected.previous_agencies} />
              </DetailSection>

              <DetailSection title="Workflow & Communication">
                <DetailField label="Primary Contact" value={selected.primary_contact} />
                <DetailField label="Approval Decision Maker" value={selected.approval_decision_maker} />
                <DetailField label="Timezone" value={selected.timezone} />
              </DetailSection>

              {(selected.uploaded_files?.length || 0) > 0 && (
                <DetailSection title="Uploaded Files">
                  <div className="space-y-1.5">
                    {selected.uploaded_files?.map((f, i) => (
                      <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 bg-[#181818] border border-[#2A2A2A] rounded-lg text-xs text-[#C7C9CD] hover:border-white transition-colors">
                        <span className="truncate flex-1">{f.originalName}</span>
                        <ArrowTopRightOnSquareIcon className="size-3.5 text-[#71757D] shrink-0" />
                      </a>
                    ))}
                  </div>
                </DetailSection>
              )}

              {selected.additional_info && (
                <DetailSection title="Additional Info">
                  <DetailField label="" value={selected.additional_info} />
                </DetailSection>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF] mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function DetailField({ label, value, link }: { label: string; value: string; link?: boolean }) {
  if (!value) return null;
  return (
    <div>
      {label && <p className="text-[11px] font-medium text-[#71757D] mb-0.5">{label}</p>}
      {link ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all">{value}</a>
      ) : (
        <p className="text-sm text-[#C7C9CD] whitespace-pre-wrap">{value}</p>
      )}
    </div>
  );
}

/* Find the pods-v2 Client spawned from this submission (if any) and show
 * an Open-engagement link. Sits above the legacy portal link so the new
 * flow surfaces by default without removing the old escape hatch. */
function ApprovedLinkRow({ submissionId }: { submissionId: string }) {
  const [clientId, setClientId] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    import("@/lib/pods-v2/data").then(({ getClients }) => {
      if (cancelled) return;
      const match = getClients().find((c) => c.onboarding_submission_id === submissionId);
      if (match) setClientId(match.id);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [submissionId]);
  if (!clientId) return null;
  return (
    <div className="mb-2">
      <Link
        href={`/workspace/clients/${clientId}`}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:underline"
      >
        Open client in Workspace <ArrowTopRightOnSquareIcon className="size-3" />
      </Link>
    </div>
  );
}
