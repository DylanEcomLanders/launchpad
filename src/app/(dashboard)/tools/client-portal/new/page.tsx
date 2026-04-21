"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeftIcon, CheckIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { DecorativeBlocks } from "@/components/decorative-blocks";
import { createPortal } from "@/lib/portal/data";
import { createRoadmapItem } from "@/lib/portal/roadmap";
import { inputClass, labelClass, selectClass, textareaClass } from "@/lib/form-styles";
import type { RoadmapPriority } from "@/lib/portal/roadmap-types";

/**
 * Step-by-step setup for a new portal. Replaces the old 2-field inline form.
 * Guarantees the portal always has meaningful data on creation.
 *
 * Template = Page Build (unique pages) or Conversion Engine (team-led retainer).
 */

type Template = "page-build" | "conversion-engine";

type PageScopeRow = {
  name: string;
  type: string; // PDP / Landing / Advertorial / Homepage / Other
  description: string;
};

type RoadmapSeed = {
  title: string;
  description: string;
  priority: RoadmapPriority;
  target_month: string;
};

const TIMEZONE_OPTIONS = [
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "America/Chicago",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Australia/Sydney",
];

const PAGE_TYPE_OPTIONS = ["PDP", "Landing Page", "Advertorial", "Homepage", "Collection", "Other"];

export default function NewPortalPage() {
  const router = useRouter();
  const [template, setTemplate] = useState<Template | null>(null);
  const [step, setStep] = useState(0);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Shared fields (both templates) ──
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [timezone, setTimezone] = useState("Europe/London");
  const [internalSlackId, setInternalSlackId] = useState("");
  const [externalSlackUrl, setExternalSlackUrl] = useState("");

  // ── Page Build — pages + timeline ──
  const [pages, setPages] = useState<PageScopeRow[]>([{ name: "", type: "Landing Page", description: "" }]);
  const [startDate, setStartDate] = useState("");
  const [launchDate, setLaunchDate] = useState("");

  // ── Conversion Engine — initial roadmap + cadence ──
  const [seeds, setSeeds] = useState<RoadmapSeed[]>([
    { title: "", description: "", priority: "high", target_month: monthInputDefault() },
  ]);
  const [retainerStart, setRetainerStart] = useState("");
  const [monthlyReviewDay, setMonthlyReviewDay] = useState("last-friday");

  // ── Stepper ──
  const totalSteps = 4;
  const stepLabels = template === "conversion-engine"
    ? ["Brand", "Initial roadmap", "Cadence", "Team + Slack"]
    : ["Brand", "Pages", "Timeline", "Team + Slack"];

  const canAdvance = (() => {
    if (!template) return false;
    if (step === 0) return clientName.trim().length > 0;
    if (step === 1) {
      if (template === "page-build") return pages.length > 0 && pages.every((p) => p.name.trim().length > 0);
      // Conversion engine roadmap seeding is optional
      return true;
    }
    if (step === 2) {
      if (template === "page-build") return !!startDate;
      return !!retainerStart;
    }
    return true; // team + slack step is all optional
  })();

  const handleCreate = async () => {
    if (!template) return;
    setCreating(true);
    setError(null);
    try {
      const isRetainer = template === "conversion-engine";
      const now = new Date().toISOString();

      const firstProject = isRetainer
        ? {
            id: `proj-${Date.now()}`,
            name: "Conversion Engine",
            type: "retainer" as const,
            status: "active" as const,
            created_at: now,
            phases: [],
            deliverables: [],
            current_phase: "",
            progress: 0,
            scope: [],
            documents: [],
          }
        : {
            id: `proj-${Date.now()}`,
            name: pages[0]?.name?.trim() || "Page Build",
            type: "page-build" as const,
            status: "active" as const,
            created_at: now,
            phases: [
              { id: "ph-onb", name: "Onboarding", status: "complete" as const, date: startDate || "", description: "" },
              { id: "ph-des", name: "Design", status: "in-progress" as const, date: "", description: "" },
              { id: "ph-dev", name: "Development", status: "upcoming" as const, date: "", description: "" },
              { id: "ph-qa", name: "QA & Launch", status: "upcoming" as const, date: launchDate || "", description: "" },
            ],
            deliverables: pages.map((p, i) => ({
              id: `del-${i}`,
              type: p.type.toLowerCase().replace(/\s+/g, "-"),
              title: p.name.trim(),
              description: p.description.trim(),
              status: "in-progress" as const,
            })),
            scope: [],
            documents: [],
          };

      const portal = await createPortal({
        client_name: clientName.trim(),
        client_email: clientEmail.trim(),
        client_type: isRetainer ? "retainer" : "regular",
        project_type: isRetainer ? "Conversion Engine" : (pages[0]?.type || "Page Build"),
        current_phase: isRetainer ? "Roadmap" : "Design",
        progress: 0,
        // createPortal auto-fills next_touchpoint to next Mon/Wed/Fri when this is blank.
        next_touchpoint: { date: "", description: "" },
        phases: [],
        scope: [],
        deliverables: [],
        documents: [],
        results: [],
        wins: [],
        show_results: isRetainer,
        slack_channel_url: externalSlackUrl.trim(),
        slack_internal_channel_id: internalSlackId.trim(),
        ad_hoc_requests: [],
        projects: [firstProject],
      } as any);

      // Seed roadmap items for Conversion Engine portals.
      if (isRetainer) {
        const filled = seeds.filter((s) => s.title.trim().length > 0);
        for (let i = 0; i < filled.length; i++) {
          const s = filled[i];
          await createRoadmapItem({
            portal_id: portal.id,
            title: s.title.trim(),
            description: s.description.trim(),
            impact_hypothesis: "",
            stage: i === 0 ? "in-progress" : "next-up",
            priority: s.priority,
            target_month: s.target_month,
            sort_index: i,
            figma_url: "",
            staging_url: "",
            live_url: "",
            outcome: "",
            started_at: i === 0 ? new Date().toISOString() : null,
            shipped_at: null,
          });
        }
      }

      router.push(`/tools/client-portal/${portal.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create portal");
      setCreating(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-12 py-10">
        <Link
          href="/tools/client-portal"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#A0A0A0] hover:text-[#1B1B1B] transition-colors mb-6"
        >
          <ArrowLeftIcon className="size-3" />
          All Portals
        </Link>

        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">New Portal</h1>
        <p className="text-[#7A7A7A] mb-8">
          {template
            ? `Setting up a ${template === "conversion-engine" ? "Conversion Engine (retainer)" : "Page Build"} portal.`
            : "Pick a template to get started. You'll go through a few steps to make sure the portal isn't empty on Day 1."}
        </p>

        {/* Template picker */}
        {!template && (
          <div className="grid md:grid-cols-2 gap-4">
            <TemplateCard
              title="Page Build"
              subtitle="One-off, bespoke pages — unique scope per project"
              blurb="Use for 1x PDP, landing pages, listicles, advertorials. You'll set the pages, timeline, and team."
              onPick={() => setTemplate("page-build")}
            />
            <TemplateCard
              title="Conversion Engine"
              subtitle="Retainer — team-led roadmap + assembly line"
              blurb="We own the roadmap. Items flow through a clean list: Backlog → Next Up → In Progress → Shipped."
              onPick={() => setTemplate("conversion-engine")}
            />
          </div>
        )}

        {/* Stepper + steps */}
        {template && (
          <>
            <Stepper step={step} labels={stepLabels} />

            <div className="mt-8 bg-white border border-[#E8E8E8] rounded-xl p-6">
              {step === 0 && (
                <BrandStep
                  clientName={clientName}
                  setClientName={setClientName}
                  clientEmail={clientEmail}
                  setClientEmail={setClientEmail}
                  websiteUrl={websiteUrl}
                  setWebsiteUrl={setWebsiteUrl}
                  timezone={timezone}
                  setTimezone={setTimezone}
                />
              )}

              {step === 1 && template === "page-build" && (
                <PagesStep pages={pages} setPages={setPages} />
              )}

              {step === 1 && template === "conversion-engine" && (
                <RoadmapSeedStep seeds={seeds} setSeeds={setSeeds} />
              )}

              {step === 2 && template === "page-build" && (
                <TimelineStep
                  startDate={startDate}
                  setStartDate={setStartDate}
                  launchDate={launchDate}
                  setLaunchDate={setLaunchDate}
                />
              )}

              {step === 2 && template === "conversion-engine" && (
                <CadenceStep
                  retainerStart={retainerStart}
                  setRetainerStart={setRetainerStart}
                  monthlyReviewDay={monthlyReviewDay}
                  setMonthlyReviewDay={setMonthlyReviewDay}
                />
              )}

              {step === 3 && (
                <TeamSlackStep
                  internalSlackId={internalSlackId}
                  setInternalSlackId={setInternalSlackId}
                  externalSlackUrl={externalSlackUrl}
                  setExternalSlackUrl={setExternalSlackUrl}
                />
              )}
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">{error}</div>
            )}

            {/* Nav */}
            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => {
                  if (step === 0) {
                    setTemplate(null);
                    return;
                  }
                  setStep(step - 1);
                }}
                className="px-4 py-2 text-xs font-medium text-[#777] hover:text-[#1A1A1A] transition-colors"
              >
                Back
              </button>

              {step < totalSteps - 1 ? (
                <button
                  onClick={() => setStep(step + 1)}
                  disabled={!canAdvance}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-[#1B1B1B] rounded-lg hover:bg-[#2D2D2D] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#1B1B1B] rounded-lg hover:bg-[#2D2D2D] transition-colors disabled:opacity-40"
                >
                  {creating ? "Creating…" : (
                    <>
                      <CheckIcon className="size-4" />
                      Create portal
                    </>
                  )}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Stepper ── */

function Stepper({ step, labels }: { step: number; labels: string[] }) {
  return (
    <div className="flex items-center gap-2">
      {labels.map((label, i) => (
        <div key={label} className="flex items-center gap-2 flex-1">
          <div
            className={`flex items-center justify-center size-6 rounded-full text-[10px] font-semibold shrink-0 transition-colors ${
              i < step
                ? "bg-emerald-500 text-white"
                : i === step
                ? "bg-[#1B1B1B] text-white"
                : "bg-[#F0F0F0] text-[#999]"
            }`}
          >
            {i < step ? <CheckIcon className="size-3" /> : i + 1}
          </div>
          <span className={`text-xs font-medium ${i === step ? "text-[#1A1A1A]" : "text-[#999]"}`}>{label}</span>
          {i < labels.length - 1 && <div className="flex-1 h-px bg-[#E8E8E8]" />}
        </div>
      ))}
    </div>
  );
}

/* ── Template picker card ── */

function TemplateCard({
  title,
  subtitle,
  blurb,
  onPick,
}: {
  title: string;
  subtitle: string;
  blurb: string;
  onPick: () => void;
}) {
  return (
    <button
      onClick={onPick}
      className="text-left p-5 border border-[#E8E8E8] rounded-xl bg-white hover:border-[#1B1B1B] hover:shadow-sm transition-all"
    >
      <h3 className="text-base font-bold text-[#1A1A1A] mb-1">{title}</h3>
      <p className="text-xs font-medium text-[#666] mb-3">{subtitle}</p>
      <p className="text-xs text-[#888] leading-relaxed">{blurb}</p>
    </button>
  );
}

/* ── Steps ── */

function BrandStep(props: {
  clientName: string;
  setClientName: (v: string) => void;
  clientEmail: string;
  setClientEmail: (v: string) => void;
  websiteUrl: string;
  setWebsiteUrl: (v: string) => void;
  timezone: string;
  setTimezone: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-[#1A1A1A] mb-1">Brand basics</h2>
      <p className="text-xs text-[#777] mb-4">Who is this portal for?</p>

      <div>
        <label className={labelClass}>Client name *</label>
        <input
          className={inputClass}
          placeholder="e.g. Pupganics"
          value={props.clientName}
          onChange={(e) => props.setClientName(e.target.value)}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Client email</label>
          <input
            className={inputClass}
            placeholder="main@client.com"
            value={props.clientEmail}
            onChange={(e) => props.setClientEmail(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Website URL</label>
          <input
            className={inputClass}
            placeholder="https://…"
            value={props.websiteUrl}
            onChange={(e) => props.setWebsiteUrl(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Client timezone</label>
        <select className={selectClass} value={props.timezone} onChange={(e) => props.setTimezone(e.target.value)}>
          {TIMEZONE_OPTIONS.map((tz) => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function PagesStep({ pages, setPages }: { pages: PageScopeRow[]; setPages: (p: PageScopeRow[]) => void }) {
  const update = (i: number, patch: Partial<PageScopeRow>) => {
    setPages(pages.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  };
  const remove = (i: number) => setPages(pages.filter((_, idx) => idx !== i));
  const add = () => setPages([...pages, { name: "", type: "Landing Page", description: "" }]);

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-[#1A1A1A] mb-1">Pages</h2>
      <p className="text-xs text-[#777] mb-4">List every page being built. Keep it simple — one row per page.</p>

      {pages.map((page, i) => (
        <div key={i} className="border border-[#E8E8E8] rounded-lg p-4 space-y-3 bg-[#FAFAFA]">
          <div className="flex items-start gap-3">
            <div className="flex-1 grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className={labelClass}>Page name *</label>
                <input
                  className={inputClass}
                  placeholder="e.g. Homepage"
                  value={page.name}
                  onChange={(e) => update(i, { name: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Type</label>
                <select className={selectClass} value={page.type} onChange={(e) => update(i, { type: e.target.value })}>
                  {PAGE_TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
            {pages.length > 1 && (
              <button
                onClick={() => remove(i)}
                className="mt-6 p-2 text-[#999] hover:text-red-600 transition-colors"
                title="Remove"
              >
                <TrashIcon className="size-4" />
              </button>
            )}
          </div>
          <div>
            <label className={labelClass}>Brief description</label>
            <textarea
              className={`${textareaClass} min-h-[50px]`}
              placeholder="What's the purpose of this page, any specific asks"
              value={page.description}
              onChange={(e) => update(i, { description: e.target.value })}
            />
          </div>
        </div>
      ))}

      <button
        onClick={add}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#555] hover:text-[#1A1A1A] transition-colors"
      >
        <PlusIcon className="size-3.5" />
        Add another page
      </button>
    </div>
  );
}

function TimelineStep(props: {
  startDate: string;
  setStartDate: (v: string) => void;
  launchDate: string;
  setLaunchDate: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-[#1A1A1A] mb-1">Timeline</h2>
      <p className="text-xs text-[#777] mb-4">
        Four phases will be pre-filled on the portal (Onboarding ✓ / Design / Dev / QA & Launch). Set the start and target launch.
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Project start date *</label>
          <input
            type="date"
            className={inputClass}
            value={props.startDate}
            onChange={(e) => props.setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Target launch date</label>
          <input
            type="date"
            className={inputClass}
            value={props.launchDate}
            onChange={(e) => props.setLaunchDate(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

function RoadmapSeedStep({ seeds, setSeeds }: { seeds: RoadmapSeed[]; setSeeds: (s: RoadmapSeed[]) => void }) {
  const update = (i: number, patch: Partial<RoadmapSeed>) => {
    setSeeds(seeds.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  };
  const remove = (i: number) => setSeeds(seeds.filter((_, idx) => idx !== i));
  const add = () =>
    setSeeds([...seeds, { title: "", description: "", priority: "medium", target_month: monthInputDefault() }]);

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-[#1A1A1A] mb-1">Seed the roadmap</h2>
      <p className="text-xs text-[#777] mb-4">
        Add 1-3 initial items so the portal isn't empty on Day 1. First item goes straight into In Progress; the rest become Next Up.
        Optional — you can leave them blank and add items after setup.
      </p>

      {seeds.map((seed, i) => (
        <div key={i} className="border border-[#E8E8E8] rounded-lg p-4 bg-[#FAFAFA] space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex-1 space-y-3">
              <div>
                <label className={labelClass}>Title {i === 0 ? "" : "(optional)"}</label>
                <input
                  className={inputClass}
                  placeholder="e.g. Homepage redesign"
                  value={seed.title}
                  onChange={(e) => update(i, { title: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  className={`${textareaClass} min-h-[50px]`}
                  placeholder="One line on what the work is"
                  value={seed.description}
                  onChange={(e) => update(i, { description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Priority</label>
                  <select
                    className={selectClass}
                    value={seed.priority}
                    onChange={(e) => update(i, { priority: e.target.value as RoadmapPriority })}
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Target month</label>
                  <input
                    type="month"
                    className={inputClass}
                    value={seed.target_month}
                    onChange={(e) => update(i, { target_month: e.target.value })}
                  />
                </div>
              </div>
            </div>
            {seeds.length > 1 && (
              <button
                onClick={() => remove(i)}
                className="mt-6 p-2 text-[#999] hover:text-red-600 transition-colors"
                title="Remove"
              >
                <TrashIcon className="size-4" />
              </button>
            )}
          </div>
        </div>
      ))}

      {seeds.length < 3 && (
        <button
          onClick={add}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#555] hover:text-[#1A1A1A] transition-colors"
        >
          <PlusIcon className="size-3.5" />
          Add another item
        </button>
      )}
    </div>
  );
}

function CadenceStep(props: {
  retainerStart: string;
  setRetainerStart: (v: string) => void;
  monthlyReviewDay: string;
  setMonthlyReviewDay: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-[#1A1A1A] mb-1">Cadence</h2>
      <p className="text-xs text-[#777] mb-4">
        When does the retainer kick off, and when do you review progress with the client each month?
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Retainer start date *</label>
          <input
            type="date"
            className={inputClass}
            value={props.retainerStart}
            onChange={(e) => props.setRetainerStart(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Monthly review day</label>
          <select
            className={selectClass}
            value={props.monthlyReviewDay}
            onChange={(e) => props.setMonthlyReviewDay(e.target.value)}
          >
            <option value="first-monday">First Monday of month</option>
            <option value="last-friday">Last Friday of month</option>
            <option value="1st">1st of month</option>
            <option value="15th">15th of month</option>
            <option value="last-day">Last day of month</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function TeamSlackStep(props: {
  internalSlackId: string;
  setInternalSlackId: (v: string) => void;
  externalSlackUrl: string;
  setExternalSlackUrl: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-[#1A1A1A] mb-1">Team + Slack</h2>
      <p className="text-xs text-[#777] mb-4">
        Paste Slack channel IDs here. In Slack: right-click the channel → View channel details → copy the ID at the bottom.
        Leave blank if the channels don't exist yet — you can add them later in portal settings.
      </p>

      <div>
        <label className={labelClass}>Internal Slack channel ID</label>
        <input
          className={inputClass}
          placeholder="e.g. C0ASRMBC214"
          value={props.internalSlackId}
          onChange={(e) => props.setInternalSlackId(e.target.value)}
        />
        <p className="text-[10px] text-[#BBB] mt-1">Where QA gate notifications and team updates post.</p>
      </div>

      <div>
        <label className={labelClass}>External (client-facing) Slack channel ID</label>
        <input
          className={inputClass}
          placeholder="e.g. C0AS…"
          value={props.externalSlackUrl}
          onChange={(e) => props.setExternalSlackUrl(e.target.value)}
        />
        <p className="text-[10px] text-[#BBB] mt-1">The shared channel with the client.</p>
      </div>

      <p className="text-[11px] text-[#999] pt-2 border-t border-[#F0F0F0]">
        Once created, you can assign team members to this portal in the portal's Settings tab.
      </p>
    </div>
  );
}

/* ── Helpers ── */

function monthInputDefault(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
