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
    // Strategy: find sub-sections within frames to avoid rendering
    // one massive tall image that exceeds Claude's 8000px limit
    let nodeIds: string[] = [];

    if (nodeId) {
      // Specific node — try to get its children (sections) if it's a tall frame
      const targetNode = findNode(fileData.document, nodeId);
      if (targetNode?.children?.length > 1) {
        // Use child frames/sections instead of the parent
        const childFrames = targetNode.children
          .filter((n: any) => n.type === "FRAME" || n.type === "SECTION" || n.type === "GROUP" || n.type === "COMPONENT")
          .slice(0, 8);
        if (childFrames.length > 1) {
          nodeIds = childFrames.map((n: any) => n.id);
        } else {
          nodeIds = [nodeId];
        }
      } else {
        nodeIds = [nodeId];
      }
    } else {
      // Get top-level frames from first page
      const firstPage = fileData.document?.children?.[0];
      if (firstPage?.children) {
        const topFrames = firstPage.children
          .filter((n: any) => n.type === "FRAME" || n.type === "COMPONENT" || n.type === "SECTION");

        // If there's only 1-2 top-level frames, they're probably full page designs
        // In that case, get their children (sections) instead
        if (topFrames.length <= 2 && topFrames[0]?.children?.length > 1) {
          const sectionFrames = topFrames[0].children
            .filter((n: any) => n.type === "FRAME" || n.type === "SECTION" || n.type === "GROUP" || n.type === "COMPONENT")
            .slice(0, 8);
          if (sectionFrames.length > 1) {
            nodeIds = sectionFrames.map((n: any) => n.id);
          } else {
            nodeIds = topFrames.slice(0, 3).map((n: any) => n.id);
          }
        } else {
          nodeIds = topFrames.slice(0, 5).map((n: any) => n.id);
        }
      }
    }

    if (nodeIds.length === 0) {
      return NextResponse.json({ error: "No frames found in Figma file" }, { status: 400 });
    }

    // Render at 1x scale with section splitting to keep each image under 8000px
    const idsParam = nodeIds.join(",");
    const imgRes = await fetch(
      `https://api.figma.com/v1/images/${fileKey}?ids=${idsParam}&format=jpg&scale=1`,
      { headers: { "X-Figma-Token": FIGMA_TOKEN } }
    );

    if (!imgRes.ok) {
      return NextResponse.json({ error: "Failed to render Figma images" }, { status: 500 });
    }

    const imgData = await imgRes.json();
    const images = Object.values(imgData.images || {}).filter(Boolean) as string[];

    // Extract text content per section for labelled context
    const textContent: string[] = [];
    const rootNode = nodeId ? findNode(fileData.document, nodeId) : fileData.document?.children?.[0];

    if (rootNode) {
      // If we split into sub-sections, extract text per section
      if (nodeIds.length > 1) {
        for (const nid of nodeIds) {
          const sectionNode = findNode(rootNode, nid);
          if (sectionNode) {
            const sectionTexts = extractTextFromNodes(sectionNode);
            if (sectionTexts.length > 0) {
              const sectionName = sectionNode.name || "Section";
              textContent.push(`[${sectionName}]: ${sectionTexts.join(" | ")}`);
            }
          }
        }
      } else {
        textContent.push(...extractTextFromNodes(rootNode));
      }
    }

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
