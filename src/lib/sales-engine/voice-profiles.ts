/* ── Voice Profile Store ──
 * Per-creator voice profile = a single freeform doc (markdown / text).
 * Upload a file or paste text in the panel; it gets injected as raw context
 * into every caption generation call.
 */

import { createStore } from "@/lib/supabase-store";

export interface VoiceProfile {
  id: string; // creator name: "dylan" | "ajay"
  voiceDoc: string; // raw markdown / text used as voice context
  fileName?: string; // optional source filename for display

  // ── Legacy fields, kept optional for backwards compatibility with old rows ──
  tone?: string[];
  avoid?: string[];
  rules?: string[];
  examples?: { text: string; platform: string; note?: string }[];
  voiceNotes?: string;
  editHistory?: {
    original: string;
    edited: string;
    platform: string;
    timestamp: string;
  }[];
}

const store = createStore<VoiceProfile>({
  table: "voice_profiles",
  lsKey: "launchpad-voice-profiles",
});

const EMPTY_DOC: VoiceProfile = {
  id: "",
  voiceDoc: "",
};

export async function getVoiceProfile(creatorId: string): Promise<VoiceProfile> {
  const existing = await store.getById(creatorId);
  if (existing) {
    // Migrate any legacy structured profile into a single doc on first load
    if (!existing.voiceDoc && (existing.tone?.length || existing.rules?.length || existing.voiceNotes)) {
      const migrated = legacyToDoc(existing);
      const next: VoiceProfile = { id: creatorId, voiceDoc: migrated };
      await store.update(creatorId, next);
      return next;
    }
    return { ...existing, id: creatorId, voiceDoc: existing.voiceDoc || "" };
  }
  const fresh: VoiceProfile = { ...EMPTY_DOC, id: creatorId };
  await store.create(fresh);
  return fresh;
}

export async function saveVoiceProfile(profile: VoiceProfile): Promise<VoiceProfile> {
  const clean: VoiceProfile = {
    id: profile.id,
    voiceDoc: profile.voiceDoc || "",
    fileName: profile.fileName,
  };
  const existing = await store.getById(profile.id);
  if (existing) {
    await store.update(profile.id, clean);
  } else {
    await store.create(clean);
  }
  return clean;
}

/** Legacy → doc converter for one-time migration of older profiles */
function legacyToDoc(p: VoiceProfile): string {
  const out: string[] = [];
  if (p.tone?.length) out.push(`# Tone\n${p.tone.join(", ")}`);
  if (p.avoid?.length) out.push(`# Never\n- ${p.avoid.join("\n- ")}`);
  if (p.rules?.length) out.push(`# Rules\n- ${p.rules.join("\n- ")}`);
  if (p.examples?.length) {
    out.push(
      `# Example posts\n${p.examples
        .map((ex) => `> ${ex.text}\n(${ex.platform}${ex.note ? ` — ${ex.note}` : ""})`)
        .join("\n\n")}`
    );
  }
  if (p.voiceNotes?.trim()) out.push(`# Notes\n${p.voiceNotes}`);
  return out.join("\n\n");
}

/** Build the voice instruction block for the AI prompt */
export function buildVoicePromptBlock(profile: VoiceProfile): string {
  if (!profile.voiceDoc?.trim()) return "";
  return `\n\nVOICE REFERENCE — read this carefully and write in the voice it describes:\n\n${profile.voiceDoc.trim()}`;
}
