/* Upload endpoint for the Strategy Sandbox.
 *
 * Receives a multipart form with `file` and `client_id`, writes the
 * file to the `strategy-resources` Supabase Storage bucket at
 * `{client_id}/{timestamp}-{filename}`, returns the storage path so
 * the caller can persist a resource row pointing at it.
 *
 * Files are private. The data layer's signedUrlForResource() helper
 * mints a short-lived signed URL when someone clicks to open.
 *
 * Auth: app-layer (launchpad-role cookie). Mirrors the pattern used by
 * /api/company/upload (avatars), no per-user identity yet.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const BUCKET = "strategy-resources";
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB ceiling

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 },
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid multipart form" },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  const clientId = formData.get("client_id");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file missing" }, { status: 400 });
  }
  if (typeof clientId !== "string" || !clientId.trim()) {
    return NextResponse.json({ error: "client_id missing" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Empty file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File exceeds ${MAX_BYTES / 1024 / 1024} MB` },
      { status: 413 },
    );
  }

  // Sanitise filename: keep alpha-numeric, dash, dot, underscore.
  const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, "_");
  const timestamp = Date.now();
  const path = `${clientId}/${timestamp}-${safeName}`;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, arrayBuffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({
      ok: true,
      file_path: path,
      file_name: file.name,
      size: file.size,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
