"use client";

import { useState, useEffect, useCallback } from "react";
import { DecorativeBlocks } from "@/components/decorative-blocks";
import {
  ClipboardDocumentIcon,
  CheckIcon,
  BookmarkIcon,
  ChevronDownIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { SparklesIcon } from "@heroicons/react/24/solid";
import { inputClass, selectClass, labelClass } from "@/lib/form-styles";
import {
  type Platform,
  type HookFormula,
  type HookInput,
  type GeneratedHook,
  hookFormulas,
  platforms,
  industries,
  generateHook,
  loadSavedHooks,
  saveSavedHooks,
} from "@/lib/content-engine";

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export default function HookGeneratorPage() {
  const [input, setInput] = useState<HookInput>({
    topic: "",
    clientName: "",
    metric: "",
    painPoint: "",
    solution: "",
    industry: "General Ecommerce",
  });

  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<Platform>>(
    new Set(["twitter", "linkedin"])
  );
  const [selectedFormulas, setSelectedFormulas] = useState<Set<HookFormula>>(
    new Set(["contrarian", "stat-lead", "question"])
  );
  const [hooks, setHooks] = useState<GeneratedHook[]>([]);
  const [savedHooks, setSavedHooks] = useState<GeneratedHook[]>([]);
  const [showGenerated, setShowGenerated] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);

  // Load saved hooks from localStorage
  useEffect(() => {
    setSavedHooks(loadSavedHooks());
  }, []);

  const updateInput = useCallback(
    <K extends keyof HookInput>(key: K, value: HookInput[K]) => {
      setInput((prev) => ({ ...prev, [key]: value }));
      setShowGenerated(false);
    },
    []
  );

  const togglePlatform = (p: Platform) => {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(p)) {
        if (next.size > 1) next.delete(p);
      } else {
        next.add(p);
      }
      return next;
    });
    setShowGenerated(false);
  };

  const toggleFormula = (f: HookFormula) => {
    setSelectedFormulas((prev) => {
      const next = new Set(prev);
      if (next.has(f)) {
        if (next.size > 1) next.delete(f);
      } else {
        next.add(f);
      }
      return next;
    });
    setShowGenerated(false);
  };

  const selectAllFormulas = () => {
    if (selectedFormulas.size === hookFormulas.length) {
      setSelectedFormulas(new Set(["contrarian"]));
    } else {
      setSelectedFormulas(new Set(hookFormulas.map((f) => f.id)));
    }
    setShowGenerated(false);
  };

  const handleGenerate = () => {
    const generated: GeneratedHook[] = [];
    for (const platform of selectedPlatforms) {
      for (const formulaId of selectedFormulas) {
        const text = generateHook(input, formulaId, platform);
        generated.push({
          id: uid(),
          platform,
          formula: formulaId,
          text,
          charCount: text.length,
          saved: savedHooks.some(
            (h) => h.platform === platform && h.formula === formulaId && h.text === text
          ),
        });
      }
    }
    setHooks(generated);
    setShowGenerated(true);
  };

  const copyHook = async (hook: GeneratedHook) => {
    await navigator.clipboard.writeText(hook.text);
    setCopiedId(hook.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSaveHook = (hook: GeneratedHook) => {
    const isSaved = savedHooks.some((h) => h.id === hook.id);
    let updated: GeneratedHook[];
    if (isSaved) {
      updated = savedHooks.filter((h) => h.id !== hook.id);
    } else {
      updated = [...savedHooks, { ...hook, saved: true }];
    }
    setSavedHooks(updated);
    saveSavedHooks(updated);
    setHooks((prev) =>
      prev.map((h) => (h.id === hook.id ? { ...h, saved: !isSaved } : h))
    );
  };

  const removeSavedHook = (id: string) => {
    const updated = savedHooks.filter((h) => h.id !== id);
    setSavedHooks(updated);
    saveSavedHooks(updated);
    setHooks((prev) =>
      prev.map((h) => (h.id === id ? { ...h, saved: false } : h))
    );
  };

  const isValid = input.topic.trim().length > 0;

  // Group generated hooks by platform
  const hooksByPlatform = hooks.reduce<Record<string, GeneratedHook[]>>(
    (acc, hook) => {
      if (!acc[hook.platform]) acc[hook.platform] = [];
      acc[hook.platform].push(hook);
      return acc;
    },
    {}
  );

  const platformLabel = (id: string) =>
    platforms.find((p) => p.id === id)?.label || id;

  return (
    <div className="relative min-h-screen">
      <DecorativeBlocks />
      <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-12 py-16 md:py-24">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            Hook Generator
          </h1>
          <p className="text-[#7A7A7A]">
            Generate scroll-stopping hooks optimized per platform using proven
            formulas
          </p>
        </div>

        <div className="space-y-8">
          {/* ── Input Form ── */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A7A7A] mb-4">
              Topic & Context
            </label>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    Topic <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={input.topic}
                    onChange={(e) => updateInput("topic", e.target.value)}
                    placeholder="e.g., Shopify page speed optimization"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Industry</label>
                  <select
                    value={input.industry}
                    onChange={(e) => updateInput("industry", e.target.value)}
                    className={selectClass}
                  >
                    {industries.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    Client Name{" "}
                    <span className="font-normal text-[#A0A0A0]">
                      (optional)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={input.clientName}
                    onChange={(e) => updateInput("clientName", e.target.value)}
                    placeholder="e.g., Nutribloom"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Key Metric{" "}
                    <span className="font-normal text-[#A0A0A0]">
                      (optional)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={input.metric}
                    onChange={(e) => updateInput("metric", e.target.value)}
                    placeholder="e.g., 43% CVR increase"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    Pain Point{" "}
                    <span className="font-normal text-[#A0A0A0]">
                      (optional)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={input.painPoint}
                    onChange={(e) => updateInput("painPoint", e.target.value)}
                    placeholder="e.g., Low mobile conversion rate"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Solution{" "}
                    <span className="font-normal text-[#A0A0A0]">
                      (optional)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={input.solution}
                    onChange={(e) => updateInput("solution", e.target.value)}
                    placeholder="e.g., Mobile-first page redesign"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Platform Selection ── */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A7A7A] mb-4">
              Platforms
            </label>
            <div className="flex flex-wrap gap-2">
              {platforms.map((p) => (
                <button
                  key={p.id}
                  onClick={() => togglePlatform(p.id)}
                  className={`px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
                    selectedPlatforms.has(p.id)
                      ? "bg-[#1B1B1B] text-white border-[#1B1B1B]"
                      : "bg-white text-[#7A7A7A] border-[#E5E5EA] hover:bg-[#F3F3F5]"
                  }`}
                >
                  <span className="mr-1.5">{p.icon}</span>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Formula Selection ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A7A7A]">
                Hook Formulas
              </label>
              <button
                onClick={selectAllFormulas}
                className="text-xs font-medium text-[#7A7A7A] hover:text-[#1B1B1B] transition-colors"
              >
                {selectedFormulas.size === hookFormulas.length
                  ? "Deselect All"
                  : "Select All"}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {hookFormulas.map((f) => (
                <button
                  key={f.id}
                  onClick={() => toggleFormula(f.id)}
                  className={`text-left p-3 rounded-lg border transition-colors ${
                    selectedFormulas.has(f.id)
                      ? "border-[#1B1B1B] bg-[#F7F8FA]"
                      : "border-[#E5E5EA] bg-white hover:bg-[#F3F3F5]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-[#1B1B1B]">
                      {f.label}
                    </span>
                    <div className="flex gap-1">
                      {f.bestFor.map((pid) => (
                        <span
                          key={pid}
                          className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#EDEDEF] text-[#999999]"
                        >
                          {platforms.find((p) => p.id === pid)?.icon}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-[#7A7A7A]">{f.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* ── Generate Button ── */}
          <div className="pt-4">
            <button
              onClick={handleGenerate}
              disabled={!isValid}
              className="flex items-center gap-2 px-6 py-3 bg-[#1B1B1B] text-white text-sm font-medium rounded-md hover:bg-[#2D2D2D] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <SparklesIcon className="size-4" />
              Generate Hooks
            </button>
            {!isValid && (
              <p className="text-xs text-[#A0A0A0] mt-2">
                Enter a topic to generate hooks
              </p>
            )}
          </div>
        </div>

        {/* ── Generated Hooks ── */}
        {showGenerated && hooks.length > 0 && (
          <div className="mt-12 pt-12 border-t border-[#E5E5EA] space-y-8">
            <div>
              <h2 className="text-lg font-bold tracking-tight mb-1">
                Generated Hooks
              </h2>
              <p className="text-xs text-[#7A7A7A]">
                {hooks.length} hooks across{" "}
                {Object.keys(hooksByPlatform).length} platforms
              </p>
            </div>

            {Object.entries(hooksByPlatform).map(([platformId, platformHooks]) => (
              <div key={platformId}>
                <h3 className="text-sm font-semibold text-[#1B1B1B] mb-3 flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-[#EDEDEF] text-[10px] font-bold">
                    {platforms.find((p) => p.id === platformId)?.icon}
                  </span>
                  {platformLabel(platformId)}
                </h3>
                <div className="space-y-3">
                  {platformHooks.map((hook) => {
                    const formula = hookFormulas.find(
                      (f) => f.id === hook.formula
                    );
                    return (
                      <div
                        key={hook.id}
                        className="bg-[#F7F8FA] border border-[#E5E5EA] rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0] bg-white px-2 py-0.5 rounded border border-[#E5E5EA]">
                            {formula?.label}
                          </span>
                          <span className="text-[10px] text-[#A0A0A0] tabular-nums">
                            {hook.charCount} chars
                          </span>
                        </div>
                        <p className="text-sm text-[#1B1B1B] leading-relaxed whitespace-pre-line mb-3">
                          {hook.text}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => copyHook(hook)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-[#E5E5EA] bg-white text-[#7A7A7A] hover:bg-[#F3F3F5] transition-colors"
                          >
                            {copiedId === hook.id ? (
                              <>
                                <CheckIcon className="size-3.5 text-emerald-500" />
                                Copied
                              </>
                            ) : (
                              <>
                                <ClipboardDocumentIcon className="size-3.5" />
                                Copy
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => toggleSaveHook(hook)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                              hook.saved
                                ? "border-amber-300 bg-amber-50 text-amber-700"
                                : "border-[#E5E5EA] bg-white text-[#7A7A7A] hover:bg-[#F3F3F5]"
                            }`}
                          >
                            <BookmarkIcon className="size-3.5" />
                            {hook.saved ? "Saved" : "Save"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Saved Hooks ── */}
        {savedHooks.length > 0 && (
          <div className="mt-12 pt-12 border-t border-[#E5E5EA]">
            <button
              onClick={() => setShowSaved(!showSaved)}
              className="flex items-center justify-between w-full text-left"
            >
              <div>
                <h2 className="text-lg font-bold tracking-tight">
                  Saved Hooks
                </h2>
                <p className="text-xs text-[#7A7A7A]">
                  {savedHooks.length} saved hook
                  {savedHooks.length !== 1 ? "s" : ""}
                </p>
              </div>
              <ChevronDownIcon
                className={`size-5 text-[#A0A0A0] transition-transform ${
                  showSaved ? "rotate-180" : ""
                }`}
              />
            </button>

            {showSaved && (
              <div className="mt-4 space-y-3">
                {savedHooks.map((hook) => {
                  const formula = hookFormulas.find(
                    (f) => f.id === hook.formula
                  );
                  return (
                    <div
                      key={hook.id}
                      className="bg-[#F7F8FA] border border-[#E5E5EA] rounded-lg p-4"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-[#EDEDEF] text-[9px] font-bold">
                          {platforms.find((p) => p.id === hook.platform)?.icon}
                        </span>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0]">
                          {formula?.label}
                        </span>
                      </div>
                      <p className="text-sm text-[#1B1B1B] leading-relaxed whitespace-pre-line mb-3">
                        {hook.text}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyHook(hook)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-[#E5E5EA] bg-white text-[#7A7A7A] hover:bg-[#F3F3F5] transition-colors"
                        >
                          {copiedId === hook.id ? (
                            <>
                              <CheckIcon className="size-3.5 text-emerald-500" />
                              Copied
                            </>
                          ) : (
                            <>
                              <ClipboardDocumentIcon className="size-3.5" />
                              Copy
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => removeSavedHook(hook.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-[#E5E5EA] bg-white text-red-400 hover:bg-red-50 hover:border-red-200 transition-colors"
                        >
                          <TrashIcon className="size-3.5" />
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
