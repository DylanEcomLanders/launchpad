"use client";

/* ── Projects: report export ──
 * Per-page client export (replaces the old combined-doc PDF). Exports the
 * CURRENT page as either a branded one-pager (weekly reports, most pages) or a
 * landscape slide deck (the monthly rollup). Reports pull in the test results.
 * Save-as-PDF via window.print(); print CSS strips the app.
 */

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { XMarkIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { flattenSections, statusLabel } from "@/lib/pod-projects/templates";
import type { PodDoc, DocSection, TestRow } from "@/lib/pod-projects/types";

const TIER_LABEL: Record<string, string> = { lite: "Lite", core: "Core", growth: "Growth", scale: "Scale" };

/* Strip scaffolding so the client sees only filled content. */
function cleanBody(html: string): string {
  if (!html || typeof window === "undefined") return html;
  const blank = (t: string) => t.replace(/\s/g, "") === "";
  const root = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html").body.firstElementChild as HTMLElement;
  root.querySelectorAll("em").forEach((e) => e.remove());
  const isHeaderRow = (tr: Element) => Array.from(tr.children).every((c) => c.tagName === "TH");
  root.querySelectorAll("tr").forEach((tr) => {
    const tds = Array.from(tr.children).filter((c) => c.tagName === "TD");
    if (tds.length && tds.every((c) => blank(c.textContent || ""))) tr.remove();
  });
  root.querySelectorAll("table").forEach((t) => {
    if (Array.from(t.querySelectorAll("tr")).every(isHeaderRow)) t.remove();
  });
  root.querySelectorAll("p, li").forEach((el) => blank(el.textContent || "") && el.remove());
  root.querySelectorAll("ul, ol").forEach((el) => !el.querySelector("li") && el.remove());
  root.querySelectorAll("p").forEach((p) => {
    if ((p.textContent || "").trim().endsWith(":")) {
      const n = p.nextElementSibling;
      if (!n || !["UL", "OL", "TABLE"].includes(n.tagName)) p.remove();
    }
  });
  root.querySelectorAll("h3, h4").forEach((h) => {
    const n = h.nextElementSibling;
    if (!n || ["H2", "H3", "H4"].includes(n.tagName)) h.remove();
  });
  return root.innerHTML;
}

/* Client-facing test table (shipped tests only). */
function testTableHtml(rows: TestRow[]): string {
  const named = rows.filter((r) => r.test.trim());
  if (!named.length) return "";
  const head = `<tr><th>Test</th><th>Metric</th><th>Uplift</th><th>Result</th></tr>`;
  const body = named
    .map((r) => `<tr><td>${r.test}</td><td>${r.metric || "—"}</td><td>${r.uplift || "—"}</td><td>${statusLabel(r.status)}</td></tr>`)
    .join("");
  return `<table>${head}${body}</table>`;
}

export function ReportExport({ doc, section, onClose }: { doc: PodDoc; section: DocSection; onClose: () => void }) {
  const isReport = section.id.startsWith("reports");
  const looksMonthly = /month|rollup/i.test(section.title) || section.id.includes("month");
  const [format, setFormat] = useState<"onepager" | "deck">(looksMonthly ? "deck" : "onepager");

  const all = useMemo(() => flattenSections(doc.sections), [doc]);
  const testRows = useMemo(() => all.find((s) => s.kind === "results")?.rows ?? [], [all]);
  const baselineBody = useMemo(() => cleanBody(all.find((s) => s.id === "baseline-metrics")?.body ?? ""), [all]);
  const body = useMemo(() => cleanBody(section.body), [section.body]);
  const tests = useMemo(() => testTableHtml(testRows), [testRows]);

  const printedAt = useMemo(
    () => new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
    [],
  );
  const typeLabel = doc.type === "retainer" ? `${doc.tier ? TIER_LABEL[doc.tier] : "Core"} retainer` : "One-time project";

  return createPortal(
    <div className="pod-print-root fixed inset-0 z-50">
      {format === "deck" && <style>{`@media print { @page { size: A4 landscape; margin: 0; } }`}</style>}
      <div className="pod-print-backdrop absolute inset-0 overflow-y-auto bg-black/60 print:overflow-visible">
        <div className="pod-print-toolbar sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-panel-line bg-surface-raised px-4 py-2 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-2xs font-medium uppercase tracking-wider text-subtle">Format</span>
            <div className="flex rounded-md border border-border p-0.5">
              {(["onepager", "deck"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`rounded px-2.5 py-1 text-2xs font-medium transition-colors ${
                    format === f ? "bg-surface-raised text-foreground" : "text-muted hover:text-foreground"
                  }`}
                >
                  {f === "onepager" ? "One-pager" : "Slide deck"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground"
            >
              <ArrowDownTrayIcon className="size-4" /> Save as PDF
            </button>
            <button onClick={onClose} title="Close" className="flex size-7 items-center justify-center rounded-md text-subtle hover:bg-surface-hover hover:text-foreground">
              <XMarkIcon className="size-4" />
            </button>
          </div>
        </div>

        {format === "onepager" ? (
          <div className="mx-auto my-6 w-full max-w-[820px] px-4 print:m-0 print:max-w-none print:px-0">
            <article className="pod-print rounded-lg bg-white p-12 print:rounded-none print:p-0">
              <header className="pod-print-brand">
                <span className="pod-print-wordmark">Ecom Landers</span>
                <span className="pod-print-date">{printedAt}</span>
              </header>
              <h1>{doc.title}</h1>
              <p className="pod-print-meta">{section.title} · {typeLabel}</p>
              {body && <div dangerouslySetInnerHTML={{ __html: body }} />}
              {isReport && tests && (
                <section className="pod-print-section">
                  <h2>Tests this period</h2>
                  <div dangerouslySetInnerHTML={{ __html: tests }} />
                </section>
              )}
              <footer className="pod-print-footer">Prepared by Ecom Landers · {printedAt}</footer>
            </article>
          </div>
        ) : (
          <div className="pod-deck mx-auto my-6 flex w-full max-w-[960px] flex-col gap-6 px-4 print:m-0 print:max-w-none print:gap-0 print:px-0">
            {/* Cover */}
            <section className="pod-slide pod-slide-cover">
              <span className="pod-slide-brand">Ecom Landers</span>
              <div>
                <h1>{doc.title}</h1>
                <p>{section.title}</p>
              </div>
              <span className="pod-slide-foot">{typeLabel} · {printedAt}</span>
            </section>
            {/* The month in numbers */}
            <section className="pod-slide">
              <h2>The month in numbers</h2>
              {baselineBody ? <div dangerouslySetInnerHTML={{ __html: baselineBody }} /> : <p className="pod-slide-empty">Add baseline metrics to populate this slide.</p>}
            </section>
            {/* Tests & wins */}
            <section className="pod-slide">
              <h2>Tests &amp; wins</h2>
              {tests ? <div dangerouslySetInnerHTML={{ __html: tests }} /> : <p className="pod-slide-empty">No shipped tests logged yet.</p>}
            </section>
            {/* Recap */}
            <section className="pod-slide">
              <h2>Recap</h2>
              {body ? <div dangerouslySetInnerHTML={{ __html: body }} /> : <p className="pod-slide-empty">Fill in the monthly rollup to populate this slide.</p>}
            </section>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
