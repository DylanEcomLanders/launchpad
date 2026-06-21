"use client";

import { useState } from "react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { inputClass, labelClass } from "@/lib/form-styles";
import type { CaseStudy } from "@/lib/case-studies/types";

interface Props {
  slug: string;
  desktopCount: number;
  mobileCount: number;
  onSynced: (study: CaseStudy) => void;
}

/* Form for syncing desktop/mobile design renders from Figma into the case
 * study's designs.desktopSlices / mobileSlices. Mirrors the portfolio-v2
 * sync flow — paste a frame URL, hit sync, slices land automatically. */
export function FigmaSyncForm({ slug, desktopCount, mobileCount, onSynced }: Props) {
  const [desktopUrl, setDesktopUrl] = useState("");
  const [mobileUrl, setMobileUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  const handleSync = async () => {
    if (!desktopUrl) {
      setError("Desktop frame URL required");
      return;
    }
    setBusy(true);
    setError(null);
    setProgress("Fetching frames from Figma + slicing…");
    try {
      const res = await fetch("/api/case-studies/figma-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          desktopFrameUrl: desktopUrl,
          mobileFrameUrl: mobileUrl || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");
      setProgress(`Synced ${data.desktopCount} desktop / ${data.mobileCount} mobile slices`);
      onSynced(data.study);
      setDesktopUrl("");
      setMobileUrl("");
      setTimeout(() => setProgress(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
      setProgress(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-[#0C0C0C] border border-[#2A2A2A] rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-[#E5E5EA]">Sync from Figma</div>
          <div className="text-[10px] text-[#71757D] mt-0.5">
            Paste a frame URL — slices auto-generate. Replaces existing.
          </div>
        </div>
        <div className="text-[10px] text-[#71757D] tabular-nums">
          {desktopCount} desktop · {mobileCount} mobile
        </div>
      </div>

      <div>
        <label className={labelClass}>Desktop frame URL</label>
        <input
          className={inputClass}
          value={desktopUrl}
          onChange={(e) => setDesktopUrl(e.target.value)}
          placeholder="https://www.figma.com/design/ABC123/...?node-id=4-567"
        />
      </div>
      <div>
        <label className={labelClass}>Mobile frame URL (optional)</label>
        <input
          className={inputClass}
          value={mobileUrl}
          onChange={(e) => setMobileUrl(e.target.value)}
          placeholder="https://www.figma.com/design/ABC123/...?node-id=4-890"
        />
      </div>

      {progress && (
        <div className="text-[11px] text-[#E5E5EA] bg-[#181818] border border-[#2A2A2A] rounded px-3 py-2">
          {progress}
        </div>
      )}
      {error && (
        <div className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleSync}
        disabled={busy || !desktopUrl}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-[#0C0C0C] text-xs font-semibold rounded-lg hover:bg-[#F3F4F6] disabled:opacity-40 transition-colors"
      >
        <ArrowPathIcon className={`size-3.5 ${busy ? "animate-spin" : ""}`} />
        {busy ? "Syncing…" : "Sync from Figma"}
      </button>
      <p className="text-[10px] text-[#71757D] leading-relaxed">
        Right-click frame in Figma → Copy link to selection. Slices land into
        Desktop / Mobile stacks below — re-syncing replaces previous slices.
      </p>
    </div>
  );
}
