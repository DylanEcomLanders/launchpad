"use client";

import { useState, useEffect, useCallback } from "react";
import { Logo } from "@/components/logo";
import { getTabs } from "@/lib/portfolio/data";
import type { PortfolioTab } from "@/lib/portfolio/types";

function toEmbedUrl(url: string): string {
  if (url.includes("figma.com/embed")) return url;
  return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`;
}

export default function PortfolioPage() {
  const [tabs, setTabs] = useState<PortfolioTab[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [loadedIframes, setLoadedIframes] = useState<Set<string>>(new Set());

  const handleIframeLoad = useCallback((id: string) => {
    setLoadedIframes((prev) => new Set(prev).add(id));
  }, []);

  useEffect(() => {
    (async () => {
      const data = await getTabs();
      setTabs(data.sort((a, b) => a.order - b.order));
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse text-sm text-[#A0A0A0]">Loading...</div>
      </div>
    );
  }

  const active = tabs[activeTab];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="px-6 md:px-12 py-5">
        <Logo height={16} className="text-[#1B1B1B]" />
      </header>

      <div className="px-6 md:px-12 pb-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">
          Our Work
        </h1>
        <p className="text-sm text-[#7A7A7A]">
          Shopify CRO &amp; landing page designs by Ecomlanders
        </p>
      </div>

      {/* Tabs */}
      {tabs.length > 1 && (
        <div className="px-6 md:px-12 border-b border-[#E5E5EA]">
          <div className="flex overflow-x-auto gap-0 -mb-px scrollbar-hide">
            {tabs.map((tab, i) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(i)}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  i === activeTab
                    ? "border-[#1B1B1B] text-[#1B1B1B]"
                    : "border-transparent text-[#A0A0A0] hover:text-[#7A7A7A]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Figma Embeds — all preloaded, only active visible */}
      <div className="flex-1 min-h-0 relative">
        {tabs.length === 0 ? (
          <div className="flex items-center justify-center h-[60vh] text-sm text-[#A0A0A0]">
            No portfolio items yet
          </div>
        ) : (
          tabs.map((tab, i) => (
            <div
              key={tab.id}
              className={`${i === activeTab ? "block" : "hidden"} relative h-[80vh]`}
            >
              {/* Loading skeleton */}
              {!loadedIframes.has(tab.id) && i === activeTab && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#F7F8FA]">
                  <div className="text-center">
                    <div className="inline-block size-5 border-2 border-[#E5E5EA] border-t-[#1B1B1B] rounded-full animate-spin mb-3" />
                    <p className="text-xs text-[#A0A0A0]">Loading design…</p>
                  </div>
                </div>
              )}
              <iframe
                src={toEmbedUrl(tab.figma_url)}
                className="w-full h-full border-0"
                allowFullScreen
                loading={i === 0 ? "eager" : "lazy"}
                onLoad={() => handleIframeLoad(tab.id)}
              />
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-[#EDEDEF] px-6 md:px-12 py-6 text-center">
        <p className="text-xs text-[#A0A0A0]">
          Built by{" "}
          <a
            href="https://ecomlanders.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[#7A7A7A] hover:text-[#1B1B1B] transition-colors"
          >
            Ecomlanders
          </a>
        </p>
      </footer>
    </div>
  );
}
