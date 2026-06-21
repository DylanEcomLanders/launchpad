"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PlusIcon,
  TrashIcon,
  XMarkIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  ArrowTopRightOnSquareIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "@heroicons/react/24/outline";
import { DecorativeBlocks } from "@/components/decorative-blocks";
import { inputClass, labelClass } from "@/lib/form-styles";
import { getTabs, saveTabs, createTab } from "@/lib/portfolio/data";
import type { PortfolioTab } from "@/lib/portfolio/types";

export default function PortfolioManager() {
  const [tabs, setTabs] = useState<PortfolioTab[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState("");
  const [figmaUrl, setFigmaUrl] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadTabs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTabs();
      setTabs(data.sort((a, b) => a.order - b.order));
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTabs();
  }, [loadTabs]);

  // ── Add / Edit ─────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!label.trim() || !figmaUrl.trim()) return;

    let updated: PortfolioTab[];
    if (editingId) {
      updated = tabs.map((t) =>
        t.id === editingId ? { ...t, label: label.trim(), figma_url: figmaUrl.trim() } : t
      );
    } else {
      const tab = createTab(label.trim(), figmaUrl.trim(), tabs.length);
      updated = [...tabs, tab];
    }

    await saveTabs(updated);
    setTabs(updated.sort((a, b) => a.order - b.order));
    handleCancel();
  };

  const handleEdit = (tab: PortfolioTab) => {
    setLabel(tab.label);
    setFigmaUrl(tab.figma_url);
    setEditingId(tab.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const updated = tabs
      .filter((t) => t.id !== id)
      .map((t, i) => ({ ...t, order: i }));
    await saveTabs(updated);
    setTabs(updated);
  };

  const handleCancel = () => {
    setLabel("");
    setFigmaUrl("");
    setEditingId(null);
    setShowForm(false);
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/portfolio`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Reorder ────────────────────────────────────────────────────

  const moveTab = async (id: string, direction: "up" | "down") => {
    const sorted = [...tabs].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((t) => t.id === id);
    if (direction === "up" && idx > 0) {
      [sorted[idx], sorted[idx - 1]] = [sorted[idx - 1], sorted[idx]];
    } else if (direction === "down" && idx < sorted.length - 1) {
      [sorted[idx], sorted[idx + 1]] = [sorted[idx + 1], sorted[idx]];
    }
    const updated = sorted.map((t, i) => ({ ...t, order: i }));
    await saveTabs(updated);
    setTabs(updated);
  };

  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-12 py-16 md:py-24">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-[28px] font-bold mb-2">
            Portfolio
          </h1>
          <p className="text-[#71757D]">
            Manage the tabs on your shareable portfolio page. Each tab embeds a Figma design.
          </p>
        </div>

        {/* Link + Add */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#71757D]">
              Tabs
              {tabs.length > 0 && (
                <span className="ml-2 text-[10px] font-bold bg-[#222222] text-[#71757D] px-1.5 py-0.5 rounded">
                  {tabs.length}
                </span>
              )}
            </h2>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1 text-[11px] font-medium text-[#71757D] hover:text-[#E5E5EA] transition-colors"
              title="Copy portfolio link"
            >
              <ClipboardDocumentIcon className="size-3.5" />
              {copied ? "Copied!" : "Copy Link"}
            </button>
            <a
              href="/portfolio"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] font-medium text-[#71757D] hover:text-[#E5E5EA] transition-colors"
            >
              <ArrowTopRightOnSquareIcon className="size-3.5" />
              Preview
            </a>
          </div>
          <button
            onClick={() => {
              handleCancel();
              setShowForm(true);
            }}
            className="flex items-center gap-1 text-xs font-medium text-[#71757D] hover:text-[#E5E5EA] transition-colors"
          >
            <PlusIcon className="size-3.5" />
            Add Tab
          </button>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">
                {editingId ? "Edit Tab" : "Add Tab"}
              </h3>
              <button onClick={handleCancel} className="text-[#71757D] hover:text-[#E5E5EA]">
                <XMarkIcon className="size-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-4">
                <div>
                  <label className={labelClass}>Tab Label *</label>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g., Homepage"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Figma URL *</label>
                  <input
                    type="text"
                    value={figmaUrl}
                    onChange={(e) => setFigmaUrl(e.target.value)}
                    placeholder="Paste Figma file or frame URL"
                    className={inputClass}
                  />
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!label.trim() || !figmaUrl.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-white text-[#0C0C0C] text-xs font-medium rounded-md hover:bg-[#F3F4F6] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CheckIcon className="size-3.5" />
                {editingId ? "Save Changes" : "Add Tab"}
              </button>
            </div>
          </div>
        )}

        {/* Tab List */}
        <div className="space-y-2">
          {loading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-[#181818] border border-[#2A2A2A] rounded-lg p-4 animate-pulse">
                  <div className="h-4 bg-[#222222] rounded w-1/3 mb-2" />
                  <div className="h-3 bg-[#222222] rounded w-2/3" />
                </div>
              ))}
            </div>
          )}

          {!loading && tabs.length === 0 && !showForm && (
            <div className="bg-[#181818] border border-dashed border-[#2A2A2A] rounded-lg p-8 text-center">
              <p className="text-xs text-[#71757D] mb-2">No portfolio tabs yet</p>
              <button
                onClick={() => setShowForm(true)}
                className="text-xs font-medium text-[#71757D] hover:text-[#E5E5EA] transition-colors"
              >
                + Add your first tab
              </button>
            </div>
          )}

          {!loading &&
            tabs.map((tab, i) => (
              <div
                key={tab.id}
                className="bg-[#181818] border border-[#2A2A2A] rounded-lg p-4 flex items-center gap-3"
              >
                {/* Reorder */}
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => moveTab(tab.id, "up")}
                    disabled={i === 0}
                    className="text-[#71757D] hover:text-[#E5E5EA] disabled:opacity-20 transition-colors"
                  >
                    <ArrowUpIcon className="size-3" />
                  </button>
                  <button
                    onClick={() => moveTab(tab.id, "down")}
                    disabled={i === tabs.length - 1}
                    className="text-[#71757D] hover:text-[#E5E5EA] disabled:opacity-20 transition-colors"
                  >
                    <ArrowDownIcon className="size-3" />
                  </button>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-[#E5E5EA] truncate">
                    {tab.label}
                  </h3>
                  <p className="text-xs text-[#71757D] truncate">
                    {tab.figma_url}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleEdit(tab)}
                    className="p-1.5 text-[#71757D] hover:text-[#E5E5EA] transition-colors text-xs font-medium"
                    title="Edit"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(tab.id)}
                    className="p-1.5 text-[#71757D] hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <TrashIcon className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
