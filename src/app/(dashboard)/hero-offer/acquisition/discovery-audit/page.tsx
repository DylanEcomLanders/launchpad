"use client";

/* ── Discovery Audit / Reference deck ──
 *
 * What to look for during a £1k Discovery Audit. Slide-by-slide
 * walkthrough of every surface we check + the bar we measure
 * against. Reference material for the team; not client-facing.
 *
 * Want to BUILD an audit for a specific brand? Use /tools/discovery-audit
 * (the builder, linked from the header).
 */

import Link from "next/link";
import { DocumentMagnifyingGlassIcon, ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { ToolShell } from "@/lib/hero-offer/tool-shell";
import { SlideDeck, SlideCover, SlideBody } from "@/lib/hero-offer/slide-deck";

const SLIDES = [
  {
    label: "Cover",
    content: (
      <SlideCover
        badge="Discovery Audit"
        meta={[
          { label: "Section", value: "Acquisition" },
          { label: "Audience", value: "Internal team" },
          { label: "Purpose", value: "Reference deck" },
        ]}
        title="What we look for in a £1k audit."
        subtitle="The gateway to every Hero Offer engagement. We tear the brand's funnel down to the studs and score every surface against the bar that drives conversion."
        preparedFor={{ label: "Prepared for", value: "The Ecom Landers team" }}
        preparedBy={{ label: "Prepared by", value: "Ecom Landers" }}
      />
    ),
  },
  {
    label: "Approach",
    content: (
      <SlideBody eyebrow="Approach" title="One-week sprint, three deliverables.">
        <ul className="space-y-3 text-base">
          <li><strong className="text-[#0E0D0B]">1. Heuristic audit.</strong> Manual walkthrough of every funnel surface (Home → PLP → PDP → Cart → Checkout → Post-purchase). Mobile first, desktop second.</li>
          <li><strong className="text-[#0E0D0B]">2. Data audit.</strong> GA4 + Shopify reports. Where are users dropping? Which pages are leaking? What&apos;s the CR by source?</li>
          <li><strong className="text-[#0E0D0B]">3. Roadmap.</strong> 30/60/90 day prioritised list of fixes + tests ranked by ICE.</li>
        </ul>
      </SlideBody>
    ),
  },
  {
    label: "Homepage",
    content: (
      <SlideBody eyebrow="01 · Homepage" title="Above the fold.">
        <ul className="space-y-2 text-base">
          <li>• Is the value prop crystal clear in 3 seconds?</li>
          <li>• Is the hero image conversion-led (product hero / social proof / lifestyle), not just brand wallpaper?</li>
          <li>• Is the primary CTA visible without scrolling?</li>
          <li>• Does the headline answer &ldquo;what do you sell, who is it for, why should I care?&rdquo;</li>
          <li>• Above-fold trust signals: press, reviews, badges, stats?</li>
          <li>• Mobile: does the hero fit on screen without pushing the CTA below the fold?</li>
        </ul>
      </SlideBody>
    ),
  },
  {
    label: "Navigation + IA",
    content: (
      <SlideBody eyebrow="02 · Navigation + IA" title="Can users find what they need?">
        <ul className="space-y-2 text-base">
          <li>• Main nav: top 3-5 categories, no orphan links</li>
          <li>• Mega menu: does it reduce clicks for power users, or add friction?</li>
          <li>• Search bar: visible? Autocomplete? Empty-state suggestions?</li>
          <li>• Mobile hamburger: max 2 taps to any product</li>
          <li>• Breadcrumbs on PLP + PDP for orientation</li>
          <li>• Footer: real navigation, not just legal links</li>
        </ul>
      </SlideBody>
    ),
  },
  {
    label: "Collection (PLP)",
    content: (
      <SlideBody eyebrow="03 · Product Listing" title="Browsing the range.">
        <ul className="space-y-2 text-base">
          <li>• Filters: relevant, fast, no page reload</li>
          <li>• Sort: by best-selling default, then price/rating/newest</li>
          <li>• Card hierarchy: image, name, price, rating, swatch, quick-add</li>
          <li>• Hover state: secondary image / lifestyle shot</li>
          <li>• &ldquo;Quick view&rdquo; modal: reduces clicks, but only if PDP is heavy</li>
          <li>• Pagination vs infinite scroll: pagination for SEO + scroll position</li>
          <li>• Empty state: alternative products, not a dead end</li>
        </ul>
      </SlideBody>
    ),
  },
  {
    label: "PDP",
    content: (
      <SlideBody eyebrow="04 · Product Detail" title="The single highest-leverage page.">
        <ul className="space-y-2 text-base">
          <li>• Image gallery: 5+ shots, lifestyle + scale + detail + back/inside</li>
          <li>• Title + price + variant picker visible without scroll</li>
          <li>• Variant selector: clear OOS state, no &ldquo;unavailable&rdquo; mystery</li>
          <li>• Add to cart: sticky on mobile? Always visible?</li>
          <li>• Trust strip: returns, shipping, payment, warranty</li>
          <li>• Reviews: count, average, distribution, photo reviews, sortable</li>
          <li>• Cross-sell / upsell below fold (not interrupting decision)</li>
          <li>• FAQ accordion for objection-handling</li>
        </ul>
      </SlideBody>
    ),
  },
  {
    label: "Cart + Checkout",
    content: (
      <SlideBody eyebrow="05 · Cart + Checkout" title="Where the money happens.">
        <ul className="space-y-2 text-base">
          <li>• Cart drawer vs page: drawer for faster path</li>
          <li>• Free shipping bar: progress to threshold</li>
          <li>• Upsell in cart: bundle/post-purchase/insurance/express</li>
          <li>• Discount code field: above fold but not distracting</li>
          <li>• Checkout: minimum fields, guest checkout, address autocomplete</li>
          <li>• Express pay: Apple Pay / Shop Pay / PayPal at top</li>
          <li>• Trust signals on checkout: secure badge, return policy, support contact</li>
          <li>• Order summary always visible (sticky on mobile)</li>
        </ul>
      </SlideBody>
    ),
  },
  {
    label: "Mobile",
    content: (
      <SlideBody eyebrow="06 · Mobile" title="Where 70%+ of traffic lives.">
        <ul className="space-y-2 text-base">
          <li>• Tap targets: 44px minimum, no fat-fingering</li>
          <li>• Sticky add-to-cart on PDP</li>
          <li>• Hero CTA visible without scroll</li>
          <li>• Image gallery: swipeable, indexed, full-screen tap</li>
          <li>• Forms: correct input types (tel, email, numeric), autocomplete</li>
          <li>• No layout shift on load (CLS &lt; 0.1)</li>
          <li>• Hover states translated to tap states</li>
        </ul>
      </SlideBody>
    ),
  },
  {
    label: "Speed",
    content: (
      <SlideBody eyebrow="07 · Site Speed" title="Every second costs conversion.">
        <ul className="space-y-2 text-base">
          <li>• LCP &lt; 2.5s on mobile (test on 3G + 4G)</li>
          <li>• FID / INP &lt; 200ms</li>
          <li>• CLS &lt; 0.1</li>
          <li>• Image weight: WebP, lazy-load below fold, responsive srcset</li>
          <li>• Third-party scripts: count, weight, blocking? (Klaviyo, Gorgias, Yotpo, etc)</li>
          <li>• App bloat: count installed apps, identify the heavy ones</li>
          <li>• Run PageSpeed Insights, WebPageTest, GTmetrix - cross-reference</li>
        </ul>
      </SlideBody>
    ),
  },
  {
    label: "Trust + Social Proof",
    content: (
      <SlideBody eyebrow="08 · Trust + Social Proof" title="Do they believe you?">
        <ul className="space-y-2 text-base">
          <li>• Review count + average rating prominent on home, PLP, PDP</li>
          <li>• Photo reviews + UGC throughout</li>
          <li>• Press mentions / &ldquo;as seen in&rdquo; strip</li>
          <li>• Customer count / unit count (&ldquo;100k+ shipped&rdquo;)</li>
          <li>• Guarantees: returns, warranty, money-back</li>
          <li>• Founder story + about page: real humans behind the brand</li>
          <li>• Live chat or contact CTA on every page</li>
          <li>• Trustpilot / Yotpo widget in footer</li>
        </ul>
      </SlideBody>
    ),
  },
  {
    label: "Copy",
    content: (
      <SlideBody eyebrow="09 · Copy + Messaging" title="Does it sell?">
        <ul className="space-y-2 text-base">
          <li>• Headlines: outcome-led, not feature-led</li>
          <li>• Product descriptions: benefits before specs</li>
          <li>• Objection-handling copy near the buy button</li>
          <li>• CTA microcopy: &ldquo;Add to cart&rdquo; vs &ldquo;Get yours&rdquo; vs &ldquo;Start saving&rdquo;</li>
          <li>• Email capture: what&apos;s the offer? (10% off / early access / free guide)</li>
          <li>• Tone of voice consistent across home / PDP / email</li>
          <li>• Avoid jargon, marketing speak, vague claims</li>
        </ul>
      </SlideBody>
    ),
  },
  {
    label: "AOV mechanisms",
    content: (
      <SlideBody eyebrow="10 · AOV" title="Bundles, upsells, post-purchase.">
        <ul className="space-y-2 text-base">
          <li>• Bundle builder on PDP or category page</li>
          <li>• &ldquo;Frequently bought together&rdquo; on PDP</li>
          <li>• Cart upsell (one-click add)</li>
          <li>• Post-purchase upsell page (one-click no re-checkout)</li>
          <li>• Thank-you page upsell + referral capture</li>
          <li>• Subscribe + save option on PDP</li>
          <li>• Gift options / personalisation</li>
        </ul>
      </SlideBody>
    ),
  },
  {
    label: "Tracking",
    content: (
      <SlideBody eyebrow="11 · Tracking + Analytics" title="Can we measure what we change?">
        <ul className="space-y-2 text-base">
          <li>• GA4 + GTM set up correctly (no duplicate events)</li>
          <li>• Server-side tracking (Conversions API)</li>
          <li>• Klaviyo flows capturing every key event</li>
          <li>• Meta + Google + TikTok pixels firing on every step</li>
          <li>• Heatmap tool installed (Hotjar / Clarity / Mouseflow)</li>
          <li>• Session recording sample available</li>
          <li>• Funnel report in GA4 set up (Home → PLP → PDP → Cart → Checkout → Purchase)</li>
        </ul>
      </SlideBody>
    ),
  },
  {
    label: "Output",
    content: (
      <SlideBody eyebrow="12 · The Deliverable" title="What we hand over.">
        <ul className="space-y-3 text-base">
          <li><strong className="text-[#0E0D0B]">Slide deck audit.</strong> 20-40 slides with screenshots, scored against the bar, ranked by impact.</li>
          <li><strong className="text-[#0E0D0B]">Quick wins list.</strong> 5-10 changes the brand can make immediately, no Hero Offer needed.</li>
          <li><strong className="text-[#0E0D0B]">30/60/90 roadmap.</strong> What we&apos;d do in the first three months if they signed.</li>
          <li><strong className="text-[#0E0D0B]">Live audit walkthrough.</strong> 60-minute call with the founder + screen share.</li>
        </ul>
      </SlideBody>
    ),
  },
  {
    label: "Next",
    content: (
      <SlideBody eyebrow="Next" title="Build the audit.">
        <p className="text-base">
          When you&apos;re ready to actually run an audit for a specific brand, jump into the builder:
        </p>
        <Link
          href="/tools/discovery-audit"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-semibold mt-4"
        >
          Open the Discovery Audit builder
          <ArrowTopRightOnSquareIcon className="size-4" />
        </Link>
      </SlideBody>
    ),
  },
];

export default function DiscoveryAuditReferencePage() {
  return (
    <ToolShell
      title="Discovery Audit"
      blurb="What to look for in a £1k Discovery Audit. Reference deck for the team. Use the builder at /tools/discovery-audit to assemble an audit for a specific brand."
      parentHref="/hero-offer/acquisition"
      parentLabel="Acquisition"
      status="live"
      accent="emerald"
      icon={<DocumentMagnifyingGlassIcon className="size-4" />}
    >
      <SlideDeck slides={SLIDES} deckTitle="Discovery Audit" />
    </ToolShell>
  );
}
