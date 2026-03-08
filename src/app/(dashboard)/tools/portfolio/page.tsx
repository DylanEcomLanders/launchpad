"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PlusIcon,
  PencilSquareIcon,
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
import {
  getClients,
  addClient,
  updateClient,
  deleteClient,
  slugify,
} from "@/lib/portfolio/data";
import type {
  PortfolioClient,
  PortfolioClientInsert,
  PortfolioPage,
} from "@/lib/portfolio/types";

// ── Empty Form ──────────────────────────────────────────────────

const emptyForm: PortfolioClientInsert = {
  slug: "",
  client_name: "",
  project_type: "",
  description: "",
  live_url: "",
  pages: [],
};

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ── Page Component ──────────────────────────────────────────────

export default function PortfolioManager() {
  const [clients, setClients] = useState<PortfolioClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PortfolioClientInsert>({ ...emptyForm });
  const [copied, setCopied] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getClients();
      setClients(data);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  // ── CRUD ────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!form.client_name.trim()) return;
    const slug = form.slug || slugify(form.client_name);
    const payload = { ...form, slug };

    if (editingId) {
      await updateClient(editingId, payload);
    } else {
      await addClient(payload);
    }
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(false);
    loadClients();
  };

  const handleEdit = (c: PortfolioClient) => {
    setForm({
      slug: c.slug,
      client_name: c.client_name,
      project_type: c.project_type,
      description: c.description,
      live_url: c.live_url,
      pages: c.pages,
    });
    setEditingId(c.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    await deleteClient(id);
    loadClients();
  };

  const handleCancel = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(false);
  };

  const handleCopyLink = (slug: string) => {
    const url = `${window.location.origin}/portfolio/${slug}`;
    navigator.clipboard.writeText(url);
    setCopied(slug);
    setTimeout(() => setCopied(null), 2000);
  };

  // ── Page Management ─────────────────────────────────────────

  const addPage = () => {
    setForm((f) => ({
      ...f,
      pages: [...f.pages, { id: uid(), label: "", figma_embed_url: "", order: f.pages.length }],
    }));
  };

  const updatePage = (pageId: string, updates: Partial<PortfolioPage>) => {
    setForm((f) => ({
      ...f,
      pages: f.pages.map((p) => (p.id === pageId ? { ...p, ...updates } : p)),
    }));
  };

  const removePage = (pageId: string) => {
    setForm((f) => ({
      ...f,
      pages: f.pages.filter((p) => p.id !== pageId).map((p, i) => ({ ...p, order: i })),
    }));
  };

  const movePage = (pageId: string, direction: "up" | "down") => {
    setForm((f) => {
      const pages = [...f.pages].sort((a, b) => a.order - b.order);
      const idx = pages.findIndex((p) => p.id === pageId);
      if (direction === "up" && idx > 0) {
        [pages[idx], pages[idx - 1]] = [pages[idx - 1], pages[idx]];
      } else if (direction === "down" && idx < pages.length - 1) {
        [pages[idx], pages[idx + 1]] = [pages[idx + 1], pages[idx]];
      }
      return { ...f, pages: pages.map((p, i) => ({ ...p, order: i })) };
    });
  };

  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-12 py-16 md:py-24">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            Portfolio
          </h1>
          <p className="text-[#6B6B6B]">
            Manage client showcases with embedded Figma designs. Each client gets a shareable public link.
          </p>
        </div>

        {/* Add Button */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6B6B6B]">
            Clients
            {clients.length > 0 && (
              <span className="ml-2 text-[10px] font-bold bg-[#F0F0F0] text-[#6B6B6B] px-1.5 py-0.5 rounded">
                {clients.length}
              </span>
            )}
          </h2>
          <button
            onClick={() => {
              handleCancel();
              setShowForm(true);
            }}
            className="flex items-center gap-1 text-xs font-medium text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors"
          >
            <PlusIcon className="size-3.5" />
            Add Client
          </button>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">
                {editingId ? "Edit Client" : "Add Client"}
              </h3>
              <button onClick={handleCancel} className="text-[#AAAAAA] hover:text-[#0A0A0A]">
                <XMarkIcon className="size-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Client Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Client Name *</label>
                  <input
                    type="text"
                    value={form.client_name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setForm((f) => ({
                        ...f,
                        client_name: name,
                        slug: editingId ? f.slug : slugify(name),
                      }));
                    }}
                    placeholder="e.g., Nutribloom"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>URL Slug</label>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                    placeholder="auto-generated"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Project Type</label>
                  <input
                    type="text"
                    value={form.project_type}
                    onChange={(e) => setForm((f) => ({ ...f, project_type: e.target.value }))}
                    placeholder="e.g., Full Build"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Live Store URL</label>
                  <input
                    type="text"
                    value={form.live_url}
                    onChange={(e) => setForm((f) => ({ ...f, live_url: e.target.value }))}
                    placeholder="e.g., nutribloom.com"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Short project description"
                  className={inputClass}
                />
              </div>

              {/* Pages */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={labelClass + " mb-0"}>Page Tabs</label>
                  <button
                    onClick={addPage}
                    className="flex items-center gap-1 text-[11px] font-medium text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors"
                  >
                    <PlusIcon className="size-3" />
                    Add Tab
                  </button>
                </div>

                {form.pages.length === 0 && (
                  <p className="text-xs text-[#AAAAAA] py-3">
                    No tabs yet. Add tabs with Figma links for each page design.
                  </p>
                )}

                <div className="space-y-2">
                  {[...form.pages]
                    .sort((a, b) => a.order - b.order)
                    .map((page, i) => (
                      <div
                        key={page.id}
                        className="flex items-start gap-2 bg-white border border-[#E5E5E5] rounded-md p-3"
                      >
                        <div className="flex flex-col gap-0.5 mt-1">
                          <button
                            onClick={() => movePage(page.id, "up")}
                            disabled={i === 0}
                            className="text-[#AAAAAA] hover:text-[#0A0A0A] disabled:opacity-20 transition-colors"
                          >
                            <ArrowUpIcon className="size-3" />
                          </button>
                          <button
                            onClick={() => movePage(page.id, "down")}
                            disabled={i === form.pages.length - 1}
                            className="text-[#AAAAAA] hover:text-[#0A0A0A] disabled:opacity-20 transition-colors"
                          >
                            <ArrowDownIcon className="size-3" />
                          </button>
                        </div>
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-[140px_1fr] gap-2">
                          <input
                            type="text"
                            value={page.label}
                            onChange={(e) => updatePage(page.id, { label: e.target.value })}
                            placeholder="Tab label"
                            className={inputClass}
                          />
                          <input
                            type="text"
                            value={page.figma_embed_url}
                            onChange={(e) => updatePage(page.id, { figma_embed_url: e.target.value })}
                            placeholder="Figma file/frame URL"
                            className={inputClass}
                          />
                        </div>
                        <button
                          onClick={() => removePage(page.id)}
                          className="mt-2 text-[#AAAAAA] hover:text-red-400 transition-colors"
                        >
                          <TrashIcon className="size-3.5" />
                        </button>
                      </div>
                    ))}
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!form.client_name.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#0A0A0A] text-white text-xs font-medium rounded-md hover:bg-[#2A2A2A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CheckIcon className="size-3.5" />
                {editingId ? "Save Changes" : "Add Client"}
              </button>
            </div>
          </div>
        )}

        {/* Client List */}
        <div className="space-y-3">
          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white border border-[#E5E5E5] rounded-lg p-4 animate-pulse">
                  <div className="h-4 bg-[#F0F0F0] rounded w-1/3 mb-2" />
                  <div className="h-3 bg-[#F0F0F0] rounded w-1/2" />
                </div>
              ))}
            </div>
          )}

          {!loading && clients.length === 0 && !showForm && (
            <div className="bg-white border border-dashed border-[#E5E5E5] rounded-lg p-8 text-center">
              <p className="text-xs text-[#AAAAAA] mb-2">No portfolio clients yet</p>
              <button
                onClick={() => setShowForm(true)}
                className="text-xs font-medium text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors"
              >
                + Add your first client
              </button>
            </div>
          )}

          {!loading &&
            clients.map((c) => (
              <div
                key={c.id}
                className="bg-white border border-[#E5E5E5] rounded-lg p-4 group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-sm font-semibold text-[#0A0A0A] truncate">
                        {c.client_name}
                      </h3>
                      {c.project_type && (
                        <span className="text-[10px] font-medium bg-[#F0F0F0] text-[#6B6B6B] px-1.5 py-0.5 rounded shrink-0">
                          {c.project_type}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#AAAAAA]">
                      <span>/portfolio/{c.slug}</span>
                      <span>{c.pages.length} {c.pages.length === 1 ? "page" : "pages"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleCopyLink(c.slug)}
                      className="p-1.5 text-[#AAAAAA] hover:text-[#0A0A0A] transition-colors"
                      title="Copy link"
                    >
                      <ClipboardDocumentIcon className="size-3.5" />
                    </button>
                    <a
                      href={`/portfolio/${c.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-[#AAAAAA] hover:text-[#0A0A0A] transition-colors"
                      title="Preview"
                    >
                      <ArrowTopRightOnSquareIcon className="size-3.5" />
                    </a>
                    <button
                      onClick={() => handleEdit(c)}
                      className="p-1.5 text-[#AAAAAA] hover:text-[#0A0A0A] transition-colors"
                      title="Edit"
                    >
                      <PencilSquareIcon className="size-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="p-1.5 text-[#AAAAAA] hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="size-3.5" />
                    </button>
                  </div>
                </div>

                {copied === c.slug && (
                  <p className="text-[11px] text-emerald-600 font-medium mt-1">Link copied!</p>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
