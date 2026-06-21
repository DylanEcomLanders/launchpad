"use client";

// Per-client delivery plan — the clear timeline the client engagement was
// missing. Folds into the engagement page (no separate view).
//   • Retainer: Month-1 conversion-asset plan laid across the 4 weeks, VERY
//     visible (these are VIP clients), with Month 2/3 outlined beneath.
//   • Sprint:   the Phase 1 → 2 → 3 track with its deliverables.
// Dates honour the 1-day padding: each asset shows its client ship date and
// the internal target (client − 1 working day).

import type { CustomDeliverable, EngagementKind, CycleNumber } from "@/lib/engagement-template";
import { previousWorkingDay } from "@/lib/pods-v2/deliverable";
import { Pill } from "@/components/pod-os/ui";

const WEEK_LABEL: Record<number, string> = {
  1: "Week 1 · Strategy",
  2: "Week 2 · Design",
  3: "Week 3 · Build",
  4: "Week 4 · Test",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmt(ymd: string): string {
  const [, m, d] = ymd.split("-").map(Number);
  if (!m || !d) return ymd;
  return `${MONTHS[m - 1]} ${d}`;
}

/** Client ship date = startDate + dueDay days. Retainers run straight
 * calendar days (90-day product), which is the case this plan is built for. */
function shipDate(startDate: string, dueDay: number): string {
  const d = new Date(`${startDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Math.max(0, dueDay - 1));
  return d.toISOString().slice(0, 10);
}

function ownerLabel(d: CustomDeliverable): string {
  return d.assigneeName ?? d.owner;
}

function DeliverableCard({
  d,
  startDate,
}: {
  d: CustomDeliverable;
  startDate: string;
}) {
  const client = shipDate(startDate, d.dueDay);
  const internal = previousWorkingDay(client);
  return (
    <div className="rounded-lg border border-[#2A2A2A] bg-[#181818] p-2.5 shadow-[var(--shadow-soft)]">
      <div className="text-[12px] font-semibold leading-tight text-[#E5E5EA]">{d.name}</div>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        <Pill tone="default">{ownerLabel(d)}</Pill>
        {d.phase && <Pill tone="blue">{d.phase.replace(/-/g, " ")}</Pill>}
      </div>
      <div className="mt-1.5 text-[10px] tabular-nums text-[#71757D]">
        Ships <span className="font-medium text-[#E5E5EA]">{fmt(client)}</span>
        <span className="text-[#C5C5C5]"> · internal {fmt(internal)}</span>
      </div>
    </div>
  );
}

export function EngagementDeliveryPlan({
  customDeliverables,
  kind,
  currentDay,
  startDate,
}: {
  customDeliverables: CustomDeliverable[];
  kind: EngagementKind;
  currentDay: number;
  startDate: string;
}) {
  if (customDeliverables.length === 0) return null;

  if (kind === "retainer") {
    const month1 = customDeliverables.filter((d) => d.cycle === 1);
    const byWeek = (w: number) => month1.filter((d) => (d.weekInCycle ?? 2) === w);
    const currentWeek = Math.min(4, Math.max(1, Math.ceil((currentDay % 30 || 30) / 7)));
    const laterCount = (m: CycleNumber) => customDeliverables.filter((d) => d.cycle === m).length;

    return (
      <section className="mb-5 rounded-xl border border-white/15 bg-gradient-to-b from-[#FAFAFB] to-white p-4 shadow-[var(--shadow-card)]">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[#E5E5EA]">Month 1 — Conversion plan</h2>
            <p className="text-[11px] text-[#71757D]">The first 30 days, laid out. Day {Math.max(1, currentDay)}/90.</p>
          </div>
          <Pill tone="emerald">{month1.length} assets in month 1</Pill>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {[1, 2, 3, 4].map((w) => {
            const items = byWeek(w);
            const isCurrent = w === currentWeek;
            return (
              <div
                key={w}
                className={`rounded-lg border p-2 ${isCurrent ? "border-white bg-[#181818]" : "border-[#2A2A2A] bg-[#0C0C0C]"}`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">
                    {WEEK_LABEL[w]}
                  </span>
                  {isCurrent && <span className="size-1.5 rounded-full bg-[#1B1B1B]" title="Current week" />}
                </div>
                {items.length === 0 ? (
                  <div className="rounded-md border border-dashed border-[#2A2A2A] px-2 py-3 text-center text-[10px] text-[#C5C5C5]">
                    —
                  </div>
                ) : (
                  <div className="space-y-2">
                    {items.map((d) => (
                      <DeliverableCard key={d.id} d={d} startDate={startDate} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {(laterCount(2) > 0 || laterCount(3) > 0) && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-[#2A2A2A] pt-3 text-[11px] text-[#71757D]">
            <span className="font-medium text-[#E5E5EA]">Next:</span>
            <span>Month 2 — {laterCount(2)} assets</span>
            <span className="text-[#C5C5C5]">·</span>
            <span>Month 3 — {laterCount(3)} assets</span>
          </div>
        )}
      </section>
    );
  }

  // Sprint / bucket: Phase 1 → 2 → 3 track.
  const STAGE_LANES: { id: string; label: string }[] = [
    { id: "design", label: "Phase 1 · Design" },
    { id: "development", label: "Phase 2 · Dev" },
    { id: "testing", label: "Phase 3 · Test" },
  ];
  return (
    <section className="mb-5 rounded-xl border border-[#2A2A2A] bg-[#181818] p-4 shadow-[var(--shadow-soft)]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#E5E5EA]">Delivery timeline</h2>
        <Pill tone="default">{customDeliverables.length} deliverables</Pill>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {STAGE_LANES.map((lane) => {
          const items = customDeliverables.filter((d) => d.stage === lane.id);
          return (
            <div key={lane.id} className="rounded-lg border border-[#2A2A2A] bg-[#0C0C0C] p-2">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">
                {lane.label}
              </div>
              {items.length === 0 ? (
                <div className="rounded-md border border-dashed border-[#2A2A2A] px-2 py-3 text-center text-[10px] text-[#C5C5C5]">
                  —
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((d) => (
                    <DeliverableCard key={d.id} d={d} startDate={startDate} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
