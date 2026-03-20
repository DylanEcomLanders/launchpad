"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  PlusIcon,
  TrashIcon,
  XMarkIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  ArrowTopRightOnSquareIcon,
  FunnelIcon,
  BeakerIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { inputClass, labelClass } from "@/lib/form-styles";
import { getPortals, createPortal, deletePortal, getTrashedPortals, restorePortal, permanentlyDeletePortal } from "@/lib/portal/data";
import type { PortalData } from "@/lib/portal/types";

type IntelligemsTest = {
  id: string;
  name: string;
  status: string;
  startedAt?: string;
  portalName: string;
  portalId: string;
  variations: { name: string; cvr: number; aov: number; rpv: number; visitors: number; orders: number; revenue: number }[];
};

/** Fetch all Intelligems tests across portals that have an API key */
async function fetchAllIntelligemsTests(portals: PortalData[]): Promise<IntelligemsTest[]> {
  const portalsWithKey = portals.filter((p) => p.intelligems_key?.trim());
  if (portalsWithKey.length === 0) return [];

  const allTests: IntelligemsTest[] = [];

  for (const portal of portalsWithKey) {
    try {
      const res = await fetch("/api/intelligems/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: portal.intelligems_key }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const tests = data.tests || [];
      for (const t of tests) {
        allTests.push({
          ...t,
          portalName: portal.client_name,
          portalId: portal.id,
        });
      }
    } catch {
      // Skip this portal
    }
  }

  return allTests;
}

export default function ClientPortalPage() {
  const [portals, setPortals] = useState<PortalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [projectType, setProjectType] = useState("Full Page Build");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [overdueCount, setOverdueCount] = useState(0);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStage, setFilterStage] = useState<string>("all");
  const [igTests, setIgTests] = useState<IntelligemsTest[]>([]);
  const [igLoading, setIgLoading] = useState(false);

  const loadPortals = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPortals();
      setPortals(data);
      // Fetch Intelligems tests in background
      setIgLoading(true);
      fetchAllIntelligemsTests(data).then((tests) => {
        setIgTests(tests);
        setIgLoading(false);
      }).catch(() => setIgLoading(false));
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPortals();
    // Fetch overdue from ClickUp
    fetch("/api/clickup/tasks")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.summary) setOverdueCount(data.summary.overdue ?? 0);
      })
      .catch(() => {});
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
    setProjectType("Full Page Build");
    setShowForm(false);
    loadPortals();
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [trashedPortals, setTrashedPortals] = useState<PortalData[]>([]);
  const [confirmPermanentId, setConfirmPermanentId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    await deletePortal(id);
    setPortals((prev) => prev.filter((p) => p.id !== id));
    setConfirmDeleteId(null);
  };

  const loadTrash = useCallback(async () => {
    const trashed = await getTrashedPortals();
    setTrashedPortals(trashed);
  }, []);

  const handleRestore = async (id: string) => {
    await restorePortal(id);
    setTrashedPortals((prev) => prev.filter((p) => p.id !== id));
    loadPortals();
  };

  const handlePermanentDelete = async (id: string) => {
    if (confirmPermanentId !== id) {
      setConfirmPermanentId(id);
      return;
    }
    await permanentlyDeletePortal(id);
    setTrashedPortals((prev) => prev.filter((p) => p.id !== id));
    setConfirmPermanentId(null);
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/portal/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  // Aggregate stats
  const openAdHoc = useMemo(
    () =>
      portals.reduce(
        (sum, p) =>
          sum + (p.ad_hoc_requests || []).filter((r) => r.status !== "done").length,
        0
      ),
    [portals]
  );

  const blockedCount = useMemo(
    () => portals.filter((p) => p.blocker).length,
    [portals]
  );

  // Unique stages for filter
  const uniqueStages = useMemo(() => {
    const stages = portals.map((p) => p.current_phase).filter(Boolean);
    return [...new Set(stages)];
  }, [portals]);

  // Filtered portals
  const filteredPortals = useMemo(() => {
    return portals.filter((p) => {
      if (filterType !== "all") {
        const isRetainer = p.project_type?.toLowerCase().includes("retainer");
        if (filterType === "retainer" && !isRetainer) return false;
        if (filterType === "project" && isRetainer) return false;
      }
      if (filterStage !== "all" && p.current_phase !== filterStage) return false;
      return true;
    });
  }, [portals, filterType, filterStage]);

  return (
    <div className="min-h-screen p-5 md:p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Client Portals</h1>
          <p className="text-sm text-[#7A7A7A]">Overview of all active client projects</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowTrash(!showTrash);
              if (!showTrash) loadTrash();
            }}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
              showTrash
                ? "bg-red-50 text-red-600 border-red-200"
                : "text-[#7A7A7A] border-[#E5E5EA] hover:bg-[#F5F5F5]"
            }`}
          >
            <TrashIcon className="size-3.5" />
            Trash
          </button>
          {!showTrash && (
            <button
              onClick={() => {
                setShowForm(true);
                setClientName("");
                setClientEmail("");
                setProjectType("Full Page Build");
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#1B1B1B] text-white text-xs font-medium rounded-lg hover:bg-[#2D2D2D] transition-colors"
            >
              <PlusIcon className="size-3.5" />
              New Portal
            </button>
          )}
        </div>
      </div>

      {/* ── Stat Panels ── */}
      {!showTrash && <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="border border-[#1B1B1B] rounded-lg px-5 py-5">
          <span className="text-2xl font-semibold tabular-nums text-[#1B1B1B]">{portals.length}</span>
          <p className="text-[11px] text-[#7A7A7A] mt-1">Active Portals</p>
        </div>
        <div className={`border rounded-lg px-5 py-5 ${blockedCount > 0 ? "border-red-300 bg-red-50/50" : "border-[#1B1B1B]"}`}>
          <span className={`text-2xl font-semibold tabular-nums ${blockedCount > 0 ? "text-red-600" : "text-[#1B1B1B]"}`}>{blockedCount}</span>
          <p className="text-[11px] text-[#7A7A7A] mt-1">Blocked</p>
        </div>
        <div className="border border-[#1B1B1B] rounded-lg px-5 py-5">
          <span className="text-2xl font-semibold tabular-nums text-[#1B1B1B]">{openAdHoc}</span>
          <p className="text-[11px] text-[#7A7A7A] mt-1">Ad Hoc Requests</p>
        </div>
        <div className={`border rounded-lg px-5 py-5 ${igTests.filter((t) => t.status === "started").length > 0 ? "border-emerald-300 bg-emerald-50/30" : "border-[#1B1B1B]"}`}>
          <span className={`text-2xl font-semibold tabular-nums ${igTests.filter((t) => t.status === "started").length > 0 ? "text-emerald-600" : "text-[#1B1B1B]"}`}>
            {igTests.filter((t) => t.status === "started").length}
          </span>
          <p className="text-[11px] text-[#7A7A7A] mt-1">Live Tests</p>
        </div>
      </div>}

      {/* ── CRO Testing Overview ── */}
      {!showTrash && igTests.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <BeakerIcon className="size-4 text-[#777]" />
            <h2 className="text-sm font-semibold text-[#1A1A1A]">Live Tests</h2>
            <span className="text-[10px] text-[#AAA]">
              {igTests.filter((t) => t.status === "started").length} active across {new Set(igTests.filter((t) => t.status === "started").map((t) => t.portalId)).size} client{new Set(igTests.filter((t) => t.status === "started").map((t) => t.portalId)).size !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#E8E8E8]">
                  <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-[#AAA] pb-2 pr-4">Test</th>
                  <th className="text-left text-[10px] font-semibold uppercase tracking-wider text-[#AAA] pb-2 pr-4">Client</th>
                  <th className="text-center text-[10px] font-semibold uppercase tracking-wider text-[#AAA] pb-2 px-2">Status</th>
                  <th className="text-right text-[10px] font-semibold uppercase tracking-wider text-[#AAA] pb-2 px-2">CVR (A→B)</th>
                  <th className="text-right text-[10px] font-semibold uppercase tracking-wider text-[#AAA] pb-2 px-2">AOV (A→B)</th>
                  <th className="text-right text-[10px] font-semibold uppercase tracking-wider text-[#AAA] pb-2 px-2">RPV (A→B)</th>
                  <th className="text-right text-[10px] font-semibold uppercase tracking-wider text-[#AAA] pb-2 pl-2">Visitors</th>
                </tr>
              </thead>
              <tbody>
                {igTests
                  .filter((t) => t.status === "started")
                  .map((t) => {
                    const a = t.variations[0];
                    const b = t.variations[1];
                    const cvrLift = a && b && a.cvr > 0 ? ((b.cvr - a.cvr) / a.cvr * 100) : null;
                    const aovLift = a && b && a.aov > 0 ? ((b.aov - a.aov) / a.aov * 100) : null;
                    const rpvLift = a && b && a.rpv > 0 ? ((b.rpv - a.rpv) / a.rpv * 100) : null;
                    const totalVisitors = (a?.visitors || 0) + (b?.visitors || 0);
                    const liftColor = (v: number | null) => !v ? "text-[#AAA]" : v > 0 ? "text-emerald-600" : "text-red-500";
                    const fmtLift = (v: number | null) => !v ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

                    return (
                      <tr key={t.id} className="border-b border-[#F5F5F5] hover:bg-[#FAFAFA] cursor-pointer" onClick={() => window.location.href = `/tools/client-portal/${t.portalId}`}>
                        <td className="py-2.5 pr-4 font-medium text-[#1A1A1A] truncate max-w-[200px]">{t.name}</td>
                        <td className="py-2.5 pr-4 text-[#777] truncate max-w-[120px]">{t.portalName}</td>
                        <td className="py-2.5 px-2 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600">
                            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Live
                          </span>
                        </td>
                        <td className={`py-2.5 px-2 text-right tabular-nums ${liftColor(cvrLift)}`}>
                          {a ? `${(a.cvr * 100).toFixed(1)}%` : "—"} → {b ? `${(b.cvr * 100).toFixed(1)}%` : "—"}
                          {cvrLift !== null && <span className="ml-1 text-[10px]">{fmtLift(cvrLift)}</span>}
                        </td>
                        <td className={`py-2.5 px-2 text-right tabular-nums ${liftColor(aovLift)}`}>
                          ${a?.aov?.toFixed(0) || "0"} → ${b?.aov?.toFixed(0) || "0"}
                          {aovLift !== null && <span className="ml-1 text-[10px]">{fmtLift(aovLift)}</span>}
                        </td>
                        <td className={`py-2.5 px-2 text-right tabular-nums ${liftColor(rpvLift)}`}>
                          ${a?.rpv?.toFixed(2) || "0"} → ${b?.rpv?.toFixed(2) || "0"}
                          {rpvLift !== null && <span className="ml-1 text-[10px]">{fmtLift(rpvLift)}</span>}
                        </td>
                        <td className="py-2.5 pl-2 text-right tabular-nums text-[#777]">
                          {totalVisitors > 1000 ? `${(totalVisitors / 1000).toFixed(1)}K` : totalVisitors}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {!showTrash && igLoading && portals.some((p) => p.intelligems_key?.trim()) && (
        <div className="flex items-center gap-2 mb-6 text-xs text-[#AAA]">
          <div className="animate-spin size-3 border border-[#E5E5EA] border-t-[#777] rounded-full" />
          Loading test data...
        </div>
      )}

      {/* ── Filters ── */}
      {!showTrash && portals.length > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <FunnelIcon className="size-3.5 text-[#A0A0A0]" />
          <div className="flex items-center gap-1.5">
            {["all", "retainer", "project"].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1 text-[11px] font-medium rounded-full transition-colors ${
                  filterType === t
                    ? "bg-[#1B1B1B] text-white"
                    : "bg-[#F3F3F5] text-[#7A7A7A] hover:bg-[#E5E5EA]"
                }`}
              >
                {t === "all" ? "All" : t === "retainer" ? "Retainer" : "Project"}
              </button>
            ))}
          </div>
          {uniqueStages.length > 0 && (
            <>
              <div className="w-px h-4 bg-[#E5E5EA]" />
              <select
                value={filterStage}
                onChange={(e) => setFilterStage(e.target.value)}
                className="text-[11px] font-medium text-[#7A7A7A] bg-[#F3F3F5] border-none rounded-full px-3 py-1 cursor-pointer hover:bg-[#E5E5EA] transition-colors"
              >
                <option value="all">All Stages</option>
                {uniqueStages.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </>
          )}
          {(filterType !== "all" || filterStage !== "all") && (
            <button
              onClick={() => { setFilterType("all"); setFilterStage("all"); }}
              className="text-[11px] text-[#A0A0A0] hover:text-[#1B1B1B] transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* ── Create Form (inline) ── */}
      {showForm && (
        <div className="bg-[#F7F8FA] border border-[#E5E5EA] rounded-lg p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Create Portal</h3>
            <button onClick={() => setShowForm(false)} className="text-[#A0A0A0] hover:text-[#1B1B1B]">
              <XMarkIcon className="size-4" />
            </button>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Client Name *</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g., Nutribloom"
                  className={inputClass}
                  autoFocus
                />
              </div>
              <div>
                <label className={labelClass}>Client Email</label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="client@example.com"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Project Type</label>
                <select
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value)}
                  className={inputClass}
                >
                  <option value="Full Page Build">Full Page Build</option>
                  <option value="Retainer">Retainer</option>
                  <option value="Landing Page">Landing Page</option>
                  <option value="CRO Audit">CRO Audit</option>
                  <option value="Other">Other</option>
                </select>
              </div>
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

      {/* ── Loading ── */}
      {!showTrash && loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-[#E5E5EA] rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-[#EDEDEF] rounded w-1/4 mb-2" />
              <div className="h-3 bg-[#EDEDEF] rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!showTrash && !loading && portals.length === 0 && !showForm && (
        <div className="border border-dashed border-[#E5E5EA] rounded-lg p-12 text-center">
          <p className="text-sm text-[#7A7A7A] mb-1">No client portals yet</p>
          <p className="text-xs text-[#A0A0A0] mb-4">Create your first portal to start tracking projects</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1B1B1B] text-white text-xs font-medium rounded-lg hover:bg-[#2D2D2D] transition-colors"
          >
            <PlusIcon className="size-3.5" />
            New Portal
          </button>
        </div>
      )}

      {/* ── Portal List ── */}
      {!showTrash && !loading && portals.length > 0 && (
        <div className="space-y-4">
          {filteredPortals.length === 0 ? (
            <div className="border border-dashed border-[#E5E5EA] rounded-lg p-8 text-center">
              <p className="text-sm text-[#7A7A7A]">No portals match the current filters</p>
            </div>
          ) : (
            filteredPortals.map((portal) => (
              <PortalCard
                key={portal.id}
                portal={portal}
                copiedToken={copiedToken}
                onCopyLink={copyLink}
                onDelete={handleDelete}
                confirmDeleteId={confirmDeleteId}
                onCancelDelete={() => setConfirmDeleteId(null)}
              />
            ))
          )}
        </div>
      )}

      {/* ── Trash Bin ── */}
      {showTrash && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrashIcon className="size-4 text-red-400" />
            <h2 className="text-sm font-semibold text-[#1B1B1B]">Trash</h2>
            <span className="text-xs text-[#AAA]">({trashedPortals.length} portals)</span>
          </div>

          {trashedPortals.length === 0 ? (
            <div className="border border-dashed border-[#E5E5EA] rounded-lg p-12 text-center">
              <p className="text-sm text-[#7A7A7A]">Trash is empty</p>
              <p className="text-xs text-[#A0A0A0] mt-1">Deleted portals will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {trashedPortals.map((portal) => (
                <div
                  key={portal.id}
                  className="flex items-center justify-between border border-[#E5E5EA] rounded-lg p-4 bg-[#FAFAFA]"
                >
                  <div>
                    <p className="text-sm font-semibold text-[#1B1B1B]">{portal.client_name}</p>
                    <p className="text-xs text-[#7A7A7A]">
                      {portal.project_type} · Deleted{" "}
                      {portal.deleted_at
                        ? new Date(portal.deleted_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRestore(portal.id)}
                      className="px-3 py-1.5 text-xs font-medium text-[#1B1B1B] border border-[#E5E5EA] rounded-lg hover:bg-white transition-colors"
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => handlePermanentDelete(portal.id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        confirmPermanentId === portal.id
                          ? "bg-red-500 text-white"
                          : "text-red-500 border border-red-200 hover:bg-red-50"
                      }`}
                    >
                      {confirmPermanentId === portal.id ? "Confirm Delete" : "Delete Forever"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Portal Card ── */

function PortalCard({
  portal,
  copiedToken,
  onCopyLink,
  onDelete,
  confirmDeleteId,
  onCancelDelete,
}: {
  portal: PortalData;
  copiedToken: string | null;
  onCopyLink: (token: string) => void;
  onDelete: (id: string) => void;
  confirmDeleteId: string | null;
  onCancelDelete: () => void;
}) {
  const isRetainer = portal.project_type?.toLowerCase().includes("retainer");
  const blocker = portal.blocker;

  // Find next upcoming/in-progress phase
  const nextPhase = portal.phases.find((p) => p.status === "in-progress") ||
    portal.phases.find((p) => p.status === "upcoming");

  // Touchpoint
  const touchpoint = portal.next_touchpoint;
  const hasTouchpoint = touchpoint?.date || touchpoint?.description;

  // Open ad-hoc count
  const openRequests = (portal.ad_hoc_requests || []).filter((r) => r.status !== "done").length;

  // Live tests
  const runningTests = (portal.results || []).filter((r) => r.status === "live").length;

  // Days blocked
  const daysBlocked = blocker?.since
    ? Math.max(0, Math.floor((Date.now() - new Date(blocker.since).getTime()) / 86400000))
    : 0;

  return (
    <Link
      href={`/tools/client-portal/${portal.id}`}
      className={`block border rounded-xl p-5 hover:shadow-sm transition-all group ${
        blocker ? "border-red-300 bg-red-50/30" : "border-[#E5E5EA] hover:border-[#C5C5C5]"
      }`}
    >
      {/* Blocker banner */}
      {blocker && (
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-red-200">
          <span className="size-2 rounded-full bg-red-500 animate-pulse shrink-0" />
          <span className="text-[11px] font-semibold text-red-600 uppercase tracking-wider">
            Blocked — {blocker.type === "client" ? "Client" : blocker.type === "internal" ? "Internal" : "External"}
          </span>
          <span className="text-[11px] text-red-400">{blocker.reason}</span>
          <span className="ml-auto text-[10px] font-medium text-red-500 bg-red-100 px-2 py-0.5 rounded-full">
            {new Date(blocker.since).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            {daysBlocked > 0 && ` (${daysBlocked}d)`}
          </span>
        </div>
      )}

      {/* Top row: name + badge + actions */}
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-semibold text-[#1B1B1B] truncate">{portal.client_name}</h3>
        <span className={`shrink-0 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider rounded-full ${
          isRetainer
            ? "bg-blue-50 text-blue-600"
            : "bg-emerald-50 text-emerald-600"
        }`}>
          {isRetainer ? "Retainer" : "Project"}
        </span>

        {/* Actions — right aligned */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCopyLink(portal.token); }}
            className="p-1.5 text-[#A0A0A0] hover:text-[#1B1B1B] transition-colors opacity-0 group-hover:opacity-100"
            title="Copy portal link"
          >
            <ClipboardDocumentIcon className="size-3.5" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(`/portal/${portal.token}`, '_blank'); }}
            className="p-1.5 text-[#A0A0A0] hover:text-[#1B1B1B] transition-colors opacity-0 group-hover:opacity-100"
            title="Preview portal"
          >
            <ArrowTopRightOnSquareIcon className="size-3.5" />
          </button>
          {confirmDeleteId === portal.id ? (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(portal.id); }}
              onBlur={() => onCancelDelete()}
              className="px-2 py-1 text-[10px] font-medium text-white bg-red-500 rounded hover:bg-red-600 transition-colors"
            >
              Confirm
            </button>
          ) : (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(portal.id); }}
              className="p-1.5 text-[#A0A0A0] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              title="Delete portal"
            >
              <TrashIcon className="size-3.5" />
            </button>
          )}
          <span className="px-3 py-1.5 text-[11px] font-medium text-[#1B1B1B] border border-[#E5E5EA] rounded-md group-hover:bg-[#1B1B1B] group-hover:text-white group-hover:border-[#1B1B1B] transition-colors">
            Manage
          </span>
        </div>
      </div>

      {/* Fields row */}
      <div className="grid grid-cols-5 gap-3 mt-4 pt-4 border-t border-[#EDEDEF]">
        <div>
          <p className="text-[10px] text-[#A0A0A0] uppercase tracking-wider mb-0.5">Stage</p>
          <p className="text-[12px] font-medium text-[#1B1B1B] truncate">
            {portal.current_phase || "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[#A0A0A0] uppercase tracking-wider mb-0.5">Next Phase</p>
          <p className="text-[12px] font-medium text-[#1B1B1B] truncate">
            {nextPhase?.deadline
              ? new Date(nextPhase.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
              : nextPhase?.dates || "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[#A0A0A0] uppercase tracking-wider mb-0.5">Touchpoint</p>
          <p className="text-[12px] font-medium text-[#1B1B1B] truncate">
            {touchpoint?.date
              ? new Date(touchpoint.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
              : touchpoint?.description || "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[#A0A0A0] uppercase tracking-wider mb-0.5">Tests</p>
          <p className={`text-[12px] font-medium truncate ${runningTests > 0 ? "text-emerald-600" : "text-[#1B1B1B]"}`}>
            {runningTests > 0 ? `${runningTests} running` : "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[#A0A0A0] uppercase tracking-wider mb-0.5">Requests</p>
          <p className={`text-[12px] font-medium truncate ${openRequests > 0 ? "text-amber-600" : "text-[#1B1B1B]"}`}>
            {openRequests > 0 ? `${openRequests} open` : "—"}
          </p>
        </div>
      </div>
    </Link>
  );
}
