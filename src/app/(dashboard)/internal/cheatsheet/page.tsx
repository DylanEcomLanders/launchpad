"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRole } from "@/components/auth-gate";

/* ── Ecomlanders cheat sheet ──
 * Admin-only. Single source of truth for senior-leader operating rules.
 * Discipline: every line is a decision a senior leader could disagree
 * with. Anything purely descriptive doesn't belong here — cut it.
 *
 * Bump VERSION + LAST_UPDATED on every edit.
 */
const VERSION = "1.5";
const LAST_UPDATED = "5 May 2026";
const ACCENT = "#16A34A"; // brand-adjacent green

export default function OperatingCheatsheetPage() {
  const role = useRole();
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (role !== "admin") {
      router.replace("/");
      return;
    }
    setAllowed(true);
  }, [role, router]);

  if (!allowed) return null;

  return (
    <div className="px-6 py-8 max-w-[1200px] mx-auto">
      {/* ── Header ──────────────────────────── */}
      <header className="mb-8 flex items-baseline justify-between gap-4">
        <div>
          <p
            className="text-[12px] font-semibold uppercase tracking-wider"
            style={{ color: ACCENT }}
          >
            Internal · Admin only
          </p>
          <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-[#1B1B1B]">
            Ecomlanders cheat sheet
          </h1>
        </div>
        <p className="text-[12px] text-[#999] shrink-0">
          The non-negotiables. Owner: Dylan. Last updated: {LAST_UPDATED}.
        </p>
      </header>

      {/* ── Bento grid ──────────────────────── */}
      <div className="grid grid-cols-12 gap-3 auto-rows-min">
        {/* Anchor principle — DARK HERO, full width */}
        <div className="col-span-12 rounded-[16px] bg-[#1B1B1B] px-7 py-6 text-white">
          <p
            className="text-[12px] font-semibold uppercase tracking-[0.2em] mb-2"
            style={{ color: ACCENT }}
          >
            Anchor principle
          </p>
          <p className="text-[22px] md:text-[28px] font-semibold leading-[1.2] tracking-tight max-w-3xl">
            Align everyone ruthlessly. Keep everything moving.
          </p>
        </div>

        {/* 01 — The week (full-width, calendar carries its own chrome) */}
        <div className="col-span-12">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 className="text-[12px] font-semibold uppercase tracking-wider text-[#1B1B1B]">
              The week
            </h2>
            <span className="font-mono text-[12px] tabular-nums text-[#BBB]">01</span>
          </div>
          <WeekCalendar />
          <p className="mt-3 text-[12px] italic leading-snug text-[#777]">
            Launches go out M/W/F only. Never T/Th. Emergency lane = Alister
            gatekeeps every time. Nobody else triggers it.
          </p>
        </div>

        {/* 02 — Dates and slippage — features 30% as anchor stat */}
        <BentoCard className="col-span-12 md:col-span-8" number="02" title="Dates and slippage">
          <RuleGrid
            items={[
              {
                rule: "Every quoted date pulls from the turnaround table.",
                why: "No quoting from gut — off-formula promises become slips Ajay can't defend.",
              },
              {
                rule: "Quoted = internal + 30% buffer, rounded to next M/W/F.",
                why: "Buffer absorbs surprises. M/W/F aligns with comms cadence.",
              },
              {
                rule: "Deliver early when ready.",
                why: "Beats the slip narrative before it starts.",
              },
              {
                rule: "Slipping? Update still lands the original M/W/F.",
                why: "Rhythm is sacred. Clients hear from us even on a slip.",
              },
              {
                rule: "Slip comms = Alister, every time.",
                why: "One voice under pressure.",
              },
              {
                rule: "Two consecutive slips → leadership.",
                why: "Catches systemic issues before trust erodes.",
              },
            ]}
          />
        </BentoCard>

        {/* 03 — Pricing HERO — big £8k anchor (neutral) */}
        <div className="col-span-12 md:col-span-4 rounded-[16px] border-[0.5px] border-[#EDEDEF] bg-white p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-[12px] font-semibold uppercase tracking-wider text-[#1B1B1B]">
                What we sell
              </h2>
              <span className="font-mono text-[12px] tabular-nums text-[#BBB]">03</span>
            </div>
            <div className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-[#999]">
              Conversion Engine
            </div>
            <div className="text-[44px] md:text-[52px] font-bold leading-none tracking-tight text-[#1B1B1B]">
              £8K<span className="text-[14px] font-medium text-[#999]">/mo</span>
            </div>
            <div className="mt-1 text-[12px] text-[#666]">
              <span className="font-semibold text-[#1B1B1B]">£12K anchor</span>{" "}
              sits next to it. Always quote both.
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#F0F0F0]">
            <ul className="space-y-1 text-[12px] leading-snug text-[#1B1B1B]">
              <li>· Page builds — bespoke. Pricing per deliverable.</li>
              <li>· Add-ons — service existing clients only.</li>
              <li>· Free audit — Twitter traffic, not qualification.</li>
            </ul>
          </div>
        </div>

        {/* 04 / 05 — Tables (symmetric) */}
        <BentoCard className="col-span-12 md:col-span-6" number="04" title="Escalations">
          <OwnerTable
            leftHead="Situation"
            rightHead="Owner"
            rows={[
              ["Out-of-scope or scope realignment", "Leadership"],
              ["Discount or renegotiation", "Dylan or Ajay only"],
              ["Difficult client behaviour", "Alister → Dylan if escalates"],
              ["Complaint or negative feedback", "Acknowledge same day, full reply M/W/F"],
              ["Firing a client", "Dylan + Ajay only"],
            ]}
          />
        </BentoCard>

        <BentoCard className="col-span-12 md:col-span-6" number="05" title="Single-name ownership">
          <OwnerTable
            leftHead="Domain"
            rightHead="Owner"
            rows={[
              ["Client relationship, day to day", "Alister"],
              ["Operating cadence and this doc", "Dylan"],
              ["CRO strategy and test prioritisation", "Dan"],
              ["Design and dev architecture", "Dylan + Ajay"],
              ["Weekly pulse", "Dylan + Ajay"],
            ]}
          />
        </BentoCard>

        {/* 07 — Sales framing HERO with pull-quote (neutral) */}
        <div className="col-span-12 md:col-span-7 rounded-[16px] border-[0.5px] border-[#EDEDEF] bg-white p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-[12px] font-semibold uppercase tracking-wider text-[#1B1B1B]">
              Sales framing
            </h2>
            <span className="font-mono text-[12px] tabular-nums text-[#BBB]">07</span>
          </div>
          <p className="mb-3 text-[16px] font-semibold leading-snug text-[#1B1B1B]">
            The discipline isn&apos;t promising less. It&apos;s framing so you
            don&apos;t need to promise.
          </p>
          <ul className="space-y-1 text-[14px] leading-snug text-[#1B1B1B]">
            <li className="flex gap-2"><span className="text-[#CCC]">·</span><span>Sell the system, never an outcome.</span></li>
            <li className="flex gap-2"><span className="text-[#CCC]">·</span><span>Ranges, never numbers. &quot;0.5–2% over 90 days&quot; yes. &quot;We&apos;ll lift you X%&quot; no.</span></li>
            <li className="flex gap-2"><span className="text-[#CCC]">·</span><span>Process commitments only.</span></li>
            <li className="flex gap-2"><span className="text-[#CCC]">·</span><span>90-day reset = process, not outcome.</span></li>
            <li className="flex gap-2"><span className="text-[#CCC]">·</span><span>Quote the anchor. £8k is the deal because £12k is on the table.</span></li>
            <li className="flex gap-2"><span className="text-[#CCC]">·</span><span>No discount talk in first contact. Dylan or Ajay only.</span></li>
          </ul>
        </div>

        {/* 06 — Rituals — features 11AM as anchor */}
        <div className="col-span-12 md:col-span-5 rounded-[16px] border-[0.5px] border-[#EDEDEF] bg-white p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-[12px] font-semibold uppercase tracking-wider text-[#1B1B1B]">
              Rituals
            </h2>
            <span className="font-mono text-[12px] tabular-nums text-[#BBB]">06</span>
          </div>
          <div className="mb-3 flex items-baseline gap-3">
            <span className="text-[40px] font-bold leading-none tracking-tight text-[#1B1B1B] tabular-nums">
              11<span className="text-[18px]">am</span>
            </span>
            <span className="text-[12px] text-[#666] leading-snug">
              Hard send window<br />for client updates · M/W/F
            </span>
          </div>
          <ul className="space-y-1 text-[14px] leading-snug text-[#1B1B1B]">
            <li className="flex gap-2"><span className="text-[#CCC]">·</span><span>Tue/Thu: 15-min leadership standup. Hard stop.</span></li>
            <li className="flex gap-2"><span className="text-[#CCC]">·</span><span>At-risk projects flagged in real time, not weekly.</span></li>
            <li className="flex gap-2"><span className="text-[#CCC]">·</span><span>Leads sign off standard work. VIPs get founder approval.</span></li>
          </ul>
        </div>

        {/* What we do — green-tinted YES card */}
        <div className="col-span-12 md:col-span-6 rounded-[16px] bg-white border-[0.5px] border-[#EDEDEF] p-5">
          <div className="mb-3">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-[#0E8345]">
              What we do
            </span>
          </div>
          <ul className="space-y-1.5 text-[14px] leading-snug text-[#1B1B1B] font-medium">
            <li>Post-click — landing pages, funnels, CRO, design, dev, testing.</li>
            <li>Internal copy via Dan as part of CRO.</li>
          </ul>
        </div>

        {/* What we don't do — DARK card with strikethrough rules */}
        <div className="col-span-12 md:col-span-6 rounded-[16px] bg-[#1B1B1B] p-5 text-white">
          <div className="mb-3">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-[#FF6B6B]">
              What we don&apos;t do
            </span>
          </div>
          <ul className="space-y-1.5 text-[14px] leading-snug font-medium text-white/85">
            <li>Paid media · pre-click work</li>
            <li>Standalone copywriting</li>
            <li>SEO</li>
            <li>App development</li>
          </ul>
        </div>
      </div>

      <div className="mt-6" />

      {/* ── Footer ──────────────────────────── */}
      <footer className="flex items-center justify-between border-t border-[#F0F0F0] pt-4 text-[12px] text-[#999]">
        <span>Ecomlanders · Operating cheat sheet · v{VERSION}</span>
        <span className="rounded-full border border-[#E5E5EA] bg-[#FAFAFA] px-2 py-0.5 font-semibold uppercase tracking-wider text-[#666]">
          Admin only
        </span>
      </footer>
    </div>
  );
}

/* ── Building blocks ─────────────────────── */

interface DayDef {
  day: string;
  short: string;
  mode: "client" | "internal";
  headline: string;
  tabs: string[];
  why: string;
}

function WeekCalendar() {
  const days: DayDef[] = [
    {
      day: "Monday",
      short: "Mon",
      mode: "client",
      headline: "Set the week.",
      tabs: ["Weekly posts", "Ops call 2pm"],
      why: "Heavier client touch today relieves pressure from the rest of the week. Ops call sets the lay of the land.",
    },
    {
      day: "Tuesday",
      short: "Tue",
      mode: "internal",
      headline: "Build day.",
      tabs: ["Standup", "Build"],
      why: "Client work first, client comms second. Protects our resources.",
    },
    {
      day: "Wednesday",
      short: "Wed",
      mode: "client",
      headline: "Mid-week pulse.",
      tabs: ["Updates", "Test results", "ETAs"],
      why: "Mid-week pulse keeps things moving.",
    },
    {
      day: "Thursday",
      short: "Thu",
      mode: "internal",
      headline: "Standup + unblock.",
      tabs: ["Lead standup", "Build", "Unblock"],
      why: "See where we are and unblock before Friday close.",
    },
    {
      day: "Friday",
      short: "Fri",
      mode: "client",
      headline: "Close. Prep next week.",
      tabs: ["Early updates", "Clear blockers", "Prep"],
      why: "Close the week clean. Monday lands warm.",
    },
  ];
  return (
    <div className="grid grid-cols-5 divide-x-[0.5px] divide-[#EDEDEF] overflow-hidden rounded-[8px] border-[0.5px] border-[#EDEDEF]">
      {days.map((d, i) => {
        const isClient = d.mode === "client";
        return (
          <div
            key={i}
            className="p-7"
            style={{
              backgroundColor: isClient ? "#F0FDF4" : "#FAFAFB",
            }}
          >
            <div className="flex items-baseline justify-between gap-1">
              <div
                className="text-[16px] font-semibold tracking-tight"
                style={{ color: isClient ? ACCENT : "#1B1B1B" }}
              >
                {d.day}
              </div>
              <span
                className="text-[12px] font-bold uppercase tracking-wider"
                style={{ color: isClient ? "#15803D" : "#A0A0A0" }}
              >
                {isClient ? "Client" : "Internal"}
              </span>
            </div>
            <div className="mt-5 text-[14px] font-semibold leading-snug text-[#1B1B1B]">
              {d.headline}
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {d.tabs.map((t, ti) => (
                <span
                  key={ti}
                  className="rounded-full bg-white px-2.5 py-1 text-[12px] font-medium leading-none"
                  style={{
                    color: isClient ? "#15803D" : "#555",
                    border: `0.5px solid ${isClient ? "#BBF7D0" : "#E5E5EA"}`,
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
            <div className="mt-5 text-[12px] italic leading-relaxed text-[#666]">
              {d.why}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* BentoCard — uniform wrapper for every block in the bento grid. The
 * outer grid handles col-span; this just provides the card chrome. */
function BentoCard({
  number,
  title,
  className = "",
  children,
}: {
  number?: string;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-[12px] border-[0.5px] border-[#EDEDEF] bg-white p-5 ${className}`}
    >
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-[12px] font-semibold uppercase tracking-wider text-[#1B1B1B]">
          {title}
        </h2>
        {number && (
          <span className="font-mono text-[12px] tabular-nums text-[#BBB]">
            {number}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function BulletList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-1.5 text-[14px] leading-snug text-[#1B1B1B]">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2">
          <span className="text-[#CCC]">·</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/* RuleGrid — Section 02's rule + why glossary. Stacks rule on top, why
 * in lighter italic underneath. Eye scans rules first, drops into why
 * when needed. Renders inside a BentoCard. */
function RuleGrid({
  items,
}: {
  items: { rule: string; why: string }[];
}) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
      {items.map((item, i) => (
        <div key={i}>
          <dt className="text-[14px] font-medium leading-snug text-[#1B1B1B]">
            {item.rule}
          </dt>
          <dd className="mt-0.5 text-[12px] italic leading-snug text-[#888]">
            {item.why}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function OwnerTable({
  leftHead,
  rightHead,
  rows,
}: {
  leftHead: string;
  rightHead: string;
  rows: [string, string][];
}) {
  return (
    <table className="w-full">
      <thead>
        <tr>
          <th className="w-[58%] border-b border-[#F0F0F0] py-1.5 text-left text-[12px] font-semibold uppercase tracking-wider text-[#BBB]">
            {leftHead}
          </th>
          <th className="border-b border-[#F0F0F0] py-1.5 text-left text-[12px] font-semibold uppercase tracking-wider text-[#BBB]">
            {rightHead}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([left, right], i) => (
          <tr
            key={i}
            className="align-top border-b border-[#F5F5F5] last:border-0"
          >
            <td className="py-2 pr-3 text-[14px] leading-snug text-[#777]">
              {left}
            </td>
            <td className="py-2 text-[14px] font-semibold leading-snug text-[#1B1B1B]">
              {right}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
