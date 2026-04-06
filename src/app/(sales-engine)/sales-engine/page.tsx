"use client";

import { useState, useEffect } from "react";
import {
  ArrowTrendingUpIcon,
  PlusIcon,
  PaperAirplaneIcon,
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  BoltIcon,
} from "@heroicons/react/24/outline";
import { getLeads } from "@/lib/sales-engine/leads-data";
import { LEAD_STATUSES, type Lead, type LeadStatus } from "@/lib/sales-engine/types";
import { getPosts as getContentPosts, type ContentPost } from "@/lib/sales-engine/calendar-data";
import { getPortals } from "@/lib/portal/data";
import type { PortalData } from "@/lib/portal/types";
import Link from "next/link";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function SalesEngineDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [contentPosts, setContentPosts] = useState<ContentPost[]>([]);
  const [portals, setPortals] = useState<PortalData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getLeads(), getContentPosts(), getPortals()]).then(
      ([l, c, p]) => {
        setLeads(l);
        setContentPosts(c);
        setPortals(p.filter((p) => !p.deleted_at));
        setLoading(false);
      }
    );
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin size-6 border-2 border-[#E5E5EA] border-t-[#1A1A1A] rounded-full" />
      </div>
    );
  }

  // ── Derived data ──────────────────────────────────────────

  // Pipeline counts by status
  const pipelineCounts: Record<LeadStatus, number> = {
    new: 0, audit_sent: 0, engaged: 0, call_booked: 0, proposal_sent: 0, won: 0, lost: 0,
  };
  for (const lead of leads) pipelineCounts[lead.status]++;

  const activeLeads = leads.filter((l) => l.status !== "won" && l.status !== "lost");
  const wonLeads = leads.filter((l) => l.status === "won");

  // Follow-ups due
  const today = new Date().toLocaleDateString("en-CA");
  const overdue = leads.filter(
    (l) => l.follow_up_date && l.follow_up_date <= today && l.status !== "won" && l.status !== "lost"
  );

  // Content this week
  const now = new Date();
  const mondayDate = getMonday(now);
  const sundayDate = new Date(mondayDate);
  sundayDate.setDate(sundayDate.getDate() + 6);
  const mondayStr = mondayDate.toLocaleDateString("en-CA");
  const sundayStr = sundayDate.toLocaleDateString("en-CA");

  const thisWeekPosts = contentPosts.filter(
    (p) => p.scheduled_date >= mondayStr && p.scheduled_date <= sundayStr
  );
  const scheduledPosts = thisWeekPosts.filter((p) => p.status === "scheduled");
  const draftPosts = thisWeekPosts.filter((p) => p.status === "draft");

  // Active clients
  const retainers = portals.filter((p) => p.client_type === "retainer");
  const projects = portals.filter((p) => p.client_type !== "retainer");

  // Recent leads (last 5)
  const recentLeads = [...leads]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5);

  // Upcoming follow-ups (next 5)
  const upcomingFollowUps = leads
    .filter((l) => l.follow_up_date && l.follow_up_date >= today && l.status !== "won" && l.status !== "lost")
    .sort((a, b) => (a.follow_up_date || "").localeCompare(b.follow_up_date || ""))
    .slice(0, 5);

  return (
    <div className="max-w-5xl mx-auto py-10 px-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 animate-fadeInUp">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-[#7A7A7A] mt-0.5">
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/sales-engine/pipeline"
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-[#777] border border-[#E5E5EA] rounded-lg hover:bg-[#F5F5F5]"
          >
            <UserGroupIcon className="size-3.5" />
            Pipeline
          </Link>
          <Link
            href="/tools/proposals"
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium bg-[#1B1B1B] text-white rounded-lg hover:bg-[#2D2D2D]"
          >
            <PaperAirplaneIcon className="size-3.5" />
            Send Proposal
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        {/* ── Pipeline Overview ── */}
        <div className="animate-fadeInUp-d1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#AAA] mb-3">Pipeline</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {LEAD_STATUSES.filter((s) => s.key !== "lost").map((status) => (
              <Link
                key={status.key}
                href="/sales-engine/pipeline"
                className="border border-[#E5E5EA] rounded-xl p-4 hover:border-[#CCC] transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="size-2 rounded-full" style={{ backgroundColor: status.color }} />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA]">
                    {status.label}
                  </span>
                </div>
                <p className="text-2xl font-bold text-[#1A1A1A]">{pipelineCounts[status.key]}</p>
              </Link>
            ))}
            <div className="border border-[#E5E5EA] rounded-xl p-4 bg-[#FAFAFA]">
              <div className="flex items-center gap-2 mb-2">
                <BoltIcon className="size-3 text-[#AAA]" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA]">
                  Active Pipeline
                </span>
              </div>
              <p className="text-2xl font-bold text-[#1A1A1A]">{activeLeads.length}</p>
              <p className="text-[10px] text-[#999] mt-0.5">{wonLeads.length} won total</p>
            </div>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fadeInUp-d2">
          <div className="border border-[#E5E5EA] rounded-xl p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-1">Active Clients</p>
            <p className="text-2xl font-bold text-[#1A1A1A]">{portals.length}</p>
            <p className="text-[10px] text-[#999] mt-0.5">{retainers.length} retainers · {projects.length} projects</p>
          </div>
          <div className="border border-[#E5E5EA] rounded-xl p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-1">Content This Week</p>
            <p className="text-2xl font-bold text-[#1A1A1A]">{thisWeekPosts.length}</p>
            <p className="text-[10px] text-[#999] mt-0.5">
              {scheduledPosts.length} scheduled · {draftPosts.length} draft
            </p>
          </div>
          <div className="border border-[#E5E5EA] rounded-xl p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-1">Follow-ups Due</p>
            <p className={`text-2xl font-bold ${overdue.length > 0 ? "text-amber-600" : "text-[#1A1A1A]"}`}>
              {overdue.length}
            </p>
            <p className="text-[10px] text-[#999] mt-0.5">
              {overdue.length > 0 ? "needs attention" : "all clear"}
            </p>
          </div>
          <Link
            href="/sales-engine/calendar"
            className="border border-[#E5E5EA] rounded-xl p-4 hover:border-[#CCC] transition-colors"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-1">Next Post</p>
            {scheduledPosts.length > 0 ? (
              <>
                <p className="text-sm font-medium text-[#1A1A1A] line-clamp-1">
                  {scheduledPosts.sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))[0].caption.slice(0, 50)}...
                </p>
                <p className="text-[10px] text-[#999] mt-1">
                  {new Date(scheduledPosts[0].scheduled_date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                  {" · "}
                  {scheduledPosts[0].scheduled_time}
                </p>
              </>
            ) : (
              <p className="text-sm text-[#CCC] mt-1">Nothing scheduled</p>
            )}
          </Link>
        </div>

        {/* ── Two-column: Recent Leads + Follow-ups ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recent Leads */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#AAA]">Recent Leads</h2>
              <Link href="/sales-engine/leads" className="text-[10px] text-[#AAA] hover:text-[#1A1A1A] transition-colors">
                View all →
              </Link>
            </div>
            {recentLeads.length > 0 ? (
              <div className="border border-[#E5E5EA] rounded-xl overflow-hidden">
                {recentLeads.map((lead) => {
                  const statusInfo = LEAD_STATUSES.find((s) => s.key === lead.status);
                  return (
                    <Link
                      key={lead.id}
                      href="/sales-engine/leads"
                      className="flex items-center justify-between px-4 py-3 border-b border-[#EDEDEF] last:border-0 hover:bg-[#FAFAFA] transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[#1A1A1A] truncate">{lead.brand_name || "Unnamed"}</p>
                        <p className="text-[10px] text-[#999] mt-0.5">
                          {lead.contact_name && `${lead.contact_name} · `}{timeAgo(lead.created_at)}
                        </p>
                      </div>
                      <span
                        className="text-[9px] font-semibold uppercase px-2 py-0.5 rounded-full ml-3 shrink-0"
                        style={{
                          backgroundColor: statusInfo ? `${statusInfo.color}15` : "#F5F5F5",
                          color: statusInfo?.color || "#999",
                        }}
                      >
                        {statusInfo?.label || lead.status}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="border border-dashed border-[#E5E5EA] rounded-xl p-8 text-center">
                <p className="text-sm text-[#CCC]">No leads yet</p>
                <Link href="/sales-engine/leads" className="text-xs text-[#AAA] hover:text-[#1A1A1A] mt-1 inline-block">
                  Add your first lead →
                </Link>
              </div>
            )}
          </div>

          {/* Follow-ups */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#AAA]">Upcoming Follow-ups</h2>
            </div>
            {overdue.length > 0 && (
              <div className="border border-amber-200 bg-amber-50 rounded-xl p-3 mb-3">
                <p className="text-xs font-semibold text-amber-700">
                  {overdue.length} overdue follow-up{overdue.length > 1 ? "s" : ""}
                </p>
                <div className="mt-2 space-y-1.5">
                  {overdue.slice(0, 3).map((lead) => (
                    <div key={lead.id} className="flex items-center justify-between">
                      <span className="text-[11px] text-amber-800 font-medium">{lead.brand_name}</span>
                      <span className="text-[9px] text-amber-600">
                        due {new Date(lead.follow_up_date!).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {upcomingFollowUps.length > 0 ? (
              <div className="border border-[#E5E5EA] rounded-xl overflow-hidden">
                {upcomingFollowUps.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between px-4 py-3 border-b border-[#EDEDEF] last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#1A1A1A] truncate">{lead.brand_name}</p>
                      <p className="text-[10px] text-[#999]">
                        {LEAD_STATUSES.find((s) => s.key === lead.status)?.label}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 ml-3 shrink-0">
                      <CalendarDaysIcon className="size-3 text-[#AAA]" />
                      <span className="text-[10px] text-[#777]">
                        {new Date(lead.follow_up_date!).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-dashed border-[#E5E5EA] rounded-xl p-8 text-center">
                <p className="text-sm text-[#CCC]">No upcoming follow-ups</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Quick Actions ── */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#AAA] mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link
              href="/sales-engine/leads"
              className="flex items-center gap-2.5 px-4 py-3 border border-[#E5E5EA] rounded-xl hover:border-[#CCC] transition-colors"
            >
              <PlusIcon className="size-4 text-[#AAA]" />
              <span className="text-sm font-medium text-[#1A1A1A]">Add Lead</span>
            </Link>
            <Link
              href="/sales-engine/audits"
              className="flex items-center gap-2.5 px-4 py-3 border border-[#E5E5EA] rounded-xl hover:border-[#CCC] transition-colors"
            >
              <MagnifyingGlassIcon className="size-4 text-[#AAA]" />
              <span className="text-sm font-medium text-[#1A1A1A]">Run Audit</span>
            </Link>
            <Link
              href="/tools/proposals"
              className="flex items-center gap-2.5 px-4 py-3 border border-[#E5E5EA] rounded-xl hover:border-[#CCC] transition-colors"
            >
              <PaperAirplaneIcon className="size-4 text-[#AAA]" />
              <span className="text-sm font-medium text-[#1A1A1A]">Send Proposal</span>
            </Link>
            <Link
              href="/sales-engine/calendar"
              className="flex items-center gap-2.5 px-4 py-3 border border-[#E5E5EA] rounded-xl hover:border-[#CCC] transition-colors"
            >
              <CalendarDaysIcon className="size-4 text-[#AAA]" />
              <span className="text-sm font-medium text-[#1A1A1A]">Content Calendar</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}
