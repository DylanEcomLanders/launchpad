import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  FONT_FILE_FORMATS,
  FONT_FILE_EXT_RE,
  FORMAT_MIME,
  fromRow,
  type FontFile,
  type FontFileFormat,
  type FontRow,
} from "@/lib/font-library";

const TABLE = "font_library";
const BUCKET = "font-library";

// ── POST: upload a font file (multipart/form-data) and append to row.files ──
// Form fields:
//   file:   File (.woff2 / .woff / .ttf / .otf)
//   weight: 100..900 as string (default "400")
//   style:  "normal" | "italic"  (default "normal")
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  const ext = file.name.match(FONT_FILE_EXT_RE)?.[1]?.toLowerCase() as FontFileFormat | undefined;
  if (!ext || !(FONT_FILE_FORMATS as readonly string[]).includes(ext)) {
    return NextResponse.json(
      { error: "Unsupported font format. Use .woff2, .woff, .ttf, or .otf" },
      { status: 400 },
    );
  }

  const weightRaw = parseInt(String(form.get("weight") || "400"), 10);
  const weight = Number.isFinite(weightRaw) ? Math.min(900, Math.max(100, weightRaw)) : 400;
  const style = String(form.get("style") || "normal") === "italic" ? "italic" : "normal";

  // Confirm the parent font row exists and load current files[]
  const { data: existing, error: fetchErr } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .single();
  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Font not found" }, { status: 404 });
  }

  // Upload to storage
  const fileId = crypto.randomUUID();
  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").toLowerCase();
  const storagePath = `${id}/${fileId}-${cleanName}`;
  const arrayBuf = await file.arrayBuffer();

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(
    storagePath,
    Buffer.from(arrayBuf),
    { contentType: FORMAT_MIME[ext], upsert: false },
  );
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;

  const newFile: FontFile = {
    id: fileId,
    weight,
    style,
    format: ext,
    storagePath,
    fileName: file.name,
    fileSizeBytes: file.size,
    publicUrl,
    uploadedAt: new Date().toISOString(),
  };

  const nextFiles: FontFile[] = [...(Array.isArray(existing.files) ? existing.files : []), newFile];

  const { data: updated, error: updErr } = await supabase
    .from(TABLE)
    .update({ files: nextFiles, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (updErr) {
    // Roll back the storage upload so we don't orphan files
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json(fromRow(updated as FontRow));
}

// ── DELETE: remove one file by fileId (from `?fileId=...`) ──────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const fileId = req.nextUrl.searchParams.get("fileId");
  if (!fileId) return NextResponse.json({ error: "fileId required" }, { status: 400 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const { data: existing } = await supabase.from(TABLE).select("*").eq("id", id).single();
  if (!existing) return NextResponse.json({ error: "Font not found" }, { status: 404 });

  const files: FontFile[] = Array.isArray(existing.files) ? existing.files : [];
  const removing = files.find((f) => f.id === fileId);
  if (!removing) return NextResponse.json({ error: "File not found" }, { status: 404 });

  await supabase.storage.from(BUCKET).remove([removing.storagePath]);

  const nextFiles = files.filter((f) => f.id !== fileId);
  const { data: updated, error: updErr } = await supabase
    .from(TABLE)
    .update({ files: nextFiles, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
  return NextResponse.json(fromRow(updated as FontRow));
}
