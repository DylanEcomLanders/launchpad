"use client";

import { useState, useEffect, useCallback } from "react";
import { getIssues, updateIssueStatus, deleteIssue } from "@/lib/issues/data";
import type { LaunchpadIssue, IssueType, IssueStatus } from "@/lib/issues/types";
import { selectClass } from "@/lib/form-styles";

const TYPE_LABELS: Record<IssueType, string> = {
  bug: "Bug",
  "change-request": "Change",
  idea: "Idea",
};

const STATUS_LABELS: Record<IssueStatus, string> = {
  open: "Open",
  noted: "Noted",
  "in-progress": "In Progress",
  done: "Done",
};

const TYPE_COLORS: Record<IssueType, string> = {
  bug: "bg-red-50 text-red-700",
  "change-request": "bg-amber-50 text-amber-700",
  idea: "bg-blue-50 text-blue-700",
};

export default function IssuesPage() {
  const [issues, setIssues] = useState<LaunchpadIssue[]>([]);
  const [filterType, setFilterType] = useState<IssueType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<IssueStatus | "all">("all");
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");

  const refresh = useCallback(async () => {
    setIssues(await getIssues());
  }, []);

  useEffect(() => {
    refresh();
    // Listen for storage changes from the report button
    const onStorage = () => { refresh(); };
    window.addEventListener("storage", onStorage);
    // Also poll every 2s for same-tab updates
    const interval = setInterval(() => { refresh(); }, 2000);
    return () => {
      window.removeEventListener("storage", onStorage);
      clearInterval(interval);
    };
  }, [refresh]);

  const activeIssues = issues.filter((i) => i.status !== "done");
  const completedIssues = issues.filter((i) => i.status === "done");
  const baseList = activeTab === "completed" ? completedIssues : activeIssues;
  const filtered = baseList.filter((i) => {
    if (filterType !== "all" && i.type !== filterType) return false;
    if (activeTab === "active" && filterStatus !== "all" && i.status !== filterStatus) return false;
    return true;
  });

  async function handleStatusChange(id: string, status: IssueStatus) {
    await updateIssueStatus(id, status);
    refresh();
  }

  async function handleDelete(id: string) {
    await deleteIssue(id);
    refresh();
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  return (
    <div className="max-w-3xl mx-auto px-6 md:px-12 py-12">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Issues</h1>
        <p className="text-xs text-[#A0A0A0] mt-0.5">
          Bugs, change requests &amp; ideas logged by the team
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 mb-4 border-b border-[#E5E5EA]">
        {(["active", "completed"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "text-[#1A1A1A] border-[#1A1A1A]"
                : "text-[#AAA] border-transparent hover:text-[#777]"
            }`}
          >
            {tab === "active" ? `Active (${activeIssues.length})` : `Completed (${completedIssues.length})`}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as IssueType | "all")}
          className={`${selectClass} !w-auto !py-1.5 !text-xs`}
        >
          <option value="all">All types</option>
          <option value="bug">Bugs</option>
          <option value="change-request">Changes</option>
          <option value="idea">Ideas</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as IssueStatus | "all")}
          className={`${selectClass} !w-auto !py-1.5 !text-xs`}
        >
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="noted">Noted</option>
          <option value="in-progress">In Progress</option>
          <option value="done">Done</option>
        </select>

        <span className="text-[11px] text-[#A0A0A0] ml-auto tabular-nums">
          {filtered.length} {filtered.length === 1 ? "issue" : "issues"}
        </span>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="border border-[#E5E5EA] shadow-[var(--shadow-soft)] rounded-lg p-12 text-center">
          <p className="text-sm text-[#A0A0A0]">
            {issues.length === 0
              ? "No issues yet. Use the floating button to report one."
              : "No issues match the current filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-0 border border-[#E5E5EA] shadow-[var(--shadow-soft)] rounded-lg divide-y divide-[#EDEDEF]">
          {filtered.map((issue) => (
            <div key={issue.id} className="px-4 py-3 flex items-start gap-3">
              {/* Type badge */}
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded mt-0.5 shrink-0 ${TYPE_COLORS[issue.type]}`}
              >
                {TYPE_LABELS[issue.type]}
              </span>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{issue.title}</p>
                {issue.description && (
                  <p className="text-xs text-[#7A7A7A] mt-0.5 line-clamp-2">
                    {issue.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] text-[#A0A0A0]">
                    {timeAgo(issue.created_at)}
                  </span>
                  {issue.page && (
                    <span className="text-[10px] text-[#A0A0A0] truncate max-w-[200px]">
                      {issue.page}
                    </span>
                  )}
                </div>
              </div>

              {/* Status + actions */}
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={issue.status}
                  onChange={(e) =>
                    handleStatusChange(issue.id, e.target.value as IssueStatus)
                  }
                  className="text-[11px] border border-[#E5E5EA] rounded px-1.5 py-1 bg-white focus:outline-none"
                >
                  {(Object.keys(STATUS_LABELS) as IssueStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => handleDelete(issue.id)}
                  className="text-[#C5C5C5] hover:text-red-500 transition-colors text-sm leading-none p-1"
                  title="Delete issue"
                >
                  &times;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
