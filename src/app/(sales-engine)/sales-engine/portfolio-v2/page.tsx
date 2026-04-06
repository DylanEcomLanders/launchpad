"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ModalPortal } from "@/components/modal-portal";
import { inputClass, textareaClass, labelClass } from "@/lib/form-styles";
import type { PortfolioProject } from "@/lib/portfolio-v2/types";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function PortfolioV2AdminPage() {
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    client: "",
    tags: "",
    figmaUrl: "",
    desktopFrameName: "",
    mobileFrameName: "",
    notes: "",
    results: "",
  });

  const slugEdited = form.slug && form.slug !== slugify(form.name);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/portfolio-v2");
      const data = await res.json();
      setProjects(data.projects ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const resetForm = () => {
    setForm({
      name: "",
      slug: "",
      client: "",
      tags: "",
      figmaUrl: "",
      desktopFrameName: "",
      mobileFrameName: "",
      notes: "",
      results: "",
    });
    setError(null);
    setProgress(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setProgress("Fetching from Figma...");

    try {
      setProgress("Slicing images and uploading...");
      const res = await fetch("/api/portfolio-v2/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          figmaUrl: form.figmaUrl,
          name: form.name,
          slug: form.slug || slugify(form.name),
          client: form.client || undefined,
          tags: form.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          notes: form.notes || undefined,
          results: form.results || undefined,
          desktopFrameName: form.desktopFrameName,
          mobileFrameName: form.mobileFrameName || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");
      setProgress("Done!");
      setModalOpen(false);
      resetForm();
      await loadProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setProgress(null);
    }
  };

  const handleResync = async (project: PortfolioProject) => {
    if (!confirm(`Re-sync "${project.name}" from Figma?`)) return;
    setProgress(`Re-syncing ${project.name}...`);
    try {
      const res = await fetch("/api/portfolio-v2/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          figmaUrl: `https://www.figma.com/file/${project.figma_file_key}/`,
          name: project.name,
          slug: project.slug,
          client: project.client,
          tags: project.tags,
          notes: project.notes,
          results: project.results,
          desktopFrameName: "", // will fail unless user keeps frames — resync uses stored node ids
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Resync failed");
      await loadProjects();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Resync failed");
    } finally {
      setProgress(null);
    }
  };

  const handleDelete = async (project: PortfolioProject) => {
    if (!confirm(`Delete "${project.name}"? This removes storage files too.`)) return;
    try {
      const res = await fetch(`/api/portfolio-v2?id=${encodeURIComponent(project.id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      await loadProjects();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[#1B1B1B]">Portfolio v2 (Beta)</h1>
          <p className="text-sm text-[#7A7A7A] mt-1">
            Pull design screenshots from Figma, auto-slice, and serve.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setModalOpen(true);
          }}
          className="px-4 py-2 bg-[#1B1B1B] text-white text-sm font-semibold rounded-lg hover:bg-[#2D2D2D] transition-colors"
        >
          Add Project
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-[#7A7A7A]">Loading...</div>
      ) : projects.length === 0 ? (
        <div className="text-sm text-[#7A7A7A] border border-dashed border-[#E5E5EA] rounded-xl p-12 text-center">
          No projects yet. Click &ldquo;Add Project&rdquo; to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((p) => (
            <div
              key={p.id}
              className="bg-white border border-[#EDEDEF] rounded-xl p-5 shadow-[var(--shadow-soft)]"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <h3 className="font-semibold text-[#1B1B1B]">{p.name}</h3>
                  {p.client && (
                    <p className="text-xs text-[#7A7A7A] mt-0.5">{p.client}</p>
                  )}
                </div>
                <Link
                  href={`/portfolio-v2/${p.slug}`}
                  target="_blank"
                  className="text-xs font-semibold text-[#1B1B1B] hover:underline"
                >
                  View →
                </Link>
              </div>
              {p.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {p.tags.map((t) => (
                    <span
                      key={t}
                      className="text-[10px] uppercase tracking-wide px-2 py-0.5 bg-[#F5F5F7] text-[#7A7A7A] rounded-full"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <div className="text-xs text-[#7A7A7A] mb-3">
                {p.desktop_slices.length} desktop / {p.mobile_slices.length} mobile slices
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleResync(p)}
                  className="text-xs px-3 py-1.5 border border-[#E5E5EA] rounded-md hover:bg-[#F5F5F7]"
                >
                  Re-sync
                </button>
                <button
                  onClick={() => handleDelete(p)}
                  className="text-xs px-3 py-1.5 border border-[#E5E5EA] rounded-md hover:bg-[#F5F5F7] text-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
              <div className="sticky top-0 bg-white border-b border-[#EDEDEF] px-6 py-4 flex items-center justify-between">
                <h2 className="font-semibold text-[#1B1B1B]">New Portfolio Project</h2>
                <button
                  onClick={() => setModalOpen(false)}
                  className="text-[#7A7A7A] hover:text-[#1B1B1B] text-xl leading-none"
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className={labelClass}>Project Name</label>
                  <input
                    required
                    className={inputClass}
                    value={form.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setForm((f) => ({
                        ...f,
                        name,
                        slug: slugEdited ? f.slug : slugify(name),
                      }));
                    }}
                  />
                </div>
                <div>
                  <label className={labelClass}>Slug</label>
                  <input
                    required
                    className={inputClass}
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Client</label>
                    <input
                      className={inputClass}
                      value={form.client}
                      onChange={(e) => setForm((f) => ({ ...f, client: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Tags (comma separated)</label>
                    <input
                      className={inputClass}
                      value={form.tags}
                      onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                      placeholder="shopify, ecommerce, apparel"
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Figma File URL</label>
                  <input
                    required
                    className={inputClass}
                    value={form.figmaUrl}
                    onChange={(e) => setForm((f) => ({ ...f, figmaUrl: e.target.value }))}
                    placeholder="https://www.figma.com/design/ABC123/..."
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Desktop Frame Name</label>
                    <input
                      required
                      className={inputClass}
                      value={form.desktopFrameName}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, desktopFrameName: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Mobile Frame Name (optional)</label>
                    <input
                      className={inputClass}
                      value={form.mobileFrameName}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, mobileFrameName: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Notes</label>
                  <textarea
                    rows={3}
                    className={textareaClass}
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={labelClass}>Results</label>
                  <textarea
                    rows={3}
                    className={textareaClass}
                    value={form.results}
                    onChange={(e) => setForm((f) => ({ ...f, results: e.target.value }))}
                    placeholder="+38% CVR, +$240k/month revenue..."
                  />
                </div>

                {progress && (
                  <div className="text-sm text-[#1B1B1B] bg-[#F5F5F7] rounded-lg px-4 py-3">
                    {progress}
                  </div>
                )}
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">
                    {error}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 text-sm border border-[#E5E5EA] rounded-lg hover:bg-[#F5F5F7]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!!progress}
                    className="px-4 py-2 bg-[#1B1B1B] text-white text-sm font-semibold rounded-lg hover:bg-[#2D2D2D] disabled:opacity-50"
                  >
                    {progress ? "Working..." : "Sync from Figma"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
