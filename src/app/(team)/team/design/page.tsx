"use client";

import { useState } from "react";
import {
  ClipboardDocumentIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/solid";
import { DecorativeBlocks } from "@/components/decorative-blocks";
import { gallerySections, type PageType } from "@/data/section-gallery";
import {
  pageChecklists,
  checklistPageTypes,
  type ChecklistPageType,
} from "@/data/page-checklists";

type Tab = "gallery" | "checklist";

const galleryFilters: (PageType | "All")[] = ["All", "PDP", "Collection", "Landing Page", "Homepage"];

const priorityStyles = {
  required: { label: "Required", bg: "bg-[#1B1B1B]", text: "text-white" },
  recommended: { label: "Recommended", bg: "bg-[#E5E5EA]", text: "text-[#3A3A3A]" },
  optional: { label: "Optional", bg: "bg-[#F3F3F5]", text: "text-[#999999]" },
};

export default function DesignDevPage() {
  const [activeTab, setActiveTab] = useState<Tab>("gallery");
  const [galleryFilter, setGalleryFilter] = useState<PageType | "All">("All");
  const [checklistType, setChecklistType] = useState<ChecklistPageType>("PDP");
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const filteredSections =
    galleryFilter === "All"
      ? gallerySections
      : gallerySections.filter((s) => s.pageTypes.includes(galleryFilter));

  const checklistItems = pageChecklists[checklistType];

  function toggleItem(name: string) {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function copyChecklist() {
    const lines: string[] = [];
    lines.push(`PAGE CHECKLIST: ${checklistType}`);
    lines.push("=".repeat(40));
    lines.push("");
    for (const item of checklistItems) {
      const check = checkedItems.has(item.sectionName) ? "x" : " ";
      const priority = item.priority.charAt(0).toUpperCase() + item.priority.slice(1);
      lines.push(`[${check}] ${item.sectionName} \u2014 ${item.purpose} (${priority})`);
    }
    const checked = checklistItems.filter((i) => checkedItems.has(i.sectionName)).length;
    lines.push("");
    lines.push(`${checked}/${checklistItems.length} completed`);
    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function resetChecklist() {
    setCheckedItems(new Set());
  }

  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-12 py-12 md:py-16">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
            Design & Dev
          </h1>
          <p className="text-[#7A7A7A] text-sm">
            Section reference gallery and component checklists for every page type
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex gap-1 mb-8 bg-[#EDEDEF] border border-[#E5E5EA] rounded-lg p-1 w-fit">
          <button
            onClick={() => setActiveTab("gallery")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === "gallery"
                ? "bg-white border border-[#E5E5EA] shadow-sm"
                : "text-[#7A7A7A] hover:text-[#3A3A3A]"
            }`}
          >
            Section Gallery
          </button>
          <button
            onClick={() => setActiveTab("checklist")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === "checklist"
                ? "bg-white border border-[#E5E5EA] shadow-sm"
                : "text-[#7A7A7A] hover:text-[#3A3A3A]"
            }`}
          >
            Page Checklist
          </button>
        </div>

        {/* ── Gallery Tab ── */}
        {activeTab === "gallery" && (
          <div>
            {/* Filter pills */}
            <div className="flex flex-wrap gap-2 mb-6">
              {galleryFilters.map((filter) => (
                <button
                  key={filter}
                  onClick={() => setGalleryFilter(filter)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                    galleryFilter === filter
                      ? "bg-[#1B1B1B] text-white"
                      : "bg-[#F3F3F5] text-[#7A7A7A] hover:bg-[#EBEBEB]"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Section cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSections.map((section) => (
                <div
                  key={section.id}
                  className="bg-white border border-[#E5E5EA] rounded-lg overflow-hidden"
                >
                  {/* Placeholder image */}
                  <div className="h-32 bg-[#F3F3F5] flex items-center justify-center">
                    <span className="text-sm font-semibold text-[#C5C5C5] uppercase tracking-wider">
                      {section.name}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <h3 className="text-sm font-semibold mb-1.5">{section.name}</h3>
                    <p className="text-xs text-[#7A7A7A] leading-relaxed mb-3">
                      {section.description}
                    </p>

                    {/* Best practices */}
                    <div className="space-y-1.5 mb-3">
                      {section.bestPractices.map((practice, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="size-1 rounded-full bg-[#C5C5C5] shrink-0 mt-1.5" />
                          <span className="text-[11px] text-[#999999] leading-relaxed">
                            {practice}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Page type badges */}
                    <div className="flex flex-wrap gap-1.5">
                      {section.pageTypes.map((pt) => (
                        <span
                          key={pt}
                          className="px-2 py-0.5 text-[10px] font-medium bg-[#F3F3F5] text-[#7A7A7A] rounded"
                        >
                          {pt}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Checklist Tab ── */}
        {activeTab === "checklist" && (
          <div>
            {/* Page type pills */}
            <div className="flex flex-wrap gap-2 mb-6">
              {checklistPageTypes.map((pt) => (
                <button
                  key={pt}
                  onClick={() => {
                    setChecklistType(pt);
                    setCheckedItems(new Set());
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                    checklistType === pt
                      ? "bg-[#1B1B1B] text-white"
                      : "bg-[#F3F3F5] text-[#7A7A7A] hover:bg-[#EBEBEB]"
                  }`}
                >
                  {pt}
                </button>
              ))}
            </div>

            {/* Progress */}
            <div className="bg-[#F3F3F5] border border-[#E5E5EA] rounded-lg px-5 py-3 mb-6 flex items-center justify-between">
              <span className="text-xs text-[#7A7A7A]">
                {checkedItems.size}/{checklistItems.length} sections checked
              </span>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-[#9B9FB5]">
                  {checklistItems.filter((i) => i.priority === "required").length} required
                </span>
              </div>
            </div>

            {/* Checklist items */}
            <div className="bg-white border border-[#E5E5EA] rounded-lg divide-y divide-[#EDEDEF]">
              {checklistItems.map((item) => {
                const isChecked = checkedItems.has(item.sectionName);
                const ps = priorityStyles[item.priority];

                return (
                  <div
                    key={item.sectionName}
                    className={`flex items-start gap-3 px-5 py-3.5 cursor-pointer hover:bg-[#F7F8FA] transition-colors ${
                      isChecked ? "opacity-60" : ""
                    }`}
                    onClick={() => toggleItem(item.sectionName)}
                  >
                    {/* Checkbox */}
                    <div className="pt-0.5 shrink-0">
                      {isChecked ? (
                        <CheckCircleIcon className="size-5 text-emerald-500" />
                      ) : (
                        <div className="size-5 rounded-full border-2 border-[#D4D4D4]" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className={`text-sm font-medium ${
                            isChecked ? "line-through text-[#999999]" : ""
                          }`}
                        >
                          {item.sectionName}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider rounded ${ps.bg} ${ps.text}`}
                        >
                          {ps.label}
                        </span>
                      </div>
                      <p className="text-xs text-[#999999] leading-relaxed">
                        {item.purpose}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={copyChecklist}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md transition-all ${
                  copied
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                    : "bg-[#1B1B1B] text-white hover:bg-[#2D2D2D]"
                }`}
              >
                <ClipboardDocumentIcon className="size-4" />
                {copied ? "Copied!" : "Copy Checklist"}
              </button>
              <button
                onClick={resetChecklist}
                className="px-4 py-2.5 text-sm font-medium border border-[#E5E5EA] bg-white text-[#7A7A7A] rounded-md hover:bg-[#F3F3F5] transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
