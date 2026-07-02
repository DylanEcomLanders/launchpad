"use client";

import { useEffect, useMemo, useState } from "react";
import { MOCK_ENGAGEMENTS, type MockEngagement } from "@/lib/engagement-mocks";
import { loadLocalEngagementById } from "@/lib/engagement-storage";

/* Compute the calendar date that working day N lands on, counting from
 * the engagement's kickoff Monday. Working day 1 = the kickoff Monday
 * itself. Skips Sat/Sun. */
function workingDayToDate(start: string, n: number): string {
  const d = new Date(start + "T00:00:00");
  let added = 1;
  while (added < n) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/* Snap a YYYY-MM-DD forward to the next Thursday on or after the given
 * date. Used to keep client-facing dates (especially the live link) on
 * the team's Thursday delivery cadence even when underlying data isn't
 * Thursday-aligned. */
function snapToThursday(ymd: string): string {
  const d = new Date(ymd + "T00:00:00");
  while (d.getDay() !== 4) d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type MilestoneKind = "kickoff" | "design" | "build" | "test" | "launch" | "readout" | "support" | "milestone";

interface RoadmapMilestone {
  date: string;
  kind: MilestoneKind;
  body: string;
}

const KIND_META: Record<MilestoneKind, { accent: string; tag: string }> = {
  kickoff: { accent: "#1B1B1B", tag: "Kickoff" },
  design: { accent: "#1B1B1B", tag: "First design over" },
  build: { accent: "#1B1B1B", tag: "Build live" },
  test: { accent: "#1B1B1B", tag: "Test wrap" },
  launch: { accent: "#1B1B1B", tag: "Live link sent" },
  readout: { accent: "#1B1B1B", tag: "Readout" },
  support: { accent: "#7A7A7A", tag: "Support wraps" },
  milestone: { accent: "#1B1B1B", tag: "Milestone" },
};

function formatDayMonth(ymd: string | undefined) {
  if (!ymd) return "TBC";
  try {
    return new Date(ymd + "T00:00:00").toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return ymd;
  }
}

function formatWeekday(ymd: string | undefined) {
  if (!ymd) return "";
  try {
    return new Date(ymd + "T00:00:00").toLocaleDateString("en-GB", {
      weekday: "short",
    });
  } catch {
    return "";
  }
}

function formatLongDate(ymd: string | undefined) {
  if (!ymd) return "TBC";
  try {
    return new Date(ymd + "T00:00:00").toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return ymd;
  }
}

export default function RoadmapDeck({ engagementId }: { engagementId: string }) {
  const [engagement, setEngagement] = useState<MockEngagement | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    const local = loadLocalEngagementById(engagementId);
    if (local) {
      setEngagement(local);
      return;
    }
    (async () => {
      try {
        const [{ bootstrapPodsSync }, { loadEngagementFromPodsById }] = await Promise.all([
          import("@/lib/pods-v2/sync"),
          import("@/lib/engagement-from-pods"),
        ]);
        await bootstrapPodsSync();
        if (cancelled) return;
        const fromPods = loadEngagementFromPodsById(engagementId);
        if (fromPods) {
          setEngagement(fromPods);
          return;
        }
        const mock = MOCK_ENGAGEMENTS.find((e) => e.id === engagementId);
        setEngagement(mock ?? null);
      } catch {
        if (cancelled) return;
        const mock = MOCK_ENGAGEMENTS.find((e) => e.id === engagementId);
        setEngagement(mock ?? null);
      }
    })();
    return () => { cancelled = true; };
  }, [engagementId]);

  const milestones = useMemo<RoadmapMilestone[]>(() => {
    if (!engagement) return [];
    const out: RoadmapMilestone[] = [];

    out.push({
      date: engagement.startDate,
      kind: "kickoff",
      body: "Build phase begins. Wireframes start the same day.",
    });

    const firstDesign = engagement.customDeliverables
      .filter((d) => d.stage === "design" && d.dueDay > 0)
      .sort((a, b) => a.dueDay - b.dueDay)[0];
    if (firstDesign) {
      out.push({
        date: workingDayToDate(engagement.startDate, firstDesign.dueDay),
        kind: "design",
        body: "Initial design lands in Figma. Review window opens.",
      });
    }

    const lastBuild = engagement.customDeliverables
      .filter((d) => d.stage === "build" || d.stage === "development")
      .reduce((max, d) => (d.dueDay > max ? d.dueDay : max), 0);
    if (lastBuild > 0) {
      /* Live link always lands on a Thursday. If the underlying build
       * deliverable wasn't Thursday-aligned (mock data, mid-cycle
       * pivots), snap forward to the next Thursday for the client view. */
      const lastBuildDate = workingDayToDate(engagement.startDate, lastBuild);
      out.push({
        date: snapToThursday(lastBuildDate),
        kind: "launch",
        body: "Build pushed live. Launch slot confirmed with you ahead of go-live. US evenings and Friday windows available.",
      });
    }

    return out.sort((a, b) => a.date.localeCompare(b.date));
  }, [engagement]);

  if (engagement === undefined) {
    return (
      <main className="min-h-screen bg-surface-raised text-foreground flex items-center justify-center">
        <p className="text-[11px] uppercase tracking-[0.2em] text-subtle">Loading</p>
      </main>
    );
  }
  if (engagement === null) {
    return (
      <main className="min-h-screen bg-surface-raised text-foreground flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-subtle mb-3">Roadmap</p>
          <p className="text-[18px] font-medium tracking-tight">This engagement is no longer available.</p>
        </div>
      </main>
    );
  }

  const kickoff = engagement.startDate;
  const launchMilestone = milestones.find((m) => m.kind === "launch");
  const deliveryDate = launchMilestone?.date ?? milestones[milestones.length - 1]?.date ?? "";

  return (
    <main className="min-h-screen bg-surface-raised text-foreground">
      <div className="max-w-[1040px] mx-auto px-6 md:px-10 py-10 md:py-14">

        {/* Header */}
        <header className="mb-6 md:mb-8 flex items-end justify-between gap-6 flex-wrap">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-subtle">
              Project roadmap
            </p>
            <h1 className="mt-2 text-[36px] md:text-[44px] font-medium leading-[1.05] tracking-tight text-foreground">
              {engagement.brand}
            </h1>
            <p className="mt-2 text-[15px] text-subtle max-w-[640px] leading-relaxed">
              Two-week build cadence. Mondays kick off, Thursdays ship.
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-subtle">
              Kickoff
            </p>
            <p className="mt-1 text-[18px] text-foreground font-medium tabular-nums">
              {formatLongDate(kickoff)}
            </p>
          </div>
        </header>

        {/* Key dates — card containing 3 stat tiles */}
        <section className="mb-5 rounded-2xl border border-foreground bg-white p-5 shadow-[var(--shadow-soft)]">
          <div className="flex items-baseline justify-between mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle">
              Key dates
            </p>
            <span className="text-[13px] text-[#9A9A9A]">
              Kickoff · First design · Live link
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <KeyDateTile label="Kickoff" primary={formatDayMonth(kickoff)} secondary={formatWeekday(kickoff)} />
            <KeyDateTile
              label="Live link"
              primary={deliveryDate ? formatDayMonth(deliveryDate) : "TBC"}
              secondary={deliveryDate ? formatWeekday(deliveryDate) : "Confirmed at kickoff"}
            />
            <KeyDateTile
              label="Cadence"
              primary="Thursdays"
              secondary="Mondays for updates"
            />
          </div>
        </section>

        {/* How the cycle runs — card with 4 rhythm tiles + slippage callout */}
        <section className="mb-5 rounded-2xl border border-foreground bg-white p-5 shadow-[var(--shadow-soft)]">
          <div className="flex items-baseline justify-between mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle">
              How the cycle runs
            </p>
            <span className="text-[13px] text-[#9A9A9A]">Mon to Thu, week over week</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <RhythmTile
              day="Mon · W1"
              stage="Kickoff"
              body="Project starts. Wireframes and design begin same day."
            />
            <RhythmTile
              day="Thu · W1"
              stage="Designs delivered"
              body="Initial design lands by EOD. We ask for revisions back by Friday EOD."
            />
            <RhythmTile
              day="Mon · W2"
              stage="Revs + dev"
              body="We address notes, build desktops, hand off to dev."
            />
            <RhythmTile
              day="Thu · W2"
              stage="Live link sent"
              body="Approval signed. Build pushed live."
            />
          </div>
          <div className="flex items-stretch rounded-lg border border-[#FFE0B2] bg-[#FFF8EE] overflow-hidden">
            <div className="w-[5px] bg-warning shrink-0" aria-hidden />
            <div className="px-4 md:px-5 py-3 md:py-4 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-warning">
                If revisions slip
              </p>
              <p className="mt-1.5 text-[14px] tracking-tight text-foreground font-medium leading-snug">
                Past Monday or multiple rounds means the build moves to the following Thursday.
              </p>
              <p className="mt-0.5 text-[14px] text-[#7A4A00] leading-relaxed">
                Sometimes that means delivering early. Always means shipping clean.
              </p>
            </div>
          </div>
        </section>

        {/* Roadmap — card containing milestone list. The asterisk on
         * the heading anchors a footnote (below the card) clarifying
         * that these dates assume client-side requirements come back
         * on time. */}
        <section className="mb-3 rounded-2xl border border-foreground bg-white p-5 shadow-[var(--shadow-soft)]">
          <div className="flex items-baseline justify-between mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle">
              Roadmap <sup className="text-warning font-bold">*</sup>
            </p>
            <span className="text-[13px] text-[#9A9A9A] tabular-nums">
              {milestones.length} {milestones.length === 1 ? "milestone" : "milestones"}
            </span>
          </div>
          {milestones.length > 0 ? (
            <ol className="rounded-lg border border-border overflow-hidden divide-y divide-border">
              {milestones.map((m, i) => {
                const meta = KIND_META[m.kind];
                return (
                  <li key={`${m.date}-${i}`} className="grid grid-cols-[120px_1fr] md:grid-cols-[160px_1fr] gap-4 md:gap-6 px-4 md:px-5 py-4 md:py-5 bg-white">
                    <div className="flex flex-col justify-center">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9A9A9A]">
                        {formatWeekday(m.date)}
                      </span>
                      <span className="mt-1 text-[22px] md:text-[24px] font-medium leading-none tracking-tight tabular-nums">
                        {formatDayMonth(m.date)}
                      </span>
                    </div>
                    <div className="flex flex-col justify-center">
                      <div className="flex items-center gap-2">
                        <span
                          className="size-1.5 rounded-full"
                          style={{ background: meta.accent }}
                          aria-hidden
                        />
                        <span
                          className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                          style={{ color: meta.accent }}
                        >
                          {meta.tag}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[14px] md:text-[15px] leading-snug text-foreground max-w-[640px]">
                        {m.body}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="text-[14px] text-subtle italic">Roadmap dates lock in at kickoff.</p>
          )}
        </section>

        {/* Footnote attached to the Roadmap asterisk. Sets expectations
         * that the timeline depends on client-side inputs landing on
         * time; otherwise the slippage rules upstream kick in. */}
        <p className="mb-5 px-1 text-[13px] text-subtle leading-relaxed">
          <sup className="text-warning font-bold mr-1">*</sup>
          Timeline assumes Shopify access, brand assets, and any other requested inputs are returned on time. If client-side requirements come back late, the slippage rules above apply and delivery dates shift to the following Thursday.
        </p>

        {/* After launch — generic post-launch summary, no dates. We
         * follow performance + capture test wins as they come in, plus
         * the 30-day support reminder. */}
        <section className="mb-5 rounded-2xl border border-foreground bg-white p-5 shadow-[var(--shadow-soft)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle mb-4">
            After launch
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-[#FAFBFC] p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="size-1.5 rounded-full bg-surface" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground">
                  We watch the numbers
                </span>
              </div>
              <p className="text-[14px] leading-snug text-border">
                Performance tracked from go-live. Test wins captured as they come in. A readout call once there's enough signal to act on.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-[#FAFBFC] p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="size-1.5 rounded-full bg-subtle" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-subtle">
                  30-day support window
                </span>
              </div>
              <p className="text-[14px] leading-snug text-border">
                Bug fixes, tweaks, and monitoring stay on us for 30 days post-launch. Anything new after that gets scoped separately.
              </p>
            </div>
          </div>
        </section>

        {/* Working together — dark card */}
        <section className="mb-5 rounded-2xl bg-surface text-white p-6 md:p-7 shadow-[var(--shadow-card)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/55">
            Working together
          </p>
          <h2 className="mt-2 text-[20px] md:text-[24px] font-medium leading-tight tracking-tight text-white max-w-[640px]">
            How communication runs across the engagement.
          </h2>
          <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-3">
            <DarkChannel label="Slack" body="Available to answer questions or queries on the shared channel set up at kickoff." />
            <DarkChannel label="Monday update" body="Where we are, what's locked for the week, anything that needs a decision." />
            <DarkChannel label="Thursday delivery" body="Core deliverables ship. Preview link or design review in your inbox." />
            <DarkChannel label="Post-launch support" body="30 days from go-live. Bug fixes, tweaks, monitoring. We stay on it." />
          </div>
        </section>

        {/* Footer */}
        <footer className="rounded-2xl border border-foreground bg-white p-5 md:p-6 shadow-[var(--shadow-soft)] grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-[18px] font-semibold tracking-tight text-foreground">
              Ecomlanders
            </p>
            <p className="mt-0.5 text-[13px] text-[#9A9A9A]">
              Design + build for ecommerce.
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle">
              Document
            </p>
            <p className="mt-2 text-[14px] text-foreground">
              {engagement.brand} project roadmap
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle">
              Questions
            </p>
            <p className="mt-2 text-[14px] font-medium text-foreground">
              Reply on Slack
            </p>
            <p className="mt-0.5 text-[13px] text-[#9A9A9A]">
              Shared channel goes live at kickoff. Fastest way to reach us.
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}

function KeyDateTile({
  label,
  primary,
  secondary,
}: {
  label: string;
  primary: string;
  secondary: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-[#FAFBFC] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle">
        {label}
      </p>
      <p className="mt-2 text-[22px] md:text-[24px] font-medium leading-none tracking-tight tabular-nums text-foreground">
        {primary}
      </p>
      <p className="mt-1.5 text-[14px] text-subtle">{secondary}</p>
    </div>
  );
}

function RhythmTile({
  day,
  stage,
  body,
}: {
  day: string;
  stage: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-[#FAFBFC] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle">
        {day}
      </p>
      <p className="mt-2 text-[15px] md:text-[16px] font-semibold tracking-tight text-foreground">
        {stage}
      </p>
      <p className="mt-1.5 text-[14px] leading-snug text-subtle max-w-[240px]">
        {body}
      </p>
    </div>
  );
}

function DarkChannel({ label, body }: { label: string; body: string }) {
  return (
    <div className="rounded-lg bg-white/5 px-4 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white">
        {label}
      </p>
      <p className="mt-2 text-[14px] leading-relaxed text-white/65 max-w-[260px]">
        {body}
      </p>
    </div>
  );
}
