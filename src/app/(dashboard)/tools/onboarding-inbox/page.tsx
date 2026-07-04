"use client";

/* ── Onboarding Inbox ──
 * Client intake queue. Submissions land as a scannable table (company, domain,
 * submitted, checklist progress, status); clicking a row opens a review drawer
 * with the guided flow: summary → PM readiness checklist → deliverables scope →
 * assign & approve (which spawns the engagement). All processing logic is
 * unchanged from the previous master-detail version; only the presentation was
 * rebuilt to the craft bar.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircleIcon,
  ArrowTopRightOnSquareIcon,
  XMarkIcon,
  InformationCircleIcon,
  PlusIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { onboardingStore, type OnboardingSubmission } from "@/lib/onboarding";
import { getPortals, createPortal, updatePortal } from "@/lib/portal/data";
import type { PortalData, ScopeItem } from "@/lib/portal/types";
import { spawnEngagementFromOnboarding } from "@/lib/engagement-spawn";
import { PAGE_LABEL, type PageType } from "@/lib/pods-v2/types";
import { Table, THead, TBody, TR, TH, TD, Badge } from "@/components/ui";

type StatusKey = OnboardingSubmission["status"];
type Tone = "success" | "warning" | "danger" | "neutral";

const STATUS_TONE: Record<StatusKey, Tone> = {
  pending: "warning",
  "in-progress": "warning",
  approved: "success",
  rejected: "danger",
  archived: "neutral",
};
const STATUS_LABEL: Record<StatusKey, string> = {
  pending: "Pending",
  "in-progress": "In review",
  approved: "Approved",
  rejected: "Rejected",
  archived: "Archived",
};

/* Build portal-shaped scope items from a submission's PM-captured
 * deliverables. Falls back to parsing the legacy comma-separated
 * `page_type` field if no structured deliverables were captured. */
function deliverablesToScope(submission: OnboardingSubmission): ScopeItem[] {
  const list = submission.deliverables || [];
  if (list.length > 0) {
    return list.map((d) => {
      const typeLabel = (PAGE_LABEL[d.type as PageType] as string) || d.type;
      const description = d.label?.trim() ? `${typeLabel} — ${d.label.trim()}` : typeLabel;
      return { description, type: typeLabel, design_approved: false, dev_live: false };
    });
  }
  const tokens = (submission.page_type || "")
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return tokens.map((token) => ({ description: token, type: token, design_approved: false, dev_live: false }));
}

/* Short summary for portal.project_type used as the description on the
 * team /clients view. Prefers the new deliverables list, falls back to
 * page_type. */
function summariseDeliverables(submission: OnboardingSubmission): string {
  const list = submission.deliverables || [];
  if (list.length > 0) {
    return list.map((d) => (PAGE_LABEL[d.type as PageType] as string) || d.type).join(", ");
  }
  return submission.page_type?.trim() || "Page build";
}

function checkCountOf(sub: OnboardingSubmission): number {
  return sub.pm_checklist ? Object.values(sub.pm_checklist).filter(Boolean).length : 0;
}

/* A brief is "new" if it landed recently and hasn't been actioned yet. */
const NEW_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
function isNewSubmission(sub: OnboardingSubmission): boolean {
  if (sub.status === "approved" || sub.status === "archived") return false;
  return Date.now() - new Date(sub.created_at).getTime() < NEW_WINDOW_MS;
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
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | StatusKey>("active");

  const load = useCallback(async () => {
    setLoading(true);
    const all = await onboardingStore.getAll();
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

  const live = useMemo(() => submissions.filter((s) => !s.deleted_at), [submissions]);
  const archivedCount = live.filter((s) => s.status === "archived").length;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return live
      .filter((s) => (statusFilter === "active" ? s.status !== "archived" : s.status === statusFilter))
      .filter((s) => !q || `${s.company_name} ${s.website_url}`.toLowerCase().includes(q));
  }, [live, statusFilter, query]);

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
    <>
      <div className="px-6 md:px-10 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Onboarding</h1>
            <p className="text-sm text-subtle mt-1">
              Client intake queue. Review each submission, run the readiness checklist, then assign and approve.
            </p>
          </div>
          <Link
            href="/onboard"
            target="_blank"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded border border-border bg-surface text-xs text-muted hover:bg-surface-raised hover:text-foreground transition-colors shrink-0"
          >
            <ArrowTopRightOnSquareIcon className="size-3.5" />
            Preview onboarding form
          </Link>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-subtle tabular-nums mr-1">
              {rows.length} of {statusFilter === "active" ? live.length - archivedCount : live.length}
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "active" | StatusKey)}
              className="h-8 px-2.5 rounded border border-border bg-surface text-xs text-muted appearance-none focus:outline-none focus:border-foreground"
            >
              <option value="active">All active</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In review</option>
              <option value="approved">Approved</option>
              <option value="archived">Archived ({archivedCount})</option>
            </select>
          </div>
          <div className="relative w-full md:w-64">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-subtle z-10" />
            <input
              placeholder="Search company or domain"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8 w-full pl-8 pr-3 rounded border border-border bg-surface text-xs text-muted placeholder:text-subtle focus:outline-none focus:border-foreground"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="bg-surface border border-border-faint rounded py-16 flex items-center justify-center">
            <div className="size-5 border-2 border-border border-t-foreground rounded-full animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-surface border border-border-faint rounded py-16 text-center">
            <p className="text-sm text-subtle">No submissions match this view.</p>
            <Link href="/onboard" target="_blank" className="inline-flex items-center gap-1.5 mt-3 text-xs text-muted hover:text-foreground">
              Share the onboarding form <ArrowTopRightOnSquareIcon className="size-3" />
            </Link>
          </div>
        ) : (
          <div className="bg-surface border border-border-faint rounded overflow-x-auto">
            <Table>
              <THead>
                <TR hover={false}>
                  <TH>Company</TH>
                  <TH>Submitted</TH>
                  <TH>Readiness</TH>
                  <TH>Deliverables</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((sub) => (
                  <TR key={sub.id} className="cursor-pointer" onClick={() => { setSelected(sub); setShowAccessInfo(false); }}>
                    <TD className="max-w-[280px]">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-foreground truncate">{sub.company_name}</p>
                          {isNewSubmission(sub) && (
                            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-3xs font-semibold uppercase tracking-wider bg-info/15 text-info shrink-0">
                              New
                            </span>
                          )}
                        </div>
                        <p className="text-2xs text-subtle truncate mt-0.5">{sub.website_url}</p>
                      </div>
                    </TD>
                    <TD className="text-muted whitespace-nowrap">
                      {new Date(sub.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </TD>
                    <TD>
                      <ReadinessDots count={checkCountOf(sub)} />
                    </TD>
                    <TD className="text-muted tabular-nums">
                      {sub.deliverables?.length ? sub.deliverables.length : <span className="text-subtle">—</span>}
                    </TD>
                    <TD>
                      <Badge tone={STATUS_TONE[sub.status]}>{STATUS_LABEL[sub.status]}</Badge>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        )}
      </div>

      {/* Review drawer */}
      {selected && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-background/70 animate-backdropFade" onClick={() => setSelected(null)} />
          <aside className="absolute inset-y-0 right-0 w-full max-w-2xl bg-surface-raised border-l border-border overflow-y-auto animate-slide-in-right">
            <div className="px-6 py-6 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-foreground truncate">{selected.company_name}</h2>
                  <a
                    href={selected.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted hover:text-foreground inline-flex items-center gap-1"
                  >
                    {selected.website_url}
                    <ArrowTopRightOnSquareIcon className="size-3" />
                  </a>
                  <p className="text-2xs text-subtle mt-1">
                    Submitted{" "}
                    {new Date(selected.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {selected.status !== "archived" ? (
                    <button
                      onClick={() => handleArchive(selected.id)}
                      className="h-7 px-2.5 text-2xs font-medium text-subtle hover:text-foreground hover:bg-surface rounded transition-colors"
                    >
                      Archive
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUnarchive(selected.id)}
                      className="h-7 px-2.5 text-2xs font-medium text-muted hover:text-foreground hover:bg-surface rounded transition-colors"
                    >
                      Unarchive
                    </button>
                  )}
                  {confirmDelete === selected.id ? (
                    <>
                      <button
                        onClick={() => handleDelete(selected.id)}
                        className="h-7 px-2.5 text-2xs font-medium text-status-late hover:bg-surface rounded transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="h-7 px-2.5 text-2xs text-subtle hover:text-foreground transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(selected.id)}
                      className="h-7 px-2.5 text-2xs font-medium text-muted hover:text-status-late rounded transition-colors"
                    >
                      Delete
                    </button>
                  )}
                  <button onClick={() => setSelected(null)} className="p-1.5 text-muted hover:text-foreground">
                    <XMarkIcon className="size-5" />
                  </button>
                </div>
              </div>

              {/* Readiness checklist */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xs uppercase tracking-wider text-subtle font-medium">Readiness checklist</h3>
                  <span className="text-2xs text-subtle tabular-nums">{checkCountOf(selected)}/5</span>
                </div>
                <div className="space-y-1">
                  {checklistItems.map((item) => {
                    const checked = selected.pm_checklist?.[item.key] || false;
                    return (
                      <div key={item.key} className="flex items-center gap-3 py-1.5">
                        <button
                          onClick={() => toggleChecklist(selected.id, item.key)}
                          className={`inline-flex size-5 items-center justify-center rounded border transition-colors shrink-0 ${
                            checked
                              ? "bg-status-ontrack/15 border-status-ontrack text-status-ontrack"
                              : "bg-surface border-border text-transparent hover:border-muted"
                          }`}
                        >
                          <CheckIcon className="size-3.5" strokeWidth={3} />
                        </button>
                        <span className={`text-sm flex-1 ${checked ? "text-foreground" : "text-muted"}`}>{item.label}</span>
                        {item.hasInfo && (
                          <button
                            onClick={() => setShowAccessInfo(!showAccessInfo)}
                            className="p-1 text-subtle hover:text-foreground transition-colors shrink-0"
                            title="View access requirements"
                          >
                            <InformationCircleIcon className="size-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {showAccessInfo && (
                  <div className="relative rounded border border-border-faint bg-surface p-4">
                    <button
                      onClick={() => setShowAccessInfo(false)}
                      className="absolute top-2.5 right-2.5 text-subtle hover:text-foreground"
                    >
                      <XMarkIcon className="size-4" />
                    </button>
                    <p className="text-2xs uppercase tracking-wider text-subtle font-medium mb-2.5">Access we need to request</p>
                    <div className="space-y-2 text-xs text-muted">
                      <div>
                        <p className="text-foreground font-medium">Shopify</p>
                        <ul className="ml-4 mt-1 space-y-1 list-disc">
                          <li>Collaborator request sent to their myshopify.com URL</li>
                          <li>Staff account with Themes, Products, Analytics, and Online Store permissions</li>
                          <li>Confirm which theme is live and whether it&apos;s customised</li>
                        </ul>
                      </div>
                      <div>
                        <p className="text-foreground font-medium">Analytics</p>
                        <ul className="ml-4 mt-1 space-y-1 list-disc">
                          <li>GA4 — Viewer access to team@ecomlanders.com</li>
                          <li>Microsoft Clarity / Hotjar — invite to team@ecomlanders.com</li>
                          <li>Intelligems — if they have it, request access</li>
                        </ul>
                      </div>
                      <div>
                        <p className="text-foreground font-medium">Other</p>
                        <ul className="ml-4 mt-1 space-y-1 list-disc">
                          <li>Meta Business Suite — if running paid social</li>
                          <li>Google Search Console — if SEO is in scope</li>
                          <li>Review app access (Judge.me, Loox, etc.) — if reviews are part of the build</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                <textarea
                  value={selected.pm_notes || ""}
                  onChange={(e) => setSelected((prev) => (prev ? { ...prev, pm_notes: e.target.value } : prev))}
                  onBlur={() => {
                    if (selected) updateSubmission(selected.id, { pm_notes: selected.pm_notes });
                  }}
                  placeholder="Internal notes..."
                  className="w-full text-xs px-3 py-2.5 bg-surface border border-border rounded focus:outline-none focus:border-muted placeholder:text-subtle min-h-[60px] resize-y"
                />
              </section>

              {/* Deliverables scope */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xs uppercase tracking-wider text-subtle font-medium">Deliverables scope</h3>
                  <span className="text-2xs text-subtle tabular-nums">
                    {selected.deliverables?.length || 0} {(selected.deliverables?.length || 0) === 1 ? "item" : "items"}
                  </span>
                </div>
                <p className="text-2xs text-subtle">
                  Pages to spin up when this onboarding is assigned to a pod. Multiple of the same type are fine, give each a label.
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
                            const next = (prev.deliverables || []).map((x) => (x.id === d.id ? { ...x, type: newType } : x));
                            updateSubmission(prev.id, { deliverables: next });
                            return { ...prev, deliverables: next };
                          });
                        }}
                        className="rounded border border-border bg-surface px-2 py-1.5 text-xs text-muted appearance-none focus:outline-none focus:border-muted"
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
                            const next = (prev.deliverables || []).map((x) => (x.id === d.id ? { ...x, label: newLabel } : x));
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
                        className="flex-1 rounded border border-border bg-surface px-2 py-1.5 text-xs text-foreground placeholder:text-subtle focus:outline-none focus:border-muted"
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
                        className="p-1.5 text-subtle hover:text-status-late"
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
                  className="inline-flex items-center gap-1 rounded border border-dashed border-border px-2.5 py-1.5 text-xs text-muted hover:border-muted hover:text-foreground transition-colors"
                >
                  <PlusIcon className="size-3.5" />
                  Add deliverable
                </button>
              </section>

              {/* Assign & approve */}
              {selected.status !== "approved" &&
                (() => {
                  const allChecked = Object.values(selected.pm_checklist || {}).every(Boolean);

                  const handleAssignExisting = async () => {
                    if (!selectedPortalId || selectedPortalId === "__new__") return;
                    const portal = portals.find((p) => p.id === selectedPortalId);
                    if (portal) {
                      const incoming = deliverablesToScope(selected);
                      const existingDescriptions = new Set(
                        (portal.scope || []).map((s) => (typeof s === "string" ? s : s.description)),
                      );
                      const newOnes = incoming.filter(
                        (s) => typeof s !== "string" && !existingDescriptions.has(s.description),
                      );
                      if (newOnes.length > 0) {
                        await updatePortal(portal.id, { scope: [...(portal.scope || []), ...newOnes] });
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
                      const scopeItems = deliverablesToScope(selected);
                      const projectTypeSummary = summariseDeliverables(selected);
                      const projectName = `${selected.company_name} — full build`;
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
                      const briefText = [
                        selected.brief_description && `Brief: ${selected.brief_description}`,
                        selected.primary_goal && `Primary goal: ${selected.primary_goal}`,
                        selected.target_customer && `Target customer: ${selected.target_customer}`,
                        selected.usps && `USPs: ${selected.usps}`,
                        selected.timeline_expectations && `Timeline: ${selected.timeline_expectations}`,
                      ]
                        .filter(Boolean)
                        .join("\n\n");
                      const contextEntries = briefText
                        ? [
                            {
                              id: `ctx-${Date.now()}`,
                              source: "Onboarding Form",
                              date: new Date().toISOString().slice(0, 10),
                              content: briefText,
                              created_at: new Date().toISOString(),
                            },
                          ]
                        : [];
                      const portal = await createPortal({
                        client_name: selected.company_name,
                        client_email: "",
                        client_type: "regular",
                        project_type: projectTypeSummary,
                        current_phase: "Design",
                        progress: 0,
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
                    <section className="space-y-3 border-t border-border-faint pt-6">
                      <h3 className="text-2xs uppercase tracking-wider text-subtle font-medium">Assign &amp; approve</h3>

                      {!allChecked ? (
                        <p className="text-xs text-status-approaching">
                          Complete all checklist items to approve.
                        </p>
                      ) : (
                        <div className="space-y-2.5">
                          {!hasDeliverables && (
                            <p className="text-xs text-status-approaching">
                              Scope at least one deliverable above before spinning up an engagement.
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
                            className="w-full flex items-center gap-3 px-4 py-3 bg-foreground text-background rounded hover:bg-foreground/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-left"
                          >
                            <PlusIcon className="size-4 shrink-0" strokeWidth={2.5} />
                            <div>
                              <p className="text-sm font-medium">{saving ? "Creating..." : "Create client engagement"}</p>
                              <p className="text-2xs text-background/50">
                                Parks a client (sits in purgatory). Assign to a pod from /pods-v2 to seed the build.
                              </p>
                            </div>
                          </button>

                          <button
                            onClick={handleCreateNewPortal}
                            disabled={saving}
                            className="w-full flex items-center gap-3 px-4 py-3 bg-surface border border-border text-foreground rounded hover:bg-surface-raised transition-colors disabled:opacity-50 text-left"
                          >
                            <PlusIcon className="size-4 shrink-0" />
                            <div>
                              <p className="text-sm font-medium">{saving ? "Creating..." : "Create legacy portal"}</p>
                              <p className="text-2xs text-subtle">Old client portal, kept while migration is in flight.</p>
                            </div>
                          </button>

                          <div className="flex items-center gap-3 text-2xs text-subtle py-1">
                            <span className="flex-1 h-px bg-border" />
                            <span>or assign to existing</span>
                            <span className="flex-1 h-px bg-border" />
                          </div>

                          <div className="flex gap-2">
                            <select
                              value={selectedPortalId}
                              onChange={(e) => setSelectedPortalId(e.target.value)}
                              className="flex-1 h-9 px-3 bg-surface border border-border rounded text-xs text-muted appearance-none focus:outline-none focus:border-muted"
                            >
                              <option value="">Select portal...</option>
                              {portals.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.client_name}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={handleAssignExisting}
                              disabled={saving || !selectedPortalId}
                              className="h-9 px-4 text-xs font-medium bg-foreground text-background rounded hover:bg-foreground/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
                            >
                              Assign
                            </button>
                          </div>
                        </div>
                      )}
                    </section>
                  );
                })()}

              {selected.status === "approved" && (
                <section className="space-y-2 border-t border-border-faint pt-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-status-ontrack">
                      <CheckCircleIcon className="size-5" />
                      <span className="text-sm font-medium text-foreground">
                        Approved
                        {selected.assigned_at
                          ? ` ${new Date(selected.assigned_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
                          : ""}
                      </span>
                    </div>
                    <button
                      onClick={async () => {
                        if (!confirm("Send this submission back to pending? The linked engagement (if any) stays put, you can re-approve later.")) return;
                        await updateSubmission(selected.id, { status: "pending", assigned_at: undefined, assigned_by: undefined });
                      }}
                      className="text-2xs font-medium text-muted hover:text-foreground hover:bg-surface px-2 py-1 rounded"
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
                        className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground"
                      >
                        View portal <ArrowTopRightOnSquareIcon className="size-3" />
                      </Link>
                      {(selected.deliverables?.length || 0) > 0 && (
                        <button
                          onClick={async () => {
                            const portal = portals.find((p) => p.id === selected.assigned_portal_id);
                            if (!portal) return;
                            const incoming = deliverablesToScope(selected);
                            const existingDescriptions = new Set(
                              (portal.scope || []).map((s) => (typeof s === "string" ? s : s.description)),
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
                          className="inline-flex items-center gap-1.5 rounded border border-border bg-surface px-2 py-1 text-2xs font-medium text-foreground hover:border-muted"
                          title="Push current deliverables to the linked portal's scope"
                        >
                          ↻ Sync deliverables to portal
                        </button>
                      )}
                    </div>
                  )}
                </section>
              )}

              {/* Submission data */}
              <div className="space-y-6 border-t border-border-faint pt-6">
                <DetailSection title="Brand & Business">
                  <DetailField label="Brief description" value={selected.brief_description} />
                  <DetailField label="Target customer" value={selected.target_customer} />
                  <DetailField label="Top competitors" value={selected.top_competitors} />
                  <DetailField label="USPs" value={selected.usps} />
                  <DetailField label="Main products / offers" value={selected.main_products} />
                  <DetailField label="Current metrics" value={selected.current_metrics} />
                </DetailSection>

                <DetailSection title="Project Specifics">
                  <DetailField label="Product URL(s)" value={selected.product_url || ""} />
                  <DetailField label="Page type" value={selected.page_type || ""} />
                  <DetailField label="Traffic source" value={selected.traffic_source || ""} />
                  <DetailField label="Amazon ASIN(s)" value={selected.amazon_asins || ""} />
                  <DetailField label="Meta page name" value={selected.meta_page_name || ""} />
                  <DetailField label="Specific direction" value={selected.specific_direction || ""} />
                </DetailSection>

                <DetailSection title="Creative & Messaging">
                  <DetailField label="Brand assets link" value={selected.brand_assets_link} link />
                  <DetailField label="Core value props" value={selected.core_value_props} />
                  <DetailField label="Reviews / testimonials" value={selected.reviews_testimonials} />
                  <DetailField label="Words to avoid" value={selected.words_to_avoid} />
                  <DetailField label="Tone of voice" value={selected.tone_of_voice} />
                </DetailSection>

                <DetailSection title="Access & Data">
                  <DetailField label="Shopify URL & collaborator code" value={selected.myshopify_url} />
                  <DetailField label="Analytics software" value={selected.analytics_software} />
                  <DetailField label="Existing landing pages" value={selected.existing_landing_pages} />
                  <DetailField label="Tracking pixels" value={selected.tracking_pixels} />
                  <DetailField label="Other integrations" value={selected.other_integrations} />
                </DetailSection>

                <DetailSection title="Success Metrics & Priorities">
                  <DetailField label="Primary goal" value={selected.primary_goal} />
                  <DetailField label="Success definition" value={selected.success_definition} />
                  <DetailField label="Timeline expectations" value={selected.timeline_expectations} />
                </DetailSection>

                <DetailSection title="Risk & Bottlenecks">
                  <DetailField label="Conversion challenges" value={selected.conversion_challenges} />
                  <DetailField label="Common objections" value={selected.common_objections} />
                  <DetailField label="Compliance / restrictions" value={selected.compliance_restrictions} />
                  <DetailField label="Previous agencies" value={selected.previous_agencies} />
                </DetailSection>

                <DetailSection title="Workflow & Communication">
                  <DetailField label="Primary contact" value={selected.primary_contact} />
                  <DetailField label="Approval decision maker" value={selected.approval_decision_maker} />
                  <DetailField label="Timezone" value={selected.timezone} />
                </DetailSection>

                {(selected.uploaded_files?.length || 0) > 0 && (
                  <DetailSection title="Uploaded Files">
                    <div className="space-y-1.5">
                      {selected.uploaded_files?.map((f, i) => (
                        <a
                          key={i}
                          href={f.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded text-xs text-muted hover:border-muted transition-colors"
                        >
                          <span className="truncate flex-1">{f.originalName}</span>
                          <ArrowTopRightOnSquareIcon className="size-3.5 text-subtle shrink-0" />
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
          </aside>
        </div>
      )}
    </>
  );
}

function ReadinessDots({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={`size-1.5 rounded-full ${i < count ? "bg-status-ontrack" : "bg-border"}`}
          />
        ))}
      </div>
      <span className="text-2xs text-subtle tabular-nums">{count}/5</span>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-2xs font-medium uppercase tracking-wider text-subtle mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function DetailField({ label, value, link }: { label: string; value: string; link?: boolean }) {
  if (!value) return null;
  return (
    <div>
      {label && <p className="text-2xs font-medium text-subtle mb-0.5">{label}</p>}
      {link ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm text-muted hover:text-foreground underline break-all">
          {value}
        </a>
      ) : (
        <p className="text-sm text-muted whitespace-pre-wrap">{value}</p>
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
    import("@/lib/pods-v2/data")
      .then(({ getClients }) => {
        if (cancelled) return;
        const match = getClients().find((c) => c.onboarding_submission_id === submissionId);
        if (match) setClientId(match.id);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [submissionId]);
  if (!clientId) return null;
  return (
    <Link
      href={`/workspace/clients/${clientId}`}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-status-ontrack hover:text-foreground"
    >
      Open client in Workspace <ArrowTopRightOnSquareIcon className="size-3" />
    </Link>
  );
}
