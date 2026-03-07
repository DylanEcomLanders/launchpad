import type { SourceContent, RepurposedOutput, Platform } from "./types";

function bulletPoints(points: string[]): string {
  return points.filter(Boolean).map((p) => `\u2022 ${p}`).join("\n");
}

function numberedPoints(points: string[]): string {
  return points
    .filter(Boolean)
    .map((p, i) => `${i + 1}. ${p}`)
    .join("\n");
}

// ── Twitter Thread ──

function repurposeTwitterThread(source: SourceContent): RepurposedOutput {
  const pts = source.keyPoints.filter(Boolean);
  const hook = source.metric
    ? `${source.clientName || "A brand"}: ${source.metric}.\n\nHere's the breakdown \ud83e\uddf5`
    : `${source.title}\n\nA thread \ud83e\uddf5`;

  const tweets = [hook];
  if (source.body) {
    const firstSentence = source.body.split(/[.!?]/)[0]?.trim();
    if (firstSentence) tweets.push(`First, some context:\n\n${firstSentence}.`);
  }
  pts.forEach((pt, i) => {
    tweets.push(`${i + 1}/ ${pt}`);
  });
  tweets.push(
    `TL;DR:\n\n${pts.map((p) => `\u2192 ${p}`).join("\n")}\n\nFollow @ecomlanders for more ${source.topic} insights.`
  );

  const content = tweets.map((t, i) => `[Tweet ${i + 1}]\n${t}`).join("\n\n---\n\n");

  return {
    platform: "twitter",
    format: "Thread (" + tweets.length + " tweets)",
    content,
    tips: [
      "First tweet shows above the fold \u2014 make it scroll-stopping",
      "Keep each tweet under 280 chars for clean formatting",
      "End with a clear CTA + follow ask",
    ],
    charCount: content.length,
  };
}

// ── Twitter Single Tweet ──

function repurposeTwitterSingle(source: SourceContent): RepurposedOutput {
  const core = source.keyPoints.filter(Boolean)[0] || source.title;
  const metric = source.metric ? ` (${source.metric})` : "";
  const content = `${core}${metric}\n\n\ud83e\uddf5 Full breakdown below:`;

  return {
    platform: "twitter",
    format: "Single Tweet",
    content,
    tips: [
      "Under 280 chars for max engagement",
      "Use this as a teaser linking to the thread or blog",
    ],
    charCount: content.length,
  };
}

// ── LinkedIn Authority Post ──

function repurposeLinkedIn(source: SourceContent): RepurposedOutput {
  const pts = source.keyPoints.filter(Boolean);
  const hook = source.metric
    ? `${source.clientName || "A client"} achieved ${source.metric} with their ${source.topic} strategy.`
    : source.title;

  const bodyOpener = source.body
    ? source.body.split(/[.!?]/).slice(0, 2).join(". ").trim() + "."
    : `Here's what we learned about ${source.topic}.`;

  const content = [
    hook,
    "",
    bodyOpener,
    "",
    "Here's what made the difference:",
    "",
    bulletPoints(pts),
    "",
    `The biggest lesson? ${pts[pts.length - 1] || "Consistency wins."}`,
    "",
    "---",
    `Repost if you found this useful \u267b\ufe0f`,
    `Follow for more ${source.topic} insights.`,
  ].join("\n");

  return {
    platform: "linkedin",
    format: "Authority Post",
    content,
    tips: [
      "First line shows above the fold \u2014 it must earn the 'see more' click",
      "Use line breaks aggressively for readability",
      "End with a repost ask + follow CTA",
    ],
    charCount: content.length,
  };
}

// ── LinkedIn Carousel Script ──

function repurposeLinkedInCarousel(source: SourceContent): RepurposedOutput {
  const pts = source.keyPoints.filter(Boolean);
  const slides: string[] = [];

  slides.push(`[Slide 1 \u2014 Cover]\n${source.title}`);
  if (source.body) {
    const problem = source.body.split(/[.!?]/)[0]?.trim();
    if (problem) slides.push(`[Slide 2 \u2014 The Problem]\n${problem}.`);
  }
  pts.forEach((pt, i) => {
    slides.push(`[Slide ${slides.length + 1} \u2014 Point ${i + 1}]\n${pt}`);
  });
  if (source.metric) {
    slides.push(`[Slide ${slides.length + 1} \u2014 The Result]\n${source.clientName || "Result"}: ${source.metric}`);
  }
  slides.push(
    `[Slide ${slides.length + 1} \u2014 CTA]\nFollow @ecomlanders for more\nSave this post for later`
  );

  const content = slides.join("\n\n");

  return {
    platform: "linkedin",
    format: `Carousel (${slides.length} slides)`,
    content,
    tips: [
      "Cover slide needs a bold, readable title \u2014 think billboard",
      "One key point per slide, large text",
      "Always end with a CTA slide",
    ],
    charCount: content.length,
  };
}

// ── TikTok Script ──

function repurposeTikTok(source: SourceContent): RepurposedOutput {
  const pts = source.keyPoints.filter(Boolean);
  const hook = source.metric
    ? `${source.metric}. Want to know how?`
    : `Here's something about ${source.topic} nobody talks about.`;

  const content = [
    `HOOK (first 3 seconds):`,
    `"${hook}"`,
    "",
    "BODY:",
    ...pts.map((pt) => `\u2022 ${pt}`),
    "",
    "CTA:",
    `"Follow for more ${source.topic} tips."`,
    "",
    "CAPTION:",
    `${source.title} #${source.topic.replace(/\s+/g, "")} #ecommerce #shopify`,
  ].join("\n");

  return {
    platform: "tiktok",
    format: "Hook + Script",
    content,
    tips: [
      "First 3 seconds decide if people stay \u2014 nail the hook",
      "Speak conversationally, not like you're reading",
      "Text overlay on screen reinforces each point",
    ],
    charCount: content.length,
  };
}

// ── Instagram Carousel ──

function repurposeInstagramCarousel(source: SourceContent): RepurposedOutput {
  const pts = source.keyPoints.filter(Boolean);
  const slides: string[] = [];

  slides.push(`[Slide 1 \u2014 Hook]\n${source.title}`);
  if (source.body) {
    const problem = source.body.split(/[.!?]/)[0]?.trim();
    if (problem) slides.push(`[Slide 2 \u2014 The Problem]\n${problem}.`);
  }
  pts.forEach((pt, i) => {
    slides.push(`[Slide ${slides.length + 1}]\n${pt}`);
  });
  if (source.metric) {
    slides.push(`[Slide ${slides.length + 1} \u2014 Result]\n${source.clientName || "Result"}: ${source.metric}`);
  }
  slides.push(
    `[Slide ${slides.length + 1} \u2014 CTA]\nFollow @ecomlanders\nSave this for later \ud83d\udd16`
  );

  const content = slides.join("\n\n");

  return {
    platform: "instagram",
    format: `Carousel (${slides.length} slides)`,
    content,
    tips: [
      "First slide is everything \u2014 it decides if they swipe",
      "Use consistent branding across all slides",
      "Ask for saves in your CTA \u2014 saves > likes for reach",
    ],
    charCount: content.length,
  };
}

// ── Instagram Caption ──

function repurposeInstagramCaption(source: SourceContent): RepurposedOutput {
  const pts = source.keyPoints.filter(Boolean);
  const hook = source.metric
    ? `${source.metric} \u2014 here's how \u2193`
    : `${source.title} \u2193`;

  const content = [
    hook,
    "",
    source.body ? source.body.split(/[.!?]/).slice(0, 2).join(". ").trim() + "." : "",
    "",
    numberedPoints(pts),
    "",
    source.metric ? `Result: ${source.metric}` : "",
    "",
    `Save this for later \ud83d\udd16`,
    `Follow @ecomlanders for more ${source.topic} tips`,
    "",
    `#${source.topic.replace(/\s+/g, "")} #ecommerce #shopify #dtc #ecomtips`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    platform: "instagram",
    format: "Caption",
    content,
    tips: [
      "First line shows in the feed preview \u2014 make it count",
      "Use line breaks for readability",
      "3-5 relevant hashtags perform better than 30 random ones",
    ],
    charCount: content.length,
  };
}

// ── Main repurpose function ──

export function repurposeContent(
  source: SourceContent,
  selectedPlatforms: Platform[]
): RepurposedOutput[] {
  const outputs: RepurposedOutput[] = [];

  if (selectedPlatforms.includes("twitter")) {
    outputs.push(repurposeTwitterThread(source));
  }
  if (selectedPlatforms.includes("linkedin")) {
    outputs.push(repurposeLinkedIn(source));
    outputs.push(repurposeLinkedInCarousel(source));
  }
  if (selectedPlatforms.includes("tiktok")) {
    outputs.push(repurposeTikTok(source));
  }
  if (selectedPlatforms.includes("instagram")) {
    outputs.push(repurposeInstagramCarousel(source));
    outputs.push(repurposeInstagramCaption(source));
  }

  return outputs;
}
