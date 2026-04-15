/* ── Universal File Upload API ──
 * POST: Upload file to specified Supabase Storage bucket (via ?bucket= query param)
 * DELETE: Remove file from specified bucket
 * Defaults to 'design-briefs' bucket if none specified
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const ALLOWED_BUCKETS = ["design-briefs", "Handover-files"];
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

function getBucket(req: NextRequest): string {
  return req.nextUrl.searchParams.get("bucket") || "design-briefs";
}

export async function POST(req: NextRequest) {
  try {
    const bucket = getBucket(req);
    if (!ALLOWED_BUCKETS.includes(bucket)) {
      return NextResponse.json({ error: "Invalid bucket" }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large. Maximum 50MB." }, { status: 400 });
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filename = `${Date.now()}-${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = file.type || "application/octet-stream";

    const { error } = await supabase.storage
      .from(bucket)
      .upload(filename, buffer, { contentType, upsert: false });

    if (error) {
      console.error("Supabase upload error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filename);

    return NextResponse.json({
      filename,
      originalName: file.name,
      url: urlData.publicUrl,
      size: file.size,
      type: file.type || "application/octet-stream",
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const bucket = getBucket(req);
    if (!ALLOWED_BUCKETS.includes(bucket)) {
      return NextResponse.json({ error: "Invalid bucket" }, { status: 400 });
    }

    const { filename } = await req.json();
    if (!filename) {
      return NextResponse.json({ error: "No filename provided" }, { status: 400 });
    }

    const { error } = await supabase.storage.from(bucket).remove([filename]);

    if (error) {
      console.error("Supabase delete error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete error:", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
