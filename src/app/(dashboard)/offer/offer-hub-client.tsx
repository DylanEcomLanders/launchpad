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
  anchor: string;
  note: string;
}

const TIERS: Tier[] = [
  { step: 1, retainers: "0–4 retainers", price: "£8K", value: 8000, anchor: "£12K", note: "Current floor — lead with this." },
  { step: 2, retainers: "5 retainers", price: "£10K", value: 10000, anchor: "£15K", note: "Capacity tightening." },
  { step: 3, retainers: "10 retainers", price: "£15K", value: 15000, anchor: "£20K", note: "Waitlist begins." },
  { step: 4, retainers: "15 retainers", price: "£20K", value: 20000, anchor: "£25K", note: "Selective intake." },
  { step: 5, retainers: "20 retainers", price: "£25K", value: 25000, anchor: "£35K", note: "Premium-only." },
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
    <div className="max-w-[1400px] mx-auto">
      {/* ── Dark hero: above-the-fold pricing focus ── */}
      <section className="relative overflow-hidden rounded-b-2xl bg-background px-6 pb-10 pt-8 md:px-10">
        {/* Soft radial glow backdrop */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-40 h-[480px] w-[480px] rounded-full opacity-60 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 40%, transparent 70%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.4]"
          style={{
            background:
              "radial-gradient(120% 80% at 50% -10%, rgba(255,255,255,0.06) 0%, transparent 55%)",
          }}
        />

        <div className="relative">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle">
            Internal · Sales Hub
          </p>
          <h1 className="mt-2 text-[28px] leading-tight font-semibold text-foreground">
            Conversion Engine
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            The post-click partnership. Always quote both: lead with the buy-in,
            let the premium anchor it.
          </p>

          {/* Two pricing cards: Regular (buy-in, highlighted) + Pro (anchor) */}
          <div className="mt-7 grid grid-cols-1 gap-4 md:max-w-3xl md:grid-cols-2">
            {/* Regular — the buy-in, highlighted as the recommended pick */}
            <div
              className={`group relative overflow-hidden rounded-2xl border p-[1px] transition-all ${
                isPreviewing
                  ? "border-success/40"
                  : "border-border"
              }`}
            >
              <div className="relative rounded-2xl bg-surface p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
                    Regular
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                      isPreviewing
                        ? "bg-success text-background"
                        : "bg-accent text-accent-foreground"
                    }`}
                  >
                    {isPreviewing ? "Previewing" : "Lead with this"}
                  </span>
                </div>
                <p className="font-heading text-4xl font-semibold text-foreground">
                  {activeTier.price}
                  <span className="ml-1.5 text-sm font-normal text-subtle">/mo</span>
                </p>
                <p className="mt-3 text-[12px] leading-relaxed text-muted">
                  The full Conversion Engine in its standard shape. Roadmap, monthly
                  builds, A/B test programme, monthly report, dedicated Slack.
                </p>
                <p className="mt-3 text-[11px] italic text-subtle">
                  &ldquo;Your full conversion team for less than one senior hire.&rdquo;
                </p>
              </div>
            </div>

            {/* Pro — the anchor, quieter dark card */}
            <div
              className={`relative overflow-hidden rounded-2xl border bg-surface/60 p-5 transition-all ${
                isPreviewing ? "border-success/40" : "border-border"
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Pro
                </span>
                <span className="rounded-full border border-border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-subtle">
                  {isPreviewing ? "Previewing" : "Quote alongside"}
                </span>
              </div>
              <p className="font-heading text-4xl font-semibold text-foreground">
                {activeTier.anchor}
                <span className="ml-1.5 text-sm font-normal text-subtle">/mo</span>
              </p>
              <p className="mt-3 text-[12px] leading-relaxed text-muted">
                Same system, more of it. 48h design / 5d build, dedicated strategist,
                ad-to-page alignment, quarterly reviews.
              </p>
              <p className="mt-3 text-[11px] italic text-subtle">
                &ldquo;For brands scaling past 8 figures who need speed and depth.&rdquo;
              </p>
            </div>
          </div>

          <p className="mt-3 text-[11px] text-subtle">
            No tiers, no T1/T2. The Pro anchor ({activeTier.anchor}) exists so the
            buy-in feels like the deal, never quote it alone.
          </p>
        </div>
      </section>

      <div className="px-6 py-6 md:px-10">

      {/* Preview action bar */}
      {isPreviewing && hydrated && (
        <div className="mb-6 rounded-lg border border-success bg-success/10 p-3 flex items-center justify-between gap-3">
          <p className="text-[12px] text-foreground">
            <span className="font-semibold">Previewing</span> Step {activeTier.step} ·{" "}
            <span className="font-semibold tabular-nums">{activeTier.price}</span> floor —{" "}
            <span className="text-muted">{activeTier.note}</span>
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCancel}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-muted hover:text-foreground px-2 py-1 rounded"
            >
              <XMarkIcon className="size-3" />
              Cancel
            </button>
            <button
              onClick={handleLockIn}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-foreground bg-accent hover:bg-accent/90 px-2.5 py-1 rounded"
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
          <h2 className="text-[10px] font-semibold uppercase tracking-wider text-subtle">
            § Pricing roadmap — floor rises with demand
          </h2>
          {hydrated && currentIdx !== 0 && (
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1 text-[10px] font-medium text-subtle hover:text-foreground"
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
                    ? "border-accent bg-surface"
                    : isPreview
                      ? "border-success bg-success/10 ring-2 ring-success/30"
                      : "border-border bg-background hover:border-subtle hover:bg-surface"
                }`}
              >
                <div className="flex items-baseline justify-between mb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-subtle">
                    Step {t.step}
                  </p>
                  {isCurrent && (
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-white bg-success px-1.5 py-0.5 rounded">
                      Now
                    </span>
                  )}
                  {isPreview && (
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-surface bg-foreground px-1.5 py-0.5 rounded">
                      Preview
                    </span>
                  )}
                </div>
                <p className="text-xl font-semibold text-foreground tabular-nums">
                  {t.price}
                  <span className="text-[11px] font-normal text-subtle ml-1">/mo</span>
                </p>
                <p className="text-[11px] font-medium text-muted mt-1">{t.retainers}</p>
                <p className="text-[11px] leading-snug text-subtle mt-1">{t.note}</p>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-subtle mt-2">
          Click a step to preview pricing across the page. Lock it in to update the offer.
          Currently locked: <span className="font-semibold text-foreground">{currentTier.price}</span>.
        </p>
      </section>

      {/* Sales bento */}
      <Section label="§ Sales">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <RevenueProjectorWidget retainer={activeTier.value} />
          </div>
          <Link href="/conversion-pack" className="block h-full group">
            <div className="relative rounded-lg overflow-hidden border border-border bg-background h-full flex flex-col hover:shadow-[var(--shadow-soft)] transition-all duration-150">
              <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-subtle bg-surface/5 backdrop-blur-sm px-1.5 py-0.5 rounded">
                  10 slides
                </span>
                <ArrowTopRightOnSquareIcon className="size-3.5 text-muted group-hover:text-foreground transition-colors" />
              </div>
              <div className="flex-1 p-3 pt-10">
                <DeckCoverPreview backdropImages={previewImages} />
              </div>
              <div className="px-4 pb-3 pt-1 flex items-end justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground leading-tight">The Deck</h3>
                  <p className="text-[10px] text-subtle italic mt-1 leading-snug">
                    Diagnosis · Projection · Offer · ROI
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 bg-accent text-accent-foreground text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded shrink-0 group-hover:bg-success group-hover:text-white transition-colors">
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
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-[10px] font-semibold uppercase tracking-wider text-subtle mb-3">
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
      <div className="rounded-lg border border-border bg-surface p-4 hover:border-subtle hover:shadow-[var(--shadow-soft)] transition-all duration-150 h-full flex flex-col">
        <div className="flex items-start justify-between mb-2">
          <span className="text-muted">{tile.icon}</span>
          {tile.external ? (
            <ArrowTopRightOnSquareIcon className="size-3.5 text-muted" />
          ) : (
            <ChevronRightIcon className="size-3.5 text-muted" />
          )}
        </div>
        <p className="text-sm font-medium text-foreground leading-tight">{tile.title}</p>
        <p className="text-[12px] leading-snug text-muted mt-1 flex-1">{tile.blurb}</p>
      </div>
    </Link>
  );
}
