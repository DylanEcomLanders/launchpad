"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  PhotoIcon,
  TrophyIcon,
  TagIcon,
  ClipboardDocumentCheckIcon,
  ChatBubbleOvalLeftIcon,
  MagnifyingGlassIcon,
  CreditCardIcon,
} from "@heroicons/react/24/outline";

/* ── Toolkit ──
 * Centralised quick-access hub for client-facing assets and internal
 * tools. Replaces team members bookmarking random links. Three workflow
 * stages: PITCH (sales), ONBOARD (signed → kicked off), DELIVER (live).
 */

interface ToolkitTile {
  title: string;
  subtitle: string;
  href: string;
  icon: typeof PhotoIcon;
}

interface ToolkitStage {
  number: string;
  name: string;
  descriptor: string;
  tiles: ToolkitTile[];
}

/* The lean Toolkit: only the 6 tools Dylan reaches for daily. Everything
 * else was shelved 2026-06-22 - see memory/project_toolkit_shelved.md for
 * the full list + intent to resurface later. The shelved tools all still
 * work via direct URL + command palette (⌘K), they're just not pinned here. */
const toolkitStages: ToolkitStage[] = [
  {
    number: "01",
    name: "Pitch",
    descriptor: "Sales & prospect-facing assets",
    tiles: [
      { title: "Portfolio", subtitle: "Live page library", href: "/portfolio", icon: PhotoIcon },
      { title: "Case studies", subtitle: "Results & outcomes", href: "/case-studies", icon: TrophyIcon },
      { title: "Price list", subtitle: "Client-facing, shareable", href: "/pricing", icon: TagIcon },
    ],
  },
  {
    number: "02",
    name: "Onboard",
    descriptor: "From signed to kicked off",
    tiles: [
      { title: "Payment link", subtitle: "Whop checkout URL", href: "/tools/payment-link", icon: CreditCardIcon },
      { title: "Onboarding form", subtitle: "Client intake", href: "/onboard", icon: ClipboardDocumentCheckIcon },
    ],
  },
  {
    number: "03",
    name: "Deliver",
    descriptor: "Live engagement",
    tiles: [
      { title: "Feedback form", subtitle: "In-flight check-ins", href: "/tools/feedback", icon: ChatBubbleOvalLeftIcon },
    ],
  },
];

export default function MissionControl() {
  const [toolkitQuery, setToolkitQuery] = useState("");

  const filteredStages = useMemo(() => {
    const q = toolkitQuery.trim().toLowerCase();
    if (!q) return toolkitStages;
    return toolkitStages.map((stage) => ({
      ...stage,
      tiles: stage.tiles.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.subtitle.toLowerCase().includes(q),
      ),
    }));
  }, [toolkitQuery]);

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).toUpperCase();
  const totalTools = toolkitStages.reduce((n, s) => n + s.tiles.length, 0);

  return (
    <div className="mx-auto max-w-[1240px] px-8 pb-20 pt-10">
      {/* ── Header ── eyebrow date · bold title + light modifier · count top-right ── */}
      <div className="mb-10 flex items-end justify-between gap-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#71757D]">
            {dateStr}
          </p>
          <h1 className="mt-2 text-[28px] leading-tight">
            <span className="font-bold text-[#E5E5EA]">Toolkit</span>{" "}
            <span className="font-normal text-[#71757D]">organised by stage</span>
          </h1>
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#71757D] tabular-nums">
          {totalTools} TOOLS
        </p>
      </div>

      {/* ── Filter strip - labelled like Well's dropdowns ── */}
      <div className="mb-8 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#71757D] mb-1.5">
            Search
          </p>
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#71757D]" />
            <input
              type="text"
              value={toolkitQuery}
              onChange={(e) => setToolkitQuery(e.target.value)}
              placeholder="Search tools..."
              className="w-[280px] rounded-md border border-[#2A2A2A] bg-[#181818] py-2 pl-9 pr-3 text-sm text-[#E5E5EA] placeholder:text-[#71757D] outline-none focus:border-[#818CF8] transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="space-y-10">
        {filteredStages.map((stage) => (
          <ToolkitStageBlock key={stage.name} stage={stage} />
        ))}
      </div>
    </div>
  );
}

function ToolkitStageBlock({ stage }: { stage: ToolkitStage }) {
  return (
    <div>
      {/* Stage header - monochrome eyebrow + name, no colored pills */}
      <div className="mb-4 flex items-baseline gap-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#71757D] tabular-nums">
          {stage.number}
        </span>
        <span className="text-sm font-semibold text-[#E5E5EA]">
          {stage.name}
        </span>
        <span className="text-xs text-[#71757D]">{stage.descriptor}</span>
      </div>

      {/* Tile grid - auto-fit min 200px so tiles breathe more than before */}
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}
      >
        {stage.tiles.map((tile) => (
          <ToolkitTileLink key={tile.title} tile={tile} />
        ))}
        {stage.tiles.length === 0 && (
          <p className="py-3 text-xs text-[#4B4D52]">No matching tools.</p>
        )}
      </div>
    </div>
  );
}

function ToolkitTileLink({ tile }: { tile: ToolkitTile }) {
  return (
    <Link
      href={tile.href}
      className="flex flex-col rounded-lg border border-[#2A2A2A] bg-[#181818] p-4 transition-colors hover:border-[#383838] hover:bg-[#222222]"
    >
      <tile.icon className="mb-2.5 size-4 text-[#71757D] stroke-[1.5]" />
      <p className="text-sm font-medium leading-snug text-[#E5E5EA]">
        {tile.title}
      </p>
      <p className="mt-1 text-xs leading-snug text-[#71757D]">
        {tile.subtitle}
      </p>
    </Link>
  );
}

