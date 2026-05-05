/* ── Case Studies — Figma sync ──
 *
 * REQUIRES: env FIGMA_ACCESS_TOKEN, Supabase storage bucket `case-studies`,
 * Supabase table `case_studies` (existing case study row).
 *
 * POST { slug, desktopFrameUrl, mobileFrameUrl? }
 *
 * Pulls frames from Figma, slices into AVIF chunks via sharp, uploads to
 * Storage at `${slug}/design-desktop-N.avif` / `design-mobile-N.avif`,
 * updates the case study's designs.desktopSlices / mobileSlices, and saves.
 */

import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { supabase } from "@/lib/supabase";
import { getCaseStudy, saveCaseStudy } from "@/lib/case-studies/data";
import type { CaseStudyImage } from "@/lib/case-studies/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const BUCKET = "case-studies";
const MAX_SLICE_HEIGHT = 1500;
const AVIF_QUALITY = 60;

function parseFigmaKey(url: string): string | null {
  const m = url.match(/figma\.com\/(?:file|design)\/([A-Za-z0-9]+)/);
  return m?.[1] ?? null;
}

function parseFigmaNodeId(url: string): string | null {
  const m = url.match(/[?&]node-id=([^&]+)/);
  if (!m) return null;
  return decodeURIComponent(m[1]).replace(/-/g, ":");
}

async function figmaFetch(path: string, token: string) {
  const res = await fetch(`https://api.figma.com/v1${path}`, {
    headers: { "X-Figma-Token": token },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Figma API ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function fetchFigmaFrameImage(
  fileKey: string,
  nodeId: string,
  token: string,
): Promise<Buffer> {
  const data = await figmaFetch(
    `/images/${fileKey}?ids=${encodeURIComponent(nodeId)}&scale=2&format=png`,
    token,
  );
  const imageUrl = data.images?.[nodeId];
  if (!imageUrl) throw new Error(`Figma returned no image for node ${nodeId}`);
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`Failed to download Figma image: ${imgRes.status}`);
  return Buffer.from(await imgRes.arrayBuffer());
}

/* Remove existing design-{variant}-*.avif files before re-uploading so a
 * shorter resync doesn't leave orphans behind. */
async function clearExistingSlices(slug: string, variant: "desktop" | "mobile") {
  const { data: list } = await supabase.storage.from(BUCKET).list(slug);
  if (!list) return;
  const prefix = `design-${variant}-`;
  const paths = list
    .filter((obj) => obj.name.startsWith(prefix))
    .map((obj) => `${slug}/${obj.name}`);
  if (paths.length > 0) {
    await supabase.storage.from(BUCKET).remove(paths);
  }
}

async function sliceAndUpload(
  pngBuffer: Buffer<ArrayBufferLike>,
  slug: string,
  variant: "desktop" | "mobile",
): Promise<CaseStudyImage[]> {
  const meta = await sharp(pngBuffer).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) throw new Error("Could not read image dimensions");

  await clearExistingSlices(slug, variant);

  const sliceCount = Math.ceil(height / MAX_SLICE_HEIGHT);
  const slices: CaseStudyImage[] = [];

  for (let i = 0; i < sliceCount; i++) {
    const top = i * MAX_SLICE_HEIGHT;
    const sliceHeight = Math.min(MAX_SLICE_HEIGHT, height - top);

    const sliceBuffer = await sharp(pngBuffer)
      .extract({ left: 0, top, width, height: sliceHeight })
      .avif({ quality: AVIF_QUALITY, effort: 4 })
      .toBuffer();

    const path = `${slug}/design-${variant}-${i}.avif`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, sliceBuffer, {
      contentType: "image/avif",
      upsert: true,
    });
    if (error) throw new Error(`Supabase upload failed: ${error.message}`);

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

    slices.push({
      url: urlData.publicUrl,
      filename: path,
      width,
      height: sliceHeight,
    });
  }

  return slices;
}

export async function POST(req: NextRequest) {
  try {
    const token = process.env.FIGMA_ACCESS_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: "FIGMA_ACCESS_TOKEN env var not set" },
        { status: 500 },
      );
    }

    const body = await req.json();
    const {
      slug,
      desktopFrameUrl,
      mobileFrameUrl,
    }: {
      slug: string;
      desktopFrameUrl: string;
      mobileFrameUrl?: string;
    } = body;

    if (!slug || !desktopFrameUrl) {
      return NextResponse.json(
        { error: "Missing required fields: slug, desktopFrameUrl" },
        { status: 400 },
      );
    }

    const study = await getCaseStudy(slug);
    if (!study) {
      return NextResponse.json({ error: "Case study not found" }, { status: 404 });
    }

    const fileKey = parseFigmaKey(desktopFrameUrl);
    const desktopNodeId = parseFigmaNodeId(desktopFrameUrl);
    if (!fileKey || !desktopNodeId) {
      return NextResponse.json(
        { error: "Invalid desktop frame URL — must include file key and node-id" },
        { status: 400 },
      );
    }

    let mobileNodeId: string | null = null;
    if (mobileFrameUrl) {
      mobileNodeId = parseFigmaNodeId(mobileFrameUrl);
      if (!mobileNodeId) {
        return NextResponse.json(
          { error: "Invalid mobile frame URL — must include node-id" },
          { status: 400 },
        );
      }
    }

    const desktopPng = await fetchFigmaFrameImage(fileKey, desktopNodeId, token);
    const desktopSlices = await sliceAndUpload(desktopPng, slug, "desktop");

    let mobileSlices: CaseStudyImage[] = study.designs.mobileSlices;
    if (mobileNodeId) {
      const mobilePng = await fetchFigmaFrameImage(fileKey, mobileNodeId, token);
      mobileSlices = await sliceAndUpload(mobilePng, slug, "mobile");
    }

    const updated = {
      ...study,
      designs: {
        ...study.designs,
        desktopSlices,
        mobileSlices,
      },
    };
    await saveCaseStudy(updated);

    return NextResponse.json({
      study: updated,
      desktopCount: desktopSlices.length,
      mobileCount: mobileSlices.length,
    });
  } catch (err) {
    console.error("[case-studies/figma-sync] error:", err);
    const msg = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
