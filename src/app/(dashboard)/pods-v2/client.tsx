"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRightIcon,
  PlusIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import {
  addTask,
  createClient,
  createProject,
  deleteTask,
  ensureSeed,
  getClients,
  getCroLeads,
  getPods,
  getProjects,
  getTasks,
  moveClientToPod,
  resetAndReseed,
  scanAndNotifyStaleTickets,
  seedConversionEngineCycle,
  updateCroLeadAvatar,
  updateTaskStatus,
} from "@/lib/pods-v2/data";
import {
  Client,
  PAGE_DEFAULT_WEIGHT,
  PAGE_LABEL,
  PageType,
  Pod,
  PodMember,
  Project,
  Task,
} from "@/lib/pods-v2/types";
import { capacityUsed, fourWeekWindow, isMidWeekKickoff } from "@/lib/pods-v2/calc";
import { formatDayMonth, todayYMD } from "@/lib/dates";
import { formatTimeInPhase } from "@/lib/task-board/phases";
import { CapacityMeter, MemberAvatar } from "./components";
import { WeeksView } from "./WeeksView";
import { onboardingStore, type OnboardingSubmission } from "@/lib/onboarding";
import { getPortalById } from "@/lib/portal/data";
import type { PortalData, ScopeItem } from "@/lib/portal/types";
import { useRole } from "@/components/auth-gate";

type View = "overview" | "pipeline";

export default function PodsIndexClient() {
  const role = useRole();
  /* Team flavour is decided by URL: when mounted under /team/pods/* the
   * client is in the team route group, so admin-only chrome stays
   * hidden + internal links stay inside the team layout. The legacy
   * ?view=team query param + sessionStorage flag are kept as a
   * deep-link / Team-Hub fallback so old bookmarks still work. */
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inTeamRoute = pathname?.startsWith("/team/pods") ?? false;
  const linkBase = inTeamRoute ? "/team/pods" : "/pods-v2";
  const [paramTeamView, setParamTeamView] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const fromParam = searchParams.get("view") === "team";
    if (fromParam) {
      sessionStorage.setItem("pods-v2-team-view", "1");
      setParamTeamView(true);
    } else if (!inTeamRoute) {
      sessionStorage.removeItem("pods-v2-team-view");
      setParamTeamView(false);
    } else {
      setParamTeamView(sessionStorage.getItem("pods-v2-team-view") === "1");
    }
  }, [searchParams, inTeamRoute]);
  const forceTeamView = inTeamRoute || paramTeamView;
  const isAdmin = role === "admin" && !forceTeamView;
  const [pods, setPods] = useState<Pod[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [croLeads, setCroLeads] = useState<PodMember[]>([]);
  const [onboardings, setOnboardings] = useState<OnboardingSubmission[]>([]);
  const [view, setView] = useState<View>("overview");
  const [assigning, setAssigning] = useState<OnboardingSubmission | null>(null);

  useEffect(() => {
    ensureSeed();
    setPods(getPods());
    setAllProjects(getProjects());
    setAllClients(getClients());
    setAllTasks(getTasks());
    setCroLeads(getCroLeads());
    onboardingStore.getAll().then(setOnboardings).catch(() => {});
    /* Pull all pods-v2 data from Supabase and overlay onto local
     * cache. Cloud is source of truth on hydrate so multi-device
     * shows the same data. After bootstrap, refresh React state so
     * the page reflects the cloud truth. (Avatar URLs ride along on
     * Pod.members[] so the older hydrateTeamAvatarsFromCloud is now
     * redundant; bootstrapPodsSync covers it.) */
    import("@/lib/pods-v2/sync").then(({ bootstrapPodsSync }) => {
      bootstrapPodsSync().then((changed) => {
        if (changed) {
          setPods(getPods());
          setAllProjects(getProjects());
          setAllClients(getClients());
          setAllTasks(getTasks());
          setCroLeads(getCroLeads());
        }
      });
    });
    /* Scan for tickets that crossed 48h since the last visit and ping
     * Slack once per ticket. Idempotent, already-pinged tickets are
     * skipped via stale_pinged_at. Only runs in admin mode so the
     * team-view doesn't trigger unauthorised scans. */
    if (role === "admin") {
      scanAndNotifyStaleTickets();
      // Refresh tasks once after scan so any pinged_at writes surface.
      setAllTasks(getTasks());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function refreshAll() {
    setPods(getPods());
    setAllProjects(getProjects());
    setAllClients(getClients());
    setAllTasks(getTasks());
    setCroLeads(getCroLeads());
  }

  const today = todayYMD();
  const projectsByPod = useMemo(() => {
    const map: Record<string, Project[]> = {};
    for (const p of allProjects) {
      (map[p.pod_id] ??= []).push(p);
    }
    return map;
  }, [allProjects]);
  const clientById = useMemo(
    () => new Map(allClients.map((c) => [c.id, c] as const)),
    [allClients],
  );
  const podById = useMemo(
    () => new Map(pods.map((p) => [p.id, p] as const)),
    [pods],
  );
  const memberById = useMemo(() => {
    const map = new Map<string, { member: PodMember; pod: Pod }>();
    for (const pod of pods) {
      for (const m of pod.members) map.set(m.id, { member: m, pod });
    }
    return map;
  }, [pods]);
  const projectById = useMemo(
    () => new Map(allProjects.map((p) => [p.id, p] as const)),
    [allProjects],
  );

  const visibleProjects = useMemo(
    () => allProjects.filter((p) => p.status !== "shipped"),
    [allProjects],
  );

  /* Purgatory: onboarding forms that have been processed (PM checked the
   * intake box and either spawned an engagement or the legacy portal)
   * AND haven't been assigned tasks under a pod yet. Two paths in:
   *   - new flow: status=approved, onboarding_submission_id linked to a
   *     Client row that exists in pods_v2_clients
   *   - legacy flow: assigned_portal_id set on the submission
   *
   * Either way, the row stays in purgatory until tasks exist on the
   * matched Client (pod has picked it up), OR the Client gets parked
   * (pod_id cleared) which sends it back here for re-assignment. */
  const purgatoryOnboardings = useMemo(() => {
    if (!onboardings.length) return [];
    const tasksByClientId = new Map<string, number>();
    for (const t of allTasks) {
      const project = allProjects.find((p) => p.id === t.project_id);
      if (!project) continue;
      tasksByClientId.set(project.client_id, (tasksByClientId.get(project.client_id) || 0) + 1);
    }
    const clientByName = new Map(
      allClients.map((c) => [c.name.toLowerCase().trim(), c] as const),
    );
    const clientBySubmissionId = new Map(
      allClients
        .filter((c) => !!c.onboarding_submission_id)
        .map((c) => [c.onboarding_submission_id as string, c] as const),
    );
    return onboardings
      .filter((o) => {
        if (o.deleted_at) return false;
        const processed = !!o.assigned_portal_id || o.status === "approved" || o.status === "in-progress";
        if (!processed) return false;
        const matchedClient =
          clientBySubmissionId.get(o.id) ??
          (o.company_name ? clientByName.get(o.company_name.toLowerCase().trim()) : undefined);
        // Parked client (pod_id empty) → always in purgatory
        if (matchedClient && !matchedClient.pod_id) return true;
        const taskCount = matchedClient ? tasksByClientId.get(matchedClient.id) || 0 : 0;
        return taskCount === 0;
      })
      .sort((a, b) => (a.assigned_at || a.updated_at).localeCompare(b.assigned_at || b.updated_at));
  }, [onboardings, allClients, allProjects, allTasks]);

  /* Resolve onboarding submission → engagement (pods_v2_clients) id when
   * one exists, so purgatory rows can deep-link to /engagements/[id]
   * instead of the legacy portal. */
  const clientBySubmissionId = useMemo(() => {
    return new Map(
      allClients
        .filter((c) => !!c.onboarding_submission_id)
        .map((c) => [c.onboarding_submission_id as string, c] as const),
    );
  }, [allClients]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 md:px-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#7A7A7A]">
            Operating system
          </p>
          <h1 className="mt-1 text-3xl font-medium tracking-tight">Pod Overview</h1>
          <p className="mt-1 max-w-xl text-sm text-[#7A7A7A]">
            Three pods. One cadence. Mondays kick off, Thursdays ship.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`${linkBase}/me`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E5EA] bg-white px-3 py-2 text-xs font-medium text-[#1B1B1B] shadow-[var(--shadow-soft)] transition-colors hover:bg-[#F3F3F5]"
            title="Your tasks today, focused"
          >
            Today
          </Link>
          <Link
            href={`${linkBase}/standup`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E5EA] bg-white px-3 py-2 text-xs font-medium text-[#1B1B1B] shadow-[var(--shadow-soft)] transition-colors hover:bg-[#F3F3F5]"
            title="What changed in the last 24h"
          >
            Standup
          </Link>
          {isAdmin && (
            <>
              <Link
                href="/pods-v2/new-project"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#1B1B1B] bg-[#1B1B1B] px-3 py-2 text-xs font-medium text-white shadow-[var(--shadow-soft)] transition-colors hover:bg-[#2D2D2D]"
              >
                <PlusIcon className="size-3.5" />
                New project
              </Link>
              <Link
                href="/pods-v2/admin"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E5EA] bg-white px-3 py-2 text-xs font-medium text-[#1B1B1B] shadow-[var(--shadow-soft)] transition-colors hover:bg-[#F3F3F5]"
              >
                <ShieldCheckIcon className="size-3.5" />
                Admin view
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Top-level toggle: Overview vs Pipeline */}
      <div className="mt-6 inline-flex rounded-lg border border-[#E5E5EA] bg-white p-0.5 text-xs">
        <button
          onClick={() => setView("overview")}
          className={`rounded-md px-3 py-1.5 transition-colors ${
            view === "overview"
              ? "bg-[#1B1B1B] text-white"
              : "text-[#7A7A7A] hover:text-[#1B1B1B]"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setView("pipeline")}
          className={`rounded-md px-3 py-1.5 transition-colors ${
            view === "pipeline"
              ? "bg-[#1B1B1B] text-white"
              : "text-[#7A7A7A] hover:text-[#1B1B1B]"
          }`}
        >
          Pipeline
        </button>
      </div>

      {view === "overview" ? (
        <Overview
          pods={pods}
          projectsByPod={projectsByPod}
          allTasks={allTasks}
          croLeads={croLeads}
          purgatoryOnboardings={purgatoryOnboardings}
          clientBySubmissionId={clientBySubmissionId}
          memberById={memberById}
          projectById={projectById}
          clientById={clientById}
          today={today}
          onAssign={(o) => setAssigning(o)}
          onMutate={refreshAll}
          isAdmin={isAdmin}
          linkBase={linkBase}
        />
      ) : (
        <div className="mt-6">
          <WeeksView
            projects={visibleProjects}
            podById={podById}
            clientById={clientById}
            today={today}
          />
        </div>
      )}

      {isAdmin && (
        <div className="mt-12 text-right">
          <button
            onClick={() => {
              if (
                confirm(
                  "Wipe all clients, projects and tasks? Pods + team members are kept. This cannot be undone.",
                )
              ) {
                resetAndReseed();
                window.location.reload();
              }
            }}
            className="text-[11px] uppercase tracking-wider text-[#A0A0A0] hover:text-rose-700"
          >
            Wipe all data
          </button>
        </div>
      )}

      {assigning && (
        <AssignToPodModal
          onboarding={assigning}
          pods={pods}
          allProjects={allProjects}
          allTasks={allTasks}
          existingClients={allClients}
          today={todayYMD()}
          onCancel={() => setAssigning(null)}
          onComplete={() => {
            setAssigning(null);
            // Refresh local state from store
            setAllProjects(getProjects());
            setAllClients(getClients());
            setAllTasks(getTasks());
          }}
        />
      )}
    </div>
  );
}

// ─── Overview ──────────────────────────────────────────────────────

function Overview({
  pods,
  projectsByPod,
  allTasks,
  croLeads,
  purgatoryOnboardings,
  clientBySubmissionId,
  memberById,
  projectById,
  clientById,
  today,
  onAssign,
  onMutate: refreshAll,
  isAdmin,
  linkBase,
}: {
  pods: Pod[];
  projectsByPod: Record<string, Project[]>;
  allTasks: Task[];
  croLeads: PodMember[];
  purgatoryOnboardings: OnboardingSubmission[];
  clientBySubmissionId: Map<string, Client>;
  memberById: Map<string, { member: PodMember; pod: Pod }>;
  projectById: Map<string, Project>;
  clientById: Map<string, Client>;
  today: string;
  onAssign: (o: OnboardingSubmission) => void;
  onMutate: () => void;
  isAdmin: boolean;
  linkBase: string;
}) {
  return (
    <>
      {/* HEALTH ROW, green/amber/red signal per pod, derived from
       * existing data (capacity utilisation, slip count this quarter,
       * blocker resolution time, OOO coverage). One line, three cells.
       * Helps Dylan/Alister scan agency health in 2 seconds before
       * diving into pod cards. */}
      <PodHealthRow pods={pods} projectsByPod={projectsByPod} allTasks={allTasks} today={today} />

      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {pods.map((pod) => {
          const projects = projectsByPod[pod.id] ?? [];
          /* Two windows so the meter shows current vs next-month load.
           * `thisMonth` = next 4 weeks from today's Monday; `nextMonth`
           * = the 4 weeks after that. Capacity is design-discipline
           * points (paired tasks share one points value) whose due_date
           * lands in each window. M2/M3 cycle tasks now carry half-
           * points so they show up in the projection. */
          const thisMonth = fourWeekWindow(today);
          const nextMonthStart = (() => {
            const d = new Date(`${thisMonth.end}T12:00:00`);
            d.setDate(d.getDate() + 1);
            return d.toISOString().slice(0, 10);
          })();
          const nextMonth = fourWeekWindow(nextMonthStart);
          const used = capacityUsed(projects, allTasks, thisMonth.start, thisMonth.end);
          const nextMonthUsed = capacityUsed(projects, allTasks, nextMonth.start, nextMonth.end);
          const midWeek = projects.filter(isMidWeekKickoff).length;
          const rushCount = projects.filter(
            (p) => p.is_rush && p.status !== "shipped" && p.status !== "slipped",
          ).length;
          const inFlight = projects.filter(
            (p) => p.status === "in_progress" || p.status === "in_review",
          ).length;
          const activeBlockers = (pod.blockers || []).filter((b) => !b.resolved_at).length;
          /* Forward-looking signal: count Conversion Engine retainers
           * (projects with at least one cycle-tagged task) that aren't
           * already shipped/slipped, represents queued 90-day work
           * beyond this month's capacity bar. */
          const cycleProjectIds = new Set(
            allTasks.filter((t) => t.cycle).map((t) => t.project_id),
          );
          const cycleRetainers = projects.filter(
            (p) =>
              cycleProjectIds.has(p.id) &&
              p.status !== "shipped" &&
              p.status !== "slipped",
          ).length;
          return (
            <Link
              key={pod.id}
              href={`${linkBase}/${pod.id}`}
              className="group rounded-2xl border border-[#E5E5EA] bg-white p-5 shadow-[var(--shadow-soft)] transition-all hover:border-[#C5C5C5] hover:shadow-[var(--shadow-card)]"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-medium leading-none text-[#1B1B1B]">
                    {pod.name}
                  </h2>
                  <p className="mt-1 text-xs text-[#7A7A7A]">{pod.tagline}</p>
                </div>
                <ArrowRightIcon className="size-4 text-[#A0A0A0] transition-transform group-hover:translate-x-0.5" />
              </div>

              <div className="mt-4 flex -space-x-2">
                {pod.members.map((m) => (
                  <MemberAvatar key={m.id} member={m} />
                ))}
              </div>

              <div className="mt-4">
                <CapacityMeter
                  used={used}
                  total={pod.capacity_points_per_month}
                  cycleRetainers={cycleRetainers}
                  nextMonthUsed={nextMonthUsed}
                />
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
                <PodStat label="In flight" value={inFlight} />
                <PodStat
                  label="Rush"
                  value={rushCount}
                  alert={rushCount > 0}
                />
                <PodStat
                  label="Mid-week"
                  value={midWeek}
                  alert={midWeek > 0}
                />
                <PodStat
                  label="Blockers"
                  value={activeBlockers}
                  alert={activeBlockers > 0}
                />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Friday weekly digest, admin-only, only shows on Fridays. One-
       * click summary of the week per pod, with a button that posts the
       * formatted message to a Slack channel of choice. */}
      {isAdmin && <FridayDigestPanel pods={pods} projects={Object.values(projectsByPod).flat()} tasks={allTasks} clientById={clientById} today={today} />}

      {/* CRO Pipeline, Dan's strategy work across all pods, separate
       * from per-pod swim lanes since he's a shared resource. */}
      <CroPipeline
        croLeads={croLeads}
        tasks={allTasks}
        projectById={projectById}
        clientById={clientById}
        pods={pods}
        today={today}
        onMutate={refreshAll}
        isAdmin={isAdmin}
      />

      {/* Purgatory, processed onboardings without assigned tasks. Admin
       * only, assign-to-pod is a PM action and onboarding form data
       * isn't relevant to delivery team members. */}
      {isAdmin && (
      <div className="mt-10">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#7A7A7A]">
              Onboarding in purgatory
            </h2>
            <p className="mt-0.5 text-xs text-[#7A7A7A]">
              Onboarding forms that have been processed but no tasks are assigned yet. Action: spin up a project + assign work.
            </p>
          </div>
          <span className="text-[11px] tabular-nums text-[#A0A0A0]">
            {purgatoryOnboardings.length} {purgatoryOnboardings.length === 1 ? "form" : "forms"}
          </span>
        </div>
        <div className="mt-3 overflow-hidden rounded-xl border border-[#E5E5EA] bg-white shadow-[var(--shadow-soft)]">
          <table className="w-full text-sm">
            <thead className="border-b border-[#E5E5EA] bg-[#F7F8FA] text-[10px] font-semibold uppercase tracking-wider text-[#7A7A7A]">
              <tr>
                <th className="px-3 py-2 text-left">Client</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">View</th>
                <th className="px-3 py-2 text-right">Processed</th>
                <th className="px-3 py-2 text-right">Open</th>
                <th className="px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDEDEF]">
              {purgatoryOnboardings.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-6 text-center text-[12px] text-[#A0A0A0]"
                  >
                    No onboardings in purgatory. Everything processed has work assigned.
                  </td>
                </tr>
              )}
              {purgatoryOnboardings.slice(0, 12).map((o) => {
                const processedAt = o.assigned_at || o.updated_at;
                const ageDays = Math.max(
                  0,
                  daysBetween(processedAt.slice(0, 10), today),
                );
                return (
                  <tr key={o.id} className="hover:bg-[#F7F8FA]">
                    <td className="px-3 py-2">
                      <div className="text-[13px] font-medium">{o.company_name || "Untitled"}</div>
                      {o.website_url && (
                        <div className="truncate text-[10px] text-[#A0A0A0]">{o.website_url}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-[12px] text-[#7A7A7A] capitalize">
                      {o.status.replace("-", " ")}
                    </td>
                    <td className="px-3 py-2 text-[12px]">
                      {(() => {
                        const engagementClient = clientBySubmissionId.get(o.id);
                        if (engagementClient) {
                          return (
                            <Link
                              href={`/engagements/${engagementClient.id}`}
                              className="text-[#1B1B1B] hover:underline"
                            >
                              Open engagement →
                            </Link>
                          );
                        }
                        if (o.assigned_portal_id) {
                          return (
                            <Link
                              href={`/tools/client-portal/${o.assigned_portal_id}`}
                              className="text-[#1B1B1B] hover:underline"
                              title="Legacy portal"
                            >
                              View portal →
                            </Link>
                          );
                        }
                        return <span className="text-[#A0A0A0]">-</span>;
                      })()}
                    </td>
                    <td className="px-3 py-2 text-right text-[12px] text-[#7A7A7A] tabular-nums">
                      {formatDayMonth(processedAt.slice(0, 10))}
                    </td>
                    <td
                      className={`px-3 py-2 text-right tabular-nums text-[12px] font-medium ${
                        ageDays >= 7 ? "text-rose-700" : ageDays >= 3 ? "text-amber-700" : "text-emerald-700"
                      }`}
                    >
                      {ageDays === 0 ? "today" : `${ageDays}d`}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => onAssign(o)}
                        className="inline-flex items-center gap-1 rounded-md bg-[#1B1B1B] px-2 py-1 text-[10px] font-medium text-white hover:bg-[#2D2D2D]"
                      >
                        Assign to pod
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {purgatoryOnboardings.length > 0 && (
            <div className="border-t border-[#EDEDEF] bg-[#F7F8FA] px-3 py-2 text-right">
              <Link href="/tools/onboarding-inbox" className="text-[11px] font-medium text-[#1B1B1B] hover:underline">
                Open onboarding inbox →
              </Link>
            </div>
          )}
        </div>
      </div>
      )}
    </>
  );
}

// ─── Deliverable parsers ──────────────────────────────────────────

/* Free-text → canonical PageType. Matches by substring so "PDP (Product
 * Page)" and "Pdp" both resolve to "pdp". Returns null if nothing
 * matches. Order matters, more specific first. */
function tokenToPageType(raw: string): PageType | null {
  const s = raw.toLowerCase();
  const rules: Array<[RegExp, PageType]> = [
    [/pdp|product page|product detail/, "pdp"],
    [/home\s*page|homepage/, "homepage"],
    [/listicle/, "listicle"],
    [/advertorial|hero lander|landing page/, "advertorial"],
    [/collection|category/, "collection"],
    [/cart|checkout/, "cart"],
    [/quiz|finder/, "quiz"],
    [/about/, "about"],
    [/faq/, "faq"],
    [/policy|policies|terms|privacy/, "policies"],
    [/nav|menu/, "navigation"],
    [/account|login/, "account"],
    [/contact/, "contact"],
  ];
  for (const [re, pt] of rules) {
    if (re.test(s)) return pt;
  }
  return null;
}

function parsePageTypeString(input: string): Array<{ id: string; type: PageType; label: string }> {
  return input
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((token, i) => {
      const matched = tokenToPageType(token);
      if (!matched) return null;
      return { id: `pt-${i}`, type: matched, label: "" };
    })
    .filter(Boolean) as Array<{ id: string; type: PageType; label: string }>;
}

/* Pull the deliverables list off a Portal's scope array (the actual
 * source of truth Alister sees on the project page). ScopeItems are
 * either plain strings or { description, type } objects, we map the
 * `type` string via tokenToPageType and use `description` as the
 * variant label. */
function scopeItemsToDeliverables(portal: PortalData): Array<{ id: string; type: PageType; label: string }> {
  const out: Array<{ id: string; type: PageType; label: string }> = [];
  const flat: ScopeItem[] = portal.scope || [];
  flat.forEach((item, i) => {
    if (typeof item === "string") {
      // Try to parse the string itself for a type hint
      const matched = tokenToPageType(item);
      if (matched) out.push({ id: `scope-${i}`, type: matched, label: item });
      return;
    }
    const matched = tokenToPageType(item.type || "");
    if (matched) {
      out.push({ id: `scope-${i}`, type: matched, label: item.description || "" });
    }
  });
  // Also pull from each project on the portal
  (portal.projects || []).forEach((proj, pi) => {
    (proj.scope || []).forEach((item, i) => {
      if (typeof item === "string") {
        const matched = tokenToPageType(item);
        if (matched) out.push({ id: `proj-${pi}-${i}`, type: matched, label: item });
        return;
      }
      const matched = tokenToPageType(item.type || "");
      if (matched) {
        out.push({ id: `proj-${pi}-${i}`, type: matched, label: item.description || "" });
      }
    });
  });
  return out;
}

// ─── Assign-to-Pod modal ──────────────────────────────────────────

function AssignToPodModal({
  onboarding,
  pods,
  allProjects,
  allTasks,
  existingClients,
  today,
  onCancel,
  onComplete,
}: {
  onboarding: OnboardingSubmission;
  pods: Pod[];
  allProjects: Project[];
  allTasks: Task[];
  existingClients: Client[];
  today: string;
  onCancel: () => void;
  onComplete: () => void;
}) {
  const eligiblePods = pods;
  /* Compute this-month + next-month load per pod once, render in the
   * dropdown options so the PM can see capacity before picking. Default
   * selects the lightest-loaded pod (lowest `used` value) so the modal
   * doesn't always default to Pod 1 like it used to. */
  const podLoads = useMemo(() => {
    const tw = fourWeekWindow(today);
    const dayAfter = (() => {
      const d = new Date(`${tw.end}T12:00:00`);
      d.setDate(d.getDate() + 1);
      return d.toISOString().slice(0, 10);
    })();
    const nw = fourWeekWindow(dayAfter);
    const map = new Map<string, { used: number; next: number }>();
    for (const p of pods) {
      const podProjects = allProjects.filter((pr) => pr.pod_id === p.id);
      map.set(p.id, {
        used: capacityUsed(podProjects, allTasks, tw.start, tw.end),
        next: capacityUsed(podProjects, allTasks, nw.start, nw.end),
      });
    }
    return map;
  }, [pods, allProjects, allTasks, today]);

  const lightestPodId = useMemo(() => {
    let best = eligiblePods[0]?.id ?? "";
    let bestUsed = Infinity;
    for (const p of eligiblePods) {
      const u = podLoads.get(p.id)?.used ?? 0;
      if (u < bestUsed) {
        bestUsed = u;
        best = p.id;
      }
    }
    return best;
  }, [eligiblePods, podLoads]);

  const [podId, setPodId] = useState<string>(lightestPodId);
  const [signoffDate, setSignoffDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [items, setItems] = useState<Array<{ id: string; type: PageType; label: string }>>([]);
  const [source, setSource] = useState<"portal" | "deliverables" | "page_type" | "blank">("blank");
  const [submitting, setSubmitting] = useState(false);
  /* Conversion Engine flag, when ticked, also routes the engagement
   * through Dan's CRO Pipeline (W1 strategy + wireframes per
   * deliverable, due Friday W1) before pod design starts. Persists
   * retainer_tier="8k" on the auto-created Client too. */
  const [conversionEngine, setConversionEngine] = useState(false);
  /* Rush flag, bypasses the Monday-snap (kickoff = signoff_date) and
   * halves the bucket duration. Per the team launch deck, rush is the
   * exception so it's the second checkbox not a default; pod cards
   * track count so heavy rush use shows up in the operating model. */
  const [rush, setRush] = useState(false);

  /* Source-of-truth chain for deliverables, in order:
   *   1. Linked portal's `scope` array (PM's working source while building scope)
   *   2. Onboarding `deliverables` field (added later in the form)
   *   3. Legacy `page_type` comma-separated string from the public form
   *   4. A single blank PDP placeholder
   *
   * Map free-text scope-item types like "PDP (Product Page)" or
   * "Hero Lander" to the canonical PageType enum via substring match. */
  useEffect(() => {
    let cancelled = false;
    async function load() {
      // 1. Try portal scope
      if (onboarding.assigned_portal_id) {
        try {
          const portal = await getPortalById(onboarding.assigned_portal_id);
          if (portal && !cancelled) {
            const fromPortal = scopeItemsToDeliverables(portal);
            if (fromPortal.length > 0) {
              setItems(fromPortal);
              setSource("portal");
              return;
            }
          }
        } catch {
          // fall through
        }
      }
      if (cancelled) return;

      // 2. Onboarding deliverables array
      const fromDeliverables = (onboarding.deliverables || []).map((d) => ({
        id: d.id,
        type: (d.type as PageType) || "pdp",
        label: d.label || "",
      }));
      if (fromDeliverables.length > 0) {
        setItems(fromDeliverables);
        setSource("deliverables");
        return;
      }

      // 3. Legacy page_type
      const fromPageType = parsePageTypeString(onboarding.page_type || "");
      if (fromPageType.length > 0) {
        setItems(fromPageType);
        setSource("page_type");
        return;
      }

      // 4. Blank
      setItems([{ id: `${Date.now()}-a`, type: "pdp", label: "" }]);
      setSource("blank");
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [onboarding]);

  function updateItem(id: string, patch: Partial<{ type: PageType; label: string }>) {
    setItems((s) => s.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }
  function addItem() {
    setItems((s) => [
      ...s,
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, type: "pdp", label: "" },
    ]);
  }
  function removeItem(id: string) {
    setItems((s) => s.filter((i) => i.id !== id));
  }

  async function submit() {
    if (!podId) return;
    if (items.length === 0) {
      alert("Add at least one deliverable.");
      return;
    }
    setSubmitting(true);

    const companyName = (onboarding.company_name || "Untitled").trim();
    /* Match the existing Client by submission id first (this is the
     * canonical link set by spawnEngagementFromOnboarding when the
     * engagement was approved in the inbox), falling back to company
     * name for legacy rows that were created before the link existed. */
    let client = existingClients.find(
      (c) => c.onboarding_submission_id === onboarding.id,
    ) ?? existingClients.find(
      (c) => c.name.toLowerCase().trim() === companyName.toLowerCase(),
    );
    if (!client) {
      client = createClient({
        name: companyName,
        pod_id: podId,
        brand_warm: false,
        // Conversion Engine ticked → £8K retainer; otherwise project-only.
        retainer_tier: conversionEngine ? "8k" : "none",
        onboarding_submission_id: onboarding.id,
      });
    } else if (!client.pod_id) {
      /* Parked Client (spawned via the inbox) being assigned to a pod
       * for the first time. Sync pod_id so it leaves purgatory and
       * shows up under the chosen pod on the roster. moveClientToPod
       * handles project + task assignment too, but at this point we
       * haven't created the project yet so it's a clean pod_id update. */
      moveClientToPod(client.id, podId);
      client = { ...client, pod_id: podId };
    }

    /* Build the pages array. The label is appended to the page type via
     * a marker the createProject path doesn't yet read; for now the
     * variant labels live on the onboarding submission and on the task
     * titles via post-processing. */
    const pages = items.map((it) => ({
      type: it.type,
      weight: PAGE_DEFAULT_WEIGHT[it.type],
    }));

    const project = createProject({
      name: `${companyName} - full build`,
      client_id: client.id,
      pod_id: podId,
      pages,
      signoff_date: signoffDate,
      signoff_hour: 12,
      is_rush: rush,
      brand_warm: client.brand_warm,
      onboarding_id: onboarding.id,
    });

    /* Patch task titles with the per-deliverable label so 3 PDPs don't
     * read identically. Same-type tasks are matched in order. */
    if (items.some((it) => it.label.trim())) {
      const tasks = getTasks();
      const used = new Set<string>();
      const updated = tasks.map((t) => {
        if (t.project_id !== project.id || !t.deliverable_type) return t;
        const matchKey = items.find((it) => {
          if (it.type !== t.deliverable_type) return false;
          const k = `${it.id}-${t.discipline}`;
          if (used.has(k)) return false;
          used.add(k);
          return true;
        });
        if (matchKey && matchKey.label.trim()) {
          const verb = t.discipline === "design" ? "Design" : "Build";
          return { ...t, title: `${verb} - ${PAGE_LABEL[matchKey.type]} · ${matchKey.label.trim()}` };
        }
        return t;
      });
      // Direct write, tasks are localStorage-backed
      localStorage.setItem("launchpad-pods-v2-tasks", JSON.stringify(updated));
    }

    /* Conversion Engine retainer → seed the full 12-week cycle
     * (3 monthly W1→W4 rounds), autopaired across designer + dev. Drops
     * the default M1 design+build tasks createProject just seeded
     * (their dates assume a 10/15/20-day bucket) and rebuilds them with
     * proper week dates + cycle metadata for the M{n} W{n} chip. */
    if (conversionEngine) {
      seedConversionEngineCycle({
        project_id: project.id,
        items: items.map((it) => ({ type: it.type, label: it.label })),
      });
    }

    setSubmitting(false);
    onComplete();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#7A7A7A]">
            Assign to pod
          </p>
          <h2 className="text-lg font-semibold text-[#1B1B1B]">
            {onboarding.company_name || "Untitled"}
          </h2>
          {onboarding.website_url && (
            <p className="mt-0.5 truncate text-[11px] text-[#7A7A7A]">{onboarding.website_url}</p>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#7A7A7A]">
              Pod
            </label>
            <select
              value={podId}
              onChange={(e) => setPodId(e.target.value)}
              className="w-full rounded-lg border border-[#E5E5EA] bg-white px-2 py-1.5 text-xs"
            >
              {eligiblePods.map((p) => {
                const load = podLoads.get(p.id);
                const used = load?.used ?? 0;
                const next = load?.next ?? 0;
                const cap = p.capacity_points_per_month;
                const isLightest = p.id === lightestPodId;
                return (
                  <option key={p.id} value={p.id}>
                    {p.name}, {used}/{cap}pts now · {next}/{cap}pts next{isLightest ? " · lightest" : ""}
                  </option>
                );
              })}
            </select>
            <p className="mt-1 text-[10px] text-[#A0A0A0]">
              Defaults to the lightest-loaded pod for this month. Pre-selected: <strong>{eligiblePods.find((p) => p.id === lightestPodId)?.name ?? ","}</strong>.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#7A7A7A]">
              Signoff date
            </label>
            <input
              type="date"
              value={signoffDate}
              onChange={(e) => setSignoffDate(e.target.value)}
              className="w-full rounded-lg border border-[#E5E5EA] bg-white px-2 py-1.5 text-xs"
            />
            <p className="mt-1 text-[10px] text-[#A0A0A0]">
              Kickoff rolls forward to the next Monday. Design due Friday week 1; dev due delivery Thursday.
            </p>
          </div>

          <label
            className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 ${
              conversionEngine ? "border-[#16A34A] bg-emerald-50" : "border-[#E5E5EA]"
            }`}
          >
            <input
              type="checkbox"
              checked={conversionEngine}
              onChange={(e) => setConversionEngine(e.target.checked)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <div className="text-xs font-medium text-[#1B1B1B]">
                Conversion Engine retainer
              </div>
              <div className="text-[10px] text-[#7A7A7A]">
                Pre-seeds the full 90-day cycle: 3 months × W1 strategy → W2 design → W3 build → W4 test, autopaired across designer + dev. Project delivery moves to W12 Thu.
              </div>
            </div>
          </label>

          <label
            className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 ${
              rush ? "border-rose-400 bg-rose-50" : "border-[#E5E5EA]"
            }`}
          >
            <input
              type="checkbox"
              checked={rush}
              onChange={(e) => setRush(e.target.checked)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <div className="text-xs font-medium text-[#1B1B1B]">
                Rush, exception flow
              </div>
              <div className="text-[10px] text-[#7A7A7A]">
                Skips the Monday-snap (kickoff = signoff date) and halves bucket duration. Use sparingly, pod cards track rush count so heavy use shows up in the operating model.
              </div>
            </div>
          </label>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[#7A7A7A]">
                Deliverables, confirm before assigning
              </label>
              <span className="text-[10px] text-[#A0A0A0]">
                {items.length} {items.length === 1 ? "item" : "items"}
              </span>
            </div>
            {source === "portal" && (
              <p className="mb-1.5 text-[10px] text-emerald-700">
                ✓ Pre-filled from the linked client portal&apos;s scope. Confirm or edit before assigning.
              </p>
            )}
            {source === "deliverables" && (
              <p className="mb-1.5 text-[10px] text-emerald-700">
                ✓ Pre-filled from the onboarding deliverables. Confirm or edit before assigning.
              </p>
            )}
            {source === "page_type" && (
              <p className="mb-1.5 text-[10px] text-amber-700">
                Pre-filled from the legacy page_type field ({onboarding.page_type}). Confirm or edit before assigning.
              </p>
            )}
            {source === "blank" && (
              <p className="mb-1.5 text-[10px] text-amber-700">
                ⚠ No deliverables found on the portal, the onboarding form, or page_type, add them here.
              </p>
            )}
            <div className="space-y-1.5">
              {items.map((it) => (
                <div key={it.id} className="flex items-center gap-1.5">
                  <select
                    value={it.type}
                    onChange={(e) => updateItem(it.id, { type: e.target.value as PageType })}
                    className="rounded-md border border-[#E5E5EA] bg-white px-2 py-1 text-[11px]"
                  >
                    {(Object.keys(PAGE_LABEL) as PageType[]).map((p) => (
                      <option key={p} value={p}>
                        {PAGE_LABEL[p]}
                      </option>
                    ))}
                  </select>
                  <input
                    value={it.label}
                    onChange={(e) => updateItem(it.id, { label: e.target.value })}
                    placeholder="Variant label"
                    className="flex-1 rounded-md border border-[#E5E5EA] bg-white px-2 py-1 text-[11px] placeholder:text-[#CCC]"
                  />
                  <button
                    onClick={() => removeItem(it.id)}
                    className="p-1 text-[#A0A0A0] hover:text-rose-600"
                    title="Remove"
                    type="button"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addItem}
              className="mt-2 inline-flex items-center gap-1 rounded-md border border-dashed border-[#E5E5EA] px-2 py-1 text-[10px] text-[#7A7A7A] hover:border-[#1B1B1B] hover:text-[#1B1B1B]"
            >
              + Add deliverable
            </button>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded px-3 py-1.5 text-[11px] text-[#7A7A7A] hover:text-[#1B1B1B]"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting || !podId || items.length === 0}
            className="rounded bg-[#1B1B1B] px-3 py-1.5 text-[11px] font-medium text-white hover:bg-[#2D2D2D] disabled:opacity-50"
          >
            {submitting ? "Assigning…" : `Confirm & assign · ${items.length} deliverable${items.length === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CRO Pipeline panel ─────────────────────────────────────────────

/* Pod health row, single line of three cells, one per pod, with a
 * single overall tone (green / amber / red) and a list of micro-
 * indicators. Tone aggregation: any red signal → red; any amber → amber;
 * else green. Indicators: capacity utilisation now, slip count
 * (active), blocker count (open >48h elevates), OOO coverage. All
 * thresholds are tunable constants below.
 *
 * Why up here: Dylan/Alister need to glance at the page and see if
 * anything's on fire before they read individual pod cards. */
function PodHealthRow({
  pods,
  projectsByPod,
  allTasks,
  today,
}: {
  pods: Pod[];
  projectsByPod: Record<string, Project[]>;
  allTasks: Task[];
  today: string;
}) {
  if (pods.length === 0) return null;

  const tw = fourWeekWindow(today);
  const QUARTER_DAYS = 90;
  const quarterStart = (() => {
    const d = new Date(`${today}T12:00:00`);
    d.setDate(d.getDate() - QUARTER_DAYS);
    return d.toISOString().slice(0, 10);
  })();

  type Tone = "green" | "amber" | "red";
  function worse(a: Tone, b: Tone): Tone {
    if (a === "red" || b === "red") return "red";
    if (a === "amber" || b === "amber") return "amber";
    return "green";
  }

  const cells = pods.map((pod) => {
    const podProjects = projectsByPod[pod.id] ?? [];
    const used = capacityUsed(podProjects, allTasks, tw.start, tw.end);
    const cap = pod.capacity_points_per_month;
    const utilPct = cap > 0 ? Math.round((used / cap) * 100) : 0;
    const utilTone: Tone = utilPct >= 100 ? "red" : utilPct >= 80 ? "amber" : "green";

    const slips = podProjects.filter(
      (p) => p.status === "slipped" && p.delivery_date >= quarterStart,
    ).length;
    const slipTone: Tone = slips > 2 ? "red" : slips > 0 ? "amber" : "green";

    const openBlockers = (pod.blockers || []).filter((b) => !b.resolved_at);
    const oldestBlockerHours = openBlockers.reduce((max, b) => {
      const ageMs = Date.now() - new Date(b.raised_at).getTime();
      return Math.max(max, ageMs / 3_600_000);
    }, 0);
    const blockerTone: Tone =
      oldestBlockerHours >= 96 ? "red" : oldestBlockerHours >= 48 ? "amber" : openBlockers.length > 0 ? "amber" : "green";

    const oooCount = pod.members.filter(
      (m) =>
        !m.is_placeholder &&
        ((m.ooo_start && today >= m.ooo_start && (!m.ooo_end || today <= m.ooo_end)) ||
          (!m.ooo_start && m.ooo_end && today <= m.ooo_end)),
    ).length;
    // Half or more of the pod out is amber (covered but stressed); both
    // primaries out is red.
    const primariesOut = pod.members.filter(
      (m) =>
        (m.role === "primary_designer" || m.role === "primary_dev") &&
        ((m.ooo_start && today >= m.ooo_start && (!m.ooo_end || today <= m.ooo_end)) ||
          (!m.ooo_start && m.ooo_end && today <= m.ooo_end)),
    ).length;
    const oooTone: Tone = primariesOut >= 2 ? "red" : oooCount >= 2 ? "amber" : "green";

    const overall: Tone = [utilTone, slipTone, blockerTone, oooTone].reduce(worse, "green");

    return {
      pod,
      overall,
      utilPct,
      utilTone,
      slips,
      slipTone,
      openBlockers: openBlockers.length,
      oldestBlockerHours,
      blockerTone,
      oooCount,
      oooTone,
    };
  });

  const overallTone = cells.reduce<Tone>((acc, c) => worse(acc, c.overall), "green");
  const overallLabel =
    overallTone === "red" ? "Action needed" : overallTone === "amber" ? "Watch" : "Healthy";

  function toneClass(t: Tone): string {
    return t === "red"
      ? "bg-rose-500"
      : t === "amber"
        ? "bg-amber-500"
        : "bg-emerald-500";
  }
  function toneText(t: Tone): string {
    return t === "red"
      ? "text-rose-700"
      : t === "amber"
        ? "text-amber-700"
        : "text-emerald-700";
  }
  /* Tile background by tone, matches the pod card PodStat alert pattern
   * (rose-50 for alert) but extended to three tones. Green = neutral pod-
   * card grey so a healthy pod looks identical in tone to a happy stat
   * box; amber/red lift attention without flooding the row. */
  function toneTile(t: Tone): string {
    return t === "red"
      ? "bg-rose-50 text-rose-800"
      : t === "amber"
        ? "bg-amber-50 text-amber-800"
        : "bg-[#F7F8FA] text-[#1B1B1B]";
  }

  return (
    <div className="mt-6 rounded-2xl border border-[#E5E5EA] bg-white p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-baseline justify-between">
        <div className="flex items-center gap-2">
          <span className={`size-2 rounded-full ${toneClass(overallTone)}`} />
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#7A7A7A]">
            Agency health
          </h2>
          <span className={`text-[11px] font-semibold ${toneText(overallTone)}`}>
            {overallLabel}
          </span>
        </div>
        <span className="text-[10px] text-[#A0A0A0]">
          Capacity · Slips this quarter · Blockers · OOO
        </span>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        {cells.map((c) => (
          <div
            key={c.pod.id}
            className="rounded-xl border border-[#E5E5EA] bg-white p-3"
          >
            <div className="flex items-center gap-2 mb-2.5">
              <span className={`size-2 rounded-full ${toneClass(c.overall)}`} />
              <span className="text-sm font-semibold text-[#1B1B1B]">{c.pod.name}</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              <HealthStat label="Capacity" value={`${c.utilPct}%`} tone={c.utilTone} toneTile={toneTile} />
              <HealthStat label="Slips" value={c.slips} tone={c.slipTone} toneTile={toneTile} />
              <HealthStat label="Blockers" value={c.openBlockers} tone={c.blockerTone} toneTile={toneTile} />
              <HealthStat label="OOO" value={c.oooCount} tone={c.oooTone} toneTile={toneTile} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Friday weekly digest. Admin-only, shows only on Fridays (Mon-Thu it's
 * collapsed entirely so it doesn't add noise mid-week). Computes a per-
 * pod summary of the week, what shipped, what's still open, what's
 * stale (>48h ticket), what's blocked, what slipped, and offers a one-
 * click "Post to Slack" button that fires it to a channel the admin
 * picks. The summary itself is also rendered on-screen so the admin
 * can review before posting (or use the digest in standup without ever
 * posting it). */
function FridayDigestPanel({
  pods,
  projects,
  tasks,
  clientById,
  today,
}: {
  pods: Pod[];
  projects: Project[];
  tasks: Task[];
  clientById: Map<string, Client>;
  today: string;
}) {
  const [forceShow, setForceShow] = useState(false);
  const [posting, setPosting] = useState<string | null>(null); // pod id mid-post

  const isFriday = new Date(`${today}T12:00:00`).getDay() === 5;

  const summaries = useMemo(() => {
    const weekStart = (() => {
      const d = new Date(`${today}T12:00:00`);
      // Roll back to Monday
      const dow = d.getDay();
      const back = dow === 0 ? 6 : dow - 1;
      d.setDate(d.getDate() - back);
      return d.toISOString().slice(0, 10);
    })();
    return pods.map((pod) => {
      const podProjects = projects.filter((p) => p.pod_id === pod.id);
      const podTasks = tasks.filter((t) => podProjects.some((pp) => pp.id === t.project_id));
      const shipped = podProjects.filter(
        (p) => p.status === "shipped" && p.delivery_date >= weekStart && p.delivery_date <= today,
      );
      const slipped = podProjects.filter((p) => p.status === "slipped");
      const inFlight = podProjects.filter(
        (p) => p.status === "in_progress" || p.status === "in_review",
      );
      const stale = podTasks.filter((t) => t.stale_pinged_at && t.status !== "done");
      const activeBlockers = (pod.blockers || []).filter((b) => !b.resolved_at);
      return { pod, shipped, slipped, inFlight, stale, activeBlockers, podProjects };
    });
  }, [pods, projects, tasks, today]);

  function formatSlackMessage(s: typeof summaries[number]): string {
    const lines: string[] = [
      `:calendar_spiral: *Friday digest - ${s.pod.name}*, week of ${today}`,
    ];
    if (s.shipped.length > 0) {
      lines.push(
        `:white_check_mark: Shipped this week (${s.shipped.length}): ${s.shipped
          .map((p) => `${p.name}${clientById.get(p.client_id) ? ` _(${clientById.get(p.client_id)!.name})_` : ""}`)
          .join(", ")}`,
      );
    } else {
      lines.push(`:white_check_mark: Shipped this week: nothing`);
    }
    lines.push(`:building_construction: In flight: ${s.inFlight.length} project${s.inFlight.length === 1 ? "" : "s"}`);
    if (s.stale.length > 0) {
      lines.push(`:hourglass_flowing_sand: Stale tickets (>48h): ${s.stale.length}`);
    }
    if (s.activeBlockers.length > 0) {
      lines.push(`:rotating_light: Active blockers: ${s.activeBlockers.length}`);
    }
    if (s.slipped.length > 0) {
      lines.push(`:warning: Slipped: ${s.slipped.length}`);
    }
    return lines.join("\n");
  }

  async function postPodDigest(s: typeof summaries[number]) {
    if (!s.pod.slack_channel_id) {
      alert(`No Slack channel configured for ${s.pod.name}. Set one on the pod's Blockers panel.`);
      return;
    }
    setPosting(s.pod.id);
    try {
      await fetch("/api/pods/blocker-notify", {
        // Reuse the existing endpoint, it accepts arbitrary text via
        // title (description optional). Keeps endpoint count down for
        // a once-a-week feature.
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel_id: s.pod.slack_channel_id,
          pod_name: s.pod.name,
          title: `Friday digest - week of ${today}`,
          description: formatSlackMessage(s).split("\n").slice(1).join("\n"),
        }),
      });
    } finally {
      setPosting(null);
    }
  }

  if (!isFriday && !forceShow) {
    return (
      <div className="mt-10">
        <button
          onClick={() => setForceShow(true)}
          className="text-[11px] text-[#A0A0A0] hover:text-[#1B1B1B] hover:underline"
        >
          + Show Friday digest (off-day preview)
        </button>
      </div>
    );
  }

  return (
    <div className="mt-10">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#7A7A7A]">
            Friday digest{!isFriday && ", preview"}
          </h2>
          <p className="mt-0.5 text-xs text-[#7A7A7A]">
            What each pod shipped this week, what&apos;s still open, what&apos;s stale. One click posts the formatted summary to the pod&apos;s Slack channel.
          </p>
        </div>
        {!isFriday && (
          <button
            onClick={() => setForceShow(false)}
            className="text-[10px] text-[#A0A0A0] hover:text-[#1B1B1B] hover:underline"
          >
            Hide
          </button>
        )}
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        {summaries.map((s) => (
          <div
            key={s.pod.id}
            className="rounded-xl border border-[#E5E5EA] bg-white p-3 shadow-[var(--shadow-soft)]"
          >
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-semibold text-[#1B1B1B]">{s.pod.name}</h3>
              <button
                disabled={posting === s.pod.id || !s.pod.slack_channel_id}
                onClick={() => postPodDigest(s)}
                className={`rounded-md px-2 py-1 text-[10px] font-medium ${
                  s.pod.slack_channel_id
                    ? "bg-[#1B1B1B] text-white hover:bg-[#2D2D2D]"
                    : "cursor-not-allowed bg-[#E5E5EA] text-[#A0A0A0]"
                } ${posting === s.pod.id ? "opacity-60" : ""}`}
                title={s.pod.slack_channel_id ? "Post to Slack" : "No channel configured for this pod"}
              >
                {posting === s.pod.id ? "Posting…" : "Post to Slack"}
              </button>
            </div>
            <pre className="mt-2 whitespace-pre-wrap text-[11px] leading-relaxed text-[#1B1B1B]" style={{ fontFamily: "inherit" }}>
              {formatSlackMessage(s)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}

function CroPipeline({
  croLeads,
  tasks,
  projectById,
  clientById,
  pods,
  today,
  onMutate,
  isAdmin,
}: {
  croLeads: PodMember[];
  tasks: Task[];
  projectById: Map<string, Project>;
  clientById: Map<string, Client>;
  pods: Pod[];
  today: string;
  onMutate: () => void;
  isAdmin: boolean;
}) {
  const dan = croLeads[0];
  const [adding, setAdding] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskProjectId, setTaskProjectId] = useState("");

  if (!dan) return null;

  // Tasks owned by Dan, sorted by due date (open first, done at bottom)
  const danTasks = tasks
    .filter((t) => t.assigned_to === dan.id)
    .sort((a, b) => {
      if (a.status === "done" && b.status !== "done") return 1;
      if (a.status !== "done" && b.status === "done") return -1;
      return (a.due_date || "").localeCompare(b.due_date || "");
    });

  // Group by pod for easier scanning
  const tasksByPod = new Map<string, Task[]>();
  for (const t of danTasks) {
    const project = projectById.get(t.project_id);
    if (!project) continue;
    const podId = project.pod_id || "unassigned";
    if (!tasksByPod.has(podId)) tasksByPod.set(podId, []);
    tasksByPod.get(podId)!.push(t);
  }

  /* Within a pod section, sub-group Conversion Engine cycle tasks by
   * month so the 3-month runway is visible at a glance. Tasks without a
   * cycle (manually-added strategy work) sit in an "Ad-hoc" group. */
  function subGroupByMonth(podTasks: Task[]): Array<{ key: string; label: string; tasks: Task[] }> {
    const buckets = new Map<string, Task[]>();
    for (const t of podTasks) {
      const key = t.cycle ? `m${t.cycle.month}` : "adhoc";
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(t);
    }
    const order = ["m1", "m2", "m3", "adhoc"];
    return order
      .filter((k) => buckets.has(k))
      .map((k) => ({
        key: k,
        label:
          k === "adhoc"
            ? "Ad-hoc"
            : `Month ${k.slice(1)}`,
        tasks: buckets.get(k)!,
      }));
  }

  const allProjects = Array.from(projectById.values());

  return (
    <div className="mt-10">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#7A7A7A]">
            CRO Pipeline
          </h2>
          <p className="mt-0.5 text-xs text-[#7A7A7A]">
            {dan.name}&apos;s strategy + wireframe work across all pods. Pre-seeded for the full 90-day cycle on Conversion Engine retainers, grouped by month so the runway is visible at a glance.
          </p>
        </div>
        <span className="text-[11px] tabular-nums text-[#A0A0A0]">
          {danTasks.filter((t) => t.status !== "done").length} open · {danTasks.length} total
        </span>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-[#E5E5EA] bg-white shadow-[var(--shadow-soft)]">
        {/* Dan's header strip */}
        <div className="flex items-center justify-between gap-3 border-b border-[#E5E5EA] bg-[#F7F8FA] px-4 py-3">
          <div className="flex items-center gap-3">
            <MemberAvatar
              member={dan}
              onChangeAvatar={(url) => {
                updateCroLeadAvatar(dan.id, url);
                onMutate();
              }}
            />
            <div>
              <div className="text-sm font-semibold text-[#1B1B1B]">{dan.name}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0]">CRO lead</div>
            </div>
          </div>
          {isAdmin && allProjects.length > 0 && (
            <button
              onClick={() => setAdding(true)}
              className="rounded-md border border-[#E5E5EA] bg-white px-2 py-1 text-[11px] font-medium text-[#1B1B1B] hover:border-[#1B1B1B]"
            >
              + Add strategy task
            </button>
          )}
        </div>

        {/* Add-task form */}
        {adding && (
          <div className="border-b border-[#E5E5EA] bg-[#F7F8FA] px-4 py-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <input
                autoFocus
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Strategy task (e.g. Wireframe, PDP, Sling Carrier)"
                className="flex-1 min-w-[280px] rounded-md border border-[#E5E5EA] bg-white px-2 py-1 text-xs"
              />
              <select
                value={taskProjectId || allProjects[0]?.id || ""}
                onChange={(e) => setTaskProjectId(e.target.value)}
                className="rounded-md border border-[#E5E5EA] bg-white px-2 py-1 text-xs"
              >
                {allProjects.map((p) => {
                  const c = clientById.get(p.client_id);
                  return (
                    <option key={p.id} value={p.id}>
                      {p.name} · {c?.name ?? ","}
                    </option>
                  );
                })}
              </select>
              <button
                onClick={() => {
                  setAdding(false);
                  setTaskTitle("");
                }}
                className="px-2 py-1 text-[11px] text-[#7A7A7A] hover:text-[#1B1B1B]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const projectId = taskProjectId || allProjects[0]?.id;
                  if (!taskTitle.trim() || !projectId) return;
                  addTask({
                    project_id: projectId,
                    title: taskTitle.trim(),
                    type: "asset_prep",
                    assigned_to: dan.id,
                    discipline: "strategy",
                  });
                  setTaskTitle("");
                  setTaskProjectId("");
                  setAdding(false);
                  onMutate();
                }}
                className="rounded-md bg-[#1B1B1B] px-2 py-1 text-[11px] font-medium text-white hover:bg-[#2D2D2D]"
              >
                Add
              </button>
            </div>
          </div>
        )}

        {/* Task list grouped by pod */}
        {danTasks.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-[#A0A0A0]">
            No strategy tasks on Dan&apos;s plate. As retainers come in, week-1 strategy work lands here.
          </div>
        ) : (
          <div>
            {Array.from(tasksByPod.entries()).map(([podId, podTasks]) => {
              const pod = pods.find((p) => p.id === podId);
              const groups = subGroupByMonth(podTasks);
              return (
                <div key={podId} className="border-b border-[#EDEDEF] last:border-b-0">
                  <div className="bg-[#FAFAFA] px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#7A7A7A]">
                    {pod?.name || "Unassigned pod"}
                  </div>
                  {groups.map((g) => {
                    const showHeader = groups.length > 1 || g.key !== "adhoc";
                    return (
                      <div key={g.key}>
                        {showHeader && (
                          <div className="bg-emerald-50/40 px-4 py-1 text-[9px] font-semibold uppercase tracking-wider text-emerald-800">
                            {g.label}
                            <span className="ml-1.5 text-[#A0A0A0]">
                              · {g.tasks.filter((t) => t.status !== "done").length} open
                            </span>
                          </div>
                        )}
                        {g.tasks.map((t) => {
                          const project = projectById.get(t.project_id);
                          const client = project ? clientById.get(project.client_id) : undefined;
                          const isDone = t.status === "done";
                          const ageHours = Math.max(0, Math.floor((Date.now() - new Date(t.created_at).getTime()) / 3_600_000));
                          const ageColor = ageHours >= 48 ? "text-rose-700" : ageHours >= 24 ? "text-amber-700" : "text-emerald-700";
                          const ageLabel = formatTimeInPhase(t.created_at);
                          return (
                            <div
                              key={t.id}
                              className={`group flex items-center gap-3 px-4 py-2 hover:bg-[#F7F8FA] ${isDone ? "opacity-50" : ""}`}
                            >
                              <button
                                onClick={() => {
                                  const next = isDone ? "todo" : t.status === "in_progress" ? "done" : "in_progress";
                                  updateTaskStatus(t.id, next);
                                  onMutate();
                                }}
                                className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                                  isDone
                                    ? "border-emerald-500 bg-emerald-500 text-white"
                                    : t.status === "in_progress"
                                      ? "border-blue-500 bg-white text-blue-500"
                                      : "border-[#D5D5DC] bg-white hover:border-[#1B1B1B]"
                                }`}
                                title="Cycle status"
                              >
                                {isDone && (
                                  <svg viewBox="0 0 12 12" className="size-3" fill="currentColor">
                                    <path d="M10.28 3.28L4.5 9.06 1.72 6.28l1.06-1.06L4.5 6.94l4.72-4.72z" />
                                  </svg>
                                )}
                                {t.status === "in_progress" && <span className="size-1.5 rounded-full bg-blue-500" />}
                              </button>
                              <div className="min-w-0 flex-1">
                                <div className={`truncate text-sm leading-tight ${isDone ? "text-[#A0A0A0] line-through" : "text-[#1B1B1B]"}`}>
                                  {t.title}
                                </div>
                                {client && (
                                  <div className="mt-0.5 truncate text-[11px] text-[#7A7A7A]">
                                    <span className="font-medium text-[#1B1B1B]">{client.name}</span>
                                    {project && <span className="text-[#A0A0A0]"> · {project.name}</span>}
                                  </div>
                                )}
                              </div>
                              <span className={`shrink-0 text-[11px] font-medium tabular-nums ${ageColor}`} title={`Opened ${new Date(t.created_at).toLocaleString()}`}>
                                {ageLabel}
                              </span>
                              {isAdmin && (
                                <button
                                  onClick={() => {
                                    if (confirm(`Delete task "${t.title}"?`)) {
                                      deleteTask(t.id);
                                      onMutate();
                                    }
                                  }}
                                  className="opacity-0 transition-opacity group-hover:opacity-100"
                                  title="Delete task"
                                >
                                  <span className="text-[#A0A0A0] hover:text-rose-600">×</span>
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function PodStat({
  label,
  value,
  alert,
}: {
  label: string;
  value: number;
  alert?: boolean;
}) {
  const cls = alert
    ? "bg-rose-50 text-rose-800"
    : "bg-[#F7F8FA] text-[#1B1B1B]";
  return (
    <div className={`rounded-lg px-3 py-2 ${cls}`}>
      <div className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
        {label}
      </div>
      <div className="mt-0.5 text-base font-semibold tabular-nums">{value}</div>
    </div>
  );
}

/* Three-tone variant of PodStat used by Agency Health. Same shape as
 * PodStat (rounded tile, label-on-top + big-value pattern) so the
 * Agency Health row and the per-pod stat strip read as the same
 * component family, they just differ in what signal they show.
 *
 * Background carries the traffic-light tone instead of a separate dot,
 * which removes a layer of visual noise from the previous "dot + tiny
 * inline number" pattern. toneTile is passed in so callers control the
 * tone-to-class mapping. */
function HealthStat({
  label,
  value,
  tone,
  toneTile,
}: {
  label: string;
  value: string | number;
  tone: "green" | "amber" | "red";
  toneTile: (t: "green" | "amber" | "red") => string;
}) {
  return (
    <div className={`rounded-lg px-2.5 py-1.5 ${toneTile(tone)}`}>
      <div className="text-[9px] font-semibold uppercase tracking-wider opacity-70">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function daysBetween(a: string, b: string): number {
  const ad = new Date(`${a}T12:00:00`).getTime();
  const bd = new Date(`${b}T12:00:00`).getTime();
  return Math.round((bd - ad) / 86_400_000);
}
