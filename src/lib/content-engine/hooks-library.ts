import type { HookFormulaConfig, HookInput, Platform } from "./types";

export const hookFormulas: HookFormulaConfig[] = [
  {
    id: "contrarian",
    label: "Contrarian Take",
    description: "Challenge conventional wisdom to stop the scroll",
    template:
      "Most [industry] brands think [common belief]. Here's why that's costing them.",
    bestFor: ["twitter", "linkedin"],
  },
  {
    id: "stat-lead",
    label: "Stat Lead",
    description: "Open with a compelling result or number",
    template:
      "[Client] went from [before] to [after]. Here's the process.",
    bestFor: ["linkedin", "twitter", "instagram"],
  },
  {
    id: "question",
    label: "Question Hook",
    description: "Open with a thought-provoking question",
    template:
      "What if your [pain point] was actually caused by something you're ignoring?",
    bestFor: ["twitter", "linkedin", "tiktok"],
  },
  {
    id: "story-open",
    label: "Story Open",
    description: "Pull people in with a narrative opening",
    template: "Last week a client called me about [problem]...",
    bestFor: ["linkedin", "tiktok", "instagram"],
  },
  {
    id: "hot-take",
    label: "Hot Take",
    description: "Bold opinion that sparks conversation",
    template: "Unpopular opinion: [bold claim about topic]",
    bestFor: ["twitter", "linkedin"],
  },
  {
    id: "before-after",
    label: "Before / After",
    description: "Show the transformation to build credibility",
    template: "[Client] went from [bad state] to [good state]...",
    bestFor: ["linkedin", "instagram", "tiktok"],
  },
  {
    id: "curiosity-gap",
    label: "Curiosity Gap",
    description: "Create an information gap that demands a click",
    template:
      "The #1 reason [industry] stores fail at [topic]...",
    bestFor: ["tiktok", "twitter", "instagram"],
  },
  {
    id: "social-proof",
    label: "Social Proof",
    description: "Lead with volume and credibility",
    template:
      "We've done this for 50+ brands. Here's what actually works.",
    bestFor: ["linkedin", "twitter"],
  },
  {
    id: "myth-bust",
    label: "Myth Bust",
    description: "Call out a common mistake to grab attention",
    template:
      "Stop doing [common practice]. It's killing your [metric].",
    bestFor: ["twitter", "tiktok", "linkedin"],
  },
  {
    id: "direct-value",
    label: "Direct Value",
    description: "Promise immediate, actionable value upfront",
    template:
      "Here's exactly how to [achieve result] in [timeframe]:",
    bestFor: ["twitter", "linkedin", "instagram"],
  },
];

// ── Hook generation per platform ──

function fill(template: string, input: HookInput): string {
  return template
    .replace(/\[topic\]/gi, input.topic || "this")
    .replace(/\[industry\]/gi, input.industry || "ecommerce")
    .replace(/\[client\]/gi, input.clientName || "a client")
    .replace(/\[metric\]/gi, input.metric || "revenue")
    .replace(/\[pain\s?point\]/gi, input.painPoint || "conversion rate")
    .replace(/\[solution\]/gi, input.solution || "our process")
    .replace(/\[problem\]/gi, input.painPoint || "their conversion rate")
    .replace(/\[result\]/gi, input.metric || "serious growth");
}

const generators: Record<
  string,
  (input: HookInput, platform: Platform) => string
> = {
  contrarian(input, platform) {
    const industry = input.industry || "ecommerce";
    const topic = input.topic;
    if (platform === "twitter") {
      return `Most ${industry} brands are wrong about ${topic}.\n\nHere's what actually works:`;
    }
    if (platform === "linkedin") {
      return `I've worked with dozens of ${industry} brands on ${topic}.\n\nThe biggest mistake I see? ${input.painPoint || "They follow outdated advice."}\n\nHere's what I'd do instead:`;
    }
    if (platform === "tiktok") {
      return `Everything you've been told about ${topic} is wrong. Let me explain.`;
    }
    return `${topic} advice that most ${industry} brands get completely wrong \u2193`;
  },

  "stat-lead"(input, platform) {
    const client = input.clientName || "A client";
    const metric = input.metric;
    if (!metric) {
      if (platform === "twitter") return `${client} completely transformed their ${input.topic}.\n\nHere's the exact playbook:`;
      if (platform === "linkedin") return `${client} came to us struggling with ${input.painPoint || input.topic}.\n\nHere's the step-by-step process we used to turn things around:`;
      if (platform === "tiktok") return `Watch how we completely transformed ${client}'s ${input.topic}.`;
      return `How we transformed ${client}'s ${input.topic} \u2014 full breakdown \u2193`;
    }
    if (platform === "twitter") return `${client}: ${metric}.\n\nHere's exactly what we did:`;
    if (platform === "linkedin") return `${client} achieved ${metric} in their ${input.topic} strategy.\n\nHere's the step-by-step process we followed:`;
    if (platform === "tiktok") return `${metric}. Want to know how we did it?`;
    return `${metric} \u2014 here's the exact process we used for ${client} \u2193`;
  },

  question(input, platform) {
    const pain = input.painPoint || input.topic;
    if (platform === "twitter") return `What if your ${pain} isn't actually about ${pain}?\n\nIt might be something you've never considered:`;
    if (platform === "linkedin") return `What if the reason you're struggling with ${pain} has nothing to do with what you think?\n\nAfter working with dozens of brands, I've noticed a pattern:`;
    if (platform === "tiktok") return `What if I told you your ${pain} problem has nothing to do with ${pain}?`;
    return `Ever wondered why your ${pain} isn't improving? The answer might surprise you \u2193`;
  },

  "story-open"(input, platform) {
    const client = input.clientName || "a client";
    const problem = input.painPoint || input.topic;
    if (platform === "twitter") return `Last week ${client} messaged me about their ${problem}.\n\nWhat I found surprised even me:`;
    if (platform === "linkedin") return `Last week ${client} reached out to me with a problem.\n\nTheir ${problem} was getting worse, and they'd tried everything.\n\nHere's what we discovered:`;
    if (platform === "tiktok") return `So ${client} called me in a panic about their ${problem}. Here's what happened next.`;
    return `The story of how ${client} went from struggling with ${problem} to a complete turnaround \u2193`;
  },

  "hot-take"(input, platform) {
    const topic = input.topic;
    if (platform === "twitter") return `Unpopular opinion: most ${input.industry || "ecommerce"} brands overthink ${topic}.\n\nThe real answer is simpler than you think:`;
    if (platform === "linkedin") return `This might ruffle some feathers, but:\n\nMost advice about ${topic} in ${input.industry || "ecommerce"} is outdated.\n\nHere's what I actually think works in 2025:`;
    if (platform === "tiktok") return `Hot take: everything you know about ${topic} is outdated. Here's why.`;
    return `Unpopular opinion about ${topic} that most ${input.industry || "ecommerce"} brands won't want to hear \u2193`;
  },

  "before-after"(input, platform) {
    const client = input.clientName || "A client";
    const pain = input.painPoint || `struggling with ${input.topic}`;
    const result = input.metric || `a complete transformation`;
    if (platform === "twitter") return `${client}: ${pain} \u2192 ${result}.\n\nThe 3 things that made the difference:`;
    if (platform === "linkedin") return `6 months ago, ${client} was ${pain}.\n\nToday? ${result}.\n\nHere's exactly what changed:`;
    if (platform === "tiktok") return `From ${pain} to ${result}. Watch how we did it.`;
    return `${pain} \u2192 ${result}\n\nThe exact steps we took for ${client} \u2193`;
  },

  "curiosity-gap"(input, platform) {
    const industry = input.industry || "ecommerce";
    const topic = input.topic;
    if (platform === "twitter") return `The #1 reason ${industry} stores fail at ${topic}?\n\nIt's not what you think:`;
    if (platform === "linkedin") return `After working with 50+ ${industry} brands, I can tell you the #1 reason most fail at ${topic}.\n\nAnd it's probably not what you'd expect:`;
    if (platform === "tiktok") return `The number one reason your store is failing at ${topic}. And no, it's not what you think.`;
    return `Why most ${industry} stores get ${topic} completely wrong (and what to do instead) \u2193`;
  },

  "social-proof"(input, platform) {
    const industry = input.industry || "ecommerce";
    const topic = input.topic;
    if (platform === "twitter") return `We've helped 50+ ${industry} brands with ${topic}.\n\nHere are the 3 patterns that separate winners from everyone else:`;
    if (platform === "linkedin") return `After helping 50+ ${industry} brands with ${topic}, I've noticed something.\n\nThe brands that succeed all do these things differently:`;
    if (platform === "tiktok") return `50+ brands. One pattern. Here's what actually works for ${topic}.`;
    return `What 50+ ${industry} brands taught us about ${topic} \u2193`;
  },

  "myth-bust"(input, platform) {
    const topic = input.topic;
    const metric = input.metric || "conversions";
    if (platform === "twitter") return `Stop obsessing over ${topic} the way everyone tells you to.\n\nIt's actually killing your ${metric}:`;
    if (platform === "linkedin") return `I need to be honest about something.\n\nThe way most brands approach ${topic} is broken. And it's costing them ${metric}.\n\nHere's what to do instead:`;
    if (platform === "tiktok") return `Stop doing this with your ${topic}. Seriously. It's killing your ${metric}.`;
    return `The ${topic} mistake that's costing you ${metric} (and what top brands do instead) \u2193`;
  },

  "direct-value"(input, platform) {
    const topic = input.topic;
    const result = input.metric || "real results";
    if (platform === "twitter") return `Here's exactly how to nail ${topic}.\n\nNo fluff. Just the process that gets ${result}:`;
    if (platform === "linkedin") return `I'm going to break down exactly how to approach ${topic} for ${result}.\n\nSave this post. You'll want to come back to it:`;
    if (platform === "tiktok") return `Here's the exact process for ${topic} that gets ${result}. Save this.`;
    return `The exact ${topic} playbook for ${result} (save for later) \u2193`;
  },
};

export function generateHook(
  input: HookInput,
  formulaId: string,
  platform: Platform
): string {
  const gen = generators[formulaId];
  if (gen) return gen(input, platform);
  // fallback: use the formula template with substitution
  const formula = hookFormulas.find((f) => f.id === formulaId);
  return formula ? fill(formula.template, input) : input.topic;
}
