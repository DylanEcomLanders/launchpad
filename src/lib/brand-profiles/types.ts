/* ── Brand Profile Types ── */

export interface BrandProfile {
  id: string;
  project_name: string;
  brand_url: string;
  pain_points: string[];
  desires: string[];
  objections: string[];
  language_pulls: string[];
  raw_report: string;
  last_researched: string;
  created_at: string;
  updated_at: string;
}

export type BrandProfileInsert = Omit<BrandProfile, "id" | "created_at" | "updated_at">;
