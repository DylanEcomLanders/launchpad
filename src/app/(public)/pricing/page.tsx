"use client";

import { useState } from "react";
import { CheckIcon } from "@heroicons/react/24/solid";
import { Logo } from "@/components/logo";
import { services as allServices, getPrice, formatGBP } from "@/data/services";

/* ──────────────────────────────────────────────────────────────
   Client-facing price list. Dark, editorial, monochrome.
   Structure (top to bottom):
     · sticky nav
     · hero + billing toggle (Monthly / Pay up front -10%)
     · three priced tiers (Entry / Core hero / VIP)
     · credibility strip
     · "all included" value tally
     · feature comparison matrix (desktop)
     · one-off builds
     · FAQ accordion
     · closing CTA + footer
   The free audit is always a plain text/link offer.
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

/* The three partnership tiers, low to high. Core is the hero.
   `monthly` is the headline monthly figure in GBP. */
const TIERS = [
  {
    name: "Entry",
    monthly: 5000,
    blurb:
      "The Conversion Engine at a starter cadence. A proven system, dialled in to a focused scope.",
    features: [
      "2 page builds per month",
      "2 A/B tests per month",
      "Biweekly strategy calls",
      "Biweekly reports on results",
    ],
    featured: false,
  },
  {
    name: "Core",
    monthly: 10000,
    badge: "Most chosen",
    blurb:
      "The full Conversion Engine on a weekly rhythm. A complete conversion team owning the roadmap with you.",
    features: [
      "4 page builds per month",
      "4 A/B tests per month",
      "Weekly strategy calls (optional)",
      "Weekly reports on results",
    ],
    featured: true,
  },
  {
    name: "VIP",
    monthly: 15000,
    blurb:
      "Maximum velocity. More builds, an aggressive test programme and priority on every deliverable.",
    features: [
      "6 page builds per month",
      "12 A/B tests per month",
      "Weekly strategy calls",
      "Weekly reports on results",
      "Priority turnaround on deliverables",
      "Quarterly brand-strategy calls",
    ],
    featured: false,
  },
];

/* Feature comparison matrix. Cell value: string = label, true = check,
   false = not included. Order of values is Entry / Core / VIP. */
const MATRIX: {
  group: string;
  rows: { label: string; values: (string | boolean)[] }[];
}[] = [
  {
    group: "Every month",
    rows: [
      { label: "Page builds", values: ["2", "4", "6"] },
      { label: "A/B tests", values: ["2", "4", "12"] },
      {
        label: "Conversion audit + revenue-gap roadmap",
        values: [true, true, true],
      },
      {
        label: "AOV work: bundles, upsells, post-purchase",
        values: [true, true, true],
      },
    ],
  },
  {
    group: "Strategy & reporting",
    rows: [
      {
        label: "Strategy calls",
        values: ["Biweekly", "Weekly", "Weekly"],
      },
      {
        label: "Reports on results",
        values: ["Biweekly", "Weekly", "Weekly"],
      },
      { label: "Revenue attribution", values: [true, true, true] },
      { label: "Dedicated Slack channel", values: [true, true, true] },
      {
        label: "Quarterly brand-strategy call",
        values: [false, false, true],
      },
    ],
  },
  {
    group: "Service level",
    rows: [
      {
        label: "Priority turnaround on deliverables",
        values: [false, false, true],
      },
      {
        label: "Minimum commitment",
        values: ["90 days", "90 days", "90 days"],
      },
      { label: "Pay-up-front discount", values: ["10%", "10%", "10%"] },
    ],
  },
];

/* £5,000 -> "£5k", £13,500 -> "£13.5k" */
function fmtK(n: number) {
  const k = n / 1000;
  return `£${Number.isInteger(k) ? k : k.toFixed(1)}k`;
}

function priceLabel(s: (typeof services)[number]) {
  const pricing = s.pricing[s.modes[0]];
  if (!pricing) return "";
  const label = getPrice(pricing).label;
  return s.volumeDiscounts?.length ? `From ${label}` : label;
}

const GRID = "grid grid-cols-[minmax(0,1.7fr)_repeat(3,minmax(0,1fr))]";

export default function PricingPage() {
  const [billing, setBilling] = useState<"monthly" | "upfront">("monthly");
  const upfront = billing === "upfront";

  return (
    <div className="min-h-screen bg-background text-surface-raised flex flex-col">
      {/* ══ Header ════════════════════════════════════════════════ */}
      <header className="border-b border-white/5">
        <div className="max-w-6xl mx-auto w-full flex items-center px-6 md:px-12 h-16">
          <Logo height={16} className="text-white" />
        </div>
      </header>

      {/* ══ Hero ═════════════════════════════════════════════════ */}
      <section
        id="partnership"
        className="px-6 md:px-12 pt-14 md:pt-24 pb-10 max-w-6xl mx-auto w-full scroll-mt-20"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/45 mb-6">
          Conversion partnership
        </p>
        <h1 className="text-5xl md:text-7xl font-semibold tracking-[-0.03em] leading-[0.95] mb-6">
          The Conversion Engine.
          <br />
          <span className="text-white/45">Built to compound.</span>
        </h1>
        <p className="text-base md:text-lg text-white/55 leading-relaxed max-w-xl">
          We turn the traffic you already pay for into revenue. A full
          conversion team, embedded in your business: design, dev, copy and CRO
          under one roof, on a monthly system.
        </p>
      </section>

      {/* Billing toggle */}
      <div className="px-6 md:px-12 max-w-6xl mx-auto w-full mb-7">
        <div className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/[0.03] p-1">
          <button
            onClick={() => setBilling("monthly")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              !upfront ? "bg-white text-background" : "text-white/55 hover:text-white"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("upfront")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors flex items-center gap-2 ${
              upfront ? "bg-white text-background" : "text-white/55 hover:text-white"
            }`}
          >
            Pay up front
            <span
              className={`font-mono text-[10px] tracking-wider ${
                upfront ? "text-background/60" : "text-white/40"
              }`}
            >
              -10%
            </span>
          </button>
        </div>
      </div>

      {/* ══ Tiers ════════════════════════════════════════════════ */}
      <section className="px-6 md:px-12 pb-12 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 items-stretch">
          {TIERS.map((tier) => {
            const amount = upfront ? tier.monthly * 0.9 : tier.monthly;
            const featured = tier.featured;
            return (
              <div
                key={tier.name}
                className={
                  featured
                    ? "rounded-3xl bg-surface-raised text-surface p-7 md:p-8 shadow-xl shadow-black/30"
                    : "rounded-3xl border border-white/12 bg-white/[0.025] p-7 md:p-8"
                }
              >
                <div className="flex items-center justify-between gap-2 mb-6">
                  <h2
                    className={`text-lg font-semibold ${featured ? "" : "text-white/85"}`}
                  >
                    {tier.name}
                  </h2>
                  {featured && tier.badge && (
                    <span className="font-mono text-[9px] font-medium uppercase tracking-[0.18em] px-2.5 py-1 rounded-full bg-surface text-surface-raised">
                      {tier.badge}
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-1.5">
                  <span
                    className={`text-5xl font-semibold tracking-[-0.03em] tabular-nums ${featured ? "" : "text-white/90"}`}
                  >
                    {fmtK(amount)}
                  </span>
                  <span
                    className={`text-sm ${featured ? "text-surface/45" : "text-white/40"}`}
                  >
                    /mo
                  </span>
                </div>
                <p
                  className={`font-mono text-[11px] mt-2 ${featured ? "text-surface/45" : "text-white/35"}`}
                >
                  {upfront
                    ? `${fmtK(amount * 3)} up front for 90 days, 10% off`
                    : "billed monthly"}
                </p>

                <p
                  className={`text-sm leading-relaxed mt-4 mb-6 ${featured ? "text-surface/60" : "text-white/50"}`}
                >
                  {tier.blurb}
                </p>

                <div
                  className={`h-px mb-6 ${featured ? "bg-surface/10" : "bg-white/10"}`}
                />

                <ul className="space-y-3.5">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <CheckIcon
                        className={`size-3.5 mt-0.5 shrink-0 ${featured ? "text-surface" : "text-white/35"}`}
                      />
                      <span
                        className={`text-sm leading-snug ${featured ? "" : "text-white/70"}`}
                      >
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <p className="font-mono text-[10px] md:text-[11px] uppercase tracking-[0.2em] text-white/35 mt-10 text-center">
          90-day initial commitment · 10% off when paid up front
        </p>
      </section>

      {/* ══ Value tally ══════════════════════════════════════════ */}
      <section className="px-6 md:px-12 pt-4 md:pt-6 pb-4 max-w-6xl mx-auto w-full">
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-10 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 md:items-center">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-white/40 mb-4">
              It all comes included
            </p>
            <h3 className="text-2xl md:text-3xl font-semibold tracking-[-0.02em] leading-tight mb-4">
              A single month carries the kind of build work brands usually buy as
              separate projects.
            </h3>
            <p className="text-sm text-white/50 leading-relaxed max-w-md">
              No line items, no extra invoices. It is all part of the
              partnership.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-background p-5 md:p-6">
            <ul className="space-y-3 mb-4">
              {tally.map((t) => (
                <li
                  key={t.name}
                  className="flex items-baseline justify-between gap-3"
                >
                  <span className="text-sm text-white/65 truncate">{t.name}</span>
                  <span className="font-mono text-xs tabular-nums text-white/35 line-through shrink-0">
                    {t.label}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex items-baseline justify-between gap-3 pt-4 border-t border-white/10">
              <span className="text-sm text-white/50">As one-off projects</span>
              <span className="font-mono text-sm font-medium tabular-nums text-white/35 line-through shrink-0">
                {formatGBP(tallyTotal)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 mt-3">
              <span className="text-sm font-semibold text-white">
                In the Engine
              </span>
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.15em] px-3 py-1 rounded-full bg-surface-raised text-background shrink-0">
                Included
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ══ Comparison matrix (desktop) ══════════════════════════ */}
      <section
        id="compare"
        className="hidden md:block px-6 md:px-12 pt-16 md:pt-24 pb-4 max-w-6xl mx-auto w-full scroll-mt-20"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-white/40 mb-4">
          Compare plans
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-[-0.02em] mb-10">
          Every tier, side by side
        </h2>

        <div className="border border-white/10 rounded-2xl overflow-hidden">
          {/* header */}
          <div className={`${GRID} items-end px-7 pt-7 pb-5`}>
            <span />
            {TIERS.map((t) => {
              const amount = upfront ? t.monthly * 0.9 : t.monthly;
              return (
                <div key={t.name} className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-sm font-semibold">{t.name}</span>
                    {t.featured && (
                      <span className="size-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <p className="font-mono text-xs tabular-nums text-white/45 mt-1">
                    {fmtK(amount)}/mo
                  </p>
                </div>
              );
            })}
          </div>

          {MATRIX.map((group) => (
            <div key={group.group}>
              <div className="px-7 py-2.5 bg-white/[0.03] border-y border-white/10">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
                  {group.group}
                </span>
              </div>
              {group.rows.map((row) => (
                <div
                  key={row.label}
                  className={`${GRID} items-center px-7 py-3.5 border-b border-white/[0.06] last:border-0`}
                >
                  <span className="text-sm text-white/70 pr-4">{row.label}</span>
                  {row.values.map((v, i) => {
                    const hero = TIERS[i].featured;
                    return (
                      <div key={i} className="text-center">
                        {typeof v === "boolean" ? (
                          v ? (
                            <CheckIcon
                              className={`size-4 mx-auto ${hero ? "text-white" : "text-white/45"}`}
                            />
                          ) : (
                            <span className="inline-block w-2.5 h-px bg-white/20 align-middle" />
                          )
                        ) : (
                          <span
                            className={`text-sm tabular-nums ${hero ? "text-white font-medium" : "text-white/60"}`}
                          >
                            {v}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ══ One-off builds ═══════════════════════════════════════ */}
      <section
        id="one-off"
        className="px-6 md:px-12 pt-20 md:pt-28 pb-20 md:pb-28 max-w-6xl mx-auto w-full scroll-mt-20"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-white/40 mb-4">
          Or buy individually
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-[-0.02em] mb-3">
          One-off builds
        </h2>
        <p className="text-white/55 leading-relaxed mb-10 max-w-xl">
          Need a brand-new store, or just the pages you need without a retainer?
          We build those too.
        </p>

        {/* Full Shopify site build */}
        <div className="border border-white/12 rounded-3xl p-7 md:p-9 bg-white/[0.025] mb-4">
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <h3 className="text-lg font-semibold">Full Shopify site build</h3>
            <span className="text-2xl font-semibold tabular-nums shrink-0">
              From £15,000
            </span>
          </div>
          <p className="text-sm text-white/55 leading-relaxed mb-6 max-w-lg">
            A complete custom Shopify store designed to convert from day one. The
            full site, not a template: structure, design, copy and development
            handled in one go.
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5">
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
                className="flex items-start gap-2.5 text-sm text-white/70"
              >
                <CheckIcon className="size-3.5 text-white/40 mt-0.5 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Funnel Build */}
        {funnel && (
          <div className="border border-white/12 rounded-3xl p-7 bg-white/[0.025] mb-4">
            <div className="flex items-baseline justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-lg font-semibold">Funnel Build</h3>
                <span className="font-mono text-[9px] font-medium uppercase tracking-[0.18em] px-2.5 py-1 rounded-full bg-surface-raised text-background">
                  Most popular
                </span>
              </div>
              <span className="text-xl font-semibold tabular-nums shrink-0">
                {priceLabel(funnel)}
              </span>
            </div>
            <p className="text-sm text-white/55 leading-relaxed mb-6 max-w-lg">
              Framing page, product page and cart, designed as one system. The
              full buyer journey from cold traffic to add-to-cart.
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5">
              {funnel.features.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2.5 text-sm text-white/70"
                >
                  <CheckIcon className="size-3.5 text-white/40 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Page builds price list */}
        <div className="border border-white/12 rounded-3xl divide-y divide-white/[0.07] bg-white/[0.025] mb-12 overflow-hidden">
          {pageBuilds.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between gap-4 px-6 py-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold">{s.name}</p>
                <p className="text-xs text-white/45 truncate">{s.description}</p>
              </div>
              <span className="text-sm font-semibold tabular-nums shrink-0">
                {priceLabel(s)}
              </span>
            </div>
          ))}
        </div>

        {/* Add-ons */}
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-white/40 mb-4">
          Add-ons
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-3">
          {addOns.map((s) => (
            <div
              key={s.id}
              className="flex items-baseline justify-between gap-3 border-b border-white/10 pb-2.5"
            >
              <span className="text-sm text-white/85 min-w-0 truncate">
                {s.name}
              </span>
              <span className="text-sm font-semibold tabular-nums text-white/60 shrink-0">
                {priceLabel(s)}
              </span>
            </div>
          ))}
        </div>
      </section>


      {/* ══ Footer ═══════════════════════════════════════════════ */}
      <footer className="border-t border-white/8 mt-auto">
        <div className="max-w-6xl mx-auto w-full px-6 md:px-12 py-7 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Logo height={14} className="text-white/70" />
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
            Built by{" "}
            <a
              href="https://ecomlanders.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/60 hover:text-white transition-colors"
            >
              Ecomlanders
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
