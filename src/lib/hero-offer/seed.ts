/* ── Hero Offer scaffolding seeds ──
 *
 * Fires once when each panel's slice is empty: pre-populates the
 * structural skeleton (section titles, layer names, milestone days,
 * pricing tier names) with empty bodies so the admin lands on a
 * shaped playbook ready to fill, not a blank "+ Add" page.
 *
 * Each seed function returns the rows it wrote so the caller can set
 * state without re-fetching. Idempotent guard is the caller's job
 * (check store length === 0 before calling).
 */

import {
  offerLayersStore,
  offerMilestonesStore,
  offerPricingStore,
  offerSectionsStore,
  nowISO,
  uid,
} from "./data";
import type {
  OfferLayer,
  OfferMilestone,
  OfferPricingTier,
  OfferSection,
} from "./types";

/* ── Start here ───────────────────────────────────────────────── */
const START_SECTIONS: Array<Pick<OfferSection, "title" | "body">> = [
  {
    title: "What this playbook is",
    body: "",
  },
  {
    title: "How to use it",
    body: "",
  },
];

export async function seedStartHere(): Promise<OfferSection[]> {
  const now = nowISO();
  const created: OfferSection[] = [];
  for (let i = 0; i < START_SECTIONS.length; i++) {
    const s = START_SECTIONS[i];
    const row: OfferSection = {
      id: uid(),
      stage: "start",
      title: s.title,
      body: s.body,
      order: i * 10,
      updated_at: now,
    };
    await offerSectionsStore.create(row);
    created.push(row);
  }
  return created;
}

/* ── Acquisition ──────────────────────────────────────────────── */
const ACQUISITION_SECTIONS: Array<Pick<OfferSection, "title" | "body">> = [
  { title: "Pitch", body: "" },
  { title: "Outreach", body: "" },
  { title: "Sales process", body: "" },
  { title: "Closing", body: "" },
];

const ACQUISITION_PRICING: Array<Pick<OfferPricingTier, "tier" | "price" | "includes">> = [
  { tier: "Entry", price: "", includes: [] },
  { tier: "Core",  price: "", includes: [] },
  { tier: "VIP",   price: "", includes: [] },
];

export async function seedAcquisitionSections(): Promise<OfferSection[]> {
  const now = nowISO();
  const created: OfferSection[] = [];
  for (let i = 0; i < ACQUISITION_SECTIONS.length; i++) {
    const s = ACQUISITION_SECTIONS[i];
    const row: OfferSection = {
      id: uid(),
      stage: "acquisition",
      title: s.title,
      body: s.body,
      order: i * 10,
      updated_at: now,
    };
    await offerSectionsStore.create(row);
    created.push(row);
  }
  return created;
}

export async function seedAcquisitionPricing(): Promise<OfferPricingTier[]> {
  const created: OfferPricingTier[] = [];
  for (let i = 0; i < ACQUISITION_PRICING.length; i++) {
    const t = ACQUISITION_PRICING[i];
    const row: OfferPricingTier = {
      id: uid(),
      tier: t.tier,
      price: t.price,
      includes: t.includes,
      order: i * 10,
    };
    await offerPricingStore.create(row);
    created.push(row);
  }
  return created;
}

/* ── Execution ────────────────────────────────────────────────── */
const EXECUTION_LAYERS: Array<Pick<OfferLayer, "name" | "included" | "deliverables" | "turnaround" | "bar">> = [
  { name: "Discovery audit",         included: "", deliverables: "", turnaround: "", bar: "" },
  { name: "Roadmap & briefing",      included: "", deliverables: "", turnaround: "", bar: "" },
  { name: "Design",                  included: "", deliverables: "", turnaround: "", bar: "" },
  { name: "Development",             included: "", deliverables: "", turnaround: "", bar: "" },
  { name: "QA & launch",             included: "", deliverables: "", turnaround: "", bar: "" },
  { name: "Test & iterate",          included: "", deliverables: "", turnaround: "", bar: "" },
];

export async function seedExecutionLayers(): Promise<OfferLayer[]> {
  const now = nowISO();
  const created: OfferLayer[] = [];
  for (let i = 0; i < EXECUTION_LAYERS.length; i++) {
    const l = EXECUTION_LAYERS[i];
    const row: OfferLayer = {
      id: uid(),
      name: l.name,
      included: l.included,
      deliverables: l.deliverables,
      turnaround: l.turnaround,
      bar: l.bar,
      order: i * 10,
      updated_at: now,
    };
    await offerLayersStore.create(row);
    created.push(row);
  }
  return created;
}

/* ── Retention ────────────────────────────────────────────────── */
const RETENTION_SECTIONS: Array<Pick<OfferSection, "title" | "body">> = [
  { title: "Retention principles", body: "" },
  { title: "Communications cadence", body: "" },
];

const RETENTION_DAYS = [30, 90, 180, 365];

export async function seedRetentionSections(): Promise<OfferSection[]> {
  const now = nowISO();
  const created: OfferSection[] = [];
  for (let i = 0; i < RETENTION_SECTIONS.length; i++) {
    const s = RETENTION_SECTIONS[i];
    const row: OfferSection = {
      id: uid(),
      stage: "retention",
      title: s.title,
      body: s.body,
      order: i * 10,
      updated_at: now,
    };
    await offerSectionsStore.create(row);
    created.push(row);
  }
  return created;
}

export async function seedRetentionMilestones(): Promise<OfferMilestone[]> {
  const created: OfferMilestone[] = [];
  for (let i = 0; i < RETENTION_DAYS.length; i++) {
    const d = RETENTION_DAYS[i];
    const row: OfferMilestone = {
      id: uid(),
      day: d,
      title: `Day ${d}`,
      body: "",
      order: i * 10,
    };
    await offerMilestonesStore.create(row);
    created.push(row);
  }
  return created;
}
