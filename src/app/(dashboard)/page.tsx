"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TicketIcon } from "@heroicons/react/24/solid";
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
import {
  ageLabel,
  ageLevel,
  isStale,
  sortOpenTickets,
  AGE_COLORS,
  TICKET_TYPE_COLORS,
  TICKET_TYPE_LABELS,
  type Ticket,
} from "@/lib/tickets/types";
import { loadTickets } from "@/lib/tickets/data";

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
    badgeBg: "#DBEAFE",
    badgeText: "#1D4ED8",
    tiles: [
      { title: "Portfolio", subtitle: "Live page library", href: "/portfolio-v2", icon: PhotoIcon },
      { title: "Case studies", subtitle: "Results & outcomes", href: "/sales-engine/case-studies", icon: TrophyIcon },
      { title: "Price list", subtitle: "Surfaces & retainers", href: "/internal/pricing", icon: TagIcon },
      { title: "Sales deck", subtitle: "Conversion engine", href: "/sales-deck", icon: PresentationChartLineIcon },
      { title: "Cheat sheet", subtitle: "Conversion engine", href: "/internal/cheatsheet/conversion-engine", icon: BookmarkIcon },
    ],
  },
  {
    number: "02",
    name: "Onboard",
    descriptor: "From signed to kicked off",
    badgeBg: "#D1FAE5",
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
    badgeBg: "#EDE9FE",
    badgeText: "#6D28D9",
    tiles: [
      { title: "Feedback form", subtitle: "In-flight check-ins", href: "/tools/feedback", icon: ChatBubbleOvalLeftIcon },
    ],
  },
];

export default function MissionControl() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [hydrated, setHydrated] = useState(false);
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

  useEffect(() => {
    loadTickets().then((t) => {
      setTickets(t);
      setHydrated(true);
    });
  }, []);

  const openTickets = sortOpenTickets(
    tickets.filter((t) => t.status === "open" || t.status === "in_progress"),
  );
  const staleCount = openTickets.filter((t) => isStale(t.raised_at)).length;

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="px-6 py-8 max-w-[1200px] mx-auto">
      {/* ── Header ──────────────────────────── */}
      <header className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A0A0A0]">
          {dateStr}
        </p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-[#1B1B1B]">
          Mission Control
        </h1>
      </header>

      {/* ── Toolkit ──────────────────────────── */}
      <div className="mb-10">
        <div className="flex items-baseline justify-between gap-3 mb-1 flex-wrap">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-[#1B1B1B]">
              Toolkit
            </h2>
            <p className="text-[12px] text-[#7A7A7A] mt-0.5">
              Everything you need, organised by client stage
            </p>
          </div>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#A0A0A0] pointer-events-none" />
            <input
              type="text"
              value={toolkitQuery}
              onChange={(e) => setToolkitQuery(e.target.value)}
              placeholder="Search tools..."
              className="pl-8 pr-3 py-1.5 text-[12px] bg-white border border-[#E5E5EA] rounded-md focus:outline-none focus:border-[#1B1B1B] w-[220px]"
            />
          </div>
        </div>

        <div className="mt-5 space-y-6">
          {filteredStages.map((stage) => (
            <ToolkitStageBlock key={stage.name} stage={stage} />
          ))}
        </div>
      </div>

      {/* ── Today's tickets ──────────────────── */}
      <div>
        <div className="flex items-baseline justify-between gap-2 mb-3">
          <div className="flex items-baseline gap-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#7A7A7A]">
              Tickets
            </h2>
            <span className="text-[11px] tabular-nums text-[#A0A0A0]">
              {openTickets.length} open
            </span>
            {staleCount > 0 && (
              <span className="text-[11px] font-bold tabular-nums text-[#DC2626]">
                · {staleCount} stale
              </span>
            )}
          </div>
          <Link
            href="/tools/task-board"
            className="text-[11px] font-semibold text-[#7A7A7A] hover:text-[#1B1B1B] flex items-center gap-1"
          >
            <TicketIcon className="size-3" />
            Open triage
          </Link>
        </div>

        <div className="rounded-xl border border-[#E5E5EA] bg-white overflow-hidden">
          {!hydrated ? (
            <p className="text-[11px] text-[#BBB] text-center py-8">
              Loading tickets…
            </p>
          ) : openTickets.length === 0 ? (
            <p className="text-[12px] text-[#A0A0A0] text-center py-8">
              No open tickets. Inbox zero.
            </p>
          ) : (
            <ul>
              {openTickets.slice(0, 8).map((t, i) => (
                <li
                  key={t.id}
                  className={`px-4 py-3 ${i > 0 ? "border-t border-[#F3F3F5]" : ""}`}
                >
                  <TicketRow ticket={t} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {openTickets.length > 8 && (
          <p className="text-[11px] text-[#A0A0A0] text-center mt-2">
            + {openTickets.length - 8} more in the task board panel
          </p>
        )}
      </div>
    </div>
  );
}

function ToolkitStageBlock({ stage }: { stage: ToolkitStage }) {
  return (
    <div>
      {/* Stage header — pill badge + descriptor */}
      <div className="flex items-baseline gap-3 mb-3">
        <span
          className="inline-flex items-center px-2 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider"
          style={{ background: stage.badgeBg, color: stage.badgeText }}
        >
          {stage.number} · {stage.name}
        </span>
        <span className="text-[12px] text-[#7A7A7A]">{stage.descriptor}</span>
      </div>

      {/* Tile grid — auto-fit min 180px so it reflows naturally */}
      <div
        className="grid gap-2.5"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
      >
        {stage.tiles.map((tile) => (
          <ToolkitTileLink key={tile.title} tile={tile} />
        ))}
        {stage.tiles.length === 0 && (
          <p className="text-[11px] text-[#BBB] py-3">
            No matching tools.
          </p>
        )}
      </div>
    </div>
  );
}

function ToolkitTileLink({ tile }: { tile: ToolkitTile }) {
  return (
    <Link
      href={tile.href}
      className="bg-white border-[0.5px] border-[#E5E5EA] rounded-xl p-[14px] hover:border-[#1B1B1B] transition-colors flex flex-col"
    >
      <tile.icon className="size-4 text-[#7A7A7A] mb-2" />
      <p className="text-[14px] font-medium text-[#1B1B1B] leading-snug">
        {tile.title}
      </p>
      <p className="text-[12px] text-[#7A7A7A] mt-0.5 leading-snug">
        {tile.subtitle}
      </p>
    </Link>
  );
}

function TicketRow({ ticket }: { ticket: Ticket }) {
  const colours = AGE_COLORS[ageLevel(ticket.raised_at)];
  return (
    <div className="flex items-start gap-3">
      <span
        className="mt-1 size-1.5 rounded-full shrink-0"
        style={{ backgroundColor: colours.border }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className="text-[9px] font-semibold uppercase tracking-wider"
            style={{ color: TICKET_TYPE_COLORS[ticket.type] }}
          >
            {TICKET_TYPE_LABELS[ticket.type]}
          </span>
          {ticket.status === "in_progress" && (
            <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
              In progress
            </span>
          )}
          <span
            className="ml-auto text-[10px] font-semibold tabular-nums"
            style={{ color: colours.badge }}
          >
            {ageLabel(ticket.raised_at)}
          </span>
        </div>
        <p className="text-[13px] leading-snug text-[#1A1A1A]">
          {ticket.title}
        </p>
        {(ticket.client_id || ticket.assigned_to) && (
          <p className="mt-0.5 text-[11px] text-[#7A7A7A]">
            {ticket.client_id && <span>{ticket.client_id}</span>}
            {ticket.client_id && ticket.assigned_to && <span> · </span>}
            {ticket.assigned_to && <span>→ {ticket.assigned_to}</span>}
          </p>
        )}
      </div>
    </div>
  );
}
