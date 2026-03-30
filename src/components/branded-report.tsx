"use client";

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
  return (
    <div className="bg-white rounded-xl border border-[#E5E5EA] shadow-sm overflow-hidden">
      {showHeader && (
        <div className="px-8 pt-8 pb-6 border-b border-[#E5E5EA]">
          <div className="flex items-center justify-between mb-6">
            <Logo height={18} className="text-[#1B1B1B]" />
            <span className="text-xs text-[#999] font-medium">{formatDate(date)}</span>
          </div>
          <h1 className="text-2xl font-bold text-[#1B1B1B] leading-tight">{title}</h1>
        </div>
      )}
      <div
        className="px-8 py-6 prose prose-sm max-w-none
          prose-headings:text-[#1B1B1B] prose-headings:font-semibold
          prose-h1:text-xl prose-h1:mt-6 prose-h1:mb-3
          prose-h2:text-lg prose-h2:mt-5 prose-h2:mb-2
          prose-h3:text-base prose-h3:mt-4 prose-h3:mb-2
          prose-p:text-[#444] prose-p:leading-relaxed prose-p:text-[13px]
          prose-li:text-[#444] prose-li:text-[13px]
          prose-strong:text-[#1B1B1B]
          prose-table:text-[13px]
          prose-th:bg-[#F7F8FA] prose-th:text-[#1B1B1B] prose-th:font-semibold prose-th:px-3 prose-th:py-2 prose-th:text-left
          prose-td:px-3 prose-td:py-2 prose-td:border-b prose-td:border-[#E5E5EA]
          prose-a:text-[#1B1B1B] prose-a:underline prose-a:underline-offset-2
          prose-img:rounded-lg prose-img:border prose-img:border-[#E5E5EA]"
        dangerouslySetInnerHTML={{ __html: content }}
      />
      <div className="px-8 py-4 border-t border-[#E5E5EA] bg-[#FAFAFA]">
        <div className="flex items-center gap-2">
          <Logo height={12} className="text-[#C5C5C5]" />
          <span className="text-[10px] text-[#C5C5C5]">Weekly CRO Report</span>
        </div>
      </div>
    </div>
  );
}
