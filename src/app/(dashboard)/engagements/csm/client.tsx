"use client";

// CSM Dashboard — spec §4.6 (+ §2.7 role, §3.4 Day-75 refresh).
// Real + wired off the live pods-v2 data layer.
//
// Panels per §4.6:
//   • Client Pipeline   — all retainers (Day-75 countdown) + sprints.
//   • Renewal Pipeline  — Day 60-90 engagements, renewal outcome (§1.9/§3.4).
//   • Slip Alerts       — at-risk deliverables (overdue, not client-side) (§1.7).
//   • Client Profile    — drawer: health score + signals, notes, active tests,
//                         risks, onboarding context.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  XMarkIcon,
  UserGroupIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  HeartIcon,
  BeakerIcon,
} from "@heroicons/react/24/outline";
import {
  ensureSeed,
  getClients,
  getProjects,
  getTasks,
  getTests,
  addClientNote,
  updateClientLifecycle,
} from "@/lib/pods-v2/data";
import { bootstrapPodsSync } from "@/lib/pods-v2/sync";
import { seedPodOsV2DemoData } from "@/lib/pods-v2/demo-seed";
import {
  engagementKindOf,
  engagementDay,
  daysToRefresh,
  engagementWindow,
  ENGAGEMENT_WINDOW_LABEL,
  healthScore,
  healthBand,
  type HealthBand,
} from "@/lib/pods-v2/calc";
import {
  RETAINER_VALUE_GBP,
  TEST_STATUS_LABEL,
  type Client,
  type Project,
  type Task,
  type PodTest,
  type RenewalStatus,
} from "@/lib/pods-v2/types";
import { Card, SectionHeader, StatTile, Pill, Meter, EmptyState, fmtDayMonth } from "@/components/pod-os/ui";
import { EngagementLifecycle } from "@/components/pod-os/engagement-lifecycle";

function todayYMD(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const BAND_TONE: Record<HealthBand, Parameters<typeof Pill>[0]["tone"]> = {
  green: "emerald",
  amber: "amber",
  red: "rose",
};
const BAND_METER: Record<HealthBand, "emerald" | "amber" | "rose"> = {
  green: "emerald",
  amber: "amber",
  red: "rose",
};

const RENEWAL_LABEL: Record<RenewalStatus, string> = {
  active: "Active",
  refresh_due: "Refresh due",
  renewed: "Renewed",
  winding_down: "Winding down",
  churned: "Churned",
};
const RENEWAL_TONE: Record<RenewalStatus, Parameters<typeof Pill>[0]["tone"]> = {
  active: "default",
  refresh_due: "amber",
  renewed: "emerald",
  winding_down: "rose",
  churned: "muted",
};

export default function CsmClient() {
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tests, setTests] = useState<PodTest[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [today] = useState(todayYMD);

  const refresh = useCallback(() => {
    setClients(getClients());
    setProjects(getProjects());
    setTasks(getTasks());
    setTests(getTests());
  }, []);

  useEffect(() => {
    ensureSeed();
    refresh();
    bootstrapPodsSync().then((changed) => {
      if (changed) refresh();
    });
  }, [refresh]);

  const clientIdByProject = useMemo(() => {
    const m: Record<string, string> = {};
    for (const p of projects) m[p.id] = p.client_id;
    return m;
  }, [projects]);

  // Slip alerts: overdue, not done, not parked on the client (§1.7 — client
  // lag is the client's clock, not a pod slip).
  const slipsByClient = useMemo(() => {
    const m: Record<string, Task[]> = {};
    for (const t of tasks) {
      if (t.status === "done") continue;
      if (t.waiting_on === "client") continue;
      if (!t.due_date || t.due_date >= today) continue;
      const clientId = clientIdByProject[t.project_id];
      if (!clientId) continue;
      (m[clientId] ??= []).push(t);
    }
    return m;
  }, [tasks, clientIdByProject, today]);

  const view = useMemo(
    () =>
      clients
        .map((c) => {
          const kind = engagementKindOf(c);
          const day = engagementDay(c, today);
          const refreshIn = daysToRefresh(c, today);
          const window = day != null ? engagementWindow(day) : null;
          const score = c.health_signals ? healthScore(c.health_signals) : null;
          const band = score != null ? healthBand(score) : null;
          const slips = slipsByClient[c.id]?.length ?? 0;
          return { client: c, kind, day, refreshIn, window, score, band, slips };
        })
        .sort((a, b) => (a.score ?? 101) - (b.score ?? 101)),
    [clients, today, slipsByClient],
  );

  const retainers = view.filter((v) => v.kind === "retainer");
  const renewals = retainers
    .filter((v) => v.day != null && v.day >= 60 && v.day <= 95)
    .sort((a, b) => (a.refreshIn ?? 99) - (b.refreshIn ?? 99));
  const atRisk = view.filter((v) => v.band === "red" || v.slips > 0);

  const open = view.find((v) => v.client.id === openId) ?? null;
  const isEmpty = clients.length === 0;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-[#1B1B1B]">Client Success</h1>
          <Pill tone="default">CSM · all engagements</Pill>
        </div>
        {isEmpty && (
          <button
            onClick={() => {
              seedPodOsV2DemoData();
              refresh();
            }}
            className="rounded-lg border border-[#1B1B1B] bg-[#1B1B1B] px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-[#2D2D2D]"
          >
            Load demo data
          </button>
        )}
      </div>
      <p className="mb-5 text-sm text-[#7A7A7A]">
        Relationship owner across every engagement — health, renewals (Day-75), and slip recovery
        (§2.7, §4.6).
      </p>

      {isEmpty ? (
        <Card>
          <EmptyState>
            No engagements yet. Clients flow in from onboarding once assigned to a pod — or load a
            representative demo set to see the dashboard working.
          </EmptyState>
        </Card>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile label="Engagements" value={view.length} />
            <StatTile label="Retainers" value={retainers.length} />
            <StatTile
              label="Renewals due"
              value={renewals.filter((r) => r.client.renewal_status !== "renewed").length}
              tone={renewals.length > 0 ? "amber" : "default"}
            />
            <StatTile label="At risk" value={atRisk.length} tone={atRisk.length > 0 ? "rose" : "default"} />
          </div>

          {/* Client Pipeline */}
          <Card className="mb-6">
            <SectionHeader right={<span className="text-[11px] text-[#A0A0A0]">sorted by health</span>}>
              <span className="inline-flex items-center gap-1.5">
                <UserGroupIcon className="size-4" /> Client Pipeline
              </span>
            </SectionHeader>
            <div className="space-y-1.5">
              {view.map(({ client: c, kind, day, refreshIn, score, band, slips }) => (
                <button
                  key={c.id}
                  onClick={() => setOpenId(c.id)}
                  className="flex w-full items-center gap-3 rounded-lg border border-[#F0F0F2] bg-[#FAFAFB] px-3 py-2.5 text-left transition-all hover:border-[#C5C5C5] hover:bg-white"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[13px] font-semibold text-[#1B1B1B]">{c.name}</span>
                      {slips > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-rose-600">
                          <ExclamationTriangleIcon className="size-3.5" /> {slips}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-[#7A7A7A]">
                      {kind === "retainer"
                        ? `Retainer · £${(RETAINER_VALUE_GBP[c.retainer_tier] || 0) / 1000}k/mo`
                        : "Sprint"}
                      {kind === "retainer" && day != null && refreshIn != null
                        ? ` · Day ${day}/90 · refresh ${refreshIn <= 0 ? "due" : `in ${refreshIn}d`}`
                        : ""}
                    </div>
                  </div>
                  {kind === "retainer" && c.renewal_status && (
                    <Pill tone={RENEWAL_TONE[c.renewal_status]}>{RENEWAL_LABEL[c.renewal_status]}</Pill>
                  )}
                  <div className="hidden w-24 shrink-0 sm:block">
                    {score == null ? (
                      <span className="text-[11px] text-[#A0A0A0]">no signals</span>
                    ) : (
                      <div>
                        <div className="flex justify-between text-[10px] text-[#7A7A7A]">
                          <span>health</span>
                          <span className="font-semibold tabular-nums text-[#1B1B1B]">{score}</span>
                        </div>
                        <Meter className="mt-0.5" pct={score} tone={band ? BAND_METER[band] : "ink"} />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Renewal Pipeline + Slip Alerts */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <SectionHeader right={<span className="text-[11px] text-[#A0A0A0]">Day 60-90</span>}>
                <span className="inline-flex items-center gap-1.5">
                  <ArrowPathIcon className="size-4" /> Renewal Pipeline
                </span>
              </SectionHeader>
              {renewals.length === 0 ? (
                <EmptyState>No engagements in the Day 60-90 renewal window.</EmptyState>
              ) : (
                <div className="space-y-1.5">
                  {renewals.map(({ client: c, day, refreshIn }) => (
                    <div key={c.id} className="rounded-lg border border-[#F0F0F2] bg-[#FAFAFB] p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[13px] font-medium text-[#1B1B1B]">{c.name}</span>
                        {c.renewal_status && (
                          <Pill tone={RENEWAL_TONE[c.renewal_status]}>{RENEWAL_LABEL[c.renewal_status]}</Pill>
                        )}
                      </div>
                      <div className="mt-1 text-[12px] text-[#1B1B1B]">
                        {refreshIn != null && refreshIn <= 0
                          ? "Day-75 refresh conversation due now (§3.4)"
                          : `Day-75 refresh in ${refreshIn}d — strategist drafts the refresh doc`}
                      </div>
                      {day != null && (
                        <Meter className="mt-1.5" pct={(day / 90) * 100} tone={refreshIn != null && refreshIn <= 10 ? "rose" : "amber"} />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <SectionHeader>
                <span className="inline-flex items-center gap-1.5">
                  <ExclamationTriangleIcon className="size-4" /> Slip Alerts
                </span>
              </SectionHeader>
              {Object.keys(slipsByClient).length === 0 ? (
                <EmptyState>No deliverables slipping. Client-side waits aren&apos;t counted (§1.7).</EmptyState>
              ) : (
                <div className="space-y-1.5">
                  {view
                    .filter((v) => v.slips > 0)
                    .map(({ client: c, slips }) => (
                      <div key={c.id} className="rounded-lg border border-rose-100 bg-rose-50/40 p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-[13px] font-medium text-[#1B1B1B]">{c.name}</span>
                          <span className="text-[11px] font-medium text-rose-700">
                            {slips} overdue
                          </span>
                        </div>
                        <div className="mt-1 space-y-0.5">
                          {(slipsByClient[c.id] ?? []).slice(0, 3).map((t) => (
                            <div key={t.id} className="truncate text-[11px] text-[#7A7A7A]">
                              · {t.title} (due {fmtDayMonth(t.due_date)})
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      {open && (
        <ClientDrawer
          client={open.client}
          today={today}
          score={open.score}
          band={open.band}
          tests={tests.filter((t) => t.client_id === open.client.id)}
          slips={slipsByClient[open.client.id] ?? []}
          onClose={() => setOpenId(null)}
          onNoteAdded={refresh}
        />
      )}
    </div>
  );
}

function ClientDrawer({
  client,
  today,
  score,
  band,
  tests,
  slips,
  onClose,
  onNoteAdded,
}: {
  client: Client;
  today: string;
  score: number | null;
  band: HealthBand | null;
  tests: PodTest[];
  slips: Task[];
  onClose: () => void;
  onNoteAdded: () => void;
}) {
  const [note, setNote] = useState("");
  const signals = client.health_signals;
  const kind = engagementKindOf(client);

  const submitNote = () => {
    const trimmed = note.trim();
    if (!trimmed) return;
    addClientNote(client.id, { content: trimmed, author: "CSM" });
    setNote("");
    onNoteAdded();
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative h-full w-full max-w-md overflow-y-auto border-l border-[#E5E5EA] bg-white p-6 shadow-[var(--shadow-elevated)]">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-[#A0A0A0]">
              Client profile
            </div>
            <h3 className="mt-1 text-lg font-semibold text-[#1B1B1B]">{client.name}</h3>
          </div>
          <button onClick={onClose} className="text-[#A0A0A0] hover:text-[#1B1B1B]">
            <XMarkIcon className="size-5" />
          </button>
        </div>

        {/* health */}
        <div className="mt-4 rounded-lg border border-[#E5E5EA] bg-[#F7F8FA] p-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#7A7A7A]">
              <HeartIcon className="size-4" /> Relationship health
            </span>
            {score != null && band ? (
              <Pill tone={BAND_TONE[band]}>{score} · {band}</Pill>
            ) : (
              <span className="text-[11px] text-[#A0A0A0]">no signals</span>
            )}
          </div>
          {score != null && band && <Meter className="mt-2" pct={score} tone={BAND_METER[band]} />}
          {signals && (
            <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
              <Sig label="Client delay" value={`${signals.client_delay_days}d`} />
              <Sig label="Approval lag" value={`${signals.approval_lag_days}d`} />
              <Sig label="Engagement gap" value={`${signals.engagement_gap_days}d`} />
              <Sig label="Open blockers" value={`${signals.open_blockers}`} />
            </div>
          )}
        </div>

        {/* engagement lifecycle visual + editor */}
        <div className="mt-4 rounded-lg border border-[#E5E5EA] bg-white p-3">
          <EngagementLifecycle client={client} today={today} />
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#F0F0F2] pt-3">
            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0]">
                Engagement
              </span>
              <select
                value={kind}
                onChange={(e) => {
                  updateClientLifecycle(client.id, {
                    engagement_kind: e.target.value as Client["engagement_kind"],
                  });
                  onNoteAdded();
                }}
                className="w-full rounded-md border border-[#E5E5EA] bg-white px-2 py-1.5 text-[12px] focus:border-[#1B1B1B] focus:outline-none"
              >
                <option value="retainer">Retainer</option>
                <option value="sprint">Sprint</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0]">
                Renewal
              </span>
              <select
                value={client.renewal_status ?? "active"}
                onChange={(e) => {
                  updateClientLifecycle(client.id, {
                    renewal_status: e.target.value as RenewalStatus,
                  });
                  onNoteAdded();
                }}
                className="w-full rounded-md border border-[#E5E5EA] bg-white px-2 py-1.5 text-[12px] focus:border-[#1B1B1B] focus:outline-none"
              >
                {(Object.keys(RENEWAL_LABEL) as RenewalStatus[]).map((r) => (
                  <option key={r} value={r}>
                    {RENEWAL_LABEL[r]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {client.strategy_thesis && (
          <Section label="Strategy thesis">
            <p className="rounded-lg border border-[#E5E5EA] bg-[#F7F8FA] p-3 text-[13px] leading-relaxed text-[#3A3A3A]">
              {client.strategy_thesis}
            </p>
          </Section>
        )}

        {client.risk_flags && client.risk_flags.length > 0 && (
          <Section label="Risks">
            <div className="space-y-1">
              {client.risk_flags.map((r, i) => (
                <div key={i} className="rounded-lg border border-rose-100 bg-rose-50/40 px-3 py-2 text-[12px] text-rose-800">
                  {r}
                </div>
              ))}
            </div>
          </Section>
        )}

        {slips.length > 0 && (
          <Section label="Slipping deliverables">
            <div className="space-y-1">
              {slips.map((t) => (
                <div key={t.id} className="text-[12px] text-[#7A7A7A]">
                  · {t.title} (due {fmtDayMonth(t.due_date)})
                </div>
              ))}
            </div>
          </Section>
        )}

        <Section label={`Active tests (${tests.length})`}>
          {tests.length === 0 ? (
            <p className="text-[12px] text-[#A0A0A0]">No tests on this engagement.</p>
          ) : (
            <div className="space-y-1">
              {tests.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2 rounded-lg border border-[#F0F0F2] bg-[#FAFAFB] px-3 py-2">
                  <span className="inline-flex min-w-0 items-center gap-1.5 text-[12px] text-[#1B1B1B]">
                    <BeakerIcon className="size-3.5 shrink-0 text-[#7A7A7A]" />
                    <span className="truncate">{t.name}</span>
                  </span>
                  <span className="shrink-0 text-[11px] text-[#7A7A7A]">{TEST_STATUS_LABEL[t.status]}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {client.onboarding_notes && client.onboarding_notes.length > 0 && (
          <Section label="Onboarding context">
            <div className="space-y-1">
              {client.onboarding_notes.map((n, i) => (
                <div key={i} className="rounded-lg border border-[#F0F0F2] bg-[#FAFAFB] px-3 py-2 text-[12px] text-[#3A3A3A]">
                  {n}
                </div>
              ))}
            </div>
          </Section>
        )}

        <Section label="Notes">
          <div className="flex gap-2">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitNote()}
              placeholder="Add a CSM note…"
              className="flex-1 rounded-lg border border-[#E5E5EA] bg-white px-3 py-2 text-[13px] shadow-[var(--shadow-soft)] focus:border-[#1B1B1B] focus:outline-none focus:ring-1 focus:ring-[#1B1B1B]/10"
            />
            <button
              onClick={submitNote}
              className="rounded-lg border border-[#1B1B1B] bg-[#1B1B1B] px-3 py-2 text-[13px] font-medium text-white hover:bg-[#2D2D2D]"
            >
              Add
            </button>
          </div>
          <div className="mt-2 space-y-1">
            {(client.notes ?? []).slice(0, 5).map((n) => (
              <div key={n.id} className="rounded-lg border border-[#F0F0F2] bg-[#FAFAFB] px-3 py-2 text-[12px] text-[#3A3A3A]">
                <div>{n.content}</div>
                <div className="mt-0.5 text-[10px] text-[#A0A0A0]">
                  {n.author ?? "team"} · {fmtDayMonth(n.created_at.slice(0, 10))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <div className="mt-5">
          <Link
            href={`/engagements/${client.id}`}
            className="text-[13px] font-medium text-[#1B1B1B] underline underline-offset-2 hover:text-[#2D2D2D]"
          >
            Open full engagement →
          </Link>
        </div>
      </div>
    </div>
  );
}

function Sig({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#F0F0F2] bg-white px-2.5 py-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0]">{label}</div>
      <div className="text-[13px] tabular-nums text-[#1B1B1B]">{value}</div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <div className="mb-2 text-sm font-semibold text-[#1B1B1B]">{label}</div>
      {children}
    </div>
  );
}
