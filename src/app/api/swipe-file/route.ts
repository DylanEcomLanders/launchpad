import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { fromRow, hostnameFromUrl, type SwipeRow } from "@/lib/swipe-file";

const TABLE = "swipe_file";
const BUCKET = "swipe-file";
const FIRECRAWL_KEY = process.env.FIRECRAWL_API_KEY || "";
const FIRECRAWL_URL = "https://api.firecrawl.dev/v1/scrape";

// ── GET: list all swipe entries ──────────────────────────────────────────────
export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json([]);
  try {
    const { data } = await supabase
      .from(TABLE)
      .select("*")
      .order("created_at", { ascending: false });
    return NextResponse.json((data || []).map((r: SwipeRow) => fromRow(r)));
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}

// ── POST: capture screenshots for a URL and create a new entry ──────────────
// Calls Firecrawl twice (desktop + mobile), uploads both screenshots to
// Supabase Storage, then inserts a row.
export async function POST(req: NextRequest) {
  const { url, title, tags, notes } = await req.json();

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url required" }, { status: 400 });
  }
  if (!FIRECRAWL_KEY) {
    return NextResponse.json({ error: "FIRECRAWL_API_KEY not configured" }, { status: 500 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  // Capture both viewports in parallel
  let desktopBase64 = "";
  let mobileBase64 = "";
  try {
    const callFirecrawl = async (mobile: boolean) => {
      const res = await fetch(FIRECRAWL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${FIRECRAWL_KEY}` },
        body: JSON.stringify({
          url,
          mobile,
          actions: [{ type: "screenshot", fullPage: true }],
          timeout: 30_000,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || `Firecrawl ${mobile ? "mobile" : "desktop"} capture failed`);
      // Screenshot lives in either data.screenshot or data.actions[0].screenshot
      const action = Array.isArray(json.data?.actions?.screenshots)
        ? json.data.actions.screenshots[0]
        : Array.isArray(json.data?.actions) && json.data.actions[0]
        ? json.data.actions[0].screenshot || json.data.actions[0]
        : null;
      return json.data?.screenshot || action || "";
    };

    [desktopBase64, mobileBase64] = await Promise.all([callFirecrawl(false), callFirecrawl(true)]);
  } catch (err: any) {
    return NextResponse.json({ error: `Capture failed: ${err?.message}` }, { status: 502 });
  }

  if (!desktopBase64 || !mobileBase64) {
    return NextResponse.json({ error: "Capture returned empty screenshots" }, { status: 502 });
  }

  // Firecrawl returns either a base64 string or a URL — handle both. If it's a
  // URL we fetch the bytes; otherwise we decode the base64 directly.
  const toBuffer = async (raw: string): Promise<Buffer> => {
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      const r = await fetch(raw);
      const arr = await r.arrayBuffer();
      return Buffer.from(arr);
    }
    // Strip data URI prefix if present
    const b64 = raw.replace(/^data:image\/\w+;base64,/, "");
    return Buffer.from(b64, "base64");
  };

  const id = crypto.randomUUID();
  const desktopBuf = await toBuffer(desktopBase64);
  const mobileBuf = await toBuffer(mobileBase64);

  // Upload to Supabase Storage in parallel
  const desktopPath = `${id}/desktop.png`;
  const mobilePath = `${id}/mobile.png`;
  try {
    const [{ error: dErr }, { error: mErr }] = await Promise.all([
      supabase.storage.from(BUCKET).upload(desktopPath, desktopBuf, { contentType: "image/png", upsert: true }),
      supabase.storage.from(BUCKET).upload(mobilePath, mobileBuf, { contentType: "image/png", upsert: true }),
    ]);
    if (dErr) throw new Error(`Desktop upload: ${dErr.message}`);
    if (mErr) throw new Error(`Mobile upload: ${mErr.message}`);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }

  const desktopPublic = supabase.storage.from(BUCKET).getPublicUrl(desktopPath).data.publicUrl;
  const mobilePublic = supabase.storage.from(BUCKET).getPublicUrl(mobilePath).data.publicUrl;

  // Insert row
  try {
    const row = {
      id,
      url,
      title: (title || "").trim() || hostnameFromUrl(url),
      tags: Array.isArray(tags) ? tags.filter(Boolean).map(String) : [],
      notes: (notes || "").toString(),
      desktop_url: desktopPublic,
      mobile_url: mobilePublic,
    };
    const { data, error } = await supabase.from(TABLE).insert(row).select().single();
    if (error) throw error;
    return NextResponse.json(fromRow(data as SwipeRow));
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
