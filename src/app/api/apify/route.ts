import { NextRequest, NextResponse } from "next/server";

const APIFY_TOKEN = process.env.APIFY_API_TOKEN || "";
const APIFY_BASE = "https://api.apify.com/v2";

/** Run an Apify actor and wait for results */
async function runActor(actorId: string, input: Record<string, unknown>, timeoutSecs = 120): Promise<unknown[]> {
  const res = await fetch(`${APIFY_BASE}/acts/${actorId}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=${timeoutSecs}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Apify error ${res.status}: ${err.slice(0, 200)}`);
  }
  return res.json();
}

/**
 * POST /api/apify
 * { action: "instagram-profile" | "instagram-posts" | "tiktok-profile" | "tiktok-posts" | "shopify-store" | "shopify-find", params: {...} }
 */
export async function POST(req: NextRequest) {
  try {
    const { action, params } = await req.json();

    if (!APIFY_TOKEN) {
      return NextResponse.json({ error: "Apify API token not configured" }, { status: 500 });
    }

    let results: unknown[];

    switch (action) {
      case "instagram-profile": {
        // Scrape Instagram profile(s)
        const usernames = Array.isArray(params.usernames) ? params.usernames : [params.usernames];
        results = await runActor("apify~instagram-profile-scraper", {
          usernames,
        });
        break;
      }

      case "instagram-posts": {
        // Scrape recent posts from profile
        const urls = Array.isArray(params.urls) ? params.urls : [`https://www.instagram.com/${params.username}/`];
        results = await runActor("apify~instagram-scraper", {
          directUrls: urls,
          resultsLimit: params.limit || 20,
          resultsType: "posts",
        });
        break;
      }

      case "tiktok-profile": {
        // Scrape TikTok profile(s)
        const profiles = Array.isArray(params.profiles) ? params.profiles : [params.profiles];
        results = await runActor("clockworks~tiktok-profile-scraper", {
          profiles: profiles.map((p: string) => p.startsWith("http") ? p : `https://www.tiktok.com/@${p}`),
        });
        break;
      }

      case "tiktok-posts": {
        // Scrape TikTok posts
        const profiles = Array.isArray(params.profiles) ? params.profiles : [params.profiles];
        results = await runActor("clockworks~tiktok-scraper", {
          profiles: profiles.map((p: string) => p.startsWith("http") ? p : `https://www.tiktok.com/@${p}`),
          resultsPerPage: params.limit || 20,
          shouldDownloadVideos: false,
          shouldDownloadCovers: false,
        });
        break;
      }

      case "shopify-store": {
        // Scrape info about a Shopify store
        const urls = Array.isArray(params.urls) ? params.urls : [params.urls];
        results = await runActor("pintostudio~shopify-store-info", {
          urls,
        });
        break;
      }

      case "shopify-find": {
        // Find Shopify stores by keyword/niche
        results = await runActor("igolaizola~shopify-store-finder", {
          keywords: params.keywords || params.query,
          maxResults: params.limit || 20,
        }, 180);
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({ results, count: Array.isArray(results) ? results.length : 0 });
  } catch (err: any) {
    console.error("Apify route error:", err);
    return NextResponse.json({ error: err?.message || "Apify request failed" }, { status: 500 });
  }
}
