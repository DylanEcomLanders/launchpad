"use client";

/* ── Qualification Script ──
 *
 * The questions to ask on a cold-lead call. 8 questions across 3
 * sections: brand context (do we understand them), fit (are they a
 * good Hero Offer client), readiness (can we close this month).
 *
 * Each question carries: why we ask, the green-flag answer, the
 * red-flag answer. Used live on calls; the closer scrolls down as
 * the conversation unfolds.
 */

import { CheckBadgeIcon, CheckCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { ToolShell } from "@/lib/hero-offer/tool-shell";

interface Question {
  n: number;
  q: string;
  why: string;
  green: string;
  red: string;
}

const SECTIONS: { id: string; label: string; description: string; questions: Question[] }[] = [
  {
    id: "context",
    label: "Brand context",
    description: "First 10 minutes. Get the lay of the land. Don't pitch yet.",
    questions: [
      {
        n: 1,
        q: "Walk me through your business. What are you selling, who&apos;s buying, and what&apos;s the rough revenue range?",
        why: "Opens the call. We need monthly revenue + category + traffic source to know if this is a fit before we go deeper.",
        green: "£200k/mo+ in DTC ecommerce, mostly Shopify, paid traffic dependent.",
        red: "Pre-revenue, B2B SaaS, brick-and-mortar with no online store, marketplace-only.",
      },
      {
        n: 2,
        q: "What does your funnel look like today? Where does the traffic come from, and where does it land?",
        why: "Tells us if there&apos;s a conversion-rate problem to solve. If they don&apos;t know the answer, they need us. If they have it dialled, they probably don&apos;t.",
        green: "&ldquo;Meta + Google to a homepage / collection / PDP / quiz funnel.&rdquo; They know their CR.",
        red: "&ldquo;Mostly organic / repeat / wholesale.&rdquo; Not our wheelhouse.",
      },
      {
        n: 3,
        q: "What&apos;s your current site conversion rate? And what would you like it to be?",
        why: "The CR gap is our wedge. If they don&apos;t know either number, that&apos;s a different conversation (they need tracking before they need CRO).",
        green: "&ldquo;We&apos;re at 1.8%, we&apos;d love to be at 2.5%.&rdquo; Concrete numbers, real ambition.",
        red: "&ldquo;I don&apos;t know what it is.&rdquo; Doesn&apos;t track. Or &ldquo;it&apos;s fine.&rdquo; No ambition.",
      },
    ],
  },
  {
    id: "fit",
    label: "Fit",
    description: "Are they a Hero Offer client? Not every brand is. Don&apos;t force it.",
    questions: [
      {
        n: 4,
        q: "What&apos;s tried to fix conversion already? Internal team? Other agency? An app?",
        why: "Tells us about expectation, prior trauma, and whether they&apos;ve been burned by an agency.",
        green: "&ldquo;We tried Triple Whale + a CRO consultant - good data, no execution.&rdquo; They know what&apos;s missing.",
        red: "&ldquo;An agency for 6 months. They didn&apos;t ship anything.&rdquo; They might project that onto us. Or they&apos;ve never tried.",
      },
      {
        n: 5,
        q: "What does &ldquo;winning&rdquo; look like in 90 days? In a year?",
        why: "Pulls out the ambition + lets us calibrate the guarantee against their definition of success.",
        green: "&ldquo;CR up 20%, AOV up 10%, on a clear roadmap.&rdquo; Measurable, achievable, owned.",
        red: "&ldquo;10x revenue.&rdquo; Magical thinking. Or &ldquo;I don&apos;t know, you tell me.&rdquo; No skin in the game.",
      },
      {
        n: 6,
        q: "When we ship a recommendation, what&apos;s your process to approve and push it live?",
        why: "The biggest killer of CRO programmes is brands that won&apos;t ship the work. We&apos;d rather walk than fight that.",
        green: "&ldquo;You ship to a staging URL, I review, we push within 48 hours.&rdquo; Clear ownership, clear cadence.",
        red: "&ldquo;Has to go through legal, brand, design, the CEO.&rdquo; They&apos;ll bottleneck every test.",
      },
    ],
  },
  {
    id: "readiness",
    label: "Readiness",
    description: "Last 10 minutes. Can we close this month, or is this a Q3 conversation?",
    questions: [
      {
        n: 7,
        q: "What budget have you set aside for this work, and over what period?",
        why: "Direct, but kind. £5-15k/mo is the band. Anything below isn&apos;t a Hero Offer fit; anything above means they should be on VIP.",
        green: "&ldquo;Earmarked £10k/mo for the next 6 months.&rdquo; They&apos;re ready to move.",
        red: "&ldquo;Whatever it costs.&rdquo; Hasn&apos;t actually budgeted. Or &ldquo;under £3k.&rdquo; Wrong fit.",
      },
      {
        n: 8,
        q: "If the Discovery Audit lands well, when would you ideally start the engagement?",
        why: "Tells us their timeline. If they want to start in 4 weeks, we move fast. If it&apos;s 4 months, that&apos;s an audit + a nurture, not a close.",
        green: "&ldquo;Within 2 weeks of the audit landing.&rdquo; Decision-ready.",
        red: "&ldquo;Next quarter, maybe.&rdquo; Tyre-kicking, or genuinely not ready.",
      },
    ],
  },
];

export default function QualificationScriptPage() {
  return (
    <ToolShell
      title="Qualification Script"
      blurb="8 questions to ask on a cold-lead call. Three sections: brand context, fit, readiness. Use it live as the call unfolds."
      parentHref="/hero-offer/acquisition"
      parentLabel="Acquisition"
      status="live"
      accent="emerald"
      icon={<CheckBadgeIcon className="size-4" />}
    >
      <div className="space-y-8">
        {/* Quick legend */}
        <div className="bg-background rounded-2xl ring-1 ring-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-success mb-3">
            How to use this on a call
          </div>
          <ul className="space-y-2 text-sm text-muted">
            <li>1. Open this page before the call. Scroll as you go.</li>
            <li>2. Listen for the green / red flags under each question to score fit in real time.</li>
            <li>3. If you hit 3+ red flags, end the call kind but quick - they&apos;re not a Hero Offer fit.</li>
            <li>4. If they&apos;re green across the board, close on the £1k Discovery Audit, not the retainer.</li>
          </ul>
        </div>

        {SECTIONS.map((section) => (
          <section key={section.id}>
            <div className="flex items-center gap-2 mb-1">
              <span className="size-2 rounded-full bg-success" />
              <h2 className="text-[11px] uppercase tracking-wider text-subtle font-semibold">
                {section.label}
              </h2>
            </div>
            <p className="text-[12px] text-subtle mb-4 max-w-2xl">{section.description}</p>

            <div className="space-y-3">
              {section.questions.map((q) => (
                <div
                  key={q.n}
                  className="bg-background rounded-2xl ring-1 ring-border p-5 hover:ring-success/30 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 size-9 rounded-xl bg-success flex items-center justify-center text-white font-bold text-sm">
                      {q.n}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold text-foreground mb-2 leading-snug" dangerouslySetInnerHTML={{ __html: q.q }} />
                      <p className="text-[12px] text-subtle italic mb-4">
                        Why we ask: {q.why}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-success/[0.06] rounded-xl ring-1 ring-success/20 p-3">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <CheckCircleIcon className="size-3.5 text-success" />
                            <span className="text-[10px] uppercase tracking-wider text-success font-semibold">Green flag</span>
                          </div>
                          <p className="text-[12.5px] text-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: q.green }} />
                        </div>
                        <div className="bg-danger/[0.06] rounded-xl ring-1 ring-danger/20 p-3">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <ExclamationTriangleIcon className="size-3.5 text-danger" />
                            <span className="text-[10px] uppercase tracking-wider text-danger font-semibold">Red flag</span>
                          </div>
                          <p className="text-[12.5px] text-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: q.red }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </ToolShell>
  );
}
