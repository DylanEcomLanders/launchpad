/* ── Agreement Checkout: data layer ──
 *
 * Supabase-backed (not localStorage): the client opens the token link in THEIR
 * browser, so the record has to live server-side and be readable by token. The
 * token IS the row id (an unguessable secret), so a public read is a direct
 * primary-key lookup, nothing else is exposed.
 *
 * Requires supabase/migrations/064_checkouts.sql. The authoritative "paid" flag
 * is written by the Whop webhook (server), never trusted from the client.
 *
 * PREVIEW FALLBACK: before the table is migrated, reads/writes mirror to
 * localStorage so the whole flow is walkable in one browser with zero setup.
 * Supabase always wins when it has the row; the local copy is only a fallback.
 * (In production this must be Supabase - the client opens the link in THEIR
 * browser, which has no access to the admin's localStorage.)
 */

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { Checkout, EngagementType } from "./types";
import { planTypeFor } from "./types";

const LS_KEY = "checkouts_local";

function lsAll(): Record<string, Checkout> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(LS_KEY) || "{}");
  } catch {
    return {};
  }
}

function lsSave(c: Checkout): void {
  if (typeof window === "undefined") return;
  try {
    const all = lsAll();
    all[c.id] = c;
    window.localStorage.setItem(LS_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

function genToken(): string {
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "")
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  return `chk_${uuid}`;
}

function rowToCheckout(row: Record<string, unknown>): Checkout {
  return { ...(row.data as object), id: row.id as string } as Checkout;
}

/** Admin list, newest first. Supabase if present, else the local fallback. */
export async function loadCheckouts(): Promise<Checkout[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from("checkouts").select("*").order("created_at", { ascending: false });
      if (!error && data && data.length) return data.map(rowToCheckout);
    } catch {
      /* fall through to local */
    }
  }
  return Object.values(lsAll()).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

/** Public read by token (the token is the row id). */
export async function getCheckoutByToken(token: string): Promise<Checkout | null> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from("checkouts").select("*").eq("id", token).maybeSingle();
      if (!error && data) return rowToCheckout(data);
    } catch {
      /* fall through to local */
    }
  }
  return lsAll()[token] ?? null;
}

export async function saveCheckout(c: Checkout): Promise<void> {
  lsSave(c); // mirror locally so the flow works before the table is migrated
  if (!isSupabaseConfigured()) return;
  try {
    const { id, ...rest } = c;
    await supabase
      .from("checkouts")
      .upsert({ id, data: rest, updated_at: new Date().toISOString() }, { onConflict: "id" });
  } catch {
    /* table not migrated yet - local copy above covers preview */
  }
}

/** Delete a checkout (admin). Removes from Supabase + the local mirror. */
export async function deleteCheckout(id: string): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      const all = lsAll();
      delete all[id];
      window.localStorage.setItem(LS_KEY, JSON.stringify(all));
    } catch {
      /* ignore */
    }
  }
  if (!isSupabaseConfigured()) return;
  try {
    await supabase.from("checkouts").delete().eq("id", id);
  } catch {
    /* table not migrated yet */
  }
}

export interface NewCheckoutInput {
  clientName: string;
  company?: string;
  email: string;
  clientAddress?: string;
  engagementType: EngagementType;
  amountGross: number;
  currency?: string;
  scope?: string;
  termsNote?: string;
}

export function newCheckout(input: NewCheckoutInput): Checkout {
  const token = genToken();
  const now = new Date().toISOString();
  return {
    id: token,
    token,
    clientName: input.clientName.trim() || "Client",
    company: input.company?.trim() || undefined,
    email: input.email.trim(),
    clientAddress: input.clientAddress?.trim() || undefined,
    engagementType: input.engagementType,
    planType: planTypeFor(input.engagementType),
    amountGross: input.amountGross,
    currency: input.currency || "GBP",
    scope: input.scope?.trim() || undefined,
    termsNote: input.termsNote?.trim() || undefined,
    status: "draft",
    created_at: now,
    updated_at: now,
  };
}

/** The full public link for a checkout (client-side; uses window origin). */
export function checkoutUrl(token: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/checkout/${token}`;
}
