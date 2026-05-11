/* ── Offer Content Overrides ──
 * Editable overrides for the Conversion Engine offer pages (FAQ, Objections,
 * Cheat Sheet). Defaults stay in the markdown files + hardcoded TSX —
 * overrides layer on top at render time. Supabase (data jsonb) + localStorage
 * fallback, same pattern as business_settings.
 */

const LS_KEY = "launchpad-offer-content";
const STORE_ID = "offer-content-singleton";

export interface CheatsheetObjectionOverride {
  q?: string;
  a?: string;
}

export interface OfferContentOverrides {
  /** FAQ — keyed by section id (slug of the ### heading) → full markdown block */
  faq?: Record<string, string>;
  /** Objections page — keyed by section id (slug of the ## heading) → full markdown block */
  objections?: Record<string, string>;
  /** Cheat sheet structured content */
  cheatsheet?: {
    positioning?: string;
    /** Card body markdown, keyed by card id (e.g. "who", "included", "how", "pricing", "outcomes", "proof") */
    cards?: Record<string, string>;
    /** Objection q/a overrides, keyed by ordinal index as string ("0".."9") */
    objections?: Record<string, CheatsheetObjectionOverride>;
  };
}

export const EMPTY_OVERRIDES: OfferContentOverrides = {};

/**
 * Synchronous read — returns from localStorage cache.
 * Call `loadOfferContent()` once on mount to hydrate from Supabase.
 */
export function getOfferContent(): OfferContentOverrides {
  if (typeof window === "undefined") return EMPTY_OVERRIDES;
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return EMPTY_OVERRIDES;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const item = parsed.find((i: { id: string }) => i.id === STORE_ID);
      if (item) {
        const { id: _id, ...rest } = item;
        return rest as OfferContentOverrides;
      }
      return EMPTY_OVERRIDES;
    }
    return parsed as OfferContentOverrides;
  } catch {
    return EMPTY_OVERRIDES;
  }
}

/**
 * Async load — fetches from Supabase, caches to localStorage, returns merged.
 */
export async function loadOfferContent(): Promise<OfferContentOverrides> {
  try {
    const { isSupabaseConfigured, supabase } = await import("@/lib/supabase");
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from("offer_content_overrides")
        .select("data")
        .eq("id", STORE_ID)
        .limit(1);
      if (!error && data?.[0]?.data) {
        const overrides = data[0].data as OfferContentOverrides;
        if (typeof window !== "undefined") {
          localStorage.setItem(LS_KEY, JSON.stringify([{ ...overrides, id: STORE_ID }]));
        }
        return overrides;
      }
    }
  } catch {
    /* fall through to localStorage */
  }
  return getOfferContent();
}

/**
 * Save overrides — writes to both Supabase and localStorage.
 */
export async function saveOfferContent(overrides: OfferContentOverrides): Promise<void> {
  if (typeof window !== "undefined") {
    localStorage.setItem(LS_KEY, JSON.stringify([{ ...overrides, id: STORE_ID }]));
  }
  try {
    const { isSupabaseConfigured, supabase } = await import("@/lib/supabase");
    if (isSupabaseConfigured()) {
      await supabase.from("offer_content_overrides").upsert({
        id: STORE_ID,
        data: overrides,
        updated_at: new Date().toISOString(),
      });
    }
  } catch {
    /* localStorage fallback */
  }
}
