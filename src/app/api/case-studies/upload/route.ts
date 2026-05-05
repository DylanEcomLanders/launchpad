/* ── Case Studies — Image upload ──
 * POST: upload image to Supabase Storage bucket `case-studies`, auto-compress
 *       to webp (max 2400px wide, q85). SVG and video files pass through.
 *       Form fields: file (required), slug (optional, used for path prefix).
 * DELETE: { filename } removes a single object from the bucket.
 */

import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { supabase } from "@/lib/supabase";

const BUCKET = "case-studies";

const ALLOWED_IMAGE = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];
const ALLOWED_VIDEO = ["video/mp4", "video/webm", "video/quicktime"];
const MAX_BYTES = 50 * 1024 * 1024; // 50MB ceiling — videos can be larger than images

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const slug = (formData.get("slug") as string | null) || "shared";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File exceeds 50MB" }, { status: 400 });
    }

    const isImage = ALLOWED_IMAGE.includes(file.type);
    const isVideo = ALLOWED_VIDEO.includes(file.type);
    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: "Unsupported file type. Accepts PNG, JPG, WebP, GIF, SVG, MP4, WebM, MOV." },
        { status: 400 },
      );
    }

    const safeSlug = slug.replace(/[^a-z0-9-]/gi, "-").toLowerCase() || "shared";
    const rand = Math.random().toString(36).slice(2, 8);
    const stamp = Date.now();

    // Typed as ArrayBufferLike so sharp's toBuffer (which returns the wider
     // Buffer<ArrayBufferLike>) is assignable on reassignment below.
    let buffer: Buffer<ArrayBufferLike> = Buffer.from(await file.arrayBuffer());
    let contentType = file.type;
    let ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    let width: number | undefined;
    let height: number | undefined;

    // Compress images (skip GIF — preserve animation; SVG — vector; videos — bytes through)
    if (isImage && file.type !== "image/gif" && file.type !== "image/svg+xml") {
      const meta = await sharp(buffer).metadata();
      let pipeline = sharp(buffer).rotate(); // strip EXIF, auto-orient
      if (meta.width && meta.width > 2400) {
        pipeline = pipeline.resize({ width: 2400, withoutEnlargement: true });
      }
      const out = await pipeline.webp({ quality: 85 }).toBuffer({ resolveWithObject: true });
      buffer = out.data;
      contentType = "image/webp";
      ext = "webp";
      width = out.info.width;
      height = out.info.height;
    } else if (file.type === "image/gif") {
      const meta = await sharp(buffer).metadata();
      width = meta.width;
      height = meta.height;
    }

    const filename = `${safeSlug}/${stamp}-${rand}.${ext}`;

    const { error } = await supabase.storage.from(BUCKET).upload(filename, buffer, {
      contentType,
      upsert: false,
    });

    if (error) {
      console.error("[case-studies upload] storage error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filename);

    return NextResponse.json({
      filename,
      url: urlData.publicUrl,
      width,
      height,
      contentType,
    });
  } catch (err) {
    console.error("[case-studies upload] error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { filename } = await req.json();
    if (!filename) {
      return NextResponse.json({ error: "No filename provided" }, { status: 400 });
    }
    const { error } = await supabase.storage.from(BUCKET).remove([filename]);
    if (error) {
      console.error("[case-studies upload] delete error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[case-studies upload] delete error:", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
