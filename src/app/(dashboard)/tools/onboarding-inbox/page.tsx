"use client";

import { useState, useEffect, useCallback } from "react";
import { onboardingStore, type OnboardingSubmission } from "@/lib/onboarding";
import { getPortals } from "@/lib/portal/data";
import type { PortalData } from "@/lib/portal/types";
import Link from "next/link";
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowTopRightOnSquareIcon,
  ChevronRightIcon,
  XMarkIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "#F59E0B", bg: "#FEF3C7" },
  "in-progress": { label: "In Progress", color: "#3B82F6", bg: "#DBEAFE" },
  approved: { label: "Approved", color: "#10B981", bg: "#D1FAE5" },
  rejected: { label: "Rejected", color: "#EF4444", bg: "#FEE2E2" },
};

export default function OnboardingInboxPage() {
  const [submissions, setSubmissions] = useState<OnboardingSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<OnboardingSubmission | null>(null);
  const [saving, setSaving] = useState(false);
  const [portals, setPortals] = useState<PortalData[]>([]);
  const [selectedPortalId, setSelectedPortalId] = useState("");
  const [showAccessInfo, setShowAccessInfo] = useState(false);

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
    await onboardingStore.update(id, { ...patch, updated_at: new Date().toISOString() });
    await load();
    if (selected?.id === id) {
      setSelected((prev) => prev ? { ...prev, ...patch } : prev);
    }
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

  const pendingCount = submissions.filter((s) => s.status === "pending" || s.status === "in-progress").length;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* List */}
      <div className="w-80 shrink-0 border-r border-[#E8E8E8] flex flex-col">
        <div className="px-5 py-4 border-b border-[#E8E8E8]">
          <h1 className="text-sm font-bold text-[#1A1A1A]">Onboarding Inbox</h1>
          <p className="text-[10px] text-[#AAA] mt-0.5">{pendingCount} awaiting action</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="size-5 border-2 border-[#E8E8E8] border-t-[#1B1B1B] rounded-full animate-spin" />
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-10 px-4">
              <p className="text-sm text-[#999]">No submissions yet</p>
              <p className="text-xs text-[#CCC] mt-1">Share the onboarding form with new clients</p>
              <Link href="/onboard" target="_blank" className="inline-flex items-center gap-1.5 mt-3 text-xs text-blue-600 hover:underline">
                View form <ArrowTopRightOnSquareIcon className="size-3" />
              </Link>
            </div>
          ) : (
            submissions.map((sub) => {
              const config = statusConfig[sub.status];
              const checklist = sub.pm_checklist;
              const checkCount = checklist ? Object.values(checklist).filter(Boolean).length : 0;
              const isSelected = selected?.id === sub.id;

              return (
                <button
                  key={sub.id}
                  onClick={() => setSelected(sub)}
                  className={`w-full text-left px-5 py-3.5 border-b border-[#F0F0F0] transition-colors ${
                    isSelected ? "bg-[#F5F5F5]" : "hover:bg-[#FAFAFA]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#1A1A1A] truncate">{sub.company_name}</p>
                      <p className="text-[11px] text-[#999] truncate mt-0.5">{sub.website_url}</p>
                    </div>
                    <span
                      className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
                      style={{ color: config.color, backgroundColor: config.bg }}
                    >
                      {config.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] text-[#BBB]">
                      {new Date(sub.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </span>
                    <span className="text-[10px] text-[#BBB]">{checkCount}/5 checks</span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Form link */}
        <div className="px-5 py-3 border-t border-[#E8E8E8]">
          <Link
            href="/onboard"
            target="_blank"
            className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-medium text-[#777] border border-[#E8E8E8] rounded-lg hover:bg-[#FAFAFA] transition-colors"
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
              <p className="text-sm text-[#AAA]">Select a submission to review</p>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-8 py-8">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-[#1A1A1A]">{selected.company_name}</h2>
                <a href={selected.website_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                  {selected.website_url}
                </a>
                <p className="text-[10px] text-[#BBB] mt-1">
                  Submitted {new Date(selected.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1 text-[#CCC] hover:text-[#1A1A1A]">
                <XMarkIcon className="size-5" />
              </button>
            </div>

            {/* PM Checklist */}
            <div className="mb-8 p-5 bg-[#FAFAFA] border border-[#E8E8E8] rounded-xl">
              <p className="text-xs font-semibold text-[#1A1A1A] mb-3">PM Checklist</p>
              <div className="space-y-2">
                {checklistItems.map((item) => {
                  const checked = selected.pm_checklist?.[item.key] || false;
                  return (
                    <div key={item.key} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      checked ? "border-emerald-200 bg-emerald-50/50" : "border-[#E8E8E8] bg-white hover:border-[#CCC]"
                    }`}>
                      <label className="flex items-center gap-3 flex-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleChecklist(selected.id, item.key)}
                          className="size-4 rounded border-[#CCC] text-emerald-600 focus:ring-0"
                        />
                        <span className={`text-sm ${checked ? "text-emerald-700" : "text-[#555]"}`}>{item.label}</span>
                      </label>
                      {item.hasInfo && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowAccessInfo(!showAccessInfo); }}
                          className="p-1 text-[#CCC] hover:text-[#1A1A1A] transition-colors shrink-0"
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
                  className="w-full text-xs px-3 py-2.5 border border-[#E8E8E8] rounded-lg focus:outline-none focus:border-[#999] placeholder:text-[#CCC] min-h-[60px] resize-y"
                />
              </div>

              {/* Portal assignment + approve */}
              {selected.status !== "approved" && (
                <div className="mt-4 space-y-3">
                  {/* Portal selector */}
                  <div>
                    <label className="text-[11px] font-medium text-[#555] block mb-1.5">Assign to Portal</label>
                    <select
                      value={selectedPortalId || selected.assigned_portal_id || ""}
                      onChange={(e) => setSelectedPortalId(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-[#E8E8E8] rounded-lg text-sm focus:outline-none focus:border-[#1B1B1B] appearance-none"
                    >
                      <option value="">Select a portal...</option>
                      <option value="__new__">+ Create new portal</option>
                      {portals.map((p) => (
                        <option key={p.id} value={p.id}>{p.client_name}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => {
                      const portalId = selectedPortalId || selected.assigned_portal_id;
                      updateSubmission(selected.id, {
                        status: "approved",
                        assigned_portal_id: portalId || undefined,
                        assigned_at: new Date().toISOString(),
                        assigned_by: "pm",
                      });
                    }}
                    disabled={saving || !Object.values(selected.pm_checklist || {}).every(Boolean) || !(selectedPortalId || selected.assigned_portal_id)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <CheckCircleIcon className="size-4" />
                    Approve & Assign to Portal
                  </button>

                  {!Object.values(selected.pm_checklist || {}).every(Boolean) && (
                    <p className="text-[10px] text-[#AAA] text-center">Complete all checklist items to approve</p>
                  )}
                  {Object.values(selected.pm_checklist || {}).every(Boolean) && !(selectedPortalId || selected.assigned_portal_id) && (
                    <p className="text-[10px] text-[#AAA] text-center">Select a portal to assign to</p>
                  )}
                </div>
              )}
              {selected.status === "approved" && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 text-emerald-600 mb-1">
                    <CheckCircleIcon className="size-5" />
                    <span className="text-sm font-medium">Approved {selected.assigned_at ? new Date(selected.assigned_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""}</span>
                  </div>
                  {selected.assigned_portal_id && (
                    <Link
                      href={`/tools/client-portal/${selected.assigned_portal_id}`}
                      className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
                    >
                      View Portal <ArrowTopRightOnSquareIcon className="size-3" />
                    </Link>
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
                      <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 bg-white border border-[#E8E8E8] rounded-lg text-xs text-[#555] hover:border-[#1B1B1B] transition-colors">
                        <span className="truncate flex-1">{f.originalName}</span>
                        <ArrowTopRightOnSquareIcon className="size-3.5 text-[#999] shrink-0" />
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
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#BBB] mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function DetailField({ label, value, link }: { label: string; value: string; link?: boolean }) {
  if (!value) return null;
  return (
    <div>
      {label && <p className="text-[11px] font-medium text-[#999] mb-0.5">{label}</p>}
      {link ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all">{value}</a>
      ) : (
        <p className="text-sm text-[#444] whitespace-pre-wrap">{value}</p>
      )}
    </div>
  );
}
