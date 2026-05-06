/* ── Showcase settings data layer ──
 * Single-row config powering the public /case-studies index page —
 * hero eyebrow / headline / subhead, closing CTA copy + links. Stored
 * in showcase_settings table at fixed id = 'default'. Defaults baked
 * in here so a fresh DB or a missing row degrades gracefully (the
 * public page never goes blank if the row hasn't been created yet).
 */

import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const TABLE = "showcase_settings";
const SETTINGS_ID = "default";

export interface ShowcaseSettings {
  eyebrow: string;
  headline: string;
  subhead: string;
  /* Closing dark CTA bar at the bottom of the index. */
  closingHeadline: string;
  closingSubhead: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  /* Top-right header pill. */
  headerCtaLabel: string;
  headerCtaHref: string;
}

export const DEFAULT_SHOWCASE_SETTINGS: ShowcaseSettings = {
  eyebrow: "Case studies",
  headline: "Conversion engine in action.",
  subhead:
    "Real brands, real numbers. Each study walks through the funnel we inherited, the system we shipped, and the compounded outcome — MRR, AOV, conversion rate, the lot.",
  closingHeadline: "Want to see the same play run on your funnel?",
  closingSubhead:
    "Get a free 15-min audit — we'll mark the leaks on a Loom and tell you whether we can help.",
  primaryCtaLabel: "Get a free audit",
  primaryCtaHref: "/audit",
  secondaryCtaLabel: "Book a call",
  secondaryCtaHref: "https://cal.com/dylanevans",
  headerCtaLabel: "Free audit",
  headerCtaHref: "/audit",
};

/* Server-safe read. Returns DEFAULT_SHOWCASE_SETTINGS merged with
 * whatever's in the row, so unknown / missing fields fall back rather
 * than crashing the public render. */
export async function getShowcaseSettings(): Promise<ShowcaseSettings> {
  if (!isSupabaseConfigured()) return DEFAULT_SHOWCASE_SETTINGS;
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("data")
      .eq("id", SETTINGS_ID)
      .maybeSingle();
    if (error) throw error;
    if (!data) return DEFAULT_SHOWCASE_SETTINGS;
    return {
      ...DEFAULT_SHOWCASE_SETTINGS,
      ...(data.data as Partial<ShowcaseSettings>),
    };
  } catch (err) {
    console.error("[showcase-settings] load error:", err);
    return DEFAULT_SHOWCASE_SETTINGS;
  }
}

/* Upsert at the fixed ID. Editor calls this on every debounced save. */
export async function saveShowcaseSettings(
  settings: ShowcaseSettings,
): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase not configured");
  }
  const { error } = await supabase.from(TABLE).upsert({
    id: SETTINGS_ID,
    data: settings,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
