import { NextRequest, NextResponse } from "next/server";

const FIGMA_TOKEN = process.env.FIGMA_ACCESS_TOKEN || "";

/**
 * Extract images from a Figma file for AI analysis.
 * POST { figmaUrl: string }
 * Returns { images: string[] } — array of PNG image URLs
 */
export async function POST(req: NextRequest) {
  try {
    const { figmaUrl } = await req.json();
    if (!figmaUrl || !FIGMA_TOKEN) {
      return NextResponse.json({ error: "Missing Figma URL or token" }, { status: 400 });
    }

    // Parse Figma URL to extract file key and node ID
    // Formats:
    //   https://www.figma.com/design/FILE_KEY/Name?node-id=NODE_ID
    //   https://www.figma.com/file/FILE_KEY/Name?node-id=NODE_ID
    const urlMatch = figmaUrl.match(/figma\.com\/(?:design|file)\/([a-zA-Z0-9]+)/);
    if (!urlMatch) {
      return NextResponse.json({ error: "Invalid Figma URL" }, { status: 400 });
    }
    const fileKey = urlMatch[1];

    // Extract node-id if present
    const nodeMatch = figmaUrl.match(/node-id=([^&]+)/);
    const nodeId = nodeMatch ? decodeURIComponent(nodeMatch[1]) : null;

    // Get file structure to find the right nodes
    const fileRes = await fetch(`https://api.figma.com/v1/files/${fileKey}${nodeId ? `?ids=${nodeId}` : "?depth=2"}`, {
      headers: { "X-Figma-Token": FIGMA_TOKEN },
    });

    if (!fileRes.ok) {
      const err = await fileRes.text();
      return NextResponse.json({ error: `Figma API error: ${err}` }, { status: fileRes.status });
    }

    const fileData = await fileRes.json();

    // Collect node IDs to render as images
    let nodeIds: string[] = [];

    if (nodeId) {
      // Specific node requested
      nodeIds = [nodeId];
    } else {
      // Get top-level frames from first page
      const firstPage = fileData.document?.children?.[0];
      if (firstPage?.children) {
        // Get top-level frames (max 5 to avoid huge requests)
        nodeIds = firstPage.children
          .filter((n: { type: string }) => n.type === "FRAME" || n.type === "COMPONENT" || n.type === "SECTION")
          .slice(0, 5)
          .map((n: { id: string }) => n.id);
      }
    }

    if (nodeIds.length === 0) {
      return NextResponse.json({ error: "No frames found in Figma file" }, { status: 400 });
    }

    // Get rendered images
    const idsParam = nodeIds.join(",");
    const imgRes = await fetch(
      `https://api.figma.com/v1/images/${fileKey}?ids=${idsParam}&format=png&scale=2`,
      { headers: { "X-Figma-Token": FIGMA_TOKEN } }
    );

    if (!imgRes.ok) {
      return NextResponse.json({ error: "Failed to render Figma images" }, { status: 500 });
    }

    const imgData = await imgRes.json();
    const images = Object.values(imgData.images || {}).filter(Boolean) as string[];

    // Also extract text content from the file for additional context
    const textContent = extractTextFromNodes(nodeId ? findNode(fileData.document, nodeId) : fileData.document?.children?.[0]);

    return NextResponse.json({ images, textContent, fileName: fileData.name });
  } catch (err) {
    console.error("Figma extraction error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/** Recursively extract all text from Figma nodes */
function extractTextFromNodes(node: any): string[] {
  if (!node) return [];
  const texts: string[] = [];

  if (node.type === "TEXT" && node.characters) {
    texts.push(node.characters);
  }

  if (node.children) {
    for (const child of node.children) {
      texts.push(...extractTextFromNodes(child));
    }
  }

  return texts;
}

/** Find a node by ID in the Figma document tree */
function findNode(node: any, targetId: string): any {
  if (!node) return null;
  if (node.id === targetId) return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findNode(child, targetId);
      if (found) return found;
    }
  }
  return null;
}
