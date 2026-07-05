/* ── Offer data — single source for the offer surface ──
 * Tiers mirror /pricing exactly; the Hero Offer + Price list tabs both read
 * from here so the numbers can never drift apart. Stage resources drive the
 * Resources tab. Icons are plain component refs (no JSX), so this stays a
 * data-only module.
 */

import type { ComponentType, SVGProps } from "react";
import {
  MegaphoneIcon,
  WrenchScrewdriverIcon,
  HeartIcon,
} from "@heroicons/react/24/outline";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

export type Tier = {
  name: string;
  monthly: number;
  badge?: string;
  blurb: string;
  featured: boolean;
  features: string[];
};

export const TIERS: Tier[] = [
  { name: "Entry", monthly: 5000, blurb: "The conversion engine at a starter cadence.", featured: false, features: ["2 page builds / month", "2 A/B tests / month", "Biweekly strategy calls", "Biweekly reporting"] },
  { name: "Core", monthly: 10000, badge: "Most chosen", blurb: "Full conversion engine on a weekly rhythm.", featured: true, features: ["4 page builds / month", "4 A/B tests / month", "Weekly strategy calls", "Weekly reporting"] },
  { name: "VIP", monthly: 15000, blurb: "Maximum velocity, aggressive test programme.", featured: false, features: ["6 page builds / month", "12 A/B tests / month", "Weekly strategy calls", "Priority turnaround", "Quarterly brand strategy"] },
];

/* Commitment terms shown under the price sheet. */
export const TERMS = [
  "90-day initial commitment, then rolling monthly.",
  "10% off when the quarter is paid up front.",
  "One-off page and site builds are scoped and invoiced separately.",
];

export function fmtK(n: number) {
  const k = n / 1000;
  return `£${Number.isInteger(k) ? k : k.toFixed(1)}k`;
}

export type Resource = { label: string; href: string; sub: string };

export type StageGroup = {
  key: string;
  icon: Icon;
  label: string;
  sub: string;
  tools: Resource[];
};

/* The three stages of the conversion engine and the canonical tools that live
 * under each. These are the working surfaces + presentable decks the team runs
 * the offer with. */
export const STAGES: StageGroup[] = [
  {
    key: "acquisition",
    icon: MegaphoneIcon,
    label: "Acquisition",
    sub: "Win the deal.",
    tools: [
      { label: "Discovery audit", href: "/hero-offer/acquisition/discovery-audit", sub: "Turn a brand teardown into the wedge for the pitch." },
      { label: "Pitch deck", href: "/hero-offer/acquisition/pitch-deck", sub: "The presentable narrative that closes the partnership." },
      { label: "Qualification", href: "/hero-offer/acquisition/qualification", sub: "Score fit before we spend a call on it." },
    ],
  },
  {
    key: "execution",
    icon: WrenchScrewdriverIcon,
    label: "Execution",
    sub: "Wow on delivery.",
    tools: [
      { label: "Kickoff deck", href: "/hero-offer/execution/kickoff-deck", sub: "Set the standard on day one of the engagement." },
      { label: "Roadmap", href: "/hero-offer/execution/roadmap", sub: "The month of builds and tests, sequenced." },
    ],
  },
  {
    key: "retention",
    icon: HeartIcon,
    label: "Retention",
    sub: "Make it last.",
    tools: [
      { label: "Monthly report", href: "/hero-offer/retention/monthly-report", sub: "Prove the lift every month, in their language." },
      { label: "Milestone deck", href: "/hero-offer/retention/milestone-deck", sub: "The Day 30 / 90 / 180 story that earns the renewal." },
    ],
  },
];
