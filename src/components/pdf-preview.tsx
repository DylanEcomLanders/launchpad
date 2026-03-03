"use client";

import { useState } from "react";
import { pdf, type DocumentProps } from "@react-pdf/renderer";
import { FileDown, Loader2, Check } from "lucide-react";
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
    <div className="bg-[#F0F0F0] border border-[#E5E5E5] rounded-lg p-8">
      <div className="flex items-start gap-4">
        <div className="p-2.5 bg-white rounded-md border border-[#E5E5E5]">
          <Check size={20} className="text-[#0A0A0A]" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold mb-1">{label} Ready</h3>
          <p className="text-xs text-[#6B6B6B] mb-1">{description}</p>
          <p className="text-xs text-[#AAAAAA]">{details}</p>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#0A0A0A] text-white text-sm font-medium rounded-md hover:bg-[#2A2A2A] transition-colors disabled:opacity-40"
        >
          {downloading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Generating...
            </>
          ) : downloaded ? (
            <>
              <Check size={14} />
              Downloaded
            </>
          ) : (
            <>
              <FileDown size={14} />
              Download PDF
            </>
          )}
        </button>
      </div>
    </div>
  );
}
