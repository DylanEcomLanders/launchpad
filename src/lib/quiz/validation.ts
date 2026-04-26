// Hand-rolled validation for quiz submissions. We don't use zod elsewhere
// in the codebase yet, so introducing it for one route would be overkill.
// Same shape as a zod schema — return either { ok: true, value } or
// { ok: false, error, field? }.

import type {
  Vertical,
  Revenue,
  TrafficSource,
  PainPoint,
  CroHistory,
} from "./types";

const VERTICALS: Vertical[] = ["beauty", "supplements", "apparel", "food", "other"];
const REVENUES: Revenue[] = ["under_30k", "30k_100k", "100k_500k", "500k_1m", "1m_plus"];
const TRAFFIC: TrafficSource[] = ["meta_cold", "meta_paid_email", "organic", "influencers", "mixed"];
const PAINS: PainPoint[] = ["ads_not_converting", "low_atc", "cart_abandonment", "low_aov", "all_of_it"];
const CRO_HISTORY: CroHistory[] = ["never", "in_house", "agency", "currently_testing"];

// Loose URL regex — must contain a dot, no spaces, must look domain-like.
const URL_RE = /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Common email typo corrections — applied before validation so we don't
// reject "gmial.com" / "hotnail.com" outright.
const EMAIL_TYPO_MAP: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gamil.com": "gmail.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "hotnail.com": "hotmail.com",
  "hotmial.com": "hotmail.com",
  "hotmaill.com": "hotmail.com",
  "outlok.com": "outlook.com",
  "outloook.com": "outlook.com",
  "iclud.com": "icloud.com",
  "iclould.com": "icloud.com",
};

export function correctEmailTypos(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at === -1) return trimmed;
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (EMAIL_TYPO_MAP[domain]) return `${local}@${EMAIL_TYPO_MAP[domain]}`;
  return trimmed;
}

// Strip protocol + www, lowercase host, drop trailing slash.
export function normaliseStoreUrl(input: string): string {
  let s = input.trim();
  if (!s) return "";
  s = s.replace(/^https?:\/\//i, "");
  s = s.replace(/^www\./i, "");
  s = s.replace(/\/+$/, "");
  // Lowercase the host part only — keep the path casing in case it matters
  const slash = s.indexOf("/");
  if (slash === -1) return s.toLowerCase();
  const host = s.slice(0, slash).toLowerCase();
  const path = s.slice(slash);
  return host + path;
}

export interface SubmitInput {
  vertical: Vertical;
  revenue: Revenue;
  trafficSource: TrafficSource;
  painPoint: PainPoint;
  croHistory: CroHistory;
  firstName: string;
  email: string;
  storeUrl: string;
  whatsapp?: string;
  source: string;
  referrer: string;
}

export type ValidationResult =
  | { ok: true; value: SubmitInput }
  | { ok: false; error: string; field?: string };

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function inEnum<T extends string>(v: unknown, allowed: readonly T[]): T | null {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : null;
}

export function validateSubmission(body: unknown): ValidationResult {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid body" };
  const b = body as Record<string, unknown>;

  const vertical = inEnum(b.vertical, VERTICALS);
  if (!vertical) return { ok: false, error: "Invalid vertical", field: "vertical" };

  const revenue = inEnum(b.revenue, REVENUES);
  if (!revenue) return { ok: false, error: "Invalid revenue", field: "revenue" };

  const trafficSource = inEnum(b.trafficSource, TRAFFIC);
  if (!trafficSource) return { ok: false, error: "Invalid traffic source", field: "trafficSource" };

  const painPoint = inEnum(b.painPoint, PAINS);
  if (!painPoint) return { ok: false, error: "Invalid pain point", field: "painPoint" };

  const croHistory = inEnum(b.croHistory, CRO_HISTORY);
  if (!croHistory) return { ok: false, error: "Invalid CRO history", field: "croHistory" };

  const firstName = asString(b.firstName).trim();
  if (!firstName) return { ok: false, error: "First name is required", field: "firstName" };
  if (firstName.length > 80) return { ok: false, error: "First name is too long", field: "firstName" };

  const emailRaw = asString(b.email).trim().toLowerCase();
  if (!emailRaw) return { ok: false, error: "Email is required", field: "email" };
  if (emailRaw.length > 200) return { ok: false, error: "Email is too long", field: "email" };
  const email = correctEmailTypos(emailRaw);
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Invalid email", field: "email" };

  const storeUrlRaw = asString(b.storeUrl).trim();
  if (!storeUrlRaw) return { ok: false, error: "Store URL is required", field: "storeUrl" };
  if (storeUrlRaw.length > 300) return { ok: false, error: "Store URL is too long", field: "storeUrl" };
  const storeUrl = normaliseStoreUrl(storeUrlRaw);
  if (!URL_RE.test(storeUrl)) {
    return { ok: false, error: "Looks like that URL isn't quite right", field: "storeUrl" };
  }

  const whatsappRaw = asString(b.whatsapp).trim();
  const whatsapp = whatsappRaw.length > 0 ? whatsappRaw.slice(0, 40) : undefined;

  const source = asString(b.source).trim().slice(0, 80) || "direct";
  const referrer = asString(b.referrer).trim().slice(0, 500);

  return {
    ok: true,
    value: {
      vertical,
      revenue,
      trafficSource,
      painPoint,
      croHistory,
      firstName,
      email,
      storeUrl,
      whatsapp,
      source,
      referrer,
    },
  };
}
