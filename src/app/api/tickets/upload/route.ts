/* ── Tickets — screenshot upload ──
 * POST a multipart form with `file`, get back a public URL.
 * Stored in the `tickets` Supabase storage bucket (public read).
 *
 * If the bucket doesn't exist yet, create it from the Supabase dashboard:
 *   Storage → New bucket → name "tickets", public.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const BUCKET = "tickets";
const MAX_SIZE = 10 * 1024 * 1024; // 10MB — these are screenshots, not videos
const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large — 10MB max." },
        { status: 400 },
      );
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Only PNG, JPG, WebP, GIF images allowed." },
        { status: 400 },
      );
    }

    const ext = file.name.split(".").pop() || "png";
    const safeExt = ext.replace(/[^a-z0-9]/gi, "").toLowerCase() || "png";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(filename, buffer, {
        contentType: file.type,
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
      type: file.type,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
