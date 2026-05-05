/* ── Case Studies API ──
 * GET:    list all case studies (latest first)
 * DELETE: ?id=... removes case study + every storage file under its slug
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getCaseStudies, getCaseStudy, deleteCaseStudy } from "@/lib/case-studies/data";

const BUCKET = "case-studies";

export async function GET() {
  try {
    const studies = await getCaseStudies();
    return NextResponse.json({ studies });
  } catch (err) {
    console.error("[case-studies GET] error:", err);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    // Find study to know which slug folder to clean up
    const all = await getCaseStudies();
    const study = all.find((s) => s.id === id);

    if (study) {
      const { data: list } = await supabase.storage.from(BUCKET).list(study.slug);
      if (list && list.length > 0) {
        const paths = list.map((obj) => `${study.slug}/${obj.name}`);
        const { error } = await supabase.storage.from(BUCKET).remove(paths);
        if (error) console.error("[case-studies DELETE] storage error:", error);
      }
    }

    await deleteCaseStudy(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[case-studies DELETE] error:", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}

// Single-study GET kept here so the editor can re-fetch by slug if needed.
export async function HEAD(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return new NextResponse(null, { status: 400 });
  const found = await getCaseStudy(slug);
  return new NextResponse(null, { status: found ? 200 : 404 });
}
