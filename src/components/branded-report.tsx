"use client";

import { useMemo } from "react";
import DOMPurify from "isomorphic-dompurify";
import { Logo } from "@/components/logo";

interface BrandedReportProps {
  title: string;
  date: string;
  content: string;
  showHeader?: boolean;
}

function formatDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function BrandedReport({ title, date, content, showHeader = true }: BrandedReportProps) {
  /* Sanitize before render: `content` is HTML produced by mammoth from an
   * uploaded .docx and shown on the public /portal/[token] route, so an
   * unsanitized render is a stored-XSS vector. */
  const safeContent = useMemo(() => DOMPurify.sanitize(content), [content]);
  return (
    <div className="bg-[#181818] rounded-xl border border-[#2A2A2A] shadow-sm overflow-hidden">
      {showHeader && (
        <div className="px-8 pt-8 pb-6 border-b border-[#2A2A2A]">
          <div className="flex items-center justify-between mb-6">
            <Logo height={18} className="text-[#E5E5EA]" />
            <span className="text-xs text-[#71757D] font-medium">{formatDate(date)}</span>
          </div>
          <h1 className="text-2xl font-bold text-[#E5E5EA] leading-tight">{title}</h1>
        </div>
      )}
      <div
        className="px-8 py-6 prose prose-sm max-w-none
          prose-headings:text-[#E5E5EA] prose-headings:font-semibold
          prose-h1:text-xl prose-h1:mt-6 prose-h1:mb-3
          prose-h2:text-lg prose-h2:mt-5 prose-h2:mb-2
          prose-h3:text-base prose-h3:mt-4 prose-h3:mb-2
          prose-p:text-[#C7C9CD] prose-p:leading-relaxed prose-p:text-[13px]
          prose-li:text-[#C7C9CD] prose-li:text-[13px]
          prose-strong:text-[#E5E5EA]
          prose-table:text-[13px]
          prose-th:bg-[#0C0C0C] prose-th:text-[#E5E5EA] prose-th:font-semibold prose-th:px-3 prose-th:py-2 prose-th:text-left
          prose-td:px-3 prose-td:py-2 prose-td:border-b prose-td:border-[#2A2A2A]
          prose-a:text-[#E5E5EA] prose-a:underline prose-a:underline-offset-2
          prose-img:rounded-lg prose-img:border prose-img:border-[#2A2A2A]"
        dangerouslySetInnerHTML={{ __html: safeContent }}
      />
      <div className="px-8 py-4 border-t border-[#2A2A2A] bg-[#0C0C0C]">
        <div className="flex items-center gap-2">
          <Logo height={12} className="text-[#C5C5C5]" />
          <span className="text-[10px] text-[#C5C5C5]">Weekly CRO Report</span>
        </div>
      </div>
    </div>
  );
}
