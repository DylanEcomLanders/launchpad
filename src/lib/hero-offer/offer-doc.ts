/* ── Offer doc: the editable Offer workspace ──
 *
 * The Offer is now a left-nav TipTap workspace (like Clients): a handful of
 * navigable pages the team edits in place - Overview, Price list, Resources,
 * Info - no more code changes to tweak positioning. Same prototype persistence
 * as the rest: localStorage is the source of truth, every write best-efforts to
 * Supabase's `hero_offer_doc` table ({ id, data jsonb, updated_at }); one row,
 * id "main", holding the section array. A missing table degrades silently.
 *
 * The stage decks (pitch deck, kickoff deck, roadmap, monthly report) stay their
 * own structured routes, linked from the workspace's left nav.
 * Productionising = paste supabase/migrations/063_hero_offer_doc.sql.
 */

import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const KEY = "hero-offer-sections";
const ROW_ID = "main";

export interface OfferSection {
  id: string;
  title: string;
  /** TipTap HTML for this page. */
  body: string;
}

/** The deck routes, surfaced in the workspace left nav (kept as structured tools). */
export const OFFER_DECKS: { label: string; href: string }[] = [
  { label: "Discovery audit", href: "/hero-offer/acquisition/discovery-audit" },
  { label: "Pitch deck", href: "/hero-offer/acquisition/pitch-deck" },
  { label: "Qualification", href: "/hero-offer/acquisition/qualification" },
  { label: "Kickoff deck", href: "/hero-offer/execution/kickoff-deck" },
  { label: "Roadmap", href: "/hero-offer/execution/roadmap" },
  { label: "Monthly report", href: "/hero-offer/retention/monthly-report" },
  { label: "Milestone deck", href: "/hero-offer/retention/milestone-deck" },
];

/** Seed pages, migrated from the old hardcoded tabs. Fully editable after load. */
export const DEFAULT_OFFER_SECTIONS: OfferSection[] = [
  {
    id: "overview",
    title: "Overview",
    body: `<h2>The conversion engine</h2>
<p><strong>We turn the traffic you already pay for into revenue.</strong></p>
<p>One programme: a full conversion team (design, dev, copy, CRO) embedded in your business on a monthly system. Not consultancy, not a vendor: a partnership built to compound.</p>
<h3>The guarantee</h3>
<p>Measurable CR lift in 90 days, or we keep working free. You ship what we recommend; we hit the number.</p>
<h3>North Star</h3>
<p>Conversion rate. The one metric we measure ourselves on. CR up = revenue up at the same ad spend.</p>
<h3>Who it's for</h3>
<p>Shopify brands at £200k/mo+. Paid-traffic dependent. Founders or CMOs with conversion ambition and the bandwidth to ship.</p>`,
  },
  {
    id: "price-list",
    title: "Price list",
    body: `<h2>Price list</h2>
<table>
<tr><th><p>Tier</p></th><th><p>Monthly</p></th><th><p>What's included</p></th></tr>
<tr><td><p>Entry</p></td><td><p>£5k</p></td><td><p>2 page builds / month, 2 A/B tests / month, biweekly strategy calls, biweekly reporting</p></td></tr>
<tr><td><p>Core (most chosen)</p></td><td><p>£10k</p></td><td><p>4 page builds / month, 4 A/B tests / month, weekly strategy calls, weekly reporting</p></td></tr>
<tr><td><p>VIP</p></td><td><p>£15k</p></td><td><p>6 page builds / month, 12 A/B tests / month, weekly strategy calls, priority turnaround, quarterly brand strategy</p></td></tr>
</table>
<h3>Terms</h3>
<ul>
<li><p>90-day initial commitment, then rolling monthly.</p></li>
<li><p>10% off when the quarter is paid up front.</p></li>
<li><p>One-off page and site builds are scoped and invoiced separately.</p></li>
</ul>`,
  },
  {
    id: "resources",
    title: "Resources",
    body: `<h2>Resources</h2>
<p>The three stages of the engine, and the working surfaces and decks under each. The presentable decks are in the left nav under Decks.</p>
<h3>Acquisition: win the deal</h3>
<p>Discovery audit, pitch deck, qualification.</p>
<h3>Execution: wow on delivery</h3>
<p>Kickoff deck, roadmap.</p>
<h3>Retention: make it last</h3>
<p>Monthly report, milestone deck.</p>
<h3>Objection library</h3>
<p>Every objection we hear and the response that lands. Build it up over time; searchable mid-call.</p>
<ul><li><p><strong>"It's expensive."</strong>: <em>Response…</em></p></li></ul>`,
  },
  {
    id: "info",
    title: "Info",
    body: `<h2>Info</h2>
<h3>The thesis</h3>
<p><em>Why this offer wins…</em></p>
<h3>What we're not</h3>
<p>Not a consultancy, not a vendor, not a one-off project shop.</p>
<h3>What we are</h3>
<p>A partnership built to compound: one embedded conversion team on a monthly system.</p>
<h3>Why the guarantee holds</h3>
<p><em>The maths behind measurable CR lift in 90 days…</em></p>
<h3>Why three tiers</h3>
<p>Same team, cadence scales with ambition.</p>
<h3>Who owns what</h3>
<p><em>The split between us and the client…</em></p>`,
  },
];

function lsGet(): OfferSection[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? (parsed as OfferSection[]) : null;
  } catch {
    return null;
  }
}
function lsSet(sections: OfferSection[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(sections));
  } catch {
    /* storage full */
  }
}

export async function loadOfferDoc(): Promise<OfferSection[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from("hero_offer_doc").select("*").eq("id", ROW_ID).maybeSingle();
      const sections = (data?.data as { sections?: OfferSection[] } | undefined)?.sections;
      if (!error && sections && sections.length) {
        lsSet(sections);
        return sections;
      }
    } catch {
      /* table missing / offline - use LS */
    }
  }
  const stored = lsGet();
  if (stored) return stored;
  lsSet(DEFAULT_OFFER_SECTIONS);
  return DEFAULT_OFFER_SECTIONS;
}

export async function saveOfferDoc(sections: OfferSection[]): Promise<void> {
  lsSet(sections);
  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from("hero_offer_doc")
        .upsert({ id: ROW_ID, data: { sections }, updated_at: new Date().toISOString() }, { onConflict: "id" });
    } catch {
      /* table not migrated yet - LS already holds it */
    }
  }
}
