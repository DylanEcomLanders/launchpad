"use client";

import { useState, useEffect } from "react";
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
        <div className="animate-pulse text-sm text-[#AAAAAA]">Loading...</div>
      </div>
    );
  }

  const active = tabs[activeTab];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="px-6 md:px-12 py-5">
        <Logo height={16} className="text-[#0A0A0A]" />
      </header>

      <div className="px-6 md:px-12 pb-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">
          Our Work
        </h1>
        <p className="text-sm text-[#6B6B6B]">
          Shopify CRO &amp; landing page designs by Ecomlanders
        </p>
      </div>

      {/* Tabs */}
      {tabs.length > 1 && (
        <div className="px-6 md:px-12 border-b border-[#E5E5E5]">
          <div className="flex overflow-x-auto gap-0 -mb-px scrollbar-hide">
            {tabs.map((tab, i) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(i)}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  i === activeTab
                    ? "border-[#0A0A0A] text-[#0A0A0A]"
                    : "border-transparent text-[#AAAAAA] hover:text-[#6B6B6B]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Figma Embed */}
      <div className="flex-1 min-h-0">
        {active ? (
          <iframe
            key={active.id}
            src={toEmbedUrl(active.figma_url)}
            className="w-full h-[80vh] border-0"
            allowFullScreen
          />
        ) : (
          <div className="flex items-center justify-center h-[60vh] text-sm text-[#AAAAAA]">
            No portfolio items yet
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-[#F0F0F0] px-6 md:px-12 py-6 text-center">
        <p className="text-xs text-[#AAAAAA]">
          Built by{" "}
          <a
            href="https://ecomlanders.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors"
          >
            Ecomlanders
          </a>
        </p>
      </footer>
    </div>
  );
}
