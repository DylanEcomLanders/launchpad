"use client";

import { useState } from "react";
import { pdf, type DocumentProps } from "@react-pdf/renderer";
import { ArrowDownTrayIcon, CheckIcon } from "@heroicons/react/24/solid";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import type { ReactElement } from "react";

interface PdfPreviewProps {
  document: ReactElement<DocumentProps>;
  filename: string;
  label: string;
  description: string;
  details: string;
}

export function PdfPreview({
  document: pdfDocument,
  filename,
  label,
  description,
  details,
}: PdfPreviewProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const blob = await pdf(pdfDocument).toBlob();
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = filename;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 3000);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="bg-[#EDEDEF] border border-[#E5E5EA] rounded-lg p-8">
      <div className="flex items-start gap-4">
        <div className="p-2.5 bg-white rounded-md border border-[#E5E5EA]">
          <CheckIcon className="size-5 text-[#1B1B1B]" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold mb-1">{label} Ready</h3>
          <p className="text-xs text-[#7A7A7A] mb-1">{description}</p>
          <p className="text-xs text-[#A0A0A0]">{details}</p>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#1B1B1B] text-white text-sm font-medium rounded-md hover:bg-accent-hover transition-colors disabled:opacity-40"
        >
          {downloading ? (
            <>
              <ArrowPathIcon className="size-3.5 animate-spin" />
              Generating...
            </>
          ) : downloaded ? (
            <>
              <CheckIcon className="size-3.5" />
              Downloaded
            </>
          ) : (
            <>
              <ArrowDownTrayIcon className="size-3.5" />
              Download PDF
            </>
          )}
        </button>
      </div>
    </div>
  );
}
