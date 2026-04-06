/* ── Audit Portfolio Images API ──
 * GET: Returns ordered list of portfolio image URLs from Supabase Storage.
 *      Falls back to filesystem scan if Supabase is not configured.
 * POST: Saves the display order of images.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import fs from "fs";
import path from "path";

const BUCKET = "audit-portfolio";
const ORDER_TABLE = "kv_store";
const ORDER_KEY = "audit-portfolio-order";

export async function GET() {
  try {
    if (isSupabaseConfigured()) {
      // Try to get saved order
      let order: string[] | null = null;
      try {
        const { data } = await supabase
          .from(ORDER_TABLE)
          .select("data")
          .eq("id", ORDER_KEY)
          .single();
        if (data?.data) {
          order = data.data as string[];
        }
      } catch {
        // No saved order, that's fine
      }

      // List all files in bucket
      const { data: files, error } = await supabase.storage
        .from(BUCKET)
        .list("", { limit: 200, sortBy: { column: "created_at", order: "asc" } });

      if (error) throw error;

      if (files && files.length > 0) {
        const imageFiles = files.filter((f) =>
          /\.(png|jpg|jpeg|webp|avif)$/i.test(f.name)
        );

        // Build URL map
        const urls: Record<string, string> = {};
        for (const f of imageFiles) {
          const { data: urlData } = supabase.storage
            .from(BUCKET)
            .getPublicUrl(f.name);
          urls[f.name] = urlData.publicUrl;
        }

        // If we have a saved order, use it (filtering out any deleted files)
        let orderedUrls: string[];
        if (order && order.length > 0) {
          const orderedFilenames = order.filter((name) => urls[name]);
          // Add any new files not in the order
          const inOrder = new Set(orderedFilenames);
          const newFiles = imageFiles
            .map((f) => f.name)
            .filter((name) => !inOrder.has(name));
          orderedUrls = [...orderedFilenames, ...newFiles].map(
            (name) => urls[name]
          );
        } else {
          orderedUrls = imageFiles.map((f) => urls[f.name]);
        }

        return NextResponse.json({ images: orderedUrls });
      }
    }

    // Fallback: filesystem scan
    const dir = path.join(process.cwd(), "public", "audit-portfolio");
    if (!fs.existsSync(dir)) {
      return NextResponse.json({ images: [] });
    }

    const localFiles = fs
      .readdirSync(dir)
      .filter((f) => /\.(png|jpg|jpeg|webp|avif)$/i.test(f))
      .sort((a, b) => {
        const numA = parseInt(a);
        const numB = parseInt(b);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
      })
      .map((f) => `/audit-portfolio/${f}`);

    return NextResponse.json({ images: localFiles });
  } catch {
    return NextResponse.json({ images: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { order } = await req.json();

    if (!Array.isArray(order)) {
      return NextResponse.json(
        { error: "order must be an array of filenames" },
        { status: 400 }
      );
    }

    if (isSupabaseConfigured()) {
      const { error } = await supabase.from(ORDER_TABLE).upsert({
        id: ORDER_KEY,
        data: order,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error("Save order error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Save order error:", err);
    return NextResponse.json({ error: "Failed to save order" }, { status: 500 });
  }
}
