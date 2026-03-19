"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { inputClass, labelClass } from "@/lib/form-styles";

type FlagItem = { quote: string; rule: string; why: string };
type PassItem = { element: string; why: string };

type SectionResult = {
  id: string;
  name: string;
  previewUrl: string;
  analysis: {
    redFlags: FlagItem[];
    warnings: FlagItem[];
    passing: PassItem[];
    vocGaps: string[];
    summary: string;
  } | null;
  analysing: boolean;
};

type VocData = {
  painPoints: string[];
  objections: string[];
  keyPhrases: string[];
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
  "Full Page",
];


export default function PageCopyAuditPage() {
  const [brief, setBrief] = useState("");
  const [brandName, setBrandName] = useState("");
  const [sectionName, setSectionName] = useState(SECTION_PRESETS[0]);
  const [sections, setSections] = useState<SectionResult[]>([]);
  const [vocData, setVocData] = useState<VocData | null>(null);
  const [vocLoading, setVocLoading] = useState(false);
  const [vocDone, setVocDone] = useState(false);
  const [briefLocked, setBriefLocked] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Chat
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const briefReady = briefLocked && brief.trim().length > 0;

  /* ── Run VOC in background ── */
  const runVoc = async (brand: string) => {
    if (vocDone || vocLoading || !brand.trim()) return;
    setVocLoading(true);
    try {
      const res = await fetch("/api/copy-audit/voc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandName: brand, productType: brief }),
      });
      if (res.ok) {
        const data = await res.json();
        setVocData(data.vocData);
      }
    } catch { /* silent */ }
    setVocLoading(false);
    setVocDone(true);
  };

  /* ── Shared analyse function ── */
  const analyseImage = useCallback(async (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    const id = crypto.randomUUID();
    const name = sectionName;

    const newSection: SectionResult = { id, name, previewUrl, analysis: null, analysing: true };
    setSections((prev) => [...prev, newSection]);

    // Kick off VOC if brand name exists and not done yet
    if (brandName.trim() && !vocDone && !vocLoading) {
      runVoc(brandName);
    }

    // Convert to base64
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.readAsDataURL(file);
    });

    try {
      const res = await fetch("/api/copy-audit/analyse-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          imageType: file.type || "image/png",
          sectionName: name,
          brief: { clientName: brandName, productName: "", productType: "", niche: "", targetAudience: "", usps: "", competitors: "", pageGoal: "", additionalContext: brief },
          vocData,
          previousAnalysis: sections.find((s) => s.id === id)?.analysis || null,
        }),
      });

      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();

      setSections((prev) =>
        prev.map((s) => s.id === id ? { ...s, analysis: data.analysis, analysing: false } : s)
      );
    } catch {
      setSections((prev) =>
        prev.map((s) => s.id === id ? { ...s, analysing: false } : s)
      );
    }
  }, [sectionName, brandName, brief, vocData, vocDone, vocLoading]);

  /* ── Stage a file (from upload or paste) ── */
  const stageFile = (file: File) => {
    setPendingFile(file);
    setPendingPreview(URL.createObjectURL(file));
  };

  /* ── File upload ── */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileRef.current) fileRef.current.value = "";
    if (briefReady) {
      stageFile(file);
    }
  };

  /* ── Analyse the staged file ── */
  const handleAnalyse = () => {
    if (!pendingFile || !briefReady) return;
    analyseImage(pendingFile);
    setPendingFile(null);
    setPendingPreview(null);
  };

  /* ── Paste from clipboard (Cmd+V) ── */
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!briefReady) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) stageFile(file);
          return;
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [briefReady]);

  const removeSection = (id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
  };

  /* ── Chat ── */
  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: msg }]);
    setChatLoading(true);

    try {
      const res = await fetch("/api/copy-audit/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          brief: brief,
          vocData,
          history: chatMessages,
        }),
      });
      if (!res.ok) throw new Error("Chat failed");
      const data = await res.json();
      setChatMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setChatMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong. Try again." }]);
    }
    setChatLoading(false);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Copy Checker</h1>
        <p className="text-sm text-[#7A7A7A] mt-1">
          Flag weak phrases, missing elements, and copy that shouldn&apos;t ship
        </p>
      </div>

      {/* ── Brief + Brand ── */}
      <div className={`border rounded-xl bg-white p-5 mb-6 ${briefLocked ? "border-emerald-200" : "border-[#E5E5EA]"}`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-[#1A1A1A]">Client Brief</h2>
            <p className="text-xs text-[#AAA] mt-0.5">
              {briefLocked ? "Brief locked — analysing against this context" : "Paste or type the full brief before analysing"}
            </p>
          </div>
          {briefLocked ? (
            <button
              onClick={() => setBriefLocked(false)}
              className="px-3 py-1.5 text-[11px] font-medium text-[#7A7A7A] border border-[#E5E5EA] rounded-lg hover:bg-[#F5F5F5]"
            >
              Edit Brief
            </button>
          ) : (
            <button
              onClick={() => {
                if (!brief.trim()) return;
                setBriefLocked(true);
                if (brandName.trim()) runVoc(brandName);
              }}
              disabled={!brief.trim()}
              className="px-4 py-1.5 text-[11px] font-medium bg-[#1B1B1B] text-white rounded-lg hover:bg-[#2D2D2D] disabled:opacity-30"
            >
              Lock Brief & Start
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4">
          <div>
            <label className={labelClass}>Brand Name</label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              disabled={briefLocked}
              className={inputClass}
              placeholder="e.g. AG1"
            />
            {vocLoading && <p className="text-[10px] text-[#AAA] mt-1">Researching VOC...</p>}
            {vocDone && vocData && <p className="text-[10px] text-emerald-600 mt-1">VOC data loaded ✓</p>}
          </div>
          <div>
            <label className={labelClass}>Brief</label>
            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              disabled={briefLocked}
              className={inputClass + " min-h-[120px]"}
              placeholder="Paste the full brief here — product details, target audience, USPs, competitors, page goals, tone preferences, anything relevant..."
            />
          </div>
        </div>
      </div>

      {/* ── Chat ── */}
      {briefReady && (
        <div className="border border-[#E5E5EA] rounded-xl bg-white mb-6 overflow-hidden">
          <div className="px-5 py-3 border-b border-[#F0F0F0]">
            <p className="text-xs font-semibold text-[#1A1A1A]">Ask about the copy</p>
            <p className="text-[10px] text-[#AAA] mt-0.5">Has full context of your brief{vocData ? " + VOC research" : ""}</p>
          </div>

          {/* Messages */}
          {chatMessages.length > 0 && (
            <div className="max-h-80 overflow-y-auto px-5 py-3 space-y-3">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] px-3.5 py-2.5 rounded-xl text-xs leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-[#1B1B1B] text-white rounded-br-sm"
                      : "bg-[#F3F3F5] text-[#333] rounded-bl-sm"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-[#F3F3F5] px-4 py-3 rounded-xl rounded-bl-sm">
                    <div className="flex gap-1">
                      <div className="size-1.5 bg-[#AAA] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="size-1.5 bg-[#AAA] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="size-1.5 bg-[#AAA] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}

          {/* Input */}
          <div className="flex items-center gap-2 px-4 py-3 border-t border-[#F0F0F0]">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
              placeholder="Ask about the copy, angles, structure, VOC insights..."
              className="flex-1 px-3 py-2 text-xs border border-[#E5E5EA] rounded-lg focus:outline-none focus:border-[#999] placeholder:text-[#CCC]"
            />
            <button
              onClick={sendChat}
              disabled={!chatInput.trim() || chatLoading}
              className="px-4 py-2 bg-[#1B1B1B] text-white text-xs font-medium rounded-lg hover:bg-[#2D2D2D] disabled:opacity-30"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* ── VOC Data (collapsed) ── */}
      {vocData && (
        <div className="border border-[#E5E5EA] rounded-xl bg-white mb-6 overflow-hidden">
          <details>
            <summary className="px-5 py-3 cursor-pointer text-xs font-semibold text-[#1A1A1A] hover:bg-[#FAFAFA]">
              Voice of Customer Data — {vocData.painPoints.length} pain points, {vocData.objections.length} objections, {vocData.keyPhrases.length} key phrases
            </summary>
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#F0F0F0] border-t border-[#F0F0F0]">
              <div className="p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-red-500 mb-2">Pain Points</p>
                {vocData.painPoints.map((p, i) => <p key={i} className="text-xs text-[#555] italic mb-1.5 leading-relaxed">{p}</p>)}
              </div>
              <div className="p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 mb-2">Objections</p>
                {vocData.objections.map((o, i) => <p key={i} className="text-xs text-[#555] italic mb-1.5 leading-relaxed">{o}</p>)}
              </div>
              <div className="p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 mb-2">Key Phrases</p>
                <div className="flex flex-wrap gap-1.5">
                  {vocData.keyPhrases.map((kp, i) => <span key={i} className="inline-block px-2 py-1 text-[10px] font-medium text-blue-700 bg-blue-50 rounded-full">{kp}</span>)}
                </div>
              </div>
            </div>
          </details>
        </div>
      )}

      {/* ── Upload Section ── */}
      {briefReady && (
        <div className="border border-[#E5E5EA] rounded-xl bg-white p-5 mb-6">
          <div className="flex items-end gap-3 mb-4">
            <div className="flex-1">
              <label className={labelClass}>Section</label>
              <select value={sectionName} onChange={(e) => setSectionName(e.target.value)} className={inputClass}>
                {SECTION_PRESETS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
              <button
                onClick={() => fileRef.current?.click()}
                className="px-4 py-2 text-xs font-medium text-[#7A7A7A] border border-[#E5E5EA] rounded-lg hover:bg-[#F5F5F5]"
              >
                Choose File
              </button>
            </div>
          </div>

          {/* Staged preview + analyse */}
          {pendingPreview ? (
            <div className="border border-[#E8E8E8] rounded-lg overflow-hidden">
              <img src={pendingPreview} alt="Preview" className="w-full max-h-64 object-contain bg-[#FAFAFA]" />
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#F0F0F0]">
                <p className="text-xs text-[#777]">{sectionName}</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setPendingFile(null); setPendingPreview(null); }}
                    className="px-3 py-1.5 text-[11px] text-[#AAA] hover:text-[#1A1A1A]"
                  >
                    Clear
                  </button>
                  <button
                    onClick={handleAnalyse}
                    className="px-5 py-2 bg-[#1B1B1B] text-white text-xs font-medium rounded-lg hover:bg-[#2D2D2D]"
                  >
                    Analyse
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="border-2 border-dashed border-[#E5E5EA] rounded-lg p-8 text-center cursor-pointer hover:border-[#999] transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <p className="text-sm text-[#AAA]">Paste a screenshot (Cmd+V) or click to upload</p>
              <p className="text-xs text-[#CCC] mt-1">Screenshot each section of your design individually</p>
            </div>
          )}
        </div>
      )}

      {/* ── Results ── */}
      {sections.length > 0 && (
        <div className="space-y-6">
          {[...sections].reverse().map((s) => (
            <div key={s.id} className="border border-[#E5E5EA] rounded-xl bg-white overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#F0F0F0]">
                <div className="flex items-center gap-3">
                  <p className="text-sm font-semibold text-[#1A1A1A]">{s.name}</p>
                  {s.analysis && (
                    <span className="text-[11px] text-[#777]">{s.analysis.summary}</span>
                  )}
                </div>
                <button onClick={() => removeSection(s.id)} className="text-[10px] text-[#CCC] hover:text-red-500">Remove</button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr]">
                {/* Screenshot */}
                <div className="border-b lg:border-b-0 lg:border-r border-[#F0F0F0]">
                  <img src={s.previewUrl} alt={s.name} className="w-full h-auto max-h-96 object-contain bg-[#FAFAFA] p-2" />
                </div>

                {/* Analysis */}
                <div className="p-5">
                  {s.analysing && (
                    <div className="flex items-center gap-3 py-8 justify-center">
                      <div className="animate-spin size-5 border-2 border-[#E5E5EA] border-t-[#1A1A1A] rounded-full" />
                      <p className="text-xs text-[#777]">Checking copy...</p>
                    </div>
                  )}

                  {s.analysis && (
                    <div className="space-y-5">
                      {/* Red Flags */}
                      {s.analysis.redFlags.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2.5">
                            <div className="size-2 rounded-full bg-red-500" />
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-red-500">
                              {s.analysis.redFlags.length} Red Flag{s.analysis.redFlags.length !== 1 ? "s" : ""} — Must Fix
                            </p>
                          </div>
                          <div className="space-y-2">
                            {s.analysis.redFlags.map((flag, i) => (
                              <div key={i} className="border border-red-100 bg-red-50/30 rounded-lg px-3.5 py-2.5">
                                <p className="text-xs font-medium text-[#1A1A1A] italic mb-1">&ldquo;{flag.quote}&rdquo;</p>
                                <p className="text-[10px] font-semibold text-red-500 mb-0.5">{flag.rule}</p>
                                <p className="text-xs text-[#666] leading-relaxed">{flag.why}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Warnings */}
                      {s.analysis.warnings.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2.5">
                            <div className="size-2 rounded-full bg-amber-500" />
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">
                              {s.analysis.warnings.length} Warning{s.analysis.warnings.length !== 1 ? "s" : ""} — Should Review
                            </p>
                          </div>
                          <div className="space-y-2">
                            {s.analysis.warnings.map((warn, i) => (
                              <div key={i} className="border border-amber-100 bg-amber-50/30 rounded-lg px-3.5 py-2.5">
                                <p className="text-xs font-medium text-[#1A1A1A] italic mb-1">&ldquo;{warn.quote}&rdquo;</p>
                                <p className="text-[10px] font-semibold text-amber-600 mb-0.5">{warn.rule}</p>
                                <p className="text-xs text-[#666] leading-relaxed">{warn.why}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Passing */}
                      {s.analysis.passing.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2.5">
                            <div className="size-2 rounded-full bg-emerald-500" />
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
                              {s.analysis.passing.length} Passing
                            </p>
                          </div>
                          <div className="space-y-1.5">
                            {s.analysis.passing.map((pass, i) => (
                              <div key={i} className="flex items-start gap-2">
                                <svg className="size-3.5 text-emerald-500 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                                </svg>
                                <div>
                                  <p className="text-xs font-medium text-[#1A1A1A]">{pass.element}</p>
                                  <p className="text-[10px] text-[#888]">{pass.why}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* VOC Gaps */}
                      {s.analysis.vocGaps && s.analysis.vocGaps.length > 0 && (
                        <div className="bg-blue-50/50 rounded-lg px-3.5 py-3 border border-blue-100">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 mb-2">VOC Gaps — Customer Language Not Used</p>
                          <div className="space-y-1">
                            {s.analysis.vocGaps.map((gap, i) => (
                              <p key={i} className="text-xs text-[#555] leading-relaxed">• {gap}</p>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* No issues */}
                      {s.analysis.redFlags.length === 0 && s.analysis.warnings.length === 0 && (
                        <div className="bg-emerald-50/50 rounded-lg px-3.5 py-3 border border-emerald-100 text-center">
                          <p className="text-xs font-medium text-emerald-700">Clean — no flags raised for this section</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {sections.length === 0 && !briefReady && (
        <div className="border-2 border-dashed border-[#E5E5EA] rounded-xl p-12 text-center">
          <p className="text-sm text-[#AAA]">Lock your brief to get started</p>
          <p className="text-xs text-[#CCC] mt-1">Then upload screenshots section by section to check for issues</p>
        </div>
      )}
    </div>
  );
}
