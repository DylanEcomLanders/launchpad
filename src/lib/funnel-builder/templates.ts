/* ── Funnel Templates ── */

import type { FunnelTemplate } from "./types";

const X_START = 50;
const Y_CENTER = 200;
const X_GAP = 220;

function pos(col: number, row = 0): { x: number; y: number } {
  return { x: X_START + col * X_GAP, y: Y_CENTER + row * 120 };
}

export const funnelTemplates: FunnelTemplate[] = [
  {
    id: "standard-dtc",
    name: "Standard DTC",
    description: "Classic direct-to-consumer flow with ads driving to landing page and PDP",
    nodes: [
      { type: "trafficNode", position: pos(0, -0.5), data: { nodeType: "traffic", subType: "meta-ads", label: "Meta Ads", status: "planned" } },
      { type: "trafficNode", position: pos(0, 0.5), data: { nodeType: "traffic", subType: "google-ads", label: "Google Ads", status: "planned" } },
      { type: "pageNode", position: pos(1), data: { nodeType: "page", subType: "Landing Page", label: "Landing Page", status: "planned" } },
      { type: "pageNode", position: pos(2), data: { nodeType: "page", subType: "PDP (Product Page)", label: "Product Page", status: "planned" } },
      { type: "pageNode", position: pos(3), data: { nodeType: "page", subType: "Cart", label: "Cart", status: "planned" } },
      { type: "pageNode", position: pos(4), data: { nodeType: "page", subType: "Checkout", label: "Checkout", status: "planned" } },
      { type: "pageNode", position: pos(5), data: { nodeType: "page", subType: "Thank You", label: "Thank You", status: "planned" } },
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
      { type: "trafficNode", position: pos(0), data: { nodeType: "traffic", subType: "meta-ads", label: "Meta Ads", status: "planned" } },
      { type: "pageNode", position: pos(1), data: { nodeType: "page", subType: "Landing Page", label: "Quiz Page", status: "planned" } },
      { type: "pageNode", position: pos(2), data: { nodeType: "page", subType: "PDP (Product Page)", label: "Recommended PDP", status: "planned" } },
      { type: "pageNode", position: pos(3), data: { nodeType: "page", subType: "Cart", label: "Cart", status: "planned" } },
      { type: "pageNode", position: pos(4), data: { nodeType: "page", subType: "Checkout", label: "Checkout", status: "planned" } },
      { type: "pageNode", position: pos(5, -0.5), data: { nodeType: "page", subType: "Upsell", label: "Upsell", status: "planned" } },
      { type: "pageNode", position: pos(5, 0.5), data: { nodeType: "page", subType: "Thank You", label: "Thank You", status: "planned" } },
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
      { type: "trafficNode", position: pos(0), data: { nodeType: "traffic", subType: "meta-ads", label: "Meta Ads", status: "planned" } },
      { type: "pageNode", position: pos(1), data: { nodeType: "page", subType: "Advertorial", label: "Advertorial", status: "planned" } },
      { type: "pageNode", position: pos(2), data: { nodeType: "page", subType: "PDP (Product Page)", label: "Product Page", status: "planned" } },
      { type: "pageNode", position: pos(3), data: { nodeType: "page", subType: "Cart", label: "Cart", status: "planned" } },
      { type: "pageNode", position: pos(4), data: { nodeType: "page", subType: "Checkout", label: "Checkout", status: "planned" } },
      { type: "pageNode", position: pos(5), data: { nodeType: "page", subType: "Thank You", label: "Thank You", status: "planned" } },
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
      { type: "trafficNode", position: pos(0, -0.5), data: { nodeType: "traffic", subType: "organic", label: "Organic Search", status: "planned" } },
      { type: "trafficNode", position: pos(0, 0.5), data: { nodeType: "traffic", subType: "email", label: "Email", status: "planned" } },
      { type: "pageNode", position: pos(1), data: { nodeType: "page", subType: "Homepage", label: "Homepage", status: "planned" } },
      { type: "pageNode", position: pos(2), data: { nodeType: "page", subType: "Collection Page", label: "Collection", status: "planned" } },
      { type: "pageNode", position: pos(3), data: { nodeType: "page", subType: "PDP (Product Page)", label: "Product Page", status: "planned" } },
      { type: "pageNode", position: pos(4), data: { nodeType: "page", subType: "Cart", label: "Cart", status: "planned" } },
      { type: "pageNode", position: pos(5), data: { nodeType: "page", subType: "Checkout", label: "Checkout", status: "planned" } },
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
];
