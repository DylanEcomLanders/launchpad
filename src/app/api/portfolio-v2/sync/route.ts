/* ── Portfolio v2 Sync API ──
 *
 * REQUIRES:
 *  - env: FIGMA_API_TOKEN
 *  - Supabase storage bucket `portfolio-v2` (public). Create it manually in Supabase
 *    dashboard with an all-access policy (same as `audit-portfolio`).
 *  - Supabase table `portfolio_v2` (see src/lib/portfolio-v2/data.ts for schema)
 *
 * POST body:
 *  { figmaUrl, name, slug, client?, tags?, notes?, results?,
 *    desktopFrameName, mobileFrameName? }
 *
 * Pulls frames from Figma, slices them with sharp into AVIF segments,
 * uploads to Supabase Storage, and saves metadata via saveProject().
 */

import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { supabase } from "@/lib/supabase";
import { saveProject } from "@/lib/portfolio-v2/data";
import type { PortfolioProject, PortfolioSlice } from "@/lib/portfolio-v2/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const BUCKET = "portfolio-v2";
const MAX_SLICE_HEIGHT = 1500;
const AVIF_QUALITY = 60;

type FigmaNode = {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
};

function parseFigmaKey(url: string): string | null {
  const m = url.match(/figma\.com\/(?:file|design)\/([A-Za-z0-9]+)/);
  return m?.[1] ?? null;
}

function findFrameByName(node: FigmaNode, name: string): FigmaNode | null {
  if (!node) return null;
  if (
    node.name?.trim().toLowerCase() === name.trim().toLowerCase() &&
    (node.type === "FRAME" || node.type === "COMPONENT" || node.type === "GROUP" || node.type === "SECTION")
  ) {
    return node;
  }
  if (node.children) {
    for (const child of node.children) {
      const found = findFrameByName(child, name);
      if (found) return found;
    }
  }
  return null;
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

async function sliceAndUpload(
  pngBuffer: Buffer,
  slug: string,
  variant: "desktop" | "mobile"
): Promise<PortfolioSlice[]> {
  const image = sharp(pngBuffer);
  const meta = await image.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) throw new Error("Could not read image dimensions");

  const sliceCount = Math.ceil(height / MAX_SLICE_HEIGHT);
  const slices: PortfolioSlice[] = [];

  for (let i = 0; i < sliceCount; i++) {
    const top = i * MAX_SLICE_HEIGHT;
    const sliceHeight = Math.min(MAX_SLICE_HEIGHT, height - top);

    const sliceBuffer = await sharp(pngBuffer)
      .extract({ left: 0, top, width, height: sliceHeight })
      .avif({ quality: AVIF_QUALITY, effort: 4 })
      .toBuffer();

    const blurBuffer = await sharp(pngBuffer)
      .extract({ left: 0, top, width, height: sliceHeight })
      .resize({ width: 20 })
      .webp({ quality: 30 })
      .toBuffer();
    const blur = `data:image/webp;base64,${blurBuffer.toString("base64")}`;

    const path = `${slug}/${variant}-${i}.avif`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, sliceBuffer, {
      contentType: "image/avif",
      upsert: true,
    });
    if (error) throw new Error(`Supabase upload failed: ${error.message}`);

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

    slices.push({
      url: urlData.publicUrl,
      width,
      height: sliceHeight,
      blur,
    });
  }

  return slices;
}

async function fetchFigmaFrameImage(
  fileKey: string,
  nodeId: string,
  token: string
): Promise<Buffer> {
  const data = await figmaFetch(
    `/images/${fileKey}?ids=${encodeURIComponent(nodeId)}&scale=2&format=png`,
    token
  );
  const imageUrl = data.images?.[nodeId];
  if (!imageUrl) throw new Error(`Figma returned no image for node ${nodeId}`);
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`Failed to download Figma image: ${imgRes.status}`);
  return Buffer.from(await imgRes.arrayBuffer());
}

export async function POST(req: NextRequest) {
  try {
    const token = process.env.FIGMA_API_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: "FIGMA_API_TOKEN env var not set" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const {
      figmaUrl,
      name,
      slug,
      client,
      tags,
      notes,
      results,
      desktopFrameName,
      mobileFrameName,
    }: {
      figmaUrl: string;
      name: string;
      slug: string;
      client?: string;
      tags?: string[];
      notes?: string;
      results?: string;
      desktopFrameName: string;
      mobileFrameName?: string;
    } = body;

    if (!figmaUrl || !name || !slug || !desktopFrameName) {
      return NextResponse.json(
        { error: "Missing required fields: figmaUrl, name, slug, desktopFrameName" },
        { status: 400 }
      );
    }

    const fileKey = parseFigmaKey(figmaUrl);
    if (!fileKey) {
      return NextResponse.json(
        { error: "Invalid Figma URL — could not extract file key" },
        { status: 400 }
      );
    }

    // Fetch full file tree
    const file = await figmaFetch(`/files/${fileKey}`, token);
    const root: FigmaNode = file.document;

    const desktopNode = findFrameByName(root, desktopFrameName);
    if (!desktopNode) {
      return NextResponse.json(
        { error: `Desktop frame "${desktopFrameName}" not found in Figma file` },
        { status: 404 }
      );
    }

    const mobileNode = mobileFrameName ? findFrameByName(root, mobileFrameName) : null;
    if (mobileFrameName && !mobileNode) {
      return NextResponse.json(
        { error: `Mobile frame "${mobileFrameName}" not found in Figma file` },
        { status: 404 }
      );
    }

    // Fetch + slice desktop
    const desktopPng = await fetchFigmaFrameImage(fileKey, desktopNode.id, token);
    const desktopSlices = await sliceAndUpload(desktopPng, slug, "desktop");

    // Fetch + slice mobile (optional)
    let mobileSlices: PortfolioSlice[] = [];
    if (mobileNode) {
      const mobilePng = await fetchFigmaFrameImage(fileKey, mobileNode.id, token);
      mobileSlices = await sliceAndUpload(mobilePng, slug, "mobile");
    }

    const now = new Date().toISOString();
    const project: PortfolioProject = {
      id: slug,
      slug,
      name,
      client,
      tags: tags ?? [],
      figma_file_key: fileKey,
      figma_desktop_node_id: desktopNode.id,
      figma_mobile_node_id: mobileNode?.id,
      desktop_slices: desktopSlices,
      mobile_slices: mobileSlices,
      notes,
      results,
      created_at: now,
      updated_at: now,
    };

    await saveProject(project);

    return NextResponse.json({ project });
  } catch (err) {
    console.error("[portfolio-v2/sync] error:", err);
    const msg = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
