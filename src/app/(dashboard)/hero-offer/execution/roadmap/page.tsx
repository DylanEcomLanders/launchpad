"use client";

/* ── Roadmap (tier-aware monthly) ──
 *
 * Pick a tier (£5k / £10k / £15k), put in the client name, get a
 * 30-day presentable roadmap. Inputs persist to the URL so the
 * "Copy share link" button just copies the current address - opens
 * a clean present-mode deck for the client.
 *
 * Per-tier breakdowns mirror the pricing tiers:
 *   - Entry: 2 pages + 2 tests / month
 *   - Core:  4 pages + 4 tests / month
 *   - VIP:   6 pages + 12 tests / month + priority
 */

import { useMemo, useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { MapIcon } from "@heroicons/react/24/outline";
import { ToolShell } from "@/lib/hero-offer/tool-shell";
import { SlideDeck, SlideCover, SlideBody } from "@/lib/hero-offer/slide-deck";
import { inputClass, labelClass } from "@/lib/form-styles";

type Tier = "entry" | "core" | "vip";

const TIER_META: Record<Tier, { label: string; price: string; pages: number; tests: number; strategyCadence: string; reportingCadence: string }> = {
  entry: { label: "Entry", price: "£5k/mo", pages: 2, tests: 2, strategyCadence: "Biweekly strategy call", reportingCadence: "Biweekly reports" },
  core: { label: "Core", price: "£10k/mo", pages: 4, tests: 4, strategyCadence: "Weekly strategy call", reportingCadence: "Weekly reports" },
  vip: { label: "VIP", price: "£15k/mo", pages: 6, tests: 12, strategyCadence: "Weekly strategy call + quarterly brand-strategy", reportingCadence: "Weekly reports + priority turnaround" },
};

function buildSlides(tier: Tier, brand: string, monthLabel: string) {
  const t = TIER_META[tier];
  const safeBrand = brand.trim() || "[Client]";
  const month = monthLabel.trim() || "This month";

  return [
    {
      label: "Cover",
      content: (
        <SlideCover
          badge="Roadmap"
          meta={[
            { label: "Tier", value: `${t.label} (${t.price})` },
            { label: "Month", value: month },
            { label: "Cadence", value: `${t.pages} pages · ${t.tests} tests` },
          ]}
          title={`${safeBrand} × Ecom Landers`}
          subtitle={`A 30-day plan to lift your conversion rate. ${t.strategyCadence}. ${t.reportingCadence}.`}
          preparedFor={{ label: "Prepared for", value: safeBrand }}
          preparedBy={{ label: "Prepared by", value: "Ecom Landers" }}
        />
      ),
    },
    {
      label: "The plan",
      content: (
        <SlideBody eyebrow="The shape" title="One month. Four weeks. One sprint cadence.">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
            <div className="bg-surface-raised rounded-xl p-4 ring-1 ring-foreground">
              <div className="text-subtle text-xs uppercase tracking-wider font-semibold mb-2">Week 1</div>
              <div className="text-background font-semibold text-sm mb-1">Plan</div>
              <p className="text-[12px] text-subtle">Roadmap kickoff. Brief the work. Lock test hypotheses.</p>
            </div>
            <div className="bg-surface-raised rounded-xl p-4 ring-1 ring-foreground">
              <div className="text-subtle text-xs uppercase tracking-wider font-semibold mb-2">Week 2</div>
              <div className="text-background font-semibold text-sm mb-1">Design</div>
              <p className="text-[12px] text-subtle">Design ships. Dev starts the build.</p>
            </div>
            <div className="bg-surface-raised rounded-xl p-4 ring-1 ring-foreground">
              <div className="text-subtle text-xs uppercase tracking-wider font-semibold mb-2">Week 3</div>
              <div className="text-background font-semibold text-sm mb-1">Build + QA</div>
              <p className="text-[12px] text-subtle">Development complete. QA pass. Tests go live.</p>
            </div>
            <div className="bg-surface-raised rounded-xl p-4 ring-1 ring-foreground">
              <div className="text-subtle text-xs uppercase tracking-wider font-semibold mb-2">Week 4</div>
              <div className="text-background font-semibold text-sm mb-1">Ship + Review</div>
              <p className="text-[12px] text-subtle">Pages live. Results in. Next month shaped.</p>
            </div>
          </div>
        </SlideBody>
      ),
    },
    {
      label: "Pages",
      content: (
        <SlideBody eyebrow="Pages" title={`${t.pages} new pages this month.`}>
          <p className="text-base mb-4">
            We&apos;ll design + build {t.pages} new conversion-led pages this sprint. Replace this list with the actual page picks once the strategist scopes them:
          </p>
          <ul className="space-y-2 text-base">
            {Array.from({ length: t.pages }).map((_, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="size-6 rounded-md bg-cyan-500/15 ring-1 ring-cyan-500/30 flex items-center justify-center text-[11px] font-bold text-subtle shrink-0 mt-0.5">{i + 1}</div>
                <span className="text-border">Page {i + 1} — <span className="italic text-subtle">replace with actual page name</span></span>
              </li>
            ))}
          </ul>
        </SlideBody>
      ),
    },
    {
      label: "Tests",
      content: (
        <SlideBody eyebrow="Tests" title={`${t.tests} A/B tests this month.`}>
          <p className="text-base mb-4">
            Hypothesis-driven tests on the surfaces that move the number. We&apos;ll run {t.tests} this month. Picks pending strategist scoping:
          </p>
          <ul className="space-y-2 text-base">
            {Array.from({ length: Math.min(t.tests, 6) }).map((_, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="size-6 rounded-md bg-cyan-500/15 ring-1 ring-cyan-500/30 flex items-center justify-center text-[11px] font-bold text-subtle shrink-0 mt-0.5">T{i + 1}</div>
                <span className="text-border">Test {i + 1} — <span className="italic text-subtle">hypothesis + variant</span></span>
              </li>
            ))}
            {t.tests > 6 && (
              <li className="text-[12px] text-subtle italic ml-9">+ {t.tests - 6} more tests; scoped weekly as wins surface.</li>
            )}
          </ul>
        </SlideBody>
      ),
    },
    {
      label: "Strategy + Reporting",
      content: (
        <SlideBody eyebrow="Cadence" title="How we stay in sync.">
          <ul className="space-y-3 text-base">
            <li><strong className="text-background">{t.strategyCadence}.</strong> 30-minute strategist + founder sync. Roadmap status, blockers, next week.</li>
            <li><strong className="text-background">{t.reportingCadence}.</strong> What shipped, what tested, CR delta, plan for next.</li>
            <li><strong className="text-background">Dedicated Slack channel.</strong> Async questions, designs for review, day-to-day comms.</li>
            <li><strong className="text-background">Monthly review (Week 4).</strong> Results recap, lessons, next month roadmap shaped together.</li>
          </ul>
        </SlideBody>
      ),
    },
    {
      label: "North Star",
      content: (
        <SlideBody eyebrow="North Star" title="Conversion rate up, revenue up.">
          <p className="text-lg">
            One metric. Everything we ship this month traces back to <strong className="text-background">your site&apos;s conversion rate</strong> going up.
          </p>
          <p className="text-base text-border">
            CR up = revenue up at the same ad spend. That&apos;s the game.
          </p>
        </SlideBody>
      ),
    },
    {
      label: "Next steps",
      content: (
        <SlideBody eyebrow="Next" title="Sign off, then we kick off.">
          <ol className="space-y-3 text-base list-decimal list-inside">
            <li>Sign off this roadmap on our next call.</li>
            <li>Strategist will brief design + dev within 48 hours.</li>
            <li>Designs hit your inbox by end of Week 2.</li>
            <li>First test live by end of Week 3.</li>
            <li>Monthly review on the call following Week 4.</li>
          </ol>
        </SlideBody>
      ),
    },
  ];
}

export default function RoadmapPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const initialTier = (sp.get("tier") as Tier) || "core";
  const initialBrand = sp.get("brand") || "";
  const initialMonth = sp.get("month") || "";

  const [tier, setTier] = useState<Tier>(initialTier);
  const [brand, setBrand] = useState(initialBrand);
  const [month, setMonth] = useState(initialMonth);

  /* Mirror inputs into the URL so "Copy share link" + reload + back/
   * forward all behave. Debounced via the natural input cadence. */
  useEffect(() => {
    const params = new URLSearchParams();
    if (tier) params.set("tier", tier);
    if (brand) params.set("brand", brand);
    if (month) params.set("month", month);
    if (sp.get("present") === "1") params.set("present", "1");
    const next = params.toString();
    const current = sp.toString();
    if (next !== current) {
      router.replace(`${pathname}?${next}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier, brand, month]);

  const slides = useMemo(() => buildSlides(tier, brand, month), [tier, brand, month]);

  const shareParams = new URLSearchParams();
  shareParams.set("tier", tier);
  if (brand) shareParams.set("brand", brand);
  if (month) shareParams.set("month", month);
  shareParams.set("present", "1");
  const shareUrl = `${pathname}?${shareParams.toString()}`;

  const isPresent = sp.get("present") === "1";

  return (
    <ToolShell
      title="Roadmap"
      blurb="Monthly roadmap, tier-aware. Pick the tier, name the client, customise the slides, share the present-mode link."
      parentHref="/hero-offer/execution"
      parentLabel="Execution"
      status="live"
      accent="cyan"
      icon={<MapIcon className="size-4" />}
    >
      {!isPresent && (
        <section className="bg-background rounded-2xl ring-1 ring-foreground p-5 mb-4">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-subtle mb-3">
            Setup
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Tier</label>
              <div className="grid grid-cols-3 gap-1.5 mt-1">
                {(["entry", "core", "vip"] as Tier[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTier(t)}
                    className={`px-2 py-2 rounded-md text-[11px] uppercase tracking-wider font-semibold transition-all ${
                      tier === t
                        ? "bg-gradient-to-br from-cyan-500 to-teal-600 text-white shadow-[0_4px_16px_rgba(6,182,212,0.3)]"
                        : "bg-surface text-subtle hover:text-white"
                    }`}
                  >
                    {TIER_META[t].label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-subtle mt-1.5">
                {TIER_META[tier].pages} pages · {TIER_META[tier].tests} tests · {TIER_META[tier].price}
              </p>
            </div>
            <div>
              <label className={labelClass}>Client name</label>
              <input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Acme Co"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Month label</label>
              <input
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                placeholder="e.g. July 2026"
                className={inputClass}
              />
            </div>
          </div>
        </section>
      )}

      <SlideDeck slides={slides} deckTitle="Roadmap" shareUrl={shareUrl} client={brand} />
    </ToolShell>
  );
}
