"use client";

import { useState, useRef, useEffect } from "react";
import { inputClass, labelClass } from "@/lib/form-styles";
import { loadSettings } from "@/lib/settings";

type ColourEntry = { hex: string; name: string; usage: string };
type FontEntry = { name: string; weight: string; style: string; fallback: string };

type DesignSystem = {
  brand_analysis: string;
  palette: Record<string, ColourEntry>;
  fonts: Record<string, FontEntry>;
  typography_scale: Record<string, string>;
  spacing: Record<string, string>;
  buttons: Record<string, { bg: string; text: string; radius?: string; border?: string; style: string }>;
  design_direction: string[];
  avoid: string[];
};

export default function DesignSystemPage() {
  const [url, setUrl] = useState("");
  const [niche, setNiche] = useState("");
  const [notes, setNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<DesignSystem | null>(null);
  const [error, setError] = useState("");
  const [images, setImages] = useState<{ data: string; type: string }[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [knowledgeBase, setKnowledgeBase] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSettings().then((s) => {
      if (s.audit_knowledge_base) setKnowledgeBase(s.audit_knowledge_base);
    });
  }, []);

  // Paste handler
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) addImage(file);
          return;
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  const addImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      setImages((prev) => [...prev, { data: base64, type: file.type || "image/png" }]);
      setImagePreviews((prev) => [...prev, dataUrl]);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!url.trim() && images.length === 0) return;
    setGenerating(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/design-system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), images, niche: niche.trim(), notes: notes.trim(), knowledgeBase }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      setResult(data.designSystem);
    } catch (err: any) {
      setError(err?.message || "Generation failed");
    }
    setGenerating(false);
  };

  const paletteEntries = result?.palette ? Object.entries(result.palette) : [];
  const fontEntries = result?.fonts ? Object.entries(result.fonts) : [];

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Design System Generator</h1>
        <p className="text-sm text-[#7A7A7A] mt-1">
          Feed it a store URL or screenshots — get a complete design system in seconds
        </p>
      </div>

      {/* Input */}
      <div className="border border-[#E5E5EA] rounded-xl bg-white p-5 mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Store URL</label>
            <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} className={inputClass} placeholder="https://brand.com" />
          </div>
          <div>
            <label className={labelClass}>Niche</label>
            <input type="text" value={niche} onChange={(e) => setNiche(e.target.value)} className={inputClass} placeholder="e.g. Supplements, Skincare, Pet..." />
          </div>
        </div>
        <div>
          <label className={labelClass}>Notes for the designer (optional)</label>
          <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} placeholder="e.g. Client wants a premium feel, dark mode, modern..." />
        </div>

        {/* Image upload */}
        <div>
          <label className={labelClass}>Inspo Screenshots (paste Cmd+V or upload)</label>
          <div className="flex items-center gap-3 flex-wrap">
            {imagePreviews.map((src, i) => (
              <div key={i} className="relative">
                <img src={src} alt="" className="h-16 w-auto rounded border border-[#E5E5EA]" />
                <button
                  onClick={() => {
                    setImages((prev) => prev.filter((_, idx) => idx !== i));
                    setImagePreviews((prev) => prev.filter((_, idx) => idx !== i));
                  }}
                  className="absolute -top-1.5 -right-1.5 size-4 bg-red-500 text-white rounded-full text-[9px] flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            ))}
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => {
              Array.from(e.target.files || []).forEach(addImage);
              if (fileRef.current) fileRef.current.value = "";
            }} />
            <button onClick={() => fileRef.current?.click()} className="h-16 px-4 border-2 border-dashed border-[#E5E5EA] rounded text-xs text-[#AAA] hover:border-[#999]">
              + Upload
            </button>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating || (!url.trim() && images.length === 0)}
          className="px-5 py-2.5 bg-[#1B1B1B] text-white text-xs font-medium rounded-lg hover:bg-[#2D2D2D] disabled:opacity-30"
        >
          {generating ? "Generating..." : "Generate Design System"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-6">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {generating && (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin size-6 border-2 border-[#E5E5EA] border-t-[#1A1A1A] rounded-full mr-3" />
          <p className="text-sm text-[#777]">Analysing brand and generating design system...</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Brand Analysis */}
          <div className="border border-[#E5E5EA] rounded-xl bg-white p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-2">Brand Analysis</p>
            <p className="text-sm text-[#333] leading-relaxed">{result.brand_analysis}</p>
          </div>

          {/* Colour Palette */}
          <div className="border border-[#E5E5EA] rounded-xl bg-white overflow-hidden">
            <div className="px-5 py-3 border-b border-[#F0F0F0]">
              <p className="text-sm font-semibold">Colour Palette</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-0">
              {paletteEntries.map(([key, colour]) => (
                <div key={key} className="border-b md:border-b-0 md:border-r border-[#F0F0F0] last:border-0 p-4">
                  <div
                    className="w-full aspect-square rounded-lg mb-3 border border-[#E8E8E8]"
                    style={{ backgroundColor: colour.hex }}
                  />
                  <p className="text-xs font-semibold text-[#1A1A1A] font-mono">{colour.hex}</p>
                  <p className="text-[10px] text-[#777] mt-0.5">{colour.name || key.replace(/_/g, " ")}</p>
                  <p className="text-[10px] text-[#AAA] mt-0.5">{colour.usage}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Fonts */}
          <div className="border border-[#E5E5EA] rounded-xl bg-white overflow-hidden">
            <div className="px-5 py-3 border-b border-[#F0F0F0]">
              <p className="text-sm font-semibold">Typography</p>
            </div>
            <div className="divide-y divide-[#F0F0F0]">
              {fontEntries.map(([role, font]) => (
                <div key={role} className="px-5 py-4 flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA]">{role}</p>
                    <p className="text-lg font-semibold text-[#1A1A1A] mt-1" style={{ fontFamily: font.name }}>
                      {font.name}
                    </p>
                    <p className="text-xs text-[#777] mt-0.5">{font.style}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono text-[#999]">Weight: {font.weight}</p>
                    <p className="text-[10px] text-[#CCC] mt-0.5">{font.fallback}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Typography Scale */}
          {result.typography_scale && (
            <div className="border border-[#E5E5EA] rounded-xl bg-white overflow-hidden">
              <div className="px-5 py-3 border-b border-[#F0F0F0]">
                <p className="text-sm font-semibold">Type Scale</p>
              </div>
              <div className="divide-y divide-[#F0F0F0]">
                {Object.entries(result.typography_scale).map(([level, size]) => (
                  <div key={level} className="px-5 py-3 flex items-center justify-between">
                    <p className="text-xs font-medium text-[#1A1A1A] uppercase tracking-wider">{level}</p>
                    <p className="text-sm font-mono text-[#777]">{size}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Buttons */}
          {result.buttons && (
            <div className="border border-[#E5E5EA] rounded-xl bg-white overflow-hidden">
              <div className="px-5 py-3 border-b border-[#F0F0F0]">
                <p className="text-sm font-semibold">Buttons</p>
              </div>
              <div className="px-5 py-4 space-y-4">
                {Object.entries(result.buttons).map(([type, btn]) => (
                  <div key={type} className="flex items-center gap-4">
                    <button
                      className="px-6 py-2.5 text-sm font-medium transition-colors"
                      style={{
                        backgroundColor: btn.bg === "transparent" ? "transparent" : btn.bg,
                        color: btn.text,
                        borderRadius: btn.radius || "8px",
                        border: btn.border ? `1px solid ${btn.border}` : btn.bg === "transparent" ? "1px solid #DDD" : "none",
                      }}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)} Button
                    </button>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA]">{type}</p>
                      <p className="text-xs text-[#777]">{btn.style}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Spacing */}
          {result.spacing && (
            <div className="border border-[#E5E5EA] rounded-xl bg-white overflow-hidden">
              <div className="px-5 py-3 border-b border-[#F0F0F0]">
                <p className="text-sm font-semibold">Spacing</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-[#F0F0F0]">
                {Object.entries(result.spacing).map(([key, val]) => (
                  <div key={key} className="p-4 text-center">
                    <p className="text-lg font-mono font-bold text-[#1A1A1A]">{val}</p>
                    <p className="text-[10px] text-[#AAA] mt-1">{key.replace(/_/g, " ")}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Design Direction + Avoid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {result.design_direction?.length > 0 && (
              <div className="border border-[#E5E5EA] rounded-xl bg-white p-5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 mb-3">Design Direction</p>
                <div className="space-y-2">
                  {result.design_direction.map((d, i) => (
                    <p key={i} className="text-xs text-[#555] leading-relaxed">• {d}</p>
                  ))}
                </div>
              </div>
            )}
            {result.avoid?.length > 0 && (
              <div className="border border-[#E5E5EA] rounded-xl bg-white p-5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-red-500 mb-3">Avoid</p>
                <div className="space-y-2">
                  {result.avoid.map((a, i) => (
                    <p key={i} className="text-xs text-[#555] leading-relaxed">• {a}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
