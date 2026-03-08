"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import {
  CalculatorIcon,
  ReceiptPercentIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  WalletIcon,
  RocketLaunchIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowPathIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { DecorativeBlocks } from "@/components/decorative-blocks";
import { inputClass, selectClass, labelClass } from "@/lib/form-styles";
import {
  type ActiveProject,
  type ActiveProjectInsert,
  type ProjectHealth,
  type PulseFeedItem,
  type PulseFeedResponse,
  type FeedItemType,
} from "@/lib/pulse/types";
import {
  getProjects,
  addProject,
  updateProject,
  deleteProject,
} from "@/lib/pulse/projects";

// ── Quick Actions Config ────────────────────────────────────────

const quickActions = [
  { label: "Project Setup", href: "/tools/project-kickoff", icon: RocketLaunchIcon },
  { label: "Price Calc", href: "/tools/price-calculator", icon: CalculatorIcon },
  { label: "QA Checklist", href: "/tools/qa-checklist", icon: ClipboardDocumentCheckIcon },
  { label: "Invoices", href: "/tools/invoice-generator", icon: ReceiptPercentIcon },
  { label: "Dev Hours", href: "/tools/dev-hours", icon: ClockIcon },
  { label: "Expenses", href: "/tools/expenses", icon: WalletIcon },
];

// ── Health Config ───────────────────────────────────────────────

const healthConfig: Record<ProjectHealth, { dot: string; label: string }> = {
  green: { dot: "bg-emerald-500", label: "On Track" },
  amber: { dot: "bg-amber-500", label: "At Risk" },
  red: { dot: "bg-red-500", label: "Blocked" },
};

const healthOptions: ProjectHealth[] = ["green", "amber", "red"];

// ── Feed Type Config ────────────────────────────────────────────

const feedTypeConfig: Record<FeedItemType, { border: string; badge: string; label: string }> = {
  client: { border: "border-l-blue-500", badge: "bg-blue-50 text-blue-600", label: "Client" },
  internal: { border: "border-l-[#0A0A0A]", badge: "bg-gray-100 text-gray-600", label: "Internal" },
  status: { border: "border-l-emerald-500", badge: "bg-emerald-50 text-emerald-600", label: "Status" },
  chase: { border: "border-l-amber-500", badge: "bg-amber-50 text-amber-600", label: "Chase" },
  blocker: { border: "border-l-red-500", badge: "bg-red-50 text-red-600", label: "Blocker" },
  request: { border: "border-l-violet-500", badge: "bg-violet-50 text-violet-600", label: "Request" },
};

// ── Empty Form ──────────────────────────────────────────────────

const emptyForm: ActiveProjectInsert = {
  project_name: "",
  client_name: "",
  health: "green",
  team_lead: "",
  next_milestone: "",
  deadline: "",
};

// ── Page Component ──────────────────────────────────────────────

export default function PulseDashboard() {
  // Projects state
  const [projects, setProjects] = useState<ActiveProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ActiveProjectInsert>({ ...emptyForm });

  // Feed state
  const [feedItems, setFeedItems] = useState<PulseFeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [feedHours, setFeedHours] = useState(48);
  const [hasMore, setHasMore] = useState(false);
  const [feedTotal, setFeedTotal] = useState(0);

  // Load projects
  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const data = await getProjects();
      setProjects(data);
    } catch {
      // Silent fail — will show empty state
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  // Load feed
  const loadFeed = useCallback(async (hours?: number) => {
    setFeedLoading(true);
    setFeedError(null);
    try {
      const h = hours ?? feedHours;
      const res = await fetch(`/api/pulse-feed?hours=${h}&limit=50`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to load feed");
      }
      const data: PulseFeedResponse = await res.json();
      setFeedItems(data.items);
      setHasMore(data.has_more);
      setFeedTotal(data.total);
    } catch (err) {
      setFeedError(err instanceof Error ? err.message : "Failed to load feed");
    } finally {
      setFeedLoading(false);
    }
  }, [feedHours]);

  useEffect(() => {
    loadProjects();
    loadFeed();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Project CRUD
  const handleSubmitProject = async () => {
    if (!form.project_name.trim() || !form.client_name.trim()) return;
    if (editingId) {
      await updateProject(editingId, form);
    } else {
      await addProject(form);
    }
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(false);
    loadProjects();
  };

  const handleEditProject = (p: ActiveProject) => {
    setForm({
      project_name: p.project_name,
      client_name: p.client_name,
      health: p.health,
      team_lead: p.team_lead,
      next_milestone: p.next_milestone,
      deadline: p.deadline,
    });
    setEditingId(p.id);
    setShowForm(true);
  };

  const handleDeleteProject = async (id: string) => {
    await deleteProject(id);
    loadProjects();
  };

  const handleCancelForm = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(false);
  };

  const handleHoursChange = (h: number) => {
    setFeedHours(h);
    loadFeed(h);
  };

  // Date formatting
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-12 py-12 md:py-20">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">
              Pulse
            </h1>
            <p className="text-sm text-[#6B6B6B]">
              Mission control for the Ecomlanders team
            </p>
          </div>
          <span className="text-xs text-[#AAAAAA] mt-2 hidden md:block">
            {dateStr}
          </span>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 mb-10">
          {quickActions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E5E5E5] rounded-md text-xs font-medium text-[#6B6B6B] hover:border-[#0A0A0A] hover:text-[#0A0A0A] transition-colors"
            >
              <a.icon className="size-3.5" />
              {a.label}
            </Link>
          ))}
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* ── Active Projects (2 cols) ── */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">
                  Active Projects
                </h2>
                {projects.length > 0 && (
                  <span className="text-[10px] font-bold bg-[#F0F0F0] text-[#6B6B6B] px-1.5 py-0.5 rounded">
                    {projects.length}
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  handleCancelForm();
                  setShowForm(true);
                }}
                className="flex items-center gap-1 text-xs font-medium text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors"
              >
                <PlusIcon className="size-3.5" />
                Add
              </button>
            </div>

            {/* Add/Edit Form */}
            {showForm && (
              <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold">
                    {editingId ? "Edit Project" : "Add Project"}
                  </h3>
                  <button onClick={handleCancelForm} className="text-[#AAAAAA] hover:text-[#0A0A0A]">
                    <XMarkIcon className="size-3.5" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className={labelClass}>Project Name *</label>
                    <input
                      type="text"
                      value={form.project_name}
                      onChange={(e) => setForm((f) => ({ ...f, project_name: e.target.value }))}
                      placeholder="e.g., Nutribloom PDP Rebuild"
                      className={inputClass}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Client *</label>
                      <input
                        type="text"
                        value={form.client_name}
                        onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))}
                        placeholder="e.g., Nutribloom"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Team Lead</label>
                      <input
                        type="text"
                        value={form.team_lead}
                        onChange={(e) => setForm((f) => ({ ...f, team_lead: e.target.value }))}
                        placeholder="e.g., Dylan"
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Health</label>
                      <select
                        value={form.health}
                        onChange={(e) => setForm((f) => ({ ...f, health: e.target.value as ProjectHealth }))}
                        className={selectClass}
                      >
                        {healthOptions.map((h) => (
                          <option key={h} value={h}>{healthConfig[h].label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Deadline</label>
                      <input
                        type="date"
                        value={form.deadline}
                        onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Next Milestone</label>
                    <input
                      type="text"
                      value={form.next_milestone}
                      onChange={(e) => setForm((f) => ({ ...f, next_milestone: e.target.value }))}
                      placeholder="e.g., QA review complete"
                      className={inputClass}
                    />
                  </div>
                  <button
                    onClick={handleSubmitProject}
                    disabled={!form.project_name.trim() || !form.client_name.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#0A0A0A] text-white text-xs font-medium rounded-md hover:bg-[#2A2A2A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <CheckIcon className="size-3.5" />
                    {editingId ? "Save" : "Add Project"}
                  </button>
                </div>
              </div>
            )}

            {/* Project Cards */}
            <div className="space-y-3">
              {projectsLoading && (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white border border-[#E5E5E5] rounded-lg p-4 animate-pulse">
                      <div className="h-4 bg-[#F0F0F0] rounded w-3/4 mb-2" />
                      <div className="h-3 bg-[#F0F0F0] rounded w-1/2" />
                    </div>
                  ))}
                </div>
              )}

              {!projectsLoading && projects.length === 0 && !showForm && (
                <div className="bg-white border border-dashed border-[#E5E5E5] rounded-lg p-6 text-center">
                  <p className="text-xs text-[#AAAAAA] mb-2">No active projects</p>
                  <button
                    onClick={() => setShowForm(true)}
                    className="text-xs font-medium text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors"
                  >
                    + Add your first project
                  </button>
                </div>
              )}

              {!projectsLoading &&
                projects.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white border border-[#E5E5E5] rounded-lg p-4 group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`size-2 rounded-full shrink-0 ${healthConfig[p.health].dot}`} />
                          <h3 className="text-sm font-semibold text-[#0A0A0A] truncate">
                            {p.project_name}
                          </h3>
                        </div>
                        <p className="text-xs text-[#6B6B6B] pl-4">
                          {p.client_name}
                          {p.team_lead && ` · ${p.team_lead}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={() => handleEditProject(p)}
                          className="p-1 text-[#AAAAAA] hover:text-[#0A0A0A] transition-colors"
                        >
                          <PencilSquareIcon className="size-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProject(p.id)}
                          className="p-1 text-[#AAAAAA] hover:text-red-400 transition-colors"
                        >
                          <TrashIcon className="size-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pl-4">
                      {p.next_milestone && (
                        <p className="text-[11px] text-[#AAAAAA] truncate">
                          Next: {p.next_milestone}
                        </p>
                      )}
                      {p.deadline && (
                        <span className="text-[11px] text-[#AAAAAA] tabular-nums shrink-0 ml-2">
                          {formatDate(p.deadline)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>

            {/* Footer */}
            <p className="text-[10px] text-[#CCCCCC] mt-4">
              Managed manually — ClickUp sync coming soon
            </p>
          </div>

          {/* ── Pulse Feed (3 cols) ── */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">
                  Pulse Feed
                </h2>
                {feedTotal > 0 && (
                  <span className="text-[10px] font-bold bg-[#F0F0F0] text-[#6B6B6B] px-1.5 py-0.5 rounded">
                    {feedTotal}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={feedHours}
                  onChange={(e) => handleHoursChange(Number(e.target.value))}
                  className="px-2 py-1 text-[11px] border border-[#E5E5E5] rounded-md bg-white text-[#6B6B6B]"
                >
                  <option value={24}>24h</option>
                  <option value={48}>48h</option>
                  <option value={168}>7d</option>
                </select>
                <button
                  onClick={() => loadFeed()}
                  disabled={feedLoading}
                  className="p-1.5 text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors disabled:opacity-40"
                  title="Refresh feed"
                >
                  <ArrowPathIcon className={`size-3.5 ${feedLoading ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {/* Feed Items */}
            <div className="space-y-2">
              {feedLoading && feedItems.length === 0 && (
                <>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="bg-white border border-[#E5E5E5] border-l-2 border-l-[#E5E5E5] rounded-lg p-4 animate-pulse">
                      <div className="h-3 bg-[#F0F0F0] rounded w-1/3 mb-2" />
                      <div className="h-4 bg-[#F0F0F0] rounded w-full mb-2" />
                      <div className="h-3 bg-[#F0F0F0] rounded w-1/4" />
                    </div>
                  ))}
                </>
              )}

              {feedError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-4">
                  <ExclamationTriangleIcon className="size-4 text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-red-800 font-medium">Failed to load feed</p>
                    <p className="text-[11px] text-red-600 mt-0.5">{feedError}</p>
                    <button
                      onClick={() => loadFeed()}
                      className="text-[11px] font-medium text-red-600 hover:text-red-800 mt-1 underline"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              )}

              {!feedLoading && !feedError && feedItems.length === 0 && (
                <div className="bg-white border border-dashed border-[#E5E5E5] rounded-lg p-8 text-center">
                  <p className="text-xs text-[#AAAAAA] mb-1">No activity in the last {feedHours}h</p>
                  <p className="text-[10px] text-[#CCCCCC]">
                    Messages from channels containing &quot;external&quot; or &quot;internal&quot; will appear here
                  </p>
                </div>
              )}

              {feedItems.map((item) => {
                const cfg = feedTypeConfig[item.channel_type];
                return (
                  <div
                    key={item.id}
                    className={`bg-white border border-[#E5E5E5] border-l-2 ${cfg.border} rounded-lg p-4`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-[#6B6B6B]">
                          #{item.channel_name}
                        </span>
                        <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#AAAAAA] tabular-nums">
                        {relativeTime(item.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-[#3A3A3A] leading-relaxed mb-1.5">
                      {item.message}
                    </p>
                    <span className="text-[11px] text-[#AAAAAA]">
                      {item.author}
                    </span>
                  </div>
                );
              })}

              {hasMore && !feedLoading && (
                <button
                  onClick={() => {
                    // For now, increase the limit by adjusting hours
                    handleHoursChange(Math.min(feedHours * 2, 168));
                  }}
                  className="w-full py-2 text-xs font-medium text-[#6B6B6B] hover:text-[#0A0A0A] bg-white border border-[#E5E5E5] rounded-lg hover:bg-[#F5F5F5] transition-colors"
                >
                  Load more
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
