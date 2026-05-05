"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BookOpenIcon,
  FolderIcon,
  BanknotesIcon,
  FlagIcon,
  ArrowTrendingUpIcon,
  ChevronRightIcon,
  ClipboardDocumentListIcon,
  TicketIcon,
} from "@heroicons/react/24/solid";
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

interface QuickLink {
  title: string;
  description: string;
  href: string;
  icon: typeof BookOpenIcon;
  iconColor?: string;
  adminOnly?: boolean;
}

const quickLinks: QuickLink[] = [
  {
    title: "Operations",
    description: "Wiki, funnel playbook, funnel builder. How we work.",
    href: "/tools/ops-wiki",
    icon: BookOpenIcon,
  },
  {
    title: "Source of Truth",
    description: "Cheat sheet + Conversion Engine reference. Leadership rules.",
    href: "/internal/cheatsheet",
    icon: FlagIcon,
    iconColor: "#16A34A",
    adminOnly: true,
  },
  {
    title: "Execution",
    description: "Onboarding, portals, pods, task board. Active client work.",
    href: "/tools/task-board",
    icon: FolderIcon,
  },
  {
    title: "Finance",
    description: "Pricing, invoices, dev hours, expenses.",
    href: "/internal/pricing",
    icon: BanknotesIcon,
    adminOnly: true,
  },
  {
    title: "Growth",
    description: "Feedback loop. How we get better as an agency.",
    href: "/tools/feedback",
    icon: ArrowTrendingUpIcon,
  },
  {
    title: "Tasks",
    description: "Live deliverables, deadlines, who's on what.",
    href: "/tasks",
    icon: ClipboardDocumentListIcon,
  },
];

export default function MissionControl() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [hydrated, setHydrated] = useState(false);

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

      {/* ── Quick links ──────────────────────── */}
      <div className="mb-10">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#7A7A7A] mb-3">
          Jump to
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickLinks.map((link) => (
            <Link
              key={link.title}
              href={link.href}
              className="group bg-white border border-[#E5E5EA] rounded-xl p-4 hover:border-[#1B1B1B] hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <link.icon
                  className="size-4"
                  style={{ color: link.iconColor || "#7A7A7A" }}
                />
                <h3 className="text-sm font-semibold text-[#1B1B1B]">
                  {link.title}
                </h3>
              </div>
              <p className="text-xs leading-snug text-[#7A7A7A] mb-3">
                {link.description}
              </p>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1B1B1B] group-hover:gap-1.5 transition-all">
                Open
                <ChevronRightIcon className="size-3" />
              </span>
            </Link>
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
