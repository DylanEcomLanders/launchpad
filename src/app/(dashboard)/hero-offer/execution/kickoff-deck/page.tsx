"use client";

/* ── Kickoff Deck ──
 *
 * First-week onboarding deck for new clients. Input brand name +
 * kickoff date + pod (strategist / designer / dev), spits out a
 * shareable present-mode URL the strategist sends to the client
 * for the kickoff call.
 *
 * Inputs persist to the URL so the share link encodes the whole
 * customised deck. No DB writes.
 */

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RocketLaunchIcon } from "@heroicons/react/24/outline";
import { ToolShell } from "@/lib/hero-offer/tool-shell";
import { SlideDeck, SlideCover, SlideBody } from "@/lib/hero-offer/slide-deck";
import { inputClass, labelClass } from "@/lib/form-styles";

function buildSlides({
  brand,
  kickoffDate,
  strategist,
  designer,
  dev,
  tier,
}: {
  brand: string;
  kickoffDate: string;
  strategist: string;
  designer: string;
  dev: string;
  tier: string;
}) {
  const safeBrand = brand.trim() || "[Client]";
  const safeDate = kickoffDate.trim() || "TBC";
  const safeTier = tier.trim() || "Core";

  return [
    {
      label: "Cover",
      content: (
        <SlideCover
          badge="Kickoff Deck"
          meta={[
            { label: "Engagement", value: "Hero Offer" },
            { label: "Tier", value: safeTier },
            { label: "Kickoff", value: safeDate },
          ]}
          title={`${safeBrand} × Ecom Landers`}
          subtitle="Kicking off your Conversion Engine partnership."
          preparedFor={{ label: "Prepared for", value: safeBrand }}
          preparedBy={{ label: "Prepared by", value: "Ecom Landers" }}
        />
      ),
    },
    {
      label: "Why we&apos;re here",
      content: (
        <SlideBody eyebrow="The mission" title="Lift your conversion rate. Compound it monthly.">
          <p className="text-lg leading-relaxed">
            Three months from today, your site should be converting measurably better. Twelve months from today, it should be compounding.
          </p>
          <p className="text-base text-border">
            That&apos;s the only outcome we&apos;re optimising for. Everything we do this quarter ladders up to it.
          </p>
        </SlideBody>
      ),
    },
    {
      label: "Your pod",
      content: (
        <SlideBody eyebrow="Your pod" title="The team owning your conversion rate.">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            <div className="bg-surface-raised rounded-xl p-5 ring-1 ring-foreground">
              <div className="text-subtle text-xs uppercase tracking-wider font-semibold mb-2">Strategist</div>
              <div className="text-background font-semibold text-lg mb-1">{strategist || "—"}</div>
              <p className="text-[12px] text-subtle">Owns the roadmap. Your point of contact. Briefs the team, reports to you.</p>
            </div>
            <div className="bg-surface-raised rounded-xl p-5 ring-1 ring-foreground">
              <div className="text-subtle text-xs uppercase tracking-wider font-semibold mb-2">Designer</div>
              <div className="text-background font-semibold text-lg mb-1">{designer || "—"}</div>
              <p className="text-[12px] text-subtle">Conversion-led design. Mobile-first, hierarchy-first.</p>
            </div>
            <div className="bg-surface-raised rounded-xl p-5 ring-1 ring-foreground">
              <div className="text-subtle text-xs uppercase tracking-wider font-semibold mb-2">Developer</div>
              <div className="text-background font-semibold text-lg mb-1">{dev || "—"}</div>
              <p className="text-[12px] text-subtle">Ships clean Shopify builds. Tests, monitors, iterates.</p>
            </div>
          </div>
        </SlideBody>
      ),
    },
    {
      label: "First 30 days",
      content: (
        <SlideBody eyebrow="First 30 days" title="What happens this month.">
          <ul className="space-y-3 text-base">
            <li><strong className="text-background">Week 1.</strong> Deep dive: site walkthrough, tracking audit, lock the first roadmap.</li>
            <li><strong className="text-background">Week 2.</strong> First designs ship. Dev kicks off.</li>
            <li><strong className="text-background">Week 3.</strong> Build complete. QA. Tests go live.</li>
            <li><strong className="text-background">Week 4.</strong> First monthly review: results in, next month shaped.</li>
          </ul>
        </SlideBody>
      ),
    },
    {
      label: "Cadence",
      content: (
        <SlideBody eyebrow="Cadence" title="How we&apos;ll stay in sync.">
          <ul className="space-y-3 text-base">
            <li><strong className="text-background">Slack channel.</strong> Dedicated. Async questions, designs for review, day-to-day comms.</li>
            <li><strong className="text-background">Strategy call.</strong> Weekly or biweekly depending on tier. 30 minutes. Roadmap, blockers, decisions.</li>
            <li><strong className="text-background">Report.</strong> Weekly or biweekly. What shipped, what tested, CR delta, plan for next.</li>
            <li><strong className="text-background">Monthly review.</strong> Results recap, lessons, next month&apos;s roadmap shaped together.</li>
          </ul>
        </SlideBody>
      ),
    },
    {
      label: "What we need from you",
      content: (
        <SlideBody eyebrow="What we need from you" title="Three things make the partnership work.">
          <ul className="space-y-3 text-base">
            <li><strong className="text-background">Access.</strong> Shopify admin, GA4, Klaviyo, Meta + Google ads. Send the invites Week 1.</li>
            <li><strong className="text-background">Decisions within 48 hours.</strong> When we ship a design or test for review, fast turnaround keeps the sprint alive.</li>
            <li><strong className="text-background">A willingness to ship.</strong> The best CRO programme dies if recommendations sit in a queue. We move when you move.</li>
          </ul>
        </SlideBody>
      ),
    },
    {
      label: "The guarantee",
      content: (
        <SlideBody eyebrow="Our guarantee" title="Measurable CR lift in 90 days, or we keep working free.">
          <p className="text-lg leading-relaxed">
            We hit the number. You ship what we recommend. If the lift isn&apos;t there in 90 days, we keep going at no extra cost.
          </p>
          <p className="text-base text-subtle">The risk sits with us. The system works.</p>
        </SlideBody>
      ),
    },
    {
      label: "Let&apos;s go",
      content: (
        <SlideBody eyebrow="Welcome" title="Let&apos;s build something that compounds.">
          <p className="text-lg leading-relaxed">
            You&apos;re in the system now. We&apos;ll see you on Slack today, and on the strategy call this week.
          </p>
          <p className="text-base text-border mt-4">— {strategist || "Your strategist"} + the {safeBrand} pod</p>
        </SlideBody>
      ),
    },
  ];
}

export default function KickoffDeckPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [brand, setBrand] = useState(sp.get("brand") || "");
  const [kickoffDate, setKickoffDate] = useState(sp.get("date") || "");
  const [tier, setTier] = useState(sp.get("tier") || "Core");
  const [strategist, setStrategist] = useState(sp.get("strategist") || "");
  const [designer, setDesigner] = useState(sp.get("designer") || "");
  const [dev, setDev] = useState(sp.get("dev") || "");

  useEffect(() => {
    const params = new URLSearchParams();
    if (brand) params.set("brand", brand);
    if (kickoffDate) params.set("date", kickoffDate);
    if (tier) params.set("tier", tier);
    if (strategist) params.set("strategist", strategist);
    if (designer) params.set("designer", designer);
    if (dev) params.set("dev", dev);
    if (sp.get("present") === "1") params.set("present", "1");
    const next = params.toString();
    if (next !== sp.toString()) {
      router.replace(`${pathname}?${next}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand, kickoffDate, tier, strategist, designer, dev]);

  const slides = useMemo(
    () => buildSlides({ brand, kickoffDate, strategist, designer, dev, tier }),
    [brand, kickoffDate, strategist, designer, dev, tier],
  );

  const shareParams = new URLSearchParams();
  if (brand) shareParams.set("brand", brand);
  if (kickoffDate) shareParams.set("date", kickoffDate);
  if (tier) shareParams.set("tier", tier);
  if (strategist) shareParams.set("strategist", strategist);
  if (designer) shareParams.set("designer", designer);
  if (dev) shareParams.set("dev", dev);
  shareParams.set("present", "1");
  const shareUrl = `${pathname}?${shareParams.toString()}`;

  const isPresent = sp.get("present") === "1";

  return (
    <ToolShell
      title="Kickoff Deck"
      blurb="First-week onboarding deck. Fill in the client + pod + tier, then share the present-mode link with the client for the kickoff call."
      parentHref="/hero-offer/execution"
      parentLabel="Execution"
      status="live"
      accent="cyan"
      icon={<RocketLaunchIcon className="size-4" />}
    >
      {!isPresent && (
        <section className="bg-background rounded-2xl ring-1 ring-foreground p-5 mb-4 space-y-4">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-subtle">
            Setup
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Client name</label>
              <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Acme Co" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Kickoff date</label>
              <input value={kickoffDate} onChange={(e) => setKickoffDate(e.target.value)} placeholder="e.g. 1 July 2026" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Tier</label>
              <input value={tier} onChange={(e) => setTier(e.target.value)} placeholder="e.g. Core" className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Strategist</label>
              <input value={strategist} onChange={(e) => setStrategist(e.target.value)} placeholder="e.g. Aanchal" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Designer</label>
              <input value={designer} onChange={(e) => setDesigner(e.target.value)} placeholder="e.g. Barnaby" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Developer</label>
              <input value={dev} onChange={(e) => setDev(e.target.value)} placeholder="e.g. Brandon" className={inputClass} />
            </div>
          </div>
        </section>
      )}

      <SlideDeck slides={slides} deckTitle="Kickoff Deck" shareUrl={shareUrl} client={brand} />
    </ToolShell>
  );
}
