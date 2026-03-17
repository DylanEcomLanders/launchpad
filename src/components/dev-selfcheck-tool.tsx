"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  PlusIcon,
  TrashIcon,
  ChevronDownIcon,
  ChatBubbleLeftIcon,
} from "@heroicons/react/24/solid";
import { DecorativeBlocks } from "@/components/decorative-blocks";
import { inputClass, labelClass, selectClass } from "@/lib/form-styles";
import {
  selfCheckCategories,
  defaultSelfCheckItems,
  type SelfCheckCategory,
  type SelfCheckResult,
  type SelfCheckItem,
} from "@/data/dev-selfcheck-items";
import { getPortals } from "@/lib/portal/data";
import type { PortalData } from "@/lib/portal/types";

let nextId = 1;
function uid() {
  return `sc-${nextId++}`;
}

function buildDefaultItems(): SelfCheckItem[] {
  const items: SelfCheckItem[] = [];
  for (const cat of selfCheckCategories) {
    for (const desc of defaultSelfCheckItems[cat]) {
      items.push({ id: uid(), category: cat, description: desc, result: "", notes: "" });
    }
  }
  return items;
}

const resultCycle: SelfCheckResult[] = ["", "pass", "fail", "na"];

function nextResult(current: SelfCheckResult): SelfCheckResult {
  const i = resultCycle.indexOf(current);
  return resultCycle[(i + 1) % resultCycle.length];
}

const resultStyles: Record<SelfCheckResult, { label: string; bg: string; text: string }> = {
  "": { label: "\u2014", bg: "bg-[#F5F5F5]", text: "text-[#CCCCCC]" },
  pass: { label: "Pass", bg: "bg-emerald-50", text: "text-emerald-600" },
  fail: { label: "Fail", bg: "bg-red-50", text: "text-red-500" },
  na: { label: "N/A", bg: "bg-[#F5F5F5]", text: "text-[#999999]" },
};

export function DevSelfCheckTool({ prefillClient }: { prefillClient?: string } = {}) {
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState(prefillClient || "");
  const [devName, setDevName] = useState("");
  const [items, setItems] = useState<SelfCheckItem[]>(buildDefaultItems);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [notesOpen, setNotesOpen] = useState<Record<string, boolean>>({});
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState("");
  const [copiedReport, setCopiedReport] = useState(false);
  const [portals, setPortals] = useState<PortalData[]>([]);
  const [linkedPortal, setLinkedPortal] = useState("");

  useEffect(() => {
    getPortals().then(setPortals).catch(() => {});
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<SelfCheckItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const addCustomItem = (category: SelfCheckCategory) => {
    if (!newItemText.trim()) return;
    const item: SelfCheckItem = {
      id: uid(),
      category,
      description: newItemText.trim(),
      result: "",
      notes: "",
    };
    setItems((prev) => [...prev, item]);
    setNewItemText("");
    setAddingTo(null);
  };

  const stats = useMemo(() => {
    const total = items.length;
    const pass = items.filter((i) => i.result === "pass").length;
    const fail = items.filter((i) => i.result === "fail").length;
    const na = items.filter((i) => i.result === "na").length;
    const unchecked = items.filter((i) => i.result === "").length;
    const checked = total - unchecked;
    return { total, pass, fail, na, unchecked, checked };
  }, [items]);

  const categoryStats = useMemo(() => {
    const map: Record<string, { total: number; pass: number; fail: number; na: number }> = {};
    for (const cat of selfCheckCategories) {
      const catItems = items.filter((i) => i.category === cat);
      map[cat] = {
        total: catItems.length,
        pass: catItems.filter((i) => i.result === "pass").length,
        fail: catItems.filter((i) => i.result === "fail").length,
        na: catItems.filter((i) => i.result === "na").length,
      };
    }
    return map;
  }, [items]);

  function resetAll() {
    setItems(buildDefaultItems());
    setProjectName("");
    setClientName("");
    setDevName("");
    setCopiedReport(false);
  }

  function generateReport(): string {
    const lines: string[] = [];
    lines.push(`DEV SELF-CHECK REPORT`);
    lines.push(`${"─".repeat(40)}`);
    if (projectName) lines.push(`Project: ${projectName}`);
    if (clientName) lines.push(`Client: ${clientName}`);
    if (devName) lines.push(`Developer: ${devName}`);
    lines.push(`Date: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`);
    lines.push("");
    lines.push(`Summary: ${stats.pass} pass \u00B7 ${stats.fail} fail \u00B7 ${stats.na} N/A \u00B7 ${stats.unchecked} unchecked`);
    lines.push("");

    for (const cat of selfCheckCategories) {
      const catItems = items.filter((i) => i.category === cat);
      const s = categoryStats[cat];
      lines.push(`## ${cat} (${s.pass}/${s.total - s.na})`);

      for (const item of catItems) {
        const icon = item.result === "pass" ? "\u2713" : item.result === "fail" ? "\u2717" : item.result === "na" ? "\u2014" : "\u25CB";
        lines.push(`  ${icon} ${item.description}`);
        if (item.notes) lines.push(`    \u2192 ${item.notes}`);
      }
      lines.push("");
    }

    // Fail summary
    const fails = items.filter((i) => i.result === "fail");
    if (fails.length > 0) {
      lines.push(`ISSUES FOUND (${fails.length})`);
      lines.push(`${"─".repeat(40)}`);
      fails.forEach((f, i) => {
        lines.push(`${i + 1}. [${f.category}] ${f.description}`);
        if (f.notes) lines.push(`   \u2192 ${f.notes}`);
      });
    }

    return lines.join("\n");
  }

  function copyReport() {
    navigator.clipboard.writeText(generateReport());
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  }

  const passRate = stats.checked > 0 ? Math.round((stats.pass / (stats.checked - stats.na)) * 100) : 0;

  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-12 py-16 md:py-24">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            Dev Self-Check
          </h1>
          <p className="text-[#6B6B6B]">
            Run through this checklist before handing off to QA — catch issues before they cost you time
          </p>
        </div>

        {/* Project Info */}
        <div className="bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg p-5 space-y-4 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Project Name</label>
              <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="e.g. Lumière Homepage" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Client</label>
              <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="e.g. Lumière Skincare" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Developer</label>
              <input type="text" value={devName} onChange={(e) => setDevName(e.target.value)} placeholder="e.g. JL" className={inputClass} />
            </div>
          </div>
          {portals.length > 0 && (
            <div>
              <label className={labelClass}>Link to Portal</label>
              <select
                className={selectClass}
                value={linkedPortal}
                onChange={(e) => {
                  setLinkedPortal(e.target.value);
                  const portal = portals.find((p) => p.id === e.target.value);
                  if (portal) {
                    setClientName(portal.client_name);
                  }
                }}
              >
                <option value="">None (standalone check)</option>
                {portals.map((p) => (
                  <option key={p.id} value={p.id}>{p.client_name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="bg-white border border-[#E5E5E5] rounded-lg p-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA] mb-1">Pass Rate</p>
            <p className={`text-xl font-bold ${passRate >= 90 ? "text-emerald-500" : passRate >= 70 ? "text-amber-500" : stats.checked === 0 ? "text-[#CCCCCC]" : "text-red-500"}`}>
              {stats.checked > 0 ? `${passRate}%` : "\u2014"}
            </p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 mb-1">Pass</p>
            <p className="text-xl font-bold text-emerald-600">{stats.pass}</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-red-300 mb-1">Fail</p>
            <p className="text-xl font-bold text-red-500">{stats.fail}</p>
          </div>
          <div className="bg-white border border-[#E5E5E5] rounded-lg p-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAAAAA] mb-1">Unchecked</p>
            <p className="text-xl font-bold text-[#999999]">{stats.unchecked}</p>
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-6 mb-10">
          {selfCheckCategories.map((cat) => {
            const catItems = items.filter((i) => i.category === cat);
            const catStat = categoryStats[cat];
            const isCollapsed = collapsed[cat];

            return (
              <div key={cat} className="bg-white border border-[#E5E5E5] rounded-lg overflow-hidden">
                {/* Category header */}
                <button
                  onClick={() => setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }))}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#FAFAFA] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <ChevronDownIcon className={`size-3.5 text-[#AAAAAA] transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
                    <span className="text-sm font-semibold">{cat}</span>
                    <span className="text-[10px] text-[#AAAAAA]">
                      {catStat.pass}/{catStat.total - catStat.na} pass
                    </span>
                  </div>
                  {catStat.fail > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-red-50 text-red-500 rounded-full">
                      {catStat.fail} fail
                    </span>
                  )}
                </button>

                {/* Items */}
                {!isCollapsed && (
                  <div className="border-t border-[#F0F0F0]">
                    {catItems.map((item) => {
                      const style = resultStyles[item.result];
                      return (
                        <div key={item.id} className="border-b border-[#F0F0F0] last:border-b-0">
                          <div className="flex items-center gap-3 px-5 py-3">
                            {/* Result toggle */}
                            <button
                              onClick={() => updateItem(item.id, { result: nextResult(item.result) })}
                              className={`shrink-0 px-2.5 py-1 text-[10px] font-semibold rounded-md ${style.bg} ${style.text} transition-colors min-w-[48px] text-center`}
                            >
                              {style.label}
                            </button>
                            {/* Description */}
                            <span className={`flex-1 text-sm ${item.result === "pass" ? "text-[#999999] line-through" : ""}`}>
                              {item.description}
                            </span>
                            {/* Actions */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => setNotesOpen((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                                className={`p-1 rounded transition-colors ${
                                  item.notes ? "text-blue-500" : "text-[#CCCCCC] hover:text-[#999999]"
                                }`}
                                title="Notes"
                              >
                                <ChatBubbleLeftIcon className="size-3.5" />
                              </button>
                              <button
                                onClick={() => removeItem(item.id)}
                                className="p-1 text-[#CCCCCC] hover:text-red-400 transition-colors"
                                title="Remove"
                              >
                                <TrashIcon className="size-3.5" />
                              </button>
                            </div>
                          </div>
                          {/* Notes */}
                          {notesOpen[item.id] && (
                            <div className="px-5 pb-3">
                              <input
                                type="text"
                                value={item.notes}
                                onChange={(e) => updateItem(item.id, { notes: e.target.value })}
                                placeholder="Add a note..."
                                className="w-full px-3 py-2 text-xs bg-[#FAFAFA] border border-[#E5E5E5] rounded-md focus:outline-none focus:border-[#999999]"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Add custom item */}
                    {addingTo === cat ? (
                      <div className="flex items-center gap-2 px-5 py-3">
                        <input
                          type="text"
                          value={newItemText}
                          onChange={(e) => setNewItemText(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && addCustomItem(cat)}
                          placeholder="Describe the check..."
                          className="flex-1 px-3 py-2 text-xs bg-[#FAFAFA] border border-[#E5E5E5] rounded-md focus:outline-none focus:border-[#999999]"
                          autoFocus
                        />
                        <button
                          onClick={() => addCustomItem(cat)}
                          disabled={!newItemText.trim()}
                          className="px-3 py-2 text-xs font-medium bg-[#0A0A0A] text-white rounded-md hover:bg-[#2A2A2A] transition-colors disabled:opacity-40"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => { setAddingTo(null); setNewItemText(""); }}
                          className="px-3 py-2 text-xs text-[#999999] hover:text-[#0A0A0A]"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingTo(cat)}
                        className="flex items-center gap-1.5 px-5 py-3 text-xs text-[#AAAAAA] hover:text-[#6B6B6B] transition-colors w-full"
                      >
                        <PlusIcon className="size-3" />
                        Add item
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={copyReport}
            disabled={stats.checked === 0}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-md transition-all ${
              copiedReport
                ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                : "bg-[#0A0A0A] text-white hover:bg-[#2A2A2A] disabled:opacity-40 disabled:cursor-not-allowed"
            }`}
          >
            {copiedReport ? "Copied Report!" : "Copy Report"}
          </button>
          <button
            onClick={resetAll}
            className="flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-md border border-[#E5E5E5] bg-white text-[#6B6B6B] hover:border-[#CCCCCC] hover:text-[#0A0A0A] transition-colors"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
