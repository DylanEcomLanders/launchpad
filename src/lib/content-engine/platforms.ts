import type { PlatformConfig } from "./types";

export const platforms: PlatformConfig[] = [
  {
    id: "twitter",
    label: "Twitter / X",
    icon: "\ud835\udd4f",
    maxLength: 280,
    formats: [
      {
        id: "single-tweet",
        label: "Single Tweet",
        description: "Punchy one-liner",
        maxLength: 280,
        structure: "[Hook] + [Value/CTA]",
      },
      {
        id: "thread",
        label: "Thread (5-7 tweets)",
        description: "Narrative or list breakdown",
        maxLength: 280,
        structure:
          "1. Hook tweet\n2-6. Value tweets\n7. CTA tweet",
      },
      {
        id: "quote-tweet",
        label: "Quote Tweet Angle",
        description: "Reframe for engagement",
        maxLength: 280,
        structure: "[Hot take on topic] + [Your angle]",
      },
    ],
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    icon: "in",
    maxLength: 3000,
    formats: [
      {
        id: "authority-post",
        label: "Authority Post",
        description: "Thought leadership, lessons learned",
        maxLength: 3000,
        structure:
          "[Hook line]\n\n[Story/context]\n\n[Key takeaways]\n\n[CTA question]",
      },
      {
        id: "listicle",
        label: "Listicle Post",
        description: "Numbered tips or lessons",
        maxLength: 3000,
        structure:
          "[Hook]\n\n1. [Point]\n2. [Point]\n...\n\n[Summary + CTA]",
      },
      {
        id: "carousel-script",
        label: "Carousel (Slide Script)",
        description: "Slide-by-slide text for carousel",
        structure:
          "Slide 1: Hook\nSlide 2-8: Value slides\nSlide 9: CTA + follow",
      },
    ],
  },
  {
    id: "tiktok",
    label: "TikTok",
    icon: "TT",
    formats: [
      {
        id: "hook-script",
        label: "Hook + Script",
        description: "Opening hook + talking points",
        structure:
          "HOOK (0-3s): [Curiosity opener]\nBODY: [3-5 talking points]\nCTA: [Follow/comment/link]",
      },
      {
        id: "story-format",
        label: "Story Format",
        description: "Narrative mini-story",
        structure:
          "HOOK: [Relatable problem]\nSTORY: [What happened]\nREVEAL: [Result/lesson]\nCTA",
      },
      {
        id: "green-screen",
        label: "Green Screen / Stitch",
        description: "React to content or show results",
        structure:
          "HOOK: [React to X]\nCONTEXT: [Why this matters]\nTAKEAWAY: [Key lesson]",
      },
    ],
  },
  {
    id: "instagram",
    label: "Instagram",
    icon: "IG",
    maxLength: 2200,
    formats: [
      {
        id: "carousel-outline",
        label: "Carousel Outline",
        description: "Slide-by-slide content plan",
        structure:
          "Slide 1: Hook visual + title\nSlide 2-9: Teaching slides\nSlide 10: CTA + save prompt",
      },
      {
        id: "reel-script",
        label: "Reel Script",
        description: "Short-form video script",
        structure:
          "HOOK (0-2s): [Visual + text hook]\nBODY: [Key points]\nCTA: [Follow/save/share]",
      },
      {
        id: "caption",
        label: "Caption",
        description: "Long-form caption for feed posts",
        maxLength: 2200,
        structure: "[Hook line]\n\n[Story/value]\n\n[CTA]\n\n[Hashtags]",
      },
    ],
  },
];

export const platformMap = Object.fromEntries(
  platforms.map((p) => [p.id, p])
) as Record<string, PlatformConfig>;

export const industries = [
  "DTC Beauty",
  "DTC Food & Beverage",
  "Fashion & Apparel",
  "Health & Wellness",
  "Home & Living",
  "Supplements",
  "Pet",
  "Jewellery & Accessories",
  "Sports & Outdoors",
  "General Ecommerce",
] as const;
