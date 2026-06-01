"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  PhotoIcon,
  TrophyIcon,
  TagIcon,
  PresentationChartLineIcon,
  BookmarkIcon,
  ClipboardDocumentCheckIcon,
  DocumentTextIcon,
  ChatBubbleOvalLeftIcon,
  MagnifyingGlassIcon,
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
  badgeBg: string;
  badgeText: string;
  tiles: ToolkitTile[];
}

const toolkitStages: ToolkitStage[] = [
  {
    number: "01",
    name: "Pitch",
    descriptor: "Sales & prospect-facing assets",
    badgeBg: "#EFF6FF",
    badgeText: "#1D4ED8",
    tiles: [
      { title: "Portfolio", subtitle: "Live page library", href: "/portfolio", icon: PhotoIcon },
      { title: "Case studies", subtitle: "Results & outcomes", href: "/sales-engine/case-studies", icon: TrophyIcon },
      { title: "Price list", subtitle: "Surfaces & retainers", href: "/internal/pricing", icon: TagIcon },
      { title: "Sales deck", subtitle: "Conversion engine", href: "/conversion-pack", icon: PresentationChartLineIcon },
      { title: "Cheat sheet", subtitle: "Conversion engine", href: "/internal/cheatsheet/conversion-engine", icon: BookmarkIcon },
    ],
  },
  {
    number: "02",
    name: "Onboard",
    descriptor: "From signed to kicked off",
    badgeBg: "#ECFDF5",
    badgeText: "#047857",
    tiles: [
      { title: "Onboarding form", subtitle: "Client intake", href: "/onboard", icon: ClipboardDocumentCheckIcon },
      { title: "Invoice generator", subtitle: "Create & send", href: "/tools/invoice-generator", icon: DocumentTextIcon },
    ],
  },
  {
    number: "03",
    name: "Deliver",
    descriptor: "Live engagement",
    badgeBg: "#F5F3FF",
    badgeText: "#6D28D9",
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
  });

  return (
    <div className="mx-auto max-w-[1240px] px-6 pb-20 pt-8">
      {/* ── Header ── matches Workspace Overview ── */}
      <div className="mb-8">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {dateStr}
        </p>
        <h1 className="mt-1 font-heading text-2xl font-semibold tracking-tight text-slate-900">
          Mission Control
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Everything you need, organised by client stage.
        </p>
      </div>

      {/* ── Toolkit ── */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-slate-500">
          Toolkit
        </h2>
        <div className="relative">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={toolkitQuery}
            onChange={(e) => setToolkitQuery(e.target.value)}
            placeholder="Search tools..."
            className="w-[220px] rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-sm outline-none focus:border-slate-400"
          />
        </div>
      </div>

      <div className="space-y-7">
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
      {/* Stage header — soft pill badge + descriptor */}
      <div className="mb-3 flex items-baseline gap-3">
        <span
          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{ background: stage.badgeBg, color: stage.badgeText }}
        >
          {stage.number} · {stage.name}
        </span>
        <span className="text-xs text-slate-400">{stage.descriptor}</span>
      </div>

      {/* Tile grid — auto-fit min 180px so it reflows naturally */}
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
      >
        {stage.tiles.map((tile) => (
          <ToolkitTileLink key={tile.title} tile={tile} />
        ))}
        {stage.tiles.length === 0 && (
          <p className="py-3 text-xs text-slate-300">No matching tools.</p>
        )}
      </div>
    </div>
  );
}

function ToolkitTileLink({ tile }: { tile: ToolkitTile }) {
  return (
    <Link
      href={tile.href}
      className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-shadow hover:shadow-md"
    >
      <tile.icon className="mb-2 size-4 text-slate-400" />
      <p className="font-heading text-sm font-medium leading-snug text-slate-900">
        {tile.title}
      </p>
      <p className="mt-0.5 text-xs leading-snug text-slate-500">
        {tile.subtitle}
      </p>
    </Link>
  );
}

