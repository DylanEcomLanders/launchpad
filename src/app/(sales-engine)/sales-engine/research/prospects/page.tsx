"use client";

import { useState } from "react";
import { MagnifyingGlassIcon, ArrowPathIcon, PlusIcon } from "@heroicons/react/24/outline";
import { inputClass, labelClass } from "@/lib/form-styles";
import { saveLead, createNewLead } from "@/lib/sales-engine/leads-data";

interface StoreResult {
  url: string;
  name: string;
  email: string;
  country: string;
  currency: string;
  description: string;
  socials: { instagram?: string; facebook?: string; twitter?: string };
  products_count: number;
  score: number;
}

function parseStore(raw: any): StoreResult {
  return {
    url: raw.url || raw.storeUrl || "",
    name: raw.name || raw.storeName || raw.title || "",
    email: raw.email || raw.contactEmail || "",
    country: raw.country || raw.countryCode || "",
    currency: raw.currency || "",
    description: (raw.description || raw.storeDescription || "").slice(0, 200),
    socials: {
      instagram: raw.instagram || raw.instagramUrl || "",
      facebook: raw.facebook || raw.facebookUrl || "",
      twitter: raw.twitter || raw.twitterUrl || "",
    },
    products_count: raw.productsCount || raw.products_count || 0,
    score: 0,
  };
}

function scoreStore(store: StoreResult): number {
  let score = 0;
  if (store.email) score += 25;
  if (store.socials.instagram) score += 15;
  if (store.products_count > 10) score += 10;
  if (store.products_count > 50) score += 10;
  if (store.description.length > 50) score += 10;
  if (store.country) score += 10;
  score += Math.min(20, store.products_count);
  return Math.min(100, score);
}

export default function EcomProspectingPage() {
  const [query, setQuery] = useState("");
  const [stores, setStores] = useState<StoreResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [addedToPipeline, setAddedToPipeline] = useState<Set<string>>(new Set());

  const searchStores = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/apify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "shopify-find",
          params: { query: query.trim(), limit: 30 },
        }),
      });

      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();

      const parsed = (data.results || []).map(parseStore).map((s: StoreResult) => ({
        ...s,
        score: scoreStore(s),
      }));

      parsed.sort((a: StoreResult, b: StoreResult) => b.score - a.score);
      setStores(parsed);
    } catch (err: any) {
      setError(err.message || "Search failed");
    }
    setLoading(false);
  };

  const analyseStore = async (url: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/apify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "shopify-store",
          params: { urls: [url] },
        }),
      });

      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();

      if (data.results?.length > 0) {
        const parsed = data.results.map(parseStore).map((s: StoreResult) => ({
          ...s,
          score: scoreStore(s),
        }));
        setStores((prev) => {
          const existing = prev.map((s) => s.url);
          const fresh = parsed.filter((s: StoreResult) => !existing.includes(s.url));
          return [...fresh, ...prev];
        });
      }
    } catch (err: any) {
      setError(err.message || "Analysis failed");
    }
    setLoading(false);
  };

  const addToPipeline = async (store: StoreResult) => {
    try {
      const lead = createNewLead({
        brand_name: store.name,
        contact_email: store.email,
        source: "Ecom Prospecting",
        store_url: store.url,
        notes: `Products: ${store.products_count}\nCountry: ${store.country}\n${store.description}`,
      });
      await saveLead(lead);
      setAddedToPipeline((prev) => new Set([...prev, store.url]));
    } catch (err) {
      console.error("Failed to add to pipeline:", err);
      alert("Failed to save. Please try again.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Ecom Prospecting</h1>
        <p className="text-sm text-[#7A7A7A] mt-1">Find and analyse Shopify stores by niche. Add prospects directly to your pipeline.</p>
      </div>

      {/* Search */}
      <div className="border border-[#E5E5EA] rounded-xl bg-white p-5 mb-6">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className={labelClass}>Search by niche or keyword</label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") searchStores(); }}
              className={inputClass}
              placeholder="e.g. supplements, skincare, pet food, coffee..."
            />
          </div>
          <button
            onClick={searchStores}
            disabled={!query.trim() || loading}
            className="flex items-center gap-1.5 px-5 py-2 bg-[#1B1B1B] text-white text-xs font-medium rounded-lg hover:bg-[#2D2D2D] disabled:opacity-30"
          >
            {loading ? <ArrowPathIcon className="size-3.5 animate-spin" /> : <MagnifyingGlassIcon className="size-3.5" />}
            {loading ? "Searching..." : "Find Stores"}
          </button>
        </div>

        {/* Or analyse single store */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#F0F0F0]">
          <p className="text-[10px] text-[#AAA]">Or analyse a specific store:</p>
          <input
            type="url"
            id="singleUrl"
            placeholder="https://store.myshopify.com"
            className="flex-1 px-2 py-1 text-xs border border-[#E5E5EA] rounded"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const input = e.target as HTMLInputElement;
                if (input.value.trim()) analyseStore(input.value.trim());
              }
            }}
          />
        </div>
        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      </div>

      {/* Results */}
      {stores.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-[#7A7A7A]">{stores.length} stores found</p>
          </div>

          {/* Table header */}
          <div className="border border-[#E5E5EA] rounded-xl bg-white overflow-hidden">
            <div className="grid grid-cols-[1fr_120px_80px_80px_100px_60px] gap-2 px-4 py-2 bg-[#FAFAFA] border-b border-[#E5E5EA] text-[10px] font-semibold uppercase tracking-wider text-[#AAA]">
              <span>Store</span>
              <span>Email</span>
              <span className="text-center">Products</span>
              <span className="text-center">Country</span>
              <span className="text-center">Score</span>
              <span />
            </div>

            {stores.map((store, i) => (
              <div key={store.url || i} className="grid grid-cols-[1fr_120px_80px_80px_100px_60px] gap-2 px-4 py-3 border-b border-[#EDEDEF] last:border-0 items-center hover:bg-[#FAFAFA]">
                <div className="min-w-0">
                  <a href={store.url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-[#1A1A1A] hover:underline truncate block">
                    {store.name || store.url}
                  </a>
                  {store.description && <p className="text-[10px] text-[#999] truncate">{store.description}</p>}
                  <div className="flex items-center gap-2 mt-0.5">
                    {store.socials.instagram && (
                      <a href={store.socials.instagram} target="_blank" rel="noopener noreferrer" className="text-[9px] text-pink-400 hover:text-pink-600">IG</a>
                    )}
                    {store.socials.facebook && (
                      <a href={store.socials.facebook} target="_blank" rel="noopener noreferrer" className="text-[9px] text-blue-400 hover:text-blue-600">FB</a>
                    )}
                  </div>
                </div>
                <span className="text-[10px] text-[#777] truncate">{store.email || "—"}</span>
                <span className="text-xs text-center text-[#777]">{store.products_count || "—"}</span>
                <span className="text-[10px] text-center text-[#999]">{store.country || "—"}</span>
                <div className="flex items-center justify-center">
                  <div className="w-12 h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${store.score >= 70 ? "bg-emerald-500" : store.score >= 40 ? "bg-amber-500" : "bg-[#CCC]"}`}
                      style={{ width: `${store.score}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold ml-1.5 text-[#777]">{store.score}</span>
                </div>
                <div className="text-center">
                  {addedToPipeline.has(store.url) ? (
                    <span className="text-[9px] text-emerald-500 font-semibold">Added</span>
                  ) : (
                    <button
                      onClick={() => addToPipeline(store)}
                      className="p-1 text-[#CCC] hover:text-[#1A1A1A] transition-colors"
                      title="Add to pipeline"
                    >
                      <PlusIcon className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty */}
      {stores.length === 0 && !loading && (
        <div className="border-2 border-dashed border-[#E5E5EA] rounded-xl p-12 text-center">
          <p className="text-sm text-[#AAA]">Search for ecom stores by niche</p>
          <p className="text-xs text-[#CCC] mt-1">Find Shopify stores, score them, and add to your pipeline</p>
        </div>
      )}
    </div>
  );
}
