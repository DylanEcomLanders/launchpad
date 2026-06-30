"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useWorkspaceData, todayYMD } from "@/lib/workspace/use-workspace-data";
import {
  buildAllClientVMs,
  type ClientVM,
} from "@/lib/workspace/derive";
import { useMemberScopeRedirect } from "@/lib/workspace/use-member-scope";
import {
  Card,
  Pill,
  HealthDot,
  EmptyState,
  SectionTitle,
} from "@/lib/workspace/ui";
import { engagementStartOf } from "@/lib/pods-v2/calc";

type Filter = "all" | "at_risk";

/** Sprint start date as a short label (e.g. "12 May"), or null if unset. */
function startLabel(c: ClientVM): string | null {
  const ymd = engagementStartOf(c.client);
  if (!ymd) return null;
  return new Date(`${ymd}T12:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export default function WorkspaceClientsList() {
  const data = useWorkspaceData();
  const today = todayYMD();
  const [filter, setFilter] = useState<Filter>("all");
  const scopedMember = useMemberScopeRedirect(data.pods, data.loading);

  const clientVMs = useMemo(
    () =>
      buildAllClientVMs({
        clients: data.clients,
        projects: data.projects,
        tasks: data.tasks,
        tests: data.tests,
        pods: data.pods,
        todayYMD: today,
      }),
    [data, today],
  );

  const shown = clientVMs.filter((c) =>
    filter === "at_risk" ? c.atRiskCount > 0 || c.band !== "green" : true,
  );
  const retainers = shown.filter((c) => c.kind === "retainer");
  const sprints = shown.filter((c) => c.kind === "sprint");

  if (data.loading || scopedMember) {
    return <div className="h-96 animate-pulse rounded-2xl bg-surface-raised" />;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            Clients
          </h1>
          <p className="mt-1 text-sm text-muted">
            Retainers and one-off sprints, split out, with health at a glance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
            {(
              [
                ["all", "All"],
                ["at_risk", "Needs attention"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  filter === key
                    ? "bg-white text-background"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <Link
            href="/tools/onboarding-inbox"
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
          >
            + New client
          </Link>
        </div>
      </div>
      <p className="-mt-2 text-xs text-subtle">
        New clients come in from the onboarding inbox — approving a submission
        creates the client here with its brief pre-filled.
      </p>

      {shown.length === 0 ? (
        <EmptyState>No clients match this filter.</EmptyState>
      ) : (
        <>
          <section>
            <SectionTitle
              action={
                <span className="text-xs text-subtle">
                  {retainers.length} · 90-day partnerships
                </span>
              }
            >
              Retainers
            </SectionTitle>
            {retainers.length === 0 ? (
              <EmptyState>No retainers.</EmptyState>
            ) : (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {retainers.map((c) => (
                  <ClientCard key={c.client.id} c={c} />
                ))}
              </div>
            )}
          </section>

          <section>
            <SectionTitle
              action={
                <span className="text-xs text-subtle">
                  {sprints.length} · one-off projects
                </span>
              }
            >
              Sprint work
            </SectionTitle>
            {sprints.length === 0 ? (
              <EmptyState>No sprint work.</EmptyState>
            ) : (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {sprints.map((c) => (
                  <ClientCard key={c.client.id} c={c} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function ClientCard({ c }: { c: ClientVM }) {
  return (
    <Link href={`/workspace/clients/${c.client.id}`} className="block">
      <Card
        className={`p-5 transition-shadow hover:shadow-md ${
          c.kind === "retainer" ? "border-border bg-surface-raised/70" : ""
        }`}
      >
        {/* Line 1: name reads first; one status signal on the right */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <HealthDot band={c.band} />
            <span className="truncate font-heading text-base font-semibold text-foreground">
              {c.client.name}
            </span>
          </div>
          {c.atRiskCount > 0 ? (
            <Pill tone="red">{c.atRiskCount} at risk</Pill>
          ) : (
            <Pill tone="green">On track</Pill>
          )}
        </div>

        {/* Line 2: the time signal — prominent Day X/90 for retainers,
            start date for sprints. */}
        {c.kind === "retainer" ? (
          c.day != null ? (
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="font-heading text-xl font-semibold tabular-nums text-foreground">
                Day {c.day}
              </span>
              <span className="text-sm text-subtle">/ 90</span>
            </div>
          ) : (
            <div className="mt-3 text-sm text-border">Not started</div>
          )
        ) : (
          <div className="mt-3 text-sm text-muted">
            {startLabel(c) ? (
              <>
                <span className="text-subtle">Started </span>
                <span className="font-medium">{startLabel(c)}</span>
              </>
            ) : (
              <span className="text-border">Not started</span>
            )}
          </div>
        )}

        {/* Quiet meta: type chip · pod */}
        <div className="mt-2.5 flex items-center gap-2 text-[11px] text-subtle">
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              c.kind === "retainer"
                ? "bg-slate-700 text-white"
                : "bg-border text-muted"
            }`}
          >
            {c.kind === "retainer" ? "Retainer" : "Sprint"}
          </span>
          <span>{c.podName}</span>
        </div>
      </Card>
    </Link>
  );
}
