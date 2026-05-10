"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  MapIcon,
  PhoneIcon,
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
  TableCellsIcon,
  CalculatorIcon,
  PresentationChartBarIcon,
  MegaphoneIcon,
  ChatBubbleLeftRightIcon,
  ChevronRightIcon,
  ArrowTopRightOnSquareIcon,
  BookmarkIcon,
  TrophyIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";
import { getEvents, type FunnelEvent } from "@/lib/sales-engine/funnel-events";
import { getLeads } from "@/lib/sales-engine/leads-data";
import type { Lead } from "@/lib/sales-engine/types";

interface SectionTile {
  slug: string;
  title: string;
  blurb: string;
  icon: React.ReactNode;
  href: string;
  external?: boolean;
}

const processTiles: SectionTile[] = [
  {
    slug: "00-overview",
    title: "The Offer",
    blurb: "Positioning, pricing, target client.",
    icon: <MapIcon className="size-4" />,
    href: "/offer/00-overview",
  },
  {
    slug: "01-sales-process",
    title: "Sales Process",
    blurb: "Two-stage audit close — warm-up + deep dive.",
    icon: <PhoneIcon className="size-4" />,
    href: "/offer/01-sales-process",
  },
  {
    slug: "02-onboarding",
    title: "Onboarding",
    blurb: "From signed to kicked off in 14 days.",
    icon: <ClipboardDocumentListIcon className="size-4" />,
    href: "/offer/02-onboarding",
  },
  {
    slug: "03-delivery",
    title: "Delivery",
    blurb: "Team-led roadmap, not client-led briefs.",
    icon: <CalendarDaysIcon className="size-4" />,
    href: "/offer/03-delivery",
  },
];

const toolkitTiles: SectionTile[] = [
  {
    slug: "04-conversion-matrix",
    title: "Conversion Matrix",
    blurb: "Score every funnel layer. Drives the deep-dive deck.",
    icon: <TableCellsIcon className="size-4" />,
    href: "/offer/04-conversion-matrix",
  },
  {
    slug: "05-revenue-projector",
    title: "Revenue Projector",
    blurb: "Traffic × CVR gap × AOV. The maths that closes.",
    icon: <CalculatorIcon className="size-4" />,
    href: "/offer/05-revenue-projector",
  },
  {
    slug: "06-slide-deck",
    title: "Slide Deck",
    blurb: "Generate a branded prospect deck inline.",
    icon: <PresentationChartBarIcon className="size-4" />,
    href: "/offer/06-slide-deck",
  },
];

const referenceTiles: SectionTile[] = [
  {
    slug: "07-positioning",
    title: "Positioning",
    blurb: "Language guide — what we say, what we don't.",
    icon: <MegaphoneIcon className="size-4" />,
    href: "/offer/07-positioning",
  },
  {
    slug: "08-faq",
    title: "FAQ",
    blurb: "Client-facing + internal — common questions.",
    icon: <ChatBubbleLeftRightIcon className="size-4" />,
    href: "/offer/08-faq",
  },
  {
    slug: "09-objections",
    title: "Objections",
    blurb: "Ten common pushbacks with the response we lead with.",
    icon: <ChatBubbleLeftRightIcon className="size-4" />,
    href: "/offer/09-objections",
  },
];

const externalTiles: SectionTile[] = [
  {
    slug: "cheatsheet",
    title: "Cheat Sheet",
    blurb: "One-screen sales reference with copy-to-clipboard objections.",
    icon: <BookmarkIcon className="size-4" />,
    href: "/internal/cheatsheet/conversion-engine",
    external: true,
  },
  {
    slug: "case-studies",
    title: "Case Studies",
    blurb: "Live showcase of CVR + revenue results.",
    icon: <TrophyIcon className="size-4" />,
    href: "/case-studies",
    external: true,
  },
  {
    slug: "sales-deck",
    title: "Sales Deck",
    blurb: "Presentation-mode deck for prospect calls.",
    icon: <PresentationChartBarIcon className="size-4" />,
    href: "/sales-deck",
    external: true,
  },
  {
    slug: "audit",
    title: "Audit Funnel",
    blurb: "Public lead-magnet page at ecomlanders.app/audit.",
    icon: <GlobeAltIcon className="size-4" />,
    href: "/audit",
    external: true,
  },
];

export default function OfferHubPage() {
  const [events, setEvents] = useState<FunnelEvent[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    Promise.all([getEvents(), getLeads()]).then(([e, l]) => {
      setEvents(e);
      setLeads(l);
    });
  }, []);

  const auditEvents = events.filter((e) => e.funnel === "audit");
  const auditViews = auditEvents.filter((e) => e.event_type === "view").length;
  const auditSubmissions = auditEvents.filter((e) => e.event_type === "submission").length;
  const auditCvr = auditViews > 0 ? ((auditSubmissions / auditViews) * 100).toFixed(1) : "0.0";

  const last30 = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recentLeads = leads.filter((l) => new Date(l.created_at).getTime() > last30).length;

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <header className="mb-6 flex items-baseline justify-between gap-4 border-b border-[#F0F0F0] pb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#BBB]">
            Internal · Sales Hub
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-[#1B1B1B] mt-1">
            Conversion Engine
          </h1>
          <p className="text-sm text-[#666] mt-1">
            The £8K post-click partnership — single source of truth for the offer.
          </p>
        </div>
        <Link
          href="/internal/cheatsheet/conversion-engine"
          className="text-[11px] font-medium text-[#666] hover:text-[#1B1B1B] flex items-center gap-1"
        >
          <BookmarkIcon className="size-3.5" />
          Open cheat sheet
        </Link>
      </header>

      {/* Pricing block */}
      <section className="mb-8">
        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-[#999] mb-3">
          § Pricing — always quote both
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Buy-in */}
          <div className="rounded-lg border border-[#1B1B1B] bg-[#1B1B1B] text-white p-5">
            <div className="flex items-baseline justify-between mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
                The buy-in
              </p>
              <p className="text-[10px] font-medium text-white/60">Lead with this</p>
            </div>
            <p className="text-3xl font-semibold tracking-tight">
              £8K<span className="text-sm font-normal text-white/60 ml-1">/mo</span>
            </p>
            <p className="text-[12px] leading-snug text-white/70 mt-2">
              The full Conversion Engine in its standard shape. Roadmap, monthly builds,
              A/B test programme, monthly report, dedicated Slack.
            </p>
            <p className="text-[11px] text-white/50 mt-3 italic">
              "Your full conversion team for less than one senior hire."
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
              "For brands scaling past 8 figures who need speed and depth."
            </p>
          </div>
        </div>
        <p className="text-[11px] text-[#999] mt-2">
          No tiers. No T1/T2. £12K exists so £8K feels like the deal — never quote it alone.
          Bigger scopes price upward from £8K naturally.
        </p>
      </section>

      {/* Process tiles */}
      <Section label="§ Process">
        <Grid>
          {processTiles.map((t) => (
            <Tile key={t.slug} tile={t} />
          ))}
        </Grid>
      </Section>

      {/* Toolkit tiles */}
      <Section label="§ Toolkit">
        <Grid>
          {toolkitTiles.map((t) => (
            <Tile key={t.slug} tile={t} />
          ))}
        </Grid>
      </Section>

      {/* Reference tiles */}
      <Section label="§ Reference">
        <Grid>
          {referenceTiles.map((t) => (
            <Tile key={t.slug} tile={t} />
          ))}
        </Grid>
      </Section>

      {/* External / cross-links */}
      <Section label="§ Linked tools">
        <Grid>
          {externalTiles.map((t) => (
            <Tile key={t.slug} tile={t} />
          ))}
        </Grid>
      </Section>

      {/* Funnel snapshot */}
      <section className="mb-8">
        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-[#999] mb-3">
          § Audit funnel — last 30 days
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Page views" value={auditViews.toString()} />
          <Stat label="Submissions" value={auditSubmissions.toString()} />
          <Stat label="CVR" value={`${auditCvr}%`} />
          <Stat label="Leads (30d)" value={recentLeads.toString()} />
        </div>
        <p className="text-[11px] text-[#999] mt-2">
          Funnel events are tracked from <code className="text-[#666]">/audit</code> via{" "}
          <code className="text-[#666]">/api/leads/track</code>. Source breakdown lives on the{" "}
          <Link href="/sales-engine" className="text-[#1B1B1B] underline underline-offset-2">
            sales engine dashboard
          </Link>
          .
        </p>
      </section>
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
  const inner = (
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
  );
  return (
    <Link key={tile.slug} href={tile.href} className="block">
      {inner}
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#E5E5EA] bg-white p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#999]">{label}</p>
      <p className="text-xl font-semibold text-[#1B1B1B] tabular-nums mt-1">{value}</p>
    </div>
  );
}
