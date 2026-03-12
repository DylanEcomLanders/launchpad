/* ── Copy Engine Types ── */

export type CopyMode = "PDP" | "Collection" | "Landing Page";

export interface CopyInput {
  mode: CopyMode;
  brandProfileId?: string;
  productName: string;
  productDescription: string;
  targetAudience: string;
  keyBenefits: string;
  tone: string;
}

export interface CopySection {
  id: string;
  label: string;
  content: string;
}

export interface CopyOutput {
  mode: CopyMode;
  sections: CopySection[];
}

/** Section definitions per mode */
export const modeSections: Record<CopyMode, { id: string; label: string }[]> = {
  PDP: [
    { id: "hero_headline", label: "Hero Headline" },
    { id: "hero_subline", label: "Hero Subline" },
    { id: "benefits", label: "Benefits Section" },
    { id: "features", label: "Features Section" },
    { id: "social_proof_intro", label: "Social Proof Intro" },
    { id: "faq", label: "FAQ Entries" },
    { id: "primary_cta", label: "Primary CTA" },
    { id: "secondary_cta", label: "Secondary CTA" },
  ],
  Collection: [
    { id: "collection_headline", label: "Collection Headline" },
    { id: "collection_description", label: "Collection Description" },
    { id: "category_intro", label: "Category Intro" },
    { id: "seo_description", label: "SEO Description" },
  ],
  "Landing Page": [
    { id: "hero_headline", label: "Hero Headline" },
    { id: "hero_subline", label: "Hero Subline" },
    { id: "problem", label: "Problem Section" },
    { id: "solution", label: "Solution Section" },
    { id: "benefits", label: "Benefits Section" },
    { id: "features", label: "Features Section" },
    { id: "social_proof_intro", label: "Social Proof Intro" },
    { id: "faq", label: "FAQ Entries" },
    { id: "final_cta", label: "Final CTA" },
  ],
};
