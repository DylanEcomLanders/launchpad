import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { COPY_AUDIT_SYSTEM_PROMPT } from "@/lib/copy-audit/training-prompt";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

/**
 * Chat within the copy audit context.
 * POST { message, brief, vocData, history }
 */
export async function POST(req: NextRequest) {
  try {
    const { message, brief, vocData, history } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: "No message" }, { status: 400 });
    }

    const systemPrompt = `${COPY_AUDIT_SYSTEM_PROMPT}

You are having a conversation with a copywriter about a DTC product page they're working on. You have full context of their brief and VOC research below. Answer their questions with specific, actionable guidance rooted in DTC best practices.

Be suggestive, not prescriptive — explain the principles and direction, don't write the exact copy for them unless they explicitly ask for examples.

PROJECT BRIEF:
${brief || "No brief provided"}

${vocData ? `VOICE OF CUSTOMER DATA:
Pain Points: ${vocData.painPoints?.join("; ") || "N/A"}
Objections: ${vocData.objections?.join("; ") || "N/A"}
Key Phrases: ${vocData.keyPhrases?.join(", ") || "N/A"}` : ""}

Keep responses concise and practical. Use bullet points where helpful. Reference specific DTC principles from the framework when relevant.`;

    // Build message history
    const messages: Anthropic.MessageCreateParams["messages"] = [];

    if (history?.length) {
      for (const h of history) {
        messages.push({ role: h.role, content: h.content });
      }
    }

    messages.push({ role: "user", content: message });

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: systemPrompt,
      messages,
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const reply = textBlock?.type === "text" ? textBlock.text : "No response";

    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error("Chat error:", err);
    return NextResponse.json({ error: err?.message || "Chat failed" }, { status: 500 });
  }
}
