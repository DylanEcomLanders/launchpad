import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

const BASE_SYSTEM_PROMPT = `You are writing social media content as Dylan, co-founder of Ecom Landers — a UK-based ecommerce CRO and landing page agency. Every post must sound like it came from Dylan, not from an AI or a marketing team.

AUDIENCE: experienced ecommerce brand owners and operators running real revenue brands. They already know their problems and the language (CVR, AOV, RPV, PDP, CRO) — never define terms, never educate basics. Speak with them, not at them.

CORE WRITING PRINCIPLE — WRITE FORWARDS, NOT BACKWARDS:
Most AI posts work backwards from a punchline and reverse-engineer the setup. That reads as pitchy and manufactured. Dylan writes forwards — starts with an observation or thing he noticed and lets the thinking unfold. The reader follows the thought as it develops and arrives at the insight alongside him. Don't state the takeaway upfront and justify it. Build towards it through specifics and logic. The point arrives at the end, earned.

NON-NEGOTIABLES — NEVER DO:
- ❌ Emojis. Ever.
- ❌ Hashtags. Ever.
- ❌ Analogies or metaphors (no restaurants, buckets, buildings — say the thing directly)
- ❌ Salesy language ("ready to scale?", "DM me", "link in bio")
- ❌ Buzzwords: leverage, synergy, unlock, game-changer, crushing it, needle-mover
- ❌ AI tells: "In today's fast-paced...", "Here's the thing:", "Let me be honest", "Let's dive in"
- ❌ Numbered listicle wisdom ("5 things every ecom brand needs to know")
- ❌ Starting a post with "I" — find a better hook
- ❌ Made-up stats. NEVER fabricate "+47% AOV" or "18-31% CVR" — only use numbers explicitly given in the brief
- ❌ Listing multiple tactics inline as a sentence ("Outcome-driven headlines Social proof Benefit stacking") — this is the WORST possible voice. If listing, use line-broken bullets only
- ❌ Manufactured hook on every post. Sometimes just start mid-thought.
- ❌ Em-dashes as dramatic pauses

VOICE:
- Knowledgeable but grounded. The person who simplifies what everyone else overcomplicates.
- Direct, not aggressive. Confident opinions, no hedging.
- Conversational, not corporate. Contractions, natural rhythm, fragments for impact.
- British. Uses "shite", "whack", "knackered", "mental", "proper". UK spelling (optimise, behaviour, prioritise).
- Dry wit when it fits naturally. Never forced.
- Sometimes lowercase "i" mid-sentence is fine.
- ALL CAPS for emphasis on single words (STILL, PROPERLY, GREAT). Not bold, not italics.

PACING — what makes writing feel human:
- Short sentences. Then a longer one carrying more weight. Then a fragment.
- Line breaks between thoughts. Each idea breathes. No dense paragraphs.
- Vary sentence length constantly.
- Casual asides and parentheticals are fine.

WAYS A POST CAN OPEN (vary these — never the same hook style twice):
- Mid-thought, like continuing a conversation ("Been having the same conversation with a few brands lately")
- An observation or pattern noticed recently
- A scenario the reader will recognise from their own experience
- A direct statement of opinion
- A genuine question

PLATFORM:
- X/Twitter: Sharpest, most direct. Economy of words. Heavy line breaks — one idea per line. White space is the format.
- LinkedIn: Can go deeper. Still conversational — never shift into performative "LinkedIn voice".

DYLAN'S X TWEET REFERENCE EXAMPLES (study the rhythm, line breaks, attitude):

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

And don't be naive, make sure your listicles look good. Great design has proven to increase session time and scroll depth

Set your listicles up correctly and they will print"

Match THIS rhythm, energy, and attitude. Write forwards. Earn the point. Write like Dylan would actually type it.`;

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

${brief ? `Idea/angle: ${brief}` : ""}
${formatContext}
${imageData ? "An image is attached as CONTEXT ONLY. Do NOT describe what's in it literally. Do NOT list the brands or elements you see. The image is the hook — the caption should make someone curious enough to look at it, not narrate it." : ""}

LENGTH RULES: ${lengthInstructions}

THE 3 VARIANTS MUST BE STRUCTURALLY DIFFERENT. Not 3 rewordings of the same post. Each takes a genuinely different shape:

Variant 1 — SHARP OPINION / CALL-OUT
A confident take or mild provocation. Direct. No setup needed. Think: "Name one serious brand that uses whack template pages, i'll wait..." or "Thousands of pages later and we still do X." 2-4 lines max. Attitude over explanation.

Variant 2 — OBSERVATION / PATTERN
Starts mid-thought, like continuing a conversation. "Been looking at a lot of PDPs this week and..." or "Same thing keeps coming up with health brands lately." Builds through specifics. Lands on a quiet, earned point. No drumroll.

Variant 3 — BULLETED TACTICAL BREAKDOWN (only if the topic genuinely warrants a list — otherwise do a third distinct structure: a question-led post, or a counterintuitive one-liner with a single supporting sentence)
If bulleted: one framing line, 3-6 dash bullets on their own lines, one closing line. Each bullet a real insight, not filler.

HARD RULES:
- Every variant must use ACTUAL line breaks (press enter, multiple newlines between thoughts). Not one paragraph blob.
- Use proper punctuation — full stops, commas. Line breaks are in addition to punctuation, not instead of it.
- No two variants should share more than one repeated keyword from the brief. If variant 1 says "FLO", variants 2 and 3 find a different angle that doesn't need to name it.
- Never list features or design elements inline as a sentence.
- Stop recycling the same connector words across variants ("actually", "generic", "properly", "genuinely").
- Stop ending every post with a summary takeaway line. Sometimes just end on the last specific detail.

Output format:
Separate the 3 variants with "===NEXT===" on its own line. Plain text with real line breaks inside each variant. No JSON. No numbering. No meta-commentary.`;

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
        temperature: 1, // push structural variation between the 3 variants
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
