"use client";

import { useEffect, useState, useRef, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  EyeIcon,
  ClipboardIcon,
} from "@heroicons/react/24/outline";
import { AuthGate } from "@/components/auth-gate";
import { inputClass, labelClass, textareaClass, selectClass } from "@/lib/form-styles";
import {
  type CaseStudy,
  type ProjectType,
  type HeroMediaKind,
  type IntelligemsTest,
  type PullQuote,
  TECH_STACK_OPTIONS,
  PROJECT_TYPE_LABELS,
} from "@/lib/case-studies/types";
import {
  getCaseStudy,
  getCaseStudies,
  saveCaseStudy,
  isSlugAvailable,
} from "@/lib/case-studies/data";
import { makeEmptyCaseStudy, slugify, genId, duplicateCaseStudy } from "@/lib/case-studies/template";
import { EditorSection } from "@/components/case-studies/editor/section";
import { ImageUpload } from "@/components/case-studies/editor/image-upload";
import { IntelligemsTestCard } from "@/components/case-studies/editor/intelligems-test-card";
import { FigmaFrameCard } from "@/components/case-studies/editor/figma-frame-card";
import { HeadlineStatCard } from "@/components/case-studies/editor/headline-stat-card";
import { SolutionCardEditor } from "@/components/case-studies/editor/solution-card-editor";
import { ComparisonRowEditor } from "@/components/case-studies/editor/comparison-row-editor";
import { PageSlicesEditor } from "@/components/case-studies/editor/page-slices-editor";
import { FigmaSyncForm } from "@/components/case-studies/editor/figma-sync-form";

type SaveState = "idle" | "saving" | "saved" | "error";

const PUBLIC_BASE = "ecomlanders.com/work";

export default function CaseStudyEditorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <AuthGate>
      <CaseStudyEditor params={params} />
    </AuthGate>
  );
}

function CaseStudyEditor({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: routeSlug } = use(params);
  const router = useRouter();

  const [study, setStudy] = useState<CaseStudy | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [allStudies, setAllStudies] = useState<CaseStudy[]>([]);
  const [slugDirty, setSlugDirty] = useState(false);
  const [slugAvailable, setSlugAvailableState] = useState(true);
  const [copied, setCopied] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Load on mount ─────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [existing, all] = await Promise.all([
          getCaseStudy(routeSlug),
          getCaseStudies(),
        ]);
        if (cancelled) return;
        setAllStudies(all);
        if (existing) {
          setStudy(existing);
        } else {
          const fresh = makeEmptyCaseStudy(routeSlug);
          setStudy(fresh);
          try {
            await saveCaseStudy(fresh);
          } catch (err) {
            console.error("Initial create failed:", err);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [routeSlug]);

  const saveNow = useCallback(async (next: CaseStudy) => {
    setSaveState("saving");
    setSaveError(null);
    try {
      await saveCaseStudy(next);
      setSaveState("saved");
    } catch (err) {
      setSaveState("error");
      setSaveError(err instanceof Error ? err.message : "Save failed");
    }
  }, []);

  const queueSave = useCallback(
    (next: CaseStudy) => {
      setSaveState("saving");
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => saveNow(next), 1000);
    },
    [saveNow],
  );

  const updateStudy = useCallback(
    (mut: (prev: CaseStudy) => CaseStudy) => {
      setStudy((prev) => {
        if (!prev) return prev;
        const next = mut(prev);
        queueSave(next);
        return next;
      });
    },
    [queueSave],
  );

  useEffect(() => {
    if (!study) return;
    if (study.slug === routeSlug) {
      setSlugAvailableState(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const avail = await isSlugAvailable(study.slug, study.id);
      if (!cancelled) setSlugAvailableState(avail);
    })();
    return () => {
      cancelled = true;
    };
  }, [study, routeSlug]);

  const commitSlug = async () => {
    if (!study) return;
    const newSlug = slugify(study.slug);
    if (!newSlug || newSlug === routeSlug) return;
    const avail = await isSlugAvailable(newSlug, study.id);
    if (!avail) {
      setSlugAvailableState(false);
      return;
    }
    const next = { ...study, slug: newSlug };
    await saveCaseStudy(next);
    router.replace(`/case-studies/${newSlug}/edit`);
  };

  const togglePublish = () => {
    if (!study) return;
    const willPublish = !study.settings.published;
    updateStudy((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        published: willPublish,
        publishedAt: willPublish ? new Date().toISOString() : prev.settings.publishedAt,
      },
    }));
  };

  const shareUrl = study ? `${PUBLIC_BASE}/${study.slug}` : "";
  const copyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(`https://${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA]">
        <div className="size-6 border-2 border-[#A0A0A0] border-t-[#1B1B1B] rounded-full animate-spin" />
      </div>
    );
  }

  if (loadError || !study) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA]">
        <div className="text-sm text-red-600">{loadError || "Failed to load."}</div>
      </div>
    );
  }

  const otherStudies = allStudies.filter((s) => s.id !== study.id);

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-[#EDEDEF]">
        <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center gap-4">
          <Link
            href="/sales-engine/case-studies"
            className="flex items-center gap-1.5 text-xs text-[#7A7A7A] hover:text-[#1B1B1B] transition-colors"
          >
            <ArrowLeftIcon className="size-3.5" />
            All case studies
          </Link>
          <div className="h-5 w-px bg-[#EDEDEF]" />
          <div className="flex-1 min-w-0">
            <input
              className="w-full text-sm font-semibold text-[#1B1B1B] bg-transparent border-0 focus:outline-none placeholder:text-[#A0A0A0]"
              value={study.meta.brandName}
              onChange={(e) =>
                updateStudy((prev) => ({
                  ...prev,
                  meta: { ...prev.meta, brandName: e.target.value },
                }))
              }
              placeholder="Brand name"
            />
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-[#A0A0A0] font-mono">
                {PUBLIC_BASE}/{study.slug}
              </span>
              <button
                type="button"
                onClick={copyShareUrl}
                className="text-[#A0A0A0] hover:text-[#1B1B1B] transition-colors"
                title="Copy public URL"
              >
                <ClipboardIcon className="size-3" />
              </button>
              {copied && <span className="text-[10px] text-green-600">Copied</span>}
            </div>
          </div>

          <SaveStatePill state={saveState} error={saveError} />

          <Link
            href={`/case-studies/${study.slug}${study.settings.published ? "" : "?draft=1"}`}
            target="_blank"
            className="flex items-center gap-1.5 text-xs font-semibold text-[#1B1B1B] px-3 py-1.5 border border-[#E5E5EA] rounded-lg hover:bg-[#F3F3F5] transition-colors"
          >
            <EyeIcon className="size-3.5" />
            View
          </Link>

          <button
            type="button"
            onClick={togglePublish}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
              study.settings.published
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "bg-[#1B1B1B] text-white hover:bg-[#2D2D2D]"
            }`}
          >
            {study.settings.published ? "Published" : "Publish"}
          </button>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6">
        <div className="space-y-4 min-w-0">
          {/* ── Client ──────────────────────────── */}
          <EditorSection title="Client" description="Brand identity and project shape">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Brand name</label>
                  <input
                    className={inputClass}
                    value={study.meta.brandName}
                    onChange={(e) =>
                      updateStudy((prev) => ({
                        ...prev,
                        meta: { ...prev.meta, brandName: e.target.value },
                      }))
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>Project type</label>
                  <select
                    className={selectClass}
                    value={study.meta.projectType}
                    onChange={(e) =>
                      updateStudy((prev) => ({
                        ...prev,
                        meta: { ...prev.meta, projectType: e.target.value as ProjectType },
                      }))
                    }
                  >
                    {(Object.keys(PROJECT_TYPE_LABELS) as ProjectType[]).map((pt) => (
                      <option key={pt} value={pt}>{PROJECT_TYPE_LABELS[pt]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Niche / Industry</label>
                  <input
                    className={inputClass}
                    value={study.meta.industry || ""}
                    onChange={(e) =>
                      updateStudy((prev) => ({
                        ...prev,
                        meta: { ...prev.meta, industry: e.target.value },
                      }))
                    }
                    placeholder="Supplements, Apparel, Skincare"
                  />
                </div>
                <div>
                  <label className={labelClass}>Engagement (timeframe)</label>
                  <input
                    className={inputClass}
                    value={study.meta.timeframe || ""}
                    onChange={(e) =>
                      updateStudy((prev) => ({
                        ...prev,
                        meta: { ...prev.meta, timeframe: e.target.value },
                      }))
                    }
                    placeholder="12 Months"
                  />
                </div>
                <div>
                  <label className={labelClass}>Services</label>
                  <input
                    className={inputClass}
                    value={study.meta.services || ""}
                    onChange={(e) =>
                      updateStudy((prev) => ({
                        ...prev,
                        meta: { ...prev.meta, services: e.target.value },
                      }))
                    }
                    placeholder="Conversion Engine"
                  />
                </div>
                <div>
                  <label className={labelClass}>Surfaces shipped</label>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={study.meta.surfacesShipped ?? 0}
                    onChange={(e) =>
                      updateStudy((prev) => ({
                        ...prev,
                        meta: { ...prev.meta, surfacesShipped: parseInt(e.target.value) || 0 },
                      }))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <ImageUpload
                  label="Logo (light — for dark backgrounds)"
                  helper="PNG with transparency works best"
                  slug={study.slug}
                  aspect="square"
                  value={study.meta.logoLight}
                  onChange={(img) =>
                    updateStudy((prev) => ({
                      ...prev,
                      meta: { ...prev.meta, logoLight: img },
                    }))
                  }
                />
                <ImageUpload
                  label="Logo (dark — for light backgrounds)"
                  slug={study.slug}
                  aspect="square"
                  value={study.meta.logoDark}
                  onChange={(img) =>
                    updateStudy((prev) => ({
                      ...prev,
                      meta: { ...prev.meta, logoDark: img },
                    }))
                  }
                />
              </div>
            </div>
          </EditorSection>

          {/* ── Hero ──────────────────────────── */}
          <EditorSection title="Hero" description="Headline, body and screenshot collage">
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Headline</label>
                <textarea
                  rows={2}
                  className={textareaClass}
                  value={study.hero.headline}
                  onChange={(e) =>
                    updateStudy((prev) => ({
                      ...prev,
                      hero: { ...prev.hero, headline: e.target.value },
                    }))
                  }
                  placeholder="Supplement brand increased MRR by 146% in 6 months"
                />
              </div>
              <div>
                <label className={labelClass}>Body paragraph</label>
                <textarea
                  rows={3}
                  className={textareaClass}
                  value={study.hero.subhead || ""}
                  onChange={(e) =>
                    updateStudy((prev) => ({
                      ...prev,
                      hero: { ...prev.hero, subhead: e.target.value },
                    }))
                  }
                  placeholder="A foundational rebuild of their funnel structure that…"
                />
              </div>

              <div>
                <label className={labelClass}>Hero collage (1–4 images, tilted on the right of the hero)</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(study.hero.collageImages || []).map((img, i) => (
                    <ImageUpload
                      key={img.filename || i}
                      slug={study.slug}
                      aspect="auto"
                      value={img}
                      onChange={(next) =>
                        updateStudy((prev) => ({
                          ...prev,
                          hero: {
                            ...prev.hero,
                            collageImages: next
                              ? (prev.hero.collageImages || []).map((x, idx) => (idx === i ? next : x))
                              : (prev.hero.collageImages || []).filter((_, idx) => idx !== i),
                          },
                        }))
                      }
                    />
                  ))}
                  {(study.hero.collageImages || []).length < 4 && (
                    <ImageUpload
                      slug={study.slug}
                      aspect="auto"
                      value={undefined}
                      onChange={(img) => {
                        if (!img) return;
                        updateStudy((prev) => ({
                          ...prev,
                          hero: {
                            ...prev.hero,
                            collageImages: [...(prev.hero.collageImages || []), img],
                          },
                        }));
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          </EditorSection>

          {/* ── Headline Stats ───────────────── */}
          <EditorSection
            title="Headline stats"
            description="The 4 KPI cards under the hero"
            badge={study.headlineStats.length > 0 ? `${study.headlineStats.length}` : undefined}
          >
            <div className="space-y-3">
              {study.headlineStats.map((stat, i) => (
                <HeadlineStatCard
                  key={stat.id}
                  stat={stat}
                  index={i}
                  onChange={(next) =>
                    updateStudy((prev) => ({
                      ...prev,
                      headlineStats: prev.headlineStats.map((x) => (x.id === stat.id ? next : x)),
                    }))
                  }
                  onDelete={() =>
                    updateStudy((prev) => ({
                      ...prev,
                      headlineStats: prev.headlineStats.filter((x) => x.id !== stat.id),
                    }))
                  }
                />
              ))}
              {study.headlineStats.length < 4 && (
                <button
                  type="button"
                  onClick={() =>
                    updateStudy((prev) => ({
                      ...prev,
                      headlineStats: [
                        ...prev.headlineStats,
                        { id: genId(), value: "", label: "" },
                      ],
                    }))
                  }
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-3 border-2 border-dashed border-[#E5E5EA] rounded-lg text-xs font-semibold text-[#7A7A7A] hover:border-[#A0A0A0] hover:text-[#1B1B1B] transition-colors"
                >
                  <PlusIcon className="size-4" />
                  Add stat
                </button>
              )}
            </div>
          </EditorSection>

          {/* ── The Problem ─────────────────── */}
          <EditorSection
            title="The Problem"
            description="What was broken and why it mattered"
            badge={study.challenge.pullQuotes.length > 0 ? `${study.challenge.pullQuotes.length} quote${study.challenge.pullQuotes.length > 1 ? "s" : ""}` : undefined}
          >
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Headline (short, sharp)</label>
                <textarea
                  rows={2}
                  className={textareaClass}
                  value={study.challenge.headline || ""}
                  onChange={(e) =>
                    updateStudy((prev) => ({
                      ...prev,
                      challenge: { ...prev.challenge, headline: e.target.value },
                    }))
                  }
                  placeholder="Increased ad spend only led to increased CAC and reduced ability to scale profitably."
                />
              </div>
              <div>
                <label className={labelClass}>Body (renders in 2 columns)</label>
                <textarea
                  rows={6}
                  className={textareaClass}
                  value={study.challenge.prose}
                  onChange={(e) =>
                    updateStudy((prev) => ({
                      ...prev,
                      challenge: { ...prev.challenge, prose: e.target.value },
                    }))
                  }
                  placeholder="Walk through the problem in 2–3 paragraphs"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#7A7A7A]">Pull quotes</span>
                  <button
                    type="button"
                    onClick={() =>
                      updateStudy((prev) => ({
                        ...prev,
                        challenge: {
                          ...prev.challenge,
                          pullQuotes: [
                            ...prev.challenge.pullQuotes,
                            { id: genId(), text: "", attribution: "" },
                          ],
                        },
                      }))
                    }
                    className="flex items-center gap-1 text-xs font-semibold text-[#1B1B1B] hover:underline"
                  >
                    <PlusIcon className="size-3" />
                    Add quote
                  </button>
                </div>
                {study.challenge.pullQuotes.map((q: PullQuote) => (
                  <div key={q.id} className="bg-[#FAFAFB] border border-[#EDEDEF] rounded-lg p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <textarea
                        rows={2}
                        className={textareaClass}
                        value={q.text}
                        onChange={(e) =>
                          updateStudy((prev) => ({
                            ...prev,
                            challenge: {
                              ...prev.challenge,
                              pullQuotes: prev.challenge.pullQuotes.map((p) =>
                                p.id === q.id ? { ...p, text: e.target.value } : p,
                              ),
                            },
                          }))
                        }
                        placeholder="Pull-quote text"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateStudy((prev) => ({
                            ...prev,
                            challenge: {
                              ...prev.challenge,
                              pullQuotes: prev.challenge.pullQuotes.filter((p) => p.id !== q.id),
                            },
                          }))
                        }
                        className="text-[#A0A0A0] hover:text-red-600 p-1 mt-1"
                      >
                        <TrashIcon className="size-4" />
                      </button>
                    </div>
                    <input
                      className={inputClass}
                      value={q.attribution || ""}
                      onChange={(e) =>
                        updateStudy((prev) => ({
                          ...prev,
                          challenge: {
                            ...prev.challenge,
                            pullQuotes: prev.challenge.pullQuotes.map((p) =>
                              p.id === q.id ? { ...p, attribution: e.target.value } : p,
                            ),
                          },
                        }))
                      }
                      placeholder="Attribution (optional)"
                    />
                  </div>
                ))}
              </div>
            </div>
          </EditorSection>

          {/* ── The Solution ─────────────────── */}
          <EditorSection
            title="The Solution"
            description="Headline + 3 numbered cards"
            badge={study.approach.cards.length > 0 ? `${study.approach.cards.length} card${study.approach.cards.length > 1 ? "s" : ""}` : undefined}
          >
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Headline</label>
                <textarea
                  rows={2}
                  className={textareaClass}
                  value={study.approach.headline || ""}
                  onChange={(e) =>
                    updateStudy((prev) => ({
                      ...prev,
                      approach: { ...prev.approach, headline: e.target.value },
                    }))
                  }
                  placeholder="Strip the funnel back to first principles, then build forward."
                />
              </div>
              <div>
                <label className={labelClass}>Intro (optional, before the cards)</label>
                <textarea
                  rows={2}
                  className={textareaClass}
                  value={study.approach.intro || ""}
                  onChange={(e) =>
                    updateStudy((prev) => ({
                      ...prev,
                      approach: { ...prev.approach, intro: e.target.value },
                    }))
                  }
                />
              </div>
              <div className="space-y-3">
                {study.approach.cards.map((card, i) => (
                  <SolutionCardEditor
                    key={card.id}
                    card={card}
                    index={i}
                    onChange={(next) =>
                      updateStudy((prev) => ({
                        ...prev,
                        approach: {
                          ...prev.approach,
                          cards: prev.approach.cards.map((x) => (x.id === card.id ? next : x)),
                        },
                      }))
                    }
                    onDelete={() =>
                      updateStudy((prev) => ({
                        ...prev,
                        approach: {
                          ...prev.approach,
                          cards: prev.approach.cards.filter((x) => x.id !== card.id),
                        },
                      }))
                    }
                  />
                ))}
                <button
                  type="button"
                  onClick={() =>
                    updateStudy((prev) => ({
                      ...prev,
                      approach: {
                        ...prev.approach,
                        cards: [
                          ...prev.approach.cards,
                          { id: genId(), title: "", description: "" },
                        ],
                      },
                    }))
                  }
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-3 border-2 border-dashed border-[#E5E5EA] rounded-lg text-xs font-semibold text-[#7A7A7A] hover:border-[#A0A0A0] hover:text-[#1B1B1B] transition-colors"
                >
                  <PlusIcon className="size-4" />
                  Add card
                </button>
              </div>
            </div>
          </EditorSection>

          {/* ── Designs ──────────────────────── */}
          <EditorSection
            title="The Design"
            description="Headline, full-page renders (desktop/mobile), and Figma frames"
            badge={
              (study.designs.desktopSlices.length + study.designs.mobileSlices.length + study.designs.figmaFrames.length) > 0
                ? `${study.designs.desktopSlices.length + study.designs.mobileSlices.length + study.designs.figmaFrames.length}`
                : undefined
            }
          >
            <div className="space-y-6">
              <div>
                <label className={labelClass}>Headline</label>
                <input
                  className={inputClass}
                  value={study.designs.headline || ""}
                  onChange={(e) =>
                    updateStudy((prev) => ({
                      ...prev,
                      designs: { ...prev.designs, headline: e.target.value },
                    }))
                  }
                  placeholder="The same brand, but better."
                />
              </div>

              <FigmaSyncForm
                slug={study.slug}
                desktopCount={study.designs.desktopSlices.length}
                mobileCount={study.designs.mobileSlices.length}
                onSynced={(synced) => setStudy(synced)}
              />

              <PageSlicesEditor
                label="Desktop full-page slices"
                helper="Auto-populated by Figma sync above. Or upload tall full-page screenshots manually."
                slug={study.slug}
                slices={study.designs.desktopSlices}
                onChange={(next) =>
                  updateStudy((prev) => ({
                    ...prev,
                    designs: { ...prev.designs, desktopSlices: next },
                  }))
                }
              />

              <PageSlicesEditor
                label="Mobile full-page slices"
                helper="Optional. If both desktop + mobile are added, the modal shows a toggle."
                slug={study.slug}
                slices={study.designs.mobileSlices}
                onChange={(next) =>
                  updateStudy((prev) => ({
                    ...prev,
                    designs: { ...prev.designs, mobileSlices: next },
                  }))
                }
              />

              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A] mb-2">
                  Figma frames (interactive embeds)
                </div>
                <div className="space-y-3">
                  {study.designs.figmaFrames.map((f, i) => (
                    <FigmaFrameCard
                      key={f.id}
                      frame={f}
                      index={i}
                      onChange={(next) =>
                        updateStudy((prev) => ({
                          ...prev,
                          designs: {
                            ...prev.designs,
                            figmaFrames: prev.designs.figmaFrames.map((x) => (x.id === f.id ? next : x)),
                          },
                        }))
                      }
                      onDelete={() =>
                        updateStudy((prev) => ({
                          ...prev,
                          designs: {
                            ...prev.designs,
                            figmaFrames: prev.designs.figmaFrames.filter((x) => x.id !== f.id),
                          },
                        }))
                      }
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      updateStudy((prev) => ({
                        ...prev,
                        designs: {
                          ...prev.designs,
                          figmaFrames: [
                            ...prev.designs.figmaFrames,
                            { id: genId(), shareUrl: "", caption: "", device: "desktop" },
                          ],
                        },
                      }))
                    }
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-3 border-2 border-dashed border-[#E5E5EA] rounded-lg text-xs font-semibold text-[#7A7A7A] hover:border-[#A0A0A0] hover:text-[#1B1B1B] transition-colors"
                  >
                    <PlusIcon className="size-4" />
                    Add Figma frame
                  </button>
                </div>
              </div>
            </div>
          </EditorSection>

          {/* ── Compounded Results ──────────── */}
          <EditorSection
            title="The Full Results"
            description="Before/after metric comparison row"
            badge={study.compoundedResults.length > 0 ? `${study.compoundedResults.length}` : undefined}
          >
            <div className="space-y-3">
              {study.compoundedResults.map((row, i) => (
                <ComparisonRowEditor
                  key={row.id}
                  row={row}
                  index={i}
                  onChange={(next) =>
                    updateStudy((prev) => ({
                      ...prev,
                      compoundedResults: prev.compoundedResults.map((x) => (x.id === row.id ? next : x)),
                    }))
                  }
                  onDelete={() =>
                    updateStudy((prev) => ({
                      ...prev,
                      compoundedResults: prev.compoundedResults.filter((x) => x.id !== row.id),
                    }))
                  }
                />
              ))}
              <button
                type="button"
                onClick={() =>
                  updateStudy((prev) => ({
                    ...prev,
                    compoundedResults: [
                      ...prev.compoundedResults,
                      {
                        id: genId(),
                        label: "",
                        before: "",
                        after: "",
                        deltaPercent: undefined,
                        deltaDirection: "up",
                      },
                    ],
                  }))
                }
                className="w-full flex items-center justify-center gap-1.5 px-4 py-3 border-2 border-dashed border-[#E5E5EA] rounded-lg text-xs font-semibold text-[#7A7A7A] hover:border-[#A0A0A0] hover:text-[#1B1B1B] transition-colors"
              >
                <PlusIcon className="size-4" />
                Add metric
              </button>
            </div>
          </EditorSection>

          {/* ── Testimonial ───────────────────── */}
          <EditorSection title="Testimonial" description="Quote, attribution, optional video">
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Quote</label>
                <textarea
                  rows={4}
                  className={textareaClass}
                  value={study.testimonial?.quote || ""}
                  onChange={(e) =>
                    updateStudy((prev) => ({
                      ...prev,
                      testimonial: {
                        quote: e.target.value,
                        name: prev.testimonial?.name || "",
                        role: prev.testimonial?.role || "",
                        headshot: prev.testimonial?.headshot,
                        videoUrl: prev.testimonial?.videoUrl,
                      },
                    }))
                  }
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Name</label>
                  <input
                    className={inputClass}
                    value={study.testimonial?.name || ""}
                    onChange={(e) =>
                      updateStudy((prev) => ({
                        ...prev,
                        testimonial: {
                          quote: prev.testimonial?.quote || "",
                          name: e.target.value,
                          role: prev.testimonial?.role || "",
                          headshot: prev.testimonial?.headshot,
                          videoUrl: prev.testimonial?.videoUrl,
                        },
                      }))
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>Role</label>
                  <input
                    className={inputClass}
                    value={study.testimonial?.role || ""}
                    onChange={(e) =>
                      updateStudy((prev) => ({
                        ...prev,
                        testimonial: {
                          quote: prev.testimonial?.quote || "",
                          name: prev.testimonial?.name || "",
                          role: e.target.value,
                          headshot: prev.testimonial?.headshot,
                          videoUrl: prev.testimonial?.videoUrl,
                        },
                      }))
                    }
                    placeholder="Chief Marketing Officer, BrandCo"
                  />
                </div>
              </div>
              <ImageUpload
                label="Headshot (optional)"
                slug={study.slug}
                aspect="square"
                value={study.testimonial?.headshot}
                onChange={(img) =>
                  updateStudy((prev) => ({
                    ...prev,
                    testimonial: {
                      quote: prev.testimonial?.quote || "",
                      name: prev.testimonial?.name || "",
                      role: prev.testimonial?.role || "",
                      headshot: img,
                      videoUrl: prev.testimonial?.videoUrl,
                    },
                  }))
                }
              />
            </div>
          </EditorSection>

          {/* ── CTA ───────────────────────────── */}
          <EditorSection title="CTA" description="Black card at the end of the page">
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Headline</label>
                <input
                  className={inputClass}
                  value={study.cta.headline}
                  onChange={(e) =>
                    updateStudy((prev) => ({
                      ...prev,
                      cta: { ...prev.cta, headline: e.target.value },
                    }))
                  }
                  placeholder="Looking to scale your brand profitably?"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Primary button label</label>
                  <input
                    className={inputClass}
                    value={study.cta.buttonLabel}
                    onChange={(e) =>
                      updateStudy((prev) => ({
                        ...prev,
                        cta: { ...prev.cta, buttonLabel: e.target.value },
                      }))
                    }
                    placeholder="Book a call"
                  />
                </div>
                <div>
                  <label className={labelClass}>Primary URL</label>
                  <input
                    className={inputClass}
                    value={study.cta.buttonHref}
                    onChange={(e) =>
                      updateStudy((prev) => ({
                        ...prev,
                        cta: { ...prev.cta, buttonHref: e.target.value },
                      }))
                    }
                    placeholder="/audit"
                  />
                </div>
                <div>
                  <label className={labelClass}>Secondary button label (optional)</label>
                  <input
                    className={inputClass}
                    value={study.cta.secondaryLabel || ""}
                    onChange={(e) =>
                      updateStudy((prev) => ({
                        ...prev,
                        cta: { ...prev.cta, secondaryLabel: e.target.value },
                      }))
                    }
                    placeholder="WhatsApp us"
                  />
                </div>
                <div>
                  <label className={labelClass}>Secondary URL</label>
                  <input
                    className={inputClass}
                    value={study.cta.secondaryHref || ""}
                    onChange={(e) =>
                      updateStudy((prev) => ({
                        ...prev,
                        cta: { ...prev.cta, secondaryHref: e.target.value },
                      }))
                    }
                    placeholder="https://wa.me/…"
                  />
                </div>
              </div>
            </div>
          </EditorSection>

          {/* ── Tech stack ────────────────────── */}
          <EditorSection
            title="Tech & tools"
            description="Pill tags shown alongside the project"
            badge={study.techStack.length > 0 ? `${study.techStack.length}` : undefined}
            defaultOpen={false}
          >
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {study.techStack.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      updateStudy((prev) => ({
                        ...prev,
                        techStack: prev.techStack.filter((x) => x !== t),
                      }))
                    }
                    className="text-xs font-semibold px-3 py-1 bg-[#1B1B1B] text-white rounded-full hover:bg-[#2D2D2D] transition-colors"
                  >
                    {t} ×
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TECH_STACK_OPTIONS.filter((o) => !study.techStack.includes(o)).map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() =>
                      updateStudy((prev) => ({
                        ...prev,
                        techStack: [...prev.techStack, o],
                      }))
                    }
                    className="text-xs px-3 py-1 bg-[#F3F3F5] text-[#7A7A7A] rounded-full hover:bg-[#EDEDEF] hover:text-[#1B1B1B] transition-colors"
                  >
                    + {o}
                  </button>
                ))}
              </div>
            </div>
          </EditorSection>

          {/* ── Related ───────────────────────── */}
          <EditorSection
            title="Related case studies"
            description="Manually link other case studies"
            badge={study.relatedCaseStudyIds.length > 0 ? `${study.relatedCaseStudyIds.length}` : undefined}
            defaultOpen={false}
          >
            {otherStudies.length === 0 ? (
              <p className="text-xs text-[#7A7A7A]">No other case studies yet.</p>
            ) : (
              <div className="space-y-1.5">
                {otherStudies.map((other) => {
                  const checked = study.relatedCaseStudyIds.includes(other.id);
                  return (
                    <label
                      key={other.id}
                      className="flex items-center gap-2 px-3 py-2 bg-[#FAFAFB] border border-[#EDEDEF] rounded-lg cursor-pointer hover:bg-[#F3F3F5]"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          updateStudy((prev) => ({
                            ...prev,
                            relatedCaseStudyIds: checked
                              ? prev.relatedCaseStudyIds.filter((id) => id !== other.id)
                              : [...prev.relatedCaseStudyIds, other.id],
                          }))
                        }
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-[#1B1B1B] truncate">
                          {other.meta.brandName || other.slug}
                        </div>
                        <div className="text-[10px] text-[#A0A0A0] truncate">
                          {other.hero.headline}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </EditorSection>

          {/* ── Intelligems Tests (research-only, demoted) ── */}
          <EditorSection
            title="Intelligems test data"
            description="Research-only — not displayed prominently. Stored for filtering / aggregate stats."
            badge={study.results.tests.length > 0 ? `${study.results.tests.length} test${study.results.tests.length > 1 ? "s" : ""}` : undefined}
            defaultOpen={false}
          >
            <div className="space-y-3">
              {study.results.tests.map((t, i) => (
                <IntelligemsTestCard
                  key={t.id}
                  test={t}
                  slug={study.slug}
                  index={i}
                  onChange={(next) =>
                    updateStudy((prev) => ({
                      ...prev,
                      results: {
                        ...prev.results,
                        tests: prev.results.tests.map((x) => (x.id === t.id ? next : x)),
                      },
                    }))
                  }
                  onDelete={() =>
                    updateStudy((prev) => ({
                      ...prev,
                      results: {
                        ...prev.results,
                        tests: prev.results.tests.filter((x) => x.id !== t.id),
                      },
                    }))
                  }
                />
              ))}
              <button
                type="button"
                onClick={() =>
                  updateStudy((prev) => ({
                    ...prev,
                    results: {
                      ...prev.results,
                      tests: [...prev.results.tests, makeEmptyTest()],
                    },
                  }))
                }
                className="w-full flex items-center justify-center gap-1.5 px-4 py-3 border-2 border-dashed border-[#E5E5EA] rounded-lg text-xs font-semibold text-[#7A7A7A] hover:border-[#A0A0A0] hover:text-[#1B1B1B] transition-colors"
              >
                <PlusIcon className="size-4" />
                Add test
              </button>
            </div>
          </EditorSection>

          {/* ── Settings ──────────────────────── */}
          <EditorSection title="Settings" description="Slug, brand colour, publishing" defaultOpen={false}>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Slug</label>
                <div className="flex gap-2">
                  <input
                    className={inputClass}
                    value={study.slug}
                    onChange={(e) => {
                      setSlugDirty(true);
                      const v = slugify(e.target.value);
                      setStudy((prev) => (prev ? { ...prev, slug: v } : prev));
                    }}
                  />
                  <button
                    type="button"
                    onClick={commitSlug}
                    disabled={!slugDirty || study.slug === routeSlug || !slugAvailable}
                    className="px-4 py-2 bg-[#1B1B1B] text-white text-xs font-semibold rounded-lg hover:bg-[#2D2D2D] disabled:opacity-40 transition-colors whitespace-nowrap"
                  >
                    Apply
                  </button>
                </div>
                {!slugAvailable && (
                  <p className="text-[11px] text-red-600 mt-1">Slug already taken</p>
                )}
                <p className="text-[10px] text-[#A0A0A0] mt-1">
                  Public URL: {PUBLIC_BASE}/{study.slug}
                </p>
              </div>
              <div>
                <label className={labelClass}>Brand colour (eyebrow accent)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    className="size-10 rounded-lg border border-[#E5E5EA] cursor-pointer"
                    value={study.settings.brandColor || "#E04A2F"}
                    onChange={(e) =>
                      updateStudy((prev) => ({
                        ...prev,
                        settings: { ...prev.settings, brandColor: e.target.value },
                      }))
                    }
                  />
                  <input
                    className={inputClass}
                    value={study.settings.brandColor || ""}
                    onChange={(e) =>
                      updateStudy((prev) => ({
                        ...prev,
                        settings: { ...prev.settings, brandColor: e.target.value },
                      }))
                    }
                    placeholder="#E04A2F"
                  />
                </div>
                <p className="text-[10px] text-[#A0A0A0] mt-1">
                  Used on eyebrow labels. Default coral matches Ecom Landers&apos; accent.
                </p>
              </div>
              <div className="flex items-center justify-between bg-[#FAFAFB] border border-[#EDEDEF] rounded-lg px-4 py-3">
                <div>
                  <div className="text-sm font-semibold text-[#1B1B1B]">
                    {study.settings.published ? "Published" : "Draft"}
                  </div>
                  <div className="text-[11px] text-[#7A7A7A]">
                    {study.settings.published
                      ? "Live at the public URL"
                      : "Add ?draft=1 to preview"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={togglePublish}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                    study.settings.published
                      ? "bg-white text-[#1B1B1B] border border-[#E5E5EA] hover:bg-[#F3F3F5]"
                      : "bg-[#1B1B1B] text-white hover:bg-[#2D2D2D]"
                  }`}
                >
                  {study.settings.published ? "Unpublish" : "Publish"}
                </button>
              </div>
            </div>
          </EditorSection>
        </div>

        <aside className="lg:sticky lg:top-[68px] self-start space-y-4">
          <div className="bg-white border border-[#EDEDEF] rounded-xl p-5 shadow-[var(--shadow-soft)]">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0] mb-3">
              At a glance
            </div>
            <div className="space-y-3">
              <Stat label="Headline stats" value={study.headlineStats.length} />
              <Stat label="Solution cards" value={study.approach.cards.length} />
              <Stat label="Compounded results" value={study.compoundedResults.length} />
              <Stat label="Tests" value={study.results.tests.length} />
              <Stat label="Figma frames" value={study.designs.figmaFrames.length} />
              <Stat label="Tech tags" value={study.techStack.length} />
            </div>
          </div>

          <div className="bg-white border border-[#EDEDEF] rounded-xl p-5 shadow-[var(--shadow-soft)]">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0] mb-3">
              Public preview
            </div>
            <div className="aspect-[4/3] rounded-lg overflow-hidden border border-[#EDEDEF] bg-white">
              <iframe
                src={`/case-studies/${study.slug}?draft=1`}
                title="Public preview"
                className="w-full h-full"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
            <Link
              href={`/case-studies/${study.slug}${study.settings.published ? "" : "?draft=1"}`}
              target="_blank"
              className="mt-3 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#F3F3F5] text-[#1B1B1B] text-xs font-semibold rounded-lg hover:bg-[#EDEDEF] transition-colors"
            >
              <EyeIcon className="size-3.5" />
              Open full preview
            </Link>
          </div>

          <div className="bg-white border border-[#EDEDEF] rounded-xl p-5 shadow-[var(--shadow-soft)]">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#A0A0A0] mb-3">
              Duplicate as new
            </div>
            <DuplicateButton study={study} router={router} />
          </div>
        </aside>
      </div>
    </div>
  );
}

function makeEmptyTest(): IntelligemsTest {
  return {
    id: genId(),
    name: "",
    variantALabel: "Control",
    variantBLabel: "Variant",
    primaryMetric: "Conversion rate",
    liftPercent: 0,
    confidencePercent: 0,
    testDurationDays: 0,
    sampleSize: 0,
    trafficSplit: "50/50",
  };
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-[#7A7A7A]">{label}</span>
      <span className="text-sm font-semibold text-[#1B1B1B] tabular-nums">{value}</span>
    </div>
  );
}

function SaveStatePill({ state, error }: { state: SaveState; error: string | null }) {
  if (state === "saving") {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-[#7A7A7A]">
        <div className="size-3 border-2 border-[#A0A0A0] border-t-[#1B1B1B] rounded-full animate-spin" />
        Saving…
      </div>
    );
  }
  if (state === "saved") {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-green-600">
        <CheckCircleIcon className="size-3.5" />
        Saved
      </div>
    );
  }
  if (state === "error") {
    return (
      <div className="text-[11px] text-red-600" title={error || ""}>
        Save failed
      </div>
    );
  }
  return null;
}

function DuplicateButton({
  study,
  router,
}: {
  study: CaseStudy;
  router: ReturnType<typeof useRouter>;
}) {
  const [busy, setBusy] = useState(false);
  const handle = async () => {
    const newSlug = slugify(`${study.slug}-copy`);
    setBusy(true);
    try {
      const copy = duplicateCaseStudy(study, newSlug);
      await saveCaseStudy(copy);
      router.push(`/case-studies/${newSlug}/edit`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Duplicate failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      type="button"
      onClick={handle}
      disabled={busy}
      className="w-full text-xs font-semibold px-3 py-2 bg-[#F3F3F5] text-[#1B1B1B] rounded-lg hover:bg-[#EDEDEF] transition-colors disabled:opacity-50"
    >
      {busy ? "Duplicating…" : "Duplicate from this study"}
    </button>
  );
}
