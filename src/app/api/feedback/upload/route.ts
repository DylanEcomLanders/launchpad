/* ── Feedback: video testimonial upload ──
 * POST a multipart form with `file` (a recorded webcam clip), get back a
 * public URL. Stored in the `feedback-videos` Supabase storage bucket.
 *
 * If the bucket doesn't exist yet, create it from the Supabase dashboard:
 *   Storage → New bucket → name "feedback-videos", public.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const BUCKET = "feedback-videos";
const MAX_SIZE = 100 * 1024 * 1024; // 100MB, short webcam testimonials
const ALLOWED_TYPES = ["video/webm", "video/mp4", "video/quicktime"];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Video too large. 100MB max." },
        { status: 400 },
      );
    }
    // Some browsers append a codec to the type (e.g. "video/webm;codecs=vp9").
    const baseType = file.type.split(";")[0].trim();
    if (baseType && !ALLOWED_TYPES.includes(baseType)) {
      return NextResponse.json(
        { error: "Only WebM, MP4 or MOV video allowed." },
        { status: 400 },
      );
    }

    const ext = baseType === "video/mp4" ? "mp4" : baseType === "video/quicktime" ? "mov" : "webm";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(filename, buffer, {
        contentType: baseType || "video/webm",
        upsert: false,
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(filename);

    return NextResponse.json({
      url: urlData.publicUrl,
      filename,
      size: file.size,
      type: baseType,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
