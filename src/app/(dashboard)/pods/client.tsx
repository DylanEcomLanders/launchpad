"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ensureSeedPods, getPods, createPod } from "@/lib/pods/data";
import { getPortals } from "@/lib/portal/data";
import type { Pod, PodTier } from "@/lib/pods/types";
import { TIER_LABEL, TIER_COLOR } from "@/lib/pods/types";
import type { PortalData } from "@/lib/portal/types";
import { inputClass, selectClass, labelClass } from "@/lib/form-styles";
import { PlusIcon, UsersIcon, BriefcaseIcon } from "@heroicons/react/24/outline";

export default function PodsIndexClient() {
  const [pods, setPods] = useState<Pod[]>([]);
  const [portals, setPortals] = useState<PortalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    (async () => {
      await ensureSeedPods();
      const [p, ports] = await Promise.all([getPods(), getPortals()]);
      setPods(p);
      setPortals(ports);
      setLoading(false);
    })();
  }, []);

  const podStats = useMemo(() => {
    const map: Record<string, { clients: number; activeProjects: number }> = {};
    for (const pod of pods) {
      const clients = portals.filter((p) => p.pod_id === pod.id);
      const activeProjects = clients.reduce(
        (sum, c) => sum + (c.projects ?? []).filter((proj) => proj.status === "active").length,
        0
      );
      map[pod.id] = { clients: clients.length, activeProjects };
    }
    return map;
  }, [pods, portals]);

  async function handleCreate(data: { name: string; description: string; tier: PodTier; am_name: string; designer_name: string; dev_name: string }) {
    const created = await createPod(data);
    setPods((prev) => [...prev, created]);
    setShowNew(false);
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#999] mb-1">Pilot · v0.5</p>
            <h1 className="text-2xl font-bold text-[#1A1A1A]">Pod Dashboard</h1>
            <p className="text-sm text-[#666] mt-1">Pod-based delivery model — each pod owns a roster of clients end-to-end.</p>
          </div>
          <button
            onClick={() => setShowNew((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1B1B1B] text-white rounded-lg text-sm font-medium hover:bg-[#333] transition-colors"
          >
            <PlusIcon className="size-4" />
            New Pod
          </button>
        </header>

        {showNew && <NewPodForm onSubmit={handleCreate} onCancel={() => setShowNew(false)} />}

        {loading ? (
          <p className="text-sm text-[#999]">Loading pods…</p>
        ) : pods.length === 0 ? (
          <p className="text-sm text-[#999]">No pods yet. Click “New Pod” to create one.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pods.map((pod) => {
              const stats = podStats[pod.id] || { clients: 0, activeProjects: 0 };
              const tierStyle = TIER_COLOR[pod.tier];
              return (
                <Link
                  key={pod.id}
                  href={`/pods/${pod.id}`}
                  className="block rounded-xl border border-[#E5E5EA] bg-white p-5 hover:border-[#1B1B1B] transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0 flex-1 pr-2">
                      <h2 className="text-base font-semibold text-[#1A1A1A] truncate">{pod.name}</h2>
                      {pod.description && (
                        <p className="text-xs text-[#777] mt-1 line-clamp-2">{pod.description}</p>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider border ${tierStyle.bg} ${tierStyle.text} ${tierStyle.border}`}
                    >
                      {TIER_LABEL[pod.tier]}
                    </span>
                  </div>

                  <div className="space-y-1 mb-4 text-xs text-[#666]">
                    <div className="flex justify-between"><span className="text-[#999]">AM</span><span className="font-medium text-[#1A1A1A]">{pod.am_name || "—"}</span></div>
                    <div className="flex justify-between"><span className="text-[#999]">Designer</span><span className="font-medium text-[#1A1A1A]">{pod.designer_name || "—"}</span></div>
                    <div className="flex justify-between"><span className="text-[#999]">Dev</span><span className="font-medium text-[#1A1A1A]">{pod.dev_name || "—"}</span></div>
                  </div>

                  <div className="flex gap-3 pt-3 border-t border-[#EDEDEF]">
                    <div className="flex-1">
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-[#999] mb-0.5 flex items-center gap-1"><UsersIcon className="size-3" />Clients</p>
                      <p className="text-lg font-bold text-[#1A1A1A]">{stats.clients}</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-[#999] mb-0.5 flex items-center gap-1"><BriefcaseIcon className="size-3" />Active</p>
                      <p className="text-lg font-bold text-[#1A1A1A]">{stats.activeProjects}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <p className="text-[10px] text-[#999] mt-10">
          P&amp;L view (revenue / contractor cost / margin) lands in v0.6 once invoice + payout persistence ships.
        </p>
      </div>
    </div>
  );
}

function NewPodForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: { name: string; description: string; tier: PodTier; am_name: string; designer_name: string; dev_name: string }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tier, setTier] = useState<PodTier>("standard");
  const [amName, setAmName] = useState("");
  const [designerName, setDesignerName] = useState("");
  const [devName, setDevName] = useState("");

  return (
    <div className="rounded-xl border border-[#E5E5EA] bg-white p-5 mb-6">
      <h3 className="text-sm font-semibold text-[#1A1A1A] mb-4">Create pod</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Name</label>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Pod 3 — Sprint" />
        </div>
        <div>
          <label className={labelClass}>Tier</label>
          <select className={selectClass} value={tier} onChange={(e) => setTier(e.target.value as PodTier)}>
            <option value="premium">Premium</option>
            <option value="standard">Standard</option>
            <option value="sprint">Sprint</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className={labelClass}>Description</label>
          <input className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description" />
        </div>
        <div>
          <label className={labelClass}>Account manager</label>
          <input className={inputClass} value={amName} onChange={(e) => setAmName(e.target.value)} placeholder="Alister" />
        </div>
        <div>
          <label className={labelClass}>Designer</label>
          <input className={inputClass} value={designerName} onChange={(e) => setDesignerName(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Developer</label>
          <input className={inputClass} value={devName} onChange={(e) => setDevName(e.target.value)} />
        </div>
      </div>
      <div className="flex gap-2 mt-5">
        <button
          onClick={() => onSubmit({ name, description, tier, am_name: amName, designer_name: designerName, dev_name: devName })}
          disabled={!name.trim()}
          className="px-4 py-2 bg-[#1B1B1B] text-white rounded-lg text-sm font-medium hover:bg-[#333] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Create
        </button>
        <button onClick={onCancel} className="px-4 py-2 bg-[#F5F5F5] text-[#1A1A1A] rounded-lg text-sm font-medium hover:bg-[#EEE]">
          Cancel
        </button>
      </div>
    </div>
  );
}
