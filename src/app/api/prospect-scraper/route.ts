import * as cheerio from "cheerio";

// ── Config ──────────────────────────────────────────────────────

const FETCH_TIMEOUT = 8000;
const CRAWL_DELAY = 500;

// ── Known Apps (reused from store-intel) ─────────────────────────

const KNOWN_APPS: Record<string, { name: string; type: string }> = {
  intelligems: { name: "Intelligems", type: "Price Testing" },
  rebuy: { name: "Rebuy", type: "Upsells" },
  reconvert: { name: "ReConvert", type: "Post-Purchase" },
  klaviyo: { name: "Klaviyo", type: "Email & SMS" },
  "judge.me": { name: "Judge.me", type: "Reviews" },
  judgeme: { name: "Judge.me", type: "Reviews" },
  loox: { name: "Loox", type: "Photo Reviews" },
  stamped: { name: "Stamped.io", type: "Reviews" },
  yotpo: { name: "Yotpo", type: "Reviews & Loyalty" },
  okendo: { name: "Okendo", type: "Reviews" },
  hotjar: { name: "Hotjar", type: "Heatmaps" },
  "lucky-orange": { name: "Lucky Orange", type: "Heatmaps" },
  luckyorange: { name: "Lucky Orange", type: "Heatmaps" },
  optimizely: { name: "Optimizely", type: "A/B Testing" },
  vwo: { name: "VWO", type: "A/B Testing" },
  bold: { name: "Bold Commerce", type: "Upsells / Bundles" },
  zipify: { name: "Zipify", type: "Landing Pages" },
  recharge: { name: "ReCharge", type: "Subscriptions" },
  skio: { name: "Skio", type: "Subscriptions" },
  afterpay: { name: "Afterpay", type: "BNPL" },
  klarna: { name: "Klarna", type: "BNPL" },
  attentive: { name: "Attentive", type: "SMS" },
  postscript: { name: "Postscript", type: "SMS" },
  gorgias: { name: "Gorgias", type: "Support" },
  privy: { name: "Privy", type: "Pop-ups" },
  justuno: { name: "Justuno", type: "Pop-ups" },
  smile: { name: "Smile.io", type: "Loyalty" },
  triplewhale: { name: "Triple Whale", type: "Analytics" },
  "triple-whale": { name: "Triple Whale", type: "Analytics" },
  elevar: { name: "Elevar", type: "Tracking" },
  shogun: { name: "Shogun", type: "Page Builder" },
  gempages: { name: "GemPages", type: "Page Builder" },
  pagefly: { name: "PageFly", type: "Page Builder" },
  vitals: { name: "Vitals", type: "All-in-One" },
};

const REVIEW_APPS = ["Judge.me", "Loox", "Stamped.io", "Yotpo", "Okendo"];
const SUBSCRIPTION_APPS = ["ReCharge", "Skio"];
const BNPL_APPS = ["Afterpay", "Klarna"];

// ── Types ───────────────────────────────────────────────────────

interface Prospect {
  url: string;
  brandName: string;
  isShopify: boolean;
  emails: string[];
  socialLinks: { platform: string; url: string }[];
  productCount: number;
  priceRange: { min: number; max: number } | null;
  apps: string[];
  hasReviews: boolean;
  hasSubscriptions: boolean;
  hasBNPL: boolean;
  revenueScore: number;
  crawlError?: string;
}

type StreamEvent =
  | { type: "searching"; keyword: string }
  | { type: "found"; total: number; urls: string[] }
  | { type: "enriching"; index: number; total: number; url: string }
  | { type: "prospect"; data: Prospect }
  | { type: "done"; total: number }
  | { type: "error"; message: string };

// ── Helpers ─────────────────────────────────────────────────────

function normalizeUrl(raw: string): string {
  let url = raw.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  return url;
}

function getBaseDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

async function fetchWithTimeout(
  url: string,
  opts: RequestInit = {},
  timeout = FETCH_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, {
      ...opts,
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        ...opts.headers,
      },
    });
  } finally {
    clearTimeout(id);
  }
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Email extraction ────────────────────────────────────────────

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const JUNK_EMAIL_PATTERNS = [
  /noreply/i,
  /no-reply/i,
  /donotreply/i,
  /example\.com/i,
  /sentry\./i,
  /wixpress/i,
  /shopify\.com/i,
  /myshopify\.com/i,
  /email\.com$/i,
  /test@/i,
  /placeholder/i,
  /@sentry/i,
  /@changelog/i,
  /klaviyo\.com/i,
  /judge\.me/i,
  /@.*cdn\./i,
];

function extractEmails(html: string): string[] {
  const matches = html.match(EMAIL_REGEX) || [];
  const unique = [...new Set(matches.map((e) => e.toLowerCase()))];
  return unique.filter(
    (email) => !JUNK_EMAIL_PATTERNS.some((p) => p.test(email))
  );
}

// ── Social link extraction ──────────────────────────────────────

const SOCIAL_PATTERNS: {
  platform: string;
  regex: RegExp;
}[] = [
  { platform: "Instagram", regex: /https?:\/\/(www\.)?instagram\.com\/[^"'\s)]+/gi },
  { platform: "LinkedIn", regex: /https?:\/\/(www\.)?linkedin\.com\/(company|in)\/[^"'\s)]+/gi },
  { platform: "Twitter", regex: /https?:\/\/(www\.)?(twitter|x)\.com\/[^"'\s)]+/gi },
  { platform: "Facebook", regex: /https?:\/\/(www\.)?facebook\.com\/[^"'\s)]+/gi },
  { platform: "TikTok", regex: /https?:\/\/(www\.)?tiktok\.com\/@[^"'\s)]+/gi },
];

function extractSocialLinks(html: string): { platform: string; url: string }[] {
  const links: { platform: string; url: string }[] = [];
  const seen = new Set<string>();

  for (const { platform, regex } of SOCIAL_PATTERNS) {
    const matches = html.match(regex) || [];
    for (const m of matches) {
      const clean = m.replace(/['")\]]+$/, "").trim();
      const key = `${platform}:${clean}`;
      if (!seen.has(key)) {
        seen.add(key);
        links.push({ platform, url: clean });
      }
    }
  }

  return links;
}

// ── Serper.dev Search ───────────────────────────────────────────

async function serperSearch(
  keyword: string,
  maxResults: number,
  apiKey: string
): Promise<string[]> {
  const urls: string[] = [];
  const seenDomains = new Set<string>();
  const pages = Math.ceil(maxResults / 10);

  for (let page = 0; page < pages; page++) {
    try {
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: `"powered by Shopify" ${keyword}`,
          num: 10,
          ...(page > 0 ? { page: page + 1 } : {}),
        }),
      });

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error("RATE_LIMITED");
        }
        const errBody = await res.text().catch(() => "");
        throw new Error(`Serper API error: ${res.status} ${errBody}`);
      }

      const data = await res.json();
      const organic = (data as Record<string, unknown[]>).organic || [];

      for (const item of organic as Array<Record<string, string>>) {
        const link = item.link;
        if (!link) continue;

        const domain = getBaseDomain(link);
        if (seenDomains.has(domain)) continue;
        seenDomains.add(domain);

        try {
          const u = new URL(link);
          urls.push(`${u.protocol}//${u.hostname}`);
        } catch {
          urls.push(link);
        }
      }

      if (urls.length >= maxResults) break;
    } catch (err) {
      if (err instanceof Error && err.message === "RATE_LIMITED") throw err;
      throw err;
    }

    if (page < pages - 1) await delay(200);
  }

  return urls.slice(0, maxResults);
}

// ── Enrich a single store ───────────────────────────────────────

async function enrichStore(storeUrl: string): Promise<Prospect> {
  const prospect: Prospect = {
    url: storeUrl,
    brandName: "",
    isShopify: false,
    emails: [],
    socialLinks: [],
    productCount: 0,
    priceRange: null,
    apps: [],
    hasReviews: false,
    hasSubscriptions: false,
    hasBNPL: false,
    revenueScore: 0,
  };

  try {
    // 1. Fetch homepage
    const homeRes = await fetchWithTimeout(storeUrl);
    if (!homeRes.ok) {
      prospect.crawlError = `HTTP ${homeRes.status}`;
      return prospect;
    }
    const homeHtml = await homeRes.text();

    // 2. Check if Shopify
    if (
      !homeHtml.includes("cdn.shopify.com") &&
      !homeHtml.includes("Shopify.theme") &&
      !homeHtml.includes("myshopify.com")
    ) {
      prospect.isShopify = false;
      prospect.crawlError = "Not a Shopify store";
      return prospect;
    }
    prospect.isShopify = true;

    // 3. Extract brand name from <title>
    const $ = cheerio.load(homeHtml);
    const title = $("title").text().trim();
    // Clean up title — remove common suffixes
    prospect.brandName = title
      .replace(/\s*[-–|:]\s*(official|home|shop|store|online).*/i, "")
      .replace(/\s*[-–|:]\s*$/i, "")
      .trim()
      || $("h1").first().text().trim()
      || getBaseDomain(storeUrl);

    // 4. Extract emails from homepage
    prospect.emails.push(...extractEmails(homeHtml));

    // 5. Extract social links from homepage
    prospect.socialLinks.push(...extractSocialLinks(homeHtml));

    // 6. Detect apps from scripts
    const allSrc: string[] = [];
    $("script[src]").each((_, el) => {
      allSrc.push($(el).attr("src") || "");
    });
    $("link[href]").each((_, el) => {
      allSrc.push($(el).attr("href") || "");
    });
    $("script:not([src])").each((_, el) => {
      allSrc.push(($(el).html() || "").slice(0, 500));
    });
    const allSrcStr = allSrc.join(" ").toLowerCase();

    const detectedApps = new Set<string>();
    for (const [key, app] of Object.entries(KNOWN_APPS)) {
      if (allSrcStr.includes(key)) detectedApps.add(app.name);
    }
    prospect.apps = Array.from(detectedApps);
    prospect.hasReviews = prospect.apps.some((a) => REVIEW_APPS.includes(a));
    prospect.hasSubscriptions = prospect.apps.some((a) =>
      SUBSCRIPTION_APPS.includes(a)
    );
    prospect.hasBNPL = prospect.apps.some((a) => BNPL_APPS.includes(a));

    // 7. Fetch contact pages for more emails
    const contactPaths = ["/pages/contact", "/pages/contact-us", "/pages/about", "/contact"];
    for (const path of contactPaths) {
      try {
        const res = await fetchWithTimeout(`${storeUrl}${path}`, {}, 5000);
        if (res.ok) {
          const html = await res.text();
          prospect.emails.push(...extractEmails(html));
          // Also get social links from these pages
          prospect.socialLinks.push(...extractSocialLinks(html));
        }
      } catch {
        /* skip */
      }
      await delay(200);
    }

    // Deduplicate emails and social links
    prospect.emails = [...new Set(prospect.emails)];
    const seenSocial = new Set<string>();
    prospect.socialLinks = prospect.socialLinks.filter((s) => {
      const key = `${s.platform}:${s.url}`;
      if (seenSocial.has(key)) return false;
      seenSocial.add(key);
      return true;
    });

    // 8. Fetch products.json for product count + prices
    try {
      const prodRes = await fetchWithTimeout(
        `${storeUrl}/products.json?limit=250`,
        { headers: { Accept: "application/json" } }
      );
      if (prodRes.ok) {
        const data = await prodRes.json();
        const products = (data as Record<string, unknown[]>).products || [];
        prospect.productCount = products.length;

        if (products.length > 0) {
          const prices = (products as Array<Record<string, unknown>>)
            .map((p) => {
              const variants = p.variants as
                | Array<Record<string, unknown>>
                | undefined;
              return parseFloat(String(variants?.[0]?.price || "0"));
            })
            .filter((p) => p > 0);

          if (prices.length > 0) {
            prospect.priceRange = {
              min: Math.min(...prices),
              max: Math.max(...prices),
            };
          }
        }
      }
    } catch {
      /* skip */
    }

    // 9. Calculate revenue score (1-5)
    let score = 1;
    if (prospect.productCount >= 20) score++;
    if (prospect.productCount >= 50) score++;
    if (prospect.hasReviews) score++;
    if (prospect.hasSubscriptions) score++;
    if (prospect.hasBNPL) score++;
    if (prospect.apps.length >= 5) score++;
    if (
      prospect.priceRange &&
      prospect.priceRange.max >= 50
    )
      score++;
    prospect.revenueScore = Math.min(score, 5);
  } catch (err) {
    prospect.crawlError =
      err instanceof Error ? err.message : "Unknown error";
  }

  return prospect;
}

// ── Route handler ───────────────────────────────────────────────

export async function POST(request: Request) {
  const serperKey = process.env.SERPER_API_KEY;

  if (!serperKey) {
    return new Response(
      JSON.stringify({
        type: "error",
        message: "MISSING_API_KEYS",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  let body: { keyword?: string; maxResults?: number };
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ type: "error", message: "Invalid request body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const keyword = body.keyword?.trim();
  if (!keyword) {
    return new Response(
      JSON.stringify({ type: "error", message: "Keyword is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const maxResults = Math.min(body.maxResults || 10, 30);

  // Stream NDJSON response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: StreamEvent) {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      }

      try {
        // Step 1: Google search
        send({ type: "searching", keyword });

        let urls: string[];
        try {
          urls = await serperSearch(keyword, maxResults, serperKey);
        } catch (err) {
          if (
            err instanceof Error &&
            err.message === "RATE_LIMITED"
          ) {
            send({
              type: "error",
              message:
                "Serper API rate limit reached. Try again later or check your plan at serper.dev.",
            });
            controller.close();
            return;
          }
          throw err;
        }

        if (urls.length === 0) {
          send({
            type: "error",
            message:
              "No results found for this keyword. Try a broader search term.",
          });
          controller.close();
          return;
        }

        send({ type: "found", total: urls.length, urls });

        // Step 2: Enrich each URL
        let enrichedCount = 0;
        for (let i = 0; i < urls.length; i++) {
          send({
            type: "enriching",
            index: i + 1,
            total: urls.length,
            url: urls[i],
          });

          const prospect = await enrichStore(urls[i]);

          // Only include Shopify stores
          if (prospect.isShopify) {
            send({ type: "prospect", data: prospect });
            enrichedCount++;
          }

          if (i < urls.length - 1) await delay(CRAWL_DELAY);
        }

        send({ type: "done", total: enrichedCount });
      } catch (err) {
        send({
          type: "error",
          message:
            err instanceof Error ? err.message : "Something went wrong",
        });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
