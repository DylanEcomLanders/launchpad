/* ── Briefs data layer ── */

import { createStore } from "@/lib/supabase-store";
import type { Brief, BriefKind } from "./types";

export const briefsStore = createStore<Brief>({
  table: "briefs",
  lsKey: "launchpad-briefs",
});

export function uid(): string {
  return Math.random().toString(36).slice(2, 12);
}
export function nowISO(): string {
  return new Date().toISOString();
}

export function slugify(input: string): string {
  const base = input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  return base || `brief-${uid().slice(0, 6)}`;
}

export function emptyBrief(kind: BriefKind = "hypothesis"): Brief {
  const id = uid();
  const base: Brief = {
    id,
    kind,
    client_name: "",
    project_label: "",
    title: "",
    objective: "",
    audience: "",
    owner: "",
    references: "",
    status: "draft",
    output_slug: id,
    created_at: nowISO(),
    updated_at: nowISO(),
  };
  if (kind === "hypothesis") {
    base.hyp_impact = 7;
    base.hyp_confidence = 6;
    base.hyp_ease = 5;
    base.hyp_primary_metric = "Conversion rate";
  }
  if (kind === "dev") {
    base.dev_testing_tool = "intelligems";
    base.dev_qa_criteria = "Zero errors across browsers and devices. Variant logic clean in the testing tool.";
  }
  return base;
}

export function iceScore(b: Pick<Brief, "hyp_impact" | "hyp_confidence" | "hyp_ease">): number {
  const i = Math.max(1, Math.min(10, b.hyp_impact || 1));
  const c = Math.max(1, Math.min(10, b.hyp_confidence || 1));
  const e = Math.max(1, Math.min(10, b.hyp_ease || 1));
  return i * c * e;
}
