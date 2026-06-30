"use client";

/* ── Showcase page settings editor ──
 * Self-serve copy editor for the public /case-studies index. Single
 * row in showcase_settings powers all the strings on that page —
 * eyebrow, headline, subhead, closing CTA copy, button labels and
 * destinations. Mirrors the case-study editor save UX: debounced
 * auto-save, "Saved" indicator, "View live" link.
 */

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import { AuthGate } from "@/components/auth-gate";
import { inputClass, labelClass, textareaClass } from "@/lib/form-styles";
import {
  type ShowcaseSettings,
  DEFAULT_SHOWCASE_SETTINGS,
  getShowcaseSettings,
  saveShowcaseSettings,
} from "@/lib/case-studies/showcase-settings";

type SaveState = "idle" | "saving" | "saved" | "error";

export default function ShowcaseSettingsPage() {
  return (
    <AuthGate>
      <ShowcaseSettingsEditor />
    </AuthGate>
  );
}

function ShowcaseSettingsEditor() {
  const [settings, setSettings] = useState<ShowcaseSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Load on mount ─────────────────── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await getShowcaseSettings();
        if (!cancelled) setSettings(s);
      } catch (err) {
        if (!cancelled)
          setLoadError(err instanceof Error ? err.message : "Load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ── Debounced save (1s after last edit) ───────────────── */
  const saveNow = useCallback(async (next: ShowcaseSettings) => {
    setSaveState("saving");
    setSaveError(null);
    try {
      await saveShowcaseSettings(next);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1500);
    } catch (err) {
      setSaveState("error");
      setSaveError(err instanceof Error ? err.message : "Save failed");
    }
  }, []);

  const updateField = useCallback(
    <K extends keyof ShowcaseSettings>(key: K, value: ShowcaseSettings[K]) => {
      setSettings((prev) => {
        if (!prev) return prev;
        const next = { ...prev, [key]: value };
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => saveNow(next), 1000);
        return next;
      });
    },
    [saveNow],
  );

  const resetToDefaults = useCallback(() => {
    if (
      !window.confirm(
        "Reset every field on the showcase page to the default copy? This can't be undone.",
      )
    )
      return;
    setSettings(DEFAULT_SHOWCASE_SETTINGS);
    saveNow(DEFAULT_SHOWCASE_SETTINGS);
  }, [saveNow]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-raised">
        <div className="animate-spin size-6 border-2 border-foreground border-t-[#1A1A1A] rounded-full" />
      </div>
    );
  }
  if (loadError || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-raised p-8">
        <div className="text-center">
          <p className="text-sm text-red-600">
            Couldn&apos;t load showcase settings: {loadError}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-raised">
      {/* ── Top bar ───────────────────── */}
      <header className="border-b border-border bg-white">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <Link
            href="/sales-engine/case-studies"
            className="flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-[#3A3A3D] transition-colors"
          >
            <ArrowLeftIcon className="size-4" />
            All case studies
          </Link>
          <div className="flex items-center gap-3">
            <SaveStateBadge state={saveState} error={saveError} />
            <Link
              href="/case-studies"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-foreground text-foreground rounded-md hover:bg-surface-raised transition-colors"
            >
              <EyeIcon className="size-3.5" />
              View live
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-10">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Showcase page settings
          </h1>
          <p className="text-sm text-subtle mt-1">
            Edit the copy + links on the public{" "}
            <code className="px-1.5 py-0.5 bg-[#F0F2F5] rounded text-[11px]">
              ecomlanders.app/case-studies
            </code>{" "}
            index page. Saves automatically — changes go live within ~60 seconds (page is
            cached for 60s on Vercel).
          </p>
        </div>

        {/* ── Header section ── */}
        <Section title="Header" description="Top-right pill button on the showcase page">
          <Field label="CTA label">
            <input
              type="text"
              value={settings.headerCtaLabel}
              onChange={(e) => updateField("headerCtaLabel", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="CTA link">
            <input
              type="text"
              value={settings.headerCtaHref}
              onChange={(e) => updateField("headerCtaHref", e.target.value)}
              placeholder="/audit"
              className={inputClass}
            />
          </Field>
        </Section>

        {/* ── Hero section ── */}
        <Section title="Hero" description="The opening block at the top of the page">
          <Field label="Eyebrow (small uppercase label above the headline)">
            <input
              type="text"
              value={settings.eyebrow}
              onChange={(e) => updateField("eyebrow", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Headline">
            <input
              type="text"
              value={settings.headline}
              onChange={(e) => updateField("headline", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Subhead">
            <textarea
              rows={4}
              value={settings.subhead}
              onChange={(e) => updateField("subhead", e.target.value)}
              className={textareaClass}
            />
          </Field>
        </Section>

        {/* ── Closing CTA section ── */}
        <Section
          title="Closing CTA"
          description="The dark bar at the bottom of the page, after the case study grid"
        >
          <Field label="Headline">
            <input
              type="text"
              value={settings.closingHeadline}
              onChange={(e) => updateField("closingHeadline", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Subhead (optional)">
            <textarea
              rows={3}
              value={settings.closingSubhead}
              onChange={(e) => updateField("closingSubhead", e.target.value)}
              className={textareaClass}
            />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <Field label="Primary button label">
              <input
                type="text"
                value={settings.primaryCtaLabel}
                onChange={(e) => updateField("primaryCtaLabel", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Primary button link">
              <input
                type="text"
                value={settings.primaryCtaHref}
                onChange={(e) => updateField("primaryCtaHref", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Secondary button label (optional)">
              <input
                type="text"
                value={settings.secondaryCtaLabel}
                onChange={(e) => updateField("secondaryCtaLabel", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Secondary button link (optional)">
              <input
                type="text"
                value={settings.secondaryCtaHref}
                onChange={(e) => updateField("secondaryCtaHref", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </Section>

        {/* ── Reset ── */}
        <div className="border-t border-border pt-8">
          <button
            type="button"
            onClick={resetToDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-subtle hover:text-red-500 transition-colors"
          >
            <ArrowPathIcon className="size-3.5" />
            Reset all fields to defaults
          </button>
        </div>
      </main>
    </div>
  );
}

/* ── Helpers ───────────────────────────────────── */

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-border rounded-xl p-6 md:p-7">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="text-xs text-subtle mt-1">{description}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

function SaveStateBadge({
  state,
  error,
}: {
  state: SaveState;
  error: string | null;
}) {
  if (state === "saving") {
    return <span className="text-xs text-subtle">Saving…</span>;
  }
  if (state === "saved") {
    return (
      <span className="flex items-center gap-1 text-xs text-green-600">
        <CheckCircleIcon className="size-3.5" />
        Saved
      </span>
    );
  }
  if (state === "error") {
    return (
      <span className="text-xs text-red-600" title={error || ""}>
        Save failed
      </span>
    );
  }
  return null;
}
