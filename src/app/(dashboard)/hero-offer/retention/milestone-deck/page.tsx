"use client";

/* ── Milestone Deck ──
 *
 * One deck for every lifecycle milestone (Day 30 / 90 / 180 / 365).
 * Pick the day in the form, the slide content adapts to the right
 * milestone narrative:
 *   - Day 30:  First-month retro (what shipped, what we learned)
 *   - Day 90:  Renewal anchor (guarantee delta, case for continuing)
 *   - Day 180: Case study angle (success story + referral ask)
 *   - Day 365: Annual review (multi-year framing)
 *
 * Inputs encode to URL → shareable present-mode link.
 */

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FlagIcon } from "@heroicons/react/24/outline";
import { ToolShell } from "@/lib/hero-offer/tool-shell";
import { SlideDeck, SlideCover, SlideBody } from "@/lib/hero-offer/slide-deck";
import { inputClass, labelClass, textareaClass } from "@/lib/form-styles";

type Day = "30" | "90" | "180" | "365";

const DAY_META: Record<Day, { title: string; tag: string; tone: string }> = {
  "30": { title: "Day 30 · First-month retro", tag: "First month", tone: "Establish trust. Show momentum. Set the 60-day plan." },
  "90": { title: "Day 90 · Renewal anchor", tag: "90 days in", tone: "Earn the renewal. Cite the guarantee. Make the case for continuing." },
  "180": { title: "Day 180 · Case study + referral", tag: "6 months in", tone: "Reflect. Capture the case study. Ask for the referral." },
  "365": { title: "Day 365 · Annual review", tag: "1 year in", tone: "Zoom out. Multi-year framing. Where we go from here." },
};

interface Inputs {
  day: Day;
  brand: string;
  crStart: string;
  crNow: string;
  revStart: string;
  revNow: string;
  highlights: string;
  nextPhase: string;
}

function bulletize(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function buildSlides(i: Inputs) {
  const safeBrand = i.brand.trim() || "[Client]";
  const meta = DAY_META[i.day];

  const cover = {
    label: "Cover",
    content: (
      <SlideCover
        badge={`Day ${i.day} · Milestone`}
        meta={[
          { label: "Milestone", value: meta.tag },
          { label: "CR", value: `${i.crStart.trim() || "—"} → ${i.crNow.trim() || "—"}` },
          { label: "Revenue", value: `${i.revStart.trim() || "—"} → ${i.revNow.trim() || "—"}` },
        ]}
        title={meta.title}
        subtitle={meta.tone}
        preparedFor={{ label: "Prepared for", value: safeBrand }}
        preparedBy={{ label: "Prepared by", value: "Ecom Landers" }}
      />
    ),
  };

  const numbersSlide = {
    label: "The numbers",
    content: (
      <SlideBody eyebrow="The numbers" title="Where we started vs where we are.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          <div className="bg-surface-raised rounded-xl p-5 ring-1 ring-foreground">
            <div className="text-subtle text-xs uppercase tracking-wider font-semibold mb-2">Conversion rate</div>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-subtle line-through tabular-nums">{i.crStart.trim() || "—"}</span>
              <span className="text-4xl font-bold text-background tabular-nums">→ {i.crNow.trim() || "—"}</span>
            </div>
          </div>
          <div className="bg-surface-raised rounded-xl p-5 ring-1 ring-foreground">
            <div className="text-subtle text-xs uppercase tracking-wider font-semibold mb-2">Monthly revenue</div>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-subtle line-through tabular-nums">{i.revStart.trim() || "—"}</span>
              <span className="text-4xl font-bold text-background tabular-nums">→ {i.revNow.trim() || "—"}</span>
            </div>
          </div>
        </div>
      </SlideBody>
    ),
  };

  const highlightsSlide = {
    label: "Highlights",
    content: (
      <SlideBody eyebrow={meta.tag} title="What we&apos;ve shipped.">
        {i.highlights.trim() ? (
          <ul className="space-y-2 text-base">
            {bulletize(i.highlights).map((l, idx) => (
              <li key={idx} className="text-muted">• {l}</li>
            ))}
          </ul>
        ) : (
          <p className="text-base text-subtle italic">Capture the top 5-8 things we shipped this period.</p>
        )}
      </SlideBody>
    ),
  };

  /* Milestone-specific middle slide. */
  let middleSlide;
  if (i.day === "30") {
    middleSlide = {
      label: "What we learned",
      content: (
        <SlideBody eyebrow="Lessons" title="First-month learnings.">
          <ul className="space-y-3 text-base">
            <li><strong className="text-background">What the data is telling us.</strong> Patterns from the first month of tests + analytics.</li>
            <li><strong className="text-background">What we&apos;re doubling down on.</strong> Hypotheses that earned more attention.</li>
            <li><strong className="text-background">What we&apos;re killing.</strong> Tests that lost; we move on.</li>
          </ul>
        </SlideBody>
      ),
    };
  } else if (i.day === "90") {
    middleSlide = {
      label: "The guarantee",
      content: (
        <SlideBody eyebrow="The guarantee" title="90-day guarantee: hit.">
          <p className="text-lg leading-relaxed">
            We said measurable CR lift in 90 days or we keep working free. Look at the numbers. Lift achieved.
          </p>
          <p className="text-base text-muted">
            This is the moment most agencies overpromise and underdeliver. We&apos;ve delivered. The system is working.
          </p>
        </SlideBody>
      ),
    };
  } else if (i.day === "180") {
    middleSlide = {
      label: "Case study + referral",
      content: (
        <SlideBody eyebrow="The ask" title="Two things.">
          <ul className="space-y-3 text-base">
            <li><strong className="text-background">A short case study.</strong> Can we write up your story? Same template, your name + numbers + a quote.</li>
            <li><strong className="text-background">A referral.</strong> Know another brand that&apos;d benefit from this? We&apos;ll comp your next month if they sign.</li>
          </ul>
        </SlideBody>
      ),
    };
  } else {
    middleSlide = {
      label: "Year one in review",
      content: (
        <SlideBody eyebrow="Year one" title="What 12 months of compounding looks like.">
          <p className="text-lg leading-relaxed">
            A year ago, your site was converting at one number. Today, it&apos;s at another. Every month, every test, every page made the system smarter.
          </p>
          <p className="text-base text-muted">
            That&apos;s what the Conversion Engine does. It compounds.
          </p>
        </SlideBody>
      ),
    };
  }

  const nextSlide = {
    label: "Next phase",
    content: (
      <SlideBody eyebrow="Next phase" title="Where we go from here.">
        {i.nextPhase.trim() ? (
          <ul className="space-y-2 text-base">
            {bulletize(i.nextPhase).map((l, idx) => (
              <li key={idx} className="text-muted">• {l}</li>
            ))}
          </ul>
        ) : (
          <p className="text-base text-subtle italic">Outline the next phase: bigger bets, new surfaces, scope expansion.</p>
        )}
      </SlideBody>
    ),
  };

  const closeSlide = {
    label: "Close",
    content: (
      <SlideBody eyebrow="Close" title="Keep compounding.">
        <p className="text-lg leading-relaxed">
          The hardest part of CRO is showing up every month. We&apos;ve shown up. The numbers show it. Let&apos;s keep going.
        </p>
        <p className="text-base text-muted mt-4">— The {safeBrand} pod at Ecom Landers</p>
      </SlideBody>
    ),
  };

  return [cover, numbersSlide, highlightsSlide, middleSlide, nextSlide, closeSlide];
}

const FIELDS: Array<{ key: keyof Inputs; label: string; placeholder?: string; rows?: number; type?: string }> = [
  { key: "brand", label: "Client name", placeholder: "e.g. Acme Co" },
  { key: "crStart", label: "Starting CR", placeholder: "1.8%" },
  { key: "crNow", label: "Current CR", placeholder: "2.4%" },
  { key: "revStart", label: "Starting monthly revenue", placeholder: "£220k" },
  { key: "revNow", label: "Current monthly revenue", placeholder: "£295k" },
  { key: "highlights", label: "Highlights (one per line)", rows: 6 },
  { key: "nextPhase", label: "Next phase (one per line)", rows: 5 },
];

export default function MilestoneDeckPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const initial: Inputs = useMemo(
    () => ({
      day: (sp.get("day") as Day) || "30",
      brand: sp.get("brand") || "",
      crStart: sp.get("crStart") || "",
      crNow: sp.get("crNow") || "",
      revStart: sp.get("revStart") || "",
      revNow: sp.get("revNow") || "",
      highlights: sp.get("highlights") || "",
      nextPhase: sp.get("nextPhase") || "",
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [inputs, setInputs] = useState<Inputs>(initial);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("day", inputs.day);
    (Object.keys(inputs) as (keyof Inputs)[]).forEach((k) => {
      if (k !== "day" && inputs[k]) params.set(k, inputs[k]);
    });
    if (sp.get("present") === "1") params.set("present", "1");
    const next = params.toString();
    if (next !== sp.toString()) {
      router.replace(`${pathname}?${next}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputs]);

  const slides = useMemo(() => buildSlides(inputs), [inputs]);

  const shareParams = new URLSearchParams();
  shareParams.set("day", inputs.day);
  (Object.keys(inputs) as (keyof Inputs)[]).forEach((k) => {
    if (k !== "day" && inputs[k]) shareParams.set(k, inputs[k]);
  });
  shareParams.set("present", "1");
  const shareUrl = `${pathname}?${shareParams.toString()}`;
  const isPresent = sp.get("present") === "1";

  function set<K extends keyof Inputs>(k: K, v: Inputs[K]) {
    setInputs((p) => ({ ...p, [k]: v }));
  }

  return (
    <ToolShell
      title="Milestone Deck"
      blurb="One deck, four lifecycle milestones (Day 30 / 90 / 180 / 365). Pick the day, fill in the inputs, share the present-mode link with the client."
      parentHref="/hero-offer/retention"
      parentLabel="Retention"
      status="live"
      accent="sky"
      icon={<FlagIcon className="size-4" />}
    >
      {!isPresent && (
        <section className="bg-background rounded-2xl ring-1 ring-foreground p-5 mb-4 space-y-4">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-subtle">
            Setup
          </div>
          <div>
            <label className={labelClass}>Milestone</label>
            <div className="grid grid-cols-4 gap-1.5 mt-1">
              {(["30", "90", "180", "365"] as Day[]).map((d) => (
                <button
                  key={d}
                  onClick={() => set("day", d)}
                  className={`px-2 py-2 rounded-md text-[11px] uppercase tracking-wider font-semibold transition-all ${
                    inputs.day === d
                      ? "bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-[0_4px_16px_rgba(14,165,233,0.3)]"
                      : "bg-surface text-subtle hover:text-white"
                  }`}
                >
                  Day {d}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-subtle mt-1.5 italic">
              {DAY_META[inputs.day].tone}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {FIELDS.map((f) => (
              <div key={f.key} className={f.rows ? "md:col-span-2" : ""}>
                <label className={labelClass}>{f.label}</label>
                {f.rows ? (
                  <textarea
                    value={inputs[f.key]}
                    onChange={(e) => set(f.key, e.target.value)}
                    rows={f.rows}
                    className={textareaClass}
                  />
                ) : (
                  <input
                    value={inputs[f.key]}
                    onChange={(e) => set(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className={inputClass}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <SlideDeck slides={slides} deckTitle="Milestone Deck" shareUrl={shareUrl} client={inputs.brand} />
    </ToolShell>
  );
}
