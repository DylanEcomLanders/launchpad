"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Logo } from "@/components/logo";
import { getClientBySlug } from "@/lib/portfolio/data";
import type { PortfolioClient } from "@/lib/portfolio/types";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";

export default function PortfolioPage() {
  const { slug } = useParams<{ slug: string }>();
  const [client, setClient] = useState<PortfolioClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    (async () => {
      const data = await getClientBySlug(slug);
      setClient(data);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse text-sm text-[#AAAAAA]">Loading...</div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-3">
        <Logo height={16} className="text-[#0A0A0A]" />
        <p className="text-sm text-[#6B6B6B]">Portfolio not found</p>
      </div>
    );
  }

  const sortedPages = [...client.pages].sort((a, b) => a.order - b.order);
  const activePage = sortedPages[activeTab];

  // Convert Figma URL to embed format
  function toEmbedUrl(url: string): string {
    if (url.includes("figma.com/embed")) return url;
    return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="px-6 md:px-12 py-5 flex items-center justify-between">
        <Logo height={16} className="text-[#0A0A0A]" />
      </header>

      {/* Client Info */}
      <div className="px-6 md:px-12 pb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">
          {client.client_name}
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-[#6B6B6B]">
          {client.project_type && <span>{client.project_type}</span>}
          {client.project_type && client.live_url && <span className="text-[#E5E5E5]">&middot;</span>}
          {client.live_url && (
            <a
              href={client.live_url.startsWith("http") ? client.live_url : `https://${client.live_url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[#0A0A0A] font-medium hover:underline"
            >
              {client.live_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              <ArrowTopRightOnSquareIcon className="size-3.5" />
            </a>
          )}
        </div>
        {client.description && (
          <p className="text-sm text-[#6B6B6B] mt-2 max-w-2xl">{client.description}</p>
        )}
      </div>

      {/* Tabs */}
      {sortedPages.length > 1 && (
        <div className="px-6 md:px-12 border-b border-[#E5E5E5]">
          <div className="flex overflow-x-auto gap-0 -mb-px scrollbar-hide">
            {sortedPages.map((page, i) => (
              <button
                key={page.id}
                onClick={() => setActiveTab(i)}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  i === activeTab
                    ? "border-[#0A0A0A] text-[#0A0A0A]"
                    : "border-transparent text-[#AAAAAA] hover:text-[#6B6B6B]"
                }`}
              >
                {page.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Figma Embed */}
      <div className="flex-1 min-h-0">
        {activePage ? (
          <iframe
            src={toEmbedUrl(activePage.figma_embed_url)}
            className="w-full h-[80vh] border-0"
            allowFullScreen
          />
        ) : (
          <div className="flex items-center justify-center h-[60vh] text-sm text-[#AAAAAA]">
            No pages added yet
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
