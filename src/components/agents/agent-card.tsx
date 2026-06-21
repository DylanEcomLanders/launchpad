"use client";

import Link from "next/link";
import type { Agent } from "@/lib/agents/types";
import { PixelPortrait } from "./pixel-portrait";
import { StatusBadge } from "./status-dot";

interface AgentCardProps {
  agent: Agent;
}

export function AgentCard({ agent }: AgentCardProps) {
  return (
    <Link
      href={`/agents/${agent.id}`}
      className="group relative flex flex-col items-center rounded-xl border border-[#2A2A2A] bg-[#181818] p-4 text-center shadow-[var(--shadow-soft)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-card)]"
    >
      <div className="absolute right-2 top-2">
        <StatusBadge status={agent.status} />
      </div>

      {/* Portrait — ambient bob (idle/working) is baked into PixelPortrait via
       * agent.status. Hover scales the whole portrait slightly for extra life. */}
      <div className="mt-3 mb-3 transition-transform duration-200 ease-out group-hover:scale-110">
        <PixelPortrait agent={agent} size={96} />
      </div>

      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-[#E5E5EA]">{agent.name}</div>
        <div className="truncate text-[11px] uppercase tracking-wider text-[#71757D]">{agent.role}</div>
      </div>

      {/* Pixel "tile" base — gives each NPC the feeling of standing on a square */}
      <div
        className="mt-3 h-1.5 w-12 rounded-sm bg-[#2A2A2A] transition-colors duration-200 group-hover:bg-[#1B1B1B]/30"
        aria-hidden
      />
    </Link>
  );
}
