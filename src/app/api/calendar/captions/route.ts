import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

const SYSTEM_PROMPT = `You are a caption writer for an ecommerce CRO agency called Ecom Landers. Write in a direct, confident, no-fluff tone. No emojis. No hashtags. Lead with an observation or insight, not a conclusion. Short punchy sentences. Platform-aware length — LinkedIn can be longer (3-5 sentences), X must be concise (1-2 sentences max, under 280 chars), Instagram punchy mid-length (2-3 sentences). Do NOT start with "I" or "We". Start with an observation about the industry, a pattern you've noticed, or a bold statement.`;

export async function POST(req: NextRequest) {
  try {
    const { platform, contentType, postFormat, brief, imageData } = await req.json();

    if (!platform || !contentType) {
      return NextResponse.json(
        { error: "platform and contentType are required" },
        { status: 400 }
      );
    }

    const validPlatforms = ["linkedin", "instagram", "x"];
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json(
        { error: `Invalid platform. Must be one of: ${validPlatforms.join(", ")}` },
        { status: 400 }
      );
    }

    // Build the user message content — either text-only or image + text
    const formatContext = postFormat
      ? `Post format: ${postFormat}. ${postFormat === "image" ? "The caption should complement and describe the image being posted." : postFormat === "article" ? "This is a longer-form article post — the caption should tease the key insight to drive clicks." : postFormat === "video" ? "This is a video/reel post — the caption should be a punchy hook that makes people stop scrolling." : "This is a text-only post — the caption IS the content."}`
      : "";

    const userPrompt = `Write 3 caption variants for a ${platform} post. Content type: ${contentType}. ${formatContext}${brief ? ` Brief/context: ${brief}` : ""}${imageData ? " Use the attached image as context — describe what you see and write captions that complement the visual." : ""}. Return ONLY a JSON array of 3 strings, no other text.`;

    const userContent: Anthropic.Messages.ContentBlockParam[] = [];

    // If we have image data, add it as an image block first
    if (imageData && (postFormat === "image" || postFormat === "video")) {
      // imageData comes as "data:image/png;base64,..." — extract the base64 and media type
      const match = imageData.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (match) {
        const mediaType = match[1] as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
        const base64Data = match[2];
        userContent.push({
          type: "image",
          source: {
            type: "base64",
            media_type: mediaType,
            data: base64Data,
          },
        });
      }
    }

    userContent.push({ type: "text", text: userPrompt });

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const raw = textBlock?.type === "text" ? textBlock.text : "";

    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Failed to parse captions from response" },
        { status: 500 }
      );
    }

    const captions: string[] = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ captions });
  } catch (err: any) {
    console.error("Caption generation error:", err);
    return NextResponse.json(
      { error: err?.message || "Caption generation failed" },
      { status: 500 }
    );
  }
}
