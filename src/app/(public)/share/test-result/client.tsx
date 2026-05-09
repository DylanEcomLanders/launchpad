"use client";

import { useRef } from "react";

/* Test-result share-card. URL params (all strings, decoded):
 *   client    — client name (e.g. "Acme Skincare")
 *   page      — what was tested (e.g. "PDP — Sling Carrier")
 *   lift      — signed % lift (e.g. "+18.4")
 *   sig       — significance % (e.g. "97")
 *   status    — winner | loser | inconclusive | pending
 *   period    — date range (e.g. "M2 · 28 days")
 *   hyp       — short hypothesis (one line, optional)
 *
 * Rendered as a 1080x1080 card so it screenshots cleanly to LinkedIn /
 * Twitter / a renewal deck. "Save as PNG" uses the canvas-from-SVG
 * approach so no external service is required. */
export default function ShareCard({
  params,
}: {
  params: Record<string, string | undefined>;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const client = params.client || "Client";
  const page = params.page || "—";
  const liftStr = params.lift || "+0";
  const sig = params.sig || "—";
  const status = (params.status || "winner").toLowerCase();
  const period = params.period || "";
  const hyp = params.hyp || "";

  const liftNum = Number(liftStr.replace(/[^0-9.\-]/g, ""));
  const won = status === "winner" || liftNum > 0;
  const lost = status === "loser" || liftNum < 0;
  const accent = won ? "#16A34A" : lost ? "#E11D48" : "#1B1B1B";
  const verdict = won ? "Winner" : lost ? "Loser" : status === "inconclusive" ? "Inconclusive" : "Test result";

  async function downloadPng() {
    const node = ref.current;
    if (!node) return;
    // Render the card via SVG → image → canvas. No external lib.
    const W = 1080;
    const H = 1080;
    const data = node.outerHTML;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml" style="width:${W}px;height:${H}px;background:#fff;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
          ${data}
        </div>
      </foreignObject>
    </svg>`;
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(img, 0, 0, W, H);
      canvas.toBlob((blob2) => {
        if (!blob2) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob2);
        a.download = `${client.toLowerCase().replace(/\s+/g, "-")}-test-result.png`;
        a.click();
        URL.revokeObjectURL(a.href);
      }, "image/png");
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] py-10 flex flex-col items-center">
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={downloadPng}
          className="rounded-lg bg-[#1B1B1B] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#2D2D2D]"
        >
          Save as PNG
        </button>
        <a
          href="/share/test-result"
          className="rounded-lg border border-[#E5E5EA] bg-white px-3 py-1.5 text-xs font-medium text-[#1B1B1B] hover:bg-[#F3F3F5]"
        >
          New test
        </a>
      </div>

      {/* The card itself — square, screenshot-friendly. */}
      <div
        ref={ref}
        className="relative bg-white shadow-2xl"
        style={{ width: 540, height: 540, borderRadius: 28 }}
      >
        <div
          className="absolute inset-x-0 top-0 px-8 pt-8"
          style={{ color: "#7A7A7A", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 600 }}
        >
          Conversion test · {period || "result"}
        </div>

        <div className="absolute inset-x-0 top-16 px-8">
          <div style={{ fontSize: 28, fontWeight: 600, color: "#1B1B1B", lineHeight: 1.1 }}>
            {client}
          </div>
          <div style={{ fontSize: 14, color: "#7A7A7A", marginTop: 4 }}>{page}</div>
        </div>

        <div
          className="absolute inset-x-0"
          style={{ top: 180, padding: "0 32px" }}
        >
          <div style={{ fontSize: 88, fontWeight: 700, color: accent, lineHeight: 1 }}>
            {liftStr}%
          </div>
          <div style={{ fontSize: 14, color: "#7A7A7A", marginTop: 8 }}>
            {verdict} · {sig}% significance
          </div>
        </div>

        {hyp && (
          <div
            className="absolute inset-x-0 px-8"
            style={{ top: 360, fontSize: 14, color: "#1B1B1B", lineHeight: 1.45 }}
          >
            <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 600, color: "#7A7A7A", marginBottom: 6 }}>
              Hypothesis
            </div>
            {hyp}
          </div>
        )}

        <div
          className="absolute inset-x-0 bottom-0 px-8 pb-8 flex items-end justify-between"
          style={{ fontSize: 12, color: "#A0A0A0" }}
        >
          <div>ecomlanders.com · Conversion Engine</div>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: accent,
            }}
          />
        </div>
      </div>

      <p className="mt-4 max-w-md text-center text-[11px] text-[#7A7A7A]">
        Generated from a Build task&apos;s test result. Use the Save button to grab a PNG for LinkedIn, X, or a renewal deck.
      </p>
    </div>
  );
}
