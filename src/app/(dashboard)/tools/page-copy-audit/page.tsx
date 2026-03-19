"use client";

import { useState, useRef } from "react";
import { inputClass, labelClass } from "@/lib/form-styles";

/* ── Types ── */

type Brief = {
  clientName: string;
  productName: string;
  productType: string;
  niche: string;
  targetAudience: string;
  usps: string;
  competitors: string;
  pageGoal: string;
  additionalContext: string;
};

type VocData = {
  painPoints: string[];
  objections: string[];
  keyPhrases: string[];
};

type SectionUpload = {
  id: string;
  name: string;
  file: File;
  previewUrl: string;
  analysis: SectionAnalysis | null;
  analysing: boolean;
};

type SectionAnalysis = {
  score: number;
  working: string[];
  issues: string[];
  rewrites: { before: string; after: string }[];
  vocInsight?: string;
};

const SECTION_PRESETS = [
  "Hero / Above the Fold",
  "Benefit Callouts",
  "Product Description",
  "Ingredients / How It Works",
  "Social Proof / Reviews",
  "Trust Badges / Guarantees",
  "Comparison Table",
  "FAQ Section",
  "CTA / Purchase Area",
  "Announcement Bar",
];

const NICHE_OPTIONS = [
  "Health & Supplements",
  "Beauty & Skincare",
  "Pet Care",
  "Food & Beverage",
  "Fashion & Apparel",
  "Home & Lifestyle",
  "Other",
];

const scoreColor = (s: number) => (s >= 8 ? "text-emerald-600" : s >= 6 ? "text-amber-600" : "text-red-500");
const scoreBg = (s: number) => (s >= 8 ? "bg-emerald-500" : s >= 6 ? "bg-amber-500" : "bg-red-500");
const gradeFor = (s: number) => (s >= 8 ? "A" : s >= 6 ? "B" : s >= 4 ? "C" : s >= 2 ? "D" : "F");
const gradeColor = (g: string) =>
  g === "A" ? "text-emerald-600 bg-emerald-50" :
  g === "B" ? "text-blue-600 bg-blue-50" :
  g === "C" ? "text-amber-600 bg-amber-50" : "text-red-600 bg-red-50";

export default function PageCopyAuditPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Brief
  const [brief, setBrief] = useState<Brief>({
    clientName: "",
    productName: "",
    productType: "",
    niche: "",
    targetAudience: "",
    usps: "",
    competitors: "",
    pageGoal: "",
    additionalContext: "",
  });

  // Step 2: VOC
  const [vocLoading, setVocLoading] = useState(false);
  const [vocData, setVocData] = useState<VocData | null>(null);
  const [vocError, setVocError] = useState("");

  // Step 3: Sections
  const [sections, setSections] = useState<SectionUpload[]>([]);
  const [sectionName, setSectionName] = useState(SECTION_PRESETS[0]);
  const [customName, setCustomName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Step 4: Results
  const [activeSection, setActiveSection] = useState(0);

  const updateBrief = (field: keyof Brief, value: string) => {
    setBrief((b) => ({ ...b, [field]: value }));
  };

  const briefValid = brief.clientName.trim() && brief.productName.trim();

  /* ── Step 2: Run VOC Research ── */
  const handleVocResearch = async () => {
    setVocLoading(true);
    setVocError("");
    try {
      const res = await fetch("/api/copy-audit/voc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: brief.clientName,
          productType: brief.productType || brief.productName,
          targetAudience: brief.targetAudience,
          competitors: brief.competitors,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "VOC research failed");
      const data = await res.json();
      setVocData(data.vocData);
    } catch (err: any) {
      setVocError(err.message);
    } finally {
      setVocLoading(false);
    }
  };

  /* ── Step 3: Upload Section Screenshot ── */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const name = sectionName === "Custom" ? customName.trim() : sectionName;
    if (!name) return;

    const upload: SectionUpload = {
      id: crypto.randomUUID(),
      name,
      file,
      previewUrl: URL.createObjectURL(file),
      analysis: null,
      analysing: false,
    };
    setSections((prev) => [...prev, upload]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeSection = (id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
  };

  /* ── Step 4: Analyse a Section ── */
  const analyseSection = async (sectionId: string) => {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;

    setSections((prev) => prev.map((s) => s.id === sectionId ? { ...s, analysing: true } : s));

    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]); // strip data:image/...;base64, prefix
        };
        reader.readAsDataURL(section.file);
      });
      const contentType = section.file.type || "image/png";

      const res = await fetch("/api/copy-audit/analyse-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          imageType: contentType,
          sectionName: section.name,
          brief,
          vocData,
        }),
      });

      if (!res.ok) throw new Error((await res.json()).error || "Analysis failed");
      const data = await res.json();

      setSections((prev) =>
        prev.map((s) => s.id === sectionId ? { ...s, analysis: data.analysis, analysing: false } : s)
      );
    } catch (err: any) {
      console.error(err);
      setSections((prev) => prev.map((s) => s.id === sectionId ? { ...s, analysing: false } : s));
    }
  };

  const analyseAll = async () => {
    setStep(4);
    for (const section of sections) {
      if (!section.analysis) {
        await analyseSection(section.id);
      }
    }
  };

  const analysedSections = sections.filter((s) => s.analysis);
  const overallScore = analysedSections.length > 0
    ? analysedSections.reduce((sum, s) => sum + (s.analysis?.score || 0), 0) / analysedSections.length
    : 0;

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Page Copy Audit</h1>
        <p className="text-sm text-[#7A7A7A] mt-1">
          Evaluate and improve DTC product page copy using AI + Voice of Customer research
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 mb-8">
        {[
          { n: 1, label: "Brief" },
          { n: 2, label: "VOC Research" },
          { n: 3, label: "Upload Sections" },
          { n: 4, label: "Analysis" },
        ].map(({ n, label }) => (
          <button
            key={n}
            onClick={() => { if (n <= step || (n === 2 && briefValid)) setStep(n as 1 | 2 | 3 | 4); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
              step === n
                ? "bg-[#1B1B1B] text-white"
                : step > n
                ? "bg-emerald-50 text-emerald-700"
                : "bg-[#F3F3F5] text-[#AAA]"
            }`}
          >
            <span className={`inline-flex items-center justify-center size-5 rounded-full text-[10px] font-bold ${
              step > n ? "bg-emerald-500 text-white" : step === n ? "bg-white text-[#1B1B1B]" : "bg-[#E5E5EA] text-[#AAA]"
            }`}>
              {step > n ? "✓" : n}
            </span>
            {label}
          </button>
        ))}
      </div>

      {/* ═══ STEP 1: BRIEF ═══ */}
      {step === 1 && (
        <div className="border border-[#E5E5EA] rounded-xl bg-white p-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-[#1A1A1A] mb-1">Project Brief</h2>
            <p className="text-xs text-[#AAA]">Tell us about the product and page so we can give targeted copy feedback</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Client / Brand Name *</label>
              <input type="text" value={brief.clientName} onChange={(e) => updateBrief("clientName", e.target.value)} className={inputClass} placeholder="e.g. AG1, Obvi, PetLab Co." />
            </div>
            <div>
              <label className={labelClass}>Product Name *</label>
              <input type="text" value={brief.productName} onChange={(e) => updateBrief("productName", e.target.value)} className={inputClass} placeholder="e.g. Athletic Greens, Collagenic Burn" />
            </div>
            <div>
              <label className={labelClass}>Product Type</label>
              <input type="text" value={brief.productType} onChange={(e) => updateBrief("productType", e.target.value)} className={inputClass} placeholder="e.g. Greens powder, Collagen supplement" />
            </div>
            <div>
              <label className={labelClass}>Niche</label>
              <select value={brief.niche} onChange={(e) => updateBrief("niche", e.target.value)} className={inputClass}>
                <option value="">Select...</option>
                {NICHE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Target Audience</label>
              <input type="text" value={brief.targetAudience} onChange={(e) => updateBrief("targetAudience", e.target.value)} className={inputClass} placeholder="e.g. Health-conscious women 25-45 looking to simplify their supplement routine" />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Key USPs / Differentiators</label>
              <textarea value={brief.usps} onChange={(e) => updateBrief("usps", e.target.value)} className={inputClass + " min-h-[60px]"} placeholder="e.g. 60 ingredients in one scoop, third-party tested, 85K+ reviews" />
            </div>
            <div>
              <label className={labelClass}>Competitors</label>
              <input type="text" value={brief.competitors} onChange={(e) => updateBrief("competitors", e.target.value)} className={inputClass} placeholder="e.g. Gruns, IM8, multivitamins" />
            </div>
            <div>
              <label className={labelClass}>Page Goal</label>
              <select value={brief.pageGoal} onChange={(e) => updateBrief("pageGoal", e.target.value)} className={inputClass}>
                <option value="">Select...</option>
                <option value="purchase">Drive Purchase</option>
                <option value="subscription">Drive Subscription</option>
                <option value="lead">Lead Generation</option>
                <option value="education">Educate & Build Trust</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Additional Context</label>
              <textarea value={brief.additionalContext} onChange={(e) => updateBrief("additionalContext", e.target.value)} className={inputClass + " min-h-[60px]"} placeholder="Anything else relevant — tone preferences, specific issues to look at, etc." />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setStep(2)}
              disabled={!briefValid}
              className="px-6 py-2.5 bg-[#1B1B1B] text-white text-sm font-medium rounded-lg hover:bg-[#2D2D2D] disabled:opacity-30"
            >
              Next: VOC Research →
            </button>
          </div>
        </div>
      )}

      {/* ═══ STEP 2: VOC RESEARCH ═══ */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="border border-[#E5E5EA] rounded-xl bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-[#1A1A1A]">Voice of Customer Research</h2>
                <p className="text-xs text-[#AAA] mt-0.5">
                  We&apos;ll scrape Trustpilot and Reddit for real customer language about {brief.clientName || "this brand"}
                </p>
              </div>
              <button
                onClick={handleVocResearch}
                disabled={vocLoading}
                className="px-5 py-2 bg-[#1B1B1B] text-white text-xs font-medium rounded-lg hover:bg-[#2D2D2D] disabled:opacity-50"
              >
                {vocLoading ? "Researching..." : vocData ? "Re-run Research" : "Run VOC Research"}
              </button>
            </div>

            {vocLoading && (
              <div className="flex items-center gap-3 p-4 bg-[#FAFAFA] rounded-lg">
                <div className="animate-spin size-5 border-2 border-[#E5E5EA] border-t-[#1A1A1A] rounded-full" />
                <p className="text-xs text-[#777]">Searching Trustpilot and Reddit for customer feedback...</p>
              </div>
            )}

            {vocError && (
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-xs text-red-600">{vocError}</p>
              </div>
            )}

            {vocData && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-[#E8E8E8] rounded-lg p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-red-500 mb-2">Pain Points</p>
                  <div className="space-y-2">
                    {vocData.painPoints.map((p, i) => (
                      <p key={i} className="text-xs text-[#555] italic leading-relaxed">{p}</p>
                    ))}
                  </div>
                </div>
                <div className="border border-[#E8E8E8] rounded-lg p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 mb-2">Objections</p>
                  <div className="space-y-2">
                    {vocData.objections.map((o, i) => (
                      <p key={i} className="text-xs text-[#555] italic leading-relaxed">{o}</p>
                    ))}
                  </div>
                </div>
                <div className="border border-[#E8E8E8] rounded-lg p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 mb-2">Key Phrases</p>
                  <div className="flex flex-wrap gap-1.5">
                    {vocData.keyPhrases.map((kp, i) => (
                      <span key={i} className="inline-block px-2 py-1 text-[10px] font-medium text-blue-700 bg-blue-50 rounded-full">{kp}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <button onClick={() => setStep(1)} className="text-xs text-[#7A7A7A] hover:text-[#1A1A1A]">← Back to Brief</button>
            <button
              onClick={() => setStep(3)}
              className="px-6 py-2.5 bg-[#1B1B1B] text-white text-sm font-medium rounded-lg hover:bg-[#2D2D2D]"
            >
              Next: Upload Sections →
            </button>
          </div>
        </div>
      )}

      {/* ═══ STEP 3: UPLOAD SECTIONS ═══ */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="border border-[#E5E5EA] rounded-xl bg-white p-6">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-[#1A1A1A]">Upload Page Sections</h2>
              <p className="text-xs text-[#AAA] mt-0.5">
                Screenshot each section of your page design and upload them here. The AI will analyse each section individually.
              </p>
            </div>

            {/* Upload Form */}
            <div className="flex items-end gap-3 mb-6">
              <div className="flex-1">
                <label className={labelClass}>Section</label>
                <select value={sectionName} onChange={(e) => setSectionName(e.target.value)} className={inputClass}>
                  {SECTION_PRESETS.map((p) => <option key={p} value={p}>{p}</option>)}
                  <option value="Custom">Custom...</option>
                </select>
              </div>
              {sectionName === "Custom" && (
                <div className="flex-1">
                  <label className={labelClass}>Custom Name</label>
                  <input type="text" value={customName} onChange={(e) => setCustomName(e.target.value)} className={inputClass} placeholder="Section name..." />
                </div>
              )}
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="px-4 py-2 bg-[#1B1B1B] text-white text-xs font-medium rounded-lg hover:bg-[#2D2D2D]"
                >
                  Upload Screenshot
                </button>
              </div>
            </div>

            {/* Uploaded Sections */}
            {sections.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sections.map((s) => (
                  <div key={s.id} className="border border-[#E8E8E8] rounded-lg overflow-hidden">
                    <img src={s.previewUrl} alt={s.name} className="w-full h-40 object-cover object-top bg-[#F5F5F5]" />
                    <div className="flex items-center justify-between px-3 py-2">
                      <p className="text-xs font-medium text-[#1A1A1A]">{s.name}</p>
                      <button onClick={() => removeSection(s.id)} className="text-[10px] text-[#CCC] hover:text-red-500">Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-[#E5E5EA] rounded-lg p-12 text-center">
                <p className="text-sm text-[#AAA]">No sections uploaded yet</p>
                <p className="text-xs text-[#CCC] mt-1">Screenshot each section of your Figma design and upload above</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <button onClick={() => setStep(2)} className="text-xs text-[#7A7A7A] hover:text-[#1A1A1A]">← Back to VOC</button>
            <button
              onClick={analyseAll}
              disabled={sections.length === 0}
              className="px-6 py-2.5 bg-[#1B1B1B] text-white text-sm font-medium rounded-lg hover:bg-[#2D2D2D] disabled:opacity-30"
            >
              Analyse All Sections →
            </button>
          </div>
        </div>
      )}

      {/* ═══ STEP 4: RESULTS ═══ */}
      {step === 4 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left — Scores */}
          <div className="space-y-4">
            {/* Overall */}
            {analysedSections.length > 0 && (
              <div className="border border-[#E5E5EA] rounded-xl bg-white p-5 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-2">Overall Score</p>
                <div className={`inline-flex items-center justify-center size-20 rounded-2xl text-3xl font-bold ${gradeColor(gradeFor(overallScore))}`}>
                  {gradeFor(overallScore)}
                </div>
                <p className="text-2xl font-bold text-[#1A1A1A] mt-2">{overallScore.toFixed(1)}/10</p>
              </div>
            )}

            {/* Section List */}
            <div className="border border-[#E5E5EA] rounded-xl bg-white overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[#F0F0F0]">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA]">Sections</p>
              </div>
              {sections.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(i)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-[#F5F5F5] last:border-0 ${
                    activeSection === i ? "bg-[#F7F8FA]" : "hover:bg-[#FAFAFA]"
                  }`}
                >
                  {s.analysing ? (
                    <div className="animate-spin size-4 border-2 border-[#E5E5EA] border-t-[#1A1A1A] rounded-full" />
                  ) : s.analysis ? (
                    <span className={`text-xs font-bold min-w-[28px] ${scoreColor(s.analysis.score)}`}>{s.analysis.score}</span>
                  ) : (
                    <span className="text-xs text-[#CCC] min-w-[28px]">—</span>
                  )}
                  <span className="text-xs font-medium text-[#1A1A1A] flex-1">{s.name}</span>
                </button>
              ))}
            </div>

            {/* Back button */}
            <button onClick={() => setStep(3)} className="text-xs text-[#7A7A7A] hover:text-[#1A1A1A]">← Back to Sections</button>
          </div>

          {/* Right — Active Section Detail */}
          <div className="lg:col-span-2 space-y-4">
            {(() => {
              const s = sections[activeSection];
              if (!s) return null;

              return (
                <>
                  {/* Screenshot Preview */}
                  <div className="border border-[#E5E5EA] rounded-xl overflow-hidden bg-white">
                    <div className="px-4 py-2.5 border-b border-[#F0F0F0]">
                      <p className="text-xs font-semibold text-[#1A1A1A]">{s.name}</p>
                    </div>
                    <img src={s.previewUrl} alt={s.name} className="w-full max-h-80 object-contain bg-[#FAFAFA]" />
                  </div>

                  {s.analysing && (
                    <div className="border border-[#E5E5EA] rounded-xl bg-white p-8 text-center">
                      <div className="animate-spin size-6 border-2 border-[#E5E5EA] border-t-[#1A1A1A] rounded-full mx-auto mb-3" />
                      <p className="text-sm font-medium text-[#1A1A1A]">Analysing {s.name}...</p>
                      <p className="text-xs text-[#AAA] mt-1">Reading copy and evaluating against DTC framework</p>
                    </div>
                  )}

                  {s.analysis && (
                    <>
                      {/* Score */}
                      <div className="border border-[#E5E5EA] rounded-xl bg-white p-5">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-base font-semibold text-[#1A1A1A]">{s.name}</h3>
                          <span className={`text-lg font-bold ${scoreColor(s.analysis.score)}`}>{s.analysis.score}/10</span>
                        </div>
                        <div className="h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
                          <div className={`h-full ${scoreBg(s.analysis.score)} rounded-full`} style={{ width: `${s.analysis.score * 10}%` }} />
                        </div>
                      </div>

                      {/* What's Working */}
                      {s.analysis.working.length > 0 && (
                        <div className="border border-[#E5E5EA] rounded-xl bg-white p-5">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 mb-3">What&apos;s Working</p>
                          <div className="space-y-2">
                            {s.analysis.working.map((w, i) => (
                              <div key={i} className="flex items-start gap-2">
                                <svg className="size-4 text-emerald-500 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                                </svg>
                                <p className="text-sm text-[#555]">{w}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Issues */}
                      {s.analysis.issues.length > 0 && (
                        <div className="border border-[#E5E5EA] rounded-xl bg-white p-5">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-red-500 mb-3">Issues Found</p>
                          <div className="space-y-2">
                            {s.analysis.issues.map((issue, i) => (
                              <div key={i} className="flex items-start gap-2">
                                <svg className="size-4 text-red-400 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                </svg>
                                <p className="text-sm text-[#555]">{issue}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Rewrites */}
                      {s.analysis.rewrites.length > 0 && (
                        <div className="border border-[#E5E5EA] rounded-xl bg-white p-5">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-3">Suggested Rewrites</p>
                          <div className="space-y-3">
                            {s.analysis.rewrites.map((rw, i) => (
                              <div key={i} className="rounded-lg border border-[#F0F0F0] overflow-hidden">
                                <div className="px-4 py-2.5 bg-red-50/50 border-b border-[#F0F0F0]">
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-red-400 mb-1">Before</p>
                                  <p className="text-sm text-[#555] line-through">{rw.before}</p>
                                </div>
                                <div className="px-4 py-2.5 bg-emerald-50/50">
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 mb-1">After</p>
                                  <p className="text-sm text-[#1A1A1A] font-medium">{rw.after}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* VOC Insight */}
                      {s.analysis.vocInsight && (
                        <div className="border border-blue-200 rounded-xl bg-blue-50/30 p-5">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 mb-2">Voice of Customer Insight</p>
                          <p className="text-sm text-[#555]">{s.analysis.vocInsight}</p>
                        </div>
                      )}
                    </>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
