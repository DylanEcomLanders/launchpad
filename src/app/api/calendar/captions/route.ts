import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

const BASE_SYSTEM_PROMPT = `You are a caption writer for an ecommerce CRO agency called Ecom Landers. You build high-converting landing pages, product pages, and email flows for ecommerce brands.

Tone: Direct, confident, no-fluff. No emojis. No hashtags. Do NOT start with "I" or "We". Start with an observation about the industry, a pattern you've noticed, or a bold statement.

You write in the voice of someone who has deep expertise in CRO, landing pages, and ecommerce — sharing real insights, not generic marketing advice.`;

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
        ? "Write 1-2 punchy sentences. Under 200 characters. A bold take or sharp observation — no explanation needed."
        : "Write 2-3 sentences max. Lead with the insight, one supporting point, done. Tight and punchy.";

    case "long":
      return isX
        ? "Write 3-5 sentences. Open with a hook, develop the point with a specific example or data point, close with a takeaway. Under 280 characters is NOT required — this is a longer X post."
        : "Write 8-15 sentences. Open with a hook that stops the scroll. Develop the argument with specifics — real examples, frameworks, data, lessons learned. Use line breaks between paragraphs for readability. Close with a clear takeaway or perspective. This should be a proper thought-leadership post that someone would save or share.";

    case "medium":
    default:
      return isX
        ? "Write 2-3 sentences. A clear observation with one supporting point. Under 280 characters."
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

Important: Write substantive, insightful captions. Don't just restate the brief — add a real perspective, example, or framework. Each variant should take a different angle on the idea.

Return ONLY a JSON array of 3 strings, no other text.`;

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

      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const captions: string[] = JSON.parse(jsonMatch[0]);
        results.push({ platform: plat, captions });
      } else {
        results.push({ platform: plat, captions: [] });
      }
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
