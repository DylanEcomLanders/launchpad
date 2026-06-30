"use client";

/* ── Pitch Deck ──
 *
 * The combined deck the closer drives on a sales call (or sends as a
 * leave-behind). Sales tactics + the pitch + proof, in one HTML slide
 * deck. Lives here so the closer doesn't tab between three Google
 * Slides files.
 */

import { DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import { ToolShell } from "@/lib/hero-offer/tool-shell";
import { SlideDeck, SlideCover, SlideBody } from "@/lib/hero-offer/slide-deck";

const SLIDES = [
  {
    label: "Cover",
    content: (
      <SlideCover
        badge="Pitch Deck"
        meta={[
          { label: "Programme", value: "Hero Offer" },
          { label: "Audience", value: "Sales prospects" },
          { label: "Tiers", value: "£5k · £10k · £15k" },
        ]}
        title="We turn the traffic you already pay for into revenue."
        subtitle="A full conversion team. Design, dev, copy, CRO. Embedded inside your business on a monthly system."
        preparedBy={{ label: "Prepared by", value: "Ecom Landers" }}
      />
    ),
  },
  {
    label: "The problem",
    content: (
      <SlideBody eyebrow="The problem" title="Paid traffic gets more expensive every quarter.">
        <ul className="space-y-3 text-base">
          <li>• You&apos;re paying more per click, year over year.</li>
          <li>• Your conversion rate hasn&apos;t moved in 18 months.</li>
          <li>• Every £1 in extra spend buys less revenue than the last.</li>
          <li>• The only honest way out is to <strong className="text-background">convert more of the traffic you already have</strong>.</li>
        </ul>
      </SlideBody>
    ),
  },
  {
    label: "The leverage",
    content: (
      <SlideBody eyebrow="Why CRO" title="A 20% CR lift = 20% more revenue. Same spend.">
        <p className="text-base">
          Doubling ad spend usually doubles cost. Doubling conversion rate doubles revenue at the same cost.
        </p>
        <p className="text-base">
          This is the highest-leverage lever in your business. And nobody on your team is full-time on it.
        </p>
      </SlideBody>
    ),
  },
  {
    label: "What we do",
    content: (
      <SlideBody eyebrow="What we do" title="Three pillars. One programme.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          <div className="bg-surface-raised rounded-xl p-5 ring-1 ring-foreground">
            <div className="text-subtle text-xs uppercase tracking-wider font-semibold mb-2">Design</div>
            <div className="text-background font-semibold mb-1">Conversion-led, not pretty.</div>
            <p className="text-[12px] text-subtle">Pages that read in 3 seconds and convert in 30.</p>
          </div>
          <div className="bg-surface-raised rounded-xl p-5 ring-1 ring-foreground">
            <div className="text-subtle text-xs uppercase tracking-wider font-semibold mb-2">Dev</div>
            <div className="text-background font-semibold mb-1">Ship-quality builds.</div>
            <p className="text-[12px] text-subtle">Fast, mobile-first, instrumented. Built for testing, not theming.</p>
          </div>
          <div className="bg-surface-raised rounded-xl p-5 ring-1 ring-foreground">
            <div className="text-subtle text-xs uppercase tracking-wider font-semibold mb-2">CRO + Copy</div>
            <div className="text-background font-semibold mb-1">Test what matters.</div>
            <p className="text-[12px] text-subtle">Hypothesis-driven A/B tests on the surfaces that move the number.</p>
          </div>
        </div>
      </SlideBody>
    ),
  },
  {
    label: "Tiers",
    content: (
      <SlideBody eyebrow="Tiers" title="One programme. Three speeds.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          <div className="bg-surface-raised rounded-xl p-5 ring-1 ring-foreground">
            <div className="text-subtle text-xs uppercase tracking-wider font-semibold mb-1">Entry</div>
            <div className="text-3xl font-bold text-background">£5k<span className="text-sm text-subtle">/mo</span></div>
            <p className="text-[12px] text-border mt-2">2 pages + 2 tests / mo</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-xl p-5 ring-1 ring-emerald-500/40">
            <div className="text-subtle text-xs uppercase tracking-wider font-semibold mb-1">Core · most chosen</div>
            <div className="text-3xl font-bold text-background">£10k<span className="text-sm text-subtle">/mo</span></div>
            <p className="text-[12px] text-border mt-2">4 pages + 4 tests / mo</p>
          </div>
          <div className="bg-surface-raised rounded-xl p-5 ring-1 ring-foreground">
            <div className="text-subtle text-xs uppercase tracking-wider font-semibold mb-1">VIP</div>
            <div className="text-3xl font-bold text-background">£15k<span className="text-sm text-subtle">/mo</span></div>
            <p className="text-[12px] text-border mt-2">6 pages + 12 tests / mo + priority</p>
          </div>
        </div>
        <p className="text-[12px] text-subtle mt-4 text-center">90-day initial commitment · 10% off paid up front</p>
      </SlideBody>
    ),
  },
  {
    label: "North Star",
    content: (
      <SlideBody eyebrow="North Star" title="One metric. Conversion rate.">
        <p className="text-lg">
          We measure ourselves on the only number that matters: <strong className="text-background">your site&apos;s conversion rate</strong>.
        </p>
        <p className="text-base text-border">
          Not impressions, not sessions, not bounce rate. CR up = revenue up at the same ad spend. Everything we ship traces back to that line going up.
        </p>
      </SlideBody>
    ),
  },
  {
    label: "Guarantee",
    content: (
      <SlideBody eyebrow="The guarantee" title="Measurable CR lift in 90 days, or we keep working free.">
        <p className="text-lg">
          We hit the number. You ship what we recommend. If the lift isn&apos;t there in 90 days, we keep working until it is, at no extra cost.
        </p>
        <p className="text-base text-subtle">
          We can offer this because the system works. The risk sits with us.
        </p>
      </SlideBody>
    ),
  },
  {
    label: "Proof",
    content: (
      <SlideBody eyebrow="Proof" title="The work that&apos;s already done it.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-surface-raised rounded-xl p-5 ring-1 ring-foreground">
              <div className="text-subtle text-xs uppercase tracking-wider font-semibold mb-2">Case study slot {i}</div>
              <p className="text-sm text-subtle italic">Drop in real client name + headline number (+X% CR in Y weeks) when ready.</p>
            </div>
          ))}
        </div>
      </SlideBody>
    ),
  },
  {
    label: "Team",
    content: (
      <SlideBody eyebrow="The team" title="A pod, dedicated to your brand.">
        <ul className="space-y-3 text-base">
          <li><strong className="text-background">Strategist.</strong> Owns the roadmap. Briefs the work. Reports to you weekly.</li>
          <li><strong className="text-background">Designer.</strong> Conversion-led design. Mobile-first, hierarchy-first.</li>
          <li><strong className="text-background">Developer.</strong> Ships clean Shopify builds. Tests, monitors, iterates.</li>
          <li><strong className="text-background">QA.</strong> Nothing goes live broken. Cross-device, cross-browser.</li>
        </ul>
      </SlideBody>
    ),
  },
  {
    label: "How a month runs",
    content: (
      <SlideBody eyebrow="How a typical month runs" title="Sprint cadence.">
        <ul className="space-y-3 text-base">
          <li><strong className="text-background">Week 1.</strong> Roadmap kickoff. Brief the work, lock the test hypotheses.</li>
          <li><strong className="text-background">Week 2.</strong> Design ships. Dev starts builds.</li>
          <li><strong className="text-background">Week 3.</strong> QA + launch. Tests go live.</li>
          <li><strong className="text-background">Week 4.</strong> Monthly review. Results in. Next month&apos;s roadmap shaped.</li>
        </ul>
      </SlideBody>
    ),
  },
  {
    label: "Reporting",
    content: (
      <SlideBody eyebrow="How we measure" title="Reports you&apos;ll actually read.">
        <ul className="space-y-3 text-base">
          <li><strong className="text-background">Weekly.</strong> What shipped, what tested, what&apos;s next.</li>
          <li><strong className="text-background">Monthly.</strong> CR delta, revenue delta, test outcomes, next month&apos;s plan.</li>
          <li><strong className="text-background">Quarterly.</strong> Brand-level retro: where we started, where we are, where we&apos;re going.</li>
        </ul>
      </SlideBody>
    ),
  },
  {
    label: "FAQ",
    content: (
      <SlideBody eyebrow="Common questions" title="Answered.">
        <ul className="space-y-3 text-base">
          <li><strong className="text-background">How is this different to an agency?</strong> Agencies sell hours. We sell CR lift.</li>
          <li><strong className="text-background">Why monthly?</strong> CRO compounds. One-off projects don&apos;t.</li>
          <li><strong className="text-background">What if a test loses?</strong> A losing test is a learning. We replace the hypothesis, we don&apos;t back down.</li>
          <li><strong className="text-background">Can we cancel?</strong> Yes, after the 90-day initial commitment. Most don&apos;t.</li>
        </ul>
      </SlideBody>
    ),
  },
  {
    label: "Next step",
    content: (
      <SlideBody eyebrow="Next step" title="Start with a £1k Discovery Audit.">
        <p className="text-lg">
          We&apos;ll tear your funnel down to the studs and tell you exactly where the conversion is leaking. You&apos;ll leave with a 30/60/90 roadmap whether or not we work together.
        </p>
        <p className="text-base text-border">
          One week. £1k. Refunded against your first month if you sign.
        </p>
      </SlideBody>
    ),
  },
];

export default function PitchDeckPage() {
  return (
    <ToolShell
      title="Pitch Deck"
      blurb="The combined sales deck the closer drives on a call (or sends as a leave-behind). Sales tactics, the pitch, the proof - one deck."
      parentHref="/hero-offer/acquisition"
      parentLabel="Acquisition"
      status="live"
      accent="emerald"
      icon={<DocumentDuplicateIcon className="size-4" />}
    >
      <SlideDeck slides={SLIDES} deckTitle="Pitch Deck" />
    </ToolShell>
  );
}
