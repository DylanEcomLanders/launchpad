"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Logo } from "@/components/logo";

const DEFAULT_CONTENT = {
  heroLabel: "Referral Programme",
  heroTitle: "Know a brand that\ndeserves better pages?",
  heroSubtitle: "Refer them to us. If they sign, you earn a cut of the project fee. No strings, no forms, no nonsense.",
  commLabel: "Your Commission",
  comm1Value: "7.5%",
  comm1Desc: "First two referrals",
  comm2Value: "10%",
  comm2Desc: "Every referral after",
  commFootnote: "Calculated on total project fee. Paid within 30 days of project completion.",
  howLabel: "How It Works",
  step1Title: "Introduce us",
  step1Desc: "Send them our way. WhatsApp intro, email CC, or just drop their name to us. Takes 30 seconds.",
  step2Title: "We handle everything",
  step2Desc: "Free audit, discovery call, proposal. You don't sell anything — we do the heavy lifting.",
  step3Title: "Get paid",
  step3Desc: "Project starts, your commission is locked in. We pay you — simple as that.",
  numbersLabel: "Real Numbers",
  ex1Label: "£3,000 Page Build",
  ex1Value: "£225",
  ex1Desc: "Your commission at 7.5%",
  ex2Label: "£5,000 Project (3rd referral)",
  ex2Value: "£500",
  ex2Desc: "Your commission at 10%",
  buildLabel: "What We Build",
  build1Title: "Page Builds",
  build1Desc: "High-converting PDPs, homepages, landing pages for Shopify.",
  build2Title: "CRO Retainers",
  build2Desc: "Weekly A/B testing that compounds conversion improvements.",
  build3Title: "Funnels & Advertorials",
  build3Desc: "Pre-sell pages that warm up cold traffic before checkout.",
  build4Title: "Full Redesigns",
  build4Desc: "Complete Shopify themes built around conversion.",
  ctaTitle: "Got someone in mind?",
  ctaSubtitle: "Drop us a message with the introduction. We'll take it from there.",
  whatsappUrl: "https://wa.me/447000000000",
  calUrl: "https://cal.com/ecomlanders",
};

type ContentKey = keyof typeof DEFAULT_CONTENT;

const LS_KEY = "referral-page-content";

function E({ k, content, onChange, className, tag, editable }: { k: ContentKey; content: Record<string, string>; onChange: (k: ContentKey, v: string) => void; className?: string; tag?: "p" | "h1" | "h2" | "span"; editable?: boolean }) {
  const Tag = tag || "p";

  return (
    <Tag
      {...(editable ? { contentEditable: true, suppressContentEditableWarning: true } : {})}
      className={`outline-none ${editable ? "focus:ring-2 focus:ring-[#4ADE80]/30 focus:rounded-sm cursor-text" : ""} ${className || ""}`}
      onBlur={editable ? (e: any) => onChange(k, e.currentTarget.textContent || "") : undefined}
      dangerouslySetInnerHTML={{ __html: (content[k] || "").replace(/\n/g, "<br>") }}
    />
  );
}

export default function ReferralProgrammePage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <ReferralProgrammeInner />
    </Suspense>
  );
}

function ReferralProgrammeInner() {
  const searchParams = useSearchParams();
  const canEdit = searchParams.get("edit") === "true";
  const [content, setContent] = useState<Record<string, string>>(DEFAULT_CONTENT);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) {
      try { setContent({ ...DEFAULT_CONTENT, ...JSON.parse(stored) }); } catch {}
    }
  }, []);

  const update = (k: ContentKey, v: string) => {
    setContent((prev) => ({ ...prev, [k]: v }));
    setEditing(true);
  };

  const handleSave = () => {
    localStorage.setItem(LS_KEY, JSON.stringify(content));
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setContent(DEFAULT_CONTENT);
    localStorage.removeItem(LS_KEY);
    setEditing(false);
  };

  return (
    <div className="min-h-screen relative">
      {/* Edit toolbar — only visible with ?edit=true */}
      {canEdit && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
          {editing && (
            <button onClick={handleReset} className="px-3 py-1.5 text-[11px] font-medium text-[#777] bg-white border border-[#E5E5EA] rounded-lg shadow-sm hover:bg-[#F5F5F5]">
              Reset
            </button>
          )}
          <button
            onClick={handleSave}
            className={`px-4 py-1.5 text-[11px] font-medium rounded-lg shadow-sm transition-colors ${
              saved ? "bg-[#4ADE80] text-white" : editing ? "bg-[#0A0A0A] text-white hover:bg-[#1A1A1A]" : "bg-white text-[#AAA] border border-[#E5E5EA]"
            }`}
          >
            {saved ? "Saved ✓" : editing ? "Save Changes" : "Edit Mode"}
          </button>
        </div>
      )}

      {/* ── Hero (Dark) ── */}
      <section className="bg-[#0A0A0A] text-white px-6 py-20 md:py-28">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-10">
            <Logo height={18} />
          </div>
          <E k="heroLabel" content={content} onChange={update} editable={canEdit} tag="p" className="text-xs font-semibold uppercase tracking-[0.2em] text-[#4ADE80] mb-4" />
          <E k="heroTitle" content={content} onChange={update} editable={canEdit} tag="h1" className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.1] mb-6" />
          <E k="heroSubtitle" content={content} onChange={update} editable={canEdit} tag="p" className="text-base md:text-lg text-[#999] leading-relaxed max-w-lg mx-auto" />
        </div>
      </section>

      {/* ── Commission (White) ── */}
      <section className="bg-white px-6 py-16 md:py-20">
        <div className="max-w-2xl mx-auto">
          <E k="commLabel" content={content} onChange={update} editable={canEdit} tag="p" className="text-xs font-semibold uppercase tracking-[0.2em] text-[#CCC] mb-8 text-center" />
          <div className="grid grid-cols-2 gap-0 border border-[#E8E8E8] rounded-2xl overflow-hidden">
            <div className="p-10 text-center border-r border-[#E8E8E8]">
              <E k="comm1Value" content={content} onChange={update} editable={canEdit} tag="p" className="text-5xl md:text-6xl font-bold text-[#1A1A1A] tracking-tight" />
              <E k="comm1Desc" content={content} onChange={update} editable={canEdit} tag="p" className="text-sm text-[#999] mt-3" />
            </div>
            <div className="p-10 text-center bg-[#F8FFF8]">
              <E k="comm2Value" content={content} onChange={update} editable={canEdit} tag="p" className="text-5xl md:text-6xl font-bold text-[#4ADE80] tracking-tight" />
              <E k="comm2Desc" content={content} onChange={update} editable={canEdit} tag="p" className="text-sm text-[#999] mt-3" />
            </div>
          </div>
          <E k="commFootnote" content={content} onChange={update} editable={canEdit} tag="p" className="text-[11px] text-[#CCC] text-center mt-4" />
        </div>
      </section>

      {/* ── How It Works (Dark) ── */}
      <section className="bg-[#0A0A0A] text-white px-6 py-16 md:py-20">
        <div className="max-w-2xl mx-auto">
          <E k="howLabel" content={content} onChange={update} editable={canEdit} tag="p" className="text-xs font-semibold uppercase tracking-[0.2em] text-[#4ADE80] mb-10 text-center" />
          <div className="space-y-12">
            <div className="flex items-start gap-6">
              <div className="shrink-0 size-12 rounded-full border-2 border-[#333] flex items-center justify-center text-lg font-bold text-white">1</div>
              <div>
                <E k="step1Title" content={content} onChange={update} editable={canEdit} tag="p" className="text-lg font-bold mb-1" />
                <E k="step1Desc" content={content} onChange={update} editable={canEdit} tag="p" className="text-sm text-[#888] leading-relaxed" />
              </div>
            </div>
            <div className="flex items-start gap-6">
              <div className="shrink-0 size-12 rounded-full border-2 border-[#333] flex items-center justify-center text-lg font-bold text-white">2</div>
              <div>
                <E k="step2Title" content={content} onChange={update} editable={canEdit} tag="p" className="text-lg font-bold mb-1" />
                <E k="step2Desc" content={content} onChange={update} editable={canEdit} tag="p" className="text-sm text-[#888] leading-relaxed" />
              </div>
            </div>
            <div className="flex items-start gap-6">
              <div className="shrink-0 size-12 rounded-full border-2 border-[#4ADE80] flex items-center justify-center text-lg font-bold text-[#4ADE80]">3</div>
              <div>
                <E k="step3Title" content={content} onChange={update} editable={canEdit} tag="p" className="text-lg font-bold mb-1" />
                <E k="step3Desc" content={content} onChange={update} editable={canEdit} tag="p" className="text-sm text-[#888] leading-relaxed" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Example (White) ── */}
      <section className="bg-white px-6 py-16 md:py-20">
        <div className="max-w-2xl mx-auto">
          <E k="numbersLabel" content={content} onChange={update} editable={canEdit} tag="p" className="text-xs font-semibold uppercase tracking-[0.2em] text-[#CCC] mb-8 text-center" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-[#E8E8E8] rounded-2xl p-8">
              <E k="ex1Label" content={content} onChange={update} editable={canEdit} tag="p" className="text-xs text-[#AAA] uppercase tracking-wider mb-2" />
              <E k="ex1Value" content={content} onChange={update} editable={canEdit} tag="p" className="text-3xl font-bold text-[#1A1A1A]" />
              <E k="ex1Desc" content={content} onChange={update} editable={canEdit} tag="p" className="text-xs text-[#999] mt-1" />
            </div>
            <div className="border border-[#E8E8E8] rounded-2xl p-8 bg-[#F8FFF8]">
              <E k="ex2Label" content={content} onChange={update} editable={canEdit} tag="p" className="text-xs text-[#AAA] uppercase tracking-wider mb-2" />
              <E k="ex2Value" content={content} onChange={update} editable={canEdit} tag="p" className="text-3xl font-bold text-[#4ADE80]" />
              <E k="ex2Desc" content={content} onChange={update} editable={canEdit} tag="p" className="text-xs text-[#999] mt-1" />
            </div>
          </div>
        </div>
      </section>

      {/* ── What We Do (Dark) ── */}
      <section className="bg-[#0A0A0A] text-white px-6 py-16 md:py-20">
        <div className="max-w-2xl mx-auto">
          <E k="buildLabel" content={content} onChange={update} editable={canEdit} tag="p" className="text-xs font-semibold uppercase tracking-[0.2em] text-[#4ADE80] mb-8 text-center" />
          <div className="grid grid-cols-2 gap-4">
            {[
              { t: "build1Title" as ContentKey, d: "build1Desc" as ContentKey },
              { t: "build2Title" as ContentKey, d: "build2Desc" as ContentKey },
              { t: "build3Title" as ContentKey, d: "build3Desc" as ContentKey },
              { t: "build4Title" as ContentKey, d: "build4Desc" as ContentKey },
            ].map(({ t, d }) => (
              <div key={t} className="border border-[#222] rounded-xl p-5">
                <E k={t} content={content} onChange={update} editable={canEdit} tag="p" className="text-sm font-bold mb-1" />
                <E k={d} content={content} onChange={update} editable={canEdit} tag="p" className="text-xs text-[#777] leading-relaxed" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA (White) ── */}
      <section className="bg-white px-6 py-20 md:py-28">
        <div className="max-w-2xl mx-auto text-center">
          <E k="ctaTitle" content={content} onChange={update} editable={canEdit} tag="h2" className="text-3xl md:text-4xl font-bold tracking-tight text-[#1A1A1A] mb-3" />
          <E k="ctaSubtitle" content={content} onChange={update} editable={canEdit} tag="p" className="text-sm text-[#777] mb-8 max-w-md mx-auto" />
          <div className="flex items-center justify-center gap-4">
            <a href={content.whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 px-8 py-4 bg-[#0A0A0A] text-white text-sm font-semibold rounded-xl hover:bg-[#1A1A1A] transition-colors">
              <svg className="size-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp Us
            </a>
            <a href={content.calUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-8 py-4 border-2 border-[#E5E5EA] text-[#1A1A1A] text-sm font-semibold rounded-xl hover:border-[#1A1A1A] transition-colors">
              Book a Call
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <div className="bg-[#0A0A0A] px-6 py-8 text-center">
        <Logo height={14} />
        <p className="text-[10px] text-[#555] mt-3">© 2026 Ecomlanders. All rights reserved.</p>
      </div>
    </div>
  );
}
