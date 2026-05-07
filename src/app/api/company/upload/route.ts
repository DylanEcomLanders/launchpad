/* ── Company module — file upload ──
 * Generic upload endpoint for invoices (PDF), CVs (PDF), avatars (image).
 *
 * POST multipart with `file` + `bucket` (one of: company-invoices,
 * company-cvs, company-avatars). Returns the public URL.
 *
 * Buckets must exist + be public. Create from Supabase dashboard.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const ALLOWED_BUCKETS = new Set([
  "company-invoices",
  "company-cvs",
  "company-avatars",
]);

const TYPE_RULES: Record<string, { types: string[]; maxBytes: number }> = {
  "company-invoices": {
    types: ["application/pdf", "image/png", "image/jpeg", "image/webp"],
    maxBytes: 15 * 1024 * 1024,
  },
  "company-cvs": {
    types: ["application/pdf"],
    maxBytes: 10 * 1024 * 1024,
  },
  "company-avatars": {
    types: ["image/png", "image/jpeg", "image/webp", "image/gif"],
    maxBytes: 5 * 1024 * 1024,
  },
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const bucket = String(formData.get("bucket") || "");

    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
    if (!ALLOWED_BUCKETS.has(bucket)) {
      return NextResponse.json({ error: "Invalid bucket" }, { status: 400 });
    }

    const rules = TYPE_RULES[bucket];
    if (file.size > rules.maxBytes) {
      return NextResponse.json(
        { error: `File too large — ${rules.maxBytes / 1024 / 1024}MB max.` },
        { status: 400 },
      );
    }
    if (!rules.types.includes(file.type)) {
      return NextResponse.json(
        { error: `File type not allowed for this bucket.` },
        { status: 400 },
      );
    }

    const ext = file.name.split(".").pop() || "bin";
    const safeExt = ext.replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error } = await supabase.storage
      .from(bucket)
      .upload(filename, buffer, { contentType: file.type, upsert: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filename);

    return NextResponse.json({
      url: urlData.publicUrl,
      filename,
      original: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
