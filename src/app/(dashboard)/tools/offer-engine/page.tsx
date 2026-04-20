"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ClipboardDocumentIcon,
  ArrowTopRightOnSquareIcon,
  CheckIcon,
  TrashIcon,
  SparklesIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { DecorativeBlocks } from "@/components/decorative-blocks";
import { inputClass, labelClass } from "@/lib/form-styles";
import type { ProposalContent } from "@/lib/offer-engine/types";

type ProposalListItem = {
  id: string;
  slug: string;
  brand_name: string;
  created_at: string;
  updated_at: string;
};

function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function todayLongDate(): string {
  return new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function OfferEnginePage() {
  const [proposals, setProposals] = useState<ProposalListItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // Form state
  const [brandName, setBrandName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [date, setDate] = useState(todayLongDate());
  const [retainerPrice, setRetainerPrice] = useState("£20,000");
  const [pilotTitle, setPilotTitle] = useState("");
  const [pilotPrice, setPilotPrice] = useState("£15,000");
  const [pilotDescription, setPilotDescription] = useState("");
  const [notes, setNotes] = useState("");

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSlug, setSavedSlug] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadProposals = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch("/api/offer-engine");
      const json = await res.json();
      setProposals(json.proposals ?? []);
    } catch (e) {
      console.error(e);
    }
    setLoadingList(false);
  }, []);

  useEffect(() => {
    loadProposals();
  }, [loadProposals]);

  // Auto-derive slug from brand name unless user edits it
  useEffect(() => {
    if (!slugEdited) setSlug(slugify(brandName));
  }, [brandName, slugEdited]);

  const reset = () => {
    setBrandName("");
    setSlug("");
    setSlugEdited(false);
    setDate(todayLongDate());
    setRetainerPrice("£20,000");
    setPilotTitle("");
    setPilotPrice("£15,000");
    setPilotDescription("");
    setNotes("");
    setSavedSlug(null);
    setError(null);
  };

  const handleGenerate = async () => {
    if (!brandName.trim() || !notes.trim()) {
      setError("Brand name and notes are required");
      return;
    }
    setGenerating(true);
    setError(null);
    setSavedSlug(null);

    try {
      // 1. Ask Claude to fill the template
      const genRes = await fetch("/api/offer-engine/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName,
          notes,
          date,
          retainerPrice,
          pilotPrice,
          pilotTitle: pilotTitle || undefined,
          pilotDescription: pilotDescription || undefined,
        }),
      });
      const genJson = await genRes.json();
      if (!genRes.ok) throw new Error(genJson.error || "Generate failed");
      const content = genJson.content as ProposalContent;

      // 2. Save to Supabase
      const saveRes = await fetch("/api/offer-engine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: slug || slugify(brandName),
          brand_name: brandName,
          content,
        }),
      });
      const saveJson = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveJson.error || "Save failed");

      setSavedSlug(saveJson.proposal.slug);
      loadProposals();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setGenerating(false);
  };

  const handleCopy = (fullUrl: string) => {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDelete = async (itemSlug: string) => {
    if (!confirm(`Delete proposal "${itemSlug}"?`)) return;
    await fetch(`/api/offer-engine?slug=${encodeURIComponent(itemSlug)}`, { method: "DELETE" });
    loadProposals();
  };

  const proposalUrl = (s: string) =>
    typeof window === "undefined" ? `/proposal/${s}` : `${window.location.origin}/proposal/${s}`;

  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-12 py-16 md:py-24">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Offer Engine</h1>
          <p className="text-[#7A7A7A]">
            Paste call notes, fill the offer inputs, and Claude drafts a personalised Conversion Engine proposal at{" "}
            <code className="text-[#1B1B1B] bg-[#F3F3F3] px-1.5 py-0.5 rounded text-[12px]">/proposal/[brand]</code>.
          </p>
        </div>

        {/* Saved confirmation */}
        {savedSlug && (
          <div className="mb-8 p-5 border border-[#1B1B1B] bg-[#FAFAFA] rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <CheckIcon className="size-4 text-[#1B1B1B]" />
              <p className="text-sm font-semibold text-[#1B1B1B]">Proposal saved</p>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-white border border-[#E8E8E8] rounded-md text-[12px] text-[#333] truncate">
                {proposalUrl(savedSlug)}
              </code>
              <button
                onClick={() => handleCopy(proposalUrl(savedSlug))}
                className="px-3 py-2 text-xs font-medium text-[#1B1B1B] border border-[#E8E8E8] rounded-md hover:bg-[#F3F3F3] transition-colors"
              >
                {copied ? "Copied" : "Copy"}
              </button>
              <Link
                href={`/proposal/${savedSlug}`}
                target="_blank"
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-white bg-[#1B1B1B] rounded-md hover:bg-[#2D2D2D] transition-colors"
              >
                Open
                <ArrowTopRightOnSquareIcon className="size-3" />
              </Link>
            </div>
            <button onClick={reset} className="mt-4 text-xs text-[#7A7A7A] underline">Start another</button>
          </div>
        )}

        {/* Form */}
        {!savedSlug && (
          <div className="mb-12 p-6 bg-white border border-[#E8E8E8] rounded-xl">
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className={labelClass}>Brand name</label>
                <input
                  className={inputClass}
                  placeholder="Yorkshire Dental Suite"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Slug</label>
                <input
                  className={inputClass}
                  placeholder="yorkshire-dental-suite"
                  value={slug}
                  onChange={(e) => {
                    setSlug(slugify(e.target.value));
                    setSlugEdited(true);
                  }}
                />
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className={labelClass}>Date</label>
                <input className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Retainer price</label>
                <input className={inputClass} value={retainerPrice} onChange={(e) => setRetainerPrice(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Pilot price</label>
                <input className={inputClass} value={pilotPrice} onChange={(e) => setPilotPrice(e.target.value)} />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className={labelClass}>Pilot title (optional)</label>
                <input
                  className={inputClass}
                  placeholder="Three-Page Rebuild"
                  value={pilotTitle}
                  onChange={(e) => setPilotTitle(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Pilot one-liner (optional)</label>
                <input
                  className={inputClass}
                  placeholder="Scoped project covering the three pages shared on the call"
                  value={pilotDescription}
                  onChange={(e) => setPilotDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="mb-4">
              <label className={labelClass}>Call notes / transcript</label>
              <textarea
                className={`${inputClass} min-h-[200px] resize-y leading-relaxed`}
                placeholder="Paste the call transcript or your notes here. Include specifics like current stats, traffic sources, what's working, what's broken, stack, decision-makers. Claude will only use numbers that appear in these notes."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <p className="text-[11px] text-[#999] mt-1">
                Claude only pulls stats from what you paste here. Missing numbers stay as <code>[needs input]</code> so you can spot them.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">{error}</div>
            )}

            <button
              onClick={handleGenerate}
              disabled={generating || !brandName.trim() || !notes.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#1B1B1B] rounded-lg hover:bg-[#2D2D2D] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <ArrowPathIcon className="size-4 animate-spin" />
                  Generating
                </>
              ) : (
                <>
                  <SparklesIcon className="size-4" />
                  Generate & Save
                </>
              )}
            </button>
          </div>
        )}

        {/* Existing proposals */}
        <div>
          <h2 className="text-base font-semibold text-[#1B1B1B] mb-3">Saved proposals</h2>
          {loadingList ? (
            <p className="text-sm text-[#999]">Loading…</p>
          ) : proposals.length === 0 ? (
            <p className="text-sm text-[#999]">No proposals yet.</p>
          ) : (
            <div className="space-y-2">
              {proposals.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-4 bg-white border border-[#E8E8E8] rounded-xl">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#1B1B1B] truncate">{p.brand_name}</p>
                    <p className="text-[11px] text-[#999] truncate">/proposal/{p.slug} · updated {new Date(p.updated_at).toLocaleDateString("en-GB")}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleCopy(proposalUrl(p.slug))}
                      className="p-2 text-[#7A7A7A] hover:text-[#1B1B1B] transition-colors"
                      title="Copy link"
                    >
                      <ClipboardDocumentIcon className="size-4" />
                    </button>
                    <Link
                      href={`/proposal/${p.slug}`}
                      target="_blank"
                      className="p-2 text-[#7A7A7A] hover:text-[#1B1B1B] transition-colors"
                      title="Open"
                    >
                      <ArrowTopRightOnSquareIcon className="size-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(p.slug)}
                      className="p-2 text-[#7A7A7A] hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
