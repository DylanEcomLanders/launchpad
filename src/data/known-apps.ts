// Canonical list of known Shopify apps detected during store crawls.
// Used by prospect-scraper and store-intel API routes.

export const KNOWN_APPS: Record<string, { name: string; type: string }> = {
  intelligems: { name: "Intelligems", type: "Price Testing / A/B Testing" },
  rebuy: { name: "Rebuy", type: "Upsells & Cross-sells" },
  reconvert: { name: "ReConvert", type: "Post-Purchase Upsells" },
  klaviyo: { name: "Klaviyo", type: "Email & SMS Marketing" },
  "judge.me": { name: "Judge.me", type: "Product Reviews" },
  judgeme: { name: "Judge.me", type: "Product Reviews" },
  loox: { name: "Loox", type: "Photo Reviews" },
  stamped: { name: "Stamped.io", type: "Reviews & UGC" },
  yotpo: { name: "Yotpo", type: "Reviews & Loyalty" },
  okendo: { name: "Okendo", type: "Reviews & UGC" },
  hotjar: { name: "Hotjar", type: "Heatmaps & Session Recording" },
  "lucky-orange": { name: "Lucky Orange", type: "Heatmaps" },
  luckyorange: { name: "Lucky Orange", type: "Heatmaps" },
  optimizely: { name: "Optimizely", type: "A/B Testing" },
  vwo: { name: "VWO", type: "A/B Testing" },
  bold: { name: "Bold Commerce", type: "Upsells / Bundles" },
  zipify: { name: "Zipify", type: "Landing Pages" },
  recharge: { name: "ReCharge", type: "Subscriptions" },
  skio: { name: "Skio", type: "Subscriptions" },
  afterpay: { name: "Afterpay", type: "BNPL" },
  klarna: { name: "Klarna", type: "BNPL" },
  attentive: { name: "Attentive", type: "SMS Marketing" },
  postscript: { name: "Postscript", type: "SMS Marketing" },
  gorgias: { name: "Gorgias", type: "Customer Support" },
  privy: { name: "Privy", type: "Pop-ups & Email Capture" },
  justuno: { name: "Justuno", type: "Pop-ups & CRO" },
  smile: { name: "Smile.io", type: "Loyalty & Rewards" },
  triplewhale: { name: "Triple Whale", type: "Analytics" },
  "triple-whale": { name: "Triple Whale", type: "Analytics" },
  elevar: { name: "Elevar", type: "Tracking & Analytics" },
  shogun: { name: "Shogun", type: "Page Builder" },
  gempages: { name: "GemPages", type: "Page Builder" },
  pagefly: { name: "PageFly", type: "Page Builder" },
  vitals: { name: "Vitals", type: "All-in-One App" },
};

export const REVIEW_APPS = ["Judge.me", "Loox", "Stamped.io", "Yotpo", "Okendo"];
export const SUBSCRIPTION_APPS = ["ReCharge", "Skio"];
export const BNPL_APPS = ["Afterpay", "Klarna"];
