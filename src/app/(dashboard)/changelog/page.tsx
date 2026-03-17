"use client";

import { useState, useEffect, useCallback } from "react";
import {
  SparklesIcon,
  WrenchScrewdriverIcon,
  BugAntIcon,
  TrashIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import {
  RocketLaunchIcon,
  ClockIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import {
  getChangelog,
  getRoadmap,
  addRoadmapItem,
  deleteRoadmapItem,
  updateRoadmapPriority,
  type ChangeType,
  type RoadmapPriority,
  type ChangelogEntry,
  type RoadmapItem,
} from "@/lib/changelog/data";
import { inputClass } from "@/lib/form-styles";

/* ── Config ── */

const typeConfig: Record<ChangeType, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  added: { label: "Added", color: "text-emerald-700", bg: "bg-emerald-50", icon: SparklesIcon },
  improved: { label: "Improved", color: "text-blue-700", bg: "bg-blue-50", icon: WrenchScrewdriverIcon },
  fixed: { label: "Fixed", color: "text-amber-700", bg: "bg-amber-50", icon: BugAntIcon },
  removed: { label: "Removed", color: "text-[#6B6B6B]", bg: "bg-[#F5F5F5]", icon: TrashIcon },
};

const priorityConfig: Record<RoadmapPriority, { label: string; icon: React.ElementType; dot: string; text: string }> = {
  next: { label: "Up Next", icon: RocketLaunchIcon, dot: "bg-[#0A0A0A]", text: "text-[#0A0A0A]" },
  planned: { label: "Planned", icon: ClockIcon, dot: "bg-amber-400", text: "text-amber-600" },
  exploring: { label: "Exploring", icon: CheckCircleIcon, dot: "bg-[#D4D4D4]", text: "text-[#AAAAAA]" },
};

/* ── Page ── */

export default function ChangelogPage() {
  const [tab, setTab] = useState<"changelog" | "roadmap">("changelog");
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);
  const [roadmapItems, setRoadmapItems] = useState<RoadmapItem[]>([]);
  const [showAddRoadmap, setShowAddRoadmap] = useState(false);

  const reload = useCallback(async () => {
    setChangelog(await getChangelog());
    setRoadmapItems(await getRoadmap());
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const groupedRoadmap = {
    next: roadmapItems.filter((i) => i.priority === "next"),
    planned: roadmapItems.filter((i) => i.priority === "planned"),
    exploring: roadmapItems.filter((i) => i.priority === "exploring"),
  };

  return (
    <div className="max-w-2xl mx-auto px-6 md:px-12 py-12">
      <div className="mb-8">
        <h1 className="text-xl font-semibold">Changelog</h1>
        <p className="text-sm text-[#6B6B6B] mt-1">
          What&apos;s new and improved in Launchpad.
        </p>
      </div>

      {/* Tab toggle + add button */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex gap-1 p-1 bg-[#F5F5F5] rounded-lg w-fit">
          <button
            onClick={() => setTab("changelog")}
            className={`px-3.5 py-1.5 text-sm rounded-md transition-colors ${
              tab === "changelog"
                ? "bg-white text-[#0A0A0A] font-medium shadow-sm"
                : "text-[#6B6B6B] hover:text-[#0A0A0A]"
            }`}
          >
            Updates
          </button>
          <button
            onClick={() => setTab("roadmap")}
            className={`px-3.5 py-1.5 text-sm rounded-md transition-colors ${
              tab === "roadmap"
                ? "bg-white text-[#0A0A0A] font-medium shadow-sm"
                : "text-[#6B6B6B] hover:text-[#0A0A0A]"
            }`}
          >
            Roadmap
          </button>
        </div>
        {tab === "roadmap" && (
          <button
            onClick={() => setShowAddRoadmap(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0A0A0A] text-white text-sm rounded-md hover:bg-[#333] transition-colors"
          >
            <PlusIcon className="size-3.5" />
            Add Idea
          </button>
        )}
      </div>

      {/* ── Add Roadmap form ── */}
      {showAddRoadmap && (
        <AddRoadmapForm
          onSave={() => { reload(); setShowAddRoadmap(false); }}
          onCancel={() => setShowAddRoadmap(false)}
        />
      )}

      {/* ── Roadmap tab ── */}
      {tab === "roadmap" && (
        <div className="space-y-8">
          {(["next", "planned", "exploring"] as RoadmapPriority[]).map((priority) => {
            const items = groupedRoadmap[priority];
            if (items.length === 0) return null;
            const config = priorityConfig[priority];
            const PIcon = config.icon;
            return (
              <div key={priority}>
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#E5E5E5]">
                  <PIcon className={`size-4 ${config.text}`} />
                  <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#0A0A0A]">
                    {config.label}
                  </h2>
                  <span className="text-[11px] text-[#AAAAAA] tabular-nums">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map((item) => (
                    <RoadmapCard
                      key={item.id}
                      item={item}
                      config={config}
                      onUpdate={() => reload()}
                    />
                  ))}
                </div>
              </div>
            );
          })}
          {roadmapItems.length === 0 && (
            <p className="text-sm text-[#AAAAAA] text-center py-8">No roadmap items yet. Add one above.</p>
          )}
        </div>
      )}

      {/* ── Changelog tab ── */}
      {tab === "changelog" && (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[7px] top-2 bottom-0 w-px bg-[#E5E5E5]" />

          <div className="space-y-10">
            {changelog.map((entry, idx) => (
              <div key={entry.id} className="relative pl-8">
                {/* Dot */}
                <div
                  className={`absolute left-0 top-1.5 size-[15px] rounded-full border-2 ${
                    idx === 0
                      ? "bg-[#0A0A0A] border-[#0A0A0A]"
                      : "bg-white border-[#D4D4D4]"
                  }`}
                />

                {/* Header */}
                <div className="flex items-baseline gap-3 mb-3">
                  <span className="text-sm font-semibold">{entry.title}</span>
                  <span className="text-[11px] text-[#AAAAAA] tabular-nums">{entry.version}</span>
                </div>
                <p className="text-[11px] text-[#AAAAAA] -mt-2 mb-3">{entry.date}</p>

                {/* Changes */}
                <div className="space-y-1.5">
                  {entry.changes.map((change, ci) => {
                    const config = typeConfig[change.type];
                    const Icon = config.icon;
                    return (
                      <div key={ci} className="flex items-start gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 mt-0.5 ${config.color} ${config.bg}`}
                        >
                          <Icon className="size-2.5" />
                          {config.label}
                        </span>
                        <span className="text-sm text-[#444]">{change.text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Roadmap Card ── */

function RoadmapCard({
  item,
  config,
  onUpdate,
}: {
  item: RoadmapItem;
  config: { dot: string };
  onUpdate: () => void;
}) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className="flex items-start gap-3 py-2.5 px-3 rounded-lg border border-[#E5E5E5] bg-white group relative"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <span className={`size-2 rounded-full shrink-0 mt-1.5 ${config.dot}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{item.title}</p>
        <p className="text-[12px] text-[#6B6B6B] mt-0.5">{item.description}</p>
        {item.addedBy && (
          <p className="text-[10px] text-[#AAAAAA] mt-1">Added by {item.addedBy}</p>
        )}
      </div>
      {showActions && (
        <div className="flex items-center gap-1 shrink-0">
          <select
            value={item.priority}
            onChange={async (e) => {
              await updateRoadmapPriority(item.id, e.target.value as RoadmapPriority);
              onUpdate();
            }}
            className="text-[11px] text-[#6B6B6B] bg-[#F5F5F5] border-none rounded px-1.5 py-1 focus:outline-none cursor-pointer"
          >
            <option value="next">Up Next</option>
            <option value="planned">Planned</option>
            <option value="exploring">Exploring</option>
          </select>
          <button
            onClick={async () => { await deleteRoadmapItem(item.id); onUpdate(); }}
            className="p-1 text-[#AAAAAA] hover:text-red-500 transition-colors"
            title="Remove"
          >
            <XMarkIcon className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Add Roadmap Form ── */

function AddRoadmapForm({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [addedBy, setAddedBy] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await addRoadmapItem({
      title: title.trim(),
      description: description.trim(),
      priority: "exploring" as RoadmapPriority,
      addedBy: addedBy.trim() || undefined,
    });
    onSave();
  }

  return (
    <form onSubmit={handleSubmit} className="mb-8 border border-[#E5E5E5] rounded-lg p-4 bg-[#FAFAFA]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">New Roadmap Idea</h3>
        <button type="button" onClick={onCancel} className="p-1 text-[#AAAAAA] hover:text-[#0A0A0A]">
          <XMarkIcon className="size-4" />
        </button>
      </div>

      <div className="space-y-3 mb-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Feature or idea name"
          className={inputClass}
          required
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short description (optional)"
          className={inputClass}
        />
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6B6B] mb-1.5 block">
            Your Name
          </label>
          <input
            value={addedBy}
            onChange={(e) => setAddedBy(e.target.value)}
            placeholder="Optional"
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-sm text-[#6B6B6B] hover:text-[#0A0A0A]">
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-1.5 bg-[#0A0A0A] text-white text-sm rounded-md hover:bg-[#333] transition-colors"
        >
          Add to Roadmap
        </button>
      </div>
    </form>
  );
}
