"use client";

import Link from "next/link";
import { CheckIcon } from "@heroicons/react/24/solid";
import { Logo } from "@/components/logo";
import { services as allServices, getPrice, formatGBP } from "@/data/services";

/* ──────────────────────────────────────────────────────────────
   Client-facing price list.
   - Opens DARK: the Conversion Engine, pure value, no price.
     Investment is scoped on a free surface-level audit.
   - Drops into LIGHT: the regular one-off deliverables, with prices.
   - The free audit is always a plain text offer, never a button.
   ────────────────────────────────────────────────────────────── */

const services = allServices.filter((s) => s.id !== "test-checkout");
const funnel = services.find((s) => s.id === "funnel-build");
const pageBuilds = services.filter(
  (s) => s.category === "builds" && !s.isAddOn && s.id !== "funnel-build",
);
const addOns = services.filter((s) => s.isAddOn);

/* Representative month of build work, tallied to show what's included. */
const TALLY_IDS = ["page-build-4", "advertorial-single", "ab-test-setup"];
const tally = TALLY_IDS.flatMap((id) => {
  const s = services.find((x) => x.id === id);
  const p = s?.pricing[s.modes[0]];
  if (!s || !p) return [];
  const tp = getPrice(p);
  return [{ name: s.name, label: tp.label, amount: tp.amount }];
});
const tallyTotal = tally.reduce((sum, t) => sum + t.amount, 0);

const STANDARD_INCLUDES = [
  "Conversion audit + revenue-gap roadmap",
  "Monthly page builds",
  "A/B test programme",
  "AOV work: bundles, upsells, post-purchase",
  "Monthly report with revenue attribution",
  "Dedicated Slack with the team",
];

const PRO_INCLUDES = [
  "More resources, faster turnarounds",
  "Dedicated strategist",
  "Weekly strategy call",
  "Ad-to-page creative alignment",
  "Quarterly business reviews",
  "Multi-funnel scope",
];

function priceLabel(s: (typeof services)[number]) {
  const pricing = s.pricing[s.modes[0]];
  if (!pricing) return "";
  const label = getPrice(pricing).label;
  return s.volumeDiscounts?.length ? `From ${label}` : label;
}

/* Free-audit mention as text, not a CTA button. */
function AuditLink({
  children,
  tone = "light",
}: {
  children: React.ReactNode;
  tone?: "light" | "dark";
}) {
  const cls =
    tone === "dark"
      ? "text-white underline underline-offset-4 decoration-white/30 hover:decoration-white transition-colors"
      : "text-[#1B1B1B] underline underline-offset-4 decoration-[#C5C5C5] hover:decoration-[#1B1B1B] transition-colors";
  return (
    <Link href="/audit" className={`font-medium ${cls}`}>
      {children}
    </Link>
  );
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* ══ DARK · The Conversion Engine (pure value, no price) ══ */}
      <div className="bg-[#0A0A0A] text-white">
        <header className="px-6 md:px-12 py-5">
          <Logo height={16} className="text-white" />
        </header>

        <section className="px-6 md:px-12 pt-6 pb-9 max-w-5xl">
          <span className="inline-block text-[10px] font-bold uppercase tracking-[0.15em] px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-300 mb-4">
            Flagship partnership
          </span>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.02] mb-4">
            The Conversion Engine
          </h1>
          <p className="text-base md:text-lg text-white/55 leading-relaxed max-w-2xl">
            We turn the traffic you already pay for into revenue. A full
            conversion team, embedded: design, dev, copy and CRO under one roof,
            on a monthly system that compounds.
          </p>
        </section>

        <section className="px-6 md:px-12 pb-16 max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Standard — hero tier */}
            <div className="md:col-span-3 relative rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/[0.08] to-white/[0.01] p-6 md:p-8">
              <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                <h2 className="text-xl font-bold">Core</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500 text-[#0A0A0A]">
                  Most brands start here
                </span>
              </div>
              <p className="text-sm text-white/55 leading-relaxed mb-6 max-w-md">
                The full Conversion Engine. A complete conversion team on a
                monthly rhythm, owning the roadmap with you.
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/70 mb-3.5">
                Every month
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                {STANDARD_INCLUDES.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <CheckIcon className="size-3.5 text-emerald-400 mt-0.5 shrink-0" />
                    <span className="text-sm text-white leading-snug">{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pro — anchor tier */}
            <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-7">
              <h2 className="text-xl font-bold text-white/80 mb-2">Pro</h2>
              <p className="text-sm text-white/45 leading-relaxed mb-6">
                Same system, more of it. For brands that need speed and depth.
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-3.5">
                Everything in Core, plus
              </p>
              <ul className="space-y-3">
                {PRO_INCLUDES.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <CheckIcon className="size-3.5 text-white/35 mt-0.5 shrink-0" />
                    <span className="text-sm text-white/70 leading-snug">
                      {f}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Value visual: a month of build work, tallied, all included */}
          <div className="mt-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-5 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:items-center">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 mb-2">
                  It all comes included
                </p>
                <p className="text-sm text-white/85 leading-relaxed">
                  A single month can include the kind of build work brands
                  normally pay for as separate projects. No line items, no extra
                  invoices, it&apos;s all part of the partnership.
                </p>
              </div>

              {/* Receipt-style tally */}
              <div className="rounded-xl border border-white/10 bg-[#0A0A0A] p-4">
                <ul className="space-y-2.5 mb-3">
                  {tally.map((t) => (
                    <li
                      key={t.name}
                      className="flex items-baseline justify-between gap-3"
                    >
                      <span className="text-xs text-white/60 truncate">
                        {t.name}
                      </span>
                      <span className="text-xs tabular-nums text-white/35 line-through shrink-0">
                        {t.label}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex items-baseline justify-between gap-3 pt-3 border-t border-white/10">
                  <span className="text-xs text-white/50">
                    As one-off projects
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-white/35 line-through shrink-0">
                    {formatGBP(tallyTotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 mt-2.5">
                  <span className="text-sm font-semibold text-white">
                    In the Engine
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500 text-[#0A0A0A] shrink-0">
                    Included
                  </span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-sm text-white/55 leading-relaxed mt-6 max-w-2xl">
            Want to see how we can help?{" "}
            <AuditLink tone="dark">Get a free, surface-level audit</AuditLink> of
            your funnel and we&apos;ll show you where it leaks and what
            we&apos;d fix first.
          </p>

          <p className="text-xs italic text-white/30 mt-4">
            Expect 0.5-2% site-wide CVR lift in 90 days. If the numbers
            haven&apos;t moved, we have an honest conversation.
          </p>
        </section>
      </div>

      {/* ══ LIGHT · Regular deliverables (with prices) ══════════ */}
      <section className="px-6 md:px-12 pt-14 pb-14 max-w-3xl text-[#1B1B1B]">
        {/* Full Shopify site build: the lead project, directly below the partnership */}
        <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-[#F3F3F5] text-[#7A7A7A] mb-3">
          New build
        </span>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
          Full Shopify site build
        </h2>
        <p className="text-sm text-[#5A5A5A] leading-relaxed mb-5">
          Need a brand-new store rather than a partnership? We build the whole
          thing, custom-coded and conversion-first, end to end.
        </p>

        <div className="border-2 border-[#1B1B1B] rounded-2xl p-6 md:p-7 bg-white mb-14">
          <div className="flex items-baseline justify-between gap-3 mb-2">
            <h3 className="text-lg font-bold">Full Shopify site build</h3>
            <span className="text-xl font-bold tabular-nums shrink-0">
              From £14,999
            </span>
          </div>
          <p className="text-sm text-[#5A5A5A] leading-relaxed mb-4">
            A complete custom Shopify store designed to convert from day one.
            The full site, not a template: structure, design, copy and
            development handled in one go.
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
            {[
              "Custom Shopify theme, built from scratch",
              "Every core page: home, collections, PDP, cart, account",
              "Conversion-first design and copy throughout",
              "Custom development, apps and integrations",
              "Product and content migration",
              "Launch support, mobile and speed optimised",
            ].map((f) => (
              <li
                key={f}
                className="flex items-start gap-2 text-xs text-[#7A7A7A]"
              >
                <CheckIcon className="size-3 text-[#1B1B1B] mt-0.5 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Smaller one-off builds */}
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
          One-off builds
        </h2>
        <p className="text-sm text-[#5A5A5A] leading-relaxed mb-7">
          Or buy just the pages you need, no retainer.
        </p>

        {/* Funnel Build — featured */}
        {funnel && (
          <div className="border border-[#E5E5EA] rounded-2xl p-6 bg-white mb-4">
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold">Funnel Build</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#A16207]">
                  Most popular
                </span>
              </div>
              <span className="text-xl font-bold tabular-nums shrink-0">
                {priceLabel(funnel)}
              </span>
            </div>
            <p className="text-sm text-[#5A5A5A] leading-relaxed mb-4">
              Framing page, product page and cart, designed as one system. The
              full buyer journey from cold traffic to add-to-cart.
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
              {funnel.features.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2 text-xs text-[#7A7A7A]"
                >
                  <CheckIcon className="size-3 text-[#1B1B1B] mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Page builds — clean price list */}
        <div className="border border-[#E5E5EA] rounded-2xl divide-y divide-[#E5E5EA] mb-4">
          {pageBuilds.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between gap-4 px-5 py-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold">{s.name}</p>
                <p className="text-xs text-[#7A7A7A] truncate">
                  {s.description}
                </p>
              </div>
              <span className="text-sm font-bold tabular-nums shrink-0">
                {priceLabel(s)}
              </span>
            </div>
          ))}
        </div>

        {/* Add-ons — compact price list */}
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#7A7A7A] mb-3">
          Add-ons
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5">
          {addOns.map((s) => (
            <div
              key={s.id}
              className="flex items-baseline justify-between gap-3 border-b border-[#F0F0F0] pb-2"
            >
              <span className="text-sm text-[#1B1B1B] min-w-0 truncate">
                {s.name}
              </span>
              <span className="text-sm font-semibold tabular-nums text-[#5A5A5A] shrink-0">
                {priceLabel(s)}
              </span>
            </div>
          ))}
        </div>

        {/* Closing */}
        <div className="border-t border-[#E5E5EA] mt-12 pt-8">
          <h3 className="text-xl font-bold mb-2">Not sure where to start?</h3>
          <p className="text-sm text-[#5A5A5A] leading-relaxed max-w-xl">
            <AuditLink>Ask us for a free, surface-level audit</AuditLink> of your
            funnel. We&apos;ll show you the gaps and the gains, then you decide
            what fits.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#EDEDEF] px-6 md:px-12 py-6 text-center mt-auto">
        <p className="text-xs text-[#A0A0A0]">
          Built by{" "}
          <a
            href="https://ecomlanders.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[#7A7A7A] hover:text-[#1B1B1B] transition-colors"
          >
            Ecomlanders
          </a>
        </p>
      </footer>
    </div>
  );
}
