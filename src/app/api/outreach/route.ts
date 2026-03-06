import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import * as cheerio from "cheerio";

// ── Config ──────────────────────────────────────────────────────

const MODEL = "claude-sonnet-4-5-20250929";
const MAX_TOKENS = 4000;
const FETCH_TIMEOUT = 10000;

// ── Types ───────────────────────────────────────────────────────

type OutreachType = "cold-email" | "follow-up" | "loom-script" | "linkedin-dm";
type ToneType = "professional" | "casual" | "direct";

interface OutreachRequest {
  brandName: string;
  contactName?: string;
  storeUrl?: string;
  findings: string;
  outreachType: OutreachType;
  tone: ToneType;
}

// ── Helpers ─────────────────────────────────────────────────────

function normalizeUrl(raw: string): string {
  let url = raw.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  return url;
}

async function fetchWithTimeout(
  url: string,
  opts: RequestInit = {},
  timeout = FETCH_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function lightweightCrawl(storeUrl: string): Promise<string> {
  const baseUrl = normalizeUrl(storeUrl);
  const parts: string[] = [];

  // 1. Fetch homepage — extract basics
  try {
    const res = await fetchWithTimeout(baseUrl);
    if (res.ok) {
      const html = await res.text();
      const $ = cheerio.load(html);

      const title = $("title").text().trim();
      const h1 = $("h1").first().text().trim();
      const metaDesc =
        $('meta[name="description"]').attr("content")?.trim() || "";

      if (title) parts.push(`Homepage title: ${title}`);
      if (h1) parts.push(`H1: ${h1}`);
      if (metaDesc) parts.push(`Meta description: ${metaDesc}`);

      // Detect a few key apps from script sources
      const scripts = $("script[src]")
        .map((_, el) => $(el).attr("src") || "")
        .get();
      const detected: string[] = [];
      const checks: Record<string, string> = {
        klaviyo: "Klaviyo",
        recharge: "ReCharge",
        "judge.me": "Judge.me",
        judgeme: "Judge.me",
        yotpo: "Yotpo",
        okendo: "Okendo",
        rebuy: "Rebuy",
        hotjar: "Hotjar",
        loox: "Loox",
        privy: "Privy",
        attentive: "Attentive",
        gorgias: "Gorgias",
        triplewhale: "Triple Whale",
        elevar: "Elevar",
      };
      for (const src of scripts) {
        const lower = src.toLowerCase();
        for (const [key, name] of Object.entries(checks)) {
          if (lower.includes(key) && !detected.includes(name)) {
            detected.push(name);
          }
        }
      }
      if (detected.length > 0)
        parts.push(`Apps detected: ${detected.join(", ")}`);
    }
  } catch {
    /* skip */
  }

  // 2. Quick products.json check
  try {
    const res = await fetchWithTimeout(`${baseUrl}/products.json?limit=10`, {
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const data = await res.json();
      const products = data.products || [];
      parts.push(`Products found: ${products.length}+`);
      if (products.length > 0) {
        const prices = products
          .map((p: Record<string, unknown>) => {
            const variants = p.variants as Array<Record<string, unknown>> | undefined;
            return parseFloat(String(variants?.[0]?.price || "0"));
          })
          .filter((p: number) => p > 0);
        if (prices.length) {
          parts.push(
            `Price range: $${Math.min(...prices)} – $${Math.max(...prices)}`
          );
        }
        parts.push(
          `Top products: ${products
            .slice(0, 3)
            .map((p: Record<string, unknown>) => p.title)
            .join(", ")}`
        );
      }
    }
  } catch {
    /* skip */
  }

  return parts.length > 0
    ? parts.join("\n")
    : "Could not crawl store — use findings provided by user.";
}

// ── System prompt ───────────────────────────────────────────────

function buildSystemPrompt(
  outreachType: OutreachType,
  tone: ToneType
): string {
  const base = `You are a senior business development specialist at Ecomlanders, a Shopify CRO and landing page agency. You write outreach that gets replies — not generic sales spam.

Your agency's positioning:
- Specialises in conversion rate optimisation and landing pages for Shopify brands
- Works with growing DTC brands doing £500k–£50M/year
- Known for data-driven approach — always leads with specific findings, not vague promises
- Tone is confident but not pushy. You're a peer sharing insights, not a vendor begging for business

Key principles:
- LEAD WITH VALUE — share a specific insight about their store before asking for anything
- Reference actual findings/pain points provided in the brief
- One clear CTA — never multiple asks
- Sound like a real human, not a template
- Never use "I hope this email finds you well" or similar filler
- Never use buzzwords like "synergy", "leverage", "game-changer"`;

  const typeInstructions: Record<OutreachType, string> = {
    "cold-email": `
FORMAT: Cold Email
- Subject line: max 6 words, curiosity-driven, no clickbait, no ALL CAPS
- Opening line: hook with a specific finding about their store
- Body: 2-3 sentences expanding on the pain point with a CRO lens
- Brief credibility line (not boasting — results-oriented)
- Soft CTA: suggest a quick chat or free audit, not "book a demo"
- Total body: 100-150 words MAX
- Sign off as "Dylan" from Ecomlanders`,

    "follow-up": `
FORMAT: Follow-up Email
- Subject line: reference the previous email, max 6 words
- Shorter and more casual than the cold email
- Lead with ONE new insight or a different angle on the original pain point
- Acknowledge they're busy — don't guilt-trip
- Shorter CTA
- Total body: 60-100 words MAX
- Sign off as "Dylan" from Ecomlanders`,

    "loom-script": `
FORMAT: Loom Video Script
- No subject line needed
- Structure the script with clear sections:

[INTRO] (5-10 seconds)
Who you are, why you recorded this personal video for them

[SCREEN SHARE POINT 1]
What to show on their site + what to say about it

[SCREEN SHARE POINT 2]
Another area of their site + what to say

[SCREEN SHARE POINT 3]
Third finding + what to say

[CLOSE] (10 seconds)
CTA and sign-off — keep it casual

- Write conversationally, as if speaking out loud
- Include [SHOW: ...] notes for what to display on screen
- Reference specific pages/sections of their store
- Keep total script under 90 seconds when read aloud`,

    "linkedin-dm": `
FORMAT: LinkedIn DM
- No subject line needed
- ULTRA short — max 3-4 sentences
- For connection request: must be under 300 characters total
- Open with one specific observation about their store — show you've looked
- No formal greeting or sign-off
- CTA: suggest connecting or a quick chat
- Write as if texting a professional contact, not writing an email`,
  };

  const toneInstructions: Record<ToneType, string> = {
    professional: `
TONE: Professional
- Structured and polished
- Uses industry terminology naturally
- Slightly formal closings ("Best regards", "Looking forward to connecting")
- Measured and data-focused`,

    casual: `
TONE: Casual
- Conversational and warm
- Uses contractions freely
- Informal closings ("Cheers", "Chat soon")
- Feels like a message from a friend who happens to know CRO`,

    direct: `
TONE: Direct
- Punchy and no-nonsense
- Gets to the point in the first line
- Numbers-focused — leads with data and specifics
- Minimal padding between points
- Short sentences`,
  };

  return `${base}
${typeInstructions[outreachType]}
${toneInstructions[tone]}

RESPONSE FORMAT:
Return a JSON object with exactly this structure:
{
  "subjectLine": "Subject line here",
  "body": "The full outreach copy here"
}

Rules:
- subjectLine should be null for loom-script and linkedin-dm types
- body should use markdown for any formatting (bold, headers, etc.)
- Only return the raw JSON object — no code fences, no extra text`;
}

// ── Route handler ───────────────────────────────────────────────

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  let body: OutreachRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { brandName, contactName, storeUrl, findings, outreachType, tone } =
    body;

  if (!brandName?.trim()) {
    return NextResponse.json(
      { error: "Brand name is required" },
      { status: 400 }
    );
  }
  if (!findings?.trim()) {
    return NextResponse.json(
      { error: "Findings / pain points are required" },
      { status: 400 }
    );
  }

  const validTypes: OutreachType[] = [
    "cold-email",
    "follow-up",
    "loom-script",
    "linkedin-dm",
  ];
  const validTones: ToneType[] = ["professional", "casual", "direct"];

  if (!validTypes.includes(outreachType)) {
    return NextResponse.json(
      { error: "Invalid outreach type" },
      { status: 400 }
    );
  }
  if (!validTones.includes(tone)) {
    return NextResponse.json({ error: "Invalid tone" }, { status: 400 });
  }

  // Lightweight crawl if URL provided
  let storeContext: string | undefined;
  if (storeUrl?.trim()) {
    try {
      storeContext = await lightweightCrawl(storeUrl);
    } catch {
      storeContext = "Store crawl failed — using provided findings only.";
    }
  }

  // Build user message
  const messageParts: string[] = [];
  messageParts.push(`Brand: ${brandName.trim()}`);
  if (contactName?.trim()) messageParts.push(`Contact: ${contactName.trim()}`);
  if (storeUrl?.trim()) messageParts.push(`Store: ${normalizeUrl(storeUrl)}`);
  if (storeContext) {
    messageParts.push(`\n## STORE CRAWL FINDINGS\n${storeContext}`);
  }
  messageParts.push(`\n## KEY FINDINGS / PAIN POINTS\n${findings.trim()}`);
  messageParts.push(
    `\nGenerate a ${outreachType.replace(/-/g, " ")} with a ${tone} tone.`
  );

  try {
    const anthropic = new Anthropic();
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: buildSystemPrompt(outreachType, tone),
      messages: [{ role: "user", content: messageParts.join("\n") }],
    });

    const raw =
      res.content[0]?.type === "text" ? res.content[0].text : "";

    // Strip markdown code fences if present
    const cleaned = raw
      .replace(/^```(?:json)?\s*\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .trim();

    let parsed: { subjectLine?: string | null; body?: string };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // If JSON parsing fails, treat the whole response as the body
      parsed = { subjectLine: null, body: raw };
    }

    return NextResponse.json({
      outreachType,
      tone,
      brandName: brandName.trim(),
      storeUrl: storeUrl?.trim() || null,
      storeContext: storeContext || null,
      subjectLine: parsed.subjectLine || null,
      body: parsed.body || raw,
    });
  } catch (err) {
    console.error("Outreach generation failed:", err);
    return NextResponse.json(
      { error: "Failed to generate outreach — please try again" },
      { status: 500 }
    );
  }
}
