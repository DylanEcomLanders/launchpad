import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import * as cheerio from "cheerio";
import { KNOWN_APPS } from "@/data/known-apps";
import type { Finding, StoreIntelResult, PageAuditResult } from "@/lib/store-intel/types";

// ── Config ──────────────────────────────────────────────────────

const MODEL = "claude-sonnet-4-5-20250929";
const MAX_TOKENS = 8000;
const FETCH_TIMEOUT = 15000;
const CRAWL_DELAY = 400;
const MAX_PRODUCTS = 300;

const KNOWN_THEMES = [
  "dawn","impulse","prestige","warehouse","motion","symmetry",
  "empire","testament","pipeline","turbo","flex","debut",
  "minimal","narrative","brooklyn","supply","venture","boundless",
  "cascade","colorblock","craft","crave","origin","ride","refresh",
  "sense","spotlight","studio","taste",
];

const JSON_SCHEMA = `{
  "summary": "2-3 sentence executive summary of the brand's situation and biggest opportunities",
  "funnelMaturity": 5,
  "findings": [
    {
      "category": "cro_gaps",
      "severity": "high",
      "title": "Short actionable title",
      "description": "2-3 sentences. Be specific — reference actual data from the crawl. Make it actionable.",
      "page": "Homepage"
    }
  ]
}`;

const SYSTEM_PROMPT = `You are a senior CRO strategist at Ecomlanders, a Shopify CRO and landing page agency with 8 years of experience in DTC ecommerce. You specialise in conversion rate optimisation, funnel architecture, offer communication, and user psychology.

You have been given data from a brand's Shopify store. Your job is to identify gaps, leaks, and opportunities — categorised into actionable findings.

Respond with ONLY valid JSON matching this schema — no markdown, no commentary, no code fences:

${JSON_SCHEMA}

Category definitions:
- "cro_gaps": Missing conversion elements — weak CTAs, no social proof, poor offer communication, missing urgency/scarcity, no objection handling, funnel leaks
- "quick_wins": Easy fixes implementable in 1-2 weeks — high ROI for minimal effort
- "dev_issues": Technical problems — script bloat, missing meta tags, performance issues, tech stack concerns, broken elements, SEO gaps
- "ux_content": Information hierarchy problems, copy issues, layout problems, mobile UX gaps, poor content structure
- "strategic": Bigger 30-90 day opportunities — new pages to build, funnel restructuring, A/B test ideas, repositioning, AOV plays

Rules:
- Produce 15-25 findings total, well distributed across categories
- EVERY finding must reference specific data from the crawl — never be vague or generic
- Do NOT pad with generic CRO advice. Every insight must be derived from this brand's actual data
- severity: "high" = directly impacting conversion right now, "medium" = meaningful improvement opportunity, "low" = nice-to-have optimisation
- Always include the "page" field identifying which page or area (e.g., "Homepage", "PDP", "Collection pages", "All pages", "Checkout flow")
- funnelMaturity: 1-10 integer with 1 being very basic and 10 being world-class`;

const PAGE_AUDIT_PROMPT = `You are a senior CRO strategist and UX designer at Ecomlanders, a Shopify CRO and landing page agency. A designer on the team is about to start work on a page redesign. Your job is to audit the current page and produce categorised findings.

You have been given detailed HTML analysis data from a single page.

Respond with ONLY valid JSON matching this schema — no markdown, no commentary, no code fences:

{
  "summary": "2-3 sentence assessment of this page's effectiveness and biggest opportunities",
  "effectivenessScore": 5,
  "findings": [
    {
      "category": "cro_gaps",
      "severity": "high",
      "title": "Short actionable title",
      "description": "2-3 sentences referencing actual page elements. Make it actionable for the designer.",
      "page": "Above the Fold"
    }
  ]
}

Category definitions:
- "cro_gaps": Missing conversion/persuasion elements — weak value prop, no social proof, missing trust signals, no urgency
- "quick_wins": Easy design fixes the team can implement quickly — high impact, low effort
- "dev_issues": Technical problems on this page — script bloat, SEO issues, performance, broken elements
- "ux_content": Copy issues (headlines, CTAs, microcopy), information hierarchy, content structure, mobile UX gaps
- "strategic": Bigger redesign opportunities — section restructuring, new content blocks to add, A/B test ideas

Rules:
- Produce 10-18 findings, well distributed across categories
- EVERY finding must reference specific elements found on the page — never generic advice
- severity: "high" = critical for conversion, "medium" = meaningful improvement, "low" = nice-to-have
- "page" field should identify the section (e.g., "Above the Fold", "Product Info", "Social Proof Section", "Footer", "Mobile View")
- effectivenessScore: 1-10 integer`;

// ── Internal Types (crawl-only) ──────────────────────────────────

interface StoreIntelRequest {
  storeUrl: string;
  brandName: string;
  mode?: "store" | "page";
  pageUrl?: string;
}

interface ProductData {
  title: string;
  handle: string;
  product_type: string;
  tags: string;
  variants: { title: string; price: string; compare_at_price: string | null }[];
}

interface CollectionData {
  title: string;
  handle: string;
}

interface PageData {
  url: string;
  title?: string;
  metaDescription?: string;
  h1?: string;
  heroText?: string;
  persuasionElements?: Record<string, boolean>;
  performance?: { imageCount: number; scriptCount: number };
  error?: string;
}

interface TechStack {
  apps: { name: string; type: string }[];
  theme: string;
  isCustomTheme: boolean;
}

interface ProductAnalysisInternal {
  totalProducts: number;
  priceRange: { min: number; max: number; median: number; average: number };
  discounting: { count: number; percent: string; avgDiscount: string };
  productTypes: Record<string, number>;
  multiVariantPercent: string;
}

// ── Helpers ─────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, options: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        ...options.headers,
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeUrl(url: string) {
  let u = url.trim().replace(/\/+$/, "");
  if (!u.startsWith("http")) u = "https://" + u;
  return u;
}

// ── Data Collection ─────────────────────────────────────────────

async function fetchProducts(baseUrl: string): Promise<ProductData[]> {
  const all: ProductData[] = [];
  let page = 1;
  while (true) {
    try {
      const res = await fetchWithTimeout(`${baseUrl}/products.json?limit=250&page=${page}`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) break;
      const data = await res.json();
      if (!data.products?.length) break;
      all.push(
        ...data.products.map((p: any) => ({
          title: p.title,
          handle: p.handle,
          product_type: p.product_type || "",
          tags: p.tags || "",
          variants: (p.variants || []).map((v: any) => ({
            title: v.title,
            price: v.price,
            compare_at_price: v.compare_at_price,
          })),
        }))
      );
      if (data.products.length < 250 || all.length >= MAX_PRODUCTS) break;
      page++;
      await delay(CRAWL_DELAY);
    } catch {
      break;
    }
  }
  return all.slice(0, MAX_PRODUCTS);
}

async function fetchCollections(baseUrl: string): Promise<CollectionData[]> {
  try {
    const res = await fetchWithTimeout(`${baseUrl}/collections.json?limit=250`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.collections || []).map((c: any) => ({
      title: c.title,
      handle: c.handle,
    }));
  } catch {
    return [];
  }
}

async function crawlPage(url: string): Promise<PageData> {
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) return { url, error: `HTTP ${res.status}` };
    const html = await res.text();
    const $ = cheerio.load(html);

    const title = $("title").text().trim();
    const metaDesc = $('meta[name="description"]').attr("content") || "";
    const h1 = $("h1").first().text().trim();
    const heroText = $(
      ".hero__title, .banner__heading, [class*='hero'] h1, [class*='hero'] h2, [class*='banner'] h1"
    ).first().text().trim();

    const pe = {
      reviews: !!$('[class*="review"], [class*="rating"], .spr-summary, .jdgm-widget, .yotpo-widget').length,
      trustBadges: !!$('[class*="trust"], [class*="badge"], [class*="guarantee"], [alt*="trust"]').length,
      urgency: !!$('[class*="urgency"], [class*="countdown"], [class*="timer"], [class*="limited"]').length,
      faq: !!$('[class*="faq"], [class*="accordion"], details summary').length,
      bundles: !!$('[class*="bundle"], [class*="upsell"], [class*="cross-sell"]').length,
      socialProof: !!$('[class*="testimonial"], [class*="social-proof"], [class*="as-seen"]').length,
      video: !!$("video, iframe[src*='youtube'], iframe[src*='vimeo']").length,
      stickyATC: !!$('[class*="sticky"] [class*="add-to-cart"], [class*="sticky-atc"]').length,
    };

    // Collect scripts for tech detection
    const scriptSrcs: string[] = [];
    $("script[src]").each((_, el) => { scriptSrcs.push($(el).attr("src") || ""); });
    const inlineScripts: string[] = [];
    $("script:not([src])").each((_, el) => { inlineScripts.push(($(el).html() || "").slice(0, 500)); });
    const linkHrefs: string[] = [];
    $("link[href]").each((_, el) => { linkHrefs.push($(el).attr("href") || ""); });

    return {
      url,
      title,
      metaDescription: metaDesc,
      h1,
      heroText: heroText || h1,
      persuasionElements: pe,
      performance: { imageCount: $("img").length, scriptCount: $("script").length },
      // Attach raw sources for tech detection (not sent to client)
      _scriptSrcs: scriptSrcs,
      _inlineScripts: inlineScripts,
      _linkHrefs: linkHrefs,
    } as any;
  } catch (err: any) {
    return { url, error: err.message };
  }
}

async function crawlStore(
  baseUrl: string,
  products: ProductData[],
  collections: CollectionData[]
): Promise<PageData[]> {
  const pages: PageData[] = [];

  // Homepage
  pages.push(await crawlPage(baseUrl));
  await delay(CRAWL_DELAY);

  // Top 6 collections
  for (const col of collections.slice(0, 6)) {
    pages.push(await crawlPage(`${baseUrl}/collections/${col.handle}`));
    await delay(CRAWL_DELAY);
  }

  // Top 10 products
  for (const prod of products.slice(0, 10)) {
    pages.push(await crawlPage(`${baseUrl}/products/${prod.handle}`));
    await delay(CRAWL_DELAY);
  }

  // Common landing pages
  const landingPaths = [
    "/pages/about","/pages/about-us","/pages/faq","/pages/reviews",
    "/pages/shipping","/pages/returns","/pages/contact",
  ];
  for (const p of landingPaths) {
    try {
      const res = await fetchWithTimeout(`${baseUrl}${p}`, { method: "HEAD" });
      if (res.ok) {
        pages.push(await crawlPage(`${baseUrl}${p}`));
      }
    } catch { /* skip */ }
    await delay(200);
  }

  return pages;
}

function detectTechStack(pages: PageData[]): TechStack {
  const detectedApps = new Map<string, { name: string; type: string }>();
  let theme: string | null = null;

  for (const page of pages) {
    const raw = page as any;
    if (raw.error) continue;
    const allSrc = [
      ...(raw._scriptSrcs || []),
      ...(raw._linkHrefs || []),
      ...(raw._inlineScripts || []),
    ].join(" ").toLowerCase();

    for (const [key, app] of Object.entries(KNOWN_APPS)) {
      if (allSrc.includes(key)) detectedApps.set(app.name, app);
    }

    if (!theme) {
      for (const t of KNOWN_THEMES) {
        if (allSrc.includes(`/${t}/`) || allSrc.includes(`themes/${t}`)) {
          theme = t.charAt(0).toUpperCase() + t.slice(1);
          break;
        }
      }
      for (const script of raw._inlineScripts || []) {
        const m = script.match(/Shopify\.theme\s*=\s*\{[^}]*"name"\s*:\s*"([^"]+)"/);
        if (m) { theme = m[1]; break; }
      }
    }
  }

  return {
    apps: Array.from(detectedApps.values()),
    theme: theme || "Unknown (possibly custom)",
    isCustomTheme: theme ? !KNOWN_THEMES.includes(theme.toLowerCase()) : true,
  };
}

function analyseProducts(products: ProductData[]): ProductAnalysisInternal | null {
  if (!products.length) return null;
  const prices = products
    .map((p) => parseFloat(p.variants?.[0]?.price || "0"))
    .filter((p) => p > 0);
  if (!prices.length) return null;

  const sorted = [...prices].sort((a, b) => a - b);
  const compareAts = products.filter((p) => p.variants?.[0]?.compare_at_price);
  const discountAvg =
    compareAts.length > 0
      ? compareAts.reduce((sum, p) => {
          const price = parseFloat(p.variants[0].price);
          const comp = parseFloat(p.variants[0].compare_at_price!);
          return sum + ((comp - price) / comp) * 100;
        }, 0) / compareAts.length
      : 0;

  const types: Record<string, number> = {};
  products.forEach((p) => {
    const t = p.product_type || "Uncategorised";
    types[t] = (types[t] || 0) + 1;
  });

  const multiVar = products.filter((p) => (p.variants?.length || 0) > 1).length;

  return {
    totalProducts: products.length,
    priceRange: {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median: sorted[Math.floor(sorted.length / 2)],
      average: prices.reduce((a, b) => a + b, 0) / prices.length,
    },
    discounting: {
      count: compareAts.length,
      percent: ((compareAts.length / products.length) * 100).toFixed(1) + "%",
      avgDiscount: discountAvg.toFixed(1) + "%",
    },
    productTypes: types,
    multiVariantPercent: ((multiVar / products.length) * 100).toFixed(1) + "%",
  };
}

// ── Deep single-page crawl ──────────────────────────────────────

async function deepCrawlPage(url: string) {
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`Failed to fetch page: HTTP ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);

  const title = $("title").text().trim();
  const metaDesc = $('meta[name="description"]').attr("content") || "";
  const h1 = $("h1").first().text().trim();
  const heroText = $(
    ".hero__title, .banner__heading, [class*='hero'] h1, [class*='hero'] h2, [class*='banner'] h1, [class*='hero'] p"
  ).first().text().trim();

  // All headings for structure
  const headingStructure: string[] = [];
  $("h1, h2, h3, h4").each((_, el) => {
    const tag = (el as any).tagName;
    const text = $(el).text().trim().slice(0, 120);
    if (text) headingStructure.push(`${tag}: ${text}`);
  });

  // CTAs
  const ctas: string[] = [];
  $("a, button").each((_, el) => {
    const text = $(el).text().trim();
    const href = $(el).attr("href") || "";
    const cls = $(el).attr("class") || "";
    if (
      text.length > 1 && text.length < 60 &&
      (cls.match(/btn|button|cta|add-to-cart|atc|shopify-payment/i) ||
       href.includes("/cart") || href.includes("checkout") ||
       text.match(/add to|buy|shop|get|order|subscribe|sign up|learn more/i))
    ) {
      ctas.push(text);
    }
  });

  // Persuasion elements
  const pe = {
    reviews: !!$('[class*="review"], [class*="rating"], .spr-summary, .jdgm-widget, .yotpo-widget, [class*="star"]').length,
    trustBadges: !!$('[class*="trust"], [class*="badge"], [class*="guarantee"], [alt*="trust"], [class*="secure"]').length,
    urgency: !!$('[class*="urgency"], [class*="countdown"], [class*="timer"], [class*="limited"], [class*="stock"]').length,
    faq: !!$('[class*="faq"], [class*="accordion"], details summary, [class*="question"]').length,
    bundles: !!$('[class*="bundle"], [class*="upsell"], [class*="cross-sell"], [class*="frequently-bought"]').length,
    socialProof: !!$('[class*="testimonial"], [class*="social-proof"], [class*="as-seen"], [class*="press"], [class*="featured-in"]').length,
    video: !!$("video, iframe[src*='youtube'], iframe[src*='vimeo']").length,
    stickyATC: !!$('[class*="sticky"] [class*="add-to-cart"], [class*="sticky-atc"], [class*="sticky-bar"]').length,
    guarantee: !!$('[class*="guarantee"], [class*="money-back"], [class*="risk-free"]').length,
    shipping: !!$('[class*="shipping"], [class*="delivery"], [class*="free-shipping"]').length,
    comparison: !!$('[class*="compare"], [class*="versus"], table[class*="comparison"]').length,
    announcement: !!$('[class*="announcement"], [class*="top-bar"], [class*="promo-bar"]').length,
  };

  // Word count (visible text)
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = bodyText.split(/\s+/).length;

  // Links
  let internalLinks = 0;
  let externalLinks = 0;
  const baseHost = new URL(url).hostname;
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    try {
      if (href.startsWith("/") || href.startsWith("#") || new URL(href).hostname === baseHost) {
        internalLinks++;
      } else {
        externalLinks++;
      }
    } catch {
      internalLinks++;
    }
  });

  // Forms
  const formCount = $("form").length;

  // Videos
  const videoCount = $("video, iframe[src*='youtube'], iframe[src*='vimeo']").length;

  // Scripts for tech detection
  const scriptSrcs: string[] = [];
  $("script[src]").each((_, el) => { scriptSrcs.push($(el).attr("src") || ""); });
  const inlineScripts: string[] = [];
  $("script:not([src])").each((_, el) => { inlineScripts.push(($(el).html() || "").slice(0, 500)); });
  const linkHrefs: string[] = [];
  $("link[href]").each((_, el) => { linkHrefs.push($(el).attr("href") || ""); });

  // Tech detection
  const allSrc = [...scriptSrcs, ...linkHrefs, ...inlineScripts].join(" ").toLowerCase();
  const detectedApps = new Map<string, { name: string; type: string }>();
  for (const [key, app] of Object.entries(KNOWN_APPS)) {
    if (allSrc.includes(key)) detectedApps.set(app.name, app);
  }
  let theme: string | null = null;
  for (const t of KNOWN_THEMES) {
    if (allSrc.includes(`/${t}/`) || allSrc.includes(`themes/${t}`)) {
      theme = t.charAt(0).toUpperCase() + t.slice(1);
      break;
    }
  }
  for (const script of inlineScripts) {
    const m = script.match(/Shopify\.theme\s*=\s*\{[^}]*"name"\s*:\s*"([^"]+)"/);
    if (m) { theme = m[1]; break; }
  }

  // Detect page type
  let pageType = "Landing Page";
  if (url.includes("/products/")) pageType = "Product Page (PDP)";
  else if (url.includes("/collections/")) pageType = "Collection Page";
  else if (url.match(/\/$|\/\?/) || url.match(/\.(com|co\.uk|shop|store|io)\/?$/)) pageType = "Homepage";
  else if (url.includes("/pages/")) pageType = "Info/Landing Page";
  else if (url.includes("/cart")) pageType = "Cart Page";
  else if (url.includes("/blogs/") || url.includes("/blog")) pageType = "Blog Page";

  return {
    title,
    metaDescription: metaDesc,
    h1,
    heroText: heroText || h1,
    headingStructure,
    ctas: [...new Set(ctas)],
    persuasionElements: pe,
    imageCount: $("img").length,
    scriptCount: $("script").length,
    wordCount,
    forms: formCount,
    videos: videoCount,
    links: { internal: internalLinks, external: externalLinks },
    apps: Array.from(detectedApps.values()),
    theme: theme || "Unknown (possibly custom)",
    isCustomTheme: theme ? !KNOWN_THEMES.includes(theme.toLowerCase()) : true,
    pageType,
    bodyTextSample: bodyText.slice(0, 3000),
  };
}

function buildPageAuditPrompt(url: string, data: Awaited<ReturnType<typeof deepCrawlPage>>): string {
  const parts: string[] = [];
  parts.push(`# PAGE AUDIT: ${url}`);
  parts.push(`Page type: ${data.pageType}`);
  parts.push(`Title: ${data.title}`);
  if (data.metaDescription) parts.push(`Meta description: ${data.metaDescription}`);
  parts.push(`H1: ${data.h1}`);
  if (data.heroText && data.heroText !== data.h1) parts.push(`Hero text: ${data.heroText}`);
  parts.push("");

  parts.push("## HEADING STRUCTURE");
  data.headingStructure.forEach((h) => parts.push(`- ${h}`));
  parts.push("");

  parts.push("## CTAs FOUND");
  if (data.ctas.length) {
    data.ctas.forEach((c) => parts.push(`- "${c}"`));
  } else {
    parts.push("No clear CTAs detected");
  }
  parts.push("");

  parts.push("## PERSUASION ELEMENTS");
  const present = Object.entries(data.persuasionElements).filter(([, v]) => v).map(([k]) => k);
  const missing = Object.entries(data.persuasionElements).filter(([, v]) => !v).map(([k]) => k);
  parts.push(`Present: ${present.length ? present.join(", ") : "NONE"}`);
  parts.push(`Missing: ${missing.length ? missing.join(", ") : "All present"}`);
  parts.push("");

  parts.push("## PAGE STATS");
  parts.push(`Word count: ${data.wordCount}`);
  parts.push(`Images: ${data.imageCount}`);
  parts.push(`Scripts: ${data.scriptCount}`);
  parts.push(`Forms: ${data.forms}`);
  parts.push(`Videos: ${data.videos}`);
  parts.push(`Internal links: ${data.links.internal}, External links: ${data.links.external}`);
  parts.push("");

  parts.push("## TECH STACK");
  parts.push(`Theme: ${data.theme}`);
  if (data.apps.length) {
    data.apps.forEach((a) => parts.push(`- ${a.name}: ${a.type}`));
  }
  parts.push("");

  parts.push("## PAGE CONTENT SAMPLE (first ~3000 chars of visible text)");
  parts.push(data.bodyTextSample);

  return parts.join("\n");
}

// ── Build prompt ────────────────────────────────────────────────

function buildDataPrompt(
  brand: string,
  storeUrl: string,
  products: ProductData[],
  collections: CollectionData[],
  pages: PageData[],
  techStack: TechStack,
  productAnalysis: ProductAnalysisInternal | null
): string {
  const parts: string[] = [];
  parts.push(`# BRAND: ${brand}\n# STORE: ${storeUrl}\n`);

  if (productAnalysis) {
    parts.push("## PRODUCT DATA");
    parts.push(`Total: ${productAnalysis.totalProducts}`);
    parts.push(`Price range: $${productAnalysis.priceRange.min.toFixed(2)} – $${productAnalysis.priceRange.max.toFixed(2)}`);
    parts.push(`Median: $${productAnalysis.priceRange.median.toFixed(2)}, Average: $${productAnalysis.priceRange.average.toFixed(2)}`);
    parts.push(`Discounted: ${productAnalysis.discounting.count} (${productAnalysis.discounting.percent}), avg discount: ${productAnalysis.discounting.avgDiscount}`);
    parts.push(`Multi-variant: ${productAnalysis.multiVariantPercent}`);
    parts.push(`Types: ${JSON.stringify(productAnalysis.productTypes)}\n`);
  }

  if (products.length) {
    parts.push("## TOP PRODUCTS");
    products.slice(0, 15).forEach((p) => {
      const price = p.variants?.[0]?.price || "N/A";
      const comp = p.variants?.[0]?.compare_at_price;
      parts.push(`- ${p.title} | $${price}${comp ? ` (was $${comp})` : ""} | ${p.product_type || "N/A"}`);
    });
    parts.push("");
  }

  if (collections.length) {
    parts.push("## COLLECTIONS");
    collections.slice(0, 12).forEach((c) => parts.push(`- ${c.title}`));
    parts.push("");
  }

  parts.push("## TECH STACK");
  parts.push(`Theme: ${techStack.theme} (${techStack.isCustomTheme ? "Custom" : "Off-the-shelf"})`);
  if (techStack.apps.length) {
    techStack.apps.forEach((a) => parts.push(`- ${a.name}: ${a.type}`));
  } else {
    parts.push("No major apps detected.");
  }
  parts.push("");

  if (pages.length) {
    parts.push("## CRAWLED PAGES");
    pages.forEach((page) => {
      if (page.error) {
        parts.push(`\n### ${page.url}\nError: ${page.error}`);
        return;
      }
      parts.push(`\n### ${page.url}`);
      if (page.title) parts.push(`Title: ${page.title}`);
      if (page.metaDescription) parts.push(`Meta: ${page.metaDescription.slice(0, 200)}`);
      if (page.heroText) parts.push(`Hero/H1: ${page.heroText.slice(0, 200)}`);
      if (page.persuasionElements) {
        const present = Object.entries(page.persuasionElements).filter(([, v]) => v).map(([k]) => k);
        const missing = Object.entries(page.persuasionElements).filter(([, v]) => !v).map(([k]) => k);
        if (present.length) parts.push(`Present: ${present.join(", ")}`);
        if (missing.length) parts.push(`Missing: ${missing.join(", ")}`);
      }
      if (page.performance) {
        parts.push(`Perf: ${page.performance.imageCount} images, ${page.performance.scriptCount} scripts`);
      }
    });
  }

  return parts.join("\n");
}

// ── JSON response parser ────────────────────────────────────────

function parseJsonResponse(raw: string): {
  summary: string;
  funnelMaturity?: number;
  effectivenessScore?: number;
  findings: Finding[];
} {
  // Strip code fences if Claude wraps in ```json ... ```
  let text = raw.trim();
  text = text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

  try {
    return JSON.parse(text);
  } catch {
    // Try to extract JSON between first { and last }
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        // Fall through
      }
    }

    // Complete fallback — return raw text as a single finding
    return {
      summary: "Analysis complete but structured parsing failed.",
      funnelMaturity: 0,
      effectivenessScore: 0,
      findings: [
        {
          category: "strategic",
          severity: "medium",
          title: "Raw Analysis Output",
          description: raw.slice(0, 500),
          page: "All",
        },
      ],
    };
  }
}

// ── Route Handler ───────────────────────────────────────────────

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Missing ANTHROPIC_API_KEY — add it to .env.local" },
      { status: 500 }
    );
  }

  try {
    const body: StoreIntelRequest = await request.json();
    const mode = body.mode || "store";

    // ── Single Page Audit ────────────────────────────────────
    if (mode === "page") {
      const pageUrl = body.pageUrl?.trim();
      if (!pageUrl) {
        return NextResponse.json({ error: "Page URL is required" }, { status: 400 });
      }

      const normalised = normalizeUrl(pageUrl);
      const data = await deepCrawlPage(normalised);

      const anthropic = new Anthropic();
      const prompt = buildPageAuditPrompt(normalised, data);

      const res = await anthropic.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: PAGE_AUDIT_PROMPT,
        messages: [{ role: "user", content: `Audit this page and produce categorised findings.\n\n${prompt}` }],
      });

      const rawText = res.content[0]?.type === "text" ? res.content[0].text : "{}";
      const parsed = parseJsonResponse(rawText);

      const result: PageAuditResult = {
        mode: "page",
        pageUrl: normalised,
        pageType: data.pageType,
        title: data.title,
        appsDetected: data.apps.map((a) => `${a.name} (${a.type})`),
        theme: `${data.theme}${data.isCustomTheme ? " — Custom" : ""}`,
        summary: parsed.summary || "Analysis complete.",
        effectivenessScore: parsed.effectivenessScore ?? parsed.funnelMaturity ?? 0,
        findings: parsed.findings || [],
        elements: {
          h1: data.h1,
          heroText: data.heroText,
          ctaCount: data.ctas.length,
          ctas: data.ctas,
          imageCount: data.imageCount,
          scriptCount: data.scriptCount,
          wordCount: data.wordCount,
          headingStructure: data.headingStructure,
          persuasionElements: data.persuasionElements,
          forms: data.forms,
          videos: data.videos,
          links: data.links,
        },
      };

      return NextResponse.json(result);
    }

    // ── Full Store Analysis ──────────────────────────────────
    if (!body.storeUrl?.trim()) {
      return NextResponse.json({ error: "Store URL is required" }, { status: 400 });
    }
    if (!body.brandName?.trim()) {
      return NextResponse.json({ error: "Brand name is required" }, { status: 400 });
    }

    const baseUrl = normalizeUrl(body.storeUrl);
    const brand = body.brandName.trim();

    // Collect data
    const products = await fetchProducts(baseUrl);
    const collections = await fetchCollections(baseUrl);
    const pages = await crawlStore(baseUrl, products, collections);
    const techStack = detectTechStack(pages);
    const productAnalysis = analyseProducts(products);

    // Clean pages for response (strip internal fields)
    const cleanPages = pages.map((p) => {
      const { _scriptSrcs, _inlineScripts, _linkHrefs, ...clean } = p as any;
      return clean as PageData;
    });

    // Run Claude analysis
    const anthropic = new Anthropic();
    const dataPrompt = buildDataPrompt(brand, baseUrl, products, collections, cleanPages, techStack, productAnalysis);

    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Analyse this brand and produce categorised findings.\n\n${dataPrompt}` }],
    });

    const rawText = res.content[0]?.type === "text" ? res.content[0].text : "{}";
    const parsed = parseJsonResponse(rawText);

    const result: StoreIntelResult = {
      brand,
      storeUrl: baseUrl,
      products: products.length,
      collections: collections.length,
      pagesCrawled: cleanPages.length,
      appsDetected: techStack.apps.map((a) => `${a.name} (${a.type})`),
      theme: `${techStack.theme}${techStack.isCustomTheme ? " — Custom" : ""}`,
      summary: parsed.summary || "Analysis complete.",
      funnelMaturity: parsed.funnelMaturity ?? 0,
      findings: parsed.findings || [],
      productAnalysis,
    };

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = err && typeof err === "object" && "status" in err ? (err as { status: number }).status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
