"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRightIcon } from "@heroicons/react/24/solid";
import { getPortals } from "@/lib/portal/data";
import type { PortalData } from "@/lib/portal/types";

export function TeamPortalsSection({ hideHeader = false }: { hideHeader?: boolean }) {
  const [portals, setPortals] = useState<PortalData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all = await getPortals();
      if (cancelled) return;
      const active = all.filter((p) => !p.deleted_at);
      setPortals(active);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={hideHeader ? "" : "mt-10"}>
      {!hideHeader && (
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#71757D] mb-4">
          Client Portals
        </h2>
      )}
      {loading ? (
        <p className="text-xs text-[#9CA3AF]">Loading…</p>
      ) : portals.length === 0 ? (
        <p className="text-xs text-[#9CA3AF]">No active portals.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {portals.map((p) => (
            <Link
              key={p.id}
              href={`/portal/${p.token}/team`}
              className="bg-[#181818] border border-[#2A2A2A] rounded-lg p-4 hover:border-[#1B1B1B] hover:shadow-sm transition-all group flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#E5E5EA] truncate">{p.client_name}</p>
                <p className="text-[11px] text-[#71757D] mt-0.5">
                  {p.client_type === "retainer" ? "Retainer" : "Page Build"}
                  {p.current_phase ? ` · ${p.current_phase}` : ""}
                </p>
              </div>
              <ChevronRightIcon className="size-3.5 text-[#C7C9CD] group-hover:text-[#E5E5EA] transition-colors shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
