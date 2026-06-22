"use client";

/* Hand-off checklists - design→dev, dev→QA, QA→client. SOPs. */

import { ArrowRightCircleIcon } from "@heroicons/react/24/outline";
import { ToolShell } from "@/lib/hero-offer/tool-shell";

const HANDOFFS: { title: string; from: string; to: string; checklist: string[] }[] = [
  {
    title: "Design → Dev",
    from: "Designer",
    to: "Developer",
    checklist: [
      "Figma file shared with comment access",
      "Variant + control flagged, side-by-side",
      "Mobile + desktop frames both delivered",
      "Hover/active/loading states designed",
      "Copy locked (no [PLACEHOLDER] text)",
      "Images compressed + exported (or stock-photo URLs noted)",
      "Brand constraints captured in the brief (fonts, colours, spacing)",
      "Dev-brief filled in /tools/briefs with success criteria",
    ],
  },
  {
    title: "Dev → QA",
    from: "Developer",
    to: "QA / Strategist",
    checklist: [
      "Variant + control both deploy in staging",
      "Variant logic clean in Intelligems/Visually (no flicker)",
      "Tracking events firing - confirmed in GA4 debug view",
      "Mobile + desktop QA-ready",
      "Browser support per dev-brief tested",
      "Loading + error states covered",
      "No console errors on either variant",
      "QA criteria in brief is verifiable",
    ],
  },
  {
    title: "QA → Client",
    from: "Strategist",
    to: "Client",
    checklist: [
      "Test is live - confirmed in tool",
      "Significance target communicated (default 95%)",
      "Min runtime communicated",
      "Hypothesis brief shared with client",
      "Result-call calendar invite sent for the readout",
      "Test added to /tools/tests with starts/ends",
      "Pod aware not to ship other changes on the surface",
    ],
  },
];

export default function HandoffsPage() {
  return (
    <ToolShell
      title="Hand-off checklists"
      blurb="Three checklists, one per hand-off boundary. Run through before passing work along. Stops the 'I thought you had it' bugs."
      parentHref="/hero-offer/execution"
      parentLabel="Back to Execution"
      status="shell"
      accent="cyan"
      icon={<ArrowRightCircleIcon className="size-5" />}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {HANDOFFS.map((h) => (
          <section key={h.title} className="bg-[#0F0F10] rounded-2xl ring-1 ring-white/[0.04] p-5">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-cyan-300 mb-3">{h.title}</div>
            <div className="text-[11px] text-[#71757D] mb-3">{h.from} → {h.to}</div>
            <ul className="space-y-2">
              {h.checklist.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] text-[#E5E5EA]">
                  <input type="checkbox" className="mt-1 accent-cyan-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="text-[12px] text-[#71757D] italic">
        Polish later: per-task checkboxes that persist + auto-attach to the kanban card so the trail follows the work.
      </p>
    </ToolShell>
  );
}
