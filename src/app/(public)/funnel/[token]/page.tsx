import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/logo";
import { getRoadmapByShareToken } from "@/lib/funnel-builder/roadmap-data";
import {
  ROADMAP_STATUS_COLORS,
  ROADMAP_STATUS_LABELS,
  countByStatus,
  totalStepCount,
  type RoadmapStep,
} from "@/lib/funnel-builder/roadmap-types";
import {
  trafficSourceConfigs,
  pageNodeConfigs,
  leadMagnetConfig,
  emailSequenceConfig,
} from "@/lib/funnel-builder/constants";
import { RoadmapSVG } from "@/components/funnel-builder/RoadmapSVG";

export const revalidate = 0;

function defaultLabel(step: RoadmapStep): string {
  switch (step.kind) {
    case "traffic":
      return trafficSourceConfigs[step.source].label;
    case "page":
      return pageNodeConfigs[step.pageType].label;
    case "lead-magnet":
      return leadMagnetConfig.label;
    case "email-sequence":
      return emailSequenceConfig.label;
  }
}

export default async function ClientRoadmapView({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const roadmap = await getRoadmapByShareToken(token);
  if (!roadmap) notFound();

  const total = totalStepCount(roadmap);
  const counts = countByStatus(roadmap);
  const allSteps: RoadmapStep[] = [
    ...roadmap.trafficSources,
    ...roadmap.pages,
    ...(roadmap.leadGen
      ? [roadmap.leadGen.magnet, roadmap.leadGen.sequence]
      : []),
  ];
  const updated = new Date(roadmap.updated_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-surface-raised">
      {/* ── Header ────────────────────────────── */}
      <header className="bg-surface border-b border-foreground">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="https://ecomlanders.app"
              className="text-foreground shrink-0"
              aria-label="Ecom Landers"
            >
              <Logo height={18} />
            </Link>
            <div className="h-4 w-px bg-foreground shrink-0" />
            <div className="min-w-0">
              {roadmap.clientName && (
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                  {roadmap.clientName}
                </p>
              )}
              <h1 className="text-base font-semibold text-foreground truncate">
                {roadmap.name || "Funnel roadmap"}
              </h1>
            </div>
          </div>
          <p className="text-[11px] text-muted tabular-nums shrink-0">
            Updated {updated}
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* ── Progress summary ────────────────────────── */}
        {total > 0 && (
          <div className="mb-8 flex items-center gap-3 text-[11px] flex-wrap">
            <span className="font-semibold text-foreground">
              {counts.live} of {total} stages live
            </span>
            {(["planned", "in-build", "live", "optimising"] as const).map(
              (s) => {
                if (counts[s] === 0) return null;
                const c = ROADMAP_STATUS_COLORS[s];
                return (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full"
                    style={{ background: c.bg, color: c.text }}
                  >
                    <span
                      className="size-1.5 rounded-full"
                      style={{ background: c.dot }}
                    />
                    {counts[s]} {ROADMAP_STATUS_LABELS[s].toLowerCase()}
                  </span>
                );
              },
            )}
          </div>
        )}

        {/* ── Roadmap SVG ──────────────────────────────── */}
        <div className="bg-surface border border-foreground rounded-xl p-6 mb-8">
          <RoadmapSVG roadmap={roadmap} />
        </div>

        {/* ── Step detail list ─────────────────────────── */}
        {allSteps.length > 0 && (
          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-subtle mb-3">
              The plan, step by step
            </h2>
            <ol className="space-y-3">
              {allSteps.map((step, i) => (
                <StepDetailRow key={step.id} step={step} index={i} />
              ))}
            </ol>
          </div>
        )}

        <footer className="mt-12 pt-6 border-t border-foreground text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted">
            Built with{" "}
            <Link
              href="https://ecomlanders.app"
              className="font-semibold text-foreground hover:underline"
            >
              Ecom Landers
            </Link>
          </p>
        </footer>
      </main>
    </div>
  );
}

function StepDetailRow({ step, index }: { step: RoadmapStep; index: number }) {
  const status = ROADMAP_STATUS_COLORS[step.status];
  const label = step.customLabel || defaultLabel(step);
  const kindLabel =
    step.kind === "traffic"
      ? "Traffic source"
      : step.kind === "page"
      ? "Page"
      : step.kind === "lead-magnet"
      ? "Lead magnet"
      : "Email sequence";

  return (
    <li className="bg-surface border border-foreground rounded-lg p-4 flex items-start gap-4">
      <div
        className="size-8 rounded-full flex items-center justify-center text-[11px] font-semibold tabular-nums shrink-0"
        style={{ background: status.bg, color: status.text }}
      >
        {String(index + 1).padStart(2, "0")}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap mb-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            {kindLabel}
          </p>
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
            style={{ background: status.bg, color: status.text }}
          >
            <span
              className="size-1.5 rounded-full"
              style={{ background: status.dot }}
            />
            {ROADMAP_STATUS_LABELS[step.status]}
          </span>
        </div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {step.note && (
          <p className="mt-1 text-[12px] leading-snug text-subtle">
            {step.note}
          </p>
        )}
        {step.kpiTarget && (
          <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-foreground">
            <span className="text-muted">KPI:</span> {step.kpiTarget}
          </p>
        )}
      </div>
    </li>
  );
}
