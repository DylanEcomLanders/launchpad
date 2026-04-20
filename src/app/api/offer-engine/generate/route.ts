import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { DEFAULT_PROPOSAL_CONTENT } from "@/lib/offer-engine/default-content";
import type { ProposalContent } from "@/lib/offer-engine/types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

const SYSTEM_PROMPT = `You are filling a structured proposal template for Ecomlanders, a conversion-optimisation agency.

Your job: take the user-supplied notes + brand inputs and rewrite the template slots so they read as a personalised proposal for this specific brand. Keep the structure identical. Only change the copy inside the slots.

RULES:
1. Never invent numbers. If a stat is not in the notes, leave it as "[needs input]" so the user knows to fill it manually.
2. Preserve the numbered section titles (01, 02, 03...) and eyebrow labels exactly as given.
3. Tone: confident, direct, British English, no em dashes, no emojis, no hype words ("game-changing", "revolutionary"). Match the existing example sentences in the template.
4. The opportunity titleLead / titleMain pair should read as one sentence when combined, with titleLead being the grey lead-in and titleMain being the bold continuation. Same pattern for plugIn.
5. The "leak" paragraphs should describe the specific structural problem in this brand's funnel, based on the notes. Two paragraphs.
6. Keep the 4 principles and timeline phases generic enough to apply to any engagement — only personalise if the notes give strong reason to.
7. For pricing, use the numbers the user provides in the form. If they provide none, use the defaults.
8. Signatories default to Ajay Jani (Founder) and Dylan Evans (COO) unless the user overrides.
9. Output ONLY valid JSON matching the provided schema. No markdown fences. No commentary before or after.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { brandName, notes, retainerPrice, pilotPrice, pilotTitle, pilotDescription, date } = body as {
      brandName: string;
      notes: string;
      retainerPrice?: string;
      pilotPrice?: string;
      pilotTitle?: string;
      pilotDescription?: string;
      date?: string;
    };

    if (!brandName || !notes) {
      return NextResponse.json({ error: "brandName and notes are required" }, { status: 400 });
    }

    const scaffold = JSON.parse(JSON.stringify(DEFAULT_PROPOSAL_CONTENT)) as ProposalContent;
    scaffold.brandName = brandName;
    if (date) scaffold.date = date;
    if (retainerPrice) {
      scaffold.pricing.options[0].price = retainerPrice;
      scaffold.signoff.quoteLines[0].amount = `${retainerPrice} / month`;
    }
    if (pilotPrice) {
      scaffold.pricing.options[1].price = pilotPrice;
      scaffold.signoff.quoteLines[1].amount = `${pilotPrice} one-time`;
    }
    if (pilotTitle) scaffold.pricing.options[1].title = pilotTitle;
    if (pilotDescription) scaffold.pricing.options[1].description = pilotDescription;

    const userPrompt = `BRAND: ${brandName}

NOTES FROM THE CALL / BRAND CONTEXT:
${notes}

TEMPLATE SCAFFOLD (fill the [bracketed] slots and adapt the copy so it reads as a proposal written specifically for this brand — keep the JSON shape identical):
${JSON.stringify(scaffold, null, 2)}

Return the completed JSON object only.`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "No text response from Claude" }, { status: 500 });
    }

    // Strip any accidental markdown fences
    let raw = textBlock.text.trim();
    if (raw.startsWith("```")) {
      raw = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    }

    let content: ProposalContent;
    try {
      content = JSON.parse(raw) as ProposalContent;
    } catch (err) {
      return NextResponse.json({ error: "Claude returned invalid JSON", raw, detail: String(err) }, { status: 500 });
    }

    return NextResponse.json({ content });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
