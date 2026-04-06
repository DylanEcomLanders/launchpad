/* ── Typefully API proxy ── */

import { NextRequest, NextResponse } from "next/server";
import {
  listSocialSets,
  createDraft,
  scheduleBatch,
  listDrafts,
  uploadMediaFromUrl,
  type SchedulePostInput,
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
      const { text, platform, publish_at, media_ids } = body;
      if (!text || !platform || !publish_at) {
        return NextResponse.json({ error: "text, platform, publish_at required" }, { status: 400 });
      }
      const draft = await createDraft(social_set_id, { text, platform, publish_at, media_ids });
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

    // Upload media (base64 image → Typefully media_id)
    if (action === "upload-media") {
      const { base64_data } = body;
      if (!base64_data) {
        return NextResponse.json({ error: "base64_data required" }, { status: 400 });
      }

      // Parse data URL: "data:image/png;base64,..."
      const match = base64_data.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (!match) {
        return NextResponse.json({ error: "Invalid base64 image data" }, { status: 400 });
      }

      const contentType = match[1];
      const raw = match[2];
      const buffer = Uint8Array.from(atob(raw), c => c.charCodeAt(0));
      const ext = contentType.split("/")[1] || "png";
      const filename = `launchpad-${Date.now()}.${ext}`;

      const media_id = await uploadMediaFromUrl(social_set_id, filename, contentType, buffer);
      return NextResponse.json({ media_id });
    }

    return NextResponse.json({ error: "Unknown action — use 'create', 'schedule-batch', or 'upload-media'" }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
