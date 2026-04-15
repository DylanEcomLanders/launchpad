"use client";

import { useState, useCallback } from "react";
import type { GateData, GateCheckItem, GateKey, PortalProject } from "@/lib/portal/types";
import type { PortalData } from "@/lib/portal/types";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";

// Gate definitions — the checklist items for each gate
const gateDefinitions: Record<GateKey, { title: string; description: string; items: string[] }> = {
  "design-brief": {
    title: "Design Brief",
    description: "Confirm the brief is complete before design starts. Every item must be covered so the designer can work without guessing.",
    items: [
      "Site walkthrough completed — existing pages screenshotted and reviewed",
      "Competitor post-click review done (2-3 competitors)",
      "Page audience defined (cold traffic / retargeting / existing customers)",
      "Page objective defined (one clear job for this page)",
      "Section-by-section breakdown written",
      "Copy direction agreed (key messages, CTAs, tone)",
      "Reference screenshots / inspiration gathered",
      "Brief reviewed and signed off by PM or lead",
    ],
  },
  "dev-handover": {
    title: "Dev Handover",
    description: "The handoff must be complete enough that the developer can build without asking the designer a single question.",
    items: [
      "Desktop design complete (1440px viewport, 1200px max-content)",
      "Mobile design complete (375px viewport)",
      "All copy is final — zero placeholder text",
      "Hover states designed for every interactive element",
      "Spacing and padding documented",
      "Font sizes, weights, line heights specified",
      "Colour values reference design system",
      "Assets exported (WebP, SVG, PNG as needed)",
      "Interaction annotations written (trigger, behaviour, duration, easing)",
      "Responsive breakpoint notes added",
      "Handoff page created in Figma with all specs",
      "Client has approved the design (written confirmation)",
    ],
  },
  "dev-qa": {
    title: "Dev QA",
    description: "The developer must self-QA before submitting for internal review. This catches 80% of issues before anyone else sees them.",
    items: [
      "Page matches Figma design on desktop (overlay check)",
      "Page matches Figma design on mobile (375px)",
      "All links work and point to correct destinations",
      "All images load and are optimised (WebP, lazy-loaded)",
      "Hover states match design specs",
      "Animations work with correct timing and easing",
      "Forms submit correctly (if applicable)",
      "Page loads under 3 seconds on mobile (Lighthouse check)",
      "No console errors",
      "No broken layouts between 320px and 1600px",
      "Copy matches approved design exactly (no typos)",
      "Cross-browser check: Chrome, Safari, Firefox",
    ],
  },
  "handoff-testing": {
    title: "Handoff / Testing",
    description: "Before the page goes live, the launch method and testing setup must be confirmed.",
    items: [
      "Client has approved the staging/preview version (written confirmation)",
      "Go-live date and time confirmed with client",
      "Redirects set up (if replacing an existing page)",
      "Analytics tracking confirmed (GA4 events, UTMs)",
      "Meta pixel / tracking pixels verified",
      "Backup of existing page taken (if replacing)",
      "Test method confirmed (A/B, before/after, or direct launch)",
      "Baseline metrics recorded (if testing)",
      "Team available post-launch for immediate fixes",
    ],
  },
};

interface GateChecklistFormProps {
  gateKey: GateKey;
  project: PortalProject;
  portal: PortalData;
  onUpdate: (gateData: GateData) => Promise<void>;
}

export function GateChecklistForm({ gateKey, project, portal, onUpdate }: GateChecklistFormProps) {
  const definition = gateDefinitions[gateKey];
  const existing = project.gates?.[gateKey];

  // Initialize from existing data or create fresh
  const [items, setItems] = useState<GateCheckItem[]>(() => {
    if (existing?.items?.length) return existing.items;
    return definition.items.map((label, i) => ({
      id: `${gateKey}-${i}`,
      label,
      checked: false,
    }));
  });
  const [notes, setNotes] = useState(existing?.notes || "");
  const [saving, setSaving] = useState(false);

  const checkedCount = items.filter((i) => i.checked).length;
  const allChecked = checkedCount === items.length;
  const status = existing?.status || "not-started";
  const isCompleted = status === "passed" || status === "failed";

  const toggleItem = useCallback((id: string) => {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, checked: !item.checked } : item));
  }, []);

  const saveGate = useCallback(async (newStatus: GateData["status"]) => {
    setSaving(true);
    const gateData: GateData = {
      status: newStatus,
      items,
      notes,
      completed_by: newStatus === "passed" || newStatus === "failed" ? "team" : undefined,
      completed_at: newStatus === "passed" || newStatus === "failed" ? new Date().toISOString() : undefined,
    };
    await onUpdate(gateData);
    setSaving(false);
  }, [items, notes, onUpdate]);

  const resetGate = useCallback(async () => {
    const freshItems = definition.items.map((label, i) => ({
      id: `${gateKey}-${i}`,
      label,
      checked: false,
    }));
    setItems(freshItems);
    setNotes("");
    setSaving(true);
    await onUpdate({
      status: "not-started",
      items: freshItems,
      notes: "",
    });
    setSaving(false);
  }, [definition, gateKey, onUpdate]);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-lg font-bold text-[#1A1A1A]">{definition.title}</h2>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              status === "passed" ? "bg-emerald-100 text-emerald-700" :
              status === "failed" ? "bg-red-100 text-red-700" :
              status === "in-progress" ? "bg-amber-100 text-amber-700" :
              "bg-[#F0F0F0] text-[#999]"
            }`}>
              {status === "not-started" ? "Not Started" : status === "in-progress" ? "In Progress" : status === "passed" ? "Passed" : "Failed"}
            </span>
          </div>
          <p className="text-xs text-[#777] max-w-lg">{definition.description}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-bold text-[#1A1A1A] tabular-nums">{checkedCount}/{items.length}</p>
          <p className="text-[10px] text-[#AAA]">completed</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-[#F0F0F0] rounded-full mb-6 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            allChecked ? "bg-emerald-500" : checkedCount > 0 ? "bg-amber-400" : "bg-[#E0E0E0]"
          }`}
          style={{ width: `${(checkedCount / items.length) * 100}%` }}
        />
      </div>

      {/* Checklist */}
      <div className="space-y-1 mb-6">
        {items.map((item) => (
          <label
            key={item.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors ${
              item.checked ? "bg-emerald-50/50" : "hover:bg-[#FAFAFA]"
            } ${isCompleted ? "opacity-60 pointer-events-none" : ""}`}
          >
            <input
              type="checkbox"
              checked={item.checked}
              onChange={() => toggleItem(item.id)}
              disabled={isCompleted}
              className="size-4 rounded border-[#CCC] text-emerald-600 focus:ring-0 mt-0.5 cursor-pointer"
            />
            <span className={`text-sm leading-relaxed ${item.checked ? "text-[#999] line-through" : "text-[#333]"}`}>
              {item.label}
            </span>
          </label>
        ))}
      </div>

      {/* Notes */}
      <div className="mb-6">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] block mb-2">
          Notes / Issues
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isCompleted}
          placeholder="Any blockers, missing items, or notes for this gate..."
          className="w-full min-h-[80px] text-sm px-4 py-3 border border-[#E5E5EA] rounded-xl focus:outline-none focus:border-[#999] placeholder:text-[#DDD] resize-y disabled:opacity-50"
        />
      </div>

      {/* Actions */}
      {!isCompleted ? (
        <div className="flex items-center gap-3">
          <button
            onClick={() => saveGate("in-progress")}
            disabled={saving}
            className="px-4 py-2 text-xs font-medium border border-[#E5E5EA] text-[#666] rounded-lg hover:bg-[#FAFAFA] transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Progress"}
          </button>
          <button
            onClick={() => saveGate("passed")}
            disabled={saving || !allChecked}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-40"
          >
            <CheckCircleIcon className="size-3.5" />
            Pass Gate
          </button>
          <button
            onClick={() => saveGate("failed")}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-40"
          >
            <XCircleIcon className="size-3.5" />
            Fail Gate
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {status === "passed" ? (
              <CheckCircleIcon className="size-5 text-emerald-500" />
            ) : (
              <XCircleIcon className="size-5 text-red-500" />
            )}
            <span className="text-sm text-[#666]">
              {status === "passed" ? "Gate passed" : "Gate failed"}
              {existing?.completed_at && (
                <span className="text-[#AAA] ml-1">
                  — {new Date(existing.completed_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              )}
            </span>
          </div>
          <button
            onClick={resetGate}
            disabled={saving}
            className="text-xs text-[#AAA] hover:text-[#1A1A1A] transition-colors"
          >
            Reset Gate
          </button>
        </div>
      )}
    </div>
  );
}
