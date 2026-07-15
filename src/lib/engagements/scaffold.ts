/* ── The scaffold ──
 *
 * ONE trigger, everything populated. Onboarding a Growth retainer and a Single
 * Page run THIS SAME function, differing only by the config for their `type`.
 * If you ever add a type-specific branch here, the model is wrong - push the
 * difference into config.ts instead.
 *
 * What it populates: the engagement record, the token allocation (retainers),
 * the value calendar (month 1 = full strategy; the guardrail), and the initial
 * knowledge library. Delivery (kanban) + the client portal are linked in when
 * they exist - passed as ids, wired by the caller. */

import { configFor } from "./config";
import {
  addKnowledgeEntry,
  addLedgerEntry,
  upsertArtifact,
  upsertEngagement,
} from "./data";
import type {
  ArtifactType,
  Baseline,
  Engagement,
  EngagementArtifact,
  EngagementType,
  StrategyScope,
  TokenLedgerEntry,
} from "./types";

function uid(prefix: string): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? `${prefix}_${crypto.randomUUID()}`
    : `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface ScaffoldInput {
  clientName: string;
  type: EngagementType;
  startDate?: string; // ISO; defaults to today
  onboardingSubmissionId?: string;
  baseline?: Baseline;
  createdBy?: string;
  /** Delivery + client-view satellites, if they already exist. */
  kanbanClientId?: string;
  kanbanProjectId?: string;
  portalId?: string;
}

export interface ScaffoldResult {
  engagement: Engagement;
}

function mkArtifact(
  engagementId: string,
  artifactType: ArtifactType,
  cycleMonth: number,
  strategyScope: StrategyScope,
  dueOn: string,
  now: string,
): EngagementArtifact {
  return {
    id: uid("art"),
    engagementId,
    artifactType,
    cycleMonth,
    strategyScope,
    dueOn,
    status: "scheduled",
    createdAt: now,
    updatedAt: now,
  };
}

export async function scaffoldEngagement(
  input: ScaffoldInput,
): Promise<ScaffoldResult> {
  const cfg = configFor(input.type);
  const now = new Date().toISOString();
  const start = input.startDate ?? todayISO();
  const id = uid("eng");

  const engagement: Engagement = {
    id,
    clientName: input.clientName,
    kanbanClientId: input.kanbanClientId,
    kanbanProjectId: input.kanbanProjectId,
    portalId: input.portalId,
    onboardingSubmissionId: input.onboardingSubmissionId,
    type: input.type,
    isRetainer: cfg.isRetainer,
    tokenPoolTotal: cfg.tokenPoolTotal ?? undefined,
    buildUnitLabel: "primary build",
    packageInclusions: cfg.package,
    startDate: start,
    status: "active",
    baseline: input.baseline,
    createdAt: now,
    updatedAt: now,
  };
  await upsertEngagement(engagement);

  // Token allocation - retainers only. Projects never get a pool.
  if (cfg.isRetainer && cfg.tokenPoolTotal) {
    const alloc: TokenLedgerEntry = {
      id: uid("tok"),
      engagementId: id,
      kind: "allocation",
      delta: cfg.tokenPoolTotal,
      label: `Month 1 pool (${cfg.label})`,
      occurredOn: start,
      createdBy: input.createdBy,
      createdAt: now,
    };
    await addLedgerEntry(alloc);
  }

  // Value calendar. Month 1 strategy = full (the guardrail: never zero).
  // Retainers roll a monthly readout + renewal checkpoint; a project gets a
  // single compressed readout then terminates.
  const artifacts: EngagementArtifact[] = [
    mkArtifact(id, "onboarding_report", 1, "full", start, now),
  ];
  if (cfg.isRetainer) {
    artifacts.push(
      mkArtifact(id, "monthly_readout", 1, "full", addDaysISO(start, 28), now),
      mkArtifact(id, "renewal_checkpoint", 1, "full", addDaysISO(start, 28), now),
    );
  } else {
    artifacts.push(
      mkArtifact(id, "monthly_readout", 1, "compressed", addDaysISO(start, 14), now),
    );
  }
  for (const a of artifacts) await upsertArtifact(a);

  // Seed the append-only knowledge library.
  await addKnowledgeEntry({
    id: uid("kn"),
    engagementId: id,
    type: "brief",
    title: "Engagement brief",
    summary: `${cfg.label} engagement kicked off ${start}. ${cfg.nature}`,
    audience: "both",
    createdAt: now,
  });
  if (input.baseline) {
    await addKnowledgeEntry({
      id: uid("kn"),
      engagementId: id,
      type: "insight",
      title: "Baseline snapshot",
      summary: `CVR ${input.baseline.cvr ?? "n/a"} · AOV ${input.baseline.aov ?? "n/a"} · RPV ${input.baseline.rpv ?? "n/a"}`,
      audience: "both",
      createdAt: now,
    });
  }

  return { engagement };
}
