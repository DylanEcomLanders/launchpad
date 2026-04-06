/* ── Voice Profile Store ──
 * Per-creator voice profiles that feed into caption generation.
 * Self-improving: tracks before/after edits so the AI learns.
 */

import { createStore } from "@/lib/supabase-store";

export interface VoiceExample {
  text: string;
  platform: string;
  note?: string;
}

export interface VoiceEdit {
  original: string;
  edited: string;
  platform: string;
  timestamp: string;
}

export interface VoiceProfile {
  id: string; // creator name: "dylan" | "ajay"
  tone: string[];
  avoid: string[];
  rules: string[];
  examples: VoiceExample[];
  voiceNotes: string;
  editHistory: VoiceEdit[];
}

const store = createStore<VoiceProfile>({
  table: "voice_profiles",
  lsKey: "launchpad-voice-profiles",
});

// Default profiles — used when none exists yet
const DEFAULT_PROFILES: Record<string, VoiceProfile> = {
  dylan: {
    id: "dylan",
    tone: ["direct", "confident", "conversational", "advisory", "approachable"],
    avoid: [
      "game-changer",
      "at the end of the day",
      "unlock potential",
      "In addition / Furthermore / In conclusion / That said",
      "excessive superlatives or hype language",
      "em-dashes unless essential",
      "hashtags unless specifically requested",
      "more than 1 emoji per post",
      "listicle formatting unless appropriate",
      "throat-clearing intros like 'I've been thinking about...' or 'Here's the thing...'",
      "corporate or formal tone",
      "starting with I or We",
      "generic marketing advice",
      "buzzwords like leverage/synergy/unlock",
      "American English spellings",
    ],
    rules: [
      "Lead with a pattern or observation, not a personal statement",
      "Use specific numbers and examples (CVR, AOV, real metrics)",
      "Write like you're talking to one person, not broadcasting",
      "Short sentences. Punch. Then expand.",
      "Brisk pacing with short paragraphs for quick reads",
      "Mix industry acronyms (CVR, AOV, CRO) with informal phrasing",
      "Imperative and emphatic, focus on key takeaways succinctly",
      "Sound conversational and approachable, never robotic",
      "Use UK English always (optimise, colour, behaviour, etc.)",
      "Front-load value with visuals and social proof references",
      "Address objections swiftly to convert cold traffic mindset",
    ],
    examples: [],
    voiceNotes:
      "Dylan Evans is COO at Ecom Landers, specialising in funnels, landing pages, and email design for 6-8 figure Shopify brands. Focus is on reducing friction, front-loading value, and addressing objections to convert cold traffic. Target audience: ecommerce brand owners and digital marketers running Shopify stores (mid-to-high revenue) seeking practical, actionable CRO advice and quick wins. Style blends casual conversation with deep ecom expertise. Structures are concise, often thread-based with hooks like bookmark prompts and visual aids.",
    editHistory: [],
  },
  ajay: {
    id: "ajay",
    tone: ["analytical", "data-driven", "clear"],
    avoid: ["emojis", "hashtags", "fluff"],
    rules: ["Back claims with data", "Keep it concise"],
    examples: [],
    voiceNotes: "",
    editHistory: [],
  },
};

export async function getVoiceProfile(
  creatorId: string
): Promise<VoiceProfile> {
  const profile = await store.getById(creatorId);
  if (profile) return profile;
  // Return default (and persist it)
  const def = DEFAULT_PROFILES[creatorId] || {
    id: creatorId,
    tone: [],
    avoid: [],
    rules: [],
    examples: [],
    voiceNotes: "",
    editHistory: [],
  };
  await store.create(def);
  return def;
}

export async function saveVoiceProfile(
  profile: VoiceProfile
): Promise<VoiceProfile> {
  const existing = await store.getById(profile.id);
  if (existing) {
    await store.update(profile.id, profile);
  } else {
    await store.create(profile);
  }
  return profile;
}

/** Record an edit pair (AI original vs user edit). Caps at 20 entries. */
export async function recordEdit(
  creatorId: string,
  original: string,
  edited: string,
  platform: string
): Promise<void> {
  const profile = await getVoiceProfile(creatorId);
  const entry: VoiceEdit = {
    original,
    edited,
    platform,
    timestamp: new Date().toISOString(),
  };
  profile.editHistory = [entry, ...profile.editHistory].slice(0, 20);
  await saveVoiceProfile(profile);
}

/** Build the voice instruction block for the AI prompt */
export function buildVoicePromptBlock(profile: VoiceProfile): string {
  const lines: string[] = ["VOICE PROFILE:"];

  if (profile.tone.length > 0) {
    lines.push(`Tone: ${profile.tone.join(", ")}`);
  }

  if (profile.avoid.length > 0) {
    lines.push(`Never: ${profile.avoid.join(", ")}`);
  }

  if (profile.rules.length > 0) {
    lines.push("Rules:");
    profile.rules.forEach((r) => lines.push(`- ${r}`));
  }

  if (profile.examples.length > 0) {
    lines.push("Examples of this voice:");
    profile.examples.slice(0, 5).forEach((ex) => {
      lines.push(`"${ex.text}" (${ex.platform})`);
    });
  }

  if (profile.voiceNotes.trim()) {
    lines.push(`Additional voice notes: ${profile.voiceNotes}`);
  }

  // Include recent edits as learning examples
  const recentEdits = profile.editHistory.slice(0, 5);
  if (recentEdits.length > 0) {
    lines.push(
      "\nThe user edited these AI-generated captions. Learn from the pattern:"
    );
    recentEdits.forEach((e) => {
      lines.push(`Original: "${e.original}" → User's version: "${e.edited}"`);
    });
  }

  return lines.join("\n");
}
