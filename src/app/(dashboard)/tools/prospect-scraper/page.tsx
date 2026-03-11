"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  UserGroupIcon,
  BookmarkIcon,
  FunnelIcon,
  TrashIcon,
  ChatBubbleLeftIcon,
} from "@heroicons/react/24/solid";
import { ArrowPathIcon, PaperAirplaneIcon, BookmarkIcon as BookmarkOutline } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { DecorativeBlocks } from "@/components/decorative-blocks";
import { textareaClass, inputClass, selectClass } from "@/lib/form-styles";
import type { Prospect, SocialLink } from "@/lib/types";
import type { SavedProspect, OutreachStatus } from "@/lib/prospects/types";
import {
  getSavedProspects,
  saveProspect,
  unsaveProspectByUrl,
  updateSavedProspect,
  deleteSavedProspect,
} from "@/lib/prospects/data";

type MaxResults = 10 | 20 | 30;
type Tab = "search" | "saved";

// ── Constants ───────────────────────────────────────────────────

const maxResultsOptions: MaxResults[] = [10, 20, 30];

// ── Social icons ────────────────────────────────────────────────

const SOCIAL_ICONS: Record<string, string> = {
  Instagram: "IG",
  LinkedIn: "LI",
  Twitter: "X",
  Facebook: "FB",
  TikTok: "TT",
};

const OUTREACH_STATUS_LABELS: Record<OutreachStatus, { label: string; bg: string; text: string }> = {
  not_contacted: { label: "Not Contacted", bg: "bg-[#F5F5F5]", text: "text-[#999999]" },
  contacted: { label: "Contacted", bg: "bg-blue-50", text: "text-blue-600" },
  replied: { label: "Replied", bg: "bg-emerald-50", text: "text-emerald-600" },
};

// ── Component ───────────────────────────────────────────────────

export default function ProspectScraperPage() {
  const [tab, setTab] = useState<Tab>("search");
  const [prompt, setPrompt] = useState("");
  const [maxResults, setMaxResults] = useState<MaxResults>(10);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [missingKeys, setMissingKeys] = useState(false);
  const [copiedEmails, setCopiedEmails] = useState(false);
  const [totalFound, setTotalFound] = useState(0);
  const [enrichingUrl, setEnrichingUrl] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const router = useRouter();

  // Saved tab state
  const [savedProspects, setSavedProspects] = useState<SavedProspect[]>([]);
  const [savedUrls, setSavedUrls] = useState<Set<string>>(new Set());
  const [savedLoading, setSavedLoading] = useState(false);
  const [filterNiche, setFilterNiche] = useState("");
  const [filterScore, setFilterScore] = useState("");
  const [filterStatus, setFilterStatus] = useState<OutreachStatus | "">("");
  const [notesEditId, setNotesEditId] = useState<string | null>(null);
  const [notesText, setNotesText] = useState("");

  // Load saved prospects on mount and when tab changes
  useEffect(() => {
    loadSaved();
  }, []);

  async function loadSaved() {
    setSavedLoading(true);
    try {
      const saved = await getSavedProspects();
      setSavedProspects(saved);
      setSavedUrls(new Set(saved.map((s) => s.url)));
    } catch {
      // silent
    } finally {
      setSavedLoading(false);
    }
  }

  const canSearch = prompt.trim() && !loading;

  function generateOutreach(prospect: Prospect) {
    const findings = [
      prospect.apps.length > 0 && `Running ${prospect.apps.join(", ")}`,
      prospect.productCount > 0 && `${prospect.productCount} products`,
      prospect.priceRange && `Price range £${prospect.priceRange.min.toFixed(0)}–£${prospect.priceRange.max.toFixed(0)}`,
      prospect.hasReviews && "Has reviews",
      prospect.hasSubscriptions && "Has subscriptions",
      prospect.hasBNPL && "Has BNPL",
    ].filter(Boolean).join(". ");

    sessionStorage.setItem("outreach-prefill", JSON.stringify({
      brandName: prospect.brandName,
      storeUrl: prospect.url,
      contactName: "",
      findings: findings || "Shopify store — needs further analysis",
    }));
    router.push("/tools/outreach");
  }

  function generateOutreachFromSaved(sp: SavedProspect) {
    const findings = [
      sp.apps.length > 0 && `Running ${sp.apps.join(", ")}`,
      sp.product_count > 0 && `${sp.product_count} products`,
      sp.price_range && `Price range £${sp.price_range.min.toFixed(0)}–£${sp.price_range.max.toFixed(0)}`,
      sp.has_reviews && "Has reviews",
      sp.has_subscriptions && "Has subscriptions",
      sp.has_bnpl && "Has BNPL",
    ].filter(Boolean).join(". ");

    sessionStorage.setItem("outreach-prefill", JSON.stringify({
      brandName: sp.brand_name,
      storeUrl: sp.url,
      contactName: "",
      findings: findings || "Shopify store — needs further analysis",
    }));
    router.push("/tools/outreach");
  }

  async function toggleSave(prospect: Prospect) {
    if (savedUrls.has(prospect.url)) {
      // Unsave
      await unsaveProspectByUrl(prospect.url);
      setSavedUrls((prev) => {
        const next = new Set(prev);
        next.delete(prospect.url);
        return next;
      });
      setSavedProspects((prev) => prev.filter((sp) => sp.url !== prospect.url));
    } else {
      // Save
      const saved = await saveProspect({
        brand_name: prospect.brandName,
        url: prospect.url,
        emails: prospect.emails,
        social_links: prospect.socialLinks,
        revenue_score: prospect.revenueScore,
        apps: prospect.apps,
        niche: "",
        product_count: prospect.productCount,
        price_range: prospect.priceRange,
        has_reviews: prospect.hasReviews,
        has_subscriptions: prospect.hasSubscriptions,
        has_bnpl: prospect.hasBNPL,
      });
      setSavedUrls((prev) => new Set([...prev, prospect.url]));
      setSavedProspects((prev) => [saved, ...prev]);
    }
  }

  async function handleDeleteSaved(id: string, url: string) {
    await deleteSavedProspect(id);
    setSavedProspects((prev) => prev.filter((sp) => sp.id !== id));
    setSavedUrls((prev) => {
      const next = new Set(prev);
      next.delete(url);
      return next;
    });
  }

  async function handleStatusChange(id: string, newStatus: OutreachStatus) {
    await updateSavedProspect(id, { outreach_status: newStatus });
    setSavedProspects((prev) =>
      prev.map((sp) => (sp.id === id ? { ...sp, outreach_status: newStatus } : sp))
    );
  }

  async function handleNicheChange(id: string, niche: string) {
    await updateSavedProspect(id, { niche });
    setSavedProspects((prev) =>
      prev.map((sp) => (sp.id === id ? { ...sp, niche } : sp))
    );
  }

  async function handleNotesSave(id: string) {
    await updateSavedProspect(id, { notes: notesText });
    setSavedProspects((prev) =>
      prev.map((sp) => (sp.id === id ? { ...sp, notes: notesText } : sp))
    );
    setNotesEditId(null);
    setNotesText("");
  }

  const handleSearch = useCallback(async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setError("");
    setProspects([]);
    setSelected(new Set());
    setMissingKeys(false);
    setTotalFound(0);
    setEnrichingUrl("");
    setStatus("Searching Google...");

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/prospect-scraper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          maxResults,
        }),
        signal: abortRef.current.signal,
      });

      // Check for non-streaming JSON error (missing API keys)
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await res.json();
        if (data.type === "error" && data.message === "MISSING_API_KEYS") {
          setMissingKeys(true);
          setLoading(false);
          setStatus("");
          return;
        }
      }

      // Read NDJSON stream
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);

            switch (event.type) {
              case "searching":
                setStatus(`Searching for "${event.keyword}"...`);
                break;

              case "found":
                setTotalFound(event.total);
                setStatus(
                  `Found ${event.total} results — enriching...`
                );
                break;

              case "enriching":
                setEnrichingUrl(event.url);
                setStatus(
                  `Enriching ${event.index}/${event.total}...`
                );
                break;

              case "prospect":
                setProspects((prev) => {
                  const next = [...prev, event.data as Prospect];
                  // Auto-select all
                  setSelected(
                    new Set(next.map((p) => p.url))
                  );
                  return next;
                });
                break;

              case "done":
                setStatus("");
                break;

              case "error":
                setError(event.message);
                setStatus("");
                break;
            }
          } catch {
            // Skip malformed lines
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        setError(err.message);
      }
    } finally {
      setLoading(false);
      setStatus("");
      setEnrichingUrl("");
    }
  }, [prompt, maxResults]);

  function toggleSelect(url: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === prospects.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(prospects.map((p) => p.url)));
    }
  }

  function copyEmails() {
    const emails = prospects
      .filter((p) => selected.has(p.url))
      .flatMap((p) => p.emails);
    const unique = [...new Set(emails)];
    if (unique.length === 0) return;
    navigator.clipboard.writeText(unique.join(", "));
    setCopiedEmails(true);
    setTimeout(() => setCopiedEmails(false), 2000);
  }

  function exportCsv() {
    const selectedProspects = prospects.filter((p) =>
      selected.has(p.url)
    );
    if (selectedProspects.length === 0) return;

    const headers = [
      "Brand",
      "URL",
      "Email",
      "Instagram",
      "LinkedIn",
      "Twitter",
      "Facebook",
      "TikTok",
      "Products",
      "Min Price",
      "Max Price",
      "Apps",
      "Revenue Score",
    ];

    const rows = selectedProspects.map((p) => {
      const getSocial = (platform: string) =>
        p.socialLinks
          .filter((s) => s.platform === platform)
          .map((s) => s.url)
          .join("; ") || "";

      return [
        csvEscape(p.brandName),
        csvEscape(p.url),
        csvEscape(p.emails.join("; ")),
        csvEscape(getSocial("Instagram")),
        csvEscape(getSocial("LinkedIn")),
        csvEscape(getSocial("Twitter")),
        csvEscape(getSocial("Facebook")),
        csvEscape(getSocial("TikTok")),
        String(p.productCount),
        p.priceRange ? p.priceRange.min.toFixed(2) : "",
        p.priceRange ? p.priceRange.max.toFixed(2) : "",
        csvEscape(p.apps.join(", ")),
        String(p.revenueScore),
      ].join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prospects-${prompt.trim().replace(/\s+/g, "-").slice(0, 40)}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const selectedCount = prospects.filter((p) =>
    selected.has(p.url)
  ).length;
  const selectedEmails = prospects
    .filter((p) => selected.has(p.url))
    .reduce((sum, p) => sum + p.emails.length, 0);

  // Filtered saved prospects
  const niches = [...new Set(savedProspects.map((sp) => sp.niche).filter(Boolean))];
  const filteredSaved = savedProspects.filter((sp) => {
    if (filterNiche && sp.niche !== filterNiche) return false;
    if (filterScore && sp.revenue_score < parseInt(filterScore)) return false;
    if (filterStatus && sp.outreach_status !== filterStatus) return false;
    return true;
  });

  const savedStats = {
    total: savedProspects.length,
    notContacted: savedProspects.filter((sp) => sp.outreach_status === "not_contacted").length,
    contacted: savedProspects.filter((sp) => sp.outreach_status === "contacted").length,
    replied: savedProspects.filter((sp) => sp.outreach_status === "replied").length,
  };

  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-12 py-16 md:py-24">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            Prospect Scraper
          </h1>
          <p className="text-[#6B6B6B]">
            Discover Shopify stores by niche, enrich with contacts & data,
            export for outreach
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-8 bg-[#F5F5F5] rounded-lg p-1 w-fit">
          <button
            onClick={() => setTab("search")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === "search"
                ? "bg-white text-[#0A0A0A] shadow-sm"
                : "text-[#6B6B6B] hover:text-[#0A0A0A]"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <MagnifyingGlassIcon className="size-3.5" />
              Search
            </span>
          </button>
          <button
            onClick={() => { setTab("saved"); loadSaved(); }}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === "saved"
                ? "bg-white text-[#0A0A0A] shadow-sm"
                : "text-[#6B6B6B] hover:text-[#0A0A0A]"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <BookmarkIcon className="size-3.5" />
              Saved
              {savedProspects.length > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-[#0A0A0A] text-white rounded-full">
                  {savedProspects.length}
                </span>
              )}
            </span>
          </button>
        </div>

        {/* ══════════ SEARCH TAB ══════════ */}
        {tab === "search" && (
          <>
            {/* Missing API keys */}
            {missingKeys && (
              <div className="mb-8 bg-amber-50 border border-amber-200 rounded-lg p-5">
                <h3 className="text-sm font-semibold text-amber-800 mb-2">
                  Serper API Key Required
                </h3>
                <p className="text-sm text-amber-700 mb-3">
                  This tool uses Serper.dev (Google Search API) to find Shopify
                  stores. Add this environment variable:
                </p>
                <div className="bg-amber-100/50 rounded-md p-3 font-mono text-xs text-amber-800">
                  <p>SERPER_API_KEY=your_serper_api_key</p>
                </div>
                <p className="text-xs text-amber-600 mt-3">
                  Sign up free at{" "}
                  <a
                    href="https://serper.dev"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    serper.dev
                  </a>{" "}
                  — 2,500 free queries included.
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
                <button
                  onClick={() => setError("")}
                  className="ml-3 text-red-500 hover:text-red-700"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Search Form */}
            <div className="bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg p-5 space-y-4 mb-8">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] mb-2">
                  Search Prompt *
                </label>
                <textarea
                  rows={3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && canSearch) {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                  placeholder='e.g. "Protein supplement brands in the UK doing over 500K/month on Shopify — find founder or C-level emails"'
                  className={textareaClass}
                />
                <p className="text-[10px] text-[#AAAAAA] mt-1.5">
                  Be specific — niche, location, revenue range, role targets. More detail = better leads.
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] mb-2">
                    Max Results
                  </label>
                  <div className="inline-flex rounded-md border border-[#E5E5E5] bg-white p-0.5">
                    {maxResultsOptions.map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setMaxResults(n)}
                        className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                          maxResults === n
                            ? "bg-[#0A0A0A] text-white"
                            : "text-[#6B6B6B] hover:text-[#0A0A0A]"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSearch}
                disabled={!canSearch}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#0A0A0A] text-white text-sm font-medium rounded-md hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <ArrowPathIcon className="size-4 animate-spin" />
                    {status || "Searching..."}
                  </>
                ) : (
                  <>
                    <MagnifyingGlassIcon className="size-4" />
                    Find Prospects
                  </>
                )}
              </button>

              {/* Enriching URL indicator */}
              {enrichingUrl && (
                <p className="text-xs text-[#AAAAAA] truncate">
                  Crawling: {enrichingUrl}
                </p>
              )}
            </div>

            {/* Results */}
            {prospects.length > 0 && (
              <>
                {/* Action bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-[#6B6B6B]">
                      {prospects.length} Shopify{" "}
                      {prospects.length === 1 ? "store" : "stores"} found
                      {totalFound > prospects.length && (
                        <span className="text-[#AAAAAA]">
                          {" "}
                          (of {totalFound} results)
                        </span>
                      )}
                    </span>
                    {selectedCount > 0 && (
                      <span className="text-xs text-[#AAAAAA]">
                        {selectedCount} selected · {selectedEmails} emails
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={copyEmails}
                      disabled={selectedEmails === 0}
                      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border transition-all duration-200 ${
                        copiedEmails
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                          : "bg-white border-[#E5E5E5] text-[#6B6B6B] hover:border-[#CCCCCC] hover:text-[#0A0A0A] disabled:opacity-40 disabled:cursor-not-allowed"
                      }`}
                    >
                      {copiedEmails ? (
                        <>
                          <CheckIcon className="size-3" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <ClipboardDocumentIcon className="size-3" />
                          Copy Emails
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={exportCsv}
                      disabled={selectedCount === 0}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md bg-[#0A0A0A] text-white hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ArrowDownTrayIcon className="size-3" />
                      Export CSV
                    </button>
                  </div>
                </div>

                {/* Table */}
                <div className="border border-[#E5E5E5] rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[#F5F5F5] border-b border-[#E5E5E5]">
                          <th className="px-3 py-2.5 text-left w-8">
                            <input
                              type="checkbox"
                              checked={
                                prospects.length > 0 &&
                                selected.size === prospects.length
                              }
                              onChange={toggleAll}
                              className="rounded border-[#CCCCCC]"
                            />
                          </th>
                          <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#6B6B6B]">
                            Brand
                          </th>
                          <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#6B6B6B]">
                            Emails
                          </th>
                          <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#6B6B6B]">
                            Socials
                          </th>
                          <th className="px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-[#6B6B6B]">
                            Products
                          </th>
                          <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#6B6B6B]">
                            Prices
                          </th>
                          <th className="px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-[#6B6B6B]">
                            Apps
                          </th>
                          <th className="px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-[#6B6B6B]">
                            Score
                          </th>
                          <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-[#6B6B6B]">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {prospects.map((p) => (
                          <tr
                            key={p.url}
                            className="border-b border-[#E5E5E5] last:border-b-0 hover:bg-[#FAFAFA] transition-colors"
                          >
                            <td className="px-3 py-3">
                              <input
                                type="checkbox"
                                checked={selected.has(p.url)}
                                onChange={() => toggleSelect(p.url)}
                                className="rounded border-[#CCCCCC]"
                              />
                            </td>
                            <td className="px-3 py-3">
                              <div className="min-w-[140px]">
                                <p className="font-semibold text-[#0A0A0A] truncate max-w-[200px]">
                                  {p.brandName}
                                </p>
                                <a
                                  href={p.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-[#AAAAAA] hover:text-[#6B6B6B] truncate block max-w-[200px]"
                                >
                                  {p.url.replace(/^https?:\/\//, "")}
                                </a>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="min-w-[120px]">
                                {p.emails.length > 0 ? (
                                  <div className="space-y-0.5">
                                    {p.emails.slice(0, 2).map((email) => (
                                      <a
                                        key={email}
                                        href={`mailto:${email}`}
                                        className="block text-xs text-blue-600 hover:text-blue-800 truncate max-w-[180px]"
                                      >
                                        {email}
                                      </a>
                                    ))}
                                    {p.emails.length > 2 && (
                                      <span className="text-[10px] text-[#AAAAAA]">
                                        +{p.emails.length - 2} more
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-[#CCCCCC]">
                                    —
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-1 min-w-[80px]">
                                {p.socialLinks.length > 0 ? (
                                  <>
                                    {Array.from(
                                      new Set(
                                        p.socialLinks.map((s) => s.platform)
                                      )
                                    )
                                      .slice(0, 4)
                                      .map((platform) => {
                                        const link = p.socialLinks.find(
                                          (s) => s.platform === platform
                                        );
                                        return (
                                          <a
                                            key={platform}
                                            href={link?.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-1.5 py-0.5 text-[9px] font-semibold bg-[#F0F0F0] text-[#6B6B6B] rounded hover:bg-[#E5E5E5] transition-colors"
                                            title={platform}
                                          >
                                            {SOCIAL_ICONS[platform] ||
                                              platform.slice(0, 2)}
                                          </a>
                                        );
                                      })}
                                  </>
                                ) : (
                                  <span className="text-xs text-[#CCCCCC]">
                                    —
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className="text-xs tabular-nums">
                                {p.productCount > 0 ? p.productCount : "—"}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <span className="text-xs tabular-nums whitespace-nowrap">
                                {p.priceRange
                                  ? `£${p.priceRange.min.toFixed(0)} – £${p.priceRange.max.toFixed(0)}`
                                  : "—"}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              {p.apps.length > 0 ? (
                                <span
                                  className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-semibold bg-[#F0F0F0] text-[#6B6B6B] rounded cursor-help"
                                  title={p.apps.join(", ")}
                                >
                                  {p.apps.length}
                                </span>
                              ) : (
                                <span className="text-xs text-[#CCCCCC]">
                                  —
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <ScoreDots score={p.revenueScore} />
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => toggleSave(p)}
                                  className={`p-1.5 rounded-md transition-colors ${
                                    savedUrls.has(p.url)
                                      ? "text-amber-500 hover:text-amber-600 bg-amber-50"
                                      : "text-[#CCCCCC] hover:text-amber-500 hover:bg-amber-50"
                                  }`}
                                  title={savedUrls.has(p.url) ? "Unsave prospect" : "Save prospect"}
                                >
                                  {savedUrls.has(p.url) ? (
                                    <BookmarkIcon className="size-3.5" />
                                  ) : (
                                    <BookmarkOutline className="size-3.5" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => generateOutreach(p)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold rounded-md bg-[#0A0A0A] text-white hover:bg-accent-hover transition-colors"
                                  title="Generate outreach for this prospect"
                                >
                                  <PaperAirplaneIcon className="size-3" />
                                  Outreach
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Loading more indicator */}
                {loading && prospects.length > 0 && (
                  <div className="flex items-center justify-center gap-2 mt-4 py-3 text-sm text-[#6B6B6B]">
                    <ArrowPathIcon className="size-3.5 animate-spin" />
                    {status}
                  </div>
                )}
              </>
            )}

            {/* Empty state */}
            {!loading && prospects.length === 0 && !missingKeys && !error && (
              <div className="text-center py-16">
                <UserGroupIcon className="size-10 text-[#E5E5E5] mx-auto mb-4" />
                <p className="text-sm text-[#AAAAAA]">
                  Describe your ideal prospect to find Shopify stores
                </p>
              </div>
            )}
          </>
        )}

        {/* ══════════ SAVED TAB ══════════ */}
        {tab === "saved" && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-white border border-[#E5E5E5] rounded-lg p-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA] mb-1">Total</p>
                <p className="text-xl font-bold">{savedStats.total}</p>
              </div>
              <div className="bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg p-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA] mb-1">Not Contacted</p>
                <p className="text-xl font-bold text-[#999999]">{savedStats.notContacted}</p>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-400 mb-1">Contacted</p>
                <p className="text-xl font-bold text-blue-600">{savedStats.contacted}</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 mb-1">Replied</p>
                <p className="text-xl font-bold text-emerald-600">{savedStats.replied}</p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <div className="flex items-center gap-1.5 text-xs text-[#6B6B6B]">
                <FunnelIcon className="size-3" />
                <span className="font-medium">Filter:</span>
              </div>
              {niches.length > 0 && (
                <select
                  value={filterNiche}
                  onChange={(e) => setFilterNiche(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-[#E5E5E5] rounded-md bg-white focus:outline-none focus:border-[#999999]"
                >
                  <option value="">All niches</option>
                  {niches.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              )}
              <select
                value={filterScore}
                onChange={(e) => setFilterScore(e.target.value)}
                className="px-3 py-1.5 text-xs border border-[#E5E5E5] rounded-md bg-white focus:outline-none focus:border-[#999999]"
              >
                <option value="">Any score</option>
                <option value="1">★ 1+</option>
                <option value="2">★★ 2+</option>
                <option value="3">★★★ 3+</option>
                <option value="4">★★★★ 4+</option>
                <option value="5">★★★★★ 5</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as OutreachStatus | "")}
                className="px-3 py-1.5 text-xs border border-[#E5E5E5] rounded-md bg-white focus:outline-none focus:border-[#999999]"
              >
                <option value="">All statuses</option>
                <option value="not_contacted">Not Contacted</option>
                <option value="contacted">Contacted</option>
                <option value="replied">Replied</option>
              </select>
              {(filterNiche || filterScore || filterStatus) && (
                <button
                  onClick={() => { setFilterNiche(""); setFilterScore(""); setFilterStatus(""); }}
                  className="text-xs text-[#AAAAAA] hover:text-[#6B6B6B] underline"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Saved prospects list */}
            {savedLoading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-sm text-[#6B6B6B]">
                <ArrowPathIcon className="size-4 animate-spin" />
                Loading saved prospects...
              </div>
            ) : filteredSaved.length > 0 ? (
              <div className="space-y-3">
                {filteredSaved.map((sp) => {
                  const statusStyle = OUTREACH_STATUS_LABELS[sp.outreach_status];
                  return (
                    <div key={sp.id} className="bg-white border border-[#E5E5E5] rounded-lg overflow-hidden">
                      <div className="px-5 py-4">
                        <div className="flex items-start justify-between gap-4">
                          {/* Left: brand info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-sm truncate">{sp.brand_name}</h3>
                              <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                                {statusStyle.label}
                              </span>
                              {sp.niche && (
                                <span className="px-2 py-0.5 text-[10px] font-medium bg-[#F0F0F0] text-[#6B6B6B] rounded-full">
                                  {sp.niche}
                                </span>
                              )}
                            </div>
                            <a
                              href={sp.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[#AAAAAA] hover:text-[#6B6B6B] truncate block"
                            >
                              {sp.url.replace(/^https?:\/\//, "")}
                            </a>

                            {/* Quick stats row */}
                            <div className="flex items-center gap-4 mt-2 text-xs text-[#6B6B6B]">
                              {sp.emails.length > 0 && (
                                <span>{sp.emails.length} email{sp.emails.length !== 1 ? "s" : ""}</span>
                              )}
                              {sp.product_count > 0 && (
                                <span>{sp.product_count} products</span>
                              )}
                              {sp.price_range && (
                                <span>£{sp.price_range.min.toFixed(0)}–£{sp.price_range.max.toFixed(0)}</span>
                              )}
                              {sp.apps.length > 0 && (
                                <span title={sp.apps.join(", ")} className="cursor-help">
                                  {sp.apps.length} app{sp.apps.length !== 1 ? "s" : ""}
                                </span>
                              )}
                              <ScoreDots score={sp.revenue_score} />
                            </div>

                            {/* Emails */}
                            {sp.emails.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {sp.emails.map((email) => (
                                  <a
                                    key={email}
                                    href={`mailto:${email}`}
                                    className="text-[10px] text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded"
                                  >
                                    {email}
                                  </a>
                                ))}
                              </div>
                            )}

                            {/* Notes */}
                            {sp.notes && notesEditId !== sp.id && (
                              <p className="text-xs text-[#6B6B6B] mt-2 italic">
                                &ldquo;{sp.notes}&rdquo;
                              </p>
                            )}
                          </div>

                          {/* Right: actions */}
                          <div className="flex items-center gap-2 shrink-0">
                            <select
                              value={sp.outreach_status}
                              onChange={(e) => handleStatusChange(sp.id, e.target.value as OutreachStatus)}
                              className="px-2 py-1 text-[10px] border border-[#E5E5E5] rounded-md bg-white focus:outline-none focus:border-[#999999]"
                            >
                              <option value="not_contacted">Not Contacted</option>
                              <option value="contacted">Contacted</option>
                              <option value="replied">Replied</option>
                            </select>
                            <button
                              onClick={() => {
                                if (notesEditId === sp.id) {
                                  setNotesEditId(null);
                                  setNotesText("");
                                } else {
                                  setNotesEditId(sp.id);
                                  setNotesText(sp.notes);
                                }
                              }}
                              className={`p-1.5 rounded-md transition-colors ${
                                sp.notes || notesEditId === sp.id
                                  ? "text-blue-500 bg-blue-50"
                                  : "text-[#CCCCCC] hover:text-[#999999]"
                              }`}
                              title="Notes"
                            >
                              <ChatBubbleLeftIcon className="size-3.5" />
                            </button>
                            <button
                              onClick={() => generateOutreachFromSaved(sp)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold rounded-md bg-[#0A0A0A] text-white hover:bg-accent-hover transition-colors"
                              title="Generate outreach"
                            >
                              <PaperAirplaneIcon className="size-3" />
                              Outreach
                            </button>
                            <button
                              onClick={() => handleDeleteSaved(sp.id, sp.url)}
                              className="p-1.5 text-[#CCCCCC] hover:text-red-400 transition-colors rounded-md"
                              title="Remove"
                            >
                              <TrashIcon className="size-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Notes edit */}
                        {notesEditId === sp.id && (
                          <div className="mt-3 flex items-center gap-2">
                            <input
                              type="text"
                              value={notesText}
                              onChange={(e) => setNotesText(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && handleNotesSave(sp.id)}
                              placeholder="Add a note about this prospect..."
                              className="flex-1 px-3 py-2 text-xs bg-[#FAFAFA] border border-[#E5E5E5] rounded-md focus:outline-none focus:border-[#999999]"
                              autoFocus
                            />
                            <button
                              onClick={() => handleNotesSave(sp.id)}
                              className="px-3 py-2 text-xs font-medium bg-[#0A0A0A] text-white rounded-md hover:bg-[#2A2A2A] transition-colors"
                            >
                              Save
                            </button>
                          </div>
                        )}

                        {/* Inline niche editor */}
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            type="text"
                            value={sp.niche}
                            onChange={(e) => handleNicheChange(sp.id, e.target.value)}
                            placeholder="Tag niche (e.g. supplements, skincare)"
                            className="px-2 py-1 text-[10px] bg-[#FAFAFA] border border-[#E5E5E5] rounded-md focus:outline-none focus:border-[#999999] w-48"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : savedProspects.length > 0 ? (
              <div className="text-center py-16">
                <FunnelIcon className="size-10 text-[#E5E5E5] mx-auto mb-4" />
                <p className="text-sm text-[#AAAAAA]">
                  No prospects match the current filters
                </p>
              </div>
            ) : (
              <div className="text-center py-16">
                <BookmarkOutline className="size-10 text-[#E5E5E5] mx-auto mb-4" />
                <p className="text-sm text-[#AAAAAA] mb-1">
                  No saved prospects yet
                </p>
                <p className="text-xs text-[#CCCCCC]">
                  Search for prospects and click the bookmark icon to save them here
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Score Dots ───────────────────────────────────────────────────

function ScoreDots({ score }: { score: number }) {
  return (
    <div className="flex items-center justify-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          className={`size-1.5 rounded-full ${
            i < score ? "bg-[#0A0A0A]" : "bg-[#E5E5E5]"
          }`}
        />
      ))}
    </div>
  );
}

// ── CSV escape helper ───────────────────────────────────────────

function csvEscape(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}
