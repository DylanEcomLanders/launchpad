/* ── Portfolio v2 API ──
 * GET:    list all projects
 * DELETE: ?id=... removes project + its storage files
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getProjects, getProject, deleteProject } from "@/lib/portfolio-v2/data";

const BUCKET = "portfolio-v2";

export async function GET() {
  try {
    const projects = await getProjects();
    return NextResponse.json({ projects });
  } catch (err) {
    console.error("[portfolio-v2 GET] error:", err);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const project = await getProject(id);

    // Remove storage files
    if (project) {
      const paths = [
        ...project.desktop_slices.map((_, i) => `${project.slug}/desktop-${i}.avif`),
        ...project.mobile_slices.map((_, i) => `${project.slug}/mobile-${i}.avif`),
      ];
      if (paths.length) {
        const { error } = await supabase.storage.from(BUCKET).remove(paths);
        if (error) console.error("[portfolio-v2 DELETE] storage error:", error);
      }
    }

    await deleteProject(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[portfolio-v2 DELETE] error:", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
