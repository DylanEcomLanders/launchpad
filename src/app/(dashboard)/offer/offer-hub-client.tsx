"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ChatBubbleLeftRightIcon,
  BookmarkIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  ChevronRightIcon,
  ArrowTopRightOnSquareIcon,
  PlayIcon,
  CheckIcon,
  XMarkIcon,
  ArrowUturnLeftIcon,
} from "@heroicons/react/24/outline";
import { RevenueProjectorWidget } from "@/components/offer-engine/revenue-projector-widget";
import { DeckCoverPreview } from "@/components/offer-engine/deck-cover-preview";

const STORAGE_KEY = "offer-tier-index";

interface Tier {
  step: number;
  retainers: string;
  price: string;
  value: number;
  note: string;
}

const TIERS: Tier[] = [
  { step: 1, retainers: "0–4 retainers", price: "£8K", value: 8000, note: "Current floor — lead with this." },
  { step: 2, retainers: "5 retainers", price: "£10K", value: 10000, note: "Capacity tightening." },
  { step: 3, retainers: "10 retainers", price: "£15K", value: 15000, note: "Waitlist begins." },
  { step: 4, retainers: "15 retainers", price: "£20K", value: 20000, note: "Selective intake." },
  { step: 5, retainers: "20 retainers", price: "£25K", value: 25000, note: "Premium-only." },
];

interface SectionTile {
  slug: string;
  title: string;
  blurb: string;
  icon: React.ReactNode;
  href: string;
  external?: boolean;
}

const objectionTiles: SectionTile[] = [
  {
    slug: "faq",
    title: "FAQ",
    blurb: "Client-facing + internal — common questions.",
    icon: <ChatBubbleLeftRightIcon className="size-4" />,
    href: "/offer/08-faq",
  },
  {
    slug: "objections",
    title: "Objections",
    blurb: "Ten common pushbacks with the response we lead with.",
    icon: <ChatBubbleLeftRightIcon className="size-4" />,
    href: "/offer/09-objections",
  },
  {
    slug: "cheatsheet",
    title: "Cheat Sheet",
    blurb: "One-screen sales reference with copy-to-clipboard objections.",
    icon: <BookmarkIcon className="size-4" />,
    href: "/internal/cheatsheet/conversion-engine",
    external: true,
  },
];

const closingTiles: SectionTile[] = [
  {
    slug: "proposals",
    title: "Proposal Generator",
    blurb: "Generate a branded proposal with a shareable link.",
    icon: <DocumentTextIcon className="size-4" />,
    href: "/tools/proposals",
    external: true,
  },
  {
    slug: "onboarding",
    title: "Onboarding Link",
    blurb: "Public form to send to a newly-signed client.",
    icon: <ClipboardDocumentListIcon className="size-4" />,
    href: "/onboard",
    external: true,
  },
];

export default function OfferHubClient({ previewImages }: { previewImages: string[] }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored) {
      const n = parseInt(stored, 10);
      if (!isNaN(n) && n >= 0 && n < TIERS.length) setCurrentIdx(n);
    }
    setHydrated(true);
  }, []);

  const activeIdx = previewIdx ?? currentIdx;
  const activeTier = TIERS[activeIdx];
  const currentTier = TIERS[currentIdx];
  const isPreviewing = previewIdx !== null && previewIdx !== currentIdx;

  const handleTileClick = (i: number) => {
    setPreviewIdx(i === currentIdx ? null : i);
  };

  const handleLockIn = () => {
    if (previewIdx === null) return;
    setCurrentIdx(previewIdx);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, String(previewIdx));
    setPreviewIdx(null);
  };

  const handleCancel = () => setPreviewIdx(null);

  const handleReset = () => {
    setCurrentIdx(0);
    if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
    setPreviewIdx(null);
  };

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <header className="mb-8 border-b border-[#F0F0F0] pb-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#BBB]">
          Internal · Sales Hub
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-[#1B1B1B] mt-1">
          Conversion Engine
        </h1>
        <p className="text-sm text-[#666] mt-1">
          The{" "}
          <span className={`font-semibold ${isPreviewing ? "text-white bg-[#00C853] px-1 rounded" : "text-[#1B1B1B]"}`}>
            {activeTier.price}
          </span>{" "}
          post-click partnership — everything you need to sell, handle objections, and close.
        </p>
      </header>

      {/* Pricing block */}
      <section className="mb-6">
        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-[#999] mb-3">
          § Pricing — always quote both
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Buy-in card */}
          <div
            className={`rounded-lg border bg-[#1B1B1B] text-white p-5 transition-all ${
              isPreviewing ? "border-[#00C853] ring-2 ring-[#00C853]/30" : "border-[#1B1B1B]"
            }`}
          >
            <div className="flex items-baseline justify-between mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
                The buy-in
              </p>
              <p className="text-[10px] font-medium text-white/60">
                {isPreviewing ? "Previewing" : "Lead with this"}
              </p>
            </div>
            <p className="text-3xl font-semibold tracking-tight">
              {activeTier.price}
              <span className="text-sm font-normal text-white/60 ml-1">/mo</span>
            </p>
            <p className="text-[12px] leading-snug text-white/70 mt-2">
              The full Conversion Engine in its standard shape. Roadmap, monthly builds,
              A/B test programme, monthly report, dedicated Slack.
            </p>
            <p className="text-[11px] text-white/50 mt-3 italic">
              &ldquo;Your full conversion team for less than one senior hire.&rdquo;
            </p>
          </div>
          {/* Anchor */}
          <div className="rounded-lg border border-[#E5E5EA] bg-[#FAFAFA] p-5">
            <div className="flex items-baseline justify-between mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#999]">
                The anchor
              </p>
              <p className="text-[10px] font-medium text-[#999]">Quote alongside</p>
            </div>
            <p className="text-3xl font-semibold tracking-tight text-[#1B1B1B]">
              £12K<span className="text-sm font-normal text-[#999] ml-1">/mo</span>
            </p>
            <p className="text-[12px] leading-snug text-[#666] mt-2">
              Same system, more of it. 48h design / 5d build, dedicated strategist, ad-to-page
              alignment, quarterly reviews.
            </p>
            <p className="text-[11px] text-[#999] mt-3 italic">
              &ldquo;For brands scaling past 8 figures who need speed and depth.&rdquo;
            </p>
          </div>
        </div>
        <p className="text-[11px] text-[#999] mt-2">
          No tiers. No T1/T2. £12K exists so the buy-in feels like the deal — never quote it alone.
          Bigger scopes price upward naturally.
        </p>
      </section>

      {/* Preview action bar */}
      {isPreviewing && hydrated && (
        <div className="mb-6 rounded-lg border border-[#00C853] bg-[#E8F5E9] p-3 flex items-center justify-between gap-3">
          <p className="text-[12px] text-[#1B1B1B]">
            <span className="font-semibold">Previewing</span> Step {activeTier.step} ·{" "}
            <span className="font-semibold tabular-nums">{activeTier.price}</span> floor —{" "}
            <span className="text-[#666]">{activeTier.note}</span>
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCancel}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-[#666] hover:text-[#1B1B1B] px-2 py-1 rounded"
            >
              <XMarkIcon className="size-3" />
              Cancel
            </button>
            <button
              onClick={handleLockIn}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-white bg-[#1B1B1B] hover:bg-black px-2.5 py-1 rounded"
            >
              <CheckIcon className="size-3" />
              Lock in
            </button>
          </div>
        </div>
      )}

      {/* Pricing roadmap */}
      <section className="mb-8">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-[#999]">
            § Pricing roadmap — floor rises with demand
          </h2>
          {hydrated && currentIdx !== 0 && (
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1 text-[10px] font-medium text-[#999] hover:text-[#1B1B1B]"
            >
              <ArrowUturnLeftIcon className="size-3" />
              Reset to default
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {TIERS.map((t, i) => {
            const isCurrent = i === currentIdx;
            const isPreview = i === previewIdx && i !== currentIdx;
            return (
              <button
                key={t.step}
                type="button"
                onClick={() => handleTileClick(i)}
                className={`text-left rounded-lg border p-3 transition-all ${
                  isCurrent
                    ? "border-[#1B1B1B] bg-white"
                    : isPreview
                      ? "border-[#00C853] bg-[#E8F5E9] ring-2 ring-[#00C853]/30"
                      : "border-[#E5E5EA] bg-[#FAFAFA] hover:border-[#999] hover:bg-white"
                }`}
              >
                <div className="flex items-baseline justify-between mb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#999]">
                    Step {t.step}
                  </p>
                  {isCurrent && (
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-white bg-[#00C853] px-1.5 py-0.5 rounded">
                      Now
                    </span>
                  )}
                  {isPreview && (
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-white bg-[#1B1B1B] px-1.5 py-0.5 rounded">
                      Preview
                    </span>
                  )}
                </div>
                <p className="text-xl font-semibold tracking-tight text-[#1B1B1B] tabular-nums">
                  {t.price}
                  <span className="text-[11px] font-normal text-[#999] ml-1">/mo</span>
                </p>
                <p className="text-[11px] font-medium text-[#666] mt-1">{t.retainers}</p>
                <p className="text-[11px] leading-snug text-[#999] mt-1">{t.note}</p>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-[#999] mt-2">
          Click a step to preview pricing across the page. Lock it in to update the offer.
          Currently locked: <span className="font-semibold text-[#1B1B1B]">{currentTier.price}</span>.
        </p>
      </section>

      {/* Sales bento */}
      <Section label="§ Sales">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <RevenueProjectorWidget retainer={activeTier.value} />
          </div>
          <Link href="/sales-deck" className="block h-full group">
            <div className="relative rounded-lg overflow-hidden border border-[#1B1B1B] bg-[#0a0a0a] h-full flex flex-col hover:shadow-[var(--shadow-soft)] transition-all duration-150">
              <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-white/45 bg-white/5 backdrop-blur-sm px-1.5 py-0.5 rounded">
                  10 slides
                </span>
                <ArrowTopRightOnSquareIcon className="size-3.5 text-white/55 group-hover:text-white transition-colors" />
              </div>
              <div className="flex-1 p-3 pt-10">
                <DeckCoverPreview backdropImages={previewImages} />
              </div>
              <div className="px-4 pb-3 pt-1 flex items-end justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-white leading-tight">The Deck</h3>
                  <p className="text-[10px] text-white/45 italic mt-1 leading-snug">
                    Diagnosis · Projection · Offer · ROI
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 bg-white text-[#0a0a0a] text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded shrink-0 group-hover:bg-[#00C853] transition-colors">
                  <PlayIcon className="size-2.5" />
                  Present
                </span>
              </div>
            </div>
          </Link>
        </div>
      </Section>

      <Section label="§ Objections">
        <Grid>
          {objectionTiles.map((t) => (
            <Tile key={t.slug} tile={t} />
          ))}
        </Grid>
      </Section>

      <Section label="§ Closing">
        <Grid>
          {closingTiles.map((t) => (
            <Tile key={t.slug} tile={t} />
          ))}
        </Grid>
      </Section>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-[10px] font-semibold uppercase tracking-wider text-[#999] mb-3">
        {label}
      </h2>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">{children}</div>;
}

function Tile({ tile }: { tile: SectionTile }) {
  return (
    <Link key={tile.slug} href={tile.href} className="block h-full">
      <div className="rounded-lg border border-[#E5E5EA] bg-white p-4 hover:border-[#1B1B1B] hover:shadow-[var(--shadow-soft)] transition-all duration-150 h-full flex flex-col">
        <div className="flex items-start justify-between mb-2">
          <span className="text-[#666]">{tile.icon}</span>
          {tile.external ? (
            <ArrowTopRightOnSquareIcon className="size-3.5 text-[#CCC]" />
          ) : (
            <ChevronRightIcon className="size-3.5 text-[#CCC]" />
          )}
        </div>
        <p className="text-sm font-medium text-[#1B1B1B] leading-tight">{tile.title}</p>
        <p className="text-[12px] leading-snug text-[#666] mt-1 flex-1">{tile.blurb}</p>
      </div>
    </Link>
  );
}
