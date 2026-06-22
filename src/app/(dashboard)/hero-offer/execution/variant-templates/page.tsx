"use client";

/* Variant design templates - standard starting points for the design team. */

import { Squares2X2Icon } from "@heroicons/react/24/outline";
import { ToolShell } from "@/lib/hero-offer/tool-shell";

const TEMPLATES: { name: string; surface: string; figmaUrl?: string; description: string }[] = [
  { name: "Hero - benefit-led", surface: "Landing / PDP", description: "Outcome-led hero with social proof above the fold. Default starter for PDPs that lack a strong opener." },
  { name: "Hero - story-led", surface: "Landing / PDP", description: "Story-driven hero with founder/origin angle. Use for brands selling a worldview." },
  { name: "PDP - swap above fold", surface: "PDP", description: "Reorder PDP modules (reviews up, accordions down). Highest-leverage PDP change before any copy/design work." },
  { name: "PDP - bundle module", surface: "PDP", description: "Inline bundle/upsell module below add-to-cart. AOV play." },
  { name: "Cart - urgency", surface: "Cart", description: "Free-shipping-progress bar + complementary upsell strip. AOV + completion lift." },
  { name: "Checkout - trust strip", surface: "Checkout", description: "Trust markers between cart + payment. For brands with hesitation at the payment step." },
  { name: "Post-purchase - upsell", surface: "Post-purchase", description: "One-click post-purchase upsell using Shopify's native flow. Standard AOV play." },
];

export default function VariantTemplatesPage() {
  return (
    <ToolShell
      title="Variant design templates"
      blurb="Standard starting points the design team forks from. Faster ramp + visual consistency across clients."
      parentHref="/hero-offer/execution"
      parentLabel="Back to Execution"
      status="shell"
      accent="cyan"
      icon={<Squares2X2Icon className="size-5" />}
    >
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {TEMPLATES.map((t) => (
          <li key={t.name} className="bg-[#0F0F10] rounded-2xl ring-1 ring-white/[0.04] p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-200">{t.surface}</span>
            </div>
            <div className="text-sm font-semibold text-[#E5E5EA] mb-1">{t.name}</div>
            <p className="text-[12px] text-[#9CA3AF] mb-3 leading-relaxed">{t.description}</p>
            {t.figmaUrl ? (
              <a href={t.figmaUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-cyan-300 hover:text-cyan-200">
                Open Figma file →
              </a>
            ) : (
              <p className="text-[11px] italic text-[#71757D]">Figma file not linked yet</p>
            )}
          </li>
        ))}
      </ul>
      <p className="text-[12px] text-[#71757D] italic">
        Polish later: Figma URL per template, status (production / draft / experimental), client usage count.
      </p>
    </ToolShell>
  );
}
