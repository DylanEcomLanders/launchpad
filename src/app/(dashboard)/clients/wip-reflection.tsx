"use client";

/* ── Clients: Delivery reflection ──
 * A READ-ONLY mirror of this client's work-in-progress from the Delivery board.
 * The board stays the engine (drag does the tracking); this is just a window so
 * the CSM/PM sees delivery state at a glance without touching status.
 *
 * Wired to the live cx_* board (lib/cx): shows this client's real cards, the
 * active owner for each card's stage, and its expected-done date.
 */

import { useEffect, useState } from "react";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { loadCards, cardsForClient } from "@/lib/cx/data";
import { activeOwner, stageLabel, cardDue, dueTone } from "@/lib/cx/stages";
import type { CxCard } from "@/lib/cx/types";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function fmtDue(iso?: string) {
  if (!iso) return "";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function WipReflection({ clientId }: { clientId: string }) {
  const [cards, setCards] = useState<CxCard[] | null>(null);

  useEffect(() => {
    let alive = true;
    loadCards().then((all) => {
      if (alive) setCards(cardsForClient(all, clientId));
    });
    return () => {
      alive = false;
    };
  }, [clientId]);

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto w-full max-w-[1000px] px-6 py-8 md:px-10">
        <div className="mb-4 flex items-start gap-2 rounded-md border border-border-faint bg-surface-hover px-3 py-2 text-2xs text-muted">
          <InformationCircleIcon className="mt-px size-4 shrink-0 text-subtle" />
          <span>
            Live from the <strong className="font-medium text-foreground">Delivery board</strong> (read-only). The pod moves cards there
            and this updates itself.
          </span>
        </div>

        {cards === null ? (
          <div className="grid place-items-center py-12 text-sm text-subtle">Loading…</div>
        ) : cards.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-subtle">
            No cards on the Delivery board for this client yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-surface-hover text-2xs font-semibold uppercase tracking-wide text-subtle">
                  <th className="w-[42%] px-3 py-2 font-semibold">Deliverable</th>
                  <th className="w-[26%] px-3 py-2 font-semibold">Owner</th>
                  <th className="w-[18%] px-3 py-2 font-semibold">Stage</th>
                  <th className="w-[14%] px-3 py-2 font-semibold">When for</th>
                </tr>
              </thead>
              <tbody>
                {cards.map((c) => {
                  const owner = activeOwner(c, c.stage);
                  const due = cardDue(c);
                  const tone = dueTone(due, todayISO());
                  return (
                    <tr key={c.id} className="border-t border-border-faint">
                      <td className="px-3 py-2.5 text-sm text-foreground">{c.title}</td>
                      <td className="px-3 py-2.5 text-sm text-muted">{owner?.name ?? ""}</td>
                      <td className="px-3 py-2.5">
                        <span className="text-sm font-medium text-muted">{stageLabel(c.stage)}</span>
                      </td>
                      <td
                        className={`px-3 py-2.5 text-sm tabular-nums ${
                          tone === "late" ? "text-status-late" : tone === "today" ? "text-status-approaching" : "text-muted"
                        }`}
                      >
                        {tone === "late" ? "Late · " : tone === "today" ? "Today · " : ""}
                        {fmtDue(due)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
