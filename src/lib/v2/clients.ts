"use server";

import { revalidatePath } from "next/cache";
import { createV2ServerClient } from "@/lib/v2/supabase/server";
import { requireV2User } from "@/lib/v2/auth";
import { V2ConflictError, type V2Client } from "@/lib/v2/types";

function rowToClient(row: Record<string, unknown>): V2Client {
  return {
    id: String(row.id),
    name: String(row.name),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    updated_by: String(row.updated_by),
  };
}

const CLIENT_COLUMNS = "id, name, created_at, updated_at, updated_by";

export async function listClients(): Promise<V2Client[]> {
  await requireV2User();
  const supabase = await createV2ServerClient();
  const { data, error } = await supabase
    .from("clients")
    .select(CLIENT_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`clients list failed: ${error.message}`);
  }
  return (data ?? []).map((row) => rowToClient(row as Record<string, unknown>));
}

export type CreateClientResult = { ok: true; client: V2Client } | { ok: false; error: string };

export async function createClient(name: string): Promise<CreateClientResult> {
  await requireV2User();
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, error: "Name is required." };
  }
  if (trimmed.length > 200) {
    return { ok: false, error: "Name must be 200 characters or fewer." };
  }

  const supabase = await createV2ServerClient();
  const { data, error } = await supabase
    .from("clients")
    .insert({ name: trimmed })
    .select(CLIENT_COLUMNS)
    .single();

  if (error) {
    return { ok: false, error: `Could not create client: ${error.message}` };
  }
  if (!data) {
    return { ok: false, error: "Could not create client: empty response." };
  }

  revalidatePath("/v2");
  return { ok: true, client: rowToClient(data as Record<string, unknown>) };
}

/**
 * Name update with optimistic concurrency. Not wired to the foundation UI
 * (names-only create + list). Callers must pass the `updated_at` they loaded;
 * a stale value is a conflict, never a silent overwrite.
 */
export async function updateClientName(
  id: string,
  name: string,
  updatedAt: string,
): Promise<V2Client> {
  await requireV2User();
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Name is required.");
  }
  if (!id || !updatedAt) {
    throw new Error("id and updated_at are required.");
  }

  const supabase = await createV2ServerClient();
  const { data, error } = await supabase
    .from("clients")
    .update({ name: trimmed })
    .eq("id", id)
    .eq("updated_at", updatedAt)
    .select(CLIENT_COLUMNS)
    .maybeSingle();

  if (error) {
    throw new Error(`clients update failed: ${error.message}`);
  }
  if (!data) {
    throw new V2ConflictError();
  }
  revalidatePath("/v2");
  return rowToClient(data as Record<string, unknown>);
}
