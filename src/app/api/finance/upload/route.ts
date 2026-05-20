/* ── Finance bucket upload ──
 * Posts a file to the PRIVATE finance-documents bucket and returns a
 * signed URL + storage path. Signed URLs expire after 1 hour; the
 * caller stores the path and re-signs on demand via /api/finance/sign.
 *
 * Auth: requires the launchpad-finance cookie set by FinanceGate.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireFinanceAuth } from "@/lib/finance/server-auth";
import { financeServerClient, FinanceConfigError } from "@/lib/finance/server-supabase";

const BUCKET = "finance-documents";
const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export async function POST(req: NextRequest) {
  const unauth = requireFinanceAuth(req);
  if (unauth) return unauth;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = String(formData.get("folder") || "misc")
      .replace(/[^a-z0-9_-]/gi, "")
      .toLowerCase() || "misc";

    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `File too large — ${MAX_BYTES / 1024 / 1024}MB max.` },
        { status: 400 },
      );
    }
    if (file.type && !ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "File type not allowed." }, { status: 400 });
    }

    const ext = (file.name.split(".").pop() || "bin")
      .replace(/[^a-z0-9]/gi, "")
      .toLowerCase() || "bin";
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const sb = financeServerClient();
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await sb.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: signed, error: signError } = await sb.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 60);

    if (signError) {
      return NextResponse.json({ error: signError.message }, { status: 500 });
    }

    return NextResponse.json({
      url: signed.signedUrl,
      path,
      filename: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (err) {
    if (err instanceof FinanceConfigError) {
      return NextResponse.json(
        { error: err.message, code: "FINANCE_NOT_CONFIGURED" },
        { status: 503 },
      );
    }
    const msg = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
