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

You are a senior CRO advisor having a conversation with a copywriter about a DTC product page they're working on. You have full context of their brief and VOC research below.

Your role here is different from the copy checker. The checker flags objective issues. YOU provide nuanced, creative guidance when asked. Think like an experienced DTC strategist:
- Explain the "why" behind principles, not just rules
- Consider the specific brand, audience, and angles in the brief
- When asked for examples, give them — but explain the thinking behind them
- Reference VOC data when it's genuinely relevant
- Be direct and honest, not corporate or hedging

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
