#!/usr/bin/env node

/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  LAUNCHPAD — Client Intelligence & Gap Analysis Tool         ║
 * ║  Ecomlanders · Shopify CRO Agency                           ║
 * ╚═══════════════════════════════════════════════════════════════╝
 *
 * Analyses a Shopify store and its Meta ads to produce a
 * comprehensive gap analysis brief for sales and onboarding.
 *
 * Usage:
 *   node launchpad.js --store "https://example.myshopify.com" --brand "Example Brand"
 *
 * Env vars:
 *   ANTHROPIC_API_KEY  — required
 *   META_ACCESS_TOKEN  — optional (for Meta Ad Library)
 */

const { program } = require("commander");
const cheerio = require("cheerio");
const Anthropic = require("@anthropic-ai/sdk").default;
const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");

// ── Load .env.local ───────────────────────────────────────────
const envPath = path.join(__dirname, ".env.local");
try {
  const envContent = fsSync.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  // .env.local not found — that's fine, rely on shell env
}

// ── Constants ─────────────────────────────────────────────────

const MODEL = "claude-sonnet-4-5-20250929";
const MAX_TOKENS = 8000;
const FETCH_TIMEOUT = 15000;
const CRAWL_DELAY = 500; // ms between requests to be polite
const MAX_PRODUCTS = 500; // Cap to keep data manageable
const MAX_COLLECTIONS_TO_CRAWL = 10;
const MAX_PRODUCTS_TO_CRAWL = 20;
const META_API_VERSION = "v21.0";

const KNOWN_APPS = {
  intelligems: { name: "Intelligems", type: "Price Testing / A/B Testing" },
  rebuy: { name: "Rebuy", type: "Upsells & Cross-sells" },
  reconvert: { name: "ReConvert", type: "Post-Purchase Upsells" },
  klaviyo: { name: "Klaviyo", type: "Email & SMS Marketing" },
  "judge.me": { name: "Judge.me", type: "Product Reviews" },
  judgeme: { name: "Judge.me", type: "Product Reviews" },
  loox: { name: "Loox", type: "Photo Reviews" },
  stamped: { name: "Stamped.io", type: "Reviews & UGC" },
  yotpo: { name: "Yotpo", type: "Reviews & Loyalty" },
  "okendo": { name: "Okendo", type: "Reviews & UGC" },
  luckyorange: { name: "Lucky Orange", type: "Heatmaps & Session Recording" },
  "lucky-orange": { name: "Lucky Orange", type: "Heatmaps & Session Recording" },
  hotjar: { name: "Hotjar", type: "Heatmaps & Session Recording" },
  optimizely: { name: "Optimizely", type: "A/B Testing" },
  vwo: { name: "VWO", type: "A/B Testing" },
  googleoptimize: { name: "Google Optimize", type: "A/B Testing" },
  bold: { name: "Bold Commerce", type: "Upsells / Bundles" },
  zipify: { name: "Zipify", type: "Landing Pages / OneClickUpsell" },
  carthook: { name: "CartHook", type: "Post-Purchase Offers" },
  recharge: { name: "ReCharge", type: "Subscriptions" },
  skio: { name: "Skio", type: "Subscriptions" },
  afterpay: { name: "Afterpay", type: "BNPL" },
  klarna: { name: "Klarna", type: "BNPL" },
  attentive: { name: "Attentive", type: "SMS Marketing" },
  postscript: { name: "Postscript", type: "SMS Marketing" },
  gorgias: { name: "Gorgias", type: "Customer Support" },
  tidio: { name: "Tidio", type: "Live Chat" },
  privy: { name: "Privy", type: "Pop-ups & Email Capture" },
  justuno: { name: "Justuno", type: "Pop-ups & CRO" },
  smile: { name: "Smile.io", type: "Loyalty & Rewards" },
  referralcandy: { name: "ReferralCandy", type: "Referral Programme" },
  triplewhale: { name: "Triple Whale", type: "Analytics & Attribution" },
  "triple-whale": { name: "Triple Whale", type: "Analytics & Attribution" },
  northbeam: { name: "Northbeam", type: "Attribution" },
  elevar: { name: "Elevar", type: "Tracking & Analytics" },
  lifetimely: { name: "Lifetimely", type: "LTV Analytics" },
  shogun: { name: "Shogun", type: "Page Builder" },
  gempages: { name: "GemPages", type: "Page Builder" },
  pagefly: { name: "PageFly", type: "Page Builder" },
  vitals: { name: "Vitals", type: "All-in-One App" },
};

const KNOWN_THEMES = [
  "dawn", "impulse", "prestige", "warehouse", "motion", "symmetry",
  "empire", "testament", "pipeline", "turbo", "flex", "debut",
  "minimal", "narrative", "brooklyn", "supply", "venture", "boundless",
  "simple", "cascade", "colorblock", "craft", "crave", "origin",
  "ride", "refresh", "sense", "spotlight", "studio", "taste",
];

// ── CLI Setup ─────────────────────────────────────────────────

program
  .name("launchpad")
  .description("Client Intelligence & Gap Analysis Tool — Ecomlanders")
  .requiredOption("--store <url>", "Shopify store URL")
  .requiredOption("--brand <name>", "Brand name")
  .option("--storefront-token <token>", "Shopify Storefront Access Token (if store requires auth)")
  .option("--meta-page-id <id>", "Facebook Page ID for Ad Library lookup")
  .option("--competitors <names>", "Comma-separated competitor brand names")
  .option("--output-dir <dir>", "Output directory", "./launchpad-reports")
  .parse(process.argv);

const opts = program.opts();

// ── Helpers ───────────────────────────────────────────────────

function log(icon, msg) {
  console.log(`  ${icon}  ${msg}`);
}

function logSection(title) {
  console.log(`\n  ┌─ ${title} ${"─".repeat(Math.max(0, 50 - title.length))}┐`);
}

function logDone(title) {
  console.log(`  └${"─".repeat(54)}┘`);
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-GB,en;q=0.9",
        ...options.headers,
      },
    });
    return res;
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(`Timeout fetching ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJSON(url) {
  const res = await fetchWithTimeout(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.json();
}

async function fetchHTML(url) {
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.text();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeStoreUrl(url) {
  let u = url.trim().replace(/\/+$/, "");
  if (!u.startsWith("http")) u = "https://" + u;
  return u;
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function pct(a, b) {
  if (!b || b === 0) return "N/A";
  return ((a / b) * 100).toFixed(1) + "%";
}

// ── Shopify Data Collection ───────────────────────────────────

async function collectShopifyProducts(baseUrl) {
  log("📦", "Fetching products...");

  // Try the public JSON endpoint first
  const allProducts = await collectProductsViaJSON(baseUrl);

  if (allProducts.length > 0) {
    return allProducts;
  }

  // Fallback: try Storefront GraphQL API if token provided
  const sfToken = opts.storefrontToken || process.env.SHOPIFY_STOREFRONT_TOKEN;
  if (sfToken) {
    log("  ", "  JSON endpoint blocked — trying Storefront API...");
    return await collectProductsViaStorefrontAPI(baseUrl, sfToken);
  }

  log("⚠️", "Products endpoint blocked. Pass --storefront-token for Storefront API access.");
  return [];
}

async function collectProductsViaJSON(baseUrl) {
  const allProducts = [];
  let page = 1;

  while (true) {
    try {
      const data = await fetchJSON(`${baseUrl}/products.json?limit=250&page=${page}`);
      if (!data.products || data.products.length === 0) break;
      allProducts.push(...data.products);
      log("  ", `  Page ${page}: ${data.products.length} products`);
      if (data.products.length < 250 || allProducts.length >= MAX_PRODUCTS) break;
      page++;
      await delay(CRAWL_DELAY);
    } catch (err) {
      if (page === 1) return []; // Signal to try fallback
      break;
    }
  }

  // Cap products to keep context manageable
  if (allProducts.length > MAX_PRODUCTS) {
    log("  ", `  Capped at ${MAX_PRODUCTS} products (${allProducts.length} total)`);
    allProducts.length = MAX_PRODUCTS;
  }

  log("✓", `${allProducts.length} products collected`);
  return allProducts;
}

async function collectProductsViaStorefrontAPI(baseUrl, token) {
  const allProducts = [];
  let cursor = null;

  // Extract the store domain for the API endpoint
  const storeDomain = new URL(baseUrl).hostname;
  const apiUrl = `https://${storeDomain}/api/2024-01/graphql.json`;

  while (allProducts.length < MAX_PRODUCTS) {
    const query = `{
      products(first: 50${cursor ? `, after: "${cursor}"` : ""}) {
        edges {
          cursor
          node {
            title
            handle
            productType
            tags
            variants(first: 10) {
              edges {
                node {
                  title
                  price { amount currencyCode }
                  compareAtPrice { amount currencyCode }
                }
              }
            }
          }
        }
        pageInfo { hasNextPage }
      }
    }`;

    try {
      const res = await fetchWithTimeout(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": token,
        },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) {
        log("⚠️", `Storefront API error: HTTP ${res.status}`);
        break;
      }

      const data = await res.json();
      const edges = data?.data?.products?.edges || [];

      if (edges.length === 0) break;

      for (const edge of edges) {
        const node = edge.node;
        allProducts.push({
          title: node.title,
          handle: node.handle,
          product_type: node.productType,
          tags: node.tags?.join(", ") || "",
          variants: node.variants.edges.map((v) => ({
            title: v.node.title,
            price: v.node.price?.amount || "0",
            compare_at_price: v.node.compareAtPrice?.amount || null,
          })),
        });
      }

      log("  ", `  ${allProducts.length} products so far...`);

      cursor = edges[edges.length - 1].cursor;
      if (!data.data.products.pageInfo.hasNextPage) break;
      await delay(CRAWL_DELAY);
    } catch (err) {
      log("⚠️", `Storefront API error: ${err.message}`);
      break;
    }
  }

  log("✓", `${allProducts.length} products collected via Storefront API`);
  return allProducts;
}

async function collectShopifyCollections(baseUrl) {
  log("📂", "Fetching collections...");
  const allCollections = [];
  let page = 1;

  while (true) {
    try {
      const data = await fetchJSON(`${baseUrl}/collections.json?limit=250&page=${page}`);
      if (!data.collections || data.collections.length === 0) break;
      allCollections.push(...data.collections);
      if (data.collections.length < 250) break;
      page++;
      await delay(CRAWL_DELAY);
    } catch (err) {
      if (page === 1) log("⚠️", `Could not fetch collections: ${err.message}`);
      break;
    }
  }

  // Fetch product counts for each collection (first 10)
  const topCollections = allCollections.slice(0, 10);
  for (const col of topCollections) {
    try {
      const data = await fetchJSON(`${baseUrl}/collections/${col.handle}/products.json?limit=1`);
      // We can't easily get total count from this endpoint, but we note it exists
      col._hasProducts = true;
    } catch {
      col._hasProducts = false;
    }
    await delay(200);
  }

  log("✓", `${allCollections.length} collections collected`);
  return allCollections;
}

async function crawlPage(url) {
  try {
    const html = await fetchHTML(url);
    const $ = cheerio.load(html);

    // Extract key elements
    const title = $("title").text().trim();
    const metaDesc = $('meta[name="description"]').attr("content") || "";
    const h1 = $("h1").first().text().trim();
    const heroText = $(".hero__title, .banner__heading, [class*='hero'] h1, [class*='hero'] h2, [class*='banner'] h1, [class*='banner'] h2, .slideshow__heading").first().text().trim();

    // Persuasion elements
    const hasReviews = !!$('[class*="review"], [class*="rating"], [data-rating], .spr-summary, .jdgm-widget, .stamped-widget, .loox-rating, .yotpo-widget, .okendo-widget').length;
    const hasTrustBadges = !!$('[class*="trust"], [class*="badge"], [class*="guarantee"], [alt*="trust"], [alt*="badge"], [alt*="secure"], [alt*="guarantee"]').length;
    const hasUrgency = !!$('[class*="urgency"], [class*="countdown"], [class*="timer"], [class*="limited"], [class*="hurry"]').length;
    const hasFAQ = !!$('[class*="faq"], [class*="accordion"], details summary, [id*="faq"]').length;
    const hasBundles = !!$('[class*="bundle"], [class*="upsell"], [class*="cross-sell"], [class*="frequently-bought"], [class*="you-may-also"]').length;
    const hasSocialProof = !!$('[class*="testimonial"], [class*="social-proof"], [class*="as-seen"], [class*="press"], [class*="featured-in"]').length;
    const hasVideo = !!$("video, iframe[src*='youtube'], iframe[src*='vimeo']").length;
    const hasStickyATC = !!$('[class*="sticky"] [class*="add-to-cart"], [class*="sticky-atc"], [class*="fixed-atc"]').length;

    // Count images and scripts for performance signals
    const imageCount = $("img").length;
    const scriptCount = $("script").length;
    const largeImages = $("img").filter((_, el) => {
      const src = $(el).attr("src") || "";
      // Check if image URL suggests it's unoptimized (no width params)
      return src && !src.includes("width=") && !src.includes("_small") && !src.includes("_compact");
    }).length;

    // Extract all script sources for tech stack detection
    const scriptSrcs = [];
    $("script[src]").each((_, el) => {
      scriptSrcs.push($(el).attr("src"));
    });

    // Also check inline scripts and link tags
    const inlineScripts = [];
    $("script:not([src])").each((_, el) => {
      inlineScripts.push($(el).html() || "");
    });

    const linkHrefs = [];
    $('link[href]').each((_, el) => {
      linkHrefs.push($(el).attr("href"));
    });

    return {
      url,
      title,
      metaDescription: metaDesc,
      h1,
      heroText: heroText || h1,
      persuasionElements: {
        reviews: hasReviews,
        trustBadges: hasTrustBadges,
        urgency: hasUrgency,
        faq: hasFAQ,
        bundles: hasBundles,
        socialProof: hasSocialProof,
        video: hasVideo,
        stickyATC: hasStickyATC,
      },
      performance: {
        imageCount,
        scriptCount,
        potentiallyUnoptimisedImages: largeImages,
      },
      scriptSrcs,
      inlineScripts: inlineScripts.map((s) => s.slice(0, 500)), // Truncate
      linkHrefs,
    };
  } catch (err) {
    return { url, error: err.message };
  }
}

async function crawlStorefront(baseUrl, products, collections) {
  log("🌐", "Crawling storefront pages...");
  const pages = [];

  // 1. Homepage
  log("  ", "  Homepage...");
  pages.push(await crawlPage(baseUrl));
  await delay(CRAWL_DELAY);

  // 2. Top collections (up to 10)
  const topCollections = collections.slice(0, 10);
  for (const col of topCollections) {
    log("  ", `  Collection: ${col.title}`);
    pages.push(await crawlPage(`${baseUrl}/collections/${col.handle}`));
    await delay(CRAWL_DELAY);
  }

  // 3. Top products (up to 20, from first few collections or by position)
  const topProducts = products.slice(0, 20);
  for (const prod of topProducts) {
    log("  ", `  Product: ${prod.title.slice(0, 40)}...`);
    pages.push(await crawlPage(`${baseUrl}/products/${prod.handle}`));
    await delay(CRAWL_DELAY);
  }

  // 4. Check common landing page routes
  const landingPaths = [
    "/pages/about", "/pages/about-us", "/pages/our-story",
    "/pages/faq", "/pages/faqs",
    "/pages/reviews", "/pages/testimonials",
    "/pages/shipping", "/pages/shipping-policy",
    "/pages/returns", "/pages/return-policy", "/pages/refund-policy",
    "/pages/contact", "/pages/contact-us",
    "/pages/wholesale",
    "/pages/quiz",
    "/pages/rewards", "/pages/loyalty",
  ];

  log("  ", "  Checking landing pages...");
  let landingPagesFound = 0;
  for (const p of landingPaths) {
    try {
      const res = await fetchWithTimeout(`${baseUrl}${p}`, { method: "HEAD" });
      if (res.ok) {
        pages.push(await crawlPage(`${baseUrl}${p}`));
        landingPagesFound++;
      }
    } catch {
      // Page doesn't exist — skip
    }
    await delay(200);
  }
  log("  ", `  ${landingPagesFound} landing pages found`);

  log("✓", `${pages.length} pages crawled`);
  return pages;
}

function detectTechStack(pages) {
  log("🔍", "Detecting tech stack...");
  const detectedApps = new Map();
  let themeDetected = null;

  for (const page of pages) {
    if (page.error) continue;

    const allSources = [
      ...(page.scriptSrcs || []),
      ...(page.linkHrefs || []),
      ...(page.inlineScripts || []),
    ].join(" ").toLowerCase();

    // Check for known apps
    for (const [key, app] of Object.entries(KNOWN_APPS)) {
      if (allSources.includes(key)) {
        detectedApps.set(app.name, app);
      }
    }

    // Check for theme
    if (!themeDetected) {
      for (const theme of KNOWN_THEMES) {
        if (allSources.includes(`/${theme}/`) || allSources.includes(`theme-${theme}`) || allSources.includes(`themes/${theme}`)) {
          themeDetected = theme.charAt(0).toUpperCase() + theme.slice(1);
          break;
        }
      }
      // Check Shopify.theme in inline scripts
      for (const script of (page.inlineScripts || [])) {
        const themeMatch = script.match(/Shopify\.theme\s*=\s*\{[^}]*"name"\s*:\s*"([^"]+)"/);
        if (themeMatch) {
          themeDetected = themeMatch[1];
          break;
        }
      }
    }
  }

  const apps = Array.from(detectedApps.values());
  log("✓", `${apps.length} apps detected${themeDetected ? `, theme: ${themeDetected}` : ""}`);

  return {
    apps,
    theme: themeDetected || "Unknown (possibly custom)",
    isCustomTheme: themeDetected ? !KNOWN_THEMES.includes(themeDetected.toLowerCase()) : true,
  };
}

function analyseProducts(products) {
  if (!products.length) return null;

  const prices = products
    .map((p) => parseFloat(p.variants?.[0]?.price || "0"))
    .filter((p) => p > 0);

  const compareAtPrices = products
    .filter((p) => p.variants?.[0]?.compare_at_price)
    .map((p) => ({
      price: parseFloat(p.variants[0].price),
      compareAt: parseFloat(p.variants[0].compare_at_price),
    }));

  const discountedCount = compareAtPrices.length;
  const avgDiscount = discountedCount > 0
    ? compareAtPrices.reduce((sum, p) => sum + ((p.compareAt - p.price) / p.compareAt) * 100, 0) / discountedCount
    : 0;

  const productTypes = {};
  for (const p of products) {
    const type = p.product_type || "Uncategorised";
    productTypes[type] = (productTypes[type] || 0) + 1;
  }

  const multiVariantProducts = products.filter((p) => (p.variants?.length || 0) > 1).length;

  return {
    totalProducts: products.length,
    priceRange: {
      min: Math.min(...prices),
      max: Math.max(...prices),
      median: prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)],
      average: prices.reduce((a, b) => a + b, 0) / prices.length,
    },
    discounting: {
      productsWithCompareAt: discountedCount,
      percentDiscounted: ((discountedCount / products.length) * 100).toFixed(1) + "%",
      averageDiscountPercent: avgDiscount.toFixed(1) + "%",
    },
    productTypes,
    variantComplexity: {
      multiVariantProducts,
      percentMultiVariant: ((multiVariantProducts / products.length) * 100).toFixed(1) + "%",
      maxVariants: Math.max(...products.map((p) => p.variants?.length || 0)),
    },
  };
}

// ── Meta Ad Library Collection ────────────────────────────────

async function collectMetaAds(brand, pageId) {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) {
    const searchUrl = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=GB&q=${encodeURIComponent(brand)}`;
    log("⚠️", "No META_ACCESS_TOKEN — skipping Meta Ad Library API");
    log("  ", "");
    log("  ", "  To enable Meta ad data, get a free token:");
    log("  ", "  1. Go to developers.facebook.com → create an app (free)");
    log("  ", "  2. Add 'Facebook Login' product → generate User Token");
    log("  ", "  3. Add META_ACCESS_TOKEN=your-token to .env.local");
    log("  ", "");
    log("  ", `  Manual lookup: ${searchUrl}`);
    log("  ", "");
    return { ads: [], analysis: null, publicUrl: searchUrl };
  }

  log("📢", "Fetching Meta Ad Library data...");

  try {
    const searchParam = pageId
      ? `search_page_ids=${pageId}`
      : `search_terms=${encodeURIComponent(brand)}`;

    const fields = [
      "id",
      "ad_creative_bodies",
      "ad_creative_link_captions",
      "ad_creative_link_descriptions",
      "ad_creative_link_titles",
      "ad_delivery_start_time",
      "ad_delivery_stop_time",
      "ad_snapshot_url",
      "page_id",
      "page_name",
      "publisher_platforms",
      "languages",
      "impressions",
      "spend",
    ].join(",");

    const url = `https://graph.facebook.com/${META_API_VERSION}/ads_archive?${searchParam}&ad_reached_countries=['GB']&ad_active_status=active&ad_type=ALL&fields=${fields}&limit=100&access_token=${token}`;

    const data = await fetchJSON(url);

    if (!data.data || data.data.length === 0) {
      // Try US as fallback
      const urlUS = url.replace("['GB']", "['US']");
      const dataUS = await fetchJSON(urlUS);
      if (!dataUS.data || dataUS.data.length === 0) {
        log("⚠️", "No active ads found in Meta Ad Library");
        return { ads: [], analysis: null };
      }
      return processMetaAds(dataUS.data);
    }

    // Fetch additional pages if available
    let allAds = [...data.data];
    let nextUrl = data.paging?.next;
    let pages = 1;

    while (nextUrl && pages < 5) {
      try {
        await delay(1000); // Rate limiting
        const nextData = await fetchJSON(nextUrl);
        if (nextData.data?.length) {
          allAds.push(...nextData.data);
          nextUrl = nextData.paging?.next;
          pages++;
        } else {
          break;
        }
      } catch {
        break;
      }
    }

    log("✓", `${allAds.length} active ads found`);
    return processMetaAds(allAds);
  } catch (err) {
    log("⚠️", `Meta Ad Library error: ${err.message}`);
    log("  ", "Continuing without Meta ad data");
    return null;
  }
}

function processMetaAds(ads) {
  const now = new Date();

  const processed = ads.map((ad) => {
    const startDate = ad.ad_delivery_start_time ? new Date(ad.ad_delivery_start_time) : null;
    const daysRunning = startDate ? Math.floor((now - startDate) / (1000 * 60 * 60 * 24)) : null;

    const bodies = ad.ad_creative_bodies || [];
    const titles = ad.ad_creative_link_titles || [];
    const descriptions = ad.ad_creative_link_descriptions || [];
    const captions = ad.ad_creative_link_captions || [];

    // Extract landing page URLs from captions (usually contains domain)
    const landingPages = captions.filter((c) => c.includes("."));

    return {
      id: ad.id,
      pageName: ad.page_name,
      startDate: ad.ad_delivery_start_time,
      daysRunning,
      bodies,
      titles,
      descriptions,
      landingPages,
      platforms: ad.publisher_platforms || [],
      snapshotUrl: ad.ad_snapshot_url,
    };
  });

  // Sort by longevity (longest running first — likely winners)
  processed.sort((a, b) => (b.daysRunning || 0) - (a.daysRunning || 0));

  // Analysis
  const totalAds = processed.length;
  const longestRunning = processed.slice(0, 5);

  // Extract offer angles from ad copy
  const allCopy = processed.flatMap((a) => [...a.bodies, ...a.titles, ...a.descriptions]).join(" ").toLowerCase();

  const offerAngles = {
    discount: /\d+%\s*off|sale|save\s*\$?\d|discount/i.test(allCopy),
    freeShipping: /free\s*ship/i.test(allCopy),
    bundle: /bundle|pack|set of|kit/i.test(allCopy),
    problemSolution: /struggle|problem|tired of|finally|solution|stop\s/i.test(allCopy),
    socialProof: /\d+\s*(reviews|customers|people|sold)|rated|loved by|best.?seller/i.test(allCopy),
    urgency: /limited|last chance|ending|hurry|only \d|selling fast/i.test(allCopy),
    guarantee: /guarantee|risk.?free|money.?back|refund/i.test(allCopy),
    newProduct: /new|just\s*launched|introducing/i.test(allCopy),
  };

  // CTA types
  const ctaTypes = {};
  for (const ad of processed) {
    for (const title of ad.titles) {
      const lower = title.toLowerCase();
      if (lower.includes("shop now")) ctaTypes["Shop Now"] = (ctaTypes["Shop Now"] || 0) + 1;
      else if (lower.includes("learn more")) ctaTypes["Learn More"] = (ctaTypes["Learn More"] || 0) + 1;
      else if (lower.includes("get")) ctaTypes["Get/Order"] = (ctaTypes["Get/Order"] || 0) + 1;
      else if (lower.includes("buy")) ctaTypes["Buy Now"] = (ctaTypes["Buy Now"] || 0) + 1;
      else if (lower.includes("sign up")) ctaTypes["Sign Up"] = (ctaTypes["Sign Up"] || 0) + 1;
    }
  }

  // Landing page distribution
  const landingPageUrls = {};
  for (const ad of processed) {
    for (const lp of ad.landingPages) {
      landingPageUrls[lp] = (landingPageUrls[lp] || 0) + 1;
    }
  }

  // Messaging themes
  const allBodies = processed.flatMap((a) => a.bodies);

  return {
    ads: processed,
    analysis: {
      totalActiveAds: totalAds,
      longestRunningAds: longestRunning.map((a) => ({
        daysRunning: a.daysRunning,
        bodies: a.bodies.slice(0, 1),
        titles: a.titles.slice(0, 1),
      })),
      offerAngles,
      ctaDistribution: ctaTypes,
      landingPageUrls,
      platformDistribution: (() => {
        const platforms = {};
        for (const ad of processed) {
          for (const p of ad.platforms) {
            platforms[p] = (platforms[p] || 0) + 1;
          }
        }
        return platforms;
      })(),
      sampleAdCopy: allBodies.slice(0, 10), // First 10 for Claude context
    },
  };
}

// ── Competitor Data (optional) ────────────────────────────────

async function collectCompetitorAds(competitors) {
  if (!competitors || !process.env.META_ACCESS_TOKEN) return null;

  const names = competitors.split(",").map((c) => c.trim());
  log("🏷️", `Fetching competitor ads: ${names.join(", ")}...`);

  const results = {};
  for (const name of names) {
    results[name] = await collectMetaAds(name, null);
    await delay(1000);
  }

  return results;
}

// ── Claude Analysis ───────────────────────────────────────────

const SYSTEM_PROMPT = `You are a senior CRO strategist at Ecomlanders, a Shopify CRO and landing page agency with 8 years of experience in DTC ecommerce. You specialise in conversion rate optimisation, funnel architecture, offer communication, and user psychology.

You have been given data from a brand's Shopify store and their Meta Ad Library. Your job is to produce a comprehensive intelligence brief that identifies gaps, leaks, and opportunities.

Analyse the data and produce a structured brief covering the following sections:

## 1. BRAND OVERVIEW
- What they sell, price positioning, target market inference
- Product catalogue size and complexity
- Current tech stack and sophistication level
- Overall impression of their funnel maturity (1-10 scale with justification)

## 2. FUNNEL LEAK ANALYSIS
For each key page type (homepage, collection, PDP, landing pages), identify:
- Traffic potential vs conversion likelihood
- Missing persuasion elements (social proof, urgency, objection handling, guarantee)
- Offer communication clarity — is the value proposition immediately clear?
- Information hierarchy issues — is the page structured for how cold traffic actually reads?
- Mobile experience red flags
- Specific friction points in the user journey

## 3. AD-TO-PAGE ALIGNMENT
Cross-reference Meta ads with the landing pages they point to:
- Message match: does the ad promise align with what the page delivers?
- Offer consistency: are discount/offer claims in ads reflected on pages?
- Audience temperature mismatch: are ads targeting cold traffic but pages assume warm?
- Missing dedicated landing pages: are ads pointing to generic PDPs when they should have custom LPs?
- Identify the top 3 highest-opportunity ad-to-page mismatches

## 4. OFFER STRATEGY GAPS
- Current offer angles being used (from ads and pages)
- Missing offer angles that would likely perform for this product category
- AOV opportunities: products that should be bundled, upsells not being presented, cross-sells missing
- Pricing psychology: are they using anchoring, decoy pricing, tiered offers effectively?
- Compare-at-price usage: are they leveraging perceived value?

## 5. COMPETITIVE POSITIONING
Based on their ads and pages:
- How differentiated is their messaging from generic DTC?
- Are they competing on price (race to bottom) or value (sustainable)?
- What would a competitor using AI-generated pages miss that custom CRO would catch?
- Positioning gaps relative to competitors (if competitor data provided)

## 6. QUICK WINS (implement in 1-2 weeks)
List 5-8 specific, actionable changes that would likely improve conversion rate immediately. Be specific — not "improve your hero section" but "your hero headline focuses on features when your best-performing ad leads with the problem statement — align the page to match."

## 7. STRATEGIC RECOMMENDATIONS (30-90 day roadmap)
Prioritised list of larger initiatives:
- New pages to build (with justification from the data)
- Funnel restructuring recommendations
- Testing hypotheses ranked by expected impact
- Offer strategy changes
- Tech stack recommendations

## 8. REVENUE IMPACT MODELLING
Based on the gaps identified, estimate:
- Current likely conversion rate range (based on funnel maturity assessment)
- Realistic CR improvement from quick wins
- Realistic CR improvement from strategic recommendations
- If traffic and AOV data can be inferred, model the revenue impact

Format the output as a clean, professional brief. Use specific data points from the analysis — never be vague. Every recommendation must reference something specific you found in the data.

Do NOT pad with generic CRO advice. Every insight must be derived from this brand's actual data.`;

async function runAnalysis(collectedData) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Missing ANTHROPIC_API_KEY — add it to .env.local");
  }

  log("🤖", "Running Claude analysis...");
  log("  ", "  This may take 30-60 seconds...");

  const anthropic = new Anthropic();

  // Build the data prompt — summarise to fit context window
  const dataPrompt = buildDataPrompt(collectedData);

  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Analyse this brand and produce the intelligence brief.\n\n${dataPrompt}`,
      },
    ],
  });

  const text = res.content[0]?.type === "text" ? res.content[0].text : "";
  log("✓", "Analysis complete");

  return text;
}

function buildDataPrompt(data) {
  const parts = [];

  parts.push(`# BRAND: ${data.brand}`);
  parts.push(`# STORE URL: ${data.storeUrl}\n`);

  // Product analysis
  if (data.productAnalysis) {
    parts.push("## PRODUCT DATA");
    parts.push(`Total products: ${data.productAnalysis.totalProducts}`);
    parts.push(`Price range: $${data.productAnalysis.priceRange.min.toFixed(2)} - $${data.productAnalysis.priceRange.max.toFixed(2)}`);
    parts.push(`Median price: $${data.productAnalysis.priceRange.median.toFixed(2)}`);
    parts.push(`Average price: $${data.productAnalysis.priceRange.average.toFixed(2)}`);
    parts.push(`Products with compare-at pricing: ${data.productAnalysis.discounting.productsWithCompareAt} (${data.productAnalysis.discounting.percentDiscounted})`);
    parts.push(`Average discount when discounted: ${data.productAnalysis.discounting.averageDiscountPercent}`);
    parts.push(`Multi-variant products: ${data.productAnalysis.variantComplexity.multiVariantProducts} (${data.productAnalysis.variantComplexity.percentMultiVariant})`);
    parts.push(`Product types: ${JSON.stringify(data.productAnalysis.productTypes)}`);
    parts.push("");
  }

  // Top products (first 20 with key details)
  if (data.products?.length) {
    parts.push("## TOP PRODUCTS");
    for (const p of data.products.slice(0, 20)) {
      const price = p.variants?.[0]?.price || "N/A";
      const compareAt = p.variants?.[0]?.compare_at_price || null;
      const priceStr = compareAt ? `$${price} (was $${compareAt})` : `$${price}`;
      parts.push(`- ${p.title} | ${priceStr} | Type: ${p.product_type || "N/A"} | Variants: ${p.variants?.length || 0}`);
    }
    parts.push("");
  }

  // Collections
  if (data.collections?.length) {
    parts.push("## COLLECTIONS");
    for (const c of data.collections.slice(0, 15)) {
      parts.push(`- ${c.title} (/${c.handle})`);
    }
    parts.push("");
  }

  // Tech stack
  if (data.techStack) {
    parts.push("## TECH STACK");
    parts.push(`Theme: ${data.techStack.theme} (${data.techStack.isCustomTheme ? "Custom" : "Off-the-shelf"})`);
    if (data.techStack.apps.length) {
      parts.push("Detected apps:");
      for (const app of data.techStack.apps) {
        parts.push(`- ${app.name}: ${app.type}`);
      }
    } else {
      parts.push("No major apps detected in script tags.");
    }
    parts.push("");
  }

  // Page crawl results
  if (data.pages?.length) {
    parts.push("## CRAWLED PAGES");
    for (const page of data.pages) {
      if (page.error) {
        parts.push(`\n### ${page.url}\nError: ${page.error}`);
        continue;
      }
      parts.push(`\n### ${page.url}`);
      parts.push(`Title: ${page.title}`);
      if (page.metaDescription) parts.push(`Meta: ${page.metaDescription.slice(0, 200)}`);
      if (page.heroText) parts.push(`Hero/H1: ${page.heroText.slice(0, 200)}`);

      const pe = page.persuasionElements;
      const present = Object.entries(pe).filter(([_, v]) => v).map(([k]) => k);
      const missing = Object.entries(pe).filter(([_, v]) => !v).map(([k]) => k);
      if (present.length) parts.push(`Present: ${present.join(", ")}`);
      if (missing.length) parts.push(`Missing: ${missing.join(", ")}`);

      parts.push(`Performance: ${page.performance.imageCount} images, ${page.performance.scriptCount} scripts, ${page.performance.potentiallyUnoptimisedImages} potentially unoptimised images`);
    }
    parts.push("");
  }

  // Meta Ad data
  if (data.metaAds?.analysis) {
    const ma = data.metaAds.analysis;
    parts.push("## META AD LIBRARY DATA");
    parts.push(`Total active ads: ${ma.totalActiveAds}`);
    parts.push("");

    if (ma.longestRunningAds?.length) {
      parts.push("### LONGEST RUNNING ADS (likely winners)");
      for (const ad of ma.longestRunningAds) {
        parts.push(`- Running ${ad.daysRunning} days | "${(ad.bodies[0] || "").slice(0, 200)}" | Title: "${(ad.titles[0] || "").slice(0, 100)}"`);
      }
      parts.push("");
    }

    parts.push("### OFFER ANGLES DETECTED IN ADS");
    for (const [angle, present] of Object.entries(ma.offerAngles)) {
      parts.push(`- ${angle}: ${present ? "YES" : "No"}`);
    }
    parts.push("");

    if (Object.keys(ma.ctaDistribution).length) {
      parts.push(`CTA distribution: ${JSON.stringify(ma.ctaDistribution)}`);
    }

    if (Object.keys(ma.landingPageUrls).length) {
      parts.push("### LANDING PAGES FROM ADS");
      for (const [url, count] of Object.entries(ma.landingPageUrls)) {
        parts.push(`- ${url} (${count} ads)`);
      }
    }
    parts.push("");

    if (ma.sampleAdCopy?.length) {
      parts.push("### SAMPLE AD COPY (first 10 ads)");
      for (const copy of ma.sampleAdCopy) {
        parts.push(`- "${copy.slice(0, 300)}"`);
      }
    }
    parts.push("");
  } else {
    parts.push("## META AD LIBRARY DATA");
    parts.push("No Meta ad data available via API (no access token provided).");
    if (data.metaAds?.publicUrl) {
      parts.push(`Public Ad Library URL: ${data.metaAds.publicUrl}`);
      parts.push("The analyst should note this gap and recommend checking the public Ad Library manually. Still provide analysis based on store data alone, and note where ad data would strengthen the analysis.");
    }
    parts.push("");
  }

  // Competitor data
  if (data.competitorAds) {
    parts.push("## COMPETITOR AD DATA");
    for (const [name, compData] of Object.entries(data.competitorAds)) {
      if (compData?.analysis) {
        parts.push(`\n### ${name}`);
        parts.push(`Active ads: ${compData.analysis.totalActiveAds}`);
        parts.push(`Offer angles: ${JSON.stringify(compData.analysis.offerAngles)}`);
        if (compData.analysis.sampleAdCopy?.length) {
          parts.push(`Sample copy: "${compData.analysis.sampleAdCopy[0]?.slice(0, 200)}"`);
        }
      } else {
        parts.push(`\n### ${name}\nNo data available.`);
      }
    }
    parts.push("");
  }

  return parts.join("\n");
}

// ── Output ────────────────────────────────────────────────────

async function saveOutputs(brand, rawData, brief, outputDir) {
  const slug = slugify(brand);
  await fs.mkdir(outputDir, { recursive: true });

  // 1. Raw JSON
  const jsonPath = path.join(outputDir, `${slug}-raw-data.json`);
  await fs.writeFile(jsonPath, JSON.stringify(rawData, null, 2));

  // 2. Markdown brief
  const mdPath = path.join(outputDir, `${slug}-launchpad-brief.md`);
  const mdContent = `# Launchpad Intelligence Brief: ${brand}\n\n_Generated ${new Date().toISOString().split("T")[0]} by Ecomlanders_\n\n---\n\n${brief}`;
  await fs.writeFile(mdPath, mdContent);

  return { jsonPath, mdPath };
}

function printConsoleSummary(brand, rawData, brief) {
  console.log("\n");
  console.log("  ╔═══════════════════════════════════════════════════════════╗");
  console.log("  ║  LAUNCHPAD INTELLIGENCE BRIEF                            ║");
  console.log("  ╚═══════════════════════════════════════════════════════════╝");
  console.log("");
  console.log(`  Brand:           ${brand}`);
  console.log(`  Store:           ${rawData.storeUrl}`);
  console.log(`  Products:        ${rawData.products?.length || 0}`);
  console.log(`  Collections:     ${rawData.collections?.length || 0}`);
  console.log(`  Pages Crawled:   ${rawData.pages?.length || 0}`);
  console.log(`  Apps Detected:   ${rawData.techStack?.apps?.length || 0}`);
  const metaAdCount = rawData.metaAds?.analysis?.totalActiveAds;
  console.log(`  Active Meta Ads: ${metaAdCount || "N/A (no token)"}`);
  if (!metaAdCount && rawData.metaAds?.publicUrl) {
    console.log(`  Ad Library:      ${rawData.metaAds.publicUrl}`);
  }

  // Extract funnel maturity score from brief
  const maturityMatch = brief.match(/(?:funnel\s*maturity|maturity\s*(?:score|rating))[:\s]*(\d+)(?:\s*\/\s*10)?/i);
  if (maturityMatch) {
    console.log(`  Funnel Maturity: ${maturityMatch[1]}/10`);
  }

  // Extract quick wins — look for numbered items or bold headers
  const quickWinsSection = brief.match(/##\s*6\..*?QUICK WINS.*?\n([\s\S]*?)(?=##\s*7\.|$)/i);
  if (quickWinsSection) {
    // Find bold headers like **Enable Yotpo...** or numbered items
    const boldHeaders = quickWinsSection[1].match(/\*\*[^*]+\*\*/g) || [];
    const numberedItems = quickWinsSection[1]
      .split("\n")
      .filter((l) => l.match(/^\d+\.\s/))
      .map((l) => l.replace(/^\d+\.\s*/, "").trim());

    const wins = boldHeaders.length
      ? boldHeaders.slice(0, 3).map((w) => w.replace(/\*\*/g, ""))
      : numberedItems.slice(0, 3);

    if (wins.length) {
      console.log("");
      console.log("  ── Top Quick Wins ──────────────────────────────────────");
      wins.forEach((w, i) => {
        const clean = w.replace(/\*\*/g, "").trim();
        console.log(`  ${i + 1}. ${clean.slice(0, 75)}${clean.length > 75 ? "..." : ""}`);
      });
    }
  }

  // Extract revenue impact
  const revenueSection = brief.match(/## 8\..*?REVENUE.*?\n([\s\S]*?)$/i);
  if (revenueSection) {
    const crMatch = revenueSection[1].match(/(?:improvement|increase|lift).*?(\d+[\.\d]*%?\s*[-–]\s*\d+[\.\d]*%?|\d+[\.\d]*%)/i);
    if (crMatch) {
      console.log("");
      console.log(`  Estimated CR Improvement: ${crMatch[1]}`);
    }
  }

  console.log("");
}

// ── Main ──────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();
  const baseUrl = normalizeStoreUrl(opts.store);
  const brand = opts.brand;
  const outputDir = opts.outputDir;

  console.log("");
  console.log("  ╔═══════════════════════════════════════════════════════════╗");
  console.log("  ║  LAUNCHPAD — Client Intelligence & Gap Analysis          ║");
  console.log("  ║  Ecomlanders · Shopify CRO Agency                       ║");
  console.log("  ╚═══════════════════════════════════════════════════════════╝");
  console.log("");
  console.log(`  Brand: ${brand}`);
  console.log(`  Store: ${baseUrl}`);
  console.log(`  Meta Page ID: ${opts.metaPageId || "Auto-search by brand name"}`);
  if (opts.competitors) console.log(`  Competitors: ${opts.competitors}`);
  console.log("");

  // ── Phase 1: Data Collection ──
  logSection("DATA COLLECTION");

  // 1a. Products
  const products = await collectShopifyProducts(baseUrl);
  const productAnalysis = analyseProducts(products);

  // 1b. Collections
  const collections = await collectShopifyCollections(baseUrl);

  // 1c. Crawl pages
  const pages = await crawlStorefront(baseUrl, products, collections);

  // 1d. Tech stack
  const techStack = detectTechStack(pages);

  // 1e. Meta ads
  const metaAds = await collectMetaAds(brand, opts.metaPageId);

  // 1f. Competitor ads
  const competitorAds = opts.competitors
    ? await collectCompetitorAds(opts.competitors)
    : null;

  logDone("DATA COLLECTION");

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log("⏱️", `Data collection completed in ${elapsed}s`);

  // ── Phase 2: Analysis ──
  logSection("ANALYSIS");

  const collectedData = {
    brand,
    storeUrl: baseUrl,
    products: products.map((p) => ({
      title: p.title,
      handle: p.handle,
      product_type: p.product_type,
      tags: p.tags,
      variants: p.variants?.map((v) => ({
        title: v.title,
        price: v.price,
        compare_at_price: v.compare_at_price,
      })),
    })),
    collections: collections.map((c) => ({
      title: c.title,
      handle: c.handle,
    })),
    productAnalysis,
    pages,
    techStack,
    metaAds,
    competitorAds,
  };

  const brief = await runAnalysis(collectedData);

  logDone("ANALYSIS");

  // ── Phase 3: Output ──
  logSection("OUTPUT");

  const { jsonPath, mdPath } = await saveOutputs(brand, collectedData, brief, outputDir);

  log("📄", `Raw data: ${jsonPath}`);
  log("📋", `Brief:    ${mdPath}`);

  logDone("OUTPUT");

  // ── Console Summary ──
  printConsoleSummary(brand, collectedData, brief);

  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`  ── Generated in ${totalElapsed}s ──────────────────────────────────`);
  console.log("");
}

main().catch((err) => {
  console.error(`\n  ❌  Fatal error: ${err.message}\n`);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
