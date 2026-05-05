"use client";

import { useState, useRef } from "react";
import { ArrowUpTrayIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { CaseStudyImage } from "@/lib/case-studies/types";

interface ImageUploadProps {
  value: CaseStudyImage | undefined;
  onChange: (image: CaseStudyImage | undefined) => void;
  slug: string;            // Used as Storage path prefix
  label?: string;
  helper?: string;
  aspect?: "square" | "video" | "wide" | "auto";
  accept?: string;         // override default accept attr
}

const ASPECT_CLASS: Record<NonNullable<ImageUploadProps["aspect"]>, string> = {
  square: "aspect-square",
  video: "aspect-video",
  wide: "aspect-[21/9]",
  auto: "aspect-[3/2]",
};

export function ImageUpload({
  value,
  onChange,
  slug,
  label,
  helper,
  aspect = "auto",
  accept = "image/png,image/jpeg,image/webp,image/gif,image/svg+xml,video/mp4,video/webm",
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("slug", slug || "shared");
      const res = await fetch("/api/case-studies/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      // If we already had an image, fire delete in background — don't block.
      if (value?.filename) {
        fetch("/api/case-studies/upload", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: value.filename }),
        }).catch(() => {});
      }
      onChange({
        url: data.url,
        filename: data.filename,
        width: data.width,
        height: data.height,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    if (value?.filename) {
      fetch("/api/case-studies/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: value.filename }),
      }).catch(() => {});
    }
    onChange(undefined);
  };

  const isVideo = value?.url && /\.(mp4|webm|mov)(\?|$)/i.test(value.url);

  return (
    <div>
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A7A7A] mb-2">
          {label}
        </label>
      )}
      {value?.url ? (
        <div className={`relative ${ASPECT_CLASS[aspect]} rounded-lg overflow-hidden bg-[#F3F3F5] border border-[#EDEDEF] group`}>
          {isVideo ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video src={value.url} className="w-full h-full object-cover" muted loop autoPlay playsInline />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value.url} alt={value.alt || ""} className="w-full h-full object-cover" />
          )}
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors opacity-0 group-hover:opacity-100"
            title="Remove"
          >
            <XMarkIcon className="size-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) upload(file);
          }}
          disabled={uploading}
          className={`w-full ${ASPECT_CLASS[aspect]} rounded-lg border-2 border-dashed transition-colors flex flex-col items-center justify-center gap-2 ${
            dragOver
              ? "border-[#1B1B1B] bg-[#F3F3F5]"
              : "border-[#E5E5EA] bg-[#FAFAFB] hover:border-[#A0A0A0] hover:bg-[#F3F3F5]"
          } disabled:opacity-50`}
        >
          {uploading ? (
            <div className="size-5 border-2 border-[#A0A0A0] border-t-[#1B1B1B] rounded-full animate-spin" />
          ) : (
            <>
              <ArrowUpTrayIcon className="size-5 text-[#7A7A7A]" />
              <div className="text-xs text-[#7A7A7A]">
                <span className="font-semibold text-[#1B1B1B]">Click</span> or drag
              </div>
              {helper && <div className="text-[10px] text-[#A0A0A0]">{helper}</div>}
            </>
          )}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = "";
        }}
      />
      {error && <p className="text-[11px] text-red-600 mt-1.5">{error}</p>}
    </div>
  );
}
