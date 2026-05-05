/* ── Case Studies — Seed example data ──
 * POST: idempotently create or refresh the example "Verdant Skincare" study.
 * Hit this after running the table SQL in Supabase to bootstrap a populated
 * case study you can use to visually pressure-test the layout.
 */

import { NextResponse } from "next/server";
import { saveCaseStudy } from "@/lib/case-studies/data";
import { makeExampleCaseStudy } from "@/lib/case-studies/seed";

export async function POST() {
  try {
    const study = makeExampleCaseStudy();
    await saveCaseStudy(study);
    return NextResponse.json({
      success: true,
      slug: study.slug,
      editUrl: `/case-studies/${study.slug}/edit`,
      publicUrl: `/case-studies/${study.slug}`,
    });
  } catch (err) {
    console.error("[case-studies seed] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Seed failed" },
      { status: 500 },
    );
  }
}

// Allow GET for convenience — visit /api/case-studies/seed in a browser
export async function GET() {
  return POST();
}
