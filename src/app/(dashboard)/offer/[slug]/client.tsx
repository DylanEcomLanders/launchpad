"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import { DeckBuilderInline } from "@/components/deck-builder-inline";
import { EditableSectionedDoc } from "@/components/offer-engine/editable-sectioned-doc";

interface ModuleData {
  slug: string;
  title: string;
  shortTitle: string;
  content: string;
  toolHref?: string;
}

interface NavRef {
  slug: string;
  shortTitle: string;
}

export default function OfferSectionClient({
  module,
  prev,
  next,
}: {
  module: ModuleData;
  prev: NavRef | null;
  next: NavRef | null;
}) {
  const isEditableDoc = module.slug === "08-faq" || module.slug === "09-objections";

  return (
    <div className="px-6 py-6 max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <nav className="mb-5 flex items-center gap-2 text-[11px] text-[#71757D]">
        <Link href="/offer" className="hover:text-[#E5E5EA] transition-colors">
          Conversion Engine
        </Link>
        <ChevronRightIcon className="size-3 text-[#C7C9CD]" />
        <span className="text-[#9CA3AF]">{module.shortTitle}</span>
      </nav>

      {/* Title — hidden for editable docs (they render their own title) */}
      {!isEditableDoc && (
        <header className="mb-5 border-b border-[#2A2A2A] pb-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#71757D]">
            Internal · Sales Hub
          </p>
          <h1 className="text-[28px] font-semibold text-[#E5E5EA] mt-1">
            {module.title}
          </h1>
        </header>
      )}
      {isEditableDoc && (
        <header className="mb-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
            Internal · Sales Hub
          </p>
        </header>
      )}

      {/* Inline tools */}
      {module.slug === "06-slide-deck" && <DeckBuilderInline />}
      {module.toolHref && module.slug !== "06-slide-deck" && (
        <Link
          href={module.toolHref}
          className="flex items-center gap-2 px-4 py-2.5 mb-6 bg-[#222222] border border-[#2A2A2A] rounded-lg text-xs text-[#9CA3AF] hover:bg-[#222222] hover:text-[#E5E5EA] transition-colors"
        >
          <WrenchScrewdriverIcon className="size-4" />
          <span>Open {module.shortTitle} tool</span>
          <ChevronRightIcon className="size-3 ml-auto" />
        </Link>
      )}

      {/* Content */}
      {isEditableDoc ? (
        <EditableSectionedDoc
          pageKey={module.slug === "08-faq" ? "faq" : "objections"}
          defaultContent={module.content}
          sectionLevel={module.slug === "08-faq" ? 3 : 2}
        />
      ) : (
        <article className="prose prose-sm max-w-none prose-headings:text-[#E5E5EA] prose-p:text-[#C7C9CD] prose-strong:text-[#E5E5EA] prose-a:text-blue-600 prose-table:text-xs prose-th:text-[#71757D] prose-th:font-medium prose-th:uppercase prose-th:tracking-wider prose-th:text-[10px] prose-td:py-2 prose-blockquote:border-amber-400 prose-blockquote:bg-amber-500/10 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:text-amber-900 prose-code:bg-[#222222] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[#E5E5EA] prose-code:font-mono prose-code:text-xs prose-pre:bg-[#1B1B1B] prose-pre:text-[#E5E5EA]">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{module.content}</ReactMarkdown>
        </article>
      )}

      {/* Prev / next */}
      <nav className="mt-10 pt-5 border-t border-[#2A2A2A] flex items-center justify-between gap-3">
        {prev ? (
          <Link
            href={`/offer/${prev.slug}`}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#2A2A2A] hover:border-white transition-colors text-[12px] text-[#9CA3AF] hover:text-[#E5E5EA]"
          >
            <ChevronLeftIcon className="size-3.5" />
            <span>
              <span className="text-[10px] uppercase tracking-wider text-[#71757D] block leading-none mb-0.5">
                Previous
              </span>
              {prev.shortTitle}
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/offer/${next.slug}`}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#2A2A2A] hover:border-white transition-colors text-[12px] text-[#9CA3AF] hover:text-[#E5E5EA] text-right"
          >
            <span>
              <span className="text-[10px] uppercase tracking-wider text-[#71757D] block leading-none mb-0.5">
                Next
              </span>
              {next.shortTitle}
            </span>
            <ChevronRightIcon className="size-3.5" />
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
