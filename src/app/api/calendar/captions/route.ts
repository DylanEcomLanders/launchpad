import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

const BASE_SYSTEM_PROMPT = `You write tweets for Dylan, founder of Ecom Landers — a CRO agency that builds landing pages, product pages, and funnels for 6-8 figure Shopify brands.

You are NOT writing LinkedIn frameworks. You are NOT writing thought-leadership essays. You are writing short, punchy X posts that sound like a real operator typing on their phone between calls.

VOICE FUNDAMENTALS:
- Confident, casual, slightly cocky. Calls things out. Has opinions.
- British. Uses "shite", "whack", "knackered", "mental", "proper". UK spelling (optimise, behaviour, prioritise).
- Industry-fluent: CVR%, AOV, RPV, LPs, highlight LPs, listicles, native ads, cold traffic, problem-aware.
- Line breaks between EVERY thought. One idea per line. White space is the format.
- ALL CAPS for emphasis on single words (STILL, PROPERLY, GREAT). Not bold, not italics — caps.
- Sometimes lowercase "i" mid-sentence. Slight informality is fine.
- Closers like "It's very simple", "cheat code for CVR%", "i'll wait...", "Foul behaviour".

WHAT TO WRITE:
- Sharp opinions, hot takes, call-outs (especially against lazy agencies / template pages / AI slop)
- Patterns from real client work ("Thousands of pages later, we still...")
- One-sentence challenges ("Name one serious brand that uses whack template pages")
- Tactical observations from actually building pages (specific design or copy moves)
- Bullet lists when listing markers/qualities of something — short bullets, not sentences

WHAT TO NEVER DO:
- ❌ Made-up stats. NEVER fabricate "+47% AOV" or "18-31% CVR" — only use numbers if explicitly given in the brief.
- ❌ Listicle voice ("The anatomy of...", "5 ways to...", "Hero benefit statement, star ratings above the fold...")
- ❌ NEVER list multiple design elements or tactics inline as a sentence: "Outcome-driven headlines Social proof above the fold Benefit stacking Risk reversal" — this is the WORST possible voice. If you genuinely need to list things, use line-broken bullets only.
- ❌ Course-outline structure (claim → framework → outcome)
- ❌ "Game-changer", "unlock", "leverage", "at the end of the day", "needle-mover"
- ❌ "Here's the thing", "I've been thinking", "Hot take:", "Unpopular opinion:"
- ❌ Em-dashes used as dramatic pauses
- ❌ Polished agency-speak. If it sounds like a LinkedIn post, delete it.
- ❌ Multiple emojis. Zero or one max (📌 or 💵 occasionally).

EXAMPLES OF THE VOICE (study these — match the rhythm, line breaks, and attitude):

Example 1:
"Not something I've mentioned for a while but STILL works wonders on highlight LPs

A mini listicle below the fold

Educate cold audiences in listicle format in one section, which gives you more freedom to sell the offer further down the page

It's a cheat code for CVR%"

Example 2:
"If your product page isn't branded PROPERLY, good luck scaling

Name one serious brand that uses whack template pages, i'll wait..."

Example 3:
"Thousands of pages later and we still make every page completely unique for the brand we're working with.

We've had too many clients recently complain of other agencies spitting out Ai shite and calling it a page. Foul behaviour"

Example 4 (bulleted):
"The markers of a GREAT listicle:

- Warms native ad traffic without feeling like an ad
- Each point builds on the last until the reader has sold themselves
- Feels like content not a pitch so people actually read it
- Keeps readers scrolling with the implied contract of a numbered list
- Meets problem-aware audiences exactly where they are
- Makes the product feel like the inevitable conclusion not a sales goal

📌 And don't be naive, make sure your listicles look good. Great design has proven to increase session time and scroll depth

Set your listicles up correctly and they will print 💵"

Match THIS rhythm and energy. Write like Dylan would actually type it.`;

interface VoiceProfilePayload {
  tone?: string[];
  avoid?: string[];
  rules?: string[];
  examples?: { text: string; platform: string; note?: string }[];
  voiceNotes?: string;
  editHistory?: { original: string; edited: string; platform: string; timestamp: string }[];
}

function buildVoiceBlock(vp: VoiceProfilePayload): string {
  const lines: string[] = ["\n\nVOICE PROFILE:"];
  if (vp.tone && vp.tone.length > 0) lines.push(`Tone: ${vp.tone.join(", ")}`);
  if (vp.avoid && vp.avoid.length > 0) lines.push(`Never: ${vp.avoid.join(", ")}`);
  if (vp.rules && vp.rules.length > 0) {
    lines.push("Rules:");
    vp.rules.forEach(r => lines.push(`- ${r}`));
  }
  if (vp.examples && vp.examples.length > 0) {
    lines.push("Examples of this voice:");
    vp.examples.slice(0, 5).forEach(ex => {
      lines.push(`"${ex.text}" (${ex.platform})`);
    });
  }
  if (vp.voiceNotes?.trim()) {
    lines.push(`Additional voice notes: ${vp.voiceNotes}`);
  }
  const recentEdits = (vp.editHistory || []).slice(0, 5);
  if (recentEdits.length > 0) {
    lines.push("\nThe user edited these AI-generated captions. Learn from the pattern:");
    recentEdits.forEach(e => {
      lines.push(`Original: "${e.original}" → User's version: "${e.edited}"`);
    });
  }
  return lines.join("\n");
}

function getLengthInstructions(length: string, platform: string): string {
  const isX = platform.toLowerCase() === "x";

  switch (length) {
    case "short":
      return isX
        ? "2 short lines max. A bold call-out or sharp observation. Heavy line breaks. Like: 'If your PDP isn't branded PROPERLY, good luck scaling\\n\\nName one serious brand that uses whack template pages, i'll wait...'"
        : "Write 2-3 sentences max. Lead with the insight, one supporting point, done. Tight and punchy.";

    case "long":
      return isX
        ? "4-8 short lines, each on its own line with double line breaks between thoughts. Can include a 4-6 item bulleted list if relevant. NOT one paragraph — chunked, scannable, breath-room between lines. Close with a confident kicker like 'It's a cheat code for CVR%' or 'It's very simple'."
        : "Write 8-15 sentences. Open with a hook that stops the scroll. Develop the argument with specifics — real examples, frameworks, data, lessons learned. Use line breaks between paragraphs for readability. Close with a clear takeaway or perspective. This should be a proper thought-leadership post that someone would save or share.";

    case "medium":
    default:
      return isX
        ? "3-5 short lines, EACH on its own line with double line breaks between them. One observation, one supporting line, one kicker. White space matters. Don't write paragraphs."
        : "Write 4-6 sentences. Lead with the insight, expand with a supporting point or example, close with a takeaway. Professional but direct — no corporate jargon.";
  }
}

export async function POST(req: NextRequest) {
  try {
    const { platforms, platform, contentType, postFormat, brief, imageData, captionLength, voiceProfile } = await req.json();

    // Support both single platform (legacy) and multi-platform
    const targetPlatforms: string[] = platforms || (platform ? [platform] : []);
    const length = captionLength || "medium";

    if (targetPlatforms.length === 0 || !contentType) {
      return NextResponse.json(
        { error: "platforms (or platform) and contentType are required" },
        { status: 400 }
      );
    }

    // Generate captions for each platform
    const results: { platform: string; captions: string[] }[] = [];

    for (const plat of targetPlatforms) {
      const lengthInstructions = getLengthInstructions(length, plat);
      const platformName = plat === "x" ? "X (Twitter)" : "LinkedIn";

      const formatContext = postFormat
        ? `Post format: ${postFormat}. ${postFormat === "image" ? "The caption should complement and describe the image being posted." : postFormat === "article" ? "This is a longer-form article post — the caption should tease the key insight to drive clicks." : "This is a text post — the caption IS the content."}`
        : "";

      const userPrompt = `Write 3 caption variants for a ${platformName} post.

Content type: ${contentType}
${formatContext}
${brief ? `Idea/context: ${brief}` : ""}
${imageData ? "Use the attached image as context — describe what you see and write captions that complement the visual." : ""}

LENGTH INSTRUCTIONS: ${lengthInstructions}

Each variant should take a different angle. NEVER list features or design elements as a horizontal list (e.g. "Outcome-driven headlines Social proof Benefit stacking" — this is the LinkedIn listicle voice we banned). If you list things, they go on separate lines as bullets.

Output format — VERY IMPORTANT:
Separate the 3 variants with the exact delimiter "===NEXT===" on its own line. Use REAL line breaks within each variant (press enter for new lines). Do NOT output JSON. Do NOT number them. Just plain text with line breaks, separated by ===NEXT===.

Example output structure:
First variant text
with real line breaks
between thoughts
===NEXT===
Second variant text
also with line breaks
===NEXT===
Third variant text
same here`;

      const userContent: Anthropic.Messages.ContentBlockParam[] = [];

      if (imageData && (postFormat === "image" || postFormat === "video")) {
        const match = imageData.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
        if (match) {
          userContent.push({
            type: "image",
            source: {
              type: "base64",
              media_type: match[1] as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: match[2],
            },
          });
        }
      }

      userContent.push({ type: "text", text: userPrompt });

      // Build system prompt with optional voice profile
      const systemPrompt = voiceProfile
        ? BASE_SYSTEM_PROMPT + buildVoiceBlock(voiceProfile)
        : BASE_SYSTEM_PROMPT;

      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: "user", content: userContent }],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      const raw = textBlock?.type === "text" ? textBlock.text : "";

      // Parse delimiter-separated variants (preserves newlines reliably)
      let captions: string[] = [];
      if (raw.includes("===NEXT===")) {
        captions = raw
          .split("===NEXT===")
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 3);
      } else {
        // Legacy JSON fallback
        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          try {
            captions = JSON.parse(jsonMatch[0]);
          } catch {
            captions = [];
          }
        }
      }
      results.push({ platform: plat, captions });
    }

    // For backward compatibility, if single platform was requested, also return flat captions array
    if (targetPlatforms.length === 1) {
      return NextResponse.json({
        captions: results[0]?.captions || [],
        variants: results,
      });
    }

    return NextResponse.json({ variants: results });
  } catch (err: any) {
    console.error("Caption generation error:", err);
    return NextResponse.json(
      { error: err?.message || "Caption generation failed" },
      { status: 500 }
    );
  }
}
