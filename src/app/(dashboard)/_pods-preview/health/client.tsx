"use client";

import { useState } from "react";
import {
  XMarkIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";
import {
  CLIENTS,
  POD_BY_ID,
  CSM,
  healthScore,
  healthBand,
  daysUntil,
  fmtDayMonth,
  type Client,
  type HealthSignals,
} from "../mock-data";
import { AnnotationStrip, SectionHeader, Card } from "../components";

const BAND_META = {
  green: { ring: "border-emerald-200 bg-emerald-50", dot: "bg-emerald-500", text: "text-emerald-700", label: "Healthy" },
  amber: { ring: "border-amber-200 bg-amber-50", dot: "bg-amber-500", text: "text-amber-700", label: "Watch" },
  red: { ring: "border-rose-200 bg-rose-50", dot: "bg-rose-500", text: "text-rose-700", label: "At risk" },
};

export default function HealthClient() {
  const [openId, setOpenId] = useState<string | null>(null);

  const ranked = [...CLIENTS].sort((a, b) => healthScore(a.signals) - healthScore(b.signals));
  const open = CLIENTS.find((c) => c.id === openId) ?? null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
      <AnnotationStrip title="What changed — Client Health">
        <p>
          <strong>A CSM relationship layer on top of Engagements.</strong> Health isn&apos;t a vanity
          field — it&apos;s scored from real delivery signals: client-side delay, approval lag,
          engagement gap, and open blockers (the same delay attribution from the board).
        </p>
        <p>
          <strong>Onboarding notes seed each record</strong>, so context from intake lands intact
          with the CSM instead of leaking on handoff. {CSM.name} owns this surface.
        </p>
      </AnnotationStrip>

      <div className="mb-1 flex items-center gap-2">
        <h1 className="text-2xl font-semibold text-[#E5E5EA]">Client Health</h1>
        <span className="rounded-full border border-[#2A2A2A] bg-[#222222] px-2 py-0.5 text-[11px] text-[#71757D]">
          {CSM.name} · {CSM.role}
        </span>
      </div>
      <p className="mb-6 text-sm text-[#71757D]">Worst health first.</p>

      <div className="grid gap-4 md:grid-cols-2">
        {ranked.map((c) => (
          <ClientHealthCard key={c.id} client={c} onOpen={() => setOpenId(c.id)} />
        ))}
      </div>

      {open && <HealthPanel client={open} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function Score({ signals, size = "sm" }: { signals: HealthSignals; size?: "sm" | "lg" }) {
  const score = healthScore(signals);
  const band = healthBand(score);
  const m = BAND_META[band];
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${m.ring}`}
    >
      <span className={`size-2 rounded-full ${m.dot}`} />
      <span className={`font-semibold tabular-nums ${m.text} ${size === "lg" ? "text-lg" : "text-sm"}`}>
        {score}
      </span>
      <span className={`text-[11px] font-medium ${m.text}`}>{m.label}</span>
    </div>
  );
}

function ClientHealthCard({ client, onOpen }: { client: Client; onOpen: () => void }) {
  const checkIn = daysUntil(client.nextCheckIn);
  const checkInDue = checkIn <= 0;
  const cvrUp = (client.cvrCurrent ?? 0) > (client.cvrBaseline ?? 0);
  return (
    <button
      onClick={onOpen}
      className="rounded-xl border border-[#2A2A2A] bg-[#181818] p-4 text-left shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:border-[#C5C5C5] hover:shadow-[var(--shadow-card)]"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold text-[#E5E5EA]">{client.name}</div>
          <div className="mt-0.5 text-[11px] text-[#71757D]">
            {POD_BY_ID[client.podId]?.tagline} · £{client.retainerTier}/mo
          </div>
        </div>
        <Score signals={client.signals} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]">
        <span className={`inline-flex items-center gap-1 ${checkInDue ? "text-rose-700" : "text-[#71757D]"}`}>
          <CalendarDaysIcon className="size-3.5" />
          Check-in {checkInDue ? "due" : fmtDayMonth(client.nextCheckIn)}
        </span>
        {client.cvrCurrent != null && (
          <span className={`inline-flex items-center gap-1 ${cvrUp ? "text-emerald-700" : "text-[#71757D]"}`}>
            <ArrowTrendingUpIcon className="size-3.5" />
            CVR {client.cvrBaseline}% → {client.cvrCurrent}%
          </span>
        )}
      </div>

      {client.riskFlags.length > 0 && (
        <div className="mt-2.5 space-y-1">
          {client.riskFlags.map((r, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px] text-rose-700">
              <ExclamationTriangleIcon className="mt-0.5 size-3.5 shrink-0" />
              <span>{r}</span>
            </div>
          ))}
        </div>
      )}
    </button>
  );
}

function SignalBar({
  label,
  value,
  unit,
  bad,
  max,
}: {
  label: string;
  value: number;
  unit: string;
  bad: number; // value at/above which it's "red"
  max: number;
}) {
  const pct = Math.min(100, (value / max) * 100);
  const tone = value >= bad ? "bg-rose-500" : value >= bad * 0.5 ? "bg-amber-500" : "bg-emerald-500";
  const txt = value >= bad ? "text-rose-700" : value >= bad * 0.5 ? "text-amber-700" : "text-emerald-700";
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[12px] text-[#71757D]">{label}</span>
        <span className={`text-[12px] font-semibold tabular-nums ${txt}`}>
          {value}
          {unit}
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#222222]">
        <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function HealthPanel({ client, onClose }: { client: Client; onClose: () => void }) {
  const s = client.signals;
  const checkIn = daysUntil(client.nextCheckIn);
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative h-full w-full max-w-md overflow-y-auto border-l border-[#2A2A2A] bg-[#181818] p-6 shadow-[var(--shadow-elevated)]">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[#E5E5EA]">{client.name}</h3>
            <p className="text-[12px] text-[#71757D]">
              {POD_BY_ID[client.podId]?.tagline} · £{client.retainerTier}/mo
            </p>
          </div>
          <button onClick={onClose} className="text-[#71757D] hover:text-[#E5E5EA]">
            <XMarkIcon className="size-5" />
          </button>
        </div>

        <div className="mt-4">
          <Score signals={s} size="lg" />
        </div>

        <div className="mt-3 rounded-lg border border-[#2A2A2A] bg-[#0C0C0C] px-3 py-2 text-[12px]">
          <span className={checkIn <= 0 ? "font-medium text-rose-700" : "text-[#71757D]"}>
            <CalendarDaysIcon className="mr-1 inline size-3.5" />
            Next check-in: {checkIn <= 0 ? `overdue (${fmtDayMonth(client.nextCheckIn)})` : fmtDayMonth(client.nextCheckIn)}
          </span>
        </div>

        {/* signal breakdown */}
        <div className="mt-6">
          <SectionHeader>Health signals</SectionHeader>
          <div className="space-y-3">
            <SignalBar label="Client-side delay" value={s.clientDelayDays} unit="d" bad={7} max={12} />
            <SignalBar label="Avg approval lag" value={s.approvalLagDays} unit="d" bad={4} max={6} />
            <SignalBar label="Days since last touch" value={s.engagementGapDays} unit="d" bad={7} max={12} />
            <SignalBar label="Open blockers" value={s.openBlockers} unit="" bad={2} max={3} />
          </div>
          <p className="mt-2 text-[11px] text-[#71757D]">
            These are wired to delivery — the same client-side delay the board attributes flows
            straight in here.
          </p>
        </div>

        {/* onboarding notes seeded */}
        <div className="mt-6">
          <SectionHeader>
            <span className="inline-flex items-center gap-1.5">
              <ClipboardDocumentListIcon className="size-4" /> From onboarding
            </span>
          </SectionHeader>
          <Card className="bg-[#0C0C0C]">
            <ul className="space-y-1.5 text-[12px] text-[#3A3A3A]">
              {client.onboardingNotes.map((n, i) => (
                <li key={i} className="flex gap-1.5">
                  <span className="text-[#C5C5C5]">•</span>
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* notes timeline */}
        <div className="mt-6">
          <SectionHeader>CSM notes</SectionHeader>
          <div className="space-y-2.5">
            {client.notes.map((n, i) => (
              <div key={i} className="border-l-2 border-[#2A2A2A] pl-3">
                <div className="text-[11px] text-[#71757D]">
                  {fmtDayMonth(n.at)} · {n.by}
                </div>
                <div className="text-[13px] text-[#3A3A3A]">{n.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
