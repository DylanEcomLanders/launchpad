/* ── Engagement spine data layer ──
 *
 * Supabase-first, localStorage fallback (the app's standard posture) so the
 * scaffold + views work in dev before migration 052 is pasted. Cloud is the
 * source of truth once the tables exist; the local cache mirrors writes.
 *
 * Four entities: engagements, token ledger, knowledge entries, artifacts. */

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type {
  Engagement,
  EngagementArtifact,
  KnowledgeEntry,
  TokenLedgerEntry,
} from "./types";

// ─── localStorage fallback ──────────────────────────────────────────────────
const LS = {
  engagements: "el-engagements-v1",
  ledger: "el-engagement-ledger-v1",
  knowledge: "el-knowledge-entries-v1",
  artifacts: "el-engagement-artifacts-v1",
};

function readLocal<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(key) || "[]") as T[];
  } catch {
    return [];
  }
}
function writeLocal<T>(key: string, rows: T[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(rows));
  } catch {
    /* quota / private mode - ignore */
  }
}
function upsertLocal<T extends { id: string }>(key: string, row: T): void {
  const rows = readLocal<T>(key);
  const i = rows.findIndex((r) => r.id === row.id);
  if (i >= 0) rows[i] = row;
  else rows.push(row);
  writeLocal(key, rows);
}

// ─── Row types + mappers (snake_case DB <-> camelCase app) ───────────────────
interface EngagementRow {
  id: string;
  client_name: string;
  kanban_client_id: string | null;
  kanban_project_id: string | null;
  portal_id: string | null;
  onboarding_submission_id: string | null;
  type: Engagement["type"];
  is_retainer: boolean;
  token_pool_total: number | null;
  build_unit_label: string;
  package_inclusions: Engagement["packageInclusions"] | null;
  start_date: string | null;
  status: Engagement["status"];
  baseline: Engagement["baseline"] | null;
  created_at: string;
  updated_at: string;
}

function engToRow(e: Engagement): EngagementRow {
  return {
    id: e.id,
    client_name: e.clientName,
    kanban_client_id: e.kanbanClientId ?? null,
    kanban_project_id: e.kanbanProjectId ?? null,
    portal_id: e.portalId ?? null,
    onboarding_submission_id: e.onboardingSubmissionId ?? null,
    type: e.type,
    is_retainer: e.isRetainer,
    token_pool_total: e.tokenPoolTotal ?? null,
    build_unit_label: e.buildUnitLabel,
    package_inclusions: e.packageInclusions ?? null,
    start_date: e.startDate ?? null,
    status: e.status,
    baseline: e.baseline ?? null,
    created_at: e.createdAt,
    updated_at: e.updatedAt,
  };
}
function rowToEng(r: EngagementRow): Engagement {
  return {
    id: r.id,
    clientName: r.client_name,
    kanbanClientId: r.kanban_client_id ?? undefined,
    kanbanProjectId: r.kanban_project_id ?? undefined,
    portalId: r.portal_id ?? undefined,
    onboardingSubmissionId: r.onboarding_submission_id ?? undefined,
    type: r.type,
    isRetainer: r.is_retainer,
    tokenPoolTotal: r.token_pool_total ?? undefined,
    buildUnitLabel: r.build_unit_label,
    packageInclusions: r.package_inclusions ?? undefined,
    startDate: r.start_date ?? undefined,
    status: r.status,
    baseline: r.baseline ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// ─── Engagements ─────────────────────────────────────────────────────────────
export async function fetchEngagements(): Promise<Engagement[]> {
  if (!isSupabaseConfigured()) return readLocal<Engagement>(LS.engagements);
  const { data, error } = await supabase.from("engagements").select("*");
  if (error) {
    console.error("[engagements] fetch failed, using local:", error.message);
    return readLocal<Engagement>(LS.engagements);
  }
  return (data ?? []).map((r) => rowToEng(r as EngagementRow));
}

export async function fetchEngagement(id: string): Promise<Engagement | null> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from("engagements")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!error && data) return rowToEng(data as EngagementRow);
    if (error) console.error("[engagements] fetchOne failed, using local:", error.message);
  }
  return readLocal<Engagement>(LS.engagements).find((e) => e.id === id) ?? null;
}

export async function upsertEngagement(e: Engagement): Promise<void> {
  upsertLocal(LS.engagements, e);
  if (!isSupabaseConfigured()) return;
  const { error } = await supabase.from("engagements").upsert(engToRow(e));
  if (error) console.error("[engagements] upsert failed:", error.message);
}

// ─── Token ledger ────────────────────────────────────────────────────────────
export async function fetchTokenLedger(
  engagementId: string,
): Promise<TokenLedgerEntry[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from("engagement_token_ledger")
      .select("*")
      .eq("engagement_id", engagementId)
      .order("occurred_on", { ascending: false });
    if (!error && data) {
      return (data as Record<string, unknown>[]).map((r) => ({
        id: r.id as string,
        engagementId: r.engagement_id as string,
        kind: r.kind as TokenLedgerEntry["kind"],
        delta: r.delta as number,
        label: (r.label as string) ?? undefined,
        occurredOn: r.occurred_on as string,
        createdBy: (r.created_by as string) ?? undefined,
        createdAt: r.created_at as string,
      }));
    }
    if (error) console.error("[ledger] fetch failed, using local:", error.message);
  }
  return readLocal<TokenLedgerEntry>(LS.ledger).filter(
    (e) => e.engagementId === engagementId,
  );
}

export async function addLedgerEntry(entry: TokenLedgerEntry): Promise<void> {
  upsertLocal(LS.ledger, entry);
  if (!isSupabaseConfigured()) return;
  const { error } = await supabase.from("engagement_token_ledger").insert({
    id: entry.id,
    engagement_id: entry.engagementId,
    kind: entry.kind,
    delta: entry.delta,
    label: entry.label ?? null,
    occurred_on: entry.occurredOn,
    created_by: entry.createdBy ?? null,
    created_at: entry.createdAt,
  });
  if (error) console.error("[ledger] insert failed:", error.message);
}

/** Remaining balance = pool total + sum of every delta (allocation is +pool). */
export function tokenBalance(
  pool: number | undefined,
  entries: TokenLedgerEntry[],
): { spent: number; remaining: number } {
  const spent = entries
    .filter((e) => e.delta < 0)
    .reduce((n, e) => n + Math.abs(e.delta), 0);
  const remaining = (pool ?? 0) - spent;
  return { spent, remaining };
}

// ─── Knowledge entries (append-only) ─────────────────────────────────────────
export async function fetchKnowledge(
  engagementId: string,
): Promise<KnowledgeEntry[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from("knowledge_entries")
      .select("*")
      .eq("engagement_id", engagementId)
      .order("created_at", { ascending: false });
    if (!error && data) {
      return (data as Record<string, unknown>[]).map((r) => ({
        id: r.id as string,
        engagementId: r.engagement_id as string,
        type: r.type as KnowledgeEntry["type"],
        title: r.title as string,
        summary: (r.summary as string) ?? undefined,
        contentRef: r.content_ref ?? undefined,
        theme: (r.theme as string) ?? undefined,
        audience: r.audience as KnowledgeEntry["audience"],
        createdAt: r.created_at as string,
      }));
    }
    if (error) console.error("[knowledge] fetch failed, using local:", error.message);
  }
  return readLocal<KnowledgeEntry>(LS.knowledge).filter(
    (e) => e.engagementId === engagementId,
  );
}

export async function addKnowledgeEntry(entry: KnowledgeEntry): Promise<void> {
  upsertLocal(LS.knowledge, entry);
  if (!isSupabaseConfigured()) return;
  const { error } = await supabase.from("knowledge_entries").insert({
    id: entry.id,
    engagement_id: entry.engagementId,
    type: entry.type,
    title: entry.title,
    summary: entry.summary ?? null,
    content_ref: entry.contentRef ?? null,
    theme: entry.theme ?? null,
    audience: entry.audience,
    created_at: entry.createdAt,
  });
  if (error) console.error("[knowledge] insert failed:", error.message);
}

// ─── Artifacts (value calendar) ──────────────────────────────────────────────
export async function fetchArtifacts(
  engagementId: string,
): Promise<EngagementArtifact[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from("engagement_artifacts")
      .select("*")
      .eq("engagement_id", engagementId)
      .order("due_on", { ascending: true });
    if (!error && data) {
      return (data as Record<string, unknown>[]).map((r) => ({
        id: r.id as string,
        engagementId: r.engagement_id as string,
        artifactType: r.artifact_type as EngagementArtifact["artifactType"],
        cycleMonth: (r.cycle_month as number) ?? undefined,
        strategyScope: (r.strategy_scope as EngagementArtifact["strategyScope"]) ?? undefined,
        dueOn: (r.due_on as string) ?? undefined,
        status: r.status as EngagementArtifact["status"],
        generatedRef: r.generated_ref ?? undefined,
        createdAt: r.created_at as string,
        updatedAt: r.updated_at as string,
      }));
    }
    if (error) console.error("[artifacts] fetch failed, using local:", error.message);
  }
  return readLocal<EngagementArtifact>(LS.artifacts).filter(
    (a) => a.engagementId === engagementId,
  );
}

export async function upsertArtifact(a: EngagementArtifact): Promise<void> {
  upsertLocal(LS.artifacts, a);
  if (!isSupabaseConfigured()) return;
  const { error } = await supabase.from("engagement_artifacts").upsert({
    id: a.id,
    engagement_id: a.engagementId,
    artifact_type: a.artifactType,
    cycle_month: a.cycleMonth ?? null,
    strategy_scope: a.strategyScope ?? null,
    due_on: a.dueOn ?? null,
    status: a.status,
    generated_ref: a.generatedRef ?? null,
    created_at: a.createdAt,
    updated_at: a.updatedAt,
  });
  if (error) console.error("[artifacts] upsert failed:", error.message);
}
