"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRightIcon,
  PlusIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import {
  createClient,
  createProject,
  ensureSeed,
  getClients,
  getPods,
  getProjects,
  getTasks,
  resetAndReseed,
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
import { capacityUsed, isMidWeekKickoff } from "@/lib/pods-v2/calc";
import { formatDayMonth, todayYMD } from "@/lib/dates";
import { CapacityMeter, MemberAvatar } from "./components";
import { WeeksView } from "./WeeksView";
import { onboardingStore, type OnboardingSubmission } from "@/lib/onboarding";
import { getPortalById } from "@/lib/portal/data";
import type { PortalData, ScopeItem } from "@/lib/portal/types";
import { useRole } from "@/components/auth-gate";

type View = "overview" | "pipeline";

export default function PodsIndexClient() {
  const role = useRole();
  /* Team-view flag — set once when arriving at /pods-v2 with ?view=team,
   * cleared when arriving at /pods-v2 without it. Sub-routes read the
   * sessionStorage flag so the team flavour persists across navigation
   * (Pod 1 → drill in → back). The all-pods route is the manager —
   * direct sidebar access (no param) re-enters admin mode. */
  const searchParams = useSearchParams();
  const [forceTeamView, setForceTeamView] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const fromParam = searchParams.get("view") === "team";
    if (fromParam) {
      sessionStorage.setItem("pods-v2-team-view", "1");
      setForceTeamView(true);
    } else {
      sessionStorage.removeItem("pods-v2-team-view");
      setForceTeamView(false);
    }
  }, [searchParams]);
  const isAdmin = role === "admin" && !forceTeamView;
  const [pods, setPods] = useState<Pod[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [onboardings, setOnboardings] = useState<OnboardingSubmission[]>([]);
  const [view, setView] = useState<View>("overview");
  const [assigning, setAssigning] = useState<OnboardingSubmission | null>(null);

  useEffect(() => {
    ensureSeed();
    setPods(getPods());
    setAllProjects(getProjects());
    setAllClients(getClients());
    setAllTasks(getTasks());
    onboardingStore.getAll().then(setOnboardings).catch(() => {});
  }, []);

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

  /* Purgatory: onboarding forms that have been processed (PM picked them up
   * and assigned a portal, or status moved past pending) AND either:
   *   - no Client/Project exists for them yet, OR
   *   - their matching Client has zero tasks, OR
   *   - their matching Client has been parked (pod_id cleared)
   *
   * Parked clients explicitly belong here so the PM can re-assign them
   * to a pod when capacity opens up. */
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
    return onboardings
      .filter((o) => {
        if (o.deleted_at) return false;
        const processed = !!o.assigned_portal_id || o.status === "approved" || o.status === "in-progress";
        if (!processed) return false;
        const matchedClient = o.company_name ? clientByName.get(o.company_name.toLowerCase().trim()) : undefined;
        // Parked client (pod_id empty) → always in purgatory
        if (matchedClient && !matchedClient.pod_id) return true;
        const taskCount = matchedClient ? tasksByClientId.get(matchedClient.id) || 0 : 0;
        return taskCount === 0;
      })
      .sort((a, b) => (a.assigned_at || a.updated_at).localeCompare(b.assigned_at || b.updated_at));
  }, [onboardings, allClients, allProjects, allTasks]);

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
        {isAdmin && (
          <div className="flex items-center gap-2">
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
          </div>
        )}
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
          purgatoryOnboardings={purgatoryOnboardings}
          memberById={memberById}
          projectById={projectById}
          clientById={clientById}
          today={today}
          onAssign={(o) => setAssigning(o)}
          isAdmin={isAdmin}
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
          existingClients={allClients}
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
  purgatoryOnboardings,
  memberById,
  projectById,
  clientById,
  today,
  onAssign,
  isAdmin,
}: {
  pods: Pod[];
  projectsByPod: Record<string, Project[]>;
  allTasks: Task[];
  purgatoryOnboardings: OnboardingSubmission[];
  memberById: Map<string, { member: PodMember; pod: Pod }>;
  projectById: Map<string, Project>;
  clientById: Map<string, Client>;
  today: string;
  onAssign: (o: OnboardingSubmission) => void;
  isAdmin: boolean;
}) {
  return (
    <>
      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {pods.map((pod) => {
          const projects = projectsByPod[pod.id] ?? [];
          const used = capacityUsed(projects, allTasks);
          const midWeek = projects.filter(isMidWeekKickoff).length;
          const inFlight = projects.filter(
            (p) => p.status === "in_progress" || p.status === "in_review",
          ).length;
          const activeBlockers = (pod.blockers || []).filter((b) => !b.resolved_at).length;
          return (
            <Link
              key={pod.id}
              href={`/pods-v2/${pod.id}`}
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
                />
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
                <PodStat label="In flight" value={inFlight} />
                <PodStat
                  label="Total active"
                  value={projects.filter((p) => p.status !== "shipped").length}
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

      {/* Purgatory — processed onboardings without assigned tasks. Admin
       * only — assign-to-pod is a PM action and onboarding form data
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
                <th className="px-3 py-2 text-left">Portal</th>
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
                      {o.assigned_portal_id ? (
                        <Link
                          href={`/tools/client-portal/${o.assigned_portal_id}`}
                          className="text-[#1B1B1B] hover:underline"
                        >
                          View portal →
                        </Link>
                      ) : (
                        <span className="text-[#A0A0A0]">—</span>
                      )}
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
 * matches. Order matters — more specific first. */
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
 * either plain strings or { description, type } objects — we map the
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
  existingClients,
  onCancel,
  onComplete,
}: {
  onboarding: OnboardingSubmission;
  pods: Pod[];
  existingClients: Client[];
  onCancel: () => void;
  onComplete: () => void;
}) {
  const eligiblePods = pods;
  const [podId, setPodId] = useState<string>(eligiblePods[0]?.id ?? "");
  const [signoffDate, setSignoffDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [items, setItems] = useState<Array<{ id: string; type: PageType; label: string }>>([]);
  const [source, setSource] = useState<"portal" | "deliverables" | "page_type" | "blank">("blank");
  const [submitting, setSubmitting] = useState(false);

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
    let client = existingClients.find(
      (c) => c.name.toLowerCase().trim() === companyName.toLowerCase(),
    );
    if (!client) {
      client = createClient({
        name: companyName,
        pod_id: podId,
        brand_warm: false,
        retainer_tier: "8k",
      });
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
      name: `${companyName} — full build`,
      client_id: client.id,
      pod_id: podId,
      pages,
      signoff_date: signoffDate,
      signoff_hour: 12,
      is_rush: false,
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
          return { ...t, title: `${verb} – ${PAGE_LABEL[matchKey.type]} · ${matchKey.label.trim()}` };
        }
        return t;
      });
      // Direct write — tasks are localStorage-backed
      localStorage.setItem("launchpad-pods-v2-tasks", JSON.stringify(updated));
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
              {eligiblePods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
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

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[#7A7A7A]">
                Deliverables — confirm before assigning
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
                ⚠ No deliverables found on the portal, the onboarding form, or page_type — add them here.
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

function daysBetween(a: string, b: string): number {
  const ad = new Date(`${a}T12:00:00`).getTime();
  const bd = new Date(`${b}T12:00:00`).getTime();
  return Math.round((bd - ad) / 86_400_000);
}
