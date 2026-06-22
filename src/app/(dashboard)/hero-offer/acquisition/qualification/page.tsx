"use client";

/* Qualification script - 6 discovery questions the closer asks on the
 * first call. Scoring criteria included so we can disqualify fast. */

import { CheckBadgeIcon } from "@heroicons/react/24/outline";
import { ToolShell } from "@/lib/hero-offer/tool-shell";

const QUESTIONS: { q: string; why: string; fit: string }[] = [
  {
    q: "What's your monthly revenue?",
    why: "Tier-fit signal. Under £100k/mo = wrong fit (we can't move enough revenue to justify the spend). £200k-£400k = Entry. £400k-£800k = Core. £800k+ = VIP.",
    fit: "Looking for £200k+/mo. Below that, route to a one-off audit or politely pass.",
  },
  {
    q: "What's your current conversion rate, and where's the biggest leak?",
    why: "Tests their self-awareness + gives us the first hypothesis. If they can't answer, they don't have analytics in place - solvable but adds friction.",
    fit: "Want someone who knows CR + has an opinion on where it leaks.",
  },
  {
    q: "What CRO have you tried before, and how did it go?",
    why: "Surfaces burnout (last agency failed = primed to value our system) or naivete (never tried = needs education before they'll value the spend).",
    fit: "Either is workable; calibrate the rest of the call to it.",
  },
  {
    q: "Who owns the site, and who can approve changes?",
    why: "Single decision-maker = fast close. Committee = drag the timeline + add another call.",
    fit: "Single decision-maker is ideal. If committee, get every name + schedule a group call.",
  },
  {
    q: "If we lift your conversion rate by 30% in 90 days, what's that worth to you?",
    why: "Anchors price to value. If they can't articulate the value, they'll choke on the £10k/mo.",
    fit: "Want them to come out with a number larger than 3× the tier fee. Less than that = harder close.",
  },
  {
    q: "Why now? What changed?",
    why: "Reveals real urgency (new investor, growth target, peak season approaching) vs vague intent (just looking around). Vague = nurture, real = close.",
    fit: "Looking for a concrete forcing function. If there isn't one, set a follow-up + put them on Long-term nurture in Pipeline.",
  },
];

export default function QualificationPage() {
  return (
    <ToolShell
      title="Qualification script"
      blurb="The 6 discovery questions the closer asks on every first call. Match the script, score the answers."
      parentHref="/hero-offer/acquisition"
      parentLabel="Back to Acquisition"
      status="shell"
      accent="emerald"
      icon={<CheckBadgeIcon className="size-5" />}
    >
      <ol className="space-y-3">
        {QUESTIONS.map((it, i) => (
          <li key={i} className="bg-[#0F0F10] rounded-2xl ring-1 ring-white/[0.04] p-5">
            <div className="flex items-start gap-3">
              <span className="text-[11px] font-mono text-emerald-300 mt-0.5 shrink-0">{String(i + 1).padStart(2, "0")}</span>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-[#E5E5EA] mb-2">{it.q}</h3>
                <p className="text-[12px] text-[#9CA3AF] mb-2"><span className="text-emerald-300/80">Why we ask: </span>{it.why}</p>
                <p className="text-[12px] text-[#9CA3AF]"><span className="text-emerald-300/80">Looking for: </span>{it.fit}</p>
              </div>
            </div>
          </li>
        ))}
      </ol>
      <div className="text-[12px] text-[#71757D]">
        Closer logs the answers in /pipeline → lead detail → Sales calls → Discovery section. Numbers above each answer become the structured discovery record.
      </div>
    </ToolShell>
  );
}
