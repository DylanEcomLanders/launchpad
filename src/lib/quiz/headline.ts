import type { Vertical, PainPoint } from "./types";

// Vertical-flavoured framing for the headline
const VERTICAL_NOUN: Record<Vertical, string> = {
  beauty: "beauty",
  supplements: "supplements",
  apparel: "apparel",
  food: "food & beverage",
  other: "ecom",
};

// Pain-point-driven headline variants. We pick a base shape per pain and
// drop the vertical noun in. Output reads like a diagnosis sentence.
const PAIN_HEADLINE: Record<PainPoint, (vertical: string) => string> = {
  ads_not_converting: (v) =>
    `Your ads aren't broken. Your ${v} landing page is.`,
  low_atc: (v) =>
    `${v.charAt(0).toUpperCase() + v.slice(1)} traffic is landing — but the PDP isn't closing the buyer.`,
  cart_abandonment: (v) =>
    `${v.charAt(0).toUpperCase() + v.slice(1)} buyers are reaching cart and bailing. Here's where.`,
  low_aov: (v) =>
    `Your ${v} AOV ceiling is a structure problem, not a pricing problem.`,
  all_of_it: (v) =>
    `Your ${v} funnel needs a diagnosis before a plan — here's where to look.`,
};

export function buildHeadline(vertical: Vertical, painPoint: PainPoint): string {
  const noun = VERTICAL_NOUN[vertical];
  return PAIN_HEADLINE[painPoint](noun);
}
