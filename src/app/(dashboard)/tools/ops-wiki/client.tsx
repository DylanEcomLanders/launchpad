"use client";

import { useState, useMemo, useEffect, Children, Fragment, isValidElement, type ReactElement, type ReactNode } from "react";
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
  InboxStackIcon,
  MapIcon,
  PhoneIcon,
  TableCellsIcon,
  CalculatorIcon,
  PresentationChartBarIcon,
  MegaphoneIcon,
} from "@heroicons/react/24/outline";

interface OpsWikiModule {
  slug: string;
  title: string;
  shortTitle: string;
  icon: string;
  content: string;
  category: "flow" | "design" | "development" | "cro" | "operations" | "qa" | "client";
  toolHref?: string;
  subGroup?: string;
}

const iconMap: Record<string, React.ReactNode> = {
  inbox: <InboxStackIcon className="size-4" />,
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
  map: <MapIcon className="size-4" />,
  phone: <PhoneIcon className="size-4" />,
  grid: <TableCellsIcon className="size-4" />,
  calculator: <CalculatorIcon className="size-4" />,
  presentation: <PresentationChartBarIcon className="size-4" />,
  megaphone: <MegaphoneIcon className="size-4" />,
};

const categoryLabels: Record<string, string> = {
  flow: "PROJECT FLOWS",
  design: "DESIGN",
  development: "DEVELOPMENT",
  cro: "CRO",
  operations: "OPERATIONS",
  qa: "QA",
  client: "CLIENT",
};

const categoryColors: Record<string, string> = {
  flow: "#1B1B1B",
  design: "#8B5CF6",
  development: "#10B981",
  cro: "#EF4444",
  operations: "#3B82F6",
  qa: "#F59E0B",
  client: "#EC4899",
};

const categoryOrder: OpsWikiModule["category"][] = ["flow", "design", "development", "cro", "operations", "qa", "client"];

function extractText(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    return extractText(el.props.children);
  }
  return "";
}

function AssemblyLine({ text }: { text: string }) {
  const steps = text
    .replace(/\n/g, " ")
    .split("→")
    .map((s) => s.trim())
    .filter(Boolean);
  return (
    <div className="not-prose my-6 flex flex-wrap items-center gap-x-2 gap-y-2 rounded-lg border border-[#2A2A2A] bg-[#0C0C0C] p-4">
      {steps.map((step, i) => {
        const isGate = step.includes("🚧");
        const cleaned = step.replace("🚧", "").trim();
        return (
          <Fragment key={i}>
            <span
              className={
                isGate
                  ? "inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-amber-900"
                  : "inline-flex items-center rounded-md border border-[#2A2A2A] bg-[#181818] px-3 py-1.5 text-xs font-medium text-[#E5E5EA]"
              }
            >
              {isGate && <span aria-hidden>🚧</span>}
              <span>{cleaned}</span>
            </span>
            {i < steps.length - 1 && <span className="text-[#71757D]" aria-hidden>→</span>}
          </Fragment>
        );
      })}
    </div>
  );
}

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
  const [ceOpen, setCeOpen] = useState(() => modules[0]?.slug.startsWith("ce-") || false);

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
    <div className="flex h-screen bg-[#181818] overflow-hidden">
      {/* Sidebar */}
      {navOpen && (
        <aside className="w-56 shrink-0 border-r border-[#2A2A2A] overflow-y-auto py-4 px-3">
          {Object.entries(grouped).map(([cat, items]) => {
            // Split flow items: regular flows vs ce-* (conversion engine children)
            const isFlow = cat === "flow";
            const flowItems = isFlow ? items.filter((m) => !m.slug.startsWith("ce-")) : items;
            const ceItems = isFlow ? items.filter((m) => m.slug.startsWith("ce-")) : [];

            return (
              <div key={cat} className="mb-5">
                <p className="text-[10px] font-semibold uppercase tracking-wider px-2 mb-2" style={{ color: categoryColors[cat] || "#BBB" }}>
                  {categoryLabels[cat] || cat}
                </p>
                {flowItems.map((m) => {
                  // Render the Conversion Engine flow item as a dropdown trigger
                  if (m.slug === "flow-04-conversion-engine" && ceItems.length > 0) {
                    const isCeActive = activeSlug.startsWith("ce-") || activeSlug === m.slug;
                    return (
                      <div key={m.slug}>
                        <button
                          onClick={() => {
                            setCeOpen(!ceOpen);
                            if (!ceOpen) setActiveSlug(m.slug);
                          }}
                          className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs transition-colors mb-0.5 ${
                            isCeActive
                              ? "bg-[#222222] text-[#E5E5EA] font-medium"
                              : "text-[#9CA3AF] hover:bg-[#0C0C0C] hover:text-[#E5E5EA]"
                          }`}
                        >
                          <span className="shrink-0 text-[#71757D]">{iconMap[m.icon] || <ChevronRightIcon className="size-4" />}</span>
                          <span className="truncate">{m.shortTitle}</span>
                          <ChevronRightIcon className={`size-3 text-[#C7C9CD] ml-auto shrink-0 transition-transform duration-200 ${ceOpen ? "rotate-90" : ""}`} />
                        </button>
                        {ceOpen && (
                          <div className="ml-4 pl-2 mb-1 border-l border-[#2A2A2A]">
                            {ceItems.map((ce, i) => {
                              const prevGroup = i > 0 ? ceItems[i - 1].subGroup : undefined;
                              const showGroupHeader = ce.subGroup && ce.subGroup !== prevGroup;
                              return (
                                <div key={ce.slug}>
                                  {showGroupHeader && (
                                    <p className="text-[9px] font-semibold uppercase tracking-wider text-[#9CA3AF] px-2 mt-3 mb-1">
                                      {ce.subGroup}
                                    </p>
                                  )}
                                  <button
                                    onClick={() => setActiveSlug(ce.slug)}
                                    className={`flex items-center gap-2 w-full px-2 py-1 rounded-lg text-[11px] transition-colors mb-0.5 ${
                                      activeSlug === ce.slug
                                        ? "bg-[#222222] text-[#E5E5EA] font-medium"
                                        : "text-[#9CA3AF] hover:bg-[#0C0C0C] hover:text-[#E5E5EA]"
                                    }`}
                                  >
                                    <span className="shrink-0 text-[#9CA3AF]">{iconMap[ce.icon] || <ChevronRightIcon className="size-3" />}</span>
                                    <span className="truncate">{ce.shortTitle}</span>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <button
                      key={m.slug}
                      onClick={() => setActiveSlug(m.slug)}
                      className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs transition-colors mb-0.5 ${
                        activeSlug === m.slug
                          ? "bg-[#222222] text-[#E5E5EA] font-medium"
                          : "text-[#9CA3AF] hover:bg-[#0C0C0C] hover:text-[#E5E5EA]"
                      }`}
                    >
                      <span className="shrink-0 text-[#71757D]">{iconMap[m.icon] || <ChevronRightIcon className="size-4" />}</span>
                      <span className="truncate">{m.shortTitle}</span>
                      {m.toolHref && <WrenchScrewdriverIcon className="size-3 text-[#C7C9CD] ml-auto shrink-0" />}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </aside>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <header className="shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-[#2A2A2A]">
          <button
            onClick={() => setNavOpen(!navOpen)}
            className="text-[#71757D] hover:text-[#E5E5EA] text-xs"
          >
            {navOpen ? "\u2190" : "\u2192"}
          </button>

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#C7C9CD]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search all processes..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#2A2A2A] rounded-lg focus:outline-none focus:border-[#C5C5C5]"
            />
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#181818] border border-[#2A2A2A] rounded-lg shadow-lg max-h-72 overflow-y-auto z-50">
                {searchResults.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => { setActiveSlug(r.slug); setSearchQuery(""); }}
                    className="block w-full text-left px-3 py-2 text-xs hover:bg-[#0C0C0C] border-b border-[#F8F8F8] last:border-0"
                  >
                    <span className="font-medium text-[#E5E5EA]">{r.module}</span>
                    <span className="mx-1 text-[#C7C9CD]">/</span>
                    <span className="text-[#9CA3AF]">{r.heading}</span>
                    <p className="text-[#71757D] truncate mt-0.5">{r.line}</p>
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
              <span className="text-xs text-[#C7C9CD]">{active.title}</span>
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
                  className="flex items-center gap-2 px-4 py-2.5 mb-6 bg-[#222222] border border-[#2A2A2A] rounded-lg text-xs text-[#9CA3AF] hover:bg-[#222222] hover:text-[#E5E5EA] transition-colors"
                >
                  <ArrowTopRightOnSquareIcon className="size-4" />
                  <span>Open {active.shortTitle} in Figma</span>
                  <ChevronRightIcon className="size-3 ml-auto" />
                </a>
              ) : (
                <Link
                  href={active.toolHref}
                  className="flex items-center gap-2 px-4 py-2.5 mb-6 bg-[#222222] border border-[#2A2A2A] rounded-lg text-xs text-[#9CA3AF] hover:bg-[#222222] hover:text-[#E5E5EA] transition-colors"
                >
                  <WrenchScrewdriverIcon className="size-4" />
                  <span>Open {active.shortTitle} tool in Launchpad</span>
                  <ChevronRightIcon className="size-3 ml-auto" />
                </Link>
              )
            )}

            <article className="prose prose-sm max-w-none prose-headings:text-[#E5E5EA] prose-p:text-[#C7C9CD] prose-strong:text-[#E5E5EA] prose-a:text-blue-600 prose-table:text-xs prose-th:text-[#71757D] prose-th:font-medium prose-th:uppercase prose-th:tracking-wider prose-th:text-[10px] prose-td:py-2 prose-blockquote:border-blue-400 prose-blockquote:bg-blue-900/20 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:text-blue-300 prose-code:bg-[#222222] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[#E5E5EA] prose-code:font-mono prose-code:text-xs prose-pre:bg-[#1B1B1B] prose-pre:text-[#E5E5EA] prose-li:text-[#C7C9CD]">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  pre: ({ children }) => {
                    const text = extractText(children);
                    if (text.includes("→")) return <AssemblyLine text={text} />;
                    return <pre>{children}</pre>;
                  },
                }}
              >
                {active.content}
              </ReactMarkdown>
            </article>
          </div>
        </main>
      </div>
    </div>
  );
}
