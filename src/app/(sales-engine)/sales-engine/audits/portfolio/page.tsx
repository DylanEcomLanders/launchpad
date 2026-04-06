"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";

interface PortfolioImage {
  filename: string;
  url: string;
}

export default function AuditPortfolioPage() {
  const [images, setImages] = useState<PortfolioImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmDeleteIdx, setConfirmDeleteIdx] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dirty, setDirty] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/audit-portfolio");
      const data = await res.json();
      const urls: string[] = data.images || [];
      // Extract filename from URL
      const mapped: PortfolioImage[] = urls.map((url) => {
        const parts = url.split("/");
        const filename = parts[parts.length - 1];
        return { filename, url };
      });
      setImages(mapped);
    } catch {
      setError("Failed to load images");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const uploadFile = async (file: File) => {
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.type)) {
      setError("Invalid file type. Accepts PNG, JPG, WebP.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File too large. Max 10MB.");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/audit-portfolio/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setImages((prev) => [
        ...prev,
        { filename: data.filename, url: data.url },
      ]);
      setDirty(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((f) => uploadFile(f));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDelete = async (idx: number) => {
    const img = images[idx];
    setError("");

    try {
      const res = await fetch("/api/audit-portfolio/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: img.filename }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Delete failed");
      }

      setImages((prev) => prev.filter((_, i) => i !== idx));
      setConfirmDeleteIdx(null);
      setDirty(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const moveImage = (idx: number, direction: "up" | "down") => {
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= images.length) return;

    setImages((prev) => {
      const copy = [...prev];
      [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
      return copy;
    });
    setDirty(true);
  };

  const saveOrder = async () => {
    setSaving(true);
    setError("");

    try {
      const order = images.map((img) => img.filename);
      const res = await fetch("/api/audit-portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Save failed");
      }

      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1B1B1B] tracking-tight">
          Audit Portfolio
        </h1>
        <p className="text-sm text-[#7A7A7A] mt-1">
          Manage the portfolio images shown on your audit landing page
        </p>
      </div>

      {/* Upload area */}
      <div
        className={`
          relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all
          ${
            dragOver
              ? "border-[#1B1B1B] bg-[#F7F8FA]"
              : "border-[#E5E5EA] hover:border-[#C5C5C5] bg-white"
          }
        `}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <PhotoIcon className="size-10 text-[#C5C5C5] mx-auto mb-3" />
        <p className="text-sm font-medium text-[#1B1B1B]">
          {uploading ? "Uploading..." : "Drop images here or click to browse"}
        </p>
        <p className="text-xs text-[#7A7A7A] mt-1">
          PNG, JPG, or WebP. Max 10MB each.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        {uploading && (
          <div className="absolute inset-0 bg-white/60 rounded-xl flex items-center justify-center">
            <div className="size-6 border-2 border-[#1B1B1B] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Save bar */}
      {dirty && (
        <div className="mt-4 flex items-center justify-between bg-[#FFFBE6] border border-[#F5E6A3] rounded-lg px-4 py-3">
          <p className="text-sm text-[#8B7500]">
            You have unsaved order changes.
          </p>
          <button
            onClick={saveOrder}
            disabled={saving}
            className="px-4 py-1.5 bg-[#1B1B1B] text-white text-sm font-semibold rounded-lg hover:bg-[#2D2D2D] transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Order"}
          </button>
        </div>
      )}

      {/* Image grid */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold text-[#1B1B1B] mb-4">
          Images ({images.length})
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="size-6 border-2 border-[#1B1B1B] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-16 bg-[#F7F8FA] rounded-xl border border-[#EDEDEF]">
            <PhotoIcon className="size-12 text-[#C5C5C5] mx-auto mb-3" />
            <p className="text-sm text-[#7A7A7A]">
              No portfolio images yet. Upload some above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {images.map((img, idx) => (
              <div
                key={img.filename}
                className="group relative bg-white border border-[#EDEDEF] rounded-xl overflow-hidden shadow-[var(--shadow-soft)]"
              >
                {/* Image */}
                <div className="aspect-[9/16] relative">
                  <img
                    src={img.url}
                    alt=""
                    className="w-full h-full object-cover"
                  />

                  {/* Overlay controls */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => moveImage(idx, "up")}
                        disabled={idx === 0}
                        className="p-1.5 bg-white rounded-lg shadow-md hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move left"
                      >
                        <ArrowUpIcon className="size-4 text-[#1B1B1B] -rotate-90" />
                      </button>
                      <button
                        onClick={() => moveImage(idx, "down")}
                        disabled={idx === images.length - 1}
                        className="p-1.5 bg-white rounded-lg shadow-md hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move right"
                      >
                        <ArrowDownIcon className="size-4 text-[#1B1B1B] -rotate-90" />
                      </button>
                      <button
                        onClick={() =>
                          confirmDeleteIdx === idx
                            ? handleDelete(idx)
                            : setConfirmDeleteIdx(idx)
                        }
                        className={`p-1.5 rounded-lg shadow-md ${
                          confirmDeleteIdx === idx
                            ? "bg-red-500 hover:bg-red-600"
                            : "bg-white hover:bg-gray-50"
                        }`}
                        title={
                          confirmDeleteIdx === idx
                            ? "Click again to confirm"
                            : "Delete"
                        }
                      >
                        <TrashIcon
                          className={`size-4 ${
                            confirmDeleteIdx === idx
                              ? "text-white"
                              : "text-red-500"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Position label */}
                <div className="px-2.5 py-1.5 text-center">
                  <span className="text-[11px] font-medium text-[#7A7A7A]">
                    {idx + 1}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview strip */}
      {images.length > 0 && (
        <div className="mt-10">
          <h2 className="text-sm font-semibold text-[#1B1B1B] mb-4">
            Preview
          </h2>
          <div className="bg-[#1B1B1B] rounded-xl p-4 overflow-hidden">
            <div className="flex gap-3 overflow-x-auto scrollbar-thin pb-2">
              {images.map((img, idx) => (
                <img
                  key={idx}
                  src={img.url}
                  alt=""
                  className="shrink-0 w-[100px] h-[220px] object-cover rounded-lg border border-[#333]"
                />
              ))}
            </div>
            <p className="text-[11px] text-[#666] mt-2 text-center">
              This mimics the scrolling strip on the public audit page
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
