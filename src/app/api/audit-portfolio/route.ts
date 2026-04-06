/* ── Audit Portfolio Images API ──
 * Scans /public/audit-portfolio/ for images and returns their URLs.
 * Drop screenshots as 1.png, 2.png, etc. into that folder.
 */

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const dir = path.join(process.cwd(), "public", "audit-portfolio");

    if (!fs.existsSync(dir)) {
      return NextResponse.json({ images: [] });
    }

    const files = fs.readdirSync(dir)
      .filter((f) => /\.(png|jpg|jpeg|webp|avif)$/i.test(f))
      .sort((a, b) => {
        // Sort numerically if filenames are numbers, else alphabetically
        const numA = parseInt(a);
        const numB = parseInt(b);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
      })
      .map((f) => `/audit-portfolio/${f}`);

    return NextResponse.json({ images: files });
  } catch {
    return NextResponse.json({ images: [] });
  }
}
