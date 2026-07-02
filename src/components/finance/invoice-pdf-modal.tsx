"use client";

import { useEffect, useRef, useState } from "react";
import { pdf, type DocumentProps } from "@react-pdf/renderer";
import {
  XMarkIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import type { ReactElement } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  document: ReactElement<DocumentProps> | null;
  filename: string;
  title?: string;
}

/* Modal that renders an @react-pdf/renderer Document into a blob URL
 * and shows it in an iframe with a Download button. Used by the invoice
 * detail page for the "Preview invoice" action and as the auto-popup
 * after a successful edit save (so the founder can grab the updated
 * PDF straight away). */
export function InvoicePdfModal({
  open,
  onClose,
  document: doc,
  filename,
  title = "Invoice preview",
}: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState("");
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open || !doc) return;
    let cancelled = false;
    setRendering(true);
    setError("");
    (async () => {
      try {
        const blob = await pdf(doc).toBlob();
        if (cancelled) return;
        const next = URL.createObjectURL(blob);
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = next;
        setUrl(next);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "PDF generation failed");
        }
      } finally {
        if (!cancelled) setRendering(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, doc]);

  useEffect(() => {
    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, []);

  // ESC to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-surface/60 backdrop-blur-sm p-4 md:p-8"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <p className="text-[11px] text-subtle">{filename}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (!url) return;
                const a = window.document.createElement("a");
                a.href = url;
                a.download = filename;
                window.document.body.appendChild(a);
                a.click();
                window.document.body.removeChild(a);
              }}
              disabled={!url}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-background text-sm rounded-lg hover:opacity-90 disabled:opacity-40"
            >
              <ArrowDownTrayIcon className="size-4" />
              Download
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-subtle hover:text-foreground rounded-lg hover:bg-background"
              aria-label="Close"
            >
              <XMarkIcon className="size-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 bg-background overflow-hidden">
          {rendering && !url && (
            <div className="h-full flex items-center justify-center text-sm text-subtle">
              <ArrowPathIcon className="size-4 animate-spin mr-2" />
              Rendering PDF...
            </div>
          )}
          {error && !rendering && (
            <div className="h-full flex items-center justify-center text-sm text-red-700 px-6 text-center">
              {error}
            </div>
          )}
          {url && (
            // PDF viewer URL fragments: hide the toolbar + navpanes and
            // fit the page to width. Honoured by Chrome / Edge / Safari;
            // Firefox ignores them but the preview still renders.
            <iframe
              src={`${url}#toolbar=0&navpanes=0&view=FitH`}
              className="w-full h-full bg-surface"
              title={title}
            />
          )}
        </div>
      </div>
    </div>
  );
}
