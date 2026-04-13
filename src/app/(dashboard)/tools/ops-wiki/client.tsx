"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import {
  SwatchIcon,
  Squares2X2Icon,
  ArrowsRightLeftIcon,
  CodeBracketIcon,
  ShoppingCartIcon,
  RocketLaunchIcon,
  MagnifyingGlassIcon,
  BeakerIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  CheckBadgeIcon,
  BoltIcon,
  ChatBubbleLeftRightIcon,
  ShieldCheckIcon,
  ChevronRightIcon,
  WrenchScrewdriverIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";

interface OpsWikiModule {
  slug: string;
  title: string;
  shortTitle: string;
  icon: string;
  content: string;
  category: "design" | "development" | "cro" | "operations" | "qa" | "client";
  toolHref?: string;
}

const iconMap: Record<string, React.ReactNode> = {
  swatch: <SwatchIcon className="size-4" />,
  squares: <Squares2X2Icon className="size-4" />,
  arrows: <ArrowsRightLeftIcon className="size-4" />,
  code: <CodeBracketIcon className="size-4" />,
  cart: <ShoppingCartIcon className="size-4" />,
  rocket: <RocketLaunchIcon className="size-4" />,
  magnify: <MagnifyingGlassIcon className="size-4" />,
  beaker: <BeakerIcon className="size-4" />,
  chart: <ChartBarIcon className="size-4" />,
  clipboard: <ClipboardDocumentListIcon className="size-4" />,
  calendar: <CalendarDaysIcon className="size-4" />,
  banknotes: <BanknotesIcon className="size-4" />,
  check: <CheckBadgeIcon className="size-4" />,
  bolt: <BoltIcon className="size-4" />,
  chat: <ChatBubbleLeftRightIcon className="size-4" />,
  shield: <ShieldCheckIcon className="size-4" />,
};

const categoryLabels: Record<string, string> = {
  design: "DESIGN",
  development: "DEVELOPMENT",
  cro: "CRO",
  operations: "OPERATIONS",
  qa: "QA",
  client: "CLIENT",
};

const categoryColors: Record<string, string> = {
  design: "#8B5CF6",
  development: "#10B981",
  cro: "#EF4444",
  operations: "#3B82F6",
  qa: "#F59E0B",
  client: "#EC4899",
};

const categoryOrder: OpsWikiModule["category"][] = ["design", "development", "cro", "operations", "qa", "client"];

export default function OpsWikiClient({ modules }: { modules: OpsWikiModule[] }) {
  const searchParams = useSearchParams();
  const [activeSlug, setActiveSlug] = useState(modules[0]?.slug || "");

  useEffect(() => {
    const section = searchParams.get("section");
    if (section && modules.some((m) => m.slug === section)) {
      setActiveSlug(section);
    }
  }, [searchParams, modules]);

  const [searchQuery, setSearchQuery] = useState("");
  const [navOpen, setNavOpen] = useState(true);

  const active = modules.find((m) => m.slug === activeSlug) || modules[0];

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const results: { module: string; slug: string; line: string; heading: string }[] = [];
    for (const m of modules) {
      let currentHeading = m.shortTitle;
      for (const line of m.content.split("\n")) {
        if (line.startsWith("## ") || line.startsWith("### ")) {
          currentHeading = line.replace(/^#+\s*/, "");
        }
        if (line.toLowerCase().includes(q)) {
          results.push({ module: m.shortTitle, slug: m.slug, line: line.trim(), heading: currentHeading });
          if (results.length >= 20) return results;
        }
      }
    }
    return results;
  }, [searchQuery, modules]);

  const grouped = categoryOrder.reduce((acc, cat) => {
    const items = modules.filter((m) => m.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {} as Record<string, OpsWikiModule[]>);

  const isExternalLink = (href?: string) => href?.startsWith("http");

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Sidebar */}
      {navOpen && (
        <aside className="w-56 shrink-0 border-r border-[#F0F0F0] overflow-y-auto py-4 px-3">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} className="mb-5">
              <p className="text-[10px] font-semibold uppercase tracking-wider px-2 mb-2" style={{ color: categoryColors[cat] || "#BBB" }}>
                {categoryLabels[cat] || cat}
              </p>
              {items.map((m) => (
                <button
                  key={m.slug}
                  onClick={() => setActiveSlug(m.slug)}
                  className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs transition-colors mb-0.5 ${
                    activeSlug === m.slug
                      ? "bg-[#F0F0F0] text-[#1B1B1B] font-medium"
                      : "text-[#666] hover:bg-[#FAFAFA] hover:text-[#1B1B1B]"
                  }`}
                >
                  <span className="shrink-0 text-[#999]">{iconMap[m.icon] || <ChevronRightIcon className="size-4" />}</span>
                  <span className="truncate">{m.shortTitle}</span>
                  {m.toolHref && <WrenchScrewdriverIcon className="size-3 text-[#CCC] ml-auto shrink-0" />}
                </button>
              ))}
            </div>
          ))}
        </aside>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <header className="shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-[#F0F0F0]">
          <button
            onClick={() => setNavOpen(!navOpen)}
            className="text-[#999] hover:text-[#1B1B1B] text-xs"
          >
            {navOpen ? "\u2190" : "\u2192"}
          </button>

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#CCC]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search all processes..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#E5E5EA] rounded-lg focus:outline-none focus:border-[#1B1B1B]"
            />
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E5E5EA] rounded-lg shadow-lg max-h-72 overflow-y-auto z-50">
                {searchResults.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => { setActiveSlug(r.slug); setSearchQuery(""); }}
                    className="block w-full text-left px-3 py-2 text-xs hover:bg-[#FAFAFA] border-b border-[#F8F8F8] last:border-0"
                  >
                    <span className="font-medium text-[#1B1B1B]">{r.module}</span>
                    <span className="mx-1 text-[#DDD]">/</span>
                    <span className="text-[#666]">{r.heading}</span>
                    <p className="text-[#999] truncate mt-0.5">{r.line}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Active module badge */}
          {active && (
            <div className="flex items-center gap-2 ml-auto">
              <span
                className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                style={{
                  color: categoryColors[active.category],
                  backgroundColor: categoryColors[active.category] + "15",
                }}
              >
                {categoryLabels[active.category]}
              </span>
              <span className="text-xs text-[#CCC]">{active.title}</span>
            </div>
          )}
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-6 md:px-12 py-8">
          <div className="max-w-3xl mx-auto">
            {/* Tool link */}
            {active.toolHref && (
              isExternalLink(active.toolHref) ? (
                <a
                  href={active.toolHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 mb-6 bg-[#F8F8F8] border border-[#E5E5EA] rounded-lg text-xs text-[#666] hover:bg-[#F0F0F0] hover:text-[#1B1B1B] transition-colors"
                >
                  <ArrowTopRightOnSquareIcon className="size-4" />
                  <span>Open {active.shortTitle} in Figma</span>
                  <ChevronRightIcon className="size-3 ml-auto" />
                </a>
              ) : (
                <Link
                  href={active.toolHref}
                  className="flex items-center gap-2 px-4 py-2.5 mb-6 bg-[#F8F8F8] border border-[#E5E5EA] rounded-lg text-xs text-[#666] hover:bg-[#F0F0F0] hover:text-[#1B1B1B] transition-colors"
                >
                  <WrenchScrewdriverIcon className="size-4" />
                  <span>Open {active.shortTitle} tool in Launchpad</span>
                  <ChevronRightIcon className="size-3 ml-auto" />
                </Link>
              )
            )}

            <article className="prose prose-sm max-w-none prose-headings:text-[#1B1B1B] prose-p:text-[#444] prose-strong:text-[#1B1B1B] prose-a:text-blue-600 prose-table:text-xs prose-th:text-[#999] prose-th:font-medium prose-th:uppercase prose-th:tracking-wider prose-th:text-[10px] prose-td:py-2 prose-blockquote:border-blue-400 prose-blockquote:bg-blue-50 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:text-blue-900 prose-code:bg-[#F5F5F5] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[#1B1B1B] prose-code:font-mono prose-code:text-xs prose-pre:bg-[#1B1B1B] prose-pre:text-[#E5E5EA] prose-li:text-[#444]">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{active.content}</ReactMarkdown>
            </article>
          </div>
        </main>
      </div>
    </div>
  );
}
