/* ── Agreement Checkout: data layer ──
 *
 * Supabase-backed (not localStorage): the client opens the token link in THEIR
 * browser, so the record has to live server-side and be readable by token. The
 * token IS the row id (an unguessable secret), so a public read is a direct
 * primary-key lookup, nothing else is exposed.
 *
 * Requires supabase/migrations/064_checkouts.sql. The authoritative "paid" flag
 * is written by the Whop webhook (server), never trusted from the client.
 */

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { Checkout, EngagementType } from "./types";
import { planTypeFor } from "./types";

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

/** Admin list, newest first. */
export async function loadCheckouts(): Promise<Checkout[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase.from("checkouts").select("*").order("created_at", { ascending: false });
    if (error || !data) return [];
    return data.map(rowToCheckout);
  } catch {
    return [];
  }
}

/** Public read by token (the token is the row id). */
export async function getCheckoutByToken(token: string): Promise<Checkout | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase.from("checkouts").select("*").eq("id", token).maybeSingle();
    if (error || !data) return null;
    return rowToCheckout(data);
  } catch {
    return null;
  }
}

export async function saveCheckout(c: Checkout): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const { id, ...rest } = c;
    await supabase
      .from("checkouts")
      .upsert({ id, data: rest, updated_at: new Date().toISOString() }, { onConflict: "id" });
  } catch {
    /* table not migrated yet */
  }
}

export interface NewCheckoutInput {
  clientName: string;
  company?: string;
  email: string;
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
