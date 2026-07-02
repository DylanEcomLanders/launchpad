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

      <h1 className="text-2xl font-semibold text-foreground">Delivery Engine</h1>
      <p className="mb-6 text-sm text-subtle">Two products · points &amp; buckets · phase tracker.</p>

      {/* Two-product pipeline */}
      <SectionHeader>Two-product pipeline</SectionHeader>
      <div className="mb-7 grid gap-4 md:grid-cols-2">
        <Card>
          <div className="mb-2 flex items-center gap-2">
            <BoltIcon className="size-4 text-subtle" />
            <h3 className="text-sm font-semibold text-foreground">Sprint</h3>
            <span className="ml-auto text-[11px] text-subtle">{sprints.length}</span>
          </div>
          <p className="mb-3 text-[11px] text-subtle">One-off · per-bucket pricing · flexes to any pod under 85% capacity</p>
          <div className="space-y-1.5">
            {sprints.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-lg border border-surface-raised bg-background px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium text-foreground">{e.name}</div>
                  <div className="text-[11px] text-subtle">{e.status}</div>
                </div>
                <span className="shrink-0 rounded-md border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-subtle">
                  Bucket {e.bucket}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-2 flex items-center gap-2">
            <ArrowPathRoundedSquareIcon className="size-4 text-subtle" />
            <h3 className="text-sm font-semibold text-foreground">Conversion Engine Retainer</h3>
            <span className="ml-auto text-[11px] text-subtle">{retainers.length}</span>
          </div>
          <p className="mb-3 text-[11px] text-subtle">Core £8k / Pro £12k · 90-day · locked to one pod · max 3 per pod</p>
          <div className="space-y-1.5">
            {retainers.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-lg border border-surface-raised bg-background px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium text-foreground">{e.name}</div>
                  <div className="text-[11px] text-subtle">{e.status}</div>
                </div>
                <span className="shrink-0 rounded-md border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-subtle">
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
          <div className="mb-1 text-[12px] text-subtle">
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
                    on ? "border-border bg-foreground text-background" : "border-border bg-surface text-subtle hover:text-foreground"
                  }`}
                >
                  {p.label} <span className={on ? "text-surface/60" : "text-muted"}>{WEIGHT_POINTS[p.weight]}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex items-center gap-4 border-t border-surface-raised pt-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-subtle">Points</div>
              <div className="text-2xl font-semibold tabular-nums text-foreground">{points}</div>
            </div>
            <div className="text-muted">→</div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-subtle">Bucket</div>
              <div className="text-2xl font-semibold text-foreground">{bucket}</div>
            </div>
            <div className="text-muted">→</div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-subtle">Duration</div>
              <div className="text-2xl font-semibold tabular-nums text-foreground">{days == null ? "Custom" : `${days}d`}</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-subtle">
            Pod capacity · this week (10 pts cap)
          </div>
          <div className="space-y-3">
            {PODS.map((p) => {
              const used = capacityInWindow(p.id, 0, 7);
              const pct = Math.round((used / POD_WEEKLY_CAPACITY) * 100);
              const blocked = used >= POD_WEEKLY_CAPACITY;
              const alert = pct >= 85;
              const tone = blocked ? "bg-danger" : alert ? "bg-warning" : "bg-success";
              return (
                <div key={p.id}>
                  <div className="flex items-baseline justify-between text-[12px]">
                    <span className="text-foreground">{p.tagline}</span>
                    <span className="tabular-nums text-subtle">
                      {used}/{POD_WEEKLY_CAPACITY} pts
                      {blocked && <span className="ml-1 font-semibold text-danger">· blocked</span>}
                      {!blocked && alert && <span className="ml-1 font-semibold text-warning">· 85% alert</span>}
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-raised">
                    <div className={`h-full ${tone}`} style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[10px] text-subtle">Alert at 85% · hard block at 100% (spec §1.3)</p>
        </Card>
      </div>

      {/* Phase tracker */}
      <SectionHeader right={<span className="text-[11px] text-subtle">P1 4d · P2 bucket-scaled · P3 2–4wk</span>}>
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
            <span className="truncate text-[13px] font-semibold text-foreground">{d.name}</span>
            <span className="text-[11px] text-subtle">· {d.clientName}</span>
          </div>
          <div className="mt-0.5 text-[11px] text-subtle">{d.status}</div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="rounded-md border border-border bg-surface-raised px-1.5 py-0.5 text-[10px] font-medium text-subtle">
            {d.product === "sprint" ? "Sprint" : "Retainer"}
          </span>
          <span className="rounded-md border border-border bg-surface-raised px-1.5 py-0.5 text-[10px] font-medium text-subtle">
            {points} pts · {bucket}
          </span>
          {d.slot && (
            <span className="rounded-md border border-info/20 bg-info/10 px-1.5 py-0.5 text-[10px] font-medium text-info">
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
                <div className={`h-1.5 rounded-full ${done ? "bg-surface" : active ? "bg-info" : "bg-border"}`} />
                <div className={`mt-1 truncate text-[10px] ${active ? "font-semibold text-foreground" : done ? "text-subtle" : "text-muted"}`}>
                  {ph} · {PHASE_META[ph].label}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-1 text-[11px] text-subtle">
        {PHASE_META[d.phase].label} — {d.phaseProgress}
      </div>

      {/* gate + review */}
      {(d.gate || d.review) && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-surface-raised pt-3">
          {d.gate && (
            <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11px]">
              <span className="font-medium text-subtle">Wed 3pm gate:</span>
              <GateCheck label="Pod Lead" done={d.gate.podLead} />
              <GateCheck label="Strategist" done={d.gate.strategist} />
            </div>
          )}
          {d.review && (
            <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11px] text-subtle">
              <span className="font-medium">{d.review.phase} review:</span>
              <span>
                day {d.review.daysUsed}/{d.review.windowDays}
              </span>
              <span>·</span>
              <span>
                {d.review.revisionsUsed}/{d.review.revisionsAllowed} revisions
                {d.review.revisionsUsed >= d.review.revisionsAllowed && (
                  <span className="ml-1 font-semibold text-warning">— next = scope change</span>
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
    <span className={`inline-flex items-center gap-1 ${done ? "text-success" : "text-subtle"}`}>
      {done ? <CheckSolid className="size-3.5" /> : <CheckCircleIcon className="size-3.5" />}
      {label}
    </span>
  );
}
