/* ── Handover Files Upload API ──
 * POST: Upload asset/font file to Supabase Storage bucket `handover-files`
 * DELETE: Remove file from Supabase Storage
 * Accepts any file type — videos, fonts, images, zips, etc.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const BUCKET = "handover-files";
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum 50MB." },
        { status: 400 }
      );
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filename = `${Date.now()}-${safeName}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    // Font files often have empty or generic MIME types — use a sensible fallback
    const contentType = file.type || "application/octet-stream";

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(filename, buffer, {
        contentType,
        upsert: false,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(filename);

    return NextResponse.json({
      filename,
      originalName: file.name,
      url: urlData.publicUrl,
      size: file.size,
      type: file.type,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { filename } = await req.json();

    if (!filename) {
      return NextResponse.json({ error: "No filename provided" }, { status: 400 });
    }

    const { error } = await supabase.storage
      .from(BUCKET)
      .remove([filename]);

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
