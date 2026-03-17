"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  PlusIcon,
  TrashIcon,
  XMarkIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  EyeIcon,
  ArrowTopRightOnSquareIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { DecorativeBlocks } from "@/components/decorative-blocks";
import { inputClass, labelClass } from "@/lib/form-styles";
import { getPortals, createPortal, deletePortal, seedDemoPortal } from "@/lib/portal/data";
import type { PortalData, AdHocRequest } from "@/lib/portal/types";

export default function ClientPortalPage() {
  const [portals, setPortals] = useState<PortalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [projectType, setProjectType] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"overview" | "manage">("overview");

  const loadPortals = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPortals();
      setPortals(data);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPortals();
  }, [loadPortals]);

  const handleCreate = async () => {
    if (!clientName.trim()) return;
    await createPortal({
      client_name: clientName.trim(),
      client_email: clientEmail.trim(),
      project_type: projectType.trim() || "Full Page Build",
      current_phase: "",
      progress: 0,
      next_touchpoint: { date: "", description: "" },
      phases: [],
      scope: [],
      deliverables: [],
      documents: [],
      results: [],
      wins: [],
      show_results: false,
      slack_channel_url: "",
      ad_hoc_requests: [],
    });
    setClientName("");
    setClientEmail("");
    setProjectType("");
    setShowForm(false);
    loadPortals();
  };

  const handleSeedDemo = async () => {
    await seedDemoPortal();
    loadPortals();
  };

  const handleDelete = async (id: string) => {
    await deletePortal(id);
    setPortals((prev) => prev.filter((p) => p.id !== id));
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/portal/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-12 py-16 md:py-24">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            Client Portal
          </h1>
          <p className="text-[#7A7A7A]">
            Manage client-facing project portals — share status, updates, and
            collect approvals
          </p>
        </div>

        {/* Actions bar */}
        <div className="flex items-center justify-between mb-6">
          {/* View toggle */}
          <div className="inline-flex bg-[#F3F3F5] rounded-md p-0.5 gap-0.5">
            {(["overview", "manage"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                  viewMode === mode
                    ? "bg-white text-[#1B1B1B] shadow-sm"
                    : "text-[#7A7A7A] hover:text-[#1B1B1B]"
                }`}
              >
                {mode === "overview" ? "Overview" : "Manage"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSeedDemo}
              className="text-xs font-medium text-[#A0A0A0] hover:text-[#2563EB] transition-colors"
            >
              Seed Demo
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1 text-xs font-medium text-[#7A7A7A] hover:text-[#1B1B1B] transition-colors"
            >
              <PlusIcon className="size-3.5" />
              New Portal
            </button>
          </div>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="bg-[#F7F8FA] border border-[#E5E5EA] shadow-[var(--shadow-soft)] rounded-lg p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Create Portal</h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-[#A0A0A0] hover:text-[#1B1B1B]"
              >
                <XMarkIcon className="size-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Client Name *</label>
                  <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="e.g., Nutribloom" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Client Email</label>
                  <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="client@example.com" className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Project Type</label>
                <input type="text" value={projectType} onChange={(e) => setProjectType(e.target.value)} placeholder="Full Page Build" className={inputClass} />
              </div>
              <button
                onClick={handleCreate}
                disabled={!clientName.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#1B1B1B] text-white text-xs font-medium rounded-lg hover:bg-[#2D2D2D] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CheckIcon className="size-3.5" />
                Create Portal
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white border border-[#E5E5EA] shadow-[var(--shadow-soft)] rounded-lg p-5 animate-pulse">
                <div className="h-4 bg-[#EDEDEF] rounded w-1/3 mb-2" />
                <div className="h-3 bg-[#EDEDEF] rounded w-2/3 mb-4" />
                <div className="h-1 bg-[#EDEDEF] rounded w-full" />
              </div>
            ))}
          </div>
        )}

        {!loading && portals.length === 0 && !showForm && (
          <div className="bg-white border border-dashed border-[#E5E5EA] rounded-lg p-8 text-center">
            <p className="text-xs text-[#A0A0A0] mb-3">No portals yet</p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setShowForm(true)} className="text-xs font-medium text-[#7A7A7A] hover:text-[#1B1B1B] transition-colors">
                + Create your first portal
              </button>
              <span className="text-[10px] text-[#E5E5EA]">or</span>
              <button onClick={handleSeedDemo} className="text-xs font-medium text-[#2563EB] hover:text-[#1D4ED8] transition-colors">
                Seed demo portal
              </button>
            </div>
          </div>
        )}

        {!loading && portals.length > 0 && viewMode === "overview" && (
          <OverviewView portals={portals} copiedToken={copiedToken} onCopyLink={copyLink} />
        )}

        {!loading && portals.length > 0 && viewMode === "manage" && (
          <ManageView portals={portals} copiedToken={copiedToken} onCopyLink={copyLink} onDelete={handleDelete} />
        )}
      </div>
    </div>
  );
}

/* ── Overview View: at-a-glance info ── */

function OverviewView({
  portals,
  copiedToken,
  onCopyLink,
}: {
  portals: PortalData[];
  copiedToken: string | null;
  onCopyLink: (token: string) => void;
}) {
  // Aggregate upcoming deadlines across all portals
  const deadlines = useMemo(() => {
    const items: { client: string; name: string; date: string; portalId: string }[] = [];
    for (const p of portals) {
      for (const phase of p.phases) {
        if (phase.deadline && phase.status !== "complete") {
          items.push({ client: p.client_name, name: phase.name, date: phase.deadline, portalId: p.id });
        }
      }
      if (p.next_touchpoint?.date) {
        items.push({ client: p.client_name, name: p.next_touchpoint.description || "Touchpoint", date: p.next_touchpoint.date, portalId: p.id });
      }
    }
    return items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 8);
  }, [portals]);

  // Cross-portal ad-hoc requests
  const allRequests = useMemo(() => {
    const items: (AdHocRequest & { client: string; portalId: string })[] = [];
    for (const p of portals) {
      for (const req of (p.ad_hoc_requests || [])) {
        items.push({ ...req, client: p.client_name, portalId: p.id });
      }
    }
    return items.sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime()).slice(0, 10);
  }, [portals]);

  // ClickUp health summary
  const [clickupData, setClickupData] = useState<{ overdue: number; total: number } | null>(null);
  useEffect(() => {
    fetch("/api/clickup/tasks")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.summary) setClickupData({ overdue: data.summary.overdue, total: data.summary.total });
      })
      .catch(() => {});
  }, []);

  const openRequests = useMemo(
    () => allRequests.filter((r) => r.status !== "done").length,
    [allRequests]
  );

  const statusColors: Record<string, string> = {
    open: "text-amber-600 bg-amber-50",
    "in-progress": "text-blue-600 bg-blue-50",
    done: "text-emerald-600 bg-emerald-50",
  };

  return (
    <div className="space-y-8">
      {/* Summary strip */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-semibold tabular-nums">{portals.length}</span>
          <span className="text-xs text-[#A0A0A0]">active portals</span>
        </div>
        {openRequests > 0 && (
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-semibold tabular-nums">{openRequests}</span>
            <span className="text-xs text-[#A0A0A0]">open requests</span>
          </div>
        )}
        {clickupData && clickupData.overdue > 0 && (
          <Link href="/tools/ops-radar" className="flex items-baseline gap-1.5 hover:opacity-70 transition-opacity">
            <span className="text-lg font-semibold tabular-nums">{clickupData.overdue}</span>
            <span className="text-xs text-[#A0A0A0]">overdue in ClickUp</span>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 ml-0.5" />
          </Link>
        )}
      </div>

      {/* Ad Hoc Requests — promoted to top */}
      {allRequests.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A] mb-3 flex items-center gap-1.5">
            <ChatBubbleLeftRightIcon className="size-3.5" />
            Ad Hoc Requests
          </h3>
          <div className="border border-[#E5E5EA] shadow-[var(--shadow-soft)] rounded-lg divide-y divide-[#EDEDEF]">
            {allRequests.map((req) => (
              <Link
                key={req.id}
                href={`/tools/client-portal/${req.portalId}`}
                className="flex items-center gap-3 p-3 hover:bg-[#F7F8FA] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0]">{req.client}</span>
                    <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${statusColors[req.status]}`}>
                      {req.status}
                    </span>
                  </div>
                  <p className="text-xs font-medium mt-0.5">{req.title}</p>
                </div>
                <span className="text-[10px] text-[#A0A0A0] shrink-0 tabular-nums">
                  {new Date(req.requested_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Deadlines */}
      {deadlines.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A] mb-3 flex items-center gap-1.5">
            <CalendarDaysIcon className="size-3.5" />
            Upcoming Deadlines
          </h3>
          <div className="border border-[#E5E5EA] shadow-[var(--shadow-soft)] rounded-lg divide-y divide-[#EDEDEF]">
            {deadlines.map((dl, i) => {
              const daysUntil = Math.ceil(
                (new Date(dl.date).getTime() - Date.now()) / 86400000
              );
              return (
                <Link
                  key={i}
                  href={`/tools/client-portal/${dl.portalId}`}
                  className="flex items-center gap-3 p-3 hover:bg-[#F7F8FA] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0]">{dl.client}</span>
                    <p className="text-xs font-medium mt-0.5 truncate">{dl.name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] text-[#7A7A7A]">
                      {new Date(dl.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </p>
                    <p className={`text-[10px] tabular-nums ${daysUntil < 0 ? "text-red-500 font-medium" : "text-[#A0A0A0]"}`}>
                      {daysUntil < 0 ? `${Math.abs(daysUntil)}d overdue` : daysUntil === 0 ? "today" : `${daysUntil}d`}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Manage View: edit/delete/copy actions ── */

function ManageView({
  portals,
  copiedToken,
  onCopyLink,
  onDelete,
}: {
  portals: PortalData[];
  copiedToken: string | null;
  onCopyLink: (token: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      {portals.map((portal) => (
        <div key={portal.id} className="bg-white border border-[#E5E5EA] shadow-[var(--shadow-soft)] rounded-lg p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold">{portal.client_name}</h3>
                {portal.current_phase && (
                  <span className="px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-[#EDEDEF] text-[#7A7A7A] rounded">
                    {portal.current_phase}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#7A7A7A]">{portal.project_type || "No project type set"}</p>
              {portal.client_email && <p className="text-[11px] text-[#A0A0A0] mt-0.5">{portal.client_email}</p>}
            </div>
            <div className="flex items-center gap-1 text-xs text-[#A0A0A0]">
              <EyeIcon className="size-3" />
              <span className="tabular-nums">{portal.view_count}</span>
            </div>
          </div>

          {portal.phases.length > 0 && (
            <div className="mt-4 flex gap-1">
              {portal.phases.map((phase) => (
                <div
                  key={phase.id}
                  className={`h-1 rounded-full flex-1 ${
                    phase.status === "complete" ? "bg-emerald-400" : phase.status === "in-progress" ? "bg-[#1B1B1B]" : "bg-[#E5E5EA]"
                  }`}
                />
              ))}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-[#EDEDEF] flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onCopyLink(portal.token)}
                className="flex items-center gap-1 text-[11px] font-medium text-[#A0A0A0] hover:text-[#1B1B1B] transition-colors"
              >
                <ClipboardDocumentIcon className="size-3.5" />
                {copiedToken === portal.token ? "Copied!" : "Copy Link"}
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
            <div className="flex items-center gap-2">
              <Link
                href={`/tools/client-portal/${portal.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1B1B1B] text-white text-xs font-medium rounded-lg hover:bg-[#2D2D2D] transition-colors"
              >
                Manage
                <svg className="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <button
                onClick={() => onDelete(portal.id)}
                className="p-1.5 text-[#A0A0A0] hover:text-red-400 transition-colors"
                title="Delete portal"
              >
                <TrashIcon className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
