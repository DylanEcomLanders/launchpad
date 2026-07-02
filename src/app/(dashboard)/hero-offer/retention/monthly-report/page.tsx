"use client";

/* ── Monthly Report Deck ──
 *
 * Combined report (formerly /tools/reports) + lifecycle storytelling.
 * One shareable deck the CSM hands to the client at the end of each
 * month: week-by-week, what we shipped, results, what&apos;s next.
 *
 * Inputs encode to URL so share link is self-contained.
 */

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChartPieIcon } from "@heroicons/react/24/outline";
import { ToolShell } from "@/lib/hero-offer/tool-shell";
import { SlideDeck, SlideCover, SlideBody } from "@/lib/hero-offer/slide-deck";
import { inputClass, labelClass, textareaClass } from "@/lib/form-styles";

interface Inputs {
  brand: string;
  month: string;
  crDelta: string;
  revDelta: string;
  pagesShipped: string;
  testsRun: string;
  week1: string;
  week2: string;
  week3: string;
  week4: string;
  wins: string;
  lessons: string;
  nextMonth: string;
}

function bulletize(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function buildSlides(i: Inputs) {
  const safeBrand = i.brand.trim() || "[Client]";
  const safeMonth = i.month.trim() || "This month";

  return [
    {
      label: "Cover",
      content: (
        <SlideCover
          badge="Monthly Report"
          meta={[
            { label: "Month", value: safeMonth },
            { label: "CR delta", value: i.crDelta.trim() || "—" },
            { label: "Revenue delta", value: i.revDelta.trim() || "—" },
          ]}
          title={`${safeBrand} × Ecom Landers`}
          subtitle="Where we started, what we shipped, what moved, what's next."
          preparedFor={{ label: "Prepared for", value: safeBrand }}
          preparedBy={{ label: "Prepared by", value: "Ecom Landers" }}
        />
      ),
    },
    {
      label: "Month at a glance",
      content: (
        <SlideBody eyebrow="Month at a glance" title="The headline numbers.">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            <div className="bg-surface-raised rounded-xl p-5 ring-1 ring-foreground">
              <div className="text-subtle text-xs uppercase tracking-wider font-semibold mb-2">CR delta</div>
              <div className="text-4xl font-bold text-background tabular-nums">{i.crDelta.trim() || "—"}</div>
              <p className="text-[12px] text-subtle mt-2">vs prior month</p>
            </div>
            <div className="bg-surface-raised rounded-xl p-5 ring-1 ring-foreground">
              <div className="text-subtle text-xs uppercase tracking-wider font-semibold mb-2">Revenue delta</div>
              <div className="text-4xl font-bold text-background tabular-nums">{i.revDelta.trim() || "—"}</div>
              <p className="text-[12px] text-subtle mt-2">vs prior month</p>
            </div>
            <div className="bg-surface-raised rounded-xl p-5 ring-1 ring-foreground">
              <div className="text-subtle text-xs uppercase tracking-wider font-semibold mb-2">Shipped</div>
              <div className="text-4xl font-bold text-background tabular-nums">{i.pagesShipped.trim() || "0"}<span className="text-base text-subtle"> pages · {i.testsRun.trim() || "0"} tests</span></div>
            </div>
          </div>
        </SlideBody>
      ),
    },
    {
      label: "Week 1",
      content: (
        <SlideBody eyebrow="Week 1" title="Plan + brief.">
          {i.week1.trim() ? (
            <ul className="space-y-2 text-base">
              {bulletize(i.week1).map((l, idx) => (
                <li key={idx} className="text-border">• {l}</li>
              ))}
            </ul>
          ) : (
            <p className="text-base text-subtle italic">Fill in week 1 in the form above.</p>
          )}
        </SlideBody>
      ),
    },
    {
      label: "Week 2",
      content: (
        <SlideBody eyebrow="Week 2" title="Design + dev kickoff.">
          {i.week2.trim() ? (
            <ul className="space-y-2 text-base">
              {bulletize(i.week2).map((l, idx) => (
                <li key={idx} className="text-border">• {l}</li>
              ))}
            </ul>
          ) : (
            <p className="text-base text-subtle italic">Fill in week 2 in the form above.</p>
          )}
        </SlideBody>
      ),
    },
    {
      label: "Week 3",
      content: (
        <SlideBody eyebrow="Week 3" title="QA + launch.">
          {i.week3.trim() ? (
            <ul className="space-y-2 text-base">
              {bulletize(i.week3).map((l, idx) => (
                <li key={idx} className="text-border">• {l}</li>
              ))}
            </ul>
          ) : (
            <p className="text-base text-subtle italic">Fill in week 3 in the form above.</p>
          )}
        </SlideBody>
      ),
    },
    {
      label: "Week 4",
      content: (
        <SlideBody eyebrow="Week 4" title="Ship + review.">
          {i.week4.trim() ? (
            <ul className="space-y-2 text-base">
              {bulletize(i.week4).map((l, idx) => (
                <li key={idx} className="text-border">• {l}</li>
              ))}
            </ul>
          ) : (
            <p className="text-base text-subtle italic">Fill in week 4 in the form above.</p>
          )}
        </SlideBody>
      ),
    },
    {
      label: "Wins",
      content: (
        <SlideBody eyebrow="Wins" title="What worked.">
          {i.wins.trim() ? (
            <ul className="space-y-2 text-base">
              {bulletize(i.wins).map((l, idx) => (
                <li key={idx} className="text-border">• {l}</li>
              ))}
            </ul>
          ) : (
            <p className="text-base text-subtle italic">Capture the wins from this month.</p>
          )}
        </SlideBody>
      ),
    },
    {
      label: "Lessons",
      content: (
        <SlideBody eyebrow="Lessons" title="What we learned.">
          {i.lessons.trim() ? (
            <ul className="space-y-2 text-base">
              {bulletize(i.lessons).map((l, idx) => (
                <li key={idx} className="text-border">• {l}</li>
              ))}
            </ul>
          ) : (
            <p className="text-base text-subtle italic">A losing test is a learning. Capture them here.</p>
          )}
        </SlideBody>
      ),
    },
    {
      label: "Next month",
      content: (
        <SlideBody eyebrow="Next month" title="The plan.">
          {i.nextMonth.trim() ? (
            <ul className="space-y-2 text-base">
              {bulletize(i.nextMonth).map((l, idx) => (
                <li key={idx} className="text-border">• {l}</li>
              ))}
            </ul>
          ) : (
            <p className="text-base text-subtle italic">Brief outline of next month&apos;s roadmap.</p>
          )}
        </SlideBody>
      ),
    },
    {
      label: "Close",
      content: (
        <SlideBody eyebrow="Close" title="Compounding, month by month.">
          <p className="text-lg leading-relaxed">
            Every test we ship makes the system smarter. Every page we build raises the bar. The number trends up, month over month.
          </p>
          <p className="text-base text-border mt-4">— The {safeBrand} pod at Ecom Landers</p>
        </SlideBody>
      ),
    },
  ];
}

const FIELDS: Array<{ key: keyof Inputs; label: string; placeholder?: string; rows?: number }> = [
  { key: "brand", label: "Client name", placeholder: "e.g. Acme Co" },
  { key: "month", label: "Month label", placeholder: "e.g. July 2026" },
  { key: "crDelta", label: "CR delta", placeholder: "+18%" },
  { key: "revDelta", label: "Revenue delta", placeholder: "+£42k" },
  { key: "pagesShipped", label: "Pages shipped", placeholder: "4" },
  { key: "testsRun", label: "Tests run", placeholder: "6" },
  { key: "week1", label: "Week 1 (one bullet per line)", rows: 4 },
  { key: "week2", label: "Week 2 (one bullet per line)", rows: 4 },
  { key: "week3", label: "Week 3 (one bullet per line)", rows: 4 },
  { key: "week4", label: "Week 4 (one bullet per line)", rows: 4 },
  { key: "wins", label: "Wins (one per line)", rows: 5 },
  { key: "lessons", label: "Lessons (one per line)", rows: 5 },
  { key: "nextMonth", label: "Next month plan (one per line)", rows: 6 },
];

export default function MonthlyReportPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const initial: Inputs = useMemo(
    () => ({
      brand: sp.get("brand") || "",
      month: sp.get("month") || "",
      crDelta: sp.get("crDelta") || "",
      revDelta: sp.get("revDelta") || "",
      pagesShipped: sp.get("pagesShipped") || "",
      testsRun: sp.get("testsRun") || "",
      week1: sp.get("week1") || "",
      week2: sp.get("week2") || "",
      week3: sp.get("week3") || "",
      week4: sp.get("week4") || "",
      wins: sp.get("wins") || "",
      lessons: sp.get("lessons") || "",
      nextMonth: sp.get("nextMonth") || "",
    }),
    // intentionally only initialise on first render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [inputs, setInputs] = useState<Inputs>(initial);

  useEffect(() => {
    const params = new URLSearchParams();
    (Object.keys(inputs) as (keyof Inputs)[]).forEach((k) => {
      if (inputs[k]) params.set(k, inputs[k]);
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
  (Object.keys(inputs) as (keyof Inputs)[]).forEach((k) => {
    if (inputs[k]) shareParams.set(k, inputs[k]);
  });
  shareParams.set("present", "1");
  const shareUrl = `${pathname}?${shareParams.toString()}`;
  const isPresent = sp.get("present") === "1";

  function set(k: keyof Inputs, v: string) {
    setInputs((p) => ({ ...p, [k]: v }));
  }

  return (
    <ToolShell
      title="Monthly Report Deck"
      blurb="Combined report + lifecycle: week 1-4, month overview, pages shipped, wins, lessons, next month. Fill in once, share the present-mode link."
      parentHref="/hero-offer/retention"
      parentLabel="Retention"
      status="live"
      accent="sky"
      icon={<ChartPieIcon className="size-4" />}
    >
      {!isPresent && (
        <section className="bg-background rounded-2xl ring-1 ring-foreground p-5 mb-4 space-y-4">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-subtle">
            Setup
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

      <SlideDeck slides={slides} deckTitle="Monthly Report" shareUrl={shareUrl} client={inputs.brand} />
    </ToolShell>
  );
}
