import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/calendar/parse-import
 * Accepts a text file upload and splits it into individual post captions.
 * Preferred: [POST] label on its own line before each caption.
 * Also supports: "---" or "###" on its own line, or triple newline.
 *
 * PDF parsing is handled client-side via pdfjs-dist CDN.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const text = await file.text();

    // Split into posts by delimiter — check formats in priority order
    let posts: string[];

    // Preferred: [POST] label on its own line (case-insensitive, optional number like [POST 1])
    if (/^\[POST\s*\d*\]/im.test(text)) {
      posts = text.split(/\r?\n?\[POST\s*\d*\]\r?\n?/i).filter(Boolean);
    } else if (text.includes("\n---\n") || text.includes("\r\n---\r\n")) {
      posts = text.split(/\r?\n---\r?\n/);
    } else if (text.includes("\n###\n") || text.includes("\r\n###\r\n")) {
      posts = text.split(/\r?\n###\r?\n/);
    } else if (text.includes("\n\n\n")) {
      posts = text.split(/\n\n\n+/);
    } else {
      posts = text.split(/\n\n+/);
    }

    const cleaned = posts
      .map(p => p.trim())
      .filter(p => p.length > 10);

    return NextResponse.json({ posts: cleaned, count: cleaned.length });
  } catch (err) {
    console.error("Parse import error:", err);
    return NextResponse.json({ error: "Failed to parse file" }, { status: 500 });
  }
}
