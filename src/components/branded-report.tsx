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
    <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
      {showHeader && (
        <div className="px-8 pt-8 pb-6 border-b border-border">
          <div className="flex items-center justify-between mb-6">
            <Logo height={18} className="text-foreground" />
            <span className="text-xs text-subtle font-medium">{formatDate(date)}</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground leading-tight">{title}</h1>
        </div>
      )}
      <div
        className="px-8 py-6 prose prose-sm max-w-none
          prose-headings:text-foreground prose-headings:font-semibold
          prose-h1:text-xl prose-h1:mt-6 prose-h1:mb-3
          prose-h2:text-lg prose-h2:mt-5 prose-h2:mb-2
          prose-h3:text-base prose-h3:mt-4 prose-h3:mb-2
          prose-p:text-muted prose-p:leading-relaxed prose-p:text-[13px]
          prose-li:text-muted prose-li:text-[13px]
          prose-strong:text-foreground
          prose-table:text-[13px]
          prose-th:bg-background prose-th:text-foreground prose-th:font-semibold prose-th:px-3 prose-th:py-2 prose-th:text-left
          prose-td:px-3 prose-td:py-2 prose-td:border-b prose-td:border-border
          prose-a:text-foreground prose-a:underline prose-a:underline-offset-2
          prose-img:rounded-lg prose-img:border prose-img:border-border"
        dangerouslySetInnerHTML={{ __html: safeContent }}
      />
      <div className="px-8 py-4 border-t border-border bg-background">
        <div className="flex items-center gap-2">
          <Logo height={12} className="text-muted" />
          <span className="text-[10px] text-muted">Weekly CRO Report</span>
        </div>
      </div>
    </div>
  );
}
