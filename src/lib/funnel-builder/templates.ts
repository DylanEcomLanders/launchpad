/* ── Funnel Templates ── */

import type { FunnelTemplate, FunnelNodeData } from "./types";

const X_START = 50;
const Y_CENTER = 200;
const X_GAP = 220;

function pos(col: number, row = 0): { x: number; y: number } {
  return { x: X_START + col * X_GAP, y: Y_CENTER + row * 120 };
}

const defaultSlots = { headline: false, hook: false, offer: false, cta: false, socialProof: false };

export const funnelTemplates: FunnelTemplate[] = [
  {
    id: "standard-dtc",
    name: "Standard DTC",
    description: "Classic direct-to-consumer flow with ads driving to landing page and PDP",
    nodes: [
      { type: "trafficNode", position: pos(0, -0.5), data: { nodeType: "traffic", subType: "meta-ads", label: "Meta Ads", status: "planned", stage: "tofu" } },
      { type: "trafficNode", position: pos(0, 0.5), data: { nodeType: "traffic", subType: "google-ads", label: "Google Ads", status: "planned", stage: "tofu" } },
      { type: "pageNode", position: pos(1), data: { nodeType: "page", subType: "Landing Page", label: "Landing Page", status: "planned", stage: "tofu", contentSlots: defaultSlots } },
      { type: "pageNode", position: pos(2), data: { nodeType: "page", subType: "PDP (Product Page)", label: "Product Page", status: "planned", stage: "mofu", contentSlots: defaultSlots } },
      { type: "pageNode", position: pos(3), data: { nodeType: "page", subType: "Cart", label: "Cart", status: "planned", stage: "bofu" } },
      { type: "pageNode", position: pos(4), data: { nodeType: "page", subType: "Checkout", label: "Checkout", status: "planned", stage: "bofu" } },
      { type: "pageNode", position: pos(5), data: { nodeType: "page", subType: "Thank You", label: "Thank You", status: "planned", stage: "bofu" } },
    ],
    edges: [
      { source: 0, target: 2 },
      { source: 1, target: 2 },
      { source: 2, target: 3 },
      { source: 3, target: 4 },
      { source: 4, target: 5 },
      { source: 5, target: 6 },
    ],
  },
  {
    id: "quiz-funnel",
    name: "Quiz Funnel",
    description: "Lead with a quiz to qualify visitors, then route to personalised PDP",
    nodes: [
      { type: "trafficNode", position: pos(0), data: { nodeType: "traffic", subType: "meta-ads", label: "Meta Ads", status: "planned", stage: "tofu" } },
      { type: "pageNode", position: pos(1), data: { nodeType: "page", subType: "Landing Page", label: "Quiz Page", status: "planned", stage: "tofu", contentSlots: defaultSlots } },
      { type: "pageNode", position: pos(2), data: { nodeType: "page", subType: "PDP (Product Page)", label: "Recommended PDP", status: "planned", stage: "mofu", contentSlots: defaultSlots } },
      { type: "pageNode", position: pos(3), data: { nodeType: "page", subType: "Cart", label: "Cart", status: "planned", stage: "bofu" } },
      { type: "pageNode", position: pos(4), data: { nodeType: "page", subType: "Checkout", label: "Checkout", status: "planned", stage: "bofu" } },
      { type: "pageNode", position: pos(5, -0.5), data: { nodeType: "page", subType: "Upsell", label: "Upsell", status: "planned", stage: "bofu" } },
      { type: "pageNode", position: pos(5, 0.5), data: { nodeType: "page", subType: "Thank You", label: "Thank You", status: "planned", stage: "bofu" } },
    ],
    edges: [
      { source: 0, target: 1 },
      { source: 1, target: 2 },
      { source: 2, target: 3 },
      { source: 3, target: 4 },
      { source: 4, target: 5 },
      { source: 4, target: 6 },
      { source: 5, target: 6 },
    ],
  },
  {
    id: "advertorial",
    name: "Advertorial Funnel",
    description: "Warm traffic through an advertorial before sending to product page",
    nodes: [
      { type: "trafficNode", position: pos(0), data: { nodeType: "traffic", subType: "meta-ads", label: "Meta Ads", status: "planned", stage: "tofu" } },
      { type: "pageNode", position: pos(1), data: { nodeType: "page", subType: "Advertorial", label: "Advertorial", status: "planned", stage: "tofu", contentSlots: defaultSlots } },
      { type: "pageNode", position: pos(2), data: { nodeType: "page", subType: "PDP (Product Page)", label: "Product Page", status: "planned", stage: "mofu", contentSlots: defaultSlots } },
      { type: "pageNode", position: pos(3), data: { nodeType: "page", subType: "Cart", label: "Cart", status: "planned", stage: "bofu" } },
      { type: "pageNode", position: pos(4), data: { nodeType: "page", subType: "Checkout", label: "Checkout", status: "planned", stage: "bofu" } },
      { type: "pageNode", position: pos(5), data: { nodeType: "page", subType: "Thank You", label: "Thank You", status: "planned", stage: "bofu" } },
    ],
    edges: [
      { source: 0, target: 1 },
      { source: 1, target: 2 },
      { source: 2, target: 3 },
      { source: 3, target: 4 },
      { source: 4, target: 5 },
    ],
  },
  {
    id: "organic-content",
    name: "Organic Content",
    description: "Organic and email traffic through homepage and collection to purchase",
    nodes: [
      { type: "trafficNode", position: pos(0, -0.5), data: { nodeType: "traffic", subType: "organic", label: "Organic Search", status: "planned", stage: "tofu" } },
      { type: "trafficNode", position: pos(0, 0.5), data: { nodeType: "traffic", subType: "email", label: "Email", status: "planned", stage: "mofu" } },
      { type: "pageNode", position: pos(1), data: { nodeType: "page", subType: "Homepage", label: "Homepage", status: "planned", stage: "tofu", contentSlots: defaultSlots } },
      { type: "pageNode", position: pos(2), data: { nodeType: "page", subType: "Collection Page", label: "Collection", status: "planned", stage: "mofu", contentSlots: defaultSlots } },
      { type: "pageNode", position: pos(3), data: { nodeType: "page", subType: "PDP (Product Page)", label: "Product Page", status: "planned", stage: "mofu", contentSlots: defaultSlots } },
      { type: "pageNode", position: pos(4), data: { nodeType: "page", subType: "Cart", label: "Cart", status: "planned", stage: "bofu" } },
      { type: "pageNode", position: pos(5), data: { nodeType: "page", subType: "Checkout", label: "Checkout", status: "planned", stage: "bofu" } },
    ],
    edges: [
      { source: 0, target: 2 },
      { source: 1, target: 2 },
      { source: 2, target: 3 },
      { source: 3, target: 4 },
      { source: 4, target: 5 },
      { source: 5, target: 6 },
    ],
  },
  /* ── NEW: Lead Gen Templates ── */
  {
    id: "cold-traffic-leadgen",
    name: "Cold Traffic Lead Gen",
    description: "Paid ad → advertorial/VSL → lead magnet opt-in → email sequence → discovery call",
    nodes: [
      { type: "trafficNode", position: pos(0), data: { nodeType: "traffic", subType: "meta-ads", label: "Paid Ads", status: "planned", warmth: "cold", stage: "tofu" } },
      { type: "pageNode", position: pos(1), data: { nodeType: "page", subType: "Advertorial", label: "VSL / Advertorial", status: "planned", stage: "tofu", contentSlots: defaultSlots } },
      { type: "leadMagnetNode", position: pos(2), data: { nodeType: "lead-magnet", subType: "Lead Magnet", label: "Lead Magnet Opt-in", status: "planned", leadMagnetFormat: "pdf", stage: "mofu", contentSlots: defaultSlots } as FunnelNodeData },
      { type: "emailSequenceNode", position: pos(3), data: { nodeType: "email-sequence", subType: "Email Sequence", label: "Nurture Sequence", status: "planned", emailSequenceMetrics: { emailCount: 5 }, stage: "mofu" } as FunnelNodeData },
      { type: "pageNode", position: pos(4), data: { nodeType: "page", subType: "Landing Page", label: "Discovery Call / Offer Page", status: "planned", stage: "bofu", contentSlots: defaultSlots } },
    ],
    edges: [
      { source: 0, target: 1 },
      { source: 1, target: 2 },
      { source: 2, target: 3 },
      { source: 3, target: 4 },
    ],
  },
  {
    id: "warm-retargeting",
    name: "Warm Retargeting",
    description: "Retargeting ad → case study / social proof page → direct offer → application",
    nodes: [
      { type: "trafficNode", position: pos(0), data: { nodeType: "traffic", subType: "meta-ads", label: "Retargeting Ads", status: "planned", warmth: "warm", stage: "mofu" } },
      { type: "pageNode", position: pos(1), data: { nodeType: "page", subType: "Landing Page", label: "Case Study / Social Proof", status: "planned", stage: "mofu", contentSlots: defaultSlots } },
      { type: "pageNode", position: pos(2), data: { nodeType: "page", subType: "Landing Page", label: "Direct Offer Page", status: "planned", stage: "bofu", contentSlots: defaultSlots } },
      { type: "pageNode", position: pos(3), data: { nodeType: "page", subType: "Landing Page", label: "Application / Booking Page", status: "planned", stage: "bofu", contentSlots: defaultSlots } },
    ],
    edges: [
      { source: 0, target: 1 },
      { source: 1, target: 2 },
      { source: 2, target: 3 },
    ],
  },
  {
    id: "content-engine",
    name: "Content Engine",
    description: "Organic content → blog / resource hub → lead magnet → email sequence → offer page",
    nodes: [
      { type: "trafficNode", position: pos(0, -0.5), data: { nodeType: "traffic", subType: "organic", label: "YouTube / Newsletter", status: "planned", warmth: "cold", stage: "tofu" } },
      { type: "trafficNode", position: pos(0, 0.5), data: { nodeType: "traffic", subType: "organic", label: "LinkedIn / Twitter", status: "planned", warmth: "cold", stage: "tofu" } },
      { type: "pageNode", position: pos(1), data: { nodeType: "page", subType: "About / Header / Blog", label: "Blog / Resource Hub", status: "planned", stage: "tofu", contentSlots: defaultSlots } },
      { type: "leadMagnetNode", position: pos(2), data: { nodeType: "lead-magnet", subType: "Lead Magnet", label: "Lead Magnet", status: "planned", leadMagnetFormat: "pdf", stage: "mofu", contentSlots: defaultSlots } as FunnelNodeData },
      { type: "emailSequenceNode", position: pos(3), data: { nodeType: "email-sequence", subType: "Email Sequence", label: "Email Sequence", status: "planned", emailSequenceMetrics: { emailCount: 7 }, stage: "mofu" } as FunnelNodeData },
      { type: "pageNode", position: pos(4), data: { nodeType: "page", subType: "Landing Page", label: "Offer Page", status: "planned", stage: "bofu", contentSlots: defaultSlots } },
    ],
    edges: [
      { source: 0, target: 2 },
      { source: 1, target: 2 },
      { source: 2, target: 3 },
      { source: 3, target: 4 },
      { source: 4, target: 5 },
    ],
  },
];
