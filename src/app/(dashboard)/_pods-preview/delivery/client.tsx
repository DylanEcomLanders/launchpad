"use client";

import { useState } from "react";
import { CheckCircleIcon, BoltIcon, ArrowPathRoundedSquareIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckSolid } from "@heroicons/react/24/solid";
import {
  PODS,
  capacityInWindow,
  PAGE_TYPES,
  WEIGHT_POINTS,
  bucketFor,
  pointsForPages,
  POD_WEEKLY_CAPACITY,
} from "../mock-data";
import { AnnotationStrip, SectionHeader, Card } from "../components";
import { ENGAGEMENTS, PRODUCT_LABEL } from "../strategist/strategist-data";
import {
  DELIVERABLES,
  PHASE_META,
  deliverablePoints,
  type Phase,
  type Deliverable,
} from "./pod-os-data";

const PHASES: Phase[] = ["P1", "P2", "P3"];

export default function DeliveryClient() {
  const [pages, setPages] = useState<string[]>(["pdp", "faq"]);

  const points = pointsForPages(pages);
  const { bucket, days } = bucketFor(points);

  const sprints = ENGAGEMENTS.filter((e) => e.product === "sprint");
  const retainers = ENGAGEMENTS.filter((e) => e.product !== "sprint");

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
      <AnnotationStrip title="What this is — Delivery Engine (spec §1.2–1.7)">
        <p>
          The operating-system mechanics from the spec, as a clickable mock: the{" "}
          <strong>two-product pipeline</strong> (Sprint vs Retainer), the{" "}
          <strong>points → bucket engine</strong> with the 10 pts/week capacity rule, and the{" "}
          <strong>P1 → P2 → P3 phase tracker</strong> with Tue/Thu slots, the Wed 3pm review gate, and
          client review windows + revision caps.
        </p>
        <p>This sits alongside the team&apos;s existing Pods view — it doesn&apos;t change how that works.</p>
      </AnnotationStrip>

      <h1 className="text-2xl font-semibold text-[#E5E5EA]">Delivery Engine</h1>
      <p className="mb-6 text-sm text-[#71757D]">Two products · points &amp; buckets · phase tracker.</p>

      {/* Two-product pipeline */}
      <SectionHeader>Two-product pipeline</SectionHeader>
      <div className="mb-7 grid gap-4 md:grid-cols-2">
        <Card>
          <div className="mb-2 flex items-center gap-2">
            <BoltIcon className="size-4 text-[#71757D]" />
            <h3 className="text-sm font-semibold text-[#E5E5EA]">Sprint</h3>
            <span className="ml-auto text-[11px] text-[#71757D]">{sprints.length}</span>
          </div>
          <p className="mb-3 text-[11px] text-[#71757D]">One-off · per-bucket pricing · flexes to any pod under 85% capacity</p>
          <div className="space-y-1.5">
            {sprints.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-lg border border-[#F0F0F2] bg-[#0C0C0C] px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium text-[#E5E5EA]">{e.name}</div>
                  <div className="text-[11px] text-[#71757D]">{e.status}</div>
                </div>
                <span className="shrink-0 rounded-md border border-[#2A2A2A] bg-[#181818] px-1.5 py-0.5 text-[10px] font-medium text-[#71757D]">
                  Bucket {e.bucket}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-2 flex items-center gap-2">
            <ArrowPathRoundedSquareIcon className="size-4 text-[#71757D]" />
            <h3 className="text-sm font-semibold text-[#E5E5EA]">Conversion Engine Retainer</h3>
            <span className="ml-auto text-[11px] text-[#71757D]">{retainers.length}</span>
          </div>
          <p className="mb-3 text-[11px] text-[#71757D]">Core £8k / Pro £12k · 90-day · locked to one pod · max 3 per pod</p>
          <div className="space-y-1.5">
            {retainers.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-lg border border-[#F0F0F2] bg-[#0C0C0C] px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium text-[#E5E5EA]">{e.name}</div>
                  <div className="text-[11px] text-[#71757D]">{e.status}</div>
                </div>
                <span className="shrink-0 rounded-md border border-[#2A2A2A] bg-[#181818] px-1.5 py-0.5 text-[10px] font-medium text-[#71757D]">
                  {e.product === "retainer_pro" ? "Pro" : "Core"}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Points + buckets engine */}
      <SectionHeader>Points &amp; buckets engine</SectionHeader>
      <div className="mb-7 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <div className="mb-1 text-[12px] text-[#71757D]">
            Size a deliverable — pick page types (Heavy 3 · Medium 2 · Light 1):
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PAGE_TYPES.map((p) => {
              const on = pages.includes(p.key);
              return (
                <button
                  key={p.key}
                  onClick={() => setPages((prev) => (on ? prev.filter((k) => k !== p.key) : [...prev, p.key]))}
                  className={`rounded-md border px-2 py-1 text-[12px] transition-all ${
                    on ? "border-white bg-white text-[#0C0C0C]" : "border-[#2A2A2A] bg-[#181818] text-[#71757D] hover:text-[#E5E5EA]"
                  }`}
                >
                  {p.label} <span className={on ? "text-white/60" : "text-[#C5C5C5]"}>{WEIGHT_POINTS[p.weight]}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex items-center gap-4 border-t border-[#F0F0F2] pt-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">Points</div>
              <div className="text-2xl font-semibold tabular-nums text-[#E5E5EA]">{points}</div>
            </div>
            <div className="text-[#C5C5C5]">→</div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">Bucket</div>
              <div className="text-2xl font-semibold text-[#E5E5EA]">{bucket}</div>
            </div>
            <div className="text-[#C5C5C5]">→</div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#71757D]">Duration</div>
              <div className="text-2xl font-semibold tabular-nums text-[#E5E5EA]">{days == null ? "Custom" : `${days}d`}</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#71757D]">
            Pod capacity · this week (10 pts cap)
          </div>
          <div className="space-y-3">
            {PODS.map((p) => {
              const used = capacityInWindow(p.id, 0, 7);
              const pct = Math.round((used / POD_WEEKLY_CAPACITY) * 100);
              const blocked = used >= POD_WEEKLY_CAPACITY;
              const alert = pct >= 85;
              const tone = blocked ? "bg-rose-500" : alert ? "bg-amber-500" : "bg-emerald-500";
              return (
                <div key={p.id}>
                  <div className="flex items-baseline justify-between text-[12px]">
                    <span className="text-[#E5E5EA]">{p.tagline}</span>
                    <span className="tabular-nums text-[#71757D]">
                      {used}/{POD_WEEKLY_CAPACITY} pts
                      {blocked && <span className="ml-1 font-semibold text-rose-700">· blocked</span>}
                      {!blocked && alert && <span className="ml-1 font-semibold text-amber-700">· 85% alert</span>}
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#222222]">
                    <div className={`h-full ${tone}`} style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[10px] text-[#71757D]">Alert at 85% · hard block at 100% (spec §1.3)</p>
        </Card>
      </div>

      {/* Phase tracker */}
      <SectionHeader right={<span className="text-[11px] text-[#71757D]">P1 4d · P2 bucket-scaled · P3 2–4wk</span>}>
        Phase tracker
      </SectionHeader>
      <div className="space-y-3">
        {DELIVERABLES.map((d) => (
          <DeliverableRow key={d.id} d={d} />
        ))}
      </div>
    </div>
  );
}

function DeliverableRow({ d }: { d: Deliverable }) {
  const points = deliverablePoints(d);
  const { bucket } = bucketFor(points);
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-[13px] font-semibold text-[#E5E5EA]">{d.name}</span>
            <span className="text-[11px] text-[#71757D]">· {d.clientName}</span>
          </div>
          <div className="mt-0.5 text-[11px] text-[#71757D]">{d.status}</div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="rounded-md border border-[#2A2A2A] bg-[#222222] px-1.5 py-0.5 text-[10px] font-medium text-[#71757D]">
            {d.product === "sprint" ? "Sprint" : "Retainer"}
          </span>
          <span className="rounded-md border border-[#2A2A2A] bg-[#222222] px-1.5 py-0.5 text-[10px] font-medium text-[#71757D]">
            {points} pts · {bucket}
          </span>
          {d.slot && (
            <span className="rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
              {d.slot} slot
            </span>
          )}
        </div>
      </div>

      {/* phase stepper */}
      <div className="mt-3 flex items-center gap-1">
        {PHASES.map((ph, i) => {
          const active = ph === d.phase;
          const done = PHASES.indexOf(d.phase) > i;
          return (
            <div key={ph} className="flex flex-1 items-center gap-1">
              <div className="min-w-0 flex-1">
                <div className={`h-1.5 rounded-full ${done ? "bg-[#1B1B1B]" : active ? "bg-blue-500" : "bg-[#2A2A2A]"}`} />
                <div className={`mt-1 truncate text-[10px] ${active ? "font-semibold text-[#E5E5EA]" : done ? "text-[#71757D]" : "text-[#C5C5C5]"}`}>
                  {ph} · {PHASE_META[ph].label}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-1 text-[11px] text-[#71757D]">
        {PHASE_META[d.phase].label} — {d.phaseProgress}
      </div>

      {/* gate + review */}
      {(d.gate || d.review) && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-[#F0F0F2] pt-3">
          {d.gate && (
            <div className="inline-flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#181818] px-2.5 py-1.5 text-[11px]">
              <span className="font-medium text-[#71757D]">Wed 3pm gate:</span>
              <GateCheck label="Pod Lead" done={d.gate.podLead} />
              <GateCheck label="Strategist" done={d.gate.strategist} />
            </div>
          )}
          {d.review && (
            <div className="inline-flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#181818] px-2.5 py-1.5 text-[11px] text-[#71757D]">
              <span className="font-medium">{d.review.phase} review:</span>
              <span>
                day {d.review.daysUsed}/{d.review.windowDays}
              </span>
              <span>·</span>
              <span>
                {d.review.revisionsUsed}/{d.review.revisionsAllowed} revisions
                {d.review.revisionsUsed >= d.review.revisionsAllowed && (
                  <span className="ml-1 font-semibold text-amber-700">— next = scope change</span>
                )}
              </span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function GateCheck({ label, done }: { label: string; done: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 ${done ? "text-emerald-700" : "text-[#71757D]"}`}>
      {done ? <CheckSolid className="size-3.5" /> : <CheckCircleIcon className="size-3.5" />}
      {label}
    </span>
  );
}
