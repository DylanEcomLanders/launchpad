"use client";

import { useState, useRef, useCallback } from "react";
import {
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  UserGroupIcon,
} from "@heroicons/react/24/solid";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { DecorativeBlocks } from "@/components/decorative-blocks";
import { inputClass } from "@/lib/form-styles";
import type { Prospect, SocialLink } from "@/lib/types";

type MaxResults = 10 | 20 | 30;

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

// ── Component ───────────────────────────────────────────────────

export default function ProspectScraperPage() {
  const [keyword, setKeyword] = useState("");
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

  const canSearch = keyword.trim() && !loading;

  const handleSearch = useCallback(async () => {
    if (!keyword.trim()) return;

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
          keyword: keyword.trim(),
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
  }, [keyword, maxResults]);

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
    a.download = `prospects-${keyword.trim().replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const selectedCount = prospects.filter((p) =>
    selected.has(p.url)
  ).length;
  const selectedEmails = prospects
    .filter((p) => selected.has(p.url))
    .reduce((sum, p) => sum + p.emails.length, 0);

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
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B6B6B] mb-2">
                Niche Keyword *
              </label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canSearch) handleSearch();
                }}
                placeholder='e.g. "protein supplements", "skincare UK", "activewear"'
                className={inputClass}
              />
            </div>
            <div className="sm:w-48">
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
            className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#0A0A0A] text-white text-sm font-medium rounded-md hover:bg-accent hover:text-[#0A0A0A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md bg-[#0A0A0A] text-white hover:bg-accent hover:text-[#0A0A0A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
                                {/* Show unique platforms */}
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
              Enter a niche keyword to find Shopify stores
            </p>
          </div>
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
