/* ── Hero Offer playbook - types ──
 *
 * Six tables back the /hero-offer house. Each row is a JSON blob via
 * createStore() so adding a field is a TypeScript-only change. Order
 * is an integer sort key (gaps allowed; UI re-numbers on save).
 */

export type OfferStage = "start" | "acquisition" | "execution" | "retention";

/* Editable markdown sections on Start here / Acquisition / Retention.
 * Plain markdown body, rendered with react-markdown + remark-gfm. */
export interface OfferSection {
  id: string;
  stage: OfferStage;
  title: string;
  body: string;
  order: number;
  owner?: string;
  updated_at: string;
}

/* Q&A row for the Acquisition objection library. Edited via a simple
 * two-textarea form. */
export interface OfferObjection {
  id: string;
  objection: string;
  response: string;
  order: number;
}

/* One conversion-engine layer. Cards on the Execution tab. */
export interface OfferLayer {
  id: string;
  name: string;
  included: string;        // markdown summary - what's covered
  deliverables: string;    // markdown checklist - tangible outputs
  turnaround: string;      // free-form ("5 working days", "Week 1-2")
  bar: string;             // markdown - "what wow looks like"
  order: number;
  owner?: string;
  updated_at: string;
}

/* Retention lifecycle pages. day is the milestone marker (30 / 90 /
 * 180 / 365 to start; the field is a free integer so the team can
 * add more touchpoints later without a migration). */
export interface OfferMilestone {
  id: string;
  day: number;
  title: string;
  body: string;           // markdown body of the play
  order: number;
}

export type OfferResourceKind =
  | "deck"
  | "template"
  | "doc"
  | "sop"
  | "loom"
  | "link";

export type OfferResourceParent =
  | "section"
  | "layer"
  | "milestone"
  | "objection"
  | "root";              // surfaced on the Start here index

/* Attached link anywhere in the playbook. parent_type + parent_id
 * point at the owning row; resources for the Start here index use
 * parent_type "root" with parent_id "root". */
export interface OfferResource {
  id: string;
  parent_type: OfferResourceParent;
  parent_id: string;
  title: string;
  url: string;
  kind: OfferResourceKind;
}

/* Pricing tier row. Used on Acquisition / Pricing. */
export interface OfferPricingTier {
  id: string;
  tier: string;          // "Entry", "Core", "VIP" - free-form for renames
  price: string;         // free-form so it can hold "£8k / month" or "from £5,000"
  includes: string[];    // bullets
  order: number;
}
