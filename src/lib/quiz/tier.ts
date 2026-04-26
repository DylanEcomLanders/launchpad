// Lead tiering rules (mirrors the spec exactly):
//   Tier A (high fit):    Q2 = £100k+ AND Q5 ≠ "Never"
//   Tier B (medium fit):  Q2 = £30k–£500k OR (Q2 = £100k+ AND Q5 = "Never")
//   Tier C (low fit):     Q2 = Under £30k

import type { Revenue, CroHistory, LeadTier } from "./types";

const HIGH_REVENUE: Revenue[] = ["100k_500k", "500k_1m", "1m_plus"];
const MID_REVENUE: Revenue[] = ["30k_100k", "100k_500k"];

export function computeLeadTier(revenue: Revenue, croHistory: CroHistory): LeadTier {
  // Tier C: under £30k
  if (revenue === "under_30k") return "C";

  // Tier A: £100k+ AND Q5 != "never"
  if (HIGH_REVENUE.includes(revenue) && croHistory !== "never") return "A";

  // Tier B: £30k–£500k OR (£100k+ AND "never")
  if (MID_REVENUE.includes(revenue)) return "B";
  if (HIGH_REVENUE.includes(revenue) && croHistory === "never") return "B";

  // £500k+ with "never" experience — high revenue but no CRO maturity, treat as B
  if (HIGH_REVENUE.includes(revenue)) return "B";

  return "C";
}
