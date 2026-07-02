/* ── Attachment proxy ──
 *
 * GET /api/sales/attachment?channel=whatsapp&messageId=...&attachmentId=...
 *
 * Streams a WhatsApp media attachment through our server. We can't
 * use Unipile's raw attachment URLs directly as <img src=...> because
 * those URLs (e.g. mmg.whatsapp.net/...) require auth headers and
 * also expire quickly. So the UI hits this proxy, which calls
 * Unipile's authed download endpoint and pipes the bytes back.
 *
 * Cache for 1 hour to avoid re-fetching the same image on every
 * render. WhatsApp media URLs themselves expire so we shouldn't
 * cache forever, but an hour keeps scrolling smooth.
 */

import { NextResponse } from "next/server";
import {
  isBeeperLive,
  fetchBeeperAsset,
} from "@/lib/sales-dashboard/beeper-adapter";

type Channel = "whatsapp" | "linkedin" | "email";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const channel = url.searchParams.get("channel") as Channel | null;
  const messageId = url.searchParams.get("messageId");
  const attachmentId = url.searchParams.get("attachmentId");
  /* Beeper attachments are addressed by srcURL (mxc:// or
   * localmxc://) instead of message+attachment IDs. */
  const beeperSrc = url.searchParams.get("src");

  /* Beeper path - serve via /v1/assets/serve. */
  if (isBeeperLive() && beeperSrc) {
    const asset = await fetchBeeperAsset(beeperSrc);
    if (!asset.ok || !asset.bytes) {
      return NextResponse.json(
        { error: asset.error ?? "Beeper asset fetch failed" },
        { status: 502 },
      );
    }
    return new NextResponse(asset.bytes, {
      status: 200,
      headers: {
        "Content-Type": asset.contentType ?? "application/octet-stream",
        "Cache-Control": "public, max-age=3600, immutable",
      },
    });
  }

  if (!channel || !messageId || !attachmentId) {
    return NextResponse.json(
      { error: "Required: ?channel=...&messageId=...&attachmentId=... OR ?src=... for Beeper" },
      { status: 400 },
    );
  }

  const apiKey = process.env.UNIPILE_API_KEY;
  const dsn = process.env.UNIPILE_DSN?.replace(/\/+$/, "");
  if (!apiKey || !dsn) {
    return NextResponse.json(
      { error: "Unipile not configured" },
      { status: 500 },
    );
  }

  /* Unipile's documented attachment URL pattern. If the actual path
   * differs we'll see it in the 404 response - quick fix to align. */
  const unipileUrl = `${dsn}/api/v1/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`;

  try {
    const res = await fetch(unipileUrl, {
      method: "GET",
      headers: { "X-API-KEY": apiKey },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        {
          error: `attachment fetch failed: ${res.status}`,
          detail: text.slice(0, 200),
        },
        { status: 502 },
      );
    }
    const buf = await res.arrayBuffer();
    const contentType =
      res.headers.get("content-type") ?? "application/octet-stream";
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, immutable",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}
