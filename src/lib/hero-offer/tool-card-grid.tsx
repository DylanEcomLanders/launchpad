"use client";

/* ── ToolCardGrid ──
 *
 * Reusable tool-grid for the Hero Offer operational tabs (Acquisition /
 * Execution / Retention). Each card: gradient icon tile + label +
 * one-line blurb + status pill. Click → opens the tool.
 *
 * The whole point of this surface is "less talking, more clicking" -
 * the playbook text moves to a collapsible at the bottom of each tab.
 */

import Link from "next/link";
import type { ComponentType, SVGProps } from "react";

export type ToolStatus = "live" | "shell" | "wip" | "soon";

export interface ToolCard {
  href: string;
  label: string;
  blurb: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  status: ToolStatus;
  /* External: opens in a new tab. Default false. */
  external?: boolean;
}

const STATUS_META: Record<ToolStatus, { label: string; tint: string }> = {
  live: { label: "Live", tint: "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30" },
  shell: { label: "Shell", tint: "bg-zinc-500/20 text-zinc-200 ring-1 ring-zinc-500/30" },
  wip: { label: "WIP", tint: "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30" },
  soon: { label: "Soon", tint: "bg-[#222222] text-[#71757D]" },
};

export type Accent = "emerald" | "cyan" | "sky";

const ACCENT_GRADIENT: Record<Accent, string> = {
  emerald: "from-emerald-500 to-teal-600 shadow-[0_8px_24px_rgba(16,185,129,0.3)]",
  cyan: "from-cyan-500 to-teal-600 shadow-[0_8px_24px_rgba(6,182,212,0.3)]",
  sky: "from-sky-500 to-blue-600 shadow-[0_8px_24px_rgba(14,165,233,0.3)]",
};
const ACCENT_HOVER: Record<Accent, string> = {
  emerald: "hover:ring-emerald-500/30",
  cyan: "hover:ring-cyan-500/30",
  sky: "hover:ring-sky-500/30",
};

export function ToolCardGrid({
  cards,
  accent,
}: {
  cards: ToolCard[];
  accent: Accent;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        const inner = (
          <div className={`group h-full bg-[#0F0F10] rounded-2xl p-5 ring-1 ring-white/[0.04] ${ACCENT_HOVER[accent]} shadow-[0_8px_32px_rgba(0,0,0,0.35)] transition-all`}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className={`size-10 rounded-xl bg-gradient-to-br ${ACCENT_GRADIENT[accent]} flex items-center justify-center transition-transform group-hover:scale-105`}>
                <Icon className="size-5 text-white" />
              </div>
              <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold ${STATUS_META[c.status].tint}`}>
                {STATUS_META[c.status].label}
              </span>
            </div>
            <div className="text-sm font-semibold text-[#E5E5EA] mb-1">{c.label}</div>
            <p className="text-[12px] text-[#9CA3AF] leading-relaxed">{c.blurb}</p>
          </div>
        );
        if (c.external) {
          return (
            <a key={c.href} href={c.href} target="_blank" rel="noopener noreferrer" className="block">
              {inner}
            </a>
          );
        }
        return (
          <Link key={c.href} href={c.href} className="block">
            {inner}
          </Link>
        );
      })}
    </div>
  );
}
