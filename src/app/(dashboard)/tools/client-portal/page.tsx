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
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { inputClass, labelClass } from "@/lib/form-styles";
import { getPortals, createPortal, deletePortal, getTrashedPortals, restorePortal, permanentlyDeletePortal } from "@/lib/portal/data";
import type { PortalData } from "@/lib/portal/types";
import { getTickets, type Ticket } from "@/lib/slack-tickets";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

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
  const [clientType, setClientType] = useState<"retainer" | "regular" | null>(null);
  const [projectType, setProjectType] = useState("Full Page Build");
  const [testingTier, setTestingTier] = useState<"T1" | "T2" | "T3">("T1");
  const [igKey, setIgKey] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [overdueCount, setOverdueCount] = useState(0);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStage, setFilterStage] = useState<string>("all");
  const [igTests, setIgTests] = useState<IntelligemsTest[]>([]);
  const [igLoading, setIgLoading] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "testing" | "tickets" | "delivery" | "clients" | "retainers">("overview");
  const [activeChart, setActiveChart] = useState(0);

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
    getTickets().then(setTickets).catch(() => {});
    fetch("/api/clickup/tasks")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.summary) setOverdueCount(data.summary.overdue ?? 0);
      })
      .catch(() => {});
  }, [loadPortals]);

  const handleCreate = async () => {
    if (!clientName.trim() || !clientType) return;
    const isRetainer = clientType === "retainer";
    const firstProject = {
      id: crypto.randomUUID(),
      name: isRetainer ? "CRO Retainer" : projectType.trim() || "Page Build",
      type: (isRetainer ? "retainer" : "page-build") as "retainer" | "page-build",
      status: "active" as const,
      created_at: new Date().toISOString(),
      phases: [] as any[],
      deliverables: [] as any[],
      current_phase: "",
      progress: 0,
      testing_tier: isRetainer ? testingTier : undefined,
      scope: [] as any[],
      documents: [] as any[],
    };
    await createPortal({
      client_name: clientName.trim(),
      client_email: clientEmail.trim(),
      client_type: clientType,
      project_type: isRetainer ? "Retainer" : projectType.trim() || "Full Page Build",
      current_phase: "",
      progress: 0,
      next_touchpoint: { date: "", description: "" },
      phases: [],
      scope: [],
      deliverables: [],
      documents: [],
      results: [],
      testing_tier: isRetainer ? testingTier : undefined,
      intelligems_key: isRetainer ? igKey.trim() || undefined : undefined,
      wins: [],
      show_results: isRetainer,
      slack_channel_url: "",
      ad_hoc_requests: [],
      projects: [firstProject],
    });
    setClientName("");
    setClientEmail("");
    setClientType(null);
    setProjectType("Full Page Build");
    setTestingTier("T1");
    setIgKey("");
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

  const openTickets = useMemo(
    () => tickets.filter((t) => !t.deleted_at && t.status !== "resolved"),
    [tickets]
  );

  const blockedPortals = useMemo(
    () => portals.filter((p) => p.blocker),
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
              className="flex items-center gap-1.5 px-4 py-2 bg-[#1B1B1B] text-white text-xs font-medium rounded-lg hover:bg-[#2D2D2D] transition-colors whitespace-nowrap"
            >
              <PlusIcon className="size-3.5 shrink-0" />
              New
            </button>
          )}
        </div>
      </div>

      {/* Stats removed — replaced by chart in Overview tab */}

      {/* ── Tab Navigation ── */}
      {!showTrash && (
        <div className="flex items-center gap-1 mb-6 border-b border-[#E8E8E8]">
          {([
            { key: "overview" as const, label: "Overview" },
            { key: "retainers" as const, label: "Retainers" },
            { key: "testing" as const, label: "Testing" },
            { key: "tickets" as const, label: `Tickets${openTickets.length > 0 ? ` (${openTickets.length})` : ""}` },
            { key: "delivery" as const, label: "Delivery" },
            { key: "clients" as const, label: "Clients" },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2.5 text-xs font-semibold transition-colors relative ${
                activeTab === key
                  ? "text-[#1A1A1A]"
                  : "text-[#AAA] hover:text-[#777]"
              }`}
            >
              {label}
              {activeTab === key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1A1A1A] rounded-full" />}
            </button>
          ))}
        </div>
      )}

      {/* ═══════ OVERVIEW TAB ═══════ */}
      {!showTrash && activeTab === "overview" && (() => {
        const liveTests = igTests.filter((t) => t.status === "started");
        const completedTests = igTests.filter((t) => t.status === "ended");
        const getRpvLift = (t: IntelligemsTest) => { const a = t.variations[0], b = t.variations[1]; if (!a || !b || a.rpv === 0) return null; return ((b.rpv - a.rpv) / a.rpv) * 100; };
        const winners = completedTests.filter((t) => { const l = getRpvLift(t); return l !== null && l > 5; });
        const totalRevenue = igTests.reduce((sum, t) => sum + t.variations.reduce((vs, v) => vs + (v.revenue || 0), 0), 0);

        // Build chart data from tickets (by week)
        const chartMetrics = [
          { key: "tickets", label: "Tickets", color: "#1A1A1A" },
          { key: "resolved", label: "Resolved", color: "#10B981" },
          { key: "tests", label: "Tests Run", color: "#6366F1" },
        ];
        const currentChartMetric = chartMetrics[activeChart % chartMetrics.length];

        // Generate last 8 weeks of data
        const weeklyData: { week: string; tickets: number; resolved: number; tests: number }[] = [];
        for (let i = 7; i >= 0; i--) {
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - (i * 7));
          weekStart.setHours(0, 0, 0, 0);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 7);
          const label = weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

          const ticketsThisWeek = tickets.filter(t => {
            const d = new Date(t.created_at);
            return d >= weekStart && d < weekEnd;
          }).length;

          const resolvedThisWeek = tickets.filter(t => {
            if (!t.resolved_at) return false;
            const d = new Date(t.resolved_at);
            return d >= weekStart && d < weekEnd;
          }).length;

          const testsThisWeek = igTests.filter(t => {
            if (!t.startedAt) return false;
            const d = new Date(t.startedAt);
            return d >= weekStart && d < weekEnd;
          }).length;

          weeklyData.push({ week: label, tickets: ticketsThisWeek, resolved: resolvedThisWeek, tests: testsThisWeek });
        }

        // Summary numbers
        const summaryData = [
          { label: "Active Clients", value: portals.length, color: "#1A1A1A" },
          { label: "Live Tests", value: liveTests.length, color: "#10B981" },
          { label: "Open Tickets", value: openTickets.length, color: openTickets.length > 0 ? "#F59E0B" : "#1A1A1A" },
          { label: "Test Winners", value: winners.length, suffix: `/ ${completedTests.length}`, color: "#10B981" },
        ];

        // Touchpoints
        const touchpoints = portals
          .filter((p) => p.next_touchpoint?.date)
          .map((p) => ({ client: p.client_name, portalId: p.id, date: p.next_touchpoint!.date, description: p.next_touchpoint!.description || "", daysAway: Math.ceil((new Date(p.next_touchpoint!.date + "T00:00:00").getTime() - Date.now()) / 86400000) }))
          .sort((a, b) => a.daysAway - b.daysAway);

        const designTickets = openTickets.filter(t => t.ticket_type === "design");
        const devTickets = openTickets.filter(t => t.ticket_type === "dev");

        return (
          <div className="space-y-6">
            {/* ── Ticket Type Panels ── */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setActiveTab("tickets")} className="flex items-center justify-between px-4 py-3 border border-[#E5E5EA] rounded-xl bg-white hover:border-[#C5C5C5] transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="size-2 rounded-full bg-purple-500" />
                  <span className="text-xs font-medium text-[#1A1A1A]">Design Tickets</span>
                </div>
                <span className="text-lg font-bold tabular-nums text-[#1A1A1A]">{designTickets.length}</span>
              </button>
              <button onClick={() => setActiveTab("tickets")} className="flex items-center justify-between px-4 py-3 border border-[#E5E5EA] rounded-xl bg-white hover:border-[#C5C5C5] transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="size-2 rounded-full bg-blue-500" />
                  <span className="text-xs font-medium text-[#1A1A1A]">Dev Tickets</span>
                </div>
                <span className="text-lg font-bold tabular-nums text-[#1A1A1A]">{devTickets.length}</span>
              </button>
            </div>

            {/* ── Blocked Clients ── */}
            <div>
              {blockedPortals.length > 0 ? (
                <>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-red-400 mb-3">Blocked ({blockedPortals.length})</h3>
                  <div className="border border-red-100 rounded-xl bg-red-50/30 divide-y divide-red-100 overflow-hidden">
                    {blockedPortals.map((p) => {
                      const daysBlocked = p.blocker?.since ? Math.max(0, Math.floor((Date.now() - new Date(p.blocker.since).getTime()) / 86400000)) : 0;
                      return (
                        <Link key={p.id} href={`/tools/client-portal/${p.id}`} className="flex items-center justify-between px-4 py-2.5 hover:bg-red-50 transition-colors">
                          <div className="flex items-center gap-2">
                            <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-xs font-medium text-[#1A1A1A]">{p.client_name}</span>
                            <span className="text-[10px] text-red-500">{p.blocker?.reason}</span>
                          </div>
                          <span className="text-[10px] text-red-400">{daysBlocked}d</span>
                        </Link>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 px-4 py-3 border border-emerald-100 rounded-xl bg-emerald-50/30">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  <span className="text-xs text-emerald-700">No blocked clients</span>
                </div>
              )}
            </div>

            {/* ── Upcoming Touchpoints (3-column) ── */}
            {touchpoints.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#AAA] mb-3">Upcoming Touchpoints</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {touchpoints.slice(0, 6).map((tp, i) => (
                    <Link key={i} href={`/tools/client-portal/${tp.portalId}`} className="flex items-center justify-between px-3.5 py-3 border border-[#E5E5EA] rounded-xl bg-white hover:border-[#C5C5C5] transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`size-1.5 rounded-full shrink-0 ${tp.daysAway < 0 ? "bg-red-500" : tp.daysAway <= 2 ? "bg-amber-500" : "bg-emerald-500"}`} />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[#1A1A1A] truncate">{tp.client}</p>
                          {tp.description && <p className="text-[10px] text-[#999] truncate">{tp.description}</p>}
                        </div>
                      </div>
                      <span className={`text-[10px] font-medium shrink-0 ml-2 ${tp.daysAway < 0 ? "text-red-500" : tp.daysAway <= 2 ? "text-amber-600" : "text-[#999]"}`}>
                        {tp.daysAway < 0 ? `${Math.abs(tp.daysAway)}d overdue` : tp.daysAway === 0 ? "Today" : `${tp.daysAway}d`}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* ── Clients List (no border, scrollable) ── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#AAA]">Clients</h3>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#AAA]">Total Clients: {portals.length}</span>
              </div>
              {portals.length > 0 ? (
                <div className="divide-y divide-[#F0F0F0]">
                  {portals.map((p) => {
                    const isBlocked = !!p.blocker;
                    const isRetainer = p.client_type === "retainer" || p.project_type?.toLowerCase().includes("retainer");
                    const tp = p.next_touchpoint;
                    const tpDays = tp?.date ? Math.ceil((new Date(tp.date + "T00:00:00").getTime() - Date.now()) / 86400000) : null;
                    return (
                      <Link
                        key={p.id}
                        href={`/tools/client-portal/${p.id}`}
                        className={`flex items-center justify-between px-3.5 py-3 rounded-lg hover:bg-[#F7F8FA] transition-colors ${isBlocked ? "bg-red-50/40" : ""}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {isBlocked && <span className="size-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#1A1A1A] truncate">{p.client_name}</p>
                            <p className="text-[10px] text-[#AAA]">
                              {isRetainer ? "Retainer" : p.project_type || "Project"}
                              {p.current_phase ? ` · ${p.current_phase}` : ""}
                              {isBlocked ? ` · Blocked: ${p.blocker?.reason}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {tpDays !== null && (
                            <span className={`text-[10px] ${tpDays < 0 ? "text-red-500" : tpDays <= 2 ? "text-amber-500" : "text-[#CCC]"}`}>
                              {tpDays < 0 ? `${Math.abs(tpDays)}d overdue` : tpDays === 0 ? "Today" : `${tpDays}d`}
                            </span>
                          )}
                          <svg className="size-4 text-[#DDD]" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-[#CCC]">No clients yet</p>
              )}
            </div>
          </div>
        );
      })()}

      {/* ═══════ TESTING TAB ═══════ */}
      {!showTrash && activeTab === "testing" && (
        <>
          {igLoading && (
            <div className="flex items-center gap-2 mb-6 text-xs text-[#AAA]">
              <div className="animate-spin size-3 border border-[#E5E5EA] border-t-[#777] rounded-full" />
              Loading test data from Intelligems...
            </div>
          )}

          {igTests.length === 0 && !igLoading && (
            <div className="border border-dashed border-[#E5E5EA] rounded-xl p-12 text-center">
              <BeakerIcon className="size-6 text-[#DDD] mx-auto mb-2" />
              <p className="text-sm text-[#7A7A7A]">No test data</p>
              <p className="text-xs text-[#AAA] mt-1">Add an Intelligems API key to a portal to see tests here</p>
            </div>
          )}

          {igTests.length > 0 && (() => {
            const liveTests = igTests.filter((t) => t.status === "started");
            const completedTests = igTests.filter((t) => t.status === "ended");

            const getRpvLift = (t: IntelligemsTest) => {
              const a = t.variations[0];
              const b = t.variations[1];
              if (!a || !b || a.rpv === 0) return null;
              return ((b.rpv - a.rpv) / a.rpv) * 100;
            };

            const winners = completedTests.filter((t) => { const l = getRpvLift(t); return l !== null && l > 5; });
            const losers = completedTests.filter((t) => { const l = getRpvLift(t); return l !== null && l < -5; });

            const fmtVisitors = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);

            return (
              <div className="space-y-8">

                {/* ── Live Tests ── */}
                {liveTests.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                      <h3 className="text-sm font-semibold text-[#1A1A1A]">Live ({liveTests.length})</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {liveTests.map((t) => {
                        const a = t.variations[0];
                        const b = t.variations[1];
                        const rpvLift = getRpvLift(t);
                        const totalVisitors = (a?.visitors || 0) + (b?.visitors || 0);
                        const needsAttention = totalVisitors > 500 && rpvLift !== null && rpvLift < -10;

                        return (
                          <Link
                            key={t.id}
                            href={`/tools/client-portal/${t.portalId}`}
                            className={`border rounded-xl bg-white p-5 hover:shadow-sm transition-all ${needsAttention ? "border-red-200" : "border-[#E5E5EA]"}`}
                          >
                            <div className="flex items-start justify-between mb-4">
                              <div className="min-w-0 mr-3">
                                <p className="text-sm font-semibold text-[#1A1A1A] truncate">{t.name}</p>
                                <p className="text-[11px] text-[#999] mt-0.5">{t.portalName} · {fmtVisitors(totalVisitors)} visitors</p>
                              </div>
                              {rpvLift !== null ? (
                                <span className={`shrink-0 text-lg font-bold tabular-nums ${rpvLift > 0 ? "text-emerald-600" : rpvLift < -5 ? "text-red-500" : "text-[#AAA]"}`}>
                                  {rpvLift >= 0 ? "+" : ""}{rpvLift.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-sm text-[#DDD]">—</span>
                              )}
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <p className="text-[10px] font-medium uppercase tracking-wider text-[#BBB] mb-1">CVR</p>
                                <p className="text-xs tabular-nums text-[#555]">{a ? `${(Number(a.cvr || 0) * 100).toFixed(1)}%` : "—"}</p>
                                <p className="text-xs tabular-nums text-[#1A1A1A] font-medium">{b ? `${(Number(b.cvr || 0) * 100).toFixed(1)}%` : "—"}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-medium uppercase tracking-wider text-[#BBB] mb-1">AOV</p>
                                <p className="text-xs tabular-nums text-[#555]">${Number(a?.aov || 0).toFixed(0)}</p>
                                <p className="text-xs tabular-nums text-[#1A1A1A] font-medium">${Number(b?.aov || 0).toFixed(0)}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-medium uppercase tracking-wider text-[#BBB] mb-1">RPV</p>
                                <p className="text-xs tabular-nums text-[#555]">${Number(a?.rpv || 0).toFixed(2)}</p>
                                <p className="text-xs tabular-nums text-[#1A1A1A] font-medium">${Number(b?.rpv || 0).toFixed(2)}</p>
                              </div>
                            </div>
                            {needsAttention && (
                              <div className="mt-3 flex items-center gap-1.5 text-[10px] font-medium text-red-500">
                                <span className="size-1.5 rounded-full bg-red-500" />
                                Needs attention — underperforming with {fmtVisitors(totalVisitors)} visitors
                              </div>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Results Summary ── */}
                {completedTests.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-[#1A1A1A] mb-4">Results</h3>
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="border border-emerald-200 rounded-xl p-5 bg-emerald-50/20">
                        <p className="text-3xl font-bold tabular-nums text-emerald-600">{winners.length}</p>
                        <p className="text-xs text-emerald-600/70 mt-1">Winners</p>
                      </div>
                      <div className="border border-red-200 rounded-xl p-5 bg-red-50/20">
                        <p className="text-3xl font-bold tabular-nums text-red-500">{losers.length}</p>
                        <p className="text-xs text-red-400 mt-1">Underperformed</p>
                      </div>
                      <div className="border border-[#E5E5EA] rounded-xl p-5">
                        <p className="text-3xl font-bold tabular-nums text-[#1A1A1A]">{completedTests.length - winners.length - losers.length}</p>
                        <p className="text-xs text-[#AAA] mt-1">Inconclusive</p>
                      </div>
                    </div>

                    {/* Winner cards */}
                    {winners.length > 0 && (
                      <div className="mb-6">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 mb-3">Winners</p>
                        <div className="space-y-2">
                          {winners.map((t) => {
                            const lift = getRpvLift(t)!;
                            const totalVisitors = (t.variations[0]?.visitors || 0) + (t.variations[1]?.visitors || 0);
                            return (
                              <Link key={t.id} href={`/tools/client-portal/${t.portalId}`} className="flex items-center justify-between border border-[#E5E5EA] rounded-lg px-4 py-3 bg-white hover:bg-[#FAFAFA] transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className="text-xs font-medium text-[#1A1A1A] truncate">{t.name}</span>
                                  <span className="text-[10px] text-[#BBB] shrink-0">{t.portalName}</span>
                                </div>
                                <div className="flex items-center gap-4 shrink-0">
                                  <span className="text-[11px] tabular-nums text-[#999]">{fmtVisitors(totalVisitors)}</span>
                                  <span className="text-sm font-bold tabular-nums text-emerald-600">+{lift.toFixed(1)}%</span>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Underperformed cards */}
                    {losers.length > 0 && (
                      <div className="mb-6">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-red-500 mb-3">Underperformed</p>
                        <div className="space-y-2">
                          {losers.map((t) => {
                            const lift = getRpvLift(t)!;
                            const totalVisitors = (t.variations[0]?.visitors || 0) + (t.variations[1]?.visitors || 0);
                            return (
                              <Link key={t.id} href={`/tools/client-portal/${t.portalId}`} className="flex items-center justify-between border border-[#E5E5EA] rounded-lg px-4 py-3 bg-white hover:bg-[#FAFAFA] transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className="text-xs font-medium text-[#1A1A1A] truncate">{t.name}</span>
                                  <span className="text-[10px] text-[#BBB] shrink-0">{t.portalName}</span>
                                </div>
                                <div className="flex items-center gap-4 shrink-0">
                                  <span className="text-[11px] tabular-nums text-[#999]">{fmtVisitors(totalVisitors)}</span>
                                  <span className="text-sm font-bold tabular-nums text-red-500">{lift.toFixed(1)}%</span>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </>
      )}

      {/* ═══════ TICKETS TAB ═══════ */}
      {!showTrash && activeTab === "tickets" && (
        <div className="space-y-4">
          {tickets.filter(t => !t.deleted_at).length === 0 ? (
            <div className="border border-dashed border-[#E5E5EA] rounded-xl p-12 text-center">
              <p className="text-sm text-[#7A7A7A]">No tickets yet</p>
              <p className="text-xs text-[#AAA] mt-1">Tickets appear when clients use /ticket in Slack</p>
            </div>
          ) : (
            <div className="border border-[#E5E5EA] rounded-xl bg-white overflow-hidden">
              <div className="grid grid-cols-[1fr_100px_80px_80px_60px] gap-2 px-4 py-2 bg-[#FAFAFA] border-b border-[#E5E5EA]">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA]">Title</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA]">Client</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA]">Type</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA]">Priority</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA]">Age</span>
              </div>
              {tickets.filter(t => !t.deleted_at).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((t) => {
                const age = Math.max(0, Math.floor((Date.now() - new Date(t.created_at).getTime()) / 3600000));
                const ageStr = age >= 24 ? `${Math.floor(age / 24)}d` : `${age}h`;
                return (
                  <Link key={t.id} href="/tools/tickets" className="grid grid-cols-[1fr_100px_80px_80px_60px] gap-2 px-4 py-2.5 border-b border-[#F0F0F0] last:border-0 hover:bg-[#FAFAFA] transition-colors items-center">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`size-1.5 rounded-full shrink-0 ${t.status === "resolved" ? "bg-emerald-400" : t.status === "in_progress" ? "bg-blue-400" : "bg-[#CCC]"}`} />
                      <span className="text-xs font-medium text-[#1A1A1A] truncate">{t.title}</span>
                    </div>
                    <span className="text-[10px] text-[#777] truncate">{t.client_name}</span>
                    <span className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded w-fit ${
                      t.ticket_type === "design" ? "bg-purple-50 text-purple-600" : t.ticket_type === "dev" ? "bg-blue-50 text-blue-600" : "bg-[#F3F3F5] text-[#AAA]"
                    }`}>{t.ticket_type || "—"}</span>
                    <span className={`text-[10px] font-medium ${t.priority === "urgent" ? "text-red-500" : t.priority === "high" ? "text-amber-600" : "text-[#999]"}`}>{t.priority}</span>
                    <span className="text-[10px] text-[#CCC]">{ageStr}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════ DELIVERY TAB ═══════ */}
      {!showTrash && activeTab === "delivery" && (
        <div className="space-y-6">
          {/* Blocked */}
          {blockedPortals.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-red-400 mb-3">Blocked ({blockedPortals.length})</h3>
              <div className="border border-red-100 rounded-xl bg-red-50/30 divide-y divide-red-100 overflow-hidden">
                {blockedPortals.map((p) => {
                  const daysBlocked = p.blocker?.since ? Math.max(0, Math.floor((Date.now() - new Date(p.blocker.since).getTime()) / 86400000)) : 0;
                  return (
                    <Link key={p.id} href={`/tools/client-portal/${p.id}`} className="flex items-center justify-between px-4 py-2.5 hover:bg-red-50 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-xs font-medium text-[#1A1A1A]">{p.client_name}</span>
                        <span className="text-[10px] text-red-500">{p.blocker?.reason}</span>
                      </div>
                      <span className="text-[10px] text-red-400">{daysBlocked}d blocked</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Phase Progress */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#AAA] mb-3">Phase Progress</h3>
            {portals.filter(p => p.current_phase).length > 0 ? (
              <div className="border border-[#E5E5EA] rounded-xl bg-white divide-y divide-[#F0F0F0] overflow-hidden">
                {portals.filter(p => p.current_phase).map((p) => {
                  const totalPhases = p.phases.length;
                  const completedPhases = p.phases.filter(ph => ph.status === "complete").length;
                  const pct = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;
                  return (
                    <Link key={p.id} href={`/tools/client-portal/${p.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-[#FAFAFA] transition-colors">
                      <span className="text-xs font-medium text-[#1A1A1A] w-32 shrink-0">{p.client_name}</span>
                      <div className="flex-1 h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
                        <div className="h-full bg-[#1A1A1A] rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-[#999] w-20 text-right shrink-0">{p.current_phase}</span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-[#CCC]">No active projects with phases</p>
            )}
          </div>

          {/* Clients by Stage */}
          {portals.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#AAA] mb-3">Clients by Stage</h3>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const stageMap: Record<string, number> = {};
                  portals.forEach((p) => { stageMap[p.current_phase || "Not set"] = (stageMap[p.current_phase || "Not set"] || 0) + 1; });
                  return Object.entries(stageMap).map(([stage, count]) => (
                    <div key={stage} className="border border-[#E5E5EA] rounded-lg px-4 py-3 bg-white">
                      <span className="text-lg font-bold tabular-nums text-[#1A1A1A]">{count}</span>
                      <p className="text-[10px] text-[#999] mt-0.5">{stage}</p>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════ RETAINERS TAB ═══════ */}
      {!showTrash && activeTab === "retainers" && (() => {
        const retainerPortals = portals.filter(p => p.client_type === "retainer" || p.project_type?.toLowerCase().includes("retainer"));
        const now = new Date();
        const currentMonth = now.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const dayOfMonth = now.getDate();
        const monthProgress = Math.round((dayOfMonth / daysInMonth) * 100);

        return (
          <div className="space-y-6">
            {/* Month Progress Bar */}
            <div className="border border-[#E5E5EA] rounded-xl bg-white p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-[#1A1A1A]">{currentMonth}</h3>
                  <p className="text-xs text-[#AAA] mt-0.5">Day {dayOfMonth} of {daysInMonth} · {monthProgress}% through the month</p>
                </div>
                <span className="text-xs font-semibold text-[#1A1A1A]">{retainerPortals.length} retainer{retainerPortals.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="h-2 bg-[#F0F0F0] rounded-full overflow-hidden">
                <div className="h-full bg-[#1A1A1A] rounded-full transition-all" style={{ width: `${monthProgress}%` }} />
              </div>
            </div>

            {/* Retainer Cards */}
            {retainerPortals.length > 0 ? (
              <div className="space-y-3">
                {retainerPortals.map((p) => {
                  const tier = p.testing_tier || "T1";
                  const testsPerWeek = tier === "T1" ? 1 : tier === "T2" ? 2 : 4;
                  const testsPerMonth = testsPerWeek * 4;

                  // Count tests by status (all active non-deleted)
                  const allTests = (p.results || []).filter((r: any) => !r.deleted_at);
                  const deliveredCount = allTests.filter(r => r.status === "live" || r.status === "complete").length;
                  const scheduledCount = allTests.filter(r => r.status === "scheduled").length;
                  const ideationCount = allTests.filter(r => r.status === "ideation").length;
                  const totalFilled = deliveredCount + scheduledCount + ideationCount;

                  // Health: based on delivered vs expected
                  const expectedByNow = Math.floor(testsPerMonth * (dayOfMonth / daysInMonth));
                  const health = deliveredCount >= expectedByNow ? "on-track" : deliveredCount >= expectedByNow - 1 ? "warning" : "behind";
                  const healthColors = { "on-track": "text-emerald-600 bg-emerald-50", "warning": "text-amber-600 bg-amber-50", "behind": "text-red-600 bg-red-50" };
                  const healthLabels = { "on-track": "On Track", "warning": "Slightly Behind", "behind": "Behind" };

                  // Open tickets
                  const clientTickets = tickets.filter(t => t.channel_id === p.slack_channel_url && t.status !== "resolved" && !t.deleted_at);

                  // Last touchpoint
                  const lastUpdate = p.updated_at ? new Date(p.updated_at) : null;
                  const daysSinceUpdate = lastUpdate ? Math.floor((Date.now() - lastUpdate.getTime()) / 86400000) : null;

                  return (
                    <Link
                      key={p.id}
                      href={`/tools/client-portal/${p.id}`}
                      className={`block border rounded-xl bg-white p-5 hover:shadow-sm transition-all ${
                        health === "behind" ? "border-red-200" : health === "warning" ? "border-amber-200" : "border-[#E5E5EA]"
                      }`}
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <h4 className="text-sm font-semibold text-[#1A1A1A]">{p.client_name}</h4>
                          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">{tier}</span>
                          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${healthColors[health]}`}>
                            {healthLabels[health]}
                          </span>
                        </div>
                        <span className="text-xs text-[#999]">{testsPerWeek}/week · {testsPerMonth}/month</span>
                      </div>

                      {/* Test Delivery Progress */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA]">Pipeline</span>
                          <span className="text-xs font-semibold text-[#1A1A1A]">{deliveredCount} / {testsPerMonth} delivered</span>
                        </div>
                        <div className="relative h-2 bg-[#F0F0F0] rounded-full overflow-hidden">
                          {totalFilled > 0 && <div className="absolute left-0 top-0 h-full bg-purple-300 rounded-full" style={{ width: `${(totalFilled / testsPerMonth) * 100}%` }} />}
                          {(deliveredCount + scheduledCount) > 0 && <div className="absolute left-0 top-0 h-full bg-blue-400 rounded-full" style={{ width: `${((deliveredCount + scheduledCount) / testsPerMonth) * 100}%` }} />}
                          {deliveredCount > 0 && <div className="absolute left-0 top-0 h-full bg-emerald-500 rounded-full" style={{ width: `${(deliveredCount / testsPerMonth) * 100}%` }} />}
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1 text-[9px] text-[#777]"><span className="size-1.5 rounded-full bg-emerald-500" /> {deliveredCount} delivered</span>
                            <span className="flex items-center gap-1 text-[9px] text-[#777]"><span className="size-1.5 rounded-full bg-blue-400" /> {scheduledCount} scheduled</span>
                            <span className="flex items-center gap-1 text-[9px] text-[#777]"><span className="size-1.5 rounded-full bg-purple-300" /> {ideationCount} ideation</span>
                          </div>
                          <span className="text-[9px] text-[#CCC]">{Math.max(0, testsPerMonth - totalFilled)} empty</span>
                        </div>
                      </div>

                      {/* Quick Stats Row */}
                      <div className="flex items-center gap-6 text-xs text-[#777]">
                        {(p.results || []).filter(r => r.status === "live").length > 0 && (
                          <span className="flex items-center gap-1.5">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            {(p.results || []).filter(r => r.status === "live").length} live
                          </span>
                        )}
                        {clientTickets.length > 0 && (
                          <span className="flex items-center gap-1.5 text-amber-600">
                            {clientTickets.length} open ticket{clientTickets.length !== 1 ? "s" : ""}
                          </span>
                        )}
                        {daysSinceUpdate !== null && (
                          <span className={daysSinceUpdate > 3 ? "text-red-500" : ""}>
                            Last updated {daysSinceUpdate === 0 ? "today" : daysSinceUpdate === 1 ? "yesterday" : `${daysSinceUpdate}d ago`}
                          </span>
                        )}
                        {p.blocker && (
                          <span className="text-red-500 font-medium">Blocked: {p.blocker.reason}</span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="border-2 border-dashed border-[#E5E5EA] rounded-xl p-8 text-center">
                <p className="text-sm text-[#AAA]">No retainer clients</p>
                <p className="text-xs text-[#CCC] mt-1">Create a retainer portal to track monthly test delivery</p>
              </div>
            )}
          </div>
        );
      })()}

      {/* ═══════ CLIENTS TAB ═══════ */}
      {!showTrash && activeTab === "clients" && (
        <>
          {/* Filters */}
          {portals.length > 0 && (
            <div className="flex items-center gap-3 mb-4">
              <FunnelIcon className="size-3.5 text-[#A0A0A0]" />
              <div className="flex items-center gap-1.5">
                {["all", "retainer", "project"].map((t) => (
                  <button key={t} onClick={() => setFilterType(t)} className={`px-3 py-1 text-[11px] font-medium rounded-full transition-colors ${filterType === t ? "bg-[#1B1B1B] text-white" : "bg-[#F3F3F5] text-[#7A7A7A] hover:bg-[#E5E5EA]"}`}>
                    {t === "all" ? "All" : t === "retainer" ? "Retainer" : "Project"}
                  </button>
                ))}
              </div>
              {uniqueStages.length > 0 && (
                <>
                  <div className="w-px h-4 bg-[#E5E5EA]" />
                  <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)} className="text-[11px] font-medium text-[#7A7A7A] bg-[#F3F3F5] border-none rounded-full px-3 py-1 cursor-pointer hover:bg-[#E5E5EA] transition-colors">
                    <option value="all">All Stages</option>
                    {uniqueStages.map((s) => (<option key={s} value={s}>{s}</option>))}
                  </select>
                </>
              )}
              {(filterType !== "all" || filterStage !== "all") && (
                <button onClick={() => { setFilterType("all"); setFilterStage("all"); }} className="text-[11px] text-[#A0A0A0] hover:text-[#1B1B1B] transition-colors">Clear</button>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Create Form ── */}
      {showForm && (
        <div className="bg-[#F7F8FA] border border-[#E5E5EA] rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold">New Client Portal</h3>
            <button onClick={() => { setShowForm(false); setClientType(null); }} className="text-[#A0A0A0] hover:text-[#1B1B1B]">
              <XMarkIcon className="size-4" />
            </button>
          </div>

          {/* Step 1: Choose client type */}
          {!clientType && (
            <div>
              <p className="text-xs text-[#7A7A7A] mb-4">What type of client is this?</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setClientType("retainer")}
                  className="border-2 border-[#E5E5EA] rounded-xl p-5 text-left hover:border-[#1B1B1B] transition-colors group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="size-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <BeakerIcon className="size-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#1A1A1A] group-hover:text-[#1A1A1A]">Retainer Client</p>
                      <p className="text-[10px] text-[#AAA]">Weekly A/B testing cycle</p>
                    </div>
                  </div>
                  <p className="text-xs text-[#777] leading-relaxed">
                    CRO retainer with weekly test cadence. Tier-based testing (1, 2, or 4 tests per week). Page builds available as add-ons.
                  </p>
                </button>
                <button
                  onClick={() => setClientType("regular")}
                  className="border-2 border-[#E5E5EA] rounded-xl p-5 text-left hover:border-[#1B1B1B] transition-colors group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="size-10 rounded-lg bg-blue-50 flex items-center justify-center">
                      <FunnelIcon className="size-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#1A1A1A] group-hover:text-[#1A1A1A]">Project Client</p>
                      <p className="text-[10px] text-[#AAA]">Page build or one-off project</p>
                    </div>
                  </div>
                  <p className="text-xs text-[#777] leading-relaxed">
                    Full page build, landing page, or CRO audit. Linear checkpoint flow. Can add more projects later.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Client details */}
          {clientType && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => setClientType(null)} className="text-[10px] text-[#AAA] hover:text-[#1A1A1A]">&larr; Back</button>
                <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  clientType === "retainer" ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                }`}>
                  {clientType === "retainer" ? "Retainer" : "Project"}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Client Name *</label>
                  <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="e.g., Nutribloom" className={inputClass} autoFocus />
                </div>
                <div>
                  <label className={labelClass}>Client Email</label>
                  <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="client@example.com" className={inputClass} />
                </div>
              </div>

              {/* Retainer-specific fields */}
              {clientType === "retainer" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Testing Tier</label>
                    <div className="flex gap-2">
                      {(["T1", "T2", "T3"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setTestingTier(t)}
                          className={`flex-1 py-2.5 text-xs font-semibold rounded-lg border transition-colors ${
                            testingTier === t ? "bg-[#1B1B1B] text-white border-[#1B1B1B]" : "bg-white text-[#777] border-[#E5E5EA] hover:border-[#999]"
                          }`}
                        >
                          {t}
                          <span className="block text-[9px] font-normal mt-0.5 opacity-60">
                            {t === "T1" ? "1/week" : t === "T2" ? "2/week" : "4/week"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Intelligems API Key (optional)</label>
                    <input type="text" value={igKey} onChange={(e) => setIgKey(e.target.value)} placeholder="ig_live_..." className={inputClass} />
                  </div>
                </div>
              )}

              {/* Regular-specific fields */}
              {clientType === "regular" && (
                <div>
                  <label className={labelClass}>Project Type</label>
                  <select value={projectType} onChange={(e) => setProjectType(e.target.value)} className={inputClass}>
                    <option value="Full Page Build">Full Page Build</option>
                    <option value="Landing Page">Landing Page</option>
                    <option value="CRO Audit">CRO Audit</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              )}

              <button
                onClick={handleCreate}
                disabled={!clientName.trim()}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-[#1B1B1B] text-white text-xs font-medium rounded-lg hover:bg-[#2D2D2D] transition-colors disabled:opacity-40"
              >
                <CheckIcon className="size-3.5" />
                Create Portal
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Loading ── */}
      {!showTrash && activeTab === "clients" && loading && (
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
      {!showTrash && activeTab === "clients" && !loading && portals.length === 0 && !showForm && (
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
      {!showTrash && activeTab === "clients" && !loading && portals.length > 0 && (
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
  const isRetainer = portal.client_type === "retainer" || portal.project_type?.toLowerCase().includes("retainer");
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

  // Touchpoint urgency
  const touchpointDaysAway = touchpoint?.date
    ? Math.ceil((new Date(touchpoint.date + "T00:00:00").getTime() - Date.now()) / 86400000)
    : null;
  const touchpointOverdue = touchpointDaysAway !== null && touchpointDaysAway < 0;

  return (
    <Link
      href={`/tools/client-portal/${portal.id}`}
      className={`block border rounded-xl bg-white hover:shadow-sm transition-all group ${
        blocker ? "border-red-200 bg-red-50/20" : "border-[#E5E5EA] hover:border-[#C5C5C5]"
      }`}
    >
      {/* Blocker strip */}
      {blocker && (
        <div className="flex items-center gap-2 px-5 py-2 bg-red-50 border-b border-red-100 rounded-t-xl">
          <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] font-semibold text-red-600 uppercase tracking-wider">
            Blocked {daysBlocked > 0 ? `${daysBlocked}d` : ""} — {blocker.reason}
          </span>
        </div>
      )}

      <div className="px-5 py-4">
        {/* Top row: name + type + actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <h3 className="text-sm font-semibold text-[#1A1A1A] truncate">{portal.client_name}</h3>
            <span className={`shrink-0 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider rounded-full ${
              isRetainer ? "bg-blue-50 text-blue-600" : "bg-[#F3F3F5] text-[#777]"
            }`}>
              {isRetainer ? "Retainer" : portal.project_type || "Project"}
            </span>
            {portal.current_phase && (
              <span className="text-[11px] text-[#999]">· {portal.current_phase}</span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-auto">
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCopyLink(portal.token); }}
              className="p-1.5 text-[#CCC] hover:text-[#1A1A1A] transition-colors opacity-0 group-hover:opacity-100"
            >
              {copiedToken === portal.token ? <CheckIcon className="size-3.5 text-emerald-500" /> : <ClipboardDocumentIcon className="size-3.5" />}
            </button>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(`/portal/${portal.token}`, '_blank'); }}
              className="p-1.5 text-[#CCC] hover:text-[#1A1A1A] transition-colors opacity-0 group-hover:opacity-100"
            >
              <ArrowTopRightOnSquareIcon className="size-3.5" />
            </button>
            {confirmDeleteId === portal.id ? (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(portal.id); }}
                onBlur={() => onCancelDelete()}
                className="px-2 py-1 text-[10px] font-medium text-white bg-red-500 rounded hover:bg-red-600"
              >
                Confirm
              </button>
            ) : (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(portal.id); }}
                className="p-1.5 text-[#CCC] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              >
                <TrashIcon className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Metrics row */}
        <div className="flex items-center gap-6 mt-3 pt-3 border-t border-[#F0F0F0]">
          {/* Touchpoint */}
          <div className="flex items-center gap-1.5">
            <span className={`size-1.5 rounded-full ${touchpointOverdue ? "bg-red-500" : touchpointDaysAway !== null && touchpointDaysAway <= 2 ? "bg-amber-500" : "bg-[#DDD]"}`} />
            <span className="text-[11px] text-[#777]">
              {touchpoint?.date
                ? `${touchpointOverdue ? "Overdue" : `${touchpointDaysAway}d`} · ${new Date(touchpoint.date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
                : "No touchpoint"
              }
            </span>
          </div>
          {/* Tests */}
          {runningTests > 0 && (
            <div className="flex items-center gap-1.5">
              <BeakerIcon className="size-3 text-emerald-500" />
              <span className="text-[11px] font-medium text-emerald-600">{runningTests} live</span>
            </div>
          )}
          {/* Requests */}
          {openRequests > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-amber-600">{openRequests} request{openRequests !== 1 ? "s" : ""}</span>
            </div>
          )}
          {/* Phase deadline */}
          {nextPhase?.deadline && (
            <span className="text-[11px] text-[#AAA]">
              Next: {nextPhase.name} · {new Date(nextPhase.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
