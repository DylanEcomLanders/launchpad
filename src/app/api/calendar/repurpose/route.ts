import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

const SYSTEM_PROMPT = `You are a content repurposer for an ecommerce CRO agency called Ecom Landers. You take content written for one platform and adapt it for other platforms while keeping the same core angle/insight. Each platform has a distinct voice:

- **X (Twitter)**: Short, punchy, 1-2 sentences max. Under 280 chars. Lead with a bold take. No fluff.
- **LinkedIn**: Professional but direct. 3-5 sentences. Can expand on the insight, add a framework or lesson. Still no corporate jargon.
- **Instagram**: Punchy mid-length caption (2-3 sentences). Visual-first — the caption should complement an image. Can be more personal/behind-the-scenes.
- **TikTok**: Video hook script format. Start with an attention-grabbing first line (the hook). Then 2-3 lines of talking points. Keep it conversational and direct-to-camera.

Rules: No emojis. No hashtags. No "I" or "We" as the first word. Maintain the same core angle but genuinely adapt the style — don't just shorten/lengthen the same sentence.`;

interface RepurposeRequest {
  sourcePlatform: string;
  sourceCaption: string;
  sourceFormat: string;
  contentType: string;
  targetPlatforms: string[];
}

export async function POST(req: NextRequest) {
  try {
    const { sourcePlatform, sourceCaption, sourceFormat, contentType, targetPlatforms }: RepurposeRequest = await req.json();

    if (!sourcePlatform || !sourceCaption?.trim() || !targetPlatforms?.length) {
      return NextResponse.json(
        { error: "sourcePlatform, sourceCaption, and targetPlatforms are required" },
        { status: 400 }
      );
    }

    const platformFormats: Record<string, string> = {
      x: "text",
      linkedin: "text",
      instagram: "image",
      tiktok: "video",
    };

    const prompt = `Original ${sourcePlatform} post (${sourceFormat} format, ${contentType} content type):
"${sourceCaption}"

Repurpose this for the following platforms: ${targetPlatforms.join(", ")}

For each platform, adapt the angle to fit the platform's style and suggest the best post format.

Return ONLY a JSON array with one object per target platform:
[
  {
    "platform": "linkedin" | "instagram" | "x" | "tiktok",
    "post_format": "text" | "image" | "article" | "video",
    "caption": "the adapted caption"
  }
]

No other text outside the JSON array.`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const raw = textBlock?.type === "text" ? textBlock.text : "";

    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Failed to parse repurposed content" },
        { status: 500 }
      );
    }

    const variants: Array<{
      platform: string;
      post_format: string;
      caption: string;
    }> = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ variants });
  } catch (err: any) {
    console.error("Repurpose error:", err);
    return NextResponse.json(
      { error: err?.message || "Repurpose failed" },
      { status: 500 }
    );
  }
}
