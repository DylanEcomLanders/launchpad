"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  PlusIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  LinkIcon,
  EyeIcon,
  ArrowPathIcon,
  TrashIcon,
  ArrowUturnLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/solid";
import { DecorativeBlocks } from "@/components/decorative-blocks";
import { supabase } from "@/lib/supabase";
import type { Proposal } from "@/lib/proposal-types";
import { inputClass, selectClass, labelClass } from "@/lib/form-styles";

type ViewMode = "active" | "trash";

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // View mode: active vs trash
  const [viewMode, setViewMode] = useState<ViewMode>("active");

  // Month filter
  const [filterMonth, setFilterMonth] = useState<string>("all");

  // Form state
  const [clientName, setClientName] = useState("");
  const [expiryDays, setExpiryDays] = useState(30);
  const [tier, setTier] = useState<1 | 2>(1);
  const [newLink, setNewLink] = useState<string | null>(null);

  // Fetch proposals
  const fetchProposals = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("proposals")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setProposals((data as Proposal[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  // Auto-purge: permanently delete proposals trashed > 30 days ago
  useEffect(() => {
    if (proposals.length === 0) return;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const expiredTrash = proposals.filter(
      (p) => p.trashed_at && new Date(p.trashed_at) < thirtyDaysAgo
    );

    if (expiredTrash.length > 0) {
      (async () => {
        for (const p of expiredTrash) {
          await supabase.from("proposals").delete().eq("id", p.id);
        }
        fetchProposals();
      })();
    }
  }, [proposals, fetchProposals]);

  // Available months from proposals
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    for (const p of proposals) {
      const d = new Date(p.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.add(key);
    }
    return Array.from(months).sort().reverse();
  }, [proposals]);

  // Filtered proposals
  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      // View mode filter
      const isTrashed = !!p.trashed_at;
      if (viewMode === "active" && isTrashed) return false;
      if (viewMode === "trash" && !isTrashed) return false;

      // Month filter
      if (filterMonth !== "all") {
        const d = new Date(p.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (key !== filterMonth) return false;
      }

      return true;
    });
  }, [proposals, viewMode, filterMonth]);

  // Trash counts
  const trashCount = useMemo(
    () => proposals.filter((p) => !!p.trashed_at).length,
    [proposals]
  );

  // Generate new proposal
  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!clientName.trim()) return;

    setGenerating(true);
    setError(null);
    setNewLink(null);

    try {
      const res = await fetch("/api/proposals/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: clientName.trim(),
          expiryDays,
          tier,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to create proposal");
      }

      const proposal: Proposal = await res.json();
      const link = `${window.location.origin}/proposal/${proposal.token}`;
      setNewLink(link);
      setClientName("");
      setExpiryDays(30);
      setTier(1);
      fetchProposals();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  }

  // Trash / restore
  async function trashProposal(id: string) {
    await supabase
      .from("proposals")
      .update({ trashed_at: new Date().toISOString() })
      .eq("id", id);
    fetchProposals();
  }

  async function restoreProposal(id: string) {
    await supabase
      .from("proposals")
      .update({ trashed_at: null })
      .eq("id", id);
    fetchProposals();
  }

  async function permanentlyDelete(id: string) {
    await supabase.from("proposals").delete().eq("id", id);
    fetchProposals();
  }

  // Copy link (with fallback for non-secure contexts like 127.0.0.1)
  async function copyLink(link: string, id: string) {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = link;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  // Format date
  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function fmtDateTime(iso: string) {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function fmtMonthLabel(key: string) {
    const [year, month] = key.split("-");
    const d = new Date(Number(year), Number(month) - 1);
    return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  }

  // Month navigation
  function shiftMonth(dir: -1 | 1) {
    if (filterMonth === "all") return;
    const idx = availableMonths.indexOf(filterMonth);
    const next = idx + dir * -1; // reversed because sorted desc
    if (next >= 0 && next < availableMonths.length) {
      setFilterMonth(availableMonths[next]);
    }
  }

  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-12 py-16 md:py-24">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
            Proposals
          </h1>
          <p className="text-[#6B6B6B] text-sm">
            Generate unique proposal links for clients &mdash; track views and
            conversions
          </p>
        </div>

        {/* Generate form */}
        {viewMode === "active" && (
          <div className="bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg p-5 mb-8">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] mb-4">
              Generate New Proposal
            </h2>
            <form onSubmit={handleGenerate} className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <label className={labelClass}>Client Name</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Gymshark"
                  className={inputClass}
                  required
                />
              </div>
              <div className="w-full md:w-32">
                <label className={labelClass}>Pricing Tier</label>
                <div className="inline-flex rounded-md border border-[#E5E5E5] bg-white p-0.5 w-full">
                  <button
                    type="button"
                    onClick={() => setTier(1)}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded transition-colors ${
                      tier === 1
                        ? "bg-[#0A0A0A] text-white"
                        : "text-[#6B6B6B] hover:text-[#0A0A0A]"
                    }`}
                  >
                    Tier 1
                  </button>
                  <button
                    type="button"
                    onClick={() => setTier(2)}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded transition-colors ${
                      tier === 2
                        ? "bg-[#0A0A0A] text-white"
                        : "text-[#6B6B6B] hover:text-[#0A0A0A]"
                    }`}
                  >
                    Tier 2
                  </button>
                </div>
              </div>
              <div className="w-full md:w-36">
                <label className={labelClass}>Expires In</label>
                <select
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(Number(e.target.value))}
                  className={selectClass}
                >
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={generating || !clientName.trim()}
                  className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0A0A0A] text-white text-sm font-medium rounded-md hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {generating ? (
                    <ArrowPathIcon className="size-4 animate-spin" />
                  ) : (
                    <PlusIcon className="size-4" />
                  )}
                  Generate
                </button>
              </div>
            </form>

            {/* Newly generated link */}
            {newLink && (
              <div className="mt-4 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-md px-4 py-3">
                <LinkIcon className="size-4 text-emerald-600 shrink-0" />
                <code className="flex-1 text-xs text-emerald-800 truncate">
                  {newLink}
                </code>
                <button
                  onClick={() => copyLink(newLink, "new")}
                  className="shrink-0 flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-900 transition-colors"
                >
                  {copiedId === "new" ? (
                    <>
                      <CheckIcon className="size-3.5" /> Copied
                    </>
                  ) : (
                    <>
                      <ClipboardDocumentIcon className="size-3.5" /> Copy
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Filters bar */}
        <div className="flex items-center justify-between mb-4 gap-3">
          {/* View mode toggle */}
          <div className="inline-flex rounded-md border border-[#E5E5E5] bg-white p-0.5">
            <button
              onClick={() => setViewMode("active")}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                viewMode === "active"
                  ? "bg-[#0A0A0A] text-white"
                  : "text-[#6B6B6B] hover:text-[#0A0A0A]"
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setViewMode("trash")}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1 ${
                viewMode === "trash"
                  ? "bg-[#0A0A0A] text-white"
                  : "text-[#6B6B6B] hover:text-[#0A0A0A]"
              }`}
            >
              <TrashIcon className="size-3" />
              Trash
              {trashCount > 0 && (
                <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${
                  viewMode === "trash" ? "bg-white/20" : "bg-[#F0F0F0]"
                }`}>
                  {trashCount}
                </span>
              )}
            </button>
          </div>

          {/* Month filter */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => shiftMonth(1)}
              disabled={filterMonth === "all" || availableMonths.indexOf(filterMonth) === availableMonths.length - 1}
              className="p-1 text-[#AAAAAA] hover:text-[#0A0A0A] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeftIcon className="size-3.5" />
            </button>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="px-2 py-1.5 text-xs border border-[#E5E5E5] rounded-md bg-white focus:outline-none focus:border-[#0A0A0A] transition-colors"
            >
              <option value="all">All months</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {fmtMonthLabel(m)}
                </option>
              ))}
            </select>
            <button
              onClick={() => shiftMonth(-1)}
              disabled={filterMonth === "all" || availableMonths.indexOf(filterMonth) === 0}
              className="p-1 text-[#AAAAAA] hover:text-[#0A0A0A] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRightIcon className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Trash info banner */}
        {viewMode === "trash" && (
          <div className="mb-4 px-4 py-3 bg-[#F5F5F5] border border-[#E5E5E5] rounded-md text-xs text-[#6B6B6B]">
            Trashed proposals are permanently deleted after 30 days.
          </div>
        )}

        {/* Proposals table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <ArrowPathIcon className="size-5 animate-spin text-[#AAAAAA]" />
          </div>
        ) : filteredProposals.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-[#AAAAAA]">
              {viewMode === "trash"
                ? "Trash is empty."
                : "No proposals yet. Generate your first one above."}
            </p>
          </div>
        ) : (
          <div className="bg-white border border-[#E5E5E5] rounded-lg overflow-hidden">
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F5F5F5] border-b border-[#E5E5E5]">
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA]">
                      Client
                    </th>
                    <th className="text-center px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA]">
                      Tier
                    </th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA]">
                      Created
                    </th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA]">
                      Expires
                    </th>
                    <th className="text-center px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA]">
                      Viewed
                    </th>
                    <th className="text-center px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA]">
                      Converted
                    </th>
                    <th className="text-right px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0F0]">
                  {filteredProposals.map((p) => {
                    const link = `${window.location.origin}/proposal/${p.token}`;
                    const isExpired = new Date(p.expires_at) < new Date();
                    const proposalTier = p.tier ?? 1;
                    const isTrashed = !!p.trashed_at;

                    return (
                      <tr key={p.id} className="hover:bg-[#FAFAFA]">
                        <td className="px-4 py-3 font-medium">
                          {p.client_name}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                            proposalTier === 2
                              ? "bg-amber-50 text-amber-700"
                              : "bg-blue-50 text-blue-700"
                          }`}>
                            T{proposalTier}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#6B6B6B]">
                          {fmtDate(p.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              isExpired ? "text-red-500" : "text-[#6B6B6B]"
                            }
                          >
                            {fmtDate(p.expires_at)}
                            {isExpired && " (expired)"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {p.viewed ? (
                            <span className="inline-flex items-center gap-1 text-xs">
                              <EyeIcon className="size-3.5 text-amber-500" />
                              <span className="text-[#6B6B6B]">
                                {p.viewed_at ? fmtDateTime(p.viewed_at) : "Yes"}
                              </span>
                            </span>
                          ) : (
                            <span className="text-[#CCCCCC] text-xs">No</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {p.converted ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-semibold uppercase tracking-wider">
                              <CheckIcon className="size-3" /> Converted
                            </span>
                          ) : (
                            <span className="text-[#CCCCCC] text-xs">No</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {isTrashed ? (
                              <>
                                <button
                                  onClick={() => restoreProposal(p.id)}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors px-2 py-1 rounded hover:bg-[#F0F0F0]"
                                  title="Restore"
                                >
                                  <ArrowUturnLeftIcon className="size-3.5" />
                                  Restore
                                </button>
                                <button
                                  onClick={() => permanentlyDelete(p.id)}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-red-400 hover:text-red-600 transition-colors px-2 py-1 rounded hover:bg-red-50"
                                  title="Delete forever"
                                >
                                  <TrashIcon className="size-3.5" />
                                  Delete
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => copyLink(link, p.id)}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors px-2 py-1 rounded hover:bg-[#F0F0F0]"
                                >
                                  {copiedId === p.id ? (
                                    <>
                                      <CheckIcon className="size-3.5 text-emerald-500" />
                                      Copied
                                    </>
                                  ) : (
                                    <>
                                      <ClipboardDocumentIcon className="size-3.5" />
                                      Copy
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => trashProposal(p.id)}
                                  className="inline-flex items-center text-xs text-[#CCCCCC] hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50"
                                  title="Move to trash"
                                >
                                  <TrashIcon className="size-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-[#F0F0F0]">
              {filteredProposals.map((p) => {
                const link = `${window.location.origin}/proposal/${p.token}`;
                const isExpired = new Date(p.expires_at) < new Date();
                const proposalTier = p.tier ?? 1;
                const isTrashed = !!p.trashed_at;

                return (
                  <div key={p.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {p.client_name}
                        </span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider ${
                          proposalTier === 2
                            ? "bg-amber-50 text-amber-700"
                            : "bg-blue-50 text-blue-700"
                        }`}>
                          T{proposalTier}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {p.converted && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-semibold uppercase tracking-wider">
                            <CheckIcon className="size-3" /> Converted
                          </span>
                        )}
                        {isTrashed ? (
                          <button
                            onClick={() => restoreProposal(p.id)}
                            className="p-1.5 text-[#6B6B6B] hover:text-[#0A0A0A]"
                            title="Restore"
                          >
                            <ArrowUturnLeftIcon className="size-4" />
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => copyLink(link, p.id)}
                              className="p-1.5 text-[#6B6B6B] hover:text-[#0A0A0A]"
                            >
                              {copiedId === p.id ? (
                                <CheckIcon className="size-4 text-emerald-500" />
                              ) : (
                                <ClipboardDocumentIcon className="size-4" />
                              )}
                            </button>
                            <button
                              onClick={() => trashProposal(p.id)}
                              className="p-1.5 text-[#CCCCCC] hover:text-red-500"
                              title="Move to trash"
                            >
                              <TrashIcon className="size-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[#AAAAAA]">
                      <span>Created {fmtDate(p.created_at)}</span>
                      <span className={isExpired ? "text-red-500" : ""}>
                        Expires {fmtDate(p.expires_at)}
                        {isExpired && " (expired)"}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      {p.viewed ? (
                        <span className="inline-flex items-center gap-1 text-[#6B6B6B]">
                          <EyeIcon className="size-3 text-amber-500" />
                          Viewed{" "}
                          {p.viewed_at ? fmtDateTime(p.viewed_at) : ""}
                        </span>
                      ) : (
                        <span className="text-[#CCCCCC]">Not viewed</span>
                      )}
                    </div>
                    {isTrashed && p.trashed_at && (
                      <div className="text-[10px] text-[#AAAAAA]">
                        Trashed {fmtDate(p.trashed_at)} &middot; auto-deletes in{" "}
                        {Math.max(0, 30 - Math.floor((Date.now() - new Date(p.trashed_at).getTime()) / 86400000))} days
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
