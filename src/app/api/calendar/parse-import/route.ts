import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/calendar/parse-import
 * Accepts a text or PDF file upload and splits it into individual post captions.
 * Delimiter: "---" on its own line, or "###" on its own line, or triple newline.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    let text = "";

    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      // For PDFs, try to extract text. We'll use a simple approach —
      // read as text and strip binary. For real PDF parsing we'd need a lib,
      // but most users will use .txt
      const buf = await file.arrayBuffer();
      // Try to get readable text from PDF streams
      const raw = new TextDecoder("utf-8", { fatal: false }).decode(buf);
      // Extract text between BT/ET blocks (basic PDF text extraction)
      const textBlocks: string[] = [];
      const btPattern = /BT\s([\s\S]*?)ET/g;
      let match;
      while ((match = btPattern.exec(raw)) !== null) {
        const block = match[1];
        // Extract Tj and TJ strings
        const tjPattern = /\(([^)]*)\)\s*Tj/g;
        let tm;
        while ((tm = tjPattern.exec(block)) !== null) {
          textBlocks.push(tm[1]);
        }
        // TJ arrays
        const tjArrayPattern = /\[([^\]]*)\]\s*TJ/g;
        while ((tm = tjArrayPattern.exec(block)) !== null) {
          const items = tm[1].match(/\(([^)]*)\)/g);
          if (items) {
            textBlocks.push(items.map(s => s.replace(/[()]/g, "")).join(""));
          }
        }
      }
      text = textBlocks.join("\n");
      // If PDF extraction failed, tell user to use .txt
      if (!text.trim()) {
        return NextResponse.json({
          error: "Could not extract text from PDF. Please export as .txt instead.",
        }, { status: 400 });
      }
    } else {
      text = await file.text();
    }

    // Split into posts by delimiter
    let posts: string[];

    if (text.includes("\n---\n") || text.includes("\r\n---\r\n")) {
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
