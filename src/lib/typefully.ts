/* ── Typefully API v2 helper ── */

const BASE = "https://api.typefully.com/v2";

function headers() {
  const key = process.env.TYPEFULLY_API_KEY;
  if (!key) throw new Error("TYPEFULLY_API_KEY not set");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

// ── Types ──

export interface TypefullySocialSet {
  id: number;
  name: string;
  platforms: Record<string, unknown>;
}

export interface TypefullyDraft {
  id: string;
  status: string;
  publish_at?: string;
  platforms: Record<string, unknown>;
}

export interface SchedulePostInput {
  text: string;
  platform: "x" | "linkedin" | "instagram" | "threads";
  publish_at: string; // ISO 8601
  media_ids?: string[];
}

// ── Map our platform names to Typefully's ──

const PLATFORM_MAP: Record<string, string> = {
  x: "x",
  linkedin: "linkedin",
  instagram: "instagram",
  tiktok: "threads", // closest match — TikTok not natively supported
};

// ── API Methods ──

/** List social sets (accounts) connected to this Typefully workspace */
export async function listSocialSets(): Promise<TypefullySocialSet[]> {
  const res = await fetch(`${BASE}/social-sets?limit=50`, { headers: headers() });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Typefully listSocialSets failed (${res.status}): ${body}`);
  }
  const data = await res.json();
  return data.results || [];
}

/** Create a scheduled draft on Typefully */
export async function createDraft(
  socialSetId: number,
  post: SchedulePostInput
): Promise<TypefullyDraft> {
  const platform = PLATFORM_MAP[post.platform] || post.platform;

  const postObj: Record<string, unknown> = { text: post.text };
  if (post.media_ids && post.media_ids.length > 0) {
    postObj.media_ids = post.media_ids;
  }

  const body = {
    platforms: {
      [platform]: {
        enabled: true,
        posts: [postObj],
      },
    },
    publish_at: post.publish_at,
  };

  const res = await fetch(`${BASE}/social-sets/${socialSetId}/drafts`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Typefully createDraft failed (${res.status}): ${errBody}`);
  }

  return res.json();
}

/** Upload media from a URL — returns media_id for use in drafts */
export async function uploadMediaFromUrl(
  socialSetId: number,
  filename: string,
  contentType: string,
  fileBuffer: Uint8Array
): Promise<string> {
  // Step 1: Get presigned upload URL
  const initRes = await fetch(`${BASE}/social-sets/${socialSetId}/media/upload`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ filename, content_type: contentType }),
  });

  if (!initRes.ok) {
    const body = await initRes.text();
    throw new Error(`Typefully media upload init failed (${initRes.status}): ${body}`);
  }

  const { media_id, upload_url } = await initRes.json();

  // Step 2: PUT raw bytes to presigned S3 URL (no extra headers!)
  const uploadRes = await fetch(upload_url, {
    method: "PUT",
    body: fileBuffer as unknown as BodyInit,
  });

  if (!uploadRes.ok && uploadRes.status !== 204) {
    throw new Error(`S3 upload failed (${uploadRes.status})`);
  }

  return media_id;
}

/** Schedule a batch of posts — returns results for each */
export async function scheduleBatch(
  socialSetId: number,
  posts: SchedulePostInput[]
): Promise<{ success: TypefullyDraft[]; errors: { post: SchedulePostInput; error: string }[] }> {
  const success: TypefullyDraft[] = [];
  const errors: { post: SchedulePostInput; error: string }[] = [];

  // Sequential to respect rate limits
  for (const post of posts) {
    try {
      const draft = await createDraft(socialSetId, post);
      success.push(draft);
    } catch (err) {
      errors.push({ post, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return { success, errors };
}

/** List existing drafts (for checking status) */
export async function listDrafts(
  socialSetId: number,
  status?: "draft" | "scheduled" | "published" | "error"
): Promise<TypefullyDraft[]> {
  const params = new URLSearchParams({ limit: "50" });
  if (status) params.set("status", status);

  const res = await fetch(`${BASE}/social-sets/${socialSetId}/drafts?${params}`, {
    headers: headers(),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Typefully listDrafts failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  return data.results || [];
}
