import { NextRequest, NextResponse } from "next/server";
import { extractText } from "unpdf";

/**
 * POST /api/calendar/parse-import
 * Accepts a text or PDF file upload and splits it into individual post captions.
 * Preferred: [POST] label on its own line before each caption.
 * Also supports: "---" or "###" on its own line, or triple newline.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    let text = "";

    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      const buf = await file.arrayBuffer();
      try {
        const result = await extractText(new Uint8Array(buf), { mergePages: true });
        text = String(result.text ?? "");
      } catch (e) {
        console.error("PDF extraction error:", e);
        return NextResponse.json({
          error: "Could not extract text from PDF. Try exporting as .txt instead.",
        }, { status: 400 });
      }
      if (!text.trim()) {
        return NextResponse.json({
          error: "PDF appears to be empty or image-only. Export as .txt instead.",
        }, { status: 400 });
      }
    } else {
      text = await file.text();
    }

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
      // Triple newline separator
      posts = text.split(/\n\n\n+/);
    } else {
      // Fallback: double newline (treat each paragraph as a post)
      posts = text.split(/\n\n+/);
    }

    // Clean up
    const cleaned = posts
      .map(p => p.trim())
      .filter(p => p.length > 10); // skip tiny fragments

    return NextResponse.json({ posts: cleaned, count: cleaned.length });
  } catch (err) {
    console.error("Parse import error:", err);
    return NextResponse.json({ error: "Failed to parse file" }, { status: 500 });
  }
}
