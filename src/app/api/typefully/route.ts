/* ── Typefully API proxy ── */

// Increase body size limit for image uploads (base64 can be large)
export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import {
  listSocialSets,
  createDraft,
  createMultiPlatformDraft,
  scheduleBatch,
  listDrafts,
  uploadMedia,
  getMediaStatus,
  type SchedulePostInput,
  type MultiPlatformPostInput,
} from "@/lib/typefully";

/** GET — list social sets or drafts */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const action = searchParams.get("action") || "social-sets";

    if (action === "social-sets") {
      const sets = await listSocialSets();
      return NextResponse.json({ sets });
    }

    if (action === "drafts") {
      const socialSetId = Number(searchParams.get("social_set_id"));
      const status = searchParams.get("status") as "draft" | "scheduled" | "published" | "error" | undefined;
      if (!socialSetId) return NextResponse.json({ error: "social_set_id required" }, { status: 400 });
      const drafts = await listDrafts(socialSetId, status || undefined);
      return NextResponse.json({ drafts });
    }

    if (action === "media-status") {
      const socialSetId = Number(searchParams.get("social_set_id"));
      const mediaId = searchParams.get("media_id");
      if (!socialSetId || !mediaId) return NextResponse.json({ error: "social_set_id and media_id required" }, { status: 400 });
      const result = await getMediaStatus(socialSetId, mediaId);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** POST — create single draft or schedule batch */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, social_set_id } = body;

    if (!social_set_id) {
      return NextResponse.json({ error: "social_set_id required" }, { status: 400 });
    }

    // Single draft
    if (action === "create") {
      const { text, platform, publish_at, media_ids, auto_plug_enabled, auto_retweet_enabled } = body;
      if (!text || !platform || !publish_at) {
        return NextResponse.json({ error: "text, platform, publish_at required" }, { status: 400 });
      }
      const draft = await createDraft(social_set_id, {
        text,
        platform,
        publish_at,
        media_ids,
        auto_plug_enabled,
        auto_retweet_enabled,
      });
      return NextResponse.json({ draft });
    }

    // Batch schedule (the main "Schedule Week" action)
    if (action === "schedule-batch") {
      const posts: SchedulePostInput[] = body.posts;
      if (!posts || !Array.isArray(posts) || posts.length === 0) {
        return NextResponse.json({ error: "posts array required" }, { status: 400 });
      }
      const result = await scheduleBatch(social_set_id, posts);
      return NextResponse.json(result);
    }

    // Multi-platform draft (one draft, multiple platforms with different captions)
    if (action === "create-multi") {
      const { platforms: platformInputs, publish_at } = body;
      if (!platformInputs || !Array.isArray(platformInputs) || platformInputs.length === 0 || !publish_at) {
        return NextResponse.json({ error: "platforms array and publish_at required" }, { status: 400 });
      }
      const draft = await createMultiPlatformDraft(social_set_id, { platforms: platformInputs, publish_at });
      return NextResponse.json({ draft });
    }

    // Upload media: base64 → server-side S3 upload (avoids CORS issues)
    if (action === "upload-media") {
      const { base64_data } = body;
      if (!base64_data) {
        return NextResponse.json({ error: "base64_data required" }, { status: 400 });
      }

      const match = base64_data.match(/^data:(image\/[a-zA-Z+\-.]+);base64,(.+)$/);
      if (!match) {
        console.error("[Typefully] Invalid base64 format:", base64_data.slice(0, 60));
        return NextResponse.json({ error: "Invalid base64 image data" }, { status: 400 });
      }

      const contentType = match[1];
      const raw = match[2];
      const buffer = Buffer.from(raw, "base64");
      const ext = contentType.split("/")[1]?.replace("+xml", "") || "png";
      const filename = `launchpad_${Date.now()}.${ext}`;

      console.log(`[Typefully] Server uploading ${filename} (${buffer.length} bytes)`);
      const media_id = await uploadMedia(social_set_id, filename, new Uint8Array(buffer));
      console.log(`[Typefully] Upload success: ${media_id}`);
      return NextResponse.json({ media_id });
    }

    return NextResponse.json({ error: "Unknown action — use 'create', 'schedule-batch', or 'upload-media'" }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
