"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { inputClass, labelClass } from "@/lib/form-styles";

type SectionResult = {
  id: string;
  name: string;
  previewUrl: string;
  analysis: {
    score: number;
    working: string[];
    issues: string[];
    suggestions: { copy: string; problem: string; direction: string }[];
    rewrites?: { before: string; after: string }[];
    vocInsight?: string;
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

const scoreColor = (s: number) => (s >= 8 ? "text-emerald-600" : s >= 6 ? "text-amber-600" : "text-red-500");
const scoreBg = (s: number) => (s >= 8 ? "bg-emerald-500" : s >= 6 ? "bg-amber-500" : "bg-red-500");

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
        <h1 className="text-2xl font-bold tracking-tight">Page Copy Audit</h1>
        <p className="text-sm text-[#7A7A7A] mt-1">
          Paste your brief, then feed screenshots section by section for AI copy analysis
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
                    <span className={`text-sm font-bold ${scoreColor(s.analysis.score)}`}>{s.analysis.score}/10</span>
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
                      <p className="text-xs text-[#777]">Analysing copy...</p>
                    </div>
                  )}

                  {s.analysis && (
                    <div className="space-y-4">
                      {/* Score bar */}
                      <div className="h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
                        <div className={`h-full ${scoreBg(s.analysis.score)} rounded-full`} style={{ width: `${s.analysis.score * 10}%` }} />
                      </div>

                      {/* Working */}
                      {s.analysis.working.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 mb-2">What&apos;s Working</p>
                          {s.analysis.working.map((w, i) => (
                            <div key={i} className="flex items-start gap-2 mb-1.5">
                              <svg className="size-3.5 text-emerald-500 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                              </svg>
                              <p className="text-xs text-[#555] leading-relaxed">{w}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Issues */}
                      {s.analysis.issues.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-red-500 mb-2">Issues</p>
                          {s.analysis.issues.map((issue, i) => (
                            <div key={i} className="flex items-start gap-2 mb-1.5">
                              <svg className="size-3.5 text-red-400 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                              </svg>
                              <p className="text-xs text-[#555] leading-relaxed">{issue}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Suggestions */}
                      {s.analysis.suggestions?.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#AAA] mb-2">Suggestions</p>
                          <div className="space-y-3">
                            {s.analysis.suggestions.map((sg, i) => (
                              <div key={i} className="rounded-lg border border-[#F0F0F0] overflow-hidden">
                                <div className="px-3 py-2.5 bg-[#FAFAFA] border-b border-[#F0F0F0]">
                                  <p className="text-[9px] font-semibold uppercase text-[#AAA] mb-0.5">Current Copy</p>
                                  <p className="text-xs text-[#555] italic">&ldquo;{sg.copy}&rdquo;</p>
                                </div>
                                <div className="px-3 py-2.5 border-b border-[#F0F0F0]">
                                  <p className="text-[9px] font-semibold uppercase text-red-400 mb-0.5">Problem</p>
                                  <p className="text-xs text-[#555] leading-relaxed">{sg.problem}</p>
                                </div>
                                <div className="px-3 py-2.5 bg-emerald-50/30">
                                  <p className="text-[9px] font-semibold uppercase text-emerald-600 mb-0.5">Direction</p>
                                  <p className="text-xs text-[#555] leading-relaxed">{sg.direction}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* VOC Insight */}
                      {s.analysis.vocInsight && (
                        <div className="bg-blue-50/50 rounded-lg px-3 py-2.5 border border-blue-100">
                          <p className="text-[9px] font-semibold uppercase text-blue-600 mb-1">VOC Insight</p>
                          <p className="text-xs text-[#555] leading-relaxed">{s.analysis.vocInsight}</p>
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
      {sections.length === 0 && (
        <div className="border-2 border-dashed border-[#E5E5EA] rounded-xl p-12 text-center">
          <p className="text-sm text-[#AAA]">Upload a screenshot to get started</p>
          <p className="text-xs text-[#CCC] mt-1">Screenshot each section of your page design and upload above</p>
        </div>
      )}
    </div>
  );
}
