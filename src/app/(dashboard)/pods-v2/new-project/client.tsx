"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeftIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import {
  createClient,
  createProject,
  ensureSeed,
  getClients,
  getPods,
  getProjectsForPod,
} from "@/lib/pods-v2/data";
import {
  Client,
  PageType,
  PageWeight,
  PAGE_DEFAULT_WEIGHT,
  PAGE_LABEL,
  PAGE_WEIGHT_POINTS,
  Pod,
  RetainerTier,
} from "@/lib/pods-v2/types";
import {
  adjustedPoints,
  bucketFromPoints,
  capacityUsed,
  deliveryThursdayFor,
  kickoffMondayFor,
  rawPoints,
} from "@/lib/pods-v2/calc";
import { previousWorkingDay } from "@/lib/pods-v2/deliverable";
import {
  inputClass,
  labelClass,
  selectClass,
} from "@/lib/form-styles";
import { formatLongDate, todayYMD } from "@/lib/dates";
import { BucketBadge } from "../components";

interface PageRow {
  type: PageType;
  weight: PageWeight;
}

export default function IntakeClient() {
  const router = useRouter();
  const [pods, setPods] = useState<Pod[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [projectName, setProjectName] = useState("");
  const [clientMode, setClientMode] = useState<"existing" | "new">("existing");
  const [clientId, setClientId] = useState("");
  const [newClientName, setNewClientName] = useState("");
  const [newClientPodId, setNewClientPodId] = useState("");
  const [newClientBrandWarm, setNewClientBrandWarm] = useState(false);
  const [newClientTier, setNewClientTier] = useState<RetainerTier>("none");
  const [pages, setPages] = useState<PageRow[]>([
    { type: "pdp", weight: "heavy" },
  ]);
  const [isRush, setIsRush] = useState(false);
  const [signoffDate, setSignoffDate] = useState(todayYMD());
  const [signoffHour, setSignoffHour] = useState(12);

  useEffect(() => {
    ensureSeed();
    setPods(getPods());
    setClients(getClients());
    setLoading(false);
  }, []);

  const existingClient = useMemo(
    () => clients.find((c) => c.id === clientId),
    [clients, clientId],
  );

  // Pod assignment: existing client → its pod; new client → user picks (pre-fill with most-capacity pod)
  const suggestedPodId = useMemo(() => {
    if (clientMode === "existing") return existingClient?.pod_id ?? "";
    if (newClientPodId) return newClientPodId;
    // Pick pod with most remaining capacity
    let best = pods[0]?.id ?? "";
    let bestRemaining = -Infinity;
    for (const pod of pods) {
      const used = capacityUsed(getProjectsForPod(pod.id));
      const rem = pod.capacity_points_per_month - used;
      if (rem > bestRemaining) {
        bestRemaining = rem;
        best = pod.id;
      }
    }
    return best;
  }, [clientMode, existingClient, pods, newClientPodId]);

  // Effective brand-warm flag (drives points calc preview)
  const brandWarm =
    clientMode === "existing"
      ? !!existingClient?.brand_warm
      : newClientBrandWarm;

  const totalPointsRaw = rawPoints(pages);
  const totalPoints = adjustedPoints(pages, brandWarm);
  const bucket = bucketFromPoints(totalPoints);
  const kickoff = kickoffMondayFor(signoffDate, signoffHour);
  const delivery = deliveryThursdayFor(kickoff, bucket);
  /* Capacity-aware promise (#1): does the routed pod actually have room for
   * these points this month? If not, the delivery date isn't realistic and
   * we flag it BEFORE anyone promises it to a client. */
  const podCap = pods.find((p) => p.id === suggestedPodId)?.capacity_points_per_month ?? 40;
  const podUsed = suggestedPodId ? capacityUsed(getProjectsForPod(suggestedPodId)) : 0;
  const projectedUsed = podUsed + totalPoints;
  const capacityPct = Math.round((projectedUsed / podCap) * 100);
  const overCapacity = projectedUsed > podCap;
  const nearCapacity = !overCapacity && capacityPct >= 85;
  /* Internal target = client ship date − 1 working day (the padding rule). */
  const internalTarget = delivery ? previousWorkingDay(delivery) : null;

  function addPage() {
    setPages([...pages, { type: "pdp", weight: PAGE_DEFAULT_WEIGHT.pdp }]);
  }
  function removePage(idx: number) {
    setPages(pages.filter((_, i) => i !== idx));
  }
  function updatePage(idx: number, patch: Partial<PageRow>) {
    setPages(
      pages.map((p, i) => {
        if (i !== idx) return p;
        const next = { ...p, ...patch };
        // If type changed and weight wasn't explicitly set in this patch, autofill weight
        if (patch.type !== undefined && patch.weight === undefined) {
          next.weight = PAGE_DEFAULT_WEIGHT[patch.type];
        }
        return next;
      }),
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!projectName.trim()) {
      alert("Project name is required");
      return;
    }
    if (pages.length === 0) {
      alert("Add at least one page");
      return;
    }

    let resolvedClientId = clientId;
    let resolvedPodId = suggestedPodId;
    let resolvedBrandWarm = brandWarm;

    if (clientMode === "new") {
      if (!newClientName.trim()) {
        alert("New client needs a name");
        return;
      }
      if (!suggestedPodId) {
        alert("Pick a pod for this client");
        return;
      }
      const c = createClient({
        name: newClientName.trim(),
        pod_id: suggestedPodId,
        brand_warm: newClientBrandWarm,
        retainer_tier: newClientTier,
      });
      resolvedClientId = c.id;
      resolvedPodId = c.pod_id;
      resolvedBrandWarm = c.brand_warm;
    } else {
      if (!existingClient) {
        alert("Pick a client");
        return;
      }
      resolvedPodId = existingClient.pod_id;
      resolvedBrandWarm = existingClient.brand_warm;
    }

    createProject({
      name: projectName.trim(),
      client_id: resolvedClientId,
      pod_id: resolvedPodId,
      pages,
      signoff_date: signoffDate,
      signoff_hour: signoffHour,
      is_rush: isRush,
      brand_warm: resolvedBrandWarm,
    });

    router.push(`/pods-v2/${resolvedPodId}`);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12 md:px-10">
        <div className="text-sm text-subtle">Loading…</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 md:px-10">
      <Link
        href="/pods-v2"
        className="inline-flex items-center gap-1 text-xs text-subtle hover:text-foreground"
      >
        <ChevronLeftIcon className="size-3.5" />
        All pods
      </Link>

      <div className="mt-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle">
          Intake
        </p>
        <h1 className="mt-1 text-3xl font-medium">
          New project
        </h1>
        <p className="mt-1 text-sm text-subtle">
          The system auto-buckets, auto-schedules, and creates default tasks.
          Override only when you have to.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-6 rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-soft)]"
      >
        {/* Client */}
        <div>
          <label className={labelClass}>Client</label>
          <div className="mb-2 flex gap-1 rounded-lg bg-surface-raised p-1 text-xs">
            <button
              type="button"
              onClick={() => setClientMode("existing")}
              className={`flex-1 rounded-md px-3 py-1.5 transition-colors ${
                clientMode === "existing"
                  ? "bg-surface shadow-[var(--shadow-soft)]"
                  : "text-subtle"
              }`}
            >
              Existing client
            </button>
            <button
              type="button"
              onClick={() => setClientMode("new")}
              className={`flex-1 rounded-md px-3 py-1.5 transition-colors ${
                clientMode === "new"
                  ? "bg-surface shadow-[var(--shadow-soft)]"
                  : "text-subtle"
              }`}
            >
              New client
            </button>
          </div>
          {clientMode === "existing" ? (
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className={selectClass}
            >
              <option value="">Select a client…</option>
              {clients.map((c) => {
                const pod = pods.find((p) => p.id === c.pod_id);
                return (
                  <option key={c.id} value={c.id}>
                    {c.name} · {pod?.name ?? ","}
                  </option>
                );
              })}
            </select>
          ) : (
            <div className="space-y-3">
              <input
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="Client name"
                className={inputClass}
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Pod</label>
                  <select
                    value={newClientPodId || suggestedPodId}
                    onChange={(e) => setNewClientPodId(e.target.value)}
                    className={selectClass}
                  >
                    {pods.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {p.tagline}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Retainer</label>
                  <select
                    value={newClientTier}
                    onChange={(e) =>
                      setNewClientTier(e.target.value as RetainerTier)
                    }
                    className={selectClass}
                  >
                    <option value="none">None, project only</option>
                    <option value="8k">£8k retainer</option>
                    <option value="12k">£12k retainer</option>
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs text-foreground">
                <input
                  type="checkbox"
                  checked={newClientBrandWarm}
                  onChange={(e) => setNewClientBrandWarm(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                Brand-warm (returning, retainer, or worked with in last 6 months)
              </label>
            </div>
          )}

          {existingClient && (
            <div className="mt-2 rounded-lg bg-background px-3 py-2 text-[11px] text-subtle">
              Pod: <span className="font-medium text-foreground">
                {pods.find((p) => p.id === existingClient.pod_id)?.name ?? ","}
              </span>
              {existingClient.brand_warm && (
                <span className="ml-2 font-medium text-orange-700">Brand-warm</span>
              )}
            </div>
          )}
        </div>

        {/* Project name */}
        <div>
          <label className={labelClass}>Project name</label>
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="e.g. PDP rebuild Q2"
            className={inputClass}
          />
        </div>

        {/* Pages */}
        <div>
          <div className="flex items-center justify-between">
            <label className={labelClass}>Pages</label>
            <button
              type="button"
              onClick={addPage}
              className="inline-flex items-center gap-1 text-xs text-foreground hover:opacity-70"
            >
              <PlusIcon className="size-3.5" />
              Add page
            </button>
          </div>
          <div className="space-y-2">
            {pages.map((p, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 rounded-lg border border-border bg-background p-2"
              >
                <select
                  value={p.type}
                  onChange={(e) =>
                    updatePage(idx, { type: e.target.value as PageType })
                  }
                  className={`${selectClass} flex-1`}
                >
                  {(Object.keys(PAGE_LABEL) as PageType[]).map((t) => (
                    <option key={t} value={t}>
                      {PAGE_LABEL[t]}
                    </option>
                  ))}
                </select>
                <select
                  value={p.weight}
                  onChange={(e) =>
                    updatePage(idx, {
                      weight: e.target.value as PageWeight,
                    })
                  }
                  className={`${selectClass} w-32`}
                >
                  <option value="heavy">Heavy · 3pt</option>
                  <option value="medium">Medium · 2pt</option>
                  <option value="light">Light · 1pt</option>
                </select>
                <button
                  type="button"
                  onClick={() => removePage(idx)}
                  className="rounded p-1.5 text-subtle hover:bg-rose-500/10 hover:text-rose-300"
                >
                  <TrashIcon className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Sign-off + Rush */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Sign-off date</label>
            <input
              type="date"
              value={signoffDate}
              onChange={(e) => setSignoffDate(e.target.value)}
              className={inputClass}
            />
            <p className="mt-1 text-[10px] text-subtle">
              {formatLongDate(signoffDate)}
            </p>
          </div>
          <div>
            <label className={labelClass}>Sign-off hour (24h)</label>
            <input
              type="number"
              min={0}
              max={23}
              value={signoffHour}
              onChange={(e) => setSignoffHour(Number(e.target.value))}
              className={inputClass}
            />
            <p className="mt-1 text-[10px] text-subtle">
              Friday after 5pm or weekend pushes to next-next Monday.
            </p>
          </div>
        </div>

        <label className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm">
          <input
            type="checkbox"
            checked={isRush}
            onChange={(e) => setIsRush(e.target.checked)}
            className="h-4 w-4 rounded border-rose-300"
          />
          <div>
            <div className="text-rose-900">Rush, kicks off off-cycle</div>
            <div className="text-[10px] text-rose-700">
              Skips the Monday-only rule. Logged but allowed.
            </div>
          </div>
        </label>

        {/* Live preview */}
        <div className="rounded-xl border border-border bg-background p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-subtle">
            System preview
          </div>
          <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
            <PreviewStat
              label="Raw points"
              value={totalPointsRaw.toString()}
              sub={brandWarm ? `× 0.5 brand-warm` : undefined}
            />
            <PreviewStat
              label="Adjusted"
              value={totalPoints.toString()}
            />
            <div>
              <div className="text-[9px] font-semibold uppercase tracking-wider text-subtle">
                Bucket
              </div>
              <div className="mt-1.5">
                <BucketBadge bucket={bucket} />
              </div>
            </div>
            <PreviewStat
              label="Pod"
              value={pods.find((p) => p.id === suggestedPodId)?.name ?? ","}
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3">
            <div>
              <div className="text-[9px] font-semibold uppercase tracking-wider text-subtle">
                Kickoff Monday
              </div>
              <div className="mt-0.5 text-sm font-medium">
                {formatLongDate(kickoff)}
              </div>
            </div>
            <div>
              <div className="text-[9px] font-semibold uppercase tracking-wider text-subtle">
                Ship date (client)
              </div>
              <div className="mt-0.5 text-sm font-medium">
                {delivery ? formatLongDate(delivery) : "Bespoke, set manually"}
              </div>
              {internalTarget && (
                <div className="text-[10px] text-subtle">
                  internal target {formatLongDate(internalTarget)} (−1 day buffer)
                </div>
              )}
            </div>
          </div>

          {/* Capacity-aware promise check */}
          <div
            className={`mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-[12px] ${
              overCapacity
                ? "border-rose-200 bg-rose-50 text-rose-800"
                : nearCapacity
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            <span className="font-semibold tabular-nums">{projectedUsed}/{podCap} pts</span>
            <span className="opacity-90">
              {overCapacity
                ? "· This pod is over capacity — that ship date isn't realistic. Route to a pod with headroom or push the date before promising the client."
                : nearCapacity
                  ? "· Near capacity (85%+). Doable but tight — keep an eye on it."
                  : "· Capacity OK — this date is realistic to promise."}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
          <Link
            href="/pods-v2"
            className="rounded-lg px-3 py-2 text-xs text-subtle hover:text-foreground"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white bg-surface px-4 py-2 text-sm font-medium text-white shadow-[var(--shadow-soft)] transition-colors hover:bg-foreground"
          >
            Create project
          </button>
        </div>
      </form>
    </div>
  );
}

function PreviewStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div>
      <div className="text-[9px] font-semibold uppercase tracking-wider text-subtle">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums">{value}</div>
      {sub && <div className="text-[10px] text-subtle">{sub}</div>}
    </div>
  );
}
