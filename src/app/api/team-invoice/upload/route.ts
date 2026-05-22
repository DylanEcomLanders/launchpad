/* ── Team invoice PDF upload ──
 * Posts a file to the PRIVATE finance-documents bucket under the
 * team-invoices/ folder. Returns a signed URL + storage path that the
 * /submit route writes onto the resulting Expense row.
 *
 * Auth: requires the launchpad-role cookie to be 'team' or 'admin'.
 * The finance bucket itself is service-role-only, so this route is the
 * only way a team-role caller can land a file there — by design.
 */

import { NextRequest, NextResponse } from "next/server";
import { financeServerClient, FinanceConfigError } from "@/lib/finance/server-supabase";

const BUCKET = "finance-documents";
const FOLDER = "team-invoices";
const MAX_BYTES = 25 * 1024 * 1024;
/* Tighter allow-list than /api/finance/upload because team submissions
 * should be invoice docs (PDF/image), not spreadsheets or CSVs. */
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

function requireTeamOrAdmin(req: NextRequest): NextResponse | null {
  const role = req.cookies.get("launchpad-role")?.value;
  if (role !== "team" && role !== "admin" && role !== "cro") {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  return null;
}

export async function POST(req: NextRequest) {
  const unauth = requireTeamOrAdmin(req);
  if (unauth) return unauth;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `File too large, ${MAX_BYTES / 1024 / 1024}MB max.` },
        { status: 400 },
      );
    }
    if (file.type && !ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "File type not allowed. PDF, PNG, JPG, or WebP only." },
        { status: 400 },
      );
    }

    const ext = (file.name.split(".").pop() || "bin")
      .replace(/[^a-z0-9]/gi, "")
      .toLowerCase() || "bin";
    const path = `${FOLDER}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const sb = financeServerClient();
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await sb.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    /* 24h signed URL — long enough that Dylan can click it from the
     * Slack ping without it expiring while he's on the toilet, short
     * enough that we don't leak a permanent link. Re-signed on demand
     * by the finance dashboard via /api/finance/sign when he opens the
     * expense row directly. */
    const { data: signed, error: signError } = await sb.storage
      .from(BUCKET)
      .createSignedUrl(path, 24 * 60 * 60);

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
