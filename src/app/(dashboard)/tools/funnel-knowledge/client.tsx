"use client";

import { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  MapIcon,
  SignalIcon,
  HomeIcon,
  CubeIcon,
  ShoppingCartIcon,
  CreditCardIcon,
  InboxIcon,
  ArrowPathIcon,
  ChartBarIcon,
  CheckCircleIcon,
  BeakerIcon,
  BookOpenIcon,
  MagnifyingGlassIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import {
  CursorArrowRaysIcon,
  Square3Stack3DIcon,
  InboxStackIcon,
} from "@heroicons/react/24/outline";

interface FunnelModule {
  slug: string;
  title: string;
  shortTitle: string;
  layer: string;
  icon: string;
  content: string;
  category: "layer" | "reference";
}

const iconMap: Record<string, React.ReactNode> = {
  map: <MapIcon className="size-4" />,
  signal: <SignalIcon className="size-4" />,
  target: <CursorArrowRaysIcon className="size-4" />,
  home: <HomeIcon className="size-4" />,
  cube: <CubeIcon className="size-4" />,
  cart: <ShoppingCartIcon className="size-4" />,
  "credit-card": <CreditCardIcon className="size-4" />,
  inbox: <InboxIcon className="size-4" />,
  refresh: <ArrowPathIcon className="size-4" />,
  stack: <Square3Stack3DIcon className="size-4" />,
  chart: <ChartBarIcon className="size-4" />,
  check: <CheckCircleIcon className="size-4" />,
  beaker: <BeakerIcon className="size-4" />,
  book: <BookOpenIcon className="size-4" />,
};

type ViewMode = "full" | "audit" | "tests";

function filterContent(content: string, mode: ViewMode): string {
  if (mode === "full") return content;

  const lines = content.split("\n");
  const sections: { heading: string; body: string[] }[] = [];
  let currentHeading = "";
  let currentBody: string[] = [];

  for (const line of lines) {
    if (line.startsWith("## ") || line.startsWith("### ")) {
      if (currentHeading || currentBody.length) {
        sections.push({ heading: currentHeading, body: [...currentBody] });
      }
      currentHeading = line;
      currentBody = [];
    } else {
      currentBody.push(line);
    }
  }
  if (currentHeading || currentBody.length) {
    sections.push({ heading: currentHeading, body: [...currentBody] });
  }

  const keyword = mode === "audit" ? /audit|checklist|question/i : /test|hypothes|experiment/i;
  const matched = sections.filter((s) => keyword.test(s.heading));

  if (matched.length === 0) {
    return mode === "audit"
      ? "No audit content found in this module."
      : "No test hypotheses found in this module.";
  }

  return matched.map((s) => `${s.heading}\n${s.body.join("\n")}`).join("\n\n");
}

export default function FunnelKnowledgeClient({
  modules,
}: {
  modules: FunnelModule[];
}) {
  const [activeSlug, setActiveSlug] = useState("00-overview");
  const [viewMode, setViewMode] = useState<ViewMode>("full");
  const [searchQuery, setSearchQuery] = useState("");
  const [navOpen, setNavOpen] = useState(true);

  const layers = modules.filter((m) => m.category === "layer");
  const refs = modules.filter((m) => m.category === "reference");
  const activeModule = modules.find((m) => m.slug === activeSlug) || modules[0];

  const displayContent = useMemo(
    () => filterContent(activeModule.content, viewMode),
    [activeModule.content, viewMode]
  );

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    const lines = activeModule.content.split("\n");
    const results: { text: string; heading: string }[] = [];
    let lastHeading = "";
    for (const line of lines) {
      if (line.startsWith("#")) lastHeading = line.replace(/^#+\s*/, "");
      if (line.toLowerCase().includes(q)) {
        results.push({ text: line.trim(), heading: lastHeading });
      }
    }
    return results.slice(0, 15);
  }, [activeModule.content, searchQuery]);

  return (
    <div className="flex h-full">
      {/* Internal sub-nav */}
      <div
        className={`border-r border-[#E5E5EA] bg-[#FAFAFA] flex-shrink-0 overflow-y-auto transition-all duration-200 ${
          navOpen ? "w-52" : "w-0 overflow-hidden"
        }`}
      >
        <div className="p-3 pb-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#A0A0A0] px-2">
            Funnel Layers
          </h2>
        </div>
        <div className="px-2 pb-2">
          {layers.map((m) => {
            const isActive = activeSlug === m.slug;
            return (
              <button
                key={m.slug}
                onClick={() => {
                  setActiveSlug(m.slug);
                  setViewMode("full");
                  setSearchQuery("");
                }}
                className={`flex items-center gap-2 w-full px-2.5 py-[6px] text-[13px] rounded-md transition-all duration-150 text-left ${
                  isActive
                    ? "text-[#1B1B1B] font-medium bg-white shadow-[var(--shadow-soft)]"
                    : "text-[#7A7A7A] hover:text-[#1B1B1B] hover:bg-white/50"
                }`}
              >
                <span className="flex-shrink-0 text-[#A0A0A0]">
                  {iconMap[m.icon]}
                </span>
                <span className="truncate">
                  {m.layer !== "0" && (
                    <span className="text-[#C5C5C5] text-[11px] font-mono mr-1">
                      {m.layer}.
                    </span>
                  )}
                  {m.shortTitle}
                </span>
              </button>
            );
          })}
        </div>

        <div className="p-3 pb-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#A0A0A0] px-2">
            Reference
          </h2>
        </div>
        <div className="px-2 pb-4">
          {refs.map((m) => {
            const isActive = activeSlug === m.slug;
            return (
              <button
                key={m.slug}
                onClick={() => {
                  setActiveSlug(m.slug);
                  setViewMode("full");
                  setSearchQuery("");
                }}
                className={`flex items-center gap-2 w-full px-2.5 py-[6px] text-[13px] rounded-md transition-all duration-150 text-left ${
                  isActive
                    ? "text-[#1B1B1B] font-medium bg-white shadow-[var(--shadow-soft)]"
                    : "text-[#7A7A7A] hover:text-[#1B1B1B] hover:bg-white/50"
                }`}
              >
                <span className="flex-shrink-0 text-[#A0A0A0]">
                  {iconMap[m.icon]}
                </span>
                <span className="truncate">{m.shortTitle}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {/* Toolbar */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-[#E5E5EA] px-6 py-3">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Nav toggle */}
            <button
              onClick={() => setNavOpen(!navOpen)}
              className="p-1.5 rounded-lg hover:bg-[#F3F3F5] transition-colors"
              title={navOpen ? "Hide navigation" : "Show navigation"}
            >
              <ChevronRightIcon
                className={`size-4 text-[#7A7A7A] transition-transform duration-200 ${
                  navOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Mode switcher */}
            <div className="flex gap-0.5 bg-[#F3F3F5] rounded-lg p-0.5">
              {(
                [
                  { key: "full", label: "Full" },
                  { key: "audit", label: "Audit" },
                  { key: "tests", label: "Tests" },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setViewMode(key)}
                  className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-all duration-150 ${
                    viewMode === key
                      ? "bg-white text-[#1B1B1B] shadow-[var(--shadow-soft)]"
                      : "text-[#7A7A7A] hover:text-[#1B1B1B]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <MagnifyingGlassIcon className="absolute left-2.5 top-2 size-4 text-[#C5C5C5]" />
              <input
                type="text"
                placeholder="Search this module..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-[13px] border border-[#E5E5EA] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#1B1B1B]/10 focus:border-[#1B1B1B]/20 placeholder:text-[#C5C5C5]"
              />
            </div>

            {/* Current module title */}
            <span className="text-[12px] text-[#A0A0A0] hidden lg:block ml-auto">
              {activeModule.title}
            </span>
          </div>

          {/* Search results dropdown */}
          {searchResults && searchResults.length > 0 && (
            <div className="mt-2 p-2 bg-white border border-[#E5E5EA] rounded-lg max-h-40 overflow-y-auto shadow-[var(--shadow-card)]">
              <p className="text-[11px] text-[#A0A0A0] mb-1 px-1">
                {searchResults.length} matches
              </p>
              {searchResults.map((r, i) => (
                <div
                  key={i}
                  className="text-[12px] py-1 px-1 border-b border-[#F3F3F5] last:border-0"
                >
                  <span className="text-[11px] text-[#7A7A7A] font-medium">
                    {r.heading}
                  </span>
                  <p className="text-[#1B1B1B] truncate">{r.text}</p>
                </div>
              ))}
            </div>
          )}
          {searchResults && searchResults.length === 0 && searchQuery.trim() && (
            <div className="mt-2 p-2 bg-white border border-[#E5E5EA] rounded-lg">
              <p className="text-[12px] text-[#A0A0A0]">
                No results for &ldquo;{searchQuery}&rdquo;
              </p>
            </div>
          )}
        </div>

        {/* Markdown content */}
        <div className="max-w-3xl mx-auto px-6 md:px-10 py-8">
          <article className="funnel-prose">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {displayContent}
            </ReactMarkdown>
          </article>
        </div>
      </div>
    </div>
  );
}
