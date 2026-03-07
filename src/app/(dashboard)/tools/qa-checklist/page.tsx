"use client";

import { useState, useMemo, useCallback } from "react";
import {
  PlusIcon,
  TrashIcon,
  ChevronDownIcon,
  ChatBubbleLeftIcon,
} from "@heroicons/react/24/solid";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { DecorativeBlocks } from "@/components/decorative-blocks";
import {
  projectTypes,
  qaCategories,
  defaultQAItems,
  type QACategory,
  type QAResult,
  type QAItem,
  type QAFormData,
} from "@/lib/config";
import { QaReportPdfDocument } from "@/components/qa-report-pdf-document";
import { PdfPreview } from "@/components/pdf-preview";
import { inputClass, labelClass } from "@/lib/form-styles";

let nextId = 1;
function uid() {
  return `qa-${nextId++}`;
}

function buildDefaultItems(): QAItem[] {
  const items: QAItem[] = [];
  for (const cat of qaCategories) {
    for (const desc of defaultQAItems[cat]) {
      items.push({ id: uid(), category: cat, description: desc, result: "", notes: "" });
    }
  }
  return items;
}

const resultCycle: QAResult[] = ["", "pass", "fail", "skip"];

function nextResult(current: QAResult): QAResult {
  const i = resultCycle.indexOf(current);
  return resultCycle[(i + 1) % resultCycle.length];
}

export default function QAChecklistPage() {
  const [formData, setFormData] = useState<QAFormData>({
    projectName: "",
    clientName: "",
    projectType: "",
    testerName: "",
    testDate: new Date().toISOString().split("T")[0],
    items: buildDefaultItems(),
    summary: "",
  });

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [notesOpen, setNotesOpen] = useState<Record<string, boolean>>({});
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [generating, setGenerating] = useState(false);

  const updateField = <K extends keyof QAFormData>(key: K, value: QAFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setShowPreview(false);
  };

  const updateItem = useCallback((id: string, updates: Partial<QAItem>) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    }));
    setShowPreview(false);
  }, []);

  const removeItem = useCallback((id: string) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
    setShowPreview(false);
  }, []);

  const addCustomItem = (category: QACategory) => {
    if (!newItemText.trim()) return;
    const item: QAItem = {
      id: uid(),
      category,
      description: newItemText.trim(),
      result: "",
      notes: "",
    };
    setFormData((prev) => ({ ...prev, items: [...prev.items, item] }));
    setNewItemText("");
    setAddingTo(null);
    setShowPreview(false);
  };

  const handleReset = () => {
    if (!confirm("Reset all checklist results? This cannot be undone.")) return;
    setFormData((prev) => ({
      ...prev,
      items: buildDefaultItems(),
      summary: "",
    }));
    setCollapsed({});
    setNotesOpen({});
    setShowPreview(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 500));
    setShowPreview(true);
    setGenerating(false);
  };

  // Computed stats
  const stats = useMemo(() => {
    const all = formData.items;
    const pass = all.filter((i) => i.result === "pass").length;
    const fail = all.filter((i) => i.result === "fail").length;
    const skip = all.filter((i) => i.result === "skip").length;
    const checked = pass + fail + skip;
    const total = all.length;
    return { pass, fail, skip, checked, total, unchecked: total - checked };
  }, [formData.items]);

  const categoryStats = useMemo(() => {
    const map: Record<string, { total: number; checked: number; hasFail: boolean }> = {};
    for (const cat of qaCategories) {
      const items = formData.items.filter((i) => i.category === cat);
      const checked = items.filter((i) => i.result !== "").length;
      const hasFail = items.some((i) => i.result === "fail");
      map[cat] = { total: items.length, checked, hasFail };
    }
    return map;
  }, [formData.items]);

  const isFormValid = formData.projectName && formData.clientName && formData.testerName && formData.testDate;

  const overallVerdict = stats.fail > 0 ? "FAIL" : stats.checked === stats.total && stats.total > 0 ? "PASS" : "INCOMPLETE";

  const slug = formData.clientName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const dateSlug = formData.testDate.replace(/-/g, "");

  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-12 py-16 md:py-24">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold tracking-tight mb-2">QA Checklist</h1>
          <p className="text-[#6B6B6B] text-sm">
            Interactive quality assurance checklist for client projects
          </p>
        </div>

        {/* Project Info */}
        <div className="space-y-6 mb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Project Name</label>
              <input
                type="text"
                className={inputClass}
                placeholder="e.g. Nutribloom Redesign"
                value={formData.projectName}
                onChange={(e) => updateField("projectName", e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Client Name</label>
              <input
                type="text"
                className={inputClass}
                placeholder="Client name..."
                value={formData.clientName}
                onChange={(e) => updateField("clientName", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Project Type</label>
              <select
                className={`${inputClass} appearance-none`}
                value={formData.projectType}
                onChange={(e) => updateField("projectType", e.target.value as QAFormData["projectType"])}
              >
                <option value="">Select type...</option>
                {projectTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Tester Name</label>
              <input
                type="text"
                className={inputClass}
                placeholder="Your name..."
                value={formData.testerName}
                onChange={(e) => updateField("testerName", e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Date</label>
              <input
                type="date"
                className={inputClass}
                value={formData.testDate}
                onChange={(e) => updateField("testDate", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white border border-[#E5E5E5] rounded-lg p-4 mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider">
              Progress
            </span>
            <span className="text-xs text-[#6B6B6B]">
              {stats.checked}/{stats.total} checked
            </span>
          </div>
          <div className="h-2 bg-[#F0F0F0] rounded-full overflow-hidden flex">
            {stats.pass > 0 && (
              <div
                className="bg-emerald-500 transition-all duration-300"
                style={{ width: `${(stats.pass / stats.total) * 100}%` }}
              />
            )}
            {stats.fail > 0 && (
              <div
                className="bg-red-500 transition-all duration-300"
                style={{ width: `${(stats.fail / stats.total) * 100}%` }}
              />
            )}
            {stats.skip > 0 && (
              <div
                className="bg-[#CCCCCC] transition-all duration-300"
                style={{ width: `${(stats.skip / stats.total) * 100}%` }}
              />
            )}
          </div>
          <div className="flex gap-4 mt-2">
            <span className="text-xs text-emerald-600 font-medium">{stats.pass} pass</span>
            <span className="text-xs text-red-500 font-medium">{stats.fail} fail</span>
            <span className="text-xs text-[#AAAAAA] font-medium">{stats.skip} skip</span>
          </div>
        </div>

        {/* Category Sections */}
        {qaCategories.map((category) => {
          const catItems = formData.items.filter((i) => i.category === category);
          const cs = categoryStats[category];
          const isCollapsed = collapsed[category] ?? false;

          return (
            <div key={category} className="mb-4">
              <button
                type="button"
                onClick={() => setCollapsed((prev) => ({ ...prev, [category]: !isCollapsed }))}
                className="w-full flex items-center justify-between px-4 py-3 bg-white border border-[#E5E5E5] rounded-lg hover:bg-[#FAFAFA] transition-colors"
              >
                <div className="flex items-center gap-2">
                  {cs.hasFail && (
                    <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                  )}
                  <span className="text-sm font-semibold">{category}</span>
                  <span className="text-xs text-[#AAAAAA]">
                    ({cs.checked}/{cs.total})
                  </span>
                </div>
                <ChevronDownIcon
                  className={`size-4 text-[#6B6B6B] transition-transform ${isCollapsed ? "" : "rotate-180"}`}
                />
              </button>

              {!isCollapsed && (
                <div className="border border-t-0 border-[#E5E5E5] rounded-b-lg bg-white -mt-[1px]">
                  {catItems.map((item) => (
                    <div key={item.id}>
                      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[#F0F0F0] last:border-b-0">
                        {/* Result toggle */}
                        <button
                          type="button"
                          onClick={() => updateItem(item.id, { result: nextResult(item.result) })}
                          className="flex-shrink-0 w-7 h-7 rounded-md border flex items-center justify-center text-xs font-bold transition-all"
                          style={{
                            borderColor:
                              item.result === "pass"
                                ? "#10b981"
                                : item.result === "fail"
                                  ? "#ef4444"
                                  : item.result === "skip"
                                    ? "#CCCCCC"
                                    : "#E5E5E5",
                            backgroundColor:
                              item.result === "pass"
                                ? "#ecfdf5"
                                : item.result === "fail"
                                  ? "#fef2f2"
                                  : item.result === "skip"
                                    ? "#F5F5F5"
                                    : "#FFFFFF",
                            color:
                              item.result === "pass"
                                ? "#059669"
                                : item.result === "fail"
                                  ? "#dc2626"
                                  : item.result === "skip"
                                    ? "#999999"
                                    : "#CCCCCC",
                          }}
                        >
                          {item.result === "pass"
                            ? "✓"
                            : item.result === "fail"
                              ? "✗"
                              : item.result === "skip"
                                ? "—"
                                : "○"}
                        </button>

                        {/* Description */}
                        <span
                          className={`flex-1 text-sm ${
                            item.result === "skip"
                              ? "text-[#AAAAAA] line-through"
                              : item.result === "fail"
                                ? "text-red-700"
                                : "text-[#0A0A0A]"
                          }`}
                        >
                          {item.description}
                        </span>

                        {/* Notes toggle */}
                        <button
                          type="button"
                          onClick={() =>
                            setNotesOpen((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
                          }
                          className={`flex-shrink-0 p-1.5 rounded transition-colors ${
                            notesOpen[item.id] || item.notes
                              ? "text-[#0A0A0A]"
                              : "text-[#CCCCCC] hover:text-[#6B6B6B]"
                          }`}
                        >
                          <ChatBubbleLeftIcon className="size-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="flex-shrink-0 p-1.5 text-[#CCCCCC] hover:text-red-500 transition-colors"
                        >
                          <TrashIcon className="size-3.5" />
                        </button>
                      </div>

                      {/* Notes input */}
                      {notesOpen[item.id] && (
                        <div className="px-4 pb-2.5 pl-14 border-b border-[#F0F0F0]">
                          <input
                            type="text"
                            className="w-full px-2.5 py-1.5 text-xs bg-[#FAFAFA] border border-[#E5E5E5] rounded focus:outline-none focus:border-[#0A0A0A] placeholder:text-[#CCCCCC]"
                            placeholder="Add a note..."
                            value={item.notes}
                            onChange={(e) => updateItem(item.id, { notes: e.target.value })}
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add custom item */}
                  <div className="px-4 py-2.5">
                    {addingTo === category ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          className="flex-1 px-2.5 py-1.5 text-sm bg-[#FAFAFA] border border-[#E5E5E5] rounded focus:outline-none focus:border-[#0A0A0A] placeholder:text-[#CCCCCC]"
                          placeholder="New check description..."
                          value={newItemText}
                          onChange={(e) => setNewItemText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") addCustomItem(category);
                            if (e.key === "Escape") {
                              setAddingTo(null);
                              setNewItemText("");
                            }
                          }}
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => addCustomItem(category)}
                          className="px-3 py-1.5 bg-[#0A0A0A] text-white text-xs font-medium rounded hover:bg-accent-hover transition-colors"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAddingTo(null);
                            setNewItemText("");
                          }}
                          className="px-3 py-1.5 text-xs text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAddingTo(category)}
                        className="flex items-center gap-1.5 text-xs text-[#AAAAAA] hover:text-[#0A0A0A] transition-colors"
                      >
                        <PlusIcon className="size-3" />
                        Add check
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Summary Notes */}
        <div className="mt-8 mb-8">
          <label className={labelClass}>Summary Notes</label>
          <textarea
            className={`${inputClass} resize-none`}
            rows={4}
            placeholder="Overall QA notes, blockers, recommendations..."
            value={formData.summary}
            onChange={(e) => updateField("summary", e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 mb-10">
          <button
            onClick={handleGenerate}
            disabled={!isFormValid || generating}
            className="flex items-center gap-2 px-6 py-3 bg-[#0A0A0A] text-white text-sm font-medium rounded-md hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <ArrowPathIcon className="size-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate QA Report"
            )}
          </button>
          <button
            onClick={handleReset}
            className="px-6 py-3 border border-[#E5E5E5] bg-white text-[#6B6B6B] text-sm font-medium rounded-md hover:bg-[#F5F5F5] transition-colors"
          >
            Reset Checklist
          </button>
        </div>

        {/* Overall Verdict */}
        {showPreview && (
          <div className="mb-6">
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold ${
                overallVerdict === "PASS"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : overallVerdict === "FAIL"
                    ? "bg-red-50 text-red-700 border border-red-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              {overallVerdict === "PASS"
                ? "✓ ALL CHECKS PASSED"
                : overallVerdict === "FAIL"
                  ? "✗ ISSUES FOUND"
                  : "⚠ INCOMPLETE"}
            </div>
          </div>
        )}

        {/* PDF Preview */}
        {showPreview && (
          <PdfPreview
            document={<QaReportPdfDocument data={formData} />}
            filename={`${slug}-qa-report-${dateSlug}.pdf`}
            label="QA Report"
            description={`QA Report for ${formData.clientName} — ${formData.projectName}`}
            details={`${stats.pass} pass · ${stats.fail} fail · ${stats.skip} skip · ${stats.unchecked} unchecked`}
          />
        )}
      </div>
    </div>
  );
}
