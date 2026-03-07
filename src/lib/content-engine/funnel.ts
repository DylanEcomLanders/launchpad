import type { FunnelStageConfig } from "./types";

export const funnelStages: FunnelStageConfig[] = [
  {
    id: "tofu",
    label: "TOFU",
    fullLabel: "Top of Funnel",
    description: "Awareness \u2014 attract new eyeballs",
    goal: "Get discovered. Build awareness. Earn follows.",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    contentTypes: [
      "Hot takes",
      "Industry commentary",
      "Educational threads",
      "Relatable pain points",
      "Trend commentary",
      "Memes & relatable content",
    ],
    ctas: [
      "Follow for more",
      "Save this",
      "Share with someone who needs this",
      "Turn on notifications",
      "Tag a founder who needs this",
    ],
  },
  {
    id: "mofu",
    label: "MOFU",
    fullLabel: "Middle of Funnel",
    description: "Consideration \u2014 build trust & authority",
    goal: "Demonstrate expertise. Show proof. Build trust.",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    contentTypes: [
      "Case studies",
      "Before/after breakdowns",
      "Process reveals",
      "Client results",
      "Detailed how-tos",
      "Behind the scenes",
    ],
    ctas: [
      "DM me for details",
      "Check the link in bio",
      "Comment [keyword] for the template",
      "Book a free audit",
      "Grab the free guide",
    ],
  },
  {
    id: "bofu",
    label: "BOFU",
    fullLabel: "Bottom of Funnel",
    description: "Conversion \u2014 drive action",
    goal: "Convert followers to leads and clients.",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    contentTypes: [
      "Direct offers",
      "Limited spots",
      "Testimonial features",
      "Service breakdowns",
      "ROI calculators",
      "Objection handling",
    ],
    ctas: [
      "Book a call",
      "DM 'AUDIT' to get started",
      "Link in bio to apply",
      "Only X spots left",
      "Grab the free guide",
      "Get your free store audit",
    ],
  },
];

export const funnelStageMap = Object.fromEntries(
  funnelStages.map((s) => [s.id, s])
) as Record<string, FunnelStageConfig>;
